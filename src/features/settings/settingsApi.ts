import { supabase } from 'services/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformSettings {
  // General
  maintenance_mode: boolean;
  timezone: string;
  site_name: string;
  support_email: string;
  // Financial
  commission_rate: number;
  escrow_release_days: number;
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
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
  commission_rate: 10,
  escrow_release_days: 3,
  min_withdrawal_amount: 500,
  max_withdrawal_amount: 100_000,
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

// ─── Migration ────────────────────────────────────────────────────────────────
//
// Run in Supabase SQL Editor to add the new M-Pesa columns:
//
//   INSERT INTO public.platform_settings (key, value) VALUES
//     ('mpesa_callback_url',       '"https://your-domain.com/api/mpesa/callback"'),
//     ('mpesa_b2c_shortcode',      '""'),
//     ('mpesa_b2c_initiator_name', '""'),
//     ('mpesa_b2c_result_url',     '"https://your-domain.com/api/mpesa/b2c/result"'),
//     ('mpesa_b2c_timeout_url',    '"https://your-domain.com/api/mpesa/b2c/timeout"')
//   ON CONFLICT (key) DO NOTHING;

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

export async function updateSetting(
  key: keyof PlatformSettings,
  value: unknown,
): Promise<boolean> {
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) {
    console.error('updateSetting failed:', key, error.message);
    return false;
  }
  return true;
}

export async function updateSettings(
  updates: Partial<PlatformSettings>,
): Promise<boolean> {
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('platform_settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) {
    console.error('updateSettings failed:', error.message);
    return false;
  }
  return true;
}