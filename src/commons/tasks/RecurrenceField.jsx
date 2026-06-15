// src/commons/tasks/RecurrenceField.jsx
// Controlled editor for a task's recurrence rule: none / daily / weekly / monthly, an interval,
// and (weekly) a day picker. Renders a live Hebrew summary. Emits the rule (or null) via onChange;
// the parent owns persistence and derives next_run. All copy comes from `rc` (content).

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { defaultRule } from './recurrence.js';

const reveal = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { type: 'spring', stiffness: 320, damping: 30 },
};

const FREQS = ['daily', 'weekly', 'monthly'];
const UNIT_BY_FREQ = { daily: 'day', weekly: 'week', monthly: 'month' };

export function RecurrenceField({ value, rc, onChange }) {
  const rule = value ?? null;
  const interval = Math.max(1, rule?.interval || 1);
  const unit = rule ? rc.units[UNIT_BY_FREQ[rule.freq]] : null;

  // The interval box keeps a local draft so it can be momentarily empty while typing (clearing "1"
  // to type a new number). It only commits a value ≥ 1; an empty/invalid draft snaps back on blur.
  const [draft, setDraft] = useState(String(interval));
  useEffect(() => { setDraft(String(interval)); }, [interval]);

  function selectFreq(freq) {
    if (!rule) { onChange(defaultRule(freq)); return; }
    const next = { freq, interval };
    if (freq === 'weekly') next.byDay = rule.byDay ?? [];
    onChange(next);
  }

  function onIntervalChange(raw) {
    setDraft(raw);
    const n = parseInt(raw, 10);
    if (n >= 1) onChange({ ...rule, interval: Math.min(99, n) });
  }
  function onIntervalBlur() {
    if (!/^\d+$/.test(draft) || parseInt(draft, 10) < 1) setDraft(String(interval));
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

      <AnimatePresence initial={false}>
        {rule && (
          <motion.div key="recur-details" {...reveal}>
            <div className="commons-recur__line">
              <span className="commons-recur__every">{rc.everyLabel}</span>
              <input
                type="number"
                min="1"
                max="99"
                className="commons-recur__intervalInput"
                value={draft}
                aria-label={rc.intervalLabel}
                onChange={e => onIntervalChange(e.target.value)}
                onBlur={onIntervalBlur}
              />
              <span className="commons-recur__unit">{interval === 1 ? unit.one : unit.many}</span>
              <span className="commons-recur__until">{rc.untilLabel}</span>
              <input
                type="time"
                className="commons-field__input commons-recur__timeInput"
                value={rule.time ?? '20:00'}
                aria-label={rc.untilLabel}
                onChange={e => onChange({ ...rule, time: e.target.value })}
              />
              {/* A time before the 08:00 op-day boundary lands the next calendar morning. */}
              {parseInt((rule.time ?? '20:00').slice(0, 2), 10) < 8 && (
                <span className="commons-recur__nextDay">
                  <span className="commons-recur__nextDayArrow" aria-hidden="true">↪</span>
                  {rc.nextDay}
                </span>
              )}
            </div>

            <AnimatePresence initial={false}>
              {rule.freq === 'weekly' && (
                <motion.div key="weekdays" className="commons-recur__days" role="group" aria-label={rc.pickDays} {...reveal}>
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
