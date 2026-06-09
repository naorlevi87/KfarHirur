// src/commons/tasks/TaskTree.jsx
// Renders a workspace subtree: containers (expand/collapse) and tasks (checkbox, title → view,
// due/recurrence chip, owner avatar). `rootId` selects the subtree root ('root' = top level).
// Creation happens via the FAB / menu, not inline.

import './tasks.css';
import { useState } from 'react';
import { buildRecurrenceSummary } from './recurrence.js';
import { IconCheck, IconRepeat } from '../icons.jsx';
import raiseHand from '../../assets/images/raise-hand.svg';

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
  const parentTask = !isTemplate && ctx.hasChildren?.(node.id);
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
          <span className="commons-node__recurIcon" title={t.recurrence.label} aria-hidden="true"><IconRepeat size={16} /></span>
        ) : parentTask ? (
          <span className="commons-chip commons-chip--progress">
            {(() => { const p = ctx.progress(node.id); return `${p.done}/${p.total}`; })()}
          </span>
        ) : (
          <button
            type="button"
            className={done ? 'commons-check is-on' : 'commons-check'}
            role="checkbox"
            aria-checked={done}
            aria-label={t.toggleDoneAria}
            onClick={() => onToggleDone(node)}
          >
            {done && <IconCheck size={14} />}
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
          !parentTask && node.due_date && <span className="commons-chip">{formatDue(node.due_date, locale)}</span>
        )}
        {missed && <span className="commons-chip commons-chip--missed">{t.missed}</span>}
        {owner ? (
          <span className="commons-owner" title={owner.display_name ?? ''}>
            {[...(owner.display_name ?? '?')][0]}
          </span>
        ) : (
          !isTemplate && (
            <button type="button" className="commons-claim" aria-label={t.claimAria} onClick={() => ctx.onClaim(node.id)}>
              <img src={raiseHand} alt="" className="commons-claim__icon" /> {t.claim}
            </button>
          )
        )}
      </div>
    </li>
  );
}

export function TaskTree({ tree, rootId = 'root', rootKinds, rosterById, t, locale, onOpenTask }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const all = tree.byParent.get(rootId) ?? [];
  const roots = rootKinds ? all.filter(n => rootKinds.includes(n.kind)) : all;

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
    onToggleExpand, onToggleDone: tree.toggleDone, onOpenTask, onClaim: tree.claim,
    hasChildren: tree.hasChildren, progress: tree.progress,
  };

  return (
    <ul className="commons-node-list commons-node-list--root">
      {roots.map(n => <NodeRow key={n.id} node={n} depth={0} ctx={ctx} />)}
    </ul>
  );
}
