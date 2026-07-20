import { supabase } from "services/supabaseClient";
import { RevenueTrendPoint } from "./superAdminService";

/* ── Types ──────────────────────────────────────────────────── */

export interface FinanceKpis {
  fundsInEscrow: number;
  totalRevenue: number;
  platformFees: number;
  failedPayments: number;
  pendingWithdrawalsCount: number;
  pendingWithdrawalsAmount: number;
}

export interface StatusSlice {
  key: string; // completed | pending | failed | other
  label: string;
  amount: number;
  count: number;
  color: string;
}

export interface TransactionRow {
  id: string;
  type: string;
  status: string;
  amount: number;
  created_at: string;
}

export interface FinanceDashboardData {
  kpis: FinanceKpis;
  revenueTrend: RevenueTrendPoint[];
  statusBreakdown: StatusSlice[];
  transactions: TransactionRow[];
}

/* ── Helpers ────────────────────────────────────────────────── */

const MONEY_IN_TYPES = ["escrow_lock", "deposit", "milestone_payment"];
const PLATFORM_FEE_RATE = 0.1;

const pf = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normStatus = (s: string | null | undefined): string => {
  const v = (s ?? "").toLowerCase();
  if (["completed", "complete", "success", "succeeded"].includes(v)) return "completed";
  if (["pending", "processing", "in_progress"].includes(v)) return "pending";
  if (["failed", "declined", "error", "cancelled", "canceled"].includes(v)) return "failed";
  return v || "other";
};

/* ── Main fetch ─────────────────────────────────────────────── */

export async function fetchFinanceDashboardData(): Promise<FinanceDashboardData> {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [txRes, walletsRes] = await Promise.all([
    supabase
      .from("wallet_transactions")
      .select("id, amount, type, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("wallets").select("escrow_balance"),
  ]);
  const { data, error } = txRes;
  if (error) throw error;

  const fundsInEscrow = ((walletsRes.data ?? []) as any[]).reduce(
    (s, r) => s + pf(r.escrow_balance),
    0,
  );

  const rows = ((data ?? []) as any[]).map((r) => ({
    id: String(r.id),
    type: String(r.type ?? ""),
    status: String(r.status ?? ""),
    amount: pf(r.amount),
    created_at: String(r.created_at ?? ""),
  }));

  /* KPIs */
  let totalRevenue = 0;
  let realFees = 0;
  let hasRealFees = false;
  let failedPayments = 0;
  let pendingWithdrawalsCount = 0;
  let pendingWithdrawalsAmount = 0;

  /* chart + breakdown */
  const byMonth = new Map<string, { revenue: number; payouts: number }>();
  const byStatus = new Map<string, { amount: number; count: number }>();

  for (const r of rows) {
    const created = new Date(r.created_at);
    const status = normStatus(r.status);

    // status breakdown across all transactions
    if (!byStatus.has(status)) byStatus.set(status, { amount: 0, count: 0 });
    const slice = byStatus.get(status)!;
    slice.amount += r.amount;
    slice.count += 1;

    if (status === "failed") failedPayments += 1;
    if (r.type === "withdrawal" && status === "pending") {
      pendingWithdrawalsCount += 1;
      pendingWithdrawalsAmount += r.amount;
    }

    if (r.type === "platform_fee") {
      hasRealFees = true;
      if (status === "completed") realFees += r.amount;
      continue;
    }

    const isMoneyIn = MONEY_IN_TYPES.includes(r.type);
    const isCompleted = status === "completed";

    if (isMoneyIn && isCompleted) {
      totalRevenue += r.amount;
    }

    if (created >= yearAgo && isCompleted) {
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      if (!byMonth.has(key)) byMonth.set(key, { revenue: 0, payouts: 0 });
      const bucket = byMonth.get(key)!;
      if (isMoneyIn) bucket.revenue += r.amount;
      else if (r.type === "escrow_release" || r.type === "withdrawal")
        bucket.payouts += r.amount;
    }
  }

  const revenueTrend: RevenueTrendPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(yearAgo.getFullYear(), yearAgo.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byMonth.get(key) ?? { revenue: 0, payouts: 0 };
    revenueTrend.push({
      label: d.toLocaleString("en", { month: "short" }),
      revenue: Math.round(bucket.revenue * 100) / 100,
      payouts: Math.round(bucket.payouts * 100) / 100,
    });
  }

  const STATUS_META: Record<string, { label: string; color: string }> = {
    completed: { label: "Completed", color: "#16A34A" },
    pending: { label: "Pending", color: "#D97706" },
    failed: { label: "Failed / Declined", color: "#DC2626" },
  };
  const statusBreakdown: StatusSlice[] = Array.from(byStatus.entries())
    .map(([key, v]) => ({
      key,
      label: STATUS_META[key]?.label ?? key.charAt(0).toUpperCase() + key.slice(1),
      amount: Math.round(v.amount * 100) / 100,
      count: v.count,
      color: STATUS_META[key]?.color ?? "#64748B",
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    kpis: {
      fundsInEscrow,
      totalRevenue,
      platformFees: hasRealFees ? realFees : totalRevenue * PLATFORM_FEE_RATE,
      failedPayments,
      pendingWithdrawalsCount,
      pendingWithdrawalsAmount,
    },
    revenueTrend,
    statusBreakdown,
    transactions: rows.slice(0, 100),
  };
}
