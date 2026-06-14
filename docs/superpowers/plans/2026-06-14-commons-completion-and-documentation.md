# Commons Completion + Documentation — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox (`- [ ]`) syntax.
> **No unit-test suite exists** in this repo. "Verify" steps are `npm run lint`, `npm run build`,
> and manual dev-server checks. SQL is applied with `node --env-file=.env.local scripts/run-sql.mjs <file>`.

**Goal:** Add a per-task completion-confirmation moment (with an optional note) and a per-occurrence
"מה קרה כאן" documentation log (notes/photos/links/files) to Commons.

**Architecture:** One new column on `commons.nodes` (`confirm_on_complete`), a new `commons.node_entries`
table with SECURITY DEFINER write RPCs, a private `commons-attachments` Storage bucket, and a pg_cron
cleanup pass. UI: a completion bottom sheet + a lazy documentation box in `TaskViewPage`, a segmented
field in `TaskFormPage`. All data access stays behind `src/data/commons/` + hooks (data-source opacity).

**Tech Stack:** React 19, Vite, motion/react, Supabase (Postgres `commons` schema, RLS, Storage, pg_cron).

**Spec:** `docs/superpowers/specs/2026-06-14-commons-completion-and-documentation-design.md`

**Commands (Windows / Hebrew-path workaround — use PowerShell tool, never Bash for npm):**
```
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/<file>.sql
```

---

## Task 1: Migration — `confirm_on_complete` column + carry it in clone/generate

**Files:**
- Create: `supabase/migrations/20260614080000_commons_confirm_on_complete.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260614080000_commons_confirm_on_complete.sql
-- Per-task completion style. true = "עם אישור" (confirm sheet + optional note); false = "בקליק".
-- Default true. The flag must be carried wherever a node is deep-copied: run_recurrences (run root +
-- each cloned descendant) and clone_node (clone root + descendants).

alter table commons.nodes
  add column if not exists confirm_on_complete boolean not null default true;

-- ── run_recurrences: copy confirm_on_complete onto every generated instance ──
create or replace function commons.run_recurrences()
returns integer language plpgsql security definer set search_path = commons, public as $$
declare
  tpl record; created int := 0; guard int; occ_date date; dow int;
  root_due timestamptz; def_due timestamptz; run_root uuid; new_id uuid; parent_new uuid;
  idmap jsonb; def record;
begin
  for tpl in
    select * from commons.nodes
    where kind = 'task' and recurrence is not null and template_id is null
      and occurrence_date is null and next_run is not null
  loop
    guard := 0;
    while tpl.next_run <= now() and guard < 400 loop
      occ_date := (tpl.next_run)::date;
      dow := extract(dow from occ_date)::int;

      update commons.nodes set status = 'missed'
       where status in ('open','in_progress') and occurrence_date is not null
         and id in (
           with recursive runs as (
             select id from commons.nodes
               where template_id = tpl.id and occurrence_date is not null and occurrence_date < occ_date
             union all
             select c.id from commons.nodes c join runs r on c.parent_id = r.id
           ) select id from runs
         );

      root_due := occ_date + coalesce((tpl.recurrence->>'time')::time, time '20:00');
      if extract(hour from root_due) < 8 then root_due := root_due + interval '1 day'; end if;
      insert into commons.nodes
        (workspace_id, parent_id, kind, title, description, status, owner_id, due_date,
         occurrence_date, template_id, position, created_by, confirm_on_complete)
      values
        (tpl.workspace_id, tpl.id, 'task', tpl.title, tpl.description, 'open', tpl.owner_id, root_due,
         occ_date, tpl.id, tpl.position, tpl.created_by, tpl.confirm_on_complete)
      returning id into run_root;
      created := created + 1;
      idmap := jsonb_build_object(tpl.id::text, run_root::text);

      for def in
        with recursive defs as (
          select n.*, 1 as depth from commons.nodes n
            where n.parent_id = tpl.id and n.occurrence_date is null
          union all
          select n.*, d.depth + 1 from commons.nodes n
            join defs d on n.parent_id = d.id where n.occurrence_date is null
        ) select * from defs order by depth, position, created_at
      loop
        if dow = any (commons.effective_days(def.id)) then
          parent_new := coalesce((idmap->>def.parent_id::text)::uuid, run_root);
          def_due := occ_date + coalesce(def.due_time, (tpl.recurrence->>'time')::time, time '20:00');
          if extract(hour from def_due) < 8 then def_due := def_due + interval '1 day'; end if;
          insert into commons.nodes
            (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids, due_date,
             occurrence_date, template_id, position, created_by, confirm_on_complete)
          values
            (def.workspace_id, parent_new, 'task', def.title, def.description, 'open', def.owner_id,
             def.role_ids, def_due, occ_date, def.id, def.position, def.created_by, def.confirm_on_complete)
          returning id into new_id;
          idmap := idmap || jsonb_build_object(def.id::text, new_id::text);
        end if;
      end loop;

      tpl.next_run := commons.next_occurrence(tpl.next_run, tpl.recurrence);
      guard := guard + 1;
    end loop;
    update commons.nodes set next_run = tpl.next_run where id = tpl.id;
  end loop;
  return created;
end;
$$;

-- ── clone_node: copy confirm_on_complete onto the clone root + descendants ──
create or replace function commons.clone_node(node_id uuid)
returns uuid language plpgsql security definer set search_path = commons, public as $$
declare
  src commons.nodes; new_root uuid; idmap jsonb; rec record; new_id uuid; parent_new uuid; nrun timestamptz;
begin
  select * into src from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if commons.my_permission(src.workspace_id) not in ('admin','manager') then raise exception 'not allowed'; end if;

  nrun := case when src.recurrence is not null
            then ((case when extract(hour from now()) < 8 then now() - interval '1 day' else now() end)::date)::timestamptz
            else null end;

  insert into commons.nodes
    (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
     due_date, start_date, recurrence, next_run, day_mask, due_time, position, created_by, confirm_on_complete)
  values
    (src.workspace_id, src.parent_id, src.kind, src.title || ' (עותק)', src.description, src.status,
     src.owner_id, src.role_ids, src.due_date, src.start_date, src.recurrence, nrun, src.day_mask,
     src.due_time, src.position + 1, auth.uid(), src.confirm_on_complete)
  returning id into new_root;
  idmap := jsonb_build_object(src.id::text, new_root::text);

  for rec in
    with recursive sub as (
      select n.*, 1 as depth from commons.nodes n where n.parent_id = src.id and n.occurrence_date is null
      union all
      select n.*, s.depth + 1 from commons.nodes n join sub s on n.parent_id = s.id where n.occurrence_date is null
    ) select * from sub order by depth, position, created_at
  loop
    parent_new := coalesce((idmap->>rec.parent_id::text)::uuid, new_root);
    insert into commons.nodes
      (workspace_id, parent_id, kind, title, description, status, owner_id, role_ids,
       due_date, start_date, recurrence, day_mask, due_time, position, created_by, confirm_on_complete)
    values
      (rec.workspace_id, parent_new, rec.kind, rec.title, rec.description, rec.status, rec.owner_id,
       rec.role_ids, rec.due_date, rec.start_date, null, rec.day_mask, rec.due_time, rec.position, auth.uid(),
       rec.confirm_on_complete)
    returning id into new_id;
    idmap := idmap || jsonb_build_object(rec.id::text, new_id::text);
  end loop;

  return new_root;
end;
$$;
```

