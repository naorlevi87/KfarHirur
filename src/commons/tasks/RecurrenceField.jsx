// src/commons/tasks/RecurrenceField.jsx
// Controlled editor for a task's recurrence rule: none / daily / weekly / monthly, an interval,
// and (weekly) a day picker. Renders a live Hebrew summary. Emits the rule (or null) via onChange;
// the parent owns persistence and derives next_run. All copy comes from `rc` (content).

import { defaultRule, buildRecurrenceSummary } from './recurrence.js';

const FREQS = ['daily', 'weekly', 'monthly'];
const UNIT_BY_FREQ = { daily: 'day', weekly: 'week', monthly: 'month' };

export function RecurrenceField({ value, rc, onChange }) {
  const rule = value ?? null;
  const interval = Math.max(1, rule?.interval || 1);
  const unit = rule ? rc.units[UNIT_BY_FREQ[rule.freq]] : null;

  function selectFreq(freq) {
    if (!rule) { onChange(defaultRule(freq)); return; }
    const next = { freq, interval };
    if (freq === 'weekly') next.byDay = rule.byDay ?? [];
    onChange(next);
  }

  function setInterval(raw) {
    const n = Math.max(1, Math.min(99, parseInt(raw, 10) || 1));
    onChange({ ...rule, interval: n });
  }

  function toggleDay(d) {
    const set = new Set(rule.byDay ?? []);
    if (set.has(d)) set.delete(d); else set.add(d);
    onChange({ ...rule, byDay: [...set].sort((a, b) => a - b) });
  }

  return (
    <div className="commons-recur">
      <span className="commons-field__label">{rc.label}</span>

      <div className="commons-recur__freqs" role="group" aria-label={rc.label}>
        <button
          type="button"
          className={!rule ? 'is-active' : ''}
          aria-pressed={!rule}
          onClick={() => onChange(null)}
        >
          {rc.none}
        </button>
        {FREQS.map(f => (
          <button
            key={f}
            type="button"
            className={rule?.freq === f ? 'is-active' : ''}
            aria-pressed={rule?.freq === f}
            onClick={() => selectFreq(f)}
          >
            {rc.freq[f]}
          </button>
        ))}
      </div>

      {rule && (
        <>
          <div className="commons-recur__interval">
            <span className="commons-recur__every">{rc.everyLabel}</span>
            <input
              type="number"
              min="1"
              max="99"
              className="commons-recur__intervalInput"
              value={interval}
              aria-label={rc.intervalLabel}
              onChange={e => setInterval(e.target.value)}
            />
            <span className="commons-recur__unit">{interval === 1 ? unit.one : unit.many}</span>
          </div>

          {rule.freq === 'weekly' && (
            <div className="commons-recur__days" role="group" aria-label={rc.pickDays}>
              {rc.dayShort.map((label, d) => {
                const on = (rule.byDay ?? []).includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    className={on ? 'is-active' : ''}
                    aria-pressed={on}
                    onClick={() => toggleDay(d)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <label className="commons-recur__time">
            <span className="commons-field__label">{rc.untilLabel}</span>
            <input
              type="time"
              className="commons-field__input"
              value={rule.time ?? '20:00'}
              onChange={e => onChange({ ...rule, time: e.target.value })}
            />
          </label>

          <p className="commons-recur__summary" aria-live="polite">
            {buildRecurrenceSummary(rule, rc)}
          </p>
        </>
      )}
    </div>
  );
}
