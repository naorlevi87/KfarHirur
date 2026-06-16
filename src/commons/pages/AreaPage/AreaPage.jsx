// src/commons/pages/AreaPage/AreaPage.jsx
// One area (container) drilled in from the board — the operational surface. Four bands:
//   מה היום   — each routine's today-run as a row (open → its checklist) + one-off tasks due today
//   מה היה    — past runs + overdue/done one-offs
//   מה יהיה   — upcoming runs + future one-offs
//   משימות קבועות · הגדרות (managers) — the definition tree (routines, folders) via TaskTree
// Instances (runs) live here in the temporal bands; a task screen shows only its own sub-tasks.

import './area.css';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../../data/commons/workspaceQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { TaskTree } from '../../tasks/TaskTree.jsx';
import { Fab } from '../../Fab.jsx';
import { IconChevronStart, IconCheck } from '../../icons.jsx';
import { currentOpDayStart, isToday, isOverdue } from '../../opDay.js';
import { nextOccurrenceWithin } from '../../tasks/recurrence.js';

function dateStr(d) {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function dayLabel(ymd, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${ymd}T08:00:00`)); }
  catch { return ymd; }
}
function timeOf(due, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(due)); }
  catch { return ''; }
}
function dayMonth(due, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date(due)); }
  catch { return ''; }
}

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const rowV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 18 } } };

export function AreaPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel, roles: myRoles } = useWorkspace();
  const { workspaceSlug, containerId } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const v = shell.view;
  const rc = shell.tasks.recurrence;
  const tree = useWorkspaceTree(workspace?.id);
  const canTask = ['admin', 'manager'].includes(permissionLevel);

  // קבועות = recurring routines (+ folders + their order definitions) only — never standalone one-offs.
  const settingsFilter = (n) => {
    if (n.kind === 'container' || n.recurrence) return true;
    let c = tree.nodes.find(x => x.id === n.parent_id);
    while (c) { if (c.recurrence) return true; c = tree.nodes.find(x => x.id === c.parent_id); }
    return false;
  };

  const [roster, setRoster] = useState([]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then(r => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);
  const rosterById = useMemo(() => new Map(roster.map(m => [m.id, m])), [roster]);
  const myRoleIds = useMemo(() => new Set((myRoles ?? []).map(r => r.id)), [myRoles]);

  const isRoot = containerId === 'root';
  const area = isRoot ? null : tree.nodes.find(n => n.id === containerId);
  const title = isRoot ? shell.board.rootAreaTitle : (area?.title ?? '');

  // Split the area's nodes into temporal bands. Run roots (occurrence_date set, parent === template)
  // and dated one-off tasks both flow by op-day; the definition tree stays in הגדרות.
  const bands = useMemo(() => {
    const opDayStr = dateStr(currentOpDayStart());
    // definition descendants of this area
    const inArea = new Set();
    const collect = (id) => {
      for (const c of tree.byParent.get(id) ?? []) {
        if (c.occurrence_date) continue;
        inArea.add(c.id);
        collect(c.id);
      }
    };
    collect(containerId);

    const runRoots = tree.nodes.filter(n =>
      n.occurrence_date && n.template_id && n.parent_id === n.template_id && inArea.has(n.parent_id));
    // One-off leaf tasks of this area (excluding routine orders, which have a recurring ancestor).
    const hasRecurringAncestor = (n) => {
      let c = tree.nodes.find(x => x.id === n.parent_id);
      while (c) { if (c.recurrence) return true; c = tree.nodes.find(x => x.id === c.parent_id); }
      return false;
    };
    const oneOffs = tree.nodes.filter(n =>
      n.kind === 'task' && !n.recurrence && !n.occurrence_date && inArea.has(n.id)
      && !hasRecurringAncestor(n)
      && !(tree.byParent.get(n.id) ?? []).some(c => c.kind === 'task'));

    const todayRuns = runRoots.filter(r => r.occurrence_date === opDayStr);
    const pastRuns = runRoots.filter(r => r.occurrence_date < opDayStr).sort((a, b) => b.occurrence_date.localeCompare(a.occurrence_date));
    const futureRuns = runRoots.filter(r => r.occurrence_date > opDayStr).sort((a, b) => a.occurrence_date.localeCompare(b.occurrence_date));
    // A start date in the future parks the task in "future"; otherwise it's actionable now ("today"),
    // with its deadline (due_date) shown as a chip. Done → past.
    const startsFuture = (t) => t.start_date && t.start_date > opDayStr;
    const todayOff = oneOffs.filter(t => t.status !== 'done' && !startsFuture(t));
    const futureOff = oneOffs.filter(t => t.status !== 'done' && startsFuture(t));
    const pastOff = oneOffs.filter(t => t.status === 'done');

    // Routines living in this area (definitions with a recurrence) — drive the "מה יהיה" preview.
    const routines = [...inArea].map(id => tree.nodes.find(n => n.id === id)).filter(n => n && n.recurrence);

    return { todayRuns, pastRuns, futureRuns, todayOff, pastOff, futureOff, routines };
  }, [tree.byParent, tree.nodes, containerId]);

  // מה יהיה: each routine's NEXT occurrence, only within the next 3 days, top-level (no sub-tasks).
  // Derived from the schedule so it shows even before the run is generated; if the run is already
  // materialized for that day, the row opens it (editable), otherwise it opens the routine.
  const futureRows = useMemo(() => {
    const opDay = currentOpDayStart();
    const maxStr = dateStr(new Date(opDay.getFullYear(), opDay.getMonth(), opDay.getDate() + 3));
    const entries = [];
    for (const r of bands.routines) {
      const next = nextOccurrenceWithin(r.recurrence, opDay, 3);
      if (!next) continue;
      const ds = dateStr(next);
      const run = bands.futureRuns.find(x => x.template_id === r.id && x.occurrence_date === ds);
      entries.push({ date: ds, kind: 'routine', id: r.id, openId: run ? run.id : r.id, title: r.title });
    }
    for (const t of bands.futureOff) {
      if (t.start_date && t.start_date <= maxStr) entries.push({ date: t.start_date, kind: 'off', node: t });
    }
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [bands.routines, bands.futureRuns, bands.futureOff]);

  const open = (id) => navigate(`/commons/${workspaceSlug}/task/${id}`);
  const goNew = () => navigate(`/commons/${workspaceSlug}/task/new${isRoot ? '' : `?parent=${containerId}`}`);

  // Uniform band row: [checkbox/circle] · name · [done/total for parents] · [time-or-date chip].
  // A leaf toggles done inline; a parent (a run, or a task with sub-items) opens to complete there.
  const timeChip = (n) => {
    if (!n.due_date) return null;
    const overdue = (n.status === 'open' || n.status === 'in_progress') && isOverdue(n.due_date);
    return (
      <span className={overdue ? 'commons-chip commons-chip--due' : 'commons-chip'}>
        {rc.until} {isToday(n.due_date) ? timeOf(n.due_date, locale) : dayMonth(n.due_date, locale)}
      </span>
    );
  };
  const dateChip = (ds) => <span className="commons-chip">{dayLabel(ds, locale)}</span>;

  const bandRow = (n, trailing) => {
    const kids = tree.hasChildren(n.id);
    const p = kids ? tree.progress(n.id) : null;
    const done = kids ? (p.total > 0 && p.done === p.total) : n.status === 'done';
    const missed = n.status === 'missed';
    return (
      <motion.li key={n.id} className="commons-bandRow" variants={rowV}>
        {kids ? (
          <button type="button" className={done ? 'commons-check is-on' : 'commons-check'}
            aria-label={shell.tasks.openTaskAria} onClick={() => open(n.id)}>
            {done && <IconCheck size={14} />}
          </button>
        ) : (
          <button type="button" className={`commons-check${done ? ' is-on' : ''}${missed ? ' commons-check--missed' : ''}`}
            role="checkbox" aria-checked={done} aria-label={shell.tasks.toggleDoneAria} onClick={() => tree.toggleDone(n)}>
            {done && <IconCheck size={14} />}
          </button>
        )}
        <button type="button" className={`commons-bandRow__title${done && !kids ? ' is-done' : ''}`} onClick={() => open(n.id)}>{n.title}</button>
        {kids && <span className="commons-chip commons-chip--progress">{p.done}/{p.total}</span>}
        {trailing}
      </motion.li>
    );
  };
  // Future preview (next occurrence, not yet materialized): leading empty circle · name · date.
  const previewRow = (e) => (
    <motion.li key={e.id} className="commons-bandRow" variants={rowV}>
      <span className="commons-check" aria-hidden="true" />
      <button type="button" className="commons-bandRow__title" onClick={() => open(e.openId)}>{e.title}</button>
      {dateChip(e.date)}
    </motion.li>
  );

  const renderBand = (label, empty, isEmpty, rows) => (
    <section className="commons-band">
      <h2 className="commons-band__label">{label}</h2>
      {isEmpty ? <p className="commons-band__empty">{empty}</p> : (
        <motion.ul className="commons-band__list" variants={listV} initial="hidden" animate="show">{rows}</motion.ul>
      )}
    </section>
  );

  return (
    <section className="commons-area">
      <header className="commons-area__head">
        <button type="button" className="commons-area__back" onClick={() => navigate(`/commons/${workspaceSlug}/board`)} aria-label={shell.board.back}>
          <IconChevronStart size={20} />
        </button>
        <h1 className="commons-area__title">{title}</h1>
      </header>

      {tree.loading ? (
        <CommonsLoading />
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
          {renderBand(v.bandToday, v.bandTodayEmpty,
            bands.todayRuns.length === 0 && bands.todayOff.length === 0,
            [...bands.todayRuns.map(r => bandRow(r, timeChip(r))), ...bands.todayOff.map(t => bandRow(t, timeChip(t)))])}

          {renderBand(v.bandPast, v.noPast,
            bands.pastRuns.length === 0 && bands.pastOff.length === 0,
            [...bands.pastRuns.map(r => bandRow(r, dateChip(r.occurrence_date))), ...bands.pastOff.map(t => bandRow(t, timeChip(t)))])}

          <section className="commons-band">
            <h2 className="commons-band__label">{v.bandFuture}</h2>
            {futureRows.length === 0 ? (
              <p className="commons-band__empty">{v.noFuture}</p>
            ) : (
              <motion.ul className="commons-band__list" variants={listV} initial="hidden" animate="show">
                {futureRows.map(e => (e.kind === 'routine' ? previewRow(e) : bandRow(e.node, dateChip(e.date))))}
              </motion.ul>
            )}
          </section>

          {canTask && (
            <section className="commons-band">
              <h2 className="commons-band__label">{v.bandDefs}</h2>
              <TaskTree
                tree={tree}
                rootId={containerId}
                rootKinds={isRoot ? ['task'] : undefined}
                filter={settingsFilter}
                rosterById={rosterById}
                myRoleIds={myRoleIds}
                t={shell.tasks}
                locale={locale}
                onOpenTask={open}
              />
            </section>
          )}
        </motion.div>
      )}

      {canTask && <Fab onClick={goNew} label={shell.fab.newTaskAria} />}
    </section>
  );
}
