// src/commons/tasks/CompletionSheet.jsx
// The completion moment: a bottom sheet shown when a task is "עם אישור" or when an owner conflict
// fires. Optional note (collapsed by default). Owner-conflict variant swaps copy + the amber notice.
// Returns the typed note (or '') to onConfirm; the caller does the status write + entry creation.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export function CompletionSheet({ v, cancelLabel, title, ownerConflictName, onConfirm, onCancel }) {
  const conflict = !!ownerConflictName;
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="commons-sheetRoot">
      <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={onCancel} />
      <motion.div ref={ref} className="commons-completeSheet" role="dialog" aria-modal="true"
        aria-label={conflict ? v.ownerConflictTitle : v.completeYes}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
        <div className="commons-completeSheet__grab" />
        {conflict ? (
          <>
            <h2 className="commons-completeSheet__q">{v.ownerConflictTitle}</h2>
            <div className="commons-ownWarn">
              <span className="commons-ownWarn__ava">{[...ownerConflictName][0]}</span>
              <span className="commons-ownWarn__txt"><b>{ownerConflictName}</b> {v.ownerConflictBody}</span>
            </div>
          </>
        ) : (
          <>
            <div className="commons-completeSheet__burst" aria-hidden="true">🎉</div>
            <h2 className="commons-completeSheet__q">{v.completeQuestion} "{title}"?</h2>
            <p className="commons-completeSheet__sub">{v.completeCheer}</p>
          </>
        )}

        {noteOpen ? (
          <textarea className="commons-field__input commons-field__area" rows={2} autoFocus
            value={note} placeholder={v.notePlaceholder} onChange={e => setNote(e.target.value)} />
        ) : (
          <button type="button" className="commons-addNoteBtn" onClick={() => setNoteOpen(true)}>
            ➕ {v.addNotePrompt}
          </button>
        )}

        <button type="button"
          className={conflict ? 'commons-btn commons-btn--primary commons-btn--amber' : 'commons-btn commons-btn--primary'}
          onClick={() => onConfirm(note.trim())}>
          {conflict ? v.ownerConflictYes : v.completeYes} ✓
        </button>
        <button type="button" className="commons-btn commons-btn--ghost" onClick={onCancel}>
          {conflict ? `${v.ownerConflictNo} ${ownerConflictName}` : cancelLabel}
        </button>
      </motion.div>
    </div>
  );
}
