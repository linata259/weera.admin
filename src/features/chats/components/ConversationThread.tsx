import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { fetchConversationThread } from "../api/chatService";
import { detectPhoneNumbers } from "../utils/phoneDetection";
import type { ChatMessage, Conversation } from "../types";
import {
  Avatar,
  HighlightedText,
  PRIMARY,
  UserTypePill,
  formatDateTime,
} from "./shared";

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

const Icon: React.FC<{ icon: (props: any) => any; size?: number }> = ({ icon, size }) => {
  const C = icon as React.ComponentType<{ size?: number }>;
  return <C size={size} />;
};

// Read-only viewer. It never sends or edits — it only reads the thread.
export const ConversationThread: React.FC<Props> = ({ conversation, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchConversationThread(conversation.id)
      .then((data) => active && setMessages(data))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [conversation.id]);

  const title =
    conversation.title ||
    conversation.participants.map((p) => p.name).join(", ") ||
    "Conversation";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.45)" }}
      />
      <aside
        style={{
          position: "relative",
          width: "min(560px, 100%)",
          height: "100%",
          background: "#fff",
          boxShadow: "-8px 0 24px rgba(15,23,42,0.12)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{title}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
              {conversation.type === "dm" ? "Direct message" : "Group"} ·{" "}
              {conversation.messageCount} messages
              {conversation.flaggedCount > 0 && (
                <span style={{ color: "#B91C1C", fontWeight: 700 }}>
                  {" "}· {conversation.flaggedCount} flagged
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "#F1F5F9",
              borderRadius: 8,
              width: 34,
              height: 34,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#475569",
            }}
          >
            <Icon icon={FiX} size={18} />
          </button>
        </div>

        {/* participants */}
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {conversation.participants.map((p) => (
            <div
              key={p.id}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Avatar participant={p} size={24} />
              <span style={{ fontSize: 13, color: "#334155" }}>{p.name}</span>
              <UserTypePill userType={p.userType} />
            </div>
          ))}
        </div>

        {/* messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "#F8FAFC" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#64748B", padding: 40 }}>
              Loading conversation…
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94A3B8", padding: 40 }}>
              No messages in this conversation.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map((m) => {
                const matches = m.type === "text" ? detectPhoneNumbers(m.text) : [];
                return (
                  <div key={m.id} style={{ display: "flex", gap: 10 }}>
                    <Avatar participant={m.sender} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                          {m.sender?.name ?? "Unknown"}
                        </span>
                        <span style={{ fontSize: 11, color: "#94A3B8" }}>
                          {formatDateTime(m.createdAt)}
                        </span>
                        {matches.length > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#B91C1C",
                              background: "#FEE2E2",
                              borderRadius: 5,
                              padding: "1px 6px",
                            }}
                          >
                            PHONE SHARED
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          background: matches.length > 0 ? "#FEF2F2" : "#fff",
                          border: `1px solid ${matches.length > 0 ? "#FCA5A5" : "#E2E8F0"}`,
                          borderRadius: 10,
                          padding: "8px 12px",
                          fontSize: 14,
                          color: "#1E293B",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.type === "text" ? (
                          <HighlightedText text={m.text ?? ""} matches={matches} />
                        ) : m.type === "system" ? (
                          <em style={{ color: "#64748B" }}>{m.text || "System message"}</em>
                        ) : (
                          <a
                            href={m.attachmentUrl ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: PRIMARY, fontWeight: 600 }}
                          >
                            [{m.type}] attachment
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default ConversationThread;
