-- supabase/migrations/20260616000000_commons_node_events.sql
-- The per-node ACTIVITY LOG ("יומן פעילות"): an immutable, database-written audit trail of what
-- happened to a task — created / edited / claimed / completed / missed / deferred / cancelled / etc.
-- Clients never write it. One AFTER trigger on commons.nodes records every change and captures
-- auth.uid() as the actor (null = system, e.g. the nightly rollover). Members read; nobody edits.
-- Surfaced under a task (aggregated over its sub-tasks) in TaskViewPage, below the manual doc box.

create table if not exists commons.node_events (
  id            uuid primary key default gen_random_uuid(),
  node_id       uuid not null references commons.nodes(id) on delete cascade,
  workspace_id  uuid not null references commons.workspaces(id) on delete cascade,
  type          text not null check (type in
                  ('created','edited','claimed','unclaimed','reassigned',
                   'completed','reopened','missed','resolved','deferred','cancelled')),
  actor         uuid references commons.workspace_members(id) on delete set null,
  detail        jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists node_events_node_idx on commons.node_events(node_id, created_at desc);

alter table commons.node_events enable row level security;

-- Read: any active member of the workspace. No insert/update/delete policy — the only writer is the
-- SECURITY DEFINER trigger below (which bypasses RLS), so the log can be neither forged nor erased.
drop policy if exists "members read events" on commons.node_events;
create policy "members read events" on commons.node_events
  for select using (commons.is_active_member(workspace_id));

grant select on commons.node_events to authenticated;

-- ── The recorder ─────────────────────────────────────────────────────────────
-- Turns each task insert/update into at most one event. Two suppression rules keep it signal-only:
--   * current_setting('commons.event_suppress') = 'on'  → bulk/auto writes (run generation, clone,
--     defer-spawn) emit no 'created'/'edited' — only deliberate human adds are logged.
--   * pg_trigger_depth() > 1 on a status change          → a rollup cascade (a parent's derived
--     status), not a direct action — skipped so a parent isn't double-logged behind its leaves.
create or replace function commons.log_node_event()
returns trigger language plpgsql security definer set search_path = commons, public as $$
declare
  suppress boolean := coalesce(current_setting('commons.event_suppress', true), 'off') = 'on';
  mid uuid;
  changed text[] := '{}';
begin
  if NEW.kind <> 'task' then return null; end if;

  select id into mid from commons.workspace_members
    where workspace_id = NEW.workspace_id and user_id = auth.uid() and status = 'active' limit 1;

  if TG_OP = 'INSERT' then
    if suppress then return null; end if;
    insert into commons.node_events(node_id, workspace_id, type, actor)
      values (NEW.id, NEW.workspace_id, 'created', mid);
    return null;
  end if;

  -- A status transition is the dominant event; record only the directly-issued one (depth 1).
  if NEW.status is distinct from OLD.status then
    if pg_trigger_depth() > 1 then return null; end if;
    if NEW.status = 'done' and OLD.status = 'missed' then
      insert into commons.node_events(node_id, workspace_id, type, actor, detail)
        values (NEW.id, NEW.workspace_id, 'resolved', mid,
                jsonb_build_object('did_by', NEW.completed_by, 'late', true));
    elsif NEW.status = 'done' then
      insert into commons.node_events(node_id, workspace_id, type, actor, detail)
        values (NEW.id, NEW.workspace_id, 'completed', mid,
                jsonb_build_object('late', coalesce(NEW.completed_late, false)));
    elsif NEW.status in ('open','in_progress') and OLD.status = 'done' then
      insert into commons.node_events(node_id, workspace_id, type, actor)
        values (NEW.id, NEW.workspace_id, 'reopened', mid);
    elsif NEW.status = 'missed' then
      insert into commons.node_events(node_id, workspace_id, type, actor)
        values (NEW.id, NEW.workspace_id, 'missed', mid);
    elsif NEW.status = 'deferred' then
      insert into commons.node_events(node_id, workspace_id, type, actor)
        values (NEW.id, NEW.workspace_id, 'deferred', mid);
    elsif NEW.status = 'cancelled' then
      insert into commons.node_events(node_id, workspace_id, type, actor)
        values (NEW.id, NEW.workspace_id, 'cancelled', mid);
    end if;
    return null;
  end if;

  -- Owner change → claim / unclaim / reassign.
  if NEW.owner_id is distinct from OLD.owner_id then
    if OLD.owner_id is null then
      insert into commons.node_events(node_id, workspace_id, type, actor)
        values (NEW.id, NEW.workspace_id, 'claimed', mid);
    elsif NEW.owner_id is null then
      insert into commons.node_events(node_id, workspace_id, type, actor)
        values (NEW.id, NEW.workspace_id, 'unclaimed', mid);
    else
      insert into commons.node_events(node_id, workspace_id, type, actor, detail)
        values (NEW.id, NEW.workspace_id, 'reassigned', mid, jsonb_build_object('to', NEW.owner_id));
    end if;
    return null;
  end if;

  -- Any other meaningful field change → one 'edited' event naming what changed.
  if suppress then return null; end if;
  if NEW.title       is distinct from OLD.title       then changed := array_append(changed, 'title'); end if;
  if NEW.description is distinct from OLD.description  then changed := array_append(changed, 'description'); end if;
  if NEW.due_date    is distinct from OLD.due_date     then changed := array_append(changed, 'due'); end if;
  if NEW.due_time    is distinct from OLD.due_time     then changed := array_append(changed, 'time'); end if;
  if NEW.role_ids    is distinct from OLD.role_ids     then changed := array_append(changed, 'roles'); end if;
  if NEW.recurrence  is distinct from OLD.recurrence   then changed := array_append(changed, 'schedule'); end if;
  if NEW.day_mask    is distinct from OLD.day_mask     then changed := array_append(changed, 'days'); end if;
  if NEW.start_date  is distinct from OLD.start_date   then changed := array_append(changed, 'start'); end if;
  if array_length(changed, 1) is not null then
    insert into commons.node_events(node_id, workspace_id, type, actor, detail)
      values (NEW.id, NEW.workspace_id, 'edited', mid, jsonb_build_object('fields', to_jsonb(changed)));
  end if;
  return null;
end;
$$;

drop trigger if exists nodes_log_event on commons.nodes;
create trigger nodes_log_event
  after insert or update on commons.nodes
  for each row execute function commons.log_node_event();

-- ── Suppress the bulk/auto writers ───────────────────────────────────────────
-- Re-create the three generators to flag their bulk inserts as auto (no 'created' events), while
-- still letting their genuine state transitions (the nightly 'missed' sweep, a 'deferred'/'cancelled'
-- mark) flow through to the log.

-- run_recurrences: identical to 20260614030000 (look-ahead) plus event suppression bracketing the
-- generation inserts; the trailing 'missed' sweep runs with suppression OFF so misses are logged.
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
               occurrence_date, template_id, position, created_by)
            values
              (def.workspace_id, parent_new, 'task', def.title, def.description, 'open', def.owner_id,
               def.role_ids, def_due, occ_date, def.id, def.position, def.created_by)
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

