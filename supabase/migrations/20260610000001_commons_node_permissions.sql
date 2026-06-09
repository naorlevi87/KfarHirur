-- supabase/migrations/20260610000001_commons_node_permissions.sql
-- Split node write access: any active member manages TASKS; only admins manage AREAS
-- (containers = the workspace structure). Read stays open to all active members.

drop policy if exists "members write nodes" on commons.nodes;

-- members (any active member) create/update/delete tasks
create policy "members manage tasks" on commons.nodes
  for all
  using (commons.is_active_member(workspace_id) and kind = 'task')
  with check (commons.is_active_member(workspace_id) and kind = 'task');

-- admins create/update/delete areas (containers) — the structure
create policy "admins manage areas" on commons.nodes
  for all
  using (commons.my_permission(workspace_id) = 'admin' and kind = 'container')
  with check (commons.my_permission(workspace_id) = 'admin' and kind = 'container');
