import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import Users from "./features/users/pages/Users";
import UserAnalytics from "./features/users/pages/UserAnalytics";
import Jobs from "./features/jobs/pages/Jobs";
import JobAnalytics from "./features/jobs/pages/JobAnalytics";
import { LoginPage } from "./features/auth/components/LoginPage";
import { AuthGuard } from "./features/auth/components/AuthGuard";
import FinancialsPage from "./features/financials/pages/FinancialsPage";
import SkillsPage from "./features/skills/pages/SkillsPage";
import JobReports from "./features/jobs/pages/JobReports";

export default function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={() => {}} />} />
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
            path="/jobs/reports"
            element={
              <AdminLayout>
                <JobReports />
              </AdminLayout>
            }
          />
          <Route
            path="/financials"
            element={
              <AdminLayout>
                <FinancialsPage />
              </AdminLayout>
            }
          />
          <Route
            path="/skills"
            element={
              <AdminLayout>
                <SkillsPage />
              </AdminLayout>
            }
          />
        </Routes>
      </AuthGuard>
    </BrowserRouter>
  );
}
