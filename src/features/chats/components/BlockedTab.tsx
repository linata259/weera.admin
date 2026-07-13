import React from "react";
import { FiEye, FiRotateCcw } from "react-icons/fi";
import type { BlockedConversation } from "../types";
import { Avatar, cardStyle, formatDateTime } from "./shared";

interface Props {
  blocked: BlockedConversation[];
  onUnblock: (conversationId: string) => void;
  onOpenConversation: (conversationId: string) => void;
  busyIds: Set<string>;
}

const Icon: React.FC<{ icon: (props: any) => any; size?: number }> = ({ icon, size }) => {
  const C = icon as React.ComponentType<{ size?: number }>;
  return <C size={size} />;
};

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

export const BlockedTab: React.FC<Props> = ({
  blocked,
  onUnblock,
  onOpenConversation,
  busyIds,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          background: "#F5F3FF",
          border: "1px solid #DDD6FE",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13,
          color: "#5B21B6",
        }}
      >
        Conversations you've blocked for policy violations. Blocking is an
        admin moderation record for review and reporting — unblock any time.
      </div>

      {blocked.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: "center", color: "#64748B" }}>
          No blocked conversations.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {blocked.map((b) => {
            const conv = b.conversation;
            const title =
              conv?.title ||
              conv?.participants.map((p) => p.name).join(", ") ||
              "Conversation";
            const busy = busyIds.has(b.conversationId);
            return (
              <div
                key={b.conversationId}
                style={{
                  ...cardStyle,
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", marginRight: 4 }}>
                  {(conv?.participants ?? []).slice(0, 3).map((p, i) => (
                    <div key={p.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                      <Avatar participant={p} size={34} />
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>{title}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    {conv ? `${conv.messageCount} messages · ${conv.flaggedCount} flagged · ` : ""}
                    Blocked {formatDateTime(b.createdAt)}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    opacity: busy ? 0.6 : 1,
                    pointerEvents: busy ? "none" : "auto",
                  }}
                >
                  {conv && (
                    <button style={actionBtn} onClick={() => onOpenConversation(b.conversationId)}>
                      <Icon icon={FiEye} size={14} /> View
                    </button>
                  )}
                  <button
                    style={{ ...actionBtn, color: "#15803D", borderColor: "#BBF7D0" }}
                    onClick={() => onUnblock(b.conversationId)}
                  >
                    <Icon icon={FiRotateCcw} size={14} /> Unblock
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BlockedTab;
