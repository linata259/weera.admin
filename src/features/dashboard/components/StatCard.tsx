import { Sparkline } from './Sparkline';
import type { DashboardStat, TrendDirection } from '../types';

const BORDER = '#E2E8F0';
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

export function StatCard({ stat, accentColor }: StatCardProps) {
  const trendColor = TREND_COLOR[stat.trend.direction];
  const arrow = TREND_ARROW[stat.trend.direction];
  const trendValue = Math.abs(stat.trend.changePercent).toFixed(1);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: 12,
        border: `1px solid ${BORDER}`,
        background: '#FFFFFF',
        padding: 20,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: SLATE }}>{stat.label}</p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              color: TEXT_DARK,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {stat.formattedValue}
          </p>
        </div>
        <Sparkline data={stat.sparklineData} color={accentColor} />
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 500, color: trendColor }}>
        {arrow} {trendValue}% <span style={{ fontWeight: 400, color: SLATE_LIGHT }}>vs. previous period</span>
      </p>
    </div>
  );
}