/* ─── src/features/reports/components/JobReportsTable.tsx ───── */
import React, { useState, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(false); // NEW

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const th: React.CSSProperties = {
    padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: SLATE, borderBottom: `1px solid ${BORDER}`, background: BG,
    whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.6,
  };
  const td: React.CSSProperties = {
    padding: '13px 16px', fontSize: 14, color: NAVY,
    borderBottom: '1px solid #F1F5F9', verticalAlign: 'middle',
  };

  const emptyMessage = search || statusF !== 'all' || reasonF !== 'all'
    ? 'No reports match your filters.'
    : 'No job reports yet.';

  return (
    <>
      {isMobile ? (
        /* ── MOBILE VIEW — stacked cards ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
          {data.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: 14 }}>
              {emptyMessage}
            </div>
          ) : data.map((r, idx) => {
            const ss = stS(r.status);
            return (
              <div
                key={r.id}
                onClick={() => onRowClick(r)}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 16,
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                {/* Header: index + job title + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>
                      #{String((page - 1) * pageSize + idx + 1).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginTop: 2 }}>
                      {r.job_title}
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, whiteSpace: 'nowrap' }}>
                    {ss.label}
                  </span>
                </div>

                {/* Reporter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar src={r.reporter_avatar} name={r.reporter_name} size={32} />
                  <span style={{ fontSize: 13, color: '#475569' }}>{r.reporter_name}</span>
                </div>

                {/* Meta grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  <div>
                    <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>Reason</div>
                    <span style={{ display: 'inline-block', marginTop: 2, padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#FEF3C7', color: '#92400E' }}>
                      {capitalize(r.reason)}
                    </span>
                  </div>
                  <div>
                    <div style={{ color: '#94A3B8', fontSize: 11, textTransform: 'uppercase' }}>Reported</div>
                    <div style={{ color: '#475569' }}>{fmt(r.created_at)}</div>
                  </div>
                </div>

                {/* Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 4 }}>
                  <button
                    onClick={e => { e.stopPropagation(); onRespond(r); }}
                    style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${ORANGE}`, background: '#fff', color: ORANGE, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {r.admin_response ? 'Update' : 'Respond'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── DESKTOP TABLE ── */
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
                    {emptyMessage}
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
      )}

      <Pagination
        page={page} totalPages={totalPages}
        pageSize={pageSize} totalItems={filteredCount}
        onPage={onPage} onPageSize={onPageSize}
      />
    </>
  );
};