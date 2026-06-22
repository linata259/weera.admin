import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from 'services/supabaseClient';
import { Avatar }   from '../../shared/Avatar';
import { exportCsv } from '../utils/exportCsv';
import { exportPdf } from '../utils/exportPdf';

const ORANGE = '#EA580C';
const NAVY   = '#0F172A';
const SLATE  = '#64748B';
const BORDER = '#E2E8F0';
const BG     = '#F8FAFC';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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

const fmtDT  = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtAmt = (n: number)   => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface RevenueRow {
  id: string; reference: string; type: string;
  amount: number; status: string; description: string | null;
  createdAt: string; userName: string; userAvatar: string | null;
}

/* ── shared sub-components ──────────────────────────────────── */
const ExBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button onClick={onClick} style={{
    padding: '7px 14px', border: `1px solid ${BORDER}`, borderRadius: 8,
    background: '#fff', fontSize: 13, fontWeight: 600, color: NAVY,
    cursor: 'pointer', fontFamily: 'inherit',
  }}>{label}</button>
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
                color:      page === p ? '#fff' : NAVY,
                border:     `1px solid ${page === p ? ORANGE : BORDER}`,
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
export const PlatformRevenue: React.FC = () => {
  const [rows,        setRows]        = useState<RevenueRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [statusF,     setStatusF]     = useState('all');
  const [sourceF,     setSourceF]     = useState('all');
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [page,        setPage]        = useState(1);
  const [pageSize,    setPageSize]    = useState(25);
  const [sortKey,     setSortKey]     = useState<keyof RevenueRow>('createdAt');
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMobile,    setIsMobile]    = useState(false); // NEW

  // NEW — same mobile-detection pattern used elsewhere in the app
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('id, type, amount, status, description, reference, user_id, created_at')
        .order('created_at', { ascending: false });

      if (error || !data) { setLoading(false); return; }

      const userIds = Array.from(new Set(data.map((r: any) => r.user_id).filter(Boolean))) as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, image_url')
        .in('id', userIds);
      const pMap = new Map((profiles ?? []).map((p: any) => [
        p.id,
        { name: [p.first_name, p.last_name].filter(Boolean).join(' ') || '—', avatar: p.image_url ?? null },
      ]));

      setRows(data.map((r: any): RevenueRow => ({
        id: r.id,
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

  // reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusF, sourceF, dateFrom, dateTo]);

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
      return sortDir === 'asc' ? (av < bv ? -1 : 1) : av > bv ? -1 : 1;
    });
  }, [rows, search, statusF, sourceF, dateFrom, dateTo, sortKey, sortDir]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalRevenue = filtered.reduce((s, r) => s + r.amount, 0);
  const allSelected  = paginated.length > 0 && paginated.every(r => selectedIds.has(r.id));
  const sourceOpts   = Array.from(new Set(rows.map(r => revSource(r.type)))).sort();

  const exportHeaders = ['Sr.No.', 'Transaction Id', 'Date & Time', 'Revenue Source', 'Amount', 'User', 'Description', 'Status'];
  const exportRows    = filtered.map((r, i) => [i + 1, r.reference, fmtDT(r.createdAt), revSource(r.type), fmtAmt(r.amount), r.userName, r.description ?? '—', r.status]);

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: SLATE, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap', background: BG, cursor: 'pointer', userSelect: 'none' };
  const td: React.CSSProperties = { padding: '14px 16px', fontSize: 14, color: NAVY, borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle' };
  const SA = ({ k }: { k: keyof RevenueRow }) => sortKey === k ? <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  const toggleOne = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) return <div style={{ padding: '48px 0', textAlign: 'center', color: SLATE, fontSize: 14 }}>Loading revenue data…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>

      {/* toolbar — CHANGED: stacks vertically on mobile */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', flex: isMobile ? 'unset' : '1 1 200px', width: isMobile ? '100%' : undefined, maxWidth: isMobile ? '100%' : 320 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5" stroke="#94A3B8" strokeWidth="1.5"/>
              <path d="M11 11l2.5 2.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}/>
          </div>
          <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', width: isMobile ? '100%' : undefined, minWidth: isMobile ? undefined : 130 }}>
            <option value="all">Status</option>
            {['completed', 'pending', 'failed'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={sourceF} onChange={e => setSourceF(e.target.value)} style={{ padding: '9px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, outline: 'none', color: NAVY, background: '#fff', fontFamily: 'inherit', width: isMobile ? '100%' : undefined, minWidth: isMobile ? undefined : 160 }}>
            <option value="all">Revenue Source</option>
            {sourceOpts.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '6px 12px', background: '#fff', width: isMobile ? '100%' : undefined, boxSizing: 'border-box' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="12" rx="2" stroke="#94A3B8" strokeWidth="1.4"/><path d="M1 7h14M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent', flex: isMobile ? 1 : undefined }}/>
            <span style={{ color: '#CBD5E1' }}>–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent', flex: isMobile ? 1 : undefined }}/>
          </div>
        </div>
        {!isMobile && (
          <button style={{ width: 38, height: 38, border: `1px solid ${BORDER}`, borderRadius: 10, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke={SLATE} strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1" stroke={SLATE} strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1" stroke={SLATE} strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1" stroke={SLATE} strokeWidth="1.4"/></svg>
          </button>
        )}
      </div>

      {/* report header */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? '16px 18px' : '16px 24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 10 : 32, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>Weera Platform Revenue Report</div>
          <div style={{ display: 'flex', gap: isMobile ? 12 : 24, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            <span style={{ fontSize: 13, color: SLATE }}>Generated By: <strong style={{ color: NAVY }}>Admin</strong></span>
            {(dateFrom || dateTo) && (
              <span style={{ fontSize: 13, color: SLATE }}>Date Range: <strong style={{ color: NAVY }}>{dateFrom || '—'} – {dateTo || '—'}</strong></span>
            )}
            <span style={{ fontSize: 13, color: SLATE }}>Total Revenue: <strong style={{ color: ORANGE }}>{fmtAmt(totalRevenue)}</strong></span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : undefined }}>
          <ExBtn label="CSV"   onClick={() => exportCsv('platform_revenue', exportHeaders, exportRows)}/>
          <ExBtn label="Excel" onClick={() => exportCsv('platform_revenue', exportHeaders, exportRows)}/>
          <ExBtn label="PDF"   onClick={() => exportPdf('Weera Platform Revenue Report', exportHeaders, exportRows)}/>
        </div>
      </div>

      {/* table / cards */}
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
        {isMobile ? (
          /* ── MOBILE: stacked cards — NEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            {paginated.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: 14 }}>No revenue data found</div>
            ) : paginated.map((r) => {
              const ss = stStyle(r.status);
              const isSelected = selectedIds.has(r.id);
              return (
                <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, background: isSelected ? '#FFF7ED' : '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(r.id)} style={{ marginTop: 3, cursor: 'pointer', accentColor: ORANGE }}/>
                      <div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{r.reference}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginTop: 2 }}>{fmtAmt(r.amount)}</div>
                      </div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar src={r.userAvatar} name={r.userName} size={30}/>
                    <span style={{ fontSize: 13, color: NAVY }}>{r.userName}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>Source</div>
                      <div style={{ color: '#475569', fontWeight: 500 }}>{revSource(r.type)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>Date</div>
                      <div style={{ color: '#475569' }}>{fmtDT(r.createdAt)}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>Description</div>
                    <div style={{ color: '#475569', fontSize: 13 }}>{r.description ?? 'Fee on completed project'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── DESKTOP TABLE ── */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 48 }}>
                    <input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(() => allSelected ? new Set() : new Set(paginated.map(r => r.id)))} style={{ accentColor: ORANGE }}/>
                  </th>
                  <th style={{ ...th, width: 56 }}>Sr. No.</th>
                  <th style={th} onClick={() => handleSort('reference')}>Transaction Id <SA k="reference"/></th>
                  <th style={th} onClick={() => handleSort('createdAt')}>Date & Time <SA k="createdAt"/></th>
                  <th style={th} onClick={() => handleSort('type')}>Revenue Source <SA k="type"/></th>
                  <th style={th} onClick={() => handleSort('amount')}>Amount <SA k="amount"/></th>
                  <th style={th} onClick={() => handleSort('userName')}>User <SA k="userName"/></th>
                  <th style={th} onClick={() => handleSort('description')}>Description <SA k="description"/></th>
                  <th style={th} onClick={() => handleSort('status')}>Status <SA k="status"/></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '48px 0' }}>No revenue data found</td></tr>
                ) : paginated.map((r, idx) => {
                  const ss = stStyle(r.status);
                  return (
                    <tr key={r.id} onMouseEnter={e => e.currentTarget.style.background = BG} onMouseLeave={e => e.currentTarget.style.background = '#fff'} style={{ transition: 'background 0.1s' }}>
                      <td style={td}><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleOne(r.id)} style={{ accentColor: ORANGE }}/></td>
                      <td style={{ ...td, color: '#94A3B8', fontSize: 13 }}>{String((page - 1) * pageSize + idx + 1).padStart(2, '0')}</td>
                      <td style={{ ...td, fontSize: 12, color: SLATE, fontFamily: 'monospace' }}>{r.reference}</td>
                      <td style={{ ...td, color: SLATE, whiteSpace: 'nowrap', fontSize: 13 }}>{fmtDT(r.createdAt)}</td>
                      <td style={{ ...td, fontWeight: 500 }}>{revSource(r.type)}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{fmtAmt(r.amount)}</td>
                      <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar src={r.userAvatar} name={r.userName} size={30}/><span style={{ fontSize: 13 }}>{r.userName}</span></div></td>
                      <td style={{ ...td, color: SLATE, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>{r.description ?? 'Fee on completed project'}</td>
                      <td style={td}><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td>
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