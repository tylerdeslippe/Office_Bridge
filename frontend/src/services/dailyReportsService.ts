/**
 * Daily Reports Data Service - Local-first with optional sync
 */

import { localDB, STORES } from '../utils/localDB';

export interface CrewMember {
  id: string;
  name: string;
  hours: number;
  location: string;
}

export interface DailyReport {
  id: string;
  projectId: string;
  projectName?: string;
  
  // Report info
  reportDate: string;
  foreman: string;
  level: string;
  unitSystem: string;
  
  // Crew
  crewMembers: CrewMember[];
  totalCrewCount: number;
  totalManHours: number;
  
  // Equipment
  equipmentUsed: string[];
  customEquipment?: string;
  
  // Work
  workSummary: string;
  
  // Problems
  problemsEncountered?: string;
  hasProblems: boolean;
  
  // RFI
  rfiRequired: boolean;
  rfiDescription?: string;
  
  // Photos
  photoIds: string[];
  
  // Status
  status: 'draft' | 'submitted' | 'reviewed' | 'approved';
  submittedAt?: string;
  submittedBy?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  
  // Meta
  createdAt: string;
  updatedAt: string;
}

class DailyReportsService {
  
  // Get all reports for a project
  async getByProject(projectId: string): Promise<DailyReport[]> {
    const reports = await localDB.getByIndex<DailyReport>(STORES.DAILY_REPORTS, 'projectId', projectId);
    // Sort by date descending (most recent first)
    return reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  // Get all reports
  async getAll(): Promise<DailyReport[]> {
    const reports = await localDB.getAll<DailyReport>(STORES.DAILY_REPORTS);
    return reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  // Get report by ID
  async getById(id: string): Promise<DailyReport | undefined> {
    return localDB.getById<DailyReport>(STORES.DAILY_REPORTS, id);
  }

  // Get report by date
  async getByDate(projectId: string, date: string): Promise<DailyReport | undefined> {
    const all = await this.getByProject(projectId);
    return all.find(r => r.reportDate === date);
  }

  // Get recent reports (last N days)
  async getRecent(projectId: string, days: number = 7): Promise<DailyReport[]> {
    const all = await this.getByProject(projectId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return all.filter(r => new Date(r.reportDate) >= cutoff);
  }

  // Create new report
  async create(report: Omit<DailyReport, 'id' | 'createdAt' | 'updatedAt' | 'totalCrewCount' | 'totalManHours' | 'hasProblems'>): Promise<DailyReport> {
    const totalCrewCount = report.crewMembers.length;
    const totalManHours = report.crewMembers.reduce((sum, m) => sum + m.hours, 0);
    const hasProblems = !!report.problemsEncountered;

    return localDB.add<DailyReport>(STORES.DAILY_REPORTS, {
      ...report,
      totalCrewCount,
      totalManHours,
      hasProblems,
    } as DailyReport);
  }

  // Update report
  async update(id: string, updates: Partial<DailyReport>): Promise<DailyReport> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Daily Report not found');

    // Recalculate totals if crew changed
    let updatedReport = { ...existing, ...updates, id };
    
    if (updates.crewMembers) {
      updatedReport.totalCrewCount = updates.crewMembers.length;
      updatedReport.totalManHours = updates.crewMembers.reduce((sum, m) => sum + m.hours, 0);
    }
    
    if (updates.problemsEncountered !== undefined) {
      updatedReport.hasProblems = !!updates.problemsEncountered;
    }

    return localDB.put<DailyReport>(STORES.DAILY_REPORTS, updatedReport);
  }

  // Delete report
  async delete(id: string): Promise<void> {
    return localDB.delete(STORES.DAILY_REPORTS, id);
  }

  // Submit report
  async submit(id: string, submittedBy: string): Promise<DailyReport> {
    return this.update(id, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      submittedBy,
    });
  }

  // Mark as reviewed
  async markReviewed(id: string, reviewedBy: string): Promise<DailyReport> {
    return this.update(id, {
      status: 'reviewed',
      reviewedAt: new Date().toISOString(),
      reviewedBy,
    });
  }

  // Approve report
  async approve(id: string, reviewedBy: string): Promise<DailyReport> {
    return this.update(id, {
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy,
    });
  }

  // Get reports with problems
  async getWithProblems(projectId: string): Promise<DailyReport[]> {
    const all = await this.getByProject(projectId);
    return all.filter(r => r.hasProblems);
  }

  // Get reports requiring RFI
  async getRequiringRFI(projectId: string): Promise<DailyReport[]> {
    const all = await this.getByProject(projectId);
    return all.filter(r => r.rfiRequired);
  }

  // Get stats for project
  async getStats(projectId: string, days: number = 30): Promise<{
    totalReports: number;
    totalManHours: number;
    avgCrewSize: number;
    reportsWithProblems: number;
    rfiRequired: number;
  }> {
    const recent = await this.getRecent(projectId, days);

    const totalReports = recent.length;
    const totalManHours = recent.reduce((sum, r) => sum + r.totalManHours, 0);
    const totalCrew = recent.reduce((sum, r) => sum + r.totalCrewCount, 0);
    const avgCrewSize = totalReports > 0 ? Math.round(totalCrew / totalReports) : 0;
    const reportsWithProblems = recent.filter(r => r.hasProblems).length;
    const rfiRequired = recent.filter(r => r.rfiRequired).length;

    return {
      totalReports,
      totalManHours,
      avgCrewSize,
      reportsWithProblems,
      rfiRequired,
    };
  }

  // Get yesterday's report (for "copy from yesterday" feature)
  async getYesterday(projectId: string): Promise<DailyReport | undefined> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    return this.getByDate(projectId, dateStr);
  }
}

export const dailyReportsService = new DailyReportsService();
