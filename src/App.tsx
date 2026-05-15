import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AdminLayout from './layouts/AdminLayout';
import Users from './features/users/pages/Users';
import Bidders from './features/users/pages/Bidders';
import UserAnalytics from './features/users/pages/UserAnalytics';

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
              <div>Job Management</div>
            </AdminLayout>
          }
        />
        <Route
          path="/users/bidders"
          element={
            <AdminLayout>
              <Bidders />
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
      </Routes>
    </BrowserRouter>
  );
}