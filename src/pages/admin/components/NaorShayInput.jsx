// src/pages/admin/components/NaorShayInput.jsx
// Reusable input with naor/shay toggle.
// When isDifferent=false: single input writes to both.
// When isDifferent=true: two tabs — נאור / שי.

import { useState } from 'react';
import './NaorShayInput.css';

export function NaorShayInput({ label, value, onChange, isDifferent, onToggleDifferent, type = 'text', multiline = false }) {
  const [activeTab, setActiveTab] = useState('naor');

  function handleSharedChange(e) {
    onChange({ naor: e.target.value, shay: e.target.value });
  }

  function handleTabChange(mode, e) {
    onChange({ ...value, [mode]: e.target.value });
  }

  const InputTag = multiline ? 'textarea' : 'input';
  const inputProps = multiline ? {} : { type };

  return (
    <div className="nsi">
      <div className="nsi__header">
        <label className="nsi__label">{label}</label>
        <button
          type="button"
          className={`nsi__toggle ${isDifferent ? 'nsi__toggle--on' : ''}`}
          onClick={onToggleDifferent}
          title="שונה בין נאור/שי"
        >
          {isDifferent ? 'שונה ✓' : 'זהה'}
        </button>
      </div>

      {isDifferent ? (
        <div className="nsi__split">
          <div className="nsi__tabs">
            <button
              type="button"
              className={`nsi__tab ${activeTab === 'naor' ? 'nsi__tab--active' : ''}`}
              onClick={() => setActiveTab('naor')}
            >נאור</button>
            <button
              type="button"
              className={`nsi__tab ${activeTab === 'shay' ? 'nsi__tab--active' : ''}`}
              onClick={() => setActiveTab('shay')}
            >שי</button>
          </div>
          <InputTag
            className="nsi__input"
            {...inputProps}
            value={value[activeTab] ?? ''}
            onChange={e => handleTabChange(activeTab, e)}
          />
        </div>
      ) : (
        <InputTag
          className="nsi__input"
          {...inputProps}
          value={value.naor ?? ''}
          onChange={handleSharedChange}
        />
      )}
    </div>
  );
}
