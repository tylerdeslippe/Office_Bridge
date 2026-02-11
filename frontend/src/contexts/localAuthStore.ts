/**
 * Local Auth Store - No server required
 * User profile stored entirely on device
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localDB } from '../utils/localDB';

export type UserRole = 
  | 'project_manager'
  | 'superintendent'
  | 'foreman'
  | 'project_engineer'
  | 'admin'
  | 'field_worker';

export interface LocalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  companyName?: string;
  companyLogo?: string;
  createdAt: string;
}

// Roles that have PM-level access
const PM_ROLES: UserRole[] = ['project_manager', 'superintendent', 'admin'];

interface AuthState {
  user: LocalUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarded: boolean;
  
  // Role checks
  isPM: () => boolean;
  isAdmin: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  
  // Auth actions (all local, no server)
  createProfile: (data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role: UserRole;
    companyName?: string;
  }) => Promise<void>;
  
  updateProfile: (updates: Partial<LocalUser>) => Promise<void>;
  
  logout: () => void;
  
  // For importing/exporting data
  exportUserData: () => Promise<string>;
  importUserData: (data: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isOnboarded: false,
      
      // Check if user is a PM or has PM-level access
      isPM: () => {
        const user = get().user;
        if (!user) return false;
        return PM_ROLES.includes(user.role);
      },
      
      // Check if user is admin
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin';
      },
      
      // Check if user has any of the specified roles
      hasRole: (roles: UserRole[]) => {
        const user = get().user;
        if (!user) return false;
        return roles.includes(user.role);
      },
      
      // Create a new local profile (no server needed)
      createProfile: async (data) => {
        const user: LocalUser = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: data.email || '',
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
          companyName: data.companyName,
          createdAt: new Date().toISOString(),
        };
        
        // Save to local storage
        await localDB.setSetting('user_profile', user);
        
        set({
          user,
          isAuthenticated: true,
          isOnboarded: true,
        });
      },
      
      // Update profile
      updateProfile: async (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const updatedUser = { ...currentUser, ...updates };
        await localDB.setSetting('user_profile', updatedUser);
        
        set({ user: updatedUser });
      },
      
      // Logout (clears profile but keeps data)
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isOnboarded: false,
        });
      },
      
      // Export all user data as JSON (for backup or transfer)
      exportUserData: async () => {
        const user = get().user;
        const projects = await localDB.getAll('projects');
        const deliveries = await localDB.getAll('deliveries');
        const purchaseOrders = await localDB.getAll('purchase_orders');
        const dailyReports = await localDB.getAll('daily_reports');
        const contacts = await localDB.getAll('contacts');
        const tasks = await localDB.getAll('tasks');
        const lookAhead = await localDB.getAll('look_ahead');
        
        const exportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          user,
          data: {
            projects,
            deliveries,
            purchaseOrders,
            dailyReports,
            contacts,
            tasks,
            lookAhead,
          },
        };
        
        return JSON.stringify(exportData, null, 2);
      },
      
      // Import user data from JSON
      importUserData: async (jsonData) => {
        const importData = JSON.parse(jsonData);
        
        if (importData.version !== '1.0') {
          throw new Error('Incompatible data format');
        }
        
        // Import user profile
        if (importData.user) {
          await localDB.setSetting('user_profile', importData.user);
          set({
            user: importData.user,
            isAuthenticated: true,
            isOnboarded: true,
          });
        }
        
        // Import data
        const { data } = importData;
        
        if (data.projects) {
          for (const item of data.projects) {
            await localDB.put('projects', item, false);
          }
        }
        if (data.deliveries) {
          for (const item of data.deliveries) {
            await localDB.put('deliveries', item, false);
          }
        }
        if (data.purchaseOrders) {
          for (const item of data.purchaseOrders) {
            await localDB.put('purchase_orders', item, false);
          }
        }
        if (data.dailyReports) {
          for (const item of data.dailyReports) {
            await localDB.put('daily_reports', item, false);
          }
        }
        if (data.contacts) {
          for (const item of data.contacts) {
            await localDB.put('contacts', item, false);
          }
        }
        if (data.tasks) {
          for (const item of data.tasks) {
            await localDB.put('tasks', item, false);
          }
        }
        if (data.lookAhead) {
          for (const item of data.lookAhead) {
            await localDB.put('look_ahead', item, false);
          }
        }
      },
    }),
    {
      name: 'local-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);
