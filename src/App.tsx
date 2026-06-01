import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClientLayout from './components/ClientLayout';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

const ClientLoginPage = lazy(() => import('./pages/ClientLoginPage'));
const ClientRegisterPage = lazy(() => import('./pages/ClientRegisterPage'));
const PractitionerLoginPage = lazy(() => import('./pages/PractitionerLoginPage'));
const CheckInPage = lazy(() => import('./pages/CheckInPage'));
const QueryPage = lazy(() => import('./pages/QueryPage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const ClientProgressPage = lazy(() => import('./pages/ClientProgressPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminAlertsPage = lazy(() => import('./pages/AdminAlertsPage'));
const AddClientPage = lazy(() => import('./pages/AddClientPage'));
const AdminClientDetailPage = lazy(() => import('./pages/AdminClientDetailPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const EditClientPage = lazy(() => import('./pages/EditClientPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="page-loading">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/app/login" replace />} />

          <Route path="/app/login" element={<ClientLoginPage />} />
          <Route path="/app/register" element={<ClientRegisterPage />} />
          <Route path="/admin/login" element={<PractitionerLoginPage />} />

          <Route path="/app" element={<ErrorBoundary><ClientLayout /></ErrorBoundary>}>
            <Route index element={<Navigate to="checkin" replace />} />
            <Route path="checkin" element={<CheckInPage />} />
            <Route path="query" element={<QueryPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="progress" element={<ClientProgressPage />} />
          </Route>

          <Route path="/admin" element={<ErrorBoundary><AdminLayout /></ErrorBoundary>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="alerts" element={<AdminAlertsPage />} />
            <Route path="add-client" element={<AddClientPage />} />
            <Route path="client/:clientId" element={<AdminClientDetailPage />} />
            <Route path="client/:clientId/edit" element={<EditClientPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
