// src/commons/SelectField.jsx
// Shared single-select dropdown styled to match the skills picker (custom dark menu instead of the
// native browser select, which clashes with the dark theme). Functionally a plain select: one pick.
// Styles live in CommonsLayout.css (`.commons-skillSelect*` + `.commons-selectField__radio`).
// options: [{ value, label }]. Used by the task form and the members screen.

import { useEffect, useRef, useState } from 'react';

export function SelectField({ value, onChange, options, placeholder, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const current = options.find(o => o.value === value);

  return (
    <div className="commons-skillSelect" ref={ref}>
      <button type="button" className="commons-field__input commons-skillSelect__btn"
        aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen(o => !o)}>
        <span className="commons-skillSelect__summary">{current ? current.label : placeholder}</span>
        <span className="commons-skillSelect__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="commons-skillSelect__menu" role="listbox">
          {options.map(o => {
            const on = o.value === value;
            return (
              <li key={o.value || '__none'} role="option" aria-selected={on}>
                <button type="button" className="commons-skillSelect__opt"
                  onClick={() => { onChange(o.value); setOpen(false); }}>
                  <span className={on ? 'commons-selectField__radio is-on' : 'commons-selectField__radio'} />
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
