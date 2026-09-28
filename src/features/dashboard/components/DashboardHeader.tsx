import { useState } from 'react';
import type { DateRangeOption } from '../types';
import { Ico, IconClose, IconSearchControl } from '../../../components/icons';
import { iconSize } from '../../../theme/tokens';

const ORANGE = '#EA580C';
const SLATE = '#64748B';
const BORDER = '#E2E8F0';
const TEXT_DARK = '#0F172A';

interface DashboardHeaderProps {
  range: DateRangeOption;
  onRangeChange: (range: DateRangeOption) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSearch?: (query: string) => void;
}

const RANGE_OPTIONS: Array<{ value: DateRangeOption; label: string }> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

export function DashboardHeader({
  range,
  onRangeChange,
  onRefresh,
  isRefreshing,
  onSearch,
}: DashboardHeaderProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch?.(e.target.value);
  };

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
      {/* Search input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
          height: 38,
          border: `1px solid ${focused ? ORANGE : BORDER}`,
          borderRadius: 8,
          background: '#fff',
          width: 280,
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
      >
        <Ico
          icon={IconSearchControl}
          size={iconSize.md}
          color={focused ? ORANGE : SLATE}
          style={{ transition: 'color 0.15s' }}
        />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search users, jobs, transactions…"
          style={{
            border: 'none',
            outline: 'none',
            background: 'none',
            fontSize: 13,
            color: TEXT_DARK,
            fontFamily: 'inherit',
            width: '100%',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSearch?.(''); }}
            style={{
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              color: SLATE,
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Ico icon={IconClose} size={iconSize.sm} />
          </button>
        )}
      </div>

      {/* Range tabs + refresh */}
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
