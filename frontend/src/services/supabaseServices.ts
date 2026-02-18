/**
 * Supabase Data Services
 * Handles syncing data between local storage and Supabase
 */
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../contexts/authStore';

// =============================================
// PROJECTS SERVICE
// =============================================
export const supabaseProjectsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(project: any) {
    const user = useAuthStore.getState().user;
    if (!user?.companyId) throw new Error('No company ID');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        company_id: user.companyId,
        created_by: user.id,
        name: project.name,
        number: project.number,
        status: project.status || 'planning',
        description: project.description,
        address: project.address,
        city: project.city,
        state: project.state,
        zip_code: project.zipCode,
        latitude: project.latitude,
        longitude: project.longitude,
        client_name: project.clientName,
        start_date: project.startDate,
        end_date: project.endDate,
        contract_value: project.contractValue,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: updates.name,
        number: updates.number,
        status: updates.status,
        description: updates.description,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        zip_code: updates.zipCode,
        latitude: updates.latitude,
        longitude: updates.longitude,
        client_name: updates.clientName,
        start_date: updates.startDate,
        end_date: updates.endDate,
        contract_value: updates.contractValue,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// =============================================
// TASKS SERVICE
// =============================================
export const supabaseTasksService = {
  async getAll() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async create(task: any) {
    const user = useAuthStore.getState().user;
    if (!user?.companyId) throw new Error('No company ID');

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        company_id: user.companyId,
        created_by: user.id,
        project_id: task.projectId,
        title: task.title,
        description: task.description,
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        due_date: task.dueDate,
        assigned_to: task.assignedTo,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        title: updates.title,
        description: updates.description,
        status: updates.status,
        priority: updates.priority,
        due_date: updates.dueDate,
        assigned_to: updates.assignedTo,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// =============================================
// DELIVERIES SERVICE
// =============================================
export const supabaseDeliveriesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('estimated_arrival', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('project_id', projectId)
      .order('estimated_arrival', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async create(delivery: any) {
    const user = useAuthStore.getState().user;
    if (!user?.companyId) throw new Error('No company ID');

    const { data, error } = await supabase
      .from('deliveries')
      .insert({
        company_id: user.companyId,
        created_by: user.id,
        project_id: delivery.projectId,
        description: delivery.description,
        supplier_name: delivery.supplierName,
        supplier_phone: delivery.supplierPhone,
        po_number: delivery.poNumber,
        estimated_arrival: delivery.estimatedArrival,
        is_delivered: false,
        notes: delivery.notes,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        description: updates.description,
        supplier_name: updates.supplierName,
        supplier_phone: updates.supplierPhone,
        po_number: updates.poNumber,
        estimated_arrival: updates.estimatedArrival,
        actual_arrival: updates.actualArrival,
        is_delivered: updates.isDelivered,
        notes: updates.notes,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// =============================================
// DAILY REPORTS SERVICE
// =============================================
export const supabaseDailyReportsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .order('report_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('report_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(report: any) {
    const user = useAuthStore.getState().user;
    if (!user?.companyId) throw new Error('No company ID');

    const { data, error } = await supabase
      .from('daily_reports')
      .insert({
        company_id: user.companyId,
        submitted_by: user.id,
        project_id: report.projectId,
        report_date: report.reportDate,
        foreman_name: report.foremanName,
        weather: report.weather,
        temperature: report.temperature,
        crew_count: report.crewCount,
        hours_worked: report.hoursWorked,
        work_performed: report.workPerformed,
        materials_used: report.materialsUsed,
        equipment_used: report.equipmentUsed,
        delays: report.delays,
        safety_notes: report.safetyNotes,
        photos: report.photos || [],
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('daily_reports')
      .update({
        foreman_name: updates.foremanName,
        weather: updates.weather,
        temperature: updates.temperature,
        crew_count: updates.crewCount,
        hours_worked: updates.hoursWorked,
        work_performed: updates.workPerformed,
        materials_used: updates.materialsUsed,
        equipment_used: updates.equipmentUsed,
        delays: updates.delays,
        safety_notes: updates.safetyNotes,
        photos: updates.photos,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('daily_reports')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// =============================================
// TEAM/COMPANY SERVICE
// =============================================
export const supabaseTeamService = {
  async getCompany(companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getTeamMembers(companyId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId)
      .order('first_name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async updateCompany(companyId: string, updates: any) {
    const { data, error } = await supabase
      .from('companies')
      .update({
        name: updates.name,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        phone: updates.phone,
        logo_url: updates.logoUrl,
        settings: updates.settings,
      })
      .eq('id', companyId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateMemberRole(userId: string, role: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};
