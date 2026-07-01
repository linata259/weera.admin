import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import type { AdminNotification, NotificationCategory } from '../types';

/* ── Design tokens (matches the rest of the admin panel) ───── */
const ORANGE = '#EA580C';
const NAVY   = '#0F172A';
const SLATE  = '#64748B';
const BORDER = '#E2E8F0';
const BG     = '#F8FAFC';

/* ── Category meta ─────────────────────────────────────────── */
const CAT_META: Record<NotificationCategory, { label: string; color: string; bg: string }> = {
  user_signup:           { label: 'New User',        color: '#1D4ED8', bg: '#DBEAFE' },
  withdrawal_request:    { label: 'Withdrawal',      color: '#B45309', bg: '#FEF3C7' },
  support_ticket_open:   { label: 'Support Ticket',  color: '#6D28D9', bg: '#EDE9FE' },
  support_ticket_urgent: { label: 'Urgent Ticket',   color: '#B91C1C', bg: '#FEE2E2' },
  new_job:               { label: 'New Job',         color: '#065F46', bg: '#D1FAE5' },
  pending_refund:        { label: 'Refund',          color: '#C2410C', bg: '#FFEDD5' },
};

const ALL_CATEGORIES: NotificationCategory[] = [
  'user_signup',
  'withdrawal_request',
  'support_ticket_open',
  'support_ticket_urgent',
  'new_job',
  'pending_refund',
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/* ── Helpers ───────────────────────────────────────────────── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ── Stat card ─────────────────────────────────────────────── */
const statCardStyle: React.CSSProperties = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: 16,
  minHeight: 92,
  boxSizing: 'border-box',
  display: 'grid',
  alignContent: 'space-between',
};

/* ── Sort arrow ────────────────────────────────────────────── */
const SortArrow: React.FC<{ active: boolean; dir: 'asc' | 'desc' }> = ({ active, dir }) =>
  active ? (
    <span style={{ marginLeft: 4, fontSize: 10, color: NAVY }}>{dir === 'asc' ? '↑' : '↓'}</span>
  ) : (
    <span style={{ marginLeft: 4, fontSize: 10, color: '#CBD5E1' }}>↕</span>
  );

