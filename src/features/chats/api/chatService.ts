import { supabase } from "services/supabaseClient";
import { detectPhoneNumbers } from "../utils/phoneDetection";
import type {
  BlockedConversation,
  ChatMessage,
  ChatParticipant,
  ChatStats,
  Conversation,
  FlagStatus,
  FlaggedMessage,
} from "../types";

// Safety cap so a huge history can't hang the panel. Paged fetch below.
const MAX_MESSAGES = 20000;
const PAGE_SIZE = 1000;

// ---------------------------------------------------------------------------
// Real chat schema (mobile app):
//   messages(id, job_id, sender_id, receiver_id, conversation_key,
//            body, message_type, attachment_url, created_at, read_at)
// A conversation = a DM between two users about a job, keyed by
// conversation_key. There is no separate conversations table; we synthesize
// Conversation objects by grouping messages on conversation_key.
// The `id` field on Conversation / conversationId fields elsewhere therefore
// carry the conversation_key string.
// ---------------------------------------------------------------------------

interface RawMessage {
  id: string;
  job_id: string | null;
  sender_id: string | null;
  receiver_id: string | null;
  conversation_key: string;
  body: string | null;
  message_type: string | null;
  attachment_url: string | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

async function fetchAllRows<T = Record<string, unknown>>(
  table: string,
  columns: string,
  options: { order?: { column: string; ascending: boolean }; cap?: number } = {}
): Promise<T[]> {
  const cap = options.cap ?? Number.MAX_SAFE_INTEGER;
  const rows: T[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }
    const { data, error } = await query;
    if (error) {
      console.warn(`Supabase error fetching ${table}:`, error);
      break;
    }
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE || rows.length >= cap) break;
    from += PAGE_SIZE;
  }

  return rows;
}

const titleCase = (value: string): string =>
  value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const formatUserType = (value: string): string => {
  const n = value.trim().toLowerCase();
  if (n === "find work") return "Bidder";
  if (n === "hire talent") return "Client";
  return titleCase(value || "User");
};

const getStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => (v == null ? "" : String(v))).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value];
  return [];
};

const messageTypeOf = (raw: string | null): ChatMessage["type"] => {
  const t = (raw || "text").toLowerCase();
  if (t === "image" || t === "audio" || t === "file" || t === "system") return t;
  return "text";
};

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

async function fetchUserTypeMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("user_types").select("id, type");
  if (error) {
    console.warn("Supabase error fetching user_types:", error);
    return new Map();
  }
  return new Map(
    (data ?? []).map((row: any) => [row.id, formatUserType(row.type || "User")])
  );
}

async function fetchProfileMap(
  userIds: string[]
): Promise<Map<string, ChatParticipant>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return new Map();

  const userTypeMap = await fetchUserTypeMap();
  const map = new Map<string, ChatParticipant>();

  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, image_url, phone, user_type_id")
      .in("id", chunk);
    if (error) {
      console.warn("Supabase error fetching profiles:", error);
      continue;
    }
    for (const p of (data ?? []) as any[]) {
      const name =
        [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unknown User";
      const typeIds = getStringArray(p.user_type_id);
      const userType =
        typeIds.map((id) => userTypeMap.get(id)).find(Boolean) ?? "User";
      map.set(p.id, {
        id: p.id,
        name,
        imageUrl: p.image_url ?? null,
        phone: p.phone ?? null,
        userType,
      });
    }
  }

  return map;
}

