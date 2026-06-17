// src/commons/ConfirmDialog.jsx
// Branded, self-contained confirmation dialog for destructive / irreversible actions and the
// unsaved-changes guard (docs/commons-standards.md §4). Rebuilt from scratch to be immune to the
// click-eating cascade bug:
//
//  - Portals to document.body, so no transformed ancestor (e.g. the task view's Framer motion.div)
//    can become the containing block and shove a position:fixed overlay off-screen.
//  - Uses a private class namespace (.commons-cdlg*) that no other screen redefines. The previous
//    implementation reused .commons-sheetBackdrop, which OverviewPage's overview.css redefines globally
//    as `position:fixed; z-index:60` — that lifted the backdrop ABOVE the dialog card (z 50) so every
//    click, including "מחק", landed on the backdrop's onCancel instead of the confirm button.
//  - The panel is a CHILD of the backdrop; backdrop-dismiss only fires when the click target IS the
//    backdrop itself (e.target === e.currentTarget), never a click that bubbled up from the panel.
//  - Carries its own theme tokens (.commons-cdlg is in the token scope) + dir, so colors and RTL
//    resolve regardless of where in the DOM it is portaled.
//
// Two shapes: the default two-button confirm/cancel, or a stacked list of `actions` (used by the
// nav-guard's Save / Discard / Stay prompt) — same robust overlay either way.
//
// Accessibility (IS 5568 / WCAG AA): role="dialog", aria-modal, focus moves to the primary action on
// open and is restored on close, Escape cancels, focus-visible outlines on every control.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = true,
  actions = null,        // optional [{ label, onClick, variant, disabled }] — renders stacked instead of confirm/cancel
  dismissable = true,    // when false, backdrop/Escape don't close (caller fully drives dismissal)
  dir = 'rtl',
}) {
  const primaryRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    primaryRef.current?.focus();

    function onKey(e) {
      if (e.key === 'Escape' && dismissable && onCancel) { e.preventDefault(); onCancel(); }
    }
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      const el = restoreFocusRef.current;
      if (el && typeof el.focus === 'function') el.focus();
    };
  }, [onCancel, dismissable]);

  function onBackdropClick(e) {
    // Only dismiss when the bare backdrop is clicked — never a click that bubbled from the panel.
    if (dismissable && onCancel && e.target === e.currentTarget) onCancel();
  }

  const stacked = Array.isArray(actions) && actions.length > 0;

  return createPortal(
    <div
      className="commons-cdlg"
      dir={dir}
      role="presentation"
      onMouseDown={onBackdropClick}
    >
      <div
        className="commons-cdlg__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="commons-cdlg__title">{title}</h2>
        {body && <p className="commons-cdlg__body">{body}</p>}

        {stacked ? (
          <div className="commons-cdlg__actions commons-cdlg__actions--stack">
            {actions.map((a, i) => (
              <button
                key={a.label}
                ref={i === 0 ? primaryRef : null}
                type="button"
                disabled={a.disabled}
                className={`commons-cdlg__btn commons-cdlg__btn--${a.variant ?? 'ghost'}`}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="commons-cdlg__actions">
            <button type="button" className="commons-cdlg__btn commons-cdlg__btn--ghost" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              ref={primaryRef}
              type="button"
              className={`commons-cdlg__btn ${destructive ? 'commons-cdlg__btn--danger' : 'commons-cdlg__btn--primary'}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
