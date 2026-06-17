/**
 * Dashboard feature — shared types
 *
 * Schema reference (confirmed against your real Supabase project):
 *   - profiles            (id, created_at, first_name, last_name, role, user_type_id[], location_id)
 *   - user_types          (id, type)
 *   - locations            (id, location)
 *   - jobs                 (id, posted_at, status, title, posted_by_user_id, location_id,
 *                            budget, payment_type_id, categories[])
 *   - job_categories       (id, name)
 *   - wallets              (id, escrow_balance)
 *   - wallet_transactions  (id, created_at, type, amount, status, user_id)
 *
 * payment_type_id's lookup table/fixed-vs-hourly column isn't confirmed yet —
 * see the TODO in services/dashboardService.ts's fetchProjectValueChartData.
 */

export type TrendDirection = 'up' | 'down' | 'flat';

export interface StatTrend {
  /** Percentage change vs. the previous period, e.g. 12.4 for +12.4% */
  changePercent: number;
  direction: TrendDirection;
}

export type DashboardStatId =
  | 'totalActiveUsers'
  | 'newJobsPosted'
  | 'totalFundsInEscrow'
  | 'pendingWithdrawals';

export interface DashboardStat {
  id: DashboardStatId;
  label: string;
  value: number;
  /** Pre-formatted for display, e.g. "KES 250,000" or "52,450" */
  formattedValue: string;
  trend: StatTrend;
  /** Daily-bucketed values for the inline sparkline, oldest first */
  sparklineData: number[];
}

export type DashboardStats = Record<DashboardStatId, DashboardStat>;

export interface ChartDataPoint {
  /** ISO date, e.g. "2026-06-01" */
  date: string;
  /** Human-friendly X-axis label, e.g. "Jun 1" */
  label: string;
  revenue: number;
  signups: number;
  
}

export type ActivityType = 'job_posted' | 'withdrawal_requested' | 'user_signed_up';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  /** Ready-to-render summary, e.g. "Asha M. posted a new job: Plumbing repair" */
  message: string;
  actorName?: string;
  /** ISO timestamp */
  createdAt: string;
  /** Label for the action button, e.g. "View Jobs" */
  actionLabel: string;
}

export type DateRangeOption = '7d' | '30d' | '90d';

export interface UserGrowthPoint {
  /** e.g. "2026-01" */
  month: string;
  /** e.g. "Jan" */
  label: string;
  freelancers: number;
  clients: number;
}

export interface BreakdownSlice {
  id: string;
  name: string;
  count: number;
  /** 0–100 */
  percent: number;
}

export interface ProjectValuePoint {
  date: string;
  label: string;
  averageValue: number;
  /** Present once payment_type lookup is wired up; undefined until then. */
  fixedAverage?: number;
  hourlyAverage?: number;
}