import type { DateRangeOption } from '../types';

const ORANGE = '#EA580C';
const SLATE = '#64748B';
const BORDER = '#E2E8F0';
const TEXT_DARK = '#0F172A';

interface DashboardHeaderProps {
  range: DateRangeOption;
  onRangeChange: (range: DateRangeOption) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const RANGE_OPTIONS: Array<{ value: DateRangeOption; label: string }> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export function DashboardHeader({ range, onRangeChange, onRefresh, isRefreshing }: DashboardHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: TEXT_DARK }}>Dashboard</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: SLATE }}>Platform activity at a glance</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: '#fff' }}>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onRangeChange(option.value)}
              style={{
                padding: '8px 14px',
                border: 'none',
                background: 'none',
                fontSize: 13,
                fontWeight: range === option.value ? 700 : 500,
                color: range === option.value ? ORANGE : SLATE,
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderBottom: range === option.value ? `2.5px solid ${ORANGE}` : '2.5px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            background: '#fff',
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 500,
            color: TEXT_DARK,
            cursor: isRefreshing ? 'default' : 'pointer',
            opacity: isRefreshing ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}