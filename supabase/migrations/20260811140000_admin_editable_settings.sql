-- ═══════════════════════════════════════════════════════════════════════════
-- Make the admin Settings page actually able to save
--
-- 20260806100000 (app repo) locked the settings table:
--
--   revoke insert, update, delete on public.platform_settings
--     from authenticated, anon;
--
-- That was the right call for fees — every rate change belongs in
-- platform_settings_history — but the admin panel signs in with the anon key
-- and therefore acts as `authenticated`. So *every* write from the Settings
-- page has been silently rejected since that migration: escrow release days,
-- withdrawal limits, M-Pesa shortcodes, session timeout, all of it. The panel
-- reported "Failed to save" and nobody had a way to change a number without
-- opening the SQL editor.
--
-- This migration does not reopen the table. It adds two narrow, admin-guarded
-- RPCs that write on the caller's behalf:
--
--   update_platform_setting_numeric(key, value)   -- allow-listed numeric keys
--   update_platform_setting_value(key, value)     -- allow-listed text/bool keys
--
-- Fee percentages are deliberately NOT writable through either. They keep
-- going through update_platform_fees(), which validates the pair together and
-- records who changed them and why.
--
-- Run this in the Supabase SQL editor, or copy it into the app repo's
-- supabase/migrations/ if that is where you apply migrations from. It touches
-- the database only — no Flutter code is affected.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. Numeric settings
--
-- The allow-list is the point. Without it this is just "admins can write any
-- key", which is how client_fee_pct ends up edited around the audit trail.
--
-- Bounds are the same fat-finger guards update_platform_fees uses: a value
-- that is off by a factor of 100 should be rejected here, not discovered in
-- a support ticket three weeks later.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.update_platform_setting_numeric(
  p_key   text,
  p_value numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old numeric;
  v_min numeric;
  v_max numeric;
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    raise exception 'Only an admin can change platform settings'
      using errcode = '42501';
  end if;

  if p_value is null then
    raise exception 'A value is required' using errcode = '22023';
  end if;

  -- Allow-list plus per-key sanity bounds.
  case p_key
    when 'escrow_release_days'    then v_min := 0;  v_max := 30;
    when 'min_withdrawal_amount'  then v_min := 0;  v_max := 1000000;
    when 'max_withdrawal_amount'  then v_min := 1;  v_max := 10000000;
    when 'min_deposit_amount'     then v_min := 1;  v_max := 10000;
    when 'session_timeout_minutes' then v_min := 1; v_max := 1440;
    when 'max_login_attempts'     then v_min := 1;  v_max := 20;
    when 'password_min_length'    then v_min := 6;  v_max := 64;
    else
      raise exception
        '% is not an admin-editable numeric setting. Fee percentages change '
        'through update_platform_fees() so the history table stays complete.',
        p_key using errcode = '22023';
  end case;

  if p_value < v_min or p_value > v_max then
    raise exception '% must be between % and %, got %',
      p_key, v_min, v_max, p_value using errcode = '22023';
  end if;

  v_old := public.get_setting_numeric(p_key, null);

  -- Withdrawal limits are a pair; a max below the min makes withdrawal
  -- impossible for everyone, and the page saves them in one go.
  if p_key = 'min_withdrawal_amount'
     and p_value > public.get_setting_numeric('max_withdrawal_amount', 100000) then
    raise exception 'Minimum withdrawal cannot exceed the maximum (%)',
      public.get_setting_numeric('max_withdrawal_amount', 100000)
      using errcode = '22023';
  end if;

  if p_key = 'max_withdrawal_amount'
     and p_value < public.get_setting_numeric('min_withdrawal_amount', 400) then
    raise exception 'Maximum withdrawal cannot be below the minimum (%)',
      public.get_setting_numeric('min_withdrawal_amount', 400)
      using errcode = '22023';
  end if;

  insert into public.platform_settings (key, value, updated_at)
  values (p_key, to_jsonb(p_value), now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();

  return jsonb_build_object(
    'ok', true, 'key', p_key, 'old_value', v_old, 'new_value', p_value
  );
end;
$$;

revoke all on function public.update_platform_setting_numeric(text, numeric) from public;
grant execute on function public.update_platform_setting_numeric(text, numeric) to authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- 2. Text and boolean settings
--
-- Same shape, same reasoning. jsonb in, so the caller keeps the type it means:
-- to_jsonb('true') is the string "true", which get_setting_bool would read
-- correctly today and something else would misread tomorrow.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.update_platform_setting_value(
  p_key   text,
  p_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    raise exception 'Only an admin can change platform settings'
      using errcode = '42501';
  end if;

  if p_key not in (
    'maintenance_mode', 'timezone', 'site_name', 'support_email',
    'mpesa_enabled', 'bank_transfer_enabled',
    'mpesa_shortcode', 'mpesa_business_name', 'mpesa_callback_url',
    'mpesa_b2c_shortcode', 'mpesa_b2c_initiator_name',
    'mpesa_b2c_result_url', 'mpesa_b2c_timeout_url',
    'user_registration_enabled', 'email_verification_required',
    'two_factor_enabled', 'fee_collected_at_deposit'
  ) then
    raise exception '% is not an admin-editable setting', p_key
      using errcode = '22023';
  end if;

  insert into public.platform_settings (key, value, updated_at)
  values (p_key, p_value, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();

  return jsonb_build_object('ok', true, 'key', p_key, 'new_value', p_value);
end;
$$;

revoke all on function public.update_platform_setting_value(text, jsonb) from public;
grant execute on function public.update_platform_setting_value(text, jsonb) to authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- 3. Fee history, readable by the admin panel
--
-- The policy on platform_settings_history already allows admins to select it.
-- This view joins the actor's name so the panel can render "Jane Doe, 4 Aug —
-- launch pricing" instead of a bare uuid.
-- ───────────────────────────────────────────────────────────────────────────

create or replace view public.platform_fee_history_v as
select
  h.id,
  h.changed_at,
  h.changed_by,
  coalesce(
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    'Unknown'
  ) as changed_by_name,
  h.old_client_fee_pct,
  h.new_client_fee_pct,
  h.old_freelancer_fee_pct,
  h.new_freelancer_fee_pct,
  h.reason
from public.platform_settings_history h
left join public.profiles p on p.id = h.changed_by
order by h.changed_at desc;

grant select on public.platform_fee_history_v to authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- 4. Backfill: make sure every key the admin panel renders exists
--
-- fetchSettings() merges over defaults, so a missing row shows the default and
-- then appears to "reset" after save. Seeding avoids that confusion.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.platform_settings (key, value, updated_at) values
  ('client_fee_pct',       to_jsonb(7),  now()),
  ('freelancer_fee_pct',   to_jsonb(12), now()),
  ('escrow_release_days',  to_jsonb(0),  now()),
  ('min_deposit_amount',   to_jsonb(10), now())
on conflict (key) do nothing;


-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFY  (as a signed-in admin)
--
--   select public.update_platform_setting_numeric('escrow_release_days', 2);
--     → {"ok": true, "old_value": 0, "new_value": 2}
--
--   select public.update_platform_setting_numeric('client_fee_pct', 5);
--     → ERROR: client_fee_pct is not an admin-editable numeric setting
--
--   select public.update_platform_fees(5, 10, 'Lowered for launch');
--     → commission_rate becomes 15, one row added to platform_settings_history
--
--   select * from public.get_fee_rates();
--     → client 0.05 · freelancer 0.10   (this is what the Flutter app reads)
-- ═══════════════════════════════════════════════════════════════════════════
