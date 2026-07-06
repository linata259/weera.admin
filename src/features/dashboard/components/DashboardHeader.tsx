import { useState } from 'react';
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
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={focused ? ORANGE : SLATE}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, transition: 'stroke 0.15s' }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
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
