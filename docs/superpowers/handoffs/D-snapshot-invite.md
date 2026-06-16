# Handoff D — the flat "מציע ל-X" invite (snapshot step 5)

> Paste into a fresh Claude window. First read `CLAUDE.md`, `src/commons/COMMONS.md`, the snapshot spec
> `docs/superpowers/specs/2026-06-16-commons-snapshot-screen-design.md` (esp. §6 Actions, §11 build
> status, §12 decisions), and the routines/runs spec `…2026-06-14-commons-recurring-routines-design.md`.
> Vision (binding): communal, circular, non-hierarchical, playful — no one drops tasks from above.
> Mobile-first; the `design-taste` skill applies. Branch: `feat/commons-snapshot` (or a fresh one off it).

## Why this is its own window
Snapshot steps 1–4 are built (palette · 3-state pulse · day-log · relevance window). Step 5 was held
back **on purpose**: unlike the rest it needs **backend RPCs** (members can't write `owner_id`/`proposed_to`
directly under RLS), so it deserves a careful, isolated pass — a half-built version would be insecure or
leave dangling proposals.

## The goal (founder decision)
Replace the **manager-only "עליו" (direct assign)** with a **flat invite anyone can send**:

- The free-item action becomes **one button: "מי לוקח?"** → opens a tiny choice:
  - **אני 🙌** — take it onto myself (existing `claim`).
  - **מציע ל-X** — pick a teammate; the task is marked **"הוצע ל-X"**; **X** then taps **accept** (it
    becomes theirs) or **pass** (back to open). An invitation they accept — never an order.
- **No manager special-case.** Anyone can take or suggest; this kills the last hierarchy in the pulse.
- **In-app only at launch** — the "הוצע ל-X" marker shows when X opens Commons. The real phone/lock-screen
  nudge comes with the future **notifications** feature (deliberately deferred — see the notifications note
  in the work-engine spec §9).

## Data
- New column **`commons.nodes.proposed_to uuid`** (→ `workspace_members.id`, nullable). Optional
  `proposed_by uuid` + `proposed_at timestamptz` for the marker/audit. Add to `FIELDS` in
  `src/data/commons/nodeQueries.js`.
- A proposal is cleared (`proposed_to = null`) on accept (then owner = the accepter) or pass.

## Backend (the reason for this window) — SECURITY DEFINER RPCs, member-allowed, in `commons` schema
- **`propose_node(node_id uuid, to_member uuid)`** — any active member; validates `to_member` is an active
  member of the node's workspace; sets `proposed_to`/`proposed_by`/`proposed_at`. (Mirror the validation
  style of `resolve_missed` in `20260614010000_commons_occurrence_ops.sql`.)
- **`respond_proposal(node_id uuid, accept boolean)`** — only the proposed member (`auth.uid()` maps to
  `proposed_to`); accept → set `owner_id = that member`, clear proposal; pass → clear proposal only.
- `grant execute … to authenticated`. New migration `supabase/migrations/2026061x…_commons_proposals.sql`,
  applied via `scripts/run-sql.mjs` (PAT in `.env.local`). Verify the functions + column afterward.

## Data layer + hook
- `nodeQueries.js`: `proposeNode(id, memberId)`, `respondProposal(id, accept)` (rpc wrappers).
- `useWorkspaceTree.js`: `propose`, `respondProposal` callbacks (optimistic update of the row).
- **Remove** the now-superseded `assign`/`assignNode` ("עליו") usage; the `AttributionSheet` "assign" mode
  and `useAttribution.openAssign` become the invite picker (reuse the member list UI).

## UI
- **Pulse free rows + parent take** (`SnapshotSections.jsx`): the inline **"עליי"** becomes **"מי לוקח?"**
  opening a small sheet (reuse/extend `AttributionSheet`): **אני** (→ `claim` / cascade for a parent) or
  **מציע ל-X** (member list → `proposeNode`).
- **A "הוצע ל-X" marker** on items with `proposed_to` (shown in the pulse + day screen). For the proposed
  member, the item shows **accept / pass** instead of "מי לוקח?".
- **DayPage** (`DayPage.jsx`): its `toHandle` rows currently use the old `openAssign` (🫵) — replace with
  the same invite flow; drop the manager-only assign button.
- Content keys in `src/content/commons/{he,en}` (no hardcoded strings): `whoTakes` ("מי לוקח?"), `meSelf`
  ("אני"), `proposeTo` ("מציע ל-…"), `proposedTo` ("הוצע ל-{name}"), `accept` ("מקבל/ת"), `pass` ("מעביר/ה
  הלאה"). Convey togetherness; **never say "ביחד"**.

## Acceptance
- A member can take a task (אני) or suggest it to a teammate (מציע ל-X) — no manager role involved.
- The suggested teammate sees "הוצע ל-X" and can accept (becomes owner) or pass (back to free).
- Manager-only "עליו" is gone; defer/skip stay manager+ (unchanged).
- `npm run lint` + `npm run build` clean; pure logic (if any) covered by a `node:assert` test; reviewed in
  the dev server before commit (project rule). Record the decision in `docs/commons-standards.md` if a new
  interaction standard is locked.
