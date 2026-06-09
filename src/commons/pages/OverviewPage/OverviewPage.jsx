// src/commons/pages/OverviewPage/OverviewPage.jsx
// "תמונת מצב" — the read-only snapshot any shift manager / helper opens to see the whole restaurant's
// current state: open / overdue / done-today tiles + per-area progress. Computed from the loaded tree
// (no new DB). The activity feed (יומן) is a later increment. FAB creates (manager/admin).

import './overview.css';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { Fab } from '../../Fab.jsx';
import { isToday, isOverdue } from '../../opDay.js';

function relTime(iso, locale) {
  try {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000; // negative = past
    const rtf = new Intl.RelativeTimeFormat(locale === 'he' ? 'he' : 'en', { numeric: 'auto' });
    const abs = Math.abs(diff);
    if (abs < 60) return rtf.format(Math.round(diff), 'second');
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  } catch { return ''; }
}

// Recent "added / completed" events derived from the loaded tree (no activity-log table yet).
function recentActivity(nodes) {
  const events = [];
  for (const n of nodes) {
    if (n.kind !== 'task' || n.recurrence) continue;
    if (!n.template_id) events.push({ id: `${n.id}-a`, type: 'added', title: n.title, at: n.created_at });
    if (n.status === 'done') events.push({ id: `${n.id}-d`, type: 'done', title: n.title, at: n.updated_at });
  }
  return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
}

const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const itemV = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 18 } },
};

export function OverviewPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const s = shell.snapshot;
  const tree = useWorkspaceTree(workspace?.id);
  const canTask = ['admin', 'manager'].includes(permissionLevel);

  if (tree.loading) {
    return (
      <section className="commons-snapshot">
        <CommonsLoading />
      </section>
    );
  }

  // Leaf tasks = the real checkable items (no task-children, not recurrence templates).
  const leaves = tree.nodes.filter(n => n.kind === 'task' && !n.recurrence && !tree.hasChildren(n.id));
  const isOpen = n => n.status === 'open' || n.status === 'in_progress';
  const open = leaves.filter(isOpen).length;
  const overdue = leaves.filter(n => isOpen(n) && isOverdue(n.due_date)).length;
  const doneToday = leaves.filter(n => n.status === 'done' && isToday(n.updated_at)).length;

  const areas = (tree.byParent.get('root') ?? []).filter(n => n.kind === 'container');

  const tiles = [
    { key: 'open', n: open, label: s.open, cls: '' },
    { key: 'overdue', n: overdue, label: s.overdue, cls: 'is-late' },
    { key: 'doneToday', n: doneToday, label: s.doneToday, cls: 'is-done' },
  ];

  return (
    <section className="commons-snapshot">
      <h1 className="commons-snapshot__title">{workspace?.name}</h1>

      <motion.div className="commons-statGrid" variants={gridV} initial="hidden" animate="show">
        {tiles.map(t => (
          <motion.div key={t.key} className={`commons-stat ${t.cls}`} variants={itemV}>
            <span className="commons-stat__n">{t.n}</span>
            <span className="commons-stat__l">{t.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {areas.length > 0 && (
        <>
          <h2 className="commons-snapshot__h">{s.byArea}</h2>
          <motion.ul className="commons-areaList" variants={gridV} initial="hidden" animate="show">
            {areas.map(area => {
              const p = tree.progress(area.id);
              const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <motion.li key={area.id} variants={itemV}>
                  <button
                    type="button"
                    className="commons-areaStat"
                    onClick={() => navigate(`/commons/${workspaceSlug}/board/${area.id}`)}
                  >
                    <div className="commons-areaStat__head">
                      <span className="commons-areaStat__name">{area.title}</span>
                      <span className="commons-areaStat__count">{p.done}/{p.total}</span>
                    </div>
                    <div className="commons-areaStat__bar"><span style={{ width: `${pct}%` }} /></div>
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        </>
      )}

      {(() => {
        const feed = recentActivity(tree.nodes);
        return feed.length > 0 && (
          <>
            <h2 className="commons-snapshot__h">{s.activity}</h2>
            <ul className="commons-feed">
              {feed.map(e => (
                <li key={e.id} className="commons-feedItem">
                  <span className={e.type === 'done' ? 'commons-feedDot is-done' : 'commons-feedDot'} aria-hidden="true" />
                  <span className="commons-feedItem__text">
                    <b>{e.type === 'done' ? s.done : s.added}</b> {e.title}
                  </span>
                  <span className="commons-feedItem__time">{relTime(e.at, locale)}</span>
                </li>
              ))}
            </ul>
          </>
        );
      })()}

      {leaves.length === 0 && areas.length === 0 && <p className="commons-snapshot__empty">{s.empty}</p>}

      {canTask && <Fab onClick={() => navigate(`/commons/${workspaceSlug}/task/new`)} label={shell.fab.newTaskAria} />}
    </section>
  );
}