/* ── Pagination ────────────────────────────────────────────── */
const Pagination: React.FC<{
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}> = ({ page, totalPages, pageSize, totalItems, onPage, onPageSize }) => {
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  const btn: React.CSSProperties = {
    minWidth: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
    background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 8px', fontFamily: 'inherit', color: NAVY,
  };

  return (
    <div style={{
      padding: '14px 20px', borderTop: `1px solid #F1F5F9`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10, background: BG,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: SLATE }}>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          style={{
            padding: '5px 10px', borderRadius: 8, border: `1px solid ${BORDER}`,
            fontSize: 13, color: NAVY, background: '#fff', cursor: 'pointer',
            fontFamily: 'inherit', outline: 'none',
          }}
        >
          {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ fontSize: 13, color: SLATE }}>
          {totalItems === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)}`} of {totalItems}
        </span>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            style={{ ...btn, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {pages.map((p, i) =>
            p === '…'
              ? <span key={`e${i}`} style={{ ...btn, cursor: 'default', border: 'none', color: SLATE }}>…</span>
              : <button
                  key={p}
                  onClick={() => onPage(p as number)}
                  style={{
                    ...btn,
                    background: page === p ? ORANGE : '#fff',
                    color: page === p ? '#fff' : NAVY,
                    border: `1px solid ${page === p ? ORANGE : BORDER}`,
                  }}
                >
                  {p}
                </button>
          )}

          <button
            onClick={() => onPage(page + 1)}
            disabled={page === totalPages}
            style={{ ...btn, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════ */
const NotificationsPage: React.FC = () => {
  const { notifications, loading, error, unreadCount, refresh, markAsRead, markAllAsRead } =
    useNotifications();
  const navigate = useNavigate();

  /* ── filter / sort state ─────────────────────────────────── */
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState<'all' | NotificationCategory>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [sortKey,   setSortKey]   = useState<'createdAt' | 'category' | 'title'>('createdAt');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  /* ── stats ───────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:       notifications.length,
    unread:      notifications.filter((n) => !n.isRead).length,
    withdrawals: notifications.filter((n) => n.category === 'withdrawal_request').length,
    urgent:      notifications.filter((n) => n.category === 'support_ticket_urgent').length,
    refunds:     notifications.filter((n) => n.category === 'pending_refund').length,
  }), [notifications]);

  /* ── filter + sort pipeline ──────────────────────────────── */
  const filtered = useMemo(() => {
    let list = notifications;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q),
      );
    }
    if (catFilter !== 'all')    list = list.filter((n) => n.category === catFilter);
    if (readFilter === 'unread') list = list.filter((n) => !n.isRead);
    if (readFilter === 'read')   list = list.filter((n) => n.isRead);

    return [...list].sort((a, b) => {
      let av = '';
      let bv = '';
      if (sortKey === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
      else if (sortKey === 'category') { av = a.category; bv = b.category; }
      else if (sortKey === 'title')    { av = a.title;    bv = b.title;    }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [notifications, search, catFilter, readFilter, sortKey, sortDir]);

  /* reset to page 1 on filter change */
  React.useEffect(() => { setPage(1); }, [search, catFilter, readFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ── shared cell styles ──────────────────────────────────── */
  const th: React.CSSProperties = {
    padding: '14px 16px', textAlign: 'left',
    fontSize: 12, fontWeight: 800, color: SLATE,
    textTransform: 'uppercase', borderBottom: `1px solid ${BORDER}`,
    background: BG, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
  };
  const td: React.CSSProperties = {
    padding: '14px 16px', fontSize: 14, color: NAVY,
    borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle',
  };

  /* ── loading / error states ──────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: SLATE }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTop: `3px solid ${ORANGE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Loading notifications…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 14, border: '1px solid #FCA5A5', borderRadius: 10, color: '#B91C1C', background: '#FEF2F2', fontSize: 14, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
        {error}
        <button onClick={refresh} style={{ marginLeft: 12, cursor: 'pointer', color: ORANGE, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>

      {/* ── Stat cards ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {[
          { label: 'Total',          value: stats.total       },
          { label: 'Unread',         value: stats.unread      },
          { label: 'Withdrawals',    value: stats.withdrawals },
          { label: 'Urgent Tickets', value: stats.urgent      },
          { label: 'Refunds',        value: stats.refunds     },
        ].map((s) => (
          <div key={s.label} style={statCardStyle}>
            <div style={{ color: SLATE, fontSize: 13, fontWeight: 700 }}>{s.label}</div>
            <div style={{ color: NAVY,  fontSize: 28, fontWeight: 800 }}>{s.value.toLocaleString('en-US')}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>

          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5" />
              <path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: NAVY }}
            />
          </div>

          {/* Category filter */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as typeof catFilter)}
            style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', minWidth: 160 }}
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CAT_META[c].label}</option>
            ))}
          </select>

          {/* Read/Unread filter */}
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as typeof readFilter)}
            style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', minWidth: 140 }}
          >
            <option value="all">All Statuses</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={refresh}
            style={{ padding: '8px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: NAVY, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{ padding: '8px 14px', border: `1px solid ${ORANGE}40`, borderRadius: 8, background: `${ORANGE}08`, fontSize: 13, fontWeight: 600, color: ORANGE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 56, cursor: 'default' }}>Sr. No.</th>
                <th style={th} onClick={() => handleSort('category')}>
                  Category <SortArrow active={sortKey === 'category'} dir={sortDir} />
                </th>
                <th style={th} onClick={() => handleSort('title')}>
                  Notification <SortArrow active={sortKey === 'title'} dir={sortDir} />
                </th>
                <th style={th} onClick={() => handleSort('createdAt')}>
                  Date <SortArrow active={sortKey === 'createdAt'} dir={sortDir} />
                </th>
                <th style={{ ...th, cursor: 'default' }}>Status</th>
                <th style={{ ...th, cursor: 'default' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '48px 0' }}>
                    No notifications found.
                  </td>
                </tr>
              ) : (
                paginated.map((n: AdminNotification, idx: number) => {
                  const meta = CAT_META[n.category];
                  return (
                    <tr
                      key={n.id}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = BG; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#fff'; }}
                      style={{ transition: 'background 0.1s' }}
                    >
                      {/* # */}
                      <td style={{ ...td, color: '#94A3B8', fontSize: 13 }}>
                        {String((page - 1) * pageSize + idx + 1).padStart(2, '0')}
                      </td>

                      {/* Category badge */}
                      <td style={td}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '4px 10px', borderRadius: 999,
                          fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                          background: meta.bg, color: meta.color,
                        }}>
                          {meta.label}
                        </span>
                      </td>

                      {/* Title + body */}
                      <td style={{ ...td, maxWidth: 340 }}>
                        <div style={{ fontSize: 14, fontWeight: n.isRead ? 500 : 800, color: NAVY }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 12, color: SLATE, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.body}
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: 13, color: NAVY }}>{formatDate(n.createdAt)}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{formatTime(n.createdAt)}</div>
                      </td>

                      {/* Read / Unread badge */}
                      <td style={td}>
                        {n.isRead ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: '#F1F5F9', color: SLATE }}>
                            Read
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, background: '#DCFCE7', color: '#15803D' }}>
                            Unread
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={td}>
                        <button
                          onClick={() => { markAsRead(n.id); navigate(n.href); }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 8,
                            border: `1px solid ${BORDER}`,
                            background: '#fff', color: NAVY,
                            fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                            transition: 'background 0.12s, border-color 0.12s',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = BG;
                            (e.currentTarget as HTMLButtonElement).style.borderColor = '#CBD5E1';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
                          }}
                        >
                          View
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPage={setPage}
          onPageSize={(n) => { setPageSize(n); setPage(1); }}
        />
      </div>
    </div>
  );
};

export default NotificationsPage;
