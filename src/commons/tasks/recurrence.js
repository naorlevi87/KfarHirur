// src/commons/tasks/recurrence.js
// Pure helpers for the recurrence rule { freq, interval, byDay?, time }: a default rule per freq,
// the Hebrew summary (built from content tokens, no hardcoded copy), and the first next_run.
// `time` ("HH:MM") is the "עד שעה" deadline each generated occurrence inherits.
// Shared by RecurrenceField, TaskFormPage, and the task views so the logic lives in one place.

const UNIT_BY_FREQ = { daily: 'day', weekly: 'week', monthly: 'month' };
const DEFAULT_TIME = '20:00';

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// The weekday universe a routine runs on (mirror of SQL commons.routine_days).
export function routineDays(rule) {
  if (rule?.freq === 'weekly' && rule.byDay?.length) return [...rule.byDay].sort((a, b) => a - b);
  return ALL_DAYS;
}

// Weekdays a node participates on: the routine root's days intersected with every day_mask up the
// chain (mirror of SQL commons.effective_days). `nodes` is the flat node list; returns all 7 if the
// node is not under a routine. Used by the editor to constrain a child's day picker to its parent's days.
export function effectiveDaysFor(nodes, nodeId) {
  const chain = [];
  let cur = nodes.find(n => n.id === nodeId);
  let rootRule = null;
  while (cur) {
    chain.push(cur);
    if (cur.recurrence) { rootRule = cur.recurrence; break; }
    cur = nodes.find(n => n.id === cur.parent_id);
  }
  if (!rootRule) return ALL_DAYS;
  let days = routineDays(rootRule);
  for (const n of chain) {
    if (n.day_mask?.length) days = days.filter(d => n.day_mask.includes(d));
  }
  return days;
}

export function defaultRule(freq) {
  const rule = { freq, interval: 1, time: DEFAULT_TIME };
  if (freq === 'weekly') rule.byDay = [];
  return rule;
}

// Drop an empty weekly day list so a plain "every N weeks" rule stays clean; always keep a time.
export function normalizeRule(rule) {
  if (!rule) return null;
  const out = { freq: rule.freq, interval: Math.max(1, rule.interval || 1), time: rule.time || DEFAULT_TIME };
  if (rule.freq === 'weekly' && rule.byDay?.length) {
    out.byDay = [...rule.byDay].sort((a, b) => a - b);
  }
  return out;
}

// Friendly Hebrew summary, e.g. "כל יום · עד 20:00", "כל שבוע בא׳, ג׳ · עד 23:00".
export function buildRecurrenceSummary(rule, rc) {
  if (!rule) return rc.none;
  const n = Math.max(1, rule.interval || 1);
  const unit = rc.units[UNIT_BY_FREQ[rule.freq]];
  let text;
  if (n === 1) text = `${rc.everyLabel} ${unit.one}`;
  else if (n === 2) text = `${rc.everyLabel} ${unit.two}`;
  else text = `${rc.everyLabel} ${n} ${unit.many}`;

  if (rule.freq === 'weekly' && rule.byDay?.length) {
    const labels = [...rule.byDay].sort((a, b) => a - b).map(d => rc.dayShort[d]);
    text += ` ${rc.onDays}${labels.join(', ')}`;
  }
  if (rule.time) text += ` · ${rc.until} ${rule.time}`;
  return text;
}

// First generation moment = the operational-day start (08:00) the first occurrence belongs to.
// The occurrence's due time-of-day comes from rule.time, applied in commons.run_recurrences.
export function computeFirstNextRun(rule) {
  if (!rule) return null;
  const base = new Date();
  if (base.getHours() < 8) base.setDate(base.getDate() - 1);
  base.setHours(8, 0, 0, 0);
  if (rule.freq === 'weekly' && rule.byDay?.length) {
    const set = new Set(rule.byDay);
    for (let i = 0; i < 7; i++) {
      if (set.has(base.getDay())) return base.toISOString();
      base.setDate(base.getDate() + 1);
    }
  }
  return base.toISOString();
}
