-- supabase/migrations/20260610000002_commons_node_template_id.sql
-- A generated recurring task instance points back to its recurring template node.
-- Nullable; set null if the template is removed. (Recurrence engine wired in 2c.)

alter table commons.nodes
  add column if not exists template_id uuid references commons.nodes(id) on delete set null;

create index if not exists nodes_template_idx on commons.nodes(template_id);
