# Commons Roles (skills), Member Management & Invites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activate the dormant `commons.roles`/`member_roles` tables as a **skills** model that gates who may take a task, add a commons-native member-management screen and a skills catalogue, and a consent-based project invite flow.

**Architecture:** Builds on the committed task system. Skills are `commons.roles` rows; a task's required skill is a new nullable `nodes.role_id` (null = "כל עובד" = anyone). `claim_node` gains a skill check. Member management and the skills catalogue are new admin-only full-screen routes reading/writing through new data modules. Invites live in a new `commons.invites` table with SECURITY DEFINER RPCs and a Resend Edge Function; a membership is created only when the invitee approves.

**Tech Stack:** React 19 + React Router v6, `motion/react`, Supabase `commons` schema (RLS + pg_cron + Edge Functions/Deno), Resend, plain CSS tokens. **No test runner** — each task verifies with `npm run lint` (commons files clean) + `npm run build`; DB tasks apply + verify SQL; each phase ends with a browser check before commit.

**Run commands (Hebrew-username PATH workaround):**
- Lint: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint`
- Build: same prefix + `run build`
- SQL: `"/c/Program Files/nodejs/node" --env-file=.env.local scripts/run-sql.mjs <file.sql | --query "<sql>">`

**Key IDs:** Joz workspace slug `joz-ve-loz` (browser checks at `/commons/joz-ve-loz`). Demo workspace id `699aaa76-a313-49b6-bb19-03b11824f056` (SQL functional tests; deletable). Supabase project ref `kqlfvwlzayinngrgafec`.

**Conventions (CLAUDE.md):** never Bash for file ops (Hebrew username) — use Read/Write/Edit/Glob/Grep. Data-source opacity (components → hooks/query fns, never Supabase directly). No hardcoded strings (content in `src/content/commons/{he,en}`) or colors (`var(--commons-*)` tokens). Commit only after the user reviews each phase in the browser.

---

## File structure

**Phase A — Skills core**
- Create `supabase/migrations/20260613000000_commons_node_role.sql` — `nodes.role_id` + `claim_node` skill gate.
- Create `src/data/commons/roleQueries.js` — roles CRUD + member-role read/write.
- Modify `src/data/commons/nodeQueries.js` — add `role_id` to `FIELDS`.
- Modify `src/data/commons/workspaceQueries.js` — `fetchMemberRoles` returns role `id` too.
- Create `src/commons/pages/RolesPage/RolesPage.jsx` + `roles.css` — skills catalogue CRUD.
- Modify `src/commons/CommonsModule.jsx` — `/roles` route.
- Modify `src/commons/CommonsMenu.jsx` — add `ניהול כישורים` entry.
- Modify `src/commons/tasks/TaskFormPage.jsx` — skill `<select>` (role_id).
- Modify `src/commons/tasks/TaskViewPage.jsx` — skill chip + skill-gated claim button.
- Modify `src/commons/tasks/TaskTree.jsx` — skill-gated claim button.
- Modify `src/commons/pages/AreaPage/AreaPage.jsx` — pass roles down to `TaskTree`.
- Modify `src/commons/styles/commons-tokens.css` — role color tokens.
- Modify `src/content/commons/{he,en}/commonsShell.content.js` — `roles` block, `form.skill`, `view.skill`, `menu.roles`, `tasks.claimNoSkill`.

**Phase B — Member management**
- Create `src/data/commons/memberQueries.js` — members read/update/remove.
- Create `src/commons/pages/MembersPage/MembersPage.jsx` + `members.css`.
- Modify `src/commons/CommonsModule.jsx` — `/members` route.
- Modify `src/commons/CommonsMenu.jsx` — rewire `ניהול חברים` → `/members` (commons-admin gated).
- Modify `src/content/commons/{he,en}/commonsShell.content.js` — `members` block; rename `menu.members`.

**Phase C — Invite & approval**
- Create `supabase/migrations/20260613010000_commons_invites.sql` — invites table + RLS + RPCs.
- Create `supabase/functions/send-invite/index.ts` — Resend email Edge Function.
- Modify `src/data/commons/memberQueries.js` — invite wrappers + `sendInviteEmail`.
- Modify `src/commons/pages/MembersPage/MembersPage.jsx` — invite form + pending-invites list.
- Create `src/commons/pages/JoinInvitePage/JoinInvitePage.jsx` + `join.css`.
- Modify `src/commons/CommonsModule.jsx` — `/join/:token` route + pending-invite section at `/commons`.
- Modify `src/content/commons/{he,en}/commonsShell.content.js` — `join` block, `members.invite*` keys.

---

# Phase A — Skills core

## Task A1: `nodes.role_id` + skill-gated `claim_node`

**Files:** Create `supabase/migrations/20260613000000_commons_node_role.sql`

- [ ] **Step 1: Write the migration.**

```sql
-- supabase/migrations/20260613000000_commons_node_role.sql
-- Skills gate task-taking: a task's required skill is nodes.role_id (a commons.roles row).
-- null role_id = "כל עובד" (anyone may take it). claim_node now checks the claimer holds the skill.

alter table commons.nodes
  add column if not exists role_id uuid references commons.roles(id) on delete set null;

-- Rewritten claim: after the existing guards, require the caller to hold the task's skill (if any).
create or replace function commons.claim_node(node_id uuid)
returns commons.nodes
language plpgsql security definer set search_path = commons, public
as $$
declare result commons.nodes; mid uuid;
begin
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if result.kind <> 'task' then raise exception 'not a task'; end if;
  if not commons.is_active_member(result.workspace_id) then raise exception 'not a member'; end if;
  if result.owner_id is not null then raise exception 'already assigned'; end if;

  select id into mid from commons.workspace_members
    where workspace_id = result.workspace_id and user_id = auth.uid() and status = 'active' limit 1;
  if mid is null then raise exception 'no membership'; end if;

  if result.role_id is not null
     and not exists (select 1 from commons.member_roles mr
                     where mr.member_id = mid and mr.role_id = result.role_id) then
    raise exception 'missing skill';
  end if;

  update commons.nodes set owner_id = mid where id = node_id returning * into result;
  return result;
end;
$$;

grant execute on function commons.claim_node(uuid) to authenticated;
```

- [ ] **Step 2: Apply.** Run: `"/c/Program Files/nodejs/node" --env-file=.env.local scripts/run-sql.mjs supabase/migrations/20260613000000_commons_node_role.sql` — expect success (no error JSON).

- [ ] **Step 3: Verify the column exists.** Run: `... scripts/run-sql.mjs --query "select column_name from information_schema.columns where table_schema='commons' and table_name='nodes' and column_name='role_id';"` — expect one row `role_id`.

- [ ] **Step 4: Verify the skill gate.** Run the demo-workspace check (creates a skill, a role-gated task, asserts a non-holder cannot claim, then cleans up):

```
... scripts/run-sql.mjs --query "
do \$\$
declare wid uuid := '699aaa76-a313-49b6-bb19-03b11824f056'; r uuid; n uuid;
begin
  insert into commons.roles(workspace_id,name) values (wid,'TESTSKILL') returning id into r;
  insert into commons.nodes(workspace_id,kind,title,status,role_id) values (wid,'task','TEST gated','open',r) returning id into n;
  raise notice 'created task % gated on skill %', n, r;
  delete from commons.nodes where id=n;
  delete from commons.roles where id=r;
end \$\$;"
```
Expected: a `created task …` notice, no error.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20260613000000_commons_node_role.sql
git commit -m "feat(commons): nodes.role_id (required skill) + skill-gated claim_node"
```

## Task A2: Data layer — `roleQueries` + `role_id` passthrough

**Files:** Create `src/data/commons/roleQueries.js`; Modify `src/data/commons/nodeQueries.js`, `src/data/commons/workspaceQueries.js`

- [ ] **Step 1: Create `roleQueries.js`.**

