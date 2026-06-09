// src/commons/tasks/TaskTree.jsx
// Renders the workspace node tree: containers (expand/collapse, add child) and tasks
// (checkbox, title → detail, due-date chip, owner avatar). Recursion via NodeRow.

import './tasks.css';
import { useState } from 'react';
import { AddNode } from './AddNode.jsx';

function formatDue(due, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' })
      .format(new Date(due));
  } catch {
    return '';
  }
}

function NodeRow({ node, depth, ctx }) {
  const { byParent, rosterById, t, locale, expanded, onToggleExpand, onToggleDone, onOpenTask, onAdd } = ctx;
  const [adding, setAdding] = useState(false);
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
          <button
            type="button"
            className="commons-node__add"
            onClick={() => { setAdding(true); if (!isOpen) onToggleExpand(node.id); }}
            aria-label={t.addChildAria}
          >
            ＋
          </button>
        </div>
        {isOpen && (
          <ul className="commons-node-list">
            {children.map(c => <NodeRow key={c.id} node={c} depth={depth + 1} ctx={ctx} />)}
            {adding && (
              <li style={{ paddingInlineStart: `${(depth + 1) * 18 + 4}px` }}>
                <AddNode
                  t={t}
                  compact
                  autoFocus
                  onAdd={(kind, title) => { onAdd(node.id, kind, title); setAdding(false); }}
                  onCancel={() => setAdding(false)}
                />
              </li>
            )}
          </ul>
        )}
      </li>
    );
  }

  const done = node.status === 'done';
  const owner = node.owner_id ? rosterById.get(node.owner_id) : null;
  return (
    <li className="commons-node-li">
      <div className={done ? 'commons-node commons-node--task is-done' : 'commons-node commons-node--task'} style={pad}>
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
        <button
          type="button"
          className="commons-node__title commons-node__title--task"
          onClick={() => onOpenTask(node.id)}
          aria-label={t.openTaskAria}
        >
          {node.title}
        </button>
        {node.due_date && <span className="commons-chip">{formatDue(node.due_date, locale)}</span>}
        {owner && (
          <span className="commons-owner" title={owner.display_name ?? ''}>
            {[...(owner.display_name ?? '?')][0]}
          </span>
        )}
      </div>
    </li>
  );
}

export function TaskTree({ tree, rosterById, t, locale, onOpenTask }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const roots = tree.byParent.get('root') ?? [];

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
    byParent: tree.byParent,
    rosterById,
    t,
    locale,
    expanded,
    onToggleExpand,
    onToggleDone: tree.toggleDone,
    onOpenTask,
    onAdd: (parentId, kind, title) => tree.addNode({ parentId, kind, title }),
  };

  return (
    <ul className="commons-node-list commons-node-list--root">
      {roots.map(n => <NodeRow key={n.id} node={n} depth={0} ctx={ctx} />)}
    </ul>
  );
}
