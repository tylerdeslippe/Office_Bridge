/**
 * Purchase Orders Data Service - Local-first with optional sync
 */

import { localDB, STORES } from '../utils/localDB';

export interface POLineItem {
  id: string;
  quantity: number;
  description: string;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  projectId: string;
  
  // PO Info
  poNumber: string;
  jobNumber: string;
  jobName: string;
  date: string;
  
  // Vendor Info
  vendorName: string;
  vendorAddress?: string;
  vendorCity?: string;
  vendorState?: string;
  vendorZip?: string;
  vendorPhone?: string;
  vendorContact?: string;
  vendorOrderNumber?: string;
  
  // Ship To
  shipToAddress?: string;
  shipToCity?: string;
  shipToState?: string;
  shipToZip?: string;
  shipVia?: string;
  shipmentWanted?: string;
  
  // Line Items
  lineItems: POLineItem[];
  
  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  
  // Status
  status: 'draft' | 'sent' | 'acknowledged' | 'received' | 'cancelled';
  sentAt?: string;
  acknowledgedAt?: string;
  receivedAt?: string;
  
  // Notes
  specialInstructions?: string;
  
  // Meta
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type POStatus = 'all' | 'draft' | 'sent' | 'acknowledged' | 'received' | 'cancelled';

class PurchaseOrdersService {
  
  // Get all POs for a project
  async getByProject(projectId: string): Promise<PurchaseOrder[]> {
    return localDB.getByIndex<PurchaseOrder>(STORES.PURCHASE_ORDERS, 'projectId', projectId);
  }

  // Get all POs
  async getAll(): Promise<PurchaseOrder[]> {
    return localDB.getAll<PurchaseOrder>(STORES.PURCHASE_ORDERS);
  }

  // Get PO by ID
  async getById(id: string): Promise<PurchaseOrder | undefined> {
    return localDB.getById<PurchaseOrder>(STORES.PURCHASE_ORDERS, id);
  }

  // Get PO by number
  async getByNumber(poNumber: string): Promise<PurchaseOrder | undefined> {
    const all = await this.getAll();
    return all.find(po => po.poNumber === poNumber);
  }

  // Create new PO
  async create(po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<PurchaseOrder> {
    // Calculate totals
    const subtotal = po.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const taxAmount = subtotal * (po.taxRate / 100);
    const total = subtotal + taxAmount;

    const poWithTotals = {
      ...po,
      subtotal,
      taxAmount,
      total,
      lineItems: po.lineItems.map(item => ({
        ...item,
        lineTotal: item.quantity * item.unitCost,
      })),
    };

    return localDB.add<PurchaseOrder>(STORES.PURCHASE_ORDERS, poWithTotals as PurchaseOrder);
  }

  // Update PO
  async update(id: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Purchase Order not found');

    // Recalculate totals if line items changed
    let updatedPO = { ...existing, ...updates, id };
    
    if (updates.lineItems || updates.taxRate !== undefined) {
      const lineItems = updates.lineItems || existing.lineItems;
      const taxRate = updates.taxRate ?? existing.taxRate;
      
      const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      updatedPO = {
        ...updatedPO,
        subtotal,
        taxAmount,
        total,
        lineItems: lineItems.map(item => ({
          ...item,
          lineTotal: item.quantity * item.unitCost,
        })),
      };
    }

    return localDB.put<PurchaseOrder>(STORES.PURCHASE_ORDERS, updatedPO);
  }

  // Delete PO
  async delete(id: string): Promise<void> {
    return localDB.delete(STORES.PURCHASE_ORDERS, id);
  }

  // Mark as sent
  async markSent(id: string): Promise<PurchaseOrder> {
    return this.update(id, {
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
  }

  // Mark as acknowledged
  async markAcknowledged(id: string): Promise<PurchaseOrder> {
    return this.update(id, {
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
    });
  }

  // Mark as received
  async markReceived(id: string): Promise<PurchaseOrder> {
    return this.update(id, {
      status: 'received',
      receivedAt: new Date().toISOString(),
    });
  }

  // Cancel PO
  async cancel(id: string): Promise<PurchaseOrder> {
    return this.update(id, { status: 'cancelled' });
  }

  // Get POs by status
  async getByStatus(projectId: string, status: POStatus): Promise<PurchaseOrder[]> {
    const all = await this.getByProject(projectId);
    
    if (status === 'all') return all;
    return all.filter(po => po.status === status);
  }

  // Generate next PO number
  async generatePONumber(projectId: string): Promise<string> {
    const all = await this.getByProject(projectId);
    const year = new Date().getFullYear();
    const count = all.filter(po => po.poNumber.includes(year.toString())).length + 1;
    return `PO-${year}-${count.toString().padStart(3, '0')}`;
  }

  // Get stats for project
  async getStats(projectId: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    acknowledged: number;
    received: number;
    totalValue: number;
  }> {
    const all = await this.getByProject(projectId);

    return {
      total: all.length,
      draft: all.filter(po => po.status === 'draft').length,
      sent: all.filter(po => po.status === 'sent').length,
      acknowledged: all.filter(po => po.status === 'acknowledged').length,
      received: all.filter(po => po.status === 'received').length,
      totalValue: all.reduce((sum, po) => sum + po.total, 0),
    };
  }
}

export const purchaseOrdersService = new PurchaseOrdersService();
