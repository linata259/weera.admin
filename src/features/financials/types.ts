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
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  escrow: number;
}