-- supabase/migrations/20260614000000_commons_routine_runs.sql
-- Commons recurring routines — the routine/definition/run model.
--
-- A node is a DEFINITION (occurrence_date null) or an INSTANCE (occurrence_date set).
-- Only a routine root carries `recurrence`; descendant definitions carry a `day_mask`
-- (weekday subset, 0=Sun) that must stay within the parent's days. Each operative day the
-- routine generates ONE run = a recursive clone of its definition subtree nested UNDER the
-- routine, dropping branches whose mask excludes that day. This replaces the old single-node
-- sibling clone that caused sub-tasks to duplicate beside themselves.
-- Design: docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md

-- ── 1.1 Columns, status value, index ────────────────────────────────────────
alter table commons.nodes
  add column if not exists occurrence_date date,
  add column if not exists day_mask        int[],
  add column if not exists due_time        time,
  add column if not exists completed_by    uuid references commons.workspace_members(id) on delete set null,
  add column if not exists completed_at    timestamptz,
  add column if not exists completed_late  boolean not null default false;

-- Reuse existing 'cancelled' for "לא צריך הפעם" (skip); add 'deferred'. Containers keep null.
alter table commons.nodes drop constraint if exists nodes_status_check;
alter table commons.nodes add constraint nodes_status_check
  check (status is null or status in ('open','in_progress','done','missed','cancelled','deferred'));

create index if not exists nodes_occurrence_idx
  on commons.nodes(workspace_id, occurrence_date) where occurrence_date is not null;

-- ── 1.2 Day helpers ──────────────────────────────────────────────────────────
-- The weekday universe a routine runs on: weekly+byDay -> that set; otherwise all 7 days.
create or replace function commons.routine_days(rule jsonb)
returns int[] language sql immutable as $$
  select case
    when rule->>'freq' = 'weekly' and jsonb_array_length(coalesce(rule->'byDay','[]'::jsonb)) > 0
      then (select array_agg(value::int order by value::int)
              from jsonb_array_elements_text(rule->'byDay') as value)
    else array[0,1,2,3,4,5,6]
  end;
$$;

-- The weekdays a node actually participates on: the routine root's days, intersected with every
-- non-null day_mask along the chain from the root down to the node. Nodes outside any routine -> all 7.
create or replace function commons.effective_days(node_id uuid)
returns int[] language plpgsql stable set search_path = commons, public as $$
declare
  chain    commons.nodes[] := '{}';
  n        commons.nodes;
  cur      uuid := node_id;
  days     int[];
  root_rec jsonb := null;
begin
  while cur is not null loop
    select * into n from commons.nodes where id = cur;
    if not found then exit; end if;
    chain := array_prepend(n, chain);      -- ends up root..node order
    if n.recurrence is not null then root_rec := n.recurrence; exit; end if;
    cur := n.parent_id;
  end loop;

  if root_rec is null then return array[0,1,2,3,4,5,6]; end if;

  days := commons.routine_days(root_rec);
  foreach n in array chain loop
    if n.day_mask is not null then
      days := (select array_agg(d order by d) from unnest(days) d where d = any(n.day_mask));
    end if;
  end loop;
  return coalesce(days, '{}');
end;
$$;

-- ── 1.3 Guard: recurrence only on definitions, and never nested ──────────────
create or replace function commons.guard_recurrence()
returns trigger language plpgsql set search_path = commons, public as $$
declare anc uuid;
begin
  if new.recurrence is null then return new; end if;
  if new.occurrence_date is not null then
    raise exception 'recurrence is only allowed on definitions (occurrence_date must be null)';
  end if;
  anc := new.parent_id;
  while anc is not null loop
    perform 1 from commons.nodes where id = anc and recurrence is not null;
    if found then raise exception 'recurrence cannot nest: ancestor % already recurs', anc; end if;
    select parent_id into anc from commons.nodes where id = anc;
  end loop;
  return new;
end;
$$;

drop trigger if exists nodes_guard_recurrence on commons.nodes;
create trigger nodes_guard_recurrence
  before insert or update of recurrence, parent_id on commons.nodes
  for each row execute function commons.guard_recurrence();

-- ── 1.4 Guard: a child's day_mask must stay within its parent's days ─────────
create or replace function commons.guard_day_mask()
returns trigger language plpgsql set search_path = commons, public as $$
declare parent_days int[];
begin
  if new.day_mask is null or new.parent_id is null then return new; end if;
  parent_days := commons.effective_days(new.parent_id);
  if not (new.day_mask <@ parent_days) then
    raise exception 'day_mask % exceeds parent days %', new.day_mask, parent_days;
  end if;
  return new;
end;
$$;

drop trigger if exists nodes_guard_day_mask on commons.nodes;
create trigger nodes_guard_day_mask
  before insert or update of day_mask, parent_id on commons.nodes
  for each row execute function commons.guard_day_mask();

-- ── 1.5 Recursive run generation ─────────────────────────────────────────────
-- For each due routine, materialize one run per operative day: a run root nested UNDER the
-- routine, plus a depth-ordered clone of every participating definition descendant (mapped onto
-- the cloned tree via idmap). Prior un-done instances become 'missed'. SECURITY DEFINER: runs
-- across all workspaces from pg_cron, bypassing RLS.
create or replace function commons.run_recurrences()
returns integer language plpgsql security definer set search_path = commons, public as $$
declare
  tpl      record;
  created  int := 0;
  guard    int;
  occ_date date;
  dow      int;
  root_due timestamptz;
  def_due  timestamptz;
  run_root uuid;
  new_id   uuid;
  parent_new uuid;
  idmap    jsonb;
  def      record;
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

      -- prior un-done instances of THIS routine -> missed (run roots + their descendants)
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

      -- run root (due at the routine's time-of-day; pre-08:00 rolls to next day)
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

      -- clone participating definition descendants, parents before children
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

      tpl.next_run := commons.next_occurrence(tpl.next_run, tpl.recurrence);
      guard := guard + 1;
    end loop;
    update commons.nodes set next_run = tpl.next_run where id = tpl.id;
  end loop;
  return created;
end;
$$;

grant execute on function commons.routine_days(jsonb)   to authenticated, service_role;
grant execute on function commons.effective_days(uuid)  to authenticated, service_role;
grant execute on function commons.run_recurrences()     to service_role;
