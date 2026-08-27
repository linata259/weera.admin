import { supabase } from 'services/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformSettings {
  // General
  maintenance_mode: boolean;
  timezone: string;
  site_name: string;
  support_email: string;
  // Financial — commission split
  //
  // These two are what the app actually charges. `commission_rate` is the
  // headline total (client + freelancer) and is derived, never set directly:
  // update_platform_fees() keeps it in step.
  //
  // Stored as percentages (7 means 7%), matching the DB convention.
  client_fee_pct: number;
  freelancer_fee_pct: number;
  commission_rate: number;
  // Financial — other
  escrow_release_days: number;
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
  min_deposit_amount: number;
  // Payment — toggles
  mpesa_enabled: boolean;
  bank_transfer_enabled: boolean;
  // Payment — C2B / STK Push (deposits)
  mpesa_shortcode: string;
  mpesa_business_name: string;
  mpesa_callback_url: string;
  // Payment — B2C (withdrawals to M-Pesa)
  mpesa_b2c_shortcode: string;
  mpesa_b2c_initiator_name: string;
  mpesa_b2c_result_url: string;
  mpesa_b2c_timeout_url: string;
  // User & Security
  user_registration_enabled: boolean;
  email_verification_required: boolean;
  two_factor_enabled: boolean;
  session_timeout_minutes: number;
  max_login_attempts: number;
  password_min_length: number;
}

export const SETTINGS_DEFAULTS: PlatformSettings = {
  maintenance_mode: false,
  timezone: 'Africa/Nairobi',
  site_name: 'Weera',
  support_email: 'support@weera.co.ke',
  client_fee_pct: 7,
  freelancer_fee_pct: 12,
  commission_rate: 19,
  escrow_release_days: 0,
  min_withdrawal_amount: 400,
  max_withdrawal_amount: 100_000,
  min_deposit_amount: 10,
  mpesa_enabled: true,
  bank_transfer_enabled: false,
  mpesa_shortcode: '',
  mpesa_business_name: '',
  mpesa_callback_url: '',
  mpesa_b2c_shortcode: '',
  mpesa_b2c_initiator_name: '',
  mpesa_b2c_result_url: '',
  mpesa_b2c_timeout_url: '',
  user_registration_enabled: true,
  email_verification_required: true,
  two_factor_enabled: false,
  session_timeout_minutes: 30,
  max_login_attempts: 5,
  password_min_length: 8,
};

// ─── How writes work ──────────────────────────────────────────────────────────
//
// platform_settings is read-only to `authenticated`, and this panel signs in
// with the anon key, so a direct .upsert() is rejected by the database. Every
// write therefore goes through a security-definer RPC:
//
//   client_fee_pct / freelancer_fee_pct → update_platform_fees()
//       validates the pair together, keeps commission_rate in step, and writes
//       a row to platform_settings_history. Never write these two directly:
//       doing so would skip the audit trail and let the headline total drift.
//
//   numeric keys                        → update_platform_setting_numeric()
//   text / boolean keys                 → update_platform_setting_value()
//       both allow-listed and admin-guarded.
//
// Requires migration 20260811140000_admin_editable_settings.sql.
//
// The app reads the same rows through get_fee_rates(), cached for 10 minutes,
// so a change here reaches users within minutes without an app release. Money
// actually moved is computed server-side by get_escrow_requirement(), from
// these same rows — the app cannot charge a rate the admin did not set.

/** Written only by update_platform_fees; derived from the two fee keys. */
const DERIVED_KEYS: ReadonlySet<string> = new Set(['commission_rate']);

const FEE_KEYS = ['client_fee_pct', 'freelancer_fee_pct'] as const;

/**
 * What a settings section sends on save.
 *
 * `fee_reason` is not a stored setting — it is the note recorded against a rate
 * change in platform_settings_history, so it rides along with the update rather
 * than living in PlatformSettings.
 */
export type SettingsUpdate = Partial<PlatformSettings> & { fee_reason?: string };

const NUMERIC_KEYS: ReadonlySet<string> = new Set([
  'escrow_release_days',
  'min_withdrawal_amount',
  'max_withdrawal_amount',
  'min_deposit_amount',
  'session_timeout_minutes',
  'max_login_attempts',
  'password_min_length',
]);

// ─── API ──────────────────────────────────────────────────────────────────────

export async function fetchSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value');

  if (error) {
    console.warn('Settings fetch failed, using defaults:', error.message);
    return { ...SETTINGS_DEFAULTS };
  }

  const merged: Record<string, unknown> = { ...SETTINGS_DEFAULTS };
  (data ?? []).forEach((row: { key: string; value: unknown }) => {
    if (Object.prototype.hasOwnProperty.call(merged, row.key)) {
      merged[row.key] = row.value;
    }
  });

  return merged as unknown as PlatformSettings;
}

