-- supabase/migrations/20260612120000_commons_invite_names.sql
-- Capture the invitee's first + last name at invite time so a new member arrives with a real name
-- instead of the email prefix. The admin already knows who they're inviting, so the name is collected
-- in the invite dialog; accept_invite seeds the membership from it (email prefix kept only as a
-- safety fallback for invites created before this migration).

alter table commons.invites
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- ── Create (admin-gated). Now carries first/last name. Replaces the 4-arg version.
drop function if exists commons.create_invite(uuid, text, text, uuid[]);
create or replace function commons.create_invite(
  p_workspace_id uuid, p_email text, p_level text, p_role_ids uuid[],
  p_first_name text, p_last_name text)
returns json
language plpgsql security definer set search_path = commons, public, auth
as $$
declare new_token text; has_account boolean;
begin
  if commons.my_permission(p_workspace_id) <> 'admin' then raise exception 'not an admin'; end if;
  if p_level not in ('admin','manager','member') then raise exception 'bad level'; end if;

  delete from commons.invites
    where workspace_id = p_workspace_id and lower(email) = lower(p_email) and status = 'pending';

  new_token := replace(gen_random_uuid()::text, '-', '');
  insert into commons.invites(workspace_id, email, permission_level, role_ids, token, invited_by, first_name, last_name)
    values (p_workspace_id, lower(p_email), p_level, coalesce(p_role_ids, '{}'), new_token, auth.uid(),
            nullif(btrim(p_first_name), ''), nullif(btrim(p_last_name), ''));

  select exists(select 1 from auth.users where lower(email) = lower(p_email)) into has_account;
  return json_build_object('token', new_token, 'has_account', has_account);
end;
$$;
grant execute on function commons.create_invite(uuid, text, text, uuid[], text, text) to authenticated;

-- ── Accept: seed the membership name from the invite (fallback to email prefix for old invites).
create or replace function commons.accept_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = commons, public, auth
as $$
declare inv commons.invites; mid uuid;
begin
  select * into inv from commons.invites where token = p_token and status = 'pending';
  if not found then raise exception 'invite not found'; end if;
  if lower(inv.email) <> lower(auth.email()) then raise exception 'email mismatch'; end if;

  insert into commons.workspace_members(workspace_id, user_id, permission_level, status, display_name, last_name)
    values (inv.workspace_id, auth.uid(), inv.permission_level, 'active',
            coalesce(inv.first_name, split_part(auth.email(), '@', 1)), inv.last_name)
    on conflict (workspace_id, user_id)
      do update set status = 'active', permission_level = excluded.permission_level
    returning id into mid;

  insert into commons.member_roles(member_id, role_id)
    select mid, rid from unnest(inv.role_ids) rid
    on conflict do nothing;

  update commons.invites set status = 'accepted' where id = inv.id;
  return inv.workspace_id;
end;
$$;
grant execute on function commons.accept_invite(text) to authenticated;
