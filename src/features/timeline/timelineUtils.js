// src/features/timeline/timelineUtils.js
// Shared geometry helpers for timeline label, preview positioning, and pan clamping.
//
// Used by:
//   TimelineNode.jsx    — getOutwardNormal, estimateLabelBox, assignLabelFlips
//   TimelineFeature.jsx — clampPan, getOutwardNormal
//   TimelineCanvas.jsx  — clampPan

import { CANVAS_W, CANVAS_H } from './timelineData.js';

// How much of the viewport (fraction) must remain covered by the canvas when panning.
const PAN_GUARD = 0.7;

/**
 * Clamps a pan position so the canvas always covers at least PAN_GUARD of the viewport.
 * scale is the current worldScale value.
 */
export function clampPan(x, y, scale) {
  const vpW    = window.innerWidth;
  const vpH    = window.innerHeight;
  const guardX = vpW * PAN_GUARD;
  const guardY = vpH * PAN_GUARD;
  return {
    x: Math.min(vpW - guardX, Math.max(guardX - CANVAS_W * scale, x)),
    y: Math.min(vpH - guardY, Math.max(guardY - CANVAS_H * scale, y)),
  };
}

// Approximate geometric center of the bezier path in canvas coords.
// Used to determine which perpendicular side of the tangent faces "outward".
const PATH_CENTER_X = 1300;
const PATH_CENTER_Y = 1000;

// Approximate character width ratio for Hebrew text in the Alef font.
// Used to estimate rendered label width without DOM measurement.
const CHAR_WIDTH_RATIO = 0.58;
const LINE_HEIGHT_RATIO = 1.3;

/**
 * Returns the unit normal vector (nx, ny) perpendicular to the bezier tangent,
 * pointing away from the path interior (outward side).
 *
 * Two perpendiculars exist for any tangent. We pick the one whose dot product
 * with the vector from PATH_CENTER to the node is positive — i.e., pointing away.
 *
 * tx/ty: normalized tangent at the node (from evaluateAtDate).
 * x/y: node world position.
 */
export function getOutwardNormal(x, y, tx, ty) {
  if (Math.abs(tx) < 0.001 && Math.abs(ty) < 0.001) {
    return { nx: 0, ny: 1 }; // degenerate tangent — default to downward
  }

  // Two perpendicular candidates
  const lx = -ty, ly =  tx; // 90° counterclockwise from tangent
  const rx =  ty, ry = -tx; // 90° clockwise from tangent

  // Pick the one pointing away from the path center
  const awayX = x - PATH_CENTER_X;
  const awayY = y - PATH_CENTER_Y;
  const dotL  = lx * awayX + ly * awayY;
  const dotR  = rx * awayX + ry * awayY;

  return dotL >= dotR ? { nx: lx, ny: ly } : { nx: rx, ny: ry };
}

/**
 * Estimates the bounding box of a label string in screen px.
 * All label text is counter-scaled, so screen px = SVG units inside the group.
 * Returns { w, h }.
 */
export function estimateLabelBox(text, fontSize) {
  return {
    w: text.length * fontSize * CHAR_WIDTH_RATIO,
    h: fontSize * LINE_HEIGHT_RATIO,
  };
}

/**
 * Assigns labelFlip values to a list of visible items (sorted by path order).
 * Items whose screen positions are within CLUSTER_DIST px of the previous item
 * get labelFlip=true — their label is placed on the opposite side of the axis,
 * alternating to avoid overlap.
 *
 * Returns a Map<itemId, boolean>.
 */
export function assignLabelFlips(items, scale) {
  // scale is used to convert world coords to screen px for distance comparison
  const CLUSTER_DIST = 80; // screen px — below this, alternate label sides
  const flips = new Map();
  let lastFlip = false;
  let lastSX = -Infinity;
  let lastSY = -Infinity;

  for (const item of items) {
    const sx = item.x * scale;
    const sy = item.y * scale;
    const dist = Math.sqrt((sx - lastSX) ** 2 + (sy - lastSY) ** 2);

    lastFlip = dist < CLUSTER_DIST ? !lastFlip : false;
    flips.set(item.id, lastFlip);
    lastSX = sx;
    lastSY = sy;
  }

  return flips;
}
