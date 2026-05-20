import React, { useEffect, useState, useMemo } from 'react';
import { fetchJobs } from '../api/jobServices';
import type { Job } from '../pages/Jobs';

// ── colour tokens ──────────────────────────────────────────────────────
const ORANGE = '#EA580C';
const NAVY = '#0F172A';
const SLATE = '#64748B';
const BORDER = '#E2E8F0';
const SKY = '#0EA5E9';

// ── types ──────────────────────────────────────────────────────────────
type GrowthPeriod = 'days' | 'weeks' | 'months';

interface GrowthBucket {
    label: string;
    count: number;
}

// ── helpers ────────────────────────────────────────────────────────────
function startOfDay(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoWeek(d: Date): string {
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const wk = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    return `W${wk}`;
}

function buildGrowthBuckets(jobs: Job[], period: GrowthPeriod): GrowthBucket[] {
    const now = new Date();

    if (period === 'days') {
        // last 14 days
        const buckets: GrowthBucket[] = Array.from({ length: 14 }, (_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() - (13 - i));
            return {
                label: d.toLocaleString('default', { weekday: 'short', day: 'numeric' }),
                count: 0,
                _key: startOfDay(d).getTime(),
            } as GrowthBucket & { _key: number };
        });

        jobs.forEach(j => {
            if (!j.posted_at) return;
            const key = startOfDay(new Date(j.posted_at)).getTime();
            const b = (buckets as (GrowthBucket & { _key: number })[]).find(b => b._key === key);
            if (b) b.count++;
        });

        return buckets;
    }

    if (period === 'weeks') {
        // last 8 weeks
        const map = new Map<string, GrowthBucket>();
        const labels: string[] = [];
        for (let i = 7; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i * 7);
            const lbl = isoWeek(d);
            if (!map.has(lbl)) {
                map.set(lbl, { label: lbl, count: 0 });
                labels.push(lbl);
            }
        }
        jobs.forEach(j => {
            if (!j.posted_at) return;
            const lbl = isoWeek(new Date(j.posted_at));
            const b = map.get(lbl);
            if (b) b.count++;
        });
        return labels.map(l => map.get(l)!);
    }

    // months – last 6
    const buckets: GrowthBucket[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
            label: d.toLocaleString('default', { month: 'short' }),
            count: 0,
            _key: `${d.getFullYear()}-${d.getMonth()}`,
        } as GrowthBucket & { _key: string };
    });

    jobs.forEach(j => {
        if (!j.posted_at) return;
        const d = new Date(j.posted_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const b = (buckets as (GrowthBucket & { _key: string })[]).find(b => b._key === key);
        if (b) b.count++;
    });

    return buckets;
}

// ── animated number ────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        let cur = 0;
        const step = Math.ceil(value / 40) || 1;
        const t = setInterval(() => {
            cur += step;
            if (cur >= value) { setDisplay(value); clearInterval(t); }
            else setDisplay(cur);
        }, 20);
        return () => clearInterval(t);
    }, [value]);
    return <>{display.toLocaleString()}</>;
}

// ── stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: { label: string; value: number; sub: string; accent: string }) {
    return (
        <div style={{
            background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16,
            padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6,
            position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: '16px 16px 0 0' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: NAVY, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedNumber value={value} />
            </span>
            <span style={{ fontSize: 12, color: SLATE }}>{sub}</span>
        </div>
    );
}

// ── bar chart ──────────────────────────────────────────────────────────
function BarChart({ data }: { data: GrowthBucket[] }) {
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px', overflowX: 'auto' }}>
            {data.map((d, i) => (
                <div key={i} style={{ flex: '1 0 auto', minWidth: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 110 }}>
                        <div style={{ width: 16, height: `${Math.max((d.count / max) * 100, 2)}%`, background: ORANGE, borderRadius: '4px 4px 0 0', transition: 'height 0.8s cubic-bezier(.4,0,.2,1)' }} title={`Jobs: ${d.count}`} />
                    </div>
                    <span style={{ fontSize: 8, color: SLATE, letterSpacing: 0.2, whiteSpace: 'nowrap' }}>{d.label}</span>
                </div>
            ))}
        </div>
    );
}

