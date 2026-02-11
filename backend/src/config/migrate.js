require('dotenv').config({ path: '../.env' });
const { pool } = require('./database');

const migrations = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table with roles
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'admin', 'project_manager', 'superintendent', 'foreman', 
    'project_engineer', 'accounting', 'logistics', 
    'document_controller', 'service_dispatcher'
  )),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  number VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  client_name VARCHAR(255),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  project_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  contract_value DECIMAL(15, 2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project team assignments
CREATE TABLE IF NOT EXISTS project_team (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_on_project VARCHAR(100),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- Cost codes
CREATE TABLE IF NOT EXISTS cost_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DAILY FIELD REPORTING
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  weather VARCHAR(100),
  temperature_high INTEGER,
  temperature_low INTEGER,
  work_summary TEXT,
  delays_constraints TEXT,
  safety_incidents TEXT,
  visitor_log TEXT,
  submitted_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, report_date)
);

-- Crew counts per daily report
CREATE TABLE IF NOT EXISTS daily_report_crew (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  trade VARCHAR(100) NOT NULL,
  headcount INTEGER NOT NULL,
  hours_worked DECIMAL(4, 2),
  cost_code_id UUID REFERENCES cost_codes(id),
  notes TEXT
);

-- Work installed per daily report
CREATE TABLE IF NOT EXISTS daily_report_work (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  cost_code_id UUID REFERENCES cost_codes(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2),
  unit VARCHAR(50),
  area_location VARCHAR(255)
);

-- Deliveries per daily report
CREATE TABLE IF NOT EXISTS daily_report_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id UUID REFERENCES daily_reports(id) ON DELETE CASCADE,
  supplier VARCHAR(255),
  description TEXT NOT NULL,
  received_complete BOOLEAN DEFAULT true,
  issues TEXT,
  packing_slip_photo_id UUID
);

-- =====================================================
-- TIME & COST TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS timecards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  submitted_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timecard entries (allows split days)
CREATE TABLE IF NOT EXISTS timecard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timecard_id UUID REFERENCES timecards(id) ON DELETE CASCADE,
  cost_code_id UUID REFERENCES cost_codes(id) NOT NULL,
  hours DECIMAL(4, 2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  overtime_hours DECIMAL(4, 2) DEFAULT 0,
  description TEXT,
  area_location VARCHAR(255)
);

-- =====================================================
-- CHANGE MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS potential_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  what_changed TEXT NOT NULL,
  why_changed TEXT,
  location_description VARCHAR(500),
  drawing_reference VARCHAR(255),
  time_impact_estimate VARCHAR(255),
  material_impact_estimate VARCHAR(255),
  submitted_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'under_review', 'priced', 'submitted_to_gc', 'approved', 'rejected', 'void'
  )),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  potential_change_id UUID REFERENCES potential_changes(id),
  number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cost_amount DECIMAL(15, 2),
  schedule_impact_days INTEGER,
  submitted_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'submitted', 'approved', 'rejected', 'void'
  )),
  approved_date DATE,
  approved_amount DECIMAL(15, 2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- RFI WORKFLOW
-- =====================================================

CREATE TABLE IF NOT EXISTS rfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  number VARCHAR(50) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  question TEXT NOT NULL,
  location_description VARCHAR(500),
  drawing_reference VARCHAR(255),
  needed_to_proceed TEXT,
  submitted_by UUID REFERENCES users(id),
  submitted_date DATE DEFAULT CURRENT_DATE,
  date_required DATE,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN (
    'draft', 'open', 'sent_to_gc', 'sent_to_engineer', 'answered', 'closed'
  )),
  answer TEXT,
  answered_by VARCHAR(255),
  answered_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, number)
);

-- =====================================================
-- PHOTO DOCUMENTATION
-- =====================================================

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500),
  original_filename VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  caption TEXT,
  category VARCHAR(100) CHECK (category IN (
    'progress', 'in_wall', 'above_ceiling', 'equipment_tag', 
    'delivery', 'safety', 'problem', 'milestone', 'other'
  )),
  area_location VARCHAR(255),
  taken_date DATE DEFAULT CURRENT_DATE,
  taken_by UUID REFERENCES users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo annotations (for drawing on photos)
