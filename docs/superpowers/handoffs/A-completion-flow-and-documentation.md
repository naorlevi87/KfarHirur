# Handoff A — Completion confirmation + per-task documentation box

> Paste this into a fresh Claude window (it has full repo access). Start by reading
> `CLAUDE.md`, `docs/architecture.md` §17, `src/commons/COMMONS.md`, and the spec
> `docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md`. This is a Commons
> (`src/commons/`) feature. Invoke the `brainstorming` skill before building (per CLAUDE.md).

## Context
Commons tasks live in one `commons.nodes` tree. A task screen is `TaskViewPage.jsx`; completion goes
through `useWorkspaceTree` → `setNodeStatus` / `completeSubtree` RPCs. Today completing a leaf is one tap
(checkbox); there is no confirmation and no place to attach context to a task.

## Desired outcome
1. **Completion confirmation with an optional note.** When a member marks an item done, offer a quick
   confirm step where they can (optionally) add a short note ("done, but we're low on X"). One-tap stays
   fast — the note is optional, not a gate. Reopen stays the undo.
2. **Per-task documentation box.** Every task has a section (in `TaskViewPage`) for **notes, photos,
   links, and files** — an activity/attachments log, newest first, each entry showing who + when.
3. The completion note from (1) lands in that log as an entry, attributed to the completer.

## Behavior to nail down (brainstorm these)
- Is the note prompt shown on every completion, or only when the user taps an "add note" affordance?
- Attachment types in v1 (note + link first? photos/files need Supabase Storage — bucket, RLS, size limits).
- Who can see / delete entries; do entries persist across a routine's daily runs or per-instance?
- Mobile-first capture (camera/file picker), Israeli privacy (no PII in photos without consent).

## Constraints
- New data: likely a `commons.node_entries` table (node_id, kind: note|link|photo|file, body/url, created_by,
  created_at) + Storage bucket for photos/files with workspace-scoped RLS. Keep data-source opacity (queries
  in `src/data/commons/`, components call the hook).
- Reuse the row/dialog patterns already in `TaskViewPage`; no hardcoded strings (content in
  `src/content/commons/{he,en}/commonsShell.content.js`); mobile-first; design-taste skill applies.

## Likely files
`supabase/migrations/*`, `src/data/commons/nodeQueries.js` (or a new `entryQueries.js`),
`src/commons/commonsState/useWorkspaceTree.js`, `src/commons/tasks/TaskViewPage.jsx`, content files.
