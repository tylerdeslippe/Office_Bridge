/**
 * Tasks Page - With Real API Data
 * Priority sections: Needs Acknowledgment > Due Soon > All Tasks
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Clock,
  AlertCircle,
  User,
  Calendar,
  CheckCircle2,
  Bell,
  Loader2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useAppStore } from '../contexts/appStore';
import { tasksApi } from '../utils/api';

interface Task {
  id: number;
  title: string;
  description?: string;
  assignee_id: number;
  created_by_id: number;
  due_date?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'blocked';
  project_id?: number;
  created_at: string;
  acknowledged_at?: string;
  completed_at?: string;
}

function TaskCard({ 
  task, 
  onAcknowledge, 
  onComplete,
  isActioning,
}: { 
  task: Task; 
  onAcknowledge: () => void;
  onComplete: () => void;
  isActioning?: boolean;
}) {
  const priorityColors = {
    urgent: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    medium: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const statusIcons = {
    pending: <Bell size={16} className="text-amber-500" />,
    acknowledged: <Clock size={16} className="text-blue-500" />,
    in_progress: <AlertCircle size={16} className="text-purple-500" />,
    completed: <CheckCircle2 size={16} className="text-green-500" />,
    blocked: <AlertCircle size={16} className="text-red-500" />,
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{statusIcons[task.status]}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900">{task.title}</div>
            {task.description && (
              <div className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</div>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              {task.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(task.due_date)}
                </span>
              )}
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      {task.status === 'pending' && (
        <div className="border-t px-4 py-3 bg-amber-50">
          <button
            onClick={onAcknowledge}
            disabled={isActioning}
            className="w-full py-2 bg-amber-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isActioning ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Check size={18} />
                Acknowledge
              </>
            )}
          </button>
        </div>
      )}

      {(task.status === 'acknowledged' || task.status === 'in_progress') && (
        <div className="border-t px-4 py-3 bg-gray-50">
          <button
            onClick={onComplete}
            disabled={isActioning}
            className="w-full py-2 bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isActioning ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={18} />
                Mark Complete
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function TasksPage() {
  const navigate = useNavigate();
  const { currentProject, setUnacknowledgedTasks, showToast } = useAppStore();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actioningTaskId, setActioningTaskId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('mine');

  // Fetch tasks when project changes
  useEffect(() => {
    if (!currentProject) {
      setTasks([]);
      return;
    }
    
    const abortController = new AbortController();
    
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const params: any = { project_id: currentProject.id, limit: 100 };
        if (filter === 'mine') {
          params.my_tasks = true;
        }
        const response = await tasksApi.list(params);
        
        if (abortController.signal.aborted) return;
        
        const taskList = Array.isArray(response.data) ? response.data : [];
        setTasks(taskList);
        
        // Update unacknowledged count
        const pendingCount = taskList.filter((t: Task) => t.status === 'pending').length;
        setUnacknowledgedTasks(pendingCount);
      } catch (err: any) {
        if (abortController.signal.aborted) return;
        console.error('Failed to fetch tasks:', err);
        showToast('Failed to load tasks', 'error');
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchTasks();
    
    return () => {
      abortController.abort();
    };
  }, [currentProject, filter]);

  const fetchTasks = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      const params: any = { project_id: currentProject.id, limit: 100 };
      if (filter === 'mine') {
        params.my_tasks = true;
      }
      const response = await tasksApi.list(params);
      const taskList = Array.isArray(response.data) ? response.data : [];
      setTasks(taskList);
      
      // Update unacknowledged count
      const pendingCount = taskList.filter((t: Task) => t.status === 'pending').length;
      setUnacknowledgedTasks(pendingCount);
    } catch (err: any) {
      console.error('Failed to fetch tasks:', err);
      showToast('Failed to load tasks', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (taskId: number) => {
    setActioningTaskId(taskId);
    try {
      await tasksApi.acknowledge(taskId);
      // Update local state
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'acknowledged' as const } : t
      ));
      setUnacknowledgedTasks(prev => Math.max(0, prev - 1));
      showToast('Task acknowledged', 'success');
    } catch (err: any) {
      console.error('Failed to acknowledge task:', err);
      showToast(err.response?.data?.detail || 'Failed to acknowledge task', 'error');
    } finally {
      setActioningTaskId(null);
    }
  };

  const handleComplete = async (taskId: number) => {
    setActioningTaskId(taskId);
    try {
      await tasksApi.complete(taskId);
      // Update local state
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'completed' as const } : t
      ));
      showToast('Task completed!', 'success');
    } catch (err: any) {
      console.error('Failed to complete task:', err);
      showToast(err.response?.data?.detail || 'Failed to complete task', 'error');
    } finally {
      setActioningTaskId(null);
    }
  };

  // Group tasks by status
  const needsAcknowledgment = tasks.filter(t => t.status === 'pending');
  const inProgress = tasks.filter(t => t.status === 'acknowledged' || t.status === 'in_progress');
  const completed = tasks.filter(t => t.status === 'completed');

  if (!currentProject) {
    return (
      <div className="p-4 pt-8 text-center">
        <p className="text-gray-500">Select a project to view tasks</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header with filter */}
      <div className="px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Tasks</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchTasks}
            className="p-2 text-gray-400"
            disabled={isLoading}
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('mine')}
              className={`px-3 py-1 text-sm rounded-md ${
                filter === 'mine' ? 'bg-white shadow font-medium' : 'text-gray-600'
              }`}
            >
              My Tasks
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-md ${
                filter === 'all' ? 'bg-white shadow font-medium' : 'text-gray-600'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">Loading tasks...</p>
        </div>
      ) : (
        <div className="px-4 space-y-6">
          {/* Needs Acknowledgment Section */}
          {needsAcknowledgment.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Bell size={18} className="text-amber-500" />
                <h2 className="font-semibold text-gray-900">Needs Acknowledgment</h2>
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                  {needsAcknowledgment.length}
                </span>
              </div>
              <div className="space-y-3">
                {needsAcknowledgment.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                    onAcknowledge={() => handleAcknowledge(task.id)}
                    onComplete={() => handleComplete(task.id)}
                    isActioning={actioningTaskId === task.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* In Progress Section */}
          {inProgress.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-blue-500" />
                <h2 className="font-semibold text-gray-900">In Progress</h2>
              </div>
              <div className="space-y-3">
                {inProgress.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                    onAcknowledge={() => handleAcknowledge(task.id)}
                    onComplete={() => handleComplete(task.id)}
                    isActioning={actioningTaskId === task.id}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Section */}
          {completed.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={18} className="text-green-500" />
                <h2 className="font-semibold text-gray-900">Completed</h2>
              </div>
              <div className="space-y-3">
                {completed.slice(0, 5).map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task}
                    onAcknowledge={() => {}}
                    onComplete={() => {}}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {tasks.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle2 size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="font-semibold text-gray-900">No tasks yet</h3>
              <p className="text-gray-500">Tasks assigned to you will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
