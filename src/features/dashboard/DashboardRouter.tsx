import React from "react";
import { usePermissions } from "../rolesPermissions/hooks/usePermissions";
import SuperAdminDashboardPage from "./SuperAdminDashboard";
import FinanceDashboardPage from "./FinanceDashboard";

/**
 * Renders the dashboard that matches the signed-in admin's role.
 * Legacy admins without a role_id get the Super Admin view.
 */
const DashboardRouter: React.FC = () => {
  const { loading, roleName } = usePermissions();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid #E2E8F0", borderTopColor: "#EA580C",
          animation: "weera-dr-spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes weera-dr-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (roleName === "Finance") return <FinanceDashboardPage />;
  return <SuperAdminDashboardPage />;
};

export default DashboardRouter;
