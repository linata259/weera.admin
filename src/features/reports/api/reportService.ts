import { supabase } from "services/supabaseClient";
import type {
  DisputeReportRow,
  JobPostingReportRow,
  PayoutReportRow,
  ReportUser,
  ReportsData,
  RevenueReportRow,
  TransactionReportRow,
  UserRegistrationReportRow,
} from "../types";

type AnyRow = Record<string, unknown>;

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: string | null;
  is_active: boolean | null;
  role: string | null;
  user_type_id: string[] | null;
  location_id: string[] | null;
};

type WalletTransactionRow = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  amount: number | string | null;
  status: string | null;
  type: string | null;
  user_id: string | null;
  description: string | null;
  reference: string | null;
};

type EscrowTransactionRow = {
  id: string;
  created_at: string | null;
  amount: number | string | null;
  status: string | null;
  client_id: string | null;
  bidder_id: string | null;
  job_id: string | null;
};

type JobReportRow = {
  id: string;
  created_at: string | null;
  status: string | null;
  job_id: string | null;
  reason: string | null;
};

type JobRow = {
  id: string;
  title: string | null;
  status: string | null;
  posted_at: string | null;
  created_at: string | null;
  budget: number | string | null;
  applicants: number | string | null;
  posted_by_user_id: string | null;
  posted_by_user_name: string | null;
  assigned_bidder_id: string | null;
  escrow_status: string | null;
};

const emptyReportsData: ReportsData = {
  transactions: [],
  platformRevenue: [],
  payouts: [],
  userRegistrations: [],
  jobPostings: [],
  disputes: [],
};

const getNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return 0;
};

const makeDisplayId = (id: string): string => {
  const digits = id.replace(/[^0-9]/g, "");
  if (digits) return digits.substring(0, 10).padStart(10, "0");
  return id.slice(0, 10);
};

const normalizeStatus = (value: string | null | undefined): string => {
  const status = (value || "pending").toLowerCase().trim();
  if (status === "success" || status === "paid" || status === "complete") return "completed";
  if (status === "failed" || status === "canceled") return "cancelled";
  if (status === "processing" || status === "in transit") return "in_transit";
  return status;
};

const titleCase = (value: string): string => {
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const makeReportUser = (
  profile: ProfileRow,
  userTypeMap: Map<string, string>,
  locationMap: Map<string, string>
): ReportUser => {
  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || "Unknown User";
  const userTypeIds = Array.isArray(profile.user_type_id) ? profile.user_type_id : [];
  const locationIds = Array.isArray(profile.location_id) ? profile.location_id : [];
  const userTypes = userTypeIds.map((id) => userTypeMap.get(id)).filter(Boolean);
  const locations = locationIds.map((id) => locationMap.get(id)).filter(Boolean);

  return {
    id: profile.id,
    name,
    email: "",
    imageUrl: profile.image_url ?? null,
    userType: userTypes[0] ? titleCase(userTypes[0] as string) : titleCase(profile.role ?? "User"),
    location: locations[0] ?? "-",
    createdAt: profile.created_at,
    status: profile.is_active === false ? "suspended" : "active",
  };
};

const fetchMap = async (
  table: string,
  valueColumn: string
): Promise<Map<string, string>> => {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.warn(`Supabase error fetching ${table}:`, error);
    return new Map();
  }

  return new Map(
    ((data ?? []) as unknown as AnyRow[]).map((row) => [
      String(row.id ?? ""),
      String(row[valueColumn] ?? ""),
    ])
  );
};

const isPayoutType = (type: string): boolean => {
  const normalized = type.toLowerCase();
  return (
    normalized.includes("payout") ||
    normalized.includes("withdraw") ||
    normalized.includes("cashout")
  );
};

const isRevenueType = (type: string, description: string): boolean => {
  const value = `${type} ${description}`.toLowerCase();
  return (
    value.includes("fee") ||
    value.includes("revenue") ||
    value.includes("commission") ||
    value.includes("connect") ||
    value.includes("membership")
  );
};

