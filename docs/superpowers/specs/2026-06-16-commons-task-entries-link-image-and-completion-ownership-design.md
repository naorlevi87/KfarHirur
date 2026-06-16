# Commons task entries: explicit link/image + completion takes ownership

**Date:** 2026-06-16
**Status:** Design — approved in conversation, pending written-spec review
**Module:** `src/commons/tasks/` + `supabase/migrations/`

Two independent changes that arrived together, both touching a task's detail screen.

- **Part A** — the per-task "entry" composer gets a proper in-app **link** affordance (URL + a
  required short name, rendered as a marked link) and an explicit **camera-or-gallery** image choice.
  The composer and its entry-body rendering are de-duplicated into shared components.
- **Part B** — completing a task **takes ownership**: a `done` task can never still read
  "פנוי — מי לוקח?".

---

## Part A — Shared `TaskComposer` + `EntryBody`

### Problem

The add-entry composer is duplicated in [`DocumentationBox.jsx`](../../../src/commons/tasks/DocumentationBox.jsx)
(the per-occurrence "מה קרה כאן" log) and [`StandingAttachments.jsx`](../../../src/commons/tasks/StandingAttachments.jsx)
(a recurring task's "הערות קבועות"), and so are the photo/file/link render helpers. Two concrete
defects:

1. **Links use `window.prompt`** in `DocumentationBox` — a native dialog **banned** by
   `docs/commons-standards.md` §2.2 — and store only the raw URL. `StandingAttachments` has no link
   button at all; it auto-detects a URL pasted into the note field.
2. **Images** are a single `📷` button (`accept="image/*"`); there is no explicit
   "from camera vs from gallery" choice.

### Decisions (locked with Naor, 2026-06-16)

- **Link** — an in-app two-field form (URL + short name). **Both fields required**; you cannot save a
  bare URL. A saved link always renders as `🔗 <name>`, never a raw URL. (The short name is the
  "this is a link" marker per the standard — see the new standards entry.)
- **Image** — one `📷` button opens a small in-app menu: **`צלם`** (camera) / **`מהגלריה`** (gallery).
  No second button on the bar. On desktop both items fall back to the OS file picker.
- **Scope** — both composers, via one shared component.

### Components

Two new files in `src/commons/tasks/`:

**`TaskComposer.jsx`** — the input surface.

- Props: `{ v, placeholder, onNote, onLink, onFile, MAX }`.
  - `onNote(text)` — async; post a plain-text note.
  - `onLink({ url, label })` — async; post a link.
  - `onFile(file, kind)` — async; `kind` is `'photo'` or `'file'`.
  - `MAX` — max file size (default `5 * 1024 * 1024`), used for the client-side size check.
- Owns its own UI state: `text`, link-form (`linkOpen`, `linkUrl`, `linkLabel`), image menu
  (`imgMenuOpen`), `busy`, `err`. Parents no longer own composer state.
- Bar layout (reading-start → reading-end): textarea, then a row of `📷` (image menu) · `🔗`
  (link form) · `📎` (file input) · `פרסם` (posts the note).
- **Note path** — `פרסם` calls `onNote(text)`. Plain text only; the old URL auto-detect
  (`URL_RE.test(body)`) is removed — links now have their own affordance.
- **Link form** — `🔗` expands an inline panel with two fields (URL + short name) and `הוסף`/`ביטול`.
  Validation: URL must match `^https?:\/\/\S+$/i` **and** the name must be non-empty; `הוסף` is
  disabled otherwise. On add → `onLink({ url, label })`, then collapse + clear.
- **Image menu** — `📷` toggles a small menu with two `<label>`-wrapped file inputs:
  - `צלם` → `<input type="file" accept="image/*" capture="environment" hidden>`
  - `מהגלריה` → `<input type="file" accept="image/*" hidden>`
  Both call `onFile(file, 'photo')`. File too big → set `err` to `v.docTooBig`.
- **File** — `📎` → `<input type="file" hidden>` → `onFile(file, 'file')`.
- **A11y (IS 5568)** — the link form and the image menu are keyboard-operable: Escape closes,
  click/tap outside closes, focus moves into the surface on open and returns to the trigger on close,
  every field/control has a label. No native `prompt`/`confirm`.

**`EntryBody.jsx`** — renders one entry's body, shared by both feeds. Props `{ entry, v }`. Branches on
`entry.kind`:

- `note` → `<div class="commons-entry__text">{body}</div>`
- `link` → `<a class="commons-entry__chip" href={entry.url || entry.body}>🔗 {entry.body}</a>`
  - New links: `body` = the short name (visible), `url` = the actual URL (href).
  - **Legacy** links (`url` null, `body` = the URL) still work: href falls back to `body`.
- `photo` → the existing signed-URL `<img>` (moved here from the duplicated `PhotoEntry`).
- `file` → the existing signed-URL chip (moved here from `FileEntry`/`FileChip`).

`DocumentationBox` and `StandingAttachments` keep their own row wrappers (avatar/name/time/badge for
the doc feed; the "מהקבועה" tag + delete for standing) and call `<EntryBody>` for the body and
`<TaskComposer>` for input. Both already use `useNodeEntries(nodeId, workspaceId)`, whose `addNote`
already forwards `url`; no hook change is needed.

### Data model

No schema change. A link entry stores `kind = 'link'`, `body = label`, `url = actual URL` — both
columns already exist on `node_entries` and `addEntry` already accepts them.

### Standards entry (to add to `docs/commons-standards.md`)

Under §5 / §6, and a dated Decision-Log entry:

> **Link entries carry a short name.** A link attached to a task is entered through an in-app form
> (URL + a **required** short name) — never `window.prompt`. It renders as `🔗 <name>`: the short name
> is the link text, the `🔗` glyph + chip styling mark it as a link. A raw URL is never shown as the
> visible label.

---

## Part B — A completed task is owned by whoever completed it

### Problem

Completion stamps `completed_by` but never sets `owner_id`, so an unassigned task that gets completed
keeps `owner_id = null` and the detail screen keeps offering the **claim** button — a `done` task still
reads "פנוי — מי לוקח?". Root cause is in the data layer:

- [`set_node_status`](../../../supabase/migrations/20260614010000_commons_occurrence_ops.sql) — on
  `done`, sets `completed_by`/`completed_at`/`completed_late` but **not** `owner_id`.
- [`complete_subtree`](../../../supabase/migrations/20260612010000_commons_subtasks.sql) — sets only
  `status = 'done'`; **no** attribution and **no** owner.
- `rollup_parent_status` — flips a parent to `done` when all children are done; sets no owner.

### Decision

Completing a task **claims it** for the completer when it has no owner. Fix at the DB source so it holds
regardless of completion path, plus a UI guard. The one deliberate exception is "זה כן קרה" with an
unknown doer.

### Changes — one new migration

`supabase/migrations/20260616110000_commons_complete_takes_ownership.sql` (after
`20260616100000_commons_resolve_missed_when.sql`):

1. **`set_node_status`** — on `new_status = 'done'`, also set
   `owner_id = coalesce(<existing owner_id>, mid)` where `mid` is the acting member. Reopen path
   unchanged (clears completion stamps; leaves `owner_id`).
2. **`complete_subtree`** — for every task it closes, stamp `completed_by = <actor>`,
   `completed_at = now()`, `completed_late = (due_date is not null and now() > due_date)`, and
   `owner_id = coalesce(owner_id, <actor>)`. Resolve `<actor>` from `workspace_members` for `auth.uid()`
   in the workspace (same lookup `set_node_status` uses).
3. **`rollup_parent_status`** — when it sets a parent to `done` and that parent has `owner_id null`,
   set `owner_id` to the acting member (`auth.uid()`'s `workspace_members.id`, when resolvable). The
   `→ open` path never touches owner.
4. **Backfill** — `update commons.nodes set owner_id = completed_by where status = 'done' and
   owner_id is null and completed_by is not null;` (one-time, cleans pre-migration rows).

`resolve_missed` is **unchanged** — its owner stays `did_by`, which is intentionally `null` when the
doer chose "לא יודע".

### UI guard

In [`TaskViewPage.jsx`](../../../src/commons/tasks/TaskViewPage.jsx), the claim affordance
(`!owner && node.kind === 'task' && canClaim && !isBase`) gains `&& !done && !missed`: a
done/missed/closed task never shows "מי לוקח?". With the DB change + backfill, a done task's owner block
shows the completer. (A "זה כן קרה / לא יודע" item is the lone case that stays ownerless — and now it
shows no claim button either, which is the required invariant.)

### Application + verification

The migration is applied via Supabase (management API access on file), then behavior is verified in the
running app: complete an unassigned task → it shows the completer as owner, no claim button; "זה כן
קרה → לא יודע" → done, ownerless, still no claim button.

---

## Out of scope

- No change to the snapshot/pulse grouping (done tasks aren't surfaced in the "free" group there).
- No change to `useNodeEntries` or `entryQueries` beyond what already exists.
- No broader refactor of `DocumentationBox` / `StandingAttachments` beyond extracting the shared
  composer + entry-body.
