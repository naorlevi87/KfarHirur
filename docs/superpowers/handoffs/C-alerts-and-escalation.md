# Handoff C — Alerts & escalation (notifications)

> Paste into a fresh Claude window. First read `CLAUDE.md`, `docs/architecture.md` §17,
> `src/commons/COMMONS.md`, and the routine/run spec
> `docs/superpowers/specs/2026-06-14-commons-recurring-routines-design.md`. Commons feature
> (`src/commons/`). Invoke `brainstorming` before building. This one is infra-heavy — scope carefully.

## Context
Placeholder route exists: `/commons/:workspaceSlug/alerts` → `ComingSoonPage` (the התראות tab). Email is
already wired (Resend, key in `.env.local` — see CLAUDE.md §Email). Recurrence runs on pg_cron at 08:00
(`commons.run_recurrences`). Tasks carry roles (`role_ids`), owners, `due_date`, `occurrence_date`,
`completed_*`, and the op-day model (`src/commons/opDay.js`).

## Desired outcome
Turn overdue/missed signals into action:
- **Item overdue** → notify its owner (or, if unassigned, the responsible role).
- **Run incomplete at the 08:00 rollover** → notify the workspace managers.
- **A critical item missed** → escalate to admin.
- Channels: **in-app** (the התראות tab — a notifications list/bell) + **email** (Resend). Optionally a
  manager **morning digest** of yesterday (done/missed/late) instead of per-event spam.

## Behavior to nail down (brainstorm)
- A per-routine / per-item **"critical"** flag to decide what escalates (new column?).
- Real-time vs digest; dedupe so one missed run isn't 20 emails.
- Notification model: a `commons.notifications` table (recipient, type, node_id, read_at) + a generator
  (extend `run_recurrences` or a second cron job) + email send (Edge Function using Resend).
- Recipients from roles/owners/permission_level; respect membership; Israeli privacy (opt-in, no PII leakage).

## Constraints
- Likely needs: a notifications table + RLS (recipient-scoped), a cron/Edge function to generate + send,
  in-app read state, and UI on the alerts tab. Keep data-source opacity. No hardcoded strings.
- Don't block the UI on email; email is best-effort (mirror the invite-email pattern already in the repo).

## Likely files
`supabase/migrations/*`, an Edge Function for sending, `src/data/commons/notificationQueries.js`,
`src/commons/pages/` alerts screen (replace ComingSoon), `CommonsMenu`/bell badge, content files.
