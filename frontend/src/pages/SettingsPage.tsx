/**
 * Settings Page - App settings, data export/import, profile management
 * Works completely offline - no server needed
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Download,
  Upload,
  Trash2,
  Shield,
  Bell,
  Moon,
  HelpCircle,
  FileText,
  Database,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Share,
  Mail,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../contexts/localAuthStore';
import { localDB, STORES } from '../utils/localDB';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout, exportUserData, importUserData } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Storage stats
  const [storageStats, setStorageStats] = useState<{
    projects: number;
    deliveries: number;
    dailyReports: number;
    contacts: number;
    totalSize: string;
  } | null>(null);

  // Load storage stats
  const loadStorageStats = async () => {
    try {
      const projects = await localDB.getAll(STORES.PROJECTS);
      const deliveries = await localDB.getAll(STORES.DELIVERIES);
      const dailyReports = await localDB.getAll(STORES.DAILY_REPORTS);
      const contacts = await localDB.getAll(STORES.CONTACTS);
      
      const usage = await localDB.getStorageUsage();
      const totalSize = usage.used > 0 
        ? `${(usage.used / 1024 / 1024).toFixed(1)} MB`
        : 'Calculating...';
      
      setStorageStats({
        projects: projects.length,
        deliveries: deliveries.length,
        dailyReports: dailyReports.length,
        contacts: contacts.length,
        totalSize,
      });
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  // Load stats on mount
  useState(() => {
    loadStorageStats();
  });

  // Export data
  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);
    
    try {
      const data = await exportUserData();
      
      // Create and download file
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `office-bridge-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      console.error('Export failed:', error);
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setIsExporting(false);
    }
  };

  // Share data (native share sheet)
  const handleShare = async () => {
    setIsExporting(true);
    
    try {
      const data = await exportUserData();
      
      if (navigator.share) {
        const blob = new Blob([data], { type: 'application/json' });
        const file = new File([blob], `office-bridge-backup.json`, { type: 'application/json' });
        
        await navigator.share({
          title: 'Office Bridge Backup',
          text: 'My Office Bridge data backup',
          files: [file],
        });
      } else {
        // Fallback to download
        handleExport();
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Import data
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setMessage(null);
    
    try {
      const text = await file.text();
      await importUserData(text);
      await loadStorageStats();
      setMessage({ type: 'success', text: 'Data imported successfully!' });
    } catch (error) {
      console.error('Import failed:', error);
      setMessage({ type: 'error', text: 'Failed to import data. Invalid file format.' });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Clear all data
  const handleClearData = async () => {
    try {
      await localDB.clear(STORES.PROJECTS);
      await localDB.clear(STORES.DELIVERIES);
      await localDB.clear(STORES.PURCHASE_ORDERS);
      await localDB.clear(STORES.DAILY_REPORTS);
      await localDB.clear(STORES.CONTACTS);
      await localDB.clear(STORES.TASKS);
      await localDB.clear(STORES.LOOK_AHEAD);
      await localDB.clear(STORES.QUOTES);
      await localDB.clear(STORES.PHOTOS);
      
      setShowClearConfirm(false);
      await loadStorageStats();
      setMessage({ type: 'success', text: 'All data cleared' });
    } catch (error) {
      console.error('Clear failed:', error);
      setMessage({ type: 'error', text: 'Failed to clear data' });
    }
  };

  // Logout and clear profile
  const handleLogout = () => {
    logout();
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-semibold">Settings</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Message Toast */}
      {message && (
        <div className={`mx-4 mt-4 p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Profile Section */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Profile</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={28} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-sm text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ')}
                </div>
                {user?.companyName && (
                  <div className="text-xs text-gray-400">{user.companyName}</div>
                )}
              </div>
              <button 
                onClick={() => navigate('/profile/edit')}
                className="text-blue-600"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </section>

        {/* Team Sync */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Team Sync</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => navigate('/team-setup')}
              className="w-full p-4 flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">iCloud Team Sync</div>
                <div className="text-sm text-gray-500">Share data with your team via iCloud</div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        </section>

        {/* Data & Storage */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">Data & Storage</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y">
            {/* Storage Stats */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Database size={20} className="text-gray-400" />
                <span className="font-medium text-gray-900">Local Storage</span>
              </div>
              {storageStats ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500">Projects</div>
                    <div className="font-semibold">{storageStats.projects}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500">Deliveries</div>
                    <div className="font-semibold">{storageStats.deliveries}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500">Daily Reports</div>
                    <div className="font-semibold">{storageStats.dailyReports}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500">Contacts</div>
                    <div className="font-semibold">{storageStats.contacts}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Loading...</div>
              )}
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50"
            >
              {isExporting ? (
                <Loader2 size={20} className="text-blue-500 animate-spin" />
              ) : (
                <Download size={20} className="text-blue-500" />
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900">Export Data</div>
                <div className="text-sm text-gray-500">Download backup file</div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              disabled={isExporting}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50"
            >
              <Share size={20} className="text-blue-500" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Share Data</div>
                <div className="text-sm text-gray-500">Send to another device or person</div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            {/* Import */}
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50"
            >
              {isImporting ? (
                <Loader2 size={20} className="text-green-500 animate-spin" />
              ) : (
                <Upload size={20} className="text-green-500" />
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900">Import Data</div>
                <div className="text-sm text-gray-500">Restore from backup file</div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>

            {/* Clear Data */}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50"
            >
              <Trash2 size={20} className="text-red-500" />
              <div className="flex-1">
                <div className="font-medium text-red-600">Clear All Data</div>
                <div className="text-sm text-gray-500">Delete all local data</div>
              </div>
            </button>
          </div>
        </section>

        {/* Privacy Notice */}
        <section>
          <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
            <Shield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Your data is private.</strong> All data is stored locally on your device. 
              Nothing is sent to any server. Export your data regularly to avoid data loss.
            </div>
          </div>
        </section>

        {/* App Info */}
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-1">About</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y">
            <div className="p-4 flex items-center gap-3">
              <Info size={20} className="text-gray-400" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Office Bridge</div>
                <div className="text-sm text-gray-500">Version 1.0.0</div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/help')}
              className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50"
            >
              <HelpCircle size={20} className="text-gray-400" />
              <span className="font-medium text-gray-900">Help & Support</span>
              <ChevronRight size={20} className="text-gray-400 ml-auto" />
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-4 text-red-600 font-medium"
        >
          Reset App & Profile
        </button>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-center mb-2">Clear All Data?</h3>
            <p className="text-gray-600 text-center text-sm mb-6">
              This will permanently delete all your projects, deliveries, reports, and contacts. 
              This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
