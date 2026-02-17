/**
 * Dashboard Page - Main Home Screen
 * Shows all projects, tasks for today, and scheduled work
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Settings,
  Plus,
  Truck,
  Users,
  FileText,
  Clock,
  Calendar,
  AlertTriangle,
  Building2,
  CheckCircle,
  Circle,
  MapPin,
  RefreshCw,
  Briefcase,
  ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '../contexts/localAuthStore';
import { projectsService, Project } from '../services/projectsService';
import { deliveriesService, Delivery } from '../services/deliveriesService';
import { dailyReportsService, DailyReport } from '../services/dailyReportsService';
import { tasksService, Task } from '../services/tasksService';
import { lookAheadService, LookAheadDay } from '../services/lookAheadService';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<LookAheadDay | null>(null);
  const [recentReports, setRecentReports] = useState<DailyReport[]>([]);

  const today = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [allProjects, allTasks, allDeliveries, allReports, allLookAhead] = await Promise.all([
        projectsService.getAll(),
        tasksService.getAll(),
        deliveriesService.getAll(),
        dailyReportsService.getAll(),
        lookAheadService.getAll(),
      ]);

      // Active projects
      setProjects(allProjects.filter(p => p.status === 'active' || p.status === 'planning'));
      
      // Incomplete tasks, sorted by due date
      const incompleteTasks = allTasks
        .filter(t => t.status !== 'completed')
        .sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
      setTasks(incompleteTasks);
      
      // Upcoming deliveries
      const upcomingDeliveries = allDeliveries
        .filter(d => !d.isDelivered)
        .sort((a, b) => new Date(a.estimatedArrival).getTime() - new Date(b.estimatedArrival).getTime());
      setDeliveries(upcomingDeliveries);
      
      // Today's schedule
      const todayData = allLookAhead.find(d => d.date === today);
      setTodaySchedule(todayData || null);
      
      // Recent reports
      setRecentReports(allReports.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (dateStr === today) return 'Today';
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'planning': return 'bg-blue-100 text-blue-700';
      case 'on_hold': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {user?.firstName ? `Welcome, ${user.firstName}` : 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500">{todayFormatted}</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadDashboardData}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw size={20} />
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">{projects.length}</div>
            <div className="text-xs text-gray-500">Projects</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
            <div className="text-xs text-gray-500">Tasks</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">{deliveries.length}</div>
            <div className="text-xs text-gray-500">Deliveries</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">{todaySchedule?.manpower || 0}</div>
            <div className="text-xs text-gray-500">Crew Today</div>
          </div>
        </div>

        {/* Today's Schedule */}
        {todaySchedule && todaySchedule.plannedWork && todaySchedule.plannedWork.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={18} />
                Today's Schedule
              </h2>
              <button 
                onClick={() => navigate('/look-ahead')}
                className="text-sm text-blue-600"
              >
                View All
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 divide-y">
              {todaySchedule.plannedWork.slice(0, 3).map((work, idx) => (
                <div key={idx} className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ClipboardList size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{work}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 size={18} />
              Projects
            </h2>
            <button 
              onClick={() => navigate('/projects/new')}
              className="text-sm text-blue-600 flex items-center gap-1"
            >
              <Plus size={16} />
              New
            </button>
          </div>
          
          {projects.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Building2 size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No projects yet</p>
              <button
                onClick={() => navigate('/projects/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map(project => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 size={24} className="text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{project.name}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {project.city && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {project.city}
                        </span>
                      )}
                      {project.number && (
                        <span>#{project.number}</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getProjectStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <ChevronRight size={20} className="text-gray-400" />
                </button>
              ))}
              {projects.length > 5 && (
                <button
                  onClick={() => navigate('/projects')}
                  className="w-full py-3 text-sm text-blue-600 font-medium"
                >
                  View All {projects.length} Projects
                </button>
              )}
            </div>
          )}
        </section>

        {/* Tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle size={18} />
              Tasks
            </h2>
            <button 
              onClick={() => navigate('/tasks')}
              className="text-sm text-blue-600"
            >
              View All
            </button>
          </div>
          
          {tasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <CheckCircle size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No pending tasks</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y">
              {tasks.slice(0, 5).map(task => (
                <div key={task.id} className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getTaskPriorityColor(task.priority)}`}>
                    <Circle size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{task.title}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {task.dueDate && (
                        <span className={task.dueDate < today ? 'text-red-600' : ''}>
                          Due {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.assignedToName && (
                        <span>{task.assignedToName}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Deliveries */}
        {deliveries.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Truck size={18} />
                Upcoming Deliveries
              </h2>
              <button 
                onClick={() => navigate('/deliveries')}
                className="text-sm text-blue-600"
              >
                View All
              </button>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 divide-y">
              {deliveries.slice(0, 3).map(delivery => (
                <div key={delivery.id} className="p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    delivery.estimatedArrival < today 
                      ? 'bg-red-100 text-red-600' 
                      : 'bg-amber-100 text-amber-600'
                  }`}>
                    <Truck size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{delivery.description}</div>
                    <div className="text-xs text-gray-500">{delivery.supplierName}</div>
                  </div>
                  <span className={`text-xs font-medium ${
                    delivery.estimatedArrival < today ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {formatDate(delivery.estimatedArrival)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/daily-report')}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText size={20} className="text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Daily Report</div>
                <div className="text-xs text-gray-500">Log today's work</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/capture/photo')}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Briefcase size={20} className="text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Take Photo</div>
                <div className="text-xs text-gray-500">Document progress</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/look-ahead')}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar size={20} className="text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">Look Ahead</div>
                <div className="text-xs text-gray-500">2-week planning</div>
              </div>
            </button>
            <button
              onClick={() => navigate('/more')}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Settings size={20} className="text-gray-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">More</div>
                <div className="text-xs text-gray-500">All features</div>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
