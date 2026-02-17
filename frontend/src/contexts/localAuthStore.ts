/**
 * Auth Store - Server authentication with local fallback
 * Connects to Railway backend for login/register
 * Stores token and user data locally
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localDB } from '../utils/localDB';

// API base URL - change this to your Railway URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1';

export type UserRole = 
  | 'project_manager'
  | 'superintendent'
  | 'foreman'
  | 'project_engineer'
  | 'admin'
  | 'field_worker'
  | 'developer';

export interface LocalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  companyId?: number;
  companyCode?: string;
  companyName?: string;
  companyLogo?: string;
  createdAt: string;
}

// Roles that have PM-level access
const PM_ROLES: UserRole[] = ['project_manager', 'superintendent', 'admin', 'developer'];

interface AuthState {
  user: LocalUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarded: boolean;
  
  // Role checks
  isPM: () => boolean;
  isAdmin: () => boolean;
  isDeveloper: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  
  // Server auth actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyCode: string;
  }) => Promise<void>;
  
  // Local profile update
  updateProfile: (updates: Partial<LocalUser>) => Promise<void>;
  
  logout: () => void;
  
  // For importing/exporting data
  exportUserData: () => Promise<string>;
  importUserData: (data: string) => Promise<void>;
  
  // Sync with server
  syncWithServer: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
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
      
      // Check if user is developer
      isDeveloper: () => {
        const user = get().user;
        return user?.role === 'developer';
      },
      
      // Check if user has any of the specified roles
      hasRole: (roles: UserRole[]) => {
        const user = get().user;
        if (!user) return false;
        return roles.includes(user.role);
      },
      
      // Login with server
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
          }
          
          const data = await response.json();
          
          const user: LocalUser = {
            id: String(data.user.id),
            email: data.user.email,
            firstName: data.user.first_name,
            lastName: data.user.last_name,
            role: data.user.role as UserRole,
            companyId: data.user.company_id,
            companyCode: data.user.company_code,
            companyName: data.user.company_name,
            createdAt: data.user.created_at || new Date().toISOString(),
          };
          
          await localDB.setSetting('user_profile', user);
          await localDB.setSetting('auth_token', data.access_token);
          
          set({
            user,
            token: data.access_token,
            isAuthenticated: true,
            isOnboarded: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      // Register new user with server
      register: async (data) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: data.email,
              password: data.password,
              first_name: data.firstName,
              last_name: data.lastName,
              company_code: data.companyCode,
            }),
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
          }
          
          const responseData = await response.json();
          
          const user: LocalUser = {
            id: String(responseData.user.id),
            email: responseData.user.email,
            firstName: responseData.user.first_name,
            lastName: responseData.user.last_name,
            role: responseData.user.role as UserRole,
            companyId: responseData.user.company_id,
            companyCode: data.companyCode,
            companyName: responseData.user.company_name,
            createdAt: responseData.user.created_at || new Date().toISOString(),
          };
          
          await localDB.setSetting('user_profile', user);
          await localDB.setSetting('auth_token', responseData.access_token);
          
          set({
            user,
            token: responseData.access_token,
            isAuthenticated: true,
            isOnboarded: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      // Update profile
      updateProfile: async (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const updatedUser = { ...currentUser, ...updates };
        await localDB.setSetting('user_profile', updatedUser);
        
        // TODO: Sync with server if online
        
        set({ user: updatedUser });
      },
      
      // Logout
      logout: () => {
        localDB.setSetting('auth_token', null);
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isOnboarded: false,
        });
      },
      
      // Sync local data with server
      syncWithServer: async () => {
        const token = get().token;
        if (!token) return;
        
        try {
          // Pull updates from server
          const response = await fetch(`${API_BASE_URL}/companies/sync/pull`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            // TODO: Merge server data with local data
            console.log('Sync complete:', data);
          }
        } catch (error) {
          console.error('Sync failed:', error);
        }
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
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);
