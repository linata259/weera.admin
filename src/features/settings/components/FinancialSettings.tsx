import { useEffect, useMemo, useState } from 'react';

import type { PlatformSettings, SettingsUpdate, FeeHistoryEntry } from '../settingsApi';
import { fetchFeeHistory } from '../settingsApi';
import {
  SaveState, SettingCard, SettingRow, StyledInput, SaveBar,
  ORANGE, SLATE, BORDER, TEXT_DARK, BG,
} from './Settingsshared';

interface Props {
  settings: PlatformSettings;
  onSaveSection: (updates: SettingsUpdate) => Promise<boolean>;
}

/** Mirrors get_escrow_requirement: the client charge is rounded up to whole
 *  shillings because M-Pesa cannot collect cents, and the fee absorbs the
 *  rounding. The freelancer deduction is exact to two decimals. */
function preview(amount: number, clientPct: number, freelancerPct: number) {
  const totalCharged = Math.ceil(amount * (1 + clientPct / 100));
  const clientFee = totalCharged - amount;
  const freelancerFee = Math.round(amount * freelancerPct) / 100;
  return {
    totalCharged,
    clientFee,
    freelancerFee,
    freelancerReceives: amount - freelancerFee,
    platformEarns: clientFee + freelancerFee,
  };
}

const kes = (n: number) =>
  `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The same guards update_platform_fees enforces, checked before the round-trip
 *  so a typo is caught while the admin is still looking at the field. */
function validateFees(clientPct: number, freelancerPct: number): string | null {
  if (!Number.isFinite(clientPct) || !Number.isFinite(freelancerPct)) {
    return 'Both commission rates are required.';
  }
  if (clientPct < 0 || freelancerPct < 0) {
    return 'Commission rates cannot be negative.';
  }
  if ((clientPct > 0 && clientPct < 1) || (freelancerPct > 0 && freelancerPct < 1)) {
    return 'These are percentages — enter 7, not 0.07.';
  }
  if (clientPct + freelancerPct > 50) {
    return `A combined commission of ${clientPct + freelancerPct}% will be rejected. The limit is 50%.`;
  }
  return null;
}

export default function FinancialSettings({ settings, onSaveSection }: Props) {
  const [local, setLocal] = useState({
    client_fee_pct:        settings.client_fee_pct,
    freelancer_fee_pct:    settings.freelancer_fee_pct,
    escrow_release_days:   settings.escrow_release_days,
    min_deposit_amount:    settings.min_deposit_amount,
    min_withdrawal_amount: settings.min_withdrawal_amount,
    max_withdrawal_amount: settings.max_withdrawal_amount,
  });
  const [reason, setReason] = useState('');
  const [sampleAmount, setSampleAmount] = useState(1000);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [history, setHistory] = useState<FeeHistoryEntry[]>([]);

  useEffect(() => { fetchFeeHistory(5).then(setHistory); }, []);

  const set = (key: keyof typeof local) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocal((prev) => ({ ...prev, [key]: raw === '' ? 0 : parseFloat(raw) || 0 }));
    setSaveState('idle');
    setErrorMessage('');
  };

  const feesChanged =
    local.client_fee_pct !== settings.client_fee_pct ||
    local.freelancer_fee_pct !== settings.freelancer_fee_pct;

  const validationError = feesChanged
    ? validateFees(local.client_fee_pct, local.freelancer_fee_pct)
    : null;

  const totalCommission = local.client_fee_pct + local.freelancer_fee_pct;

  const example = useMemo(
    () => preview(sampleAmount || 0, local.client_fee_pct, local.freelancer_fee_pct),
    [sampleAmount, local.client_fee_pct, local.freelancer_fee_pct],
  );

  const handleSave = async () => {
    if (validationError) {
      setErrorMessage(validationError);
      setSaveState('error');
      return;
    }

    setSaveState('saving');
    setErrorMessage('');

    // Fee keys are sent only when they actually changed — every fee write adds
    // a row to platform_settings_history, and a history full of no-op entries
    // makes the real changes hard to find.
    const updates: SettingsUpdate = {
      escrow_release_days:   local.escrow_release_days,
      min_deposit_amount:    local.min_deposit_amount,
      min_withdrawal_amount: local.min_withdrawal_amount,
      max_withdrawal_amount: local.max_withdrawal_amount,
    };
    if (feesChanged) {
      updates.client_fee_pct     = local.client_fee_pct;
      updates.freelancer_fee_pct = local.freelancer_fee_pct;
      updates.fee_reason         = reason.trim() || undefined;
    }

    const ok = await onSaveSection(updates);
    setSaveState(ok ? 'saved' : 'error');
    if (!ok && !errorMessage) {
      setErrorMessage('Could not save. Check the values and try again.');
    }
    if (ok) {
      setReason('');
      fetchFeeHistory(5).then(setHistory);
      setTimeout(() => setSaveState('idle'), 2500);
    }
  };

  return (
    <>
      <SettingCard title="Commission">
        <SettingRow
          label="Client Commission"
          description="Added on top of the agreed amount. A client funding a KES 1,000 job pays this much extra into escrow."
        >
          <PercentInput value={local.client_fee_pct} onChange={set('client_fee_pct')} />
        </SettingRow>

        <SettingRow
          label="Freelancer Commission"
          description="Deducted from the agreed amount when escrow is released, so the freelancer receives the balance."
        >
          <PercentInput value={local.freelancer_fee_pct} onChange={set('freelancer_fee_pct')} />
        </SettingRow>

        <SettingRow
          label="Total Platform Commission"
          description="Client plus freelancer. This is the headline rate shown elsewhere in the panel; it is calculated, not set."
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 15, fontWeight: 700,
            color: totalCommission > 50 ? '#DC2626' : TEXT_DARK,
          }}>
            {Number.isFinite(totalCommission) ? totalCommission.toFixed(totalCommission % 1 === 0 ? 0 : 1) : '—'}%
          </div>
        </SettingRow>

        <SettingRow
          label="Reason for change"
          description="Recorded against this rate change so it can be explained later. Optional, but worth a line."
          last={!feesChanged}
        >
          <StyledInput
            type="text"
            placeholder="e.g. Launch pricing"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={!feesChanged}
            width={260}
          />
        </SettingRow>

        {feesChanged && (
          <div style={{ padding: '0 0 20px' }}>
            <div style={{
              background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_DARK }}>
                  On a job of
                </span>
                <StyledInput
                  type="number"
                  min={1}
                  step={100}
                  value={sampleAmount}
                  onChange={(e) => setSampleAmount(parseFloat(e.target.value) || 0)}
                  width={110}
                  style={{ height: 30 }}
                />
              </div>

              <ExampleRow label="Client pays into escrow" value={kes(example.totalCharged)} />
              <ExampleRow label="Freelancer receives" value={kes(example.freelancerReceives)} />
              <ExampleRow label="Weera earns" value={kes(example.platformEarns)} emphasis />

              <div style={{ fontSize: 12, color: SLATE, marginTop: 12, lineHeight: 1.6 }}>
                The client charge is rounded up to whole shillings — M-Pesa cannot
                collect cents. New rates apply to jobs funded from now on; jobs
                already in escrow keep the rates they were agreed under.
              </div>
            </div>

            {validationError && (
              <div style={{
                marginTop: 12, fontSize: 13, color: '#DC2626', fontWeight: 500,
              }}>
                {validationError}
              </div>
            )}
          </div>
        )}
      </SettingCard>

      <SettingCard title="Escrow & Deposits">
        <SettingRow
          label="Escrow Release Period"
          description="Days after a job is marked complete before funds are released to the freelancer. Zero releases immediately on approval."
        >
          <UnitInput
            value={local.escrow_release_days}
            onChange={set('escrow_release_days')}
            min={0}
            max={30}
            step={1}
            suffix="days"
          />
        </SettingRow>
        <SettingRow
          label="Minimum Deposit"
          description="Smallest amount M-Pesa will accept for a collection. A smaller shortfall is rounded up to this, and the surplus stays in the client's wallet."
          last
        >
          <MoneyInput value={local.min_deposit_amount} onChange={set('min_deposit_amount')} step={1} />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Withdrawals">
        <SettingRow
          label="Minimum Withdrawal"
          description="Smallest amount a user can request to withdraw from their wallet."
        >
          <MoneyInput value={local.min_withdrawal_amount} onChange={set('min_withdrawal_amount')} step={100} />
        </SettingRow>
        <SettingRow
          label="Maximum Withdrawal"
          description="Largest single withdrawal a user can make. Requests above this are split or require manual review."
          last
        >
          <MoneyInput value={local.max_withdrawal_amount} onChange={set('max_withdrawal_amount')} step={1000} />
        </SettingRow>
      </SettingCard>

      {history.length > 0 && (
        <SettingCard title="Recent rate changes">
          <div style={{ padding: '16px 0' }}>
            {history.map((h, i) => (
              <div
                key={h.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', gap: 16,
                  padding: '10px 0',
                  borderBottom: i === history.length - 1 ? 'none' : `1px solid ${BORDER}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: TEXT_DARK, fontWeight: 500 }}>
                    {fmtPct(h.old_client_fee_pct)} → {fmtPct(h.new_client_fee_pct)} client
                    {'  ·  '}
                    {fmtPct(h.old_freelancer_fee_pct)} → {fmtPct(h.new_freelancer_fee_pct)} freelancer
                  </div>
                  {h.reason && (
                    <div style={{ fontSize: 12, color: SLATE, marginTop: 2 }}>{h.reason}</div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: SLATE, whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {h.changed_by_name}
                  <br />
                  {new Date(h.changed_at).toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </div>
        </SettingCard>
      )}

      <SaveBar
        onSave={handleSave}
        saveState={saveState}
        errorMessage={errorMessage}
        disabled={!!validationError}
      />
    </>
  );
}

