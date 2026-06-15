/* ─── src/features/reports/types.ts ─────────────────────────── */

export interface JobReport {
  id: string;
  job_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  admin_response: string | null;
  responded_at: string | null;
  admin_id: string | null;
  /* joined */
  job_title: string;
  reporter_name: string;
  reporter_avatar: string | null;
}

export interface MessageReport {
  id: string;
  message_id: string;
  reporter_id: string;
  conversation_id: string;
  attachment_url: string | null;
  reason: string;
  note: string | null;
  created_at: string;
  conversation_key: string | null;
  /* joined */
  reporter_name: string;
  reporter_avatar: string | null;
}

export type Tab = 'job_reports' | 'message_reports';

/* ── design tokens ───────────────────────────────────────────── */
export const ORANGE = '#EA580C';
export const NAVY   = '#0F172A';
export const SLATE  = '#64748B';
export const BORDER = '#E2E8F0';
export const BG     = '#F8FAFC';
export const RED    = '#DC2626';
export const GREEN  = '#16A34A';
export const BLUE   = '#2563EB';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#CA8A04', bg: '#FEF9C3' },
  reviewed:  { label: 'Reviewed',  color: BLUE,      bg: '#DBEAFE' },
  resolved:  { label: 'Resolved',  color: GREEN,     bg: '#DCFCE7' },
  dismissed: { label: 'Dismissed', color: SLATE,     bg: BG        },
  actioned:  { label: 'Actioned',  color: RED,       bg: '#FEE2E2' },
};

export const stS = (s: string) =>
  STATUS_STYLE[s?.toLowerCase()] ?? { label: s ?? 'Unknown', color: SLATE, bg: BG };

export const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const capitalize = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '—';