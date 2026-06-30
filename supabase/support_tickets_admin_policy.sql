-- Run this in Supabase SQL Editor if the admin panel still shows no rows
-- while public.support_tickets has data.
--
-- This React admin app currently queries Supabase with the public anon key and
-- has no Supabase auth flow. If Row Level Security is enabled on
-- public.support_tickets without a matching SELECT policy, Supabase returns []
-- to the app even when rows exist in the dashboard.
--
-- Security note: this policy makes support tickets readable by anyone with the
-- anon key. Use it only if this admin panel is otherwise access-controlled.
-- The stronger fix is to add admin authentication and change this policy from
-- "to anon" to "to authenticated" with an admin-role check.

alter table public.support_tickets enable row level security;

drop policy if exists "admin panel can read support tickets" on public.support_tickets;
create policy "admin panel can read support tickets"
on public.support_tickets
for select
to anon
using (true);

drop policy if exists "admin panel can update support ticket status" on public.support_tickets;
create policy "admin panel can update support ticket status"
on public.support_tickets
for update
to anon
using (true)
with check (true);
