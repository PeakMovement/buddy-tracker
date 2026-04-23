import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClientLoginPage from './pages/ClientLoginPage';
import ClientRegisterPage from './pages/ClientRegisterPage';
import PractitionerLoginPage from './pages/PractitionerLoginPage';
import ClientLayout from './components/ClientLayout';
import AdminLayout from './components/AdminLayout';
import CheckInPage from './pages/CheckInPage';
import QueryPage from './pages/QueryPage';
import TimelinePage from './pages/TimelinePage';
import ClientProgressPage from './pages/ClientProgressPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminAlertsPage from './pages/AdminAlertsPage';
import AddClientPage from './pages/AddClientPage';
import AdminClientDetailPage from './pages/AdminClientDetailPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import EditClientPage from './pages/EditClientPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app/login" replace />} />

        <Route path="/app/login" element={<ClientLoginPage />} />
        <Route path="/app/register" element={<ClientRegisterPage />} />
        <Route path="/admin/login" element={<PractitionerLoginPage />} />

        <Route path="/app" element={<ClientLayout />}>
          <Route index element={<Navigate to="checkin" replace />} />
          <Route path="checkin" element={<CheckInPage />} />
          <Route path="query" element={<QueryPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="progress" element={<ClientProgressPage />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
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
    </BrowserRouter>
  );
}
