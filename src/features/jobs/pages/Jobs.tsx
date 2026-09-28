import React, { lazy, useState, useEffect, useMemo } from "react";
import { useJobs } from "../hooks/useJobs";
import { fetchJobs, fetchBids, toggleJobSponsorship, softDeleteJob, banJob } from "../api/jobServices";
import { TableToolbar } from "../components/table/TableToolbar";
import { JobTable } from "../components/table/JobTable";
import { JobDetailsModal } from "../components/JobDetailsModal";
import { JobAgeStatusTable } from "../components/table/Jobagestatustable";
import { useSearchParams } from 'react-router-dom';
import { readDashboardCache, writeDashboardCache } from "../../../utils/dashboardCache";
import {
    Ico,
    IconChevronDownControl,
    IconExport,
    IconJobs,
    IconSearchControl,
    iconSize,
} from "../../../components/icons";
import { PageHeader } from "../../../components/PageHeader";
import { LazyBoundary } from "../../../components/LazyBoundary";
import { JobStatusBadge } from "../components/table/JobStatusBadge";
import { Avatar } from "../../shared/Avatar";
import { SortIcon } from "../../shared/SortIcon";
import { PageBtn } from "../../shared/PageBtn";
import { bidTitle, bidStatusLabel, fmtMoney } from "../utils/jobsExport";

/* Only needed once someone clicks Export — keeps the PDF engine out of the page bundle. */
const ExportJobsModal = lazy(() =>
    import("../components/ExportJobsModal")
        .then(m => {
            try { sessionStorage.removeItem("jobsExportReload"); } catch {}
            return { default: m.ExportJobsModal };
        })
        .catch((err) => {
            // A redeploy renames chunks; an open tab then 404s on this import. Reload once to pick up the new build.
            let reloaded = false;
            try { reloaded = sessionStorage.getItem("jobsExportReload") === "1"; sessionStorage.setItem("jobsExportReload", "1"); } catch {}
            if (!reloaded) { window.location.reload(); return new Promise<never>(() => {}); }
            throw err;
        }),
);

const JOBS_CACHE_KEY = "jobsPage";
const BIDS_CACHE_KEY = "jobsPageBids";
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
    bidder_name?: string;
    bidder_image?: string | null;
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
/*                                  BIDS TABLE                                */
/* -------------------------------------------------------------------------- */

const NAVY   = '#0F172A';
const SLATE  = '#64748B';
const BORDER = '#E2E8F0';


const BIDS_PER_PAGE = 12;

