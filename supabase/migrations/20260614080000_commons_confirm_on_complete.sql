-- supabase/migrations/20260614080000_commons_confirm_on_complete.sql
-- Per-task completion style. true = "עם אישור" (confirm sheet + optional note); false = "בקליק".
-- Default true. The flag must be carried wherever a node is deep-copied: run_recurrences (run root +
-- each cloned descendant) and clone_node (clone root + descendants).

alter table commons.nodes
  add column if not exists confirm_on_complete boolean not null default true;

-- ── run_recurrences: copy confirm_on_complete onto every generated instance ──
create or replace function commons.run_recurrences()
returns integer language plpgsql security definer set search_path = commons, public as $$
declare
  tpl record; created int := 0; guard int; occ_date date; dow int;
  root_due timestamptz; def_due timestamptz; run_root uuid; new_id uuid; parent_new uuid;
  idmap jsonb; def record;
begin
  for tpl in
    select * from commons.nodes
    where kind = 'task' and recurrence is not null and template_id is null
      and occurrence_date is null and next_run is not null
  loop
    guard := 0;
    while tpl.next_run <= now() and guard < 400 loop
      occ_date := (tpl.next_run)::date;
      dow := extract(dow from occ_date)::int;

      update commons.nodes set status = 'missed'
       where status in ('open','in_progress') and occurrence_date is not null
         and id in (
           with recursive runs as (
             select id from commons.nodes
               where template_id = tpl.id and occurrence_date is not null and occurrence_date < occ_date
             union all
             select c.id from commons.nodes c join runs r on c.parent_id = r.id
           ) select id from runs
         );

      root_due := occ_date + coalesce((tpl.recurrence->>'time')::time, time '20:00');
      if extract(hour from root_due) < 8 then root_due := root_due + interval '1 day'; end if;
      insert into commons.nodes
        (workspace_id, parent_id, kind, title, description, status, owner_id, due_date,
         occurrence_date, template_id, position, created_by, confirm_on_complete)
      values
        (tpl.workspace_id, tpl.id, 'task', tpl.title, tpl.description, 'open', tpl.owner_id, root_due,
         occ_date, tpl.id, tpl.position, tpl.created_by, tpl.confirm_on_complete)
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
             occurrence_date, template_id, position, created_by, confirm_on_complete)
          values
            (def.workspace_id, parent_new, 'task', def.title, def.description, 'open', def.owner_id,
             def.role_ids, def_due, occ_date, def.id, def.position, def.created_by, def.confirm_on_complete)
          returning id into new_id;
          idmap := idmap || jsonb_build_object(def.id::text, new_id::text);
        end if;
      end loop;

      tpl.next_run := commons.next_occurrence(tpl.next_run, tpl.recurrence);
      guard := guard + 1;
    end loop;
    update commons.nodes set next_run = tpl.next_run where id = tpl.id;
  end loop;
  return created;
end;
$$;

-- ── clone_node: copy confirm_on_complete onto the clone root + descendants ──
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
     due_date, start_date, recurrence, next_run, day_mask, due_time, position, created_by, confirm_on_complete)
  values
    (src.workspace_id, src.parent_id, src.kind, src.title || ' (עותק)', src.description, src.status,
     src.owner_id, src.role_ids, src.due_date, src.start_date, src.recurrence, nrun, src.day_mask,
     src.due_time, src.position + 1, auth.uid(), src.confirm_on_complete)
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
       due_date, start_date, recurrence, day_mask, due_time, position, created_by, confirm_on_complete)
    values
      (rec.workspace_id, parent_new, rec.kind, rec.title, rec.description, rec.status, rec.owner_id,
       rec.role_ids, rec.due_date, rec.start_date, null, rec.day_mask, rec.due_time, rec.position, auth.uid(),
       rec.confirm_on_complete)
    returning id into new_id;
    idmap := idmap || jsonb_build_object(rec.id::text, new_id::text);
  end loop;

  return new_root;
end;
$$;
