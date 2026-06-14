-- supabase/migrations/20260614040000_commons_due_kind.sql
-- A dated one-off task means one of two things, which place it differently in the temporal bands:
--   'on'  — scheduled FOR that day (happens on it) → future until the day, then today.
--   'by'  — a DEADLINE (do any time up to it) → actionable now, lives in "today" until done/overdue.
-- Null is treated as 'by' (the common "do this by X" case) by the UI. Only meaningful with due_date.
alter table commons.nodes add column if not exists due_kind text;
alter table commons.nodes drop constraint if exists nodes_due_kind_check;
alter table commons.nodes add constraint nodes_due_kind_check
  check (due_kind is null or due_kind in ('on','by'));
