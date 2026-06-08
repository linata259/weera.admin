import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from 'services/supabaseClient';
import { Avatar } from '../../shared/Avatar'
import { exportCsv } from '../utils/exportCsv';
import { exportPdf } from '../utils/exportPdf';

const NAVY='#0F172A'; const SLATE='#64748B'; const BORDER='#E2E8F0'; const BG='#F8FAFC'; const ORANGE='#EA580C';
const ROWS=10;

/* map transaction type → Revenue Source label */
const REVENUE_SOURCE: Record<string, string> = {
  platform_fee:      'Service Fee',
  deposit:           'Connects Sale',
  escrow_release:    'Service Fee',
  milestone_payment: 'Service Fee',
  escrow_lock:       'Escrow Hold',
  withdrawal:        'Withdrawal',
  escrow_refund:     'Refund',
};
const revSource = (t: string) => REVENUE_SOURCE[t] ?? t.replace(/_/g, ' ');

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  completed: { color: '#16A34A', bg: '#DCFCE7' },
  pending:   { color: '#CA8A04', bg: '#FEF9C3' },
  failed:    { color: '#DC2626', bg: '#FEE2E2' },
};
const stStyle = (s: string) => STATUS_STYLE[s] ?? { color: SLATE, bg: BG };

const fmtDT = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
const fmtAmt = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface RevenueRow {
  id: string;
  reference: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  createdAt: string;
  userName: string;
  userAvatar: string | null;
}

