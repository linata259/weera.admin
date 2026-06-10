import { supabase } from "services/supabaseClient";
import {
  WalletTransaction,
  EscrowTransaction,
  FinancialSummary,
  MonthlyRevenue,
  MonthlyCommission,
} from "../types";

const pf = (v: any) => parseFloat(v?.toString() ?? "0");
const joinName = (f: any, l: any) => [f, l].filter(Boolean).join(" ") || "—";

async function buildProfileMap(
  ids: string[],
): Promise<Map<string, { name: string; avatar: string | null }>> {
  if (!ids.length) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, image_url")
    .in("id", ids);
  return new Map(
    (data ?? []).map((p: any) => [
      p.id,
      {
        name: joinName(p.first_name, p.last_name),
        avatar: p.image_url ?? null,
      },
    ]),
  );
}

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

export async function fetchTransactions(): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select(
      "id,user_id,wallet_id,type,amount,status,description,reference,related_job_id,created_at,updated_at",
    )
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  const userIds = Array.from(
    new Set(data.map((r: any) => r.user_id).filter(Boolean)),
  ) as string[];
  const jobIds = Array.from(
    new Set(data.map((r: any) => r.related_job_id).filter(Boolean)),
  ) as string[];
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
      jobTitle: r.related_job_id
        ? (jobMap.get(r.related_job_id) ?? null)
        : null,
    }),
  );
}

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

export async function fetchEscrowTransactions(): Promise<EscrowTransaction[]> {
  const { data, error } = await supabase
    .from("escrow_transactions")
    .select(
      "id,client_id,bidder_id,bid_id,job_id,amount,service_fee,total_charged,status,created_at,released_at,refunded_at,notes",
    )
    .order("created_at", { ascending: false });
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

export async function approveWithdrawal(id: string): Promise<void> {
  await supabase
    .from("wallet_transactions")
    .update({ status: "completed" })
    .eq("id", id);
}
export const fetchMonthlyCommission = async (): Promise<MonthlyCommission[]> => {
  const { data, error } = await supabase
    .from('monthly_commission')   // adjust to your actual table/view name
    .select('month, commission, fee_rate')
    .order('month', { ascending: true });

  if (error) {
    console.error('Supabase error (monthly_commission):', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    month: row.month as string,
    commission: row.commission as number,
    feeRate: row.fee_rate as number | undefined,
  }));
};
