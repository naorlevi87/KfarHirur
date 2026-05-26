// src/features/timeline/TimelineRoad.jsx
// Renders the timeline axis as 3 filled SVG shapes with spatially varying width.
// Width varies along the path using overlapping sine waves at irrational frequencies.
// A slow phase drift makes the thick/thin spots migrate over time.
// All path updates are imperative (direct setAttribute) — no React state, no re-renders.

import { useRef, useEffect } from 'react';
import { sampleSpine, buildPathString } from './timelinePath.js';
import { ZOOM_MIN } from './timelineData.js';

// Inner layer screen width (px). Outer layers are 1.2× and 1.44× wider.
const BASE_W = 4;

// Layers: inner → outer. Outer extends beyond inner creating visible depth.
const LAYERS = [
  { factor: 1.44, opacity: 0.10 }, // outermost — soft halo
  { factor: 1.20, opacity: 0.28 }, // mid
  { factor: 1.00, opacity: 0.65 }, // inner — brightest
];

// 150 sample points along the bezier — precomputed once, static
const SPINE = sampleSpine(150);

// Mask stroke must be wide enough to cover the outer road layer at minimum zoom.
// Outer layer max world-width = BASE_W * 1.44 * 1.65 / ZOOM_MIN ≈ 80 — use 250 for safety.
const MASK_STROKE_W = 250;

const DRAW_DURATION = 1800; // ms — must match TimelineNode
const DRAW_EASING   = 'cubic-bezier(0.4, 0, 0.2, 1)';

// Spatial width at a given path position + phase.
// Three sine waves at irrational frequency ratios → never repeats visually.
function spatialWidth(progress, phase) {
  return BASE_W * (
    1
    + 0.315 * Math.sin(progress * 4.7  * Math.PI + phase)
    + 0.180 * Math.sin(progress * 11.3 * Math.PI + phase * 1.7)
    + 0.090 * Math.sin(progress * 23.7 * Math.PI + phase * 2.3)
  );
}

// Build a filled SVG path string for one layer.
// top side = spine + normal × half_w, bottom side = spine − normal × half_w.
function buildFilledPath(factor, phase, worldScale) {
  const top = [];
  const bot = [];

  for (const { x, y, nx, ny, progress } of SPINE) {
    const hw = spatialWidth(progress, phase) * factor / (2 * worldScale);
    top.push(`${(x + nx * hw).toFixed(2)},${(y + ny * hw).toFixed(2)}`);
    bot.push(`${(x - nx * hw).toFixed(2)},${(y - ny * hw).toFixed(2)}`);
  }

  return `M ${top.join(' L ')} L ${bot.reverse().join(' L ')} Z`;
}

// Reusable path string for the mask (static path — only stroke-dashoffset animates)
const MASK_PATH_D = buildPathString();

export function TimelineRoad({ worldScale, isEntering }) {
  // One ref per layer — direct DOM updates bypass React for 60fps animation
  const layerRefs = [useRef(null), useRef(null), useRef(null)];
  const maskRef   = useRef(null);

  const phaseRef      = useRef(0);
  const worldScaleRef = useRef(worldScale.get());

  // Imperative path update — called from both phase drift and worldScale subscriber
  function updateLayers(scale, phase) {
    LAYERS.forEach(({ factor }, i) => {
      if (layerRefs[i].current) {
        layerRefs[i].current.setAttribute('d', buildFilledPath(factor, phase, scale));
      }
    });
  }

  // Phase drift (slow temporal movement) + worldScale subscription
  useEffect(() => {
    let raf;

    // Subscribe to zoom changes — rebuild geometry when scale changes
    const unsub = worldScale.on('change', s => {
      worldScaleRef.current = s;
      updateLayers(s, phaseRef.current);
    });

    // RAF loop — advances phase and rebuilds paths every frame
    function tick() {
      phaseRef.current += 0.0004;
      updateLayers(worldScaleRef.current, phaseRef.current);
      raf = requestAnimationFrame(tick);
    }

    // Initial render
    updateLayers(worldScaleRef.current, phaseRef.current);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [worldScale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entry draw animation — animates the mask path's strokeDashoffset
  useEffect(() => {
    const path = maskRef.current;
    if (!path) return;

    if (!isEntering) {
      path.style.strokeDasharray  = '';
      path.style.strokeDashoffset = '0';
      path.style.transition       = 'none';
      return;
    }

    const totalLength = path.getTotalLength();
    path.style.strokeDasharray  = `${totalLength}`;
    path.style.strokeDashoffset = `${totalLength}`;
    path.style.transition       = 'none';

    // Force reflow — ensures hidden state is painted before transition starts
    path.getBoundingClientRect();

    path.style.transition       = `stroke-dashoffset ${DRAW_DURATION}ms ${DRAW_EASING}`;
    path.style.strokeDashoffset = '0';
  }, [isEntering]);

  return (
    <g>
      <defs>
        {/*
          Draw mask: a wide stroke that reveals the filled layers as it draws.
          strokeDashoffset animates from totalLength → 0, revealing content left-to-right
          along the path. Only active during isEntering — mask removed after animation.
        */}
        <mask id="tl-road-mask">
          <path
            ref={maskRef}
            d={MASK_PATH_D}
            stroke="white"
            strokeWidth={MASK_STROKE_W}
            fill="none"
            strokeLinecap="round"
          />
        </mask>
      </defs>

      {/* Filled layers — rendered outermost first (painter's order) */}
      <g mask={isEntering ? 'url(#tl-road-mask)' : undefined}>
        {LAYERS.map(({ opacity }, i) => (
          <path
            key={i}
            ref={layerRefs[i]}
            fill="var(--road)"
            fillOpacity={opacity}
            stroke="none"
          />
        ))}
      </g>
    </g>
  );
}
