/**
 * Tasks Page - Modern Clean Design
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  Circle,
  Clock,
  Flag,
  ChevronRight,
  Search,
  Filter,
  Trash2,
} from 'lucide-react';
import { tasksService, Task } from '../services/tasksService';

export function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', dueDate: '' });

  // Dark mode
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const bg = isDark ? 'bg-black' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    const data = await tasksService.getAll();
    setTasks(data);
    setIsLoading(false);
  };

  const toggleComplete = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await tasksService.update(task.id, { status: newStatus });
    loadTasks();
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    await tasksService.create({
      projectId: 'general',
      title: newTask.title,
      priority: newTask.priority as any,
      dueDate: newTask.dueDate || undefined,
      status: 'pending',
    });
    setNewTask({ title: '', priority: 'medium', dueDate: '' });
    setShowAdd(false);
    loadTasks();
  };

  const deleteTask = async (id: string) => {
    await tasksService.delete(id);
    loadTasks();
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const today = new Date().toISOString().split('T')[0];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <header className={`${bg} px-6 pt-14 pb-4 sticky top-0 z-10`}>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className={`w-10 h-10 ${cardBg} rounded-full flex items-center justify-center ${border} border`}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold flex-1">Tasks</h1>
          <button 
            onClick={() => setShowAdd(true)}
            className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
                filter === f 
                  ? 'bg-blue-500 text-white' 
                  : `${cardBg} ${textMuted} ${border} border`
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {/* Tasks List */}
      <div className="px-6 pb-8 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className={`${cardBg} rounded-2xl p-8 ${border} border text-center mt-8`}>
            <CheckCircle size={48} className={`${textMuted} mx-auto mb-4`} />
            <p className="font-medium mb-1">No tasks</p>
            <p className={`text-sm ${textMuted}`}>
              {filter === 'completed' ? 'No completed tasks yet' : 'Add a task to get started'}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div 
              key={task.id} 
              className={`${cardBg} rounded-2xl p-4 ${border} border flex items-center gap-4`}
            >
              <button 
                onClick={() => toggleComplete(task)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  task.status === 'completed' 
                    ? 'bg-green-500 border-green-500' 
                    : `${border}`
                }`}
              >
                {task.status === 'completed' && <CheckCircle size={14} className="text-white" />}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                  {task.title}
                </div>
                <div className={`flex items-center gap-3 mt-1 text-xs ${textMuted}`}>
                  {task.dueDate && (
                    <span className={`flex items-center gap-1 ${task.dueDate < today && task.status !== 'completed' ? 'text-red-500' : ''}`}>
                      <Clock size={12} />
                      {task.dueDate === today ? 'Today' : new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                    <Flag size={10} />
                    {task.priority}
                  </span>
                </div>
              </div>

              <button onClick={() => deleteTask(task.id)} className={textMuted}>
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className={`${cardBg} w-full rounded-t-3xl p-6 pb-10 animate-slide-up`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">New Task</h2>
              <button onClick={() => setShowAdd(false)} className={textMuted}>Cancel</button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Task title"
                className={`w-full px-4 py-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} ${text} border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500`}
                autoFocus
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${textMuted} mb-1 block`}>Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} ${text} border rounded-xl outline-none`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className={`text-xs ${textMuted} mb-1 block`}>Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} ${text} border rounded-xl outline-none`}
                  />
                </div>
              </div>

              <button
                onClick={addTask}
                disabled={!newTask.title.trim()}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold disabled:opacity-50"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
