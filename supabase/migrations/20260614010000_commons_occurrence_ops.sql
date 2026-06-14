-- supabase/migrations/20260614010000_commons_occurrence_ops.sql
-- Occurrence-level operations on run instances:
--   set_node_status   — now stamps completion attribution (who/when/late) on 'done', clears on reopen.
--   resolve_missed    — any active member may record that a missed item actually happened ("זה כן קרה"),
--                       attributing who did it; kept as a LATE completion (the audit keeps the truth).
--   defer_occurrence  — manager+; push this occurrence to another op-day (spawns an open instance there),
--                       or, with a null target, skip it ("לא צריך הפעם" -> 'cancelled').
-- Design: docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md

-- Completion stamping on the existing status RPC.
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
           completed_late = (result.due_date is not null and now() > result.due_date)
     where id = node_id returning * into result;
  else
    update commons.nodes set status = new_status, completed_by = null, completed_at = null, completed_late = false
     where id = node_id returning * into result;
  end if;
  return result;
end;
$$;

-- "זה כן קרה — XXX עשה את זה": resolve a missed item as a late completion attributed to did_by.
create or replace function commons.resolve_missed(node_id uuid, did_by uuid)
returns commons.nodes language plpgsql security definer set search_path = commons, public as $$
declare result commons.nodes;
begin
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if result.kind <> 'task' then raise exception 'not a task'; end if;
  if not commons.is_active_member(result.workspace_id) then raise exception 'not a member'; end if;
  if did_by is not null and not exists (
       select 1 from commons.workspace_members where id = did_by and workspace_id = result.workspace_id) then
    raise exception 'invalid member';
  end if;
  update commons.nodes set status = 'done', completed_by = did_by, completed_at = now(), completed_late = true
   where id = node_id returning * into result;
  return result;
end;
$$;

-- Defer/skip a single occurrence (manager+). to_date null -> skip ('cancelled'); else mark this one
-- 'deferred' and spawn an open instance on the target op-day.
create or replace function commons.defer_occurrence(node_id uuid, to_date date)
returns commons.nodes language plpgsql security definer set search_path = commons, public as $$
declare n commons.nodes; new_due timestamptz; tod time;
begin
  select * into n from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if commons.my_permission(n.workspace_id) not in ('admin','manager') then raise exception 'not allowed'; end if;

  if to_date is null then
    update commons.nodes set status = 'cancelled' where id = node_id;
  else
    tod := coalesce(n.due_date::time, time '20:00');
    new_due := to_date + tod;
    if extract(hour from new_due) < 8 then new_due := new_due + interval '1 day'; end if;
    update commons.nodes set status = 'deferred' where id = node_id;
    insert into commons.nodes
      (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
       due_date, occurrence_date, template_id, position, created_by)
    values
      (n.workspace_id, n.parent_id, 'task', n.title, n.description, 'open', n.owner_id, n.role_ids,
       new_due, to_date, n.template_id, n.position, n.created_by);
  end if;

  select * into n from commons.nodes where id = node_id;
  return n;
end;
$$;

grant execute on function commons.resolve_missed(uuid, uuid)   to authenticated;
grant execute on function commons.defer_occurrence(uuid, date) to authenticated;
