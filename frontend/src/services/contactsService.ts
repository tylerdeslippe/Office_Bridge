/**
 * Contacts Data Service - Local-first with optional sync
 */

import { localDB, STORES } from '../utils/localDB';

export interface Contact {
  id: string;
  
  // Basic Info
  type: 'gc' | 'owner' | 'architect' | 'engineer' | 'supplier' | 'subcontractor' | 'other';
  companyName: string;
  
  // Primary Contact
  contactName?: string;
  title?: string;
  
  // Contact Methods
  phone?: string;
  mobile?: string;
  email?: string;
  
  // Address
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  
  // Additional
  website?: string;
  notes?: string;
  
  // Usage tracking
  lastUsed?: string;
  useCount: number;
  
  // Meta
  createdAt: string;
  updatedAt: string;
}

export type ContactType = 'all' | 'gc' | 'owner' | 'architect' | 'engineer' | 'supplier' | 'subcontractor' | 'other';

class ContactsService {
  
  // Get all contacts
  async getAll(): Promise<Contact[]> {
    const contacts = await localDB.getAll<Contact>(STORES.CONTACTS);
    return contacts.sort((a, b) => a.companyName.localeCompare(b.companyName));
  }

  // Get contact by ID
  async getById(id: string): Promise<Contact | undefined> {
    return localDB.getById<Contact>(STORES.CONTACTS, id);
  }

  // Get contacts by type
  async getByType(type: ContactType): Promise<Contact[]> {
    if (type === 'all') {
      return this.getAll();
    }
    return localDB.getByIndex<Contact>(STORES.CONTACTS, 'type', type);
  }

  // Get frequently used contacts
  async getFrequent(limit: number = 10): Promise<Contact[]> {
    const all = await this.getAll();
    return all
      .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
      .slice(0, limit);
  }

  // Get recently used contacts
  async getRecent(limit: number = 10): Promise<Contact[]> {
    const all = await this.getAll();
    return all
      .filter(c => c.lastUsed)
      .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())
      .slice(0, limit);
  }

  // Create new contact
  async create(contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>): Promise<Contact> {
    return localDB.add<Contact>(STORES.CONTACTS, {
      ...contact,
      useCount: 0,
    } as Contact);
  }

  // Update contact
  async update(id: string, updates: Partial<Contact>): Promise<Contact> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Contact not found');

    return localDB.put<Contact>(STORES.CONTACTS, { ...existing, ...updates, id });
  }

  // Delete contact
  async delete(id: string): Promise<void> {
    return localDB.delete(STORES.CONTACTS, id);
  }

  // Track usage (call when contact is selected/used)
  async trackUsage(id: string): Promise<Contact> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Contact not found');

    return localDB.put<Contact>(STORES.CONTACTS, {
      ...existing,
      lastUsed: new Date().toISOString(),
      useCount: (existing.useCount || 0) + 1,
    });
  }

  // Search contacts
  async search(query: string): Promise<Contact[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();
    
    return all.filter(c => 
      c.companyName.toLowerCase().includes(lowerQuery) ||
      c.contactName?.toLowerCase().includes(lowerQuery) ||
      c.email?.toLowerCase().includes(lowerQuery) ||
      c.phone?.includes(query)
    );
  }

  // Get suppliers (for PO vendor selection)
  async getSuppliers(): Promise<Contact[]> {
    return this.getByType('supplier');
  }

  // Get GCs (for project selection)
  async getGCs(): Promise<Contact[]> {
    return this.getByType('gc');
  }
}

export const contactsService = new ContactsService();
