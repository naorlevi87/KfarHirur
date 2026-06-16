# Commons — Completion confirmation + per-task documentation

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

**Status:** Design approved · **Date:** 2026-06-14 · **Module:** `src/commons/`
**Supersedes handoff:** `docs/superpowers/handoffs/A-completion-flow-and-documentation.md`

## Goal

Make finishing a task feel like a community moment, not a silent checkbox, and give every task a
shared wall for context (notes, photos, links, files). Two linked features:

1. **Completion confirmation** — a warm bottom sheet on completion, with an optional note. Whether a
   task confirms is a per-task choice; an owner clash always confirms.
2. **Documentation box ("מה קרה כאן")** — a per-occurrence activity log at the bottom of a task
   screen: notes, photos, links, files; newest first; everyone reads, managers delete.

Design north star: feels like *a community doing things together* — accessible, a little playful,
never a corporate audit tool. The confirm sheet is the celebration; the log is the shared wall.

---

## 1. Completion confirmation

### 1.1 Per-task completion style
A new column on `commons.nodes`:

```
confirm_on_complete boolean not null default true
```

- **`true` ("עם אישור")** — completing opens the confirm bottom sheet with an optional note.
- **`false` ("בקליק")** — completing is an instant one-tap; no sheet.
- **Default is `true`.** New tasks confirm; the creator opts a trivial step down to "בקליק".
- Every node is uniform — *every sub-task is itself a task* — so this is a property of the task, not
  a structural rule about depth. It is chosen at creation/edit and is invisible at runtime (no badge
  on the live checklist). The only place the distinction is visible is the **definitions tree**
  (הגדרות): an orange dot marks `confirm_on_complete = true`.

The flag must be carried forward everywhere a node is deep-copied:
- **`commons.run_recurrences()`** — both INSERTs (run root + each cloned descendant) copy the
  definition's `confirm_on_complete` onto the generated instance.
- **`commons.clone_node()`** — both INSERTs (clone root + descendants) copy it.

### 1.2 Owner inheritance + effective owner
Ownership inherits down the tree and is **derived, never copied**:

- `effectiveOwner(node)` = the node's own `owner_id` if set, else the nearest ancestor's `owner_id`
  (walk up `byParent`). Implemented client-side in `useWorkspaceTree`.
- Claiming a task makes you the effective owner of all its sub-tasks. Anyone can override by claiming
  a *specific* sub-task — its own `owner_id` then wins for that line only.
- Run instances already copy `owner_id` down at generation, so the same walk works through a run
  tree (a run sub-task with no owner inherits the run root's owner, which is the routine's owner).

No schema change is needed for this — it is pure client derivation.

