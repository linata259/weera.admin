// Types for the admin Chat Moderation module.
// These mirror the mobile app's chat schema (conversations / messages) plus
// the two admin-only moderation tables added in the accompanying migration.

export type ChatMessageType = "text" | "image" | "audio" | "file" | "system";

export interface ChatParticipant {
  id: string;
  name: string;
  imageUrl: string | null;
  phone: string | null;
  userType: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  sender: ChatParticipant | null;
  type: ChatMessageType;
  text: string | null;
  attachmentUrl: string | null;
  createdAt: string | null;
}

export interface Conversation {
  id: string;
  title: string | null;
  type: "dm" | "group";
  createdBy: string | null;
  createdAt: string | null;
  lastMessageAt: string | null;
  participants: ChatParticipant[];
  messageCount: number;
  lastMessagePreview: string | null;
  flaggedCount: number;
  isBlocked: boolean;
}

export type FlagStatus = "pending" | "reviewed" | "dismissed";

// A flagged message = the underlying message joined with its moderation record.
export interface FlaggedMessage {
  messageId: string;
  conversationId: string;
  senderId: string | null;
  sender: ChatParticipant | null;
  text: string;
  matches: string[]; // the detected phone-number substrings
  createdAt: string | null;
  status: FlagStatus;
  reviewedAt: string | null;
  conversationTitle: string | null;
}

export interface BlockedConversation {
  conversationId: string;
  conversation: Conversation | null;
  reason: string | null;
  blockedBy: string | null;
  createdAt: string | null;
}

export interface ChatStats {
  totalConversations: number;
  totalMessages: number;
  activeConversations: number; // active in the last 7 days
  flaggedMessages: number;
  pendingFlags: number;
  blockedConversations: number;
  messagesByType: { type: string; count: number }[];
  messagesPerDay: { date: string; count: number; flagged: number }[];
}
