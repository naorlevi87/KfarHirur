// src/features/timeline/TimelineNode.jsx
// Single timeline node rendered inside a counter-scaled SVG group.
//
// ── Counter-scaling ───────────────────────────────────────────────────────────
// The <g> receives a scale(1/worldScale) transform so the node stays a fixed
// pixel size regardless of zoom. As a result, all offsets inside the group
// are in screen px (not world units).
//
// ── Label placement algorithm ─────────────────────────────────────────────────
// Labels are ALWAYS horizontal — never centered above/below.
// Placement is driven by the outward normal vector (nx, ny) of the bezier path:
//
//   1. SIDE (left or right):
//      nx >= 0 → label to the RIGHT of the node
//      nx < 0  → label to the LEFT
//      labelFlip=true inverts this (used by parent to alternate crowded nodes).
//
//   2. VERTICAL OFFSET:
//      The label anchor y = node.y + effectiveNy * V_SCALE
//      effectiveNy = ny when not flipped, -ny when flipped.
//      This slides the label up or down along the open side of the axis.
//
//   3. ANCHOR POINT:
//      The text anchor is placed H_GAP px outside the node edge on the chosen side.
//      SVG Hebrew RTL quirk: textAnchor="end" = visual LEFT edge of text,
//                            textAnchor="start" = visual RIGHT edge.
//      So: side=RIGHT → anchor="end" (left edge of text touches node)
//          side=LEFT  → anchor="start" (right edge of text touches node)
//
//   4. TAG (date/label):
//      Horizontally centered on the label. Vertically offset by one line in tagDir
//      (same direction as effectiveNy — away from the axis).

import { useEffect, useRef } from 'react';
import { getOutwardNormal, estimateLabelBox } from './timelineUtils.js';
import { SCALE_CLOSE } from './timelineData.js';

// Node circle sizes by tier (screen px, counter-scaled)
const MAIN_R     = 8;
const MAIN_GLOW  = 18;
const MID_R      = 5;
const MID_GLOW   = 12;
const CLOSE_R    = 4;
const CLOSE_GLOW = 9;

// Label font sizes by tier (screen px)
const LABEL_MAIN  = 16; // minScale=0 — always-visible milestones
const LABEL_MID   = 12; // mid-zoom items
const LABEL_CLOSE = 9;  // close-zoom items
const TAG_SIZE    = 10;

// Horizontal gap from node edge to nearest text edge (screen px)
const H_GAP = 3;

// How much ny shifts the label vertically from node center (screen px per unit normal)
// ny=1.0 → label shifts V_SCALE px down; ny=-1.0 → V_SCALE px up
const V_SCALE = 11;

export function TimelineNode({ item, worldScale, labelFlip = false, onTap }) {
  const { id, x, y, tx = 1, ty = 0, minScale = 0, content } = item;
  const isClose = minScale >= SCALE_CLOSE;
  const isMid   = minScale > 0 && !isClose;
  const isSub   = minScale > 0; // any non-main item

  const r         = isClose ? CLOSE_R    : isMid ? MID_R    : MAIN_R;
  const glowR     = isClose ? CLOSE_GLOW : isMid ? MID_GLOW : MAIN_GLOW;
  const labelSize = isClose ? LABEL_CLOSE : isMid ? LABEL_MID : LABEL_MAIN;

  // Outward normal at this node's position on the bezier path
  const { nx, ny } = getOutwardNormal(x, y, tx, ty);

  // side: +1 = text to the right, -1 = text to the left (after flip)
  const side = ((nx >= 0) !== labelFlip) ? 1 : -1;

  // effectiveNy: vertical offset direction. Flips with side so the label
  // always ends up on the open (non-axis) side of the curve.
  const effectiveNy = labelFlip ? -ny : ny;

  // SVG Hebrew RTL: "end" = left edge of text, "start" = right edge.
  // We want the edge closest to the node to be at the anchor point.
  const anchor = side > 0 ? 'end' : 'start';

  // Tag stacks in the same vertical direction as the label offset
  const tagDir = effectiveNy < 0 ? -1 : 1;

  const groupRef = useRef(null);
  const labelRef = useRef(null);
  const tagRef   = useRef(null);

  useEffect(() => {
    function update(s) {
      if (!groupRef.current) return;

      // Apply counter-scale so node stays fixed size on screen
      const inv = 1 / s;
      groupRef.current.setAttribute(
        'transform',
        `translate(${x} ${y}) scale(${inv}) translate(${-x} ${-y})`
      );

      // Label anchor position (screen px inside counter-scaled group)
      const ax = x + side * (r + H_GAP);       // H_GAP outside node edge
      const ay = y + effectiveNy * V_SCALE;     // vertical slide along open side

      if (labelRef.current) {
        labelRef.current.setAttribute('x', ax);
        labelRef.current.setAttribute('y', ay);
      }

      // Tag centered horizontally on the label.
      // Estimate label width to find its visual center:
      // anchor="end" (left edge at ax) → center = ax + w/2
      // anchor="start" (right edge at ax) → center = ax - w/2
      const { w: labelW } = estimateLabelBox(content.title, labelSize);
      const labelCenterX = ax + (anchor === 'end' ? labelW / 2 : -labelW / 2);

      if (tagRef.current) {
        tagRef.current.setAttribute('x', labelCenterX);
        tagRef.current.setAttribute('y', ay + tagDir * (labelSize * 0.9 + 3));
        tagRef.current.setAttribute('opacity', s < 0.5 ? '0' : '0.65');
      }
    }

    update(worldScale.get());
    return worldScale.on('change', update);
  }, [x, y, side, effectiveNy, r, labelSize, tagDir, anchor, content.title, worldScale]);

  function handleClick(e) {
    e.stopPropagation();
    onTap(item);
  }

  return (
    <g
      ref={groupRef}
      className={`tl-node tl-node--${isSub ? 'sub' : 'main'}`}
      data-id={id}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={x} cy={y} r={glowR} fill="var(--road)"
        fillOpacity={isSub ? 0.04 : 0.07} />

      <circle cx={x} cy={y} r={r} fill="var(--page-bg)" stroke="var(--road)"
        strokeWidth={isSub ? 1.5 : 2}
        strokeOpacity={isSub ? 0.4 : 0.65} />

      {/*
        Initial positions are placeholders — useEffect sets the real positions
        on first render and on every worldScale change.
      */}
      <text
        ref={labelRef}
        x={x} y={y}
        fill="var(--text-secondary)"
        fillOpacity={isSub ? 0.7 : 0.9}
        fontSize={labelSize}
        fontWeight={700}
        fontFamily="Alef, sans-serif"
        textAnchor={anchor}
        dominantBaseline="middle"
        pointerEvents="none"
      >
        {content.title}
      </text>

      <text
        ref={tagRef}
        x={x} y={y}
        fill="var(--road)"
        fillOpacity={0.65}
        fontSize={TAG_SIZE}
        fontFamily="Alef, sans-serif"
        textAnchor="middle"
        dominantBaseline="middle"
        pointerEvents="none"
      >
        {content.tag}
      </text>
    </g>
  );
}
