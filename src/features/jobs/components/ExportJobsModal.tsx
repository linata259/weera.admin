// src/features/jobs/components/ExportJobsModal.tsx
import React, { useMemo, useState } from "react";
import type { Job, BidRecord } from "../pages/Jobs";
import {
    JobsExportFilters,
    filterJobsForExport,
    filterBidsForExport,
    JOB_EXPORT_HEADERS,
    BID_EXPORT_HEADERS,
    jobExportRow,
    bidExportRow,
    summarizeFilters,
    humanize,
    bidStatusLabel,
} from "../utils/jobsExport";
import { exportTableCSV, exportTablePDF, ExportMeta } from "../../../utils/tableExport";
import { Ico, IconClose, IconExportCsv, IconExportPdf, iconSize } from "../../../components/icons";

const ORANGE = "#EA580C";
const NAVY = "#0F172A";
const SLATE = "#64748B";
const BORDER = "#E2E8F0";
const BG = "#F8FAFC";

type Props =
    | { kind: "jobs"; jobs: Job[]; bids?: never; categoryOptions: string[]; onClose: () => void }
    | { kind: "bids"; bids: BidRecord[]; jobs?: never; categoryOptions?: never; onClose: () => void };

const fieldStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    borderRadius: 8,
    border: `1px solid ${BORDER}`,
    fontSize: 13,
    color: NAVY,
    background: "#fff",
    fontFamily: "inherit",
    outline: "none",
};
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: SLATE, display: "block", marginBottom: 6 };

export const ExportJobsModal: React.FC<Props> = (props) => {
    const { kind, onClose } = props;
    const noun = kind === "jobs" ? "job" : "bid";

    const [status, setStatus] = useState("all");
    const [category, setCategory] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [format, setFormat] = useState<"csv" | "pdf">("csv");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filters: JobsExportFilters = useMemo(
        () => ({ status, category, dateFrom, dateTo }),
        [status, category, dateFrom, dateTo]
    );

    const statusOptions = useMemo(() => {
        const source = kind === "jobs" ? props.jobs!.map((j) => j.status) : props.bids!.map((b) => b.status);
        return Array.from(new Set(source.filter(Boolean))).sort();
    }, [kind, props.jobs, props.bids]);

    const matchedCount = useMemo(
        () => (kind === "jobs" ? filterJobsForExport(props.jobs!, filters).length : filterBidsForExport(props.bids!, filters).length),
        [kind, props.jobs, props.bids, filters]
    );

    const handleExport = async () => {
        if (busy || !matchedCount) return;
        setBusy(true);
        setError(null);
        try {
            const headers = kind === "jobs" ? JOB_EXPORT_HEADERS : BID_EXPORT_HEADERS;
            const rows =
                kind === "jobs"
                    ? filterJobsForExport(props.jobs!, filters).map(jobExportRow)
                    : filterBidsForExport(props.bids!, filters).map(bidExportRow);
            const meta: ExportMeta = {
                title: kind === "jobs" ? "Weera Jobs Report" : "Weera Bids Report",
                generatedBy: "Admin",
                generatedOn: new Date(),
                filtersSummary: summarizeFilters(filters, kind),
                totalLabel: kind === "jobs" ? "Total Jobs" : "Total Bids",
                totalCount: rows.length,
                fileBase: kind === "jobs" ? "weera-jobs-report" : "weera-bids-report",
            };
            if (format === "csv") exportTableCSV(meta, headers, rows);
            else await exportTablePDF(meta, headers, rows, "landscape");
            onClose();
        } catch (err) {
            console.error(`${noun} export failed`, err);
            setError(
                format === "pdf"
                    ? "Couldn't build the PDF. Refresh the page and try again."
                    : "Couldn't build the CSV. Please try again."
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 200 }} />
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                    background: "#fff", borderRadius: 12, zIndex: 201, width: "min(520px, 92vw)",
                    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(15,23,42,0.16)",
                    fontFamily: "'Inter','Helvetica Neue',sans-serif",
                }}
            >
                <div style={{ padding: "18px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Export {kind === "jobs" ? "Jobs" : "Bids"} Report</div>
                        <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Choose filters and a format, then export</div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                        <Ico icon={IconClose} size={iconSize.sm} color={SLATE} />
                    </button>
                </div>

                <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ gridColumn: kind === "bids" ? "1 / -1" : undefined }}>
                        <label style={labelStyle}>Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}>
                            <option value="all">All</option>
                            {statusOptions.map((s) => <option key={s} value={s}>{kind === "bids" ? bidStatusLabel(s) : humanize(s)}</option>)}
                        </select>
                    </div>
                    {kind === "jobs" && (
                        <div>
                            <label style={labelStyle}>Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}>
                                <option value="all">All</option>
                                {props.categoryOptions!.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label style={labelStyle}>{kind === "jobs" ? "Posted from" : "Submitted from"}</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>To</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={fieldStyle} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Format</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {([
                                { value: "csv", label: "CSV", icon: IconExportCsv },
                                { value: "pdf", label: "PDF", icon: IconExportPdf },
                            ] as const).map((opt) => {
                                const active = format === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFormat(opt.value)}
                                        style={{
                                            padding: "10px 12px", borderRadius: 8, fontFamily: "inherit", cursor: "pointer",
                                            border: `1.5px solid ${active ? ORANGE : BORDER}`,
                                            background: active ? "#FFF7ED" : "#fff",
                                            color: active ? ORANGE : NAVY, fontSize: 13, fontWeight: 600,
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                        }}
                                    >
                                        <Ico icon={opt.icon} size={iconSize.sm} color={active ? ORANGE : SLATE} />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div style={{ margin: "0 24px", padding: "10px 14px", background: BG, borderRadius: 8, fontSize: 13, color: NAVY }}>
                    <strong>{matchedCount.toLocaleString()}</strong> {noun}{matchedCount === 1 ? "" : "s"} match these filters
                </div>

                {error && (
                    <div style={{ margin: "12px 24px 0", padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#B91C1C" }}>
                        {error}
                    </div>
                )}

                <div style={{ padding: "20px 24px", display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button
                        onClick={onClose}
                        style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", fontSize: 14, fontWeight: 600, color: SLATE, cursor: "pointer", fontFamily: "inherit" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={!matchedCount || busy}
                        style={{
                            padding: "10px 18px", borderRadius: 8, border: "none", background: ORANGE,
                            fontSize: 14, fontWeight: 700, color: "#fff",
                            cursor: !matchedCount ? "not-allowed" : busy ? "wait" : "pointer",
                            opacity: matchedCount ? (busy ? 0.75 : 1) : 0.5,
                            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
                        }}
                    >
                        <Ico icon={format === "csv" ? IconExportCsv : IconExportPdf} size={iconSize.sm} color="#fff" />
                        {busy ? `Building ${format.toUpperCase()}…` : `Export ${format.toUpperCase()}`}
                    </button>
                </div>
            </div>
        </>
    );
};

export default ExportJobsModal;
