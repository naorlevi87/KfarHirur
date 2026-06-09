-- supabase/migrations/20260611120000_commons_node_permissions.sql
-- Commons task permissions: writes split by kind (tasks → manager/admin, folders → admin),
-- while any active member may still complete a task via a SECURITY DEFINER status RPC.

-- Replace the prior model (members could write tasks; admins managed areas) with a kind-based split.
drop policy if exists "members write nodes" on commons.nodes;
drop policy if exists "members manage tasks" on commons.nodes;
drop policy if exists "admins manage areas" on commons.nodes;
drop policy if exists "managers write tasks" on commons.nodes;
drop policy if exists "admins write nodes" on commons.nodes;

create policy "managers write tasks" on commons.nodes
  for all
  using (commons.my_permission(workspace_id) in ('admin','manager') and kind = 'task')
  with check (commons.my_permission(workspace_id) in ('admin','manager') and kind = 'task');

create policy "admins write nodes" on commons.nodes
  for all
  using (commons.my_permission(workspace_id) = 'admin')
  with check (commons.my_permission(workspace_id) = 'admin');

-- Members complete/reopen tasks without table-write rights. Status-only; validates membership + kind.
create or replace function commons.set_node_status(node_id uuid, new_status text)
returns commons.nodes
language plpgsql security definer set search_path = commons, public
as $$
declare result commons.nodes;
begin
  if new_status not in ('open','in_progress','done') then
    raise exception 'invalid status: %', new_status;
  end if;
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if result.kind <> 'task' then raise exception 'not a task'; end if;
  if not commons.is_active_member(result.workspace_id) then raise exception 'not a member'; end if;
  update commons.nodes set status = new_status where id = node_id returning * into result;
  return result;
end;
$$;

grant execute on function commons.set_node_status(uuid, text) to authenticated;
