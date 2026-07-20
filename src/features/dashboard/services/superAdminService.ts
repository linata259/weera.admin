import { supabase } from "services/supabaseClient";

/* ── Types ──────────────────────────────────────────────────── */

export interface KpiTrend {
  changePercent: number;
  direction: "up" | "down" | "flat";
}

export interface SuperAdminKpis {
  /** all-time money into Weera's account */
  totalRevenue: number;
  revenueTrend: KpiTrend;
  /** all-time platform fees (10%) */
  platformFees: number;
  feesTrend: KpiTrend;
  /** true when fees are estimated as 10% (no platform_fee transactions yet) */
  feesEstimated: boolean;
  totalUsers: number;
  usersTrend: KpiTrend;
  totalJobs: number;
  jobsTrend: KpiTrend;
  totalBids: number;
  bidsTrend: KpiTrend;
  healthScore: number; // 0–100
  openIssues: number;
  issuesTrend: KpiTrend;
  fundsInEscrow: number;
}

export interface RevenueTrendPoint {
  label: string; // "Jan"
  revenue: number;
  payouts: number; // escrow released to freelancers
}

export type ServiceStatus = "Operational" | "Degraded" | "Down";

export interface SystemStatusItem {
  name: string;
  status: ServiceStatus;
  latencyMs: number | null;
}

export interface ModuleIssue {
  module: string;
  count: number;
  critical: boolean;
}

export interface SuperAdminData {
  kpis: SuperAdminKpis;
  revenueTrend: RevenueTrendPoint[];
  systemStatus: SystemStatusItem[];
  topIssues: ModuleIssue[];
}

/* ── Helpers ────────────────────────────────────────────────── */

// Money entering Weera's account. In production data this is escrow_lock
// (client funds locked when a job is funded); deposit/milestone_payment are
// included in case those flows are added later.
const REVENUE_TYPES = ["escrow_lock", "deposit", "milestone_payment"];
// mirrors the Financials module: real platform_fee rows when they exist,
// otherwise estimated at 10% of revenue
const PLATFORM_FEE_RATE = 0.1;

const pf = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const trend = (current: number, previous: number): KpiTrend => {
  if (previous <= 0) {
    return current > 0
      ? { changePercent: 100, direction: "up" }
      : { changePercent: 0, direction: "flat" };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    changePercent: Math.round(Math.abs(pct) * 10) / 10,
    direction: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat",
  };
};

