/**
 * Capacitor Native Plugins - Wrapper for native device features
 * Provides camera, geolocation, notifications, etc.
 */

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Geolocation, Position } from '@capacitor/geolocation';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';

// Check if running on native platform
export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'

/**
 * Camera Functions
 */
export const camera = {
  // Take a photo with the camera
  async takePhoto(): Promise<string | null> {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        correctOrientation: true,
      });
      return photo.base64String ? `data:image/jpeg;base64,${photo.base64String}` : null;
    } catch (error) {
      console.error('Camera error:', error);
      return null;
    }
  },

  // Pick photo from gallery
  async pickFromGallery(): Promise<string | null> {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });
      return photo.base64String ? `data:image/jpeg;base64,${photo.base64String}` : null;
    } catch (error) {
      console.error('Gallery error:', error);
      return null;
    }
  },

  // Pick multiple photos
  async pickMultiple(): Promise<string[]> {
    try {
      const photos = await Camera.pickImages({
        quality: 80,
      });
      return photos.photos.map(p => 
        p.base64String ? `data:image/jpeg;base64,${p.base64String}` : ''
      ).filter(Boolean);
    } catch (error) {
      console.error('Pick multiple error:', error);
      return [];
    }
  },

  // Check camera permissions
  async checkPermissions(): Promise<boolean> {
    const permissions = await Camera.checkPermissions();
    return permissions.camera === 'granted';
  },

  // Request camera permissions
  async requestPermissions(): Promise<boolean> {
    const permissions = await Camera.requestPermissions();
    return permissions.camera === 'granted';
  },
};

/**
 * Geolocation Functions
 */
export const geolocation = {
  // Get current position
  async getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (error) {
      console.error('Geolocation error:', error);
      return null;
    }
  },

  // Check permissions
  async checkPermissions(): Promise<boolean> {
    const permissions = await Geolocation.checkPermissions();
    return permissions.location === 'granted';
  },

  // Request permissions
  async requestPermissions(): Promise<boolean> {
    const permissions = await Geolocation.requestPermissions();
    return permissions.location === 'granted';
  },
};

/**
 * Local Notifications Functions
 */
export const notifications = {
  // Schedule a notification
  async schedule(options: {
    id: number;
    title: string;
    body: string;
    scheduleAt?: Date;
  }): Promise<void> {
    const scheduleOptions: ScheduleOptions = {
      notifications: [{
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
        sound: 'default',
        smallIcon: 'ic_stat_icon',
        iconColor: '#2563eb',
      }],
    };
    await LocalNotifications.schedule(scheduleOptions);
  },

  // Cancel a notification
  async cancel(id: number): Promise<void> {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  },

  // Cancel all notifications
  async cancelAll(): Promise<void> {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  },

  // Check permissions
  async checkPermissions(): Promise<boolean> {
    const permissions = await LocalNotifications.checkPermissions();
    return permissions.display === 'granted';
  },

  // Request permissions
  async requestPermissions(): Promise<boolean> {
    const permissions = await LocalNotifications.requestPermissions();
    return permissions.display === 'granted';
  },

  // Add click listener
  addClickListener(callback: (notification: any) => void): void {
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      callback(notification);
    });
  },
};

/**
 * Haptics Functions
 */
export const haptics = {
  // Light impact
  async light(): Promise<void> {
    if (!isNative) return;
    await Haptics.impact({ style: ImpactStyle.Light });
  },

  // Medium impact
  async medium(): Promise<void> {
    if (!isNative) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
  },

  // Heavy impact
  async heavy(): Promise<void> {
    if (!isNative) return;
    await Haptics.impact({ style: ImpactStyle.Heavy });
  },

  // Vibrate
  async vibrate(): Promise<void> {
    if (!isNative) return;
    await Haptics.vibrate();
  },

  // Selection changed
  async selectionChanged(): Promise<void> {
    if (!isNative) return;
    await Haptics.selectionChanged();
  },
};

