import { supabase } from "services/supabaseClient";
import {
  WalletTransaction,
  EscrowTransaction,
  FinancialSummary,
  MonthlyRevenue,
  MonthlyCommission,
  RefundRequest,
  WithdrawalRequest,
} from "../types";

const pf = (v: any) => parseFloat(v?.toString() ?? "0");
const joinName = (f: any, l: any) => [f, l].filter(Boolean).join(" ") || "—";

/* ─── Windows and caps ────────────────────────────────────────────────────────
 *
 * Every chart on this page used to select its whole table — no date bound, no
 * limit — and then throw away everything older than the window it actually
 * draws. On a platform with a year of transactions that is the single biggest
 * cost of opening Financials, and none of it is visible: the daily chart keeps
 * 14 buckets, the weekly 8, the monthly 12. Twelve months covers all three
 * with room to spare, so that is what gets fetched.
 */
const CHART_MONTHS = 12;
/** Hard ceiling on an export or aggregate query. Beyond this an admin wants
 *  the database, not a spreadsheet the browser has to build in memory. */
const EXPORT_LIMIT = 5000;

function monthsAgoIso(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** A YYYY-MM-DD picker value covers the whole day, not the midnight instant.
 *  The old client-side filters compared against midnight and silently dropped
 *  everything that happened on the "to" date itself. */
const endOfDay = (d: string) => `${d}T23:59:59.999`;
const startOfDay = (d: string) => `${d}T00:00:00.000`;

/** PostgREST parses `or=(...)` as a comma-separated list, so a comma or a
 *  bracket typed into the search box would corrupt the filter rather than
 *  match nothing. Strip what the grammar owns; keep the rest verbatim. */
const sanitize = (q: string) => q.trim().replace(/[,()*"']/g, " ").trim();

/* ─── Paging contract ────────────────────────────────────────────────────── */

export interface PageParams {
  /** 1-based. */
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Must be a real database column — derived fields are not sortable server-side. */
  sortKey?: string;
  sortDir?: "asc" | "desc";
}

export interface Page<T> {
  rows: T[];
  /** Exact row count for the current filters, from the database. */
  total: number;
}

/* ─── Profile cache ──────────────────────────────────────────────────────────
 * Now only ever asked for one page of ids at a time (≤100) instead of every
 * user in a 500-row fetch.
 */
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

/** Names live in `profiles`, not on the transaction tables, so a search for a
 *  person is resolved to ids first and folded into the row query. Capped: a
 *  two-letter search should not become an `in.(…)` with 10,000 uuids. */
async function userIdsMatchingName(q: string, cap = 200): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .limit(cap);
  return ((data ?? []) as any[]).map((r) => r.id);
}

async function jobIdsMatchingTitle(q: string, cap = 200): Promise<string[]> {
  const { data } = await supabase
    .from("jobs")
    .select("id")
    .ilike("title", `%${q}%`)
    .limit(cap);
  return ((data ?? []) as any[]).map((r) => r.id);
}

/* ─── Summary ────────────────────────────────────────────────────────────── */

export async function fetchFinancialSummary(): Promise<FinancialSummary> {
  const since = monthsAgoIso(CHART_MONTHS);
  const [txRes, walletRes, wdRes, depRes] = await Promise.all([
    supabase
      .from("wallet_transactions")
      .select("amount")
      .in("type", ["deposit", "escrow_release", "milestone_payment"])
      .eq("status", "completed")
      .gte("created_at", since),
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

/* ─── Chart feeds (all bounded to CHART_MONTHS) ──────────────────────────── */

export interface RevenueEvent {
  ts: string;
  type: string;
  amount: number;
}

export async function fetchRevenueEvents(): Promise<RevenueEvent[]> {
  const { data } = await supabase
    .from("wallet_transactions")
    .select("amount,type,created_at")
    .in("type", [
      "deposit",
      "escrow_lock",
      "milestone_payment",
      "escrow_release",
      "withdrawal",
    ])
    .eq("status", "completed")
    .gte("created_at", monthsAgoIso(CHART_MONTHS))
    .order("created_at", { ascending: true });
  return ((data ?? []) as any[]).map((r) => ({
    ts: String(r.created_at),
    type: String(r.type),
    amount: pf(r.amount),
  }));
}

export async function fetchMonthlyRevenue(): Promise<MonthlyRevenue[]> {
  const { data } = await supabase
    .from("wallet_transactions")
    .select("amount,type,created_at")
    .in("type", ["deposit", "escrow_release", "milestone_payment", "escrow_lock"])
    .gte("created_at", monthsAgoIso(CHART_MONTHS))
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
        new Date(`01 ${a.month}`).getTime() - new Date(`01 ${b.month}`).getTime(),
    );
}

/* ─── Transactions (server-paged) ────────────────────────────────────────── */

const TX_COLS =
  "id,user_id,wallet_id,type,amount,status,description,reference,related_job_id,created_at,updated_at";

function applyTxFilters(q: any, p: PageParams, userIds: string[] | null) {
  if (p.type && p.type !== "all") q = q.eq("type", p.type);
  if (p.status && p.status !== "all") q = q.eq("status", p.status);
  if (p.dateFrom) q = q.gte("created_at", startOfDay(p.dateFrom));
  if (p.dateTo) q = q.lte("created_at", endOfDay(p.dateTo));

  const s = sanitize(p.search ?? "");
  if (s) {
    const clauses = [`reference.ilike.%${s}%`, `description.ilike.%${s}%`];
    if (userIds && userIds.length) clauses.push(`user_id.in.(${userIds.join(",")})`);
    q = q.or(clauses.join(","));
  }
  return q;
}

async function hydrateTransactions(data: any[]): Promise<WalletTransaction[]> {
  const userIds = Array.from(
    new Set(data.map((r) => r.user_id).filter(Boolean)),
  ) as string[];
  const jobIds = Array.from(
    new Set(data.map((r) => r.related_job_id).filter(Boolean)),
  ) as string[];

  const [profiles, jobsRes] = await Promise.all([
    buildProfileMap(userIds),
    jobIds.length
      ? supabase.from("jobs").select("id,title").in("id", jobIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const jobMap = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j.title]));

  return data.map(
    (r): WalletTransaction => ({
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

export async function fetchTransactionsPage(
  p: PageParams,
): Promise<Page<WalletTransaction>> {
  const s = sanitize(p.search ?? "");
  const userIds = s ? await userIdsMatchingName(s) : null;

  const from = (p.page - 1) * p.pageSize;
  let q = supabase.from("wallet_transactions").select(TX_COLS, { count: "exact" });
  q = applyTxFilters(q, p, userIds);

  const { data, error, count } = await q
    .order(p.sortKey ?? "created_at", { ascending: p.sortDir === "asc" })
    .range(from, from + p.pageSize - 1);

  if (error || !data) {
    if (error) console.warn("transactions page failed:", error.message);
    return { rows: [], total: 0 };
  }

  return { rows: await hydrateTransactions(data as any[]), total: count ?? 0 };
}

/** Totals for the summary strip, under the same filters as the grid.
 *  Selects three narrow columns rather than whole rows. */
export async function fetchTransactionsSummary(p: PageParams): Promise<{
  credits: number;
  debits: number;
  pending: number;
}> {
  const s = sanitize(p.search ?? "");
  const userIds = s ? await userIdsMatchingName(s) : null;

  let q = supabase
    .from("wallet_transactions")
    .select("amount,type,status")
    .limit(EXPORT_LIMIT);
  q = applyTxFilters(q, p, userIds);

  const { data } = await q;
  const CREDIT = [
    "deposit",
    "escrow_lock",
    "escrow_release",
    "milestone_payment",
    "platform_fee",
  ];
  let credits = 0;
  let debits = 0;
  let pending = 0;
  ((data ?? []) as any[]).forEach((r) => {
    const amt = pf(r.amount);
    if (r.status === "pending") pending += amt;
    if (CREDIT.includes(r.type)) credits += amt;
    else debits += amt;
  });
  return { credits, debits, pending };
}

/** Export runs its own query so CSV/PDF still cover the whole filtered set,
 *  not just the page on screen. */
export async function fetchTransactionsForExport(
  p: PageParams,
): Promise<WalletTransaction[]> {
  const s = sanitize(p.search ?? "");
  const userIds = s ? await userIdsMatchingName(s) : null;

  let q = supabase.from("wallet_transactions").select(TX_COLS);
  q = applyTxFilters(q, p, userIds);
  const { data } = await q
    .order(p.sortKey ?? "created_at", { ascending: p.sortDir === "asc" })
    .limit(EXPORT_LIMIT);

  return hydrateTransactions((data ?? []) as any[]);
}

/** Distinct transaction types for the filter dropdown, resolved once. */
let _txTypes: string[] | null = null;
export async function fetchTransactionTypes(): Promise<string[]> {
  if (_txTypes) return _txTypes;
  const { data } = await supabase
    .from("wallet_transactions")
    .select("type")
    .order("created_at", { ascending: false })
    .limit(1000);
  _txTypes = Array.from(
    new Set(((data ?? []) as any[]).map((r) => r.type).filter(Boolean)),
  ).sort();
  return _txTypes;
}

/* ─── Withdrawal queue (public.admin_withdrawal_queue) ────────────────────── */

// The columns the view has always had, and the two that arrive with
// 20260825140000_admin_retry_withdrawal.sql.
//
// Split deliberately. PostgREST answers 400 for a column that does not exist,
// and this returns an empty page on error — so selecting a not-yet-migrated
// column empties the entire Pending Withdrawals tab. Nothing is wrong with the
// data and nothing says so on screen; it just renders "No withdrawal requests
// found" over a queue full of held money. So ask for the optional columns, and
// do without them if they are not there yet.
const WQ_BASE_COLS =
  "id,reference,user_id,full_name,amount,fee_amount,net_amount,phone_number," +
  "status,scheduled_for,hours_until_due,requested_at,dispatched_at,settled_at," +
  "attempts,failure_reason";
const WQ_RETRY_COLS = ",retry_of,already_retried";

function applyWqFilters(q: any, p: PageParams) {
  if (p.status && p.status !== "all") q = q.eq("status", p.status);
  if (p.dateFrom) q = q.gte("requested_at", startOfDay(p.dateFrom));
  if (p.dateTo) q = q.lte("requested_at", endOfDay(p.dateTo));

  const s = sanitize(p.search ?? "");
  if (s) {
    // full_name is composed server-side by the view, so unlike the wallet
    // tables this one can be searched by name directly.
    q = q.or(
      `reference.ilike.%${s}%,full_name.ilike.%${s}%,phone_number.ilike.%${s}%`,
    );
  }
  return q;
}

function mapWithdrawal(r: any, avatar: string | null): WithdrawalRequest {
  return {
    id: r.id,
    reference: r.reference,
    userId: r.user_id,
    amount: pf(r.amount),
    feeAmount: pf(r.fee_amount),
    netAmount: pf(r.net_amount),
    phoneNumber: r.phone_number ?? "—",
    status: r.status,
    scheduledFor: r.scheduled_for,
    hoursUntilDue: r.hours_until_due != null ? Number(r.hours_until_due) : 0,
    requestedAt: r.requested_at,
    dispatchedAt: r.dispatched_at ?? null,
    settledAt: r.settled_at ?? null,
    attempts: r.attempts ?? 0,
    failureReason: r.failure_reason ?? null,
    // Absent on the fallback path — a row is then simply never shown as
    // already-retried, and the RPC's own guard refuses a second retry.
    retryOf: r.retry_of ?? null,
    alreadyRetried: r.already_retried === true,
    userName: r.full_name ?? "—",
    userAvatar: avatar,
  };
}

export async function fetchWithdrawalQueuePage(
  p: PageParams,
): Promise<Page<WithdrawalRequest>> {
  const from = (p.page - 1) * p.pageSize;

  const run = (cols: string) => {
    let q = supabase
      .from("admin_withdrawal_queue")
      .select(cols, { count: "exact" });
    q = applyWqFilters(q, p);
    return q
      .order(p.sortKey ?? "requested_at", { ascending: p.sortDir === "asc" })
      .range(from, from + p.pageSize - 1);
  };

  let { data, error, count } = await run(WQ_BASE_COLS + WQ_RETRY_COLS);

  if (error) {
    console.warn(
      "withdrawal queue: retry columns unavailable, falling back " +
        "(apply 20260825140000_admin_retry_withdrawal.sql) —",
      error.message,
    );
    ({ data, error, count } = await run(WQ_BASE_COLS));
  }

  if (error || !data) {
    if (error) console.warn("admin_withdrawal_queue unavailable:", error.message);
    return { rows: [], total: 0 };
  }

  const rows = data as any[];
  const profiles = await buildProfileMap(
    Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[],
  );

  return {
    rows: rows.map((r) =>
      mapWithdrawal(r, profiles.get(r.user_id)?.avatar ?? null),
    ),
    total: count ?? 0,
  };
}

/** Queue totals by status — the three cards above the table. Two columns for
 *  the whole queue is cheap; whole rows plus every profile were not. */
export async function fetchWithdrawalSummary(): Promise<
  Record<"queued" | "processing" | "failed", { count: number; amount: number }>
> {
  const out = {
    queued: { count: 0, amount: 0 },
    processing: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
  };

  const { data, error } = await supabase
    .from("admin_withdrawal_queue")
    .select("status,net_amount")
    .in("status", ["queued", "processing", "failed"])
    .limit(EXPORT_LIMIT);

  if (error || !data) return out;

  (data as any[]).forEach((r) => {
    const k = r.status as keyof typeof out;
    if (!out[k]) return;
    out[k].count += 1;
    out[k].amount += pf(r.net_amount);
  });
  return out;
}

export async function fetchWithdrawalsForExport(
  p: PageParams,
): Promise<WithdrawalRequest[]> {
  const run = (cols: string) => {
    let q = supabase.from("admin_withdrawal_queue").select(cols);
    q = applyWqFilters(q, p);
    return q
      .order(p.sortKey ?? "requested_at", { ascending: p.sortDir === "asc" })
      .limit(EXPORT_LIMIT);
  };

  let { data, error } = await run(WQ_BASE_COLS + WQ_RETRY_COLS);
  if (error) ({ data, error } = await run(WQ_BASE_COLS));
  if (error || !data) return [];

  return (data as any[]).map((r) => mapWithdrawal(r, null));
}

// Admin-only RPC (public.admin_release_withdrawal_now) — moves scheduled_for
// to now(). It does NOT dispatch the payout directly; the worker's next run
// claims it like any other due request.
export async function releaseWithdrawalNow(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("admin_release_withdrawal_now", {
    p_id: id,
  });
  if (error) return { ok: false, error: error.message };
  if (data && (data as any).ok === false) {
    return { ok: false, error: (data as any).error ?? "Request failed" };
  }
  return { ok: true };
}

/* ─── Dispatch one queued withdrawal immediately ───────────────────────────
 *
 * The difference from releaseWithdrawalNow above matters. That RPC only sets
 * scheduled_for = now(), which does nothing whatsoever to a request that is
 * already overdue. This actually sends the money: it invokes
 * process-withdrawal-queue, which verifies the caller is an admin (is_admin()
 * evaluated as them, inside the function) and then runs the same claim →
 * dispatch → notify path the cron worker runs.
 *
 * Outcomes, all normal, none exceptions:
 *   dispatched — handed to IntaSend, tracking_id returned, user notified
 *   requeued   — transient refusal (float short, provider 5xx); stays queued
 *   failed     — terminal refusal, or attempts cap reached. The hold has been
 *                reversed and the freelancer has their money back
 */
export async function dispatchWithdrawalNow(
  id: string,
): Promise<{
  ok: boolean;
  outcome?: string;
  reason?: string | null;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke(
    "process-withdrawal-queue",
    { body: { request_id: id } },
  );

  // A non-2xx comes back as FunctionsHttpError with the body unread on
  // error.context. The function puts the useful sentence in there — dropping
  // it in favour of error.message would show the admin "Edge Function returned
  // a non-2xx status code", which tells them nothing.
  if (error) {
    let detail = error.message;
    try {
      const body = await (error as any)?.context?.json?.();
      if (body?.error) detail = String(body.error);
    } catch {
      /* body already consumed, or not JSON — keep error.message */
    }
    return { ok: false, error: detail };
  }

  const res = (data ?? {}) as {
    ok?: boolean;
    outcome?: string;
    reason?: string | null;
    error?: string;
  };

  if (res.ok) return { ok: true, outcome: res.outcome ?? "dispatched" };

  return {
    ok: false,
    outcome: res.outcome,
    reason: res.reason ?? null,
    error: res.error ?? res.reason ?? "Dispatch failed",
  };
}

/* ─── Retry a failed withdrawal ────────────────────────────────────────────
 *
 * NOT a re-send. By the time a request reads 'failed', fail_withdrawal has
 * already reversed it: the gross is back in the freelancer's spendable balance
 * and there is no hold left to dispatch. So admin_retry_withdrawal creates a
 * NEW withdrawal — new reference, new debit, new hold, new queue row — linked
 * to the original through retry_of.
 */
export async function retryWithdrawal(
  id: string,
): Promise<{ ok: boolean; reference?: string; error?: string }> {
  const { data, error } = await supabase.rpc("admin_retry_withdrawal", {
    p_id: id,
  });
  if (error) return { ok: false, error: error.message };
  const res = (data ?? {}) as {
    ok?: boolean;
    reference?: string;
    error?: string;
  };
  if (!res.ok) return { ok: false, error: res.error ?? "Retry failed" };
  return { ok: true, reference: res.reference };
}

/* ─── Escrow (server-paged) ──────────────────────────────────────────────── */

const ESCROW_COLS =
  "id,client_id,bidder_id,bid_id,job_id,amount,service_fee,total_charged,status,created_at,released_at,refunded_at,notes";

interface EscrowSearchIds {
  users: string[] | null;
  jobs: string[] | null;
}

function applyEscrowFilters(q: any, p: PageParams, ids: EscrowSearchIds) {
  if (p.status && p.status !== "all") q = q.eq("status", p.status);
  if (p.dateFrom) q = q.gte("created_at", startOfDay(p.dateFrom));
  if (p.dateTo) q = q.lte("created_at", endOfDay(p.dateTo));

  const s = sanitize(p.search ?? "");
  if (s) {
    const clauses: string[] = [`notes.ilike.%${s}%`];
    if (ids.users && ids.users.length) {
      clauses.push(`client_id.in.(${ids.users.join(",")})`);
      clauses.push(`bidder_id.in.(${ids.users.join(",")})`);
    }
    if (ids.jobs && ids.jobs.length) {
      clauses.push(`job_id.in.(${ids.jobs.join(",")})`);
    }
    q = q.or(clauses.join(","));
  }
  return q;
}

async function hydrateEscrow(data: any[]): Promise<EscrowTransaction[]> {
  const jobIds = Array.from(
    new Set(data.map((r) => r.job_id).filter(Boolean)),
  ) as string[];
  const personIds = Array.from(
    new Set(
      [...data.map((r) => r.client_id), ...data.map((r) => r.bidder_id)].filter(
        Boolean,
      ),
    ),
  ) as string[];

  const [profiles, jobsRes] = await Promise.all([
    buildProfileMap(personIds),
    jobIds.length
      ? supabase.from("jobs").select("id,title").in("id", jobIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const jobMap = new Map((jobsRes.data ?? []).map((j: any) => [j.id, j.title]));

  return data.map(
    (r): EscrowTransaction => ({
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

async function escrowSearchIds(search?: string): Promise<EscrowSearchIds> {
  const s = sanitize(search ?? "");
  if (!s) return { users: null, jobs: null };
  const [users, jobs] = await Promise.all([
    userIdsMatchingName(s),
    jobIdsMatchingTitle(s),
  ]);
  return { users, jobs };
}

export async function fetchEscrowPage(
  p: PageParams,
): Promise<Page<EscrowTransaction>> {
  const ids = await escrowSearchIds(p.search);
  const from = (p.page - 1) * p.pageSize;

  let q = supabase
    .from("escrow_transactions")
    .select(ESCROW_COLS, { count: "exact" });
  q = applyEscrowFilters(q, p, ids);
  const { data, error, count } = await q
    .order(p.sortKey ?? "created_at", { ascending: p.sortDir === "asc" })
    .range(from, from + p.pageSize - 1);

  if (error || !data) {
    if (error) console.warn("escrow page failed:", error.message);
    return { rows: [], total: 0 };
  }

  return { rows: await hydrateEscrow(data as any[]), total: count ?? 0 };
}

export async function fetchEscrowSummary(): Promise<{
  total: number;
  released: number;
  held: number;
  refunded: number;
}> {
  const { data } = await supabase
    .from("escrow_transactions")
    .select("amount,status")
    .gte("created_at", monthsAgoIso(CHART_MONTHS))
    .limit(EXPORT_LIMIT);

  const out = { total: 0, released: 0, held: 0, refunded: 0 };
  ((data ?? []) as any[]).forEach((r) => {
    const amt = pf(r.amount);
    out.total += amt;
    const s = String(r.status).toLowerCase();
    if (s === "released") out.released += amt;
    else if (s === "held") out.held += amt;
    else if (s === "refunded") out.refunded += amt;
  });
  return out;
}

export async function fetchEscrowForExport(
  p: PageParams,
): Promise<EscrowTransaction[]> {
  const ids = await escrowSearchIds(p.search);
  let q = supabase.from("escrow_transactions").select(ESCROW_COLS);
  q = applyEscrowFilters(q, p, ids);
  const { data } = await q
    .order(p.sortKey ?? "created_at", { ascending: p.sortDir === "asc" })
    .limit(EXPORT_LIMIT);
  return hydrateEscrow((data ?? []) as any[]);
}

let _escrowStatuses: string[] | null = null;
export async function fetchEscrowStatuses(): Promise<string[]> {
  if (_escrowStatuses) return _escrowStatuses;
  const { data } = await supabase
    .from("escrow_transactions")
    .select("status")
    .limit(1000);
  _escrowStatuses = Array.from(
    new Set(
      ((data ?? []) as any[])
        .map((r) => String(r.status).toLowerCase())
        .filter(Boolean),
    ),
  ).sort();
  return _escrowStatuses;
}

/* ─── Platform revenue (server-paged) ────────────────────────────────────── */

export interface RevenueRow {
  id: string;
  reference: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  createdAt: string;
  userName: string;
  userAvatar: string | null;
}

export interface RevenuePageParams extends PageParams {
  /** Transaction types behind the chosen "Revenue Source", or null for all. */
  sourceTypes?: string[] | null;
}

const REVENUE_COLS =
  "id, type, amount, status, description, reference, user_id, created_at";

function applyRevenueFilters(
  q: any,
  p: RevenuePageParams,
  userIds: string[] | null,
) {
  if (p.status && p.status !== "all") q = q.eq("status", p.status);
  if (p.sourceTypes && p.sourceTypes.length) q = q.in("type", p.sourceTypes);
  if (p.dateFrom) q = q.gte("created_at", startOfDay(p.dateFrom));
  if (p.dateTo) q = q.lte("created_at", endOfDay(p.dateTo));

  const s = sanitize(p.search ?? "");
  if (s) {
    const clauses = [`reference.ilike.%${s}%`, `description.ilike.%${s}%`];
    if (userIds && userIds.length) clauses.push(`user_id.in.(${userIds.join(",")})`);
    q = q.or(clauses.join(","));
  }
  return q;
}

async function hydrateRevenue(data: any[]): Promise<RevenueRow[]> {
  const userIds = Array.from(
    new Set(data.map((r) => r.user_id).filter(Boolean)),
  ) as string[];
  const profiles = await buildProfileMap(userIds);

  return data.map(
    (r): RevenueRow => ({
      id: r.id,
      reference: r.reference ?? String(r.id).slice(0, 10).toUpperCase(),
      type: r.type,
      amount: pf(r.amount),
      status: r.status,
      description: r.description ?? null,
      createdAt: r.created_at,
      userName: profiles.get(r.user_id)?.name ?? "—",
      userAvatar: profiles.get(r.user_id)?.avatar ?? null,
    }),
  );
}

export async function fetchRevenuePage(
  p: RevenuePageParams,
): Promise<Page<RevenueRow>> {
  const s = sanitize(p.search ?? "");
  const userIds = s ? await userIdsMatchingName(s) : null;
  const from = (p.page - 1) * p.pageSize;

  let q = supabase
    .from("wallet_transactions")
    .select(REVENUE_COLS, { count: "exact" });
  q = applyRevenueFilters(q, p, userIds);
  const { data, error, count } = await q
    .order(p.sortKey ?? "created_at", { ascending: p.sortDir === "asc" })
    .range(from, from + p.pageSize - 1);

  if (error || !data) {
    if (error) console.warn("revenue page failed:", error.message);
    return { rows: [], total: 0 };
  }

  return { rows: await hydrateRevenue(data as any[]), total: count ?? 0 };
}

export async function fetchRevenueTotal(p: RevenuePageParams): Promise<number> {
  const s = sanitize(p.search ?? "");
  const userIds = s ? await userIdsMatchingName(s) : null;

  let q = supabase.from("wallet_transactions").select("amount").limit(EXPORT_LIMIT);
  q = applyRevenueFilters(q, p, userIds);
  const { data } = await q;
  return ((data ?? []) as any[]).reduce((sum, r) => sum + pf(r.amount), 0);
}

export async function fetchRevenueForExport(
  p: RevenuePageParams,
): Promise<RevenueRow[]> {
  const s = sanitize(p.search ?? "");
  const userIds = s ? await userIdsMatchingName(s) : null;

  let q = supabase.from("wallet_transactions").select(REVENUE_COLS);
  q = applyRevenueFilters(q, p, userIds);
  const { data } = await q
    .order(p.sortKey ?? "created_at", { ascending: p.sortDir === "asc" })
    .limit(EXPORT_LIMIT);
  return hydrateRevenue((data ?? []) as any[]);
}

/** Feeds the Revenue Trend chart. Independent of the grid's paging — the chart
 *  needs a year of history and none of the row detail, so it asks for three
 *  columns over CHART_MONTHS instead of riding on the table query. */
export async function fetchRevenueTrend(): Promise<
  { ts: string; type: string; amount: number }[]
> {
  const { data } = await supabase
    .from("wallet_transactions")
    .select("type,amount,created_at")
    .eq("status", "completed")
    .in("type", [
      "deposit",
      "escrow_lock",
      "escrow_release",
      "milestone_payment",
      "platform_fee",
    ])
    .gte("created_at", monthsAgoIso(CHART_MONTHS))
    .order("created_at", { ascending: true });

  return ((data ?? []) as any[]).map((r) => ({
    ts: String(r.created_at),
    type: String(r.type),
    amount: pf(r.amount),
  }));
}

/* ─── Commission ─────────────────────────────────────────────────────────── */

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
    console.warn(
      "monthly_commission unavailable — deriving from transactions:",
      error,
    );
  }

  return deriveMonthlyCommission();
};

const PLATFORM_FEE_RATE = 0.1; // 10% — used only for the estimate fallback

export interface CommissionEvent {
  ts: string;
  amount: number;
}

async function commissionBasisRows(): Promise<any[]> {
  // basis = money entering the platform (escrow_lock is the real flow here);
  // escrow_release is excluded to avoid double-counting lock→release pairs
  const { data } = await supabase
    .from("wallet_transactions")
    .select("amount,type,created_at")
    .in("type", ["platform_fee", "deposit", "escrow_lock", "milestone_payment"])
    .eq("status", "completed")
    .gte("created_at", monthsAgoIso(CHART_MONTHS))
    .order("created_at", { ascending: true });
  return (data ?? []) as any[];
}

export async function fetchCommissionEvents(): Promise<CommissionEvent[]> {
  const rows = await commissionBasisRows();
  const hasRealFees = rows.some((r) => r.type === "platform_fee");

  return rows
    .filter((r) =>
      hasRealFees ? r.type === "platform_fee" : r.type !== "platform_fee",
    )
    .map((r) => ({
      ts: r.created_at as string,
      amount: hasRealFees ? pf(r.amount) : pf(r.amount) * PLATFORM_FEE_RATE,
    }));
}

async function deriveMonthlyCommission(): Promise<MonthlyCommission[]> {
  const rows = await commissionBasisRows();

  const map: Record<string, { fee: number; revenue: number }> = {};
  rows.forEach((r) => {
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
        new Date(`01 ${a.month}`).getTime() - new Date(`01 ${b.month}`).getTime(),
    );
}

/* ─── Refunds ────────────────────────────────────────────────────────────── */

export async function fetchPendingRefunds(): Promise<RefundRequest[]> {
  const { data, error } = await supabase
    .from("escrow_transactions")
    .select("id, client_id, bidder_id, job_id, amount, status, created_at, notes")
    .in("status", ["refund_requested", "pending_refund", "dispute"])
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.warn("Supabase error fetching pending refunds:", error.message);
    return [];
  }
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];

  const userIds = Array.from(
    new Set(rows.flatMap((r) => [r.client_id, r.bidder_id]).filter(Boolean)),
  ) as string[];
  const jobIds = Array.from(new Set(rows.map((r) => r.job_id).filter(Boolean)));

  const [profileMap, jobsRes] = await Promise.all([
    buildProfileMap(userIds),
    jobIds.length
      ? supabase.from("jobs").select("id, title").in("id", jobIds)
      : Promise.resolve({ data: [] } as any),
  ]);
  const jobTitles = new Map(
    ((jobsRes.data ?? []) as any[]).map((j) => [j.id, j.title as string]),
  );

  const reasonFor = (
    status: string,
    notes: string | null,
  ): RefundRequest["reason"] => {
    if (status === "dispute") return "dispute";
    const n = (notes ?? "").toLowerCase();
    if (n.includes("cancel")) return "cancelled";
    if (n.includes("reject")) return "work_rejected";
    return "other";
  };

  return rows.map((r) => ({
    id: String(r.id),
    reference: `REF-${String(r.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    clientName: profileMap.get(r.client_id)?.name ?? "—",
    clientAvatar: profileMap.get(r.client_id)?.avatar ?? null,
    freelancerName: profileMap.get(r.bidder_id)?.name ?? "—",
    jobTitle: jobTitles.get(r.job_id) ?? "—",
    amount: pf(r.amount),
    reason: reasonFor(String(r.status), r.notes ?? null),
    requestedAt: String(r.created_at),
    status: "pending" as const,
  }));
}
