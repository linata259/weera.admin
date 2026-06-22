import { supabase } from 'services/supabaseClient';
import { formatCurrency, formatCount, getTrendDirection } from '../Formatters';
import {
  DateRangeOption,
  DashboardStats,
  // DashboardStat,
  ActivityItem,
  UserGrowthPoint,
  BreakdownSlice,
  ProjectValuePoint,
} from '../types';

const RANGE_DAYS: Record<DateRangeOption, number> = { '7d': 7, '30d': 30, '90d': 90 };
const pf = (value: unknown): number => parseFloat(value?.toString() ?? '0');
const joinName = (first: unknown, last: unknown): string =>
  [first, last].filter(Boolean).join(' ') || 'Someone';

function logAndThrow(label: string, error: unknown): never {
  console.error(`Supabase error (${label}):`, error);
  const message =
    error && typeof error === 'object' && 'message' in error
      ? (error as { message: string }).message
      : String(error);
  throw new Error(`${label}: ${message}`);
}

// ─── Caches ───────────────────────────────────────────────────────────────────

// Profile names: session-scoped. Eliminates the second round trip in
// fetchRecentActivity every time the dashboard is visited.
const _profileNameCache = new Map<string, string>();

// Lookup tables (user_types, locations, job_categories): TTL-scoped (5 min).
// These tables change so rarely that re-fetching them on every range toggle
// is pure overhead.
const _lookupCache = new Map<string, { value: unknown; exp: number }>();

function withCache<T>(key: string, fn: () => Promise<T>, ttl = 300_000): Promise<T> {
  const hit = _lookupCache.get(key);
  if (hit && Date.now() < hit.exp) return Promise.resolve(hit.value as T);
  return fn().then((v) => {
    _lookupCache.set(key, { value: v, exp: Date.now() + ttl });
    return v;
  });
}

async function resolveProfileNames(ids: string[]): Promise<Map<string, string>> {
  const missing = ids.filter((id) => !_profileNameCache.has(id));
  if (missing.length) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', missing);
    (data ?? []).forEach((row: any) => {
      _profileNameCache.set(row.id, joinName(row.first_name, row.last_name));
    });
  }
  return new Map(ids.map((id) => [id, _profileNameCache.get(id) ?? 'Someone']));
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

interface RangeBounds {
  currentStart: string;
  previousStart: string;
  now: string;
}

function getRangeBounds(range: DateRangeOption): RangeBounds {
  const days = RANGE_DAYS[range];
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);
  return {
    currentStart: currentStart.toISOString(),
    previousStart: previousStart.toISOString(),
    now: now.toISOString(),
  };
}

function calcChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function bucketByDay(rows: Array<{ created_at: string; weight?: number }>, days: number): number[] {
  const buckets = new Array(days).fill(0);
  const now = Date.now();
  rows.forEach((row) => {
    const diffDays = Math.floor((now - new Date(row.created_at).getTime()) / 86_400_000);
    const idx = days - 1 - diffDays;
    if (idx >= 0 && idx < days) buckets[idx] += row.weight ?? 1;
  });
  return buckets;
}

function buildTrend(current: number, previous: number) {
  const changePercent = calcChangePercent(current, previous);
  return {
    changePercent: Math.round(changePercent * 10) / 10,
    direction: getTrendDirection(changePercent),
  };
}

function twelveMonthsAgoDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 11);
  d.setDate(1);
  return d;
}

// ─── Lookup table fetchers (all cached) ───────────────────────────────────────

function fetchUserTypeMap(): Promise<Map<string, string>> {
  return withCache('user_types', async () => {
    const { data, error } = await supabase.from('user_types').select('id, type');
    if (error) console.warn('Supabase: user_types', error);
    return new Map(
      ((data ?? []) as any[]).map((r) => [r.id as string, (r.type as string ?? '').toLowerCase()])
    );
  });
}

function fetchLocationMap(): Promise<Map<string, string>> {
  return withCache('locations', async () => {
    const { data, error } = await supabase.from('locations').select('id, location');
    if (error) console.warn('Supabase: locations', error);
    return new Map(((data ?? []) as any[]).map((r) => [r.id as string, r.location as string]));
  });
}

