// src/features/users/components/ExportReportModal.tsx
import React, { useMemo, useState } from "react";
import { User } from "../types";
import {
    ReportFilters,
    filterUsersForReport,
    exportUsersCSV,
    exportUsersPDF,
} from "../utils/reportExport";

const ORANGE = "#EA580C";
const NAVY = "#0F172A";
const SLATE = "#64748B";
const BORDER = "#E2E8F0";
const BG = "#F8FAFC";

interface Props {
    users: User[];
    locationOptions: { label: string; value: string }[];
    onClose: () => void;
}

const fieldStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    borderRadius: 10,
    border: `1px solid ${BORDER}`,
    fontSize: 13,
    color: NAVY,
    background: "#fff",
    fontFamily: "inherit",
    outline: "none",
    cursor: "pointer",
};
const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: SLATE,
    display: "block",
    marginBottom: 6,
};

const CsvGlyph = ({ color }: { color: string }) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke={color} strokeWidth="1.3" />
        <path d="M9 1.5V5h3.5" stroke={color} strokeWidth="1.3" />
    </svg>
);

export const ExportReportModal: React.FC<Props> = ({ users, locationOptions, onClose }) => {
    const [userType, setUserType] = useState<ReportFilters["userType"]>("all");
    const [status, setStatus] = useState<ReportFilters["status"]>("all");
    const [location, setLocation] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const filters: ReportFilters = useMemo(
        () => ({ userType, status, location, dateFrom, dateTo }),
        [userType, status, location, dateFrom, dateTo]
    );

    const matched = useMemo(() => filterUsersForReport(users, filters), [users, filters]);

    const buildMeta = () => ({
        title: "Weera User Management Report",
        generatedBy: "Admin", // placeholder — wire up to the real logged-in admin's name later
        generatedOn: new Date(),
        filters,
        totalCount: matched.length,
    });

    const handleExportCSV = () => {
        exportUsersCSV(matched, buildMeta());
        onClose();
    };
    const handleExportPDF = () => {
        exportUsersPDF(matched, buildMeta());
        onClose();
    };

    return (
        <>
            <div
                onClick={onClose}
                style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", backdropFilter: "blur(2px)", zIndex: 200 }}
            />
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    background: "#fff",
                    borderRadius: 16,
                    zIndex: 201,
                    width: "min(520px, 92vw)",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
                    fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
                }}
            >
                {/* header */}
                <div style={{ padding: "18px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Export Users Report</div>
                        <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>Choose filters, then export as CSV or PDF</div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                            <path d="M2 2l10 10M12 2L2 12" stroke={SLATE} strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* filters */}
                <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                        <label style={labelStyle}>User Type</label>
                        <select value={userType} onChange={(e) => setUserType(e.target.value as ReportFilters["userType"])} style={fieldStyle}>
                            <option value="all">All</option>
                            <option value="clients">Client</option>
                            <option value="bidders">Bidder</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Status</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value as ReportFilters["status"])} style={fieldStyle}>
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <label style={labelStyle}>Location</label>
                        <select value={location} onChange={(e) => setLocation(e.target.value)} style={fieldStyle}>
                            <option value="all">All Locations</option>
                            {locationOptions.map((l) => (
                                <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>From</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={fieldStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>To</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={fieldStyle} />
                    </div>
                </div>

                {/* live count */}
                <div style={{ margin: "0 24px 4px", padding: "10px 14px", background: BG, borderRadius: 10, fontSize: 13, color: NAVY, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: matched.length ? ORANGE : "#CBD5E1", flexShrink: 0 }} />
                    <span><strong>{matched.length}</strong> user{matched.length === 1 ? "" : "s"} match these filters</span>
                </div>

                {/* footer */}
                <div style={{ padding: "20px 24px", display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button
                        onClick={onClose}
                        style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#fff", fontSize: 14, fontWeight: 600, color: SLATE, cursor: "pointer", fontFamily: "inherit" }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={!matched.length}
                        style={{
                            padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${NAVY}`, background: "#fff",
                            fontSize: 14, fontWeight: 700, color: NAVY, cursor: matched.length ? "pointer" : "not-allowed",
                            opacity: matched.length ? 1 : 0.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
                        }}
                    >
                        <CsvGlyph color={NAVY} />
                        Export CSV
                    </button>
                    <button
                        onClick={handleExportPDF}
                        disabled={!matched.length}
                        style={{
                            padding: "10px 18px", borderRadius: 10, border: "none", background: ORANGE,
                            fontSize: 14, fontWeight: 700, color: "#fff", cursor: matched.length ? "pointer" : "not-allowed",
                            opacity: matched.length ? 1 : 0.5, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
                        }}
                    >
                        <CsvGlyph color="#fff" />
                        Export PDF
                    </button>
                </div>
            </div>
        </>
    );
};