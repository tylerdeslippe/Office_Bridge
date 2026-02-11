import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ============================================
// AUTH API
// ============================================

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role?: string;
  }) => api.post('/auth/register', data),
  
  refresh: () => api.post('/auth/refresh'),
};

// ============================================
// PROJECTS API
// ============================================

export const projectsApi = {
  list: (params?: { status?: string; search?: string; skip?: number; limit?: number }) =>
    api.get('/projects', { params }),
  
  get: (id: number) => api.get(`/projects/${id}`),
  
  create: (data: any) => api.post('/projects', data),
  
  update: (id: number, data: any) => api.patch(`/projects/${id}`, data),
  
  delete: (id: number) => api.delete(`/projects/${id}`),
};

// ============================================
// TASKS API
// ============================================

export const tasksApi = {
  list: (params?: {
    project_id?: number;
    assignee_id?: number;
    status?: string;
    my_tasks?: boolean;
    skip?: number;
    limit?: number;
  }) => api.get('/tasks', { params }),
  
  get: (id: number) => api.get(`/tasks/${id}`),
  
  create: (data: any) => api.post('/tasks', data),
  
  update: (id: number, data: any) => api.patch(`/tasks/${id}`, data),
  
  acknowledge: (id: number) => api.post(`/tasks/${id}/acknowledge`, { acknowledged: true }),
  
  complete: (id: number) => api.post(`/tasks/${id}/complete`),
  
  delete: (id: number) => api.delete(`/tasks/${id}`),
};

// ============================================
// DAILY REPORTS API
// ============================================

export const dailyReportsApi = {
  list: (params?: {
    project_id?: number;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }) => api.get('/daily-reports', { params }),
  
  get: (id: number) => api.get(`/daily-reports/${id}`),
  
  create: (data: any) => api.post('/daily-reports', data),
  
  update: (id: number, data: any) => api.patch(`/daily-reports/${id}`, data),
  
  delete: (id: number) => api.delete(`/daily-reports/${id}`),
};

// ============================================
// PHOTOS API
// ============================================

export const photosApi = {
  list: (params?: {
    project_id?: number;
    category?: string;
    area?: string;
    skip?: number;
    limit?: number;
  }) => api.get('/photos', { params }),
  
  get: (id: number) => api.get(`/photos/${id}`),
  
  upload: (projectId: number, file: File, metadata?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId.toString());
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });
    }
    return api.post('/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  update: (id: number, data: any) => api.patch(`/photos/${id}`, data),
  
  delete: (id: number) => api.delete(`/photos/${id}`),
};

// ============================================
// RFIs API
// ============================================

export const rfisApi = {
  list: (params?: { project_id?: number; status?: string; skip?: number; limit?: number }) =>
    api.get('/rfis', { params }),
  
  get: (id: number) => api.get(`/rfis/${id}`),
  
  create: (data: any) => api.post('/rfis', data),
  
  update: (id: number, data: any) => api.patch(`/rfis/${id}`, data),
};

// ============================================
// CHANGES API
// ============================================

export const changesApi = {
  list: (params?: { project_id?: number; status?: string; skip?: number; limit?: number }) =>
    api.get('/changes', { params }),
  
  get: (id: number) => api.get(`/changes/${id}`),
  
  create: (data: any) => api.post('/changes', data),
  
  update: (id: number, data: any) => api.patch(`/changes/${id}`, data),
};

// ============================================
// PUNCH ITEMS API
// ============================================

export const punchApi = {
  list: (params?: {
    project_id?: number;
    status?: string;
    category?: string;
    skip?: number;
    limit?: number;
  }) => api.get('/punch-items', { params }),
  
  get: (id: number) => api.get(`/punch-items/${id}`),
  
  create: (data: any) => api.post('/punch-items', data),
  
  update: (id: number, data: any) => api.patch(`/punch-items/${id}`, data),
};

// ============================================
// DELIVERIES API
// ============================================

export const deliveriesApi = {
  list: (params?: {
    project_id?: number;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }) => api.get('/deliveries', { params }),
  
  get: (id: number) => api.get(`/deliveries/${id}`),
  
  create: (data: any) => api.post('/deliveries', data),
  
  update: (id: number, data: any) => api.patch(`/deliveries/${id}`, data),
};

// ============================================
// CONSTRAINTS API
// ============================================