-- defer_occurrence: identical to 20260614010000 plus suppression of the spawned instance's insert
-- (the 'deferred' mark on the original is logged; the respawn is not a separate "created").
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
    perform set_config('commons.event_suppress', 'on', true);
    insert into commons.nodes
      (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
       due_date, occurrence_date, template_id, position, created_by)
    values
      (n.workspace_id, n.parent_id, 'task', n.title, n.description, 'open', n.owner_id, n.role_ids,
       new_due, to_date, n.template_id, n.position, n.created_by);
    perform set_config('commons.event_suppress', 'off', true);
  end if;

  select * into n from commons.nodes where id = node_id;
  return n;
end;
$$;

-- clone_node: identical to 20260614070000 plus full suppression — a copy operation seeds no activity.
create or replace function commons.clone_node(node_id uuid)
returns uuid language plpgsql security definer set search_path = commons, public as $$
declare
  src commons.nodes; new_root uuid; idmap jsonb; rec record; new_id uuid; parent_new uuid; nrun timestamptz;
begin
  select * into src from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if commons.my_permission(src.workspace_id) not in ('admin','manager') then raise exception 'not allowed'; end if;

  perform set_config('commons.event_suppress', 'on', true);

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

  perform set_config('commons.event_suppress', 'off', true);
  return new_root;
end;
$$;

grant execute on function commons.log_node_event()       to authenticated, service_role;
grant execute on function commons.run_recurrences()      to service_role;
grant execute on function commons.defer_occurrence(uuid, date) to authenticated;
grant execute on function commons.clone_node(uuid)       to authenticated;
