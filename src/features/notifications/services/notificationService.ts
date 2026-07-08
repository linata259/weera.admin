import { supabase } from 'services/supabaseClient';
import type { AdminNotification, NotificationCategory } from '../types';

const LOOK_BACK_DAYS = 7;
const LOOK_BACK_HOURS_JOBS = 24;

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function hoursAgo(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
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
  const cutoff24h = hoursAgo(LOOK_BACK_HOURS_JOBS);

  const [
    usersResult,
    withdrawalsResult,
    ticketsResult,
    jobsResult,
    refundsResult,
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

    // 3. Open or urgent/high support tickets (last 7 days)
    supabase
      .from('support_tickets')
      .select('id, ticket_id, status, priority, created_at')
      .or('status.eq.open,priority.eq.urgent,priority.eq.high')
      .neq('status', 'resolved')
      .neq('status', 'closed')
      .gte('created_at', cutoffWeek)
      .order('created_at', { ascending: false })
      .limit(50),

    // 4. New jobs posted in the last 24 hours
    supabase
      .from('jobs')
      .select('id, title, created_at')
      .eq('is_deleted', false)
      .gte('created_at', cutoff24h)
      .order('created_at', { ascending: false })
      .limit(50),

    // 5. Pending refunds (escrow transactions awaiting refund)
    supabase
      .from('escrow_transactions')
      .select('id, job_id, amount, created_at, status')
      .in('status', ['refund_requested', 'dispute', 'pending_refund'])
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
    const isUrgent = t.priority === 'urgent' || t.priority === 'high';
    const category: NotificationCategory = isUrgent
      ? 'support_ticket_urgent'
      : 'support_ticket_open';
    const id = makeId(category, t.id);
    notifications.push({
      id,
      category,
      title: isUrgent ? 'Urgent support ticket' : 'New support ticket',
      body: isUrgent
        ? `Ticket #${t.ticket_id ?? t.id} is marked ${t.priority} priority.`
        : `Ticket #${t.ticket_id ?? t.id} has been opened and needs attention.`,
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

  // ── 5. Pending refunds ──────────────────────────────────────────────────────
  (refundsResult.data ?? []).forEach((e) => {
    const id = makeId('pending_refund', e.id);
    const amount = typeof e.amount === 'number' ? `KES ${e.amount.toLocaleString()}` : '';
    notifications.push({
      id,
      category: 'pending_refund',
      title: 'Refund / dispute pending',
      body: `An escrow refund${amount ? ` of ${amount}` : ''} is pending review.`,
      referenceId: e.id,
      href: '/financials',
      createdAt: e.created_at,
      isRead: readIds.has(id),
    });
  });

  // Sort newest first
  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return notifications;
}
