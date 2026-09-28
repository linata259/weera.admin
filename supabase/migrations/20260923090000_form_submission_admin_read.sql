-- Let admin-panel users read form submissions.
-- If form_submissions has RLS on with only an insert policy, the admin panel
-- gets an empty list instead of an error. Run in the Supabase SQL editor.

alter table public.form_submissions enable row level security;

drop policy if exists "Admins can read form submissions" on public.form_submissions;
create policy "Admins can read form submissions"
  on public.form_submissions
  for select
  to authenticated
  using (public.is_admin());
