/**
 * Notification Service - Handle push notifications and in-app alerts
 * Supports 24-hour delivery reminders and other notifications
 */

import { localDB, STORES } from '../utils/localDB';
import { deliveriesService, Delivery } from './deliveriesService';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface ScheduledNotification {
  id: string;
  type: 'delivery_reminder' | 'task_due' | 'rfi_response' | 'general';
  title: string;
  body: string;
  scheduledFor: string;
  entityId?: string;
  entityType?: string;
  sent: boolean;
  createdAt: string;
}

class NotificationService {
  private checkInterval: number | null = null;
  private onNotificationCallback: ((notification: ScheduledNotification) => void) | null = null;

  // Initialize notification service
  async init() {
    // Request permission if not already granted
    await this.requestPermission();
    
    // Start checking for scheduled notifications
    this.startNotificationChecker();
    
    // Register service worker for background notifications (PWA)
    this.registerServiceWorker();
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return { granted: false, denied: false, default: true };
    }

    const permission = await Notification.requestPermission();
    
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
    };
  }

  // Check if notifications are enabled
  isEnabled(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  // Register service worker for background notifications
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }
  }

  // Start periodic check for scheduled notifications
  private startNotificationChecker() {
    // Check every minute
    this.checkInterval = window.setInterval(() => {
      this.checkScheduledNotifications();
    }, 60 * 1000);

    // Also check immediately on start
    this.checkScheduledNotifications();
  }

  // Stop notification checker
  stopNotificationChecker() {
    if (this.checkInterval) {
      window.clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Check for and send any due notifications
  private async checkScheduledNotifications() {
    // Check delivery reminders
    await this.checkDeliveryReminders();
  }

  // Check for deliveries arriving within 24 hours
  private async checkDeliveryReminders() {
    try {
      const allDeliveries = await deliveriesService.getAll();
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const delivery of allDeliveries) {
        // Skip if already delivered or notification disabled
        if (delivery.isDelivered || !delivery.notify24hr || delivery.notificationSent) {
          continue;
        }

        const eta = new Date(delivery.estimatedArrival);
        
        // Check if arriving within 24 hours but not past
        if (eta <= tomorrow && eta > now) {
          // Send notification
          await this.sendDeliveryReminder(delivery);
          
          // Mark notification as sent
          await deliveriesService.update(delivery.id, { notificationSent: true });
        }
      }
    } catch (error) {
      console.error('Error checking delivery reminders:', error);
    }
  }

  // Send a delivery reminder notification
  private async sendDeliveryReminder(delivery: Delivery) {
    const title = '📦 Delivery Arriving Tomorrow';
    const body = `${delivery.description} from ${delivery.supplierName}`;

    // Send browser notification
    this.sendBrowserNotification(title, body, {
      tag: `delivery-${delivery.id}`,
      data: { type: 'delivery', id: delivery.id },
    });

    // Trigger in-app callback
    if (this.onNotificationCallback) {
      this.onNotificationCallback({
        id: `delivery-reminder-${delivery.id}`,
        type: 'delivery_reminder',
        title,
        body,
        scheduledFor: new Date().toISOString(),
        entityId: delivery.id,
        entityType: 'delivery',
        sent: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Send a browser notification
  sendBrowserNotification(title: string, body: string, options: NotificationOptions = {}) {
    if (!this.isEnabled()) {
      console.log('Notifications not enabled');
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      vibrate: [200, 100, 200],
      ...options,
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      notification.close();
      
      // Handle click based on notification data
      const data = (options as any).data;
      if (data?.type === 'delivery') {
        window.location.href = '/deliveries';
      }
    };
  }

  // Set callback for in-app notifications
  onNotification(callback: (notification: ScheduledNotification) => void) {
    this.onNotificationCallback = callback;
  }

  // Send an immediate in-app notification
  sendInApp(title: string, body: string, type: ScheduledNotification['type'] = 'general') {
    if (this.onNotificationCallback) {
      this.onNotificationCallback({
        id: `inapp-${Date.now()}`,
        type,
        title,
        body,
        scheduledFor: new Date().toISOString(),
        sent: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Schedule a notification for later
  async scheduleNotification(
    title: string,
    body: string,
    scheduledFor: Date,
    type: ScheduledNotification['type'] = 'general',
    entityId?: string,
    entityType?: string
  ): Promise<ScheduledNotification> {
    const notification: ScheduledNotification = {
      id: `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      body,
      scheduledFor: scheduledFor.toISOString(),
      entityId,
      entityType,
      sent: false,
      createdAt: new Date().toISOString(),
    };

    // Store in user settings for persistence
    const scheduled = await localDB.getSetting<ScheduledNotification[]>('scheduled_notifications') || [];
    scheduled.push(notification);
    await localDB.setSetting('scheduled_notifications', scheduled);

    return notification;
  }

  // Cancel a scheduled notification
  async cancelScheduledNotification(id: string): Promise<void> {
    const scheduled = await localDB.getSetting<ScheduledNotification[]>('scheduled_notifications') || [];
    const filtered = scheduled.filter(n => n.id !== id);
    await localDB.setSetting('scheduled_notifications', filtered);
  }

  // Get all pending scheduled notifications
  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    const scheduled = await localDB.getSetting<ScheduledNotification[]>('scheduled_notifications') || [];
    return scheduled.filter(n => !n.sent);
  }
}

export const notificationService = new NotificationService();
