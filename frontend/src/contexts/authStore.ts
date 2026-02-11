import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '../utils/types';
import { authApi } from '../utils/api';

// Roles that have PM-level access
const PM_ROLES: UserRole[] = ['project_manager', 'superintendent', 'admin'];

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Role checks
  isPM: () => boolean;
  isAdmin: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role?: string;
  }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
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
      
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const { access_token, user } = response.data;
          
          localStorage.setItem('token', access_token);
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.detail || 'Login failed',
          });
          throw error;
        }
      },
      
      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.register(data);
          // Auto-login after registration
          const loginResponse = await authApi.login(data.email, data.password);
          const { access_token, user } = loginResponse.data;
          
          localStorage.setItem('token', access_token);
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.detail || 'Registration failed',
          });
          throw error;
        }
      },
      
      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
