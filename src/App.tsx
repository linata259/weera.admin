import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AdminLayout from './layouts/AdminLayout';
import Users from './features/users/pages/Users';
import UserAnalytics from './features/users/pages/UserAnalytics';
import Jobs from './features/jobs/pages/Jobs';
import JobAnalytics from './features/jobs/pages/JobAnalytics';
import HelpSupport from './features/helpSupport/pages/HelpSupport';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AdminLayout>
              <Navigate to="/dashboard" replace />
            </AdminLayout>
          }
        />

        <Route
          path="/dashboard"
          element={
            <AdminLayout>
              <div>Dashboard Page</div>
            </AdminLayout>
          }
        />

        <Route
          path="/users"
          element={
            <AdminLayout>
              <Users />
            </AdminLayout>
          }
        />

        <Route
          path="/jobs"
          element={
            <AdminLayout>
              <Jobs />
            </AdminLayout>
          }
        />
        <Route
          path="/users/bidders"
          element={
            <AdminLayout>
              <div>Bidders List</div>
            </AdminLayout>
          }
        />
        <Route
          path="/users/analytics"
          element={
            <AdminLayout>
              <UserAnalytics />
            </AdminLayout>
          }
        />
        <Route
          path="/jobs/analytics"
          element={
            <AdminLayout>
              <JobAnalytics />
            </AdminLayout>
          }
        />

        <Route
          path="/help-support"
          element={
            <AdminLayout>
              <HelpSupport />
            </AdminLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
