// src/commons/tasks/TaskDetailSheet.jsx
// Bottom-sheet editor for a task: title, description, owner (from roster), due date.
// Save patches the node; delete removes it. RTL, focus-trapped, Escape closes.

import { useEffect, useRef, useState } from 'react';

function toDateInput(due) {
  if (!due) return '';
  const d = new Date(due);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function TaskDetailSheet({ task, roster, t, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [ownerId, setOwnerId] = useState(task.owner_id ?? '');
  const [due, setDue] = useState(toDateInput(task.due_date));
  const ref = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('input, textarea, select')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function save(e) {
    e.preventDefault();
    onSave({
      title: title.trim() || task.title,
      description: description.trim() || null,
      owner_id: ownerId || null,
      due_date: due ? new Date(`${due}T00:00:00`).toISOString() : null,
    });
    onClose();
  }

  return (
    <div className="commons-sheetRoot">
      <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={onClose} />
      <form
        className="commons-sheet commons-sheet--form"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t.detailTitle}
        onSubmit={save}
      >
        <div className="commons-sheet__grip" aria-hidden="true" />
        <h2 className="commons-sheet__title">{t.detailTitle}</h2>

        <label className="commons-field">
          <span className="commons-field__label">{t.titleLabel}</span>
          <input className="commons-field__input" value={title} onChange={e => setTitle(e.target.value)} />
        </label>

        <label className="commons-field">
          <span className="commons-field__label">{t.description}</span>
          <textarea
            className="commons-field__input commons-field__area"
            rows={3}
            value={description}
            placeholder={t.descriptionPlaceholder}
            onChange={e => setDescription(e.target.value)}
          />
        </label>

        <label className="commons-field">
          <span className="commons-field__label">{t.assignee}</span>
          <select className="commons-field__input" value={ownerId} onChange={e => setOwnerId(e.target.value)}>
            <option value="">{t.unassigned}</option>
            {roster.map(m => <option key={m.id} value={m.id}>{m.display_name ?? '—'}</option>)}
          </select>
        </label>

        <label className="commons-field">
          <span className="commons-field__label">{t.dueDate}</span>
          <input type="date" className="commons-field__input" value={due} onChange={e => setDue(e.target.value)} />
        </label>

        <div className="commons-sheet__actions">
          <button type="button" className="commons-btn commons-btn--danger" onClick={onDelete}>{t.delete}</button>
          <button type="submit" className="commons-btn commons-btn--primary">{t.save}</button>
        </div>
      </form>
    </div>
  );
}
