import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { bidJobLocation, type BidRecord, type Job } from '../pages/Jobs';
import { BidStats, DonutSegment, AMBER, PURPLE, ORANGE, SKY, GREEN, RED, SectionHead, StatCard, NAVY, ChartCard, DonutChart, HBarList, BORDER, SLATE, HBar, buildGrowthBuckets, GrowthPeriod, PeriodDropdown } from './Analyticscomponents';

interface Props {
  bids: BidRecord[];
  bidStats: BidStats;
  jobs: Job[];
}

const BidAnalyticsTab: React.FC<Props> = ({ bids, bidStats, jobs }) => {
  const [bidPeriod, setBidPeriod] = useState<GrowthPeriod>('days');

  // ── top 10 jobs by bids received (with job location) ──────────────
  const topJobs = useMemo(() => {
    const byJob = new Map<string, { id: string; title: string; count: number; location: string }>();
    bids.forEach(b => {
      const existing = byJob.get(b.job_id);
      if (existing) { existing.count++; return; }
      const job = jobs.find(j => j.id === b.job_id);
      byJob.set(b.job_id, {
        id: b.job_id,
        title: b.job_title || b.jobs?.title || 'Untitled job',
        count: 1,
        location: job?.location || bidJobLocation(b) || '\u2014',
      });
    });
    return Array.from(byJob.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [bids, jobs]);

  const maxTopCount = Math.max(...topJobs.map(t => t.count), 1);

  // ── bid trend: all bids + the top-3 jobs as their own lines ───────
  const TREND_COLORS = [GREEN, PURPLE, '#F59E0B'];
  const top3 = topJobs.slice(0, 3);

  const bidSeries = useMemo(() => {
    const total = buildGrowthBuckets(bids, bidPeriod, b => b.submitted_at);
    const perJob = top3.map(t =>
      buildGrowthBuckets(bids.filter(b => b.job_id === t.id), bidPeriod, b => b.submitted_at),
    );
    return total.map((b, i) => {
      const row: Record<string, number | string> = { label: b.label, bids: b.count };
      perJob.forEach((series, k) => { row[`top${k}`] = series[i]?.count ?? 0; });
      return row;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bids, bidPeriod, topJobs]);

  const truncate = (t: string, n = 18) => (t.length > n ? `${t.slice(0, n)}\u2026` : t);
  const completedBidPct = bidStats.total > 0
    ? Math.round((bidStats.completed / bidStats.total) * 100)
    : 0;

  const bidDonutSegments: DonutSegment[] = [
    { value: bidStats.waiting,       color: AMBER,     label: 'Waiting'        },
    { value: bidStats.offerSent,     color: '#2563EB', label: 'Offer Sent'     },
    { value: bidStats.offerAccepted, color: PURPLE,    label: 'Offer Accepted' },
    { value: bidStats.assigned,      color: ORANGE,    label: 'Assigned'       },
    { value: bidStats.inProgress,    color: SKY,       label: 'In Progress'    },
    { value: bidStats.inReview,      color: '#9333EA', label: 'In Review'      },
    { value: bidStats.completed,     color: GREEN,     label: 'Completed'      },
    { value: bidStats.declined,      color: RED,       label: 'Declined'       },
    { value: bidStats.withdrawn,     color: '#64748B', label: 'Withdrawn'      },
  ].filter(s => s.value > 0);

  return (
    <>
      <SectionHead title="Bids Overview" sub="Metrics across all submitted bids" icon="💼" />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Bids"      value={bidStats.total}          sub="All bids submitted"       accent={NAVY}   />
        <StatCard label="Conversion Rate" value={bidStats.conversionRate} sub="% of bids progressed"    accent={GREEN}  />
        <StatCard label="Rejected Bids"   value={bidStats.declined}       sub="Declined or rejected"     accent={RED}    />
        <StatCard label="Pending Review"  value={bidStats.inReview}       sub="Awaiting client approval" accent={SKY}    />
      </div>

      {/* Bids over time + Top 10 jobs by bids */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard
          title="Bid Trend"
          sub="All bids per period, with the top 3 most-bid jobs overlaid"
          action={<PeriodDropdown value={bidPeriod} onChange={setBidPeriod} />}
        >
          {bidSeries.every(b => (b.bids as number) === 0) ? (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: 13 }}>
              No bids in this period
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={bidSeries} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bidsArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SKY} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={SKY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', fontSize: 12, fontFamily: "'Inter', sans-serif" }}
                    labelStyle={{ fontWeight: 700, color: NAVY }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bids"
                    name="All bids"
                    stroke={SKY}
                    strokeWidth={2.5}
                    fill="url(#bidsArea)"
                    dot={false}
                    activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#fff' }}
                    animationDuration={900}
                  />
                  {top3.map((t, k) => (
                    <Line
                      key={t.id}
                      type="monotone"
                      dataKey={`top${k}`}
                      name={truncate(t.title)}
                      stroke={TREND_COLORS[k]}
                      strokeWidth={1.8}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 3.5, strokeWidth: 2, stroke: '#fff' }}
                      animationDuration={900}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
              {/* Legend: total + top-3 jobs */}
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 18, height: 3, borderRadius: 2, background: SKY }} />
                  <span style={{ fontSize: 11, color: SLATE }}>All bids</span>
                </div>
                {top3.map((t, k) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 18, height: 0, borderTop: `2px dashed ${TREND_COLORS[k]}` }} />
                    <span style={{ fontSize: 11, color: SLATE, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {truncate(t.title, 24)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title="Top 10 Jobs by Bids" sub="Jobs attracting the most bids, with location">
          {topJobs.length === 0 ? (
            <span style={{ fontSize: 13, color: '#CBD5E1' }}>No bids recorded yet</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto', paddingRight: 4 }}>
              {topJobs.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 20, fontSize: 11, fontWeight: 700, color: i < 3 ? ORANGE : '#94A3B8', flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 10, color: SLATE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                        {"\uD83D\uDCCD"} {t.location}
                      </span>
                      <div style={{ flex: 1, height: 4, background: BORDER, borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${(t.count / maxTopCount) * 100}%`, background: SKY, borderRadius: 99 }} />
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, background: '#F1F5F9', borderRadius: 20, padding: '2px 9px', flexShrink: 0 }}>
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* 3-col: Status donut | Top Bid Categories | Top Bid Locations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Bid Status Breakdown" sub="Current state of all bids">
          <DonutChart
            segments={bidDonutSegments}
            centerLabel="Completed"
            centerValue={`${completedBidPct}%`}
          />
        </ChartCard>

        <ChartCard title="Top Bid Categories" sub="Categories of jobs receiving most bids">
          <HBarList items={bidStats.topCategories} color={PURPLE} empty="No bid category data yet" />
        </ChartCard>

        <ChartCard title="Top Bid Locations" sub="Locations where bids are placed">
          <HBarList items={bidStats.topLocations} color={GREEN} empty="No bid location data yet" />
        </ChartCard>
      </div>

      {/* Ratings summary — full width */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Bid Ratings Summary</div>
        <div style={{ fontSize: 11, color: SLATE, marginBottom: 20 }}>Client satisfaction across completed bids</div>

        {bidStats.ratedCount === 0
          ? <span style={{ fontSize: 13, color: '#CBD5E1' }}>No ratings recorded yet</span>
          : (
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Big average */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <span style={{ fontSize: 52, fontWeight: 800, color: NAVY, lineHeight: 1 }}>
                  {bidStats.avgRating.toFixed(1)}
                </span>
                <div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <svg key={s} width={18} height={18} viewBox="0 0 24 24"
                        fill={s <= Math.round(bidStats.avgRating) ? '#F59E0B' : '#E2E8F0'}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: SLATE, marginTop: 5 }}>
                    {bidStats.ratedCount} rated bid{bidStats.ratedCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Distribution bars */}
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[5, 4, 3, 2, 1].map(star => {
                  const cnt = bids.filter(
                    b => b.client_rating != null && Math.round(b.client_rating) === star
                  ).length;
                  return (
                    <HBar
                      key={star}
                      label={`${star} star${star !== 1 ? 's' : ''}`}
                      count={cnt}
                      max={bidStats.ratedCount}
                      color="#F59E0B"
                    />
                  );
                })}
              </div>
            </div>
          )
        }
      </div>
    </>
  );
};

export default BidAnalyticsTab;