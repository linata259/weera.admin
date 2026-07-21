import React, { useEffect, useMemo, useState } from 'react';
import { fetchTransactions } from '../api/financialService';
import { WalletTransaction } from '../types';
import { exportCsv } from '../utils/exportCsv';
import { exportPdf } from '../utils/exportPdf';
import { Avatar } from '../../shared/Avatar';

const ORANGE = '#EA580C';
const NAVY   = '#0F172A';
const SLATE  = '#64748B';
const BORDER = '#E2E8F0';
const BG     = '#F8FAFC';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TX_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  deposit:           { label: 'Deposit',          color: '#16A34A', bg: '#DCFCE7' },
  withdrawal:        { label: 'Withdrawal',        color: '#DC2626', bg: '#FEE2E2' },
  escrow_lock:       { label: 'Escrow Lock',       color: '#CA8A04', bg: '#FEF9C3' },
  escrow_release:    { label: 'Escrow Release',    color: '#16A34A', bg: '#DCFCE7' },
  escrow_refund:     { label: 'Escrow Refund',     color: '#2563EB', bg: '#DBEAFE' },
  milestone_payment: { label: 'Milestone',         color: '#16A34A', bg: '#DCFCE7' },
  platform_fee:      { label: 'Platform Fee',      color: '#DC2626', bg: '#FEE2E2' },
};
const txS = (t: string) => TX_STYLE[t] ?? { label: t.replace(/_/g, ' '), color: SLATE, bg: BG };
const stS = (s: string) => ({
  completed: { color: '#16A34A', bg: '#DCFCE7' },
  pending:   { color: '#CA8A04', bg: '#FEF9C3' },
  failed:    { color: '#DC2626', bg: '#FEE2E2' },
}[s] ?? { color: SLATE, bg: BG });
const fmt        = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
// money coming INTO the platform is a credit — escrow_lock (client funds
// locked) and platform_fee count as money in; withdrawals/refunds are debits
const isCredit   = (t: string)   => ['deposit', 'escrow_lock', 'escrow_release', 'milestone_payment', 'platform_fee'].includes(t);

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