### 1.3 The confirm decision
On a completion tap (a leaf checkbox, a parent's "complete all", or the task-screen complete button):

```
needsConfirm = node.confirm_on_complete || (effOwner && effOwner !== myMembershipId)
```

- **needsConfirm true** → open the completion bottom sheet.
- **needsConfirm false** → instant `toggleDone` (current behavior).
- **Reopen is always instant** — no confirm, no sheet (reopen stays the cheap undo).

### 1.4 The completion bottom sheet
A mobile-first sheet that slides up over a dimmed screen. Two variants:

**Normal variant** (own/unclaimed task, `confirm_on_complete = true`):
- Small celebratory mark (🎉) + warm copy: *"סיימת את '<title>'?"* / a sub-line about doing it
  together.
- A collapsed **"➕ רוצה להוסיף הערה? (לא חובה)"** affordance → expands to a note textarea. The note
  is optional, never a gate.
- Primary **"כן, סיימתי ✓"** · ghost **"ביטול"**.

**Owner-conflict variant** (effective owner is someone else — fires regardless of the flag):
- An amber owner notice: avatar + *"<name> לקחה את זה על עצמה. אם תסיים/י — זה יירשם על שמך."*
- Optional note affordance (same as above).
- Primary **"כן, הכל טוב — אני מסיים/ת ✓"** · ghost **"לא, אבדוק עם <name>"**.

**On confirm:**
1. `setNodeStatus(id,'done')` (leaf) or `completeSubtree(id)` (parent). Completion attribution
   (`completed_by/at/late`) is stamped by the existing RPC and credits the **completer** — including
   in the owner-conflict case (you did it → it's yours).
2. If a note was typed → create a `node_entries` row with `is_completion = true`, attributed to the
   completer. It appears in the log with a "✓ סומן כבוצע" badge.

**Composition with the existing "open sub-tasks" notice:** completing a parent that still has open
sub-tasks currently shows a separate confirm listing them. That notice folds **into** this sheet —
the sheet is the single completion-confirm surface (it lists remaining sub-tasks when relevant, then
"complete all" cascades on confirm).

### 1.5 Last-tick celebration
When the tick that completes the **last** open sub-task closes the whole parent task, show a light
"🎉 סיימתם הכל" moment. This is a celebration, not a gate (it does not block or require a tap to
proceed beyond dismissal).

---

## 2. Documentation box — "מה קרה כאן"

### 2.1 Placement & scope
- A section at the **bottom of the task screen** (`TaskViewPage`), below sub-tasks/actions.
- Available on **every node** — any task and any sub-task can have a log.
- Attached to the **instance** node — **per occurrence only**. A routine's daily run has its own log;
  the definition has its own. (Matches the routine/run model where `occurrence_date` set = instance.)
- **Visibility:** every active member of the workspace can read. (Locked decision.)
- **Delete:** manager/admin only. (Locked decision — no self-delete.)

### 2.2 Empty state — lazy, uncluttered
Most tasks will never get a note, so the box must not clutter the screen when empty. There are **no
rows in `node_entries`** until the first entry, so nothing is created prematurely on the data side.

- **No entries** → render only a single quiet affordance: **"➕ הוסף הערה, תמונה או קישור"**. The task
  screen otherwise stays minimal (owner + completer, which it already shows). Tapping it reveals the
  composer.
- **≥ 1 entry** (added directly, or a completion note) → render the full "מה קרה כאן" section: header
  + composer + feed.

### 2.3 Layout (when present)
- **Composer on top:** a single input *"הוסף פתק, תמונה או קישור…"* with attach buttons
  (📷 photo · 🔗 link · 📎 file) and a **פרסם** button.
- **Feed below, newest first.** Each entry: avatar + name + relative time, then content by kind:
  - `note` — text.
  - `photo` — inline thumbnail (tap to view full).
  - `link` — a chip with title + host.
  - `file` — a chip with file icon, name, size.
- The **completion note** appears as an entry with a green **"✓ סומן כבוצע"** badge.
- A 🗑 control shows on each entry **only for managers**.

### 2.4 Data model
New table:

```sql
commons.node_entries (
  id            uuid primary key default gen_random_uuid(),
  node_id       uuid not null references commons.nodes(id) on delete cascade,
  workspace_id  uuid not null references commons.workspaces(id) on delete cascade,
  kind          text not null check (kind in ('note','link','photo','file')),
  body          text,            -- note text, link title, or photo/file caption
  url           text,            -- link URL, or storage path for photo/file
  file_name     text,
  file_size     int,
  mime          text,
  is_completion boolean not null default false,
  created_by    uuid references commons.workspace_members(id) on delete set null,
  created_at    timestamptz not null default now()
)
```

- `created_by` is a `workspace_members.id`, consistent with `completed_by` and the roster
  (`fetchRoster`), so attribution renders with the same identity everywhere.
- `node_id` cascade-deletes entries when a node is removed (covers run cleanup and task deletion).
- Index: `(node_id, created_at desc)` for the feed.

### 2.5 Access pattern
- **Read** — direct `select` from `node_entries`; RLS `select` policy = `commons.is_active_member(workspace_id)`.
- **Write** — `add_node_entry(...)` RPC (SECURITY DEFINER): resolves the caller's membership id
  server-side (mirrors `claim_node` / `set_node_status`), validates active membership, inserts.
- **Delete** — `delete_node_entry(entry_id)` RPC (SECURITY DEFINER): allowed only when
  `commons.my_permission(workspace_id) in ('admin','manager')`.
- New data module `src/data/commons/entryQueries.js` (`fetchEntries`, `addEntry`, `deleteEntry`) and
  a focused hook `useNodeEntries(nodeId)` — kept separate from `useWorkspaceTree` to avoid bloat.
  Components never touch Supabase directly (data-source opacity).

### 2.6 Storage
- Private bucket **`commons-attachments`**.
- Path convention: `{workspace_id}/{node_id}/{uuid}-{filename}`.
- Bucket limits: **5 MB per file**; mime allowlist — images (`image/*`), `application/pdf`, common
  doc types. Enforced at the bucket level **and** validated client-side before upload.
- Storage RLS (on `storage.objects`, keyed on the first path segment = `workspace_id`):
  - `select` / `insert` — active member of that workspace.
  - `delete` — manager/admin of that workspace.
- **Upload flow:** client uploads the file → receives the storage path → calls `add_node_entry` with
  `kind = photo|file`, `url = path`, plus `file_name/file_size/mime`.
- **Delete flow:** deleting a photo/file entry removes the storage object first, then the row (handled
  in `deleteEntry`).

### 2.7 Auto-cleanup (privacy: data minimization)
- A **pg_cron** cleanup pass (piggybacking the existing 08:00 schedule that runs `run_recurrences`):
  for **run instances** (`occurrence_date is not null` and part of a routine) whose day is **older than
  30 days**, delete the **whole occurrence log** — `node_entries` rows **and** their storage objects.
- **One-off tasks** (no recurrence) keep their attachments indefinitely — they are deliberate records.
- The 30-day window is a constant for v1; a per-workspace setting is out of scope.
- Rationale: Israeli Privacy Protection Law data-minimization — don't retain personal data (e.g.
  photos of people) longer than needed. Aligns with "per occurrence only": a note on a daily run is
  ephemeral by design.

---

## 3. Files touched

**Migrations (`supabase/migrations/`):**
- Add `confirm_on_complete` to `commons.nodes`; update `run_recurrences()` and `clone_node()` INSERTs.
- Create `commons.node_entries` + indexes + RLS policies.
- `add_node_entry`, `delete_node_entry` RPCs.
- `commons-attachments` bucket + storage RLS policies.
- Cleanup function + pg_cron schedule entry.

**Data (`src/data/commons/`):**
- `nodeQueries.js` — add `confirm_on_complete` to `FIELDS`.
- `entryQueries.js` — new (`fetchEntries`, `addEntry`, `deleteEntry`, storage upload/remove).

**State (`src/commons/commonsState/`):**
- `useWorkspaceTree.js` — `effectiveOwner(node)` helper.
- `useNodeEntries.js` — new hook.

**UI (`src/commons/`):**
- `tasks/TaskViewPage.jsx` — completion-confirm decision + bottom sheet + last-tick celebration + the
  documentation box section.
- `tasks/TaskFormPage.jsx` — the "סיום המשימה" segmented field (בקליק / עם אישור).
- `tasks/TaskTree` (definitions) — orange-dot marker for `confirm_on_complete`.
- A `CompletionSheet` component and a documentation-box component (notes/photos/links/files entries),
  reusing existing sheet/dialog/row patterns.

**Content (`src/content/commons/{he,en}/commonsShell.content.js`):**
- All new copy — sheet titles/sub-lines, owner-conflict strings, completion style labels, section
  name "מה קרה כאן", composer placeholder, badges, empty state. No hardcoded strings.

---

## 4. Out of scope (v1)
- Realtime live-updating feed (refetch on add/delete/completion is enough for v1).
- Entry editing (delete-and-repost only).
- Reactions/likes on entries.
- Per-workspace retention setting (30 days is fixed).
- Notifications/escalation (separate handoff C).

---

## 5. Standards & constraints
- **Protect the user:** manager delete of an entry confirms via `ConfirmDialog`. Completion stays
  one-tap-fast even with the sheet; the note never gates. Reopen is the undo.
- **Accessibility (IS 5568 / WCAG 2.1 AA):** sheet and dialogs are keyboard-navigable with visible
  focus; attach buttons and the trash control have `aria-label`s; photo thumbnails have meaningful
  `alt` (fall back to file name); contrast ≥ 4.5:1.
- **Privacy:** 5 MB limit + mime allowlist + auto-cleanup; uploads are member-consented by action.
- **Design-taste / mobile-first:** spring motion for the sheet (motion/react), warm Commons tokens,
  no hardcoded colors, validated on mobile first.
- **Data-source opacity:** all access via `src/data/commons/` + hooks; components call functions only.
```
