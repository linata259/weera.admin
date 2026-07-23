import { supabase } from 'services/supabaseClient';
import type { AdminNotification, NotificationCategory } from '../types';

const LOOK_BACK_DAYS = 7;

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function makeId(category: NotificationCategory, referenceId: string): string {
  return `${category}__${referenceId}`;
}

/** Load which notification IDs have been marked read from localStorage */
export function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem('weera_notifications_read');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

/** Persist a single notification ID as read */
export function markAsRead(id: string): void {
  const ids = loadReadIds();
  ids.add(id);
  localStorage.setItem('weera_notifications_read', JSON.stringify(Array.from(ids)));
}

/** Persist all notification IDs as read */
export function markAllAsRead(ids: string[]): void {
  const existing = loadReadIds();
  ids.forEach((id) => existing.add(id));
  localStorage.setItem('weera_notifications_read', JSON.stringify(Array.from(existing)));
}

export async function fetchNotifications(): Promise<AdminNotification[]> {
  const readIds = loadReadIds();
  const cutoffWeek = daysAgo(LOOK_BACK_DAYS);

  const [
    usersResult,
    withdrawalsResult,
    ticketsResult,
    jobsResult,
    escrowDisputesResult,
    jobReportsResult,
    messageReportsResult,
    reportRepliesResult,
  ] = await Promise.all([
    // 1. New user sign-ups (last 7 days, non-admin)
    supabase
      .from('profiles')
      .select('id, first_name, last_name, created_at')
      .or('role.is.null,role.neq.admin')
      .eq('is_active', true)
      .gte('created_at', cutoffWeek)
      .order('created_at', { ascending: false })
      .limit(50),

    // 2. Pending withdrawal requests
    supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, created_at')
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50),

    // 3. Open support tickets (last 7 days).
    // NOTE: support_tickets has no `ticket_id` or `priority` column — priority
    // is inferred in the UI, not stored — so we select only real columns.
    supabase
      .from('support_tickets')
      .select('id, status, created_at')
      .eq('status', 'open')
      .gte('created_at', cutoffWeek)
      .order('created_at', { ascending: false })
      .limit(50),

    // 4. New jobs posted in the last 7 days.
    // NOTE: `jobs` has no `is_deleted` column (that's on `profiles`) — the
    // old filter here was silently erroring on every request.
    supabase
      .from('jobs')
      .select('id, title, created_at')
      .gte('created_at', cutoffWeek)
      .order('created_at', { ascending: false })
      .limit(50),

    // 5. Escrow disputes needing admin review.
    // NOTE: there is no `escrow_transactions` table — escrow lives in the
    // `escrow` table, with status one of held/released/refunded/disputed.
    // 'disputed' is the only state that actually needs admin attention.
    supabase
      .from('escrow')
      .select('id, job_id, amount, status, created_at')
      .eq('status', 'disputed')
      .order('created_at', { ascending: false })
      .limit(50),

    // 6. New job reports (last 7 days)
    supabase
      .from('job_reports')
      .select('id, job_id, reason, status, created_at')
      .gte('created_at', cutoffWeek)
      .order('created_at', { ascending: false })
      .limit(50),

    // 7. New message reports (last 7 days)
    supabase
      .from('message_reports')
      .select('id, reason, created_at')
      .gte('created_at', cutoffWeek)
      .order('created_at', { ascending: false })
      .limit(50),

    // 8. Users replying back on a report (last 7 days) — the admin previously
    // had no way to find out these existed at all.
    supabase
      .from('job_report_replies')
      .select('id, report_id, message, created_at')
      .eq('sender_role', 'user')
      .gte('created_at', cutoffWeek)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const notifications: AdminNotification[] = [];

  // ── 1. User sign-ups ────────────────────────────────────────────────────────
  (usersResult.data ?? []).forEach((u) => {
    const id = makeId('user_signup', u.id);
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'New user';
    notifications.push({
      id,
      category: 'user_signup',
      title: 'New user registration',
      body: `${name} just joined the platform.`,
      referenceId: u.id,
      href: '/users',
      createdAt: u.created_at,
      isRead: readIds.has(id),
    });
  });

  // ── 2. Pending withdrawals ──────────────────────────────────────────────────
  (withdrawalsResult.data ?? []).forEach((tx) => {
    const id = makeId('withdrawal_request', tx.id);
    const amount = typeof tx.amount === 'number' ? `KES ${tx.amount.toLocaleString()}` : '';
    notifications.push({
      id,
      category: 'withdrawal_request',
      title: 'Pending withdrawal request',
      body: `A withdrawal request${amount ? ` of ${amount}` : ''} is awaiting approval.`,
      referenceId: tx.id,
      href: '/financials',
      createdAt: tx.created_at,
      isRead: readIds.has(id),
    });
  });

  // ── 3. Support tickets ──────────────────────────────────────────────────────
  (ticketsResult.data ?? []).forEach((t) => {
    const category: NotificationCategory = 'support_ticket_open';
    const id = makeId(category, t.id);
    const shortRef = String(t.id).replace(/[^0-9]/g, '').slice(0, 6) || String(t.id).slice(0, 6);
    notifications.push({
      id,
      category,
      title: 'New support ticket',
      body: `Ticket #${shortRef} has been opened and needs attention.`,
      referenceId: t.id,
      href: '/help-support',
      createdAt: t.created_at,
      isRead: readIds.has(id),
    });
  });

  // ── 4. New jobs ─────────────────────────────────────────────────────────────
  (jobsResult.data ?? []).forEach((j) => {
    const id = makeId('new_job', j.id);
    notifications.push({
      id,
      category: 'new_job',
      title: 'New job posted',
      body: `"${j.title ?? 'Untitled job'}" was just posted.`,
      referenceId: j.id,
      href: '/jobs',
      createdAt: j.created_at,
      isRead: readIds.has(id),
    });
  });

  // ── 5. Escrow disputes ──────────────────────────────────────────────────────
  (escrowDisputesResult.data ?? []).forEach((e: any) => {
    const id = makeId('escrow_dispute', e.id);
    const amount = typeof e.amount === 'number' ? `KES ${e.amount.toLocaleString()}` : '';
    notifications.push({
      id,
      category: 'escrow_dispute',
      title: 'Escrow dispute needs review',
      body: `An escrow${amount ? ` of ${amount}` : ''} has been disputed and needs admin review.`,
      referenceId: e.id,
      href: '/financials',
      createdAt: e.created_at,
      isRead: readIds.has(id),
    });
  });

  // ── 6. New job reports ──────────────────────────────────────────────────────
  (jobReportsResult.data ?? []).forEach((r: any) => {
    const id = makeId('job_report', r.id);
    notifications.push({
      id,
      category: 'job_report',
      title: 'New job report filed',
      body: `A user filed a report${r.reason ? ` (${String(r.reason).replace(/_/g, ' ')})` : ''} on a job.`,
      referenceId: r.id,
      href: '/jobs/reports',
      createdAt: r.created_at,
      isRead: readIds.has(id),
    });
  });

  // ── 7. New message reports ──────────────────────────────────────────────────
  (messageReportsResult.data ?? []).forEach((r: any) => {
    const id = makeId('message_report', r.id);
    notifications.push({
      id,
      category: 'message_report',
      title: 'New message reported',
      body: `A chat message was reported${r.reason ? ` (${String(r.reason).replace(/_/g, ' ')})` : ''}.`,
      referenceId: r.id,
      href: '/jobs/reports',
      createdAt: r.created_at,
      isRead: readIds.has(id),
    });
  });

  // ── 8. Users replying on a report ───────────────────────────────────────────
  (reportRepliesResult.data ?? []).forEach((r: any) => {
    const id = makeId('report_reply', r.id);
    const preview = String(r.message ?? '').slice(0, 120);
    notifications.push({
      id,
      category: 'report_reply',
      title: 'User replied to a report',
      body: preview || 'A user added a reply to their report.',
      referenceId: r.report_id,
      href: '/jobs/reports',
      createdAt: r.created_at,
      isRead: readIds.has(id),
    });
  });

  // Sort newest first
  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return notifications;
}
