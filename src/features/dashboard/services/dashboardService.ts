import { supabase } from 'services/supabaseClient';
import { formatCurrency, formatCount, getTrendDirection } from '../Formatters';
import {
  DateRangeOption,
  DashboardStats,
  DashboardStat,
  ActivityItem,
  UserGrowthPoint,
  BreakdownSlice,
  ProjectValuePoint,
} from '../types';

const RANGE_DAYS: Record<DateRangeOption, number> = { '7d': 7, '30d': 30, '90d': 90 };

/** Supabase numeric/decimal columns come back as strings — parse defensively. */
const pf = (value: unknown): number => parseFloat(value?.toString() ?? '0');

const joinName = (first: unknown, last: unknown): string =>
  [first, last].filter(Boolean).join(' ') || 'Someone';

function logAndThrow(label: string, error: unknown): never {
  // eslint-disable-next-line no-console
  console.error(`Supabase error (${label}):`, error);
  const message =
    error && typeof error === 'object' && 'message' in error ? (error as { message: string }).message : String(error);
  throw new Error(`${label}: ${message}`);
}

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
    const bucketIndex = days - 1 - diffDays;
    if (bucketIndex >= 0 && bucketIndex < days) buckets[bucketIndex] += row.weight ?? 1;
  });
  return buckets;
}

function buildTrend(currentCount: number, previousCount: number) {
  const changePercent = calcChangePercent(currentCount, previousCount);
  return { changePercent: Math.round(changePercent * 10) / 10, direction: getTrendDirection(changePercent) };
}

// ---------------------------------------------------------------------------
// Stat 1 — Total Active Users (all-time total; trend = signup rate this
// period vs last, not the total itself shifting).
// ---------------------------------------------------------------------------
async function fetchTotalActiveUsersStat(range: DateRangeOption): Promise<DashboardStat> {
  const { currentStart, previousStart, now } = getRangeBounds(range);
  const days = RANGE_DAYS[range];

  const [totalRes, currentRes, previousRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).or('role.is.null,role.neq.admin'),
    supabase
      .from('profiles')
      .select('created_at')
      .or('role.is.null,role.neq.admin')
      .gte('created_at', currentStart)
      .lte('created_at', now),
    supabase
      .from('profiles')
      .select('created_at')
      .or('role.is.null,role.neq.admin')
      .gte('created_at', previousStart)
      .lt('created_at', currentStart),
  ]);

  if (totalRes.error) logAndThrow('profiles (total count)', totalRes.error);
  if (currentRes.error) logAndThrow('profiles (current)', currentRes.error);
  if (previousRes.error) logAndThrow('profiles (previous)', previousRes.error);

  const total = totalRes.count ?? 0;
  const currentRows = currentRes.data ?? [];

  return {
    id: 'totalActiveUsers',
    label: 'Total Active Users',
    value: total,
    formattedValue: formatCount(total),
    trend: buildTrend(currentRows.length, (previousRes.data ?? []).length),
    sparklineData: bucketByDay(currentRows, days),
  };
}

// ---------------------------------------------------------------------------
// Stat 2 — New Jobs Posted (genuinely period-bound, unlike the other three).
// No status filter — confirm the real status string before adding one.
// ---------------------------------------------------------------------------
async function fetchNewJobsPostedStat(range: DateRangeOption): Promise<DashboardStat> {
  const { currentStart, previousStart, now } = getRangeBounds(range);
  const days = RANGE_DAYS[range];

  const [currentRes, previousRes] = await Promise.all([
    supabase.from('jobs').select('posted_at').gte('posted_at', currentStart).lte('posted_at', now),
    supabase.from('jobs').select('posted_at').gte('posted_at', previousStart).lt('posted_at', currentStart),
  ]);

  if (currentRes.error) logAndThrow('jobs (current)', currentRes.error);
  if (previousRes.error) logAndThrow('jobs (previous)', previousRes.error);

  const currentRows = (currentRes.data ?? []).map((row) => ({ created_at: row.posted_at as string }));
  const value = currentRows.length;

  return {
    id: 'newJobsPosted',
    label: 'New Jobs Posted',
    value,
    formattedValue: formatCount(value),
    trend: buildTrend(value, (previousRes.data ?? []).length),
    sparklineData: bucketByDay(currentRows, days),
  };
}