CREATE TABLE IF NOT EXISTS photo_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  annotation_data JSONB NOT NULL, -- Stores drawing data (shapes, text, arrows)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link photos to various entities
CREATE TABLE IF NOT EXISTS photo_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- 'daily_report', 'rfi', 'change', 'punch_item', 'delivery'
  entity_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TASK MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  due_date DATE,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'acknowledged', 'in_progress', 'completed', 'cancelled'
  )),
  acknowledged_at TIMESTAMP,
  completed_at TIMESTAMP,
  category VARCHAR(100),
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DOCUMENT CONTROL
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL CHECK (document_type IN (
    'drawing', 'spec', 'submittal', 'scope_sheet', 'contract', 'permit', 'other'
  )),
  title VARCHAR(500) NOT NULL,
  document_number VARCHAR(100),
  revision VARCHAR(50) DEFAULT 'A',
  description TEXT,
  file_path VARCHAR(500),
  original_filename VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  discipline VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  is_current BOOLEAN DEFAULT true,
  supersedes_id UUID REFERENCES documents(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document redlines
CREATE TABLE IF NOT EXISTS document_redlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  redline_data JSONB NOT NULL, -- Stores markup data
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'incorporated')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MATERIALS & LOGISTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity_ordered DECIMAL(10, 2),
  quantity_received DECIMAL(10, 2) DEFAULT 0,
  unit VARCHAR(50),
  supplier VARCHAR(255),
  po_number VARCHAR(100),
  expected_date DATE,
  required_date DATE,
  status VARCHAR(50) DEFAULT 'ordered' CHECK (status IN (
    'pending', 'ordered', 'in_transit', 'partial_received', 'received', 'staged', 'installed'
  )),
  storage_location VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  delivery_date DATE NOT NULL,
  expected_time TIME,
  actual_time TIME,
  carrier VARCHAR(255),
  tracking_number VARCHAR(255),
  quantity_delivered DECIMAL(10, 2),
  quantity_accepted DECIMAL(10, 2),
  staging_location VARCHAR(255),
  received_by UUID REFERENCES users(id),
  condition VARCHAR(50) CHECK (condition IN ('good', 'damaged', 'partial_damage', 'rejected')),
  damage_notes TEXT,
  packing_slip_received BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Material look-ahead
CREATE TABLE IF NOT EXISTS material_lookahead (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  week_start DATE NOT NULL,
  area_location VARCHAR(255),
  quantity_needed DECIMAL(10, 2),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- QUALITY & PUNCH LIST
-- =====================================================

CREATE TABLE IF NOT EXISTS punch_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  number VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(500),
  area VARCHAR(255),
  discipline VARCHAR(100),
  responsible_party VARCHAR(255),
  assigned_to UUID REFERENCES users(id),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'ready_for_review', 'closed')),
  due_date DATE,
  created_by UUID REFERENCES users(id),
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, number)
);

-- Quality checklists
CREATE TABLE IF NOT EXISTS quality_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  stage VARCHAR(100) NOT NULL, -- 'rough_in', 'trim', 'startup', etc.
  trade VARCHAR(100),
  items JSONB NOT NULL, -- Array of checklist items
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quality inspections
CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  checklist_id UUID REFERENCES quality_checklists(id),
  area_location VARCHAR(255),
  inspection_date DATE DEFAULT CURRENT_DATE,
  results JSONB NOT NULL, -- Checklist results
  passed BOOLEAN,
  notes TEXT,
  inspected_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- DECISION LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  decision_date DATE DEFAULT CURRENT_DATE,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  decided_by VARCHAR(255) NOT NULL,
  approved_by UUID REFERENCES users(id),
  cost_impact VARCHAR(255),
  schedule_impact VARCHAR(255),
  quality_impact VARCHAR(255),
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CONSTRAINTS LOG (Weekly Planning)
-- =====================================================

CREATE TABLE IF NOT EXISTS constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  constraint_type VARCHAR(100) CHECK (constraint_type IN (
    'access', 'inspection', 'other_trade', 'material', 'design_answer', 
    'equipment', 'weather', 'manpower', 'other'
  )),
  area_location VARCHAR(255),
  blocking_activity VARCHAR(500),
  owner_id UUID REFERENCES users(id),
  due_date DATE,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated')),
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SERVICE DISPATCH
-- =====================================================

CREATE TABLE IF NOT EXISTS service_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  call_number VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  address VARCHAR(500),
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN (
    'new', 'dispatched', 'en_route', 'on_site', 'completed', 'cancelled'
  )),
  assigned_to UUID REFERENCES users(id),
  dispatched_at TIMESTAMP,
  scheduled_date DATE,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  completed_at TIMESTAMP,
  resolution_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date ON daily_reports(project_id, report_date);
CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_rfis_project ON rfis(project_id, status);
CREATE INDEX IF NOT EXISTS idx_punch_items_project ON punch_items(project_id, status);
CREATE INDEX IF NOT EXISTS idx_timecards_project_date ON timecards(project_id, work_date);
CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id, document_type);

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I', t, t);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at 
            BEFORE UPDATE ON %I 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END;
$$ language 'plpgsql';
`;

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    await pool.query(migrations);
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
