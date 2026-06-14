-- supabase/migrations/20260614020000_commons_unclaim.sql
-- Release a task's owner. A member may remove THEMSELVES (status-style action, no table-write right);
-- managers/admins may clear anyone. Pairs with claim_node ("עלי"). Admin reassignment to a specific
-- person uses a normal table update (managers/admins already have write via RLS).
create or replace function commons.unclaim_node(node_id uuid)
returns commons.nodes language plpgsql security definer set search_path = commons, public as $$
declare result commons.nodes; mid uuid;
begin
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if not commons.is_active_member(result.workspace_id) then raise exception 'not a member'; end if;
  select id into mid from commons.workspace_members
    where workspace_id = result.workspace_id and user_id = auth.uid() and status = 'active' limit 1;
  if commons.my_permission(result.workspace_id) not in ('admin','manager')
     and result.owner_id is distinct from mid then
    raise exception 'not allowed';
  end if;
  update commons.nodes set owner_id = null where id = node_id returning * into result;
  return result;
end;
$$;

grant execute on function commons.unclaim_node(uuid) to authenticated;
