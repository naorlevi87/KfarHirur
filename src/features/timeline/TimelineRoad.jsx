// src/features/timeline/TimelineRoad.jsx
// Renders the timeline axis — a thick solid SVG line, not a road.
// Subtle glow behind + clean solid stroke. Color from var(--road).

export function TimelineRoad() {
  const d =
    'M 1400 1900' +
    ' C 1600 1820, 1850 1780, 2050 1700' +
    ' C 2250 1620, 2380 1500, 2340 1340' +
    ' C 2300 1180, 2100 1100, 1900 1060' +
    ' C 1700 1020, 1500 1040, 1360 960' +
    ' C 1220 880, 1160 760, 1240 640' +
    ' C 1320 520, 1500 480, 1600 380' +
    ' C 1700 280, 1680 160, 1560 100' +
    ' C 1440 40, 1280 60, 1160 130' +
    ' C 1040 200, 940 320, 820 380' +
    ' C 700 440, 540 440, 420 380' +
    ' C 300 320, 240 200, 280 100';

  return (
    <g>
      {/* soft glow behind the axis */}
      <path
        d={d}
        fill="none"
        stroke="var(--road)"
        strokeWidth={18}
        strokeLinecap="round"
        opacity={0.07}
      />
      {/* main axis line — solid, clean */}
      <path
        d={d}
        fill="none"
        stroke="var(--road)"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.5}
      />
    </g>
  );
}
