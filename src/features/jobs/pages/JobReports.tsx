/* ─── src/features/reports/pages/ReportsPage.tsx ─────────────── */
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from 'services/supabaseClient';
import { BG, BLUE, BORDER, capitalize, GREEN, JobReport, MessageReport, NAVY, ORANGE, SLATE, Tab } from '../hooks/types';
import { DetailDrawer } from '../components/Detaildrawer';
import { MessageReportsTable } from '../components/Messagereportstable';
import { ResponseModal } from '../components/Responsemodal';
import { JobReportsTable } from '../components/table/Jobreportstable';


/* ══════════════════════════════════════════════════════════════ */
const ReportsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('job_reports');

  /* ── data ───────────────────────────────────────────────────── */
  const [jobReports,     setJobReports]     = useState<JobReport[]>([]);
  const [messageReports, setMessageReports] = useState<MessageReport[]>([]);
  const [loadingJR,      setLoadingJR]      = useState(true);
  const [loadingMR,      setLoadingMR]      = useState(true);

  /* ── filters ────────────────────────────────────────────────── */
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('all');
  const [reasonF, setReasonF] = useState('all');
  const [dateFrom,setDateFrom]= useState('');
  const [dateTo,  setDateTo]  = useState('');

  /* ── pagination ─────────────────────────────────────────────── */
  const [jrPage, setJrPage] = useState(1);
  const [jrSize, setJrSize] = useState(25);
  const [mrPage, setMrPage] = useState(1);
  const [mrSize, setMrSize] = useState(25);

  /* ── modals ─────────────────────────────────────────────────── */
  const [responseTarget, setResponseTarget] = useState<JobReport | null>(null);
  const [drawerTarget,   setDrawerTarget]   = useState<JobReport | MessageReport | null>(null);

  /* ── load job_reports ───────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('job_reports')
        .select('id, job_id, reporter_id, reason, details, status, created_at, admin_response, responded_at, admin_id')
        .order('created_at', { ascending: false });

      if (error || !data) { setLoadingJR(false); return; }

      const jobIds = Array.from(new Set(data.map((r: any) => r.job_id).filter(Boolean))) as string[];
      const { data: jobs } = await supabase.from('jobs').select('id, title').in('id', jobIds);
      const jobMap = new Map((jobs ?? []).map((j: any) => [j.id, j.title ?? 'Untitled Job']));

      const repIds = Array.from(new Set(data.map((r: any) => r.reporter_id).filter(Boolean))) as string[];
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, image_url').in('id', repIds);
      const profMap = new Map((profiles ?? []).map((p: any) => [
        p.id,
        { name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown', avatar: p.image_url ?? null },
      ]));

      setJobReports(data.map((r: any): JobReport => ({
        ...r,
        job_title:       jobMap.get(r.job_id)              ?? 'Unknown Job',
        reporter_name:   profMap.get(r.reporter_id)?.name   ?? 'Unknown',
        reporter_avatar: profMap.get(r.reporter_id)?.avatar ?? null,
      })));
      setLoadingJR(false);
    };
    load();
  }, []);

  /* ── load message_reports ───────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('message_reports')
        .select('id, message_id, reporter_id, conversation_id, attachment_url, reason, note, created_at, conversation_key')
        .order('created_at', { ascending: false });

      if (error || !data) { setLoadingMR(false); return; }

      const repIds = Array.from(new Set(data.map((r: any) => r.reporter_id).filter(Boolean))) as string[];
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, image_url').in('id', repIds);
      const profMap = new Map((profiles ?? []).map((p: any) => [
        p.id,
        { name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown', avatar: p.image_url ?? null },
      ]));

      setMessageReports(data.map((r: any): MessageReport => ({
        ...r,
        reporter_name:   profMap.get(r.reporter_id)?.name   ?? 'Unknown',
        reporter_avatar: profMap.get(r.reporter_id)?.avatar ?? null,
      })));
      setLoadingMR(false);
    };
    load();
  }, []);

  /* reset to page 1 on any filter / tab change */
  useEffect(() => { setJrPage(1); setMrPage(1); }, [search, statusF, reasonF, dateFrom, dateTo, tab]);

  /* ── filtered lists ─────────────────────────────────────────── */
  const filteredJR = useMemo(() => {
    let list = jobReports;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.job_title.toLowerCase().includes(q)    ||
        r.reporter_name.toLowerCase().includes(q)||
        (r.reason  ?? '').toLowerCase().includes(q) ||
        (r.details ?? '').toLowerCase().includes(q)
      );
    }
    if (statusF !== 'all') list = list.filter(r => r.status === statusF);
    if (reasonF !== 'all') list = list.filter(r => r.reason === reasonF);
    if (dateFrom) { const f = new Date(dateFrom).getTime(); list = list.filter(r => new Date(r.created_at).getTime() >= f); }
    if (dateTo)   { const t = new Date(dateTo).getTime();   list = list.filter(r => new Date(r.created_at).getTime() <= t); }
    return list;
  }, [jobReports, search, statusF, reasonF, dateFrom, dateTo]);

  const filteredMR = useMemo(() => {
    let list = messageReports;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.reporter_name.toLowerCase().includes(q)       ||
        (r.reason ?? '').toLowerCase().includes(q)      ||
        (r.note   ?? '').toLowerCase().includes(q)      ||
        (r.conversation_id ?? '').toLowerCase().includes(q)
      );
    }
    if (reasonF !== 'all') list = list.filter(r => r.reason === reasonF);
    if (dateFrom) { const f = new Date(dateFrom).getTime(); list = list.filter(r => new Date(r.created_at).getTime() >= f); }
    if (dateTo)   { const t = new Date(dateTo).getTime();   list = list.filter(r => new Date(r.created_at).getTime() <= t); }
    return list;
  }, [messageReports, search, reasonF, dateFrom, dateTo]);

  /* ── paginated slices ───────────────────────────────────────── */
  const jrTotalPages = Math.max(1, Math.ceil(filteredJR.length / jrSize));
  const mrTotalPages = Math.max(1, Math.ceil(filteredMR.length / mrSize));
  const pagedJR = filteredJR.slice((jrPage - 1) * jrSize, jrPage * jrSize);
  const pagedMR = filteredMR.slice((mrPage - 1) * mrSize, mrPage * mrSize);

  /* ── save admin response ────────────────────────────────────── */
  const handleSaveResponse = async (id: string, status: string, response: string) => {
    const { error } = await supabase
      .from('job_reports')
      .update({ status, admin_response: response, responded_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      setJobReports(prev => prev.map(r =>
        r.id === id ? { ...r, status, admin_response: response, responded_at: new Date().toISOString() } : r
      ));
    }
  };

  /* ── derived counts / options ───────────────────────────────── */
  const pendingJR    = jobReports.filter(r => r.status === 'pending').length;
  const resolvedJR   = jobReports.filter(r => r.status === 'resolved').length;
  const reasonOptsJR = Array.from(new Set(jobReports.map(r => r.reason))).sort();
  const reasonOptsMR = Array.from(new Set(messageReports.map(r => r.reason))).sort();
  const loading      = tab === 'job_reports' ? loadingJR : loadingMR;

  /* ════════════════════════════════════════════════════════════ */
  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: NAVY }}>Reports</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: SLATE }}>
          Review and action job and message reports submitted by users
        </p>
      </div>

      {/* stat chips */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Job Reports',     value: jobReports.length,     color: ORANGE    },
          { label: 'Pending',         value: pendingJR,             color: '#CA8A04' },
          { label: 'Resolved',        value: resolvedJR,            color: GREEN     },
          { label: 'Message Reports', value: messageReports.length, color: BLUE      },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 140px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }}/>
            <span style={{ fontSize: 13, color: SLATE, fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginLeft: 'auto' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* card */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>

        {/* tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, padding: '0 20px' }}>
          {([
            { id: 'job_reports',     label: `Job Reports (${jobReports.length})`        },
            { id: 'message_reports', label: `Message Reports (${messageReports.length})` },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(''); setStatusF('all'); setReasonF('all'); }}
              style={{
                padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontFamily: 'inherit',
                fontWeight: tab === t.id ? 700 : 500,
                color:      tab === t.id ? ORANGE : SLATE,
                borderBottom: tab === t.id ? `2px solid ${ORANGE}` : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* toolbar */}
        <div style={{ padding: '12px 20px', display: 'flex', gap: 10, alignItems: 'center', borderBottom: `1px solid ${BORDER}`, background: BG, flexWrap: 'wrap' }}>
          {/* search */}
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke={SLATE} strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke={SLATE} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 34px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: NAVY, fontFamily: 'inherit', background: '#fff', outline: 'none' }}
            />
          </div>

          {/* reason */}
          <select value={reasonF} onChange={e => setReasonF(e.target.value)} style={{ padding: '8px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: NAVY, background: '#fff', fontFamily: 'inherit', outline: 'none', minWidth: 140 }}>
            <option value="all">All Reasons</option>
            {(tab === 'job_reports' ? reasonOptsJR : reasonOptsMR).map(r => (
              <option key={r} value={r}>{capitalize(r)}</option>
            ))}
          </select>

          {/* status — job reports only */}
          {tab === 'job_reports' && (
            <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ padding: '8px 14px', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 13, color: NAVY, background: '#fff', fontFamily: 'inherit', outline: 'none', minWidth: 140 }}>
              <option value="all">All Statuses</option>
              {['pending', 'reviewed', 'resolved', 'dismissed', 'actioned'].map(s => (
                <option key={s} value={s}>{capitalize(s)}</option>
              ))}
            </select>
          )}

          {/* date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '6px 12px', background: '#fff' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="12" rx="2" stroke="#94A3B8" strokeWidth="1.4"/>
              <path d="M1 7h14M5 1v4M11 1v4" stroke="#94A3B8" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent' }}/>
            <span style={{ color: '#CBD5E1' }}>–</span>
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ border: 'none', outline: 'none', fontSize: 12, color: SLATE, fontFamily: 'inherit', background: 'transparent' }}/>
          </div>

          <span style={{ fontSize: 13, color: SLATE, marginLeft: 'auto' }}>
            {tab === 'job_reports' ? filteredJR.length : filteredMR.length} results
          </span>
        </div>

        {/* table content */}
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: SLATE, fontSize: 14 }}>
            Loading reports…
          </div>
        ) : tab === 'job_reports' ? (
          <JobReportsTable
            data={pagedJR}
            filteredCount={filteredJR.length}
            page={jrPage} pageSize={jrSize} totalPages={jrTotalPages}
            search={search} statusF={statusF} reasonF={reasonF}
            onPage={setJrPage}
            onPageSize={n => { setJrSize(n); setJrPage(1); }}
            onRowClick={setDrawerTarget}
            onRespond={setResponseTarget}
          />
        ) : (
          <MessageReportsTable
            data={pagedMR}
            filteredCount={filteredMR.length}
            page={mrPage} pageSize={mrSize} totalPages={mrTotalPages}
            search={search} reasonF={reasonF}
            onPage={setMrPage}
            onPageSize={n => { setMrSize(n); setMrPage(1); }}
            onRowClick={setDrawerTarget}
          />
        )}
      </div>

      {/* modals */}
      {responseTarget && (
        <ResponseModal
          report={responseTarget}
          onClose={() => setResponseTarget(null)}
          onSave={handleSaveResponse}
        />
      )}
      {drawerTarget && (
        <DetailDrawer
          report={drawerTarget}
          type={tab}
          onClose={() => setDrawerTarget(null)}
        />
      )}
    </div>
  );
};

export default ReportsPage;