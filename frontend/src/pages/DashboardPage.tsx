/**
 * Dashboard Page - Role-based views focused on field-to-office communication
 * 
 * PM: Job progress, field submissions needing review, project status
 * Superintendent: Deliveries, manpower planning, daily operations
 * Foreman: Today's crew, tasks, quick report submission
 * Field Worker: Simple fixed view - tasks & time logging
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Truck,
  Users,
  FileText,
  Clock,
  Calendar,
  AlertTriangle,
  Camera,
  RefreshCw,
  Building2,
  Inbox,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore, UserRole } from '../contexts/localAuthStore';
import { projectsService, Project } from '../services/projectsService';
import { deliveriesService, Delivery } from '../services/deliveriesService';
import { dailyReportsService, DailyReport } from '../services/dailyReportsService';
import { tasksService, Task } from '../services/tasksService';
import { lookAheadService, LookAheadDay } from '../services/lookAheadService';
import { quotesService } from '../services/quotesService';
import { localDB } from '../utils/localDB';

// Widget types available for each role
type WidgetType = 
  | 'todays_tasks'
  | 'upcoming_deliveries'
  | 'manpower_today'
  | 'quick_actions'
  | 'pending_reviews'
  | 'recent_reports'
  | 'project_status'
  | 'look_ahead_summary'
  | 'late_deliveries'
  | 'my_hours';

interface Widget {
  id: WidgetType;
  label: string;
  description: string;
  roles: UserRole[];
}

const AVAILABLE_WIDGETS: Widget[] = [
  { id: 'quick_actions', label: 'Quick Actions', description: 'Fast access to common tasks', roles: ['foreman', 'superintendent', 'project_manager', 'admin'] },
  { id: 'todays_tasks', label: "Today's Tasks", description: 'Tasks assigned to you', roles: ['field_worker', 'foreman', 'superintendent', 'project_manager', 'admin'] },
  { id: 'manpower_today', label: "Today's Crew", description: 'Expected manpower for today', roles: ['foreman', 'superintendent', 'project_manager', 'admin'] },
  { id: 'upcoming_deliveries', label: 'Upcoming Deliveries', description: 'Deliveries arriving soon', roles: ['foreman', 'superintendent', 'project_manager', 'admin'] },
  { id: 'late_deliveries', label: 'Late Deliveries', description: 'Overdue deliveries needing attention', roles: ['superintendent', 'project_manager', 'admin'] },
  { id: 'pending_reviews', label: 'Pending Reviews', description: 'Field submissions awaiting review', roles: ['project_manager', 'admin'] },
  { id: 'recent_reports', label: 'Recent Field Reports', description: 'Latest daily reports from the field', roles: ['superintendent', 'project_manager', 'admin'] },
  { id: 'project_status', label: 'Project Status', description: 'Overview of active projects', roles: ['project_manager', 'admin'] },
  { id: 'look_ahead_summary', label: '2-Week Look Ahead', description: 'Upcoming work summary', roles: ['superintendent', 'project_manager', 'admin'] },
  { id: 'my_hours', label: 'My Hours', description: 'Your time this week', roles: ['field_worker', 'foreman'] },
];

const DEFAULT_WIDGETS: Record<UserRole, WidgetType[]> = {
  field_worker: ['todays_tasks', 'my_hours'],
  foreman: ['quick_actions', 'manpower_today', 'todays_tasks', 'upcoming_deliveries'],
  superintendent: ['quick_actions', 'manpower_today', 'upcoming_deliveries', 'late_deliveries', 'recent_reports'],
  project_manager: ['pending_reviews', 'project_status', 'recent_reports', 'look_ahead_summary'],
  project_engineer: ['todays_tasks', 'upcoming_deliveries', 'recent_reports'],
  admin: ['pending_reviews', 'project_status', 'upcoming_deliveries', 'recent_reports'],
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role || 'field_worker';
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState<WidgetType[]>([]);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todayLookAhead, setTodayLookAhead] = useState<LookAheadDay | null>(null);
  const [pendingQuotes, setPendingQuotes] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    loadWidgetConfig();
    loadDashboardData();
  }, [userRole]);

  const loadWidgetConfig = async () => {
    const saved = await localDB.getSetting<WidgetType[]>(`dashboard_widgets_${userRole}`);
    if (saved && saved.length > 0) {
      setActiveWidgets(saved);
    } else {
      setActiveWidgets(DEFAULT_WIDGETS[userRole] || ['todays_tasks']);
    }
  };

  const saveWidgetConfig = async (widgets: WidgetType[]) => {
    await localDB.setSetting(`dashboard_widgets_${userRole}`, widgets);
    setActiveWidgets(widgets);
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [allTasks, allDeliveries, allReports, allProjects, allQuotes] = await Promise.all([
        tasksService.getAll(),
        deliveriesService.getAll(),
        dailyReportsService.getAll(),
        projectsService.getAll(),
        quotesService.getAll(),
      ]);

      setTasks(allTasks.filter(t => t.status !== 'completed').slice(0, 5));
      setDeliveries(allDeliveries.filter(d => !d.isDelivered));
      setReports(allReports.slice(0, 5));
      setProjects(allProjects.filter(p => p.status === 'active'));
      
      setPendingQuotes(allQuotes.filter(q => q.status === 'pending' || q.status === 'in_review').length);
      setPendingReports(allReports.filter(r => r.status === 'submitted').length);

      const lookAheadData = await lookAheadService.getAll();
      const todayData = lookAheadData.find(d => d.date === today);
      setTodayLookAhead(todayData || null);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getAvailableWidgets = () => AVAILABLE_WIDGETS.filter(w => w.roles.includes(userRole));

  const toggleWidget = (widgetId: WidgetType) => {
    const newWidgets = activeWidgets.includes(widgetId)
      ? activeWidgets.filter(w => w !== widgetId)
      : [...activeWidgets, widgetId];
    saveWidgetConfig(newWidgets);
  };

  const resetToDefaults = () => {
    saveWidgetConfig(DEFAULT_WIDGETS[userRole] || ['todays_tasks']);
  };

  const renderWidget = (widgetId: WidgetType) => {
    switch (widgetId) {
      case 'quick_actions':
        return (
          <div key={widgetId} className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => navigate('/daily-report')} className="flex flex-col items-center gap-1 p-3 bg-green-50 rounded-xl">
                <FileText size={20} className="text-green-600" />
                <span className="text-xs text-green-700">Daily Report</span>
              </button>
              <button onClick={() => navigate('/capture/photo')} className="flex flex-col items-center gap-1 p-3 bg-blue-50 rounded-xl">
                <Camera size={20} className="text-blue-600" />
                <span className="text-xs text-blue-700">Photo</span>
              </button>
              <button onClick={() => navigate('/deliveries')} className="flex flex-col items-center gap-1 p-3 bg-amber-50 rounded-xl">
                <Truck size={20} className="text-amber-600" />
                <span className="text-xs text-amber-700">Deliveries</span>
              </button>
              <button onClick={() => navigate('/look-ahead')} className="flex flex-col items-center gap-1 p-3 bg-purple-50 rounded-xl">
                <Calendar size={20} className="text-purple-600" />
                <span className="text-xs text-purple-700">Look Ahead</span>
              </button>
            </div>
          </div>
        );

      case 'todays_tasks':
        return (
          <div key={widgetId} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Today's Tasks</h3>
              <button onClick={() => navigate('/tasks')} className="text-blue-600 text-sm">View All</button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No tasks assigned</p>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-orange-500' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{task.title}</div>
                      {task.dueDate && <div className="text-xs text-gray-500">Due {formatDate(task.dueDate)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'manpower_today':
        return (
          <div key={widgetId} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Today's Crew</h3>
              <button onClick={() => navigate('/look-ahead')} className="text-blue-600 text-sm">Plan</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users size={28} className="text-blue-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{todayLookAhead?.manpower || '—'}</div>
                <div className="text-sm text-gray-500">Expected workers</div>
              </div>
            </div>
          </div>
        );

      case 'upcoming_deliveries':
        const upcoming = deliveries.filter(d => !d.isDelivered).sort((a, b) => new Date(a.estimatedArrival).getTime() - new Date(b.estimatedArrival).getTime()).slice(0, 3);
        return (
          <div key={widgetId} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Upcoming Deliveries</h3>
              <button onClick={() => navigate('/deliveries')} className="text-blue-600 text-sm">View All</button>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No upcoming deliveries</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(delivery => (
                  <div key={delivery.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{delivery.description}</div>
                      <div className="text-xs text-gray-500">{delivery.supplierName}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ml-2 ${delivery.estimatedArrival < new Date().toISOString().split('T')[0] ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {formatDate(delivery.estimatedArrival)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'late_deliveries':
        const today = new Date().toISOString().split('T')[0];
        const late = deliveries.filter(d => !d.isDelivered && d.estimatedArrival < today);
        if (late.length === 0) return null;
        return (
          <div key={widgetId} className="bg-red-50 rounded-xl border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-red-600" />
              <h3 className="font-semibold text-red-900">Late Deliveries ({late.length})</h3>
            </div>
            <div className="space-y-2">
              {late.slice(0, 3).map(delivery => (
                <div key={delivery.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{delivery.description}</div>
                    <div className="text-xs text-gray-500">{delivery.supplierName}</div>
                  </div>
                  <span className="text-xs text-red-600 ml-2">{formatDate(delivery.estimatedArrival)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/deliveries')} className="w-full mt-3 py-2 text-sm text-red-700 font-medium">Manage Deliveries →</button>
          </div>
        );

      case 'pending_reviews':
        const totalPending = pendingQuotes + pendingReports;
        return (
          <div key={widgetId} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Inbox size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">Pending Reviews</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/pm-queue')} className="p-3 bg-amber-50 rounded-xl text-left">
                <div className="text-2xl font-bold text-amber-700">{pendingQuotes}</div>
                <div className="text-xs text-amber-600">Quote Requests</div>
              </button>
              <button onClick={() => navigate('/pm-dashboard')} className="p-3 bg-green-50 rounded-xl text-left">
                <div className="text-2xl font-bold text-green-700">{pendingReports}</div>
                <div className="text-xs text-green-600">Daily Reports</div>
              </button>
            </div>
            {totalPending > 0 && (
              <div className="mt-3 pt-3 border-t text-center">
                <span className="text-sm text-gray-600">{totalPending} items need your attention</span>
              </div>
            )}
          </div>
        );

      case 'recent_reports':
        return (
          <div key={widgetId} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Recent Field Reports</h3>
              <button onClick={() => navigate('/pm-dashboard')} className="text-blue-600 text-sm">View All</button>
            </div>
            {reports.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No reports yet</p>
            ) : (
              <div className="space-y-2">
                {reports.slice(0, 3).map(report => (
                  <div key={report.id} className="p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm text-gray-900">{formatDate(report.reportDate)}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users size={12} />
                        {report.totalCrewCount}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">{report.foreman}</div>
                    {report.hasProblems && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                        <AlertTriangle size={10} />
                        Issues reported
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'project_status':
        return (
          <div key={widgetId} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Active Projects</h3>
              <button onClick={() => navigate('/projects')} className="text-blue-600 text-sm">View All</button>
            </div>
            {projects.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-2">No active projects</p>
                <button onClick={() => navigate('/projects/new')} className="text-blue-600 text-sm font-medium">+ Create Project</button>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 3).map(project => (
                  <div key={project.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{project.name}</div>
                      <div className="text-xs text-gray-500">{project.city || 'No location'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'look_ahead_summary':
        return (
          <div key={widgetId} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">2-Week Look Ahead</h3>
              <button onClick={() => navigate('/look-ahead')} className="text-blue-600 text-sm">Plan</button>
            </div>
            <button onClick={() => navigate('/look-ahead')} className="w-full flex items-center gap-4 p-3 bg-purple-50 rounded-xl">
              <Calendar size={24} className="text-purple-600" />
              <div className="text-left">
                <div className="text-sm text-purple-900 font-medium">Plan your next 2 weeks</div>
                <div className="text-xs text-purple-600">Manpower & work activities</div>
              </div>
              <ChevronRight size={20} className="text-purple-400 ml-auto" />
            </button>
          </div>
        );

      case 'my_hours':
        return (
          <div key={widgetId} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">My Hours This Week</h3>
              <button onClick={() => navigate('/timecard')} className="text-blue-600 text-sm">Log Time</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock size={28} className="text-green-600" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-500">Hours logged</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Field worker gets a simple fixed view
  if (userRole === 'field_worker') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-blue-600 text-white px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">Hey, {user?.firstName}!</div>
              <div className="text-blue-100 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
            </div>
            <button onClick={loadDashboardData} className="p-2 hover:bg-white/10 rounded-lg">
              <RefreshCw size={20} />
            </button>
          </div>
        </header>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/capture/photo')} className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Camera size={24} className="text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">Take Photo</span>
            </button>
            <button onClick={() => navigate('/timecard')} className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock size={24} className="text-green-600" />
              </div>
              <span className="font-medium text-gray-900">Log Time</span>
            </button>
          </div>
          {renderWidget('todays_tasks')}
          {renderWidget('my_hours')}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-blue-600 text-white px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-lg">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-semibold">Dashboard</h1>
          <div className="flex items-center gap-1">
            <button onClick={loadDashboardData} className="p-2 hover:bg-white/10 rounded-lg">
              <RefreshCw size={20} />
            </button>
            <button onClick={() => setIsCustomizing(!isCustomizing)} className={`p-2 rounded-lg ${isCustomizing ? 'bg-white/20' : 'hover:bg-white/10'}`}>
              <Settings size={20} />
            </button>
          </div>
        </div>
        <div className="text-blue-100 text-sm capitalize">{user?.firstName} · {userRole.replace('_', ' ')}</div>
      </header>

      {isCustomizing && (
        <div className="bg-white border-b px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Customize Dashboard</h3>
            <button onClick={resetToDefaults} className="text-sm text-blue-600">Reset to Default</button>
          </div>
          <div className="space-y-2">
            {getAvailableWidgets().map(widget => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border ${activeWidgets.includes(widget.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
              >
                {activeWidgets.includes(widget.id) ? <Eye size={18} className="text-blue-600" /> : <EyeOff size={18} className="text-gray-400" />}
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">{widget.label}</div>
                  <div className="text-xs text-gray-500">{widget.description}</div>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setIsCustomizing(false)} className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-medium">Done</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={32} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {activeWidgets.map(widgetId => renderWidget(widgetId))}
          {activeWidgets.length === 0 && (
            <div className="text-center py-12">
              <Settings size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No widgets selected</p>
              <button onClick={() => setIsCustomizing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Customize Dashboard</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
