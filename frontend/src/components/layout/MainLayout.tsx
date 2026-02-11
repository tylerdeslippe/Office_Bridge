/**
 * Main Layout - Protected route wrapper with sticky project header
 */
import { Outlet, Navigate } from 'react-router-dom';
import { ProjectHeader } from './ProjectHeader';
import { BottomNav } from './BottomNav';
import { useAuthStore } from '../../contexts/authStore';
import { useAppStore } from '../../contexts/appStore';

export function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const { toast, hideToast, isOffline } = useAppStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Project Header */}
      <ProjectHeader />

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm">
          You're offline. Changes will sync when connected.
        </div>
      )}

      {/* Main Content */}
      <main className="pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-24 left-4 right-4 p-4 rounded-xl shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            'bg-gray-800 text-white'
          }`}
          onClick={hideToast}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
