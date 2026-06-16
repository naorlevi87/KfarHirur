# Commons — Base Definition: Standing Attachments, No Completion/Log (Design)

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

> Status: approved design, pre-implementation. Date: 2026-06-16.
> Scope: `src/commons/tasks/TaskViewPage.jsx`, a new `src/commons/tasks/StandingAttachments.jsx`,
> `src/content/commons/{he,en}/commonsShell.content.js`, `src/commons/tasks/taskScreens.css`.
> **No schema change** — reuses `node_entries` (`src/data/commons/entryQueries.js`, `useNodeEntries`).
> One RLS read to verify (members reading a definition's entries). Builds on and continues
> `docs/superpowers/specs/2026-06-16-commons-base-vs-occurrence-design.md` (the base-vs-occurrence
> model); conforms to `docs/commons-standards.md`.
> **Companion spec (next):** the editable next-occurrence ("מה יהיה" → pre-note/pre-add/see-deferred on
> tomorrow's run) is deliberately a **separate** design — it needs lazy run materialization + idempotent
> 08:00 generation — and is out of scope here (§7).

## 1. Problem

After the base-vs-occurrence work, a **base** (a routine root or an order *definition* nested under a
routine; `occurrence_date` null) still behaves partly like a doable thing:

- It shows **completion actions** (סמן כבוצע / סמן הכול) — but a *template* is never "done"; only its
  daily occurrences are.
- It shows the **per-occurrence log** — the manual "מה קרה כאן" feed and the derived activity log — but
  those record what happened on a *given day*, which is meaningless on a template.

Separately, there is **no way to attach standing reference** to a recurring task — a note, a photo, or a
link that should appear on **every** occurrence ("השאר את המפתח אצל X", a prep photo, a supplier link)
and be removable later. Today the only attachment surface is the per-occurrence log, which doesn't carry
forward.

## 2. Model — a base *defines* (reference); an occurrence *does* (log)

| | **Base** (definition) | **Occurrence** (instance) |
|---|---|---|
| Completion | **none** (a template isn't done) | the day's tick / done / missed |
| Per-occurrence log ("מה קרה כאן" + activity) | **none** (nothing happened on a template) | yes — the day's record |
| Attachments | **standing** — note/photo/link that appears on every occurrence | the day's own log entries |

This extends the base-vs-occurrence iron rule: a base declares capability, cadence, an assignment choice
— **and standing reference** — but never carries doing (completion) or a per-day record (log).

## 3. Base view — hide completion and the log (`TaskViewPage`)

For a **base** (`isBase` — already computed: routine root `isRoutine`, or `underRoutine` order
definition):

- **No completion actions.** The `commons-view__actions` block (סמן כבוצע / סמן הכול / reopen) does not
  render on a base. (The routine-root clone action stays.) Sub-task rows on a base are navigation only —
  no completing a definition.
- **No per-occurrence log.** Neither the manual log (`DocumentationBox`) nor the derived activity log
  (`ActivityLog`) renders on a base. (Both are gated to occurrences / plain tasks.)

`TaskViewPage` already owns where these render — gating is by `isBase`; the log components themselves are
not modified (see §6).

## 4. Standing attachments — on the base, propagating to occurrences

### 4.1 Where they live
A standing attachment is a **`node_entries` row on the definition node** (the base). No new table, no
per-occurrence copy. "Appears on every occurrence" is achieved by **reading the definition's entries when
rendering an occurrence** (`occurrence.template_id` → the definition). Removing the row removes it
everywhere, instantly — which is exactly "ואז הוא יפסיק להופיע".

### 4.2 On the base — the composer
On a base view, render a **`StandingAttachments`** card (new component, §6) bound to the **definition
node id**:

- Add **note / photo / link** (reuse `useNodeEntries(nodeId, workspaceId)` + its `addNote`/`addFile`).
- List existing standing attachments with a **remove** control (manager+; `deleteEntry` is already
  manager-gated by its RPC).
- Header reads as standing reference, not a log: e.g. **"הערות קבועות"** with a quiet hint
  **"מופיע בכל מופע"**. This is the *only* attachment surface on a base.

### 4.3 On an occurrence — pinned, read-only
On an occurrence view, the definition's standing entries are **pinned at the top of that day's log**,
**read-only**, each marked **"מהקבועה"**:

- Fetched via `useNodeEntries(node.template_id, workspaceId)` (the occurrence's source definition).
- Rendered as a compact read-only list **above** the occurrence's own `DocumentationBox` log — visually
  "pinned to the top of the log section." No add/remove here (you manage them on the base).
- Photos/links render the same way they do in the log (signed-URL image / link chip), but with no
  delete affordance and the "מהקבועה" tag.
- If the occurrence has no `template_id` (a pure ad-hoc one-off), there are no standing entries — the
  pinned block is omitted.

### 4.4 Removal semantics
Removing a standing attachment on the base deletes the `node_entries` row → it disappears from the base
*and* from every occurrence's pinned block on next render (live read). There is no "future only" variant
(YAGNI): standing reference is current-state, not history.

## 5. Permissions & accessibility (IS 5568)

- **Add/remove standing attachments:** manager+ (matches base editing; `add_node_entry` /
  `delete_node_entry` RPCs already gate writes).
- **Read on occurrences:** any active workspace member must be able to read the definition node's
  `node_entries` to see the pinned block. **Verify the `node_entries` SELECT RLS allows workspace
  members to read entries on any node in their workspace** (not just nodes they can otherwise act on). If
  it's narrower, widen the SELECT policy to workspace-member read. This is the one backend touch-point —
  confirm before shipping.
- Read-only pinned items are not focusable controls; the "מהקבועה" tag is real text (not colour-only).
  Image attachments keep meaningful `alt` (the entry body / file name), per existing log rendering.
- Colours via `var(--commons-*)` tokens only.

## 6. Build approach — don't collide with the log work

The manual log (`DocumentationBox.jsx`) and derived activity log (`ActivityLog.jsx`) are owned by a
parallel effort. This spec **does not modify either**:

- **New** `src/commons/tasks/StandingAttachments.jsx` — a focused component over `useNodeEntries`, with
  two modes: `editable` (base: composer + list + remove) and `readOnly` (occurrence: pinned list, tagged
  "מהקבועה"). One responsibility: render/manage a node's entries as *standing* attachments.
- `TaskViewPage.jsx` (mine) gates rendering: hide actions/`DocumentationBox`/`ActivityLog` on a base;
  render `<StandingAttachments editable nodeId={node.id} />` on a base; on an occurrence render
  `<StandingAttachments readOnly nodeId={node.template_id} />` pinned above the existing log.

This keeps the change inside files this effort owns (plus `TaskViewPage`, already shared) and leaves the
log components untouched.

## 7. Out of scope (→ separate spec)

- **Editable next-occurrence ("מה יהיה").** Opening *tomorrow's* run to pre-write a one-time note, pre-add
  a one-off sub-task, or confirm a "דחה למחר" item landed. This needs **lazy run materialization** + an
  **idempotent 08:00 generator** (dedup by `template_id` + `occurrence_date`) — note that `defer_*`
  already creates tomorrow-dated nodes, so the idempotency gap exists today and is the crux of that spec.
  Designed and built immediately after this one.
- Per-occurrence one-time notes that do NOT propagate (that's just the existing occurrence log).

## 8. Affected files

- `src/commons/tasks/TaskViewPage.jsx` — `isBase` gating of actions + log; mount `StandingAttachments`
  (editable on base, read-only pinned on occurrence).
- `src/commons/tasks/StandingAttachments.jsx` — **new**; editable + readOnly modes over `useNodeEntries`.
- `src/content/commons/{he,en}/commonsShell.content.js` — keys: `standingTitle` ("הערות קבועות"),
  `standingHint` ("מופיע בכל מופע"), `standingFromRoutine` ("מהקבועה"), an add placeholder if not reused
  from `view.doc*`.
- `src/commons/tasks/taskScreens.css` — `StandingAttachments` card + pinned read-only styles (tokens
  only).
- **RLS:** verify/possibly widen `node_entries` SELECT to workspace-member read (§5). No table change.