export const fetchReportsData = async (): Promise<ReportsData> => {
  const [
    locationMap,
    userTypeMap,
    profilesResult,
    jobsResult,
    walletResult,
    escrowResult,
    jobReportsResult,
  ] = await Promise.all([
    fetchMap("locations", "location"),
    fetchMap("user_types", "type"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, image_url, created_at, is_active, role, user_type_id, location_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, title, status, posted_at, created_at, budget, applicants, posted_by_user_id, posted_by_user_name, assigned_bidder_id, escrow_status")
      .order("posted_at", { ascending: false }),
    supabase
      .from("wallet_transactions")
      .select("id, created_at, updated_at, amount, status, type, user_id, description, reference")
      .order("created_at", { ascending: false }),
    supabase
      .from("escrow_transactions")
      .select("id, created_at, amount, status, client_id, bidder_id, job_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("job_reports")
      .select("id, created_at, status, job_id, reason")
      .order("created_at", { ascending: false }),
  ]);

  if (profilesResult.error) console.warn("Supabase error fetching profiles:", profilesResult.error);
  if (jobsResult.error) console.warn("Supabase error fetching jobs:", jobsResult.error);
  if (walletResult.error) console.warn("Supabase error fetching wallet_transactions:", walletResult.error);
  if (escrowResult.error) console.warn("Supabase error fetching escrow_transactions:", escrowResult.error);
  if (jobReportsResult.error) console.warn("Supabase error fetching job_reports:", jobReportsResult.error);

  const profiles = ((profilesResult.data ?? []) as ProfileRow[]).map((profile) =>
    makeReportUser(profile, userTypeMap, locationMap)
  );

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const jobs = (jobsResult.data ?? []) as JobRow[];
  const jobMap = new Map(jobs.map((job) => [job.id, job]));
  const walletTransactions = (walletResult.data ?? []) as WalletTransactionRow[];
  const escrowTransactions = (escrowResult.data ?? []) as EscrowTransactionRow[];
  const jobReports = (jobReportsResult.data ?? []) as JobReportRow[];

  const transactionRows: TransactionReportRow[] = [
    ...walletTransactions.map((row) => {
      const type = titleCase(row.type ?? "Wallet Transaction");
      const user = row.user_id ? profileMap.get(row.user_id) ?? null : null;

      return {
        id: `wallet-${row.id}`,
        transactionId: row.reference || makeDisplayId(row.id),
        dateTime: row.created_at,
        type,
        amount: getNumber(row.amount),
        payer: isPayoutType(type) ? null : user,
        recipient: isPayoutType(type) ? user : null,
        status: normalizeStatus(row.status),
      };
    }),
    ...escrowTransactions.map((row) => ({
      id: `escrow-${row.id}`,
      transactionId: makeDisplayId(row.id),
      dateTime: row.created_at,
      type: "Escrow",
      amount: getNumber(row.amount),
      payer: row.client_id ? profileMap.get(row.client_id) ?? null : null,
      recipient: row.bidder_id ? profileMap.get(row.bidder_id) ?? null : null,
      status: normalizeStatus(row.status),
    })),
  ];

  const platformRevenueRows: RevenueReportRow[] = walletTransactions
    .filter((row) => isRevenueType(row.type ?? "", row.description ?? ""))
    .map((row) => ({
      id: `revenue-${row.id}`,
      transactionId: row.reference || makeDisplayId(row.id),
      dateTime: row.created_at,
      revenueSource: titleCase(row.type ?? "Revenue"),
      amount: getNumber(row.amount),
      user: row.user_id ? profileMap.get(row.user_id) ?? null : null,
      description: row.description || titleCase(row.type ?? "Platform revenue"),
    }));

  const payoutRows: PayoutReportRow[] = walletTransactions
    .filter((row) => isPayoutType(row.type ?? ""))
    .map((row) => ({
      id: `payout-${row.id}`,
      payoutId: row.reference || makeDisplayId(row.id),
      dateTime: row.created_at,
      bidderId: row.user_id ? makeDisplayId(row.user_id) : "-",
      bidder: row.user_id ? profileMap.get(row.user_id) ?? null : null,
      amount: getNumber(row.amount),
      method: "Wallet",
      status: normalizeStatus(row.status),
    }));

  const userRegistrationRows: UserRegistrationReportRow[] = profiles.map((user) => ({
    id: user.id,
    userId: makeDisplayId(user.id),
    user,
    email: user.email || "-",
    registrationDate: user.createdAt,
    userType: user.userType,
    location: user.location,
    referralSource: "Direct",
  }));

  const jobPostingRows: JobPostingReportRow[] = jobs.map((job) => ({
    id: job.id,
    jobId: makeDisplayId(job.id),
    jobTitle: job.title || "Untitled Job",
    client: job.posted_by_user_id
      ? profileMap.get(job.posted_by_user_id) ?? null
      : null,
    postedDate: job.posted_at ?? job.created_at,
    budget: getNumber(job.budget),
    applicants: getNumber(job.applicants),
    status: normalizeStatus(job.status),
  }));

  const disputeRows: DisputeReportRow[] = jobReports.map((report) => {
    const job = report.job_id ? jobMap.get(report.job_id) : null;
    const client = job?.posted_by_user_id
      ? profileMap.get(job.posted_by_user_id) ?? null
      : null;

    return {
      id: report.id,
      reportId: makeDisplayId(report.id),
      jobId: report.job_id ? makeDisplayId(report.job_id) : "-",
      jobTitle: job?.title || "Unknown Job",
      reportedBy: client,
      reason: report.reason || "-",
      createdAt: report.created_at,
      status: normalizeStatus(report.status),
    };
  });

  return {
    ...emptyReportsData,
    transactions: transactionRows,
    platformRevenue: platformRevenueRows,
    payouts: payoutRows,
    userRegistrations: userRegistrationRows,
    jobPostings: jobPostingRows,
    disputes: disputeRows,
  };
};
