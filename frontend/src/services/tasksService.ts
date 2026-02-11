/**
 * Tasks Data Service - Local-first with optional sync
 */

import { localDB, STORES } from '../utils/localDB';

export interface Task {
  id: string;
  projectId: string;
  
  // Task Info
  title: string;
  description?: string;
  
  // Assignment
  assignedTo?: string;
  assignedToName?: string;
  assignedBy?: string;
  assignedByName?: string;
  
  // Status
  status: 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Dates
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  acknowledgedAt?: string;
  
  // Location
  area?: string;
  phase?: string;
  
  // Related
  costCode?: string;
  relatedRfiId?: string;
  relatedChangeOrderId?: string;
  
  // Notes
  notes?: string;
  blockedReason?: string;
  
  // Meta
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'all' | 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'blocked';
export type TaskPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent';

class TasksService {
  
  // Get all tasks for a project
  async getByProject(projectId: string): Promise<Task[]> {
    const tasks = await localDB.getByIndex<Task>(STORES.TASKS, 'projectId', projectId);
    return tasks.sort((a, b) => {
      // Sort by priority (urgent first), then by due date
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
  }

  // Get all tasks
  async getAll(): Promise<Task[]> {
    return localDB.getAll<Task>(STORES.TASKS);
  }

  // Get task by ID
  async getById(id: string): Promise<Task | undefined> {
    return localDB.getById<Task>(STORES.TASKS, id);
  }

  // Get tasks by status
  async getByStatus(projectId: string, status: TaskStatus): Promise<Task[]> {
    const all = await this.getByProject(projectId);
    if (status === 'all') return all;
    return all.filter(t => t.status === status);
  }

  // Get my tasks (assigned to current user)
  async getMyTasks(userId: string): Promise<Task[]> {
    const all = await this.getAll();
    return all.filter(t => t.assignedTo === userId);
  }

  // Get pending tasks (need acknowledgment)
  async getPending(projectId: string): Promise<Task[]> {
    return this.getByStatus(projectId, 'pending');
  }

  // Get overdue tasks
  async getOverdue(projectId: string): Promise<Task[]> {
    const all = await this.getByProject(projectId);
    const today = new Date().toISOString().split('T')[0];
    
    return all.filter(t => 
      t.dueDate && 
      t.dueDate < today && 
      t.status !== 'completed'
    );
  }

  // Create new task
  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return localDB.add<Task>(STORES.TASKS, task as Task);
  }

  // Update task
  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Task not found');

    return localDB.put<Task>(STORES.TASKS, { ...existing, ...updates, id });
  }

  // Delete task
  async delete(id: string): Promise<void> {
    return localDB.delete(STORES.TASKS, id);
  }

  // Acknowledge task
  async acknowledge(id: string): Promise<Task> {
    return this.update(id, {
      status: 'acknowledged',
      acknowledgedAt: new Date().toISOString(),
    });
  }

  // Start task
  async start(id: string): Promise<Task> {
    return this.update(id, {
      status: 'in_progress',
      startDate: new Date().toISOString().split('T')[0],
    });
  }

  // Complete task
  async complete(id: string): Promise<Task> {
    return this.update(id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  }

  // Block task
  async block(id: string, reason: string): Promise<Task> {
    return this.update(id, {
      status: 'blocked',
      blockedReason: reason,
    });
  }

  // Unblock task
  async unblock(id: string): Promise<Task> {
    return this.update(id, {
      status: 'in_progress',
      blockedReason: undefined,
    });
  }

  // Get stats for project
  async getStats(projectId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    blocked: number;
    overdue: number;
  }> {
    const all = await this.getByProject(projectId);
    const today = new Date().toISOString().split('T')[0];

    return {
      total: all.length,
      pending: all.filter(t => t.status === 'pending').length,
      inProgress: all.filter(t => t.status === 'in_progress' || t.status === 'acknowledged').length,
      completed: all.filter(t => t.status === 'completed').length,
      blocked: all.filter(t => t.status === 'blocked').length,
      overdue: all.filter(t => t.dueDate && t.dueDate < today && t.status !== 'completed').length,
    };
  }
}

export const tasksService = new TasksService();
