# Work Engine — Increment 1 (Foundation & Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the isolated `work` database schema + identity/access tables, and a self-contained `src/work/` module mounted at `/work`, so a logged-in member reaches an (empty) Work Engine shell scoped to the Joz ve Loz workspace, while non-members are cleanly blocked.

**Architecture:** A self-contained module inside the existing React 19 + Vite SPA at `src/work/`, mounted at `/work/*` outside `MainLayout` (its own shell, no consciousness mode — like a separate app living in the repo). It reuses only the shared Supabase client, the auth session (`AuthContext`), and the deploy. All work data lives in a dedicated Postgres `work` schema with RLS scoped by active workspace membership. Full design: `docs/superpowers/specs/2026-06-09-community-work-engine-design.md`.

**Tech Stack:** React 19, React Router v6, Supabase (Postgres + Auth + RLS), Vite 8. Data access via `supabase.schema('work')`.

> **Testing note:** This project has **no automated test suite** (confirmed in `CLAUDE.md`). Introducing one is out of scope for Increment 1. Each task therefore ends with **explicit manual verification** (SQL query, REST curl, browser check, or `lint`/`build`) instead of a unit test — but every verification has an exact command and an expected result. Frequent commits still apply.

> **Windows/shell note (from `CLAUDE.md`):** never use Bash for file ops on this machine. Run npm as: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" <cmd>`. Run node scripts the same way. Git: `git <cmd>` (fallback `"/c/Program Files/Git/bin/git"`).

---

## File map (what this increment creates/touches)

**Database / scripts**
- Create: `supabase/migrations/20260609000000_work_schema_foundation.sql` — the `work` schema, 4 tables, helpers, RLS, grants
- Create: `scripts/seed-work-foundation.js` — seeds the Joz workspace + Naor/Shay admins

**Data layer**
- Create: `src/data/work/workClient.js` — shared Supabase client scoped to `work` schema
- Create: `src/data/work/workspaceQueries.js` — workspace + membership + roles reads
- Create: `src/data/work/useWorkMembership.js` — lightweight membership check for the site menu

**Content**
- Create: `src/content/work/he/workShell.content.js` + `src/content/work/en/workShell.content.js`
- Modify: `src/content/site/he/siteShell.content.js` + `src/content/site/en/siteShell.content.js` — add `navigation.work` label

**Module (`src/work/`)**
- Create: `src/work/resolveWorkShellContent.js`
- Create: `src/work/styles/work-tokens.css`, `src/work/styles/WorkLayout.css`
- Create: `src/work/workState/WorkspaceContext.jsx`
- Create: `src/work/WorkLayout.jsx`, `src/work/NoAccessScreen.jsx`, `src/work/WorkModule.jsx`
- Create: `src/work/pages/DashboardPage/DashboardPage.jsx`
- Create: `src/work/pages/ComingSoonPage/ComingSoonPage.jsx`
- Create: `src/work/WORK.md`

**Wiring**
- Modify: `src/app/App.jsx` — add the `/work/*` route
- Modify: `src/app/HamburgerMenu.jsx` — add the member-only Work entry
- Modify: `docs/architecture.md` — add a pointer to the work module

---

## Task 1: The `work` schema, tables, RLS & grants

