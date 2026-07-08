export type SupportTicketStatus = "open" | "pending" | "in_progress" | "resolved" | "closed" | string;
export type SupportTicketPriority = "low" | "normal" | "high" | "urgent" | string;

export interface SupportTicketUser {
  id: string;
  name: string;
  imageUrl: string | null;
  phone: string | null;
  userType: string;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  userId: string | null;
  user: SupportTicketUser | null;
  description: string;
  attachmentPath: string | null;
  attachmentUrl: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: string;
  adminNotes: string;
  createdAt: string | null;
  updatedAt: string | null;
}
