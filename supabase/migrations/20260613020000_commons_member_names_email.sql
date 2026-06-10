-- supabase/migrations/20260613020000_commons_member_names_email.sql
-- Member management needs a family name and, for admins, each member's email + join date.
-- display_name holds the first name; last_name is new. Email lives in auth.users, so it is exposed
-- only through an admin-gated SECURITY DEFINER function (never via direct table access).

alter table commons.workspace_members add column if not exists last_name text;

create or replace function commons.list_members(p_workspace_id uuid)
returns table (
  id uuid, user_id uuid, display_name text, last_name text,
  permission_level text, status text, created_at timestamptz, email text
)
language sql security definer set search_path = commons, public, auth
as $$
  select wm.id, wm.user_id, wm.display_name, wm.last_name,
         wm.permission_level, wm.status, wm.created_at, u.email
  from commons.workspace_members wm
  join auth.users u on u.id = wm.user_id
  where wm.workspace_id = p_workspace_id
    and wm.status = 'active'
    and commons.my_permission(p_workspace_id) = 'admin'
  order by wm.display_name nulls last, wm.created_at;
$$;

grant execute on function commons.list_members(uuid) to authenticated;