// ---------------------------------------------------------------------------
// Stat 3 — Total Funds in Escrow. Headline is the live wallets.escrow_balance
// sum (a balance, not a flow). Trend proxies "escrow growth this period"
// using escrow_lock wallet_transactions, the same line item FinancialsPage
// already tracks separately from revenue.
// ---------------------------------------------------------------------------
async function fetchTotalFundsInEscrowStat(range: DateRangeOption): Promise<DashboardStat> {
  const { currentStart, previousStart, now } = getRangeBounds(range);
  const days = RANGE_DAYS[range];

  const [walletsRes, currentLocksRes, previousLocksRes] = await Promise.all([
    supabase.from('wallets').select('escrow_balance'),
    supabase
      .from('wallet_transactions')
      .select('amount, created_at')
      .eq('type', 'escrow_lock')
      .gte('created_at', currentStart)
      .lte('created_at', now),
    supabase
      .from('wallet_transactions')
      .select('amount')
      .eq('type', 'escrow_lock')
      .gte('created_at', previousStart)
      .lt('created_at', currentStart),
  ]);

  if (walletsRes.error) logAndThrow('wallets', walletsRes.error);
  if (currentLocksRes.error) logAndThrow('wallet_transactions/escrow_lock (current)', currentLocksRes.error);
  if (previousLocksRes.error) logAndThrow('wallet_transactions/escrow_lock (previous)', previousLocksRes.error);

  const totalEscrow = (walletsRes.data ?? []).reduce((sum, row) => sum + pf(row.escrow_balance), 0);
  const currentLockRows = currentLocksRes.data ?? [];
  const currentLockSum = currentLockRows.reduce((sum, row) => sum + pf(row.amount), 0);
  const previousLockSum = (previousLocksRes.data ?? []).reduce((sum, row) => sum + pf(row.amount), 0);

  return {
    id: 'totalFundsInEscrow',
    label: 'Total Funds in Escrow',
    value: totalEscrow,
    formattedValue: formatCurrency(totalEscrow),
    trend: buildTrend(currentLockSum, previousLockSum),
    sparklineData: bucketByDay(
      currentLockRows.map((row) => ({ created_at: row.created_at as string, weight: pf(row.amount) })),
      days
    ),
  };
}

// ---------------------------------------------------------------------------
// Stat 4 — Pending Withdrawals (current count, not period-windowed; trend
// compares new pending requests created this period vs last).
// ---------------------------------------------------------------------------
async function fetchPendingWithdrawalsStat(range: DateRangeOption): Promise<DashboardStat> {
  const { currentStart, previousStart, now } = getRangeBounds(range);
  const days = RANGE_DAYS[range];

  const [totalRes, currentRes, previousRes] = await Promise.all([
    supabase.from('wallet_transactions').select('id', { count: 'exact', head: true }).eq('type', 'withdrawal').eq('status', 'pending'),
    supabase
      .from('wallet_transactions')
      .select('created_at')
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .gte('created_at', currentStart)
      .lte('created_at', now),
    supabase
      .from('wallet_transactions')
      .select('created_at')
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .gte('created_at', previousStart)
      .lt('created_at', currentStart),
  ]);

  if (totalRes.error) logAndThrow('wallet_transactions/withdrawals (total)', totalRes.error);
  if (currentRes.error) logAndThrow('wallet_transactions/withdrawals (current)', currentRes.error);
  if (previousRes.error) logAndThrow('wallet_transactions/withdrawals (previous)', previousRes.error);

  const total = totalRes.count ?? 0;
  const currentRows = currentRes.data ?? [];

  return {
    id: 'pendingWithdrawals',
    label: 'Pending Withdrawals',
    value: total,
    formattedValue: formatCount(total),
    trend: buildTrend(currentRows.length, (previousRes.data ?? []).length),
    sparklineData: bucketByDay(currentRows, days),
  };
}

export async function fetchDashboardStats(range: DateRangeOption): Promise<DashboardStats> {
  const [totalActiveUsers, newJobsPosted, totalFundsInEscrow, pendingWithdrawals] = await Promise.all([
    fetchTotalActiveUsersStat(range),
    fetchNewJobsPostedStat(range),
    fetchTotalFundsInEscrowStat(range),
    fetchPendingWithdrawalsStat(range),
  ]);

  return { totalActiveUsers, newJobsPosted, totalFundsInEscrow, pendingWithdrawals };
}

