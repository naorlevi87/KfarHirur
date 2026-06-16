-- supabase/migrations/20260616090000_commons_defer_run.sql
-- defer_run — manager+; defer a whole run subtree (a run root, a parent item, or a single leaf) to a
-- target op-day. Cascades the subtree to 'deferred' (not-done tasks only), then RE-CREATES the subtree
-- on to_date with structure preserved (occurrence_date = to_date, status 'open'), so a parent defers
-- WITH its items — unlike defer_occurrence, which respawns a single node. Modelled on cancel_run
-- (cascade) + clone_node (idmap subtree copy) + defer_occurrence (date/time math).
-- Design: docs/superpowers/specs/2026-06-16-commons-base-vs-occurrence-design.md §8.
create or replace function commons.defer_run(node_id uuid, to_date date)
returns uuid language plpgsql security definer set search_path = commons, public as $$
declare
  root commons.nodes; new_root uuid; idmap jsonb; rec record; new_id uuid; parent_new uuid;
  tod time; new_due timestamptz;
begin
  select * into root from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if commons.my_permission(root.workspace_id) not in ('admin','manager') then raise exception 'not allowed'; end if;
  if to_date is null then raise exception 'defer_run requires a target date'; end if;
  if root.occurrence_date is null then raise exception 'defer_run operates on a run instance'; end if;

  -- 1) close the current run subtree as 'deferred' (not-done tasks only)
  with recursive sub as (
    select id from commons.nodes where id = node_id
    union all
    select c.id from commons.nodes c join sub on c.parent_id = sub.id
  )
  update commons.nodes set status = 'deferred'
    where id in (select id from sub) and kind = 'task' and status <> 'done';

  -- 2) re-create the run root on to_date
  tod := coalesce(root.due_date::time, time '20:00');
  new_due := to_date + tod;
  if extract(hour from new_due) < 8 then new_due := new_due + interval '1 day'; end if;
  insert into commons.nodes
    (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
     due_date, occurrence_date, template_id, position, created_by)
  values
    (root.workspace_id, root.parent_id, root.kind, root.title, root.description, 'open', root.owner_id, root.role_ids,
     new_due, to_date, root.template_id, root.position, root.created_by)
  returning id into new_root;
  idmap := jsonb_build_object(node_id::text, new_root::text);

  -- 3) re-create descendants of the SAME run, preserving structure (parents before children)
  for rec in
    with recursive sub as (
      select n.*, 1 as depth from commons.nodes n
        where n.parent_id = node_id and n.occurrence_date = root.occurrence_date
      union all
      select n.*, s.depth + 1 from commons.nodes n join sub s on n.parent_id = s.id
        where n.occurrence_date = root.occurrence_date
    ) select * from sub order by depth, position, created_at
  loop
    parent_new := coalesce((idmap->>rec.parent_id::text)::uuid, new_root);
    tod := coalesce(rec.due_date::time, time '20:00');
    new_due := to_date + tod;
    if extract(hour from new_due) < 8 then new_due := new_due + interval '1 day'; end if;
    insert into commons.nodes
      (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
       due_date, occurrence_date, template_id, position, created_by)
    values
      (rec.workspace_id, parent_new, rec.kind, rec.title, rec.description, 'open', rec.owner_id, rec.role_ids,
       new_due, to_date, rec.template_id, rec.position, rec.created_by)
    returning id into new_id;
    idmap := idmap || jsonb_build_object(rec.id::text, new_id::text);
  end loop;

  return new_root;
end;
$$;

grant execute on function commons.defer_run(uuid, date) to authenticated;
