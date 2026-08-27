import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { fetchWithdrawalQueue, dispatchWithdrawalNow, retryWithdrawal } from '../api/financialService';
import { WithdrawalRequest, WithdrawalStatus } from '../types';
import { exportCsv } from '../utils/exportCsv';
import { exportPdf } from '../utils/exportPdf';
import { Avatar } from '../../shared/Avatar';

const ORANGE = '#EA580C';
const NAVY   = '#0F172A';
const SLATE  = '#64748B';
const BORDER = '#E2E8F0';
const BG     = '#F8FAFC';
const GREEN  = '#16A34A';
const RED    = '#DC2626';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Mirrors withdrawal_requests' status CHECK constraint: queued → processing
// → dispatched → completed, or failed / cancelled off that path.
const WD_STYLE: Record<WithdrawalStatus, { label: string; color: string; bg: string }> = {
  queued:      { label: 'Queued',      color: '#CA8A04', bg: '#FEF9C3' },
  processing:  { label: 'Processing',  color: '#2563EB', bg: '#DBEAFE' },
  dispatched:  { label: 'Dispatched',  color: '#7C3AED', bg: '#EDE9FE' },
  completed:   { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
  failed:      { label: 'Failed',      color: '#DC2626', bg: '#FEE2E2' },
  cancelled:   { label: 'Cancelled',   color: '#64748B', bg: '#F1F5F9' },
};
const wdS = (s: string) => WD_STYLE[s as WithdrawalStatus] ?? { label: s, color: SLATE, bg: BG };

const fmt     = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const fmtAmt  = (n: number)  => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// hours_until_due is a float from the view (extract(epoch from ...)/3600).
// Negative means it's past due and just waiting for the worker's next pass.
function dueLabel(status: WithdrawalStatus, hours: number, scheduledFor: string): string {
  if (status !== 'queued' && status !== 'processing') return fmtTime(scheduledFor);
  if (hours <= 0) return 'Due now';
  if (hours < 1) return `In ${Math.round(hours * 60)}m`;
  if (hours < 24) return `In ${Math.round(hours)}h`;
  return `In ${Math.round(hours / 24)}d`;
}

/* ── shared sub-components ──────────────────────────────────── */
const ExBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button onClick={onClick} style={{
    padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 8,
    background: '#fff', fontSize: 13, fontWeight: 600, color: NAVY,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
  }}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M14 10v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2M8 2v8M5 5l3-3 3 3"
        stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {label}
  </button>
);

