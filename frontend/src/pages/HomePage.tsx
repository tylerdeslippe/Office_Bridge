import { Link } from 'react-router-dom';
import {
  FileText,
  Camera,
  AlertTriangle,
  FileQuestion,
  Truck,
  CheckSquare,
  Calendar,
  ClipboardList,
  Phone,
  BookOpen,
  FolderKanban,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../contexts/authStore';
import { useAppStore } from '../contexts/appStore';

const quickActions = [
  {
    icon: FileText,
    label: 'Daily Report',
    path: '/daily-report',
    color: 'bg-blue-500',
    description: 'Submit field report',
  },
  {
    icon: Camera,
    label: 'Take Photo',
    path: '/photos/capture',
    color: 'bg-green-500',
    description: 'Document progress',
  },
  {
    icon: AlertTriangle,
    label: 'Potential Change',
    path: '/changes/new',
    color: 'bg-amber-500',
    description: 'Log extra work',
  },
  {
    icon: FileQuestion,
    label: 'New RFI',
    path: '/rfis/new',
    color: 'bg-purple-500',
    description: 'Ask a question',
  },
];

const modules = [
  { icon: FolderKanban, label: 'Projects', path: '/projects', count: null },
  { icon: ClipboardList, label: 'My Tasks', path: '/tasks', count: 5 },
  { icon: FileText, label: 'Daily Reports', path: '/daily-reports', count: null },
  { icon: Camera, label: 'Photos', path: '/photos', count: null },
  { icon: FileQuestion, label: 'RFIs', path: '/rfis', count: 3 },
  { icon: AlertTriangle, label: 'Changes', path: '/changes', count: 2 },
  { icon: CheckSquare, label: 'Punch List', path: '/punch', count: 8 },
  { icon: Truck, label: 'Deliveries', path: '/deliveries', count: null },
  { icon: Calendar, label: 'Constraints', path: '/constraints', count: 4 },
  { icon: BookOpen, label: 'Decisions', path: '/decisions', count: null },
  { icon: Phone, label: 'Service Calls', path: '/service', count: 1 },
];

export function HomePage() {
  const { user } = useAuthStore();
  const { currentProject } = useAppStore();
  
  const greeting = getGreeting();
  
  return (
    <div className="px-4 py-6 space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div>
        <p className="text-gray-500 text-sm">{greeting}</p>
        <h2 className="text-2xl font-bold text-gray-900">
          {user?.first_name || 'Welcome'}
        </h2>
      </div>
      
      {/* Current Project Banner */}
      {currentProject ? (
        <Link
          to={`/projects/${currentProject.id}`}
          className="card flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current Project</p>
            <p className="font-semibold text-gray-900">{currentProject.name}</p>
            <p className="text-sm text-gray-500">{currentProject.number}</p>
          </div>
          <ChevronRight className="text-gray-400" />
        </Link>
      ) : (
        <Link
          to="/projects"
          className="card bg-gradient-to-r from-blueprint to-blue-700 text-white"
        >
          <p className="font-medium">Select a Project</p>
          <p className="text-sm text-blue-100">Choose a project to get started</p>
        </Link>
      )}
      
      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              className="card flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center`}>
                <action.icon size={20} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* All Modules */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          All Modules
        </h3>
        <div className="card p-0 divide-y divide-gray-100">
          {modules.map((module) => (
            <Link
              key={module.path}
              to={module.path}
              className="flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <module.icon size={20} className="text-gray-400" />
                <span className="font-medium text-gray-900">{module.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {module.count !== null && module.count > 0 && (
                  <span className="badge-pending">{module.count}</span>
                )}
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
