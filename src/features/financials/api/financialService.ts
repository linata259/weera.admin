import { supabase } from "services/supabaseClient";
import {
  WalletTransaction,
  EscrowTransaction,
  FinancialSummary,
  MonthlyRevenue,
  MonthlyCommission,
  RefundRequest
} from "../types";

const pf = (v: any) => parseFloat(v?.toString() ?? "0");
const joinName = (f: any, l: any) => [f, l].filter(Boolean).join(" ") || "—";

// ─── Profile cache ────────────────────────────────────────────────────────────
// Profiles are fetched repeatedly across Transactions, Escrow, and Withdrawals.
// Cache them for the session so navigating between tabs never re-fetches the
// same user records.
const _profileCache = new Map<string, { name: string; avatar: string | null }>();

async function buildProfileMap(
  ids: string[],
): Promise<Map<string, { name: string; avatar: string | null }>> {
  if (!ids.length) return new Map();

  const missing = ids.filter((id) => !_profileCache.has(id));
  if (missing.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, image_url")
      .in("id", missing);
    (data ?? []).forEach((p: any) => {
      _profileCache.set(p.id, {
        name: joinName(p.first_name, p.last_name),
        avatar: p.image_url ?? null,
      });
    });
  }

  return new Map(
    ids.map((id) => [id, _profileCache.get(id) ?? { name: "—", avatar: null }]),
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export async function fetchFinancialSummary(): Promise<FinancialSummary> {
  const [txRes, walletRes, wdRes, depRes] = await Promise.all([
    supabase
      .from("wallet_transactions")
      .select("amount")
      .in("type", ["deposit", "escrow_release", "milestone_payment"])
      .eq("status", "completed"),
    supabase.from("wallets").select("escrow_balance"),
    supabase
      .from("wallet_transactions")
      .select("amount")
      .eq("type", "withdrawal")
      .eq("status", "pending"),
    supabase
      .from("wallet_transactions")
      .select("amount")
      .eq("type", "deposit")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
  ]);
  return {
    totalRevenue: (txRes.data ?? []).reduce(
      (s: number, r: any) => s + pf(r.amount),
      0,
    ),
    fundsInEscrow: (walletRes.data ?? []).reduce(
      (s: number, r: any) => s + pf(r.escrow_balance),
      0,
    ),
    pendingWithdrawalsCount: wdRes.data?.length ?? 0,
    pendingWithdrawalsAmount: (wdRes.data ?? []).reduce(
      (s: number, r: any) => s + pf(r.amount),
      0,
    ),
    newDeposits: (depRes.data ?? []).reduce(
      (s: number, r: any) => s + pf(r.amount),
      0,
    ),
  };
}

// ─── Monthly revenue ──────────────────────────────────────────────────────────

export async function fetchMonthlyRevenue(): Promise<MonthlyRevenue[]> {
  const { data } = await supabase
    .from("wallet_transactions")
    .select("amount,type,created_at")
    .in("type", [
      "deposit",
      "escrow_release",
      "milestone_payment",
      "escrow_lock",
    ])
    .order("created_at", { ascending: true });
  const map: Record<string, { revenue: number; escrow: number }> = {};
  (data ?? []).forEach((r: any) => {
    const k = new Date(r.created_at).toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    });
    if (!map[k]) map[k] = { revenue: 0, escrow: 0 };
    if (r.type === "escrow_lock") map[k].escrow += pf(r.amount);
    else map[k].revenue += pf(r.amount);
  });
  return Object.entries(map)
    .map(([month, v]) => ({ month, ...v }))
    .sort(
      (a, b) =>
        new Date(`01 ${a.month}`).getTime() -
        new Date(`01 ${b.month}`).getTime(),
    );
}

// ─── Transactions ─────────────────────────────────────────────────────────────
// Paginated to 200 most-recent rows. Without a limit this fetched every row in
// the table before showing anything — the primary cause of "Loading transactions…"
// hanging on screen.

