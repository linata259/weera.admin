import { useState } from 'react';
import {
  Toggle,
  SettingRow,
  SettingCard,
  StyledInput,
  SaveBar,
  type SaveState,
} from './Settingsshared';
import type { PlatformSettings } from '../settingsApi';

interface Props {
  settings: PlatformSettings;
  onToggle: (key: keyof PlatformSettings, value: boolean) => void;
  onSaveSection: (updates: Partial<PlatformSettings>) => Promise<boolean>;
}

export default function UserSecuritySettings({ settings, onToggle, onSaveSection }: Props) {
  const [local, setLocal] = useState({
    session_timeout_minutes: settings.session_timeout_minutes,
    max_login_attempts:      settings.max_login_attempts,
    password_min_length:     settings.password_min_length,
  });
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const set = (key: keyof typeof local) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocal((prev) => ({ ...prev, [key]: parseInt(e.target.value, 10) || 0 }));
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
      <SettingCard title="Registration">
        <SettingRow
          label="Allow New User Registrations"
          description="When disabled, the sign-up page is hidden and existing accounts cannot invite others."
        >
          <Toggle
            value={settings.user_registration_enabled}
            onChange={(v) => onToggle('user_registration_enabled', v)}
          />
        </SettingRow>
        <SettingRow
          label="Require Email Verification"
          description="New accounts must verify their email address before they can post jobs or submit bids."
          last
        >
          <Toggle
            value={settings.email_verification_required}
            onChange={(v) => onToggle('email_verification_required', v)}
          />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Authentication">
        <SettingRow
          label="Two-Factor Authentication"
          description="Require all admin accounts to set up 2FA. Does not affect regular users unless enforced separately."
        >
          <Toggle
            value={settings.two_factor_enabled}
            onChange={(v) => onToggle('two_factor_enabled', v)}
          />
        </SettingRow>
        <SettingRow
          label="Session Timeout"
          description="Automatically log out inactive admin sessions after this many minutes."
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StyledInput
              type="number"
              min={5}
              max={480}
              step={5}
              value={local.session_timeout_minutes}
              onChange={set('session_timeout_minutes')}
              width={90}
            />
            <span style={{ fontSize: 13, color: '#64748B' }}>min</span>
          </div>
        </SettingRow>
        <SettingRow
          label="Max Login Attempts"
          description="Number of consecutive failed logins before an account is temporarily locked."
        >
          <StyledInput
            type="number"
            min={1}
            max={20}
            step={1}
            value={local.max_login_attempts}
            onChange={set('max_login_attempts')}
            width={90}
          />
        </SettingRow>
        <SettingRow
          label="Minimum Password Length"
          description="Passwords shorter than this are rejected at sign-up and password change."
          last
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StyledInput
              type="number"
              min={6}
              max={32}
              step={1}
              value={local.password_min_length}
              onChange={set('password_min_length')}
              width={90}
            />
            <span style={{ fontSize: 13, color: '#64748B' }}>chars</span>
          </div>
        </SettingRow>
      </SettingCard>

      <SaveBar onSave={handleSave} saveState={saveState} />
    </>
  );
}