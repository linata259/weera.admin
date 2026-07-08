import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from 'services/supabaseClient';
import { useNavbar } from '../hooks/Navbarcontext';
import { NotificationBell } from '../features/notifications/components/NotificationBell';

const PRIMARY = '#EA580C';
const NAVY    = '#0F172A';
const SLATE   = '#64748B';
const BORDER  = '#E2E8F0';

export type NavItem = {
  id: string;
  label: string;
  path: string;
};

interface NavbarProps {
  sidebarWidth?: number;
  openTabs: NavItem[];
  onCloseTab: (id: string) => void;
  isMobile?: boolean;
  onMenuClick?: () => void;
}

interface AdminProfile {
  name: string;
  email: string;
  avatar: string | null;
  initials: string;
}

const Navbar: React.FC<NavbarProps> = ({
  sidebarWidth = 280,
  openTabs,
  isMobile = false,
  onMenuClick,
}) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { breadcrumb } = useNavbar();

  const [open,    setOpen]    = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTab     = openTabs.find((t) => t.path === location.pathname);
  const fallbackLabel = activeTab?.label ?? '';

  // ── Fetch admin profile once on mount ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name, image_url')
        .eq('id', user.id)
        .single();

      const first    = prof?.first_name ?? '';
      const last     = prof?.last_name  ?? '';
      const name     = [first, last].filter(Boolean).join(' ') || (user.email?.split('@')[0] ?? 'Admin');
      const initials = ([first[0], last[0]].filter(Boolean).join('') || (user.email?.[0] ?? 'A')).toUpperCase();

      setProfile({ name, email: user.email ?? '', avatar: prof?.image_url ?? null, initials });
    })();
  }, []);

  // ── Close dropdown on outside click ───────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: sidebarWidth,
      right: 0,
      height: 64,
      background: '#ffffff',
      borderBottom: '1px solid #E1E4EA',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      boxSizing: 'border-box',
      zIndex: 99,
      transition: 'left 0.25s ease',
    }}>

      {/* ── Left: hamburger + page title / breadcrumb ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isMobile && (
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 6, margin: '0 -2px 0 -8px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 6h16M3 11h16M3 16h16" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {breadcrumb ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 500, color: SLATE }}>{breadcrumb.parent}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{breadcrumb.current}</span>
          </div>
        ) : (
          <span style={{ fontSize: 16, fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>
            {fallbackLabel}
          </span>
        )}
      </div>

      {/* ── Right: notification bell + avatar + dropdown ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <NotificationBell />
      <div ref={dropdownRef} style={{ position: 'relative' }}>

        {/* Avatar button */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Open profile menu"
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            background: profile?.avatar ? 'transparent' : PRIMARY,
            border: `2px solid ${open ? PRIMARY : 'transparent'}`,
            padding: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: `0 2px 8px ${PRIMARY}40`,
            transition: 'border-color 0.15s',
          }}
        >
          {profile?.avatar ? (
            <img src={profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', letterSpacing: '0.02em' }}>
              {profile?.initials ?? 'A'}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            width: 252,
            background: '#fff',
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            boxShadow: '0 8px 30px rgba(15,23,42,0.12)',
            zIndex: 200,
            overflow: 'hidden',
            animation: 'fadeInDown 0.15s ease',
          }}>

            {/* Admin info */}
            <div style={{ padding: '16px 16px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Large avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: profile?.avatar ? 'transparent' : PRIMARY,
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: 17, color: '#fff' }}>
                      {profile?.initials ?? 'A'}
                    </span>
                  )}
                </div>
                {/* Name & email */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile?.name ?? 'Admin'}
                  </div>
                  <div style={{ fontSize: 12, color: SLATE, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile?.email ?? ''}
                  </div>
                </div>
              </div>

              {/* Role badge */}
              <div style={{ marginTop: 12 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: `${PRIMARY}18`, color: PRIMARY,
                  fontSize: 11, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 20,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIMARY, display: 'inline-block' }} />
                  Administrator
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: BORDER, margin: '0 12px' }} />

            {/* Sign out */}
            <div style={{ padding: '8px' }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px',
                  border: 'none', background: 'none',
                  borderRadius: 8,
                  fontSize: 13, fontWeight: 500, color: '#DC2626',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.12s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#FEF2F2')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>

          </div>
        )}
      </div>
      </div>{/* ── end right flex wrapper ── */}

      <style>{`@keyframes fadeInDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </header>
  );
};

export default Navbar;