const controlStyle: React.CSSProperties = {
    height: 42, padding: '0 12px', border: `1px solid ${BORDER}`, borderRadius: 8,
    fontSize: 13, color: NAVY, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const thStyle: React.CSSProperties = {
    padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #E8EDF2',
    color: SLATE, fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', userSelect: 'none',
};
const tdStyle: React.CSSProperties = {
    padding: '13px 16px', borderBottom: '1px solid #F1F5F9', fontSize: 14, color: '#475569', verticalAlign: 'middle',
};

function BidsTable({ bids }: { bids: BidRecord[] }) {
    const [search, setSearch]             = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom]         = useState('');
    const [dateTo, setDateTo]             = useState('');
    const [titleSort, setTitleSort]       = useState<'asc' | 'desc' | null>(null);
    const [page, setPage]                 = useState(1);

    const statusOptions = useMemo(() => Array.from(new Set(bids.map(b => b.status).filter(Boolean))).sort(), [bids]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (to) to.setHours(23, 59, 59, 999);

        const list = bids.filter(b => {
            if (q && !bidTitle(b).toLowerCase().includes(q) && !(b.bidder_name ?? '').toLowerCase().includes(q)) return false;
            if (statusFilter !== 'all' && b.status !== statusFilter) return false;
            if (from || to) {
                if (!b.submitted_at) return false;
                const d = new Date(b.submitted_at);
                if (from && d < from) return false;
                if (to && d > to) return false;
            }
            return true;
        });
        if (!titleSort) return list;
        const dir = titleSort === 'asc' ? 1 : -1;
        return [...list].sort((a, b) => dir * bidTitle(a).localeCompare(bidTitle(b), undefined, { sensitivity: 'base' }));
    }, [bids, search, statusFilter, dateFrom, dateTo, titleSort]);

    const hasFilters = Boolean(search || statusFilter !== 'all' || dateFrom || dateTo);
    const resetFilters = () => { setSearch(''); setStatusFilter('all'); setDateFrom(''); setDateTo(''); setPage(1); };
    const toggleTitleSort = () => setTitleSort(s => (s === 'asc' ? 'desc' : 'asc'));

    const totalPages = Math.max(1, Math.ceil(filtered.length / BIDS_PER_PAGE));
    const safePage   = Math.min(page, totalPages);
    const paginated  = filtered.slice((safePage - 1) * BIDS_PER_PAGE, safePage * BIDS_PER_PAGE);
    const fmtDate    = (s: string) => (s ? new Date(s).toLocaleDateString('en-GB') : '—');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
                    <Ico icon={IconSearchControl} size={iconSize.sm} color="#94A3B8"
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search job title or bidder"
                        style={{ ...controlStyle, width: '100%', paddingLeft: 34 }} />
                </div>

                <div style={{ position: 'relative' }}>
                    <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        style={{ ...controlStyle, paddingRight: 32, appearance: 'none', cursor: 'pointer', minWidth: 160 }}>
                        <option value="all">All statuses</option>
                        {statusOptions.map(s => <option key={s} value={s}>{bidStatusLabel(s)}</option>)}
                    </select>
                    <Ico icon={IconChevronDownControl} size={iconSize.sm} color={SLATE}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="date" aria-label="Submitted from" value={dateFrom} max={dateTo || undefined}
                        onChange={e => { setDateFrom(e.target.value); setPage(1); }} style={controlStyle} />
                    <span style={{ fontSize: 13, color: SLATE }}>to</span>
                    <input type="date" aria-label="Submitted to" value={dateTo} min={dateFrom || undefined}
                        onChange={e => { setDateTo(e.target.value); setPage(1); }} style={controlStyle} />
                </div>

                {hasFilters && (
                    <button onClick={resetFilters}
                        style={{ border: 'none', background: 'none', color: SLATE, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>
                        Clear filters
                    </button>
                )}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #E8EDF2', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, fontFamily: 'inherit' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC' }}>
                                <th style={{ ...thStyle, cursor: 'pointer' }} onClick={toggleTitleSort}
                                    aria-sort={titleSort === 'asc' ? 'ascending' : titleSort === 'desc' ? 'descending' : 'none'}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        Job title
                                        <SortIcon active={titleSort !== null} direction={titleSort ?? undefined} />
                                    </span>
                                </th>
                                <th style={thStyle}>Bidder</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Client rating</th>
                                <th style={thStyle}>Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
                                    {bids.length === 0 ? 'No bids yet' : 'No bids match these filters'}
                                </td></tr>
                            ) : paginated.map(bid => (
                                <tr key={bid.id}>
                                    <td style={{ ...tdStyle, maxWidth: 280 }}>
                                        <span title={bidTitle(bid)} style={{ color: NAVY, fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {bidTitle(bid) || '—'}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Avatar src={bid.bidder_image} name={bid.bidder_name || '?'} size={28} />
                                            <span style={{ color: NAVY, whiteSpace: 'nowrap' }}>{bid.bidder_name || '—'}</span>
                                        </div>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <span style={{ color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(bid.price, bid.currency)}</span>
                                        {bid.counter_offer != null && (
                                            <span style={{ display: 'block', fontSize: 12, color: '#94A3B8' }}>Counter {fmtMoney(bid.counter_offer, bid.currency)}</span>
                                        )}
                                    </td>
                                    <td style={tdStyle}>{bid.is_hourly ? 'Hourly' : 'Fixed'}</td>
                                    <td style={tdStyle}><JobStatusBadge status={bid.status} label={bidStatusLabel(bid.status)} /></td>
                                    <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>
                                        {bid.client_rating != null ? `${bid.client_rating.toFixed(1)} / 5` : <span style={{ color: '#CBD5E1' }}>—</span>}
                                    </td>
                                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(bid.submitted_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <span style={{ fontSize: 13, color: '#94A3B8' }}>
                        {filtered.length === 0
                            ? '0 bids'
                            : `Showing ${(safePage - 1) * BIDS_PER_PAGE + 1}–${Math.min(safePage * BIDS_PER_PAGE, filtered.length)} of ${filtered.length.toLocaleString()} bids`}
                    </span>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <PageBtn label="Previous" disabled={safePage === 1} onClick={() => setPage(Math.max(1, safePage - 1))} />
                            <span style={{ fontSize: 13, color: '#475569', padding: '0 8px' }}>Page {safePage} of {totalPages}</span>
                            <PageBtn label="Next" disabled={safePage === totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))} />
                        </div>
                    )}
                </div>
            </div>
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
    const [jobs, setJobs]                 = useState<Job[]>(() => readDashboardCache<Job[]>(JOBS_CACHE_KEY) ?? []);
    const [bids, setBids]                 = useState<BidRecord[]>(() => readDashboardCache<BidRecord[]>(BIDS_CACHE_KEY) ?? []);
    const [viewingJob, setViewingJob]     = useState<Job | null>(null);
    const [mainTab, setMainTab]           = useState<MainTab>("all");
    const [showExport, setShowExport]     = useState(false);

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
            writeDashboardCache(JOBS_CACHE_KEY, sanitizedJobs);
        });
    }, []);

    useEffect(() => {
        fetchBids()
            .then(data => {
                setBids(data as BidRecord[]);
                writeDashboardCache(BIDS_CACHE_KEY, data);
            })
            .catch(console.error);
    }, []);

    /* ---------------------------------------------------------------------- */
    /*                                FILTERING                               */
    /* ---------------------------------------------------------------------- */

    const dateRangeStart = useMemo(() => {
        const now = new Date();
        if (dateRangeFilter === "7d")  return new Date(now.getTime() - 7 * 86_400_000);
        if (dateRangeFilter === "30d") return new Date(now.getTime() - 30 * 86_400_000);
        if (dateRangeFilter === "1y")  return new Date(now.getFullYear(), 0, 1);
        return null;
    }, [dateRangeFilter]);

    const filteredAndSortedJobs = baseFiltered.filter((j) => {
        if (statusFilter !== "all" && j.status !== statusFilter) return false;
        if (jobTypeFilter !== "all" && !j.categories.includes(jobTypeFilter)) return false;
        if (dateRangeStart && (!j.posted_at || new Date(j.posted_at) < dateRangeStart)) return false;
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
        { id: "all",       label: "All jobs"        },
        { id: "bids",      label: "Bids"            },
        { id: "ageStatus", label: "Job age & status" },
    ];

    return (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20, fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>

            <PageHeader
                title="Jobs"
                subtitle="Every job posted on the platform, the bids placed on them, and how long each has been open."
                icon={IconJobs}
                actions={mainTab !== "ageStatus" ? (
                    <button
                        onClick={() => setShowExport(true)}
                        style={{
                            padding: "9px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff",
                            fontSize: 14, fontWeight: 600, color: NAVY, cursor: "pointer", fontFamily: "inherit",
                            display: "flex", alignItems: "center", gap: 8,
                        }}
                    >
                        <Ico icon={IconExport} size={iconSize.md} color={SLATE} />
                        Export {mainTab === "bids" ? "bids" : "jobs"}
                    </button>
                ) : undefined}
                below={
                    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #E8EDF2" }}>
                        {MAIN_TABS.map(t => (
                            <button key={t.id} onClick={() => setMainTab(t.id)} style={{
                                padding: "12px 18px", border: "none", background: "none", cursor: "pointer",
                                fontSize: 14, fontFamily: "inherit",
                                fontWeight: mainTab === t.id ? 700 : 500,
                                color: mainTab === t.id ? "#EA580C" : "#64748B",
                                borderBottom: mainTab === t.id ? "2px solid #EA580C" : "2px solid transparent",
                                marginBottom: -1,
                                display: "flex", alignItems: "center", gap: 6,
                            }}>
                                {t.label}
                                {t.id === "bids" && (
                                    <span style={{ fontSize: 13, fontWeight: 500, color: "#94A3B8" }}>{bids.length.toLocaleString()}</span>
                                )}
                            </button>
                        ))}
                    </div>
                }
            />

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
            {mainTab === "bids" && <BidsTable bids={bids} />}

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

            {showExport && (
                <LazyBoundary fallback={null}>
                    {mainTab === "bids" ? (
                        <ExportJobsModal kind="bids" bids={bids} onClose={() => setShowExport(false)} />
                    ) : (
                        <ExportJobsModal
                            kind="jobs"
                            jobs={jobs}
                            categoryOptions={jobCategoryOptions.map(o => o.value)}
                            onClose={() => setShowExport(false)}
                        />
                    )}
                </LazyBoundary>
            )}
        </div>
    );
};

export default Jobs;