function fetchCategoryMap(): Promise<Map<string, string>> {
  return withCache('job_categories', async () => {
    const { data, error } = await supabase.from('job_categories').select('id, name');
    if (error) console.warn('Supabase: job_categories', error);
    return new Map(((data ?? []) as any[]).map((r) => [r.id as string, r.name as string]));
  });
}

// ─── Derivation helpers (pure JS, no Supabase) ────────────────────────────────

function deriveStats(
  profileCount: number,
  profilesInRange: any[],
  jobsInRange: any[],
  walletsData: any[],
  txInRange: any[],
  withdrawalTotalCount: number,
  currentStart: string,
  previousStart: string,
  now: string,
  days: number,
): DashboardStats {
  const isCurrent = (d: string) => d >= currentStart && d <= now;
  const isPrevious = (d: string) => d >= previousStart && d < currentStart;

  const currentProfiles = profilesInRange.filter((r) => isCurrent(r.created_at));
  const previousProfiles = profilesInRange.filter((r) => isPrevious(r.created_at));

  const currentJobs = jobsInRange.filter((r) => isCurrent(r.posted_at));
  const previousJobs = jobsInRange.filter((r) => isPrevious(r.posted_at));

  const escrowCurrent = txInRange.filter((r) => r.type === 'escrow_lock' && isCurrent(r.created_at));
  const escrowPrevious = txInRange.filter((r) => r.type === 'escrow_lock' && isPrevious(r.created_at));
  const wdCurrent = txInRange.filter((r) => r.type === 'withdrawal' && r.status === 'pending' && isCurrent(r.created_at));
  const wdPrevious = txInRange.filter((r) => r.type === 'withdrawal' && r.status === 'pending' && isPrevious(r.created_at));

  const totalEscrow = walletsData.reduce((s, r) => s + pf(r.escrow_balance), 0);
  const escrowCurrentSum = escrowCurrent.reduce((s, r) => s + pf(r.amount), 0);
  const escrowPreviousSum = escrowPrevious.reduce((s, r) => s + pf(r.amount), 0);

  return {
    totalActiveUsers: {
      id: 'totalActiveUsers',
      label: 'Total Active Users',
      value: profileCount,
      formattedValue: formatCount(profileCount),
      trend: buildTrend(currentProfiles.length, previousProfiles.length),
      sparklineData: bucketByDay(currentProfiles.map((r) => ({ created_at: r.created_at })), days),
    },
    newJobsPosted: {
      id: 'newJobsPosted',
      label: 'New Jobs Posted',
      value: currentJobs.length,
      formattedValue: formatCount(currentJobs.length),
      trend: buildTrend(currentJobs.length, previousJobs.length),
      sparklineData: bucketByDay(currentJobs.map((r) => ({ created_at: r.posted_at })), days),
    },
    totalFundsInEscrow: {
      id: 'totalFundsInEscrow',
      label: 'Total Funds in Escrow',
      value: totalEscrow,
      formattedValue: formatCurrency(totalEscrow),
      trend: buildTrend(escrowCurrentSum, escrowPreviousSum),
      sparklineData: bucketByDay(
        escrowCurrent.map((r) => ({ created_at: r.created_at, weight: pf(r.amount) })),
        days
      ),
    },
    pendingWithdrawals: {
      id: 'pendingWithdrawals',
      label: 'Pending Withdrawals',
      value: withdrawalTotalCount,
      formattedValue: formatCount(withdrawalTotalCount),
      trend: buildTrend(wdCurrent.length, wdPrevious.length),
      sparklineData: bucketByDay(wdCurrent.map((r) => ({ created_at: r.created_at })), days),
    },
  };
}

