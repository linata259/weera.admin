import type { DashboardStat, DashboardStatId, TrendDirection } from '../types';

const TEXT_DARK = '#0F172A';
const SLATE = '#64748B';
const SLATE_LIGHT = '#94A3B8';
const GREEN = '#16A34A';
const RED = '#DC2626';

interface StatCardProps {
  stat: DashboardStat;
  accentColor: string;
}

const TREND_COLOR: Record<TrendDirection, string> = {
  up: GREEN,
  down: RED,
  flat: SLATE,
};

const TREND_ARROW: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

const STAT_ICON_V2: Record<DashboardStatId, (color: string) => JSX.Element> = {
  totalActiveUsers: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  newJobsPosted: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  totalFundsInEscrow: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  pendingWithdrawals: (c) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

export function StatCard({ stat, accentColor }: StatCardProps) {
  const trendColor = TREND_COLOR[stat.trend.direction];
  const arrow = TREND_ARROW[stat.trend.direction];
  const trendValue = Math.abs(stat.trend.changePercent).toFixed(1);
  const icon = STAT_ICON_V2[stat.id as DashboardStatId];

  // Derive a soft background from the accent color
  const iconBg = `${accentColor}18`;

  return (
    <div
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.05)';
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: 16,
        border: '1px solid #EEF2F6',
        background: '#FFFFFF',
        padding: '20px 20px 16px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}55)` }} />
      {/* Top row: label + icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: SLATE, lineHeight: 1.4 }}>
          {stat.label}
        </p>
        {icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon(accentColor)}
          </div>
        )}
      </div>

      {/* Value */}
      <p
        style={{
          margin: '10px 0 0',
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: TEXT_DARK,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.1,
        }}
      >
        {stat.formattedValue}
      </p>

      {/* Trend */}
      <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 500, color: trendColor, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{arrow} {trendValue}%</span>
        <span style={{ fontWeight: 400, color: SLATE_LIGHT }}>vs last week</span>
      </p>
    </div>
  );
}
