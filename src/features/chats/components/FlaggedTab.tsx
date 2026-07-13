import React, { useMemo, useState } from "react";
import { FiCheck, FiSlash, FiEye, FiRotateCcw } from "react-icons/fi";
import type { FlagStatus, FlaggedMessage } from "../types";
import {
  Avatar,
  FlagStatusBadge,
  HighlightedText,
  UserTypePill,
  cardStyle,
  formatDateTime,
} from "./shared";

interface Props {
  flagged: FlaggedMessage[];
  onSetStatus: (flag: FlaggedMessage, status: FlagStatus) => void;
  onBlock: (flag: FlaggedMessage) => void;
  onOpenConversation: (conversationId: string) => void;
  busyIds: Set<string>;
}

const Icon: React.FC<{ icon: (props: any) => any; size?: number }> = ({ icon, size }) => {
  const C = icon as React.ComponentType<{ size?: number }>;
  return <C size={size} />;
};

const FILTERS: { key: FlagStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "reviewed", label: "Reviewed" },
  { key: "dismissed", label: "Dismissed" },
];

const actionBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid #E2E8F0",
  background: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12.5,
  fontWeight: 600,
  cursor: "pointer",
  color: "#334155",
};

export const FlaggedTab: React.FC<Props> = ({
  flagged,
  onSetStatus,
  onBlock,
  onOpenConversation,
  busyIds,
}) => {
  const [filter, setFilter] = useState<FlagStatus | "all">("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const c = { all: flagged.length, pending: 0, reviewed: 0, dismissed: 0 };
    flagged.forEach((f) => {
      c[f.status] += 1;
    });
    return c;
  }, [flagged]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flagged
      .filter((f) => (filter === "all" ? true : f.status === filter))
      .filter((f) =>
        q
          ? f.text.toLowerCase().includes(q) ||
            (f.sender?.name.toLowerCase().includes(q) ?? false)
          : true
      )
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [flagged, filter, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* info banner */}
      <div
        style={{
          background: "#FFF7ED",
          border: "1px solid #FED7AA",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13,
          color: "#9A3412",
        }}
      >
        Messages below were auto-detected as sharing a phone number, which isn't
        allowed. When a message like this is sent, the user is automatically
        warned in-app. Review each one, or block the whole conversation.
      </div>

      {/* toolbar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  border: "1px solid",
                  borderColor: active ? "#EA580C" : "#E2E8F0",
                  background: active ? "#FFF4EE" : "#fff",
                  color: active ? "#EA580C" : "#475569",
                  borderRadius: 8,
                  padding: "7px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {f.label} ({counts[f.key]})
              </button>
            );
          })}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search message or sender…"
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            minWidth: 240,
            outline: "none",
          }}
        />
      </div>

      {rows.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: "center", color: "#64748B" }}>
          No flagged messages{filter !== "all" ? ` with status “${filter}”` : ""}.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((f) => {
            const busy = busyIds.has(f.messageId);
            return (
              <div key={f.messageId} style={{ ...cardStyle, padding: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <Avatar participant={f.sender} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>
                        {f.sender?.name ?? "Unknown user"}
                      </span>
                      {f.sender && <UserTypePill userType={f.sender.userType} />}
                      <FlagStatusBadge status={f.status} />
                      <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: "auto" }}>
                        {formatDateTime(f.createdAt)}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        background: "#FEF2F2",
                        border: "1px solid #FCA5A5",
                        borderRadius: 10,
                        padding: "10px 12px",
                        fontSize: 14,
                        color: "#1E293B",
                        wordBreak: "break-word",
                      }}
                    >
                      <HighlightedText text={f.text} matches={f.matches} />
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, color: "#64748B" }}>
                      Detected: {f.matches.map((m) => `“${m}”`).join(", ")}
                    </div>

                    {/* actions */}
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        opacity: busy ? 0.6 : 1,
                        pointerEvents: busy ? "none" : "auto",
                      }}
                    >
                      <button
                        style={actionBtn}
                        onClick={() => onOpenConversation(f.conversationId)}
                      >
                        <Icon icon={FiEye} size={14} /> View chat
                      </button>
                      {f.status !== "reviewed" && (
                        <button
                          style={{ ...actionBtn, color: "#15803D", borderColor: "#BBF7D0" }}
                          onClick={() => onSetStatus(f, "reviewed")}
                        >
                          <Icon icon={FiCheck} size={14} /> Mark reviewed
                        </button>
                      )}
                      {f.status !== "dismissed" ? (
                        <button
                          style={actionBtn}
                          onClick={() => onSetStatus(f, "dismissed")}
                        >
                          <Icon icon={FiSlash} size={14} /> Dismiss
                        </button>
                      ) : (
                        <button
                          style={actionBtn}
                          onClick={() => onSetStatus(f, "pending")}
                        >
                          <Icon icon={FiRotateCcw} size={14} /> Reopen
                        </button>
                      )}
                      <button
                        style={{ ...actionBtn, color: "#B91C1C", borderColor: "#FECACA" }}
                        onClick={() => onBlock(f)}
                      >
                        <Icon icon={FiSlash} size={14} /> Block conversation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FlaggedTab;
