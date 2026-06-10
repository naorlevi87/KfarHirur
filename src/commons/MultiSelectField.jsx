// src/commons/MultiSelectField.jsx
// Generic multi-select dropdown (checklist) in the same visual language as the task skills picker,
// but without a "select all / anyone" row — used for choosing which skills a member holds.
// Styles live in CommonsLayout.css (`.commons-skillSelect*`). options: [{ value, label, color }].

import { useEffect, useRef, useState } from 'react';
import { IconCheck } from './icons.jsx';

export function MultiSelectField({ value, onChange, options, placeholder, ariaLabel }) {
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

  const chosen = options.filter(o => value.includes(o.value));
  const summary = chosen.length ? chosen.map(o => o.label).join(', ') : placeholder;

  function toggle(v) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  }

  return (
    <div className="commons-skillSelect" ref={ref}>
      <button type="button" className={`commons-field__input commons-skillSelect__btn${chosen.length ? '' : ' is-placeholder'}`}
        aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen(o => !o)}>
        <span className="commons-skillSelect__summary">{summary}</span>
        <span className="commons-skillSelect__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="commons-skillSelect__menu" role="listbox" aria-multiselectable="true">
          {options.length === 0 && <li className="commons-skillSelect__hint">{placeholder}</li>}
          {options.map(o => {
            const on = value.includes(o.value);
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button type="button" className="commons-skillSelect__opt" onClick={() => toggle(o.value)}>
                  <span className={on ? 'commons-skillSelect__check is-on' : 'commons-skillSelect__check'}>
                    {on && <IconCheck size={14} />}
                  </span>
                  <span className="commons-skillSelect__dot" data-role-color={o.color ?? ''} aria-hidden="true" />
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
