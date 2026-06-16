# Commons — persistent shell + user-protection guards

<!-- COMMONS-VISION · canonical: docs/superpowers/specs/2026-06-09-community-work-engine-design.md -->
> **Commons — why this exists.** Commons helps any group of people acting together for a shared purpose run itself. The Joz ve Loz crew is the first, not the last — it must replicate to a community garden, a social project, a protest, an עמותה. The long arc is a *network* of these projects.
>
> **This is not another org/management tool — and it must never feel like one.** Communal, circular, non-hierarchical, and *playful*. You're part of it like everyone else; no one drops tasks on you from above. Surface the shared work, celebrate what we did together, never rank people — "פנוי — מי לוקח?", not "unassigned". If a choice wouldn't fit a community garden as well as a kitchen — or makes someone feel *managed* instead of *part of it* — it's wrong.
>
> *Direction: collective decision-making lives here too, later.*

> 2026-06-12. Keep the header + hamburger + bottom tabs present on every Commons screen, and make
> that safe by protecting the user from accidental loss of work.

## Principle (becomes a hard rule)
**Protect the user from mistakes.**
1. Never lose in-progress work silently — leaving a dirty form must prompt to confirm discarding.
2. Never perform an irreversible/destructive action (delete) without explicit confirmation.
3. Prefer reversible designs (reopen / undo) over blocking where the action is cheap to undo.

## A. Persistent shell
> **Superseded (rendering only):** the single-bar rendering below was replaced by the **two-band header**
> in `docs/commons-standards.md` §1.1 (workspace name in band ① always; screen title in band ②). The
> chrome API (`useCommonsChrome({ title, showBack, action })`) is unchanged — only `CommonsLayout`'s
> rendering split into two bands. The persistent-shell + guard design here otherwise stands.

Today the focused screens (task new/view/edit, members, roles) render *outside* `CommonsLayout`, each
with its own `commons-screen__bar`. Move them *inside* `CommonsLayout` so the global top bar and bottom
tabs always render. The top bar becomes **adaptive** via `CommonsChromeContext`:
- Always shows ☰. On a focused screen it also shows a back chevron, the screen title, and an optional
  single action (Edit / Invite).
- Each focused screen calls `useCommonsChrome({ title, showBack, action })` on mount; tab pages leave it
  default (workspace name, no back). The four duplicated `commons-screen__bar` headers are removed.
- Back chevron action is owned by the layout: `guardedNavigate(-1)`.

## B. Unsaved-changes guard
- `NavGuardContext` (wraps the layout): the active form registers an `isDirty()` predicate; exposes
  `guardedNavigate(to)`. `TaskFormPage` registers dirty = any field changed from initial.
- All chrome navigations (bottom tabs, ☰ menu items, back chevron, workspace switcher, back-to-site)
  go through `guardedNavigate`. If a dirty form is registered, it opens a `ConfirmDialog`
  ("changes won't be saved" · Stay / Discard) instead of navigating.
- A `beforeunload` listener is active while a form is dirty → covers browser refresh / tab-close.
- The form's own Save/Delete navigate directly (dirty cleared on commit) so they never prompt.

## C. Destructive actions → branded `ConfirmDialog`
- Task **delete** (`TaskFormPage`) — add confirm (was immediate; the reported data-loss bug).
- Skill **delete** (`RolesPage`) — add confirm (was immediate).
- **Cancel-invite** + **member-removal** (`MembersPage`) — move to the branded dialog (was
  immediate / `window.confirm`).
- Task complete-all already uses `ConfirmDialog` (unchanged). Completion stays one-tap (reopen = undo).

## D. Docs
- CLAUDE.md — add the principle as a hard rule.
- COMMONS.md — document the persistent shell + nav-guard behavior.

## Technical note
The app uses `BrowserRouter` + `Routes` (not a data router), so React Router's `useBlocker` is
unavailable. Blocking is implemented by routing chrome navigations through `guardedNavigate` (in-app)
plus `beforeunload` (browser-level). No router migration.
