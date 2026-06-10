-- supabase/migrations/20260613000000_commons_node_role.sql
-- Skills gate task-taking: a task's required skills are nodes.role_ids (commons.roles).
-- An empty array = "כל עובד" (anyone may take it). A non-empty array is an OR set: a member is
-- eligible if they hold ANY of the listed skills. claim_node enforces this server-side.

alter table commons.nodes drop column if exists role_id;
alter table commons.nodes
  add column if not exists role_ids uuid[] not null default '{}';

-- Keep node skill sets clean when a skill is deleted (no FK on array elements).
create or replace function commons.scrub_role_from_nodes()
returns trigger
language plpgsql security definer set search_path = commons, public
as $$
begin
  update commons.nodes set role_ids = array_remove(role_ids, old.id) where old.id = any(role_ids);
  return old;
end;
$$;

drop trigger if exists roles_scrub on commons.roles;
create trigger roles_scrub
  before delete on commons.roles
  for each row execute function commons.scrub_role_from_nodes();

-- Rewritten claim: after the existing guards, require the caller to hold one of the task's skills
-- (when the task lists any). An empty role_ids set means anyone may take it.
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

  if array_length(result.role_ids, 1) is not null
     and not exists (select 1 from commons.member_roles mr
                     where mr.member_id = mid and mr.role_id = any(result.role_ids)) then
    raise exception 'missing skill';
  end if;

  update commons.nodes set owner_id = mid where id = node_id returning * into result;
  return result;
end;
$$;

grant execute on function commons.claim_node(uuid) to authenticated;
