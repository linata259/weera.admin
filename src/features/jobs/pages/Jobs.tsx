import React, { useState, useEffect, useMemo } from "react";
import { useJobs } from "../hooks/useJobs";
import { fetchJobs, fetchBids, toggleJobSponsorship, softDeleteJob, banJob } from "../api/jobServices";
import { TableToolbar } from "../components/table/TableToolbar";
import { JobTable } from "../components/table/JobTable";
import { JobDetailsModal } from "../components/JobDetailsModal";
import { JobAgeStatusTable } from "../components/table/Jobagestatustable";
import { useSearchParams } from 'react-router-dom';
/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export interface Job {
    id: string;
    jobId: string;
    title: string;
    jobType: string;
    categories: string[];
    status: string;
    applicants: number;
    posted_at: string | null;
    expires_at: string | null;
    updated_at: string | null;

    posted_by_user_id: string | null;
    posted_by_name: string;
    posted_by_image: string | null;

    description: string;
    location: string;
    locationType: string;
    budget: number | null;
    skills: string[];
    paymentType: string;
    timeline: string;
    attachments: { url: string; name: string }[];

    isSponsored: boolean;
}

// Exported so JobAnalytics.tsx can import it
export interface BidRecord {
    id: string;
    job_id: string;
    user_id: string;
    job_title: string;
    price: number;
    currency: string;
    is_hourly: boolean;
    status: string;
    submitted_at: string;
    counter_offer?: number | null;
    decline_reason?: string | null;
    client_rating?: number | null;
    client_review?: string | null;
    jobs?: {
        title?: string;
        location_id?: { location?: string } | null;
        job_location_type?: string | null;
        counties?: { name?: string | null } | null;
        subcounties?: { name?: string | null } | null;
        wards?: { name?: string | null } | null;
    } | null;
}

/** Location of the job a bid was placed on (new county/ward scheme first). */
export function bidJobLocation(b: BidRecord): string {
    const j = b.jobs;
    if (!j) return "";
    const type = (j.job_location_type ?? "").toLowerCase();
    if (type === "remote") return "Remote";
    const adminArea = [j.wards?.name, j.subcounties?.name, j.counties?.name]
        .filter((n): n is string => Boolean(n))
        .join(", ");
    if (adminArea) return adminArea;
    return j.location_id?.location ?? "";
}

/* -------------------------------------------------------------------------- */
/*                              BID TABLE CONSTANTS                           */
/* -------------------------------------------------------------------------- */

// Colour tokens (local to this file)
const ORANGE = '#EA580C';
const NAVY   = '#0F172A';
const SLATE  = '#64748B';
const BORDER = '#E2E8F0';
const SKY    = '#0EA5E9';
const GREEN  = '#16A34A';
const PURPLE = '#7C3AED';
const RED    = '#DC2626';
const AMBER  = '#B45309';

const BID_STATUS: Record<string, { color: string; label: string; bg: string }> = {
    pending:                     { color: SLATE,     label: 'Pending',        bg: '#F1F5F9' },
    waiting_for_bidder_response: { color: AMBER,     label: 'Waiting',        bg: '#FEF3C7' },
    offer_sent:                  { color: '#2563EB', label: 'Offer Sent',     bg: '#DBEAFE' },
    offer_accepted:              { color: PURPLE,    label: 'Offer Accepted', bg: '#EDE9FE' },
    assigned:                    { color: ORANGE,    label: 'Assigned',       bg: '#FFEDD5' },
    in_progress:                 { color: SKY,       label: 'In Progress',    bg: '#E0F2FE' },
    pending_review:              { color: '#9333EA', label: 'In Review',      bg: '#F3E8FF' },
    completed:                   { color: GREEN,     label: 'Completed',      bg: '#DCFCE7' },
    declined_work:               { color: RED,       label: 'Declined',       bg: '#FEE2E2' },
    rejected:                    { color: RED,       label: 'Rejected',       bg: '#FEE2E2' },
    withdrawn:                   { color: SLATE,     label: 'Withdrawn',      bg: '#F1F5F9' },
};

