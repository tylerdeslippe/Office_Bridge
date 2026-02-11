/**
 * Office Bridge - Main App Router
 * Field-to-Office Construction Management
 * 
 * LOCAL-FIRST: All data stored on device, no server required
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { useAuthStore } from './contexts/localAuthStore';

// Onboarding (replaces login/register for local-only mode)
import { OnboardingPage } from './pages/OnboardingPage';
import { SettingsPage } from './pages/SettingsPage';
import { DashboardPage } from './pages/DashboardPage';
import { TeamSetupPage } from './pages/TeamSetupPage';

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

// Protected route wrapper - redirects to onboarding if not set up
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isOnboarded } = useAuthStore();
  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

// Protected MainLayout wrapper
function ProtectedMainLayout() {
  const { isOnboarded } = useAuthStore();
  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return <MainLayout />;
}

export default function App() {
  const { isOnboarded } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding (first-time setup) */}
        <Route path="/onboarding" element={
          isOnboarded ? <Navigate to="/today" replace /> : <OnboardingPage />
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
        <Route path="/quote/new" element={
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
        <Route path="/po/new" element={
          <ProtectedRoute>
            <PurchaseOrderPage />
          </ProtectedRoute>
        } />
        <Route path="/deliveries" element={
          <ProtectedRoute>
            <DeliveriesPage />
          </ProtectedRoute>
        } />
        <Route path="/look-ahead" element={
          <ProtectedRoute>
            <LookAheadPage />
          </ProtectedRoute>
        } />

        {/* Protected routes with MainLayout */}
        <Route element={<ProtectedMainLayout />}>
          {/* Main navigation */}
          <Route path="/today" element={<TodayPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/more" element={<MorePage />} />

          {/* Capture flows */}
          <Route path="/capture/photo" element={<PhotoCapturePage />} />
          <Route path="/capture/change" element={<PlaceholderPage title="Log Issue" />} />
          <Route path="/capture/rfi" element={<PlaceholderPage title="Create RFI" />} />

          {/* Daily Report Wizard */}
          <Route path="/daily-report" element={<DailyReportPage />} />

          {/* Projects */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/photos" element={<PhotosPage />} />

          {/* Logistics */}
          <Route path="/constraints" element={<PlaceholderPage title="Constraints" />} />

          {/* Quality */}
          <Route path="/punch-list" element={<PlaceholderPage title="Punch List" />} />
          <Route path="/checklists" element={<PlaceholderPage title="Checklists" />} />

          {/* Controls */}
          <Route path="/decisions" element={<PlaceholderPage title="Decision Log" />} />
          <Route path="/changes" element={<PlaceholderPage title="Change Tracking" />} />

          {/* Service */}
          <Route path="/service-calls" element={<PlaceholderPage title="Service Calls" />} />

          {/* Profile & Help */}
          <Route path="/profile" element={<PlaceholderPage title="Profile" />} />
          <Route path="/notifications" element={<PlaceholderPage title="Notifications" />} />
          <Route path="/help" element={<PlaceholderPage title="Help & Support" />} />
          <Route path="/timecard" element={<PlaceholderPage title="Time Card" />} />
        </Route>

        {/* Root redirect */}
        <Route path="/" element={
          <Navigate to={isOnboarded ? "/today" : "/onboarding"} replace />
        } />
        <Route path="/home" element={<Navigate to="/today" replace />} />
        
        {/* Legacy routes - redirect to onboarding */}
        <Route path="/login" element={<Navigate to="/onboarding" replace />} />
        <Route path="/register" element={<Navigate to="/onboarding" replace />} />

        {/* Catch all */}
        <Route path="*" element={
          <Navigate to={isOnboarded ? "/today" : "/onboarding"} replace />
        } />
      </Routes>
    </BrowserRouter>
  );
}
