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