/* ─── src/features/reports/components/ResponseModal.tsx ─────── */
import React, { useState } from 'react';
import { BG, BORDER, capitalize, fmt, JobReport, NAVY, ORANGE, SLATE } from '../hooks/types';

interface Props {
  report: JobReport;
  onClose: () => void;
  onSave: (id: string, status: string, response: string) => Promise<void>;
}

export const ResponseModal: React.FC<Props> = ({ report, onClose, onSave }) => {
  const [status,   setStatus]   = useState(report.status);
  const [response, setResponse] = useState(report.admin_response ?? '');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!response.trim()) return;
    setSaving(true);
    await onSave(report.id, status, response);
    setSaving(false);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 200 }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: '#fff', borderRadius: 16, zIndex: 201, width: 'min(520px, 94vw)',
        boxShadow: '0 20px 60px rgba(15,23,42,0.18)',
        fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
      }}>
        {/* header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Respond to Report</div>
            <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>
              Job: <strong>{report.job_title}</strong>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke={SLATE} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* report summary */}
          <div style={{ background: BG, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Reporter', value: report.reporter_name },
                { label: 'Reason',   value: capitalize(report.reason) },
                { label: 'Reported', value: fmt(report.created_at) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: NAVY, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
            {report.details && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>Details</div>
                <div style={{ fontSize: 13, color: SLATE, lineHeight: 1.6 }}>{report.details}</div>
              </div>
            )}
          </div>

          {/* status */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: SLATE, display: 'block', marginBottom: 6 }}>Update Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 14, color: NAVY, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
            >
              {['pending', 'reviewed', 'resolved', 'dismissed', 'actioned'].map(s => (
                <option key={s} value={s}>{capitalize(s)}</option>
              ))}
            </select>
          </div>

          {/* response text */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: SLATE, display: 'block', marginBottom: 6 }}>Admin Response</label>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder="Write your response to this report…"
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 14, color: NAVY, fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
              onFocus={e => (e.currentTarget.style.borderColor = ORANGE)}
              onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
            />
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff', fontSize: 14, fontWeight: 600, color: SLATE, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !response.trim()}
            style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: ORANGE, fontSize: 14, fontWeight: 600, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {saving ? 'Saving…' : 'Submit Response'}
          </button>
        </div>
      </div>
    </>
  );
};