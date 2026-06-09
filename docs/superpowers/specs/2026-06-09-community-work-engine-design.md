# Community Work Engine — Design Spec

> Source of truth for the Work Engine. Created 2026-06-09 via the brainstorming process.
> Architecture decision pressure-tested through the llm-council.
> This is the product/design spec. Each build increment (§12) gets its own implementation plan.

---

## 1. Overview & purpose

The **Community Work Engine** is a task/project coordination tool that lives *alongside* the Kfar Hirur site and shares its login. It is built around **responsibility, execution, and coordination** — not content or social interaction.

First real users: the **Joz ve Loz** restaurant crew, on their phones, during shifts. The architecture is intentionally generic so additional independent workspaces (other businesses/communities) can be added later without a rewrite.

The engine is a **self-contained module inside the existing app** (`src/work/`, mounted at `/work`), reusing only four shared primitives: the Supabase client, the auth session, the design-token system, and the deploy pipeline. Everything else is its own.

---

## 2. Scope

**Phase 1 = the first release = everything functional.** The crew gets nothing until the whole thing works (decided explicitly). It is built in safe internal increments (§12), but there is no partial release.

Phase 1 includes: workspaces, the Area→Task tree, ownership (owner) + execution (contributors), assignment + claiming, configurable roles, the full status lifecycle (incl. approval + missed), checklists, the in-task history log, attachments, recurring tasks, the situational overview, in-app + email notifications, and member onboarding.

**Deferred (not in Phase 1):**
- **Phone push notifications** — needs service workers / a mobile app. In-app + email cover launch.
- **Granular configurable permissions** — Phase 1 ships a simple 3-value `permission_level` enum (admin/manager/member). A custom permission matrix is later.
- **Multi-workspace onboarding UI** — the schema is multi-workspace from day 1, but creating/managing many workspaces in-app is later. Joz is seeded.
- **Extracting `src/work/` into a standalone app** — done only when usage justifies it. The module is structured so this is a lift-and-shift, not a rewrite.
- KPI/scoring/gamification/analytics/advanced reporting — out, per the original spec.

---

## 3. Architecture decision (council-validated)

**Chosen:** a self-contained module inside the existing SPA — `src/work/` at the `/work` subpath — with its own `work` Postgres schema, sharing auth + Supabase client + tokens + deploy.

The council (5 advisors + peer review) converged on this over a *separate app*:
- A separate Vite app/subdomain is **premature complexity** for a handful of users; the split is **reversible**, the schema is the only **irreversible** decision.
- **Subpath, not subdomain** — same origin means the Supabase session "just works"; a subdomain breaks the shared session unless you fight cookie-domain/`storageKey`/redirect config for no benefit at this scale.
- **Do not reuse the site's `user_roles` table** — site roles and work roles are different universes. Auth is shared; **authorization is not**.
- **`workspace_id` on every table, in every RLS policy and unique constraint** — a column alone is not multi-tenancy.
- **Separate `work` schema** hedges the shared-backend blast radius: a bad work migration can't touch the live site's `public` tables.
- Avoid over-building — but recurring chores + claiming are *core value* for a restaurant, not extras (the reason Phase 1 is full-featured).

---

## 4. Vocabulary (locked)

| Term | Meaning | Example |
|---|---|---|
| **Workspace** | A tenant/organization. Fully isolated. | Joz ve Loz |
| **Area** | A container node. Organizes only; **cannot be completed or assigned**. Can nest. | Kitchen, Bar, Operations, Marketing |
| **Task** | A unit of work. Parent is **either an Area or another Task** (sub-tasks). | "Clean the espresso machine" |
| **Role** | Workspace-configurable responsibility/expertise. Drives relevance + claim eligibility. **Not permissions.** | Bartender, Kitchen |
| **permission_level** | What a member may *do*: `admin` / `manager` / `member`. | — |
| **Recurring (חוזרת)** | A task generated on a schedule. The standing-routine sense is "בנוהל"; "הוסף לנוהל" = add to the routine. | Daily bar closing |

3-level mental model: **Workspace → Areas → Tasks (with sub-tasks).**

---

## 5. Data model (`work` schema)

All tables carry `workspace_id`. Every RLS policy is scoped by `EXISTS (select 1 from work.workspace_members m where m.workspace_id = <row>.workspace_id and m.user_id = auth.uid() and m.status = 'active')`.

