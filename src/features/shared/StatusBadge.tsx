import React from "react";
import { UserStatus } from "../users/types";

const STATUS_STYLES: Record<UserStatus, React.CSSProperties> = {
  active:    { background: "#DCFCE7", color: "#16A34A" },
  suspended: { background: "#FEE2E2", color: "#DC2626" },
  pending:   { background: "#FEF9C3", color: "#CA8A04" },
  dormant:   { background: "#F1F5F9", color: "#64748B" },
};

export const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => (
  <span style={{
    ...STATUS_STYLES[status],
    padding: "3px 12px", borderRadius: 20,
    fontSize: 12, fontWeight: 600, letterSpacing: 0.2, display: "inline-block",
  }}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);