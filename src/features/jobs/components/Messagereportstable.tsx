/* ─── src/features/reports/components/MessageReportsTable.tsx ── */
import React from 'react';
import { Avatar } from '../../shared/Avatar';

import { BG, BLUE, BORDER, capitalize, fmt, MessageReport, NAVY,SLATE } from '../hooks/types';
import { Pagination } from './Pagination';

interface Props {
  data: MessageReport[];
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  reasonF: string;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  onRowClick: (r: MessageReport) => void;
}

export const MessageReportsTable: React.FC<Props> = ({
  data, filteredCount, page, pageSize, totalPages,
  search, reasonF,
  onPage, onPageSize, onRowClick,
}) => {
  const th: React.CSSProperties = {
    padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: SLATE, borderBottom: `1px solid ${BORDER}`, background: BG,
    whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.6,
  };
  const td: React.CSSProperties = {
    padding: '13px 16px', fontSize: 14, color: NAVY,
    borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle',
  };

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 52, textAlign: 'center' }}>#</th>
              <th style={th}>Reporter</th>
              <th style={th}>Reason</th>
              <th style={th}>Note</th>
              <th style={th}>Conversation</th>
              <th style={th}>Reported</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '48px 0' }}>
                  {search || reasonF !== 'all'
                    ? 'No reports match your filters.'
                    : 'No message reports yet.'}
                </td>
              </tr>
            ) : data.map((r, idx) => (
              <tr
                key={r.id}
                onClick={() => onRowClick(r)}
                onMouseEnter={e => (e.currentTarget.style.background = BG)}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                style={{ transition: 'background 0.1s', cursor: 'pointer' }}
              >
                <td style={{ ...td, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
                  {String((page - 1) * pageSize + idx + 1).padStart(2, '0')}
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar src={r.reporter_avatar} name={r.reporter_name} size={32}/>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{r.reporter_name}</span>
                  </div>
                </td>
                <td style={td}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#FEF3C7', color: '#92400E', whiteSpace: 'nowrap' }}>
                    {capitalize(r.reason)}
                  </span>
                </td>
                <td style={{ ...td, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: SLATE, fontSize: 13 }}>
                  {r.note ?? <span style={{ color: '#CBD5E1' }}>—</span>}
                </td>
                <td style={td}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#EFF6FF', color: BLUE, whiteSpace: 'nowrap' }}>
                    Conv #{r.conversation_id?.slice(0, 8).toUpperCase() ?? '—'}
                  </span>
                </td>
                <td style={{ ...td, color: SLATE, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {fmt(r.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page} totalPages={totalPages}
        pageSize={pageSize} totalItems={filteredCount}
        onPage={onPage} onPageSize={onPageSize}
      />
    </>
  );
};