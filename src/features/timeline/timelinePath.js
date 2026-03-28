// src/features/timeline/timelinePath.js
// Path definition, time mapping, and bezier evaluation for the timeline axis.
// Nodes are placed on the curve by date — not by hardcoded x/y.

// ── Bezier math ──────────────────────────────────────────────────────────────

function cubic(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

function cubicDeriv(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return 3*u*u*(p1 - p0) + 6*u*t*(p2 - p1) + 3*t*t*(p3 - p2);
}

// ── Path definition ──────────────────────────────────────────────────────────
// Each segment: [x0, y0, cx1, cy1, cx2, cy2, x1, y1]

export const PATH_SEGMENTS = [
  [ 900, 2080,  1050, 2040,  1250, 1960,  1400, 1900],  // 0: זולה → עתלית
  [1400, 1900,  1600, 1820,  1850, 1780,  2050, 1700],  // 1: עתלית → עין כמונים
  [2050, 1700,  2250, 1620,  2380, 1500,  2340, 1340],  // 2: → מנואלה
  [2340, 1340,  2300, 1180,  2100, 1100,  1900, 1060],  // 3: → placeholder-1
  [1900, 1060,  1700, 1020,  1500, 1040,  1360,  960],  // 4: → placeholder-2
  [1360,  960,  1220,  880,  1160,  760,  1240,  640],  // 5: → tlv
  [1240,  640,  1320,  520,  1500,  480,  1600,  380],  // 6: → joz-open
  [1600,  380,  1700,  280,  1680,  160,  1560,  100],  // 7: → corona
  [1560,  100,  1440,   40,  1280,   60,  1160,  130],  // 8: → placeholder-3
  [1160,  130,  1040,  200,   940,  320,   820,  380],  // 9: → pinum
  [ 820,  380,   700,  440,   540,  440,   420,  380],  // 10: → milchama
  [ 420,  380,   300,  320,   240,  200,   280,  100],  // 11: → now
];

// ── Time ranges ───────────────────────────────────────────────────────────────
// Each segment covers [startDate, endDate] in YYYY-MM format.
// The start of segment 0 is the path origin (900, 2080).

// Each segment's [startDate, endDate] maps the segment to time.
// endDate MUST match the date of the node sitting at that segment's endpoint (t=1),
// so evaluateAtDate returns the exact bezier endpoint for that node's date.
// ~11-month segments so visual path length is proportional to time.
// Nodes fall wherever their date places them — not forced to segment endpoints.
// Timeline: 2014-10 → 2026-03 = 137 months across 12 segments (7×11 + 5×12 months).
const SEGMENT_DATES = [
  ['2014-10', '2015-09'],
  ['2015-09', '2016-08'],
  ['2016-08', '2017-08'],
  ['2017-08', '2018-07'],
  ['2018-07', '2019-07'],
  ['2019-07', '2020-07'],
  ['2020-07', '2021-07'],
  ['2021-07', '2022-06'],
  ['2022-06', '2023-06'],
  ['2023-06', '2024-05'],
  ['2024-05', '2025-04'],
  ['2025-04', '2026-03'],
];

function toMonths(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return y * 12 + (m - 1);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns { x, y, tx, ty } — position and unit tangent on the path at the given date.
 * tx/ty are the unit tangent vector (direction of travel).
 */
export function evaluateAtDate(dateStr) {
  const target = toMonths(dateStr);

  for (let i = 0; i < SEGMENT_DATES.length; i++) {
    const start = toMonths(SEGMENT_DATES[i][0]);
    const end   = toMonths(SEGMENT_DATES[i][1]);
    if (target < start || target > end) continue;

    const t  = end === start ? 0 : (target - start) / (end - start);
    const [x0, y0, cx1, cy1, cx2, cy2, x1, y1] = PATH_SEGMENTS[i];

    const x  = cubic(t, x0, cx1, cx2, x1);
    const y  = cubic(t, y0, cy1, cy2, y1);
    const dx = cubicDeriv(t, x0, cx1, cx2, x1);
    const dy = cubicDeriv(t, y0, cy1, cy2, y1);
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    return { x, y, tx: dx / len, ty: dy / len };
  }

  // Clamp to first point if date is before range, last point if beyond
  if (toMonths(dateStr) < toMonths(SEGMENT_DATES[0][0])) {
    const [x0, y0] = PATH_SEGMENTS[0];
    return { x: x0, y: y0, tx: 1, ty: 0 };
  }
  const last = PATH_SEGMENTS[PATH_SEGMENTS.length - 1];
  return { x: last[6], y: last[7], tx: 1, ty: 0 };
}

/**
 * Returns the SVG path `d` string from the path segments.
 */
export function buildPathString() {
  const [x0, y0] = PATH_SEGMENTS[0];
  const parts = [`M ${x0} ${y0}`];
  for (const [, , cx1, cy1, cx2, cy2, x1, y1] of PATH_SEGMENTS) {
    parts.push(`C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x1} ${y1}`);
  }
  return parts.join(' ');
}

/**
 * Given a position (x, y) and tangent (tx, ty), returns the label offset (dx, dy)
 * pointing away from the path interior. labelSide: 'left' | 'right' of travel.
 * All values are in SVG canvas units.
 */
export function labelOffset(tx, ty, labelSide, gap) {
  // Normal vectors perpendicular to tangent:
  // left of travel: (-ty, tx)
  // right of travel: (ty, -tx)
  const nx = labelSide === 'left' ? -ty : ty;
  const ny = labelSide === 'left' ?  tx : -tx;
  return { dx: nx * gap, dy: ny * gap };
}
