/**
 * CloudKit Sync Service
 * 
 * Uses Apple's CloudKit (via Capacitor plugin) for device-to-device sync
 * Data is stored in iCloud and shared across user's devices + team members
 * 
 * Architecture:
 * - Private Database: User's personal data (settings, preferences)
 * - Shared Database: Company/team data (projects, deliveries, reports)
 * 
 * How sharing works:
 * 1. User creates a "Company" share zone
 * 2. Invites team members via email/iMessage
 * 3. All team members see the same projects, deliveries, etc.
 */

import { localDB, STORES } from '../utils/localDB';

// CloudKit record types (must match CloudKit schema)
export const RECORD_TYPES = {
  COMPANY: 'Company',
  PROJECT: 'Project',
  DELIVERY: 'Delivery',
  DAILY_REPORT: 'DailyReport',
  TASK: 'Task',
  CONTACT: 'Contact',
  PURCHASE_ORDER: 'PurchaseOrder',
  LOOK_AHEAD: 'LookAhead',
  QUOTE: 'Quote',
  PHOTO: 'Photo',
} as const;

// Sync status for each record
export interface SyncStatus {
  localId: string;
  cloudKitRecordName?: string;
  lastSyncedAt?: string;
  needsSync: boolean;
  syncError?: string;
}

// Company/Team info
export interface Company {
  id: string;
  name: string;
  shareUrl?: string; // CloudKit share URL for inviting members
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

class CloudKitService {
  private isAvailable = false;
  private isSignedIn = false;
  private containerIdentifier = 'iCloud.com.faithfulandtrue.officebridge';
  private companyShareZone: string | null = null;
  
