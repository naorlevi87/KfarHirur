-- supabase/migrations/20260616110000_commons_complete_takes_ownership.sql
-- Completing a task claims it for whoever completed it: a 'done' task can never still read
-- "פנוי — מי לוקח?". Owner is only auto-set when it was empty (coalesce) — an existing owner is
-- never overwritten. Applies to every completion path:
--   set_node_status      — single complete.
--   complete_subtree     — cascade complete (now also stamps who/when/late, which it never did).
--   rollup_parent_status — a parent auto-completed because all its children are done.
-- resolve_missed is intentionally NOT touched: "זה כן קרה / לא יודע" stays ownerless on purpose.
-- A one-time backfill fixes rows completed before this migration.
-- Design: docs/superpowers/specs/2026-06-16-commons-task-entries-link-image-and-completion-ownership-design.md

-- ── Single complete: claim for the actor when unowned.
create or replace function commons.set_node_status(node_id uuid, new_status text)
returns commons.nodes language plpgsql security definer set search_path = commons, public as $$
declare result commons.nodes; mid uuid;
begin
  if new_status not in ('open','in_progress','done') then raise exception 'invalid status: %', new_status; end if;
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if result.kind <> 'task' then raise exception 'not a task'; end if;
  if not commons.is_active_member(result.workspace_id) then raise exception 'not a member'; end if;

  select id into mid from commons.workspace_members
    where workspace_id = result.workspace_id and user_id = auth.uid() and status = 'active' limit 1;

  if new_status = 'done' then
    update commons.nodes set status = 'done', completed_by = mid, completed_at = now(),
           completed_late = (result.due_date is not null and now() > result.due_date),
           owner_id = coalesce(result.owner_id, mid)
     where id = node_id returning * into result;
  else
    update commons.nodes set status = new_status, completed_by = null, completed_at = null, completed_late = false
     where id = node_id returning * into result;
  end if;
  return result;
end;
$$;

-- ── Cascade complete: stamp attribution + claim each closed task for the actor when unowned.
create or replace function commons.complete_subtree(node_id uuid)
returns integer
language plpgsql security definer set search_path = commons, public
as $$
declare wid uuid; mid uuid; n int;
begin
  select workspace_id into wid from commons.nodes where id = node_id;
  if wid is null then raise exception 'node not found'; end if;
  if not commons.is_active_member(wid) then raise exception 'not a member'; end if;

  select id into mid from commons.workspace_members
    where workspace_id = wid and user_id = auth.uid() and status = 'active' limit 1;

  with recursive sub as (
    select id from commons.nodes where id = node_id
    union all
    select c.id from commons.nodes c join sub on c.parent_id = sub.id
  )
  update commons.nodes t set
      status = 'done',
      completed_by = mid,
      completed_at = now(),
      completed_late = (t.due_date is not null and now() > t.due_date),
      owner_id = coalesce(t.owner_id, mid)
    where t.id in (select id from sub) and t.kind = 'task' and t.status <> 'done';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ── Roll-up: when a parent auto-completes, claim it for the actor if it has no owner.
create or replace function commons.rollup_parent_status()
returns trigger
language plpgsql security definer set search_path = commons, public
as $$
declare
  pid uuid := coalesce(new.parent_id, old.parent_id);
  parent commons.nodes;
  kids int; open_kids int; target text; mid uuid;
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
    if target = 'done' and parent.owner_id is null then
      select id into mid from commons.workspace_members
        where workspace_id = parent.workspace_id and user_id = auth.uid() and status = 'active' limit 1;
      update commons.nodes set status = target, owner_id = coalesce(owner_id, mid) where id = pid;
    else
      update commons.nodes set status = target where id = pid;   -- propagates up via this same trigger
    end if;
  end if;
  return null;
end;
$$;

-- ── One-time backfill: rows completed before this migration kept owner_id null.
update commons.nodes
   set owner_id = completed_by
 where status = 'done' and owner_id is null and completed_by is not null;