/**
 * Change the commission split. Both rates are sent together because the
 * database validates them as a pair — a combined rate above 50% is rejected,
 * and so is anything between 0 and 1 (which is almost always 0.07 typed where
 * 7 was meant).
 *
 * Returns the error message rather than a bare false, because "combined fee of
 * 60% looks wrong" is worth showing the admin verbatim.
 */
export async function updatePlatformFees(
  clientFeePct: number,
  freelancerFeePct: number,
  reason?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc('update_platform_fees', {
    p_client_fee_pct: clientFeePct,
    p_freelancer_fee_pct: freelancerFeePct,
    p_reason: reason ?? null,
  });

  if (error) {
    console.error('updatePlatformFees failed:', error.message);
    return { ok: false, message: friendlyError(error.message) };
  }
  return { ok: true };
}

/** Who changed the rates, when, and why. Admin-only at the database level. */
export interface FeeHistoryEntry {
  id: string;
  changed_at: string;
  changed_by_name: string;
  old_client_fee_pct: number | null;
  new_client_fee_pct: number | null;
  old_freelancer_fee_pct: number | null;
  new_freelancer_fee_pct: number | null;
  reason: string | null;
}

export async function fetchFeeHistory(limit = 10): Promise<FeeHistoryEntry[]> {
  const { data, error } = await supabase
    .from('platform_fee_history_v')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Fee history unavailable:', error.message);
    return [];
  }
  return (data ?? []) as FeeHistoryEntry[];
}

export async function updateSetting(
  key: keyof PlatformSettings,
  value: unknown,
): Promise<boolean> {
  const result = await writeSetting(key, value);
  if (!result.ok) console.error('updateSetting failed:', key, result.message);
  return result.ok;
}

export async function updateSettings(
  updates: SettingsUpdate,
): Promise<boolean> {
  const result = await saveSettings(updates);
  return result.ok;
}

/**
 * Same as updateSettings, but surfaces why it failed.
 *
 * Each key is written by its own RPC call, so this is not atomic: a rejected
 * value leaves the keys before it saved. That is the right trade-off here —
 * the alternative is one all-or-nothing RPC per settings section, and a
 * rejected value is nearly always a single out-of-range field the admin can
 * see highlighted and correct.
 */
export async function saveSettings(
  updates: SettingsUpdate,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const entries = Object.entries(updates).filter(
    ([key]) => !DERIVED_KEYS.has(key),
  );

  // Fees are a pair — collapse them into the single RPC that validates both.
  const feeUpdate = entries.filter(([key]) =>
    (FEE_KEYS as readonly string[]).includes(key),
  );
  if (feeUpdate.length > 0) {
    const client = (updates.client_fee_pct ?? NaN) as number;
    const freelancer = (updates.freelancer_fee_pct ?? NaN) as number;
    if (Number.isNaN(client) || Number.isNaN(freelancer)) {
      return {
        ok: false,
        message: 'Both commission rates must be sent together.',
      };
    }
    const res = await updatePlatformFees(client, freelancer, updates.fee_reason);
    if (!res.ok) return res;
  }

  for (const [key, value] of entries) {
    if ((FEE_KEYS as readonly string[]).includes(key)) continue;
    if (key === 'fee_reason') continue;
    const res = await writeSetting(key as keyof PlatformSettings, value);
    if (!res.ok) return res;
  }

  return { ok: true };
}

// ─── Internals ────────────────────────────────────────────────────────────────

async function writeSetting(
  key: keyof PlatformSettings | string,
  value: unknown,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (DERIVED_KEYS.has(key as string)) {
    // commission_rate is maintained by update_platform_fees. Writing it here
    // would either be rejected or, worse, make the headline disagree with the
    // two rates that actually charge people.
    return { ok: true };
  }

  if ((FEE_KEYS as readonly string[]).includes(key as string)) {
    return {
      ok: false,
      message:
        'Commission rates must be saved together via updatePlatformFees().',
    };
  }

  const rpc = NUMERIC_KEYS.has(key as string)
    ? supabase.rpc('update_platform_setting_numeric', {
        p_key: key,
        p_value: Number(value),
      })
    : supabase.rpc('update_platform_setting_value', {
        p_key: key,
        p_value: value,
      });

  const { error } = await rpc;
  if (error) return { ok: false, message: friendlyError(error.message) };
  return { ok: true };
}

/** Strip the Postgres noise; the messages themselves are written for admins. */
function friendlyError(message: string): string {
  if (/permission denied|Only an admin/i.test(message)) {
    return 'You do not have permission to change this setting.';
  }
  if (/function .* does not exist/i.test(message)) {
    return 'Settings update not available — run migration 20260811140000.';
  }
  return message.replace(/^ERROR:\s*/i, '');
}