import { useState } from 'react';

import type { PlatformSettings } from '../settingsApi';
import { SaveState, SettingCard, SettingRow, StyledInput, SaveBar } from './Settingsshared';


interface Props {
  settings: PlatformSettings;
  onSaveSection: (updates: Partial<PlatformSettings>) => Promise<boolean>;
}

export default function FinancialSettings({ settings, onSaveSection }: Props) {
  const [local, setLocal] = useState({
    commission_rate:       settings.commission_rate,
    escrow_release_days:   settings.escrow_release_days,
    min_withdrawal_amount: settings.min_withdrawal_amount,
    max_withdrawal_amount: settings.max_withdrawal_amount,
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const set = (key: keyof typeof local) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocal((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }));
    setSaveState('idle');
  };

  const handleSave = async () => {
    setSaveState('saving');
    const ok = await onSaveSection(local);
    setSaveState(ok ? 'saved' : 'error');
    if (ok) setTimeout(() => setSaveState('idle'), 2500);
  };

  return (
    <>
      <SettingCard title="Commission">
        <SettingRow
          label="Platform Commission Rate"
          description="Percentage deducted from each completed job payment as Weera's service fee."
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StyledInput
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={local.commission_rate}
              onChange={set('commission_rate')}
              width={90}
            />
            <span style={{ fontSize: 13, color: '#64748B' }}>%</span>
          </div>
        </SettingRow>
        <SettingRow
          label="Escrow Release Period"
          description="Number of days after a job is marked complete before funds are released to the freelancer."
          last
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StyledInput
              type="number"
              min={0}
              max={30}
              step={1}
              value={local.escrow_release_days}
              onChange={set('escrow_release_days')}
              width={90}
            />
            <span style={{ fontSize: 13, color: '#64748B' }}>days</span>
          </div>
        </SettingRow>
      </SettingCard>

      <SettingCard title="Withdrawals">
        <SettingRow
          label="Minimum Withdrawal"
          description="Smallest amount a user can request to withdraw from their wallet."
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>KES</span>
            <StyledInput
              type="number"
              min={0}
              step={100}
              value={local.min_withdrawal_amount}
              onChange={set('min_withdrawal_amount')}
              width={120}
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Maximum Withdrawal"
          description="Largest single withdrawal a user can make. Requests above this are split or require manual review."
          last
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>KES</span>
            <StyledInput
              type="number"
              min={0}
              step={1000}
              value={local.max_withdrawal_amount}
              onChange={set('max_withdrawal_amount')}
              width={120}
            />
          </div>
        </SettingRow>
      </SettingCard>

      <SaveBar onSave={handleSave} saveState={saveState} />
    </>
  );
}