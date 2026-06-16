-- Commons: relevance window (model C). An item can carry an optional show_from time-of-day; the pulse
-- only surfaces it once that time has arrived (read on the op-day clock 08:00→08:00). Default null →
-- visible all op-day. run_recurrences copies show_from from each routine definition to its run items
-- (exactly like the per-item due_time). Design: docs/superpowers/specs/2026-06-16-commons-snapshot-screen-design.md

alter table commons.nodes add column if not exists show_from time;

-- Recreate run_recurrences with show_from carried onto cloned run items (only change vs the lookahead
-- version: the def-item INSERT now copies def.show_from).
create or replace function commons.run_recurrences()
returns integer language plpgsql security definer set search_path = commons, public as $$
declare
  tpl record; created int := 0; guard int;
  today_date date := (case when extract(hour from now()) < 8 then now() - interval '1 day' else now() end)::date;
  lookahead  date := ((case when extract(hour from now()) < 8 then now() - interval '1 day' else now() end)::date) + 1;
  occ_date date; dow int; root_due timestamptz; def_due timestamptz;
  run_root uuid; new_id uuid; parent_new uuid; idmap jsonb; def record;
begin
  for tpl in
    select * from commons.nodes
    where kind = 'task' and recurrence is not null and template_id is null
      and occurrence_date is null and next_run is not null
  loop
    guard := 0;
    while (tpl.next_run)::date <= lookahead and guard < 400 loop
      occ_date := (tpl.next_run)::date;
      dow := extract(dow from occ_date)::int;

      if not exists (
        select 1 from commons.nodes
        where template_id = tpl.id and parent_id = tpl.id and occurrence_date = occ_date
      ) then
        root_due := occ_date + coalesce((tpl.recurrence->>'time')::time, time '20:00');
        if extract(hour from root_due) < 8 then root_due := root_due + interval '1 day'; end if;
        insert into commons.nodes
          (workspace_id, parent_id, kind, title, description, status, owner_id, due_date,
           occurrence_date, template_id, position, created_by)
        values
          (tpl.workspace_id, tpl.id, 'task', tpl.title, tpl.description, 'open', tpl.owner_id, root_due,
           occ_date, tpl.id, tpl.position, tpl.created_by)
        returning id into run_root;
        created := created + 1;
        idmap := jsonb_build_object(tpl.id::text, run_root::text);

        for def in
          with recursive defs as (
            select n.*, 1 as depth from commons.nodes n
              where n.parent_id = tpl.id and n.occurrence_date is null
            union all
            select n.*, d.depth + 1 from commons.nodes n
              join defs d on n.parent_id = d.id where n.occurrence_date is null
          ) select * from defs order by depth, position, created_at
        loop
          if dow = any (commons.effective_days(def.id)) then
            parent_new := coalesce((idmap->>def.parent_id::text)::uuid, run_root);
            def_due := occ_date + coalesce(def.due_time, (tpl.recurrence->>'time')::time, time '20:00');
            if extract(hour from def_due) < 8 then def_due := def_due + interval '1 day'; end if;
            insert into commons.nodes
              (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids, due_date,
               occurrence_date, template_id, position, created_by, show_from)
            values
              (def.workspace_id, parent_new, 'task', def.title, def.description, 'open', def.owner_id,
               def.role_ids, def_due, occ_date, def.id, def.position, def.created_by, def.show_from)
            returning id into new_id;
            idmap := idmap || jsonb_build_object(def.id::text, new_id::text);
          end if;
        end loop;
      end if;

      tpl.next_run := commons.next_occurrence(tpl.next_run, tpl.recurrence);
      guard := guard + 1;
    end loop;
    update commons.nodes set next_run = tpl.next_run where id = tpl.id;
  end loop;

  -- Mark genuinely-past un-done instances missed (independent of the look-ahead generation above).
  update commons.nodes set status = 'missed'
   where occurrence_date is not null and occurrence_date < today_date and status in ('open','in_progress');

  return created;
end;
$$;
