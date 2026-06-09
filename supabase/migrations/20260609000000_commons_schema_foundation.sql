-- supabase/migrations/20260609000000_commons_schema_foundation.sql
-- Community Commons Engine — Increment 1 foundation.
-- Creates the isolated `commons` schema with identity & access tables, RLS, and helpers.
-- Areas/tasks arrive in increment 2. Auth is shared with the site; authorization is NOT
-- (this schema does not touch the site's `user_roles` table).

create schema if not exists commons;
grant usage on schema commons to anon, authenticated, service_role;

-- ── workspaces (tenants) ──────────────────────────────────────
create table if not exists commons.workspaces (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

-- ── workspace_members ─────────────────────────────────────────
create table if not exists commons.workspace_members (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references commons.workspaces(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  permission_level text not null default 'member' check (permission_level in ('admin','manager','member')),
  status           text not null default 'active'  check (status in ('active','pending','invited')),
  display_name     text,
  created_at       timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ── roles (responsibility/expertise — NOT permissions) ────────
create table if not exists commons.roles (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references commons.workspaces(id) on delete cascade,
  name         text not null,
  color        text,
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

-- ── member_roles ──────────────────────────────────────────────
create table if not exists commons.member_roles (
  member_id uuid not null references commons.workspace_members(id) on delete cascade,
  role_id   uuid not null references commons.roles(id) on delete cascade,
  primary key (member_id, role_id)
);

-- ── Helpers (SECURITY DEFINER → bypass RLS, avoid policy recursion) ──
create or replace function commons.is_active_member(wid uuid)
returns boolean as $$
  select exists (
    select 1 from commons.workspace_members m
    where m.workspace_id = wid and m.user_id = auth.uid() and m.status = 'active'
  );
$$ language sql security definer stable;

create or replace function commons.my_permission(wid uuid)
returns text as $$
  select permission_level from commons.workspace_members
  where workspace_id = wid and user_id = auth.uid() and status = 'active'
  limit 1;
$$ language sql security definer stable;

grant execute on function commons.is_active_member(uuid) to anon, authenticated;
grant execute on function commons.my_permission(uuid)   to anon, authenticated;

-- ── RLS ───────────────────────────────────────────────────────
alter table commons.workspaces        enable row level security;
alter table commons.workspace_members enable row level security;
alter table commons.roles             enable row level security;
alter table commons.member_roles      enable row level security;

create policy "members read workspace" on commons.workspaces
  for select using (commons.is_active_member(id));

create policy "read own membership" on commons.workspace_members
  for select using (user_id = auth.uid());

create policy "members read roster" on commons.workspace_members
  for select using (commons.is_active_member(workspace_id));

create policy "admins manage members" on commons.workspace_members
  for all using (commons.my_permission(workspace_id) = 'admin')
  with check (commons.my_permission(workspace_id) = 'admin');

create policy "members read roles" on commons.roles
  for select using (commons.is_active_member(workspace_id));

create policy "admins manage roles" on commons.roles
  for all using (commons.my_permission(workspace_id) = 'admin')
  with check (commons.my_permission(workspace_id) = 'admin');

create policy "members read member_roles" on commons.member_roles
  for select using (exists (
    select 1 from commons.workspace_members m
    where m.id = member_roles.member_id and commons.is_active_member(m.workspace_id)
  ));

create policy "admins manage member_roles" on commons.member_roles
  for all using (exists (
    select 1 from commons.workspace_members m
    where m.id = member_roles.member_id and commons.my_permission(m.workspace_id) = 'admin'
  ))
  with check (exists (
    select 1 from commons.workspace_members m
    where m.id = member_roles.member_id and commons.my_permission(m.workspace_id) = 'admin'
  ));

-- ── Table grants for PostgREST (RLS still governs row visibility) ──
grant select, insert, update, delete on all tables in schema commons to authenticated;
grant select on all tables in schema commons to anon;
alter default privileges in schema commons grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema commons grant select on tables to anon;
