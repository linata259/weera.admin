import React, { useState } from "react";
import type { Job } from "../pages/Jobs";

type TabKey = "description" | "specifications" | "attachments";

const NAVY = "#0F172A";
const SLATE = "#64748B";
const BORDER = "#E2E8F0";

function formatRelativeTime(iso: string | null): string {
    if (!iso) return "";
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

    return date.toLocaleDateString("en-GB");
}

function formatBudget(amount: number | null): string {
    if (amount === null) return "Not provided";
    return `KES ${amount.toLocaleString("en-KE")}`;
}

interface Props {
    job: Job | null;
    onClose: () => void;
}

const slideInKeyframes = `
@keyframes jobDetailsSlideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
@keyframes jobDetailsFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

export const JobDetailsModal: React.FC<Props> = ({ job, onClose }) => {
    const [tab, setTab] = useState<TabKey>("description");

    if (!job) return null;

    const tabs: { key: TabKey; label: string }[] = [
        { key: "description", label: "Description" },
        { key: "specifications", label: "Specifications" },
        { key: "attachments", label: "Attachments" },
    ];

    const locationDisplay = job.locationType && job.location
        ? `${job.locationType} (${job.location})`
        : job.locationType || job.location || "Not provided";

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.4)",
                zIndex: 1000,
                animation: "jobDetailsFadeIn 0.18s ease-out",
            }}
        >
            <style>{slideInKeyframes}</style>

            {/* Side panel */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    height: "100%",
                    width: 456,
                    maxWidth: "100%",
                    background: "#fff",
                    borderRadius: "12px 0 0 12px",
                    boxShadow: "-8px 0 32px rgba(15,23,42,0.18)",
                    fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
                    display: "flex",
                    flexDirection: "column",
                    overflowY: "auto",
                    padding: "16px 8px",
                    animation: "jobDetailsSlideIn 0.22s ease-out",
                    boxSizing: "border-box",
                }}
            >
                <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: SLATE }}>Job Details</h2>
                        <button
                            onClick={onClose}
                            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, display: "flex" }}
                            aria-label="Close"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M5 5l10 10M15 5L5 15" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Title */}
                    <h1 style={{ margin: "16px 0 8px", fontSize: 24, fontWeight: 800, color: NAVY, lineHeight: 1.25 }}>
                        {job.title || "Untitled Job"}
                    </h1>
                    <div style={{ display: "flex", gap: 14, fontSize: 13, color: SLATE, flexWrap: "wrap" }}>
                        <span>Job Id: #{job.jobId}</span>
                        {job.posted_at && <span>{formatRelativeTime(job.posted_at)}</span>}
                    </div>

                    {/* Posted By / Location */}
                    <div style={{ display: "flex", gap: 32, marginTop: 24, flexWrap: "wrap" }}>
                        <div>
                            <div style={{ fontSize: 13, color: SLATE, marginBottom: 4 }}>Posted By:</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
                                {job.posted_by_name || "Unknown"}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 13, color: SLATE, marginBottom: 4 }}>Location:</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>
                                {locationDisplay}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 12, padding: 4, marginTop: 24 }}>
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    flex: 1,
                                    padding: "10px 0",
                                    border: "none",
                                    borderRadius: 9,
                                    cursor: "pointer",
                                    fontSize: 13,
                                    fontFamily: "inherit",
                                    fontWeight: tab === t.key ? 700 : 500,
                                    background: tab === t.key ? "#fff" : "transparent",
                                    color: tab === t.key ? NAVY : SLATE,
                                    boxShadow: tab === t.key ? "0 1px 3px rgba(15,23,42,0.08)" : "none",
                                    transition: "all 0.15s",
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, marginTop: 16, minHeight: 160, flex: 1 }}>
                        {tab === "description" && (
                            job.description ? (
                                <p style={{ margin: 0, fontSize: 15, color: "#1E293B", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                                    {job.description}
                                </p>
                            ) : (
                                <EmptyTabState text="No description provided for this job." />
                            )
                        )}

                        {tab === "specifications" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <SpecRow label="Budget" value={formatBudget(job.budget)} />
                                <SpecRow label="Payment Type" value={job.paymentType || "Not provided"} />
                                <SpecRow label="Timeline" value={job.timeline || "Not provided"} />
                                <SpecRow
                                    label="Skills"
                                    value={job.skills.length > 0 ? job.skills.join(", ") : "Not provided"}
                                />
                            </div>
                        )}

                        {tab === "attachments" && (
                            job.attachments.length > 0 ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {job.attachments.map((a, i) => (
                                        <a
                                            key={i}
                                            href={a.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                padding: "10px 14px",
                                                borderRadius: 10,
                                                border: `1px solid ${BORDER}`,
                                                textDecoration: "none",
                                                color: NAVY,
                                                fontSize: 14,
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M4 1.5h5l3 3v8.5a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1z" stroke={SLATE} strokeWidth="1.3" />
                                                <path d="M9 1.5V4.5h3" stroke={SLATE} strokeWidth="1.3" />
                                            </svg>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {a.name}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <EmptyTabState text="No attachments uploaded for this job." />
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

function SpecRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ fontSize: 13, color: SLATE }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: NAVY, textAlign: "right" }}>{value}</span>
        </div>
    );
}

function EmptyTabState({ text }: { text: string }) {
    return (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#94A3B8", fontSize: 14 }}>
            {text}
        </div>
    );
}