  /**
   * Initialize CloudKit
   * Call this on app startup
   */
  async init(): Promise<boolean> {
    // Check if running on iOS with CloudKit available
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
      try {
        // Check if CloudKit plugin is available
        const { CloudKit } = await import('@capacitor-community/cloudkit');
        
        // Configure CloudKit
        await CloudKit.configure({
          containerIdentifier: this.containerIdentifier,
        });
        
        // Check sign-in status
        const status = await CloudKit.getAccountStatus();
        this.isSignedIn = status.accountStatus === 'available';
        this.isAvailable = true;
        
        if (this.isSignedIn) {
          // Load company share zone if exists
          await this.loadCompanyZone();
        }
        
        console.log('☁️ CloudKit initialized:', { isSignedIn: this.isSignedIn });
        return this.isSignedIn;
      } catch (error) {
        console.log('CloudKit not available (running in browser or plugin not installed)');
        this.isAvailable = false;
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Check if CloudKit is available and user is signed in
   */
  isReady(): boolean {
    return this.isAvailable && this.isSignedIn;
  }
  
  /**
   * Get current iCloud account status
   */
  async getAccountStatus(): Promise<'available' | 'noAccount' | 'restricted' | 'unknown'> {
    if (!this.isAvailable) return 'unknown';
    
    try {
      const { CloudKit } = await import('@capacitor-community/cloudkit');
      const status = await CloudKit.getAccountStatus();
      return status.accountStatus as any;
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Create or join a company (shared zone)
   */
  async createCompany(name: string): Promise<Company | null> {
    if (!this.isReady()) return null;
    
    try {
      const { CloudKit } = await import('@capacitor-community/cloudkit');
      
      // Create a shared zone for the company
      const zoneResult = await CloudKit.createRecordZone({
        zoneName: `company_${Date.now()}`,
        database: 'shared',
      });
      
      const company: Company = {
        id: zoneResult.zoneName,
        name,
        ownerId: 'current_user', // Will be set by CloudKit
        memberIds: [],
        createdAt: new Date().toISOString(),
      };
      
      // Save company record
      await CloudKit.saveRecord({
        recordType: RECORD_TYPES.COMPANY,
        recordName: company.id,
        zoneName: zoneResult.zoneName,
        database: 'shared',
        fields: {
          name: { value: name },
          createdAt: { value: company.createdAt },
        },
      });
      
      // Create share for inviting team members
      const shareResult = await CloudKit.createShare({
        recordName: company.id,
        zoneName: zoneResult.zoneName,
        database: 'shared',
        publicPermission: 'readWrite',
      });
      
      company.shareUrl = shareResult.shareUrl;
      this.companyShareZone = zoneResult.zoneName;
      
      // Save locally
      await localDB.setSetting('company', company);
      
      return company;
    } catch (error) {
      console.error('Failed to create company:', error);
      return null;
    }
  }
  
  /**
   * Get share URL to invite team members
   */
  async getShareUrl(): Promise<string | null> {
    const company = await localDB.getSetting<Company>('company');
    return company?.shareUrl || null;
  }
  
  /**
   * Load existing company zone
   */
  private async loadCompanyZone(): Promise<void> {
    const company = await localDB.getSetting<Company>('company');
    if (company) {
      this.companyShareZone = company.id;
    }
  }
  
  /**
   * Sync a record to CloudKit
   */
  async syncRecord(
    store: string,
    recordType: string,
    data: any
  ): Promise<boolean> {
    if (!this.isReady() || !this.companyShareZone) {
      // Queue for later sync
      await this.queueForSync(store, data);
      return false;
    }
    
    try {
      const { CloudKit } = await import('@capacitor-community/cloudkit');
      
      // Convert data to CloudKit fields
      const fields = this.dataToFields(data);
      
      await CloudKit.saveRecord({
        recordType,
        recordName: data.id,
        zoneName: this.companyShareZone,
        database: 'shared',
        fields,
      });
      
      // Mark as synced locally
      await this.markSynced(store, data.id);
      
      return true;
    } catch (error) {
      console.error(`Failed to sync ${recordType}:`, error);
      await this.queueForSync(store, data);
      return false;
    }
  }
  
  /**
   * Fetch records from CloudKit
   */
  async fetchRecords(recordType: string): Promise<any[]> {
    if (!this.isReady() || !this.companyShareZone) return [];
    
    try {
      const { CloudKit } = await import('@capacitor-community/cloudkit');
      
      const result = await CloudKit.queryRecords({
        recordType,
        zoneName: this.companyShareZone,
        database: 'shared',
      });
      
      return result.records.map((record: any) => this.fieldsToData(record));
    } catch (error) {
      console.error(`Failed to fetch ${recordType}:`, error);
      return [];
    }
  }
  
  /**
   * Subscribe to changes (push notifications)
   */
  async subscribeToChanges(recordType: string): Promise<boolean> {
    if (!this.isReady() || !this.companyShareZone) return false;
    
    try {
      const { CloudKit } = await import('@capacitor-community/cloudkit');
      
      await CloudKit.createSubscription({
        subscriptionID: `${recordType}_changes`,
        recordType,
        zoneName: this.companyShareZone,
        database: 'shared',
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to subscribe to ${recordType}:`, error);
      return false;
    }
  }
  
  /**
   * Full sync - pull all data from CloudKit and merge with local
   */
  async fullSync(): Promise<{ success: boolean; synced: number; errors: number }> {
    if (!this.isReady()) {
      return { success: false, synced: 0, errors: 0 };
    }
    
    let synced = 0;
    let errors = 0;
    
    const syncMap: [string, string][] = [
      [STORES.PROJECTS, RECORD_TYPES.PROJECT],
      [STORES.DELIVERIES, RECORD_TYPES.DELIVERY],
      [STORES.DAILY_REPORTS, RECORD_TYPES.DAILY_REPORT],
      [STORES.TASKS, RECORD_TYPES.TASK],
      [STORES.CONTACTS, RECORD_TYPES.CONTACT],
      [STORES.PURCHASE_ORDERS, RECORD_TYPES.PURCHASE_ORDER],
      [STORES.LOOK_AHEAD, RECORD_TYPES.LOOK_AHEAD],
      [STORES.QUOTES, RECORD_TYPES.QUOTE],
    ];
    
    for (const [store, recordType] of syncMap) {
      try {
        // Push local changes
        const localRecords = await localDB.getAll(store);
        const unsynced = localRecords.filter((r: any) => r._needsSync);
        
        for (const record of unsynced) {
          const success = await this.syncRecord(store, recordType, record);
          if (success) synced++;
          else errors++;
        }
        
        // Pull remote changes
        const remoteRecords = await this.fetchRecords(recordType);
        for (const record of remoteRecords) {
          // Merge: remote wins if newer
          const local = await localDB.getById(store, record.id);
          if (!local || new Date(record.updatedAt) > new Date(local.updatedAt)) {
            await localDB.put(store, { ...record, _needsSync: false }, false);
            synced++;
          }
        }
      } catch (error) {
        console.error(`Sync error for ${store}:`, error);
        errors++;
      }
    }
    
    return { success: errors === 0, synced, errors };
  }
  
  /**
   * Queue record for sync when offline
   */
  private async queueForSync(store: string, data: any): Promise<void> {
    await localDB.put(store, { ...data, _needsSync: true }, false);
  }
  
  /**
   * Mark record as synced
   */
  private async markSynced(store: string, id: string): Promise<void> {
    const record = await localDB.getById(store, id);
    if (record) {
      await localDB.put(store, { ...record, _needsSync: false, _lastSyncedAt: new Date().toISOString() }, false);
    }
  }
  
  /**
   * Convert local data to CloudKit fields
   */
  private dataToFields(data: any): Record<string, { value: any }> {
    const fields: Record<string, { value: any }> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue; // Skip internal fields
      
      if (value === null || value === undefined) continue;
      
      if (Array.isArray(value)) {
        fields[key] = { value: JSON.stringify(value) };
      } else if (typeof value === 'object') {
        fields[key] = { value: JSON.stringify(value) };
      } else {
        fields[key] = { value };
      }
    }
    
    return fields;
  }
  
  /**
   * Convert CloudKit fields to local data
   */
  private fieldsToData(record: any): any {
    const data: any = {
      id: record.recordName,
    };
    
    for (const [key, field] of Object.entries(record.fields || {})) {
      const value = (field as any).value;
      
      // Try to parse JSON strings
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      } else {
        data[key] = value;
      }
    }
    
    return data;
  }
  
  /**
   * Upload a photo/file to CloudKit
   */
  async uploadAsset(
    recordType: string,
    recordId: string,
    fieldName: string,
    base64Data: string,
    mimeType: string
  ): Promise<string | null> {
    if (!this.isReady() || !this.companyShareZone) return null;
    
    try {
      const { CloudKit } = await import('@capacitor-community/cloudkit');
      
      const result = await CloudKit.saveRecord({
        recordType,
        recordName: recordId,
        zoneName: this.companyShareZone,
        database: 'shared',
        assets: {
          [fieldName]: {
            data: base64Data,
            mimeType,
          },
        },
      });
      
      return result.recordName;
    } catch (error) {
      console.error('Failed to upload asset:', error);
      return null;
    }
  }
  
  /**
   * Download a photo/file from CloudKit
   */
  async downloadAsset(
    recordType: string,
    recordId: string,
    fieldName: string
  ): Promise<string | null> {
    if (!this.isReady() || !this.companyShareZone) return null;
    
    try {
      const { CloudKit } = await import('@capacitor-community/cloudkit');
      
      const result = await CloudKit.fetchRecord({
        recordName: recordId,
        zoneName: this.companyShareZone,
        database: 'shared',
      });
      
      const asset = result.record?.assets?.[fieldName];
      return asset?.downloadURL || null;
    } catch (error) {
      console.error('Failed to download asset:', error);
      return null;
    }
  }
}

export const cloudKitService = new CloudKitService();
