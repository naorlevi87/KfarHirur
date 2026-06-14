-- supabase/migrations/20260614060000_commons_drop_due_kind.sql
-- Drop the short-lived due_kind toggle column — superseded by the two-date window
-- (start_date "בתאריך" + due_date "עד"). Never used in production.
alter table commons.nodes drop constraint if exists nodes_due_kind_check;
alter table commons.nodes drop column if exists due_kind;
