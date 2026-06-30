import type { ActivityItem, ActivityType } from '../types';
import { formatRelativeTime } from '../Formatters';

const TEXT_DARK = '#0F172A';
const SLATE = '#475569';
const SLATE_LIGHT = '#94A3B8';
const ORANGE = '#EA580C';
const BORDER = '#E2E8F0';

interface ActivityFeedProps {
  items: ActivityItem[];
  isLoading: boolean;
  onItemClick?: (item: ActivityItem) => void;
}

// Icon badge config per activity type — matches Figma screenshot
const TYPE_CONFIG: Record<ActivityType, { bg: string; icon: JSX.Element; title: string }> = {
  job_posted: {
    bg: '#FFF4EE',
    title: 'New Job Posted',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  withdrawal_requested: {
    bg: '#FFFBEB',
    title: 'Withdrawal Requested',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  user_signed_up: {
    bg: '#EFF6FF',
    title: 'New User Signed Up',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
};

export function ActivityFeed({ items, isLoading, onItemClick }: ActivityFeedProps) {
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
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: 340, overflowY: 'auto' }}>
      {items.map((item, i) => {
        const cfg = TYPE_CONFIG[item.type];
        const isLast = i === items.length - 1;
        return (
          <li
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 0',
              borderBottom: isLast ? 'none' : `1px solid ${BORDER}`,
            }}
          >
            {/* Icon badge */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: cfg.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {cfg.icon}
            </div>

            {/* Content */}
            <div style={{ minWidth: 0, flex: 1 }}>
              {/* Title + time */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TEXT_DARK, lineHeight: 1.3 }}>
                  {cfg.title}
                </p>
                <span style={{ fontSize: 11, color: SLATE_LIGHT, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>

              {/* Message */}
              <p style={{ margin: '2px 0 0', fontSize: 12, color: SLATE, lineHeight: 1.5 }}>
                {item.message}
              </p>

              {/* Action button */}
              <button
                type="button"
                onClick={() => onItemClick?.(item)}
                style={{
                  marginTop: 8,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  background: '#fff',
                  color: ORANGE,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  cursor: onItemClick ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (onItemClick) (e.currentTarget as HTMLButtonElement).style.background = '#FFF4EE'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
              >
                {item.actionLabel}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}