function deriveUserGrowth(
  profilesData: any[],
  userTypeMap: Map<string, string>,
  startDate: Date,
): UserGrowthPoint[] {
  const buckets = new Map<string, { freelancers: number; clients: number }>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { freelancers: 0, clients: 0 });
  }

  profilesData.forEach((row) => {
    const created = new Date(row.created_at as string);
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (!bucket) return;
    const typeIds = Array.isArray(row.user_type_id) ? (row.user_type_id as string[]) : [];
    const typeNames = typeIds.map((id) => userTypeMap.get(id)).filter(Boolean) as string[];
    if (typeNames.some((n) => n.includes('find work'))) bucket.freelancers += 1;
    if (typeNames.some((n) => n.includes('hire talent'))) bucket.clients += 1;
  });

  return Array.from(buckets.entries()).map(([key, counts]) => {
    const [year, month] = key.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      month: key,
      label: date.toLocaleDateString('en-KE', { month: 'short' }),
      ...counts,
    };
  });
}

function deriveTopLocations(
  currentJobs: any[],
  locationMap: Map<string, string>,
  limit: number,
): BreakdownSlice[] {
  const counts = new Map<string, number>();
  let total = 0;
  currentJobs.forEach((row) => {
    const id = row.location_id as string | null;
    if (!id) return;
    counts.set(id, (counts.get(id) ?? 0) + 1);
    total += 1;
  });
  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      name: locationMap.get(id) ?? 'Unknown',
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function deriveTopCategories(
  currentJobs: any[],
  categoryMap: Map<string, string>,
  limit: number,
): BreakdownSlice[] {
  const counts = new Map<string, number>();
  let total = 0;
  currentJobs.forEach((row) => {
    const ids = Array.isArray(row.categories) ? (row.categories as string[]) : [];
    ids.forEach((id) => {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      total += 1;
    });
  });
  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      name: categoryMap.get(id) ?? 'Unknown',
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function deriveProjectValue(currentJobs: any[], days: number): ProjectValuePoint[] {
  const points: ProjectValuePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStr = day.toISOString().slice(0, 10);
    const dayRows = currentJobs.filter((r) => (r.posted_at as string)?.slice(0, 10) === dayStr);
    const average =
      dayRows.length > 0
        ? dayRows.reduce((sum, r) => sum + pf(r.budget), 0) / dayRows.length
        : 0;
    points.push({
      date: dayStr,
      label: day.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
      averageValue: Math.round(average),
    });
  }
  return points;
}

function deriveRecentActivity(
  recentJobs: any[],
  recentWithdrawals: any[],
  recentProfiles: any[],
  names: Map<string, string>,
  limit: number,
): ActivityItem[] {
  const jobItems: ActivityItem[] = recentJobs.map((row) => ({
    id: `job-${row.id}`,
    type: 'job_posted',
    message: `${names.get(row.posted_by_user_id) ?? 'Someone'} posted a new job: ${row.title ?? 'Untitled'}`,
    actorName: names.get(row.posted_by_user_id),
    createdAt: row.posted_at as string,
    actionLabel: 'View Job',
  }));

  const wdItems: ActivityItem[] = recentWithdrawals.map((row) => ({
    id: `withdrawal-${row.id}`,
    type: 'withdrawal_requested',
    message: `${names.get(row.user_id) ?? 'Someone'} requested a withdrawal of ${formatCurrency(pf(row.amount))}`,
    actorName: names.get(row.user_id),
    createdAt: row.created_at as string,
    actionLabel: 'Review Withdrawal',
  }));

  const userItems: ActivityItem[] = recentProfiles.map((row) => ({
    id: `user-${row.id}`,
    type: 'user_signed_up',
    message: `${joinName(row.first_name, row.last_name)} joined Weera`,
    actorName: joinName(row.first_name, row.last_name),
    createdAt: row.created_at as string,
    actionLabel: 'View Profile',
  }));

  return [...jobItems, ...wdItems, ...userItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// ─── fetchAllDashboardData ─────────────────────────────────────────────────────
// PRIMARY ENTRY POINT — use this in DashboardPage instead of calling each
// function separately.
//
// What this fixes:
//   Before: fetchDashboardStats (12 queries) → then charts + activity (8 queries
//           + 1 waterfall) — sequential groups, ~3 round trips.
//   After:  12 queries all in parallel, then 1 profile-name waterfall — 2 round
//           trips total. Also shares the jobs + profiles fetch across stats,
//           charts, and activity so no query runs twice for the same data.
//
// Usage:
//   const { stats, userGrowth, topLocations, topCategories, projectValue, recentActivity }
//     = await fetchAllDashboardData(range);

export async function fetchAllDashboardData(
  range: DateRangeOption,
  opts: { activityLimit?: number; locationsLimit?: number; categoriesLimit?: number } = {},
): Promise<{
  stats: DashboardStats;
  userGrowth: UserGrowthPoint[];
  topLocations: BreakdownSlice[];
  topCategories: BreakdownSlice[];
  projectValue: ProjectValuePoint[];
  recentActivity: ActivityItem[];
}> {
  const { activityLimit = 10, locationsLimit = 4, categoriesLimit = 3 } = opts;
  const { currentStart, previousStart, now } = getRangeBounds(range);
  const days = RANGE_DAYS[range];
  const growthStart = twelveMonthsAgoDate();
  const growthStartIso = growthStart.toISOString();

  // ── Phase 1: all 12 queries fire simultaneously ───────────────────────────
  // Key shared data:
  //  • profilesRes  → stat trends + user growth chart (one fetch, two uses)
  //  • jobsRes      → stat trends + locations + categories + project value
  //  • txRes        → escrow stat + pending withdrawals stat
  const [
    profileCountRes,
    profilesRes,
    jobsRes,
    walletsRes,
    txRes,
    txWithdrawalTotalRes,
    userTypeMap,
    locationMap,
    categoryMap,
    recentJobsRes,
    recentWithdrawalsRes,
    recentProfilesRes,
  ] = await Promise.all([
    // profiles total (all-time count)
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .or('role.is.null,role.neq.admin'),

    // profiles since 12 months ago — covers both stat range & user growth chart
    supabase
      .from('profiles')
      .select('created_at, user_type_id')
      .or('role.is.null,role.neq.admin')
      .gte('created_at', growthStartIso),

    // jobs since previousStart with all chart columns — covers stats + all 3 charts
    supabase
      .from('jobs')
      .select('posted_at, location_id, categories, budget')
      .gte('posted_at', previousStart)
      .lte('posted_at', now),

    // escrow balances
    supabase.from('wallets').select('escrow_balance'),

    // wallet_transactions covering both period buckets — covers escrow stat + wd stat
    supabase
      .from('wallet_transactions')
      .select('type, status, amount, created_at')
      .in('type', ['escrow_lock', 'withdrawal'])
      .gte('created_at', previousStart)
      .lte('created_at', now),

    // pending withdrawal total count (all-time)
    supabase
      .from('wallet_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'withdrawal')
      .eq('status', 'pending'),

    // static reference tables — served from cache after first load
    fetchUserTypeMap(),
    fetchLocationMap(),
    fetchCategoryMap(),

    // recent activity queries
    supabase
      .from('jobs')
      .select('id, title, posted_at, posted_by_user_id')
      .order('posted_at', { ascending: false })
      .limit(activityLimit),
    supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, created_at')
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(activityLimit),
    supabase
      .from('profiles')
      .select('id, first_name, last_name, created_at')
      .or('role.is.null,role.neq.admin')
      .order('created_at', { ascending: false })
      .limit(activityLimit),
  ]);

  if (profileCountRes.error) logAndThrow('profiles (count)', profileCountRes.error);
  if (profilesRes.error) logAndThrow('profiles', profilesRes.error);
  if (jobsRes.error) logAndThrow('jobs', jobsRes.error);
  if (walletsRes.error) logAndThrow('wallets', walletsRes.error);
  if (txRes.error) logAndThrow('wallet_transactions', txRes.error);
  if (txWithdrawalTotalRes.error) logAndThrow('wallet_transactions (total)', txWithdrawalTotalRes.error);
  if (recentJobsRes.error) logAndThrow('jobs (activity)', recentJobsRes.error);
  if (recentWithdrawalsRes.error) logAndThrow('wallet_transactions (activity)', recentWithdrawalsRes.error);
  if (recentProfilesRes.error) logAndThrow('profiles (activity)', recentProfilesRes.error);

  // ── Phase 2: profile names for activity (needs IDs from Phase 1) ──────────
  const posterIds = Array.from(
    new Set((recentJobsRes.data ?? []).map((r: any) => r.posted_by_user_id).filter(Boolean))
  ) as string[];
  const wdUserIds = Array.from(
    new Set((recentWithdrawalsRes.data ?? []).map((r: any) => r.user_id).filter(Boolean))
  ) as string[];
  const names = await resolveProfileNames([...posterIds, ...wdUserIds]);

  // ── Derive all outputs from Phase 1 data (no more Supabase calls) ─────────
  const allJobs = (jobsRes.data ?? []) as any[];
  const currentJobs = allJobs.filter((r) => r.posted_at >= currentStart && r.posted_at <= now);

  return {
    stats: deriveStats(
      profileCountRes.count ?? 0,
      (profilesRes.data ?? []) as any[],
      allJobs,
      (walletsRes.data ?? []) as any[],
      (txRes.data ?? []) as any[],
      txWithdrawalTotalRes.count ?? 0,
      currentStart,
      previousStart,
      now,
      days,
    ),
    userGrowth: deriveUserGrowth(
      (profilesRes.data ?? []) as any[],
      userTypeMap,
      growthStart,
    ),
    topLocations: deriveTopLocations(currentJobs, locationMap, locationsLimit),
    topCategories: deriveTopCategories(currentJobs, categoryMap, categoriesLimit),
    projectValue: deriveProjectValue(currentJobs, days),
    recentActivity: deriveRecentActivity(
      (recentJobsRes.data ?? []) as any[],
      (recentWithdrawalsRes.data ?? []) as any[],
      (recentProfilesRes.data ?? []) as any[],
      names,
      activityLimit,
    ),
  };
}

// ─── Individual exports (backward-compatible) ─────────────────────────────────
// These are kept for components that fetch individual sections independently
// (e.g. re-fetching only stats when the range toggle changes without reloading
// the whole page). They use the same caches as the combined function.

export async function fetchDashboardStats(range: DateRangeOption): Promise<DashboardStats> {
  const { currentStart, previousStart, now } = getRangeBounds(range);
  const days = RANGE_DAYS[range];

  const [
    profileCountRes,
    profilesInRangeRes,
    jobsInRangeRes,
    walletsRes,
    txInRangeRes,
    txWithdrawalTotalRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).or('role.is.null,role.neq.admin'),
    supabase.from('profiles').select('created_at').or('role.is.null,role.neq.admin').gte('created_at', previousStart).lte('created_at', now),
    supabase.from('jobs').select('posted_at').gte('posted_at', previousStart).lte('posted_at', now),
    supabase.from('wallets').select('escrow_balance'),
    supabase.from('wallet_transactions').select('type, status, amount, created_at').in('type', ['escrow_lock', 'withdrawal']).gte('created_at', previousStart).lte('created_at', now),
    supabase.from('wallet_transactions').select('id', { count: 'exact', head: true }).eq('type', 'withdrawal').eq('status', 'pending'),
  ]);

  if (profileCountRes.error) logAndThrow('profiles (count)', profileCountRes.error);
  if (profilesInRangeRes.error) logAndThrow('profiles (range)', profilesInRangeRes.error);
  if (jobsInRangeRes.error) logAndThrow('jobs (range)', jobsInRangeRes.error);
  if (walletsRes.error) logAndThrow('wallets', walletsRes.error);
  if (txInRangeRes.error) logAndThrow('wallet_transactions (range)', txInRangeRes.error);
  if (txWithdrawalTotalRes.error) logAndThrow('wallet_transactions (total)', txWithdrawalTotalRes.error);

  return deriveStats(
    profileCountRes.count ?? 0,
    (profilesInRangeRes.data ?? []) as any[],
    (jobsInRangeRes.data ?? []) as any[],
    (walletsRes.data ?? []) as any[],
    (txInRangeRes.data ?? []) as any[],
    txWithdrawalTotalRes.count ?? 0,
    currentStart,
    previousStart,
    now,
    days,
  );
}

export async function fetchUserGrowthChart(): Promise<UserGrowthPoint[]> {
  const startDate = twelveMonthsAgoDate();
  const [profilesRes, userTypeMap] = await Promise.all([
    supabase.from('profiles').select('created_at, user_type_id').or('role.is.null,role.neq.admin').gte('created_at', startDate.toISOString()),
    fetchUserTypeMap(),
  ]);
  if (profilesRes.error) logAndThrow('profiles (user growth)', profilesRes.error);
  return deriveUserGrowth((profilesRes.data ?? []) as any[], userTypeMap, startDate);
}

export async function fetchTopJobLocations(range: DateRangeOption, limit = 4): Promise<BreakdownSlice[]> {
  const { currentStart, now } = getRangeBounds(range);
  const [jobsRes, locationMap] = await Promise.all([
    supabase.from('jobs').select('location_id').gte('posted_at', currentStart).lte('posted_at', now),
    fetchLocationMap(),
  ]);
  if (jobsRes.error) logAndThrow('jobs (locations)', jobsRes.error);
  return deriveTopLocations((jobsRes.data ?? []) as any[], locationMap, limit);
}

export async function fetchTopJobCategories(range: DateRangeOption, limit = 3): Promise<BreakdownSlice[]> {
  const { currentStart, now } = getRangeBounds(range);
  const [jobsRes, categoryMap] = await Promise.all([
    supabase.from('jobs').select('categories').gte('posted_at', currentStart).lte('posted_at', now),
    fetchCategoryMap(),
  ]);
  if (jobsRes.error) logAndThrow('jobs (categories)', jobsRes.error);
  return deriveTopCategories((jobsRes.data ?? []) as any[], categoryMap, limit);
}

export async function fetchProjectValueChart(range: DateRangeOption): Promise<ProjectValuePoint[]> {
  const { currentStart, now } = getRangeBounds(range);
  const { data, error } = await supabase
    .from('jobs')
    .select('budget, posted_at')
    .gte('posted_at', currentStart)
    .lte('posted_at', now);
  if (error) logAndThrow('jobs (project value)', error);
  return deriveProjectValue((data ?? []) as any[], RANGE_DAYS[range]);
}

export async function fetchRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const [jobsRes, withdrawalsRes, profilesRes] = await Promise.all([
    supabase.from('jobs').select('id, title, posted_at, posted_by_user_id').order('posted_at', { ascending: false }).limit(limit),
    supabase.from('wallet_transactions').select('id, user_id, amount, created_at').eq('type', 'withdrawal').eq('status', 'pending').order('created_at', { ascending: false }).limit(limit),
    supabase.from('profiles').select('id, first_name, last_name, created_at').or('role.is.null,role.neq.admin').order('created_at', { ascending: false }).limit(limit),
  ]);
  if (jobsRes.error) logAndThrow('jobs (activity)', jobsRes.error);
  if (withdrawalsRes.error) logAndThrow('wallet_transactions (activity)', withdrawalsRes.error);
  if (profilesRes.error) logAndThrow('profiles (activity)', profilesRes.error);

  const posterIds = Array.from(new Set((jobsRes.data ?? []).map((r: any) => r.posted_by_user_id).filter(Boolean))) as string[];
  const wdUserIds = Array.from(new Set((withdrawalsRes.data ?? []).map((r: any) => r.user_id).filter(Boolean))) as string[];
  const names = await resolveProfileNames([...posterIds, ...wdUserIds]);

  return deriveRecentActivity(
    (jobsRes.data ?? []) as any[],
    (withdrawalsRes.data ?? []) as any[],
    (profilesRes.data ?? []) as any[],
    names,
    limit,
  );
}