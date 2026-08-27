import { lazy, Suspense, useEffect } from "react";
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
import { PermissionsProvider } from "./features/rolesPermissions/PermissionsContext";

// Each page is its own chunk — only downloaded when the user first visits that route
const DashboardPage = lazy(
  () => import("./features/dashboard/DashboardRouter"),
);
// Settings was the one page still imported eagerly, so its cost was paid on
// every page load by everyone, including the admins who never open it.
const SettingsPage = lazy(() => import("./features/settings/Settingspage"));
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
const LocationsPage = lazy(() => import("./features/locations/pages/LocationsPage"));
const HelpSupportPage = lazy(
  () => import("./features/helpSupport/pages/HelpSupport"),
);
const NotificationsPage = lazy(
  () => import("./features/notifications/pages/NotificationsPage"),
);
const ChatsPage = lazy(() => import("./features/chats/pages/ChatsPage"));
const AdminUsersPage = lazy(
  () => import("./features/rolesPermissions/pages/AdminUsersPage"),
);
const ManageRolesPage = lazy(
  () => import("./features/rolesPermissions/pages/ManageRolesPage"),
);
const RoleFormPage = lazy(
  () => import("./features/rolesPermissions/pages/RoleFormPage"),
);
const CreateAdminUserPage = lazy(
  () => import("./features/rolesPermissions/pages/CreateAdminUserPage"),
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

/* Splitting a route makes the first paint cheap and every later navigation a
 * download. Once the browser is idle and the page the admin asked for is on
 * screen, quietly pull the handful of routes they are most likely to open
 * next, so clicking them costs nothing. Idle only — never on the critical
 * path, and skipped entirely on a metered or 2G connection. */
const PREFETCH: (() => Promise<unknown>)[] = [
  () => import("./features/users/pages/Users"),
  () => import("./features/jobs/pages/Jobs"),
  () => import("./features/financials/pages/FinancialsPage"),
  () => import("./features/notifications/pages/NotificationsPage"),
];

function useIdlePrefetch() {
  useEffect(() => {
    const conn = (navigator as any).connection;
    if (conn?.saveData) return;
    if (conn?.effectiveType && /2g/.test(conn.effectiveType)) return;

    const idle: (cb: () => void) => number =
      (window as any).requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 2000));

    const handle = idle(() => {
      PREFETCH.forEach((load) => {
        load().catch(() => {
          /* a prefetch that fails is a no-op; the route loads normally later */
        });
      });
    });

    return () => {
      const cancel = (window as any).cancelIdleCallback;
      if (cancel) cancel(handle);
      else clearTimeout(handle);
    };
  }, []);
}

// AdminLayout mounts ONCE here and persists across all child routes.
// Previously it was wrapped around every individual <Route>, causing a full
// remount (sidebar, navbar, effects, state) on every navigation.
function LayoutRoute() {
  useIdlePrefetch();
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
        <PermissionsProvider>
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
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/help-support" element={<HelpSupportPage />} />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/roles" element={<AdminUsersPage />} />
            <Route path="/roles/manage" element={<ManageRolesPage />} />
            <Route path="/roles/add" element={<RoleFormPage />} />
            <Route path="/roles/:roleId/edit" element={<RoleFormPage />} />
            <Route path="/roles/create-user" element={<CreateAdminUserPage />} />
          </Route>
        </Routes>
        </PermissionsProvider>
      </AuthGuard>
    </BrowserRouter>
  );
}