**Identity & access**
- `workspaces` — `id`, `slug`, `name`, `created_at`
- `workspace_members` — `id`, `workspace_id`, `user_id`→`auth.users`, `permission_level` (`admin`|`manager`|`member`), `status` (`active`|`pending`|`invited`), `display_name`, `created_at`
- `roles` — `id`, `workspace_id`, `name`, `color`
- `member_roles` — `member_id`, `role_id`

**The tree**
- `areas` — `id`, `workspace_id`, `parent_area_id` (nullable), `name`, `position`, `created_at`
- `tasks` — `id`, `workspace_id`, `area_id`, `parent_task_id` (nullable), `title`, `description`, `status` (`open`|`in_progress`|`pending_approval`|`completed`|`missed`|`cancelled`), `requires_approval` (bool), `assignment_mode` (`assigned`|`open`), `owner_id` (→member, nullable), `assignee_id` (→member, nullable), `due_at` (nullable), `recurring_template_id` (nullable), `created_by`, `created_at`, `updated_at`, `completed_at`

> Areas have **no status column** — they cannot be completed, by construction. A task with `parent_task_id IS NULL` sits directly in its `area_id`; otherwise it is a sub-task and shares its parent's `area_id`.

**Execution detail**
- `task_contributors` — `task_id`, `member_id`
- `task_eligible_roles` — `task_id`, `role_id` *(who may claim an `open` task)*
- `checklist_items` — `id`, `task_id`, `label`, `is_done`, `position`

**Recurrence**
- `task_templates` — `id`, `workspace_id`, `area_id`, `title`, `description`, `recurrence_rule`, `default_owner_id`, `default_assignment_mode`, `requires_approval`, `due_offset`, `generation_offset`, `end_condition`, `active`
- `template_eligible_roles` — `template_id`, `role_id`
- Generated tasks link back via `tasks.recurring_template_id`.

**Collaboration**
- `activity` — `id`, `workspace_id`, `task_id`, `actor_id`, `type` (`comment`|`status_change`|`assignment`|`claim`|`file`|`link`|`system`), `body`, `metadata` (jsonb), `created_at`
- `attachments` — `id`, `workspace_id`, `task_id`, `activity_id`, `kind` (`file`|`link`), `url`, `label`, `uploaded_by`, `created_at` *(files in a workspace-scoped Supabase Storage bucket)*
- `tags` + `task_tags` — workspace-scoped labels for filtering

**Notifications**
- `notifications` — `id`, `workspace_id`, `recipient_member_id`, `type`, `task_id`, `body`, `is_read`, `created_at`

**Ownership/assignment semantics**
- `owner` = single accountable person.
- `assignment_mode = assigned` → `assignee_id` is set directly.
- `assignment_mode = open` → `assignee_id` empty until an eligible-role member **claims**; on claim they become `assignee` and a `claim` activity is logged.
- `contributors` = everyone who actually pitched in (set as work happens / on completion).
- If `requires_approval`, completing moves the task to `pending_approval` until a manager/admin approves.

---

## 6. Module structure (`src/work/`)

Mirrors the site's layered architecture, self-contained. Shares nothing internal with the site except the four primitives.

```text
src/work/
  WorkModule.jsx          — module root, owns /work/* routing
  WorkLayout.jsx          — shell: workspace name, bottom tab nav, bell, user menu. Own look, NO consciousness mode.
  workState/
    WorkspaceContext.jsx  — current workspace + my membership + my roles + permission_level
    useWorkspace.js       — hook; throws outside provider
  pages/
    DashboardPage/        — "My Tasks" (home)
    BoardPage/            — areas grid → area → task list
    TaskPage/             — task detail (single scroll)
    OverviewPage/         — "תמונת מצב" (snapshot + יומן toggle)
    NotificationsPage/    — bell list
    manage/               — members, roles, areas, templates (admin/manager)
  features/
    taskTree/  taskDetail/  claiming/  recurrence/  activityFeed/  notifications/
  data/
    workClient.js         — wraps shared supabase, scoped to `work` schema (supabase.schema('work'))
    workspaceQueries.js · taskQueries.js · areaQueries.js · roleQueries.js
    recurrenceQueries.js · activityQueries.js · notificationQueries.js
    resolvers + hooks (useMyTasks, useArea, useTask, useOverview, …)
  content/
    he/  en/              — all UI copy (no hardcoded strings; en/ scaffolded like the site)
  styles/                 — work tokens + per-component CSS
  WORK.md                 — self-contained module documentation (source of truth for the engine)
```

