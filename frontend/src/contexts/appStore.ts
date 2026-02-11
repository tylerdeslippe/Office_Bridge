/**
 * Office Bridge - App State Store
 * Project-scoped state with unified inbox for blockers
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveProject {
  id: number;
  name: string;
  number: string;
}

export interface BlockerItem {
  id: string;
  type: 'rfi' | 'change' | 'delivery' | 'constraint' | 'task';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  dueDate?: string;
  createdAt: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  // Project Context (sticky across all screens)
  currentProject: ActiveProject | null;
  currentArea: string | null;
  lastUsedCostCode: string | null;
  recentCostCodes: string[];
  
  // Unified Inbox / Blockers
  blockers: BlockerItem[];
  unacknowledgedTasks: number;
  
  // UI State
  toast: Toast | null;
  isOffline: boolean;
  pendingSyncCount: number;
  
  // Draft autosave
  dailyReportDraft: any | null;
  
  // Actions
  setCurrentProject: (project: ActiveProject | null) => void;
  setCurrentArea: (area: string | null) => void;
  setLastUsedCostCode: (code: string) => void;
  addRecentCostCode: (code: string) => void;
  setBlockers: (blockers: BlockerItem[]) => void;
  setUnacknowledgedTasks: (count: number) => void;
  showToast: (message: string, type: Toast['type']) => void;
  hideToast: () => void;
  setOffline: (offline: boolean) => void;
  setPendingSyncCount: (count: number) => void;
  saveDailyReportDraft: (draft: any) => void;
  clearDailyReportDraft: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      currentArea: null,
      lastUsedCostCode: null,
      recentCostCodes: [],
      blockers: [],
      unacknowledgedTasks: 0,
      toast: null,
      isOffline: false,
      pendingSyncCount: 0,
      dailyReportDraft: null,
      
      // Actions
      setCurrentProject: (project) => set({ currentProject: project }),
      
      setCurrentArea: (area) => set({ currentArea: area }),
      
      setLastUsedCostCode: (code) => {
        const { recentCostCodes } = get();
        const updated = [code, ...recentCostCodes.filter(c => c !== code)].slice(0, 5);
        set({ lastUsedCostCode: code, recentCostCodes: updated });
      },
      
      addRecentCostCode: (code) => {
        const { recentCostCodes } = get();
        if (!recentCostCodes.includes(code)) {
          set({ recentCostCodes: [code, ...recentCostCodes].slice(0, 5) });
        }
      },
      
      setBlockers: (blockers) => set({ blockers }),
      
      setUnacknowledgedTasks: (count) => set({ unacknowledgedTasks: count }),
      
      showToast: (message, type) => {
        const id = Date.now().toString();
        set({ toast: { id, message, type } });
        setTimeout(() => {
          const { toast } = get();
          if (toast?.id === id) {
            set({ toast: null });
          }
        }, 3000);
      },
      
      hideToast: () => set({ toast: null }),
      
      setOffline: (offline) => set({ isOffline: offline }),
      
      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
      
      saveDailyReportDraft: (draft) => set({ dailyReportDraft: draft }),
      
      clearDailyReportDraft: () => set({ dailyReportDraft: null }),
    }),
    {
      name: 'office-bridge-storage',
      partialize: (state) => ({
        currentProject: state.currentProject,
        currentArea: state.currentArea,
        lastUsedCostCode: state.lastUsedCostCode,
        recentCostCodes: state.recentCostCodes,
        dailyReportDraft: state.dailyReportDraft,
      }),
    }
  )
);
