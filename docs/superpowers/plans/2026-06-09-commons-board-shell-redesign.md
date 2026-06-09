# Commons Board & Shell Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Commons UI to the work-engine design — שלי = my assigned tasks, לוח = an areas board drilling into a single area, full-screen create/view/edit, a hamburger menu for workspace actions, a FAB for creating, and a task/folder permission split enforced in RLS.

**Architecture:** React 19 SPA (Vite, React Router v6). Commons is a self-contained module under `/commons`. Data flows components → `useWorkspaceTree` hook → `nodeQueries` → Supabase `commons` schema (RLS). This plan adds screens + a hamburger menu + a FAB, repurposes the existing `TaskTree`, and tightens RLS (writes: tasks → manager/admin, folders → admin; completion → all members via a `set_node_status` RPC). The recurrence engine, `RecurrenceField`, `recurrence.js`, `nodeQueries` CRUD, and `useWorkspaceTree` carry over.

**Tech Stack:** React 19, React Router v6, Supabase (`@supabase/supabase-js`, `commons` schema), plain CSS with `var(--commons-*)` tokens. **No test runner is configured** — each task verifies with `npm run lint` (commons files clean) + `npm run build`, and each phase ends with a browser check at `/commons/joz-ve-loz` before committing (project rule: never commit app code before the user reviews it in the browser).

**Run commands (Hebrew-username PATH workaround):**
- Lint: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint`
- Build: same prefix + `run build`
- SQL via Management API: `"/c/Program Files/nodejs/node" --env-file=.env.local scripts/run-sql.mjs <file.sql>`

**Permission helper (used throughout):** from `useWorkspace()`, `const canTask = ['admin','manager'].includes(permissionLevel); const canFolder = permissionLevel === 'admin';`

---

## Phase 3a — Shell & menu

### Task 1: Content keys for the new shell

**Files:**
- Modify: `src/content/commons/he/commonsShell.content.js`
- Modify: `src/content/commons/en/commonsShell.content.js`

- [ ] **Step 1: Add the `menu`, `fab`, `myTasks`, `board`, `form`, `view` blocks (he).** Insert these keys into the exported object (after `switcher`), keeping existing `tasks` (recurrence) intact:

```js
  menu: {
    triggerAria: 'תפריט',
    title: 'תפריט',
    newTask: 'משימה חדשה',
    newFolder: 'תיקייה חדשה',
    switchWorkspace: 'החלפת מרחב עבודה',
    members: 'ניהול משתמשים',
    settings: 'הגדרות',
    backToSite: 'חזרה לאתר',
  },
  fab: { newTaskAria: 'משימה חדשה' },
  myTasks: {
    title: 'המשימות שלי',
    filterToday: 'היום',
    filterOverdue: 'באיחור',
    filterAll: 'הכל',
    empty: 'אין משימות שמשויכות אליך כרגע.',
    noArea: 'כללי',
    openTaskAria: 'פתיחת המשימה',
  },
  board: {
    rootAreaTitle: 'משימות כלליות',
    open: 'פתוחות',
    overdue: 'באיחור',
    empty: 'עוד אין מרחבים. אדמין יכול להוסיף תיקייה כדי להתחיל.',
    openAreaAria: 'פתיחת מרחב',
    back: 'חזרה',
  },
  form: {
    newTaskTitle: 'משימה חדשה',
    newFolderTitle: 'תיקייה חדשה',
    editTaskTitle: 'עריכת משימה',
    editFolderTitle: 'עריכת תיקייה',
    titleLabel: 'כותרת',
    location: 'מרחב',
    locationRoot: 'רמה ראשית',
    description: 'תיאור',
    descriptionPlaceholder: 'פרטים, הערות, קישורים…',
    owner: 'אחראי/ת',
    unassigned: 'לא משויך',
    due: 'תאריך יעד',
    create: 'יצירה',
    save: 'שמירה',
    back: 'חזרה',
    delete: 'מחיקה',
  },
  view: {
    back: 'חזרה',
    edit: 'עריכה',
    markDone: 'סמן כבוצע',
    reopen: 'החזר לפתוח',
    noDescription: 'אין תיאור.',
    owner: 'אחראי/ת',
    unassigned: 'לא משויך',
    due: 'תאריך יעד',
    statusOpen: 'פתוחה',
    statusDone: 'בוצעה',
    statusMissed: 'הוחמצה',
  },
```

- [ ] **Step 2: Mirror the same keys in `en`** with English copy (`menu.newTask: 'New task'`, `board.open: 'open'`, `myTasks.title: 'My tasks'`, etc. — same shape, English values).

- [ ] **Step 3: Lint + build.** Expected: no new errors in commons files; build succeeds.

### Task 2: Hamburger menu component

**Files:**
- Create: `src/commons/CommonsMenu.jsx`
- Modify: `src/commons/styles/CommonsLayout.css` (append menu styles)

- [ ] **Step 1: Create `CommonsMenu.jsx`.** A bottom-sheet menu (reuses `.commons-sheet*`). Entries are permission-gated; navigation builds `/commons/:slug/...`. "Switch workspace" delegates to the parent (which opens `WorkspaceSwitcher`).

```jsx
// src/commons/CommonsMenu.jsx
// Workspace-level action menu (bottom sheet) opened from the top-bar ☰.
// Entries gate by permission: new task → manager/admin, new folder + members + settings → admin.
// "Switch workspace" is delegated to the parent so it can open the existing WorkspaceSwitcher.

import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { useMemberships } from './commonsState/MembershipsContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';

