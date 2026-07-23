export type NotificationCategory =
  | 'user_signup'
  | 'withdrawal_request'
  | 'support_ticket_open'
  | 'support_ticket_urgent'
  | 'new_job'
  | 'escrow_dispute'
  | 'job_report'
  | 'message_report'
  | 'report_reply';

export interface AdminNotification {
  /** Deterministic ID so the same event always maps to the same notification */
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** ID of the underlying entity (user id, job id, ticket id, etc.) */
  referenceId: string;
  /** Route to navigate to when clicked */
  href: string;
  createdAt: string;
  isRead: boolean;
}