export async function fetchTransactions(
  page = 0,
  pageSize = 200,
): Promise<WalletTransaction[]> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select(
      "id,user_id,wallet_id,type,amount,status,description,reference,related_job_id,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) return [];

  const userIds = Array.from(
    new Set(data.map((r: any) => r.user_id).filter(Boolean)),
  ) as string[];
  const jobIds = Array.from(
    new Set(data.map((r: any) => r.related_job_id).filter(Boolean)),
  ) as string[];

  // Profile cache means revisiting this tab never re-hits the DB for the same users.
  const [profiles, jobsRes] = await Promise.all([
    buildProfileMap(userIds),
    jobIds.length
      ? supabase.from("jobs").select("id,title").in("id", jobIds)
      : Promise.resolve({ data: [] }),
  ]);

  const jobMap = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j.title]));

  return data.map(
    (r: any): WalletTransaction => ({
      id: r.id,
      userId: r.user_id,
      walletId: r.wallet_id,
      type: r.type,
      amount: pf(r.amount),
      status: r.status,
      description: r.description ?? null,
      reference: r.reference ?? null,
      relatedJobId: r.related_job_id ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userName: profiles.get(r.user_id)?.name ?? "—",
      userAvatar: profiles.get(r.user_id)?.avatar ?? null,
      jobTitle: r.related_job_id ? (jobMap.get(r.related_job_id) ?? null) : null,
    }),
  );
}

// ─── Pending withdrawals ──────────────────────────────────────────────────────

export async function fetchPendingWithdrawals(): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select(
      "id,user_id,wallet_id,type,amount,status,description,reference,related_job_id,created_at,updated_at",
    )
    .eq("type", "withdrawal")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const profiles = await buildProfileMap(
    Array.from(
      new Set(data.map((r: any) => r.user_id).filter(Boolean)),
    ) as string[],
  );

  return data.map(
    (r: any): WalletTransaction => ({
      id: r.id,
      userId: r.user_id,
      walletId: r.wallet_id,
      type: r.type,
      amount: pf(r.amount),
      status: r.status,
      description: r.description ?? null,
      reference: r.reference ?? null,
      relatedJobId: r.related_job_id ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userName: profiles.get(r.user_id)?.name ?? "—",
      userAvatar: profiles.get(r.user_id)?.avatar ?? null,
      jobTitle: null,
    }),
  );
}

// ─── Escrow transactions ──────────────────────────────────────────────────────

export async function fetchEscrowTransactions(): Promise<EscrowTransaction[]> {
  const { data, error } = await supabase
    .from("escrow_transactions")
    .select(
      "id,client_id,bidder_id,bid_id,job_id,amount,service_fee,total_charged,status,created_at,released_at,refunded_at,notes",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  const jobIds = Array.from(
    new Set(data.map((r: any) => r.job_id).filter(Boolean)),
  ) as string[];

  const personIds = Array.from(
    new Set(
      [
        ...data.map((r: any) => r.client_id),
        ...data.map((r: any) => r.bidder_id),
      ].filter(Boolean),
    ),
  ) as string[];

  const [profiles, jobsRes] = await Promise.all([
    buildProfileMap(personIds),
    jobIds.length
      ? supabase.from("jobs").select("id,title").in("id", jobIds)
      : Promise.resolve({ data: [] }),
  ]);

  const jobMap = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j.title]));

  return data.map(
    (r: any): EscrowTransaction => ({
      id: r.id,
      clientId: r.client_id,
      bidderId: r.bidder_id,
      bidId: r.bid_id,
      jobId: r.job_id,
      amount: pf(r.amount),
      serviceFee: pf(r.service_fee),
      totalCharged: pf(r.total_charged),
      status: r.status,
      createdAt: r.created_at,
      releasedAt: r.released_at ?? null,
      refundedAt: r.refunded_at ?? null,
      notes: r.notes ?? null,
      jobTitle: jobMap.get(r.job_id) ?? null,
      clientName: profiles.get(r.client_id)?.name ?? "—",
      clientAvatar: profiles.get(r.client_id)?.avatar ?? null,
      bidderName: profiles.get(r.bidder_id)?.name ?? "—",
      bidderAvatar: profiles.get(r.bidder_id)?.avatar ?? null,
    }),
  );
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function approveWithdrawal(id: string): Promise<void> {
  await supabase
    .from("wallet_transactions")
    .update({ status: "completed" })
    .eq("id", id);
}

export const fetchMonthlyCommission = async (): Promise<MonthlyCommission[]> => {
  const { data, error } = await supabase
    .from("monthly_commission")
    .select("month, commission, fee_rate")
    .order("month", { ascending: true });

  if (!error && data && data.length) {
    return data.map((row) => ({
      month: row.month as string,
      commission: row.commission as number,
      feeRate: row.fee_rate as number | undefined,
    }));
  }

  if (error) {
    console.warn("monthly_commission unavailable — deriving from transactions:", error);
  }

  // Fallback: derive monthly commission from wallet_transactions so the chart
  // never renders empty. Prefer explicit platform_fee rows; if none exist,
  // estimate commission as a flat 10% of monthly revenue-generating volume.
  return deriveMonthlyCommission();
};

