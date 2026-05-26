// src/features/timeline/timelineData.js
// Canvas dimensions and shared constants for the timeline coordinate system.
// Items are fetched from Supabase via useTimelineItems() in src/data/timeline/.

export const CANVAS_W = 3000;
export const CANVAS_H = 2200;

// ── Zoom ──────────────────────────────────────────────────────────────────────
export const ZOOM_MIN     = 0.12;   // most zoomed out (full overview)
export const ZOOM_MAX     = 2.5;    // most zoomed in
export const ZOOM_STEP    = 1.35;   // multiplier per +/− button press
// Bounding box of PATH_SEGMENTS endpoints — used to fit the initial view.
// Update if PATH_SEGMENTS changes significantly.
export const PATH_BBOX = { minX: 180, maxX: 2400, minY: 40, maxY: 2100 };

// ── Item grade config ─────────────────────────────────────────────────────────
// Grade 1 = most prominent (always visible, largest node).
// Grade N = most detailed (visible only at higher zoom, smallest node).
// To add or remove grades: edit this array only. Nothing else needs changing.
//
// minScale   — canvas scale at which this grade first becomes visible
// nodeR      — circle radius (screen px, counter-scaled)
// labelSize  — title font size (screen px)
// strokeWidth — circle stroke width
export const ITEM_GRADE_CONFIG = [
  null, // index 0 unused — grades are 1-based
  { minScale: 0,    nodeR: 6.5, labelSize: 13.5, strokeWidth: 2.5 }, // grade 1 — milestone
  { minScale: 0.15, nodeR: 6.0, labelSize: 13.0, strokeWidth: 2.2 }, // grade 2
  { minScale: 0.3,  nodeR: 5.5, labelSize: 12.5, strokeWidth: 1.8 }, // grade 3
  { minScale: 0.6,  nodeR: 5.2, labelSize: 12.2, strokeWidth: 1.6 }, // grade 4
  { minScale: 0.9,  nodeR: 4.8, labelSize: 12.0, strokeWidth: 1.5 }, // grade 5 — detail
];

// Number of defined grades — derived so callers don't hardcode it.
export const GRADE_COUNT = ITEM_GRADE_CONFIG.length - 1;

// ── Preview positioning ───────────────────────────────────────────────────────
// Screen-px distance from node to preview card center.
// PREVIEW_OFFSET_Y: node sits this many px below card center (vertical).
// PREVIEW_OFFSET_X: node sits this many px to the RIGHT of card center (horizontal).
export const PREVIEW_OFFSET_Y = 100;
export const PREVIEW_OFFSET_X = 90;

// ── Label geometry ────────────────────────────────────────────────────────────
// Half the road's on-screen outer layer width (px). Used to compute dynamic label gap.
// Outer layer = BASE_W(4) × 1.44 = 5.76px screen width, half ≈ 3px.
export const ROAD_GLOW_SCREEN_HALF = 3;
