-- supabase/roles_schema.sql
-- User roles table + RLS policies for timeline_items.
-- Run in Supabase SQL Editor after schema.sql.

-- ── user_roles ────────────────────────────────────────────────────────────────

create table if not exists user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('admin', 'editor', 'member')),
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- ── Helper: get role for a user ───────────────────────────────────────────────

create or replace function get_user_role(uid uuid)
returns text as $$
  select role from user_roles where user_id = uid limit 1;
$$ language sql security definer;

-- ── RLS: user_roles ───────────────────────────────────────────────────────────

alter table user_roles enable row level security;

-- Users can read their own role
create policy "users read own role"
  on user_roles for select
  using (auth.uid() = user_id);

-- Only admins can manage roles
create policy "admins manage roles"
  on user_roles for all
  using (get_user_role(auth.uid()) = 'admin');

-- ── RLS: timeline_items ───────────────────────────────────────────────────────

alter table timeline_items enable row level security;

-- Anyone can read published items
create policy "public read published items"
  on timeline_items for select
  using (status = 'published');

-- Editors and admins can read all items (including drafts)
create policy "editors read all items"
  on timeline_items for select
  using (get_user_role(auth.uid()) in ('editor', 'admin'));

-- Editors and admins can insert / update / delete
create policy "editors write items"
  on timeline_items for insert
  with check (get_user_role(auth.uid()) in ('editor', 'admin'));

create policy "editors update items"
  on timeline_items for update
  using (get_user_role(auth.uid()) in ('editor', 'admin'));

create policy "editors delete items"
  on timeline_items for delete
  using (get_user_role(auth.uid()) in ('editor', 'admin'));

-- ── RLS: timeline_item_blocks ─────────────────────────────────────────────────

alter table timeline_item_blocks enable row level security;

-- Anyone can read blocks of published items
create policy "public read blocks of published items"
  on timeline_item_blocks for select
  using (
    exists (
      select 1 from timeline_items
      where id = timeline_item_blocks.item_id and status = 'published'
    )
  );

-- Editors and admins can read all blocks
create policy "editors read all blocks"
  on timeline_item_blocks for select
  using (get_user_role(auth.uid()) in ('editor', 'admin'));

-- Editors and admins can write blocks
create policy "editors write blocks"
  on timeline_item_blocks for insert
  with check (get_user_role(auth.uid()) in ('editor', 'admin'));

create policy "editors update blocks"
  on timeline_item_blocks for update
  using (get_user_role(auth.uid()) in ('editor', 'admin'));

create policy "editors delete blocks"
  on timeline_item_blocks for delete
  using (get_user_role(auth.uid()) in ('editor', 'admin'));
