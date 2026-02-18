/**
 * Timecard Page - Daily Time Tracking
 * Clock in/out, cost code allocation, break tracking
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  ChevronDown,
  Check,
  AlertCircle,
  Coffee,
  Sun,
  Moon,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { useAuthStore } from '../contexts/authStore';

// Types
interface TimeEntry {
  id: string;
  cost_code: string;
  cost_code_name: string;
  start_time: string;
  end_time: string | null;
  hours: number;
  notes: string;
}

interface TimecardData {
  date: string;
  project_id: number | null;
  project_name: string;
  status: 'draft' | 'submitted' | 'approved';
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  entries: TimeEntry[];
  total_hours: number;
}

// Default cost codes (would come from project in real app)
const DEFAULT_COST_CODES = [
  { code: 'MOB', name: 'Mobilization' },
  { code: 'DEMO', name: 'Demo' },
  { code: 'HANG', name: 'Hangers & Supports' },
  { code: 'RECT', name: 'Rectangular Duct' },
  { code: 'SPIR', name: 'Spiral Duct' },
  { code: 'FLEX', name: 'Flex & Connections' },
  { code: 'INSUL', name: 'Insulation' },
  { code: 'EQUIP', name: 'Equipment Setting' },
  { code: 'START', name: 'Startup Support' },
  { code: 'TAB', name: 'TAB Support' },
  { code: 'CTRL', name: 'Controls Coordination' },
  { code: 'PUNCH', name: 'Punch / Closeout' },
  { code: 'TRAVEL', name: 'Travel' },
  { code: 'SAFETY', name: 'Safety Meeting' },
];

// Helper functions
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatTimeInput = (date: Date): string => {
  return date.toTimeString().slice(0, 5);
};

const parseTimeInput = (timeStr: string, baseDate: Date): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

const calculateHours = (start: string, end: string | null): number => {
  if (!end) return 0;
  const startDate = new Date(`2000-01-01T${start}`);
  const endDate = new Date(`2000-01-01T${end}`);
  const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return Math.max(0, Math.round(diff * 100) / 100);
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export function TimecardPage() {
  const navigate = useNavigate();
  const { currentProject, showToast } = useAppStore();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCostCodePicker, setShowCostCodePicker] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  
  const [timecard, setTimecard] = useState<TimecardData>({
    date: new Date().toISOString().split('T')[0],
    project_id: currentProject?.id || null,
    project_name: currentProject?.name || 'No Project',
    status: 'draft',
    clock_in: null,
    clock_out: null,
    break_minutes: 30,
    entries: [],
    total_hours: 0,
  });

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Update project when it changes
  useEffect(() => {
    if (currentProject) {
      setTimecard(prev => ({
        ...prev,
        project_id: currentProject.id,
        project_name: currentProject.name,
      }));
    }
  }, [currentProject]);

  // Calculate total hours
  useEffect(() => {
    const total = timecard.entries.reduce((sum, entry) => sum + entry.hours, 0);
    setTimecard(prev => ({ ...prev, total_hours: total }));
  }, [timecard.entries]);

  const handleClockIn = () => {
    const now = formatTimeInput(new Date());
    setTimecard(prev => ({ ...prev, clock_in: now }));
    setIsClockedIn(true);
    showToast('Clocked in!', 'success');
  };

  const handleClockOut = () => {
    const now = formatTimeInput(new Date());
    setTimecard(prev => ({ ...prev, clock_out: now }));
    setIsClockedIn(false);
    showToast('Clocked out!', 'success');
  };

  const handleBreakToggle = () => {
    setIsOnBreak(!isOnBreak);
    showToast(isOnBreak ? 'Break ended' : 'Break started', 'info');
  };

  const addTimeEntry = (costCode: { code: string; name: string }) => {
    const now = formatTimeInput(new Date());
    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      cost_code: costCode.code,
      cost_code_name: costCode.name,
      start_time: timecard.clock_in || now,
      end_time: null,
      hours: 0,
      notes: '',
    };
    
    setTimecard(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry],
    }));
    setShowCostCodePicker(false);
  };

  const updateEntry = (entryId: string, updates: Partial<TimeEntry>) => {
    setTimecard(prev => ({
      ...prev,
      entries: prev.entries.map(entry => {
        if (entry.id === entryId) {
          const updated = { ...entry, ...updates };
          // Recalculate hours if times changed
          if (updates.start_time || updates.end_time) {
            updated.hours = calculateHours(updated.start_time, updated.end_time);
          }
          return updated;
        }
        return entry;
      }),
    }));
  };

  const removeEntry = (entryId: string) => {
    setTimecard(prev => ({
      ...prev,
      entries: prev.entries.filter(entry => entry.id !== entryId),
    }));
  };

  const handleSubmit = async () => {
    if (timecard.entries.length === 0) {
      showToast('Add at least one time entry', 'error');
      return;
    }
    
    if (timecard.entries.some(e => !e.end_time)) {
      showToast('Complete all time entries before submitting', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTimecard(prev => ({ ...prev, status: 'submitted' }));
      showToast('Timecard submitted for approval', 'success');
    } catch (err) {
      showToast('Failed to submit timecard', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Cost Code Picker Modal
  const CostCodePicker = () => (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowCostCodePicker(false)}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="px-4 pb-2">
          <h2 className="text-lg font-semibold">Select Cost Code</h2>
        </div>
        <div className="overflow-y-auto max-h-[55vh] pb-safe">
          {DEFAULT_COST_CODES.map(cc => (
            <button
              key={cc.code}
              onClick={() => addTimeEntry(cc)}
              className="w-full px-4 py-3 flex items-center gap-3 text-left border-b border-gray-100 active:bg-gray-50"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">{cc.code}</span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{cc.name}</div>
              </div>
              <ChevronDown size={20} className="text-gray-400 -rotate-90" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold">Timecard</h1>
        <div className="w-10" />
      </header>

      <div className="p-4 space-y-4">
        {/* Date & Greeting */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-blue-200 text-sm">{getGreeting()}, {user?.firstName || 'Worker'}</div>
              <div className="text-2xl font-bold">{formatTime(currentTime)}</div>
            </div>
            <div className="text-right">
              <div className="text-blue-200 text-sm">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
              <div className="font-medium">
                {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
          
          {/* Project */}
          <div className="bg-white/20 rounded-lg px-3 py-2 text-sm">
            📍 {timecard.project_name}
          </div>
        </div>

        {/* Clock In/Out Section */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              Time Clock
            </h2>
            {timecard.status === 'submitted' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Submitted
              </span>
            )}
          </div>

          {/* Clock Times Display */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Sun size={14} />
                Clock In
              </div>
              <input
                type="time"
                value={timecard.clock_in || ''}
                onChange={e => setTimecard(prev => ({ ...prev, clock_in: e.target.value }))}
                className="text-xl font-bold bg-transparent w-full"
                disabled={timecard.status === 'submitted'}
              />
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Moon size={14} />
                Clock Out
              </div>
              <input
                type="time"
                value={timecard.clock_out || ''}
                onChange={e => setTimecard(prev => ({ ...prev, clock_out: e.target.value }))}
                className="text-xl font-bold bg-transparent w-full"
                disabled={timecard.status === 'submitted'}
              />
            </div>
          </div>

          {/* Clock Action Buttons */}
          {timecard.status !== 'submitted' && (
            <div className="flex gap-3">
              {!isClockedIn ? (
                <button
                  onClick={handleClockIn}
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Play size={20} />
                  Clock In
                </button>
              ) : (
                <>
                  <button
                    onClick={handleBreakToggle}
                    className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${
                      isOnBreak
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Coffee size={20} />
                    {isOnBreak ? 'End Break' : 'Break'}
                  </button>
                  <button
                    onClick={handleClockOut}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                  >
                    <Square size={20} />
                    Clock Out
                  </button>
                </>
              )}
            </div>
          )}

          {/* Break Time Input */}
          <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Coffee size={18} className="text-gray-500" />
              <span className="text-gray-700">Break Time</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={timecard.break_minutes}
                onChange={e => setTimecard(prev => ({ ...prev, break_minutes: parseInt(e.target.value) || 0 }))}
                className="w-16 p-2 text-center border rounded-lg"
                min="0"
                max="120"
                disabled={timecard.status === 'submitted'}
              />
              <span className="text-gray-500 text-sm">min</span>
            </div>
          </div>
        </div>

        {/* Time Entries by Cost Code */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign size={20} className="text-green-600" />
              Time by Cost Code
            </h2>
            <div className="text-lg font-bold text-blue-600">
              {timecard.total_hours.toFixed(1)} hrs
            </div>
          </div>

          {/* Entries List */}
          <div className="space-y-3">
            {timecard.entries.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock size={40} className="mx-auto mb-2 opacity-50" />
                <p>No time entries yet</p>
                <p className="text-sm">Add a cost code to start tracking</p>
              </div>
            ) : (
              timecard.entries.map(entry => (
                <div 
                  key={entry.id}
                  className="border border-gray-200 rounded-xl p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">{entry.cost_code}</span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{entry.cost_code_name}</div>
                        <div className="text-xs text-gray-500">
                          {entry.hours > 0 ? `${entry.hours.toFixed(1)} hours` : 'In progress...'}
                        </div>
                      </div>
                    </div>
                    {timecard.status !== 'submitted' && (
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="p-2 text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  
                  {/* Time Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Start</label>
                      <input
                        type="time"
                        value={entry.start_time}
                        onChange={e => updateEntry(entry.id, { start_time: e.target.value })}
                        className="w-full p-2 border rounded-lg text-sm"
                        disabled={timecard.status === 'submitted'}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">End</label>
                      <input
                        type="time"
                        value={entry.end_time || ''}
                        onChange={e => updateEntry(entry.id, { end_time: e.target.value })}
                        className="w-full p-2 border rounded-lg text-sm"
                        disabled={timecard.status === 'submitted'}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <input
                    type="text"
                    value={entry.notes}
                    onChange={e => updateEntry(entry.id, { notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="w-full mt-2 p-2 border rounded-lg text-sm"
                    disabled={timecard.status === 'submitted'}
                  />
                </div>
              ))
            )}
          </div>

          {/* Add Entry Button */}
          {timecard.status !== 'submitted' && (
            <button
              onClick={() => setShowCostCodePicker(true)}
              className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-50"
            >
              <Plus size={20} />
              Add Cost Code
            </button>
          )}
        </div>

        {/* Daily Summary */}
        <div className="bg-white rounded-xl p-4">
          <h2 className="font-semibold mb-3">Daily Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Time</span>
              <span className="font-medium">
                {timecard.clock_in && timecard.clock_out 
                  ? `${calculateHours(timecard.clock_in, timecard.clock_out).toFixed(1)} hrs`
                  : '--'
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Break Time</span>
              <span className="font-medium">-{(timecard.break_minutes / 60).toFixed(1)} hrs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Allocated to Codes</span>
              <span className="font-medium">{timecard.total_hours.toFixed(1)} hrs</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between">
              <span className="font-semibold">Net Hours</span>
              <span className="font-bold text-blue-600">
                {(timecard.total_hours).toFixed(1)} hrs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      {timecard.status !== 'submitted' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-bottom">
          <button
            onClick={handleSubmit}
            disabled={isLoading || timecard.entries.length === 0}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check size={20} />
                Submit Timecard
              </>
            )}
          </button>
        </div>
      )}

      {/* Cost Code Picker Modal */}
      {showCostCodePicker && <CostCodePicker />}
    </div>
  );
}
