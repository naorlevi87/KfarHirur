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
import { getOutwardNormal } from './timelineUtils.js';
import { ITEM_GRADE_CONFIG } from './timelineData.js';

const TAG_SIZE = 11;

const H_GAP  = 3;
const TAP_R  = 22;
const V_SCALE = 11;

const DRAW_DURATION     = 1800;
const NODE_DELAY_OFFSET = 150;
const NODE_APPEAR_DUR   = 200;

// All nodes — same opacity regardless of tier or time position
const NODE_FILL_OPACITY   = 0.82;
const NODE_STROKE_OPACITY = 0.92;

export function TimelineNode({ item, worldScale, labelFlip = false, onTap, isEntering = false, pathProgress = 0 }) {
  const { id, x, y, tx = 1, ty = 0, grade = 1, content } = item;
  // All visual properties come from the grade config — no hardcoded tier names.
  const gradeConf = ITEM_GRADE_CONFIG[grade] ?? ITEM_GRADE_CONFIG[1];
  const { nodeR: r, labelSize, strokeWidth, minScale } = gradeConf;

  const isSub    = minScale > 0; // any non-grade-1 item
  const colorVar = 'var(--node-c-1)';

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
    const el = groupRef.current;
    if (!el) return;

    if (!isEntering) {
      // Ensure fully visible and interactive
      el.setAttribute('opacity', '1');
      el.style.transition = 'none';
      return;
    }

    // Hide via SVG attribute — CSS opacity on <g> blocks pointer-events in SVG
    el.setAttribute('opacity', '0');
    el.style.transition = 'none';

    const delay = pathProgress * DRAW_DURATION + NODE_DELAY_OFFSET;

    const timer = setTimeout(() => {
      el.style.transition = `opacity ${NODE_APPEAR_DUR}ms cubic-bezier(0, 0, 0.2, 1)`;
      el.setAttribute('opacity', '1');
    }, delay);

    return () => clearTimeout(timer);
  }, [isEntering, pathProgress, x, y]);

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

      if (tagRef.current && labelRef.current) {
        const tagY = ay + tagDir * (labelSize * 0.9 + 3);
        tagRef.current.setAttribute('y', tagY);
        tagRef.current.setAttribute('text-anchor', 'middle');
        tagRef.current.setAttribute('opacity', '0.7');

        // Center tag on the title's rendered midpoint — needs a frame for layout.
        requestAnimationFrame(() => {
          if (!labelRef.current || !tagRef.current) return;
          const bbox = labelRef.current.getBBox();
          tagRef.current.setAttribute('x', bbox.x + bbox.width / 2);
        });
      }
    }

    update(worldScale.get());
    return worldScale.on('change', update);
  }, [x, y, side, effectiveNy, r, labelSize, tagDir, anchor, content.title, worldScale]);

  function handleClick(e) {
    e.stopPropagation();
    onTap(item);
  }

  // Stop pointerdown from bubbling to TimelineCanvas, which calls setPointerCapture
  // on the container. Pointer capture redirects the synthesized click away from this <g>.
  function handlePointerDown(e) {
    e.stopPropagation();
  }

  return (
    <g
      ref={groupRef}
      className={`tl-node tl-node--${isSub ? 'sub' : 'main'}`}
        data-id={id}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        style={{ cursor: 'pointer' }}
      >
        {/* Invisible tap target — larger than the visual circle for easy touch */}
        <circle cx={x} cy={y} r={TAP_R} fill="transparent" />

        {/* Circle centered at (x,y) in screen px inside the counter-scaled group */}
        <circle
          cx={x} cy={y} r={r}
          fill={colorVar}
          fillOpacity={NODE_FILL_OPACITY}
          stroke={colorVar}
          strokeWidth={strokeWidth}
          strokeOpacity={NODE_STROKE_OPACITY}
        />

        {/*
          Initial positions are placeholders — useEffect sets the real positions
          on first render and on every worldScale change.
        */}
        <text
          ref={labelRef}
          x={x} y={y}
          fill="var(--text-secondary)"
          fillOpacity={0.88}
          fontSize={labelSize}
          fontWeight={700}
          fontFamily="Alef, sans-serif"
          textAnchor={anchor}
          dominantBaseline="middle"
        >
          {content.title}
        </text>

        <text
          ref={tagRef}
          x={x} y={y}
          fill="var(--road)"
          fillOpacity={0.7}
          fontSize={TAG_SIZE}
          fontFamily="Alef, sans-serif"
          textAnchor={anchor}
          dominantBaseline="middle"
        >
          {content.tag}
        </text>
    </g>
  );
}
