// src/pages/admin/components/NaorShayInput.jsx
// Reusable input with naor/shay toggle.
// When isDifferent=false: single input writes to both.
// When isDifferent=true: two columns side by side — נאור / שי.

import './NaorShayInput.css';

export function NaorShayInput({ label, value, onChange, isDifferent, onToggleDifferent, type = 'text', multiline = false }) {
  const InputTag = multiline ? 'textarea' : 'input';
  const inputProps = multiline ? {} : { type };

  return (
    <div className="nsi">
      <div className="nsi__header">
        <label className="nsi__label">{label}</label>
        <select
          className="nsi__split-select"
          value={isDifferent ? 'split' : 'shared'}
          onChange={e => { if ((e.target.value === 'split') !== isDifferent) onToggleDifferent(); }}
          aria-label="מצב עריכה"
        >
          <option value="shared">משותף לשניהם</option>
          <option value="split">נאור / שי בנפרד</option>
        </select>
      </div>

      {isDifferent ? (
        <div className="nsi__cols">
          {['naor', 'shay'].map(mode => (
            <div key={mode}>
              <div className="nsi__col-label">{mode === 'naor' ? 'נאור' : 'שי'}</div>
              <InputTag
                className="nsi__input"
                {...inputProps}
                value={value[mode] ?? ''}
                onChange={e => onChange({ ...value, [mode]: e.target.value })}
              />
            </div>
          ))}
        </div>
      ) : (
        <InputTag
          className="nsi__input"
          {...inputProps}
          value={value.naor ?? ''}
          onChange={e => onChange({ naor: e.target.value, shay: e.target.value })}
        />
      )}
    </div>
  );
}