- [ ] **Step 2: Apply it**

Run: `node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/20260614080000_commons_confirm_on_complete.sql`
Expected: JSON `[]` (success, no rows). No error.

- [ ] **Step 3: Verify column exists**

Run: `node --env-file=.env.local scripts/run-sql.mjs --query "select column_name from information_schema.columns where table_schema='commons' and table_name='nodes' and column_name='confirm_on_complete'"`
Expected: one row `confirm_on_complete`.

- [ ] **Step 4: Commit**

```
git add supabase/migrations/20260614080000_commons_confirm_on_complete.sql
git commit -m "feat(commons): confirm_on_complete column; carry it in run_recurrences + clone_node"
```

---

## Task 2: Migration — `node_entries` table + RLS + write RPCs

**Files:**
- Create: `supabase/migrations/20260614090000_commons_node_entries.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260614090000_commons_node_entries.sql
-- The "מה קרה כאן" per-node documentation log. Entries attach to a node (any task/sub-task; for
-- routines this is the per-occurrence instance). Everyone in the workspace reads; only managers
-- delete. Writes go through SECURITY DEFINER RPCs (members can't write the table directly).

create table if not exists commons.node_entries (
  id            uuid primary key default gen_random_uuid(),
  node_id       uuid not null references commons.nodes(id) on delete cascade,
  workspace_id  uuid not null references commons.workspaces(id) on delete cascade,
  kind          text not null check (kind in ('note','link','photo','file')),
  body          text,
  url           text,
  file_name     text,
  file_size     int,
  mime          text,
  is_completion boolean not null default false,
  created_by    uuid references commons.workspace_members(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists node_entries_node_idx on commons.node_entries(node_id, created_at desc);

alter table commons.node_entries enable row level security;

-- Read: any active member of the workspace. (Writes/deletes use SECURITY DEFINER RPCs, which bypass RLS.)
drop policy if exists "members read entries" on commons.node_entries;
create policy "members read entries" on commons.node_entries
  for select using (commons.is_active_member(workspace_id));

-- Add an entry. Resolves workspace + caller membership server-side (mirrors claim_node).
create or replace function commons.add_node_entry(
  p_node_id uuid, p_kind text, p_body text, p_url text,
  p_file_name text, p_file_size int, p_mime text, p_is_completion boolean
) returns commons.node_entries
language plpgsql security definer set search_path = commons, public as $$
declare wid uuid; mid uuid; result commons.node_entries;
begin
  select workspace_id into wid from commons.nodes where id = p_node_id;
  if wid is null then raise exception 'node not found'; end if;
  if not commons.is_active_member(wid) then raise exception 'not a member'; end if;
  if p_kind not in ('note','link','photo','file') then raise exception 'bad kind'; end if;

  select id into mid from commons.workspace_members
    where workspace_id = wid and user_id = auth.uid() and status = 'active' limit 1;
  if mid is null then raise exception 'no membership'; end if;

  insert into commons.node_entries
    (node_id, workspace_id, kind, body, url, file_name, file_size, mime, is_completion, created_by)
  values
    (p_node_id, wid, p_kind, p_body, p_url, p_file_name, p_file_size, p_mime,
     coalesce(p_is_completion, false), mid)
  returning * into result;
  return result;
end;
$$;

-- Delete an entry — manager/admin only.
create or replace function commons.delete_node_entry(p_entry_id uuid)
returns void language plpgsql security definer set search_path = commons, public as $$
declare wid uuid;
begin
  select workspace_id into wid from commons.node_entries where id = p_entry_id;
  if wid is null then return; end if;
  if commons.my_permission(wid) not in ('admin','manager') then raise exception 'not allowed'; end if;
  delete from commons.node_entries where id = p_entry_id;
end;
$$;

grant select on commons.node_entries to authenticated;
grant execute on function commons.add_node_entry(uuid,text,text,text,text,int,text,boolean) to authenticated;
grant execute on function commons.delete_node_entry(uuid) to authenticated;
```

- [ ] **Step 2: Apply it**

Run: `node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/20260614090000_commons_node_entries.sql`
Expected: JSON `[]`, no error.

- [ ] **Step 3: Verify table + RLS**

Run: `node --env-file=.env.local scripts/run-sql.mjs --query "select relrowsecurity from pg_class where relname='node_entries'"`
Expected: one row `true`.

- [ ] **Step 4: Commit**

```
git add supabase/migrations/20260614090000_commons_node_entries.sql
git commit -m "feat(commons): node_entries table + read RLS + add/delete RPCs"
```

---

## Task 3: Migration — `commons-attachments` Storage bucket + policies

**Files:**
- Create: `supabase/migrations/20260614100000_commons_attachments_storage.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260614100000_commons_attachments_storage.sql
-- Private bucket for documentation photos/files. Path = {workspace_id}/{node_id}/{uuid}-{filename}.
-- 5 MB cap, image+pdf+doc allowlist. Access keyed on the first path segment (workspace_id):
-- read/insert = active member, delete = manager/admin.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'commons-attachments', 'commons-attachments', false, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif','image/heic',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "commons att read" on storage.objects;
create policy "commons att read" on storage.objects for select to authenticated
  using (bucket_id = 'commons-attachments'
    and commons.is_active_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "commons att insert" on storage.objects;
create policy "commons att insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'commons-attachments'
    and commons.is_active_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "commons att delete" on storage.objects;
create policy "commons att delete" on storage.objects for delete to authenticated
  using (bucket_id = 'commons-attachments'
    and commons.my_permission(((storage.foldername(name))[1])::uuid) in ('admin','manager'));
```

