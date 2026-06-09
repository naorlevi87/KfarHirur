-- supabase/migrations/20260612020000_commons_claim.sql
-- "עלי" / claim: any active member can take an UNASSIGNED task onto themselves (set owner_id to their
-- own membership). SECURITY DEFINER so members can do it without table-write rights; only works while
-- the task has no owner.

create or replace function commons.claim_node(node_id uuid)
returns commons.nodes
language plpgsql security definer set search_path = commons, public
as $$
declare result commons.nodes; mid uuid;
begin
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if result.kind <> 'task' then raise exception 'not a task'; end if;
  if not commons.is_active_member(result.workspace_id) then raise exception 'not a member'; end if;
  if result.owner_id is not null then raise exception 'already assigned'; end if;

  select id into mid from commons.workspace_members
    where workspace_id = result.workspace_id and user_id = auth.uid() and status = 'active' limit 1;
  if mid is null then raise exception 'no membership'; end if;

  update commons.nodes set owner_id = mid where id = node_id returning * into result;
  return result;
end;
$$;

grant execute on function commons.claim_node(uuid) to authenticated;