/**
 * Keyboard Functions
 */
export const keyboard = {
  // Hide keyboard
  async hide(): Promise<void> {
    if (!isNative) return;
    await Keyboard.hide();
  },

  // Show keyboard
  async show(): Promise<void> {
    if (!isNative) return;
    await Keyboard.show();
  },

  // Add show listener
  addShowListener(callback: (info: { keyboardHeight: number }) => void): void {
    if (!isNative) return;
    Keyboard.addListener('keyboardWillShow', callback);
  },

  // Add hide listener
  addHideListener(callback: () => void): void {
    if (!isNative) return;
    Keyboard.addListener('keyboardWillHide', callback);
  },
};

/**
 * Status Bar Functions
 */
export const statusBar = {
  // Set light style (dark text)
  async setLight(): Promise<void> {
    if (!isNative) return;
    await StatusBar.setStyle({ style: Style.Light });
  },

  // Set dark style (light text)
  async setDark(): Promise<void> {
    if (!isNative) return;
    await StatusBar.setStyle({ style: Style.Dark });
  },

  // Set background color
  async setBackgroundColor(color: string): Promise<void> {
    if (!isNative) return;
    await StatusBar.setBackgroundColor({ color });
  },

  // Hide status bar
  async hide(): Promise<void> {
    if (!isNative) return;
    await StatusBar.hide();
  },

  // Show status bar
  async show(): Promise<void> {
    if (!isNative) return;
    await StatusBar.show();
  },
};

/**
 * Splash Screen Functions
 */
export const splashScreen = {
  // Hide splash screen
  async hide(): Promise<void> {
    if (!isNative) return;
    await SplashScreen.hide();
  },

  // Show splash screen
  async show(): Promise<void> {
    if (!isNative) return;
    await SplashScreen.show();
  },
};

/**
 * App Functions
 */
export const app = {
  // Add back button listener (Android)
  addBackButtonListener(callback: () => void): void {
    App.addListener('backButton', callback);
  },

  // Add app state change listener
  addStateChangeListener(callback: (state: { isActive: boolean }) => void): void {
    App.addListener('appStateChange', callback);
  },

  // Exit app (Android only)
  async exitApp(): Promise<void> {
    await App.exitApp();
  },

  // Get app info
  async getInfo(): Promise<{ name: string; id: string; version: string; build: string }> {
    return App.getInfo();
  },
};

/**
 * Preferences (Key-Value Storage)
 */
export const preferences = {
  // Set a value
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },

  // Get a value
  async get(key: string): Promise<string | null> {
    const result = await Preferences.get({ key });
    return result.value;
  },

  // Remove a value
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  },

  // Clear all
  async clear(): Promise<void> {
    await Preferences.clear();
  },

  // Get all keys
  async keys(): Promise<string[]> {
    const result = await Preferences.keys();
    return result.keys;
  },
};

/**
 * Initialize native features
 */
export async function initializeNative(): Promise<void> {
  if (!isNative) {
    console.log('Running in web mode');
    return;
  }

  console.log(`Running on ${platform}`);

  // Hide splash screen after a short delay
  setTimeout(() => {
    splashScreen.hide();
  }, 500);

  // Set up status bar
  if (platform === 'ios') {
    await statusBar.setDark();
  } else {
    await statusBar.setBackgroundColor('#2563eb');
    await statusBar.setDark();
  }

  // Request notification permissions
  await notifications.requestPermissions();

  // Handle back button on Android
  if (platform === 'android') {
    app.addBackButtonListener(() => {
      // Let the router handle back navigation
      window.history.back();
    });
  }

  // Listen for app state changes (foreground/background)
  app.addStateChangeListener((state) => {
    if (state.isActive) {
      console.log('App became active');
      // Could trigger sync here
    } else {
      console.log('App went to background');
    }
  });
}
