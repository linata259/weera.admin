import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export type NavItem = {
  id: string;
  label: string;
  path: string;
  icon?: string;
};

interface SidebarProps {
  features: NavItem[];
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: (item: NavItem) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  features,
  collapsed = false,
  onToggle,
  onNavigate,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const width = collapsed ? 56 : 280;

  const handleClick = (item: NavItem) => {
    navigate(item.path);
    onNavigate?.(item);
  };

  return (
    <aside style={{
      width,
      minWidth: width,
      height: '100vh',
      background: '#F9FBFC',
      borderRight: '1px solid #E1E4EA',
      boxSizing: 'border-box',
      padding: collapsed ? '12px 8px' : '12px 16px 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      transition: 'width 0.25s ease, min-width 0.25s ease, padding 0.25s ease',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
    }}>
      {/* Logo + hamburger */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
        padding: '4px 4px 0',
      }}>
        {!collapsed && (
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
            Admin Panel
          </div>
        )}
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          style={{
            background: 'none',
            border: '1px solid #E1E4EA',
            borderRadius: 8,
            cursor: 'pointer',
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ display: 'block', width: 16, height: 2, background: '#4B5565', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 16, height: 2, background: '#4B5565', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 16, height: 2, background: '#4B5565', borderRadius: 2 }} />
        </button>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {features.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleClick(item)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    width: '100%',
                    background: isActive ? '#EFF4FF' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: isActive ? '#0b69ff' : '#4B5565',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    transition: 'background 0.15s ease, color 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;