const StatChip: React.FC<{ label: string; count: number; amount: number; color: string; bg: string }> = ({ label, count, amount, color, bg }) => (
  <div style={{
    flex: '1 1 140px', minWidth: 130, padding: '12px 16px', borderRadius: 12,
    background: bg, display: 'flex', flexDirection: 'column', gap: 2,
  }}>
    <span style={{ fontSize: 12, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</span>
    <span style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>{count}</span>
    <span style={{ fontSize: 12, color: SLATE }}>{fmtAmt(amount)}</span>
  </div>
);

/* ── Pagination ──────────────────────────────────────────────── */
const Pagination: React.FC<{
  page: number; totalPages: number; pageSize: number;
  totalItems: number; onPage: (p: number) => void; onPageSize: (n: number) => void;
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
        <select value={pageSize} onChange={e => onPageSize(Number(e.target.value))} style={{
          padding: '5px 10px', borderRadius: 8, border: `1px solid ${BORDER}`,
          fontSize: 13, color: NAVY, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
        }}>
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ fontSize: 13, color: SLATE }}>
          {totalItems === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)}`} of {totalItems}
        </span>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => onPage(page - 1)} disabled={page === 1}
            style={{ ...btn, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {pages.map((p, i) => p === '…'
            ? <span key={`e${i}`} style={{ ...btn, cursor: 'default', border: 'none', color: SLATE }}>…</span>
            : <button key={p} onClick={() => onPage(p as number)} style={{
                ...btn,
                background: page === p ? ORANGE : '#fff',
                color: page === p ? '#fff' : NAVY,
                border: `1px solid ${page === p ? ORANGE : BORDER}`,
              }}>{p}</button>
          )}

          <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
            style={{ ...btn, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Send-now action ───────────────────────────────────────────
   This runs the real dispatch, not a reschedule.

   admin_release_withdrawal_now only moves scheduled_for to now(), which does
   nothing at all to a row that is already overdue — and those are precisely
   the rows someone opens this tab to rescue. The earlier version of this
   button knew that and gave up ("Due — awaiting worker"), which left the tab
   with no action on the only rows that needed one. So it calls
   process-withdrawal-queue for this single request instead: same claim,
   same dispatch, same notifications the cron worker would have sent.

   'processing' deliberately gets no button. Such a row is either in a
   worker's hands this second or was stranded by one that died mid-dispatch,
   and nothing visible here distinguishes them. Re-sending the first pays
   twice; the second needs the IntaSend dashboard checked first. (The claim
   takes a row lock with `skip locked`, so even a mis-click on a live row is
   refused rather than duplicated — but the button shouldn't invite it.) */
const ReleaseBtn: React.FC<{
  row: WithdrawalRequest;
  busy: boolean;
  onSend: (row: WithdrawalRequest) => void;
  onRetry: (row: WithdrawalRequest) => void;
}> = ({ row, busy, onSend, onRetry }) => {
  if (row.status === 'processing') {
    return <span style={{ fontSize: 12, color: SLATE, whiteSpace: 'nowrap' }}>With the worker</span>;
  }

  // A failed request has already been reversed — the money is sitting in the
  // freelancer's balance right now. So this button does not re-send anything;
  // it asks the database to build a fresh withdrawal in its place. Labelled
  // 'Retry' because that is what it means to the person clicking, but see
  // admin_retry_withdrawal for what actually happens.
  if (row.status === 'failed') {
    if (row.alreadyRetried) {
      return <span style={{ fontSize: 12, color: SLATE, whiteSpace: 'nowrap' }}>Retried</span>;
    }
    return (
      <button
        disabled={busy}
        onClick={() => onRetry(row)}
        title="Create a new withdrawal to replace this failed one"
        style={{
          padding: '6px 12px', borderRadius: 8, border: `1px solid ${NAVY}`,
          background: busy ? '#F1F5F9' : '#fff', color: NAVY,
          fontSize: 12, fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}
      >
        {busy ? 'Retrying…' : 'Retry'}
      </button>
    );
  }

  if (row.status !== 'queued') {
    return <span style={{ color: '#CBD5E1', fontSize: 13 }}>—</span>;
  }

  // Due is the ordinary case and gets the solid button. Early is a real
  // decision — it spends float that has not cleared yet — so it stays an
  // outline and says so on the label rather than hiding behind one word.
  const due = row.hoursUntilDue <= 0;

  return (
    <button
      disabled={busy}
      onClick={() => onSend(row)}
      title={due
        ? 'Dispatch this payout now'
        : 'This money has not finished clearing with IntaSend yet'}
      style={{
        padding: '6px 12px', borderRadius: 8, border: `1px solid ${ORANGE}`,
        background: busy ? '#FFF7ED' : (due ? ORANGE : '#fff'),
        color: busy ? ORANGE : (due ? '#fff' : ORANGE),
        fontSize: 12, fontWeight: 700,
        cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
      }}
    >
      {busy ? 'Sending…' : due ? 'Send now' : 'Send early'}
    </button>
  );
};

/* ══════════════════════════════════════════════════════════════ */
export const WithdrawalsTable: React.FC = () => {
  const [rows,    setRows]    = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('all');
  const [dateFrom,setDateFrom]= useState('');
  const [dateTo,  setDateTo]  = useState('');
  const [page,    setPage]    = useState(1);
  const [pageSize,setPageSize]= useState(25);
  const [sortKey, setSortKey] = useState<keyof WithdrawalRequest>('requestedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [isMobile, setIsMobile] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchWithdrawalQueue().then(setRows).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSend = async (row: WithdrawalRequest) => {
    const due = row.hoursUntilDue <= 0;

    const prompt = due
      ? `Send ${fmtAmt(row.netAmount)} to ${row.userName} (${row.phoneNumber}) now?\n\n` +
        `Reference ${row.reference}. This dispatches the payout immediately.`
      : `${row.reference} has not finished clearing yet — it is due ${dueLabel(row.status, row.hoursUntilDue, row.scheduledFor).toLowerCase()}.\n\n` +
        `Sending ${fmtAmt(row.netAmount)} now pays it out of float that other ` +
        `users' cleared deposits are backing, and it may be refused by IntaSend. Continue?`;

    if (!window.confirm(prompt)) return;

    setSendingId(row.id);
    const result = await dispatchWithdrawalNow(row.id);
    setSendingId(null);

    if (result.ok) {
      setToast({ ok: true, text: `${row.reference} sent — ${fmtAmt(row.netAmount)} on its way to ${row.phoneNumber}.` });
    } else if (result.outcome === 'requeued') {
      // Not a failure the admin caused, and the money is still held and still
      // scheduled. Say what the provider said and that it will retry itself.
      setToast({ ok: false, text: `${row.reference} could not go out yet: ${result.reason ?? result.error}. It stays queued and the worker will retry.` });
    } else if (result.outcome === 'failed') {
      setToast({ ok: false, text: `${row.reference} failed: ${result.reason ?? result.error}. The full amount is back in the user's balance and no fee was charged.` });
    } else {
      setToast({ ok: false, text: result.error ?? 'Could not send this withdrawal.' });
    }

    // Reload either way — status, attempts and failure_reason have all moved.
    load();
  };

  const handleRetry = async (row: WithdrawalRequest) => {
    if (!window.confirm(
      `Retry ${row.reference} for ${row.userName}?\n\n` +
      `This does NOT re-send the old payout — that one was already reversed, ` +
      `and ${fmtAmt(row.amount)} is sitting in their balance right now. ` +
      `It creates a NEW withdrawal for the same amount, debits their balance ` +
      `again, and queues it.\n\n` +
      `If you are not certain the original never reached their phone, check ` +
      `IntaSend first.`
    )) return;

    setRetryingId(row.id);
    const result = await retryWithdrawal(row.id);
    setRetryingId(null);

    if (result.ok) {
      setToast({ ok: true, text: `Retry queued as ${result.reference} — it will dispatch on the next worker run.` });
    } else {
      // These come straight from the RPC and are already written to be read
      // by a person: already retried, payout exists at the provider, balance
      // no longer covers it.
      setToast({ ok: false, text: result.error ?? 'Could not retry this withdrawal.' });
    }
    load();
  };

  const handleSort = (k: keyof WithdrawalRequest) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.userName.toLowerCase().includes(q) ||
        (r.reference ?? '').toLowerCase().includes(q) ||
        (r.phoneNumber ?? '').toLowerCase().includes(q)
      );
    }
    if (statusF !== 'all') list = list.filter(r => r.status === statusF);
    if (dateFrom) { const f = new Date(dateFrom).getTime(); list = list.filter(r => new Date(r.requestedAt).getTime() >= f); }
    if (dateTo)   { const t = new Date(dateTo).getTime();   list = list.filter(r => new Date(r.requestedAt).getTime() <= t); }
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      return sortDir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });
  }, [rows, search, statusF, dateFrom, dateTo, sortKey, sortDir]);

  useEffect(() => { setPage(1); }, [search, statusF, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const of = (s: WithdrawalStatus) => rows.filter(r => r.status === s);
    const sum = (list: WithdrawalRequest[]) => list.reduce((s, r) => s + r.netAmount, 0);
    const queued = of('queued'), processing = of('processing'), failed = of('failed');
    return {
      queued:     { count: queued.length,     amount: sum(queued) },
      processing: { count: processing.length, amount: sum(processing) },
      failed:     { count: failed.length,     amount: sum(failed) },
    };
  }, [rows]);

  const exportRows    = filtered.map((r, i) => [i + 1, r.reference, r.userName, r.phoneNumber, r.amount, r.feeAmount, r.netAmount, wdS(r.status).label, fmt(r.scheduledFor), fmt(r.requestedAt)]);
  const exportHeaders = ['Sr.No.', 'Reference', 'User', 'Phone', 'Gross', 'Fee', 'Net', 'Status', 'Scheduled For', 'Requested'];

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: SLATE, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap', background: BG, cursor: 'pointer', userSelect: 'none' };
  const td: React.CSSProperties = { padding: '14px 16px', fontSize: 14, color: NAVY, borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' };
  const SortArrow = ({ k }: { k: keyof WithdrawalRequest }) => sortKey === k ? <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center', color: SLATE, fontSize: 14 }}>Loading pending withdrawals…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>

      {toast && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.ok ? '#DCFCE7' : '#FEE2E2', color: toast.ok ? GREEN : RED,
        }}>
          {toast.text}
        </div>
      )}

      {/* stat strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatChip label="Queued"     count={stats.queued.count}     amount={stats.queued.amount}     color="#CA8A04" bg="#FEF9C3"/>
        <StatChip label="Processing" count={stats.processing.count} amount={stats.processing.amount} color="#2563EB" bg="#DBEAFE"/>
        <StatChip label="Failed"     count={stats.failed.count}     amount={stats.failed.amount}     color={RED}     bg="#FEE2E2"/>
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', flex: isMobile ? 'unset' : '1 1 200px', width: isMobile ? '100%' : undefined, maxWidth: isMobile ? '100%' : 300 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5"/>
              <path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reference, user, phone…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}/>
          </div>
          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', width: isMobile ? '100%' : undefined, minWidth: isMobile ? undefined : 160 }}>
            <option value="all">All Statuses</option>
            {(Object.keys(WD_STYLE) as WithdrawalStatus[]).map(s => <option key={s} value={s}>{WD_STYLE[s].label}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '6px 12px', background: '#fff', width: isMobile ? '100%' : undefined, boxSizing: 'border-box' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="12" rx="2" stroke="#94A3B8" strokeWidth="1.4"/><path d="M1 7h14M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent', flex: isMobile ? 1 : undefined }}/>
            <span style={{ color: '#CBD5E1' }}>–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent', flex: isMobile ? 1 : undefined }}/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: isMobile ? 'flex-end' : undefined }}>
          <ExBtn label="Refresh" onClick={load}/>
          <ExBtn label="CSV" onClick={() => exportCsv('pending-withdrawals', exportHeaders, exportRows)}/>
          <ExBtn label="PDF" onClick={() => exportPdf('Pending Withdrawals', exportHeaders, exportRows)}/>
        </div>
      </div>

      {/* table / cards */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            {paginated.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: 14 }}>No withdrawal requests found</div>
            ) : paginated.map((r) => {
              const ss = wdS(r.status);
              return (
                <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{r.reference}</div>
                      <span style={{ display: 'inline-block', marginTop: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color }}>
                        {ss.label}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>{fmtAmt(r.netAmount)}</div>
                      <div style={{ fontSize: 11, color: SLATE }}>gross {fmtAmt(r.amount)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar src={r.userAvatar} name={r.userName} size={30}/>
                    <span style={{ fontSize: 13, color: NAVY }}>{r.userName}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>Phone</div>
                      <div style={{ color: '#475569' }}>{r.phoneNumber}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>{r.status === 'queued' || r.status === 'processing' ? 'Due' : 'Scheduled'}</div>
                      <div style={{ color: '#475569' }}>{dueLabel(r.status, r.hoursUntilDue, r.scheduledFor)}</div>
                    </div>
                  </div>

                  {r.failureReason && (
                    <div style={{ fontSize: 12, color: RED, background: '#FEF2F2', borderRadius: 8, padding: '6px 10px' }}>
                      {r.failureReason}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 4 }}>
                    <ReleaseBtn row={r} busy={sendingId === r.id || retryingId === r.id} onSend={handleSend} onRetry={handleRetry}/>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 56 }}>Sr. No.</th>
                  <th style={th} onClick={() => handleSort('reference')}>Reference <SortArrow k="reference"/></th>
                  <th style={th} onClick={() => handleSort('userName')}>User <SortArrow k="userName"/></th>
                  <th style={th}>Phone</th>
                  <th style={th} onClick={() => handleSort('netAmount')}>Net Amount <SortArrow k="netAmount"/></th>
                  <th style={th} onClick={() => handleSort('status')}>Status <SortArrow k="status"/></th>
                  <th style={th} onClick={() => handleSort('scheduledFor')}>Due <SortArrow k="scheduledFor"/></th>
                  <th style={th} onClick={() => handleSort('requestedAt')}>Requested <SortArrow k="requestedAt"/></th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '48px 0' }}>No withdrawal requests found</td></tr>
                ) : paginated.map((r, idx) => {
                  const ss = wdS(r.status);
                  return (
                    <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = BG} onMouseLeave={e => e.currentTarget.style.background = '#fff'} style={{ transition: 'background 0.1s' }}>
                      <td style={{ ...td, color: '#94A3B8', fontSize: 13 }}>{String((page - 1) * pageSize + idx + 1).padStart(2, '0')}</td>
                      <td style={{ ...td, fontSize: 12, color: SLATE, fontFamily: 'monospace' }}>{r.reference}</td>
                      <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar src={r.userAvatar} name={r.userName} size={30}/><span style={{ fontSize: 13 }}>{r.userName}</span></div></td>
                      <td style={{ ...td, color: SLATE }}>{r.phoneNumber}</td>
                      <td style={td}>
                        <div style={{ fontWeight: 700, color: NAVY }}>{fmtAmt(r.netAmount)}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>gross {fmtAmt(r.amount)} · fee {fmtAmt(r.feeAmount)}</div>
                      </td>
                      <td style={td}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>{ss.label}</span>
                        {r.failureReason && <div style={{ fontSize: 11, color: RED, marginTop: 4, maxWidth: 180 }}>{r.failureReason}</div>}
                        {r.attempts > 1 && <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>{r.attempts} attempts</div>}
                      </td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{dueLabel(r.status, r.hoursUntilDue, r.scheduledFor)}</td>
                      <td style={{ ...td, color: SLATE, whiteSpace: 'nowrap' }}>{fmt(r.requestedAt)}</td>
                      <td style={td}><ReleaseBtn row={r} busy={sendingId === r.id || retryingId === r.id} onSend={handleSend} onRetry={handleRetry}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page} totalPages={totalPages} pageSize={pageSize}
          totalItems={filtered.length}
          onPage={setPage}
          onPageSize={n => { setPageSize(n); setPage(1); }}
        />
      </div>
    </div>
  );
};
