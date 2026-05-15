import React, { useEffect } from "react";
import { User } from "../../pages/Users";
import { deriveStatus } from "../../../shared/types";
import { StatusBadge } from "../../../shared/StatusBadge";
import { InfoRow } from "../../../shared/InfoRow";
import { Avatar } from "../../../shared/Avatar";



interface Props {
  user: User;
  onClose: () => void;
  onSuspend?: (user: User) => void;
}

export const UserDetailPanel: React.FC<Props> = ({ user, onClose, onSuspend }) => {
  const status = deriveStatus(user);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(2px)", zIndex: 100,
        animation: "fadeIn 0.2s ease",
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(480px, 100vw)", background: "#fff", zIndex: 101,
        boxShadow: "-8px 0 32px rgba(15,23,42,0.12)",
        display: "flex", flexDirection: "column",
        animation: "slideIn 0.25s ease",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        overflowY: "auto",
      }}>

        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid #F1F5F9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>User Profile</h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, border: "1px solid #E2E8F0", borderRadius: 8,
            background: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Basic info */}
        <div style={{ padding: "24px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <Avatar src={user.image_url} name={user.name} size={64} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{user.name || "—"}</div>
              {user.professional_headline && (
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{user.professional_headline}</div>
              )}
              <div style={{ marginTop: 8 }}><StatusBadge status={status} /></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <InfoRow label="Phone" value={user.phone} />
            <InfoRow label="Joined" value={user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB") : undefined} />
            <InfoRow label="Location" value={(user.location_names ?? []).join(", ") || user.location} />
            <InfoRow label="User Types" value={(user.user_type_names ?? []).join(", ")} />
          </div>
        </div>

        {/* About */}
        {user.about_me && (
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              About
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.6 }}>{user.about_me}</p>
          </div>
        )}

        {/* Skills & Certs */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              Skills
            </div>
            {user.skills_id?.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {user.skills_id.map((s, i) => (
                  <span key={i} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, background: "#F1F5F9", color: "#475569", fontWeight: 500 }}>
                    {s}
                  </span>
                ))}
              </div>
            ) : <span style={{ fontSize: 14, color: "#CBD5E1" }}>—</span>}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              Certifications
            </div>
            {user.certifications?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {user.certifications.map((c, i) => (
                  <div key={i} style={{ fontSize: 14, color: "#334155", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#EA580C" }}>✦</span> {c}
                  </div>
                ))}
              </div>
            ) : <span style={{ fontSize: 14, color: "#CBD5E1" }}>—</span>}
          </div>
        </div>

        {/* Attachments */}
        {user.profile_attachments?.length > 0 && (
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              Attachments
            </div>
            {user.profile_attachments.map((att, i) => (
              <a key={i} href={att} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", fontSize: 13, color: "#EA580C", marginBottom: 4 }}>
                {att}
              </a>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: "20px 24px", marginTop: "auto", display: "flex", gap: 10 }}>
          <button onClick={() => onSuspend?.(user)} style={{
            flex: 1, padding: "10px 0", borderRadius: 10,
            border: "1.5px solid #FEE2E2", background: "#FFF5F5",
            color: "#DC2626", fontWeight: 600, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {status === "suspended" ? "Unsuspend User" : "Suspend User"}
          </button>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
            background: "#0F172A", color: "#fff", fontWeight: 600, fontSize: 14,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }           to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </>
  );
};