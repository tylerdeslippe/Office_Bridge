/**
 * Bottom Navigation with Capture Button
 * Opens stable bottom sheet (not floating radial menu)
 * Consistent naming throughout
 */
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  CheckSquare, 
  Plus, 
  FolderOpen, 
  Menu,
  Camera,
  FileText,
  AlertTriangle,
  FileQuestion,
  X
} from 'lucide-react';
import { useAppStore } from '../../contexts/appStore';

interface CaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

function CaptureSheet({ isOpen, onClose }: CaptureSheetProps) {
  const navigate = useNavigate();
  const { currentProject, showToast } = useAppStore();

  const handleAction = (path: string) => {
    if (!currentProject) {
      showToast('Please select a project first', 'error');
      onClose();
      return;
    }
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  const actions = [
    {
      icon: Camera,
      label: 'Take Photo',
      description: 'Progress, in-wall, equipment, deliveries',
      path: '/capture/photo',
      color: 'bg-blue-500',
    },
    {
      icon: FileText,
      label: 'Daily Report',
      description: 'Crew count, work completed, delays',
      path: '/daily-report',
      color: 'bg-green-500',
    },
    {
      icon: AlertTriangle,
      label: 'Potential Change',
      description: 'Extra work, unforeseen conditions',
      path: '/capture/change',
      color: 'bg-amber-500',
    },
    {
      icon: FileQuestion,
      label: 'RFI',
      description: 'Request for information',
      path: '/capture/rfi',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Bottom Sheet */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="p-3 flex justify-center">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quick Capture</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-400">
            <X size={24} />
          </button>
        </div>

        {/* Actions */}
        <div className="px-4 pb-6 space-y-2">
          {actions.map(action => (
            <button
              key={action.path}
              onClick={() => handleAction(action.path)}
              className="w-full p-4 flex items-center gap-4 bg-gray-50 rounded-xl active:bg-gray-100"
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center`}>
                <action.icon size={24} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-gray-900">{action.label}</div>
                <div className="text-sm text-gray-500">{action.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Safe area padding */}
        <div className="h-safe" />
      </div>
    </div>
  );
}

export function BottomNav() {
  const [captureOpen, setCaptureOpen] = useState(false);
  const { unacknowledgedTasks } = useAppStore();

  const navItems = [
    { to: '/today', icon: Calendar, label: 'Today' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks', badge: unacknowledgedTasks },
  ];

  const rightNavItems = [
    { to: '/documents', icon: FolderOpen, label: 'Docs' },
    { to: '/more', icon: Menu, label: 'More' },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around h-16 safe-bottom">
          {/* Left nav items */}
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full relative ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`
              }
            >
              <item.icon size={24} />
              <span className="text-xs mt-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute top-2 left-1/2 ml-2 bg-red-500 text-white text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Center Capture Button */}
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => setCaptureOpen(true)}
              className="w-14 h-14 -mt-4 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          </div>

          {/* Right nav items */}
          {rightNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`
              }
            >
              <item.icon size={24} />
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <CaptureSheet isOpen={captureOpen} onClose={() => setCaptureOpen(false)} />
    </>
  );
}
