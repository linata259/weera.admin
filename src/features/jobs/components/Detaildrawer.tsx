/* ─── src/features/reports/components/DetailDrawer.tsx ──────── */
import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from 'services/supabaseClient';
import { Avatar } from '../../shared/Avatar';
import { BLUE, BORDER, capitalize, fmt, fmtTime, GREEN, JobReport, JobReportReply, MessageReport, NAVY, ORANGE, SLATE, stS, Tab } from '../hooks/types';

interface Props {
  report: JobReport | MessageReport | null;
  type: Tab;
  onClose: () => void;
}

const Row: React.FC<{ label: string; value: React.ReactNode; multiline?: boolean }> = ({ label, value, multiline }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>{label}</div>
    <div style={{ fontSize: 14, color: NAVY, lineHeight: multiline ? 1.7 : 1.4 }}>{value}</div>
  </div>
);

/* ── reply thread (job reports only) ─────────────────────────── */
const ReplyThread: React.FC<{ reportId: string }> = ({ reportId }) => {
  const [replies, setReplies] = useState<JobReportReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft]     = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_report_replies')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });
    if (!error && data) setReplies(data as JobReportReply[]);
    setLoading(false);
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    const message = draft.trim();
    if (!message || sending) return;

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const { error } = await supabase.from('job_report_replies').insert({
      report_id: reportId,
      sender_id: user.id,
      sender_role: 'admin',
      message,
    });

    if (!error) {
      setDraft('');
      await load();
    }
    setSending(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        Conversation
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: SLATE, padding: '8px 0' }}>Loading…</div>
      ) : replies.length === 0 ? (
        <div style={{ fontSize: 13, color: SLATE, padding: '8px 0' }}>No replies yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {replies.map(r => {
            const isAdmin = r.sender_role === 'admin';
            return (
              <div
                key={r.id}
                style={{
                  alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: isAdmin ? '#FFF3E9' : '#F1F5F9',
                  border: `1px solid ${isAdmin ? '#FED7AA' : BORDER}`,
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: isAdmin ? ORANGE : SLATE, marginBottom: 3 }}>
                  {isAdmin ? 'Admin' : 'User'}
                </div>
                <div style={{ fontSize: 13, color: NAVY, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {r.message}
                </div>
                <div style={{ fontSize: 10, color: SLATE, marginTop: 4 }}>
                  {fmtTime(r.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* reply input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Reply to user…"
          rows={2}
          style={{
            flex: 1, boxSizing: 'border-box', padding: '8px 12px', borderRadius: 10,
            border: `1px solid ${BORDER}`, fontSize: 13, color: NAVY, fontFamily: 'inherit',
            outline: 'none', resize: 'vertical', lineHeight: 1.5,
          }}
          onFocus={e => (e.currentTarget.style.borderColor = ORANGE)}
          onBlur={e  => (e.currentTarget.style.borderColor = BORDER)}
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          style={{
            padding: '0 16px', borderRadius: 10, border: 'none',
            background: ORANGE, color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: sending ? 'not-allowed' : 'pointer', opacity: sending || !draft.trim() ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
};

export const DetailDrawer: React.FC<Props> = ({ report, type, onClose }) => {
  if (!report) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.25)', zIndex: 199 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)',
        background: '#fff', zIndex: 200, boxShadow: '-8px 0 32px rgba(15,23,42,0.12)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter','Helvetica Neue',sans-serif",
      }}>
        {/* header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Report Details</span>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke={SLATE} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* reporter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar src={report.reporter_avatar} name={report.reporter_name} size={44}/>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{report.reporter_name}</div>
              <div style={{ fontSize: 12, color: SLATE }}>Reported {fmt(report.created_at)}</div>
            </div>
          </div>

          {type === 'job_reports' ? (() => {
            const jr = report as JobReport;
            const ss = stS(jr.status);
            return (
              <>
                <Row label="Job" value={jr.job_title}/>
                <Row label="Reason" value={capitalize(jr.reason)}/>
                {jr.details && <Row label="Details" value={jr.details} multiline/>}
                <Row label="Status" value={
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color }}>
                    {ss.label}
                  </span>
                }/>
                {jr.admin_response && (
                  <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Admin Response</div>
                    <div style={{ fontSize: 13, color: NAVY, lineHeight: 1.7 }}>{jr.admin_response}</div>
                    {jr.responded_at && (
                      <div style={{ fontSize: 11, color: SLATE, marginTop: 8 }}>Responded {fmtTime(jr.responded_at)}</div>
                    )}
                  </div>
                )}

                <ReplyThread reportId={jr.id} />
              </>
            );
          })() : (() => {
            const mr = report as MessageReport;
            return (
              <>
                <Row label="Reason" value={capitalize(mr.reason)}/>
                {mr.note && <Row label="Note" value={mr.note} multiline/>}
                <Row label="Conversation ID" value={
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: SLATE, wordBreak: 'break-all' }}>
                    {mr.conversation_id}
                  </span>
                }/>
                {mr.attachment_url && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Attachment</div>
                    <a href={mr.attachment_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: BLUE, wordBreak: 'break-all' }}>
                      View attachment ↗
                    </a>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
};