**Carried-over non-negotiables (from `docs/architecture.md` & `docs/workflow.md`):**
- **Data-source opacity** — components call a hook/resolver and receive a semantic payload; they never touch Supabase or know about the `work` schema, modes, etc.
- **No hardcoded user-facing strings** — all copy through `content/`.
- **Mobile-first** — phone is the primary target; desktop is a separate pass. `min-h-[100dvh]`, no fixed pixel dims.
- **Resolver pattern, layered ownership** — exactly as the site does it.
- **Documentation discipline** — `WORK.md` + a file-header comment on every file + a pointer from `docs/architecture.md`. Must pass the handoff test (a cold developer/agent can contribute correctly).

**Config note:** Supabase exposes only `public` to the API by default. Add `work` to the project's *Exposed schemas* and use `supabase.schema('work')` in `workClient.js`.

---

## 7. Auth, membership & onboarding

- **Same login as the site** — shared Supabase auth, one session, no second password.
- **Access to `/work` requires an `active` `workspace_member`.** A logged-in non-member sees a clean "no access — ask an admin" screen (no redirect loop).
- **`WorkspaceContext`** resolves membership from `auth.uid()` → `permission_level` + `roles`, which drive what the UI shows.
- **Bridge:** members see a "Work / עבודה" entry in the site menu → `/work`; non-members don't see it.
- **First admins** (Naor + Shay) are seeded once via a service-role script into the Joz workspace.
- **Onboarding — two paths:**
  1. **Admin invites by email** → Resend invite link → set password → land in `/work`. Admin sets `permission_level` + roles. (`status = invited` → `active`.)
  2. **Self-request → admin approval** — a logged-in site user requests to join (`status = pending`); an admin approves and assigns roles (`status = active`). The Manage Members screen surfaces pending requests.
- **Permission levels:** `admin` (manage members/roles/areas/templates, approve) · `manager` (create/assign/approve tasks, manage areas) · `member` (do, claim, comment, complete).
- **Roles** (Bartender, Kitchen…) are orthogonal to permission level — relevance + claim eligibility only.

---

## 8. Screens & UX (mobile-first, validated via mockups)

**Navigation:** bottom tab bar, **4 tabs** — `שלי` (My Tasks) · `לוח` (Board) · `תמונת מצב` (Overview) · `התראות` (Notifications). Home = **My Tasks**.

**My Tasks (home):** filter pills (היום / באיחור / לאישור), task rows with area chip + due. A floating **`+` create button** (thumb-reach, keyboard-focusable, labeled "משימה חדשה").

**Create sheet** (from `+`): title, area (pre-filled if inside one), assign-to-person *or* leave open-to-a-role, due, **חוזרת** toggle (expands recurrence options), **requires-approval** toggle.

**Board:** areas grid (Kitchen/Bar/Operations/Marketing) with open/overdue counts → drill into an area → its task list.

**Task detail (single long scroll, layout A):** header (title, area, status chip, `↻` if recurring, due) → owner + contributors → **checklist with always-visible quick-add** ("＋ הוסף פריט", one tap, Enter to add; on recurring tasks defaults to *this instance only* with **"הוסף לנוהל"** to make it permanent) → **היסטוריה** (the chronological log: comments, status/assignment/claim/system events; add-comment box) → **pinned, state-aware action button** at the bottom:
- mine, not started → `התחל`
- in progress → `סמן כבוצע`
- requires approval, after completion → `ממתין לאישור`
- open + I'm eligible → yellow **`קח משימה`** (claim)
- manager + pending approval → green **`אשר ביצוע`**

**תמונת מצב (Overview tab):** one tab, top segmented toggle:
- **תמונת מצב** (default) — snapshot: counts (פתוחות / באיחור / לאישור / הושלמו היום) + per-area status + a short "לאחרונה" strip.
- **יומן** — the full chronological workspace feed (completions, claims, opens, missed, comments).

**Claim flow:** an open task shows a "פנויה" chip + eligible roles + the yellow claim button; claiming makes it the member's, moves it into "שלי", and logs a `claim` activity.

