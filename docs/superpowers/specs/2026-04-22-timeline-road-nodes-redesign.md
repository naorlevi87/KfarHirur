# Timeline Road & Nodes — Visual Redesign
**Date:** 2026-04-22

## Problem

The current painterly brushstroke effect on the timeline road uses SVG `feTurbulence` / `feDisplacementMap` filters. These operate in screen-space and cause visible pixelation and blurriness during zoom-in/zoom-out. The blob nodes (organic shapes) add visual noise that doesn't fit the rest of the site's simple aesthetic.

## Goal

A clean, simple visual system for the timeline road and nodes that:
- Looks good at all zoom levels (no pixelation)
- Has subtle depth without being graphically heavy
- Fits the site's overall aesthetic (simple, human, not NGO-generic)
- Works correctly with naor/shay mode color tokens

---

## Road — New Design

### Structure: 3 stroke layers, no SVG filters

All three layers share the same bezier path `d`. Counter-scaling stays exactly as-is (`strokeWidth` is divided by `worldScale` via `useTransform`).

| Layer | Role | Screen stroke-width | Opacity | Dash |
|---|---|---|---|---|
| Base (wide) | Body / depth | 14px | 0.10 | none |
| Core (medium) | Main visible stroke | 6px | 0.48 | irregular (see below) |
| Edge (thin) | Crisp centerline | 1.5px | 0.72 | none |

**Variable width feel (core layer):**
`strokeDasharray="90 0 60 8 80 5 50 10 70 6"` — long on-segments with short gaps. Creates subtle pressure-variance without any filter. Gaps are too short to read as breaks at normal zoom; they read as organic width variation.

**Remove entirely:**
- `filter` attributes (`tl-pencil`, `tl-pencil2`)
- `<defs>` block with `feTurbulence` / `feDisplacementMap`
- `pressureRef` layer
- `fiberRef` layer (the dashed bristle layer)

**Keep:**
- `strokeDashoffset` draw animation on entry (`isEntering` logic) — all 3 layers animate in
- Counter-scaling via `useTransform`
- `strokeLinecap="round"`

---

## Nodes — New Design

### Back to circles

Replace `blobPath()` and `idToSeed()` with a plain `<circle cx={x} cy={y} r={r} />`.

### Sizing (unchanged)
- `MAIN_R = 8` (tier-0, always visible)
- `MID_R = 7` (tier-1, mid zoom)
- `CLOSE_R = 6` (tier-2, close zoom)

### Fill
`fill="var(--page-bg)"` with `fillOpacity = 0.06 + 0.10 * pathProgress`

Older events (pathProgress ≈ 0) have near-transparent fill. Newer events (pathProgress ≈ 1) have slightly more visible fill. Subtle, not dramatic.

### Stroke — tier × time hierarchy

Base opacity per tier:
- Tier-0 (main): `0.65`
- Tier-1 (mid): `0.42`
- Tier-2 (close): `0.28`

Final `strokeOpacity = baseTierOpacity * (0.65 + 0.35 * pathProgress)`

This blends two signals in one value:
- **Tier** (hierarchy): main nodes always more prominent than sub-nodes
- **Time** (age): older events slightly more faded, newer more vivid

`strokeWidth` per tier (same as current):
- Tier-0: `2.5`
- Tier-1: `1.8`
- Tier-2: `1.5`

---

## Files Changed

- `src/features/timeline/TimelineRoad.jsx` — rewrite road rendering
- `src/features/timeline/TimelineNode.jsx` — replace blobPath with circle, update strokeOpacity formula

## Files Unchanged

- `TimelineFeature.jsx` — no changes
- `TimelineCanvas.jsx` — no changes
- `timelinePath.js`, `timelineData.js`, `timelineUtils.js` — no changes
- CSS — no changes needed (no new class names)

---

## Non-Goals

- No color/hue math (no HSL computation) — opacity is sufficient for the desired effect
- No new animation logic
- No changes to labels or tags
- No changes to the preview card