type BidTableGroup = 'all' | 'active' | 'review' | 'completed' | 'declined';

const BID_GROUP_STATUSES: Record<BidTableGroup, string[]> = {
    all:       [],
    active:    ['waiting_for_bidder_response', 'offer_sent', 'offer_accepted', 'assigned', 'in_progress'],
    review:    ['pending_review'],
    completed: ['completed'],
    declined:  ['declined_work', 'rejected', 'withdrawn'],
};

const BID_TABLE_TABS: { id: BidTableGroup; label: string }[] = [
    { id: 'all',       label: 'All'       },
    { id: 'active',    label: 'Active'    },
    { id: 'review',    label: 'In Review' },
    { id: 'completed', label: 'Completed' },
    { id: 'declined',  label: 'Declined'  },
];

/* -------------------------------------------------------------------------- */
/*                           BID TABLE COMPONENTS                             */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: string }) {
    const cfg = BID_STATUS[status] ?? { color: SLATE, label: status.replace(/_/g, ' '), bg: '#F1F5F9' };
    return (
        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>
            {cfg.label}
        </span>
    );
}

function StarRating({ value }: { value?: number | null }) {
    if (value == null) return <span style={{ fontSize: 11, color: '#CBD5E1' }}>—</span>;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} width={11} height={11} viewBox="0 0 24 24" fill={s <= value ? '#F59E0B' : '#E2E8F0'}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
            <span style={{ fontSize: 10, color: SLATE, marginLeft: 3 }}>{value.toFixed(1)}</span>
        </div>
    );
}

const BIDS_PER_PAGE = 12;

function BidsTable({ bids, group = 'all' }: { bids: BidRecord[]; group?: BidTableGroup }) {
    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage]                 = useState(1);

    const groupFiltered = useMemo(() => {
        const statuses = BID_GROUP_STATUSES[group];
        return statuses.length === 0 ? bids : bids.filter(b => statuses.includes(b.status));
    }, [bids, group]);

    const statusOptions = useMemo(() => Array.from(new Set(groupFiltered.map(b => b.status))).sort(), [groupFiltered]);

    const filtered = useMemo(() => groupFiltered.filter(b => {
        const q = search.toLowerCase();
        const matchSearch = !q || b.job_title?.toLowerCase().includes(q) || b.jobs?.title?.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'all' || b.status === statusFilter;
        return matchSearch && matchStatus;
    }), [groupFiltered, search, statusFilter]);

    const totalPages = Math.ceil(filtered.length / BIDS_PER_PAGE);
    const paginated  = filtered.slice((page - 1) * BIDS_PER_PAGE, page * BIDS_PER_PAGE);

    const fmt     = (price: number, currency: string) => `${currency} ${price.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
    const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });

    const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

    return (
        <div>
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={SLATE} strokeWidth={2.2}
                        style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                        <circle cx={11} cy={11} r={8} /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by job title…"
                        style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 30, paddingRight: 12, height: 34, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: NAVY, outline: 'none', background: '#FAFAFA', fontFamily: 'inherit' }} />
                </div>

                {statusOptions.length > 1 && (
                    <div style={{ position: 'relative' }}>
                        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            style={{ height: 34, padding: '0 28px 0 10px', border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: NAVY, outline: 'none', appearance: 'none', background: '#FAFAFA', cursor: 'pointer', fontFamily: 'inherit' }}>
                            <option value="all">All Statuses</option>
                            {statusOptions.map(s => <option key={s} value={s}>{BID_STATUS[s]?.label ?? s}</option>)}
                        </select>
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                            <path d="M1 1L5 5L9 1" stroke={SLATE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}

                <span style={{ fontSize: 12, color: SLATE, marginLeft: 'auto' }}>
                    {filtered.length} bid{filtered.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${BORDER}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'inherit' }}>
                    <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: `1px solid ${BORDER}` }}>
                            {['Job Title', 'Amount', 'Type', 'Status', 'Rating', 'Submitted'].map(h => (
                                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.length === 0
                            ? <tr><td colSpan={6} style={{ padding: '36px 14px', textAlign: 'center', color: '#CBD5E1', fontSize: 13 }}>No bids match your filters</td></tr>
                            : paginated.map((bid, i) => (
                                <tr key={bid.id} style={{ borderBottom: i < paginated.length - 1 ? `1px solid ${BORDER}` : 'none', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                                    <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                                        <span style={{ fontWeight: 600, color: NAVY, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {bid.job_title || bid.jobs?.title || '—'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                        <span style={{ fontWeight: 700, color: NAVY }}>{fmt(bid.price, bid.currency)}</span>
                                        {bid.counter_offer != null && (
                                            <span style={{ display: 'block', fontSize: 10, color: SLATE }}>Counter: {fmt(bid.counter_offer, bid.currency)}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: bid.is_hourly ? '#EDE9FE' : '#E0F2FE', color: bid.is_hourly ? PURPLE : SKY }}>
                                            {bid.is_hourly ? 'Hourly' : 'Fixed'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px' }}><StatusBadge status={bid.status} /></td>
                                    <td style={{ padding: '10px 14px' }}><StarRating value={bid.client_rating} /></td>
                                    <td style={{ padding: '10px 14px', color: SLATE, whiteSpace: 'nowrap' }}>{fmtDate(bid.submitted_at)}</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: page === 1 ? '#F8FAFC' : '#fff', color: page === 1 ? '#CBD5E1' : NAVY, cursor: page === 1 ? 'default' : 'pointer', fontSize: 15, fontWeight: 600 }}>
                        ‹
                    </button>
                    {pageNums.map((p, idx) => {
                        const prev = pageNums[idx - 1];
                        return (
                            <React.Fragment key={p}>
                                {prev && p - prev > 1 && <span style={{ color: SLATE, fontSize: 12 }}>…</span>}
                                <button onClick={() => setPage(p)}
                                    style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${page === p ? ORANGE : BORDER}`, background: page === p ? ORANGE : '#fff', color: page === p ? '#fff' : NAVY, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                    {p}
                                </button>
                            </React.Fragment>
                        );
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: page === totalPages ? '#F8FAFC' : '#fff', color: page === totalPages ? '#CBD5E1' : NAVY, cursor: page === totalPages ? 'default' : 'pointer', fontSize: 15, fontWeight: 600 }}>
                        ›
                    </button>
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                              SANITIZE HELPERS                              */
/* -------------------------------------------------------------------------- */

