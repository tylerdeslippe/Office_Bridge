/**
 * Local Database Service - IndexedDB wrapper for offline-first storage
 * Stores all app data locally on device, syncs to server when online
 */

const DB_NAME = 'office_bridge_db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  PROJECTS: 'projects',
  DELIVERIES: 'deliveries',
  PURCHASE_ORDERS: 'purchase_orders',
  LOOK_AHEAD: 'look_ahead',
  DAILY_REPORTS: 'daily_reports',
  PHOTOS: 'photos',
  CONTACTS: 'contacts',
  TASKS: 'tasks',
  QUOTES: 'quotes',
  SYNC_QUEUE: 'sync_queue',
  USER_SETTINGS: 'user_settings',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

interface SyncQueueItem {
  id: string;
  store: StoreName;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
}

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Projects store
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          const projectStore = db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
          projectStore.createIndex('status', 'status', { unique: false });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Deliveries store
        if (!db.objectStoreNames.contains(STORES.DELIVERIES)) {
          const deliveryStore = db.createObjectStore(STORES.DELIVERIES, { keyPath: 'id' });
          deliveryStore.createIndex('projectId', 'projectId', { unique: false });
          deliveryStore.createIndex('estimatedArrival', 'estimatedArrival', { unique: false });
          deliveryStore.createIndex('isDelivered', 'isDelivered', { unique: false });
        }

        // Purchase Orders store
        if (!db.objectStoreNames.contains(STORES.PURCHASE_ORDERS)) {
          const poStore = db.createObjectStore(STORES.PURCHASE_ORDERS, { keyPath: 'id' });
          poStore.createIndex('projectId', 'projectId', { unique: false });
          poStore.createIndex('poNumber', 'poNumber', { unique: false });
          poStore.createIndex('status', 'status', { unique: false });
        }

        // Look-Ahead store
        if (!db.objectStoreNames.contains(STORES.LOOK_AHEAD)) {
          const lookAheadStore = db.createObjectStore(STORES.LOOK_AHEAD, { keyPath: 'id' });
          lookAheadStore.createIndex('projectId', 'projectId', { unique: false });
          lookAheadStore.createIndex('date', 'date', { unique: false });
        }

        // Daily Reports store
        if (!db.objectStoreNames.contains(STORES.DAILY_REPORTS)) {
          const reportStore = db.createObjectStore(STORES.DAILY_REPORTS, { keyPath: 'id' });
          reportStore.createIndex('projectId', 'projectId', { unique: false });
          reportStore.createIndex('reportDate', 'reportDate', { unique: false });
        }

        // Photos store (metadata only, actual files in separate storage)
        if (!db.objectStoreNames.contains(STORES.PHOTOS)) {
          const photoStore = db.createObjectStore(STORES.PHOTOS, { keyPath: 'id' });
          photoStore.createIndex('projectId', 'projectId', { unique: false });
          photoStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Contacts store
        if (!db.objectStoreNames.contains(STORES.CONTACTS)) {
          const contactStore = db.createObjectStore(STORES.CONTACTS, { keyPath: 'id' });
          contactStore.createIndex('companyName', 'companyName', { unique: false });
          contactStore.createIndex('type', 'type', { unique: false });
        }

        // Tasks store
        if (!db.objectStoreNames.contains(STORES.TASKS)) {
          const taskStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
          taskStore.createIndex('projectId', 'projectId', { unique: false });
          taskStore.createIndex('status', 'status', { unique: false });
          taskStore.createIndex('assignedTo', 'assignedTo', { unique: false });
        }

        // Quotes store
        if (!db.objectStoreNames.contains(STORES.QUOTES)) {
          const quoteStore = db.createObjectStore(STORES.QUOTES, { keyPath: 'id' });
          quoteStore.createIndex('status', 'status', { unique: false });
        }

        // Sync Queue store (for offline changes to sync later)
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // User Settings store
        if (!db.objectStoreNames.contains(STORES.USER_SETTINGS)) {
          db.createObjectStore(STORES.USER_SETTINGS, { keyPath: 'key' });
        }
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.dbReady;
  }

  // ============================================
  // GENERIC CRUD OPERATIONS
  // ============================================

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getById<T>(storeName: StoreName, id: string | number): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(storeName: StoreName, indexName: string, value: any): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T extends { id: string | number }>(storeName: StoreName, data: T, addToSyncQueue = true): Promise<T> {
    const db = await this.getDB();
    
    // Add timestamps
    const dataWithTimestamp = {
      ...data,
      updatedAt: new Date().toISOString(),
      createdAt: (data as any).createdAt || new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(dataWithTimestamp);

      request.onsuccess = async () => {
        // Add to sync queue for later server sync
        if (addToSyncQueue) {
          await this.addToSyncQueue(storeName, 'update', dataWithTimestamp);
        }
        resolve(dataWithTimestamp as T);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async add<T extends { id?: string | number }>(storeName: StoreName, data: T, addToSyncQueue = true): Promise<T> {
    const db = await this.getDB();
    
    // Generate ID if not provided
    const dataWithId = {
      ...data,
      id: data.id || this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(dataWithId);

      request.onsuccess = async () => {
        if (addToSyncQueue) {
          await this.addToSyncQueue(storeName, 'create', dataWithId);
        }
        resolve(dataWithId as T);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: StoreName, id: string | number, addToSyncQueue = true): Promise<void> {
    const db = await this.getDB();
    
    // Get the item first for sync queue
    const item = addToSyncQueue ? await this.getById(storeName, id) : null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = async () => {
        if (addToSyncQueue && item) {
          await this.addToSyncQueue(storeName, 'delete', { id });
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: StoreName): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // SYNC QUEUE OPERATIONS
  // ============================================

  private async addToSyncQueue(store: StoreName, action: 'create' | 'update' | 'delete', data: any): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: this.generateId(),
      store,
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const queueStore = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = queueStore.add(queueItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    return this.delete(STORES.SYNC_QUEUE, id, false);
  }

  async clearSyncQueue(): Promise<void> {
    return this.clear(STORES.SYNC_QUEUE);
  }

  // ============================================
  // USER SETTINGS
  // ============================================

  async getSetting<T>(key: string): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.USER_SETTINGS, 'readonly');
      const store = transaction.objectStore(STORES.USER_SETTINGS);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.USER_SETTINGS, 'readwrite');
      const store = transaction.objectStore(STORES.USER_SETTINGS);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { used: 0, quota: 0 };
  }
}

// Export singleton instance
export const localDB = new LocalDatabase();
