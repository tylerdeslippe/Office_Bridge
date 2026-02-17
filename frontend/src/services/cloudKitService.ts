/**
 * CloudKit Sync Service
 * 
 * Uses Apple's CloudKit for device-to-device sync
 * Data is stored in iCloud and shared across user's devices + team members
 * 
 * Note: CloudKit is only available on native iOS. This service gracefully
 * handles the web/browser case by returning false/empty results.
 */

import { localDB, STORES, StoreName } from '../utils/localDB';

// CloudKit record types
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

export interface Company {
  id: string;
  name: string;
  shareUrl?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
}

// CloudKit plugin will be injected by native iOS code
// Access via window.CloudKitPlugin when available
declare global {
  interface Window {
    CloudKitPlugin?: {
      configure(options: { containerIdentifier: string }): Promise<void>;
      getAccountStatus(): Promise<{ accountStatus: string }>;
      createRecordZone(options: { zoneName: string; database: string }): Promise<{ zoneName: string }>;
      saveRecord(options: any): Promise<{ recordName: string }>;
      queryRecords(options: any): Promise<{ records: any[] }>;
      fetchRecord(options: any): Promise<{ record: any }>;
      createShare(options: any): Promise<{ shareUrl: string }>;
    };
  }
}

class CloudKitService {
  private isAvailable = false;
  private isSignedIn = false;
  private containerIdentifier = 'iCloud.com.faithfulandtrue.officebridge';
  private companyShareZone: string | null = null;
  
  async init(): Promise<boolean> {
    // Check if running on iOS with CloudKit available
    if (typeof window !== 'undefined' && window.CloudKitPlugin) {
      try {
        await window.CloudKitPlugin.configure({ containerIdentifier: this.containerIdentifier });
        
        const status = await window.CloudKitPlugin.getAccountStatus();
        this.isSignedIn = status.accountStatus === 'available';
        this.isAvailable = true;
        
        if (this.isSignedIn) {
          await this.loadCompanyZone();
        }
        
        console.log('CloudKit initialized:', { isSignedIn: this.isSignedIn });
        return this.isSignedIn;
      } catch (error) {
        console.log('CloudKit initialization failed:', error);
        this.isAvailable = false;
        return false;
      }
    }
    
    console.log('CloudKit not available (running in browser or plugin not installed)');
    return false;
  }
  
  isReady(): boolean {
    return this.isAvailable && this.isSignedIn;
  }
  
  async getAccountStatus(): Promise<'available' | 'noAccount' | 'restricted' | 'unknown'> {
    if (!this.isAvailable || !window.CloudKitPlugin) return 'unknown';
    try {
      const status = await window.CloudKitPlugin.getAccountStatus();
      return status.accountStatus as any;
    } catch {
      return 'unknown';
    }
  }
  
  async createCompany(name: string): Promise<Company | null> {
    if (!this.isReady() || !window.CloudKitPlugin) return null;
    
    try {
      const zoneResult = await window.CloudKitPlugin.createRecordZone({
        zoneName: `company_${Date.now()}`,
        database: 'shared',
      });
      
      const company: Company = {
        id: zoneResult.zoneName,
        name,
        ownerId: 'current_user',
        memberIds: [],
        createdAt: new Date().toISOString(),
      };
      
      await window.CloudKitPlugin.saveRecord({
        recordType: RECORD_TYPES.COMPANY,
        recordName: company.id,
        zoneName: zoneResult.zoneName,
        database: 'shared',
        fields: {
          name: { value: name },
          createdAt: { value: company.createdAt },
        },
      });
      
      const shareResult = await window.CloudKitPlugin.createShare({
        recordName: company.id,
        zoneName: zoneResult.zoneName,
        database: 'shared',
        publicPermission: 'readWrite',
      });
      
      company.shareUrl = shareResult.shareUrl;
      this.companyShareZone = zoneResult.zoneName;
      
      await localDB.setSetting('company', company);
      
      return company;
    } catch (error) {
      console.error('Failed to create company:', error);
      return null;
    }
  }
  
  async getShareUrl(): Promise<string | null> {
    const company = await localDB.getSetting<Company>('company');
    return company?.shareUrl || null;
  }
  
