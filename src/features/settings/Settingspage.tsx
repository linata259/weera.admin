import { useState, useEffect, useCallback } from 'react';

import FinancialSettings from './components/FinancialSettings';
import GeneralSettings from './components/GeneralSettings';
import PaymentConfiguration from './components/PaymentConfiguration';
import UserSecuritySettings from './components/UserSecuritySettings';
import { PlatformSettings, SettingsUpdate, fetchSettings, updateSetting, saveSettings } from './settingsApi';
import { readDashboardCache, writeDashboardCache } from '../../utils/dashboardCache';
import { PageHeader } from '../../components/PageHeader';
import { IconSettingsNav } from '../../components/icons';

const CACHE_KEY = 'platformSettings';

const ORANGE   = '#EA580C';
const SLATE    = '#64748B';
const BORDER   = '#E2E8F0';

type TabId = 'general' | 'financial' | 'payment' | 'security';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'general',   label: 'General Settings' },
  { id: 'financial', label: 'Financial Settings' },
  { id: 'payment',   label: 'Payment Configuration' },
  { id: 'security',  label: 'User & Security Settings' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<PlatformSettings | null>(() => readDashboardCache<PlatformSettings>(CACHE_KEY));
  const [loading, setLoading] = useState(() => readDashboardCache<PlatformSettings>(CACHE_KEY) === null);
  const [globalStatus, setGlobalStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetchSettings().then((s) => {
      setSettings(s);
      writeDashboardCache(CACHE_KEY, s);
      setLoading(false);
    });
  }, []);

  const handleToggle = useCallback(
    async (key: keyof PlatformSettings, value: boolean) => {
      if (!settings) return;
      setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
      const ok = await updateSetting(key, value);
      if (!ok) {
        setSettings((prev) => prev ? { ...prev, [key]: !value } : prev);
        setGlobalStatus('error');
        setTimeout(() => setGlobalStatus('idle'), 3000);
      } else {
        setGlobalStatus('saved');
        setTimeout(() => setGlobalStatus('idle'), 2000);
      }
    },
    [settings],
  );

  const handleSelect = useCallback(
    async (key: keyof PlatformSettings, value: string) => {
      if (!settings) return;
      setSettings((prev) => prev ? { ...prev, [key]: value } : prev);
      await updateSetting(key, value);
    },
    [settings],
  );

  const handleSaveSection = useCallback(
    async (updates: SettingsUpdate): Promise<boolean> => {
      const result = await saveSettings(updates);
      if (!result.ok) {
        setGlobalStatus('error');
        setTimeout(() => setGlobalStatus('idle'), 3000);
        return false;
      }

      setSettings((prev) => {
        if (!prev) return prev;
        // fee_reason is an audit note, not a stored setting — keep it out of state.
        const stored = { ...updates };
        delete stored.fee_reason;
        const next = { ...prev, ...stored };
        // commission_rate is derived by update_platform_fees. Recompute it
        // here so the header total updates without a round-trip.
        if (stored.client_fee_pct !== undefined || stored.freelancer_fee_pct !== undefined) {
          next.commission_rate =
            (stored.client_fee_pct ?? prev.client_fee_pct) +
            (stored.freelancer_fee_pct ?? prev.freelancer_fee_pct);
        }
        return next;
      });
      return true;
    },
    [],
  );

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Breadcrumb is in the top navbar — this header owns the title */}
      <PageHeader
        title="Settings"
        subtitle="Platform-wide configuration for general behaviour, fees, payments, and user security."
        icon={IconSettingsNav}
        actions={
          globalStatus !== 'idle' ? (
            <span style={{
              fontSize: 18,
              fontWeight: 500,
              color: globalStatus === 'saved' ? '#16A34A' : '#DC2626',
            }}>
              {globalStatus === 'saved' ? 'Saved' : 'Save failed'}
            </span>
          ) : undefined
        }
        below={
          /* Tab bar */
          <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, overflowX: 'auto' }}>
            {TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '10px 18px',
                    border: 'none',
                    background: 'none',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? ORANGE : SLATE,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    borderBottom: active ? `2.5px solid ${ORANGE}` : '2.5px solid transparent',
                    marginBottom: -1,
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        }
      />

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '3px solid #E2E8F0', borderTopColor: ORANGE,
              animation: 'weera-spin 0.7s linear infinite',
            }}
          />
          <style>{`@keyframes weera-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : settings ? (
        <>
          {activeTab === 'general'   && <GeneralSettings settings={settings} onToggle={handleToggle} onSelect={handleSelect} />}
          {activeTab === 'financial' && <FinancialSettings settings={settings} onSaveSection={handleSaveSection} />}
          {activeTab === 'payment'   && <PaymentConfiguration settings={settings} onToggle={handleToggle} onSaveSection={handleSaveSection} />}
          {activeTab === 'security'  && <UserSecuritySettings settings={settings} onToggle={handleToggle} onSaveSection={handleSaveSection} />}
        </>
      ) : (
        <div style={{ textAlign: 'center', color: SLATE, padding: 60, fontSize: 14 }}>
          Could not load settings.
        </div>
      )}
    </div>
  );
}