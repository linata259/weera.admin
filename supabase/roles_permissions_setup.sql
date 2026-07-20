-- ============================================================
-- Weera Admin — Roles & Permissions setup
-- Run once in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tables ---------------------------------------------------

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_system   boolean not null default false, -- system roles can't be deleted
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  module      text not null unique,   -- machine key, e.g. 'financials'
  label       text not null,          -- display name
  description text,
  sort_order  int  not null default 0
);

create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles(id)       on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  can_view    boolean not null default false,
  can_create  boolean not null default false,
  can_edit    boolean not null default false,
  can_delete  boolean not null default false,
  primary key (role_id, permission_id)
);

-- Link admin users to a role
alter table public.profiles
  add column if not exists role_id uuid references public.roles(id);

-- 2. Row Level Security --------------------------------------

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;

-- Any signed-in user may read (needed to resolve their own permissions)
drop policy if exists "roles_read"       on public.roles;
drop policy if exists "permissions_read" on public.permissions;
drop policy if exists "role_perms_read"  on public.role_permissions;
create policy "roles_read"       on public.roles            for select to authenticated using (true);
create policy "permissions_read" on public.permissions      for select to authenticated using (true);
create policy "role_perms_read"  on public.role_permissions for select to authenticated using (true);

-- Only admins may write
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

drop policy if exists "roles_write"      on public.roles;
drop policy if exists "role_perms_write" on public.role_permissions;
create policy "roles_write" on public.roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "role_perms_write" on public.role_permissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 3. Seed permissions (modules) ------------------------------

insert into public.permissions (module, label, description, sort_order) values
  ('dashboard',         'Dashboard',           'Overview metrics and KPIs',                          1),
  ('user_management',   'User Management',     'View and manage platform users',                     2),
  ('job_management',    'Job Management',      'View and manage jobs and reports',                   3),
  ('financials',        'Financials',          'Transactions, withdrawals, platform revenue',        4),
  ('chat_moderation',   'Chat Moderation',     'Monitor and moderate user conversations',            5),
  ('help_support',      'Help & Support',      'Support tickets and user inquiries',                 6),
  ('disputes',          'Dispute Management',  'Handle disputes between clients and freelancers',    7),
  ('notifications',     'Notifications',       'Send and manage platform notifications',             8),
  ('marketing',         'Marketing',           'Campaigns, promotions and marketing content',        9),
  ('skills',            'Skills',              'Manage the platform skills catalogue',              10),
  ('locations',         'Locations',           'Manage supported locations',                        11),
  ('reports_analytics', 'Reports & Analytics', 'Analytics dashboards and exportable reports',       12),
  ('developer_tools',   'Developer Tools',     'App health, logs, issues and diagnostics',          13),
  ('roles_permissions', 'Roles & Permissions', 'Manage admin roles, permissions and admin users',   14),
  ('settings',          'Settings',            'Platform configuration',                            15)
on conflict (module) do nothing;

-- 4. Seed roles ----------------------------------------------

insert into public.roles (name, description, is_system) values
  ('Super Admin',   'Full access to every module. Can create roles, permissions and admin users.', true),
  ('Admin',         'Full access to every module. Can add new roles and create admin accounts.',   true),
  ('Finance',       'Read-only access to platform financials.',                                    false),
  ('Customer Care', 'Chat moderation, help & support, users, jobs, notifications and marketing.',  false),
  ('Marketing',     'Marketing campaigns, promotions and related notifications.',                  false),
  ('Developer',     'App health, logs, issues and technical diagnostics.',                         false)
on conflict (name) do nothing;

-- 5. Seed role_permissions -----------------------------------

-- Super Admin + Admin → everything
insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
select r.id, p.id, true, true, true, true
from public.roles r cross join public.permissions p
where r.name in ('Super Admin', 'Admin')
on conflict (role_id, permission_id) do nothing;

-- Finance → financials (view only) + its own reports
insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
select r.id, p.id, true, false, false, false
from public.roles r join public.permissions p
  on p.module in ('financials')
where r.name = 'Finance'
on conflict (role_id, permission_id) do nothing;

-- Customer Care → chat, support, users, jobs, notifications, marketing (view + edit)
insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
select r.id, p.id, true, false, true, false
from public.roles r join public.permissions p
  on p.module in ('chat_moderation','help_support','user_management','job_management','notifications','marketing')
where r.name = 'Customer Care'
on conflict (role_id, permission_id) do nothing;

-- Marketing → marketing (full) + notifications (view/create/edit)
insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
select r.id, p.id, true, true, true, p.module = 'marketing'
from public.roles r join public.permissions p
  on p.module in ('marketing','notifications')
where r.name = 'Marketing'
on conflict (role_id, permission_id) do nothing;

-- Developer → developer tools (full view/edit) + dashboard + settings (view)
insert into public.role_permissions (role_id, permission_id, can_view, can_create, can_edit, can_delete)
select r.id, p.id, true, false, p.module = 'developer_tools', false
from public.roles r join public.permissions p
  on p.module in ('developer_tools','dashboard','settings')
where r.name = 'Developer'
on conflict (role_id, permission_id) do nothing;

-- 6. Give existing admin accounts the Super Admin role -------

update public.profiles
set role_id = (select id from public.roles where name = 'Super Admin')
where role = 'admin' and role_id is null;

-- 7. Helper view: roles with user + permission counts --------

create or replace view public.roles_overview as
select
  r.id, r.name, r.description, r.is_system, r.created_at, r.updated_at,
  (select count(*) from public.profiles pr where pr.role_id = r.id)        as users_assigned,
  (select count(*) from public.role_permissions rp
     where rp.role_id = r.id and rp.can_view)                              as modules_visible
from public.roles r;

grant select on public.roles_overview to authenticated;