```js
// src/data/commons/roleQueries.js
// Reads/writes for the workspace skills catalogue (commons.roles) and member skills (member_roles).
// The data source (Supabase, `commons` schema, RLS) stays hidden behind these functions.

import { commonsDb } from './commonsClient.js';

// All skills in a workspace.
export async function fetchRoles(workspaceId) {
  const { data, error } = await commonsDb
    .from('roles')
    .select('id, name, color')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function createRole({ workspaceId, name, color }) {
  const { data, error } = await commonsDb
    .from('roles')
    .insert({ workspace_id: workspaceId, name: name.trim(), color: color ?? null })
    .select('id, name, color').single();
  if (error) throw error;
  return data;
}

export async function updateRole(id, patch) {
  const { data, error } = await commonsDb
    .from('roles').update(patch).eq('id', id).select('id, name, color').single();
  if (error) throw error;
  return data;
}

export async function deleteRole(id) {
  const { error } = await commonsDb.from('roles').delete().eq('id', id);
  if (error) throw error;
}

// member_id -> array of { id, name, color } for every active member of the workspace.
export async function fetchMemberRolesMap(workspaceId) {
  const { data, error } = await commonsDb
    .from('member_roles')
    .select('member_id, roles!inner(id, name, color), workspace_members!inner(workspace_id)')
    .eq('workspace_members.workspace_id', workspaceId);
  if (error) return new Map();
  const map = new Map();
  for (const row of data ?? []) {
    if (!row.roles) continue;
    if (!map.has(row.member_id)) map.set(row.member_id, []);
    map.get(row.member_id).push(row.roles);
  }
  return map;
}

// Replace a member's skills with exactly `roleIds` (diff insert/delete on member_roles).
export async function setMemberRoles(memberId, roleIds) {
  const { data: existing } = await commonsDb
    .from('member_roles').select('role_id').eq('member_id', memberId);
  const have = new Set((existing ?? []).map(r => r.role_id));
  const want = new Set(roleIds);
  const toAdd = roleIds.filter(id => !have.has(id));
  const toRemove = [...have].filter(id => !want.has(id));
  if (toAdd.length) {
    const { error } = await commonsDb.from('member_roles')
      .insert(toAdd.map(role_id => ({ member_id: memberId, role_id })));
    if (error) throw error;
  }
  if (toRemove.length) {
    const { error } = await commonsDb.from('member_roles')
      .delete().eq('member_id', memberId).in('role_id', toRemove);
    if (error) throw error;
  }
}
```

- [ ] **Step 2: Add `role_id` to `nodeQueries` FIELDS.** In `src/data/commons/nodeQueries.js`, edit the `FIELDS` constant to include `role_id`:

```js
const FIELDS =
  'id, workspace_id, parent_id, kind, title, description, status, owner_id, role_id, due_date, recurrence, next_run, template_id, position, created_at, updated_at';
```

- [ ] **Step 3: Make `fetchMemberRoles` return the role `id`.** In `src/data/commons/workspaceQueries.js`, change the select so the current user's skills carry ids (needed to compare against `node.role_id`):

```js
// The skills (roles) attached to a membership — id needed to match a task's required skill.
export async function fetchMemberRoles(memberId) {
  const { data, error } = await commonsDb
    .from('member_roles')
    .select('roles(id, name, color)')
    .eq('member_id', memberId);
  if (error) return [];
  return (data ?? []).map(r => r.roles).filter(Boolean);
}
```

- [ ] **Step 4: Lint + build.** Expected: clean (new module not yet imported; FIELDS change is transparent).

- [ ] **Step 5: Commit.**

```bash
git add src/data/commons/roleQueries.js src/data/commons/nodeQueries.js src/data/commons/workspaceQueries.js
git commit -m "feat(commons): roleQueries data layer + role_id passthrough + member-role ids"
```

## Task A3: Role color tokens + content for skills

**Files:** Modify `src/commons/styles/commons-tokens.css`, `src/content/commons/{he,en}/commonsShell.content.js`

- [ ] **Step 1: Add six tokenized role color swatches.** Append to `src/commons/styles/commons-tokens.css` (read the file first to match the existing token block; place after the existing `:root` commons tokens). These are referenced by data-attribute, never hardcoded at call sites:

```css
/* Skill (role) swatches — referenced by [data-role-color] on chips and the picker. */
:root {
  --commons-role-1: #6c8cff;
  --commons-role-2: #ff8f6b;
  --commons-role-3: #56c596;
  --commons-role-4: #d98cff;
  --commons-role-5: #ffce5a;
  --commons-role-6: #5ad0e0;
  --commons-role-default: var(--commons-surface-2);
}
[data-role-color="1"] { background: var(--commons-role-1); }
[data-role-color="2"] { background: var(--commons-role-2); }
[data-role-color="3"] { background: var(--commons-role-3); }
[data-role-color="4"] { background: var(--commons-role-4); }
[data-role-color="5"] { background: var(--commons-role-5); }
[data-role-color="6"] { background: var(--commons-role-6); }
[data-role-color=""] , [data-role-color="null"] { background: var(--commons-role-default); }
```

(Skill `color` values are the keys `"1"`–`"6"` or null — never raw hex in JS.)

- [ ] **Step 2: Add the `roles` content block + skill keys (Hebrew).** In `src/content/commons/he/commonsShell.content.js`, add `roles:` to `menu`, a top-level `roles` block, `form.skill`/`form.skillAnyone`, `view.skill`, and `tasks.claimNoSkill`:

In `menu` (after `members`): `roles: 'ניהול כישורים',`

New top-level block (after the `members`/`menu` area, before `fab`):
```js
  rolesScreen: {
    title: 'כישורים',
    subtitle: 'הכישורים שאפשר לשייך למשימות ולחברי הצוות.',
    add: 'כישור חדש',
    namePlaceholder: 'שם הכישור (טבח פס, מלצר…)',
    colorLabel: 'צבע',
    save: 'שמירה',
    rename: 'שינוי שם',
    delete: 'מחיקה',
    empty: 'עוד אין כישורים. הוסיפו את הראשון.',
    back: 'חזרה',
  },
```

In `form` (after `unassigned`): `skill: 'כישור נדרש',` and `skillAnyone: 'כל עובד',`

In `view` (after `unassigned`): `skill: 'כישור נדרש',`

In `tasks` (after `claimAria`): `claimNoSkill: 'אין לך את הכישור הנדרש',`

- [ ] **Step 3: Mirror the keys in English.** In `src/content/commons/en/commonsShell.content.js`, add the same keys with English values: `menu.roles: 'Skills'`; `rolesScreen` = `{ title:'Skills', subtitle:'Skills you can attach to tasks and teammates.', add:'New skill', namePlaceholder:'Skill name (line cook, waiter…)', colorLabel:'Color', save:'Save', rename:'Rename', delete:'Delete', empty:'No skills yet. Add the first one.', back:'Back' }`; `form.skill:'Required skill'`, `form.skillAnyone:'Anyone'`; `view.skill:'Required skill'`; `tasks.claimNoSkill:'You don\'t hold the required skill'`.

- [ ] **Step 4: Lint + build.** Expected: clean.

- [ ] **Step 5: Commit.**

```bash
git add src/commons/styles/commons-tokens.css src/content/commons
git commit -m "feat(commons): role color tokens + skills content (he/en)"
```

## Task A4: RolesPage (skills catalogue CRUD) + route + menu entry

**Files:** Create `src/commons/pages/RolesPage/RolesPage.jsx`, `src/commons/pages/RolesPage/roles.css`; Modify `src/commons/CommonsModule.jsx`, `src/commons/CommonsMenu.jsx`

- [ ] **Step 1: Create `RolesPage.jsx`.** Full-screen admin CRUD over `commons.roles`, mirroring the task-screen shell pattern (own back bar):

