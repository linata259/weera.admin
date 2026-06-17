import React from "react";

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  completed: { background: "#DCFCE7", color: "#16A34A" },
  active: { background: "#DCFCE7", color: "#16A34A" },
  cancelled: { background: "#FEE2E2", color: "#DC2626" },
  canceled: { background: "#FEE2E2", color: "#DC2626" },
  pending: { background: "#FEF3C7", color: "#D97706" },
  in_transit: { background: "#FEF3C7", color: "#D97706" },
};

const formatLabel = (status: string) =>
  status
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

export const ReportStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toLowerCase();
  const style = STATUS_STYLES[normalized] ?? {
    background: "#F1F5F9",
    color: "#64748B",
  };

  return (
    <span
      style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {formatLabel(status)}
    </span>
  );
};
