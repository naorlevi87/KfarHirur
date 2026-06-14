-- supabase/migrations/20260614050000_commons_start_date.sql
-- A one-off task can carry a window: a start ("בתאריך", when it becomes actionable) and/or a
-- deadline (due_date, "עד", the latest). Two independent optional dates replace the earlier on/by
-- toggle (due_kind), which is now unused. Placement:
--   start_date in the future  → מה יהיה (under start_date)
--   started / no start        → מה היום (actionable), "עד <due_date>" if a deadline is set
alter table commons.nodes add column if not exists start_date date;
