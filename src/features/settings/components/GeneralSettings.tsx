import React from 'react';
import {
  Toggle,
  SettingRow,
  SettingCard,
  StyledSelect,
  SLATE,
} from './Settingsshared';
import type { PlatformSettings } from '../settingsApi';

const TIMEZONES = [
  { value: 'Africa/Nairobi',       label: 'East Africa Time (EAT) — UTC+3:00' },
  { value: 'Africa/Lagos',         label: 'West Africa Time (WAT) — UTC+1:00' },
  { value: 'Africa/Johannesburg',  label: 'South Africa Standard Time (SAST) — UTC+2:00' },
  { value: 'Africa/Cairo',         label: 'Eastern European Time (EET) — UTC+2:00' },
  { value: 'Africa/Abidjan',       label: 'Greenwich Mean Time (GMT) — UTC+0:00' },
  { value: 'UTC',                  label: 'Coordinated Universal Time (UTC) — UTC+0:00' },
  { value: 'Europe/London',        label: 'British Time (GMT/BST) — UTC+0/+1' },
];

interface Props {
  settings: PlatformSettings;
  onToggle: (key: keyof PlatformSettings, value: boolean) => void;
  onSelect: (key: keyof PlatformSettings, value: string) => void;
}

export default function GeneralSettings({ settings, onToggle, onSelect }: Props) {
  return (
    <>
      <SettingCard>
        <SettingRow
          label="Maintenance Mode"
          description="Enable maintenance mode to perform upgrades or security fixes. Users will see a customised notice until the site is brought back online."
        >
          <Toggle
            value={settings.maintenance_mode}
            onChange={(v) => onToggle('maintenance_mode', v)}
          />
        </SettingRow>

        <SettingRow
          label="Platform Time Zone"
          description="Set the default time zone for all platform timestamps and logs."
          last
        >
          <StyledSelect
            value={settings.timezone}
            onChange={(e) => onSelect('timezone', e.target.value)}
            width={300}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </StyledSelect>
        </SettingRow>
      </SettingCard>

      <SettingCard title="Platform Identity">
        <SettingRow
          label="Platform Name"
          description="The name shown in emails, notifications, and the browser tab."
        >
          <EditableText
            value={settings.site_name}
            onCommit={(v) => onSelect('site_name' as keyof PlatformSettings, v)}
          />
        </SettingRow>
        <SettingRow
          label="Support Email"
          description="Users see this address when they need help. Must be a monitored inbox."
          last
        >
          <EditableText
            value={settings.support_email}
            type="email"
            onCommit={(v) => onSelect('support_email' as keyof PlatformSettings, v)}
          />
        </SettingRow>
      </SettingCard>
    </>
  );
}

// ─── Inline editable text (pencil icon → input) ───────────────────────────────

interface EditableTextProps {
  value: string;
  type?: string;
  onCommit: (v: string) => void;
}

function EditableText({ value, type = 'text', onCommit }: EditableTextProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  };

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: '#0F172A' }}>{value}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          style={{ border: 'none', background: 'none', padding: 4, cursor: 'pointer', color: SLATE, display: 'flex', alignItems: 'center' }}
          title="Edit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        onBlur={commit}
        style={{
          width: 240,
          height: 34,
          padding: '0 10px',
          border: '1px solid #EA580C',
          borderRadius: 8,
          fontSize: 13,
          color: '#0F172A',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}