const sanitizeText = (value: string | null): string => {
    if (!value) return "";
    return value.replace(/<script.*?>.*?<\/script>/gi, "").replace(/<[^>]+>/g, "").replace(/[<>]/g, "").trim();
};

const sanitizeImageUrl = (url: string | null): string | null => {
    if (!url) return null;
    const clean = url.trim();
    return (clean.startsWith("http://") || clean.startsWith("https://")) ? clean : null;
};

/* -------------------------------------------------------------------------- */
/*                                MAIN SCREEN                                 */
/* -------------------------------------------------------------------------- */

type MainTab = "all" | "bids" | "ageStatus";

const Jobs: React.FC = () => {
    const [jobs, setJobs]                 = useState<Job[]>([]);
    const [bids, setBids]                 = useState<BidRecord[]>([]);
    const [viewingJob, setViewingJob]     = useState<Job | null>(null);
    const [mainTab, setMainTab]           = useState<MainTab>("all");
    const [bidTableGroup, setBidTableGroup] = useState<BidTableGroup>('all');

    const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter]       = useState<string>("all");
    const [jobTypeFilter, setJobTypeFilter]     = useState<string>("all");

    const { searchTerm, setSearchTerm, filteredAndSortedJobs: baseFiltered, requestSort, sortConfig } = useJobs(jobs);
    const [searchParams] = useSearchParams();
    const highlightJobId = searchParams.get('highlight') ?? undefined;

    /* ---------------------------------------------------------------------- */
    /*                            FETCH + SANITIZE                            */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        fetchJobs().then((data) => {
            const sanitizedJobs = (data as Job[]).map((job) => {
                const categories = Array.isArray(job.categories) ? job.categories.map(sanitizeText).filter(Boolean) : [];
                return {
                    ...job,
                    title: sanitizeText(job.title),
                    jobType: sanitizeText(job.jobType),
                    categories,
                    status: sanitizeText(job.status),
                    posted_by_name: sanitizeText(job.posted_by_name),
                    posted_by_image: sanitizeImageUrl(job.posted_by_image),
                    description: sanitizeText(job.description),
                    location: sanitizeText(job.location),
                    locationType: sanitizeText(job.locationType),
                    paymentType: sanitizeText(job.paymentType),
                    timeline: sanitizeText(job.timeline),
                    skills: Array.isArray(job.skills) ? job.skills.map(sanitizeText).filter(Boolean) : [],
                };
            });
            setJobs(sanitizedJobs);
        });
    }, []);

    useEffect(() => {
        fetchBids().then(data => setBids(data as BidRecord[])).catch(console.error);
    }, []);

    /* ---------------------------------------------------------------------- */
    /*                          BID GROUP COUNTS                              */
    /* ---------------------------------------------------------------------- */

    const groupCounts = useMemo<Record<BidTableGroup, number>>(() => {
        const c = { all: bids.length, active: 0, review: 0, completed: 0, declined: 0 };
        bids.forEach(b => {
            if      (BID_GROUP_STATUSES.active.includes(b.status))    c.active++;
            else if (BID_GROUP_STATUSES.review.includes(b.status))    c.review++;
            else if (BID_GROUP_STATUSES.completed.includes(b.status)) c.completed++;
            else if (BID_GROUP_STATUSES.declined.includes(b.status))  c.declined++;
        });
        return c;
    }, [bids]);

    /* ---------------------------------------------------------------------- */
    /*                                FILTERING                               */
    /* ---------------------------------------------------------------------- */

    const filteredAndSortedJobs = baseFiltered.filter((j) => {
        if (statusFilter !== "all" && j.status !== statusFilter) return false;
        if (jobTypeFilter !== "all" && !j.categories.includes(jobTypeFilter)) return false;
        return true;
    });

    const jobCategoryOptions = Array.from(new Set(jobs.flatMap(j => j.categories).filter(t => t && t !== "General")))
        .sort().map(l => ({ label: l, value: l }));

    /* ---------------------------------------------------------------------- */
    /*                                ACTIONS                                 */
    /* ---------------------------------------------------------------------- */

    const handleViewJob    = (job: Job) => setViewingJob(job);
    const handleSuspendJob = (job: Job) => console.log("Toggle suspend:", job);

    const handleSponsorJob = async (job: Job) => {
        const nextValue = !job.isSponsored;
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, isSponsored: nextValue } : j));
        const success = await toggleJobSponsorship(job.id, nextValue);
        if (!success) setJobs(prev => prev.map(j => j.id === job.id ? { ...j, isSponsored: !nextValue } : j));
    };

    const handleDeleteJob = async (job: Job) => {
        setJobs(prev => prev.filter(j => j.id !== job.id));
        const success = await softDeleteJob(job.id);
        if (!success) setJobs(prev => [...prev, job]);
    };

    const handleBanJob = async (job: Job, reason: string) => {
        const previousStatus = job.status;
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "banned" } : j));
        const success = await banJob(job.id, reason);
        if (!success) setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: previousStatus } : j));
    };

    /* ---------------------------------------------------------------------- */
    /*                                  UI                                    */
    /* ---------------------------------------------------------------------- */

    const MAIN_TABS: { id: MainTab; label: string }[] = [
        { id: "all",       label: "All Jobs"        },
        { id: "bids",      label: "Bids"            },
        { id: "ageStatus", label: "Job Age & Status" },
    ];

    return (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>

            {/* ── Tabs ─────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #E8EDF2" }}>
                {MAIN_TABS.map(t => (
                    <button key={t.id} onClick={() => setMainTab(t.id)} style={{
                        padding: "12px 18px", border: "none", background: "none", cursor: "pointer",
                        fontSize: 14, fontFamily: "inherit",
                        fontWeight: mainTab === t.id ? 700 : 500,
                        color: mainTab === t.id ? "#EA580C" : "#64748B",
                        borderBottom: mainTab === t.id ? "2px solid #EA580C" : "2px solid transparent",
                        marginBottom: -1, transition: "all 0.15s",
                        display: "flex", alignItems: "center", gap: 6,
                    }}>
                        {t.label}
                        {t.id === "bids" && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: mainTab === "bids" ? '#FFF7ED' : '#F1F5F9', color: mainTab === "bids" ? '#EA580C' : '#94A3B8' }}>
                                {bids.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── All Jobs ─────────────────────────────────────────── */}
            {mainTab === "all" && (
                <>
                    <TableToolbar
                        searchTerm={searchTerm}
                        onSearch={setSearchTerm}
                        jobTypeFilter={jobTypeFilter}
                        onJobTypeChange={setJobTypeFilter}
                        jobTypeOptions={jobCategoryOptions}
                        dateRangeFilter={dateRangeFilter}
                        onDateRangeChange={setDateRangeFilter}
                        statusFilter={statusFilter}
                        onStatusChange={setStatusFilter}
                    />
                    <JobTable
                        data={filteredAndSortedJobs}
                        columns={[]}
                        onSort={requestSort}
                        sortConfig={sortConfig as any}
                        onViewJob={handleViewJob}
                        onSuspendJob={handleSuspendJob}
                        onBanJob={handleBanJob}
                        rowsPerPage={10}
                        highlightJobId={highlightJobId}
                    />
                </>
            )}

            {/* ── Bids ─────────────────────────────────────────────── */}
            {mainTab === "bids" && (
                <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>

                    {/* Card header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 0", flexWrap: "wrap", gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>Bids</div>
                            <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>
                                {bids.length.toLocaleString()} total bids across all jobs
                            </div>
                        </div>
                        {/* Quick summary pills */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {([
                                { label: "In Progress", value: groupCounts.active,    color: SKY    },
                                { label: "In Review",   value: groupCounts.review,    color: PURPLE },
                                { label: "Completed",   value: groupCounts.completed, color: GREEN  },
                            ] as { label: string; value: number; color: string }[]).map(p => (
                                <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "4px 12px" }}>
                                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
                                    <span style={{ fontSize: 11, color: SLATE }}>{p.label}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{p.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status sub-tabs */}
                    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${BORDER}`, marginTop: 16, paddingLeft: 12 }}>
                        {BID_TABLE_TABS.map(t => (
                            <button key={t.id} onClick={() => setBidTableGroup(t.id)} style={{
                                padding: "10px 14px", border: "none", background: "none", cursor: "pointer",
                                fontSize: 13, fontFamily: "inherit",
                                fontWeight: bidTableGroup === t.id ? 700 : 500,
                                color: bidTableGroup === t.id ? ORANGE : SLATE,
                                borderBottom: bidTableGroup === t.id ? `2px solid ${ORANGE}` : "2px solid transparent",
                                marginBottom: -1, whiteSpace: "nowrap",
                                display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                            }}>
                                {t.label}
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20,
                                    background: bidTableGroup === t.id ? "#FFF7ED" : "#F1F5F9",
                                    color:      bidTableGroup === t.id ? ORANGE    : "#94A3B8",
                                }}>
                                    {groupCounts[t.id]}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Table — keyed by group so search/filter resets on tab switch */}
                    <div style={{ padding: "20px 24px 24px" }}>
                        <BidsTable key={bidTableGroup} bids={bids} group={bidTableGroup} />
                    </div>
                </div>
            )}

            {/* ── Job Age & Status ─────────────────────────────────── */}
            {mainTab === "ageStatus" && (
                <JobAgeStatusTable
                    data={jobs}
                    onViewJob={handleViewJob}
                    onSponsorJob={handleSponsorJob}
                    onDeleteJob={handleDeleteJob}
                    rowsPerPage={10}
                />
            )}

            <JobDetailsModal job={viewingJob} onClose={() => setViewingJob(null)} />
        </div>
    );
};

export default Jobs;