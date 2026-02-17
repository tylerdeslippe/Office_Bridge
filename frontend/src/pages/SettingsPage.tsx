/**
 * Settings Page - Modern Clean Design
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Bell,
  Moon,
  Sun,
  Shield,
  Download,
  Upload,
  Trash2,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  Lock,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../contexts/localAuthStore';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateProfile, exportUserData, logout } = useAuthStore();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editData, setEditData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });

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
  const inputBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';

  const handleExport = async () => {
    try {
      const data = await exportUserData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `office-bridge-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } catch (e) {
      alert('Export failed');
    }
  };

  const handleSaveProfile = async () => {
    await updateProfile(editData);
    setShowEditProfile(false);
  };

  const SettingItem = ({ 
    icon: Icon, 
    label, 
    value, 
    onClick,
    danger = false 
  }: { 
    icon: any; 
    label: string; 
    value?: string;
    onClick?: () => void;
    danger?: boolean;
  }) => (
    <button
      onClick={onClick}
      className={`w-full p-4 flex items-center gap-4 text-left ${danger ? 'text-red-500' : ''}`}
    >
      <div className={`w-10 h-10 ${danger ? 'bg-red-500/10' : isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
        <Icon size={20} className={danger ? 'text-red-500' : textMuted} />
      </div>
      <div className="flex-1">
        <div className={`font-medium ${danger ? 'text-red-500' : ''}`}>{label}</div>
        {value && <div className={`text-sm ${textMuted}`}>{value}</div>}
      </div>
      {onClick && <ChevronRight size={18} className={textMuted} />}
    </button>
  );

  return (
    <div className={`min-h-screen ${bg} ${text}`}>
      {/* Header */}
      <header className={`${bg} px-6 pt-14 pb-6`}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className={`w-10 h-10 ${cardBg} rounded-full flex items-center justify-center ${border} border`}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="px-6 pb-8 space-y-6">
        {/* Profile Section */}
        <section>
          <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3 px-1`}>Profile</h3>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden`}>
            <div className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">{user?.firstName} {user?.lastName}</div>
                <div className={`text-sm ${textMuted}`}>{user?.email}</div>
              </div>
              <button 
                onClick={() => setShowEditProfile(true)}
                className="text-blue-500 text-sm font-medium"
              >
                Edit
              </button>
            </div>
          </div>
        </section>

        {/* Account Section */}
        <section>
          <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3 px-1`}>Account</h3>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden divide-y ${border}`}>
            <SettingItem icon={Mail} label="Email" value={user?.email} />
            <SettingItem icon={Building2} label="Company Code" value={user?.companyCode || 'Not set'} />
            <SettingItem icon={Lock} label="Change Password" onClick={() => {}} />
          </div>
        </section>

        {/* Preferences Section */}
        <section>
          <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3 px-1`}>Preferences</h3>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden divide-y ${border}`}>
            <div className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                {isDark ? <Moon size={20} className={textMuted} /> : <Sun size={20} className={textMuted} />}
              </div>
              <div className="flex-1">
                <div className="font-medium">Dark Mode</div>
                <div className={`text-sm ${textMuted}`}>Uses system setting</div>
              </div>
              <div className={`w-12 h-7 rounded-full ${isDark ? 'bg-blue-500' : 'bg-gray-300'} relative`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${isDark ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
            <SettingItem icon={Bell} label="Notifications" value="Enabled" onClick={() => {}} />
          </div>
        </section>

        {/* Data Section */}
        <section>
          <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3 px-1`}>Data</h3>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden divide-y ${border}`}>
            <SettingItem icon={Download} label="Export Data" value="Download backup" onClick={handleExport} />
            <SettingItem icon={Upload} label="Import Data" value="Restore from backup" onClick={() => {}} />
          </div>
        </section>

        {/* About Section */}
        <section>
          <h3 className={`text-xs font-semibold ${textMuted} uppercase tracking-wide mb-3 px-1`}>About</h3>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden divide-y ${border}`}>
            <SettingItem icon={Info} label="Version" value="1.0.0" />
            <SettingItem icon={Shield} label="Privacy Policy" onClick={() => {}} />
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <div className={`${cardBg} rounded-2xl ${border} border overflow-hidden`}>
            <SettingItem 
              icon={Trash2} 
              label="Delete Account" 
              danger 
              onClick={() => {
                if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                  logout();
                  navigate('/login');
                }
              }} 
            />
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className={`${cardBg} ${text} w-full rounded-t-3xl p-6 pb-10 animate-slide-up`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit Profile</h2>
              <button onClick={() => setShowEditProfile(false)} className={textMuted}>Cancel</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs ${textMuted} mb-1 block`}>First Name</label>
                  <input
                    type="text"
                    value={editData.firstName}
                    onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    className={`w-full px-4 py-3 ${inputBg} ${text} border rounded-xl outline-none`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${textMuted} mb-1 block`}>Last Name</label>
                  <input
                    type="text"
                    value={editData.lastName}
                    onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    className={`w-full px-4 py-3 ${inputBg} ${text} border rounded-xl outline-none`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs ${textMuted} mb-1 block`}>Phone</label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="(555) 555-5555"
                  className={`w-full px-4 py-3 ${inputBg} ${text} border rounded-xl outline-none`}
                />
              </div>

              <button
                onClick={handleSaveProfile}
                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold mt-2"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
