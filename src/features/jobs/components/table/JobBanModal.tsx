import React, { useEffect, useRef, useState } from "react";
import { Job } from "../../pages/Jobs";

interface Props {
    job: Job;
    onClose: () => void;
    onConfirm: (job: Job, reason: string) => void;
}

const MAX_REASON_LENGTH = 250;

export const JobBanModal: React.FC<Props> = ({ job, onClose, onConfirm }) => {
    const [reason, setReason] = useState("");
    const [showError, setShowError] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        document.body.style.overflow = "hidden";
        const timeoutId = window.setTimeout(() => textareaRef.current?.focus(), 50);

        return () => {
            document.body.style.overflow = "";
            window.clearTimeout(timeoutId);
        };
    }, []);

    const handleSubmit = () => {
        const trimmedReason = reason.trim();

        if (!trimmedReason) {
            setShowError(true);
            textareaRef.current?.focus();
            return;
        }

        onConfirm(job, trimmedReason);
    };

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15,23,42,0.62)",
                    zIndex: 110,
                    animation: "fadeIn 0.18s ease",
                }}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="ban-job-title"
                style={{
                    position: "fixed",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(420px, calc(100vw - 32px))",
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 24px 64px rgba(15,23,42,0.28)",
                    zIndex: 111,
                    padding: 18,
                    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
                    animation: "modalIn 0.2s ease",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: "1px solid #E2E8F0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <circle cx="9" cy="9" r="7" stroke="#94A3B8" strokeWidth="1.4" />
                            <path
                                d="M5.2 5.2l7.6 7.6"
                                stroke="#94A3B8"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                </div>

                <h2
                    id="ban-job-title"
                    style={{
                        margin: 0,
                        textAlign: "center",
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#0F172A",
                    }}
                >
                    Ban Job Post
                </h2>

                <p
                    style={{
                        margin: "8px auto 22px",
                        maxWidth: 340,
                        textAlign: "center",
                        fontSize: 12,
                        lineHeight: 1.5,
                        color: "#64748B",
                    }}
                >
                    This action will permanently delete the job post "{job.title || "Untitled Job"}" and send a notification to the client. This action cannot be undone.
                </p>

                <label
                    htmlFor="ban-job-reason"
                    style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0F172A",
                        marginBottom: 8,
                    }}
                >
                    Reason for banning <span style={{ color: "#EF4444" }}>*</span>
                </label>

                <div style={{ position: "relative" }}>
                    <textarea
                        ref={textareaRef}
                        id="ban-job-reason"
                        value={reason}
                        maxLength={MAX_REASON_LENGTH}
                        placeholder="Write description..."
                        onChange={(event) => {
                            setReason(event.target.value);
                            if (showError && event.target.value.trim()) {
                                setShowError(false);
                            }
                        }}
                        style={{
                            width: "100%",
                            minHeight: 100,
                            resize: "none",
                            boxSizing: "border-box",
                            border: `1px solid ${showError ? "#EF4444" : "#CBD5E1"}`,
                            borderRadius: 8,
                            outline: "none",
                            padding: "12px 12px 24px",
                            fontFamily: "inherit",
                            fontSize: 12,
                            lineHeight: 1.5,
                            color: "#0F172A",
                        }}
                    />
                    <span
                        style={{
                            position: "absolute",
                            right: 12,
                            bottom: 10,
                            fontSize: 10,
                            color: "#94A3B8",
                        }}
                    >
                        {reason.length}/{MAX_REASON_LENGTH}
                    </span>
                </div>

                {showError && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "#EF4444" }}>
                        Enter a reason before banning this job post.
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                        marginTop: 24,
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: "10px 18px",
                            borderRadius: 8,
                            border: "1px solid #E2E8F0",
                            background: "#fff",
                            color: "#0F172A",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 600,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        style={{
                            padding: "10px 18px",
                            borderRadius: 8,
                            border: "none",
                            background: "#DC2626",
                            color: "#fff",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 700,
                        }}
                    >
                        Ban Job Post
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes modalIn {
                    from { opacity: 0; transform: translate(-50%, -48%) scale(0.98) }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1) }
                }
            `}</style>
        </>
    );
};
