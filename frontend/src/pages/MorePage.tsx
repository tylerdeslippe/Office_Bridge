/**
 * More Page - Organized by category
 * Logistics | Quality | Controls | Service | Settings
 */
import { Link, useNavigate } from 'react-router-dom';
import {
  Truck,
  Clock,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  BookOpen,
  GitBranch,
  Phone,
  Settings,
  User,
  LogOut,
  ChevronRight,
  HelpCircle,
  Search,
  Bell,
  DollarSign,
  Inbox,
  FileText,
  LayoutDashboard,
  ShoppingCart,
  LayoutGrid,
} from 'lucide-react';
import { useAuthStore } from '../contexts/localAuthStore';
import { useAppStore } from '../contexts/appStore';

interface MenuItem {
  icon: any;
  label: string;
  to: string;
  badge?: number;
  description?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutGrid, label: 'Dashboard', to: '/dashboard', description: 'All projects & tasks overview' },
    ],
  },
  {
    title: 'Quick Actions',
    items: [
      { icon: DollarSign, label: 'Request Quote', to: '/quote/new', description: 'Send to PM for pricing' },
      { icon: ShoppingCart, label: 'Create PO', to: '/po/new', description: 'New purchase order' },
      { icon: FileText, label: 'New Project', to: '/projects/new', description: 'Quick or full setup' },
    ],
  },
  {
    title: 'PM Tools',
    items: [
      { icon: LayoutDashboard, label: 'PM Dashboard', to: '/pm-dashboard', description: 'All field submissions' },
      { icon: Inbox, label: 'Quote Queue', to: '/pm-queue', description: 'Quote requests only' },
    ],
  },
  {
    title: 'Logistics',
    items: [
      { icon: Truck, label: 'Deliveries', to: '/deliveries' },
      { icon: Clock, label: 'Constraints', to: '/constraints' },
      { icon: Calendar, label: 'Look-Ahead', to: '/look-ahead' },
    ],
  },
  {
    title: 'Quality',
    items: [
      { icon: CheckSquare, label: 'Punch List', to: '/punch-list' },
      { icon: ClipboardCheck, label: 'Checklists', to: '/checklists' },
    ],
  },
  {
    title: 'Controls',
    items: [
      { icon: BookOpen, label: 'Decision Log', to: '/decisions' },
      { icon: GitBranch, label: 'Change Tracking', to: '/changes' },
    ],
  },
  {
    title: 'Service',
    items: [
      { icon: Phone, label: 'Service Calls', to: '/service-calls' },
    ],
  },
];

export function MorePage() {
  const navigate = useNavigate();
  const { user, logout, isPM } = useAuthStore();
  const { showToast } = useAppStore();

  const handleLogout = () => {
    logout();
    navigate('/onboarding');
  };

  // Filter menu sections based on user role
  const visibleSections = menuSections.filter(section => {
    // Hide PM Tools section from non-PM users
    if (section.title === 'PM Tools' && !isPM()) {
      return false;
    }
    return true;
  });

  return (
    <div className="pb-20">
      {/* User Profile Card */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={28} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-sm text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</div>
              {user?.companyName && (
                <div className="text-xs text-gray-400">{user.companyName}</div>
              )}
            </div>
            <Link to="/settings" className="p-2 text-gray-400">
              <ChevronRight size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* Search (optional) */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search features..."
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-4 space-y-6">
        {visibleSections.map(section => (
          <section key={section.title}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">
              {section.title}
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y">
              {section.items.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 p-4 active:bg-gray-50"
                >
                  <item.icon size={22} className="text-gray-500" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    {item.description && (
                      <p className="text-xs text-gray-500">{item.description}</p>
                    )}
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight size={18} className="text-gray-400" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Settings Section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">
            Settings
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y">
            <Link
              to="/notifications"
              className="flex items-center gap-3 p-4 active:bg-gray-50"
            >
              <Bell size={22} className="text-gray-500" />
              <span className="flex-1 font-medium text-gray-700">Notifications</span>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
            <Link
              to="/settings"
              className="flex items-center gap-3 p-4 active:bg-gray-50"
            >
              <Settings size={22} className="text-gray-500" />
              <span className="flex-1 font-medium text-gray-700">App Settings</span>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
            <Link
              to="/help"
              className="flex items-center gap-3 p-4 active:bg-gray-50"
            >
              <HelpCircle size={22} className="text-gray-500" />
              <span className="flex-1 font-medium text-gray-700">Help & Support</span>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 active:bg-gray-50"
        >
          <LogOut size={22} className="text-red-500" />
          <span className="font-medium text-red-500">Log Out</span>
        </button>

        {/* Version info */}
        <div className="text-center text-xs text-gray-400 py-4">
          Office Bridge v1.0.0
        </div>
      </div>
    </div>
  );
}
