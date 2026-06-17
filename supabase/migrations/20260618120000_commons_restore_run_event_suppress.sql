-- Commons: restore event suppression in run_recurrences (regression fix).
-- 20260616000000 wrapped the run-generation INSERTs in commons.event_suppress = 'on' so the nightly
-- rollover does NOT log 'created' events for auto-generated runs and their sub-tasks (only deliberate
-- human adds belong in the יומן פעילות). 20260617000000_commons_show_from then recreated the function
-- from the older look-ahead version and dropped that bracketing, so every cron run since re-logged
-- system 'created' rows. This re-applies suppression on top of the show_from version: generation runs
-- with suppression ON; the trailing 'missed' sweep runs with it OFF so misses are still logged.

create or replace function commons.run_recurrences()
returns integer language plpgsql security definer set search_path = commons, public as $$
declare
  tpl record; created int := 0; guard int;
  today_date date := (case when extract(hour from now()) < 8 then now() - interval '1 day' else now() end)::date;
  lookahead  date := ((case when extract(hour from now()) < 8 then now() - interval '1 day' else now() end)::date) + 1;
  occ_date date; dow int; root_due timestamptz; def_due timestamptz;
  run_root uuid; new_id uuid; parent_new uuid; idmap jsonb; def record;
begin
  perform set_config('commons.event_suppress', 'on', true);   -- generated runs are not "created" events
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

  perform set_config('commons.event_suppress', 'off', true);  -- the sweep below SHOULD log 'missed'
  update commons.nodes set status = 'missed'
   where occurrence_date is not null and occurrence_date < today_date and status in ('open','in_progress');

  return created;
end;
$$;

grant execute on function commons.run_recurrences() to service_role;