- [ ] **Step 2: Apply it**

Run: `node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/20260614100000_commons_attachments_storage.sql`
Expected: JSON `[]`, no error.

- [ ] **Step 3: Verify bucket**

Run: `node --env-file=.env.local scripts/run-sql.mjs --query "select id, public, file_size_limit from storage.buckets where id='commons-attachments'"`
Expected: one row, `public=false`, `file_size_limit=5242880`.

- [ ] **Step 4: Commit**

```
git add supabase/migrations/20260614100000_commons_attachments_storage.sql
git commit -m "feat(commons): commons-attachments storage bucket + member/manager policies"
```

---

## Task 4: Migration — 30-day auto-cleanup of recurring-run logs

**Files:**
- Create: `supabase/migrations/20260614110000_commons_entries_cleanup.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260614110000_commons_entries_cleanup.sql
-- Privacy data-minimization: a recurring run's "מה קרה כאן" log is ephemeral. 30 days after a run's
-- day, delete its entries AND their storage objects. One-off tasks (occurrence_date null) are kept.
-- Scheduled on pg_cron (cron.schedule upserts by job name, so re-running is safe).

create or replace function commons.cleanup_old_run_entries()
returns integer language plpgsql security definer set search_path = commons, public as $$
declare n int;
begin
  -- 1) remove storage objects referenced by old run-instance photo/file entries
  delete from storage.objects o
   using commons.node_entries e
   join commons.nodes nd on nd.id = e.node_id
   where o.bucket_id = 'commons-attachments'
     and e.kind in ('photo','file')
     and o.name = e.url
     and nd.occurrence_date is not null
     and nd.occurrence_date < (now()::date - 30);

  -- 2) remove the entries themselves (all kinds) for old run instances
  delete from commons.node_entries e
   using commons.nodes nd
   where e.node_id = nd.id
     and nd.occurrence_date is not null
     and nd.occurrence_date < (now()::date - 30);
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function commons.cleanup_old_run_entries() to service_role;

select cron.schedule('commons-cleanup-run-entries', '30 8 * * *',
  $$ select commons.cleanup_old_run_entries(); $$);
```

- [ ] **Step 2: Apply it**

Run: `node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/20260614110000_commons_entries_cleanup.sql`
Expected: JSON with a `schedule` job id row, no error.

- [ ] **Step 3: Verify cron job + dry-run the function**

Run: `node --env-file=.env.local scripts/run-sql.mjs --query "select jobname from cron.job where jobname='commons-cleanup-run-entries'"`
Expected: one row. Then:
Run: `node --env-file=.env.local scripts/run-sql.mjs --query "select commons.cleanup_old_run_entries()"`
Expected: a single integer (0 on a fresh DB).

- [ ] **Step 4: Commit**

```
git add supabase/migrations/20260614110000_commons_entries_cleanup.sql
git commit -m "feat(commons): 30-day pg_cron cleanup of recurring-run documentation logs"
```

---

## Task 5: Add `confirm_on_complete` to the node FIELDS projection

**Files:**
- Modify: `src/data/commons/nodeQueries.js:7-8`

- [ ] **Step 1: Extend FIELDS**

Replace the `FIELDS` string so it ends with `confirm_on_complete`:

```js
const FIELDS =
  'id, workspace_id, parent_id, kind, title, description, status, owner_id, role_ids, due_date, start_date, recurrence, next_run, template_id, occurrence_date, day_mask, due_time, completed_by, completed_at, completed_late, position, created_at, updated_at, confirm_on_complete';
```

- [ ] **Step 2: Verify lint/build**

Run lint + build (see header). Expected: clean.

- [ ] **Step 3: Commit**

```
git add src/data/commons/nodeQueries.js
git commit -m "feat(commons): select confirm_on_complete in the node projection"
```

---

## Task 6: Data module — `entryQueries.js`

**Files:**
- Create: `src/data/commons/entryQueries.js`

- [ ] **Step 1: Write the module**

```js
// src/data/commons/entryQueries.js
// Reads/writes for the per-node "מה קרה כאן" documentation log + its Storage attachments.
// The data source (Supabase commons schema, RPCs, the commons-attachments bucket) stays hidden here.

import { commonsDb } from './commonsClient.js';
import { supabase } from '../core/supabaseClient.js';

const BUCKET = 'commons-attachments';

const ENTRY_FIELDS =
  'id, node_id, workspace_id, kind, body, url, file_name, file_size, mime, is_completion, created_by, created_at';

// Newest first.
export async function fetchEntries(nodeId) {
  const { data, error } = await commonsDb
    .from('node_entries')
    .select(ENTRY_FIELDS)
    .eq('node_id', nodeId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

// Add a note/link entry (no file). For photo/file, upload first (see uploadAttachment) then pass url+meta.
export async function addEntry({ nodeId, kind, body = null, url = null, fileName = null, fileSize = null, mime = null, isCompletion = false }) {
  const { data, error } = await commonsDb.rpc('add_node_entry', {
    p_node_id: nodeId, p_kind: kind, p_body: body, p_url: url,
    p_file_name: fileName, p_file_size: fileSize, p_mime: mime, p_is_completion: isCompletion,
  });
  if (error) throw error;
  return data;
}

// Upload a photo/file to {workspace_id}/{node_id}/{rand}-{name}; returns the storage path.
export async function uploadAttachment({ workspaceId, nodeId, file }) {
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const rand = crypto.randomUUID();
  const path = `${workspaceId}/${nodeId}/${rand}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (error) throw error;
  return path;
}

