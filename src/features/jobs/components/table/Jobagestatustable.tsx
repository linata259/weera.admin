import React, { useEffect, useMemo, useState } from "react";
import { Job } from "../../pages/Jobs";
import { Avatar } from "../../../shared/Avatar";
import { JobStatusBadge } from "./JobStatusBadge";
import { IconBtn } from "../../../shared/IconBtn";
import { PageBtn } from "../../../shared/PageBtn";
import {
    ageInDays,
    daysUntilExpiry,
    effectiveStatus,
    getRepostedAt,
} from "../../utils/jobLifecycle";

// Jobs expire 7 days after (re)posting, so buckets follow that lifecycle.
type AgeBucketKey = "fresh" | "mid" | "expiring" | "pastWeek" | "older";

const AGE_BUCKETS: { key: AgeBucketKey; label: string }[] = [
    { key: "fresh", label: "New (\u2264 2 Days)" },
    { key: "mid", label: "3\u20135 Days" },
    { key: "expiring", label: "6\u20137 Days (Expiring)" },
    { key: "pastWeek", label: "1\u20134 Weeks" },
    { key: "older", label: "Older than a Month" },
];

// Reuses the same status values already used elsewhere in the Jobs page.
// 'pending' is treated as "no bids yet" per existing status semantics.
const STATUS_OPTIONS = [
    { label: "Active", value: "active" },
    { label: "Pending (No Bids)", value: "pending" },
    { label: "Expired", value: "expired" },
    { label: "Assigned", value: "assigned" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
    { label: "Suspended", value: "suspended" },
];

interface Props {
    data: Job[];
    onViewJob: (job: Job) => void;
    onSponsorJob: (job: Job) => void;
    onDeleteJob: (job: Job) => void;
    rowsPerPage?: number;
}

const thBase: React.CSSProperties = {
    padding: "13px 16px",
    textAlign: "left",
    borderBottom: "1px solid #E8EDF2",
    color: "#64748B",
    fontWeight: 500,
    fontSize: 13,
    whiteSpace: "nowrap",
};
const tdBase: React.CSSProperties = {
    padding: "14px 16px",
    borderBottom: "1px solid #F1F5F9",
    fontSize: 14,
    verticalAlign: "middle",
};

// Age is measured from the last (re)post, matching the app's 7-day expiry.
function getAgeBucket(job: Job): AgeBucketKey | null {
    const days = ageInDays(job);
    if (days === null) return null;
    if (days <= 2) return "fresh";
    if (days <= 5) return "mid";
    if (days <= 7) return "expiring";
    if (days <= 30) return "pastWeek";
    return "older";
}

const AGE_STYLES: Record<AgeBucketKey, { bg: string; fg: string }> = {
    fresh:    { bg: "#DCFCE7", fg: "#15803D" },
    mid:      { bg: "#F1F5F9", fg: "#475569" },
    expiring: { bg: "#FEF3C7", fg: "#B45309" },
    pastWeek: { bg: "#F1F5F9", fg: "#475569" },
    older:    { bg: "#FEF2F2", fg: "#B91C1C" },
};

// "3d left" / "Expires today" / "Expired 5d ago"
function ExpiryLabel({ job }: { job: Job }) {
    const days = daysUntilExpiry(job);
    if (days === null) return <span style={{ color: "#CBD5E1", fontSize: 12 }}>{"\u2014"}</span>;
    if (days < 0) {
        return (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#B91C1C" }}>
                Expired {Math.abs(days)}d ago
            </span>
        );
    }
    const urgent = days <= 2;
    return (
        <span style={{ fontSize: 12, fontWeight: 600, color: urgent ? "#B45309" : "#15803D" }}>
            {days === 0 ? "Expires today" : `${days}d left`}
        </span>
    );
}

// Posted date + "reposted" marker when the job was posted again after expiring
function PostedCell({ job }: { job: Job }) {
    const repostedAt = getRepostedAt(job);
    return (
        <div>
            <div>{formatDate(job.posted_at)}</div>
            {repostedAt && (
                <div style={{ marginTop: 2, fontSize: 11, fontWeight: 600, color: "#7C3AED", whiteSpace: "nowrap" }}>
                    {"\u21BB"} Reposted {formatDate(repostedAt)}
                </div>
            )}
        </div>
    );
}

function getAgeLabel(key: AgeBucketKey | null): string {
    if (!key) return "—";
    return AGE_BUCKETS.find((b) => b.key === key)?.label ?? "—";
}

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB");
}

