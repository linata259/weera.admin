import React, { useMemo, useState, useEffect, useRef } from "react";
import { Job } from "../../pages/Jobs";
import { JobColumn } from "./TableToolbar";
import { Avatar } from "../../../shared/Avatar";
import { JobStatusBadge } from "./JobStatusBadge";
import { SortIcon } from "../../../shared/SortIcon";
import { IconBtn } from "../../../shared/IconBtn";
import { PageBtn } from "../../../shared/PageBtn";
import { BanJobModal } from "../Banjobmodal";

interface Props {
    data: Job[];
    columns: JobColumn[];
    onSort: (key: keyof Job) => void;
    sortConfig?: { key: keyof Job; direction: "asc" | "desc" } | null;
    rowsPerPage?: number;
    onViewJob?: (job: Job) => void;
    onSuspendJob?: (job: Job) => void;
    onBanJob?: (job: Job, reason: string) => void;
    highlightJobId?: string;
}

/* ─── Style constants ────────────────────────────────────────── */
const thBase: React.CSSProperties = {
    padding: "13px 16px",
    textAlign: "left",
    borderBottom: "1px solid #E8EDF2",
    color: "#64748B",
    fontWeight: 500,
    fontSize: 13,
    userSelect: "none",
    whiteSpace: "nowrap",
};
const thInner: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
};
const tdBase: React.CSSProperties = {
    padding: "14px 16px",
    borderBottom: "1px solid #F1F5F9",
    fontSize: 14,
    verticalAlign: "middle",
};

