import React from 'react';
import type { BidRecord } from '../pages/Jobs';
import { BidStats, DonutSegment, AMBER, PURPLE, ORANGE, SKY, GREEN, RED, SectionHead, StatCard, NAVY, ChartCard, DonutChart, HBarList, BORDER, SLATE, HBar } from './Analyticscomponents';

interface Props {
  bids: BidRecord[];
  bidStats: BidStats;
}

const BidAnalyticsTab: React.FC<Props> = ({ bids, bidStats }) => {
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