const SponsorIcon = ({ active }: { active: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
            d="M8 1.5l1.9 4.8 5.1.4-3.9 3.3 1.3 5-4.4-2.7-4.4 2.7 1.3-5-3.9-3.3 5.1-.4L8 1.5z"
            fill={active ? "#F59E0B" : "none"}
            stroke={active ? "#F59E0B" : "#94A3B8"}
            strokeWidth="1.3"
            strokeLinejoin="round"
        />
    </svg>
);

const DeleteIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
            d="M3 4.5h10M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M4.5 4.5l.6 8.4a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-8.4"
            stroke="#94A3B8"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const ViewIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.5" />
        <path d="M8 7v4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="5" r="0.75" fill="#94A3B8" />
    </svg>
);

export const JobAgeStatusTable: React.FC<Props> = ({
    data,
    onViewJob,
    onSponsorJob,
    onDeleteJob,
    rowsPerPage = 10,
}) => {
    const [selectedBuckets, setSelectedBuckets] = useState<Set<AgeBucketKey>>(new Set());
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobile, setIsMobile] = useState(false); // NEW

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 768px)");
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedBuckets, statusFilter]);

    const toggleBucket = (key: AgeBucketKey) => {
        setSelectedBuckets((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const filtered = useMemo(() => {
        let list = data;

        if (selectedBuckets.size > 0) {
            list = list.filter((j) => {
                const bucket = getAgeBucket(j);
                return bucket !== null && selectedBuckets.has(bucket);
            });
        }

        if (statusFilter !== "all") {
            list = list.filter((j) => effectiveStatus(j) === statusFilter);
        }

        return list;
    }, [data, selectedBuckets, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const paginated = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return filtered.slice(start, start + rowsPerPage);
    }, [filtered, currentPage, rowsPerPage]);

    return (
        <div
            style={{
                fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #E8EDF2",
                boxShadow: "0 1px 4px rgba(15,23,42,0.06)",
                overflow: "hidden",
            }}
        >
            {/* Filters */}
            <div
                style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #F1F5F9",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    background: "#FAFBFC",
                }}
            >
                {/* Age buckets — multi-select checkboxes */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginRight: 4 }}>
                        Job Age:
                    </span>
                    {AGE_BUCKETS.map((b) => {
                        const checked = selectedBuckets.has(b.key);
                        return (
                            <label
                                key={b.key}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "6px 12px",
                                    borderRadius: 20,
                                    border: `1px solid ${checked ? "#EA580C" : "#E2E8F0"}`,
                                    background: checked ? "#FFF7ED" : "#fff",
                                    fontSize: 13,
                                    color: checked ? "#EA580C" : "#475569",
                                    fontWeight: checked ? 600 : 500,
                                    cursor: "pointer",
                                    userSelect: "none",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleBucket(b.key)}
                                    style={{ cursor: "pointer", accentColor: "#EA580C" }}
                                />
                                {b.label}
                            </label>
                        );
                    })}
                    {selectedBuckets.size > 0 && (
                        <button
                            onClick={() => setSelectedBuckets(new Set())}
                            style={{
                                border: "none",
                                background: "transparent",
                                color: "#94A3B8",
                                fontSize: 12,
                                cursor: "pointer",
                                textDecoration: "underline",
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* Status filter */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Status:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            padding: "8px 14px",
                            borderRadius: 10,
                            border: "1px solid #E2E8F0",
                            fontSize: 13,
                            color: "#0F172A",
                            background: "#fff",
                            fontFamily: "inherit",
                            outline: "none",
                            minWidth: 180,
                        }}
                    >
                        <option value="all">All Statuses</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    <span style={{ fontSize: 13, color: "#94A3B8", marginLeft: isMobile ? 0 : "auto" }}>
                        {filtered.length} job{filtered.length === 1 ? "" : "s"}
                    </span>
                </div>
            </div>

            {/* ── MOBILE VIEW — stacked cards ── */}
            {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
                    {paginated.length === 0 ? (
                        <div style={{ padding: "32px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                            No jobs match the selected filters.
                        </div>
                    ) : (
                        paginated.map((job) => {
                            const bucket = getAgeBucket(job);
                            return (
                                <div
                                    key={job.id}
                                    style={{
                                        border: "1px solid #E8EDF2",
                                        borderRadius: 14,
                                        padding: 16,
                                        background: job.isSponsored ? "#FFFBEB" : "#fff",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 10,
                                    }}
                                >
                                    {/* Title row */}
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {job.isSponsored && (
                                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                        <title>Sponsored</title>
                                                        <path
                                                            d="M8 1l1.8 4.6 4.9.4-3.7 3.2 1.2 4.8L8 11.4 3.8 14l1.2-4.8L1.3 6l4.9-.4L8 1z"
                                                            fill="#F59E0B"
                                                        />
                                                    </svg>
                                                )}
                                                <span style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>
                                                    {job.title}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{job.jobId}</div>
                                        </div>
                                        <JobStatusBadge status={effectiveStatus(job)} />
                                    </div>

                                    {/* Posted by */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <Avatar src={job.posted_by_image} name={job.posted_by_name} />
                                        <span style={{ fontSize: 13, color: "#475569" }}>{job.posted_by_name}</span>
                                    </div>

                                    {/* Meta grid */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                                        <div>
                                            <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>Posted</div>
                                            <div style={{ color: "#475569" }}><PostedCell job={job} /></div>
                                        </div>
                                        <div>
                                            <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>Age</div>
                                            <span
                                                style={{
                                                    display: "inline-block",
                                                    marginTop: 2,
                                                    padding: "2px 8px",
                                                    borderRadius: 20,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    background: bucket ? AGE_STYLES[bucket].bg : "#F1F5F9",
                                                    color: bucket ? AGE_STYLES[bucket].fg : "#475569",
                                                }}
                                            >
                                                {getAgeLabel(bucket)}
                                            </span>
                                        </div>
                                        <div>
                                            <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>Expiry</div>
                                            <div style={{ marginTop: 2 }}><ExpiryLabel job={job} /></div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            justifyContent: "flex-end",
                                            borderTop: "1px solid #F1F5F9",
                                            paddingTop: 10,
                                            marginTop: 4,
                                        }}
                                    >
                                        <IconBtn title="View details" onClick={() => onViewJob(job)}>
                                            <ViewIcon />
                                        </IconBtn>
                                        <IconBtn
                                            title={job.isSponsored ? "Remove sponsorship" : "Sponsor this job"}
                                            onClick={() => onSponsorJob(job)}
                                        >
                                            <SponsorIcon active={job.isSponsored} />
                                        </IconBtn>
                                        <IconBtn title="Delete job" onClick={() => onDeleteJob(job)}>
                                            <DeleteIcon />
                                        </IconBtn>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* ── DESKTOP TABLE ── */
                <div style={{ overflowX: "auto", width: "100%" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 960 }}>
                        <thead>
                            <tr style={{ background: "#F8FAFC" }}>
                                <th style={{ ...thBase, width: 72 }}>Sr. No.</th>
                                <th style={thBase}>Job Id</th>
                                <th style={thBase}>Job Title</th>
                                <th style={thBase}>Posted By</th>
                                <th style={thBase}>Posted Date</th>
                                <th style={thBase}>Age</th>
                                <th style={thBase}>Expires</th>
                                <th style={thBase}>Status</th>
                                <th style={{ ...thBase, textAlign: "right", paddingRight: 24 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: "48px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                                        No jobs match the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((job, idx) => {
                                    const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                                    const bucket = getAgeBucket(job);
                                    return (
                                        <tr
                                            key={job.id}
                                            style={{ background: job.isSponsored ? "#FFFBEB" : "#fff", transition: "background 0.12s" }}
                                            onMouseEnter={(e) => {
                                                if (!job.isSponsored) e.currentTarget.style.background = "#FAFBFC";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = job.isSponsored ? "#FFFBEB" : "#fff";
                                            }}
                                        >
                                            <td style={{ ...tdBase, color: "#94A3B8", fontSize: 13 }}>
                                                {String(globalIdx).padStart(2, "0")}
                                            </td>
                                            <td style={{ ...tdBase, color: "#475569" }}>{job.jobId}</td>
                                            <td style={{ ...tdBase, color: "#0F172A", fontWeight: 500 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    {job.isSponsored && (
                                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                                            <title>Sponsored</title>
                                                            <path
                                                                d="M8 1l1.8 4.6 4.9.4-3.7 3.2 1.2 4.8L8 11.4 3.8 14l1.2-4.8L1.3 6l4.9-.4L8 1z"
                                                                fill="#F59E0B"
                                                            />
                                                        </svg>
                                                    )}
                                                    {job.title}
                                                </div>
                                            </td>
                                            <td style={tdBase}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                    <Avatar src={job.posted_by_image} name={job.posted_by_name} />
                                                    <span style={{ fontSize: 14, color: "#0F172A" }}>{job.posted_by_name}</span>
                                                </div>
                                            </td>
                                            <td style={{ ...tdBase, color: "#475569", whiteSpace: "nowrap" }}>
                                                <PostedCell job={job} />
                                            </td>
                                            <td style={tdBase}>
                                                <span
                                                    style={{
                                                        padding: "3px 10px",
                                                        borderRadius: 20,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        background: bucket ? AGE_STYLES[bucket].bg : "#F1F5F9",
                                                        color: bucket ? AGE_STYLES[bucket].fg : "#475569",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {getAgeLabel(bucket)}
                                                </span>
                                            </td>
                                            <td style={{ ...tdBase, whiteSpace: "nowrap" }}>
                                                <ExpiryLabel job={job} />
                                            </td>
                                            <td style={tdBase}>
                                                <JobStatusBadge status={effectiveStatus(job)} />
                                            </td>
                                            <td style={{ ...tdBase, textAlign: "right", paddingRight: 24 }}>
                                                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                                    <IconBtn title="View details" onClick={() => onViewJob(job)}>
                                                        <ViewIcon />
                                                    </IconBtn>
                                                    <IconBtn
                                                        title={job.isSponsored ? "Remove sponsorship" : "Sponsor this job"}
                                                        onClick={() => onSponsorJob(job)}
                                                    >
                                                        <SponsorIcon active={job.isSponsored} />
                                                    </IconBtn>
                                                    <IconBtn title="Delete job" onClick={() => onDeleteJob(job)}>
                                                        <DeleteIcon />
                                                    </IconBtn>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div
                    style={{
                        padding: "14px 20px",
                        borderTop: "1px solid #F1F5F9",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                    }}
                >
                    <span style={{ fontSize: 13, color: "#94A3B8" }}>
                        Showing {(currentPage - 1) * rowsPerPage + 1}–
                        {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length} jobs
                    </span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <PageBtn
                            label="< Previous"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        />
                        {isMobile ? (
                            <span style={{ fontSize: 13, color: "#475569", padding: "0 6px" }}>
                                Page {currentPage} of {totalPages}
                            </span>
                        ) : (
                            Array.from({ length: totalPages }, (_, i) => i + 1)
                                .slice(Math.max(0, currentPage - 3), currentPage + 2)
                                .map((p) => (
                                    <PageBtn key={p} label={String(p)} active={p === currentPage} onClick={() => setCurrentPage(p)} />
                                ))
                        )}
                        <PageBtn
                            label="Next >"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};