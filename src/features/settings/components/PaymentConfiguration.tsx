import React, { useState } from 'react';
import {
  Toggle,
  SettingRow,
  SettingCard,
  StyledInput,
  BORDER,
  SLATE,
  TEXT_DARK,
  ORANGE,
  type SaveState,
} from './Settingsshared';
import type { PlatformSettings } from '../settingsApi';

interface Props {
  settings: PlatformSettings;
  onToggle: (key: keyof PlatformSettings, value: boolean) => void;
  onSaveSection: (updates: Partial<PlatformSettings>) => Promise<boolean>;
}

// Fields that must stay in server .env — never stored in platform_settings.
// Shown read-only so admins know they exist and where to set them.
const ENV_ONLY_FIELDS = [
  { env: 'MPESA_CONSUMER_KEY',          label: 'Consumer Key' },
  { env: 'MPESA_CONSUMER_SECRET',       label: 'Consumer Secret' },
  { env: 'MPESA_PASSKEY',               label: 'STK Pass Key' },
  { env: 'MPESA_B2C_INITIATOR_PASSWORD',label: 'B2C Initiator Password' },
  { env: 'MPESA_B2C_SECURITY_CREDENTIAL', label: 'B2C Security Credential' },
];

export default function PaymentConfiguration({ settings, onToggle, onSaveSection }: Props) {
  // ── C2B draft ──────────────────────────────────────────────────────────────
  const [c2bDraft, setC2bDraft] = useState({
    mpesa_shortcode:      settings.mpesa_shortcode,
    mpesa_business_name:  settings.mpesa_business_name,
    mpesa_callback_url:   settings.mpesa_callback_url,
  });
  const [c2bEditing,   setC2bEditing]   = useState(false);
  const [c2bSaveState, setC2bSaveState] = useState<SaveState>('idle');

  // ── B2C draft ──────────────────────────────────────────────────────────────
  const [b2cDraft, setB2cDraft] = useState({
    mpesa_b2c_shortcode:       settings.mpesa_b2c_shortcode,
    mpesa_b2c_initiator_name:  settings.mpesa_b2c_initiator_name,
    mpesa_b2c_result_url:      settings.mpesa_b2c_result_url,
    mpesa_b2c_timeout_url:     settings.mpesa_b2c_timeout_url,
  });
  const [b2cEditing,   setB2cEditing]   = useState(false);
  const [b2cSaveState, setB2cSaveState] = useState<SaveState>('idle');

  // ── Save handlers ──────────────────────────────────────────────────────────
  const saveC2b = async () => {
    setC2bSaveState('saving');
    const ok = await onSaveSection(c2bDraft);
    setC2bSaveState(ok ? 'saved' : 'error');
    if (ok) { setC2bEditing(false); setTimeout(() => setC2bSaveState('idle'), 2500); }
  };

  const saveB2c = async () => {
    setB2cSaveState('saving');
    const ok = await onSaveSection(b2cDraft);
    setB2cSaveState(ok ? 'saved' : 'error');
    if (ok) { setB2cEditing(false); setTimeout(() => setB2cSaveState('idle'), 2500); }
  };

  const cancelC2b = () => {
    setC2bEditing(false);
    setC2bDraft({ mpesa_shortcode: settings.mpesa_shortcode, mpesa_business_name: settings.mpesa_business_name, mpesa_callback_url: settings.mpesa_callback_url });
  };
  const cancelB2c = () => {
    setB2cEditing(false);
    setB2cDraft({ mpesa_b2c_shortcode: settings.mpesa_b2c_shortcode, mpesa_b2c_initiator_name: settings.mpesa_b2c_initiator_name, mpesa_b2c_result_url: settings.mpesa_b2c_result_url, mpesa_b2c_timeout_url: settings.mpesa_b2c_timeout_url });
  };

  return (
    <>
      {/* ── M-Pesa toggle ── */}
      <SettingCard>
        <SettingRow
          label="M-Pesa"
          description="Accept deposits via Safaricom STK Push and pay out withdrawals via B2C. Required for Kenyan users."
        >
          <Toggle value={settings.mpesa_enabled} onChange={(v) => onToggle('mpesa_enabled', v)} />
        </SettingRow>
        <SettingRow
          label="Bank Transfer"
          description="Allow users to withdraw directly to a Kenyan bank account. Processed manually within 1–3 business days."
          last
        >
          <Toggle value={settings.bank_transfer_enabled} onChange={(v) => onToggle('bank_transfer_enabled', v)} />
        </SettingRow>
      </SettingCard>

      {settings.mpesa_enabled && (
        <>
          {/* ── C2B / STK Push ── */}
          <SectionCard
            title="C2B — Deposits (STK Push)"
            subtitle="Used by MpesaService.initiateEscrowDeposit()"
            isEditing={c2bEditing}
            saveState={c2bSaveState}
            onEdit={() => setC2bEditing(true)}
            onCancel={cancelC2b}
            onSave={saveC2b}
          >
            {c2bEditing ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                <LabeledInput label="Business Shortcode" placeholder="e.g. 174379" value={c2bDraft.mpesa_shortcode} onChange={(v) => setC2bDraft((p) => ({ ...p, mpesa_shortcode: v }))} />
                <LabeledInput label="Business Name" placeholder="e.g. Weera Kenya" value={c2bDraft.mpesa_business_name} onChange={(v) => setC2bDraft((p) => ({ ...p, mpesa_business_name: v }))} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <LabeledInput label="STK Callback URL" placeholder="https://your-domain.com/api/mpesa/callback" value={c2bDraft.mpesa_callback_url} onChange={(v) => setC2bDraft((p) => ({ ...p, mpesa_callback_url: v }))} fullWidth />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <ViewField label="Business Shortcode" value={settings.mpesa_shortcode} />
                <ViewField label="Business Name"      value={settings.mpesa_business_name} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <ViewField label="STK Callback URL" value={settings.mpesa_callback_url} mono />
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── B2C / Withdrawals ── */}
          <SectionCard
            title="B2C — Withdrawals to M-Pesa"
            subtitle="Used by MpesaService.initiateWithdrawal()"
            isEditing={b2cEditing}
            saveState={b2cSaveState}
            onEdit={() => setB2cEditing(true)}
            onCancel={cancelB2c}
            onSave={saveB2c}
          >
            {b2cEditing ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                <LabeledInput label="B2C Shortcode"    placeholder="e.g. 600000"        value={b2cDraft.mpesa_b2c_shortcode}      onChange={(v) => setB2cDraft((p) => ({ ...p, mpesa_b2c_shortcode: v }))} />
                <LabeledInput label="Initiator Name"   placeholder="e.g. weera_api"     value={b2cDraft.mpesa_b2c_initiator_name} onChange={(v) => setB2cDraft((p) => ({ ...p, mpesa_b2c_initiator_name: v }))} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <LabeledInput label="Result URL"     placeholder="https://your-domain.com/api/mpesa/b2c/result"  value={b2cDraft.mpesa_b2c_result_url}  onChange={(v) => setB2cDraft((p) => ({ ...p, mpesa_b2c_result_url: v }))}  fullWidth />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <LabeledInput label="Queue Timeout URL" placeholder="https://your-domain.com/api/mpesa/b2c/timeout" value={b2cDraft.mpesa_b2c_timeout_url} onChange={(v) => setB2cDraft((p) => ({ ...p, mpesa_b2c_timeout_url: v }))} fullWidth />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <ViewField label="B2C Shortcode"  value={settings.mpesa_b2c_shortcode} />
                <ViewField label="Initiator Name" value={settings.mpesa_b2c_initiator_name} />
                <div style={{ gridColumn: '1 / -1' }}>
                  <ViewField label="Result URL"       value={settings.mpesa_b2c_result_url}  mono />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <ViewField label="Queue Timeout URL" value={settings.mpesa_b2c_timeout_url} mono />
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Sensitive credentials notice ── */}
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Sensitive credentials — set via environment variables only</span>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>
              These values are never stored in the database. Set them in your server's <code style={{ background: '#FEF3C7', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>.env</code> file or deployment secrets manager.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ENV_ONLY_FIELDS.map((f) => (
                <div key={f.env} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF3C7', borderRadius: 8, padding: '8px 12px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <div>
                    <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600 }}>{f.label}</div>
                    <code style={{ fontSize: 11, color: '#78350F' }}>{f.env}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Section card with edit/view toggle ───────────────────────────────────────

function SectionCard({ title, subtitle, isEditing, saveState, onEdit, onCancel, onSave, children }: {
  title: string; subtitle: string; isEditing: boolean; saveState: SaveState;
  onEdit: () => void; onCancel: () => void; onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT_DARK }}>{title}</div>
          <div style={{ fontSize: 12, color: SLATE, marginTop: 2, fontFamily: 'monospace' }}>{subtitle}</div>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={onEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${BORDER}`, background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: TEXT_DARK, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
        ) : (
          <button type="button" onClick={onCancel} style={{ border: 'none', background: 'none', fontSize: 12, color: SLATE, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
        )}
      </div>

      {children}

      {isEditing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <button
            type="button"
            onClick={onSave}
            disabled={saveState === 'saving'}
            style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saveState === 'saving' ? 0.7 : 1 }}
          >
            {saveState === 'saving' ? 'Saving…' : 'Save'}
          </button>
          {saveState === 'saved' && <span style={{ fontSize: 13, color: '#16A34A', fontWeight: 500 }}>✓ Saved</span>}
          {saveState === 'error'  && <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>Failed to save</span>}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ViewField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? TEXT_DARK : '#CBD5E1', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
        {value || '—'}
      </div>
    </div>
  );
}

function LabeledInput({ label, placeholder, value, onChange, fullWidth }: {
  label: string; placeholder?: string; value: string;
  onChange: (v: string) => void; fullWidth?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: SLATE, marginBottom: 6 }}>{label}</div>
      <StyledInput
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        width={fullWidth ? '100%' : undefined}
        style={fullWidth ? { width: '100%' } : {}}
      />
    </div>
  );
}