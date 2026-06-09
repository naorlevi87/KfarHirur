// src/commons/ConfirmDialog.jsx
// Small centered confirm dialog. Used for the guarded force-complete (lists the open sub-tasks).

import { useEffect, useRef } from 'react';

export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }) {
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
      <div className="commons-confirm" ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="commons-confirm__title">{title}</h2>
        {body && <p className="commons-confirm__body">{body}</p>}
        <div className="commons-confirm__actions">
          <button type="button" className="commons-btn commons-btn--ghost" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="commons-btn commons-btn--primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