// ---------------------------------------------------------------------------
// User Growth — trailing 12 months, freelancers vs clients. Decoupled from
// the day-range toggle on purpose (a 7-day window doesn't make sense bucketed
// by month). A profile counts in both series if user_type_names includes
// both roles.
// ---------------------------------------------------------------------------
export async function fetchUserGrowthChart(): Promise<UserGrowthPoint[]> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  const startIso = twelveMonthsAgo.toISOString();

  const [profilesRes, userTypesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('created_at, user_type_id')
      .or('role.is.null,role.neq.admin')
      .gte('created_at', startIso),
    supabase.from('user_types').select('id, type'),
  ]);

  if (profilesRes.error) logAndThrow('profiles (user growth)', profilesRes.error);
  if (userTypesRes.error) logAndThrow('user_types', userTypesRes.error);

  const typeNameById = new Map(
    (userTypesRes.data ?? []).map((row) => [row.id as string, ((row.type as string) ?? '').toLowerCase()])
  );

  const buckets = new Map<string, { freelancers: number; clients: number }>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { freelancers: 0, clients: 0 });
  }

  (profilesRes.data ?? []).forEach((row) => {
    const created = new Date(row.created_at as string);
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (!bucket) return;

    const typeIds = Array.isArray(row.user_type_id) ? (row.user_type_id as string[]) : [];
    const typeNames = typeIds.map((id) => typeNameById.get(id)).filter(Boolean) as string[];

    if (typeNames.some((name) => name.includes('find work'))) bucket.freelancers += 1;
    if (typeNames.some((name) => name.includes('hire talent'))) bucket.clients += 1;
  });

  return Array.from(buckets.entries()).map(([key, counts]) => {
    const [year, month] = key.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      month: key,
      label: date.toLocaleDateString('en-KE', { month: 'short' }),
      freelancers: counts.freelancers,
      clients: counts.clients,
    };
  });
}