export const PlatformRevenue: React.FC = () => {
  const [rows,     setRows]     = useState<RevenueRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('all');
  const [sourceF,  setSourceF]  = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [page,     setPage]     = useState(1);
  const [sortKey,  setSortKey]  = useState<keyof RevenueRow>('createdAt');
  const [sortDir,  setSortDir]  = useState<'asc'|'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount, status, description, reference, user_id, created_at')
        .order('created_at', { ascending: false });

      if (error || !data) { setLoading(false); return; }

      /* batch fetch profiles */
      const userIds = Array.from(new Set(data.map((r: any) => r.user_id).filter(Boolean))) as string[];
      const { data: profiles } = await supabase
        .from('profiles').select('id, first_name, last_name, image_url').in('id', userIds);
      const pMap = new Map((profiles ?? []).map((p: any) => [
        p.id, {
          name: [p.first_name, p.last_name].filter(Boolean).join(' ') || '—',
          avatar: p.image_url ?? null,
        }
      ]));

      setRows(data.map((r: any): RevenueRow => ({
        id:          r.id,
        reference:   r.reference ?? r.id.slice(0, 10).toUpperCase(),
        type:        r.type,
        amount:      parseFloat(r.amount ?? '0'),
        status:      r.status,
        description: r.description ?? null,
        createdAt:   r.created_at,
        userName:    pMap.get(r.user_id)?.name   ?? '—',
        userAvatar:  pMap.get(r.user_id)?.avatar ?? null,
      })));
      setLoading(false);
    };
    load();
  }, []);

  const handleSort = (k: keyof RevenueRow) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.userName.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
      );
    }
    if (statusF !== 'all') list = list.filter(r => r.status === statusF);
    if (sourceF !== 'all') list = list.filter(r => revSource(r.type) === sourceF);
    if (dateFrom) { const f = new Date(dateFrom).getTime(); list = list.filter(r => new Date(r.createdAt).getTime() >= f); }
    if (dateTo)   { const t = new Date(dateTo).getTime();   list = list.filter(r => new Date(r.createdAt).getTime() <= t); }
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1; if (bv == null) return -1;
      return sortDir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
    });
  }, [rows, search, statusF, sourceF, dateFrom, dateTo, sortKey, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / ROWS));
  const paginated   = filtered.slice((page - 1) * ROWS, page * ROWS);
  const totalRevenue = filtered.reduce((s, r) => s + r.amount, 0);
  const allSelected = paginated.length > 0 && paginated.every(r => selectedIds.has(r.id));
  const sourceOpts  = Array.from(new Set(rows.map(r => revSource(r.type)))).sort();

  /* page numbers */
  const pageNums = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3)               return [1, 2, 3, 4, 5];
    if (page >= totalPages - 2)  return [totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [page-2, page-1, page, page+1, page+2];
  })();

  /* export */
  const exportHeaders = ['Sr.No.', 'Transaction Id', 'Date & Time', 'Revenue Source', 'Amount', 'User', 'Description', 'Status'];
  const exportRows = filtered.map((r, i) => [
    i + 1, r.reference, fmtDT(r.createdAt), revSource(r.type),
    fmtAmt(r.amount), r.userName, r.description ?? '—', r.status,
  ]);

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: SLATE, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap', background: BG, cursor: 'pointer', userSelect: 'none' };
  const td: React.CSSProperties = { padding: '14px 16px', fontSize: 14, color: NAVY, borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' };
  const SA = ({ k }: { k: keyof RevenueRow }) => sortKey === k ? <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center', color: SLATE, fontSize: 14 }}>Loading revenue data…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>

      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          {/* search */}
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5" /><path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search transactions…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          </div>

          {/* status */}
          <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}
            style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', minWidth: 130 }}>
            <option value="all">Status</option>
            {['completed', 'pending', 'failed'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>

          {/* revenue source */}
          <select value={sourceF} onChange={e => { setSourceF(e.target.value); setPage(1); }}
            style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', minWidth: 160 }}>
            <option value="all">Revenue Source</option>
            {sourceOpts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '6px 12px', background: '#fff' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="12" rx="2" stroke="#94A3B8" strokeWidth="1.4" /><path d="M1 7h14M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round" /></svg>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent' }} />
            <span style={{ color: '#CBD5E1' }}>–</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent' }} />
          </div>
        </div>

        {/* column toggle placeholder */}
        <button style={{ width: 38, height: 38, border: `1px solid ${BORDER}`, borderRadius: 10, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke={SLATE} strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1" stroke={SLATE} strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1" stroke={SLATE} strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1" stroke={SLATE} strokeWidth="1.4"/></svg>
        </button>
      </div>

      {/* report header */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Weera Platform Revenue Report</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: SLATE }}>Generated By: <strong style={{ color: NAVY }}>Admin</strong></span>
            {(dateFrom || dateTo) && (
              <span style={{ fontSize: 13, color: SLATE }}>
                Date Range: <strong style={{ color: NAVY }}>{dateFrom || '—'} – {dateTo || '—'}</strong>
              </span>
            )}
            <span style={{ fontSize: 13, color: SLATE }}>
              Total Revenue: <strong style={{ color: ORANGE }}>{fmtAmt(totalRevenue)}</strong>
            </span>
          </div>
        </div>
        {/* export buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <ExBtn label="CSV"   onClick={() => exportCsv('platform_revenue', exportHeaders, exportRows)} />
          <ExBtn label="Excel" onClick={() => exportCsv('platform_revenue', exportHeaders, exportRows)} />
          <ExBtn label="PDF"   onClick={() => exportPdf('Weera Platform Revenue Report', exportHeaders, exportRows)} />
        </div>
      </div>

      {/* table */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ ...th, width: 48 }}>
                  <input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(() => allSelected ? new Set() : new Set(paginated.map(r => r.id)))} style={{ accentColor: ORANGE }} />
                </th>
                <th style={{ ...th, width: 56 }}>Sr. No.</th>
                <th style={th} onClick={() => handleSort('reference')}>Transaction Id <SA k="reference" /></th>
                <th style={th} onClick={() => handleSort('createdAt')}>Date & Time <SA k="createdAt" /></th>
                <th style={th} onClick={() => handleSort('type')}>Revenue Source <SA k="type" /></th>
                <th style={th} onClick={() => handleSort('amount')}>Amount <SA k="amount" /></th>
                <th style={th} onClick={() => handleSort('userName')}>User <SA k="userName" /></th>
                <th style={th} onClick={() => handleSort('description')}>Description <SA k="description" /></th>
                <th style={th} onClick={() => handleSort('status')}>Status <SA k="status" /></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '48px 0' }}>No revenue data found</td></tr>
              ) : paginated.map((r, idx) => {
                const ss = stStyle(r.status);
                return (
                  <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = BG} onMouseLeave={e => e.currentTarget.style.background = '#fff'} style={{ transition: 'background 0.1s' }}>
                    <td style={td}>
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })} style={{ accentColor: ORANGE }} />
                    </td>
                    <td style={{ ...td, color: '#94A3B8', fontSize: 13 }}>{String((page - 1) * ROWS + idx + 1).padStart(2, '0')}</td>
                    <td style={{ ...td, fontSize: 12, color: SLATE, fontFamily: 'monospace' }}>{r.reference}</td>
                    <td style={{ ...td, color: SLATE, whiteSpace: 'nowrap', fontSize: 13 }}>{fmtDT(r.createdAt)}</td>
                    <td style={{ ...td, fontWeight: 500 }}>{revSource(r.type)}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{fmtAmt(r.amount)}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar src={r.userAvatar} name={r.userName} size={30} />
                        <span style={{ fontSize: 13 }}>{r.userName}</span>
                      </div>
                    </td>
                    <td style={{ ...td, color: SLATE, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>
                      {r.description ?? 'Fee on completed project'}
                    </td>
                    <td style={td}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 13, color: SLATE }}>Page {page} of {totalPages} — {filtered.length} records</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PBtn label="← Previous" disabled={page === 1} onClick={() => setPage(p => p - 1)} />
              {pageNums[0] > 1 && <><PBtn label="1" onClick={() => setPage(1)} />{pageNums[0] > 2 && <Dot />}</>}
              {pageNums.map(n => <PBtn key={n} label={String(n)} active={n === page} onClick={() => setPage(n)} />)}
              {pageNums[pageNums.length-1] < totalPages && <>{pageNums[pageNums.length-1] < totalPages-1 && <Dot />}<PBtn label={String(totalPages)} onClick={() => setPage(totalPages)} /></>}
              <PBtn label="Next →" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ExBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button onClick={onClick} style={{ padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: NAVY, cursor: 'pointer', fontFamily: 'inherit' }}>
    {label}
  </button>
);
const PBtn: React.FC<{ label: string; active?: boolean; disabled?: boolean; onClick: () => void }> = ({ label, active, disabled, onClick }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${active ? NAVY : BORDER}`, background: active ? NAVY : '#fff', color: active ? '#fff' : disabled ? '#CBD5E1' : NAVY, fontSize: 13, fontWeight: active ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{label}</button>
);
const Dot = () => <span style={{ color: '#CBD5E1', padding: '0 4px' }}>…</span>;