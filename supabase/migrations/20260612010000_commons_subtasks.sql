-- supabase/migrations/20260612010000_commons_subtasks.sql
-- Sub-tasks: a parent task's status is derived from its children (rollup trigger); a cascade RPC
-- completes a whole subtree; members may add/remove sub-tasks inside an existing task.

-- ── Roll-up: a task parent is 'done' iff it has task-children and all are 'done', else 'open'.
create or replace function commons.rollup_parent_status()
returns trigger
language plpgsql security definer set search_path = commons, public
as $$
declare
  pid uuid := coalesce(new.parent_id, old.parent_id);
  parent commons.nodes;
  kids int; open_kids int; target text;
begin
  if pid is null then return null; end if;
  select * into parent from commons.nodes where id = pid;
  if not found or parent.kind <> 'task' then return null; end if;

  select count(*) filter (where kind = 'task'),
         count(*) filter (where kind = 'task' and status <> 'done')
    into kids, open_kids
    from commons.nodes where parent_id = pid;

  if kids = 0 then return null; end if;            -- became a leaf again; leave its status alone
  target := case when open_kids = 0 then 'done' else 'open' end;
  if parent.status is distinct from target then
    update commons.nodes set status = target where id = pid;   -- propagates up via this same trigger
  end if;
  return null;
end;
$$;

drop trigger if exists nodes_rollup on commons.nodes;
create trigger nodes_rollup
  after insert or delete or update of status on commons.nodes
  for each row execute function commons.rollup_parent_status();

-- ── Cascade: mark every descendant task 'done' (rollup then completes ancestors). Member-gated.
create or replace function commons.complete_subtree(node_id uuid)
returns integer
language plpgsql security definer set search_path = commons, public
as $$
declare wid uuid; n int;
begin
  select workspace_id into wid from commons.nodes where id = node_id;
  if wid is null then raise exception 'node not found'; end if;
  if not commons.is_active_member(wid) then raise exception 'not a member'; end if;
  with recursive sub as (
    select id from commons.nodes where id = node_id
    union all
    select c.id from commons.nodes c join sub on c.parent_id = sub.id
  )
  update commons.nodes set status = 'done'
    where id in (select id from sub) and kind = 'task' and status <> 'done';
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function commons.complete_subtree(uuid) to authenticated;

-- ── RLS: members may add a sub-task (a task whose parent is a task) and delete ones they created.
drop policy if exists "members add subtasks" on commons.nodes;
create policy "members add subtasks" on commons.nodes
  for insert
  with check (
    commons.is_active_member(workspace_id) and kind = 'task'
    and exists (select 1 from commons.nodes p where p.id = parent_id and p.kind = 'task')
  );

drop policy if exists "members delete own subtasks" on commons.nodes;
create policy "members delete own subtasks" on commons.nodes
  for delete
  using (
    commons.is_active_member(workspace_id) and created_by = auth.uid()
    and exists (select 1 from commons.nodes p where p.id = parent_id and p.kind = 'task')
  );