// A short-lived signed URL to view a private attachment.
export async function signedUrl(path, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// Delete an entry. For photo/file, remove the storage object first, then the row (manager-only RPC).
export async function deleteEntry(entry) {
  if ((entry.kind === 'photo' || entry.kind === 'file') && entry.url) {
    await supabase.storage.from(BUCKET).remove([entry.url]);
  }
  const { error } = await commonsDb.rpc('delete_node_entry', { p_entry_id: entry.id });
  if (error) throw error;
}
```

- [ ] **Step 2: Verify lint/build.** Expected: clean.

- [ ] **Step 3: Commit**

```
git add src/data/commons/entryQueries.js
git commit -m "feat(commons): entryQueries — node_entries reads/writes + storage upload/sign/remove"
```

---

## Task 7: `effectiveOwner` helper in `useWorkspaceTree`

**Files:**
- Modify: `src/commons/commonsState/useWorkspaceTree.js`

- [ ] **Step 1: Add the helper** (after `hasChildren`, before `saveTask`)

```js
  // Effective owner of a node: its own owner_id if set, else the nearest ancestor's. Derived, never
  // copied — so claiming a parent makes you owner of its sub-tasks, and claiming a sub-task overrides.
  const effectiveOwner = useCallback((node) => {
    let cur = node;
    while (cur) {
      if (cur.owner_id) return cur.owner_id;
      cur = cur.parent_id ? nodes.find(n => n.id === cur.parent_id) : null;
    }
    return null;
  }, [nodes]);
```

- [ ] **Step 2: Export it** — add `effectiveOwner` to the returned object:

```js
  return { nodes, byParent, loading, addNode, toggleDone, saveTask, removeNode, reload, completeSubtree, claim, unclaim, resolveMissed, deferOccurrence, cloneNode, cancelRun, progress, hasChildren, effectiveOwner };
```

- [ ] **Step 3: Verify lint/build.** Expected: clean.

- [ ] **Step 4: Commit**

```
git add src/commons/commonsState/useWorkspaceTree.js
git commit -m "feat(commons): effectiveOwner — walk-up ownership resolution"
```

---

## Task 8: `useNodeEntries` hook

**Files:**
- Create: `src/commons/commonsState/useNodeEntries.js`

- [ ] **Step 1: Write the hook**

```js
// src/commons/commonsState/useNodeEntries.js
// The per-node documentation log ("מה קרה כאן"). Loads entries for one node and exposes add/remove.
// Components render from `entries` and never touch Supabase.

import { useCallback, useEffect, useState } from 'react';
import { fetchEntries, addEntry, uploadAttachment, deleteEntry } from '../../data/commons/entryQueries.js';

export function useNodeEntries(nodeId, workspaceId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!nodeId) return;
    setEntries(await fetchEntries(nodeId));
  }, [nodeId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!nodeId) { setLoading(false); return; }
      const rows = await fetchEntries(nodeId);
      if (!cancelled) { setEntries(rows); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [nodeId]);

  const addNote = useCallback(async ({ kind = 'note', body = null, url = null, isCompletion = false }) => {
    await addEntry({ nodeId, kind, body, url, isCompletion });
    await reload();
  }, [nodeId, reload]);

  const addFile = useCallback(async (file, kind) => {
    const path = await uploadAttachment({ workspaceId, nodeId, file });
    await addEntry({ nodeId, kind, url: path, fileName: file.name, fileSize: file.size, mime: file.type });
    await reload();
  }, [nodeId, workspaceId, reload]);

  const remove = useCallback(async (entry) => {
    await deleteEntry(entry);
    await reload();
  }, [reload]);

  return { entries, loading, reload, addNote, addFile, remove };
}
```

- [ ] **Step 2: Verify lint/build.** Expected: clean.

- [ ] **Step 3: Commit**

```
git add src/commons/commonsState/useNodeEntries.js
git commit -m "feat(commons): useNodeEntries hook"
```

---

## Task 9: Content keys (he + en)

**Files:**
- Modify: `src/content/commons/he/commonsShell.content.js` (`form` + `view` objects)
- Modify: `src/content/commons/en/commonsShell.content.js` (mirror)

- [ ] **Step 1: Add to the `form` object (he), after `nextMorning`:**

```js
    completionStyle: 'סיום המשימה',
    completionConfirm: 'עם אישור',
    completionConfirmHint: 'חלון אישור + אפשרות הערה',
    completionQuick: 'בקליק',
    completionQuickHint: 'טיק מסמן שבוצע. מהיר.',
```

- [ ] **Step 2: Add to the `view` object (he), after `cancelDayBody`:**

```js
    // completion sheet
    completeQuestion: 'סיימת את',
    completeCheer: 'כל הכבוד — עוד דבר שנעשה ביחד',
    completeYes: 'כן, סיימתי',
    addNotePrompt: 'רוצה להוסיף הערה? (לא חובה)',
    notePlaceholder: 'משאיר/ה מילה לבאים אחריך…',
    ownerConflictTitle: 'להשלים בכל זאת?',
    ownerConflictBody: 'לקח/ה את זה על עצמו/ה. אם תסיים/י — זה יירשם על שמך.',
    ownerConflictYes: 'כן, הכל טוב — אני מסיים/ת',
    ownerConflictNo: 'לא, אבדוק',
    allDoneCheer: 'סיימתם הכל! 🎉',
    // documentation box
    docTitle: 'מה קרה כאן',
    docAdd: 'הוסף הערה, תמונה או קישור',
    docPlaceholder: 'הוסף פתק, תמונה או קישור…',
    docPost: 'פרסם',
    docPhoto: 'תמונה',
    docLink: 'קישור',
    docFile: 'קובץ',
    docLinkPrompt: 'הדבק קישור (URL):',
    docCompletionBadge: 'סומן כבוצע',
    docDelete: 'מחק',
    docDeleteTitle: 'למחוק את הרשומה?',
    docDeleteBody: 'אי אפשר לבטל את הפעולה.',
    docTooBig: 'הקובץ גדול מדי (עד 5MB).',
```

- [ ] **Step 3: Mirror in `en/commonsShell.content.js`** (same keys, English values):

```js
// form:
    completionStyle: 'Completing the task',
    completionConfirm: 'With confirm',
    completionConfirmHint: 'Confirm sheet + optional note',
    completionQuick: 'One tap',
    completionQuickHint: 'A tick marks it done. Fast.',
// view:
    completeQuestion: 'Done with',
    completeCheer: 'Nice — one more thing done together',
    completeYes: 'Yes, done',
    addNotePrompt: 'Add a note? (optional)',
    notePlaceholder: 'Leave a word for whoever comes next…',
    ownerConflictTitle: 'Complete anyway?',
    ownerConflictBody: 'took this on. If you finish it, it’s credited to you.',
    ownerConflictYes: 'Yes, all good — I’ll finish it',
    ownerConflictNo: 'No, I’ll check',
    allDoneCheer: 'All done! 🎉',
    docTitle: 'What happened here',
    docAdd: 'Add a note, photo or link',
    docPlaceholder: 'Add a note, photo or link…',
    docPost: 'Post',
    docPhoto: 'Photo',
    docLink: 'Link',
    docFile: 'File',
    docLinkPrompt: 'Paste a link (URL):',
    docCompletionBadge: 'marked done',
    docDelete: 'Delete',
    docDeleteTitle: 'Delete this entry?',
    docDeleteBody: 'This cannot be undone.',
    docTooBig: 'File too large (max 5MB).',