**Files:**
- Create: `supabase/migrations/20260609000000_work_schema_foundation.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260609000000_work_schema_foundation.sql
-- Community Work Engine — Increment 1 foundation.
-- Creates the isolated `work` schema with identity & access tables, RLS, and helpers.
-- Areas/tasks arrive in increment 2. Auth is shared with the site; authorization is NOT
-- (this schema does not touch the site's `user_roles` table).

create schema if not exists work;
grant usage on schema work to anon, authenticated, service_role;

-- ── workspaces (tenants) ──────────────────────────────────────
create table if not exists work.workspaces (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

-- ── workspace_members ─────────────────────────────────────────
create table if not exists work.workspace_members (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references work.workspaces(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  permission_level text not null default 'member' check (permission_level in ('admin','manager','member')),
  status           text not null default 'active'  check (status in ('active','pending','invited')),
  display_name     text,
  created_at       timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ── roles (responsibility/expertise — NOT permissions) ────────
create table if not exists work.roles (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references work.workspaces(id) on delete cascade,
  name         text not null,
  color        text,
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

-- ── member_roles ──────────────────────────────────────────────
create table if not exists work.member_roles (
  member_id uuid not null references work.workspace_members(id) on delete cascade,
  role_id   uuid not null references work.roles(id) on delete cascade,
  primary key (member_id, role_id)
);

-- ── Helpers (SECURITY DEFINER → bypass RLS, avoid policy recursion) ──
create or replace function work.is_active_member(wid uuid)
returns boolean as $$
  select exists (
    select 1 from work.workspace_members m
    where m.workspace_id = wid and m.user_id = auth.uid() and m.status = 'active'
  );
$$ language sql security definer stable;

create or replace function work.my_permission(wid uuid)
returns text as $$
  select permission_level from work.workspace_members
  where workspace_id = wid and user_id = auth.uid() and status = 'active'
  limit 1;
$$ language sql security definer stable;

grant execute on function work.is_active_member(uuid) to anon, authenticated;
grant execute on function work.my_permission(uuid)   to anon, authenticated;

-- ── RLS ───────────────────────────────────────────────────────
alter table work.workspaces        enable row level security;
alter table work.workspace_members enable row level security;
alter table work.roles             enable row level security;
alter table work.member_roles      enable row level security;

create policy "members read workspace" on work.workspaces
  for select using (work.is_active_member(id));

create policy "read own membership" on work.workspace_members
  for select using (user_id = auth.uid());

create policy "members read roster" on work.workspace_members
  for select using (work.is_active_member(workspace_id));

create policy "admins manage members" on work.workspace_members
  for all using (work.my_permission(workspace_id) = 'admin')
  with check (work.my_permission(workspace_id) = 'admin');

create policy "members read roles" on work.roles
  for select using (work.is_active_member(workspace_id));

create policy "admins manage roles" on work.roles
  for all using (work.my_permission(workspace_id) = 'admin')
  with check (work.my_permission(workspace_id) = 'admin');

create policy "members read member_roles" on work.member_roles
  for select using (exists (
    select 1 from work.workspace_members m
    where m.id = member_roles.member_id and work.is_active_member(m.workspace_id)
  ));

create policy "admins manage member_roles" on work.member_roles
  for all using (exists (
    select 1 from work.workspace_members m
    where m.id = member_roles.member_id and work.my_permission(m.workspace_id) = 'admin'
  ))
  with check (exists (
    select 1 from work.workspace_members m
    where m.id = member_roles.member_id and work.my_permission(m.workspace_id) = 'admin'
  ));

-- ── Table grants for PostgREST (RLS still governs row visibility) ──
grant select, insert, update, delete on all tables in schema work to authenticated;
grant select on all tables in schema work to anon;
alter default privileges in schema work grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema work grant select on tables to anon;
```

- [ ] **Step 2: Apply the migration**

Run it in the Supabase **SQL Editor** (paste the file contents and run), or via the Management API curl documented in `.env.local` (see the `reference_supabase_access` note). This mirrors how `supabase/roles_schema.sql` is applied.

- [ ] **Step 3: Verify the schema & tables exist**

Run in SQL Editor:
```sql
select table_name from information_schema.tables where table_schema = 'work' order by table_name;
```
Expected: `member_roles`, `roles`, `workspace_members`, `workspaces`.

- [ ] **Step 4: Verify RLS is on**

```sql
select relname, relrowsecurity from pg_class
where relnamespace = 'work'::regnamespace and relkind = 'r';
```
Expected: all four tables show `relrowsecurity = t`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260609000000_work_schema_foundation.sql
git commit -m "feat(work): add work schema foundation (tables, RLS, helpers)"
```

---

## Task 2: Expose the `work` schema to the API

PostgREST only serves `public` by default; the client's `supabase.schema('work')` calls fail until `work` is exposed.

**Files:** none (Supabase project setting)

- [ ] **Step 1: Add `work` to exposed schemas**

In the Supabase dashboard: **Project Settings → API → Exposed schemas** → add `work` (keep `public`, `graphql_public`) → save. (Alternatively, set it via the Management API using the PAT in `.env.local`.)

- [ ] **Step 2: Verify the schema is reachable over REST**

Run (replace `<ANON_KEY>` with `VITE_SUPABASE_ANON_KEY` from `.env.local`):
```bash
curl -s 'https://kqlfvwlzayinngrgafec.supabase.co/rest/v1/workspaces' \
  -H "apikey: <ANON_KEY>" -H "Accept-Profile: work"
```
Expected: `[]` (empty array — RLS hides rows from the anonymous role). 
Failure signal: a JSON error like `"The schema must be one of the following: public, ..."` means the schema is **not** exposed yet — redo Step 1.

- [ ] **Step 3: No commit** (project setting, nothing in the repo). Note the change in the PR/commit description for Task 3.

---

## Task 3: Seed the Joz workspace + admins

**Files:**
- Create: `scripts/seed-work-foundation.js`

- [ ] **Step 1: Write the seed script**

```js
// scripts/seed-work-foundation.js
// One-time seed: creates the Joz ve Loz workspace and adds Naor & Shay as admins.
// Resolves users by email via the admin API; users without an account yet are warned + skipped.
// Re-runnable (upserts). Uses the service role key — never run in the browser.
//
// Run:
//   node --env-file=.env.local scripts/seed-work-foundation.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

