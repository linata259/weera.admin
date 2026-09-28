import React from "react";

export type JobStatus =
    | "active"
    | "suspended"
    | "pending"
    | "assigned"
    | "completed"
    | string;

const DEFAULT_DOT = "#94A3B8";

const STATUS_DOT: Record<string, string> = {
    active: "#16A34A",
    completed: "#16A34A",
    offer_accepted: "#16A34A",
    in_progress: "#2563EB",
    assigned: "#2563EB",
    offer_sent: "#2563EB",
    pending: "#CA8A04",
    pending_review: "#CA8A04",
    waiting_for_bidder_response: "#CA8A04",
    suspended: "#DC2626",
    banned: "#DC2626",
    expired: "#DC2626",
    rejected: "#DC2626",
    declined_work: "#DC2626",
    withdrawn: "#94A3B8",
};

export const JobStatusBadge: React.FC<{ status: JobStatus; label?: string }> = ({ status, label }) => {
    const normalized = (status ?? "").toLowerCase();
    const text =
        label ??
        normalized.split("_").filter(Boolean).map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");

    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "#334155", whiteSpace: "nowrap" }}>
            <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_DOT[normalized] ?? DEFAULT_DOT, flexShrink: 0 }} />
            {text || "—"}
        </span>
    );
};
