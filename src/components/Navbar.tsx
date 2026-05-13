import React from 'react';
import { useLocation } from 'react-router-dom';

const PRIMARY = '#EA580C';

export type NavItem = {
  id: string;
  label: string;
  path: string;
};

interface NavbarProps {
  sidebarWidth?: number;
  openTabs: NavItem[];
  onCloseTab: (id: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ sidebarWidth = 280, openTabs }) => {
  const location = useLocation();
  const activeTab = openTabs.find(tab => tab.path === location.pathname);

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
      padding: '0 16px',
      boxSizing: 'border-box',
      zIndex: 99,
      transition: 'left 0.25s ease',
    }}>
      {/* Current page label */}
      <span style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#0f172a',
        whiteSpace: 'nowrap',
      }}>
        {activeTab?.label ?? ''}
      </span>

      {/* Right: avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: PRIMARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
          color: '#ffffff',
          boxShadow: `0 2px 8px ${PRIMARY}55`,
          letterSpacing: '0.02em',
        }}>
          U
        </div>
      </div>
    </header>
  );
};

export default Navbar;