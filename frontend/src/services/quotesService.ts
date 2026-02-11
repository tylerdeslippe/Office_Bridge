/**
 * Quotes Data Service - Local-first with optional sync
 */

import { localDB, STORES } from '../utils/localDB';

export interface Quote {
  id: string;
  
  // Request Info
  title: string;
  description: string;
  
  // Location
  address?: string;
  latitude?: number;
  longitude?: number;
  
  // Customer
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  
  // Photos
  photoIds: string[];
  
  // Urgency
  urgency: 'standard' | 'rush' | 'emergency';
  
  // Scope
  scopeNotes?: string;
  
  // Status
  status: 'pending' | 'in_review' | 'quoted' | 'sent' | 'accepted' | 'declined' | 'expired';
  
  // Quote Response (filled by PM)
  quotedAmount?: number;
  quoteNotes?: string;
  quotedAt?: string;
  quotedBy?: string;
  
  // Customer Response
  customerResponseAt?: string;
  customerResponseNotes?: string;
  
  // Conversion
  convertedToProjectId?: string;
  convertedAt?: string;
  
  // Submission
  submittedBy?: string;
  submittedByName?: string;
  
  // Meta
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus = 'all' | 'pending' | 'in_review' | 'quoted' | 'sent' | 'accepted' | 'declined' | 'expired';

class QuotesService {
  
  // Get all quotes
  async getAll(): Promise<Quote[]> {
    const quotes = await localDB.getAll<Quote>(STORES.QUOTES);
    return quotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Get quote by ID
  async getById(id: string): Promise<Quote | undefined> {
    return localDB.getById<Quote>(STORES.QUOTES, id);
  }

  // Get quotes by status
  async getByStatus(status: QuoteStatus): Promise<Quote[]> {
    if (status === 'all') {
      return this.getAll();
    }
    return localDB.getByIndex<Quote>(STORES.QUOTES, 'status', status);
  }

  // Get pending quotes (for PM queue)
  async getPending(): Promise<Quote[]> {
    const all = await this.getAll();
    return all.filter(q => q.status === 'pending' || q.status === 'in_review');
  }

  // Create new quote request
  async create(quote: Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Quote> {
    return localDB.add<Quote>(STORES.QUOTES, {
      ...quote,
      status: 'pending',
    } as Quote);
  }

  // Update quote
  async update(id: string, updates: Partial<Quote>): Promise<Quote> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Quote not found');

    return localDB.put<Quote>(STORES.QUOTES, { ...existing, ...updates, id });
  }

  // Delete quote
  async delete(id: string): Promise<void> {
    return localDB.delete(STORES.QUOTES, id);
  }

  // Start review (PM picks up quote)
  async startReview(id: string, reviewerId: string): Promise<Quote> {
    return this.update(id, {
      status: 'in_review',
    });
  }

  // Submit quote amount
  async submitQuote(id: string, amount: number, notes: string, quotedBy: string): Promise<Quote> {
    return this.update(id, {
      status: 'quoted',
      quotedAmount: amount,
      quoteNotes: notes,
      quotedAt: new Date().toISOString(),
      quotedBy,
    });
  }

  // Send quote to customer
  async sendToCustomer(id: string): Promise<Quote> {
    return this.update(id, {
      status: 'sent',
    });
  }

  // Customer accepts
  async accept(id: string, notes?: string): Promise<Quote> {
    return this.update(id, {
      status: 'accepted',
      customerResponseAt: new Date().toISOString(),
      customerResponseNotes: notes,
    });
  }

  // Customer declines
  async decline(id: string, notes?: string): Promise<Quote> {
    return this.update(id, {
      status: 'declined',
      customerResponseAt: new Date().toISOString(),
      customerResponseNotes: notes,
    });
  }

  // Convert to project
  async convertToProject(id: string, projectId: string): Promise<Quote> {
    return this.update(id, {
      convertedToProjectId: projectId,
      convertedAt: new Date().toISOString(),
    });
  }

  // Mark as expired
  async markExpired(id: string): Promise<Quote> {
    return this.update(id, { status: 'expired' });
  }

  // Get stats
  async getStats(): Promise<{
    total: number;
    pending: number;
    inReview: number;
    quoted: number;
    accepted: number;
    declined: number;
    conversionRate: number;
  }> {
    const all = await this.getAll();

    const accepted = all.filter(q => q.status === 'accepted').length;
    const declined = all.filter(q => q.status === 'declined').length;
    const responded = accepted + declined;

    return {
      total: all.length,
      pending: all.filter(q => q.status === 'pending').length,
      inReview: all.filter(q => q.status === 'in_review').length,
      quoted: all.filter(q => q.status === 'quoted' || q.status === 'sent').length,
      accepted,
      declined,
      conversionRate: responded > 0 ? Math.round((accepted / responded) * 100) : 0,
    };
  }

  // Get quotes by urgency
  async getByUrgency(urgency: 'standard' | 'rush' | 'emergency'): Promise<Quote[]> {
    const all = await this.getAll();
    return all.filter(q => q.urgency === urgency);
  }

  // Get urgent quotes (rush + emergency)
  async getUrgent(): Promise<Quote[]> {
    const all = await this.getAll();
    return all.filter(q => 
      (q.urgency === 'rush' || q.urgency === 'emergency') &&
      (q.status === 'pending' || q.status === 'in_review')
    );
  }
}

export const quotesService = new QuotesService();
