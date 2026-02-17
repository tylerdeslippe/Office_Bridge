/**
 * Dashboard Page - Modern Clean Design
 * Dark/Light mode support
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Plus,
  Truck,
  FileText,
  Calendar,
  Building2,
  CheckCircle,
  MapPin,
  RefreshCw,
  Camera,
  Settings,
  Bell,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import { useAuthStore } from '../contexts/localAuthStore';
import { projectsService, Project } from '../services/projectsService';
import { deliveriesService, Delivery } from '../services/deliveriesService';
import { tasksService, Task } from '../services/tasksService';
import { lookAheadService, LookAheadDay } from '../services/lookAheadService';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<LookAheadDay | null>(null);
  
  // Dark mode detection
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Pull to refresh
  const [pullY, setPullY] = useState(0);
  const [pulling, setPulling] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const [allProjects, allTasks, allDeliveries, allLookAhead] = await Promise.all([
        projectsService.getAll(),
        tasksService.getAll(),
        deliveriesService.getAll(),
        lookAheadService.getAll(),
      ]);

      setProjects(allProjects.filter(p => ['active', 'planning', 'draft'].includes(p.status)));
      setTasks(allTasks.filter(t => t.status !== 'completed').slice(0, 5));
      setDeliveries(allDeliveries.filter(d => !d.isDelivered).slice(0, 3));
      setTodaySchedule(allLookAhead.find(d => d.date === today) || null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) { setPullY(e.touches[0].clientY); setPulling(true); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling) return;
    const dist = Math.max(0, e.touches[0].clientY - pullY);
    setPullY(Math.min(dist, 100));
  };
  const handleTouchEnd = () => {
    if (pullY > 60) loadData(true);
    setPullY(0);
    setPulling(false);
  };

  // Theme classes
  const bg = isDark ? 'bg-black' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';

  if (isLoading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <RefreshCw size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div 
      className={`min-h-screen ${bg} ${text}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {pullY > 0 && (
        <div className="flex justify-center py-4" style={{ height: pullY }}>
          <RefreshCw size={20} className={`text-blue-500 ${pullY > 60 ? 'animate-spin' : ''}`} />
        </div>
      )}

      {/* Header */}
      <header className={`px-6 pt-14 pb-4 ${bg}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className={`text-sm ${textMuted}`}>{greeting()}</p>
            <h1 className="text-2xl font-bold">{user?.firstName || 'Welcome'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className={`w-10 h-10 ${cardBg} rounded-full flex items-center justify-center ${border} border`}>
              <Bell size={20} className={textMuted} />
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className={`w-10 h-10 ${cardBg} rounded-full flex items-center justify-center ${border} border`}
            >
              <Settings size={20} className={textMuted} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-3 px-4 py-3 ${cardBg} rounded-2xl ${border} border`}>
          <Search size={20} className={textMuted} />
          <input 
            type="text" 
            placeholder="Search projects, tasks..."
            className={`flex-1 bg-transparent outline-none ${text} placeholder:${textMuted}`}
          />
        </div>
      </header>

      <div className="px-6 pb-32 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Projects', value: projects.length, color: 'bg-blue-500' },
            { label: 'Tasks', value: tasks.length, color: 'bg-purple-500' },
            { label: 'Deliveries', value: deliveries.length, color: 'bg-amber-500' },
            { label: 'Crew', value: todaySchedule?.manpower || 0, color: 'bg-green-500' },
          ].map((stat) => (
            <div key={stat.label} className={`${cardBg} rounded-2xl p-4 ${border} border`}>
              <div className={`w-2 h-2 ${stat.color} rounded-full mb-2`} />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={`text-xs ${textMuted}`}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Plus, label: 'New', action: () => navigate('/projects/new'), color: 'bg-blue-500' },
            { icon: FileText, label: 'Report', action: () => navigate('/daily-report'), color: 'bg-green-500' },
            { icon: Camera, label: 'Photo', action: () => navigate('/capture/photo'), color: 'bg-purple-500' },
            { icon: MoreHorizontal, label: 'More', action: () => navigate('/more'), color: 'bg-gray-500' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`${cardBg} rounded-2xl p-4 ${border} border flex flex-col items-center gap-2`}
            >
              <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
                <item.icon size={22} className="text-white" />
              </div>
              <span className={`text-xs font-medium ${textMuted}`}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Projects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Projects</h2>
            <button onClick={() => navigate('/projects')} className="text-sm text-blue-500 font-medium">
              See All
            </button>
          </div>

          {projects.length === 0 ? (
            <div className={`${cardBg} rounded-2xl p-8 ${border} border text-center`}>
              <div className={`w-16 h-16 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                <Building2 size={28} className={textMuted} />
              </div>
              <p className={`font-medium mb-1`}>No projects yet</p>
              <p className={`text-sm ${textMuted} mb-4`}>Create your first project</p>
              <button
                onClick={() => navigate('/projects/new')}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium"
              >
                New Project
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map(project => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className={`w-full ${cardBg} rounded-2xl p-4 ${border} border flex items-center gap-4 text-left`}
                >
                  <div className={`w-12 h-12 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                    <Building2 size={22} className={textMuted} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.name}</div>
                    <div className={`text-sm ${textMuted} flex items-center gap-1`}>
                      {project.city && <><MapPin size={12} /> {project.city}</>}
                      {project.number && <span className="ml-2">#{project.number}</span>}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    project.status === 'active' ? 'bg-green-500/10 text-green-500' :
                    project.status === 'planning' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-gray-500/10 text-gray-500'
                  }`}>
                    {project.status}
                  </div>
                  <ChevronRight size={18} className={textMuted} />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Tasks */}
        {tasks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Tasks</h2>
              <button onClick={() => navigate('/tasks')} className="text-sm text-blue-500 font-medium">
                See All
              </button>
            </div>

            <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden`}>
              {tasks.map((task, i) => (
                <div 
                  key={task.id} 
                  className={`p-4 flex items-center gap-3 ${i > 0 ? `border-t ${border}` : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    task.priority === 'urgent' ? 'bg-red-500/10' :
                    task.priority === 'high' ? 'bg-orange-500/10' :
                    'bg-blue-500/10'
                  }`}>
                    <CheckCircle size={18} className={
                      task.priority === 'urgent' ? 'text-red-500' :
                      task.priority === 'high' ? 'text-orange-500' :
                      'text-blue-500'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{task.title}</div>
                    {task.dueDate && (
                      <div className={`text-xs ${task.dueDate < today ? 'text-red-500' : textMuted}`}>
                        Due {task.dueDate === today ? 'Today' : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Deliveries */}
        {deliveries.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Deliveries</h2>
              <button onClick={() => navigate('/deliveries')} className="text-sm text-blue-500 font-medium">
                See All
              </button>
            </div>

            <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden`}>
              {deliveries.map((delivery, i) => (
                <div 
                  key={delivery.id} 
                  className={`p-4 flex items-center gap-3 ${i > 0 ? `border-t ${border}` : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    delivery.estimatedArrival < today ? 'bg-red-500/10' : 'bg-amber-500/10'
                  }`}>
                    <Truck size={18} className={delivery.estimatedArrival < today ? 'text-red-500' : 'text-amber-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{delivery.description}</div>
                    <div className={`text-xs ${textMuted}`}>{delivery.supplierName}</div>
                  </div>
                  <div className={`text-xs font-medium ${delivery.estimatedArrival < today ? 'text-red-500' : textMuted}`}>
                    {delivery.estimatedArrival === today ? 'Today' : new Date(delivery.estimatedArrival).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Today's Schedule */}
        {todaySchedule?.plannedWork && todaySchedule.plannedWork.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Today's Schedule</h2>
              <button onClick={() => navigate('/look-ahead')} className="text-sm text-blue-500 font-medium">
                See All
              </button>
            </div>

            <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden`}>
              {todaySchedule.plannedWork.slice(0, 3).map((work, i) => (
                <div 
                  key={i} 
                  className={`p-4 flex items-center gap-3 ${i > 0 ? `border-t ${border}` : ''}`}
                >
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Calendar size={18} className="text-blue-500" />
                  </div>
                  <div className="font-medium">{work}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className={`fixed bottom-0 left-0 right-0 ${cardBg} border-t ${border} px-6 pb-8 pt-3 safe-area-bottom`}>
        <div className="flex justify-around">
          {[
            { icon: Building2, label: 'Home', path: '/dashboard', active: true },
            { icon: CheckCircle, label: 'Tasks', path: '/tasks' },
            { icon: FileText, label: 'Reports', path: '/daily-report' },
            { icon: MoreHorizontal, label: 'More', path: '/more' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 ${item.active ? 'text-blue-500' : textMuted}`}
            >
              <item.icon size={22} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
