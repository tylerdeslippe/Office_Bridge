/**
 * Supabase Client Configuration
 * Handles authentication and database connections
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lmuudmxemkmqutcdvhmh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('Supabase anon key not found. Please set VITE_SUPABASE_ANON_KEY in your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});

// Types for our database
export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  company_id?: string;
  company_code?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  number?: string;
  status: string;
  address?: string;
  city?: string;
  state?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  company_id: string;
  project_id?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  company_id: string;
  project_id?: string;
  description: string;
  supplier_name?: string;
  supplier_phone?: string;
  po_number?: string;
  estimated_arrival: string;
  actual_arrival?: string;
  is_delivered: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}