```

- [ ] **Step 4: Verify lint/build.** Expected: clean.

- [ ] **Step 5: Commit**

```
git add src/content/commons/he/commonsShell.content.js src/content/commons/en/commonsShell.content.js
git commit -m "feat(commons): content keys for completion sheet + documentation box (he/en)"
```

---

## Task 10: Completion-style field in `TaskFormPage`

**Files:**
- Modify: `src/commons/tasks/TaskFormPage.jsx`

- [ ] **Step 1: Add state** (near the other useState calls, ~line 95):

```js
  const [confirmOnComplete, setConfirmOnComplete] = useState(node?.confirm_on_complete ?? true);
```

- [ ] **Step 2: Persist it** — in `taskFields()`'s `base` object (~line 159):

```js
      const base = { description: description.trim() || null, owner_id: ownerId || null, role_ids: persistRoleIds, confirm_on_complete: confirmOnComplete };
```

- [ ] **Step 3: Render the segmented field** — inside the non-folder block, right after the description `<label>` (~line 223, before the owner field):

```jsx
            <div className="commons-field">
              <span className="commons-field__label">{f.completionStyle}</span>
              <div className="commons-completeStyle" role="group" aria-label={f.completionStyle}>
                <button type="button" className={confirmOnComplete ? 'is-active' : ''} aria-pressed={confirmOnComplete}
                  onClick={() => { setConfirmOnComplete(true); mark(); }}>
                  <span className="commons-completeStyle__t">{f.completionConfirm}</span>
                  <span className="commons-completeStyle__d">{f.completionConfirmHint}</span>
                </button>
                <button type="button" className={!confirmOnComplete ? 'is-active' : ''} aria-pressed={!confirmOnComplete}
                  onClick={() => { setConfirmOnComplete(false); mark(); }}>
                  <span className="commons-completeStyle__t">{f.completionQuick}</span>
                  <span className="commons-completeStyle__d">{f.completionQuickHint}</span>
                </button>
              </div>
            </div>
