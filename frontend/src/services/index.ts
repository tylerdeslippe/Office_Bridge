/**
 * Services Index - Export all data services
 * 
 * Local-first architecture:
 * - All data stored in IndexedDB on device
 * - Changes queued for sync when offline
 * - Syncs to server when online
 */

// Database
export { localDB, STORES } from '../utils/localDB';

// Data Services
export { deliveriesService, type Delivery, type DeliveryStatus } from './deliveriesService';
export { purchaseOrdersService, type PurchaseOrder, type POLineItem, type POStatus } from './purchaseOrdersService';
export { lookAheadService, type LookAheadDay, type LookAheadSummary } from './lookAheadService';
export { dailyReportsService, type DailyReport, type CrewMember } from './dailyReportsService';
export { projectsService, type Project, type ProjectArea, type ProjectContact, type ProjectStatus } from './projectsService';
export { contactsService, type Contact, type ContactType } from './contactsService';
export { tasksService, type Task, type TaskStatus, type TaskPriority } from './tasksService';
export { quotesService, type Quote, type QuoteStatus } from './quotesService';

// Sync Service
export { syncService } from './syncService';

// Notification Service
export { notificationService } from './notificationService';
