import React, { lazy } from "react";
import { usePermissions } from "../rolesPermissions/hooks/usePermissions";
import { LazyBoundary, Spinner } from "../../components/LazyBoundary";

/* All four dashboards used to be imported here, so every admin downloaded the
 * Super Admin, Finance, Marketing and Customer Care views — and the charting
 * library each of them pulls in — to render exactly one. Split per role: you
 * now fetch the dashboard you are actually shown. */
const SuperAdminDashboardPage = lazy(() => import("./SuperAdminDashboard"));
const FinanceDashboardPage = lazy(() => import("./FinanceDashboard"));
const MarketingDashboardPage = lazy(() => import("./MarketingDashboard"));
const CustomerCareDashboardPage = lazy(() => import("./CustomerCareDashboard"));

/**
 * Renders the dashboard that matches the signed-in admin's role.
 * Legacy admins without a role_id get the Super Admin view.
 */
const DashboardRouter: React.FC = () => {
  const { loading, roleName } = usePermissions();

  if (loading) return <Spinner />;

  const Dashboard =
    roleName === "Finance"
      ? FinanceDashboardPage
      : roleName === "Marketing"
        ? MarketingDashboardPage
        : roleName === "Customer Care"
          ? CustomerCareDashboardPage
          : SuperAdminDashboardPage;

  return (
    <LazyBoundary fallback={<Spinner />}>
      <Dashboard />
    </LazyBoundary>
  );
};

export default DashboardRouter;
