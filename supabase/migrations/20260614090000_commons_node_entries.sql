-- supabase/migrations/20260614090000_commons_node_entries.sql
-- The "מה קרה כאן" per-node documentation log. Entries attach to a node (any task/sub-task; for
-- routines this is the per-occurrence instance). Everyone in the workspace reads; only managers
-- delete. Writes go through SECURITY DEFINER RPCs (members can't write the table directly).

create table if not exists commons.node_entries (
  id            uuid primary key default gen_random_uuid(),
  node_id       uuid not null references commons.nodes(id) on delete cascade,
  workspace_id  uuid not null references commons.workspaces(id) on delete cascade,
  kind          text not null check (kind in ('note','link','photo','file')),
  body          text,
  url           text,
  file_name     text,
  file_size     int,
  mime          text,
  is_completion boolean not null default false,
  created_by    uuid references commons.workspace_members(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists node_entries_node_idx on commons.node_entries(node_id, created_at desc);

alter table commons.node_entries enable row level security;

-- Read: any active member of the workspace. (Writes/deletes use SECURITY DEFINER RPCs, which bypass RLS.)
drop policy if exists "members read entries" on commons.node_entries;
create policy "members read entries" on commons.node_entries
  for select using (commons.is_active_member(workspace_id));

-- Add an entry. Resolves workspace + caller membership server-side (mirrors claim_node).
create or replace function commons.add_node_entry(
  p_node_id uuid, p_kind text, p_body text, p_url text,
  p_file_name text, p_file_size int, p_mime text, p_is_completion boolean
) returns commons.node_entries
language plpgsql security definer set search_path = commons, public as $$
declare wid uuid; mid uuid; result commons.node_entries;
begin
  select workspace_id into wid from commons.nodes where id = p_node_id;
  if wid is null then raise exception 'node not found'; end if;
  if not commons.is_active_member(wid) then raise exception 'not a member'; end if;
  if p_kind not in ('note','link','photo','file') then raise exception 'bad kind'; end if;

  select id into mid from commons.workspace_members
    where workspace_id = wid and user_id = auth.uid() and status = 'active' limit 1;
  if mid is null then raise exception 'no membership'; end if;

  insert into commons.node_entries
    (node_id, workspace_id, kind, body, url, file_name, file_size, mime, is_completion, created_by)
  values
    (p_node_id, wid, p_kind, p_body, p_url, p_file_name, p_file_size, p_mime,
     coalesce(p_is_completion, false), mid)
  returning * into result;
  return result;
end;
$$;

-- Delete an entry — manager/admin only.
create or replace function commons.delete_node_entry(p_entry_id uuid)
returns void language plpgsql security definer set search_path = commons, public as $$
declare wid uuid;
begin
  select workspace_id into wid from commons.node_entries where id = p_entry_id;
  if wid is null then return; end if;
  if commons.my_permission(wid) not in ('admin','manager') then raise exception 'not allowed'; end if;
  delete from commons.node_entries where id = p_entry_id;
end;
$$;

grant select on commons.node_entries to authenticated;
grant execute on function commons.add_node_entry(uuid,text,text,text,text,int,text,boolean) to authenticated;
grant execute on function commons.delete_node_entry(uuid) to authenticated;
