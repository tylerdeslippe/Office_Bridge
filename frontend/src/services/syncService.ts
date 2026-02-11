/**
 * Sync Service - Handles syncing local data with server
 * Only syncs when online, queues changes when offline
 */

import { localDB, STORES } from '../utils/localDB';

interface SyncConfig {
  apiBaseUrl: string;
  authToken: string | null;
}

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class SyncService {
  private config: SyncConfig = {
    apiBaseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8001/api',
    authToken: null,
  };
  
  private isSyncing = false;
  private syncInterval: number | null = null;

  // Initialize sync service
  init(authToken: string | null) {
    this.config.authToken = authToken;
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.onOnline());
    window.addEventListener('offline', () => this.onOffline());
    
    // Start periodic sync if online
    if (navigator.onLine) {
      this.startPeriodicSync();
    }
  }

  // Set auth token
  setAuthToken(token: string | null) {
    this.config.authToken = token;
  }

  // Check if online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Handle coming online
  private async onOnline() {
    console.log('📶 Back online - starting sync');
    await this.syncAll();
    this.startPeriodicSync();
  }

  // Handle going offline
  private onOffline() {
    console.log('📴 Gone offline - stopping sync');
    this.stopPeriodicSync();
  }

  // Start periodic sync (every 5 minutes)
  private startPeriodicSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline()) {
        this.syncAll();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Stop periodic sync
  private stopPeriodicSync() {
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync all pending changes
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing || !this.isOnline()) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress or offline'] };
    }

    this.isSyncing = true;
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      const queue = await localDB.getSyncQueue();
      
      for (const item of queue) {
        try {
          await this.syncItem(item);
          await localDB.removeSyncQueueItem(item.id);
          result.synced++;
        } catch (error: any) {
          result.failed++;
          result.errors.push(`${item.store}/${item.action}: ${error.message}`);
          
          // Retry logic - remove from queue after 3 retries
          if (item.retries >= 3) {
            await localDB.removeSyncQueueItem(item.id);
          }
        }
      }

      result.success = result.failed === 0;
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  // Sync a single item
  private async syncItem(item: any): Promise<void> {
    const endpoint = this.getEndpoint(item.store);
    if (!endpoint) return;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    let response: Response;

    switch (item.action) {
      case 'create':
        response = await fetch(`${this.config.apiBaseUrl}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(item.data),
        });
        break;

      case 'update':
        response = await fetch(`${this.config.apiBaseUrl}${endpoint}/${item.data.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(item.data),
        });
        break;

      case 'delete':
        response = await fetch(`${this.config.apiBaseUrl}${endpoint}/${item.data.id}`, {
          method: 'DELETE',
          headers,
        });
        break;

      default:
        throw new Error(`Unknown action: ${item.action}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  // Get API endpoint for store
  private getEndpoint(store: string): string | null {
    const endpoints: Record<string, string> = {
      [STORES.PROJECTS]: '/projects',
      [STORES.DELIVERIES]: '/deliveries',
      [STORES.PURCHASE_ORDERS]: '/purchase-orders',
      [STORES.LOOK_AHEAD]: '/look-ahead',
      [STORES.DAILY_REPORTS]: '/daily-reports',
      [STORES.PHOTOS]: '/photos',
      [STORES.CONTACTS]: '/contacts',
      [STORES.TASKS]: '/tasks',
      [STORES.QUOTES]: '/quotes',
    };

    return endpoints[store] || null;
  }

  // Force sync a specific store
  async syncStore(store: string): Promise<SyncResult> {
    const queue = await localDB.getSyncQueue();
    const storeItems = queue.filter(item => item.store === store);
    
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    for (const item of storeItems) {
      try {
        await this.syncItem(item);
        await localDB.removeSyncQueueItem(item.id);
        result.synced++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(error.message);
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  // Get sync queue status
  async getSyncStatus(): Promise<{
    pendingItems: number;
    byStore: Record<string, number>;
  }> {
    const queue = await localDB.getSyncQueue();
    
    const byStore: Record<string, number> = {};
    queue.forEach(item => {
      byStore[item.store] = (byStore[item.store] || 0) + 1;
    });

    return {
      pendingItems: queue.length,
      byStore,
    };
  }

  // Clear sync queue (use with caution)
  async clearSyncQueue(): Promise<void> {
    await localDB.clearSyncQueue();
  }

  // Download all data from server (initial sync or refresh)
  async downloadAll(): Promise<void> {
    if (!this.isOnline() || !this.config.authToken) return;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.config.authToken}`,
    };

    const stores = [
      { store: STORES.PROJECTS, endpoint: '/projects' },
      { store: STORES.CONTACTS, endpoint: '/contacts' },
      // Add other stores as needed
    ];

    for (const { store, endpoint } of stores) {
      try {
        const response = await fetch(`${this.config.apiBaseUrl}${endpoint}`, { headers });
        if (response.ok) {
          const data = await response.json();
          // Clear local store and add server data
          await localDB.clear(store as any);
          for (const item of data) {
            await localDB.put(store as any, item, false); // Don't add to sync queue
          }
        }
      } catch (error) {
        console.error(`Failed to download ${store}:`, error);
      }
    }
  }

  // Upload a file (photos, PDFs)
  async uploadFile(file: File, type: 'photo' | 'document'): Promise<string | null> {
    if (!this.isOnline() || !this.config.authToken) {
      // Store locally and queue for later upload
      return this.storeFileLocally(file);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return result.url;
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }

    // Fallback to local storage
    return this.storeFileLocally(file);
  }

  // Store file locally as base64
  private async storeFileLocally(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

export const syncService = new SyncService();
