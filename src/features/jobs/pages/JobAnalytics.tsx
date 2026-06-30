import React, { useEffect, useState, useMemo } from 'react';
import { fetchJobs, fetchBids } from '../api/jobServices';
import type { Job, BidRecord } from '../pages/Jobs';
import { BidStats, buildGrowthBuckets, ChartCard, DonutChart, DonutSegment, GREEN, GrowthPeriod, HBarList, LineChart, NAVY, ORANGE, PeriodDropdown, RED, SectionHead, SKY, SLATE, Spinner, StatCard } from '../components/Analyticscomponents';
import BidAnalyticsTab from '../components/Bidanalyticstab';


// ── types ──────────────────────────────────────────────────────────────
type TabView = 'overview' | 'bid-analytics';

const MAIN_TABS: { id: TabView; label: string }[] = [
  { id: 'overview',      label: '📊  Overview'     },
  { id: 'bid-analytics', label: '💼  Bid Analytics' },
];

// ── main component ─────────────────────────────────────────────────────
const JobAnalytics: React.FC = () => {
  const [jobs, setJobs]     = useState<Job[]>([]);
  const [bids, setBids]     = useState<BidRecord[]>([]);
  const [loading, setLoading]               = useState(true);
  const [tab, setTab]                       = useState<TabView>('overview');
  const [combinedPeriod, setCombinedPeriod] = useState<GrowthPeriod>('months');

  useEffect(() => {
    Promise.all([fetchJobs(), fetchBids()])
      .then(([j, b]) => { setJobs(j); setBids(b as BidRecord[]); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── job stats ──────────────────────────────────────────────────────
  const jobStats = useMemo(() => {
    let active = 0, assigned = 0, completed = 0, pending = 0, suspended = 0, totalApplicants = 0;
    const catCount: Record<string, number> = {};
    const locCount: Record<string, number> = {};

    jobs.forEach(j => {
      const s = j.status.toLowerCase();
      if (s === 'active' || s === 'in_progress') active++;
      else if (['assigned', 'offer_sent', 'offer_accepted'].includes(s)) assigned++;
      else if (s === 'completed') completed++;
      else if (['pending', 'pending_review', 'submitted', 'waiting_for_bidder_response'].includes(s)) pending++;
      else suspended++;

      totalApplicants += j.applicants || 0;
      j.categories.filter(c => c && c !== 'General').forEach(c => { catCount[c] = (catCount[c] || 0) + 1; });
      if (j.location) locCount[j.location] = (locCount[j.location] || 0) + 1;
    });

    const total = jobs.length;
    return {
      total, active, assigned, completed, pending, suspended,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgApplicants:  total > 0 ? Math.round(totalApplicants / total) : 0,
      topCategories:  Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
      topLocations:   Object.entries(locCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    };
  }, [jobs]);

  // ── bid stats (passed down to BidAnalyticsTab) ─────────────────────
  const bidStats = useMemo((): BidStats => {
    let waiting = 0, offerSent = 0, offerAccepted = 0, assigned = 0;
    let inProgress = 0, inReview = 0, completed = 0, declined = 0, withdrawn = 0;
    let totalValue = 0, ratedCount = 0, totalRating = 0;
    const catCount: Record<string, number> = {};
    const locCount: Record<string, number> = {};

    bids.forEach(b => {
      const s = b.status.toLowerCase();
      if (s === 'waiting_for_bidder_response') waiting++;
      else if (s === 'offer_sent')      offerSent++;
      else if (s === 'offer_accepted')  offerAccepted++;
      else if (s === 'assigned')        assigned++;
      else if (s === 'in_progress')     inProgress++;
      else if (s === 'pending_review')  inReview++;
      else if (s === 'completed')       completed++;
      else if (s === 'declined_work' || s === 'rejected') declined++;
      else if (s === 'withdrawn')       withdrawn++;

      totalValue += b.price || 0;
      if (b.client_rating != null) { ratedCount++; totalRating += b.client_rating; }

      // Cross-reference job_id to get bid categories
      const matchedJob = jobs.find(j => j.id === b.job_id);
      if (matchedJob) {
        matchedJob.categories.filter(c => c && c !== 'General').forEach(c => { catCount[c] = (catCount[c] || 0) + 1; });
      }

      // Bid location from joined data
      const loc = b.jobs?.location_id?.location;
      if (loc) locCount[loc] = (locCount[loc] || 0) + 1;
    });

    const total = bids.length;
    return {
      total, waiting, offerSent, offerAccepted, assigned,
      inProgress, inReview, completed, declined, withdrawn,
      conversionRate: total > 0 ? Math.round(((inProgress + inReview + completed + assigned + offerAccepted) / total) * 100) : 0,
      avgValue:  total > 0 ? Math.round(totalValue / total) : 0,
      avgRating: ratedCount > 0 ? totalRating / ratedCount : 0,
      ratedCount,
      topCategories: Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
      topLocations:  Object.entries(locCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    };
  }, [bids, jobs]);

  // ── chart data ─────────────────────────────────────────────────────
  const jobGrowthData = useMemo(() => buildGrowthBuckets(jobs, combinedPeriod, j => j.posted_at),    [jobs, combinedPeriod]);
  const bidGrowthData = useMemo(() => buildGrowthBuckets(bids, combinedPeriod, b => b.submitted_at), [bids, combinedPeriod]);

  // ── derived values for Overview tab ───────────────────────────────
  const activeJobPct = jobStats.total > 0 ? Math.round((jobStats.active / jobStats.total) * 100) : 0;

  const jobDonutSegments: DonutSegment[] = [
    { value: jobStats.active,    color: GREEN,     label: 'Active'    },
    { value: jobStats.assigned,  color: '#CA8A04', label: 'Assigned'  },
    { value: jobStats.completed, color: '#2563EB', label: 'Completed' },
    { value: jobStats.pending,   color: '#F59E0B', label: 'Pending'   },
    { value: jobStats.suspended, color: RED,       label: 'Suspended' },
  ].filter(s => s.value > 0);

  if (loading) return <Spinner />;

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: NAVY }}>

      {/* ── tab nav ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 24, width: 'fit-content' }}>
        {MAIN_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            background: tab === t.id ? '#fff'        : 'transparent',
            color:      tab === t.id ? NAVY          : SLATE,
            boxShadow:  tab === t.id ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
            transition: 'all 0.18s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* OVERVIEW TAB                                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <>
          <SectionHead title="Jobs Overview" sub="Metrics across all job postings" icon="📋" />

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Jobs"     value={jobStats.total}         sub="All postings"                                  accent={NAVY}   />
            <StatCard label="Active Jobs"    value={jobStats.active}        sub="Currently open"                                accent={ORANGE} />
            <StatCard label="Completed"      value={jobStats.completed}     sub={`${jobStats.completionRate}% completion rate`} accent={SKY}    />
            <StatCard label="Avg Applicants" value={jobStats.avgApplicants} sub="Per job posting"                               accent={GREEN}  />
          </div>

          {/* Combined line chart */}
          <ChartCard
            title="Activity Over Time"
            sub="Jobs posted vs bids submitted per period"
            action={<PeriodDropdown value={combinedPeriod} onChange={setCombinedPeriod} />}
          >
            <LineChart datasets={[
              { label: 'Jobs Posted',    color: ORANGE, data: jobGrowthData },
              { label: 'Bids Submitted', color: SKY,    data: bidGrowthData },
            ]} />
          </ChartCard>

          {/* 3-col: Status donut | Top Posted Categories | Top Job Locations */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
            <ChartCard title="Job Status Breakdown" sub="Current state distribution">
              <DonutChart segments={jobDonutSegments} centerLabel="Active" centerValue={`${activeJobPct}%`} />
            </ChartCard>

            <ChartCard title="Top Posted Categories" sub="Most common job categories">
              <HBarList items={jobStats.topCategories} color={ORANGE} empty="No category data yet" />
            </ChartCard>

            <ChartCard title="Top Job Locations" sub="Where most jobs are posted">
              <HBarList items={jobStats.topLocations} color={SKY} empty="No location data yet" />
            </ChartCard>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* BID ANALYTICS TAB — delegated to BidAnalyticsTab          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === 'bid-analytics' && (
        <BidAnalyticsTab bids={bids} bidStats={bidStats} />
      )}

    </div>
  );
};

export default JobAnalytics;