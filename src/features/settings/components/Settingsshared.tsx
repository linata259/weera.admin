import React, { useState } from 'react';

const ORANGE = '#EA580C';
const SLATE = '#64748B';
const BORDER = '#E2E8F0';
const TEXT_DARK = '#0F172A';
const BG = '#F8FAFC';

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ value, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: value ? ORANGE : '#CBD5E1',
        border: 'none',
        position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: value ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
          display: 'block',
        }}
      />
    </button>
  );
}

// ─── SettingRow ───────────────────────────────────────────────────────────────

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}

export function SettingRow({ label, description, children, last }: SettingRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        padding: '20px 0',
        borderBottom: last ? 'none' : `1px solid ${BORDER}`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: TEXT_DARK, marginBottom: 4 }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 13, color: SLATE, lineHeight: 1.5 }}>{description}</div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ─── SettingCard ──────────────────────────────────────────────────────────────

interface SettingCardProps {
  title?: string;
  children: React.ReactNode;
}

export function SettingCard({ title, children }: SettingCardProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {title && (
        <div style={{ fontSize: 13, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          {title}
        </div>
      )}
      <div
        style={{
          background: '#fff',
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: '0 24px',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── StyledInput ──────────────────────────────────────────────────────────────

interface StyledInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  width?: number | string;
}

export function StyledInput({ width = 220, style, ...props }: StyledInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width,
        height: 36,
        padding: '0 12px',
        border: `1px solid ${focused ? ORANGE : BORDER}`,
        borderRadius: 8,
        fontSize: 13,
        color: TEXT_DARK,
        background: props.disabled ? BG : '#fff',
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s',
        cursor: props.disabled ? 'default' : 'text',
        ...style,
      }}
    />
  );
}

// ─── StyledSelect ─────────────────────────────────────────────────────────────

interface StyledSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  width?: number | string;
}

export function StyledSelect({ width = 280, style, children, ...props }: StyledSelectProps) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
      style={{
        width,
        height: 36,
        padding: '0 32px 0 12px',
        border: `1px solid ${focused ? ORANGE : BORDER}`,
        borderRadius: 8,
        fontSize: 13,
        color: TEXT_DARK,
        background: '#fff',
        outline: 'none',
        fontFamily: 'inherit',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s',
        ...style,
      }}
    >
      {children}
    </select>
  );
}

// ─── SaveBar ──────────────────────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveBarProps {
  onSave: () => void;
  saveState: SaveState;
}

export function SaveBar({ onSave, saveState }: SaveBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
      <button
        type="button"
        onClick={onSave}
        disabled={saveState === 'saving'}
        style={{
          background: ORANGE,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '9px 20px',
          fontSize: 13,
          fontWeight: 600,
          cursor: saveState === 'saving' ? 'default' : 'pointer',
          fontFamily: 'inherit',
          opacity: saveState === 'saving' ? 0.7 : 1,
        }}
      >
        {saveState === 'saving' ? 'Saving…' : 'Save Changes'}
      </button>
      {saveState === 'saved' && (
        <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 500 }}>✓ Changes saved</span>
      )}
      {saveState === 'error' && (
        <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>Failed to save. Try again.</span>
      )}
    </div>
  );
}

export { ORANGE, SLATE, BORDER, TEXT_DARK, BG };
export type { SaveState };