// src/features/timeline/TimelineNode.jsx
// Single timeline node. Counter-scaled via SVG transform so size stays fixed on
// screen regardless of canvas zoom. Label offset is perpendicular to the bezier
// tangent — uses getOutwardNormal to stay on the outward side of the axis.
// Label gap is dynamic so the label clears the road glow at all zoom levels.

import { useEffect, useRef } from 'react';
import { getOutwardNormal } from './timelineUtils.js';
import { ROAD_GLOW_SCREEN_HALF } from './timelineData.js';

const BASE_R     = 7;
const BASE_GLOW  = 16;
const SMALL_R    = 5;
const SMALL_GLOW = 12;

const LABEL_BASE  = 14;
const LABEL_SMALL = 13;
const LABEL_SUB   = 11;
const TAG_SIZE    = 10;

// Base gap in screen px from node edge to label. Dynamic portion added per scale.
const LABEL_GAP_BASE = 22;

function getLabelAnchor(nx) {
  if (Math.abs(nx) < 0.3) return 'middle';
  return nx > 0 ? 'start' : 'end';
}

function getLabelBaseline(nx, ny) {
  if (Math.abs(ny) >= Math.abs(nx)) return ny > 0 ? 'hanging' : 'auto';
  return 'middle';
}

export function TimelineNode({ item, worldScale, onTap }) {
  const { id, x, y, tx = 1, ty = 0, minScale = 0, content } = item;
  const isSub = minScale > 0;

  const r        = isSub ? SMALL_R    : BASE_R;
  const glowR    = isSub ? SMALL_GLOW : BASE_GLOW;
  const labelSize = isSub ? LABEL_SUB
    : minScale === 0 ? LABEL_BASE
    : LABEL_SMALL;

  const { nx, ny } = getOutwardNormal(x, y, tx, ty);
  const anchor   = getLabelAnchor(nx);
  const baseline = getLabelBaseline(nx, ny);

  // Refs for elements whose positions update with worldScale
  const groupRef = useRef(null);
  const labelRef = useRef(null);
  const tagRef   = useRef(null);

  useEffect(() => {
    function update(s) {
      if (!groupRef.current) return;

      // Counter-scale: node stays fixed size on screen
      const inv = 1 / s;
      groupRef.current.setAttribute(
        'transform',
        `translate(${x} ${y}) scale(${inv}) translate(${-x} ${-y})`
      );

      // Dynamic label gap: base gap + extra clearance from road glow.
      // Inside the counter-scaled group, 1 SVG unit = 1 screen px.
      const effectiveGap = LABEL_GAP_BASE + ROAD_GLOW_SCREEN_HALF / s;
      const dx = nx * (r + effectiveGap);
      const dy = ny * (r + effectiveGap);

      if (labelRef.current) {
        labelRef.current.setAttribute('x', x + dx);
        labelRef.current.setAttribute('y', y + dy);
      }

      // Tag sits one label-size further out along the same normal
      if (tagRef.current) {
        const tagGap = r + effectiveGap + labelSize + 4;
        tagRef.current.setAttribute('x', x + nx * tagGap);
        tagRef.current.setAttribute('y', y + ny * tagGap);
        // Hide tag at low zoom to reduce clutter
        tagRef.current.setAttribute('opacity', s < 0.5 ? '0' : '0.65');
      }
    }

    update(worldScale.get());
    return worldScale.on('change', update);
  }, [x, y, nx, ny, r, labelSize, worldScale]);

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

      {/* Initial positions — overwritten by useEffect on first render */}
      <text
        ref={labelRef}
        x={x} y={y}
        fill="var(--text-secondary)"
        fillOpacity={isSub ? 0.7 : 0.9}
        fontSize={labelSize}
        fontWeight={700}
        fontFamily="Alef, sans-serif"
        textAnchor={anchor}
        dominantBaseline={baseline}
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
        textAnchor={anchor}
        dominantBaseline={baseline}
        pointerEvents="none"
      >
        {content.tag}
      </text>
    </g>
  );
}
