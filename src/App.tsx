import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import AdminLayout from "./layouts/AdminLayout";
import { LoginPage } from "./features/auth/components/LoginPage";
import { AuthGuard } from "./features/auth/components/AuthGuard";
import SettingsPage from "./features/settings/Settingspage";

// Each page is its own chunk — only downloaded when the user first visits that route
const DashboardPage = lazy(() =>
  import("./features/dashboard/Dashboard").then((m) => ({
    default: m.DashboardPage,
  })),
);
const Users = lazy(() => import("./features/users/pages/Users"));
const UserAnalytics = lazy(
  () => import("./features/users/pages/UserAnalytics"),
);
const Jobs = lazy(() => import("./features/jobs/pages/Jobs"));
const JobAnalytics = lazy(() => import("./features/jobs/pages/JobAnalytics"));
const JobReports = lazy(() => import("./features/jobs/pages/JobReports"));
const FinancialsPage = lazy(
  () => import("./features/financials/pages/FinancialsPage"),
);
const SkillsPage = lazy(() => import("./features/skills/pages/SkillsPage"));
const HelpSupportPage = lazy(
  () => import("./features/helpSupport/pages/HelpSupport"),
);
const NotificationsPage = lazy(
  () => import("./features/notifications/pages/NotificationsPage"),
);

function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "60vh",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "3px solid #E2E8F0",
          borderTopColor: "#EA580C",
          animation: "weera-spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes weera-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// AdminLayout mounts ONCE here and persists across all child routes.
// Previously it was wrapped around every individual <Route>, causing a full
// remount (sidebar, navbar, effects, state) on every navigation.
function LayoutRoute() {
  return (
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={() => {}} />} />

          <Route element={<LayoutRoute />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/users" element={<Users />} />
            <Route path="/users/analytics" element={<UserAnalytics />} />
            <Route path="/users/bidders" element={<div>Bidders List</div>} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/analytics" element={<JobAnalytics />} />
            <Route path="/jobs/reports" element={<JobReports />} />
            <Route path="/financials" element={<FinancialsPage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/help-support" element={<HelpSupportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Routes>
      </AuthGuard>
    </BrowserRouter>
  );
}