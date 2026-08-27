import { useState, useEffect, useCallback } from 'react';

import FinancialSettings from './components/FinancialSettings';
import GeneralSettings from './components/GeneralSettings';
import PaymentConfiguration from './components/PaymentConfiguration';
import UserSecuritySettings from './components/UserSecuritySettings';
import { PlatformSettings, SettingsUpdate, fetchSettings, updateSetting, saveSettings } from './settingsApi';
import { useNavbar } from '../../hooks/Navbarcontext';

const ORANGE   = '#EA580C';
const SLATE    = '#64748B';
const BORDER   = '#E2E8F0';
// const TEXT_DARK = '#0F172A';

type TabId = 'general' | 'financial' | 'payment' | 'security';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'general',   label: 'General Settings' },
  { id: 'financial', label: 'Financial Settings' },
  { id: 'payment',   label: 'Payment Configuration' },
  { id: 'security',  label: 'User & Security Settings' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalStatus, setGlobalStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const { setBreadcrumb } = useNavbar();

  // Push "Settings > <active tab>" into the top navbar on every tab change.
  // Cleans up on unmount so other pages see their normal label.
  useEffect(() => {
    const label = TABS.find((t) => t.id === activeTab)?.label ?? '';
    setBreadcrumb({ parent: 'Settings', current: label });
    return () => setBreadcrumb(null);
  }, [activeTab, setBreadcrumb]);

  useEffect(() => {
    fetchSettings().then((s) => {
      setSettings(s);
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
      {/* Breadcrumb is now in the top navbar — page header is just the title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        {/* <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: TEXT_DARK }}>Settings</h1> */}
        {globalStatus !== 'idle' && (
          <span style={{
            fontSize: 18,
            fontWeight: 500,
            color: globalStatus === 'saved' ? '#16A34A' : '#DC2626',
          }}>
            {globalStatus === 'saved' ? '✓ Saved' : 'Save failed'}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 28, overflowX: 'auto' }}>
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