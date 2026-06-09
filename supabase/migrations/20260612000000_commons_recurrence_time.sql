-- supabase/migrations/20260612000000_commons_recurrence_time.sql
-- Recurrence under the operational day: templates generate at the op-day start (next_run = 08:00),
-- each occurrence is due that day at the rule's time-of-day (rolling past midnight for pre-08:00 times).

create or replace function commons.run_recurrences()
returns integer
language plpgsql security definer set search_path = commons, public
as $$
declare
  tpl record; created int := 0; guard int; occ_due timestamptz;
begin
  for tpl in
    select * from commons.nodes
    where kind = 'task' and recurrence is not null and template_id is null and next_run is not null
  loop
    guard := 0;
    while tpl.next_run <= now() and guard < 400 loop
      occ_due := date_trunc('day', tpl.next_run) + coalesce((tpl.recurrence->>'time')::time, time '20:00');
      if extract(hour from occ_due) < 8 then occ_due := occ_due + interval '1 day'; end if;

      update commons.nodes set status = 'missed'
        where template_id = tpl.id and status in ('open','in_progress') and due_date < occ_due;

      insert into commons.nodes
        (workspace_id, parent_id, kind, title, description, status, owner_id, due_date, template_id, position, created_by)
      values
        (tpl.workspace_id, tpl.parent_id, 'task', tpl.title, tpl.description, 'open',
         tpl.owner_id, occ_due, tpl.id, tpl.position, tpl.created_by);
      created := created + 1;

      tpl.next_run := commons.next_occurrence(tpl.next_run, tpl.recurrence);
      guard := guard + 1;
    end loop;
    update commons.nodes set next_run = tpl.next_run where id = tpl.id;
  end loop;
  return created;
end;
$$;

select cron.schedule('commons-recurrences', '0 8 * * *', $$ select commons.run_recurrences(); $$);
