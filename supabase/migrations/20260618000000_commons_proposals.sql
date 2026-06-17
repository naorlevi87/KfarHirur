-- supabase/migrations/20260618000000_commons_proposals.sql
-- The flat "מציע ל-X" invite (snapshot step 5). Replaces the manager-only direct-assign ("עליו") with a
-- non-hierarchical invitation any active member can send: suggest a free task to a teammate; they accept
-- (it becomes theirs) or pass (back to open). Members can't write owner_id/proposed_to directly under RLS,
-- so both ops are SECURITY DEFINER and member-allowed.
--   propose_node     — any active member; mark a free (unowned) task as proposed to another active member.
--   respond_proposal — only the proposed member; accept → owner_id = me + clear; pass → clear only.
-- A proposal is a SOFT marker: the task stays open, so anyone can still claim it or re-suggest it. A fresh
-- claim clears any pending proposal (claim_node, below) so a taken task never carries a dangling invite.
-- Design: docs/superpowers/specs/2026-06-16-commons-snapshot-screen-design.md §6 ·
--         docs/superpowers/handoffs/D-snapshot-invite.md

alter table commons.nodes add column if not exists proposed_to uuid references commons.workspace_members(id) on delete set null;
alter table commons.nodes add column if not exists proposed_by uuid references commons.workspace_members(id) on delete set null;
alter table commons.nodes add column if not exists proposed_at timestamptz;

-- "מציע ל-X": suggest a free task to a teammate. Any active member may send it; the target must be an
-- active member of the same workspace. An already-owned task can't be proposed (it's taken).
create or replace function commons.propose_node(node_id uuid, to_member uuid)
returns commons.nodes language plpgsql security definer set search_path = commons, public as $$
declare result commons.nodes; mid uuid;
begin
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if result.kind <> 'task' then raise exception 'not a task'; end if;
  if not commons.is_active_member(result.workspace_id) then raise exception 'not a member'; end if;
  if result.owner_id is not null then raise exception 'already owned'; end if;
  if not exists (
       select 1 from commons.workspace_members
        where id = to_member and workspace_id = result.workspace_id and status = 'active') then
    raise exception 'invalid member';
  end if;

  select id into mid from commons.workspace_members
    where workspace_id = result.workspace_id and user_id = auth.uid() and status = 'active' limit 1;

  update commons.nodes set proposed_to = to_member, proposed_by = mid, proposed_at = now()
   where id = node_id returning * into result;
  return result;
end;
$$;

-- Respond to a proposal — only the proposed member. accept → take ownership (cascades to sub-items via
-- effectiveOwner) and clear the proposal; pass → clear the proposal, leaving the task open.
create or replace function commons.respond_proposal(node_id uuid, accept boolean)
returns commons.nodes language plpgsql security definer set search_path = commons, public as $$
declare result commons.nodes; mid uuid;
begin
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if result.kind <> 'task' then raise exception 'not a task'; end if;
  if result.proposed_to is null then raise exception 'no proposal'; end if;

  select id into mid from commons.workspace_members
    where workspace_id = result.workspace_id and user_id = auth.uid() and status = 'active' limit 1;
  if mid is null or mid <> result.proposed_to then raise exception 'not the proposed member'; end if;

  if accept then
    update commons.nodes set owner_id = mid, proposed_to = null, proposed_by = null, proposed_at = null
     where id = node_id returning * into result;
  else
    update commons.nodes set proposed_to = null, proposed_by = null, proposed_at = null
     where id = node_id returning * into result;
  end if;
  return result;
end;
$$;

-- Claiming a task now also clears any pending proposal (a taken task never keeps a dangling invite).
create or replace function commons.claim_node(node_id uuid)
returns commons.nodes language plpgsql security definer set search_path = commons, public as $$
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

  update commons.nodes set owner_id = mid, proposed_to = null, proposed_by = null, proposed_at = null
   where id = node_id returning * into result;
  return result;
end;
$$;

grant execute on function commons.propose_node(uuid, uuid)     to authenticated;
grant execute on function commons.respond_proposal(uuid, boolean) to authenticated;
