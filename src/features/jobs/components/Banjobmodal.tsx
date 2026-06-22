import React, { useState } from "react";
import type { Job } from "../pages/Jobs";

const NAVY = "#0F172A";
const SLATE = "#64748B";
const BORDER = "#E2E8F0";
const RED = "#DC2626";

interface Props {
    job: Job | null;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

export const BanJobModal: React.FC<Props> = ({ job, onClose, onConfirm }) => {
    const [reason, setReason] = useState("");

    if (!job) return null;

    const trimmed = reason.trim();
    const canSubmit = trimmed.length > 0;

    const handleClose = () => {
        setReason("");
        onClose();
    };

    const handleConfirm = () => {
        if (!canSubmit) return;
        onConfirm(trimmed);
        setReason("");
    };

    return (
        <>
            <div
                onClick={handleClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15,23,42,0.35)",
                    backdropFilter: "blur(2px)",
                    zIndex: 200,
                }}
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
                    width: "min(440px, 92vw)",
                    boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
                    fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
                    padding: "32px 28px 24px",
                    boxSizing: "border-box",
                }}
            >
                {/* Icon */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background: "#FEF2F2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6.5" stroke={RED} strokeWidth="1.6" />
                            <path d="M3.8 3.8l8.4 8.4" stroke={RED} strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                {/* Title + description */}
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: NAVY }}>Ban Job Post</h2>
                    <p style={{ margin: "8px 0 0", fontSize: 13, color: SLATE, lineHeight: 1.6 }}>
                        This action will permanently delete the job post{" "}
                        <strong style={{ color: NAVY }}>'{job.title || "Untitled Job"}'</strong> and send a
                        notification to the client. This action cannot be undone.
                    </p>
                </div>

                {/* Reason field */}
                <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: NAVY, display: "block", marginBottom: 8 }}>
                        Reason for banning <span style={{ color: RED }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value.slice(0, 250))}
                            placeholder="Write description…"
                            maxLength={250}
                            rows={4}
                            autoFocus
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                padding: "12px 14px 24px",
                                borderRadius: 10,
                                border: `1px solid ${BORDER}`,
                                fontSize: 14,
                                color: NAVY,
                                outline: "none",
                                fontFamily: "inherit",
                                resize: "vertical",
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = RED)}
                            onBlur={(e) => (e.currentTarget.style.borderColor = BORDER)}
                        />
                        <span
                            style={{
                                position: "absolute",
                                right: 12,
                                bottom: 10,
                                fontSize: 11,
                                color: "#94A3B8",
                            }}
                        >
                            {reason.length}/250
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                    <button
                        onClick={handleClose}
                        style={{
                            padding: "9px 20px",
                            borderRadius: 10,
                            border: `1px solid ${BORDER}`,
                            background: "#fff",
                            fontSize: 14,
                            fontWeight: 600,
                            color: SLATE,
                            cursor: "pointer",
                            fontFamily: "inherit",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canSubmit}
                        style={{
                            padding: "9px 20px",
                            borderRadius: 10,
                            border: "none",
                            background: RED,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#fff",
                            cursor: canSubmit ? "pointer" : "not-allowed",
                            opacity: canSubmit ? 1 : 0.5,
                            fontFamily: "inherit",
                        }}
                    >
                        Ban Job Post
                    </button>
                </div>
            </div>
        </>
    );
};