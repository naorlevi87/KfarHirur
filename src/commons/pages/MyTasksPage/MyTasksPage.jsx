// src/commons/pages/MyTasksPage/MyTasksPage.jsx
// "שלי" — only the tasks assigned to the signed-in member. Filter pills (today / overdue / all),
// each row opens the read-only task view; the checkbox completes. No tree, no creation here.

import './myTasks.css';
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { IconCheck, IconMine } from '../../icons.jsx';
import { isToday, isOverdue } from '../../opDay.js';

function formatDue(due, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date(due)); }
  catch { return ''; }
}

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const rowV = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 140, damping: 18 } },
};

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
    const assigned = new Set(tree.nodes.filter(n => n.kind === 'task' && n.owner_id === meId).map(n => n.id));
    const ancestorAssigned = (n) => {
      let p = n.parent_id;
      while (p) {
        const node = tree.nodes.find(x => x.id === p);
        if (!node) break;
        if (assigned.has(node.id)) return true;
        p = node.parent_id;
      }
      return false;
    };
    return tree.nodes.filter(n =>
      n.kind === 'task' && !n.recurrence && n.owner_id === meId && !ancestorAssigned(n) &&
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

      {tree.loading ? (
        <CommonsLoading />
      ) : shown.length === 0 ? (
        <div className="commons-myTasks__empty">
          <span className="commons-myTasks__emptyIcon"><IconMine size={28} /></span>
          <p>{c.empty}</p>
        </div>
      ) : (
        <motion.ul className="commons-myTasks__list" variants={listV} initial="hidden" animate="show">
          {shown.map(n => {
            const done = n.status === 'done';
            const overdue = isOverdue(n.due_date);
            return (
              <motion.li key={n.id} className="commons-taskRow" variants={rowV} layout>
                {tree.hasChildren(n.id) ? (
                  <span className="commons-chip commons-chip--progress">
                    {(() => { const p = tree.progress(n.id); return `${p.done}/${p.total}`; })()}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={done ? 'commons-check is-on' : 'commons-check'}
                    role="checkbox"
                    aria-checked={done}
                    aria-label={shell.tasks.toggleDoneAria}
                    onClick={() => tree.toggleDone(n)}
                  >
                    {done && <IconCheck size={14} />}
                  </button>
                )}
                <button
                  type="button"
                  className="commons-taskRow__main"
                  onClick={() => navigate(`/commons/${workspaceSlug}/task/${n.id}`)}
                  aria-label={c.openTaskAria}
                >
                  <span className="commons-taskRow__title">{n.title}</span>
                  <span className="commons-taskRow__area">{areaName(n.parent_id)}</span>
                </button>
                {n.status === 'missed' && <span className="commons-chip commons-chip--missed">{shell.tasks.missed}</span>}
                {n.due_date && (
                  <span className={overdue ? 'commons-chip commons-chip--due' : 'commons-chip'}>
                    {formatDue(n.due_date, locale)}
                  </span>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </section>
  );
}