/** Optional job labels for conversation context. Guarded — never throws. */
async function fetchJobTitleMap(jobIds: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(jobIds.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const map = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title")
      .in("id", chunk);
    if (error) {
      // jobs.title may not exist in every environment — silently skip labels.
      return map;
    }
    for (const j of (data ?? []) as any[]) {
      if (j.title) map.set(j.id, j.title);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Migration probe
// ---------------------------------------------------------------------------

/**
 * Whether the moderation migration has been applied. chat_flags only exists
 * after it runs, so a relation/permission error is a reliable "not applied yet"
 * signal — distinct from a valid-but-empty response.
 */
async function isMigrationApplied(): Promise<boolean> {
  const { error } = await supabase
    .from("chat_flags")
    .select("message_id", { head: true, count: "exact" });
  return !error;
}

// ---------------------------------------------------------------------------
// Aggregate load
// ---------------------------------------------------------------------------

export interface ChatModerationData {
  conversations: Conversation[];
  flagged: FlaggedMessage[];
  blocked: BlockedConversation[];
  stats: ChatStats;
  migrationApplied: boolean;
}

export async function fetchChatModerationData(): Promise<ChatModerationData> {
  const migrationApplied = await isMigrationApplied();

  const [messageRows, flagRows, blockedRows] = await Promise.all([
    fetchAllRows<RawMessage>(
      "messages",
      "id, job_id, sender_id, receiver_id, conversation_key, body, message_type, attachment_url, created_at",
      { order: { column: "created_at", ascending: false }, cap: MAX_MESSAGES }
    ),
    migrationApplied
      ? fetchAllRows<any>(
          "chat_flags",
          "message_id, conversation_key, sender_id, status, reviewed_at, matched_text"
        )
      : Promise.resolve([] as any[]),
    migrationApplied
      ? fetchAllRows<any>(
          "chat_blocked_conversations",
          "conversation_key, blocked_by, reason, created_at"
        )
      : Promise.resolve([] as any[]),
  ]);

  // profile + job label maps
  const userIds: string[] = [];
  const jobIds: string[] = [];
  messageRows.forEach((m) => {
    if (m.sender_id) userIds.push(m.sender_id);
    if (m.receiver_id) userIds.push(m.receiver_id);
    if (m.job_id) jobIds.push(m.job_id);
  });
  const [profileMap, jobTitleMap] = await Promise.all([
    fetchProfileMap(userIds),
    fetchJobTitleMap(jobIds),
  ]);

  const flagByMessage = new Map<string, any>(flagRows.map((f) => [f.message_id, f]));
  const blockedSet = new Set<string>(blockedRows.map((b) => b.conversation_key));

  // Group messages into conversations by conversation_key. messageRows are
  // ordered newest-first, so the first time we see a key is its latest message.
  interface ConvAccum {
    key: string;
    jobId: string | null;
    participantIds: Set<string>;
    messageCount: number;
    flaggedCount: number;
    lastMessageAt: string | null;
    lastPreview: string | null;
  }
  const convMap = new Map<string, ConvAccum>();
  const flagged: FlaggedMessage[] = [];
  const typeCounts = new Map<string, number>();
  const perDay = new Map<string, { count: number; flagged: number }>();

  for (const m of messageRows) {
    const key = m.conversation_key;
    let acc = convMap.get(key);
    if (!acc) {
      acc = {
        key,
        jobId: m.job_id,
        participantIds: new Set<string>(),
        messageCount: 0,
        flaggedCount: 0,
        lastMessageAt: m.created_at,
        lastPreview:
          messageTypeOf(m.message_type) === "text"
            ? m.body ?? ""
            : `[${messageTypeOf(m.message_type)}]`,
      };
      convMap.set(key, acc);
    }
    acc.messageCount += 1;
    if (m.sender_id) acc.participantIds.add(m.sender_id);
    if (m.receiver_id) acc.participantIds.add(m.receiver_id);

    const type = messageTypeOf(m.message_type);
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);

    const day = (m.created_at ?? "").slice(0, 10);
    if (day) {
      const bucket = perDay.get(day) ?? { count: 0, flagged: 0 };
      bucket.count += 1;
      perDay.set(day, bucket);
    }

    if (type === "text" && m.body) {
      const matches = detectPhoneNumbers(m.body);
      if (matches.length > 0) {
        acc.flaggedCount += 1;
        if (day) perDay.get(day)!.flagged += 1;
        const record = flagByMessage.get(m.id);
        flagged.push({
          messageId: m.id,
          conversationId: key,
          senderId: m.sender_id,
          sender: m.sender_id ? profileMap.get(m.sender_id) ?? null : null,
          text: m.body,
          matches,
          createdAt: m.created_at,
          status: (record?.status as FlagStatus) ?? "pending",
          reviewedAt: record?.reviewed_at ?? null,
          conversationTitle: acc.jobId ? jobTitleMap.get(acc.jobId) ?? null : null,
        });
      }
    }
  }

  const conversations: Conversation[] = Array.from(convMap.values())
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""))
    .map((acc) => {
      const participants = Array.from(acc.participantIds)
        .map((id) => profileMap.get(id))
        .filter((p): p is ChatParticipant => Boolean(p));
      const jobTitle = acc.jobId ? jobTitleMap.get(acc.jobId) ?? null : null;
      return {
        id: acc.key,
        title: jobTitle,
        type: "dm",
        createdBy: null,
        createdAt: null,
        lastMessageAt: acc.lastMessageAt,
        participants,
        messageCount: acc.messageCount,
        lastMessagePreview: acc.lastPreview,
        flaggedCount: acc.flaggedCount,
        isBlocked: blockedSet.has(acc.key),
      };
    });

  const convById = new Map(conversations.map((c) => [c.id, c]));

  const blocked: BlockedConversation[] = blockedRows.map((b) => ({
    conversationId: b.conversation_key,
    conversation: convById.get(b.conversation_key) ?? null,
    reason: b.reason ?? null,
    blockedBy: b.blocked_by ?? null,
    createdAt: b.created_at ?? null,
  }));

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const activeConversations = conversations.filter(
    (c) => c.lastMessageAt && now - new Date(c.lastMessageAt).getTime() < sevenDays
  ).length;

  const messagesPerDay = Array.from(perDay.entries())
    .map(([date, v]) => ({ date, count: v.count, flagged: v.flagged }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  const stats: ChatStats = {
    totalConversations: conversations.length,
    totalMessages: messageRows.length,
    activeConversations,
    flaggedMessages: flagged.length,
    pendingFlags: flagged.filter((f) => f.status === "pending").length,
    blockedConversations: blocked.length,
    messagesByType: Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    messagesPerDay,
  };

  return { conversations, flagged, blocked, stats, migrationApplied };
}

// ---------------------------------------------------------------------------
// Read-only thread viewer (per conversation_key)
// ---------------------------------------------------------------------------

export async function fetchConversationThread(
  conversationKey: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, job_id, sender_id, receiver_id, conversation_key, body, message_type, attachment_url, created_at")
    .eq("conversation_key", conversationKey)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Supabase error fetching thread:", error);
    return [];
  }

  const rows = (data ?? []) as RawMessage[];
  const profileMap = await fetchProfileMap(
    rows.flatMap((r) => [r.sender_id, r.receiver_id]).filter(Boolean) as string[]
  );

  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_key,
    senderId: r.sender_id,
    sender: r.sender_id ? profileMap.get(r.sender_id) ?? null : null,
    type: messageTypeOf(r.message_type),
    text: r.body,
    attachmentUrl: r.attachment_url,
    createdAt: r.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Moderation actions
// ---------------------------------------------------------------------------

export async function setFlagStatus(
  flag: FlaggedMessage,
  status: FlagStatus
): Promise<boolean> {
  const { error } = await supabase.from("chat_flags").upsert(
    {
      message_id: flag.messageId,
      conversation_key: flag.conversationId,
      sender_id: flag.senderId,
      reason: "phone_number_shared",
      matched_text: flag.matches.join(", ").slice(0, 500),
      status,
      reviewed_at: new Date().toISOString(),
    },
    { onConflict: "message_id" }
  );
  if (error) {
    console.error("Supabase error updating chat_flags:", error);
    return false;
  }
  return true;
}

export async function blockConversation(
  conversationKey: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabase.from("chat_blocked_conversations").upsert(
    { conversation_key: conversationKey, reason },
    { onConflict: "conversation_key" }
  );
  if (error) {
    console.error("Supabase error blocking conversation:", error);
    return false;
  }
  return true;
}

export async function unblockConversation(
  conversationKey: string
): Promise<boolean> {
  const { error } = await supabase
    .from("chat_blocked_conversations")
    .delete()
    .eq("conversation_key", conversationKey);
  if (error) {
    console.error("Supabase error unblocking conversation:", error);
    return false;
  }
  return true;
}
