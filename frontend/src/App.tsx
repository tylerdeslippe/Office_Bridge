/**
 * Office Bridge - Main App Router
 * Field-to-Office Construction Management
 * 
 * Server authentication with local data storage
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { useAuthStore } from './contexts/localAuthStore';

// Auth
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { TeamSetupPage } from './pages/TeamSetupPage';
import { SuggestionsPage } from './pages/SuggestionsPage';

// Main pages
import { TodayPage } from './pages/TodayPage';
import { TasksPage } from './pages/TasksPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { MorePage } from './pages/MorePage';
import { DailyReportPage } from './pages/DailyReportPage';
import { PhotoCapturePage } from './pages/PhotoCapturePage';
import { ProjectCreatePage } from './pages/ProjectCreatePage';
import { QuickQuotePage } from './pages/QuickQuotePage';
import { PMQueuePage } from './pages/PMQueuePage';
import { PurchaseOrderPage } from './pages/PurchaseOrderPage';
import { LookAheadPage } from './pages/LookAheadPage';
import { PMDashboardPage } from './pages/PMDashboardPage';
import { DeliveriesPage } from './pages/DeliveriesPage';

// Legacy pages
import { ProjectsPage } from './pages/ProjectsPage';
import { PhotosPage } from './pages/PhotosPage';

// Placeholder component for routes not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="p-4 pt-8 text-center">
      <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500">Coming soon</p>
    </div>
  );
}

// Protected route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Protected MainLayout wrapper
function ProtectedMainLayout() {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Login/Register */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />

        {/* Standalone protected routes (no bottom nav) */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />
        <Route path="/team-setup" element={
          <ProtectedRoute>
            <TeamSetupPage />
          </ProtectedRoute>
        } />
        <Route path="/projects/new" element={
          <ProtectedRoute>
            <ProjectCreatePage />
          </ProtectedRoute>
        } />
        <Route path="/daily-report" element={
          <ProtectedRoute>
            <DailyReportPage />
          </ProtectedRoute>
        } />
        <Route path="/capture/photo" element={
          <ProtectedRoute>
            <PhotoCapturePage />
          </ProtectedRoute>
        } />
        <Route path="/quick-quote" element={
          <ProtectedRoute>
            <QuickQuotePage />
          </ProtectedRoute>
        } />
        <Route path="/pm-queue" element={
          <ProtectedRoute>
            <PMQueuePage />
          </ProtectedRoute>
        } />
        <Route path="/pm-dashboard" element={
          <ProtectedRoute>
            <PMDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/purchase-order" element={
          <ProtectedRoute>
            <PurchaseOrderPage />
          </ProtectedRoute>
        } />
        <Route path="/look-ahead" element={
          <ProtectedRoute>
            <LookAheadPage />
          </ProtectedRoute>
        } />
        <Route path="/deliveries" element={
          <ProtectedRoute>
            <DeliveriesPage />
          </ProtectedRoute>
        } />
        <Route path="/suggestions" element={
          <ProtectedRoute>
            <SuggestionsPage />
          </ProtectedRoute>
        } />

        {/* Routes with bottom navigation */}
        <Route element={<ProtectedMainLayout />}>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<PlaceholderPage title="Project Details" />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/photos" element={<PhotosPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/rfi/new" element={<PlaceholderPage title="New RFI" />} />
          <Route path="/punch-list" element={<PlaceholderPage title="Punch List" />} />
          <Route path="/changes" element={<PlaceholderPage title="Change Orders" />} />
          <Route path="/contacts" element={<PlaceholderPage title="Contacts" />} />
          <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
          <Route path="/help" element={<PlaceholderPage title="Help & Support" />} />
          <Route path="/timecard" element={<PlaceholderPage title="Time Card" />} />
        </Route>

        {/* Root redirect */}
        <Route path="/" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        } />
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />
        
        {/* Legacy routes - redirect to login */}
        <Route path="/onboarding" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />

        {/* Catch all */}
        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}
