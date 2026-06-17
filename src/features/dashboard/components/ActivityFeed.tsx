import type { ActivityItem, ActivityType } from '../types';
import { formatRelativeTime } from '../Formatters';

const TEXT_DARK = '#0F172A';
const SLATE_LIGHT = '#94A3B8';
const BLUE = '#2563EB';
const AMBER = '#D97706';
const ORANGE = '#EA580C';
const BORDER = '#E2E8F0';

interface ActivityFeedProps {
  items: ActivityItem[];
  isLoading: boolean;
}

const TYPE_DOT_COLOR: Record<ActivityType, string> = {
  job_posted: BLUE,
  withdrawal_requested: AMBER,
  user_signed_up: SLATE_LIGHT,
};

export function ActivityFeed({ items, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: SLATE_LIGHT }}>
        Loading activity…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: TEXT_DARK }}>Nothing here yet</p>
        <p style={{ margin: 0, fontSize: 12, color: SLATE_LIGHT }}>New jobs, withdrawals, and signups will show up here.</p>
      </div>
    );
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 320, overflowY: 'auto' }}>
      {items.map((item) => (
        <li key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ marginTop: 6, height: 6, width: 6, flexShrink: 0, borderRadius: '50%', background: TYPE_DOT_COLOR[item.type] }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: TEXT_DARK }}>{item.message}</p>
              <span style={{ fontSize: 11, color: SLATE_LIGHT, whiteSpace: 'nowrap' }}>{formatRelativeTime(item.createdAt)}</span>
            </div>
            <button
              type="button"
              style={{
                marginTop: 6,
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                background: '#fff',
                color: ORANGE,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {item.actionLabel}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}