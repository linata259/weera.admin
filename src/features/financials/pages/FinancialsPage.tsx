import React, { useEffect, useState } from 'react';
import { FinancialDashboard } from '../components/FinancialDashboard';
import { TransactionsTable }  from '../components/TransactionsTable';
import { EscrowManagement }   from '../components/EscrowManagement';
import { PlatformRevenue }    from '../components/PlatformRevenue';
import { WithdrawalsTable }   from '../components/WithdrawalsTable';

const ORANGE='#EA580C'; const SLATE='#64748B'; const BORDER='#E2E8F0';

type Tab = 'dashboard' | 'transactions' | 'escrow' | 'revenue' | 'Withdrawals';
const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard',    label: 'Financial Dashboard' },
  { id: 'transactions', label: 'Transactions'         },
  { id: 'Withdrawals',    label: 'Pending Withdrawals' },
  { id: 'escrow',       label: 'Escrow Management'    },
  { id: 'revenue',      label: 'Platform Revenue'     },
];

// NEW — hides the scrollbar on the tab strip while keeping it scrollable (webkit + firefox)
const scrollbarHideCss = `
.financials-tab-scroll::-webkit-scrollbar { display: none; }
.financials-tab-scroll { scrollbar-width: none; -ms-overflow-style: none; }
`;

const FinancialsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [isMobile, setIsMobile] = useState(false); // NEW

  // NEW — same mobile-detection pattern used elsewhere in the app
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
      <style>{scrollbarHideCss}</style>

      {/* tab bar — CHANGED: horizontally scrollable on mobile instead of overflowing/wrapping */}
      <div
        className="financials-tab-scroll"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          gap: 0,
          background: '#fff',
          marginBottom: isMobile ? 16 : 24,
          overflowX: isMobile ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: isMobile ? '12px 16px' : '14px 22px',
              border: 'none', background: 'none',
              fontSize: isMobile ? 13 : 14,
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? ORANGE : SLATE,
              cursor: 'pointer', fontFamily: 'inherit',
              borderBottom: tab === t.id ? `2.5px solid ${ORANGE}` : '2.5px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* tab content */}
      <div style={{ width: '100%' }}>
        {tab === 'dashboard'    && <FinancialDashboard />}
        {tab === 'transactions' && <TransactionsTable />}
        {tab === 'escrow'       && <EscrowManagement />}
        {tab === 'revenue'      && <PlatformRevenue />}
        {tab === 'Withdrawals'  && <WithdrawalsTable />}
      </div>
    </div>
  );
};

export default FinancialsPage;