export function CommonsMenu({ open, onClose, onSwitchWorkspace }) {
  const { locale } = useAppContext();
  const { permissionLevel } = useWorkspace();
  const { workspaces } = useMemberships();
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const m = shell.menu;
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canTask = ['admin', 'manager'].includes(permissionLevel);
  const canFolder = permissionLevel === 'admin';
  const base = `/commons/${workspaceSlug}`;
  const go = (path) => { onClose(); navigate(`${base}${path}`); };

  return (
    <div className="commons-sheetRoot" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={onClose} />
      <div className="commons-sheet" ref={ref} role="dialog" aria-modal="true" aria-label={m.title}>
        <div className="commons-sheet__grip" aria-hidden="true" />
        <h2 className="commons-sheet__title">{m.title}</h2>
        <ul className="commons-menu">
          {canTask && <li><button type="button" className="commons-menu__item" onClick={() => go('/task/new')}>＋ {m.newTask}</button></li>}
          {canFolder && <li><button type="button" className="commons-menu__item" onClick={() => go('/task/new?kind=container')}>🗂 {m.newFolder}</button></li>}
          {workspaces.length > 1 && (
            <li><button type="button" className="commons-menu__item" onClick={() => { onClose(); onSwitchWorkspace(); }}>⇄ {m.switchWorkspace}</button></li>
          )}
          {canFolder && <li><button type="button" className="commons-menu__item" onClick={() => go('/members')}>👥 {m.members}</button></li>}
          {canFolder && <li><button type="button" className="commons-menu__item" onClick={() => go('/settings')}>⚙ {m.settings}</button></li>}
          <li><button type="button" className="commons-menu__item commons-menu__item--muted" onClick={() => { onClose(); navigate('/'); }}>← {m.backToSite}</button></li>
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Append menu styles to `CommonsLayout.css`.**

```css
/* ── Hamburger menu (bottom sheet list) ── */
.commons-menu { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.commons-menu__item {
  width: 100%; text-align: start; display: flex; align-items: center; gap: 10px;
  background: var(--commons-surface-2); color: var(--commons-text);
  border: 0; border-radius: 10px; padding: 13px 14px; font: inherit; cursor: pointer;
  transition: background 140ms ease;
}
.commons-menu__item:hover { background: var(--commons-border); }
.commons-menu__item:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
.commons-menu__item--muted { color: var(--commons-text-dim); background: none; }

/* ── Top-bar hamburger button ── */
.commons-topbar__menuBtn {
  flex: 0 0 auto; width: 38px; height: 38px; border-radius: 10px;
  background: none; border: 0; color: var(--commons-text); font-size: 20px; cursor: pointer;
  display: grid; place-items: center;
}
.commons-topbar__menuBtn:hover { background: var(--commons-surface-2); }
.commons-topbar__menuBtn:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
```

- [ ] **Step 3: Lint + build.** Expected: clean (component not yet imported — that's fine; it will be in Task 4).

### Task 3: FAB component

**Files:**
- Create: `src/commons/Fab.jsx`
- Modify: `src/commons/styles/CommonsLayout.css` (append FAB styles)

- [ ] **Step 1: Create `Fab.jsx`.**

```jsx
// src/commons/Fab.jsx
// Floating create button: blue circle, bottom-left, above the tab bar. Rendered by the board/area
// screens for manager/admin. onClick navigates to the create form (parent pre-filled by the caller).

export function Fab({ onClick, label }) {
  return (
    <button type="button" className="commons-fab" onClick={onClick} aria-label={label}>
      <span aria-hidden="true">＋</span>
    </button>
  );
}
```

- [ ] **Step 2: Append FAB styles.**

```css
/* ── Create FAB (bottom-left, above the tab bar) ── */
.commons-fab {
  position: fixed; left: 16px; bottom: calc(74px + env(safe-area-inset-bottom)); z-index: 20;
  width: 56px; height: 56px; border-radius: 50%; border: 0; cursor: pointer;
  background: var(--commons-accent); color: var(--commons-on-accent);
  font-size: 30px; line-height: 1; display: grid; place-items: center;
  box-shadow: 0 6px 18px rgba(108, 140, 255, .45);
  transition: transform 160ms cubic-bezier(.2,.8,.2,1);
}
.commons-fab:active { transform: scale(.92); }
.commons-fab:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .commons-fab { transition: none; } }
```

- [ ] **Step 3: Lint + build.** Expected: clean.

### Task 4: CommonsLayout — ☰ + menu + static name; stub routes for members/settings

**Files:**
- Modify: `src/commons/CommonsLayout.jsx`
- Modify: `src/commons/CommonsModule.jsx`

- [ ] **Step 1: Rewrite `CommonsLayout.jsx`** — add the ☰ button + `CommonsMenu`, keep the name as a static label, keep `WorkspaceSwitcher` (now opened from the menu):

```jsx
// src/commons/CommonsLayout.jsx
// Commons shell: top bar (☰ menu + workspace name) + content Outlet + bottom tab nav.
// The hamburger holds workspace-level actions; the switcher opens from it. Mobile-first, RTL.

import './styles/commons-tokens.css';
import './styles/CommonsLayout.css';
import { useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { useAppContext } from '../app/appState/useAppContext.js';
import { useWorkspace } from './commonsState/WorkspaceContext.jsx';
import { resolveCommonsShellContent } from './resolveCommonsShellContent.js';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.jsx';
import { CommonsMenu } from './CommonsMenu.jsx';

const TABS = [
  { path: '',          icon: '✓',  key: 'myTasks',  end: true },
  { path: '/board',    icon: '▦',  key: 'board' },
  { path: '/overview', icon: '◉',  key: 'overview' },
  { path: '/alerts',   icon: '🔔', key: 'alerts' },
];

export function CommonsLayout() {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const { workspaceSlug } = useParams();
  const shell = resolveCommonsShellContent(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const name = workspace?.name ?? shell.appName;

  return (
    <div className="commons-root commons-layout" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-topbar">
        <button
          type="button"
          className="commons-topbar__menuBtn"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          aria-label={shell.menu.triggerAria}
        >
          ☰
        </button>
        <span className="commons-topbar__name">{name}</span>
        <span style={{ width: 38 }} aria-hidden="true" />
      </header>

      <main className="commons-content">
        <Outlet />
      </main>

      <nav className="commons-tabbar" aria-label={shell.nav.menuAriaLabel}>
        {TABS.map(({ path, icon, key, end }) => (
          <NavLink key={key} to={`/commons/${workspaceSlug}${path}`} end={end} className="commons-tab">
            <span className="commons-tab__icon" aria-hidden="true">{icon}</span>
            {shell.nav[key]}
          </NavLink>
        ))}
      </nav>

      <CommonsMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSwitchWorkspace={() => setSwitcherOpen(true)}
      />
      <WorkspaceSwitcher
        open={switcherOpen}
        currentSlug={workspaceSlug}
        onClose={() => setSwitcherOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add `members` + `settings` stub routes in `CommonsModule.jsx`.** Inside the `<Route element={<CommonsLayout />}>` block, after `alerts`:

```jsx
        <Route path="members" element={<ComingSoonPage />} />
        <Route path="settings" element={<ComingSoonPage />} />
```

- [ ] **Step 3: Lint + build.** Expected: clean.

- [ ] **Step 4: Browser check (phase 3a).** At `/commons/joz-ve-loz`: ☰ opens the menu; entries reflect your permission (admin sees all); "החלפת מרחב עבודה" opens the switcher (only if 2+ workspaces); members/settings show "בקרוב"; the name is a static label. **Have the user confirm, then commit phase 3a.**

```bash
git add src/commons/CommonsMenu.jsx src/commons/Fab.jsx src/commons/CommonsLayout.jsx src/commons/CommonsModule.jsx src/commons/styles/CommonsLayout.css src/content/commons
git commit -m "feat(commons): hamburger menu + FAB scaffold + static top-bar name"
```

---

## Phase 3b — Screens (שלי / לוח / area)

### Task 5: Repurpose `TaskTree` — `rootId` prop, remove inline add

**Files:**
- Modify: `src/commons/tasks/TaskTree.jsx`

- [ ] **Step 1: Drop the inline-add affordance and accept a `rootId`.** Replace the file with (keeps template/missed rendering, removes `AddNode`/`onAdd`/`adding` and the container ＋ button):

```jsx
// src/commons/tasks/TaskTree.jsx
// Renders a workspace subtree: containers (expand/collapse) and tasks (checkbox, title → view,
// due/recurrence chip, owner avatar). `rootId` selects the subtree root ('root' = top level).
// Creation happens via the FAB / menu, not inline.

import './tasks.css';
import { useState } from 'react';
import { buildRecurrenceSummary } from './recurrence.js';

function formatDue(due, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' })
      .format(new Date(due));
  } catch { return ''; }
}

function NodeRow({ node, depth, ctx }) {
  const { byParent, rosterById, t, locale, expanded, onToggleExpand, onToggleDone, onOpenTask } = ctx;
  const children = byParent.get(node.id) ?? [];
  const pad = { paddingInlineStart: `${depth * 18 + 4}px` };

  if (node.kind === 'container') {
    const isOpen = expanded.has(node.id);
    return (
      <li className="commons-node-li">
        <div className="commons-node commons-node--container" style={pad}>
          <button
            type="button"
            className="commons-node__caret"
            onClick={() => onToggleExpand(node.id)}
            aria-expanded={isOpen}
            aria-label={t.expandAria}
          >
            {isOpen ? '▾' : '▸'}
          </button>
          <span className="commons-node__title">{node.title}</span>
        </div>
        {isOpen && (
          <ul className="commons-node-list">
            {children.map(c => <NodeRow key={c.id} node={c} depth={depth + 1} ctx={ctx} />)}
          </ul>
        )}
      </li>
    );
  }

  const isTemplate = Boolean(node.recurrence);
  const done = node.status === 'done';
  const missed = node.status === 'missed';
  const owner = node.owner_id ? rosterById.get(node.owner_id) : null;
  const rowClass = ['commons-node', 'commons-node--task',
    done && 'is-done', missed && 'is-missed', isTemplate && 'is-template']
    .filter(Boolean).join(' ');

  return (
    <li className="commons-node-li">
      <div className={rowClass} style={pad}>
        {isTemplate ? (
          <span className="commons-node__recurIcon" title={t.recurrence.label} aria-hidden="true">🔁</span>
        ) : (
          <button
            type="button"
            className="commons-check"
            role="checkbox"
            aria-checked={done}
            aria-label={t.toggleDoneAria}
            onClick={() => onToggleDone(node)}
          >
            {done ? '✓' : ''}
          </button>
        )}
        <button
          type="button"
          className="commons-node__title commons-node__title--task"
          onClick={() => onOpenTask(node.id)}
          aria-label={t.openTaskAria}
        >
          {node.title}
        </button>
        {isTemplate ? (
          <span className="commons-chip commons-chip--recur">{buildRecurrenceSummary(node.recurrence, t.recurrence)}</span>
        ) : (
          node.due_date && <span className="commons-chip">{formatDue(node.due_date, locale)}</span>
        )}
        {missed && <span className="commons-chip commons-chip--missed">{t.missed}</span>}
        {owner && (
          <span className="commons-owner" title={owner.display_name ?? ''}>
            {[...(owner.display_name ?? '?')][0]}
          </span>
        )}
      </div>
    </li>
  );
}

export function TaskTree({ tree, rootId = 'root', rosterById, t, locale, onOpenTask }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const roots = tree.byParent.get(rootId) ?? [];

  function onToggleExpand(id) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (roots.length === 0) {
    return (
      <div className="commons-empty">
        <h2>{t.emptyTitle}</h2>
        <p>{t.emptyBody}</p>
      </div>
    );
  }

  const ctx = {
    byParent: tree.byParent, rosterById, t, locale, expanded,
    onToggleExpand, onToggleDone: tree.toggleDone, onOpenTask,
  };

  return (
    <ul className="commons-node-list commons-node-list--root">
      {roots.map(n => <NodeRow key={n.id} node={n} depth={0} ctx={ctx} />)}
    </ul>
  );
}
```

- [ ] **Step 2: Lint + build.** Expected: `DashboardPage.jsx` still imports `TaskTree` with the same props (minus add) — it still builds because the removed props were optional. Build succeeds.

### Task 6: MyTasksPage (שלי)

**Files:**
- Create: `src/commons/pages/MyTasksPage/MyTasksPage.jsx`
- Create: `src/commons/pages/MyTasksPage/myTasks.css`

- [ ] **Step 1: Create `MyTasksPage.jsx`.** Filtered list of my-assigned tasks; pills; rows open the task view; checkbox completes.

```jsx
// src/commons/pages/MyTasksPage/MyTasksPage.jsx
// "שלי" — only the tasks assigned to the signed-in member. Filter pills (today / overdue / all),
// each row opens the read-only task view; the checkbox completes. No tree, no creation here.

import './myTasks.css';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';

function isToday(due) {
  if (!due) return false;
  const d = new Date(due); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
function isOverdue(due) { return due ? new Date(due) < new Date() : false; }
function formatDue(due, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date(due)); }
  catch { return ''; }
}

export function MyTasksPage() {
  const { locale } = useAppContext();
  const { workspace, membership } = useWorkspace();
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const c = shell.myTasks;

  const tree = useWorkspaceTree(workspace?.id);
  const [filter, setFilter] = useState('all');

  const mine = useMemo(() => {
    const meId = membership?.id;
    return tree.nodes.filter(n =>
      n.kind === 'task' && !n.recurrence && n.owner_id === meId &&
      (n.status === 'open' || n.status === 'in_progress' || n.status === 'missed'));
  }, [tree.nodes, membership?.id]);

  const shown = mine.filter(n =>
    filter === 'all' ? true : filter === 'today' ? isToday(n.due_date) : isOverdue(n.due_date));

  const areaName = (parentId) => {
    if (!parentId) return c.noArea;
    return tree.nodes.find(n => n.id === parentId)?.title ?? c.noArea;
  };

  return (
    <section className="commons-myTasks">
      <h1 className="commons-myTasks__title">{c.title}</h1>
      <div className="commons-myTasks__pills" role="group" aria-label={c.title}>
        {[['all', c.filterAll], ['today', c.filterToday], ['overdue', c.filterOverdue]].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={filter === key ? 'commons-pill is-active' : 'commons-pill'}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="commons-myTasks__empty">{c.empty}</p>
      ) : (
        <ul className="commons-myTasks__list">
          {shown.map(n => {
            const done = n.status === 'done';
            return (
              <li key={n.id} className="commons-taskRow">
                <button
                  type="button"
                  className="commons-check"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={shell.tasks.toggleDoneAria}
                  onClick={() => tree.toggleDone(n)}
                >
                  {done ? '✓' : ''}
                </button>
                <button
                  type="button"
                  className="commons-taskRow__main"
                  onClick={() => navigate(`/commons/${workspaceSlug}/task/${n.id}`)}
                  aria-label={c.openTaskAria}
                >
                  <span className="commons-taskRow__title">{n.title}</span>
                  <span className="commons-chip">{areaName(n.parent_id)}</span>
                </button>
                {n.due_date && (
                  <span className={isOverdue(n.due_date) ? 'commons-chip commons-chip--due' : 'commons-chip'}>
                    {formatDue(n.due_date, locale)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Create `myTasks.css`.**

```css
/* src/commons/pages/MyTasksPage/myTasks.css */
.commons-myTasks__title { font-size: 20px; font-weight: 800; margin-bottom: 12px; }
.commons-myTasks__pills { display: flex; gap: 8px; margin-bottom: 14px; }
.commons-pill {
  background: var(--commons-surface-2); border: 0; color: var(--commons-text-dim);
  font: inherit; font-size: 13px; padding: 6px 14px; border-radius: 999px; cursor: pointer;
}
.commons-pill.is-active { background: var(--commons-accent); color: var(--commons-on-accent); font-weight: 700; }
.commons-pill:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
.commons-myTasks__empty { color: var(--commons-text-dim); text-align: center; margin-top: 40px; }
.commons-myTasks__list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.commons-taskRow {
  display: flex; align-items: center; gap: 10px;
  background: var(--commons-surface); border: 1px solid var(--commons-border);
  border-radius: 10px; padding: 10px 12px;
}
.commons-taskRow__main {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px;
  background: none; border: 0; color: var(--commons-text); font: inherit; text-align: start; cursor: pointer;
}
.commons-taskRow__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.commons-taskRow__main:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; border-radius: 6px; }
.commons-chip--due { color: var(--commons-on-accent); background: var(--commons-danger); }
```

- [ ] **Step 3: Lint + build.** Expected: clean (page not yet routed).

### Task 7: BoardPage (לוח) + AreaPage

**Files:**
- Create: `src/commons/pages/BoardPage/BoardPage.jsx`
- Create: `src/commons/pages/BoardPage/board.css`
- Create: `src/commons/pages/AreaPage/AreaPage.jsx`

- [ ] **Step 1: Create `BoardPage.jsx`** — area cards (root containers) with counts + root-level tasks card; FAB for manager/admin.

```jsx
// src/commons/pages/BoardPage/BoardPage.jsx
// "לוח" — the areas board. Root containers render as cards with open/overdue counts; tapping one
// drills into AreaPage. A virtual "root tasks" card collects top-level loose tasks. FAB creates.

import './board.css';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { Fab } from '../../Fab.jsx';

// Count open + overdue tasks anywhere under a node id (recursive over the byParent map).
function countTasks(byParent, parentId) {
  let open = 0, overdue = 0;
  const walk = (pid) => {
    for (const n of byParent.get(pid) ?? []) {
      if (n.kind === 'task' && !n.recurrence && (n.status === 'open' || n.status === 'in_progress')) {
        open += 1;
        if (n.due_date && new Date(n.due_date) < new Date()) overdue += 1;
      }
      if (n.kind === 'container') walk(n.id);
    }
  };
  walk(parentId);
  return { open, overdue };
}

export function BoardPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const b = shell.board;
  const tree = useWorkspaceTree(workspace?.id);
  const canTask = ['admin', 'manager'].includes(permissionLevel);

  const roots = tree.byParent.get('root') ?? [];
  const areas = roots.filter(n => n.kind === 'container');
  const rootTasks = useMemo(
    () => roots.filter(n => n.kind === 'task' && !n.recurrence),
    [roots]);

  const goNew = () => navigate(`/commons/${workspaceSlug}/task/new`);

  return (
    <section className="commons-board">
      {areas.length === 0 && rootTasks.length === 0 ? (
        <p className="commons-board__empty">{b.empty}</p>
      ) : (
        <div className="commons-board__grid">
          {areas.map(area => {
            const { open, overdue } = countTasks(tree.byParent, area.id);
            return (
              <button
                key={area.id}
                type="button"
                className="commons-areaCard"
                onClick={() => navigate(`/commons/${workspaceSlug}/board/${area.id}`)}
                aria-label={b.openAreaAria}
              >
                <span className="commons-areaCard__name">{area.title}</span>
                <span className="commons-areaCard__meta">
                  <span>{open} {b.open}</span>
                  {overdue > 0 && <span className="commons-areaCard__overdue">{overdue} {b.overdue}</span>}
                </span>
              </button>
            );
          })}
          {rootTasks.length > 0 && (
            <button
              type="button"
              className="commons-areaCard commons-areaCard--root"
              onClick={() => navigate(`/commons/${workspaceSlug}/board/root`)}
              aria-label={b.openAreaAria}
            >
              <span className="commons-areaCard__name">{b.rootAreaTitle}</span>
              <span className="commons-areaCard__meta"><span>{rootTasks.length} {b.open}</span></span>
            </button>
          )}
        </div>
      )}
      {canTask && <Fab onClick={goNew} label={shell.fab.newTaskAria} />}
    </section>
  );
}
```

- [ ] **Step 2: Create `board.css`.**

```css
/* src/commons/pages/BoardPage/board.css */
.commons-board__empty { color: var(--commons-text-dim); text-align: center; margin-top: 40px; }
.commons-board__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.commons-areaCard {
  display: flex; flex-direction: column; gap: 8px; text-align: start; cursor: pointer;
  background: var(--commons-surface); color: var(--commons-text);
  border: 1px solid var(--commons-border); border-radius: 14px; padding: 16px 14px; min-height: 92px;
  font: inherit;
  transition: transform 160ms cubic-bezier(.2,.8,.2,1), border-color 160ms ease, background 160ms ease;
}
.commons-areaCard:hover { background: var(--commons-surface-2); }
.commons-areaCard:active { transform: scale(.98); }
.commons-areaCard:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
.commons-areaCard--root { border-style: dashed; }
.commons-areaCard__name { font-weight: 700; font-size: 15px; }
.commons-areaCard__meta { display: flex; gap: 10px; font-size: 12px; color: var(--commons-text-dim); }
.commons-areaCard__overdue { color: var(--commons-danger); }
```

- [ ] **Step 3: Create `AreaPage.jsx`** — one area's subtree via `TaskTree`, with a back link + FAB pre-filling this area.

```jsx
// src/commons/pages/AreaPage/AreaPage.jsx
// One area (container) drilled in from the board: its subtree via TaskTree. Rows open the task view;
// the checkbox completes. FAB pre-fills this area as the new task's parent.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../../data/commons/workspaceQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { TaskTree } from '../../tasks/TaskTree.jsx';
import { Fab } from '../../Fab.jsx';

export function AreaPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const { workspaceSlug, containerId } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const tree = useWorkspaceTree(workspace?.id);
  const canTask = ['admin', 'manager'].includes(permissionLevel);

  const [roster, setRoster] = useState([]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then(r => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);
  const rosterById = useMemo(() => new Map(roster.map(m => [m.id, m])), [roster]);

  const isRoot = containerId === 'root';
  const area = isRoot ? null : tree.nodes.find(n => n.id === containerId);
  const title = isRoot ? shell.board.rootAreaTitle : (area?.title ?? '');
  // The root pseudo-area should list only loose tasks, not the area containers again.
  const rootId = containerId;

  const goNew = () => navigate(`/commons/${workspaceSlug}/task/new${isRoot ? '' : `?parent=${containerId}`}`);

  return (
    <section className="commons-area">
      <button type="button" className="commons-backlink" onClick={() => navigate(`/commons/${workspaceSlug}/board`)}>
        ‹ {shell.board.back}
      </button>
      <h1 className="commons-myTasks__title">{title}</h1>
      <TaskTree
        tree={tree}
        rootId={rootId}
        rosterById={rosterById}
        t={shell.tasks}
        locale={locale}
        onOpenTask={(id) => navigate(`/commons/${workspaceSlug}/task/${id}`)}
      />
      {canTask && <Fab onClick={goNew} label={shell.fab.newTaskAria} />}
    </section>
  );
}
```

Note: the root pseudo-area (`/board/root`) shows top-level nodes, which include the area containers. That's acceptable for v1 (you can still reach loose tasks); if it reads oddly in the browser, filter `TaskTree` roots to tasks-only for the root case in a follow-up.

- [ ] **Step 4: Lint + build.** Expected: clean (pages not yet routed).

### Task 8: Wire the screen routes

**Files:**
- Modify: `src/commons/CommonsModule.jsx`

- [ ] **Step 1: Swap imports + routes.** Replace the `DashboardPage` import with the new pages and update the routed elements:

```jsx
import { MyTasksPage } from './pages/MyTasksPage/MyTasksPage.jsx';
import { BoardPage } from './pages/BoardPage/BoardPage.jsx';
import { AreaPage } from './pages/AreaPage/AreaPage.jsx';
import { ComingSoonPage } from './pages/ComingSoonPage/ComingSoonPage.jsx';
```

And the routes inside `<Route element={<CommonsLayout />}>`:

```jsx
        <Route index element={<MyTasksPage />} />
        <Route path="board" element={<BoardPage />} />
        <Route path="board/:containerId" element={<AreaPage />} />
        <Route path="overview" element={<ComingSoonPage />} />
        <Route path="alerts" element={<ComingSoonPage />} />
        <Route path="members" element={<ComingSoonPage />} />
        <Route path="settings" element={<ComingSoonPage />} />
```

(Leave the `DashboardPage.jsx` file in place for now; it is removed in Task 11.)

- [ ] **Step 2: Lint + build.** Expected: clean. `DashboardPage` is now unimported (still on disk) — that is fine; ESLint flags unused *within* a file, not unreferenced files.

- [ ] **Step 3: Browser check (phase 3b).** `/commons/joz-ve-loz` opens שלי (your assigned tasks only; pills filter). לוח shows area cards with counts → tap drills into an area showing its tasks; the back link returns. Completing a task from שלי or an area works. The FAB shows for admin/manager. **User confirms, then commit phase 3b.**

```bash
git add src/commons/tasks/TaskTree.jsx src/commons/pages/MyTasksPage src/commons/pages/BoardPage src/commons/pages/AreaPage src/commons/CommonsModule.jsx
git commit -m "feat(commons): שלי = my tasks, לוח = areas board + area drill-in"
```

---

## Phase 3c — Create / View / Edit (full-screen)

### Task 9: TaskFormPage (create + edit, task + folder)

**Files:**
- Create: `src/commons/tasks/TaskFormPage.jsx`
- Create: `src/commons/tasks/taskScreens.css`

- [ ] **Step 1: Create `TaskFormPage.jsx`.** Full-screen form; `mode` prop (create|edit); `kind` from `?kind=` (create) or the node (edit); parent from `?parent=` or node. Persists recurrence + next_run via the existing helpers.

```jsx
// src/commons/tasks/TaskFormPage.jsx
// Full-screen create/edit form for a task or folder. Task mode: title, location (parent), description,
// owner, due, recurrence. Folder mode: title + location only. Persists via useWorkspaceTree, then
// returns. Reached from the FAB / menu (create) and the task view's עריכה (edit).

import './taskScreens.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { useWorkspace } from '../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../data/commons/workspaceQueries.js';
import { resolveCommonsShellContent } from '../resolveCommonsShellContent.js';
import { RecurrenceField } from './RecurrenceField.jsx';
import { normalizeRule, computeFirstNextRun } from './recurrence.js';

function toDateInput(due) {
  if (!due) return '';
  const d = new Date(due);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function TaskFormPage({ mode }) {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const { workspaceSlug, nodeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const f = shell.form;
  const tree = useWorkspaceTree(workspace?.id);

  const editing = mode === 'edit';
  const node = editing ? tree.nodes.find(n => n.id === nodeId) : null;
  const kind = editing ? node?.kind ?? 'task' : (params.get('kind') === 'container' ? 'container' : 'task');
  const isFolder = kind === 'container';

  const [title, setTitle] = useState('');
  const [parentId, setParentId] = useState(params.get('parent') ?? '');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [due, setDue] = useState('');
  const [recurrence, setRecurrence] = useState(null);
  const [hydrated, setHydrated] = useState(!editing);
  const [roster, setRoster] = useState([]);

  // Hydrate fields from the node once the tree has loaded (edit mode).
  useEffect(() => {
    if (!editing || hydrated || !node) return;
    setTitle(node.title ?? '');
    setParentId(node.parent_id ?? '');
    setDescription(node.description ?? '');
    setOwnerId(node.owner_id ?? '');
    setDue(toDateInput(node.due_date));
    setRecurrence(node.recurrence ?? null);
    setHydrated(true);
  }, [editing, hydrated, node]);

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then(r => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  const containers = useMemo(() => tree.nodes.filter(n => n.kind === 'container' && n.id !== nodeId), [tree.nodes, nodeId]);

  const heading = isFolder
    ? (editing ? f.editFolderTitle : f.newFolderTitle)
    : (editing ? f.editTaskTitle : f.newTaskTitle);

  async function submit(e) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    const parent = parentId || null;

    if (editing) {
      const patch = { title: name, parent_id: parent };
      if (!isFolder) {
        const dueIso = due ? new Date(`${due}T00:00:00`).toISOString() : null;
        const rule = normalizeRule(recurrence);
        const ruleChanged = JSON.stringify(rule) !== JSON.stringify(normalizeRule(node.recurrence ?? null));
        patch.description = description.trim() || null;
        patch.owner_id = ownerId || null;
        patch.due_date = dueIso;
        patch.recurrence = rule;
        patch.next_run = !rule ? null : (!ruleChanged && node.next_run ? node.next_run : computeFirstNextRun(rule, dueIso));
      }
      await tree.saveTask(nodeId, patch);
    } else if (isFolder) {
      await tree.addNode({ parentId: parent, kind: 'container', title: name });
    } else {
      const dueIso = due ? new Date(`${due}T00:00:00`).toISOString() : null;
      const rule = normalizeRule(recurrence);
      const created = await tree.addNode({ parentId: parent, kind: 'task', title: name });
      await tree.saveTask(created.id, {
        description: description.trim() || null,
        owner_id: ownerId || null,
        due_date: dueIso,
        recurrence: rule,
        next_run: rule ? computeFirstNextRun(rule, dueIso) : null,
      });
    }
    navigate(-1);
  }

  return (
    <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-screen__bar">
        <button type="button" className="commons-screen__back" onClick={() => navigate(-1)}>‹ {f.back}</button>
        <span className="commons-screen__title">{heading}</span>
        <span style={{ width: 40 }} aria-hidden="true" />
      </header>

      <form className="commons-screen__body" onSubmit={submit}>
        <label className="commons-field">
          <span className="commons-field__label">{f.titleLabel}</span>
          <input className="commons-field__input" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </label>

        <label className="commons-field">
          <span className="commons-field__label">{f.location}</span>
          <select className="commons-field__input" value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">{f.locationRoot}</option>
            {containers.map(ct => <option key={ct.id} value={ct.id}>{ct.title}</option>)}
          </select>
        </label>

        {!isFolder && (
          <>
            <label className="commons-field">
              <span className="commons-field__label">{f.description}</span>
              <textarea
                className="commons-field__input commons-field__area" rows={3}
                value={description} placeholder={f.descriptionPlaceholder}
                onChange={e => setDescription(e.target.value)}
              />
            </label>
            <label className="commons-field">
              <span className="commons-field__label">{f.owner}</span>
              <select className="commons-field__input" value={ownerId} onChange={e => setOwnerId(e.target.value)}>
                <option value="">{f.unassigned}</option>
                {roster.map(mb => <option key={mb.id} value={mb.id}>{mb.display_name ?? '—'}</option>)}
              </select>
            </label>
            <label className="commons-field">
              <span className="commons-field__label">{f.due}</span>
              <input type="date" className="commons-field__input" value={due} onChange={e => setDue(e.target.value)} />
            </label>
            <RecurrenceField value={recurrence} rc={shell.tasks.recurrence} onChange={setRecurrence} />
          </>
        )}

        <button type="submit" className="commons-btn commons-btn--primary commons-screen__save" disabled={!title.trim()}>
          {editing ? f.save : f.create}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create `taskScreens.css`** (shared by the form + view screens).

```css
/* src/commons/tasks/taskScreens.css */
.commons-screen { display: flex; flex-direction: column; min-height: 100dvh; }
.commons-screen__bar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 12px; background: var(--commons-surface); border-bottom: 1px solid var(--commons-border);
}
.commons-screen__back {
  background: none; border: 0; color: var(--commons-accent); font: inherit; cursor: pointer; padding: 6px 8px; border-radius: 8px;
}
.commons-screen__back:focus-visible { outline: 2px solid var(--commons-accent); outline-offset: 2px; }
.commons-screen__title { font-weight: 700; font-size: 16px; }
.commons-screen__body { flex: 1; padding: 16px; max-width: 560px; width: 100%; margin-inline: auto; display: flex; flex-direction: column; }
.commons-screen__save { margin-top: 8px; }

/* read-only task view */
.commons-view__title { font-size: 22px; font-weight: 800; line-height: 1.3; margin: 6px 0 10px; }
.commons-view__chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.commons-view__block { background: var(--commons-surface); border: 1px solid var(--commons-border); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.commons-view__label { font-size: 12px; color: var(--commons-text-dim); margin-bottom: 4px; }
.commons-view__desc { white-space: pre-wrap; }
.commons-view__actions { margin-top: auto; display: flex; gap: 10px; padding-top: 16px; }
.commons-view__actions .commons-btn { flex: 1; }
```

- [ ] **Step 3: Lint + build.** Expected: clean (not yet routed).

### Task 10: TaskViewPage (read-only + complete + edit)

**Files:**
- Create: `src/commons/tasks/TaskViewPage.jsx`

- [ ] **Step 1: Create `TaskViewPage.jsx`.**

```jsx
// src/commons/tasks/TaskViewPage.jsx
// Full-screen read-only view of a task: title, status/recurrence/due chips, description, owner.
// Anyone can complete/reopen (status RPC via the hook). עריכה (→ edit form) shows for managers/admins
// on tasks, admins on folders.

import './taskScreens.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { useWorkspace } from '../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../data/commons/workspaceQueries.js';
import { resolveCommonsShellContent } from '../resolveCommonsShellContent.js';
import { buildRecurrenceSummary } from './recurrence.js';

function formatDue(due, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long' }).format(new Date(due)); }
  catch { return ''; }
}

export function TaskViewPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const { workspaceSlug, nodeId } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const v = shell.view;
  const tree = useWorkspaceTree(workspace?.id);
  const node = tree.nodes.find(n => n.id === nodeId);

  const [roster, setRoster] = useState([]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then(r => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);
  const ownerName = useMemo(() => {
    const o = node?.owner_id ? roster.find(m => m.id === node.owner_id) : null;
    return o?.display_name ?? null;
  }, [roster, node?.owner_id]);

  if (!node) {
    return (
      <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <header className="commons-screen__bar">
          <button type="button" className="commons-screen__back" onClick={() => navigate(-1)}>‹ {v.back}</button>
        </header>
      </div>
    );
  }

  const canEdit = node.kind === 'container' ? permissionLevel === 'admin' : ['admin', 'manager'].includes(permissionLevel);
  const done = node.status === 'done';
  const missed = node.status === 'missed';

  return (
    <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-screen__bar">
        <button type="button" className="commons-screen__back" onClick={() => navigate(-1)}>‹ {v.back}</button>
        <span style={{ flex: 1 }} aria-hidden="true" />
        {canEdit && (
          <button type="button" className="commons-screen__back" onClick={() => navigate(`/commons/${workspaceSlug}/task/${nodeId}/edit`)}>
            {v.edit}
          </button>
        )}
      </header>

      <div className="commons-screen__body">
        <h1 className="commons-view__title">{node.title}</h1>
        <div className="commons-view__chips">
          <span className="commons-chip">{done ? v.statusDone : missed ? v.statusMissed : v.statusOpen}</span>
          {node.recurrence && <span className="commons-chip commons-chip--recur">{buildRecurrenceSummary(node.recurrence, shell.tasks.recurrence)}</span>}
          {node.due_date && <span className="commons-chip">{v.due}: {formatDue(node.due_date, locale)}</span>}
        </div>

        <div className="commons-view__block">
          <div className="commons-view__label">{v.owner}</div>
          <div>{ownerName ?? v.unassigned}</div>
        </div>
        <div className="commons-view__block">
          <div className="commons-view__desc">{node.description?.trim() ? node.description : v.noDescription}</div>
        </div>

        {!node.recurrence && (
          <div className="commons-view__actions">
            <button type="button" className="commons-btn commons-btn--primary" onClick={() => tree.toggleDone(node)}>
              {done ? v.reopen : v.markDone}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the `task/*` routes in `CommonsModule.jsx`.** Import the two screens and add the routes *outside* the `CommonsLayout` element block (inside `WorkspaceGate`'s `<Routes>`):

```jsx
import { TaskFormPage } from './tasks/TaskFormPage.jsx';
import { TaskViewPage } from './tasks/TaskViewPage.jsx';
```

```jsx
      <Route path="task/new" element={<TaskFormPage mode="create" />} />
      <Route path="task/:nodeId" element={<TaskViewPage />} />
      <Route path="task/:nodeId/edit" element={<TaskFormPage mode="edit" />} />
```

- [ ] **Step 3: Lint + build.** Expected: clean.

### Task 11: Remove the superseded inline UI

**Files:**
- Delete: `src/commons/tasks/AddNode.jsx`
- Delete: `src/commons/tasks/TaskDetailSheet.jsx`
- Delete: `src/commons/pages/DashboardPage/DashboardPage.jsx`

- [ ] **Step 1: Delete the three files** (now unreferenced — `AddNode` and `TaskDetailSheet` were only used by `DashboardPage` and the old `TaskTree`; `DashboardPage` is replaced by `MyTasksPage`).

- [ ] **Step 2: Grep for stragglers.** Run a search for `AddNode`, `TaskDetailSheet`, `DashboardPage` across `src/commons` — expect zero matches. Fix any import that remains.

- [ ] **Step 3: Lint + build.** Expected: clean.

- [ ] **Step 4: Browser check (phase 3c).** Create a task via the FAB and via the menu; create a folder via the menu (admin); pick a location; set owner/due/recurrence; save → it appears in the right area. Open a task → read-only view; complete it; press עריכה → edit form prefilled → save. **User confirms, then commit phase 3c.**

```bash
git add -A src/commons
git commit -m "feat(commons): full-screen create/view/edit; remove inline add + detail sheet"
```

---

## Phase 3d — DB permission split

### Task 12: RLS split + `set_node_status` RPC

**Files:**
- Create: `supabase/migrations/20260611120000_commons_node_permissions.sql`
- Modify: `src/data/commons/nodeQueries.js`

- [ ] **Step 1: Write the migration.**

```sql
-- supabase/migrations/20260611120000_commons_node_permissions.sql
-- Commons task permissions: writes split by kind (tasks → manager/admin, folders → admin),
-- while any active member may still complete a task via a SECURITY DEFINER status RPC.

drop policy if exists "members write nodes" on commons.nodes;

create policy "managers write tasks" on commons.nodes
  for all
  using (commons.my_permission(workspace_id) in ('admin','manager') and kind = 'task')
  with check (commons.my_permission(workspace_id) in ('admin','manager') and kind = 'task');

create policy "admins write nodes" on commons.nodes
  for all
  using (commons.my_permission(workspace_id) = 'admin')
  with check (commons.my_permission(workspace_id) = 'admin');

-- Members complete/reopen tasks without table-write rights. Status-only; validates membership + kind.
create or replace function commons.set_node_status(node_id uuid, new_status text)
returns commons.nodes
language plpgsql security definer set search_path = commons, public
as $$
declare result commons.nodes;
begin
  if new_status not in ('open','in_progress','done') then
    raise exception 'invalid status: %', new_status;
  end if;
  select * into result from commons.nodes where id = node_id;
  if not found then raise exception 'node not found'; end if;
  if result.kind <> 'task' then raise exception 'not a task'; end if;
  if not commons.is_active_member(result.workspace_id) then raise exception 'not a member'; end if;
  update commons.nodes set status = new_status where id = node_id returning * into result;
  return result;
end;
$$;

grant execute on function commons.set_node_status(uuid, text) to authenticated;
```

- [ ] **Step 2: Apply it.**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && "/c/Program Files/nodejs/node" --env-file=.env.local scripts/run-sql.mjs supabase/migrations/20260611120000_commons_node_permissions.sql`
Expected: a JSON array result (no error).

- [ ] **Step 3: Point `setNodeStatus` at the RPC** in `nodeQueries.js`:

```js
export async function setNodeStatus(id, status) {
  const { data, error } = await commonsDb.rpc('set_node_status', { node_id: id, new_status: status });
  if (error) throw error;
  return data;
}
```

- [ ] **Step 4: Verify the policies + RPC at the DB.**

Run: `... scripts/run-sql.mjs --query "select polname from pg_policies where schemaname='commons' and tablename='nodes' order by polname;"`
Expected: includes `admins write nodes`, `managers write tasks`, `members read nodes` (and not `members write nodes`).

Run: `... scripts/run-sql.mjs --query "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='commons' and proname='set_node_status';"`
Expected: one row.

- [ ] **Step 5: Lint + build.** Expected: clean.

- [ ] **Step 6: Browser check (phase 3d).** As an admin: create/edit tasks + folders, complete tasks — all work. (If a non-admin/manager test account exists: it can complete tasks but the FAB/menu-create and עריכה are hidden, and a direct write is rejected by RLS.) **User confirms, then commit phase 3d.**

```bash
git add supabase/migrations/20260611120000_commons_node_permissions.sql src/data/commons/nodeQueries.js
git commit -m "feat(commons): RLS split (task=manager/admin, folder=admin) + member status RPC"
```

---

## Self-review notes

- **Spec coverage:** shell/menu (Tasks 2,4) · FAB (Task 3) · שלי assigned-only (Task 6) · לוח areas board + drill-in (Task 7) · create/view/edit full-screen (Tasks 9,10) · task/folder permission split + RPC (Task 12) · stubs for members/settings/overview/alerts (Tasks 4,8). Recurrence carry-over: `RecurrenceField` reused in Task 9, `buildRecurrenceSummary` in Tasks 5,10.
- **Carry-over untouched:** `recurrence.js`, the recurrence migration/engine, `useWorkspaceTree` (still exposes `addNode`, `saveTask`, `toggleDone`), `workspaceQueries`.
- **Naming consistency:** `permissionLevel` (from `useWorkspace`), `tree.byParent.get(rootId)`, `tree.addNode({parentId,kind,title})`, `tree.saveTask(id,patch)`, `tree.toggleDone(node)`, `set_node_status(node_id,new_status)` — used identically across tasks.
- **Deferred (own increments):** member management, settings, תמונת מצב snapshot, התראות, claim/approval/checklist/activity.
```