**Recurrence setup** (inside the create sheet when "חוזרת" is on): frequency (יום / ימים / שבוע / חודש), day-of-week picker, target time, *when the instance is generated*, end condition; default assignment (person or open-to-role).

---

## 9. Recurrence & notifications infrastructure

All managed by Supabase — no self-run server.
- **`pg_cron` heartbeat** (nightly, + hourly for due scans): generates recurring task instances from active templates; marks the previous instance `missed` if not completed (it stays in history, a new instance is still created); scans for due/overdue tasks and writes `notifications`.
- **Edge Function + Resend**: sends email for important notifications (overdue digests, assignments). Resend is already configured (`RESEND_API_KEY`).
- **Realtime**: the open board / overview subscribe to `tasks` + `activity` changes for live updates.
- **Notifications tiers at launch:** in-app (bell + `notifications` rows) and email. **Phone push deferred.**

---

## 10. Copy / voice direction

- **Playful, warm, light Hebrew. Never corporate.** Aligns with `docs/voice.md` (human, not "pretty but dead").
- Recurring = **"חוזרת"**; the standing-routine sense uses **"נוהל / בנוהל"**; the add-to-template action = **"הוסף לנוהל"**.
- Exact strings are a dedicated polish pass; all copy lives in `content/` (no hardcoded strings).

---

## 11. Accessibility & privacy (legal — IS 5568 / Israeli Privacy Law)

- **IS 5568 / WCAG 2.1 AA**: contrast 4.5:1 (normal) / 3:1 (large); all interactive elements keyboard-navigable with visible `focus-visible`; meaningful `alt`; the `+` and all actions properly labeled; no >3Hz flashing.
- **Privacy**: the engine stores **personal data about named people** (who's assigned/did what) — a step up from the public site. Requires explicit consent + a privacy-policy line covering the work data. Flag and handle before launch.

---

## 12. Build sequence (6 increments — each independently verifiable)

One release; built in this internal order. Each increment gets its own implementation plan.

1. **Foundation & shell** — `work` schema + migrations (workspaces, workspace_members, roles, member_roles), RLS, seed Joz + admins, expose schema, `src/work/` skeleton, `/work` route, WorkLayout, WorkspaceContext, access gate, site menu entry, start `WORK.md`. *Verify: reach `/work` scoped to Joz; non-members blocked.*
2. **The tree + core loop** — areas + tasks, Board → area → task list, create area, create task (FAB + sheet), task detail, status todo→in_progress→done, assignee, My Tasks, Realtime. *Verify: create/assign/complete; shows in My Tasks.*
3. **Execution depth** — checklist + quick-add, owner vs assignee, contributors, activity log + היסטוריה, attachments (Storage) + links. *Verify: checklist, comments, history populate.*
4. **Coordination** — open tasks + eligible-roles + claim, roles management UI + member roles, full lifecycle (pending_approval/missed/cancelled) + approval, תמונת מצב tab (snapshot + יומן). *Verify: claim works; approval works; overview shows real counts.*
5. **Recurrence + notifications** — task_templates, pg_cron (generate/missed/due scan), recurrence setup UI, notifications + bell, Resend emails via Edge Function. *Verify: instance generation, missed-marking, alerts.*
6. **Onboarding, polish & launch** — email invites + self-request/approval, manage screens, tags + filtering, IS 5568 a11y audit, privacy-policy line, desktop pass, finalize docs. *Verify: full onboarding; clean lint/build; a11y → release to Joz.*

---

## 13. Open / deferred decisions

- Exact `recurrence_rule` representation (RRULE string vs structured columns) — decide at increment 5.
- Final copy strings — dedicated polish pass.
- Desktop layout — separate pass (increment 6).
- Whether granular permissions are ever needed beyond the 3-level enum — revisit post-launch.

> Post-spec ideas (not part of any release yet) are parked in `docs/work-engine-ideas.md` — e.g. spaced-repetition acknowledgment reminders for new procedures.

---

## 14. Non-negotiables (carried from site docs)

Root structure, data-source opacity, resolver pattern, no hardcoded strings, content/data separation, mobile-first validation, "never commit without the user seeing it in the browser first", `SUPABASE_SERVICE_ROLE_KEY` stays in `.env.local`, and every decision happens once at the correct layer.
