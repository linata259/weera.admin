export type SupportTicketStatus = "open" | "pending" | "in_progress" | "resolved" | "closed" | string;

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
  status: SupportTicketStatus;
  createdAt: string | null;
  updatedAt: string | null;
}