/* ══════════════════════════════════════════════════════════════ */
export const TransactionsTable: React.FC = () => {
  const [rows,    setRows]    = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [typeF,   setTypeF]   = useState('all');
  const [statusF, setStatusF] = useState('all');
  const [dateFrom,setDateFrom]= useState('');
  const [dateTo,  setDateTo]  = useState('');
  const [page,    setPage]    = useState(1);
  const [pageSize,setPageSize]= useState(25);
  const [sortKey, setSortKey] = useState<keyof WalletTransaction>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [isMobile, setIsMobile] = useState(false); // NEW

  useEffect(() => { fetchTransactions().then(setRows).finally(() => setLoading(false)); }, []);

  // NEW — same mobile-detection pattern used elsewhere in the app
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleSort = (k: keyof WalletTransaction) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.userName.toLowerCase().includes(q) ||
        (r.jobTitle ?? '').toLowerCase().includes(q) ||
        (r.reference ?? '').toLowerCase().includes(q)
      );
    }
    if (typeF   !== 'all') list = list.filter(r => r.type   === typeF);
    if (statusF !== 'all') list = list.filter(r => r.status === statusF);
    if (dateFrom) { const f = new Date(dateFrom).getTime(); list = list.filter(r => new Date(r.createdAt).getTime() >= f); }
    if (dateTo)   { const t = new Date(dateTo).getTime();   list = list.filter(r => new Date(r.createdAt).getTime() <= t); }
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      return sortDir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });
  }, [rows, search, typeF, statusF, dateFrom, dateTo, sortKey, sortDir]);

  // reset to page 1 on filter/search change
  useEffect(() => { setPage(1); }, [search, typeF, statusF, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);
  const typeOpts   = Array.from(new Set(rows.map(r => r.type))).sort();

  const exportRows    = filtered.map((r, i) => [i + 1, r.reference ?? r.id.slice(0, 8), r.type, fmt(r.createdAt), r.userName, r.jobTitle ?? '—', isCredit(r.type) ? `+${r.amount}` : `-${r.amount}`, r.status]);
  const exportHeaders = ['Sr.No.', 'Reference', 'Type', 'Date', 'User', 'Job', 'Amount', 'Status'];

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: SLATE, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap', background: BG, cursor: 'pointer', userSelect: 'none' };
  const td: React.CSSProperties = { padding: '14px 16px', fontSize: 14, color: NAVY, borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' };
  const SortArrow = ({ k }: { k: keyof WalletTransaction }) => sortKey === k ? <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center', color: SLATE, fontSize: 14 }}>Loading transactions…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>

      {/* toolbar — CHANGED: stacks vertically on mobile */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', flex: isMobile ? 'unset' : '1 1 200px', width: isMobile ? '100%' : undefined, maxWidth: isMobile ? '100%' : 300 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5"/>
              <path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}/>
          </div>
          <select value={typeF} onChange={e => setTypeF(e.target.value)} style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', width: isMobile ? '100%' : undefined, minWidth: isMobile ? undefined : 160 }}>
            <option value="all">All Types</option>
            {typeOpts.map(t => <option key={t} value={t}>{txS(t).label}</option>)}
          </select>
          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', width: isMobile ? '100%' : undefined, minWidth: isMobile ? undefined : 130 }}>
            <option value="all">All Statuses</option>
            {['completed', 'pending', 'failed'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '6px 12px', background: '#fff', width: isMobile ? '100%' : undefined, boxSizing: 'border-box' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="12" rx="2" stroke="#94A3B8" strokeWidth="1.4"/><path d="M1 7h14M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent', flex: isMobile ? 1 : undefined }}/>
            <span style={{ color: '#CBD5E1' }}>–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent', flex: isMobile ? 1 : undefined }}/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: isMobile ? 'flex-end' : undefined }}>
          <ExBtn label="CSV" onClick={() => exportCsv('transactions', exportHeaders, exportRows)}/>
          <ExBtn label="PDF" onClick={() => exportPdf('Transaction History', exportHeaders, exportRows)}/>
        </div>
      </div>

      {/* table / cards */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
        {isMobile ? (
          /* ── MOBILE: stacked cards — NEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            {paginated.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: 14 }}>No transactions found</div>
            ) : paginated.map((r) => {
              const ts = txS(r.type); const ss = stS(r.status); const credit = isCredit(r.type);
              return (
                <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>
                        {r.reference ?? r.id.slice(0, 8).toUpperCase()}
                      </div>
                      <span style={{ display: 'inline-block', marginTop: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ts.bg, color: ts.color }}>
                        {ts.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: credit ? '#16A34A' : '#DC2626', whiteSpace: 'nowrap' }}>
                      {credit ? '+' : '-'}{r.amount.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar src={r.userAvatar} name={r.userName} size={30}/>
                    <span style={{ fontSize: 13, color: NAVY }}>{r.userName}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>Project</div>
                      <div style={{ color: '#475569' }}>{r.jobTitle ?? r.description ?? '—'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>Date</div>
                      <div style={{ color: '#475569' }}>{fmt(r.createdAt)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 4 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color }}>
                      {r.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── DESKTOP TABLE ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 56 }}>Sr. No.</th>
                  <th style={th} onClick={() => handleSort('reference')}>Reference <SortArrow k="reference"/></th>
                  <th style={th} onClick={() => handleSort('type')}>Type <SortArrow k="type"/></th>
                  <th style={th} onClick={() => handleSort('createdAt')}>Date <SortArrow k="createdAt"/></th>
                  <th style={th} onClick={() => handleSort('userName')}>User <SortArrow k="userName"/></th>
                  <th style={th} onClick={() => handleSort('jobTitle')}>Project <SortArrow k="jobTitle"/></th>
                  <th style={th} onClick={() => handleSort('amount')}>Amount <SortArrow k="amount"/></th>
                  <th style={th} onClick={() => handleSort('status')}>Status <SortArrow k="status"/></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '48px 0' }}>No transactions found</td></tr>
                ) : paginated.map((r, idx) => {
                  const ts = txS(r.type); const ss = stS(r.status); const credit = isCredit(r.type);
                  return (
                    <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = BG} onMouseLeave={e => e.currentTarget.style.background = '#fff'} style={{ transition: 'background 0.1s' }}>
                      <td style={{ ...td, color: '#94A3B8', fontSize: 13 }}>{String((page - 1) * pageSize + idx + 1).padStart(2, '0')}</td>
                      <td style={{ ...td, fontSize: 12, color: SLATE, fontFamily: 'monospace' }}>{r.reference ?? r.id.slice(0, 8).toUpperCase()}</td>
                      <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ts.bg, color: ts.color, whiteSpace: 'nowrap' }}>{ts.label}</span></td>
                      <td style={{ ...td, color: SLATE, whiteSpace: 'nowrap' }}>{fmt(r.createdAt)}</td>
                      <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar src={r.userAvatar} name={r.userName} size={30}/><span style={{ fontSize: 13 }}>{r.userName}</span></div></td>
                      <td style={{ ...td, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.jobTitle ?? r.description ?? <span style={{ color: '#CBD5E1' }}>—</span>}</td>
                      <td style={{ ...td, fontWeight: 700, color: credit ? '#16A34A' : '#DC2626' }}>{credit ? '+' : '-'}{r.amount.toFixed(2)}</td>
                      <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>{r.status}</span></td>
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