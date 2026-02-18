/**
 * Auth Store - Supabase Authentication
 * Handles login, register, and session management
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

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
  companyId?: string;
  companyCode?: string;
  companyName?: string;
  avatarUrl?: string;
  createdAt: string;
}

interface AuthState {
  user: LocalUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Role checks
  isPM: () => boolean;
  isAdmin: () => boolean;
  hasRole: (roles: UserRole[]) => boolean;
  
  // Auth actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyCode: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<LocalUser>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  exportUserData: () => Promise<string>;
}

const PM_ROLES: UserRole[] = ['project_manager', 'superintendent', 'admin'];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      
      isPM: () => {
        const user = get().user;
        if (!user) return false;
        return PM_ROLES.includes(user.role);
      },
      
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin';
      },
      
      hasRole: (roles: UserRole[]) => {
        const user = get().user;
        if (!user) return false;
        return roles.includes(user.role);
      },
      
      // Initialize auth state on app load
      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*, companies(name, code)')
              .eq('id', session.user.id)
              .single();
            
            if (profile) {
              const user: LocalUser = {
                id: profile.id,
                email: profile.email,
                firstName: profile.first_name,
                lastName: profile.last_name,
                phone: profile.phone,
                role: profile.role as UserRole,
                companyId: profile.company_id,
                companyCode: profile.companies?.code,
                companyName: profile.companies?.name,
                avatarUrl: profile.avatar_url,
                createdAt: profile.created_at,
              };
              
              set({ user, session, isAuthenticated: true, isLoading: false });
            } else {
              set({ isLoading: false });
            }
          } else {
            set({ isLoading: false });
          }
          
          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*, companies(name, code)')
                .eq('id', session.user.id)
                .single();
              
              if (profile) {
                const user: LocalUser = {
                  id: profile.id,
                  email: profile.email,
                  firstName: profile.first_name,
                  lastName: profile.last_name,
                  phone: profile.phone,
                  role: profile.role as UserRole,
                  companyId: profile.company_id,
                  companyCode: profile.companies?.code,
                  companyName: profile.companies?.name,
                  avatarUrl: profile.avatar_url,
                  createdAt: profile.created_at,
                };
                
                set({ user, session, isAuthenticated: true });
              }
            } else if (event === 'SIGNED_OUT') {
              set({ user: null, session: null, isAuthenticated: false });
            }
          });
        } catch (error) {
          console.error('Auth initialization error:', error);
          set({ isLoading: false });
        }
      },
      
      // Login with email/password
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          set({ isLoading: false });
          throw new Error(error.message);
        }
        
        if (data.user) {
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*, companies(name, code)')
            .eq('id', data.user.id)
            .single();
          
          if (profile) {
            const user: LocalUser = {
              id: profile.id,
              email: profile.email,
              firstName: profile.first_name,
              lastName: profile.last_name,
              phone: profile.phone,
              role: profile.role as UserRole,
              companyId: profile.company_id,
              companyCode: profile.companies?.code,
              companyName: profile.companies?.name,
              avatarUrl: profile.avatar_url,
              createdAt: profile.created_at,
            };
            
            set({ user, session: data.session, isAuthenticated: true, isLoading: false });
          } else {
            set({ isLoading: false });
            throw new Error('Profile not found. Please contact support.');
          }
        }
      },
      
      // Register new user
      register: async (data) => {
        set({ isLoading: true });
        
        try {
          // 1. Create auth user
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                first_name: data.firstName,
                last_name: data.lastName,
              }
            }
          });
          
          if (authError) throw new Error(authError.message);
          if (!authData.user) throw new Error('Registration failed');
          
          // 2. Find or create company
          let companyId: string;
          let companyName: string;
          
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('id, name')
            .eq('code', data.companyCode)
            .single();
          
          if (existingCompany) {
            companyId = existingCompany.id;
            companyName = existingCompany.name;
          } else {
            // Create new company
            const { data: newCompany, error: companyError } = await supabase
              .from('companies')
              .insert({
                name: `Company ${data.companyCode}`,
                code: data.companyCode,
                owner_id: authData.user.id,
              })
              .select()
              .single();
            
            if (companyError) throw new Error(companyError.message);
            companyId = newCompany.id;
            companyName = newCompany.name;
          }
          
          // 3. Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: data.email,
              first_name: data.firstName,
              last_name: data.lastName,
              role: 'field_worker',
              company_id: companyId,
            });
          
          if (profileError) throw new Error(profileError.message);
          
          // 4. Set user state
          const user: LocalUser = {
            id: authData.user.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            role: 'field_worker',
            companyId,
            companyCode: data.companyCode,
            companyName,
            createdAt: new Date().toISOString(),
          };
          
          set({ user, session: authData.session, isAuthenticated: true, isLoading: false });
          
        } catch (error: any) {
          set({ isLoading: false });
          throw error;
        }
      },
      
      // Logout
      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null, isAuthenticated: false });
      },
      
      // Update profile
      updateProfile: async (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: updates.firstName,
            last_name: updates.lastName,
            phone: updates.phone,
            avatar_url: updates.avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id);
        
        if (error) throw new Error(error.message);
        
        set({ user: { ...currentUser, ...updates } });
      },
      
      // Reset password
      resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) throw new Error(error.message);
      },
      
      // Export user data
      exportUserData: async () => {
        const user = get().user;
        return JSON.stringify({ user, exportedAt: new Date().toISOString() }, null, 2);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
