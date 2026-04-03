// src/features/timeline/timelineData.js
// Canvas dimensions and shared constants for the timeline coordinate system.
// Items are fetched from Supabase via useTimelineItems() in src/data/timeline/.

export const CANVAS_W = 3000;
export const CANVAS_H = 2200;

// ── Zoom ──────────────────────────────────────────────────────────────────────
export const ZOOM_MIN     = 0.12;   // most zoomed out (full overview)
export const ZOOM_MAX     = 2.5;    // most zoomed in
export const ZOOM_STEP    = 1.35;   // multiplier per +/− button press
export const INITIAL_SCALE = 0.22;  // starting scale

// ── Item visibility tiers ─────────────────────────────────────────────────────
// DB stores zoom_tier: 0 | 1 | 2 (semantic level, not a scale value).
// ZOOM_TIER_SCALE maps tier → the canvas scale at which the item becomes visible.
// Change thresholds here freely — DB never stores scale values.
export const SCALE_ALWAYS = 0;      // tier 0 — main milestones, always visible
export const SCALE_MID    = 0.3;    // tier 1 — sub-items, visible at mid zoom
export const SCALE_CLOSE  = 0.9;    // tier 2 — detail items, visible only close up

export const ZOOM_TIER_SCALE = [SCALE_ALWAYS, SCALE_MID, SCALE_CLOSE];

// ── Preview positioning ───────────────────────────────────────────────────────
// Screen-px distance from node to preview card center.
// PREVIEW_OFFSET_Y: node sits this many px below card center (vertical).
// PREVIEW_OFFSET_X: node sits this many px to the RIGHT of card center (horizontal).
export const PREVIEW_OFFSET_Y = 100;
export const PREVIEW_OFFSET_X = 90;

// ── Label geometry ────────────────────────────────────────────────────────────
// Half the road's on-screen glow radius (px). Used to compute dynamic label gap.
// TimelineRoad uses glowWidth = 28/s screen px (half = 14). Label must clear this.
export const ROAD_GLOW_SCREEN_HALF = 14;