export const constraintsApi = {
  list: (params?: { project_id?: number; is_resolved?: boolean; skip?: number; limit?: number }) =>
    api.get('/constraints', { params }),
  
  get: (id: number) => api.get(`/constraints/${id}`),
  
  create: (data: any) => api.post('/constraints', data),
  
  update: (id: number, data: any) => api.patch(`/constraints/${id}`, data),
};

// ============================================
// DECISIONS API
// ============================================

export const decisionsApi = {
  list: (params?: { project_id?: number; skip?: number; limit?: number }) =>
    api.get('/decisions', { params }),
  
  create: (data: any) => api.post('/decisions', data),
};

// ============================================
// SERVICE CALLS API
// ============================================

export const serviceApi = {
  list: (params?: {
    assigned_to_id?: number;
    is_completed?: boolean;
    skip?: number;
    limit?: number;
  }) => api.get('/service-calls', { params }),
  
  get: (id: number) => api.get(`/service-calls/${id}`),
  
  create: (data: any) => api.post('/service-calls', data),
  
  update: (id: number, data: any) => api.patch(`/service-calls/${id}`, data),
};

// ============================================
// COST CODES API
// ============================================

export const costCodesApi = {
  list: (projectId: number, isActive?: boolean) =>
    api.get('/cost-codes', { params: { project_id: projectId, is_active: isActive } }),
  
  create: (data: any) => api.post('/cost-codes', data),
};

// ============================================
// CONTACTS API
// ============================================

export const contactsApi = {
  list: (params?: {
    contact_type?: string;
    search?: string;
    vendor_category?: string;
    is_approved?: boolean;
    limit?: number;
  }) => api.get('/contacts', { params }),
  
  get: (id: number) => api.get(`/contacts/${id}`),
  
  create: (data: any) => api.post('/contacts', data),
  
  update: (id: number, data: any) => api.put(`/contacts/${id}`, data),
  
  markUsed: (id: number) => api.post(`/contacts/${id}/use`),
};

// ============================================
// VENDORS API
// ============================================

export const vendorsApi = {
  list: (params?: {
    category?: string;
    approved_only?: boolean;
    search?: string;
    limit?: number;
  }) => api.get('/vendors', { params }),
  
  categories: () => api.get('/vendors/categories'),
};

// ============================================
// CUSTOMERS API
// ============================================

export const customersApi = {
  list: (params?: { search?: string; limit?: number }) =>
    api.get('/customers', { params }),
};

// ============================================
// SITE LOCATIONS API
// ============================================

export const siteLocationsApi = {
  list: (params?: {
    search?: string;
    building_type?: string;
    limit?: number;
  }) => api.get('/site-locations', { params }),
  
  create: (data: any) => api.post('/site-locations', data),
  
  findNearby: (latitude: number, longitude: number, radiusMeters?: number) =>
    api.get('/site-locations/nearby', { 
      params: { latitude, longitude, radius_meters: radiusMeters } 
    }),
  
  // Main "Copy from Previous Job" lookup
  lookup: (params: {
    address?: string;
    latitude?: number;
    longitude?: number;
    radius_meters?: number;
  }) => api.get('/locations/lookup', { params }),
  
  saveFromProject: (projectId: number) =>
    api.post(`/locations/save-from-project/${projectId}`),
};

// ============================================
// QUOTES API
// ============================================

export const quotesApi = {
  list: (params?: {
    status?: string;
    assigned_to_me?: boolean;
    submitted_by_me?: boolean;
    urgency?: string;
    skip?: number;
    limit?: number;
  }) => api.get('/quotes', { params }),
  
  get: (id: number) => api.get(`/quotes/${id}`),
  
  create: (data: {
    title: string;
    description: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    photos?: string[];
    scope_notes?: string;
    urgency?: string;
    preferred_schedule?: string;
  }) => api.post('/quotes', data),
  
  update: (id: number, data: any) => api.patch(`/quotes/${id}`, data),
  
  assign: (id: number, assigneeId: number) => 
    api.post(`/quotes/${id}/assign`, null, { params: { assignee_id: assigneeId } }),
  
  convertToProject: (id: number) => api.post(`/quotes/${id}/convert-to-project`),
  
  myQuotes: (params?: { status?: string; skip?: number; limit?: number }) =>
    api.get('/pm-queue/my-quotes', { params }),
};

// ============================================
// PM QUEUE API
// ============================================

export const pmQueueApi = {
  stats: () => api.get('/pm-queue/stats'),
  
  list: (params?: {
    item_type?: string;
    skip?: number;
    limit?: number;
  }) => api.get('/pm-queue', { params }),
};