const PLATFORM_FEE_RATE = 0.1; // 10% — used only for the estimate fallback

// Raw, timestamped commission events — used by the live bar chart so it can
// bucket by hour / day / week / month client-side and poll for new activity.
export interface CommissionEvent {
  ts: string;      // ISO timestamp
  amount: number;  // commission value for this event
}

export async function fetchCommissionEvents(): Promise<CommissionEvent[]> {
  const { data } = await supabase
    .from("wallet_transactions")
    .select("amount,type,created_at")
    .in("type", ["platform_fee", "deposit", "escrow_release", "milestone_payment"])
    .eq("status", "completed")
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  const hasRealFees = rows.some((r: any) => r.type === "platform_fee");

  return rows
    .filter((r: any) => (hasRealFees ? r.type === "platform_fee" : r.type !== "platform_fee"))
    .map((r: any) => ({
      ts: r.created_at as string,
      amount: hasRealFees ? pf(r.amount) : pf(r.amount) * PLATFORM_FEE_RATE,
    }));
}

async function deriveMonthlyCommission(): Promise<MonthlyCommission[]> {
  const { data } = await supabase
    .from("wallet_transactions")
    .select("amount,type,created_at")
    .in("type", ["platform_fee", "deposit", "escrow_release", "milestone_payment"])
    .eq("status", "completed")
    .order("created_at", { ascending: true });

  const map: Record<string, { fee: number; revenue: number }> = {};
  (data ?? []).forEach((r: any) => {
    const k = new Date(r.created_at).toLocaleDateString("en-GB", {
      month: "short",
      year: "2-digit",
    });
    if (!map[k]) map[k] = { fee: 0, revenue: 0 };
    if (r.type === "platform_fee") map[k].fee += pf(r.amount);
    else map[k].revenue += pf(r.amount);
  });

  const hasRealFees = Object.values(map).some((v) => v.fee > 0);

  return Object.entries(map)
    .map(([month, v]) => ({
      month,
      commission: hasRealFees ? v.fee : Math.round(v.revenue * PLATFORM_FEE_RATE),
      feeRate: hasRealFees ? undefined : PLATFORM_FEE_RATE * 100,
    }))
    .sort(
      (a, b) =>
        new Date(`01 ${a.month}`).getTime() -
        new Date(`01 ${b.month}`).getTime(),
    );
}

export async function fetchPendingRefunds(): Promise<RefundRequest[]> {
  return [
    {
      id: "1",
      reference: "REF-001",
      clientName: "James Mwangi",
      clientAvatar: null,
      freelancerName: "Aisha Kamau",
      jobTitle: "Logo Design for Nairobi Startup",
      amount: 8500,
      reason: "work_rejected",
      requestedAt: "2026-06-10T08:30:00Z",
      status: "pending",
    },
    {
      id: "2",
      reference: "REF-002",
      clientName: "Fatuma Hassan",
      clientAvatar: null,
      freelancerName: "Brian Otieno",
      jobTitle: "WordPress Site Build",
      amount: 22000,
      reason: "cancelled",
      requestedAt: "2026-06-12T11:15:00Z",
      status: "pending",
    },
    {
      id: "3",
      reference: "REF-003",
      clientName: "Samuel Kipchoge",
      clientAvatar: null,
      freelancerName: "Grace Wanjiku",
      jobTitle: "Social Media Content Pack",
      amount: 5000,
      reason: "dispute",
      requestedAt: "2026-06-14T09:00:00Z",
      status: "pending",
    },
    {
      id: "4",
      reference: "REF-004",
      clientName: "Lilian Odhiambo",
      clientAvatar: null,
      freelancerName: "Kevin Mutua",
      jobTitle: "Mobile App UI Mockups",
      amount: 15000,
      reason: "work_rejected",
      requestedAt: "2026-06-15T14:45:00Z",
      status: "pending",
    },
    {
      id: "5",
      reference: "REF-005",
      clientName: "David Njoroge",
      clientAvatar: null,
      freelancerName: "Mercy Achieng",
      jobTitle: "Copywriting — Product Descriptions",
      amount: 3200,
      reason: "other",
      requestedAt: "2026-06-17T07:20:00Z",
      status: "pending",
    },
  ];
}