// src/commons/opDay.js
// The operational day runs 08:00 → 08:00 (a late-night task still belongs to its day until 8 AM).
// All "today / overdue / which day" math goes through here instead of raw midnight boundaries.

export const OP_DAY_START_HOUR = 8;

// Start (08:00) of the operational day a given moment falls in.
export function opDayStartFor(date) {
  const d = new Date(date);
  if (d.getHours() < OP_DAY_START_HOUR) d.setDate(d.getDate() - 1);
  d.setHours(OP_DAY_START_HOUR, 0, 0, 0);
  return d;
}

export function currentOpDayStart(now = new Date()) {
  return opDayStartFor(now);
}

// A deadline is "today" when it sits in the current operational day.
export function isToday(due, now = new Date()) {
  if (!due) return false;
  return opDayStartFor(due).getTime() === currentOpDayStart(now).getTime();
}

// Overdue once the operational day of the deadline is fully past.
export function isOverdue(due, now = new Date()) {
  if (!due) return false;
  return opDayStartFor(due).getTime() < currentOpDayStart(now).getTime();
}
