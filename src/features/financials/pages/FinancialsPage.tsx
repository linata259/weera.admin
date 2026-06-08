import React, { useState } from 'react';
import { FinancialDashboard } from '../components/FinancialDashboard';
import { TransactionsTable }  from '../components/TransactionsTable';
import { EscrowManagement }   from '../components/EscrowManagement';
import { PlatformRevenue }    from '../components/PlatformRevenue';

const ORANGE='#EA580C'; const SLATE='#64748B'; const BORDER='#E2E8F0';

type Tab = 'dashboard' | 'transactions' | 'escrow' | 'revenue';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard',    label: 'Financial Dashboard' },
  { id: 'transactions', label: 'Transactions'         },
  { id: 'escrow',       label: 'Escrow Management'    },
  { id: 'revenue',      label: 'Platform Revenue'     },
];

const FinancialsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>

      {/* tab bar */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, display: 'flex', gap: 0, background: '#fff', marginBottom: 24 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '14px 22px', border: 'none', background: 'none',
              fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? ORANGE : SLATE,
              cursor: 'pointer', fontFamily: 'inherit',
              borderBottom: tab === t.id ? `2.5px solid ${ORANGE}` : '2.5px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
              whiteSpace: 'nowrap',
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
      </div>
    </div>
  );
};

export default FinancialsPage;