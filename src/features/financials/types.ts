/* ─── Financial module types ─────────────────────────────────── */

export interface WalletTransaction {
  id: string;
  userId: string;
  walletId: number;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  reference: string | null;
  relatedJobId: string | null;
  createdAt: string;
  updatedAt: string;
  /* joined */
  userName: string;
  userAvatar: string | null;
  jobTitle: string | null;
}

export interface EscrowTransaction {
  id: string;
  clientId: string;
  bidderId: string;
  bidId: string;
  jobId: string;
  amount: number;
  serviceFee: number;
  totalCharged: number;
  status: string;
  createdAt: string;
  releasedAt: string | null;
  refundedAt: string | null;
  notes: string | null;
  /* joined */
  jobTitle: string | null;
  clientName: string;
  clientAvatar: string | null;
  bidderName: string;
  bidderAvatar: string | null;
}

export interface FinancialSummary {
  totalRevenue: number;
  fundsInEscrow: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
  newDeposits: number;
   pendingRefundsCount?: number;
  pendingRefundsAmount?: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  escrow: number;
}
export interface MonthlyCommission {
  month: string;        // e.g. "Jan", "Feb"
  commission: number;   // platform fee earned
  feeRate?: number;     // optional — e.g. 5 (for 5%)
}

export type WithdrawalStatus =
  | 'queued'
  | 'processing'
  | 'dispatched'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Backed by public.admin_withdrawal_queue (a view over withdrawal_requests,
// security_invoker so admins see every row and regular users would only see
// their own — this dashboard always calls it as an admin).
export interface WithdrawalRequest {
  id: string;
  reference: string;
  userId: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  phoneNumber: string;
  status: WithdrawalStatus;
  scheduledFor: string;
  hoursUntilDue: number;
  requestedAt: string;
  dispatchedAt: string | null;
  settledAt: string | null;
  attempts: number;
  failureReason: string | null;
  /* set when this request was created by admin_retry_withdrawal to replace a
     failed one; alreadyRetried is the reverse view — this request has a
     replacement, so retrying it again would only raise. */
  retryOf: string | null;
  alreadyRetried: boolean;
  /* joined */
  userName: string;
  userAvatar: string | null;
}

export interface RefundRequest {
  id: string;
  reference?: string;
  clientName: string;
  clientAvatar?: string | null;
  freelancerName: string;
  jobTitle: string;
  amount: number;
  reason: 'cancelled' | 'dispute' | 'work_rejected' | 'other';
  requestedAt: string;
  status: 'pending';
}