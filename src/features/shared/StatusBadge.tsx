import React from "react";
import { Status } from "./types";

const STATUS_STYLES: Record<Status, React.CSSProperties> = {
  active:    { background: "#DCFCE7", color: "#16A34A" },
  suspended: { background: "#FEE2E2", color: "#DC2626" },
  pending:   { background: "#FEF9C3", color: "#CA8A04" },
};

export const StatusBadge: React.FC<{ status: Status }> = ({ status }) => (
  <span style={{
    ...STATUS_STYLES[status],
    padding: "3px 12px", borderRadius: 20,
    fontSize: 12, fontWeight: 600, letterSpacing: 0.2, display: "inline-block",
  }}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);