const safeCount = async (build: (s: typeof supabase) => any): Promise<number> => {
  try {
    const { count, error } = await build(supabase);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
};

/**
 * Count rows filtered by status, tolerating schema differences:
 * if the status-filtered query 400s (e.g. no `status` column), fall back
 * to a plain row count; if the table itself doesn't exist, return 0.
 */
const issueCount = async (table: string, statuses: string[]): Promise<number> => {
  try {
    // select("*") — some tables (e.g. chat_flags) have no `id` column,
    // and a head count doesn't need any specific column
    const filtered = await supabase
      .from(table)
      .select("*", { head: true, count: "exact" })
      .in("status", statuses);
    if (!filtered.error) return filtered.count ?? 0;

    const plain = await supabase
      .from(table)
      .select("*", { head: true, count: "exact" });
    if (!plain.error) return plain.count ?? 0;
    return 0;
  } catch {
    return 0;
  }
};

/** Probe a table with a head query; report latency + status */
const probe = async (
  name: string,
  table: string,
): Promise<SystemStatusItem> => {
  const t0 = performance.now();
  try {
    const { error } = await supabase
      .from(table)
      .select("*", { head: true, count: "exact" })
      .limit(1);
    const latencyMs = Math.round(performance.now() - t0);
    if (error) return { name, status: "Down", latencyMs: null };
    return {
      name,
      status: latencyMs > 1500 ? "Degraded" : "Operational",
      latencyMs,
    };
  } catch {
    return { name, status: "Down", latencyMs: null };
  }
};

/* ── Main fetch ─────────────────────────────────────────────── */

export async function fetchSuperAdminData(): Promise<SuperAdminData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // same day-of-month window in the previous month, for a fair MTD comparison
  const prevMonthSamePoint = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate(),
    now.getHours(),
  );
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    // revenue
    revenueRowsRes,
    // users
    totalUsers,
    usersThisMonth,
    usersPrevMonth,
    // jobs
    totalJobs,
    jobsThisMonth,
    jobsPrevMonth,
    // bids
    totalBids,
    bidsThisMonth,
    bidsPrevMonth,
    // issues
    jobReports,
    messageReports,
    openTickets,
    pendingWithdrawals,
    suspendedUsers,
    // escrow
    walletsRes,
    // health probes
    dbProbe,
    authProbe,
    paymentsProbe,
    chatProbe,
    supportProbe,
    rolesProbe,
  ] = await Promise.all([
    // no date window — revenue cards are all-time totals; the chart
    // buckets only the last 12 months from the same rows
    supabase
      .from("wallet_transactions")
      .select("amount, type, status, created_at")
      .in("type", [...REVENUE_TYPES, "escrow_release", "platform_fee"]),

    safeCount((s) =>
      s.from("profiles").select("id", { head: true, count: "exact" })
        .or("role.is.null,role.neq.admin"),
    ),
    safeCount((s) =>
      s.from("profiles").select("id", { head: true, count: "exact" })
        .or("role.is.null,role.neq.admin")
        .gte("created_at", monthStart.toISOString()),
    ),
    safeCount((s) =>
      s.from("profiles").select("id", { head: true, count: "exact" })
        .or("role.is.null,role.neq.admin")
        .gte("created_at", prevMonthStart.toISOString())
        .lt("created_at", prevMonthSamePoint.toISOString()),
    ),

    safeCount((s) =>
      s.from("jobs").select("id", { head: true, count: "exact" }),
    ),
    safeCount((s) =>
      s.from("jobs").select("id", { head: true, count: "exact" })
        .gte("posted_at", monthStart.toISOString()),
    ),
    safeCount((s) =>
      s.from("jobs").select("id", { head: true, count: "exact" })
        .gte("posted_at", prevMonthStart.toISOString())
        .lt("posted_at", prevMonthSamePoint.toISOString()),
    ),

    safeCount((s) =>
      s.from("bids").select("id", { head: true, count: "exact" }),
    ),
    safeCount((s) =>
      s.from("bids").select("id", { head: true, count: "exact" })
        .gte("submitted_at", monthStart.toISOString()),
    ),
    safeCount((s) =>
      s.from("bids").select("id", { head: true, count: "exact" })
        .gte("submitted_at", prevMonthStart.toISOString())
        .lt("submitted_at", prevMonthSamePoint.toISOString()),
    ),

    issueCount("job_reports", ["pending"]),
    // chat moderation queue: chat_flags is the real table; fall back to
    // message_reports for older schemas
    issueCount("chat_flags", ["pending", "flagged"]).then(
      (n) => n || issueCount("message_reports", ["pending"]),
    ),
    issueCount("support_tickets", ["open", "pending", "in_progress"]),
    safeCount((s) =>
      s.from("wallet_transactions").select("id", { head: true, count: "exact" })
        .eq("type", "withdrawal").eq("status", "pending"),
    ),
    safeCount((s) =>
      s.from("profiles").select("id", { head: true, count: "exact" })
        .eq("is_active", false),
    ),

    supabase.from("wallets").select("escrow_balance"),

    probe("Database Cluster", "profiles"),
    probe("Auth Service", "roles"),
    probe("Payment Gateway", "wallet_transactions"),
    probe("Chat Service", "messages"),
    probe("Support Desk", "support_tickets"),
    probe("Roles & Access", "role_permissions"),
  ]);

  /* revenue: MTD + previous-month-to-same-point + 12-month trend */
  const revenueRows = ((revenueRowsRes.data ?? []) as any[]).filter(
    (r) => r.status === "completed" || r.status == null,
  );

  let totalRevenue = 0;
  let totalFees = 0;
  let revenueMtd = 0;
  let revenuePrevMtd = 0;
  const hasRealFees = revenueRows.some((r) => r.type === "platform_fee");
  const byMonth = new Map<string, { revenue: number; payouts: number }>();

  for (const r of revenueRows) {
    const created = new Date(r.created_at);
    const amount = pf(r.amount);

    // chart buckets: last 12 months only
    if (created >= yearAgo) {
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      if (!byMonth.has(key)) byMonth.set(key, { revenue: 0, payouts: 0 });
      const bucket = byMonth.get(key)!;
      if (REVENUE_TYPES.includes(r.type)) bucket.revenue += amount;
      else if (r.type === "escrow_release") bucket.payouts += amount;
    }

    if (r.type === "platform_fee") {
      totalFees += amount;
    } else if (REVENUE_TYPES.includes(r.type)) {
      totalRevenue += amount;
      if (created >= monthStart) revenueMtd += amount;
      else if (created >= prevMonthStart && created < prevMonthSamePoint)
        revenuePrevMtd += amount;
    }
  }

  // no real fee transactions yet → estimate at 10% of money in
  if (!hasRealFees) totalFees = totalRevenue * PLATFORM_FEE_RATE;

  const revenueTrendSeries: RevenueTrendPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(yearAgo.getFullYear(), yearAgo.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byMonth.get(key) ?? { revenue: 0, payouts: 0 };
    revenueTrendSeries.push({
      label: d.toLocaleString("en", { month: "short" }),
      revenue: Math.round(bucket.revenue * 100) / 100,
      payouts: Math.round(bucket.payouts * 100) / 100,
    });
  }

  /* health score = share of probes that are operational */
  const probes = [dbProbe, authProbe, paymentsProbe, chatProbe, supportProbe, rolesProbe];
  const okCount = probes.filter((p) => p.status === "Operational").length;
  const degradedCount = probes.filter((p) => p.status === "Degraded").length;
  const healthScore =
    Math.round(((okCount + degradedCount * 0.5) / probes.length) * 1000) / 10;

  const openIssues = jobReports + messageReports + openTickets;
  const infraIssues = probes.filter((p) => p.status !== "Operational").length;

  const topIssues: ModuleIssue[] = [
    { module: "Jobs", count: jobReports, critical: false },
    { module: "Payments", count: pendingWithdrawals, critical: false },
    { module: "Users / KYC", count: suspendedUsers, critical: false },
    { module: "Support Tickets", count: openTickets, critical: false },
    { module: "Chat Moderation", count: messageReports, critical: false },
    { module: "Platform / Infra", count: infraIssues, critical: infraIssues > 0 },
  ];

  return {
    kpis: {
      totalRevenue,
      revenueTrend: trend(revenueMtd, revenuePrevMtd),
      platformFees: totalFees,
      feesTrend: trend(revenueMtd, revenuePrevMtd), // fees track revenue
      feesEstimated: !hasRealFees,
      totalUsers,
      usersTrend: trend(usersThisMonth, usersPrevMonth),
      totalJobs,
      jobsTrend: trend(jobsThisMonth, jobsPrevMonth),
      totalBids,
      bidsTrend: trend(bidsThisMonth, bidsPrevMonth),
      healthScore,
      openIssues,
      issuesTrend: { changePercent: 0, direction: "flat" },
      fundsInEscrow: ((walletsRes.data ?? []) as any[]).reduce(
        (s, r) => s + pf(r.escrow_balance),
        0,
      ),
    },
    revenueTrend: revenueTrendSeries,
    systemStatus: probes,
    topIssues,
  };
}