// ---------------------------------------------------------------------------
// Top Job Locations — now respects the page-wide date range toggle (was
// previously all-time/unfiltered, which also meant pulling every job row).
// ---------------------------------------------------------------------------
export async function fetchTopJobLocations(range: DateRangeOption, limit = 4): Promise<BreakdownSlice[]> {
  const { currentStart, now } = getRangeBounds(range);

  const [jobsRes, locationsRes] = await Promise.all([
    supabase.from('jobs').select('location_id').gte('posted_at', currentStart).lte('posted_at', now),
    supabase.from('locations').select('id, location'),
  ]);

  if (jobsRes.error) logAndThrow('jobs (locations)', jobsRes.error);
  if (locationsRes.error) logAndThrow('locations', locationsRes.error);

  const nameById = new Map((locationsRes.data ?? []).map((row) => [row.id as string, row.location as string]));
  const counts = new Map<string, number>();
  let total = 0;

  (jobsRes.data ?? []).forEach((row) => {
    const locationId = row.location_id as string | null;
    if (!locationId) return;
    counts.set(locationId, (counts.get(locationId) ?? 0) + 1);
    total += 1;
  });

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      name: nameById.get(id) ?? 'Unknown',
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Top Job Categories — now respects the page-wide date range toggle. jobs.categories
// is an array of job_categories ids, so one job can contribute to multiple slices.
// ---------------------------------------------------------------------------
export async function fetchTopJobCategories(range: DateRangeOption, limit = 3): Promise<BreakdownSlice[]> {
  const { currentStart, now } = getRangeBounds(range);

  const [jobsRes, categoriesRes] = await Promise.all([
    supabase.from('jobs').select('categories').gte('posted_at', currentStart).lte('posted_at', now),
    supabase.from('job_categories').select('id, name'),
  ]);

  if (jobsRes.error) logAndThrow('jobs (categories)', jobsRes.error);
  if (categoriesRes.error) logAndThrow('job_categories', categoriesRes.error);

  const nameById = new Map((categoriesRes.data ?? []).map((row) => [row.id as string, row.name as string]));
  const counts = new Map<string, number>();
  let total = 0;

  (jobsRes.data ?? []).forEach((row) => {
    const categoryIds = Array.isArray(row.categories) ? (row.categories as string[]) : [];
    categoryIds.forEach((id) => {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      total += 1;
    });
  });
  console.log('nameById:', nameById);
  console.log('counts:', counts);

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      name: nameById.get(id) ?? 'unknown',
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Average Project Value — daily average jobs.budget. TODO: once the
// payment_type_id lookup table + its fixed/hourly column are confirmed, join
// it here and split into fixedAverage/hourlyAverage like the Figma design
// shows two series instead of one.
// ---------------------------------------------------------------------------
export async function fetchProjectValueChart(range: DateRangeOption): Promise<ProjectValuePoint[]> {
  const { currentStart, now } = getRangeBounds(range);
  const days = RANGE_DAYS[range];

  const { data, error } = await supabase
    .from('jobs')
    .select('budget, posted_at')
    .gte('posted_at', currentStart)
    .lte('posted_at', now);

  if (error) logAndThrow('jobs (project value)', error);

  const rows = data ?? [];
  const points: ProjectValuePoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayStr = day.toISOString().slice(0, 10);

    const dayRows = rows.filter((row) => (row.posted_at as string)?.slice(0, 10) === dayStr);
    const average = dayRows.length > 0 ? dayRows.reduce((sum, row) => sum + pf(row.budget), 0) / dayRows.length : 0;

    points.push({
      date: dayStr,
      label: day.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
      averageValue: Math.round(average),
    });
  }

  return points;
}

// ---------------------------------------------------------------------------
// Recent Actions — admin-relevant events (not the personal "your bid was
// viewed" style notifications shown in the Figma mockup; see chat for why).
// ---------------------------------------------------------------------------
export async function fetchRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const [jobsRes, withdrawalsRes, profilesRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, title, posted_at, posted_by_user_id')
      .order('posted_at', { ascending: false })
      .limit(limit),
    supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, created_at')
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('profiles')
      .select('id, first_name, last_name, created_at')
      .or('role.is.null,role.neq.admin')
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  if (jobsRes.error) logAndThrow('jobs (activity)', jobsRes.error);
  if (withdrawalsRes.error) logAndThrow('wallet_transactions (activity)', withdrawalsRes.error);
  if (profilesRes.error) logAndThrow('profiles (activity)', profilesRes.error);

  const posterIds = Array.from(new Set((jobsRes.data ?? []).map((row) => row.posted_by_user_id).filter(Boolean))) as string[];
  const withdrawalUserIds = Array.from(new Set((withdrawalsRes.data ?? []).map((row) => row.user_id).filter(Boolean))) as string[];
  const nameLookupIds = Array.from(new Set([...posterIds, ...withdrawalUserIds]));

  let names = new Map<string, string>();
  if (nameLookupIds.length > 0) {
    const { data: nameRows, error: nameError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', nameLookupIds);
    if (nameError) logAndThrow('profiles (name lookup)', nameError);
    names = new Map((nameRows ?? []).map((row) => [row.id as string, joinName(row.first_name, row.last_name)]));
  }

  const jobItems: ActivityItem[] = (jobsRes.data ?? []).map((row) => ({
    id: `job-${row.id}`,
    type: 'job_posted',
    message: `${names.get(row.posted_by_user_id as string) ?? 'Someone'} posted a new job: ${row.title ?? 'Untitled'}`,
    actorName: names.get(row.posted_by_user_id as string),
    createdAt: row.posted_at as string,
    actionLabel: 'View Job',
  }));

  const withdrawalItems: ActivityItem[] = (withdrawalsRes.data ?? []).map((row) => ({
    id: `withdrawal-${row.id}`,
    type: 'withdrawal_requested',
    message: `${names.get(row.user_id as string) ?? 'Someone'} requested a withdrawal of ${formatCurrency(pf(row.amount))}`,
    actorName: names.get(row.user_id as string),
    createdAt: row.created_at as string,
    actionLabel: 'Review Withdrawal',
  }));

  const userItems: ActivityItem[] = (profilesRes.data ?? []).map((row) => ({
    id: `user-${row.id}`,
    type: 'user_signed_up',
    message: `${joinName(row.first_name, row.last_name)} joined Weera`,
    actorName: joinName(row.first_name, row.last_name),
    createdAt: row.created_at as string,
    actionLabel: 'View Profile',
  }));

  return [...jobItems, ...withdrawalItems, ...userItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}