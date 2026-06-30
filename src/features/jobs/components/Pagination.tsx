/* ─── src/features/reports/components/Pagination.tsx ────────── */
import React from 'react';
import { BG, BORDER, NAVY, ORANGE, PAGE_SIZE_OPTIONS, SLATE } from '../hooks/types';


interface Props {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}

export const Pagination: React.FC<Props> = ({
  page, totalPages, pageSize, totalItems, onPage, onPageSize,
}) => {
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
      padding: '14px 20px', borderTop: '1px solid #F1F5F9',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10, background: BG,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: SLATE }}>Rows per page</span>
        <select
          value={pageSize}
          onChange={e => onPageSize(Number(e.target.value))}
          style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: NAVY, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
        >
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ fontSize: 13, color: SLATE }}>
          {totalItems === 0
            ? '0'
            : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalItems)}`
          } of {totalItems}
        </span>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => onPage(page - 1)} disabled={page === 1}
            style={{ ...btn, opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M9 2L4 7l5 5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {pages.map((p, i) => p === '…'
            ? <span key={`e${i}`} style={{ ...btn, cursor: 'default', border: 'none', color: SLATE }}>…</span>
            : (
              <button key={p} onClick={() => onPage(p as number)} style={{
                ...btn,
                background: page === p ? ORANGE : '#fff',
                color:      page === p ? '#fff' : NAVY,
                border:     `1px solid ${page === p ? ORANGE : BORDER}`,
              }}>{p}</button>
            )
          )}

          <button
            onClick={() => onPage(page + 1)} disabled={page === totalPages}
            style={{ ...btn, opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M5 2l5 5-5 5" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};