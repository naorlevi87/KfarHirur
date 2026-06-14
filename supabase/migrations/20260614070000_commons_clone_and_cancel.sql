-- supabase/migrations/20260614070000_commons_clone_and_cancel.sql
-- Two manager+ actions:
--   clone_node    — deep-copy a definition subtree (a routine + its orders, or any task/folder) as a
--                   sibling titled "<title> (עותק)". Instances/runs are NOT copied; a cloned routine
--                   starts generating from today.
--   cancel_run    — skip a whole run for its day: cascade the run subtree to 'cancelled' in one action.
create or replace function commons.clone_node(node_id uuid)
returns uuid language plpgsql security definer set search_path = commons, public as $$
declare
  src commons.nodes; new_root uuid; idmap jsonb; rec record; new_id uuid; parent_new uuid; nrun timestamptz;
begin
  select * into src from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if commons.my_permission(src.workspace_id) not in ('admin','manager') then raise exception 'not allowed'; end if;

  nrun := case when src.recurrence is not null
            then ((case when extract(hour from now()) < 8 then now() - interval '1 day' else now() end)::date)::timestamptz
            else null end;

  insert into commons.nodes
    (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
     due_date, start_date, recurrence, next_run, day_mask, due_time, position, created_by)
  values
    (src.workspace_id, src.parent_id, src.kind, src.title || ' (עותק)', src.description, src.status,
     src.owner_id, src.role_ids, src.due_date, src.start_date, src.recurrence, nrun, src.day_mask,
     src.due_time, src.position + 1, auth.uid())
  returning id into new_root;
  idmap := jsonb_build_object(src.id::text, new_root::text);

  for rec in
    with recursive sub as (
      select n.*, 1 as depth from commons.nodes n where n.parent_id = src.id and n.occurrence_date is null
      union all
      select n.*, s.depth + 1 from commons.nodes n join sub s on n.parent_id = s.id where n.occurrence_date is null
    ) select * from sub order by depth, position, created_at
  loop
    parent_new := coalesce((idmap->>rec.parent_id::text)::uuid, new_root);
    insert into commons.nodes
      (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
       due_date, start_date, recurrence, day_mask, due_time, position, created_by)
    values
      (rec.workspace_id, parent_new, rec.kind, rec.title, rec.description, rec.status, rec.owner_id,
       rec.role_ids, rec.due_date, rec.start_date, null, rec.day_mask, rec.due_time, rec.position, auth.uid())
    returning id into new_id;
    idmap := idmap || jsonb_build_object(rec.id::text, new_id::text);
  end loop;

  return new_root;
end;
$$;

create or replace function commons.cancel_run(node_id uuid)
returns integer language plpgsql security definer set search_path = commons, public as $$
declare wid uuid; n int;
begin
  select workspace_id into wid from commons.nodes where id = node_id;
  if wid is null then raise exception 'node not found'; end if;
  if commons.my_permission(wid) not in ('admin','manager') then raise exception 'not allowed'; end if;
  with recursive sub as (
    select id from commons.nodes where id = node_id
    union all
    select c.id from commons.nodes c join sub on c.parent_id = sub.id
  )
  update commons.nodes set status = 'cancelled'
    where id in (select id from sub) and kind = 'task' and status <> 'done';
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function commons.clone_node(uuid) to authenticated;
grant execute on function commons.cancel_run(uuid) to authenticated;