  private async loadCompanyZone(): Promise<void> {
    const company = await localDB.getSetting<Company>('company');
    if (company) {
      this.companyShareZone = company.id;
    }
  }
  
  async syncRecord(store: StoreName, recordType: string, data: any): Promise<boolean> {
    if (!this.isReady() || !this.companyShareZone || !window.CloudKitPlugin) {
      await this.queueForSync(store, data);
      return false;
    }
    
    try {
      const fields = this.dataToFields(data);
      
      await window.CloudKitPlugin.saveRecord({
        recordType,
        recordName: data.id,
        zoneName: this.companyShareZone,
        database: 'shared',
        fields,
      });
      
      await this.markSynced(store, data.id);
      return true;
    } catch (error) {
      console.error(`Failed to sync ${recordType}:`, error);
      await this.queueForSync(store, data);
      return false;
    }
  }
  
  async fetchRecords(recordType: string): Promise<any[]> {
    if (!this.isReady() || !this.companyShareZone || !window.CloudKitPlugin) return [];
    
    try {
      const result = await window.CloudKitPlugin.queryRecords({
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
  
  async fullSync(): Promise<{ success: boolean; synced: number; errors: number }> {
    if (!this.isReady()) {
      return { success: false, synced: 0, errors: 0 };
    }
    
    let synced = 0;
    let errors = 0;
    
    const syncMap: [StoreName, string][] = [
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
        const localRecords = await localDB.getAll(store);
        const unsynced = localRecords.filter((r: any) => r._needsSync);
        
        for (const record of unsynced) {
          const success = await this.syncRecord(store, recordType, record);
          if (success) synced++;
          else errors++;
        }
        
        const remoteRecords = await this.fetchRecords(recordType);
        for (const record of remoteRecords) {
          const local = await localDB.getById(store, record.id) as any;
          if (!local || (record.updatedAt && local.updatedAt && new Date(record.updatedAt) > new Date(local.updatedAt))) {
            await localDB.put(store, { ...record, _needsSync: false } as any, false);
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
  
  private async queueForSync(store: StoreName, data: any): Promise<void> {
    await localDB.put(store, { ...data, _needsSync: true } as any, false);
  }
  
  private async markSynced(store: StoreName, id: string): Promise<void> {
    const record = await localDB.getById(store, id);
    if (record) {
      await localDB.put(store, { ...record, _needsSync: false, _lastSyncedAt: new Date().toISOString() } as any, false);
    }
  }
  
  private dataToFields(data: any): Record<string, { value: any }> {
    const fields: Record<string, { value: any }> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue;
      if (value === null || value === undefined) continue;
      
      if (Array.isArray(value) || typeof value === 'object') {
        fields[key] = { value: JSON.stringify(value) };
      } else {
        fields[key] = { value };
      }
    }
    
    return fields;
  }
  
  private fieldsToData(record: any): any {
    const data: any = { id: record.recordName };
    
    for (const [key, field] of Object.entries(record.fields || {})) {
      const value = (field as any).value;
      
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
  
  async uploadAsset(recordId: string, fieldName: string, base64Data: string, mimeType: string): Promise<string | null> {
    if (!this.isReady() || !this.companyShareZone || !window.CloudKitPlugin) return null;
    
    try {
      const result = await window.CloudKitPlugin.saveRecord({
        recordType: RECORD_TYPES.PHOTO,
        recordName: recordId,
        zoneName: this.companyShareZone,
        database: 'shared',
        assets: { [fieldName]: { data: base64Data, mimeType } },
      });
      
      return result.recordName;
    } catch (error) {
      console.error('Failed to upload asset:', error);
      return null;
    }
  }
  
  async downloadAsset(recordId: string, fieldName: string): Promise<string | null> {
    if (!this.isReady() || !this.companyShareZone || !window.CloudKitPlugin) return null;
    
    try {
      const result = await window.CloudKitPlugin.fetchRecord({
        recordName: recordId,
        zoneName: this.companyShareZone,
        database: 'shared',
      });
      
      return result.record?.assets?.[fieldName]?.downloadURL || null;
    } catch (error) {
      console.error('Failed to download asset:', error);
      return null;
    }
  }
}

export const cloudKitService = new CloudKitService();
