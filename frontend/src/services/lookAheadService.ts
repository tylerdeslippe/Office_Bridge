/**
 * Look-Ahead Data Service - Local-first with optional sync
 */

import { localDB, STORES } from '../utils/localDB';

export interface LookAheadDay {
  id: string;
  projectId: string;
  date: string;
  manpower: number;
  plannedWork: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LookAheadSummary {
  workingDays: number;
  totalManpower: number;
  avgCrewPerDay: number;
  totalManHours: number;
}

class LookAheadService {
  
  // Get all look-ahead data across all projects
  async getAll(): Promise<LookAheadDay[]> {
    return localDB.getAll<LookAheadDay>(STORES.LOOK_AHEAD);
  }

  // Get all look-ahead days for a project
  async getByProject(projectId: string): Promise<LookAheadDay[]> {
    return localDB.getByIndex<LookAheadDay>(STORES.LOOK_AHEAD, 'projectId', projectId);
  }

  // Get look-ahead for a specific date
  async getByDate(projectId: string, date: string): Promise<LookAheadDay | undefined> {
    const all = await this.getByProject(projectId);
    return all.find(day => day.date === date);
  }

  // Get look-ahead for date range (next 14 days from today)
  async get14DayLookAhead(projectId: string): Promise<Map<string, LookAheadDay>> {
    const all = await this.getByProject(projectId);
    const map = new Map<string, LookAheadDay>();
    
    all.forEach(day => {
      map.set(day.date, day);
    });

    return map;
  }

  // Save/update a day's look-ahead
  async saveDay(projectId: string, date: string, data: { manpower: number; plannedWork: string[]; notes?: string }): Promise<LookAheadDay> {
    const existing = await this.getByDate(projectId, date);
    
    if (existing) {
      return localDB.put<LookAheadDay>(STORES.LOOK_AHEAD, {
        ...existing,
        ...data,
      });
    } else {
      return localDB.add<LookAheadDay>(STORES.LOOK_AHEAD, {
        projectId,
        date,
        ...data,
      } as LookAheadDay);
    }
  }

  // Bulk save multiple days
  async saveBulk(projectId: string, days: Array<{ date: string; manpower: number; plannedWork: string[] }>): Promise<void> {
    for (const day of days) {
      if (day.manpower > 0 || day.plannedWork.length > 0) {
        await this.saveDay(projectId, day.date, day);
      }
    }
  }

  // Delete a day's look-ahead
  async deleteDay(projectId: string, date: string): Promise<void> {
    const existing = await this.getByDate(projectId, date);
    if (existing) {
      await localDB.delete(STORES.LOOK_AHEAD, existing.id);
    }
  }

  // Clear all look-ahead for a project
  async clearProject(projectId: string): Promise<void> {
    const all = await this.getByProject(projectId);
    for (const day of all) {
      await localDB.delete(STORES.LOOK_AHEAD, day.id);
    }
  }

  // Get summary stats for the 14-day period
  async getSummary(projectId: string): Promise<LookAheadSummary> {
    const all = await this.getByProject(projectId);
    
    // Filter to only days with data
    const daysWithData = all.filter(d => d.manpower > 0);
    
    // Count working days (days with manpower > 0, excluding weekends)
    const workingDays = daysWithData.filter(d => {
      const date = new Date(d.date);
      const dayOfWeek = date.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Not Sunday or Saturday
    }).length;

    const totalManpower = daysWithData.reduce((sum, d) => sum + d.manpower, 0);
    const avgCrewPerDay = workingDays > 0 ? Math.round(totalManpower / workingDays) : 0;
    const totalManHours = totalManpower * 8;

    return {
      workingDays,
      totalManpower,
      avgCrewPerDay,
      totalManHours,
    };
  }

  // Copy previous day's plan to another day
  async copyFromDay(projectId: string, fromDate: string, toDate: string): Promise<LookAheadDay | undefined> {
    const source = await this.getByDate(projectId, fromDate);
    if (!source) return undefined;

    return this.saveDay(projectId, toDate, {
      manpower: source.manpower,
      plannedWork: [...source.plannedWork],
    });
  }
}

export const lookAheadService = new LookAheadService();
