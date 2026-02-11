// ============================================
// ENUMS
// ============================================

export type UserRole = 
  | 'project_manager'
  | 'superintendent'
  | 'foreman'
  | 'project_engineer'
  | 'accounting'
  | 'logistics'
  | 'document_controller'
  | 'service_dispatcher'
  | 'admin'
  | 'field_worker';

export type TaskStatus = 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'closed';
export type ChangeStatus = 'potential' | 'priced' | 'submitted' | 'approved' | 'rejected';
export type RFIStatus = 'draft' | 'submitted' | 'routed' | 'answered' | 'closed';
export type PunchStatus = 'open' | 'in_progress' | 'completed' | 'verified';
export type DocumentType = 'drawing' | 'spec' | 'redline' | 'scope_sheet' | 'submittal' | 'rfi_attachment' | 'photo' | 'packing_slip' | 'other';

// ============================================
// USER
// ============================================

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  profile_photo_url?: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: UserRole;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ============================================
// PROJECT
// ============================================

export interface Project {
  id: number;
  name: string;
  number?: string;
  description?: string;
  status: ProjectStatus;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  client_name?: string;
  general_contractor?: string;
  contract_value?: number;
  start_date?: string;
  target_completion?: string;
  actual_completion?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  number?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  client_name?: string;
  general_contractor?: string;
  contract_value?: number;
  start_date?: string;
  target_completion?: string;
}

// ============================================
// TASK
// ============================================

export interface Task {
  id: number;
  project_id?: number;
  title: string;
  description?: string;
  assignee_id: number;
  created_by_id: number;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  acknowledged_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  assignee?: User;
  created_by?: User;
}

export interface TaskCreate {
  title: string;
  description?: string;
  project_id?: number;
  assignee_id: number;
  priority?: TaskPriority;
  due_date?: string;
}

// ============================================
// DAILY REPORT
// ============================================

export interface DailyReport {
  id: number;
  project_id: number;
  submitted_by_id: number;
  report_date: string;
  crew_count?: number;
  crew_details?: Record<string, number>;
  work_completed?: string;
  quantities_installed?: Record<string, number>;
  areas_worked?: string[];
  delays_constraints?: string;
  safety_incidents?: string;
  weather_conditions?: string;
  weather_impact?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyReportCreate {
  project_id: number;
  report_date: string;
  crew_count?: number;
  crew_details?: Record<string, number>;
  work_completed?: string;
  quantities_installed?: Record<string, number>;
  areas_worked?: string[];
  delays_constraints?: string;
  safety_incidents?: string;
  weather_conditions?: string;
  weather_impact?: string;
  notes?: string;
}

// ============================================
// PHOTO
// ============================================

export interface Photo {
  id: number;
  project_id: number;
  file_name: string;
  file_path: string;
  thumbnail_path?: string;
  location?: string;
  area?: string;
  caption?: string;
  category?: string;
  tags?: string[];
  annotations?: PhotoAnnotation[];
  taken_at?: string;
  taken_by_id?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  created_at: string;
}

export interface PhotoAnnotation {
  type: 'text' | 'arrow' | 'circle' | 'rectangle';
  x: number;
  y: number;
  content?: string;
  color?: string;
  width?: number;
  height?: number;
}

// ============================================
// RFI
// ============================================

export interface RFI {
  id: number;
  project_id: number;
  rfi_number?: string;
  question: string;
  location?: string;
  what_needed_to_proceed?: string;
  status: RFIStatus;
  routed_to?: string;
  routed_date?: string;
  answer?: string;
  answered_by?: string;
  answered_date?: string;
  submitted_by_id?: number;
  cost_impact?: number;
  schedule_impact_days?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RFICreate {
  project_id: number;
  question: string;
  location?: string;
  what_needed_to_proceed?: string;
  due_date?: string;
}

// ============================================
// CHANGE ORDER
// ============================================

export interface ChangeOrder {
  id: number;
  project_id: number;
  change_number?: string;
  what_changed: string;
  why_changed: string;
  location?: string;
  time_material_impact?: string;
  status: ChangeStatus;
  priced_amount?: number;
  schedule_impact_days?: number;
  schedule_impact_statement?: string;
  submitted_date?: string;
  approved_date?: string;
  approved_amount?: number;
  submitted_by_id?: number;
  priced_by_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ChangeOrderCreate {
  project_id: number;
  what_changed: string;
  why_changed: string;
  location?: string;
  time_material_impact?: string;
}

// ============================================
// PUNCH ITEM
// ============================================

export interface PunchItem {
  id: number;
  project_id: number;
  description: string;
  location?: string;
  area?: string;
  responsible_party?: string;
  assigned_to_id?: number;
  status: PunchStatus;
  priority: TaskPriority;
  due_date?: string;
  completed_date?: string;
  verified_date?: string;
  verified_by_id?: number;
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface PunchItemCreate {
  project_id: number;
  description: string;
  location?: string;
  area?: string;
  responsible_party?: string;
  assigned_to_id?: number;
  priority?: TaskPriority;
  due_date?: string;
  category?: string;
}

// ============================================
// DELIVERY
// ============================================

export interface Delivery {
  id: number;
  project_id: number;
  po_number?: string;
  vendor?: string;
  description?: string;
  expected_date?: string;
  actual_date?: string;
  staging_location?: string;
  received_by_id?: number;
  quantity_ordered?: number;
  quantity_received?: number;
  has_damage: boolean;
  has_shortage: boolean;
  issue_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryCreate {
  project_id: number;
  po_number?: string;
  vendor?: string;
  description?: string;
  expected_date?: string;
  staging_location?: string;
  quantity_ordered?: number;
}

// ============================================
// CONSTRAINT
// ============================================

export interface Constraint {
  id: number;
  project_id: number;
  description: string;
  constraint_type?: string;
  area?: string;
  owner_id?: number;
  owner_name?: string;
  due_date?: string;
  is_resolved: boolean;
  resolved_date?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ConstraintCreate {
  project_id: number;
  description: string;
  constraint_type?: string;
  area?: string;
  owner_id?: number;
  owner_name?: string;
  due_date?: string;
}

// ============================================
// DECISION LOG
// ============================================

export interface DecisionLog {
  id: number;
  project_id: number;
  decision_date: string;
  decision: string;
  approved_by: string;
  approved_by_id?: number;
  affects_cost: boolean;
  affects_schedule: boolean;
  affects_quality: boolean;
  impact_details?: string;
  reference_documents?: any[];
  created_at: string;
}

export interface DecisionLogCreate {
  project_id: number;
  decision_date: string;
  decision: string;
  approved_by: string;
  approved_by_id?: number;
  affects_cost?: boolean;
  affects_schedule?: boolean;
  affects_quality?: boolean;
  impact_details?: string;
  reference_documents?: any[];
}

// ============================================
// SERVICE CALL
// ============================================

export interface ServiceCall {
  id: number;
  project_id?: number;
  call_number?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  issue_description: string;
  priority: TaskPriority;
  assigned_to_id?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  is_completed: boolean;
  completed_date?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface ApiError {
  detail: string;
}