// ─── Small local inputs ───────────────────────────────────────────────────────

function PercentInput({ value, onChange }: {
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <StyledInput type="number" min={0} max={50} step={0.5} value={value} onChange={onChange} width={90} />
      <span style={{ fontSize: 13, color: SLATE }}>%</span>
    </div>
  );
}

function MoneyInput({ value, onChange, step }: {
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, color: SLATE }}>KES</span>
      <StyledInput type="number" min={0} step={step} value={value} onChange={onChange} width={120} />
    </div>
  );
}

function UnitInput({ value, onChange, min, max, step, suffix }: {
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min: number; max: number; step: number; suffix: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <StyledInput type="number" min={min} max={max} step={step} value={value} onChange={onChange} width={90} />
      <span style={{ fontSize: 13, color: SLATE }}>{suffix}</span>
    </div>
  );
}

function ExampleRow({ label, value, emphasis }: {
  label: string; value: string; emphasis?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 16, padding: '5px 0',
    }}>
      <span style={{ fontSize: 13, color: emphasis ? TEXT_DARK : SLATE, fontWeight: emphasis ? 600 : 400 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: emphasis ? ORANGE : TEXT_DARK,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </span>
    </div>
  );
}

const fmtPct = (v: number | null) => (v === null ? '—' : `${v}%`);
