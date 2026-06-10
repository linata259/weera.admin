import React, { useEffect, useMemo, useState } from "react";
import { Job } from "../../pages/Jobs";
import { InfoRow } from "../../../shared/InfoRow";
import { JobStatusBadge } from "./JobStatusBadge";

interface Props {
    job: Job;
    onClose: () => void;
    onSuspend?: (job: Job) => void;
}

type TabKey = "description" | "specifications" | "attachments";

const sectionLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
};

const tabLabels: Record<TabKey, string> = {
    description: "Description",
    specifications: "Specifications",
    attachments: "Attachments",
};

const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-GB") : undefined;

const formatDateTime = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : undefined;

const descriptionParagraphs = (description: string) =>
    description
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

export const JobDetailPanel: React.FC<Props> = ({
    job,
    onClose,
    onSuspend,
}) => {
    const [activeTab, setActiveTab] = useState<TabKey>("description");

    const paragraphs = useMemo(
        () => descriptionParagraphs(job.description),
        [job.description]
    );

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15,23,42,0.35)",
                    backdropFilter: "blur(2px)",
                    zIndex: 100,
                    animation: "fadeIn 0.2s ease",
                }}
            />

            <div
                style={{
                    position: "fixed",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: "min(480px, 100vw)",
                    background: "#fff",
                    zIndex: 101,
                    boxShadow: "-8px 0 32px rgba(15,23,42,0.12)",
                    display: "flex",
                    flexDirection: "column",
                    animation: "slideIn 0.25s ease",
                    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
                    overflowY: "auto",
                }}
            >
                <div
                    style={{
                        padding: "20px 24px 16px",
                        borderBottom: "1px solid #F1F5F9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        position: "sticky",
                        top: 0,
                        background: "#fff",
                        zIndex: 1,
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#0F172A",
                        }}
                    >
                        Job Details
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close job details"
                        style={{
                            width: 32,
                            height: 32,
                            border: "1px solid #E2E8F0",
                            borderRadius: 8,
                            background: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                                d="M2 2l10 10M12 2L2 12"
                                stroke="#64748B"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                <div style={{ padding: "24px", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
                            {job.title || "Untitled Job"}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                flexWrap: "wrap",
                                marginTop: 8,
                            }}
                        >
                            <span style={{ fontSize: 13, color: "#64748B" }}>
                                Job ID: {job.jobId}
                            </span>
                            <JobStatusBadge status={job.status} />
                        </div>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0 24px",
                        }}
                    >
                        <InfoRow label="Posted By" value={job.posted_by_name} />
                        <InfoRow label="Posted Date" value={formatDate(job.posted_at)} />
                        <InfoRow
                            label="Category"
                            value={job.categories.length ? job.categories.join(", ") : job.jobType}
                        />
                        <InfoRow label="Location" value={job.location} />
                        <InfoRow label="Proposals" value={String(job.applicants)} />
                        <InfoRow label="Posted At" value={formatDateTime(job.posted_at)} />
                    </div>
                </div>

                <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 4,
                            padding: 4,
                            background: "#F1F5F9",
                            borderRadius: 10,
                        }}
                    >
                        {(Object.keys(tabLabels) as TabKey[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    border: "none",
                                    borderRadius: 8,
                                    background: activeTab === tab ? "#fff" : "transparent",
                                    color: activeTab === tab ? "#0F172A" : "#64748B",
                                    boxShadow:
                                        activeTab === tab
                                            ? "0 1px 3px rgba(15,23,42,0.12)"
                                            : "none",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    padding: "9px 6px",
                                }}
                            >
                                {tabLabels[tab]}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
                    {activeTab === "description" && (
                        <div>
                            <div style={sectionLabel}>Description</div>
                            {paragraphs.length ? (
                                paragraphs.map((paragraph, index) => (
                                    <p
                                        key={`${index}-${paragraph}`}
                                        style={{
                                            margin: "0 0 12px",
                                            fontSize: 14,
                                            color: "#334155",
                                            lineHeight: 1.6,
                                        }}
                                    >
                                        {paragraph}
                                    </p>
                                ))
                            ) : (
                                <span style={{ fontSize: 14, color: "#CBD5E1" }}>
                                    No description provided
                                </span>
                            )}
                        </div>
                    )}

                    {activeTab === "specifications" && (
                        <div>
                            <div style={sectionLabel}>Specifications</div>
                            {job.specifications.length ? (
                                <ul
                                    style={{
                                        margin: 0,
                                        paddingLeft: 18,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                        fontSize: 14,
                                        color: "#334155",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {job.specifications.map((specification) => (
                                        <li key={specification}>{specification}</li>
                                    ))}
                                </ul>
                            ) : (
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "0 24px",
                                    }}
                                >
                                    <InfoRow label="Job Type" value={job.jobType} />
                                    <InfoRow label="Status" value={<JobStatusBadge status={job.status} />} />
                                    <InfoRow
                                        label="Categories"
                                        value={job.categories.length ? job.categories.join(", ") : undefined}
                                    />
                                    <InfoRow label="Received Proposals" value={String(job.applicants)} />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "attachments" && (
                        <div>
                            <div style={sectionLabel}>Attachments</div>
                            {job.attachments.length ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {job.attachments.map((attachment, index) => (
                                        <a
                                            key={attachment}
                                            href={attachment}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: "block",
                                                fontSize: 13,
                                                color: "#EA580C",
                                                lineHeight: 1.4,
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            Attachment {index + 1}
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <span style={{ fontSize: 14, color: "#CBD5E1" }}>
                                    No attachments provided
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div
                    style={{
                        padding: "20px 24px",
                        marginTop: "auto",
                        display: "flex",
                        gap: 10,
                    }}
                >
                    <button
                        onClick={() => onSuspend?.(job)}
                        style={{
                            flex: 1,
                            padding: "10px 0",
                            borderRadius: 10,
                            border: "1.5px solid #FEE2E2",
                            background: "#FFF5F5",
                            color: "#DC2626",
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: "pointer",
                            fontFamily: "inherit",
                        }}
                    >
                        {job.status.toLowerCase() === "Banned" ? "Unsuspend Job" : "Ban Job"}
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: "10px 0",
                            borderRadius: 10,
                            border: "none",
                            background: "#0F172A",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: "pointer",
                            fontFamily: "inherit",
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
            `}</style>
        </>
    );
};
