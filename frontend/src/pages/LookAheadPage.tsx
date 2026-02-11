/**
 * Two Week Look Ahead - 14 Day Planning View
 * Shows daily manpower and planned work for the next 2 weeks
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  Calendar,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  Save,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';

interface DayPlan {
  date: string;
  dayOfWeek: string;
  dayNumber: number;
  month: string;
  isWeekend: boolean;
  isToday: boolean;
  manpower: number;
  plannedWork: string[];
}

interface LookAheadData {
  [date: string]: {
    manpower: number;
    plannedWork: string[];
  };
}

// Generate 14 days starting from today
const generateDays = (): DayPlan[] => {
  const days: DayPlan[] = [];
  const today = new Date();
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    days.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek,
      dayNumber: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      isWeekend,
      isToday: i === 0,
      manpower: 0,
      plannedWork: [],
    });
  }
  
  return days;
};

// Common HVAC work activities for quick add
const QUICK_ADD_ACTIVITIES = [
  'Duct rough-in',
  'Hang ductwork',
  'Install diffusers/grilles',
  'Set RTU/AHU',
  'Set VAV boxes',
  'Piping rough-in',
  'Insulation',
  'Controls wiring',
  'TAB',
  'Startup',
  'Punch list',
  'Mobilization',
  'Material delivery',
  'Crane day',
  'Coordination meeting',
];

export function LookAheadPage() {
  const navigate = useNavigate();
  const { currentProject, showToast } = useAppStore();
  
  const [days, setDays] = useState<DayPlan[]>(generateDays());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<DayPlan | null>(null);
  const [newActivity, setNewActivity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  // Load saved data from localStorage (in production, from API)
  useEffect(() => {
    if (!currentProject) return;
    
    const saved = localStorage.getItem(`lookahead_${currentProject.id}`);
    if (saved) {
      try {
        const data: LookAheadData = JSON.parse(saved);
        setDays(prev => prev.map(day => ({
          ...day,
          manpower: data[day.date]?.manpower || 0,
          plannedWork: data[day.date]?.plannedWork || [],
        })));
      } catch (e) {
        console.error('Failed to load look-ahead data');
      }
    }
  }, [currentProject]);
  
  // Save data
  const saveData = () => {
    if (!currentProject) return;
    
    setIsSaving(true);
    
    const data: LookAheadData = {};
    days.forEach(day => {
      if (day.manpower > 0 || day.plannedWork.length > 0) {
        data[day.date] = {
          manpower: day.manpower,
          plannedWork: day.plannedWork,
        };
      }
    });
    
    localStorage.setItem(`lookahead_${currentProject.id}`, JSON.stringify(data));
    
    setTimeout(() => {
      setIsSaving(false);
      showToast('Look-ahead saved!', 'success');
    }, 500);
  };
  
  // Update day data
  const updateDay = (date: string, updates: Partial<DayPlan>) => {
    setDays(prev => prev.map(day => 
      day.date === date ? { ...day, ...updates } : day
    ));
  };
  
  // Add activity to day
  const addActivity = (date: string, activity: string) => {
    if (!activity.trim()) return;
    
    setDays(prev => prev.map(day => 
      day.date === date 
        ? { ...day, plannedWork: [...day.plannedWork, activity.trim()] }
        : day
    ));
    setNewActivity('');
  };
  
  // Remove activity from day
  const removeActivity = (date: string, index: number) => {
    setDays(prev => prev.map(day => 
      day.date === date
        ? { ...day, plannedWork: day.plannedWork.filter((_, i) => i !== index) }
        : day
    ));
  };
  
  // Copy previous day's plan
  const copyFromPreviousDay = (date: string) => {
    const dayIndex = days.findIndex(d => d.date === date);
    if (dayIndex <= 0) return;
    
    const previousDay = days[dayIndex - 1];
    updateDay(date, {
      manpower: previousDay.manpower,
      plannedWork: [...previousDay.plannedWork],
    });
    showToast('Copied from previous day', 'info');
  };
  
  // Calculate totals
  const totalManHours = days.reduce((sum, day) => sum + (day.manpower * 8), 0);
  const totalManpower = days.reduce((sum, day) => sum + day.manpower, 0);
  const workingDays = days.filter(d => !d.isWeekend && d.manpower > 0).length;
  
  // Get selected day data
  const selectedDayData = days.find(d => d.date === selectedDay);

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-lg font-semibold mb-2">No Project Selected</h2>
          <p className="text-gray-600 mb-4">Please select a project first.</p>
          <button 
            onClick={() => navigate('/today')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <h1 className="font-semibold">2-Week Look Ahead</h1>
            <p className="text-xs text-gray-500">{currentProject.name}</p>
          </div>
          <button 
            onClick={saveData}
            disabled={isSaving}
            className="p-2 -mr-2 text-blue-600"
          >
            {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          </button>
        </div>
      </header>

      {/* Summary Bar */}
      <div className="bg-blue-600 text-white px-4 py-3">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{workingDays}</div>
            <div className="text-xs opacity-80">Work Days</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{Math.round(totalManpower / (workingDays || 1))}</div>
            <div className="text-xs opacity-80">Avg Crew/Day</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalManHours}</div>
            <div className="text-xs opacity-80">Total Man-Hrs</div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week Headers */}
        <div className="mb-4">
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            {days[0].month} {days[0].dayNumber} - {days[13].month} {days[13].dayNumber}
          </h2>
        </div>

        {/* Day Cards */}
        <div className="space-y-2">
          {days.map((day, index) => (
            <div
              key={day.date}
              className={`bg-white rounded-xl border overflow-hidden ${
                day.isToday ? 'border-blue-500 ring-2 ring-blue-100' : 
                day.isWeekend ? 'border-gray-200 bg-gray-50' : 'border-gray-200'
              }`}
            >
              {/* Day Header */}
              <button
                onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)}
                className="w-full p-3 flex items-center gap-3"
              >
                {/* Date Badge */}
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                  day.isToday ? 'bg-blue-600 text-white' :
                  day.isWeekend ? 'bg-gray-200 text-gray-500' : 'bg-gray-100'
                }`}>
                  <span className="text-xs font-medium">{day.dayOfWeek}</span>
                  <span className="text-lg font-bold">{day.dayNumber}</span>
                </div>
                
                {/* Day Info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    {day.isToday && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Today
                      </span>
                    )}
                    {day.isWeekend && (
                      <span className="text-xs text-gray-400">Weekend</span>
                    )}
                  </div>
                  
                  {day.plannedWork.length > 0 ? (
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {day.plannedWork.slice(0, 2).join(', ')}
                      {day.plannedWork.length > 2 && ` +${day.plannedWork.length - 2} more`}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-1">No work planned</p>
                  )}
                </div>
                
                {/* Manpower Badge */}
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${
                  day.manpower > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Users size={14} />
                  <span className="font-medium">{day.manpower}</span>
                </div>
                
                <ChevronRight 
                  size={20} 
                  className={`text-gray-400 transition-transform ${selectedDay === day.date ? 'rotate-90' : ''}`} 
                />
              </button>
              
              {/* Expanded Day Details */}
              {selectedDay === day.date && (
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  {/* Manpower Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Manpower
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateDay(day.date, { manpower: Math.max(0, day.manpower - 1) })}
                        className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"
                      >
                        <span className="text-xl">−</span>
                      </button>
                      <input
                        type="number"
                        value={day.manpower}
                        onChange={e => updateDay(day.date, { manpower: parseInt(e.target.value) || 0 })}
                        className="w-20 text-center text-2xl font-bold p-2 border rounded-xl"
                      />
                      <button
                        onClick={() => updateDay(day.date, { manpower: day.manpower + 1 })}
                        className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"
                      >
                        <span className="text-xl">+</span>
                      </button>
                      <span className="text-gray-500 text-sm">= {day.manpower * 8} hrs</span>
                    </div>
                  </div>
                  
                  {/* Planned Work */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Planned Work
                      </label>
                      {index > 0 && (
                        <button
                          onClick={() => copyFromPreviousDay(day.date)}
                          className="text-xs text-blue-600 flex items-center gap-1"
                        >
                          <Copy size={12} /> Copy previous
                        </button>
                      )}
                    </div>
                    
                    {/* Activity List */}
                    {day.plannedWork.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {day.plannedWork.map((activity, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center gap-2 bg-white p-2 rounded-lg border"
                          >
                            <Check size={16} className="text-green-500 flex-shrink-0" />
                            <span className="flex-1 text-sm">{activity}</span>
                            <button
                              onClick={() => removeActivity(day.date, idx)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Add Activity */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newActivity}
                        onChange={e => setNewActivity(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && addActivity(day.date, newActivity)}
                        placeholder="Add work item..."
                        className="flex-1 p-2 border rounded-lg text-sm"
                      />
                      <button
                        onClick={() => addActivity(day.date, newActivity)}
                        disabled={!newActivity.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    
                    {/* Quick Add Buttons */}
                    <div className="mt-3">
                      <button
                        onClick={() => setShowQuickAdd(!showQuickAdd)}
                        className="text-xs text-gray-500 flex items-center gap-1"
                      >
                        {showQuickAdd ? 'Hide' : 'Show'} quick add options
                        <ChevronRight size={12} className={showQuickAdd ? 'rotate-90' : ''} />
                      </button>
                      
                      {showQuickAdd && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {QUICK_ADD_ACTIVITIES.map(activity => (
                            <button
                              key={activity}
                              onClick={() => addActivity(day.date, activity)}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-700"
                            >
                              + {activity}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
