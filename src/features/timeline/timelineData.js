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
// Items with min_scale <= current scale are visible.
// SCALE_MID / SCALE_CLOSE match the min_scale values stored in Supabase.
export const SCALE_ALWAYS = 0;      // main milestones — always visible
export const SCALE_MID    = 0.45;   // sub-items — visible at mid zoom
export const SCALE_CLOSE  = 0.9;    // detail items — visible only close up

// ── Preview positioning ───────────────────────────────────────────────────────
// World-unit distance from node center to preview center (along outward normal).
// Tune this if preview feels too far or clips viewport edge on small screens.
export const PREVIEW_OFFSET = 200;

// ── Label geometry ────────────────────────────────────────────────────────────
// Half the road's on-screen glow radius (px). Used to compute dynamic label gap.
// TimelineRoad uses glowWidth = 28/s screen px (half = 14). Label must clear this.
export const ROAD_GLOW_SCREEN_HALF = 14;
