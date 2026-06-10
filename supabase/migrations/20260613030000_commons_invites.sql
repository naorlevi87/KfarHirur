-- supabase/migrations/20260613030000_commons_invites.sql
-- Consent-based project invites: an admin creates an invite (email + level + skills); a membership is
-- created only when the invitee approves. Reconciliation is by email (provider-agnostic: Google /
-- Facebook / email all match auth.email()). The invite also reports whether the email already has a
-- site account, so the email copy can be tailored ("join the project" vs "sign up + join").

create table if not exists commons.invites (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references commons.workspaces(id) on delete cascade,
  email            text not null,
  permission_level text not null default 'member' check (permission_level in ('admin','manager','member')),
  role_ids         uuid[] not null default '{}',
  token            text not null unique,
  status           text not null default 'pending' check (status in ('pending','accepted','declined')),
  invited_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists invites_workspace_idx on commons.invites(workspace_id);
create index if not exists invites_email_idx on commons.invites(lower(email));

alter table commons.invites enable row level security;

-- Admins of the workspace manage its invites (list / resend / cancel).
drop policy if exists "admins manage invites" on commons.invites;
create policy "admins manage invites" on commons.invites
  for all using (commons.my_permission(workspace_id) = 'admin')
  with check (commons.my_permission(workspace_id) = 'admin');

-- ── Create (admin-gated). Returns the token + whether the email already has a site account.
-- Replaces any existing pending invite for the same email in this workspace.
create or replace function commons.create_invite(p_workspace_id uuid, p_email text, p_level text, p_role_ids uuid[])
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
  insert into commons.invites(workspace_id, email, permission_level, role_ids, token, invited_by)
    values (p_workspace_id, lower(p_email), p_level, coalesce(p_role_ids, '{}'), new_token, auth.uid());

  select exists(select 1 from auth.users where lower(email) = lower(p_email)) into has_account;
  return json_build_object('token', new_token, 'has_account', has_account);
end;
$$;
grant execute on function commons.create_invite(uuid, text, text, uuid[]) to authenticated;

-- ── See my pending invites (matched by my verified email). Joined for display.
create or replace function commons.my_pending_invites()
returns table (token text, workspace_id uuid, workspace_name text, workspace_slug text,
               permission_level text, role_names text[])
language sql security definer set search_path = commons, public, auth
as $$
  select i.token, i.workspace_id, w.name, w.slug, i.permission_level,
         coalesce(array_agg(r.name) filter (where r.name is not null), '{}')
  from commons.invites i
  join commons.workspaces w on w.id = i.workspace_id
  left join commons.roles r on r.id = any(i.role_ids)
  where i.status = 'pending' and lower(i.email) = lower(auth.email())
  group by i.token, i.workspace_id, w.name, w.slug, i.permission_level;
$$;
grant execute on function commons.my_pending_invites() to authenticated;

-- ── Accept: create the active membership + skills from the invite, mark it accepted. Idempotent.
create or replace function commons.accept_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = commons, public, auth
as $$
declare inv commons.invites; mid uuid;
begin
  select * into inv from commons.invites where token = p_token and status = 'pending';
  if not found then raise exception 'invite not found'; end if;
  if lower(inv.email) <> lower(auth.email()) then raise exception 'email mismatch'; end if;

  insert into commons.workspace_members(workspace_id, user_id, permission_level, status, display_name)
    values (inv.workspace_id, auth.uid(), inv.permission_level, 'active', split_part(auth.email(), '@', 1))
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

-- ── Decline: mark the invite declined (no membership).
create or replace function commons.decline_invite(p_token text)
returns void
language plpgsql security definer set search_path = commons, public, auth
as $$
begin
  update commons.invites set status = 'declined'
    where token = p_token and status = 'pending' and lower(email) = lower(auth.email());
end;
$$;
grant execute on function commons.decline_invite(text) to authenticated;
