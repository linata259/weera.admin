import React from "react";

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  open: { background: "#DBEAFE", color: "#2563EB" },
  pending: { background: "#FEF3C7", color: "#D97706" },
  in_progress: { background: "#EEF2FF", color: "#4F46E5" },
  resolved: { background: "#DCFCE7", color: "#16A34A" },
  closed: { background: "#F1F5F9", color: "#64748B" },
};

const formatLabel = (status: string) =>
  status
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

export const SupportTicketStatusBadge: React.FC<{ status: string }> = ({
  status,
}) => {
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
