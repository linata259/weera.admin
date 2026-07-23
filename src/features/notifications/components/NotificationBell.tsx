import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import type { AdminNotification } from '../types';

const PRIMARY = '#EA580C';
const NAVY    = '#0F172A';
const SLATE   = '#64748B';
const BORDER  = '#E2E8F0';

const CATEGORY_COLORS: Record<string, string> = {
  user_signup:             '#3B82F6',
  withdrawal_request:      '#F59E0B',
  support_ticket_open:     '#8B5CF6',
  support_ticket_urgent:   '#EF4444',
  new_job:                 '#10B981',
  escrow_dispute:          '#F97316',
  job_report:              '#DC2626',
  message_report:          '#DB2777',
  report_reply:            '#0891B2',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  user_signup: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  withdrawal_request: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  support_ticket_open: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  support_ticket_urgent: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  new_job: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  escrow_dispute: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.31" />
    </svg>
  ),
  job_report: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  message_report: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="15.5" x2="12.01" y2="15.5" />
    </svg>
  ),
  report_reply: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4l-4 4v-4z" />
    </svg>
  ),
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotificationRow({
  n,
  onRead,
  onNavigate,
}: {
  n: AdminNotification;
  onRead: (id: string) => void;
  onNavigate: (href: string) => void;
}) {
  const color = CATEGORY_COLORS[n.category] ?? PRIMARY;
  const icon  = CATEGORY_ICONS[n.category];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { onRead(n.id); onNavigate(n.href); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { onRead(n.id); onNavigate(n.href); } }}
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        background: n.isRead ? '#fff' : '#FFF7F3',
        borderLeft: `3px solid ${n.isRead ? 'transparent' : color}`,
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.isRead ? '#fff' : '#FFF7F3'; }}
    >
      {/* Icon bubble */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: `${color}18`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: n.isRead ? 500 : 700, color: NAVY, marginBottom: 2 }}>
          {n.title}
        </div>
        <div style={{ fontSize: 12, color: SLATE, lineHeight: 1.4, whiteSpace: 'normal' }}>
          {n.body}
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
          {timeAgo(n.createdAt)}
        </div>
      </div>

      {/* Unread dot */}
      {!n.isRead && (
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: color, flexShrink: 0, marginTop: 4,
        }} />
      )}
    </div>
  );
}

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleNavigate = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const preview = notifications.slice(0, 6);

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        style={{
          position: 'relative',
          width: 36, height: 36,
          borderRadius: '50%',
          border: `2px solid ${open ? PRIMARY : 'transparent'}`,
          background: open ? `${PRIMARY}10` : 'transparent',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={open ? PRIMARY : '#64748B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 16, height: 16,
            background: '#EF4444',
            color: '#fff',
            fontSize: 10, fontWeight: 700,
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 10px)',
          width: 340,
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          boxShadow: '0 8px 30px rgba(15,23,42,0.12)',
          zIndex: 200,
          overflow: 'hidden',
          animation: 'fadeInDown 0.15s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 8,
                  background: `${PRIMARY}18`, color: PRIMARY,
                  fontSize: 11, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 10,
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 12, color: PRIMARY, fontWeight: 600,
                  fontFamily: 'inherit', padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: SLATE, fontSize: 13 }}>
              No notifications
            </div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {preview.map((n) => (
                <React.Fragment key={n.id}>
                  <NotificationRow n={n} onRead={markAsRead} onNavigate={handleNavigate} />
                  <div style={{ height: 1, background: BORDER, margin: '0 12px' }} />
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${BORDER}` }}>
              <button
                onClick={() => { setOpen(false); navigate('/notifications'); }}
                style={{
                  width: '100%', padding: '8px',
                  background: `${PRIMARY}08`, color: PRIMARY,
                  border: `1px solid ${PRIMARY}30`,
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${PRIMARY}15`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${PRIMARY}08`; }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
