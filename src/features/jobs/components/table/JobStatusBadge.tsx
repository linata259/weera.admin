import React from "react";

export type JobStatus =
    | "active"
    | "suspended"
    | "pending"
    | "assigned"
    | "completed"
    | string;

// Fallback for unknown statuses
const DEFAULT_STYLE: React.CSSProperties = { background: "#F1F5F9", color: "#64748B" };

const STATUS_STYLES: Record<string, React.CSSProperties> = {
    active: { background: "#DCFCE7", color: "#16A34A" }, // Green
    suspended: { background: "#FEE2E2", color: "#DC2626" }, // Red
    pending: { background: "#FEF9C3", color: "#CA8A04" }, // Yellow/Orange
    assigned: { background: "#FEF9C3", color: "#CA8A04" }, // Yellow/Orange
    completed: { background: "#DBEAFE", color: "#2563EB" }, // Blue
};

export const JobStatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
    const normalizedStatus = status.toLowerCase();
    const style = STATUS_STYLES[normalizedStatus] || DEFAULT_STYLE;

    // Format label: "pending_review" -> "Pending Review"
    const label = normalizedStatus
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    return (
        <span style={{
            ...style,
            padding: "3px 12px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.2,
            display: "inline-block",
        }}>
            {label}
        </span>
    );
};
