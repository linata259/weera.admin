import React, { useEffect, useMemo, useState } from 'react';
import { fetchEscrowTransactions } from '../api/financialService';
import { EscrowTransaction } from '../types';
import { exportCsv } from '../utils/exportCsv';
import { exportPdf } from '../utils/exportPdf';
import { Avatar } from '../../shared/Avatar';

const ORANGE = '#EA580C';
const NAVY   = '#0F172A';
const SLATE  = '#64748B';
const BORDER = '#E2E8F0';
const BG     = '#F8FAFC';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const ESC_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  held:      { label: 'Pending',   color: '#CA8A04', bg: '#FEF9C3' },
  released:  { label: 'Completed', color: '#16A34A', bg: '#DCFCE7' },
  refunded:  { label: 'Refunded',  color: '#2563EB', bg: '#DBEAFE' },
  disputed:  { label: 'Disputed',  color: '#DC2626', bg: '#FEE2E2' },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2' },
};
const escS   = (s: string) => ESC_STYLE[s.toLowerCase()] ?? { label: s, color: SLATE, bg: BG };
const fmt    = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtAmt = (n: number)  => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
export const EscrowManagement: React.FC = () => {
  const [rows,        setRows]        = useState<EscrowTransaction[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [statusF,     setStatusF]     = useState('all');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [sortKey,     setSortKey]     = useState<keyof EscrowTransaction>('createdAt');
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchEscrowTransactions().then(setRows).finally(() => setLoading(false)); }, []);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusF, dateFrom, dateTo]);

  const handleSort = (k: keyof EscrowTransaction) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.clientName.toLowerCase().includes(q) ||
        r.bidderName.toLowerCase().includes(q) ||
        (r.jobTitle ?? '').toLowerCase().includes(q)
      );
    }
    if (statusF !== 'all') list = list.filter(r => r.status.toLowerCase() === statusF);
    if (dateFrom) { const f = new Date(dateFrom).getTime(); list = list.filter(r => new Date(r.createdAt).getTime() >= f); }
    if (dateTo)   { const t = new Date(dateTo).getTime();   list = list.filter(r => new Date(r.createdAt).getTime() <= t); }
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      return sortDir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });
  }, [rows, search, statusF, dateFrom, dateTo, sortKey, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize);
  const statusOpts  = Array.from(new Set(rows.map(r => r.status.toLowerCase()))).sort();
  const allSelected = paginated.length > 0 && paginated.every(r => selectedIds.has(r.id));

  const exportHeaders = ['Sr.No.', 'Project', 'Client', 'Bidder', 'Amount', 'Service Fee', 'Total', 'Status', 'Created', 'Released'];
  const exportRows    = filtered.map((r, i) => [i + 1, r.jobTitle ?? '—', r.clientName, r.bidderName, fmtAmt(r.amount), fmtAmt(r.serviceFee), fmtAmt(r.totalCharged), r.status, fmt(r.createdAt), r.releasedAt ? fmt(r.releasedAt) : '—']);

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: SLATE, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap', background: BG, cursor: 'pointer', userSelect: 'none' };
  const td: React.CSSProperties = { padding: '14px 16px', fontSize: 14, color: NAVY, borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' };
  const SA = ({ k }: { k: keyof EscrowTransaction }) => sortKey === k ? <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center', color: SLATE, fontSize: 14 }}>Loading escrow data…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>

      {/* summary chips */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Escrow', value: fmtAmt(rows.reduce((s, r) => s + r.amount, 0)),                              color: NAVY       },
          { label: 'Released',     value: fmtAmt(rows.filter(r => r.status === 'released').reduce((s, r) => s + r.amount, 0)), color: '#16A34A' },
          { label: 'Held',         value: fmtAmt(rows.filter(r => r.status === 'held').reduce((s, r) => s + r.amount, 0)),     color: '#CA8A04' },
          { label: 'Refunded',     value: fmtAmt(rows.filter(r => r.status === 'refunded').reduce((s, r) => s + r.amount, 0)), color: '#2563EB' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 160px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5"/>
              <path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, bidder, project…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}/>
          </div>
          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', minWidth: 130 }}>
            <option value="all">All Statuses</option>
            {statusOpts.map(s => <option key={s} value={s}>{escS(s).label}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '6px 12px', background: '#fff' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="12" rx="2" stroke="#94A3B8" strokeWidth="1.4"/><path d="M1 7h14M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent' }}/>
            <span style={{ color: '#CBD5E1' }}>–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent' }}/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ExBtn label="CSV" onClick={() => exportCsv('escrow_transactions', exportHeaders, exportRows)}/>
          <ExBtn label="PDF" onClick={() => exportPdf('Escrow Management', exportHeaders, exportRows)}/>
        </div>
      </div>

      {/* table */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 48 }}>
                  <input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(() => allSelected ? new Set() : new Set(paginated.map(r => r.id)))} style={{ accentColor: ORANGE }}/>
                </th>
                <th style={{ ...th, width: 56 }}>Sr. No.</th>
                <th style={th} onClick={() => handleSort('jobTitle')}>Project Title <SA k="jobTitle"/></th>
                <th style={th} onClick={() => handleSort('clientName')}>Client <SA k="clientName"/></th>
                <th style={th} onClick={() => handleSort('bidderName')}>Bidder <SA k="bidderName"/></th>
                <th style={th} onClick={() => handleSort('amount')}>Amount <SA k="amount"/></th>
                <th style={th} onClick={() => handleSort('status')}>Status <SA k="status"/></th>
                <th style={th} onClick={() => handleSort('createdAt')}>Last Updated <SA k="createdAt"/></th>
                <th style={{ ...th, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '48px 0' }}>No escrow transactions found</td></tr>
              ) : paginated.map((r, idx) => {
                const ss = escS(r.status);
                return (
                  <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = BG} onMouseLeave={e => e.currentTarget.style.background = '#fff'} style={{ transition: 'background 0.1s' }}>
                    <td style={td}><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })} style={{ accentColor: ORANGE }}/></td>
                    <td style={{ ...td, color: '#94A3B8', fontSize: 13 }}>{String((page - 1) * pageSize + idx + 1).padStart(2, '0')}</td>
                    <td style={{ ...td, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{r.jobTitle ?? <span style={{ color: '#CBD5E1' }}>—</span>}</td>
                    <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar src={r.clientAvatar} name={r.clientName} size={30}/><span style={{ fontSize: 13 }}>{r.clientName}</span></div></td>
                    <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar src={r.bidderAvatar} name={r.bidderName} size={30}/><span style={{ fontSize: 13 }}>{r.bidderName}</span></div></td>
                    <td style={{ ...td, fontWeight: 700 }}>{fmtAmt(r.amount)}</td>
                    <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>{ss.label}</span></td>
                    <td style={{ ...td, color: SLATE, whiteSpace: 'nowrap', fontSize: 12 }}>{fmt(r.releasedAt ?? r.createdAt)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button style={{ width: 28, height: 28, border: `1px solid ${BORDER}`, borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="3" r="1" fill={SLATE}/><circle cx="7" cy="7" r="1" fill={SLATE}/><circle cx="7" cy="11" r="1" fill={SLATE}/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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