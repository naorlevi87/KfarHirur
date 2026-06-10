// src/commons/tasks/SkillSelect.jsx
// Skills picker for the task form: a dropdown checklist with a standard tristate "select all".
// Row 0 = "כל עובד" (select-all): checked when every skill is, indeterminate (half) when some are,
// empty when none. Clicking it toggles all on/off. Each skill row toggles only itself.
// `value` is the selected skill ids; the form persists all-selected OR none as "anyone" (empty).

import { useEffect, useRef, useState } from 'react';
import { IconCheck } from '../icons.jsx';

export function SkillSelect({ roles, value, onChange, anyoneLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const allChecked = roles.length > 0 && value.length === roles.length;
  const noneChecked = value.length === 0;
  const indeterminate = !allChecked && !noneChecked;

  useEffect(() => {
    if (!open) return;
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const summary = (allChecked || noneChecked)
    ? anyoneLabel
    : roles.filter(r => value.includes(r.id)).map(r => r.name).join(', ');

  function toggle(id) {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  }
  function toggleAll() {
    onChange(allChecked ? [] : roles.map(r => r.id));
  }

  return (
    <div className="commons-skillSelect" ref={ref}>
      <button type="button" className="commons-field__input commons-skillSelect__btn"
        aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="commons-skillSelect__summary">{summary}</span>
        <span className="commons-skillSelect__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="commons-skillSelect__menu" role="listbox" aria-multiselectable="true">
          <li role="option" aria-selected={allChecked}>
            <button type="button" className="commons-skillSelect__opt" onClick={toggleAll}>
              <span className={`commons-skillSelect__check${allChecked ? ' is-on' : indeterminate ? ' is-mixed' : ''}`}>
                {allChecked ? <IconCheck size={14} /> : indeterminate ? <span className="commons-skillSelect__dash" /> : null}
              </span>
              {anyoneLabel}
            </button>
          </li>
          {roles.map(role => {
            const on = value.includes(role.id);
            return (
              <li key={role.id} role="option" aria-selected={on}>
                <button type="button" className="commons-skillSelect__opt" onClick={() => toggle(role.id)}>
                  <span className={on ? 'commons-skillSelect__check is-on' : 'commons-skillSelect__check'}>
                    {on && <IconCheck size={14} />}
                  </span>
                  <span className="commons-skillSelect__dot" data-role-color={role.color ?? ''} aria-hidden="true" />
                  {role.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
