-- supabase/migrations/20260611000000_commons_recurrence.sql
-- Commons task system — phase 2c: recurrence engine.
-- A recurring task is a TEMPLATE (recurrence set, template_id null). It generates concrete
-- occurrences (recurrence null, template_id → its template) over time. Occurrences left un-done
-- past their due become 'missed', preserving an operational record. Generation runs in SQL via
-- pg_cron so it works without the app.

create extension if not exists pg_cron;

-- Link an occurrence back to the template that spawned it. Deleting a template removes its history.
alter table commons.nodes
  add column if not exists template_id uuid references commons.nodes(id) on delete cascade;
create index if not exists nodes_template_idx on commons.nodes(template_id);

-- Advance a timestamp to the next occurrence per a recurrence rule.
-- Rule: { "freq": "daily"|"weekly"|"monthly", "interval": int>=1, "byDay": [0..6] }  (0 = Sunday).
create or replace function commons.next_occurrence(ts timestamptz, rule jsonb)
returns timestamptz
language plpgsql immutable
as $$
declare
  freq     text := rule->>'freq';
  step     int  := greatest(coalesce((rule->>'interval')::int, 1), 1);
  days     int[];
  cur_dow  int;
  d        int;
  cand     int;        -- next selected weekday, if any remain this week
  add_days int;
begin
  if freq = 'daily' then
    return ts + (step || ' days')::interval;

  elsif freq = 'monthly' then
    return ts + (step || ' months')::interval;

  elsif freq = 'weekly' then
    if rule ? 'byDay' and jsonb_array_length(rule->'byDay') > 0 then
      select array_agg(value::int order by value::int)
        into days
        from jsonb_array_elements_text(rule->'byDay') as value;
      cur_dow := extract(dow from ts)::int;   -- 0=Sun..6=Sat
      cand := null;
      foreach d in array days loop
        if d > cur_dow then cand := d; exit; end if;
      end loop;
      if cand is not null then
        add_days := cand - cur_dow;                  -- a later day this same week
      else
        add_days := step * 7 - cur_dow + days[1];    -- wrap: first selected day, `step` weeks on
      end if;
      return ts + (add_days || ' days')::interval;
    else
      return ts + (step * 7 || ' days')::interval;
    end if;
  end if;

  return ts + (step || ' days')::interval;   -- safe fallback for unknown freq
end;
$$;

-- Materialize every due occurrence, advance each template's next_run, and mark prior
-- un-done occurrences 'missed'. Returns how many occurrences were created. SECURITY DEFINER:
-- runs across all workspaces, bypassing RLS, when invoked by cron.
create or replace function commons.run_recurrences()
returns integer
language plpgsql
security definer
set search_path = commons, public
as $$
declare
  tpl     record;
  created int := 0;
  guard   int;
begin
  for tpl in
    select * from commons.nodes
    where kind = 'task'
      and recurrence is not null
      and template_id is null
      and next_run is not null
  loop
    guard := 0;
    -- Catch up across any skipped runs, capped so a far-past next_run can't run away.
    while tpl.next_run <= now() and guard < 400 loop
      update commons.nodes
         set status = 'missed'
       where template_id = tpl.id
         and status in ('open','in_progress')
         and due_date < tpl.next_run;

      insert into commons.nodes
        (workspace_id, parent_id, kind, title, description, status,
         owner_id, due_date, template_id, position, created_by)
      values
        (tpl.workspace_id, tpl.parent_id, 'task', tpl.title, tpl.description, 'open',
         tpl.owner_id, tpl.next_run, tpl.id, tpl.position, tpl.created_by);
      created := created + 1;

      tpl.next_run := commons.next_occurrence(tpl.next_run, tpl.recurrence);
      guard := guard + 1;
    end loop;

    update commons.nodes set next_run = tpl.next_run where id = tpl.id;
  end loop;

  return created;
end;
$$;

grant execute on function commons.next_occurrence(timestamptz, jsonb) to authenticated, service_role;
grant execute on function commons.run_recurrences() to service_role;

-- Daily at 03:00. cron.schedule upserts by job name (pg_cron >= 1.4), so re-running is safe.
select cron.schedule('commons-recurrences', '0 3 * * *', $$ select commons.run_recurrences(); $$);