// Data client scoped to the work schema; admin client for auth lookups.
const db        = createClient(SUPABASE_URL, SERVICE_KEY, { db: { schema: 'work' } });
const authAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

const WORKSPACE = { slug: 'joz-ve-loz', name: "ג'וז ולוז" };
const ADMINS = [
  { email: 'naorlevi87@gmail.com', display_name: 'נאור' },
  { email: 'sknic83@gmail.com',    display_name: 'שי'  },
];

const { data: ws, error: wsErr } = await db
  .from('workspaces')
  .upsert({ slug: WORKSPACE.slug, name: WORKSPACE.name }, { onConflict: 'slug' })
  .select()
  .single();
if (wsErr) { console.error('Workspace seed failed:', wsErr.message); process.exit(1); }
console.log(`Workspace ready: ${ws.name} (${ws.id})`);

const { data: list, error: listErr } = await authAdmin.auth.admin.listUsers({ perPage: 1000 });
if (listErr) { console.error('listUsers failed:', listErr.message); process.exit(1); }

for (const admin of ADMINS) {
  const u = list.users.find(x => x.email?.toLowerCase() === admin.email.toLowerCase());
  if (!u) {
    console.warn(`No account for ${admin.email} yet — skipped. Re-run after they sign up.`);
    continue;
  }
  const { error: mErr } = await db
    .from('workspace_members')
    .upsert(
      { workspace_id: ws.id, user_id: u.id, permission_level: 'admin', status: 'active', display_name: admin.display_name },
      { onConflict: 'workspace_id,user_id' }
    );
  if (mErr) { console.error(`Member seed failed for ${admin.email}:`, mErr.message); process.exit(1); }
  console.log(`OK ${admin.email} -> admin`);
}

console.log('Done.');
```

- [ ] **Step 2: Run the seed**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/node" --env-file=.env.local scripts/seed-work-foundation.js
```
Expected: `Workspace ready: ג'וז ולוז (<uuid>)` then `OK naorlevi87@gmail.com -> admin`. Shay may print the "no account yet" warning if he hasn't signed up — that's fine; re-run later.

- [ ] **Step 3: Verify the rows**

In SQL Editor:
```sql
select w.slug, m.permission_level, m.status, m.display_name
from work.workspace_members m join work.workspaces w on w.id = m.workspace_id;
```
Expected: at least one row — `joz-ve-loz | admin | active | נאור`.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-work-foundation.js
git commit -m "feat(work): add Joz workspace + admins seed script"
```

---

## Task 4: Work data layer (client + queries)

**Files:**
- Create: `src/data/work/workClient.js`
- Create: `src/data/work/workspaceQueries.js`

- [ ] **Step 1: Write the schema-scoped client**

```js
// src/data/work/workClient.js
// Work Engine data handle: the shared Supabase client scoped to the `work` schema.
// Import this only inside src/data/work/ — never from components or features directly.

import { supabase } from '../timeline/supabaseClient.js';

// Every work-engine table read/write goes through this schema-scoped handle.
export const workDb = supabase.schema('work');
```

- [ ] **Step 2: Write the workspace/membership queries**

```js
// src/data/work/workspaceQueries.js
// Reads for workspace identity and the signed-in user's membership + roles.
// The data source (Supabase, `work` schema, RLS) is hidden behind these functions.

import { workDb } from './workClient.js';

