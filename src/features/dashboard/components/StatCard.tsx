import type { DashboardStat, DashboardStatId, TrendDirection } from '../types';
import {
  Ico,
  IconDeltaDown,
  IconDeltaFlat,
  IconDeltaUp,
  IconEscrow,
  IconJobs,
  IconUserManagement,
  IconWithdrawal,
  TablerIcon,
} from '../../../components/icons';
import { iconSize } from '../../../theme/tokens';

const TEXT_DARK = '#0F172A';
const SLATE = '#64748B';
const SLATE_LIGHT = '#94A3B8';
const GREEN = '#16A34A';
const RED = '#DC2626';

interface StatCardProps {
  stat: DashboardStat;
  /* Set for the cards whose number has somewhere to go — the escrow and
     withdrawal figures live in Financials, so the card is the way there
     rather than a dead end you have to navigate away from by hand. */
  onClick?: () => void;
  linkHint?: string;
}

const TREND_COLOR: Record<TrendDirection, string> = {
  up: GREEN,
  down: RED,
  flat: SLATE,
};

const TREND_ICON: Record<TrendDirection, TablerIcon> = {
  up: IconDeltaUp,
  down: IconDeltaDown,
  flat: IconDeltaFlat,
};

const STAT_ICON_V2: Record<DashboardStatId, TablerIcon> = {
  totalActiveUsers: IconUserManagement,
  newJobsPosted: IconJobs,
  totalFundsInEscrow: IconEscrow,
  pendingWithdrawals: IconWithdrawal,
};

export function StatCard({ stat, onClick, linkHint }: StatCardProps) {
  const trendColor = TREND_COLOR[stat.trend.direction];
  const trendIcon = TREND_ICON[stat.trend.direction];
  const trendValue = Math.abs(stat.trend.changePercent).toFixed(1);
  const icon = STAT_ICON_V2[stat.id as DashboardStatId];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      title={linkHint}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.borderColor = '#CBD5E1'; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.borderColor = '#E2E8F0'; } : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRadius: 12,
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        padding: '20px 20px 16px',
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        transition: 'border-color 0.15s ease',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Top row: label + icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: SLATE, lineHeight: 1.4 }}>
          {stat.label}
        </p>
        {icon && <Ico icon={icon} size={iconSize.lg} color={SLATE_LIGHT} />}
      </div>

      {/* Value */}
      <p
        style={{
          margin: '10px 0 0',
          fontSize: 28,
          fontWeight: 600,
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
        <Ico icon={trendIcon} size={iconSize.sm} />
        <span>{trendValue}%</span>
        <span style={{ fontWeight: 400, color: SLATE_LIGHT }}>vs last week</span>
        {linkHint && (
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: SLATE_LIGHT }}>
            {linkHint}
          </span>
        )}
      </p>
    </div>
  );
}
