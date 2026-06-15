-- supabase/migrations/20260614110000_commons_entries_cleanup.sql
-- Privacy data-minimization: a recurring run's "מה קרה כאן" log is ephemeral. 30 days after a run's
-- day, delete its entries AND their storage objects. One-off tasks (occurrence_date null) are kept.
-- Scheduled on pg_cron (cron.schedule upserts by job name, so re-running is safe).

create or replace function commons.cleanup_old_run_entries()
returns integer language plpgsql security definer set search_path = commons, public as $$
declare n int;
begin
  -- 1) remove storage objects referenced by old run-instance photo/file entries
  delete from storage.objects o
   using commons.node_entries e
   join commons.nodes nd on nd.id = e.node_id
   where o.bucket_id = 'commons-attachments'
     and e.kind in ('photo','file')
     and o.name = e.url
     and nd.occurrence_date is not null
     and nd.occurrence_date < (now()::date - 30);

  -- 2) remove the entries themselves (all kinds) for old run instances
  delete from commons.node_entries e
   using commons.nodes nd
   where e.node_id = nd.id
     and nd.occurrence_date is not null
     and nd.occurrence_date < (now()::date - 30);
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function commons.cleanup_old_run_entries() to service_role;

select cron.schedule('commons-cleanup-run-entries', '30 8 * * *',
  $$ select commons.cleanup_old_run_entries(); $$);
