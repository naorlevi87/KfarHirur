-- supabase/migrations/20260610000000_commons_nodes.sql
-- Commons task system — phase 2a foundation.
-- One unified tree of nodes per workspace: kind 'container' (organizes) or 'task' (actionable).
-- Tasks carry description, owner, due date, status, and recurrence (recurrence engine wired in 2c).

create table if not exists commons.nodes (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references commons.workspaces(id) on delete cascade,
  parent_id    uuid references commons.nodes(id) on delete cascade,
  kind         text not null check (kind in ('container','task')),
  title        text not null,
  description  text,
  status       text check (status in ('open','in_progress','done','missed','cancelled')),
  owner_id     uuid references commons.workspace_members(id) on delete set null,
  due_date     timestamptz,
  recurrence   jsonb,
  next_run     timestamptz,
  position     double precision not null default 0,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists nodes_workspace_idx on commons.nodes(workspace_id);
create index if not exists nodes_parent_idx    on commons.nodes(parent_id);

-- keep updated_at fresh
create or replace function commons.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists nodes_touch_updated_at on commons.nodes;
create trigger nodes_touch_updated_at
  before update on commons.nodes
  for each row execute function commons.touch_updated_at();

-- ── RLS: active members of the workspace read & manage its nodes ──
alter table commons.nodes enable row level security;

create policy "members read nodes" on commons.nodes
  for select using (commons.is_active_member(workspace_id));

create policy "members write nodes" on commons.nodes
  for all using (commons.is_active_member(workspace_id))
  with check (commons.is_active_member(workspace_id));

-- ── Grants (RLS still governs rows) ──
grant select, insert, update, delete on commons.nodes to authenticated;
grant select on commons.nodes to anon;
grant all on commons.nodes to service_role;
