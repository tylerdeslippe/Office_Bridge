/**
 * Deliveries Data Service - Local-first with optional sync
 */

import { localDB, STORES } from '../utils/localDB';

export interface Delivery {
  id: string;
  projectId: string;
  
  // Supplier info
  supplierName: string;
  supplierPhone?: string;
  supplierContact?: string;
  
  // Order info
  poNumber?: string;
  description: string;
  contents: string[];
  
  // Tracking
  trackingNumber?: string;
  carrier?: string;
  
  // Dates
  orderDate: string;
  releaseDate?: string;
  estimatedArrival: string;
  actualArrival?: string;
  
  // Status
  isReleased: boolean;
  isDelivered: boolean;
  
  // Notifications
  notify24hr: boolean;
  notificationSent?: boolean;
  
  // Meta
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = 'all' | 'pending' | 'released' | 'delivered' | 'late';

class DeliveriesService {
  
  // Get all deliveries for a project
  async getByProject(projectId: string): Promise<Delivery[]> {
    return localDB.getByIndex<Delivery>(STORES.DELIVERIES, 'projectId', projectId);
  }

  // Get all deliveries
  async getAll(): Promise<Delivery[]> {
    return localDB.getAll<Delivery>(STORES.DELIVERIES);
  }

  // Get delivery by ID
  async getById(id: string): Promise<Delivery | undefined> {
    return localDB.getById<Delivery>(STORES.DELIVERIES, id);
  }

  // Create new delivery
  async create(delivery: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt'>): Promise<Delivery> {
    return localDB.add<Delivery>(STORES.DELIVERIES, delivery as Delivery);
  }

  // Update delivery
  async update(id: string, updates: Partial<Delivery>): Promise<Delivery> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Delivery not found');
    
    const updated = { ...existing, ...updates, id };
    return localDB.put<Delivery>(STORES.DELIVERIES, updated);
  }

  // Delete delivery
  async delete(id: string): Promise<void> {
    return localDB.delete(STORES.DELIVERIES, id);
  }

  // Mark as released
  async markReleased(id: string): Promise<Delivery> {
    return this.update(id, {
      isReleased: true,
      releaseDate: new Date().toISOString().split('T')[0],
    });
  }

  // Mark as delivered
  async markDelivered(id: string): Promise<Delivery> {
    return this.update(id, {
      isDelivered: true,
      actualArrival: new Date().toISOString().split('T')[0],
    });
  }

  // Get deliveries by status
  async getByStatus(projectId: string, status: DeliveryStatus): Promise<Delivery[]> {
    const all = await this.getByProject(projectId);
    const today = new Date().toISOString().split('T')[0];

    switch (status) {
      case 'pending':
        return all.filter(d => !d.isReleased && !d.isDelivered);
      case 'released':
        return all.filter(d => d.isReleased && !d.isDelivered);
      case 'delivered':
        return all.filter(d => d.isDelivered);
      case 'late':
        return all.filter(d => !d.isDelivered && d.estimatedArrival < today);
      default:
        return all;
    }
  }

  // Get deliveries arriving within 24 hours
  async getArrivingSoon(projectId: string): Promise<Delivery[]> {
    const all = await this.getByProject(projectId);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return all.filter(d => {
      if (d.isDelivered) return false;
      const eta = new Date(d.estimatedArrival);
      return eta <= tomorrow && eta > now;
    });
  }

  // Get stats for project
  async getStats(projectId: string): Promise<{
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    late: number;
  }> {
    const all = await this.getByProject(projectId);
    const today = new Date().toISOString().split('T')[0];

    return {
      total: all.length,
      pending: all.filter(d => !d.isReleased && !d.isDelivered).length,
      inTransit: all.filter(d => d.isReleased && !d.isDelivered).length,
      delivered: all.filter(d => d.isDelivered).length,
      late: all.filter(d => !d.isDelivered && d.estimatedArrival < today).length,
    };
  }
}

export const deliveriesService = new DeliveriesService();
