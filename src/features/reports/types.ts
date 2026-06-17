export type ReportTabId =
  | "transactions"
  | "platformRevenue"
  | "payouts"
  | "userRegistrations"
  | "jobPostings"
  | "disputes";

export type ReportStatus = "completed" | "cancelled" | "pending" | "in_transit" | "active" | string;

export interface ReportUser {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  userType: string;
  location: string;
  createdAt: string | null;
  status: string;
}

export interface TransactionReportRow {
  id: string;
  transactionId: string;
  dateTime: string | null;
  type: string;
  amount: number;
  payer: ReportUser | null;
  recipient: ReportUser | null;
  status: ReportStatus;
}

export interface RevenueReportRow {
  id: string;
  transactionId: string;
  dateTime: string | null;
  revenueSource: string;
  amount: number;
  user: ReportUser | null;
  description: string;
}

export interface PayoutReportRow {
  id: string;
  payoutId: string;
  dateTime: string | null;
  bidderId: string;
  bidder: ReportUser | null;
  amount: number;
  method: string;
  status: ReportStatus;
}

export interface UserRegistrationReportRow {
  id: string;
  userId: string;
  user: ReportUser;
  email: string;
  registrationDate: string | null;
  userType: string;
  location: string;
  referralSource: string;
}

export interface JobPostingReportRow {
  id: string;
  jobId: string;
  jobTitle: string;
  client: ReportUser | null;
  postedDate: string | null;
  budget: number;
  applicants: number;
  status: ReportStatus;
}

export interface DisputeReportRow {
  id: string;
  reportId: string;
  jobId: string;
  jobTitle: string;
  reportedBy: ReportUser | null;
  reason: string;
  createdAt: string | null;
  status: ReportStatus;
}

export interface ReportsData {
  transactions: TransactionReportRow[];
  platformRevenue: RevenueReportRow[];
  payouts: PayoutReportRow[];
  userRegistrations: UserRegistrationReportRow[];
  jobPostings: JobPostingReportRow[];
  disputes: DisputeReportRow[];
}

export type ReportRow =
  | TransactionReportRow
  | RevenueReportRow
  | PayoutReportRow
  | UserRegistrationReportRow
  | JobPostingReportRow
  | DisputeReportRow;
