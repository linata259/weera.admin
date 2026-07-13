import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  ChatModerationData,
  blockConversation,
  fetchChatModerationData,
  setFlagStatus,
  unblockConversation,
} from "../api/chatService";
import type { Conversation, FlagStatus, FlaggedMessage } from "../types";
import OverviewTab from "../components/OverviewTab";
import FlaggedTab from "../components/FlaggedTab";
import BlockedTab from "../components/BlockedTab";
import ConversationThread from "../components/ConversationThread";

type TabKey = "overview" | "flagged" | "blocked";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "flagged", label: "Flagged" },
  { key: "blocked", label: "Blocked Chats" },
];

const EMPTY: ChatModerationData = {
  conversations: [],
  flagged: [],
  blocked: [],
  stats: {
    totalConversations: 0,
    totalMessages: 0,
    activeConversations: 0,
    flaggedMessages: 0,
    pendingFlags: 0,
    blockedConversations: 0,
    messagesByType: [],
    messagesPerDay: [],
  },
  migrationApplied: true,
};

const ChatsPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("overview");
  const [data, setData] = useState<ChatModerationData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [openConv, setOpenConv] = useState<Conversation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchChatModerationData();
      setData(result);
    } catch (e) {
      console.error("Chat moderation load failed:", e);
      toast.error("Unable to load chats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withBusy = async (id: string, fn: () => Promise<boolean>) => {
    setBusyIds((prev) => new Set(prev).add(id));
    const ok = await fn();
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    return ok;
  };

  const handleSetStatus = useCallback(
    async (flag: FlaggedMessage, status: FlagStatus) => {
      // optimistic
      setData((prev) => ({
        ...prev,
        flagged: prev.flagged.map((f) =>
          f.messageId === flag.messageId ? { ...f, status } : f
        ),
        stats: {
          ...prev.stats,
          pendingFlags: prev.flagged.filter(
            (f) =>
              (f.messageId === flag.messageId ? status : f.status) === "pending"
          ).length,
        },
      }));
      const ok = await withBusy(flag.messageId, () => setFlagStatus(flag, status));
      if (!ok) {
        toast.error("Couldn't save — is the migration applied?");
        load();
      }
    },
    [load]
  );

  const handleBlock = useCallback(
    async (flag: FlaggedMessage) => {
      const ok = await withBusy(flag.conversationId, () =>
        blockConversation(flag.conversationId, "Shared phone number")
      );
      if (ok) {
        toast.success("Conversation blocked.");
        load();
      } else {
        toast.error("Couldn't block conversation.");
      }
    },
    [load]
  );

  const handleUnblock = useCallback(
    async (conversationId: string) => {
      const ok = await withBusy(conversationId, () =>
        unblockConversation(conversationId)
      );
      if (ok) {
        toast.success("Conversation unblocked.");
        load();
      } else {
        toast.error("Couldn't unblock conversation.");
      }
    },
    [load]
  );

  const openConversationById = useCallback(
    (conversationId: string) => {
      const conv = data.conversations.find((c) => c.id === conversationId);
      if (conv) setOpenConv(conv);
    },
    [data.conversations]
  );

  const flaggedBadge = useMemo(
    () => data.stats.pendingFlags,
    [data.stats.pendingFlags]
  );

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      {/* header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>
          Chat Moderation
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "#64748B" }}>
          Analyse in-app conversations, review phone-number sharing, and manage
          blocked chats. This view is read-only for messages.
        </p>
      </div>

      {/* tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                border: "none",
                background: "transparent",
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                color: active ? "#EA580C" : "#64748B",
                borderBottom: `2px solid ${active ? "#EA580C" : "transparent"}`,
                marginBottom: -1,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {t.label}
              {t.key === "flagged" && flaggedBadge > 0 && (
                <span
                  style={{
                    background: "#FEE2E2",
                    color: "#B91C1C",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 7px",
                  }}
                >
                  {flaggedBadge}
                </span>
              )}
              {t.key === "blocked" && data.blocked.length > 0 && (
                <span
                  style={{
                    background: "#EDE9FE",
                    color: "#6D28D9",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 7px",
                  }}
                >
                  {data.blocked.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!data.migrationApplied && !loading && (
        <div
          style={{
            padding: "14px 16px",
            border: "1px solid #FCD34D",
            borderRadius: 10,
            color: "#92400E",
            background: "#FFFBEB",
            fontSize: 13.5,
            lineHeight: 1.5,
          }}
        >
          <strong>Chat moderation isn't switched on yet.</strong> Apply the{" "}
          <code>20260713120000_admin_chat_moderation</code> migration to your
          Supabase project (SQL Editor → paste → Run), then reload this page.
          Until then, admins can't read chats and moderation tables don't exist.
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E8EDF2",
            borderRadius: 16,
            padding: 48,
            color: "#64748B",
            textAlign: "center",
          }}
        >
          Loading chats…
        </div>
      ) : (
        <>
          {tab === "overview" && <OverviewTab stats={data.stats} />}
          {tab === "flagged" && (
            <FlaggedTab
              flagged={data.flagged}
              onSetStatus={handleSetStatus}
              onBlock={handleBlock}
              onOpenConversation={openConversationById}
              busyIds={busyIds}
            />
          )}
          {tab === "blocked" && (
            <BlockedTab
              blocked={data.blocked}
              onUnblock={handleUnblock}
              onOpenConversation={openConversationById}
              busyIds={busyIds}
            />
          )}
        </>
      )}

      {openConv && (
        <ConversationThread
          conversation={openConv}
          onClose={() => setOpenConv(null)}
        />
      )}
    </div>
  );
};

export default ChatsPage;