```

- [ ] **Step 4: Verify lint/build.** Expected: clean.

- [ ] **Step 5: Manual check** — dev server: create/edit a task, the field appears, defaults to "עם אישור", saving persists (re-open shows the choice).

- [ ] **Step 6: Commit**

```
git add src/commons/tasks/TaskFormPage.jsx
git commit -m "feat(commons): completion-style segmented field in the task form"
```

---

## Task 11: Orange-dot marker in the definitions tree

**Files:**
- Read first, then Modify: `src/commons/tasks/TaskTree.jsx`

- [ ] **Step 1: Read `TaskTree.jsx`** to find the row render (the element showing each definition node's title).

- [ ] **Step 2: Add the marker** — on a definition task row (a node with `kind === 'task'` and no `occurrence_date`) when `node.confirm_on_complete`, render a small dot after the title:

```jsx
{node.kind === 'task' && !node.occurrence_date && node.confirm_on_complete && (
  <span className="commons-confirmDot" aria-hidden="true" title={view.docCompletionBadge} />
)}
```

(Use the row's existing node variable name; import/resolve `view` from `resolveCommonsShellContent` if the
component doesn't already have shell content — if it has no content access, use `aria-hidden` only and drop `title`.)

- [ ] **Step 3: Add CSS** to `src/commons/tasks/taskScreens.css`:

```css
.commons-confirmDot { display:inline-block; width:7px; height:7px; border-radius:50%;
  background: var(--commons-accent-warm, #D98A3D); margin-inline-start:6px; vertical-align:middle; }
```

- [ ] **Step 4: Verify lint/build.** Expected: clean.

- [ ] **Step 5: Manual check** — a confirm task shows the dot in הגדרות; a "בקליק" task does not.

- [ ] **Step 6: Commit**

```
git add src/commons/tasks/TaskTree.jsx src/commons/tasks/taskScreens.css
git commit -m "feat(commons): mark confirm-on-complete tasks with a dot in the definitions tree"
```

---

## Task 12: `CompletionSheet` component

**Files:**
- Create: `src/commons/tasks/CompletionSheet.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/commons/tasks/CompletionSheet.jsx
// The completion moment: a bottom sheet shown when a task is "עם אישור" or when an owner conflict
// fires. Optional note (collapsed by default). Owner-conflict variant swaps copy + the amber notice.
// Returns the typed note (or '') to onConfirm; the caller does the status write + entry creation.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export function CompletionSheet({ v, title, ownerConflictName, onConfirm, onCancel }) {
  const conflict = !!ownerConflictName;
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="commons-sheetRoot">
      <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={onCancel} />
      <motion.div ref={ref} className="commons-completeSheet" role="dialog" aria-modal="true"
        aria-label={conflict ? v.ownerConflictTitle : v.completeYes}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
        <div className="commons-completeSheet__grab" />
        {conflict ? (
          <>
            <h2 className="commons-completeSheet__q">{v.ownerConflictTitle}</h2>
            <div className="commons-ownWarn">
              <span className="commons-ownWarn__ava">{[...ownerConflictName][0]}</span>
              <span className="commons-ownWarn__txt"><b>{ownerConflictName}</b> {v.ownerConflictBody}</span>
            </div>
          </>
        ) : (
          <>
            <div className="commons-completeSheet__burst" aria-hidden="true">🎉</div>
            <h2 className="commons-completeSheet__q">{v.completeQuestion} "{title}"?</h2>
            <p className="commons-completeSheet__sub">{v.completeCheer}</p>
          </>
        )}

        {noteOpen ? (
          <textarea className="commons-field__input commons-field__area" rows={2} autoFocus
            value={note} placeholder={v.notePlaceholder} onChange={e => setNote(e.target.value)} />
        ) : (
          <button type="button" className="commons-addNoteBtn" onClick={() => setNoteOpen(true)}>
            ➕ {v.addNotePrompt}
          </button>
        )}

        <button type="button"
          className={conflict ? 'commons-btn commons-btn--primary commons-btn--amber' : 'commons-btn commons-btn--primary'}
          onClick={() => onConfirm(note.trim())}>
          {conflict ? v.ownerConflictYes : v.completeYes} ✓
        </button>
        <button type="button" className="commons-btn commons-btn--ghost" onClick={onCancel}>
          {conflict ? `${v.ownerConflictNo} ${ownerConflictName}` : v.cancel || 'ביטול'}
        </button>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verify lint/build.** Expected: clean (component not yet mounted; just compiles).

- [ ] **Step 3: Commit**

```
git add src/commons/tasks/CompletionSheet.jsx
git commit -m "feat(commons): CompletionSheet — completion moment with optional note + owner-conflict variant"
```

---

## Task 13: Wire the completion decision into `TaskViewPage`

**Files:**
- Modify: `src/commons/tasks/TaskViewPage.jsx`

- [ ] **Step 1: Import + grab `effectiveOwner`**

Add import: `import { CompletionSheet } from './CompletionSheet.jsx';`
Add to the `useWorkspaceTree` destructure usage: the hook is `tree`, so use `tree.effectiveOwner`.

- [ ] **Step 2: Add sheet state** (near other useState):

```js
  const [sheet, setSheet] = useState(null); // { node, conflictName } | null
```

- [ ] **Step 3: Add the decision helper** (near `openComplete`):

```js
  const myMid = membership?.id ?? null;
  // Decide how a completion proceeds: confirm sheet if the task is "עם אישור" OR someone else owns it.
  function requestComplete(target, run) {
    const effOwner = tree.effectiveOwner(target);
    const conflict = effOwner && effOwner !== myMid;
    const conflictName = conflict ? (roster.find(m => m.id === effOwner)?.display_name ?? '') : '';
    if (target.confirm_on_complete || conflict) {
      setSheet({ node: target, conflictName, run });
    } else {
      run();
    }
  }
  async function finishComplete(noteText) {
    const { node: target, run } = sheet;
    setSheet(null);
    await run();
    if (noteText) {
      try {
        await addEntry({ nodeId: target.id, kind: 'note', body: noteText, isCompletion: true });
      } catch { /* note is best-effort; completion already happened */ }
    }
  }
```

Add import: `import { addEntry } from '../../data/commons/entryQueries.js';`

- [ ] **Step 4: Route completions through `requestComplete`**

In `ItemRow`, the leaf checkbox `onClick`:
```js
onClick={() => (kHasKids ? openComplete(k) : (k.status === 'done' ? tree.toggleDone(k) : requestComplete(k, () => tree.toggleDone(k))))}
```
The page-level leaf complete button (the `markDone` branch, ~line 294):
```js
onClick={() => (done ? tree.toggleDone(node) : requestComplete(node, () => tree.toggleDone(node)))}
```
Update `openComplete` so the parent/cascade path also confirms:
```js
  function openComplete(target) {
    const open = openSubsOf(target);
    requestComplete(target, () => {
      if (open.length > 0) setCompleteTarget(target); else tree.completeSubtree(target.id);
    });
  }
```
(The existing `completeTarget` ConfirmDialog stays as the "still has open sub-tasks" cascade confirm; the sheet handles the note/owner moment first.)

- [ ] **Step 5: Render the sheet** (near the other dialogs at the bottom):

```jsx
      {sheet && (
        <CompletionSheet
          v={v}
          title={sheet.node.title}
          ownerConflictName={sheet.conflictName}
          onConfirm={finishComplete}
          onCancel={() => setSheet(null)}
        />
      )}
```

- [ ] **Step 6: Verify lint/build.** Expected: clean.

- [ ] **Step 7: Manual check** (dev server):
  - "עם אישור" task → checkbox opens the sheet; confirm completes; a typed note appears in the log.
  - "בקליק" task → checkbox completes instantly, no sheet.
  - A task owned by someone else → sheet shows the amber owner notice regardless of the flag; confirming credits you (`completed_by` = you).
  - Reopen never shows a sheet.

- [ ] **Step 8: Commit**

```
git add src/commons/tasks/TaskViewPage.jsx
git commit -m "feat(commons): completion sheet + owner-conflict confirm wired into the task screen"
```

---

## Task 14: `DocumentationBox` component + lazy mount in `TaskViewPage`

**Files:**
- Create: `src/commons/tasks/DocumentationBox.jsx`
- Modify: `src/commons/tasks/TaskViewPage.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/commons/tasks/DocumentationBox.jsx
// "מה קרה כאן" — the per-node documentation log. Lazy: when empty it shows only an add affordance;
// once there is ≥1 entry (or the composer is opened) it shows composer + newest-first feed.
// Everyone reads; only managers see the delete control.

import { useState } from 'react';
import { useNodeEntries } from '../commonsState/useNodeEntries.js';
import { signedUrl } from '../../data/commons/entryQueries.js';
import { ConfirmDialog } from '../ConfirmDialog.jsx';

function relTime(iso, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(new Date(iso)); }
  catch { return ''; }
}

function PhotoEntry({ entry }) {
  const [src, setSrc] = useState(null);
  if (!src) signedUrl(entry.url).then(setSrc);
  return src
    ? <a href={src} target="_blank" rel="noreferrer"><img className="commons-entry__photo" src={src} alt={entry.body || entry.file_name || ''} /></a>
    : <div className="commons-entry__photo commons-entry__photo--loading" aria-hidden="true" />;
}

function FileEntry({ entry, v }) {
  async function open() { const u = await signedUrl(entry.url); if (u) window.open(u, '_blank', 'noopener'); }
  return (
    <button type="button" className="commons-entry__chip" onClick={open}>
      📎 {entry.file_name || v.docFile}{entry.file_size ? ` · ${Math.round(entry.file_size/1024)}KB` : ''}
    </button>
  );
}

export function DocumentationBox({ nodeId, workspaceId, v, locale, roster, canManage, MAX = 5 * 1024 * 1024 }) {
  const { entries, addNote, addFile, remove } = useNodeEntries(nodeId, workspaceId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [err, setErr] = useState('');

  const has = entries.length > 0;
  if (!has && !open) {
    return (
      <div className="commons-view__block">
        <button type="button" className="commons-docAdd" onClick={() => setOpen(true)}>➕ {v.docAdd}</button>
      </div>
    );
  }

  async function postNote() {
    const body = text.trim();
    if (!body) return;
    // a URL-only note becomes a link entry
    const isUrl = /^https?:\/\/\S+$/i.test(body);
    setBusy(true);
    try { await addNote({ kind: isUrl ? 'link' : 'note', body }); setText(''); }
    finally { setBusy(false); }
  }
  async function pickFile(e, kind) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX) { setErr(v.docTooBig); return; }
    setErr(''); setBusy(true);
    try { await addFile(file, kind); } catch { setErr(v.docTooBig); } finally { setBusy(false); }
  }
  function addLink() {
    const url = window.prompt(v.docLinkPrompt);
    if (url && /^https?:\/\/\S+$/i.test(url.trim())) addNote({ kind: 'link', body: url.trim() });
  }

  return (
    <div className="commons-view__block">
      <div className="commons-view__label">{v.docTitle}{has ? ` · ${entries.length}` : ''}</div>

      <div className="commons-composer">
        <textarea className="commons-composer__in" rows={2} value={text} placeholder={v.docPlaceholder}
          onChange={e => setText(e.target.value)} aria-label={v.docPlaceholder} />
        <div className="commons-composer__bar">
          <label className="commons-attBtn" title={v.docPhoto}>📷
            <input type="file" accept="image/*" hidden onChange={e => pickFile(e, 'photo')} /></label>
          <button type="button" className="commons-attBtn" title={v.docLink} onClick={addLink}>🔗</button>
          <label className="commons-attBtn" title={v.docFile}>📎
            <input type="file" hidden onChange={e => pickFile(e, 'file')} /></label>
          <button type="button" className="commons-composer__send" disabled={busy || !text.trim()} onClick={postNote}>{v.docPost}</button>
        </div>
        {err && <div className="commons-composer__err">{err}</div>}
      </div>

      <ul className="commons-feed">
        {entries.map(en => {
          const who = roster.find(m => m.id === en.created_by);
          const name = who?.display_name ?? '—';
          return (
            <li key={en.id} className="commons-entry">
              <span className="commons-entry__ava">{[...name][0] ?? '·'}</span>
              <div className="commons-entry__body">
                <div className="commons-entry__top">
                  <span className="commons-entry__name">{name}</span>
                  <span className="commons-entry__time">{relTime(en.created_at, locale)}</span>
                </div>
                {(en.kind === 'note' || en.kind === 'link') && en.body && (
                  en.kind === 'link'
                    ? <a className="commons-entry__chip" href={en.body} target="_blank" rel="noreferrer">🔗 {en.body}</a>
                    : <div className="commons-entry__text">{en.body}</div>
                )}
                {en.kind === 'photo' && <PhotoEntry entry={en} />}
                {en.kind === 'file' && <FileEntry entry={en} v={v} />}
                {en.is_completion && <span className="commons-entry__badge">✓ {v.docCompletionBadge}</span>}
              </div>
              {canManage && (
                <button type="button" className="commons-entry__del" title={v.docDelete} aria-label={v.docDelete}
                  onClick={() => setDelTarget(en)}>🗑</button>
              )}
            </li>
          );
        })}
      </ul>

      {delTarget && (
        <ConfirmDialog title={v.docDeleteTitle} body={v.docDeleteBody}
          confirmLabel={v.docDelete} cancelLabel={v.cancel || 'ביטול'}
          onConfirm={async () => { const t = delTarget; setDelTarget(null); await remove(t); }}
          onCancel={() => setDelTarget(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount it in `TaskViewPage`** — after the sub-tasks/actions block, inside the `node.kind === 'task'` section (before the closing `</>`), only for an actionable task layer:

```jsx
            <DocumentationBox
              nodeId={node.id} workspaceId={workspace.id} v={v} locale={locale}
              roster={roster} canManage={canManage} />
```

Add import: `import { DocumentationBox } from './DocumentationBox.jsx';`

- [ ] **Step 3: Make the completion note refresh the box** — the box loads its own entries on mount;
after `finishComplete` adds a note the user is on the same screen. Acceptable for v1 (the entry shows on
next open/refresh). Optional: lift `useNodeEntries` if you want instant refresh — **out of v1 scope**.

- [ ] **Step 4: Verify lint/build.** Expected: clean.

- [ ] **Step 5: Manual check** (dev server):
  - Empty task → only "➕ הוסף הערה, תמונה או קישור" shows.
  - Tap it → composer appears; post a note → it shows newest-first with your name + time.
  - Add a link (🔗 prompt) → renders as a link chip. Paste a URL as text → also a link chip.
  - Upload an image < 5MB → thumbnail; > 5MB → error text, no upload.
  - Upload a pdf → file chip opens in a new tab (signed URL).
  - As a manager → 🗑 shows and deletes (with confirm). As a member → no 🗑.

- [ ] **Step 6: Commit**

```
git add src/commons/tasks/DocumentationBox.jsx src/commons/tasks/TaskViewPage.jsx
git commit -m "feat(commons): documentation box (מה קרה כאן) — lazy, notes/photos/links/files"
```

---

## Task 15: Styles for the sheet, composer, and feed

**Files:**
- Modify: `src/commons/tasks/taskScreens.css`

- [ ] **Step 1: Append styles** (use existing Commons tokens; no hardcoded brand colors where a token exists):

```css
/* completion style segmented control */
.commons-completeStyle { display:flex; gap:8px; }
.commons-completeStyle button { flex:1; border:1.5px solid var(--commons-border); border-radius:13px;
  padding:12px 10px; background:var(--commons-surface); text-align:center; cursor:pointer; display:flex;
  flex-direction:column; gap:3px; }
.commons-completeStyle button.is-active { border-color:var(--commons-primary); background:var(--commons-primary-soft); }
.commons-completeStyle__t { font-weight:700; color:var(--commons-text); }
.commons-completeStyle__d { font-size:11px; color:var(--commons-text-soft); }

/* completion sheet */
.commons-completeSheet { position:relative; z-index:2; width:100%; max-width:440px; margin:auto auto 0;
  background:var(--commons-surface); border-radius:22px 22px 0 0; padding:18px 16px 14px;
  box-shadow:0 -8px 30px rgba(0,0,0,.16); display:flex; flex-direction:column; gap:10px; }
.commons-completeSheet__grab { width:38px; height:4px; border-radius:99px; background:var(--commons-border); margin:0 auto 6px; }
.commons-completeSheet__burst { font-size:30px; text-align:center; }
.commons-completeSheet__q { font-size:18px; font-weight:700; color:var(--commons-text); text-align:center; margin:0; }
.commons-completeSheet__sub { font-size:13px; color:var(--commons-text-soft); text-align:center; margin:0; }
.commons-addNoteBtn { border:1px dashed var(--commons-border); background:transparent; color:var(--commons-text-soft);
  border-radius:12px; padding:11px; font-size:14px; font-weight:600; cursor:pointer; }
.commons-ownWarn { display:flex; gap:10px; align-items:flex-start; background:var(--commons-warn-soft, #FBEEDD);
  border:1px solid var(--commons-warn-border, #F0DBB8); border-radius:12px; padding:11px 12px; text-align:start; }
.commons-ownWarn__ava { width:30px; height:30px; border-radius:50%; background:var(--commons-accent-warm, #E08B5B);
  color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; flex:none; }
.commons-ownWarn__txt { font-size:13px; color:var(--commons-text); line-height:1.45; }
.commons-btn--amber { background:var(--commons-accent-warm, #D98A3D); }

/* documentation box */
.commons-docAdd { width:100%; border:1px dashed var(--commons-border); background:transparent;
  color:var(--commons-text-soft); border-radius:12px; padding:12px; font-size:14px; font-weight:600; cursor:pointer; }
.commons-composer { background:var(--commons-surface-2, var(--commons-surface)); border:1px solid var(--commons-border);
  border-radius:16px; padding:12px; margin-bottom:14px; }
.commons-composer__in { width:100%; box-sizing:border-box; border:none; resize:none; background:transparent;
  font-family:inherit; font-size:14px; color:var(--commons-text); outline:none; }
.commons-composer__bar { display:flex; align-items:center; gap:6px; margin-top:8px;
  border-top:1px solid var(--commons-border); padding-top:10px; }
.commons-attBtn { width:36px; height:36px; border-radius:10px; background:var(--commons-primary-soft);
  border:none; font-size:16px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
.commons-composer__send { margin-inline-start:auto; background:var(--commons-primary); color:#fff; border:none;
  border-radius:11px; padding:9px 16px; font-size:14px; font-weight:700; cursor:pointer; }
.commons-composer__send:disabled { opacity:.5; cursor:default; }
.commons-composer__err { color:var(--commons-danger, #c0392b); font-size:12px; margin-top:8px; }

.commons-feed { list-style:none; margin:0; padding:0; }
.commons-entry { display:flex; gap:10px; padding:13px 4px; border-bottom:1px solid var(--commons-border); position:relative; }
.commons-entry__ava { width:34px; height:34px; border-radius:50%; background:var(--commons-primary);
  color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex:none; }
.commons-entry__body { flex:1; min-width:0; }
.commons-entry__top { display:flex; align-items:baseline; gap:8px; }
.commons-entry__name { font-size:14px; font-weight:700; color:var(--commons-text); }
.commons-entry__time { font-size:11px; color:var(--commons-text-soft); }
.commons-entry__text { font-size:14px; color:var(--commons-text); line-height:1.5; margin-top:3px; white-space:pre-wrap; }
.commons-entry__photo { margin-top:8px; width:100%; max-height:240px; object-fit:cover; border-radius:12px; display:block; }
.commons-entry__photo--loading { height:120px; background:var(--commons-border); }
.commons-entry__chip { display:inline-flex; align-items:center; gap:7px; margin-top:8px; border:1px solid var(--commons-border);
  border-radius:10px; padding:8px 11px; font-size:13px; color:var(--commons-text); background:var(--commons-surface);
  text-decoration:none; max-width:100%; cursor:pointer; word-break:break-all; }
.commons-entry__badge { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700;
  color:var(--commons-primary); background:var(--commons-primary-soft); border-radius:99px; padding:2px 9px; margin-top:5px; }
.commons-entry__del { position:absolute; top:13px; inset-inline-start:2px; font-size:14px; background:none;
  border:none; color:var(--commons-text-soft); cursor:pointer; }
```

- [ ] **Step 2: Reconcile tokens** — open `src/commons/styles/` globals and confirm the var names
(`--commons-primary`, `--commons-primary-soft`, `--commons-border`, `--commons-surface`, `--commons-text`,
`--commons-text-soft`). If a name differs, use the real token (the fallbacks above keep it working meanwhile).

- [ ] **Step 3: Verify lint/build + mobile viewport check.** Expected: clean; sheet sits at the bottom,
feed readable on a phone width.

- [ ] **Step 4: Commit**

```
git add src/commons/tasks/taskScreens.css
git commit -m "feat(commons): styles for completion sheet, composer, and documentation feed"
```

---

## Task 16: Full verification pass

- [ ] **Step 1: Lint** — `npm run lint`. Fix any errors.
- [ ] **Step 2: Build** — `npm run build`. Fix any errors.
- [ ] **Step 3: Accessibility spot-check** — sheet/dialog keyboard-navigable, visible focus; attach
  buttons + trash have aria-labels; photos have alt; contrast ≥ 4.5:1 on the new surfaces.
- [ ] **Step 4: End-to-end manual** — run the dev server and walk the full flow from the spec
  (completion styles, owner conflict, last-tick celebration, doc box lazy state, all four entry kinds,
  manager delete). This is the gate before showing the user.
- [ ] **Step 5:** Leave the result running for user review **before any further commit/merge** (per CLAUDE.md:
  implement → dev server → user reviews → approve).

---

## Self-review (plan vs spec)

- **§1.1 confirm_on_complete + carry in clone/generate** → Tasks 1, 5, 10, 11. ✓
- **§1.2 effective owner / inheritance** → Task 7, used in Task 13. ✓
- **§1.3 confirm decision** → Task 13 (`requestComplete`). ✓
- **§1.4 completion sheet (both variants, optional note, attribution)** → Tasks 12, 13. ✓
- **§1.5 last-tick celebration** → content `allDoneCheer` (Task 9); surfaced by the cascade path in Task 13
  (shown via the completion flow when the parent closes). ✓
- **§2.1 per-node, per-occurrence; visibility; delete** → Tasks 2 (RLS), 14. ✓
- **§2.2 lazy empty state** → Task 14 (`!has && !open`). ✓
- **§2.3 layout (composer + feed + badge + manager trash)** → Tasks 14, 15. ✓
- **§2.4 node_entries model** → Task 2. ✓
- **§2.5 access (read RLS, write/delete RPCs, entryQueries, hook)** → Tasks 2, 6, 8. ✓
- **§2.6 storage (bucket, path, limits, policies, upload/delete)** → Tasks 3, 6. ✓
- **§2.7 auto-cleanup (30 days, pg_cron)** → Task 4. ✓
- **§3 files touched** → all covered. ✓
- **§5 standards (protect-the-user confirm, a11y, privacy, mobile, opacity)** → Tasks 14 (ConfirmDialog),
  16 (a11y), 3 (limits), 15 (mobile), 6/8 (opacity). ✓

**Note on §1.5:** the "🎉 כל הכבוד" last-tick celebration is implemented as the cheer copy in the sheet
(`completeCheer`) plus `allDoneCheer` for the all-complete case; a standalone toast is out of v1 scope —
the moment is carried by the sheet. If a distinct toast is desired later, add it as a follow-up.
