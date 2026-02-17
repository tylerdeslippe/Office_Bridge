/**
 * More Page - Modern Menu Design
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Building2,
  FileText,
  Truck,
  Calendar,
  Camera,
  ClipboardList,
  Settings,
  HelpCircle,
  MessageSquare,
  LogOut,
  ChevronRight,
  Users,
  DollarSign,
  Briefcase,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '../contexts/localAuthStore';

export function MorePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const MenuItem = ({ icon: Icon, label, path, color = 'bg-gray-500' }: { 
    icon: any; 
    label: string; 
    path?: string;
    color?: string;
  }) => (
    <button
      onClick={() => path && navigate(path)}
      className={`w-full ${cardBg} p-4 flex items-center gap-4 text-left`}
    >
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
        <Icon size={20} className="text-white" />
      </div>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight size={18} className={textMuted} />
    </button>
  );

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <header className={`${bg} px-6 pt-14 pb-6`}>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/dashboard')} className={`w-10 h-10 ${cardBg} rounded-full flex items-center justify-center ${border} border`}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">More</h1>
        </div>

        {/* Profile Card */}
        <div className={`${cardBg} rounded-2xl p-4 ${border} border flex items-center gap-4`}>
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center">
            <span className="text-xl font-bold text-white">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1">
            <div className="font-semibold">{user?.firstName} {user?.lastName}</div>
            <div className={`text-sm ${textMuted}`}>{user?.email}</div>
            {user?.companyCode && (
              <div className={`text-xs ${textMuted} mt-1`}>Company: {user.companyCode}</div>
            )}
          </div>
          <button onClick={() => navigate('/settings')} className={textMuted}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="px-6 pb-8 space-y-6">
        {/* Work Section */}
        <section>
          <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3 px-1`}>Work</h3>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden divide-y ${border}`}>
            <MenuItem icon={Building2} label="Projects" path="/projects" color="bg-blue-500" />
            <MenuItem icon={FileText} label="Daily Reports" path="/daily-report" color="bg-green-500" />
            <MenuItem icon={Truck} label="Deliveries" path="/deliveries" color="bg-amber-500" />
            <MenuItem icon={Calendar} label="Look Ahead" path="/look-ahead" color="bg-purple-500" />
            <MenuItem icon={Camera} label="Photos" path="/photos" color="bg-pink-500" />
          </div>
        </section>

        {/* Documents Section */}
        <section>
          <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3 px-1`}>Documents</h3>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden divide-y ${border}`}>
            <MenuItem icon={ClipboardList} label="Purchase Orders" path="/purchase-order" color="bg-indigo-500" />
            <MenuItem icon={DollarSign} label="Quick Quote" path="/quick-quote" color="bg-emerald-500" />
            <MenuItem icon={Briefcase} label="RFIs" path="/rfi/new" color="bg-orange-500" />
          </div>
        </section>

        {/* Team Section */}
        <section>
          <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3 px-1`}>Team</h3>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden divide-y ${border}`}>
            <MenuItem icon={Users} label="Team Sync" path="/team-setup" color="bg-cyan-500" />
            <MenuItem icon={Shield} label="PM Dashboard" path="/pm-dashboard" color="bg-violet-500" />
          </div>
        </section>

        {/* Support Section */}
        <section>
          <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3 px-1`}>Support</h3>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden divide-y ${border}`}>
            <MenuItem icon={Settings} label="Settings" path="/settings" color="bg-gray-500" />
            <MenuItem icon={MessageSquare} label="Send Feedback" path="/suggestions" color="bg-teal-500" />
            <MenuItem icon={HelpCircle} label="Help & Support" path="/help" color="bg-blue-400" />
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`w-full ${cardBg} rounded-2xl p-4 ${border} border flex items-center gap-4 text-red-500`}
        >
          <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
            <LogOut size={20} />
          </div>
          <span className="font-medium">Log Out</span>
        </button>

        {/* Version */}
        <p className={`text-center text-xs ${textMuted} pt-4`}>
          Office Bridge v1.0.0
        </p>
      </div>
    </div>
  );
}