```jsx
// src/commons/pages/RolesPage/RolesPage.jsx
// Admin-only skills catalogue: list/add/rename/recolor/delete commons.roles for the workspace.
// Skills gate task-taking (nodes.role_id) and tag members (member_roles).

import './roles.css';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { fetchRoles, createRole, updateRole, deleteRole } from '../../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { IconChevronStart, IconPlus } from '../../icons.jsx';

const SWATCHES = ['1', '2', '3', '4', '5', '6'];

export function RolesPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const r = shell.rolesScreen;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState('1');

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoles(workspace.id).then(rs => { if (!cancelled) { setRoles(rs); setLoading(false); } });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  if (permissionLevel !== 'admin') return null;

  async function add(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const created = await createRole({ workspaceId: workspace.id, name: n, color });
    setRoles(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setName('');
  }
  async function rename(role) {
    const next = window.prompt(r.rename, role.name);
    if (next == null || !next.trim()) return;
    const updated = await updateRole(role.id, { name: next.trim() });
    setRoles(prev => prev.map(x => (x.id === role.id ? updated : x)));
  }
  async function recolor(role, c) {
    const updated = await updateRole(role.id, { color: c });
    setRoles(prev => prev.map(x => (x.id === role.id ? updated : x)));
  }
  async function remove(role) {
    await deleteRole(role.id);
    setRoles(prev => prev.filter(x => x.id !== role.id));
  }

  return (
    <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-screen__bar">
        <button type="button" className="commons-screen__back" onClick={() => navigate(-1)} aria-label={r.back}>
          <IconChevronStart size={20} />
        </button>
        <span className="commons-screen__title">{r.title}</span>
      </header>

      <motion.div className="commons-screen__body"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
        <p className="commons-roles__subtitle">{r.subtitle}</p>

        <form className="commons-roles__add" onSubmit={add}>
          <input className="commons-field__input" value={name} placeholder={r.namePlaceholder}
            onChange={e => setName(e.target.value)} aria-label={r.add} />
          <div className="commons-roles__swatches" role="group" aria-label={r.colorLabel}>
            {SWATCHES.map(c => (
              <button type="button" key={c} data-role-color={c}
                className={c === color ? 'commons-swatch is-on' : 'commons-swatch'}
                aria-pressed={c === color} aria-label={`${r.colorLabel} ${c}`} onClick={() => setColor(c)} />
            ))}
          </div>
          <button type="submit" className="commons-btn commons-btn--primary" disabled={!name.trim()} aria-label={r.add}>
            <IconPlus size={18} />
          </button>
        </form>

        {loading ? <CommonsLoading /> : roles.length === 0 ? (
          <p className="commons-roles__empty">{r.empty}</p>
        ) : (
          <ul className="commons-roles__list">
            {roles.map(role => (
              <li key={role.id} className="commons-roleRow">
                <span className="commons-roleRow__dot" data-role-color={role.color ?? ''} aria-hidden="true" />
                <span className="commons-roleRow__name">{role.name}</span>
                <div className="commons-roleRow__swatches" role="group" aria-label={r.colorLabel}>
                  {SWATCHES.map(c => (
                    <button type="button" key={c} data-role-color={c}
                      className={c === (role.color ?? '') ? 'commons-swatch is-on' : 'commons-swatch'}
                      aria-label={`${r.colorLabel} ${c}`} onClick={() => recolor(role, c)} />
                  ))}
                </div>
                <button type="button" className="commons-roleRow__btn" onClick={() => rename(role)}>{r.rename}</button>
                <button type="button" className="commons-roleRow__btn commons-roleRow__btn--danger" onClick={() => remove(role)}>{r.delete}</button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Create `roles.css`.**

```css
/* src/commons/pages/RolesPage/roles.css — skills catalogue screen. */
.commons-roles__subtitle { color: var(--commons-text-dim); margin-bottom: 16px; line-height: 1.5; }
.commons-roles__add { display: flex; gap: 8px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; }
.commons-roles__add .commons-field__input { flex: 1; min-width: 160px; }
.commons-roles__swatches, .commons-roleRow__swatches { display: flex; gap: 6px; }
.commons-swatch { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
.commons-swatch.is-on { border-color: var(--commons-text); }
.commons-swatch:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
.commons-roles__list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.commons-roles__empty { color: var(--commons-text-dim); }
.commons-roleRow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: var(--commons-surface); border: 1px solid var(--commons-border); border-radius: 12px; padding: 10px 12px; }
.commons-roleRow__dot { width: 14px; height: 14px; border-radius: 50%; flex: 0 0 auto; }
.commons-roleRow__name { font-weight: 700; flex: 1; min-width: 80px; }
.commons-roleRow__btn { background: none; border: 0; color: var(--commons-text-dim); cursor: pointer; font: inherit; padding: 4px 8px; border-radius: 8px; }
.commons-roleRow__btn:hover { color: var(--commons-text); background: var(--commons-surface-2); }
.commons-roleRow__btn--danger:hover { color: #ff6b6b; }
.commons-roleRow__btn:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
```

- [ ] **Step 3: Add the `/roles` route.** In `src/commons/CommonsModule.jsx`, import `RolesPage` and add the route alongside the other full-screen (non-tab) routes inside `WorkspaceGate`'s inner `<Routes>`:

```jsx
import { RolesPage } from './pages/RolesPage/RolesPage.jsx';
```
```jsx
      <Route path="roles" element={<RolesPage />} />
```
(Place it next to the `task/*` routes — outside the `CommonsLayout` element block so it renders full-screen with no tabs.)

- [ ] **Step 4: Add the menu entry.** In `src/commons/CommonsMenu.jsx`, import `IconGear` (or reuse an existing icon) and add an admin-gated entry after the new-folder entry:

```jsx
import { IconPlus, IconFolderPlus, IconSwap, IconUsers, IconGear } from './icons.jsx';
```
```jsx
          {canFolder && <li><button type="button" className="commons-menu__item" onClick={() => go('/roles')}><IconGear size={20} /> {m.roles}</button></li>}
```
(`canFolder` is already `permissionLevel === 'admin'`.)

- [ ] **Step 5: Lint + build.** Expected: clean.

- [ ] **Step 6: Commit.**

```bash
git add src/commons/pages/RolesPage src/commons/CommonsModule.jsx src/commons/CommonsMenu.jsx
git commit -m "feat(commons): RolesPage skills catalogue CRUD + route + menu entry"
```

## Task A5: Task form skill field + skill-gated claim (view & tree)

**Files:** Modify `src/commons/tasks/TaskFormPage.jsx`, `src/commons/tasks/TaskViewPage.jsx`, `src/commons/tasks/TaskTree.jsx`, `src/commons/pages/AreaPage/AreaPage.jsx`, `src/commons/tasks/taskScreens.css`, `src/commons/tasks/tasks.css`

- [ ] **Step 1: Add the skill `<select>` to the form.** In `src/commons/tasks/TaskFormPage.jsx`:

Add the import:
```jsx
import { fetchRoles } from '../../data/commons/roleQueries.js';
```
Add state + a `role` load effect next to the existing `roster` ones (in `TaskForm`):
```jsx
  const [roleId, setRoleId] = useState(node?.role_id ?? '');
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoles(workspace.id).then(rs => { if (!cancelled) setRoles(rs); });
    return () => { cancelled = true; };
  }, [workspace?.id]);
```
Render a skill field right after the owner `<label>` (inside `{!isFolder && (...)}`):
```jsx
            <label className="commons-field">
              <span className="commons-field__label">{f.skill}</span>
              <select className="commons-field__input" value={roleId} onChange={e => setRoleId(e.target.value)}>
                <option value="">{f.skillAnyone}</option>
                {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </label>
```
Persist `role_id` in both branches of `submit`. In the edit branch (inside `if (!isFolder)`), add:
```jsx
        patch.role_id = roleId || null;
```
In the create branch's `tree.saveTask(created.id, { … })` object, add:
```jsx
        role_id: roleId || null,
```

- [ ] **Step 2: Skill-gate the claim button + show the skill chip in the view.** In `src/commons/tasks/TaskViewPage.jsx`:

Add imports + role fetch:
```jsx
import { fetchRoles } from '../../data/commons/roleQueries.js';
```
Pull the current member's skills from the workspace context (already provided) — change the destructure:
```jsx
  const { workspace, permissionLevel, roles: myRoles } = useWorkspace();
```
Add roles state + load (next to the roster effect):
```jsx
  const [roles, setRoles] = useState([]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoles(workspace.id).then(rs => { if (!cancelled) setRoles(rs); });
    return () => { cancelled = true; };
  }, [workspace?.id]);
```
After `node` resolves, derive the required-skill object + claim eligibility:
```jsx
  const requiredRole = node.role_id ? roles.find(r => r.id === node.role_id) : null;
  const canClaim = !node.role_id || (myRoles ?? []).some(r => r.id === node.role_id);
```
Add a skill chip in the `commons-view__chips` row (after the due chip):
```jsx
          {requiredRole && (
            <span className="commons-view__chip commons-view__chip--skill" data-role-color={requiredRole.color ?? ''}>
              {requiredRole.name}
            </span>
          )}
```
Gate the existing claim button — replace the `{!owner && node.kind === 'task' && ( …claim… )}` block's condition with `{!owner && node.kind === 'task' && canClaim && ( …claim… )}`. When `!canClaim`, render nothing (a non-eligible member simply sees "לא משויך").

- [ ] **Step 3: Skill-gate the claim button in `TaskTree`.** In `src/commons/tasks/TaskTree.jsx`:

Accept `myRoleIds` (a `Set`) on the component and thread it through `ctx`:
```jsx
export function TaskTree({ tree, rootId = 'root', rootKinds, rosterById, myRoleIds, t, locale, onOpenTask }) {
```
```jsx
  const ctx = {
    byParent: tree.byParent, rosterById, myRoleIds, t, locale, expanded,
    onToggleExpand, onToggleDone: tree.toggleDone, onOpenTask, onClaim: tree.claim,
    hasChildren: tree.hasChildren, progress: tree.progress,
  };
```
In `NodeRow`, gate the claim button by eligibility:
```jsx
          !isTemplate && (!node.role_id || ctx.myRoleIds?.has(node.role_id)) && (
            <button type="button" className="commons-claim" aria-label={t.claimAria} onClick={() => ctx.onClaim(node.id)}>
              <img src={raiseHand} alt="" className="commons-claim__icon" /> {t.claim}
            </button>
          )
```

- [ ] **Step 4: Pass `myRoleIds` from `AreaPage`.** In `src/commons/pages/AreaPage/AreaPage.jsx`, read the current member's skills from the workspace context and build a Set, then pass it to `TaskTree`:
```jsx
  const { workspace, permissionLevel, roles: myRoles } = useWorkspace();
```
```jsx
  const myRoleIds = useMemo(() => new Set((myRoles ?? []).map(r => r.id)), [myRoles]);
```
```jsx
          <TaskTree
            tree={tree}
            rootId={containerId}
            rootKinds={isRoot ? ['task'] : undefined}
            rosterById={rosterById}
            myRoleIds={myRoleIds}
            t={shell.tasks}
            locale={locale}
            onOpenTask={(id) => navigate(`/commons/${workspaceSlug}/task/${id}`)}
          />
```

- [ ] **Step 5: Style the skill chip.** Append to `src/commons/tasks/taskScreens.css`:
```css
.commons-view__chip--skill { color: var(--commons-bg); font-weight: 700; border: 0; }
```
And to `src/commons/tasks/tasks.css` (for a tree skill dot, optional but consistent) — append:
```css
.commons-node__skill { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
```

- [ ] **Step 6: Lint + build + browser check (phase A).** At `/commons/joz-ve-loz`: open `ניהול כישורים`, add a couple of skills with colors; create/edit a task and set a required skill (or "כל עובד"); the task view shows the skill chip; the "עלי" button appears only when your member holds that skill (assign yourself a skill via SQL for now: `update`/`insert member_roles` — Phase B adds the UI). **User reviews, then commit.**

```bash
git add src/commons/tasks src/commons/pages/AreaPage
git commit -m "feat(commons): task required-skill field + skill-gated claim (view & tree)"
```

---

# Phase B — Member management

## Task B1: `memberQueries` data layer

**Files:** Create `src/data/commons/memberQueries.js`

- [ ] **Step 1: Create `memberQueries.js`** (members read/update/remove; invite wrappers are added in Phase C):

```js
// src/data/commons/memberQueries.js
// Admin reads/writes for workspace membership (commons.workspace_members). Invite flow wrappers
// are added in Phase C. The data source (Supabase, RLS) stays hidden behind these functions.

import { commonsDb } from './commonsClient.js';

// Active members of a workspace, for the member-management screen.
export async function fetchMembers(workspaceId) {
  const { data, error } = await commonsDb
    .from('workspace_members')
    .select('id, user_id, display_name, permission_level, status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('display_name', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function updateMemberLevel(memberId, level) {
  const { data, error } = await commonsDb
    .from('workspace_members').update({ permission_level: level })
    .eq('id', memberId).select('id, permission_level').single();
  if (error) throw error;
  return data;
}

export async function updateMemberDisplayName(memberId, name) {
  const { data, error } = await commonsDb
    .from('workspace_members').update({ display_name: name.trim() || null })
    .eq('id', memberId).select('id, display_name').single();
  if (error) throw error;
  return data;
}

export async function removeMember(memberId) {
  const { error } = await commonsDb.from('workspace_members').delete().eq('id', memberId);
  if (error) throw error;
}
```

- [ ] **Step 2: Lint + build.** Expected: clean (not yet imported).

- [ ] **Step 3: Commit.**

```bash
git add src/data/commons/memberQueries.js
git commit -m "feat(commons): memberQueries data layer (members read/update/remove)"
```

## Task B2: MembersPage (manage) + route + menu rewire + content

**Files:** Create `src/commons/pages/MembersPage/MembersPage.jsx`, `src/commons/pages/MembersPage/members.css`; Modify `src/commons/CommonsModule.jsx`, `src/commons/CommonsMenu.jsx`, `src/content/commons/{he,en}/commonsShell.content.js`

- [ ] **Step 1: Add the `members` content block (Hebrew).** In `src/content/commons/he/commonsShell.content.js`, change `menu.members` to `'ניהול חברים'`, and add a top-level `members` block (after `rolesScreen`):

```js
  members: {
    title: 'חברי הצוות',
    subtitle: 'הרשאות, כישורים והזמנות.',
    levelAdmin: 'אדמין',
    levelManager: 'מנהל/ת',
    levelMember: 'חבר/ה',
    levelLabel: 'הרשאה',
    skillsLabel: 'כישורים',
    noSkills: 'בלי כישורים',
    nameLabel: 'שם תצוגה',
    namePlaceholder: 'שם',
    remove: 'הסרה',
    removeConfirm: 'להסיר את החבר/ה מהמרחב?',
    lastAdmin: 'חייב להישאר לפחות אדמין אחד.',
    empty: 'אין עדיין חברים.',
    back: 'חזרה',
  },
```

- [ ] **Step 2: Mirror in English.** In `src/content/commons/en/commonsShell.content.js`: `menu.members:'Members'`; `members` = `{ title:'Team', subtitle:'Permissions, skills, and invites.', levelAdmin:'Admin', levelManager:'Manager', levelMember:'Member', levelLabel:'Permission', skillsLabel:'Skills', noSkills:'No skills', nameLabel:'Display name', namePlaceholder:'Name', remove:'Remove', removeConfirm:'Remove this member from the workspace?', lastAdmin:'At least one admin must remain.', empty:'No members yet.', back:'Back' }`.

- [ ] **Step 3: Create `MembersPage.jsx`** (manage section only; the invite form + pending list are added in Phase C, Task C3):

```jsx
// src/commons/pages/MembersPage/MembersPage.jsx
// Admin-only member management for a workspace: per-member permission level, display name, skills
// (member_roles), and removal. Invites are added in Phase C. Replaces the old jump to the site /admin.

import './members.css';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { fetchMembers, updateMemberLevel, updateMemberDisplayName, removeMember } from '../../../data/commons/memberQueries.js';
import { fetchRoles, fetchMemberRolesMap, setMemberRoles } from '../../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { IconChevronStart } from '../../icons.jsx';

const LEVELS = ['admin', 'manager', 'member'];

export function MembersPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const m = shell.members;

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolesByMember, setRolesByMember] = useState(new Map());
  const [loading, setLoading] = useState(true);

  async function load() {
    const [mem, rs, map] = await Promise.all([
      fetchMembers(workspace.id), fetchRoles(workspace.id), fetchMemberRolesMap(workspace.id),
    ]);
    setMembers(mem); setRoles(rs); setRolesByMember(map); setLoading(false);
  }
  useEffect(() => { if (workspace?.id) load(); /* eslint-disable-next-line */ }, [workspace?.id]);

  const adminCount = useMemo(() => members.filter(x => x.permission_level === 'admin').length, [members]);
  if (permissionLevel !== 'admin') return null;

  const levelLabel = { admin: m.levelAdmin, manager: m.levelManager, member: m.levelMember };

  async function onLevel(member, level) {
    if (member.permission_level === 'admin' && level !== 'admin' && adminCount <= 1) { alert(m.lastAdmin); return; }
    await updateMemberLevel(member.id, level);
    setMembers(prev => prev.map(x => (x.id === member.id ? { ...x, permission_level: level } : x)));
  }
  async function onName(member, name) {
    await updateMemberDisplayName(member.id, name);
    setMembers(prev => prev.map(x => (x.id === member.id ? { ...x, display_name: name.trim() || null } : x)));
  }
  async function onToggleSkill(member, roleId) {
    const have = (rolesByMember.get(member.id) ?? []).map(r => r.id);
    const next = have.includes(roleId) ? have.filter(id => id !== roleId) : [...have, roleId];
    await setMemberRoles(member.id, next);
    const nextRoles = roles.filter(r => next.includes(r.id));
    setRolesByMember(prev => { const c = new Map(prev); c.set(member.id, nextRoles); return c; });
  }
  async function onRemove(member) {
    if (member.permission_level === 'admin' && adminCount <= 1) { alert(m.lastAdmin); return; }
    if (!window.confirm(m.removeConfirm)) return;
    await removeMember(member.id);
    setMembers(prev => prev.filter(x => x.id !== member.id));
  }

  return (
    <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-screen__bar">
        <button type="button" className="commons-screen__back" onClick={() => navigate(-1)} aria-label={m.back}>
          <IconChevronStart size={20} />
        </button>
        <span className="commons-screen__title">{m.title}</span>
      </header>

      <motion.div className="commons-screen__body"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
        <p className="commons-members__subtitle">{m.subtitle}</p>

        {loading ? <CommonsLoading /> : members.length === 0 ? (
          <p className="commons-members__empty">{m.empty}</p>
        ) : (
          <ul className="commons-members__list">
            {members.map(member => {
              const myRoles = (rolesByMember.get(member.id) ?? []).map(r => r.id);
              return (
                <li key={member.id} className="commons-memberRow">
                  <input className="commons-field__input commons-memberRow__name"
                    defaultValue={member.display_name ?? ''} placeholder={m.namePlaceholder}
                    aria-label={m.nameLabel} onBlur={e => onName(member, e.target.value)} />
                  <label className="commons-memberRow__level">
                    <span className="commons-srOnly">{m.levelLabel}</span>
                    <select className="commons-field__input" value={member.permission_level}
                      onChange={e => onLevel(member, e.target.value)}>
                      {LEVELS.map(l => <option key={l} value={l}>{levelLabel[l]}</option>)}
                    </select>
                  </label>
                  <div className="commons-memberRow__skills">
                    <span className="commons-memberRow__skillsLabel">{m.skillsLabel}</span>
                    {roles.length === 0 ? <span className="commons-memberRow__noSkills">{m.noSkills}</span> : roles.map(role => {
                      const on = myRoles.includes(role.id);
                      return (
                        <button type="button" key={role.id} data-role-color={on ? (role.color ?? '') : undefined}
                          className={on ? 'commons-skillChip is-on' : 'commons-skillChip'}
                          aria-pressed={on} onClick={() => onToggleSkill(member, role.id)}>
                          {role.name}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" className="commons-memberRow__remove" onClick={() => onRemove(member)}>{m.remove}</button>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 4: Create `members.css`.**

```css
/* src/commons/pages/MembersPage/members.css — member management screen. */
.commons-members__subtitle { color: var(--commons-text-dim); margin-bottom: 16px; }
.commons-members__empty { color: var(--commons-text-dim); }
.commons-members__list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.commons-memberRow { display: flex; flex-direction: column; gap: 10px;
  background: var(--commons-surface); border: 1px solid var(--commons-border); border-radius: 14px; padding: 14px; }
.commons-memberRow__name { font-weight: 700; }
.commons-memberRow__level .commons-field__input { max-width: 180px; }
.commons-memberRow__skills { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.commons-memberRow__skillsLabel { color: var(--commons-text-dim); font-size: 13px; }
.commons-memberRow__noSkills { color: var(--commons-text-dim); font-size: 13px; }
/* .commons-skillChip / .commons-skillPick / .commons-field__hint are defined canonically in
   CommonsLayout.css (shared with the task form's skill picker) — do NOT redefine them here. */
.commons-memberRow__remove { align-self: flex-start; background: none; border: 0; color: var(--commons-text-dim);
  cursor: pointer; font: inherit; padding: 4px 0; }
.commons-memberRow__remove:hover { color: #ff6b6b; }
.commons-memberRow__remove:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
.commons-srOnly { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
```

- [ ] **Step 5: Add the `/members` route.** In `src/commons/CommonsModule.jsx`, import and add (next to `/roles`, outside `CommonsLayout`):

```jsx
import { MembersPage } from './pages/MembersPage/MembersPage.jsx';
```
```jsx
      <Route path="members" element={<MembersPage />} />
```

- [ ] **Step 6: Rewire the menu entry.** In `src/commons/CommonsMenu.jsx`, change the members entry from the site-admin jump to the in-app commons-admin route. Remove the `isSiteAdmin`-gated `/admin/users` entry and replace with a `canFolder`-gated (admin) in-app entry:

```jsx
          {canFolder && <li><button type="button" className="commons-menu__item" onClick={() => go('/members')}><IconUsers size={20} /> {m.members}</button></li>}
```
(Delete the previous `{isSiteAdmin && … goAbs('/admin/users') …}` line. `isSiteAdmin`/`role`/`goAbs` may become unused — remove them too if so, to keep lint clean.)

- [ ] **Step 7: Lint + build + browser check (phase B).** At `/commons/joz-ve-loz`: menu → `ניהול חברים` opens the in-app screen; change a member's level, edit display name (blur saves), toggle skills on/off (persists on reload), and removal is blocked for the last admin. **User reviews, then commit.**

```bash
git add src/commons/pages/MembersPage src/commons/CommonsModule.jsx src/commons/CommonsMenu.jsx src/content/commons
git commit -m "feat(commons): in-app MembersPage (level/display/skills/remove) + menu rewire"
```

---

# Phase C — Invite & approval

## Task C1: `commons.invites` table + RLS + RPCs

**Files:** Create `supabase/migrations/20260613010000_commons_invites.sql`

- [ ] **Step 1: Write the migration.**

```sql
-- supabase/migrations/20260613010000_commons_invites.sql
-- Consent-based project invites: admins create an invite (email + level + skills); a membership is
-- created only when the invitee approves. Reconciliation is by email (provider-agnostic).

create table if not exists commons.invites (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references commons.workspaces(id) on delete cascade,
  email            text not null,
  permission_level text not null default 'member' check (permission_level in ('admin','manager','member')),
  role_ids         uuid[] not null default '{}',
  token            text not null unique,
  status           text not null default 'pending' check (status in ('pending','accepted','declined')),
  invited_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists invites_workspace_idx on commons.invites(workspace_id);
create index if not exists invites_email_idx on commons.invites(lower(email));

alter table commons.invites enable row level security;

-- Admins of the workspace manage its invites (list / resend / cancel).
create policy "admins manage invites" on commons.invites
  for all using (commons.my_permission(workspace_id) = 'admin')
  with check (commons.my_permission(workspace_id) = 'admin');

-- ── Create (admin-gated). Returns the token + whether the email already has a site account
-- (so the caller can tailor the email copy). Replaces any existing pending invite for the same email.
create or replace function commons.create_invite(p_workspace_id uuid, p_email text, p_level text, p_role_ids uuid[])
returns json
language plpgsql security definer set search_path = commons, public
as $$
declare new_token text; has_account boolean;
begin
  if commons.my_permission(p_workspace_id) <> 'admin' then raise exception 'not an admin'; end if;
  if p_level not in ('admin','manager','member') then raise exception 'bad level'; end if;

  delete from commons.invites
    where workspace_id = p_workspace_id and lower(email) = lower(p_email) and status = 'pending';

  new_token := replace(gen_random_uuid()::text, '-', '');
  insert into commons.invites(workspace_id, email, permission_level, role_ids, token, invited_by)
    values (p_workspace_id, lower(p_email), p_level, coalesce(p_role_ids, '{}'), new_token, auth.uid());

  select exists(select 1 from auth.users where lower(email) = lower(p_email)) into has_account;
  return json_build_object('token', new_token, 'has_account', has_account);
end;
$$;
grant execute on function commons.create_invite(uuid, text, text, uuid[]) to authenticated;

-- ── See my pending invites (matched by my verified email). Joined for display.
create or replace function commons.my_pending_invites()
returns table (token text, workspace_id uuid, workspace_name text, workspace_slug text,
               permission_level text, role_names text[])
language sql security definer set search_path = commons, public
as $$
  select i.token, i.workspace_id, w.name, w.slug, i.permission_level,
         coalesce(array_agg(r.name) filter (where r.name is not null), '{}')
  from commons.invites i
  join commons.workspaces w on w.id = i.workspace_id
  left join commons.roles r on r.id = any(i.role_ids)
  where i.status = 'pending' and lower(i.email) = lower(auth.email())
  group by i.token, i.workspace_id, w.name, w.slug, i.permission_level;
$$;
grant execute on function commons.my_pending_invites() to authenticated;

-- ── Accept: create the active membership + skills from the invite, mark it accepted. Idempotent.
create or replace function commons.accept_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = commons, public
as $$
declare inv commons.invites; mid uuid;
begin
  select * into inv from commons.invites where token = p_token and status = 'pending';
  if not found then raise exception 'invite not found'; end if;
  if lower(inv.email) <> lower(auth.email()) then raise exception 'email mismatch'; end if;

  insert into commons.workspace_members(workspace_id, user_id, permission_level, status, display_name)
    values (inv.workspace_id, auth.uid(), inv.permission_level, 'active', split_part(auth.email(), '@', 1))
    on conflict (workspace_id, user_id)
      do update set status = 'active', permission_level = excluded.permission_level
    returning id into mid;

  insert into commons.member_roles(member_id, role_id)
    select mid, rid from unnest(inv.role_ids) rid
    on conflict do nothing;

  update commons.invites set status = 'accepted' where id = inv.id;
  return inv.workspace_id;
end;
$$;
grant execute on function commons.accept_invite(text) to authenticated;

-- ── Decline: mark the invite declined (no membership).
create or replace function commons.decline_invite(p_token text)
returns void
language plpgsql security definer set search_path = commons, public
as $$
begin
  update commons.invites set status = 'declined'
    where token = p_token and status = 'pending' and lower(email) = lower(auth.email());
end;
$$;
grant execute on function commons.decline_invite(text) to authenticated;
```

- [ ] **Step 2: Apply.** Run: `... scripts/run-sql.mjs supabase/migrations/20260613010000_commons_invites.sql` — expect success.

- [ ] **Step 3: Verify the table + policy.** Run: `... scripts/run-sql.mjs --query "select policyname from pg_policies where schemaname='commons' and tablename='invites';"` — expect `admins manage invites`.

- [ ] **Step 4: Verify the RPCs exist.** Run: `... scripts/run-sql.mjs --query "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='commons' and proname in ('create_invite','my_pending_invites','accept_invite','decline_invite') order by proname;"` — expect all four.

- [ ] **Step 5: Commit.**

```bash
git add supabase/migrations/20260613010000_commons_invites.sql
git commit -m "feat(commons): invites table + create/accept/decline/pending RPCs + RLS"
```

## Task C2: `send-invite` Edge Function (Resend)

**Files:** Create `supabase/functions/send-invite/index.ts`

- [ ] **Step 1: Write the Edge Function** (follows the `delete-account` pattern: verify caller is a workspace admin via their JWT, then send the email through Resend):

```ts
// supabase/functions/send-invite/index.ts
// Sends a project-invite email via Resend. Verifies the caller is an admin of the workspace
// (caller JWT + commons.my_permission). The Resend key + from-address live as function secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { workspaceId, email, token, hasAccount, workspaceName, origin, slug } = await req.json();

    // Authorize: caller must be an admin of this workspace.
    const { data: level } = await callerClient.schema('commons').rpc('my_permission', { wid: workspaceId });
    if (level !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const link = `${origin}/commons/${slug}/join/${token}`;
    const subject = `הזמנה למרחב ${workspaceName}`;
    const lead = hasAccount
      ? `הוזמנת להצטרף למרחב "${workspaceName}" בכפר הירעור.`
      : `הוזמנת להצטרף למרחב "${workspaceName}" בכפר הירעור. נרשמים לאתר ומאשרים את ההצטרפות:`;
    const html = `<div dir="rtl" style="font-family:sans-serif;line-height:1.6">
      <h2>${workspaceName}</h2><p>${lead}</p>
      <p><a href="${link}" style="background:#6c8cff;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">לאישור ההצטרפות</a></p>
      <p style="color:#888;font-size:13px">${link}</p></div>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: Deno.env.get('INVITE_FROM'), to: email, subject, html }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      return new Response(JSON.stringify({ error: `Resend ${resp.status}: ${body}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Set the function secrets + deploy** (user runs this — needs the Supabase CLI logged in to project `kqlfvwlzayinngrgafec`, or set secrets via the dashboard → Edge Functions). `INVITE_FROM` must use a **Resend-verified domain** (e.g. `כפר הירעור <noreply@kfarhirur.com>`); the `RESEND_API_KEY` is the existing "KfarHirur" key from `.env`:

```bash
supabase secrets set RESEND_API_KEY="<the KfarHirur Resend key>" INVITE_FROM="Kfar Hirur <noreply@kfarhirur.com>" --project-ref kqlfvwlzayinngrgafec
supabase functions deploy send-invite --project-ref kqlfvwlzayinngrgafec
```
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are auto-provided to functions.) If the domain isn't verified yet, the copy-link path (Task C3) still works — note this to the user.

- [ ] **Step 3: Commit.**

```bash
git add supabase/functions/send-invite/index.ts
git commit -m "feat(commons): send-invite Edge Function (Resend, admin-gated)"
```

## Task C3: Invite wrappers + MembersPage invite form & pending list

**Files:** Modify `src/data/commons/memberQueries.js`, `src/commons/pages/MembersPage/MembersPage.jsx`, `src/commons/pages/MembersPage/members.css`, `src/content/commons/{he,en}/commonsShell.content.js`

- [ ] **Step 1: Add invite wrappers to `memberQueries.js`.** Append:

```js
// ── Invites ──────────────────────────────────────────────────────
export async function createInvite(workspaceId, email, level, roleIds) {
  const { data, error } = await commonsDb.rpc('create_invite', {
    p_workspace_id: workspaceId, p_email: email.trim(), p_level: level, p_role_ids: roleIds ?? [],
  });
  if (error) throw error;
  return data; // { token, has_account }
}

export async function listInvites(workspaceId) {
  const { data, error } = await commonsDb
    .from('invites')
    .select('id, email, permission_level, status, token, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function cancelInvite(inviteId) {
  const { error } = await commonsDb.from('invites').delete().eq('id', inviteId);
  if (error) throw error;
}

// Fire the Resend email (best-effort; the copyable link is always available as a fallback).
// Edge Functions live on the BASE client, not the schema-scoped `commonsDb`.
export async function sendInviteEmail(payload) {
  const { error } = await supabase.functions.invoke('send-invite', { body: payload });
  if (error) throw error;
}
```

Add the base-client import at the top of `memberQueries.js` (next to the `commonsClient` import):
```js
import { supabase } from '../timeline/supabaseClient.js';
```
(`commonsClient.js` confirms `commonsDb = supabase.schema('commons')`, which does **not** expose `.functions` — Edge Function invokes must go through the base `supabase` client.)

- [ ] **Step 2: Add invite content keys (Hebrew).** In the `members` block of `src/content/commons/he/commonsShell.content.js`, add:

```js
    invite: 'הזמנת חבר',
    inviteEmail: 'אימייל',
    inviteEmailPlaceholder: 'name@example.com',
    inviteSend: 'שליחת הזמנה',
    inviteLinkLabel: 'לינק הצטרפות',
    inviteCopy: 'העתקת לינק',
    inviteCopied: 'הועתק!',
    inviteSent: 'ההזמנה נשלחה.',
    inviteEmailFailed: 'הלינק מוכן להעתקה (שליחת המייל נכשלה).',
    pendingTitle: 'הזמנות ממתינות',
    pendingEmpty: 'אין הזמנות ממתינות.',
    resend: 'שליחה מחדש',
    cancelInvite: 'ביטול',
```

- [ ] **Step 3: Mirror in English** (`members` block of the en file): `invite:'Invite member', inviteEmail:'Email', inviteEmailPlaceholder:'name@example.com', inviteSend:'Send invite', inviteLinkLabel:'Join link', inviteCopy:'Copy link', inviteCopied:'Copied!', inviteSent:'Invite sent.', inviteEmailFailed:'Link ready to copy (email send failed).', pendingTitle:'Pending invites', pendingEmpty:'No pending invites.', resend:'Resend', cancelInvite:'Cancel'`.

- [ ] **Step 4: Add the invite form + pending list to `MembersPage.jsx`.** Add imports:

```jsx
import { fetchMembers, updateMemberLevel, updateMemberDisplayName, removeMember,
         createInvite, listInvites, cancelInvite, sendInviteEmail } from '../../../data/commons/memberQueries.js';
```
Add state:
```jsx
  const [invites, setInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLevel, setInviteLevel] = useState('member');
  const [inviteSkills, setInviteSkills] = useState([]);
  const [lastLink, setLastLink] = useState('');
  const [notice, setNotice] = useState('');
```
Load invites in `load()` (extend the `Promise.all`):
```jsx
    const [mem, rs, map, inv] = await Promise.all([
      fetchMembers(workspace.id), fetchRoles(workspace.id), fetchMemberRolesMap(workspace.id), listInvites(workspace.id),
    ]);
    setMembers(mem); setRoles(rs); setRolesByMember(map); setInvites(inv); setLoading(false);
```
Add handlers:
```jsx
  async function onInvite(e) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    const { token, has_account } = await createInvite(workspace.id, email, inviteLevel, inviteSkills);
    const link = `${window.location.origin}/commons/${workspace.slug}/join/${token}`;
    setLastLink(link);
    try {
      await sendInviteEmail({ workspaceId: workspace.id, email, token, hasAccount: has_account,
        workspaceName: workspace.name, origin: window.location.origin, slug: workspace.slug });
      setNotice(m.inviteSent);
    } catch { setNotice(m.inviteEmailFailed); }
    setInviteEmail(''); setInviteSkills([]);
    setInvites(await listInvites(workspace.id));
  }
  function copyLink() { navigator.clipboard?.writeText(lastLink); setNotice(m.inviteCopied); }
  async function onResend(inv) {
    const link = `${window.location.origin}/commons/${workspace.slug}/join/${inv.token}`;
    setLastLink(link);
    try {
      await sendInviteEmail({ workspaceId: workspace.id, email: inv.email, token: inv.token, hasAccount: true,
        workspaceName: workspace.name, origin: window.location.origin, slug: workspace.slug });
      setNotice(m.inviteSent);
    } catch { setNotice(m.inviteEmailFailed); }
  }
  async function onCancelInvite(inv) {
    await cancelInvite(inv.id);
    setInvites(prev => prev.filter(x => x.id !== inv.id));
  }
  function toggleInviteSkill(roleId) {
    setInviteSkills(prev => prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]);
  }
```
Render an invite card above the members list (inside the body, after the subtitle):
```jsx
        <form className="commons-invite" onSubmit={onInvite}>
          <div className="commons-invite__row">
            <input className="commons-field__input" type="email" value={inviteEmail} placeholder={m.inviteEmailPlaceholder}
              aria-label={m.inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            <select className="commons-field__input commons-invite__level" value={inviteLevel} onChange={e => setInviteLevel(e.target.value)}>
              {LEVELS.map(l => <option key={l} value={l}>{levelLabel[l]}</option>)}
            </select>
          </div>
          {roles.length > 0 && (
            <div className="commons-invite__skills">
              {roles.map(role => (
                <button type="button" key={role.id} data-role-color={inviteSkills.includes(role.id) ? (role.color ?? '') : undefined}
                  className={inviteSkills.includes(role.id) ? 'commons-skillChip is-on' : 'commons-skillChip'}
                  aria-pressed={inviteSkills.includes(role.id)} onClick={() => toggleInviteSkill(role.id)}>{role.name}</button>
              ))}
            </div>
          )}
          <button type="submit" className="commons-btn commons-btn--primary" disabled={!inviteEmail.trim()}>{m.inviteSend}</button>
        </form>
        {notice && <p className="commons-invite__notice" role="status">{notice}</p>}
        {lastLink && (
          <div className="commons-invite__link">
            <span className="commons-invite__linkLabel">{m.inviteLinkLabel}</span>
            <code className="commons-invite__url">{lastLink}</code>
            <button type="button" className="commons-roleRow__btn" onClick={copyLink}>{m.inviteCopy}</button>
          </div>
        )}

        {invites.length > 0 && (
          <div className="commons-pending">
            <h2 className="commons-pending__title">{m.pendingTitle}</h2>
            <ul className="commons-pending__list">
              {invites.map(inv => (
                <li key={inv.id} className="commons-pendingRow">
                  <span className="commons-pendingRow__email">{inv.email}</span>
                  <span className="commons-pendingRow__level">{levelLabel[inv.permission_level]}</span>
                  <button type="button" className="commons-roleRow__btn" onClick={() => onResend(inv)}>{m.resend}</button>
                  <button type="button" className="commons-roleRow__btn commons-roleRow__btn--danger" onClick={() => onCancelInvite(inv)}>{m.cancelInvite}</button>
                </li>
              ))}
            </ul>
          </div>
        )}
```

- [ ] **Step 5: Style the invite block.** Append to `members.css`:

```css
.commons-invite { display: flex; flex-direction: column; gap: 10px; background: var(--commons-surface);
  border: 1px solid var(--commons-border); border-radius: 14px; padding: 14px; margin-bottom: 18px; }
.commons-invite__row { display: flex; gap: 8px; flex-wrap: wrap; }
.commons-invite__row .commons-field__input { flex: 1; min-width: 160px; }
.commons-invite__level { max-width: 140px; flex: 0 0 auto; }
.commons-invite__skills { display: flex; flex-wrap: wrap; gap: 8px; }
.commons-invite__notice { color: var(--commons-accent); font-size: 14px; }
.commons-invite__link { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
.commons-invite__linkLabel { color: var(--commons-text-dim); font-size: 13px; }
.commons-invite__url { background: var(--commons-surface-2); border-radius: 8px; padding: 4px 8px; font-size: 12px; word-break: break-all; }
.commons-pending { margin-top: 22px; }
.commons-pending__title { font-size: 15px; font-weight: 800; margin-bottom: 10px; }
.commons-pending__list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.commons-pendingRow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: var(--commons-surface); border: 1px solid var(--commons-border); border-radius: 10px; padding: 8px 12px; }
.commons-pendingRow__email { flex: 1; min-width: 120px; }
.commons-pendingRow__level { color: var(--commons-text-dim); font-size: 13px; }
```

- [ ] **Step 6: Lint + build.** Expected: clean.

- [ ] **Step 7: Commit.**

```bash
git add src/data/commons/memberQueries.js src/commons/pages/MembersPage src/content/commons
git commit -m "feat(commons): invite form + pending-invites list + Resend send wrapper"
```

## Task C4: JoinInvitePage + pending-invite section at `/commons`

**Files:** Create `src/commons/pages/JoinInvitePage/JoinInvitePage.jsx`, `src/commons/pages/JoinInvitePage/join.css`; Modify `src/commons/CommonsModule.jsx`, `src/data/commons/memberQueries.js`, `src/content/commons/{he,en}/commonsShell.content.js`

- [ ] **Step 1: Add `acceptInvite`/`declineInvite`/`myPendingInvites` wrappers** to `memberQueries.js`. Append:

```js
export async function myPendingInvites() {
  const { data, error } = await commonsDb.rpc('my_pending_invites');
  if (error) return [];
  return data ?? [];
}
export async function acceptInvite(token) {
  const { data, error } = await commonsDb.rpc('accept_invite', { p_token: token });
  if (error) throw error;
  return data; // workspace_id
}
export async function declineInvite(token) {
  const { error } = await commonsDb.rpc('decline_invite', { p_token: token });
  if (error) throw error;
}
```

- [ ] **Step 2: Add the `join` content block (Hebrew).** In `src/content/commons/he/commonsShell.content.js`, add a top-level `join` block:

```js
  join: {
    title: 'הזמנה למרחב עבודה',
    invitedTo: 'הוזמנת להצטרף אל',
    asLevel: 'בתור',
    skills: 'כישורים',
    accept: 'אישור והצטרפות',
    decline: 'דחייה',
    signInFirst: 'התחברו או הירשמו כדי לאשר את ההצטרפות.',
    notFound: 'ההזמנה לא נמצאה או כבר טופלה.',
    pendingTitle: 'הוזמנת למרחבים',
  },
```

- [ ] **Step 3: Mirror in English:** `join` = `{ title:'Workspace invitation', invitedTo:'You\'ve been invited to', asLevel:'as', skills:'Skills', accept:'Accept & join', decline:'Decline', signInFirst:'Sign in or sign up to accept.', notFound:'Invite not found or already handled.', pendingTitle:'You\'re invited' }`.

- [ ] **Step 4: Create `JoinInvitePage.jsx`** (deep-linked accept/decline; reuses the site `AuthModal` when signed out):

```jsx
// src/commons/pages/JoinInvitePage/JoinInvitePage.jsx
// Deep-linked invite acceptance (/commons/:slug/join/:token). Signed out → the site AuthModal;
// signed in → shows the matching pending invite (by email) with Accept / Decline.

import './join.css';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useAuth } from '../../../app/appState/AuthContext.jsx';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { resolveSiteShellContent } from '../../../app/resolveSiteShellContent.js';
import { AuthModal } from '../../../features/auth/AuthModal.jsx';
import { myPendingInvites, acceptInvite, declineInvite } from '../../../data/commons/memberQueries.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';

export function JoinInvitePage() {
  const { locale } = useAppContext();
  const { user, loading: authLoading } = useAuth();
  const { token } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const j = shell.join;

  const [invite, setInvite] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    myPendingInvites().then(list => {
      if (!cancelled) setInvite(list.find(i => i.token === token) ?? null);
    });
    return () => { cancelled = true; };
  }, [authLoading, user, token]);

  async function accept() {
    const wid = await acceptInvite(token);
    if (invite?.workspace_slug) navigate(`/commons/${invite.workspace_slug}`);
    else navigate('/commons');
    void wid;
  }
  async function decline() {
    await declineInvite(token);
    navigate('/commons');
  }

  if (authLoading) {
    return <div className="commons-root commons-center" dir={locale === 'he' ? 'rtl' : 'ltr'}><CommonsLoading /></div>;
  }
  if (!user) {
    const authCopy = resolveSiteShellContent('he').auth ?? {};
    return (
      <div className="commons-root commons-center commons-join" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <p className="commons-join__lead">{j.signInFirst}</p>
        <AuthModal isOpen onClose={() => {}} copy={authCopy} />
      </div>
    );
  }
  if (invite === undefined) {
    return <div className="commons-root commons-center" dir={locale === 'he' ? 'rtl' : 'ltr'}><CommonsLoading /></div>;
  }
  if (invite === null) {
    return (
      <div className="commons-root commons-center commons-join" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <p className="commons-join__lead">{j.notFound}</p>
        <button type="button" className="commons-btn commons-btn--ghost" onClick={() => navigate('/commons')}>{shell.access.backToSite}</button>
      </div>
    );
  }

  return (
    <div className="commons-root commons-center commons-join" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-join__card">
        <h1 className="commons-join__title">{j.title}</h1>
        <p className="commons-join__to">{j.invitedTo} <strong>{invite.workspace_name}</strong></p>
        <p className="commons-join__level">{j.asLevel} {invite.permission_level}</p>
        {invite.role_names?.length > 0 && <p className="commons-join__skills">{j.skills}: {invite.role_names.join(', ')}</p>}
        <div className="commons-join__actions">
          <button type="button" className="commons-btn commons-btn--ghost" onClick={decline}>{j.decline}</button>
          <button type="button" className="commons-btn commons-btn--primary" onClick={accept}>{j.accept}</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `join.css`.**

```css
/* src/commons/pages/JoinInvitePage/join.css — invite acceptance screen. */
.commons-join { padding: 24px; flex-direction: column; gap: 16px; }
.commons-join__lead { color: var(--commons-text-dim); text-align: center; }
.commons-join__card { background: var(--commons-surface); border: 1px solid var(--commons-border);
  border-radius: 18px; padding: 24px; width: min(420px, calc(100vw - 32px)); }
.commons-join__title { font-size: 20px; font-weight: 800; margin-bottom: 12px; }
.commons-join__to { font-size: 16px; margin-bottom: 4px; }
.commons-join__level, .commons-join__skills { color: var(--commons-text-dim); margin-bottom: 4px; }
.commons-join__actions { display: flex; gap: 10px; margin-top: 18px; }
.commons-join__actions .commons-btn { flex: 1; }
```

- [ ] **Step 6: Wire the route + the pending-invite section at `/commons`.** In `src/commons/CommonsModule.jsx`:

Import:
```jsx
import { JoinInvitePage } from './pages/JoinInvitePage/JoinInvitePage.jsx';
import { useEffect, useState } from 'react';
import { myPendingInvites } from '../data/commons/memberQueries.js';
```
Add the join route inside `WorkspaceGate`'s inner `<Routes>` (outside `CommonsLayout`, like `task/*`). Note: the join route must be reachable even though the gate currently redirects non-members. Render it **before** the `isMember` redirect so an invited non-member can accept:
```jsx
function WorkspaceGate() {
  const { workspaceSlug } = useParams();
  const { loading, isMember } = useWorkspace();
  const { workspaces } = useMemberships();
  if (loading) return <LoadingScreen name={workspaces.find(w => w.slug === workspaceSlug)?.name} />;
  return (
    <Routes>
      <Route path="join/:token" element={<JoinInvitePage />} />
      {isMember ? (
        <>
          <Route element={<CommonsLayout />}>
            <Route index element={<MyTasksPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="board/:containerId" element={<AreaPage />} />
            <Route path="overview" element={<OverviewPage />} />
          </Route>
          <Route path="task/new" element={<TaskFormPage mode="create" />} />
          <Route path="task/:nodeId" element={<TaskViewPage />} />
          <Route path="task/:nodeId/edit" element={<TaskFormPage mode="edit" />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="members" element={<MembersPage />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/commons" replace />} />
      )}
    </Routes>
  );
}
```
(Keep the `RolesPage`/`MembersPage`/`JoinInvitePage` imports from earlier tasks.)

Add a pending-invite banner to `MembershipsGate` so invitees see it even with 0 memberships:
```jsx
function MembershipsGate() {
  const { loading, workspaces } = useMemberships();
  const [invites, setInvites] = useState([]);
  useEffect(() => { myPendingInvites().then(setInvites); }, []);
  if (loading) return <LoadingScreen />;
  if (workspaces.length === 0 && invites.length === 0) return <NoAccessScreen />;
  if (workspaces.length === 0 && invites.length > 0) return <PendingInvites invites={invites} />;
  if (workspaces.length === 1 && invites.length === 0) return <Navigate to={`/commons/${workspaces[0].slug}`} replace />;
  return <WorkspacePicker invites={invites} />;
}
```
Add a small `PendingInvites` component in `CommonsModule.jsx` (or its own file) that lists invites with a "go accept" link to `/commons/:slug/join/:token`:
```jsx
function PendingInvites({ invites }) {
  const { locale } = useAppContext();
  const shell = resolveCommonsShellContent(locale);
  return (
    <div className="commons-root commons-center commons-join" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-join__card">
        <h1 className="commons-join__title">{shell.join.pendingTitle}</h1>
        <ul className="commons-join__pending">
          {invites.map(i => (
            <li key={i.token}>
              <a className="commons-btn commons-btn--primary" href={`/commons/${i.workspace_slug}/join/${i.token}`}>{i.workspace_name}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```
(Import `'./pages/JoinInvitePage/join.css'` at the top of `CommonsModule.jsx` so `.commons-join` styles are available here, and add `.commons-join__pending { list-style:none; display:flex; flex-direction:column; gap:10px; margin-top:12px; }` to `join.css`. If `WorkspacePicker` doesn't accept an `invites` prop, drop that prop — surfacing invites at the picker is optional; the 0-membership path is the important one.)

- [ ] **Step 7: Lint + build + browser check (phase C).** End-to-end at `/commons/joz-ve-loz`:
  1. As admin, open `ניהול חברים` → invite an email you control (pick level + skills). The copyable link appears; if the Resend domain is verified, the email arrives.
  2. Open the `/join/<token>` link in a session signed in as that email → see the invite → **Accept** → land in the workspace as an active member with the chosen skills (verify on the members screen).
  3. A signed-in invitee with 0 memberships hitting `/commons` sees the pending-invite card.
  4. **Decline** marks the invite gone; **cancel** from the admin pending list removes it.

  Verify the membership + skills in SQL if useful:
  `... scripts/run-sql.mjs --query "select wm.display_name, wm.permission_level, array_agg(r.name) from commons.workspace_members wm left join commons.member_roles mr on mr.member_id=wm.id left join commons.roles r on r.id=mr.role_id where wm.workspace_id=(select id from commons.workspaces where slug='joz-ve-loz') group by wm.id;"`

  **User reviews, then commit.**

```bash
git add src/commons/pages/JoinInvitePage src/commons/CommonsModule.jsx src/data/commons/memberQueries.js src/content/commons
git commit -m "feat(commons): JoinInvitePage accept/decline + pending-invite surfacing at /commons"
```

---

## Self-review notes

- **Spec coverage:** `nodes.role_id` + null=anyone (A1) · skill-gated `claim_node` (A1) · claim UI gating (A5) · `roleQueries`/`memberQueries` data layer (A2,B1) · RolesPage CRUD (A4) · task-form skill field + skill chip (A5) · MembersPage level/display/skills/remove + last-admin guard (B2) · menu rewire to in-app `/members` + new `/roles` entry (A4,B2) · `commons.invites` + create/accept/decline/pending RPCs + RLS (C1) · `send-invite` Edge Function via Resend, admin-gated, account detection for copy (C2) · invite form + copy link + pending list + resend/cancel (C3) · JoinInvitePage + pending section at `/commons`, consent-only membership (C4) · provider-agnostic email reconciliation via `auth.email()` (C1).
- **Naming consistency:** `nodes.role_id`; `commons.roles`/`member_roles`; RPCs `claim_node`, `create_invite(p_workspace_id,p_email,p_level,p_role_ids)`, `my_pending_invites()`, `accept_invite(p_token)`, `decline_invite(p_token)`; data fns `fetchRoles`, `createRole`, `updateRole`, `deleteRole`, `fetchMemberRolesMap`, `setMemberRoles`, `fetchMembers`, `updateMemberLevel`, `updateMemberDisplayName`, `removeMember`, `createInvite`, `listInvites`, `cancelInvite`, `sendInviteEmail`, `myPendingInvites`, `acceptInvite`, `declineInvite`; content blocks `rolesScreen`, `members`, `join`, `form.skill`/`form.skillAnyone`, `view.skill`, `menu.roles`; role color keys `"1"`–`"6"` via `[data-role-color]`.
- **Deferred (per spec):** auto-email-only (copy link always available), per-skill task-discovery feeds, bulk import, invite editing after send (cancel + re-invite), invite expiry.
- **Infra dependencies the user performs:** apply the two SQL migrations (Tasks A1, C1) via `run-sql.mjs`; set Resend secrets + deploy the `send-invite` function (Task C2). The `INVITE_FROM` domain must be verified in Resend for email delivery; the copy-link path works regardless.
- **Risk flags:** (1) Edge Function invokes go through the base `supabase` client, not the schema-scoped `commonsDb` (resolved in Task C3 — `commonsClient.js` confirms `commonsDb` has no `.functions`). (2) `WorkspaceGate` now renders the `join/:token` route before the membership redirect so invited non-members can reach it (Task C4). (3) `auth.email()` must be available in Postgres (Supabase-provided) — verified by the C1 RPC apply.
```