// The workspace a slug points to, or null.
export async function fetchWorkspaceBySlug(slug) {
  const { data, error } = await workDb
    .from('workspaces')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

// The current user's active membership in a workspace, or null.
export async function fetchMyMembership(workspaceId, userId) {
  const { data, error } = await workDb
    .from('workspace_members')
    .select('id, permission_level, status, display_name')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

// The role names/colors attached to a membership.
export async function fetchMemberRoles(memberId) {
  const { data, error } = await workDb
    .from('member_roles')
    .select('roles(name, color)')
    .eq('member_id', memberId);
  if (error) return [];
  return (data ?? []).map(r => r.roles).filter(Boolean);
}
```

- [ ] **Step 3: Lint the new files**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint
```
Expected: no new errors for `src/data/work/*`.

- [ ] **Step 4: Commit**

```bash
git add src/data/work/workClient.js src/data/work/workspaceQueries.js
git commit -m "feat(work): add work data client + workspace queries"
```

---

## Task 5: Shell content + resolver

**Files:**
- Create: `src/content/work/he/workShell.content.js`
- Create: `src/content/work/en/workShell.content.js`
- Create: `src/work/resolveWorkShellContent.js`

- [ ] **Step 1: Write the Hebrew content**

```js
// src/content/work/he/workShell.content.js
// Hebrew UI copy for the Work Engine shell (Increment 1).
// Voice: playful, warm, light — never corporate (see docs/voice.md). Strings are placeholder-quality;
// a dedicated copy pass comes later.

export const workShellContent = {
  appName: 'מרחב העבודה',
  nav: {
    myTasks: 'שלי',
    board: 'לוח',
    overview: 'תמונת מצב',
    alerts: 'התראות',
    menuAriaLabel: 'ניווט מרחב העבודה',
  },
  dashboard: {
    emptyTitle: 'הכל רגוע פה',
    emptyBody: 'עוד אין משימות. תכף נמלא את זה.',
  },
  comingSoon: {
    title: 'בקרוב כאן',
    body: 'עוד עובדים על זה.',
  },
  access: {
    loading: 'רגע, פותחים לך…',
    noAccessTitle: 'אופס, אין לך גישה לפה עדיין',
    noAccessBody: 'המרחב הזה פתוח רק לחברי הצוות. דברו עם מנהל כדי שיוסיפו אותך.',
    backToSite: 'חזרה לאתר',
  },
};
```

- [ ] **Step 2: Write the English mirror (scaffold, like the site's `en/`)**

```js
// src/content/work/en/workShell.content.js
// English mirror of the Work Engine shell copy. Scaffolded for future locale support;
// locale is hardcoded to 'he' in App.jsx today.

export const workShellContent = {
  appName: 'Work Space',
  nav: {
    myTasks: 'Mine',
    board: 'Board',
    overview: 'Status',
    alerts: 'Alerts',
    menuAriaLabel: 'Work space navigation',
  },
  dashboard: {
    emptyTitle: "All calm here",
    emptyBody: 'No tasks yet. We will fill this soon.',
  },
  comingSoon: {
    title: 'Coming soon',
    body: 'Still working on it.',
  },
  access: {
    loading: 'One sec, letting you in…',
    noAccessTitle: "Oops, you don't have access here yet",
    noAccessBody: 'This space is for team members only. Ask an admin to add you.',
    backToSite: 'Back to site',
  },
};
```

- [ ] **Step 3: Write the resolver**

```js
// src/work/resolveWorkShellContent.js
// Resolver for localized Work Engine shell copy. Mirrors the site's resolver pattern.

import { workShellContent as he } from '../content/work/he/workShell.content.js';
import { workShellContent as en } from '../content/work/en/workShell.content.js';

const byLocale = { he, en };

export function resolveWorkShellContent(locale) {
  return byLocale[locale] ?? byLocale.he;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/content/work/ src/work/resolveWorkShellContent.js
git commit -m "feat(work): add shell content (he/en) + resolver"
```

---

## Task 6: Module styles (tokens + layout)

**Files:**
- Create: `src/work/styles/work-tokens.css`
- Create: `src/work/styles/WorkLayout.css`

- [ ] **Step 1: Write the tokens (independent of consciousness mode)**

```css
/* src/work/styles/work-tokens.css */
/* Work Engine design tokens — its own palette, NOT tied to the site's Naor/Shay modes. */

.work-root {
  --work-bg:        #14161c;
  --work-surface:   #1d2029;
  --work-surface-2: #272b37;
  --work-text:      #e8e8ee;
  --work-text-dim:  #9aa3b2;
  --work-accent:    #6c8cff;
  --work-border:    #2a2e3a;
  --work-radius:    12px;

  min-height: 100dvh;
  background: var(--work-bg);
  color: var(--work-text);
}
```

- [ ] **Step 2: Write the layout CSS (mobile-first)**

```css
/* src/work/styles/WorkLayout.css */
/* Work Engine shell: sticky top bar, scrollable content, fixed bottom tab nav. Mobile-first. */

.work-layout { display: flex; flex-direction: column; min-height: 100dvh; }

.work-topbar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  background: var(--work-surface);
  border-bottom: 1px solid var(--work-border);
}
.work-topbar__name { font-weight: 700; font-size: 16px; }

.work-content { flex: 1; padding: 16px 16px 84px; }

.work-tabbar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex;
  background: var(--work-surface);
  border-top: 1px solid var(--work-border);
  padding: 8px 4px;
}
.work-tab {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: none; border: 0;
  color: var(--work-text-dim);
  font: inherit; font-size: 11px;
  padding: 4px; cursor: pointer; text-decoration: none;
}
.work-tab.active { color: var(--work-accent); font-weight: 700; }
.work-tab__icon { font-size: 18px; line-height: 1; }
.work-tab:focus-visible { outline: 2px solid var(--work-accent); outline-offset: 2px; border-radius: 8px; }

.work-center {
  min-height: 100dvh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; gap: 10px; padding: 24px;
}
.work-center h1 { font-size: 20px; }
.work-center p { color: var(--work-text-dim); max-width: 32ch; }
.work-backlink {
  margin-top: 8px; background: none; border: 0; cursor: pointer;
  color: var(--work-accent); font: inherit; text-decoration: underline;
}
.work-backlink:focus-visible { outline: 2px solid var(--work-accent); outline-offset: 2px; border-radius: 6px; }

.work-empty { text-align: center; color: var(--work-text-dim); margin-top: 40px; }
.work-empty h2 { color: var(--work-text); font-size: 18px; margin-bottom: 6px; }
```

> NavLink applies the `active` class automatically when its route matches, so `.work-tab.active` styles the current tab.

- [ ] **Step 3: Commit**

```bash
git add src/work/styles/
git commit -m "feat(work): add module tokens + layout styles"
```

---

## Task 7: WorkspaceContext + useWorkspace

**Files:**
- Create: `src/work/workState/WorkspaceContext.jsx`

- [ ] **Step 1: Write the provider + hook**

```jsx
// src/work/workState/WorkspaceContext.jsx
// Resolves the current workspace + the signed-in user's membership & roles.
// Increment 1: a single workspace, resolved by a fixed slug. WorkModule reads this
// context to enforce the loading / no-access gate. Components never see Supabase or RLS.

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import {
  fetchWorkspaceBySlug,
  fetchMyMembership,
  fetchMemberRoles,
} from '../../data/work/workspaceQueries.js';

// Increment 1 targets the single seeded workspace. Multi-workspace selection comes later.
const WORKSPACE_SLUG = 'joz-ve-loz';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState({ loading: true, workspace: null, membership: null, roles: [] });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function resolve() {
      if (!user) {
        if (!cancelled) setState({ loading: false, workspace: null, membership: null, roles: [] });
        return;
      }
      const workspace  = await fetchWorkspaceBySlug(WORKSPACE_SLUG);
      const membership = workspace ? await fetchMyMembership(workspace.id, user.id) : null;
      const roles      = membership ? await fetchMemberRoles(membership.id) : [];
      if (!cancelled) setState({ loading: false, workspace, membership, roles });
    }

    setState(s => ({ ...s, loading: true }));
    resolve();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const value = {
    loading: state.loading,
    workspace: state.workspace,
    membership: state.membership,
    roles: state.roles,
    isMember: !!state.membership,
    permissionLevel: state.membership?.permission_level ?? null,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/work/workState/WorkspaceContext.jsx
git commit -m "feat(work): add WorkspaceContext + useWorkspace"
```

---

## Task 8: Shell, pages & no-access screen

**Files:**
- Create: `src/work/WorkLayout.jsx`
- Create: `src/work/pages/DashboardPage/DashboardPage.jsx`
- Create: `src/work/pages/ComingSoonPage/ComingSoonPage.jsx`
- Create: `src/work/NoAccessScreen.jsx`

- [ ] **Step 1: Write the layout shell**

```jsx
// src/work/WorkLayout.jsx
// Work Engine shell: sticky top bar (workspace name) + content Outlet + bottom tab nav.
// Its own look — no consciousness mode, not under MainLayout. Mobile-first, RTL-aware.

import './styles/work-tokens.css';
import './styles/WorkLayout.css';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useWorkspace } from './workState/WorkspaceContext.jsx';
import { resolveWorkShellContent } from './resolveWorkShellContent.js';

const TABS = [
  { to: '/work',          icon: '✓',  key: 'myTasks',  end: true },
  { to: '/work/board',    icon: '▦',  key: 'board' },
  { to: '/work/overview', icon: '◉',  key: 'overview' },
  { to: '/work/alerts',   icon: '🔔', key: 'alerts' },
];

export function WorkLayout() {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const shell = resolveWorkShellContent(locale);

  return (
    <div className="work-root work-layout" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="work-topbar">
        <span className="work-topbar__name">{workspace?.name ?? shell.appName}</span>
      </header>

      <main className="work-content">
        <Outlet />
      </main>

      <nav className="work-tabbar" aria-label={shell.nav.menuAriaLabel}>
        {TABS.map(({ to, icon, key, end }) => (
          <NavLink key={to} to={to} end={end} className="work-tab">
            <span className="work-tab__icon" aria-hidden="true">{icon}</span>
            {shell.nav[key]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Write the My Tasks (Dashboard) placeholder**

```jsx
// src/work/pages/DashboardPage/DashboardPage.jsx
// "My Tasks" home. Increment 1: empty-state only — real tasks arrive in increment 2.

import { useAppContext } from '../../../app/appState/useAppContext.js';
import { resolveWorkShellContent } from '../../resolveWorkShellContent.js';

export function DashboardPage() {
  const { locale } = useAppContext();
  const shell = resolveWorkShellContent(locale);
  return (
    <section className="work-empty">
      <h2>{shell.dashboard.emptyTitle}</h2>
      <p>{shell.dashboard.emptyBody}</p>
    </section>
  );
}
```

- [ ] **Step 3: Write the Coming Soon placeholder (board / overview / alerts)**

```jsx
// src/work/pages/ComingSoonPage/ComingSoonPage.jsx
// Placeholder for tabs not yet built in increment 1, so the bottom nav has no dead links.

import { useAppContext } from '../../../app/appState/useAppContext.js';
import { resolveWorkShellContent } from '../../resolveWorkShellContent.js';

export function ComingSoonPage() {
  const { locale } = useAppContext();
  const shell = resolveWorkShellContent(locale);
  return (
    <section className="work-empty">
      <h2>{shell.comingSoon.title}</h2>
      <p>{shell.comingSoon.body}</p>
    </section>
  );
}
```

- [ ] **Step 4: Write the no-access screen**

```jsx
// src/work/NoAccessScreen.jsx
// Shown when a signed-in user is authenticated but not a member of the workspace.

import './styles/work-tokens.css';
import './styles/WorkLayout.css';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { resolveWorkShellContent } from './resolveWorkShellContent.js';

export function NoAccessScreen() {
  const { locale } = useAppContext();
  const navigate = useNavigate();
  const shell = resolveWorkShellContent(locale);
  return (
    <div className="work-root" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="work-center">
        <h1>{shell.access.noAccessTitle}</h1>
        <p>{shell.access.noAccessBody}</p>
        <button type="button" className="work-backlink" onClick={() => navigate('/')}>
          {shell.access.backToSite}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/work/WorkLayout.jsx src/work/pages/ src/work/NoAccessScreen.jsx
git commit -m "feat(work): add shell layout, dashboard/coming-soon pages, no-access screen"
```

---

## Task 9: WorkModule + route wiring

**Files:**
- Create: `src/work/WorkModule.jsx`
- Modify: `src/app/App.jsx`

- [ ] **Step 1: Write the module root (provider + gate + routing)**

```jsx
// src/work/WorkModule.jsx
// Work Engine root: provides WorkspaceContext, enforces the access gate (loading / member-only),
// and owns /work/* routing under its own shell — no MainLayout, no consciousness mode.

import './styles/work-tokens.css';
import './styles/WorkLayout.css';
import { Route, Routes } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { WorkspaceProvider, useWorkspace } from './workState/WorkspaceContext.jsx';
import { resolveWorkShellContent } from './resolveWorkShellContent.js';
import { WorkLayout } from './WorkLayout.jsx';
import { NoAccessScreen } from './NoAccessScreen.jsx';
import { DashboardPage } from './pages/DashboardPage/DashboardPage.jsx';
import { ComingSoonPage } from './pages/ComingSoonPage/ComingSoonPage.jsx';

function WorkGate() {
  const { locale } = useAppContext();
  const { loading, isMember } = useWorkspace();
  const shell = resolveWorkShellContent(locale);

  if (loading) {
    return (
      <div className="work-root" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <div className="work-center"><p>{shell.access.loading}</p></div>
      </div>
    );
  }
  if (!isMember) return <NoAccessScreen />;

  return (
    <Routes>
      <Route element={<WorkLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="board" element={<ComingSoonPage />} />
        <Route path="overview" element={<ComingSoonPage />} />
        <Route path="alerts" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  );
}

export function WorkModule() {
  return (
    <WorkspaceProvider>
      <WorkGate />
    </WorkspaceProvider>
  );
}
```

- [ ] **Step 2: Wire the route in `src/app/App.jsx`**

Add the import alongside the other page imports (after the admin imports, line ~21):
```jsx
import { WorkModule } from '../work/WorkModule.jsx';
```

Add this route block immediately after the closing `</Route>` of the Profile protected block (after line 49, before the Admin block). It is intentionally **not** wrapped in `MainLayout`:
```jsx
          {/* Work Engine — any authenticated user; membership gate lives inside WorkModule */}
          <Route element={<ProtectedRoute allowedRoles={[]} />}>
            <Route path="work/*" element={<WorkModule />} />
          </Route>
```

- [ ] **Step 3: Run the dev server and verify as a member**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev
```
In the browser: log in as `naorlevi87@gmail.com`, go to `/work`. 
Expected: the work shell — top bar reading **"ג'וז ולוז"**, the empty "הכל רגוע פה" state, and a 4-tab bottom nav. Tapping לוח / תמונת מצב / התראות shows the "בקרוב כאן" placeholder. No consciousness switcher, no site header.

- [ ] **Step 4: Verify the gate blocks non-members**

While logged in as a non-member account (or temporarily set your membership `status='pending'` in SQL, then revert), visit `/work`. 
Expected: the "אופס, אין לך גישה לפה עדיין" screen with a "חזרה לאתר" button. Visiting `/work` while logged out redirects to `/login` (ProtectedRoute).

- [ ] **Step 5: Commit**

```bash
git add src/work/WorkModule.jsx src/app/App.jsx
git commit -m "feat(work): mount /work module with member-only access gate"
```

---

## Task 10: Member-only Work entry in the site menu

**Files:**
- Create: `src/data/work/useWorkMembership.js`
- Modify: `src/content/site/he/siteShell.content.js`
- Modify: `src/content/site/en/siteShell.content.js`
- Modify: `src/app/HamburgerMenu.jsx`

- [ ] **Step 1: Write the membership hook (session-cached)**

```js
// src/data/work/useWorkMembership.js
// Lightweight check used by the SITE menu (outside the WorkspaceProvider) to decide
// whether to show the Work entry. Caches the result per user for the session.

import { useEffect, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { fetchWorkspaceBySlug, fetchMyMembership } from './workspaceQueries.js';

const WORKSPACE_SLUG = 'joz-ve-loz';
let cache = { userId: null, isMember: false };

export function useWorkMembership() {
  const { user, loading: authLoading } = useAuth();
  const [isMember, setIsMember] = useState(
    user && cache.userId === user.id ? cache.isMember : false
  );

  useEffect(() => {
    if (authLoading || !user) { setIsMember(false); return; }
    if (cache.userId === user.id) { setIsMember(cache.isMember); return; }

    let cancelled = false;
    (async () => {
      const ws = await fetchWorkspaceBySlug(WORKSPACE_SLUG);
      const m  = ws ? await fetchMyMembership(ws.id, user.id) : null;
      cache = { userId: user.id, isMember: !!m };
      if (!cancelled) setIsMember(!!m);
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return isMember;
}
```

- [ ] **Step 2: Add the menu label to the Hebrew site shell content**

In `src/content/site/he/siteShell.content.js`, add a `work` key inside `navigation` (after `adminDashboard`, line ~23):
```js
    adminDashboard: 'ממשק ניהול',
    work: 'מרחב העבודה',
```

- [ ] **Step 3: Add the same key to the English mirror**

In `src/content/site/en/siteShell.content.js`, add inside `navigation` (next to the existing `adminDashboard` key):
```js
    work: 'Work space',
```

- [ ] **Step 4: Render the member-only entry in `HamburgerMenu.jsx`**

Add the import near the other data imports (after line 11):
```jsx
import { useWorkMembership } from '../data/work/useWorkMembership.js';
```

Call the hook inside the component, next to the existing `useAuth()` (after line 24):
```jsx
  const isWorkMember = useWorkMembership();
```

In the authenticated block, add the Work button just before the existing admin button (i.e., immediately before the `{(role === 'admin' || role === 'editor') && (` block, line ~135):
```jsx
                {isWorkMember && (
                  <button
                    type="button"
                    className="site-menuAdminBtn"
                    onClick={() => { navigate('/work'); onClose(); }}
                  >
                    {getText(navigation, 'work')}
                  </button>
                )}
```

> Reusing the `site-menuAdminBtn` class keeps styling consistent with the existing admin entry; no new CSS needed.

- [ ] **Step 5: Verify in the browser**

With the dev server running, log in as `naorlevi87@gmail.com`, open the hamburger menu. 
Expected: a "מרחב העבודה" button appears; clicking it navigates to `/work`. Log in as a non-member → the button is absent.

- [ ] **Step 6: Commit**

```bash
git add src/data/work/useWorkMembership.js src/content/site/ src/app/HamburgerMenu.jsx
git commit -m "feat(work): add member-only Work entry to site menu"
```

---

## Task 11: Module documentation (`WORK.md`) + architecture pointer

**Files:**
- Create: `src/work/WORK.md`
- Modify: `docs/architecture.md`

- [ ] **Step 1: Write `src/work/WORK.md`**

```markdown
# Work Engine (`src/work/`)

Self-contained task/coordination module mounted at `/work`. Lives inside the site repo but
shares only the Supabase client, the auth session, and the deploy — its own shell, schema,
routing, content, and styles. Designed to be extractable into a standalone app later.

Full product design: `docs/superpowers/specs/2026-06-09-community-work-engine-design.md`.

## Status
Increment 1 (Foundation & shell) — done. Tasks/areas land in increment 2.

## Vocabulary
Workspace (tenant, e.g. Joz ve Loz) → Area (container) → Task. Roles (Bartender/Kitchen) are
responsibility tags, separate from `permission_level` (admin/manager/member).

## Structure
- `WorkModule.jsx` — root: WorkspaceProvider + access gate + `/work/*` routing (no MainLayout).
- `WorkLayout.jsx` — shell: top bar + content Outlet + bottom tab nav. No consciousness mode.
- `workState/WorkspaceContext.jsx` — resolves current workspace + membership + roles; `useWorkspace()`.
- `pages/` — DashboardPage (My Tasks), ComingSoonPage (board/overview/alerts placeholders).
- `NoAccessScreen.jsx` — shown to authenticated non-members.
- `resolveWorkShellContent.js` + `../content/work/{he,en}/` — all UI copy (no hardcoded strings).
- `styles/` — own tokens + layout (independent of Naor/Shay).

## Data
- All access via `src/data/work/` → `workClient.js` (`supabase.schema('work')`) → query modules.
- Postgres `work` schema; RLS scoped by active membership (`work.is_active_member`, `work.my_permission`).
- The `work` schema must be in Supabase's *Exposed schemas* setting.
- Seed: `scripts/seed-work-foundation.js` (Joz workspace + admins).

## Rules (inherited from the site)
Data-source opacity, no hardcoded strings, resolver pattern, mobile-first, file-header comments.
```

- [ ] **Step 2: Add a pointer in `docs/architecture.md`**

Append a new section at the end of `docs/architecture.md`:
```markdown
---

## 16. Work Engine (separate module)

The Community Work Engine is a self-contained module at `src/work/`, mounted at `/work`,
sharing only auth + the Supabase client + deploy with the site. It has its own `work` Postgres
schema, shell, routing, content, and styles, and is built to be extractable later.

- Module docs: `src/work/WORK.md`
- Design spec: `docs/superpowers/specs/2026-06-09-community-work-engine-design.md`
- Not under `MainLayout`; no consciousness mode. Access requires active `work.workspace_members`.
```

- [ ] **Step 3: Commit**

```bash
git add src/work/WORK.md docs/architecture.md
git commit -m "docs(work): add WORK.md + architecture pointer"
```

---

## Task 12: Final verification (lint, build, full run-through)

**Files:** none

- [ ] **Step 1: Lint**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint
```
Expected: no errors.

- [ ] **Step 2: Production build**

```bash
cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build
```
Expected: build succeeds, no unresolved imports.

- [ ] **Step 3: Manual acceptance run (the increment's definition of done)**

With `npm run dev`:
1. Logged out → `/work` redirects to `/login`. ✓
2. Logged in as `naorlevi87@gmail.com` → menu shows "מרחב העבודה" → `/work` shows the Joz shell, empty state, 4 tabs; placeholder tabs work; no site header / consciousness switcher. ✓
3. Logged in as a non-member → no menu entry; visiting `/work` directly shows the no-access screen. ✓
4. Mobile viewport (DevTools ~375px) → top bar, content, and bottom tab bar render correctly; tab focus rings visible on keyboard nav. ✓

- [ ] **Step 4: Hand off for user browser review**

Per `CLAUDE.md`, do not treat the increment as done until the user has seen `/work` in the browser and approved. Report status + how to view it.

---

## Self-review (completed against the spec)

- **Spec §5 data model (identity & access):** Tasks 1–3 create `workspaces`, `workspace_members` (with `permission_level` + `status`), `roles`, `member_roles`, RLS, seed. ✓ (areas/tasks correctly deferred to increment 2)
- **Spec §3 auth/access:** shared auth reused (Task 7/9), member-only gate + no-access screen (Tasks 8–9), member-only menu entry (Task 10). ✓
- **Spec §6 module structure & rules:** `src/work/` layered layout, data-source opacity (components use `useWorkspace`/resolver, never Supabase), no hardcoded strings (Task 5), `supabase.schema('work')` (Task 4), file headers on every file, mobile-first CSS (Task 6). ✓
- **Spec §6 documentation discipline:** `WORK.md` + architecture pointer (Task 11). ✓
- **Spec §12 increment 1 verification target:** member reaches empty `/work` scoped to Joz; non-member blocked (Task 12 acceptance). ✓
- **Placeholder scan:** no TBD/TODO; every code step has complete code. ✓
- **Type/name consistency:** `workDb`, `fetchWorkspaceBySlug`, `fetchMyMembership`, `fetchMemberRoles`, `useWorkspace`, `WorkspaceProvider`, `WorkModule`, `resolveWorkShellContent`, content keys (`nav.*`, `dashboard.*`, `comingSoon.*`, `access.*`) are used identically across tasks. ✓
- **Out of scope (correctly excluded):** areas, tasks, checklists, claiming, recurrence, notifications, onboarding flows — all later increments. ✓
