-- Commons: resolve_missed gains an optional WHEN (done_at).
-- "זה כן קרה" can now record both WHO did it and WHEN it actually happened. Backwards-compatible:
-- done_at defaults to now(), so existing one-tap resolves are unchanged. completed_late is recomputed
-- against the chosen time. Design: docs/superpowers/specs/2026-06-16-commons-snapshot-screen-design.md

drop function if exists commons.resolve_missed(uuid, uuid);

create function commons.resolve_missed(node_id uuid, did_by uuid, done_at timestamptz default null)
returns commons.nodes language plpgsql security definer set search_path = commons, public as $$
declare result commons.nodes; ts timestamptz;
begin
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if result.kind <> 'task' then raise exception 'not a task'; end if;
  if not commons.is_active_member(result.workspace_id) then raise exception 'not a member'; end if;
  if did_by is not null and not exists (
       select 1 from commons.workspace_members where id = did_by and workspace_id = result.workspace_id) then
    raise exception 'invalid member';
  end if;
  ts := coalesce(done_at, now());
  update commons.nodes set status = 'done', completed_by = did_by, completed_at = ts,
         completed_late = (result.due_date is not null and ts > result.due_date)
   where id = node_id returning * into result;
  return result;
end;
$$;

grant execute on function commons.resolve_missed(uuid, uuid, timestamptz) to authenticated;
