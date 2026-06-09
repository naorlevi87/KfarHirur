// src/commons/tasks/AddNode.jsx
// Inline composer for a new node (task or container). Used at the workspace root and,
// in compact form, under a container. Content comes via `t`; emits onAdd(kind, title).

import { useState } from 'react';

export function AddNode({ t, onAdd, onCancel, compact = false, autoFocus = false }) {
  const [kind, setKind] = useState('task');
  const [title, setTitle] = useState('');

  function submit(e) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    onAdd(kind, value);
    setTitle('');
  }

  return (
    <form className={compact ? 'commons-addNode commons-addNode--compact' : 'commons-addNode'} onSubmit={submit}>
      <div className="commons-addNode__kinds" role="group">
        <button type="button" className={kind === 'task' ? 'is-active' : ''} onClick={() => setKind('task')}>
          {t.addTask}
        </button>
        <button type="button" className={kind === 'container' ? 'is-active' : ''} onClick={() => setKind('container')}>
          {t.addContainer}
        </button>
      </div>
      <div className="commons-addNode__row">
        <input
          className="commons-addNode__input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={kind === 'task' ? t.newTaskPlaceholder : t.newContainerPlaceholder}
          aria-label={kind === 'task' ? t.addTask : t.addContainer}
          autoFocus={autoFocus}
        />
        <button type="submit" className="commons-addNode__submit" disabled={!title.trim()}>{t.add}</button>
        {onCancel && (
          <button type="button" className="commons-addNode__cancel" onClick={onCancel}>{t.cancel}</button>
        )}
      </div>
    </form>
  );
}