// ── donut chart ────────────────────────────────────────────────────────
function DonutChart({ active, assigned, completed, pending, suspended }: { active: number; assigned: number; completed: number; pending: number; suspended: number; }) {
    const total = active + assigned + completed + pending + suspended || 1;
    const r = 52, circ = 2 * Math.PI * r;
    const segments = [
        { value: active, color: '#16A34A', label: 'Active' },
        { value: assigned, color: '#CA8A04', label: 'Assigned' },
        { value: completed, color: '#2563EB', label: 'Completed' },
        { value: pending, color: '#F59E0B', label: 'Pending' },
        { value: suspended, color: '#DC2626', label: 'Suspended' },
    ].filter(s => s.value > 0);

    let offset = 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <svg width={130} height={130} viewBox="0 0 130 130">
                <circle cx={65} cy={65} r={r} fill="none" stroke={BORDER} strokeWidth={18} />
                {segments.map((seg, i) => {
                    const dash = (seg.value / total) * circ;
                    const el = (
                        <circle key={i} cx={65} cy={65} r={r} fill="none" stroke={seg.color} strokeWidth={18}
                            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="butt"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px', transition: 'stroke-dasharray 1s ease' }}
                        />
                    );
                    offset += dash;
                    return el;
                })}
                <text x={65} y={60} textAnchor="middle" fontSize={20} fontWeight={700} fill={NAVY}>{Math.round((active / total) * 100)}%</text>
                <text x={65} y={76} textAnchor="middle" fontSize={10} fill={SLATE}>Active</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {segments.map((seg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: SLATE }}>{seg.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginLeft: 'auto', paddingLeft: 12 }}>{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── horizontal bar ─────────────────────────────────────────────────────
function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: SLATE, width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            <div style={{ flex: 1, height: 6, background: BORDER, borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${(count / max) * 100}%`, background: color, borderRadius: 99, transition: 'width 1s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, width: 28, textAlign: 'right' }}>{count}</span>
        </div>
    );
}

// ── period dropdown ────────────────────────────────────────────────────
const PERIOD_OPTIONS: { value: GrowthPeriod; label: string }[] = [
    { value: 'days', label: 'Last 14 Days' },
    { value: 'weeks', label: 'Last 8 Weeks' },
    { value: 'months', label: 'Last 6 Months' },
];

function PeriodDropdown({ value, onChange }: { value: GrowthPeriod; onChange: (v: GrowthPeriod) => void }) {
    return (
        <div style={{ position: "relative" }}>
            <select
                value={value}
                onChange={e => onChange(e.target.value as GrowthPeriod)}
                style={{
                    fontSize: 11, fontWeight: 600, color: NAVY,
                    background: '#F8FAFC', border: `1px solid ${BORDER}`,
                    borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                    outline: 'none', appearance: 'none',
                    paddingRight: 26,
                }}
            >
                {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <svg
                width="10"
                height="6"
                viewBox="0 0 10 6"
                fill="none"
                style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                }}
            >
                <path d="M1 1L5 5L9 1" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
}

// ── main component ─────────────────────────────────────────────────────
const JobAnalytics: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<GrowthPeriod>('months');

    useEffect(() => {
        fetchJobs()
            .then(setJobs)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // ── derived stats ────────────────────────────────────────────────────
    const stats = useMemo(() => {
        let active = 0, assigned = 0, completed = 0, pending = 0, suspended = 0;
        let totalApplicants = 0;
        const typeCount: Record<string, number> = {};

        jobs.forEach(j => {
            const s = j.status.toLowerCase();
            if (s === 'active' || s === 'in_progress') active++;
            else if (s === 'assigned' || s === 'offer_sent' || s === 'offer_accepted') assigned++;
            else if (s === 'completed') completed++;
            else if (s === 'pending' || s === 'pending_review' || s === 'submitted' || s === 'waiting_for_bidder_response') pending++;
            else suspended++;

            totalApplicants += j.applicants || 0;

            j.categories
                .filter((category) => category && category !== 'General')
                .forEach((category) => {
                    typeCount[category] = (typeCount[category] || 0) + 1;
                });
        });

        const total = jobs.length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const avgApplicants = total > 0 ? Math.round(totalApplicants / total) : 0;

        const topTypes = Object.entries(typeCount)
            .sort((a, b) => b[1] - a[1]).slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        return { total, active, assigned, completed, pending, suspended, completionRate, avgApplicants, topTypes };
    }, [jobs]);

    const growthData = useMemo(() => buildGrowthBuckets(jobs, period), [jobs, period]);
    const maxType = Math.max(...stats.topTypes.map(t => t.count), 1);

    // ── loading ──────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: SLATE, fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${BORDER}`, borderTop: `3px solid ${ORANGE}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                Loading analytics…
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    );

    return (
        <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: NAVY }}>

            {/* stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                <StatCard label="Total Jobs" value={stats.total} sub="All jobs posted" accent={NAVY} />
                <StatCard label="Active Jobs" value={stats.active} sub="Currently open" accent={ORANGE} />
                <StatCard label="Completed" value={stats.completed} sub={`${stats.completionRate}% completion rate`} accent={SKY} />
                <StatCard label="Avg Applicants" value={stats.avgApplicants} sub="Per job posting" accent="#16A34A" />
            </div>

            {/* charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                {/* growth chart */}
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Jobs Posted Over Time</div>
                            <div style={{ fontSize: 11, color: SLATE, marginTop: 2 }}>New postings per period</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <PeriodDropdown value={period} onChange={setPeriod} />
                        </div>
                    </div>
                    <BarChart data={growthData} />
                </div>

                {/* donut */}
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Job Status Breakdown</div>
                    <div style={{ fontSize: 11, color: SLATE, marginBottom: 20 }}>Current state distribution</div>
                    <DonutChart active={stats.active} assigned={stats.assigned} completed={stats.completed} pending={stats.pending} suspended={stats.suspended} />
                </div>
            </div>

            {/* bottom row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Top Job Categories</div>
                    <div style={{ fontSize: 11, color: SLATE, marginBottom: 16 }}>Most popular required capabilities</div>
                    {stats.topTypes.length > 0
                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {stats.topTypes.map((t, i) => <HBar key={i} label={t.name} count={t.count} max={maxType} color={ORANGE} />)}
                        </div>
                        : <span style={{ fontSize: 13, color: '#CBD5E1' }}>No job category data</span>}
                </div>
            </div>

        </div>
    );
};

export default JobAnalytics;