/* ─── Main ───────────────────────────────────────────────────── */
export const JobTable: React.FC<Props> = ({
    data,
    columns,
    onSort,
    sortConfig,
    rowsPerPage = 10,
    onViewJob,
    onSuspendJob,
    onBanJob,
    highlightJobId,
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [, setSelectedJob] = useState<Job | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [banTarget, setBanTarget] = useState<Job | null>(null);
    const highlightRowRef = useRef<HTMLTableRowElement | HTMLDivElement | null>(null);

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 768px)");
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    // Jump to the page containing the highlighted job
    useEffect(() => {
        if (!highlightJobId) return;
        // const idx = data.findIndex((j) => j.jobId === highlightJobId);
        const idx = data.findIndex((j) => j.id === highlightJobId);  
        if (idx === -1) return;
        setCurrentPage(Math.ceil((idx + 1) / rowsPerPage));
    }, [highlightJobId, data, rowsPerPage]);

    // Scroll to the highlighted row after the page renders
    useEffect(() => {
        if (!highlightJobId) return;
        highlightRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [currentPage, highlightJobId]);

    const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return data.slice(start, start + rowsPerPage);
    }, [data, currentPage, rowsPerPage]);

    const allSelected =
        paginatedData.length > 0 &&
        paginatedData.every((j) => selectedIds.has(j.id));

    const toggleAll = () =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) paginatedData.forEach((j) => next.delete(j.id));
            else paginatedData.forEach((j) => next.add(j.id));
            return next;
        });

    const toggleOne = (id: string) =>
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const pageNumbers = useMemo(() => {
        if (totalPages <= 5)
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (currentPage <= 3) return [1, 2, 3, 4, 5];
        if (currentPage >= totalPages - 2)
            return [
                totalPages - 4,
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ];
        return [
            currentPage - 2,
            currentPage - 1,
            currentPage,
            currentPage + 1,
            currentPage + 2,
        ];
    }, [currentPage, totalPages]);

    const formatDate = (iso: string | null) =>
        iso ? new Date(iso).toLocaleDateString("en-GB") : null;

    const sortTh = (key: keyof Job, label: string) => (
        <th style={{ ...thBase, cursor: "pointer" }} onClick={() => onSort(key)}>
            <div style={thInner}>
                {label}
                <SortIcon
                    active={sortConfig?.key === key}
                    direction={sortConfig?.key === key ? sortConfig.direction : undefined}
                />
            </div>
        </th>
    );

    const ViewIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.5" />
            <path d="M8 7v4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="5" r="0.75" fill="#94A3B8" />
        </svg>
    );
    const SuspendIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.5" />
            <path d="M3.5 3.5l9 9" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
    const BanIcon = (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill="#DC2626" />
            <path d="M4.2 4.2l7.6 7.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );

    return (
        <>
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
                {/* ── MOBILE VIEW — stacked cards ── */}
                {isMobile ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
                        {paginatedData.length > 0 && (
                            <button
                                onClick={toggleAll}
                                style={{
                                    alignSelf: "flex-start",
                                    border: "none",
                                    background: "transparent",
                                    color: "#EA580C",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    padding: 0,
                                }}
                            >
                                {allSelected ? "Deselect all" : "Select all on this page"}
                            </button>
                        )}

                        {paginatedData.length === 0 ? (
                            <div style={{ padding: "32px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
                                No jobs found
                            </div>
                        ) : (
                            paginatedData.map((job) => {
                                const isSelected = selectedIds.has(job.id);
                                const isHighlighted = job.jobId === highlightJobId;
                                return (
                                    <div
                                        key={job.id}
                                        ref={isHighlighted ? (el) => { highlightRowRef.current = el; } : undefined}
                                        style={{
                                            border: isHighlighted ? "2px solid #EA580C" : "1px solid #E8EDF2",
                                            borderRadius: 14,
                                            padding: 16,
                                            background: isHighlighted ? "#FFF3E0" : isSelected ? "#FFF7ED" : "#fff",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 10,
                                        }}
                                    >
                                        {/* Title row */}
                                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleOne(job.id)}
                                                    style={{ marginTop: 3, cursor: "pointer", accentColor: "#EA580C" }}
                                                />
                                                <div>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>
                                                        {job.title}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                                                        {job.jobId}
                                                    </div>
                                                </div>
                                            </div>
                                            <JobStatusBadge status={job.status} />
                                        </div>

                                        {/* Posted by */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <Avatar src={job.posted_by_image} name={job.posted_by_name} />
                                            <span style={{ fontSize: 13, color: "#475569" }}>{job.posted_by_name}</span>
                                        </div>

                                        {/* Meta grid */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                                            <div>
                                                <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>Categories</div>
                                                <div style={{ color: "#475569" }}>
                                                    {job.categories.length > 0 ? job.categories.join(", ") : "—"}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>Proposals</div>
                                                <div style={{ color: "#475569" }}>{job.applicants}</div>
                                            </div>
                                            <div>
                                                <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>Posted</div>
                                                <div style={{ color: "#475569" }}>{formatDate(job.posted_at) ?? "—"}</div>
                                            </div>
                                            {columns.map((col) => {
                                                const val = (job as any)[col.key];
                                                let display: React.ReactNode = "—";
                                                if (val !== null && val !== undefined && val !== "") {
                                                    if (Array.isArray(val)) display = val.length ? val.join(", ") : display;
                                                    else if (typeof val === "boolean") display = val ? "Yes" : "No";
                                                    else display = String(val);
                                                }
                                                return (
                                                    <div key={String(col.key)}>
                                                        <div style={{ color: "#94A3B8", fontSize: 11, textTransform: "uppercase" }}>{col.label}</div>
                                                        <div style={{ color: "#475569" }}>{display}</div>
                                                    </div>
                                                );
                                            })}
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
                                            <IconBtn
                                                title="View details"
                                                onClick={() => {
                                                    onViewJob?.(job);
                                                    setSelectedJob(job);
                                                }}
                                            >
                                                {ViewIcon}
                                            </IconBtn>
                                            <IconBtn title="Suspend job" onClick={() => onSuspendJob?.(job)}>
                                                {SuspendIcon}
                                            </IconBtn>
                                            <IconBtn title="Ban job" onClick={() => setBanTarget(job)}>
                                                {BanIcon}
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
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                minWidth: 1000,
                            }}
                        >
                            <thead>
                                <tr style={{ background: "#F8FAFC" }}>
                                    <th style={{ ...thBase, width: 48 }}>
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleAll}
                                            style={{ cursor: "pointer", accentColor: "#EA580C" }}
                                        />
                                    </th>
                                    <th style={{ ...thBase, width: 72 }}>Sr. No.</th>
                                    {sortTh("jobId", "Job Id")}
                                    {sortTh("categories", "Job Categories")}
                                    {sortTh("title", "Job Title")}
                                    {sortTh("posted_by_name", "Posted By")}
                                    {sortTh("status", "Status")}
                                    {sortTh("applicants", "Received Proposals")}
                                    {sortTh("posted_at", "Posted Date")}

                                    {columns.map((col) => (
                                        <th
                                            key={String(col.key)}
                                            style={{ ...thBase, cursor: "pointer" }}
                                            onClick={() => onSort(col.key as keyof Job)}
                                        >
                                            <div style={thInner}>
                                                {col.label}
                                                <SortIcon
                                                    active={sortConfig?.key === col.key}
                                                    direction={
                                                        sortConfig?.key === col.key
                                                            ? sortConfig.direction
                                                            : undefined
                                                    }
                                                />
                                            </div>
                                        </th>
                                    ))}

                                    <th style={{ ...thBase, textAlign: "right", paddingRight: 24 }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length + 10}
                                            style={{
                                                padding: "48px 0",
                                                textAlign: "center",
                                                color: "#94A3B8",
                                                fontSize: 14,
                                            }}
                                        >
                                            No jobs found
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((job, idx) => {
                                        const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                                        const isSelected = selectedIds.has(job.id);
                                        const isHighlighted = job.jobId === highlightJobId;

                                        return (
                                            <tr
                                                key={job.id}
                                                ref={isHighlighted ? (el) => { highlightRowRef.current = el; } : undefined}
                                                onClick={() => setSelectedJob(job)}
                                                style={{
                                                    background: isHighlighted
                                                        ? "#FFF3E0"
                                                        : isSelected ? "#FFF7ED" : "#fff",
                                                    outline: isHighlighted ? "2px solid #EA580C" : "none",
                                                    outlineOffset: "-2px",
                                                    transition: "background 0.12s",
                                                    cursor: "pointer",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected && !isHighlighted)
                                                        e.currentTarget.style.background = "#FAFBFC";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = isHighlighted
                                                        ? "#FFF3E0"
                                                        : isSelected ? "#FFF7ED" : "#fff";
                                                }}
                                            >
                                                <td style={tdBase} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleOne(job.id)}
                                                        style={{ cursor: "pointer", accentColor: "#EA580C" }}
                                                    />
                                                </td>

                                                {/* Sr. No. */}
                                                <td style={{ ...tdBase, color: "#94A3B8", fontSize: 13 }}>
                                                    {String(globalIdx).padStart(2, "0")}
                                                </td>

                                                {/* Job Id */}
                                                <td style={{ ...tdBase, color: "#475569" }}>
                                                    {job.jobId}
                                                </td>

                                                {/* Job Categories */}
                                                <td style={{ ...tdBase, color: "#475569" }}>
                                                    {job.categories.length > 0 ? (
                                                        job.categories.join(", ")
                                                    ) : (
                                                        <span style={{ color: "#CBD5E1" }}>—</span>
                                                    )}
                                                </td>

                                                {/* Job Title */}
                                                <td style={{ ...tdBase, color: "#475569" }}>
                                                    {job.title}
                                                </td>

                                                {/* Posted By */}
                                                <td style={tdBase}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        <Avatar src={job.posted_by_image} name={job.posted_by_name} />
                                                        <div>
                                                            <div style={{ fontSize: 14, color: "#0F172A", fontWeight: 500 }}>
                                                                {job.posted_by_name}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td style={tdBase}>
                                                    <JobStatusBadge status={job.status} />
                                                </td>

                                                {/* Received Proposals */}
                                                <td style={{ ...tdBase, color: "#475569", textAlign: "center" }}>
                                                    {job.applicants}
                                                </td>

                                                {/* Posted Date */}
                                                <td style={{ ...tdBase, color: "#475569", whiteSpace: "nowrap" }}>
                                                    {formatDate(job.posted_at) ?? (
                                                        <span style={{ color: "#CBD5E1" }}>—</span>
                                                    )}
                                                </td>

                                                {/* Extra Columns */}
                                                {columns.map((col) => {
                                                    const val = (job as any)[col.key];
                                                    let display: React.ReactNode = (
                                                        <span style={{ color: "#CBD5E1" }}>—</span>
                                                    );
                                                    if (val !== null && val !== undefined && val !== "") {
                                                        if (Array.isArray(val))
                                                            display = val.length ? val.join(", ") : display;
                                                        else if (typeof val === "boolean")
                                                            display = val ? "Yes" : "No";
                                                        else display = String(val);
                                                    }
                                                    return (
                                                        <td key={String(col.key)} style={{ ...tdBase, color: "#475569" }}>
                                                            {display}
                                                        </td>
                                                    );
                                                })}

                                                {/* Actions */}
                                                <td
                                                    style={{ ...tdBase, textAlign: "right", paddingRight: 24 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                                        <IconBtn
                                                            title="View details"
                                                            onClick={() => {
                                                                onViewJob?.(job);
                                                                setSelectedJob(job);
                                                            }}
                                                        >
                                                            {ViewIcon}
                                                        </IconBtn>
                                                        <IconBtn
                                                            title="Suspend job"
                                                            onClick={() => onSuspendJob?.(job)}
                                                        >
                                                            {SuspendIcon}
                                                        </IconBtn>
                                                        <IconBtn
                                                            title="Ban job"
                                                            onClick={() => setBanTarget(job)}
                                                        >
                                                            {BanIcon}
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

                {/* PAGINATION */}
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
                            {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} jobs
                        </span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <PageBtn
                                label="< Previous"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            />
                            {!isMobile && pageNumbers[0] > 1 && (
                                <>
                                    <PageBtn label="1" onClick={() => setCurrentPage(1)} />
                                    {pageNumbers[0] > 2 && (
                                        <span style={{ padding: "0 4px", color: "#94A3B8" }}>…</span>
                                    )}
                                </>
                            )}
                            {!isMobile &&
                                pageNumbers.map((p) => (
                                    <PageBtn
                                        key={p}
                                        label={String(p)}
                                        active={p === currentPage}
                                        onClick={() => setCurrentPage(p)}
                                    />
                                ))}
                            {isMobile && (
                                <span style={{ fontSize: 13, color: "#475569", padding: "0 6px" }}>
                                    Page {currentPage} of {totalPages}
                                </span>
                            )}
                            {!isMobile && pageNumbers[pageNumbers.length - 1] < totalPages && (
                                <>
                                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                                        <span style={{ padding: "0 4px", color: "#94A3B8" }}>…</span>
                                    )}
                                    <PageBtn
                                        label={String(totalPages)}
                                        onClick={() => setCurrentPage(totalPages)}
                                    />
                                </>
                            )}
                            <PageBtn
                                label="Next >"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            />
                            {!isMobile && (
                                <>
                                    <span style={{ fontSize: 13, color: "#94A3B8", marginLeft: "20px" }}>Go to</span>
                                    <div
                                        style={{
                                            background: "#F8FAFC",
                                            border: "1px solid #E2E8F0",
                                            color: "#CBD5E1",
                                            borderRadius: 6,
                                            padding: "3px 12px",
                                            fontSize: 13
                                        }}
                                    >Page</div>
                                    <div
                                        style={{
                                            background: "#F8FAFC",
                                            border: "1px solid #E2E8F0",
                                            color: "#64748B",
                                            borderRadius: 6,
                                            padding: "3px 12px",
                                            fontSize: 13,
                                            marginLeft: '10px'
                                        }}
                                    >{rowsPerPage} / page ˅</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <BanJobModal
                job={banTarget}
                onClose={() => setBanTarget(null)}
                onConfirm={(reason) => {
                    if (banTarget) onBanJob?.(banTarget, reason);
                    setBanTarget(null);
                }}
            />
        </>
    );
};