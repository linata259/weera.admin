/* ─── src/features/reports/components/JobReportsTable.tsx ───── */
import React from 'react';
import { BG, BORDER, capitalize, fmt, JobReport, NAVY, ORANGE, SLATE, stS } from '../../hooks/types';
import { Pagination } from '../Pagination';
import { Avatar } from '../../../shared/Avatar';

interface Props {
  data: JobReport[];
  filteredCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  statusF: string;
  reasonF: string;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  onRowClick: (r: JobReport) => void;
  onRespond: (r: JobReport) => void;
}

export const JobReportsTable: React.FC<Props> = ({
  data, filteredCount, page, pageSize, totalPages,
  search, statusF, reasonF,
  onPage, onPageSize, onRowClick, onRespond,
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
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 52, textAlign: 'center' }}>#</th>
              <th style={th}>Reporter</th>
              <th style={th}>Job</th>
              <th style={th}>Reason</th>
              <th style={th}>Status</th>
              <th style={th}>Reported</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: 'center', color: '#94A3B8', padding: '48px 0' }}>
                  {search || statusF !== 'all' || reasonF !== 'all'
                    ? 'No reports match your filters.'
                    : 'No job reports yet.'}
                </td>
              </tr>
            ) : data.map((r, idx) => {
              const ss = stS(r.status);
              return (
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
                  <td style={{ ...td, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                    {r.job_title}
                  </td>
                  <td style={td}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#FEF3C7', color: '#92400E', whiteSpace: 'nowrap' }}>
                      {capitalize(r.reason)}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                      {ss.label}
                    </span>
                  </td>
                  <td style={{ ...td, color: SLATE, fontSize: 13, whiteSpace: 'nowrap' }}>
                    {fmt(r.created_at)}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button
                      onClick={e => { e.stopPropagation(); onRespond(r); }}
                      style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${ORANGE}`, background: '#fff', color: ORANGE, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      {r.admin_response ? 'Update' : 'Respond'}
                    </button>
                  </td>
                </tr>
              );
            })}
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