// src/features/timeline/TimelineNode.jsx
// Single timeline node. Counter-scaled via SVG transform attribute so size stays
// fixed on screen regardless of canvas zoom. Label offset is perpendicular to the
// bezier tangent at the node's date — never on the axis.

import { useEffect, useRef } from 'react';

const BASE_R    = 7;
const BASE_GLOW = 16;
const SMALL_R   = 5;
const SMALL_GLOW = 12;

const LABEL_BASE     = 14;
const LABEL_LARGE    = 16;
const LABEL_SMALL_L0 = 13;
const LABEL_SUB      = 11;
const TAG_SIZE       = 10;
const LABEL_GAP      = 20; // screen px from node edge to label

const PATH_CENTER_X = 1300;
const PATH_CENTER_Y = 1000;

function autoLabelOffset(x, y, tx, ty, r) {
  if (Math.abs(tx) < 0.001 && Math.abs(ty) < 0.001) {
    return { dx: 0, dy: r + LABEL_GAP, nx: 0, ny: 1 };
  }

  const lx = -ty, ly =  tx;
  const rx =  ty, ry = -tx;

  const awayX = x - PATH_CENTER_X;
  const awayY = y - PATH_CENTER_Y;
  const dotL = lx * awayX + ly * awayY;
  const dotR = rx * awayX + ry * awayY;

  const nx = dotL >= dotR ? lx : rx;
  const ny = dotL >= dotR ? ly : ry;

  return { dx: nx * (r + LABEL_GAP), dy: ny * (r + LABEL_GAP), nx, ny };
}

function getLabelAnchor(nx, ny) {
  if (Math.abs(nx) > Math.abs(ny)) return nx > 0 ? 'start' : 'end';
  return 'middle';
}

function getLabelBaseline(nx, ny) {
  if (Math.abs(ny) >= Math.abs(nx)) return ny > 0 ? 'hanging' : 'auto';
  return 'middle';
}

export function TimelineNode({ item, mode, worldScale, zoomLevel, onTap }) {
  const { id, x, y, tx = 1, ty = 0, minScale = 0, initialView = false } = item;
  const content = item[mode] ?? item.naor;
  const isSub = minScale > 0;

  let r, glowR, labelSize;
  if (isSub) {
    r = SMALL_R; glowR = SMALL_GLOW; labelSize = LABEL_SUB;
  } else if (zoomLevel === 0) {
    r = BASE_R; glowR = BASE_GLOW; labelSize = LABEL_BASE;
  } else if (initialView) {
    r = Math.round(BASE_R * 1.15); glowR = Math.round(BASE_GLOW * 1.15); labelSize = LABEL_LARGE;
  } else {
    r = BASE_R; glowR = BASE_GLOW; labelSize = LABEL_SMALL_L0;
  }

  const { dx, dy, nx, ny } = autoLabelOffset(x, y, tx, ty, r);
  const anchor   = getLabelAnchor(nx, ny);
  const baseline = getLabelBaseline(nx, ny);

  const tagGap = r + LABEL_GAP + labelSize + 4;
  const tagDx  = (nx) * tagGap;
  const tagDy  = (ny) * tagGap;

  // Counter-scale: set SVG transform attribute directly so units are SVG user coords.
  const groupRef = useRef(null);
  useEffect(() => {
    function update(s) {
      if (!groupRef.current) return;
      const inv = 1 / s;
      groupRef.current.setAttribute(
        'transform',
        `translate(${x} ${y}) scale(${inv}) translate(${-x} ${-y})`
      );
    }
    update(worldScale.get());
    return worldScale.on('change', update);
  }, [x, y, worldScale]);

  function handleClick(e) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onTap(item, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  const showTag = zoomLevel >= 1;

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

      <text
        x={x + dx} y={y + dy}
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

      {showTag && (
        <text
          x={x + tagDx} y={y + tagDy}
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
      )}
    </g>
  );
}
