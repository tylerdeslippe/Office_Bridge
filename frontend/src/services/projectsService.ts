/**
 * Projects Data Service - Local-first with optional sync
 */

import { localDB, STORES } from '../utils/localDB';

export interface ProjectArea {
  id: string;
  name: string;
  phases: string[];
}

export interface ProjectContact {
  id: string;
  role: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
}

export interface Project {
  id: string;
  
  // Basic Info
  name: string;
  number?: string;
  status: 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'closed';
  buildingType?: string;
  
  // Location
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  
  // Dates
  startDate?: string;
  endDate?: string;
  
  // Contacts
  contacts: ProjectContact[];
  
  // Structure
  areas: ProjectArea[];
  
  // Scope
  scopeDescription?: string;
  scopePdfId?: string;
  sketchPhotoId?: string;
  drawingSetId?: string;
  
  // Financials
  contractValue?: number;
  
  // Meta
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'all' | 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'closed';

class ProjectsService {
  
  // Get all projects
  async getAll(): Promise<Project[]> {
    const projects = await localDB.getAll<Project>(STORES.PROJECTS);
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Get project by ID
  async getById(id: string): Promise<Project | undefined> {
    return localDB.getById<Project>(STORES.PROJECTS, id);
  }

  // Get projects by status
  async getByStatus(status: ProjectStatus): Promise<Project[]> {
    if (status === 'all') {
      return this.getAll();
    }
    return localDB.getByIndex<Project>(STORES.PROJECTS, 'status', status);
  }

  // Get active projects
  async getActive(): Promise<Project[]> {
    return this.getByStatus('active');
  }

  // Create new project
  async create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    return localDB.add<Project>(STORES.PROJECTS, project as Project);
  }

  // Update project
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Project not found');

    return localDB.put<Project>(STORES.PROJECTS, { ...existing, ...updates, id });
  }

  // Delete project
  async delete(id: string): Promise<void> {
    return localDB.delete(STORES.PROJECTS, id);
  }

  // Generate next project number
  async generateProjectNumber(): Promise<string> {
    const all = await this.getAll();
    const year = new Date().getFullYear().toString().slice(-2);
    const count = all.filter(p => p.number?.includes(`-${year}`)).length + 1;
    return `${count.toString().padStart(3, '0')}-${year}`;
  }

  // Search projects
  async search(query: string): Promise<Project[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();
    
    return all.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.number?.toLowerCase().includes(lowerQuery) ||
      p.address?.toLowerCase().includes(lowerQuery) ||
      p.city?.toLowerCase().includes(lowerQuery)
    );
  }

  // Get nearby projects (by GPS)
  async getNearby(latitude: number, longitude: number, radiusKm: number = 50): Promise<Project[]> {
    const all = await this.getAll();
    
    return all.filter(p => {
      if (!p.latitude || !p.longitude) return false;
      
      // Simple distance calculation (Haversine would be better for accuracy)
      const latDiff = Math.abs(p.latitude - latitude);
      const lonDiff = Math.abs(p.longitude - longitude);
      const approxKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // ~111km per degree
      
      return approxKm <= radiusKm;
    });
  }

  // Get stats
  async getStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    draft: number;
  }> {
    const all = await this.getAll();

    return {
      total: all.length,
      active: all.filter(p => p.status === 'active').length,
      completed: all.filter(p => p.status === 'completed').length,
      draft: all.filter(p => p.status === 'draft').length,
    };
  }

  // Duplicate project (for "Copy from Previous" feature)
  async duplicate(id: string, newName: string): Promise<Project> {
    const source = await this.getById(id);
    if (!source) throw new Error('Source project not found');

    const newNumber = await this.generateProjectNumber();
    
    return this.create({
      ...source,
      name: newName,
      number: newNumber,
      status: 'draft',
      startDate: undefined,
      endDate: undefined,
    });
  }
}

export const projectsService = new ProjectsService();
