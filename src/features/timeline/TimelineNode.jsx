// src/features/timeline/TimelineNode.jsx
// Single timeline node rendered inside the SVG.
// Light-theme: fills use page background, strokes use var(--road).
// Size variants: standard / key / large (corona) / small (sub-items).

const SIZE_CONFIG = {
  standard: { r: 8,  glowR: 18 },
  key:      { r: 10, glowR: 22 },
  large:    { r: 15, glowR: 38 },
  small:    { r: 5,  glowR: 12 },
};

const LABEL_OFFSET_X = 13;
const LABEL_OFFSET_Y = 5;

export function TimelineNode({ item, mode, onTap }) {
  const { id, x, y, size = 'standard' } = item;
  const { r, glowR } = SIZE_CONFIG[size] ?? SIZE_CONFIG.standard;
  const content = item[mode] ?? item.naor;
  const isLarge = size === 'large';
  const isSmall = size === 'small';
  const isKey   = size === 'key';

  function handleClick(e) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onTap(item, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <g
      className={`tl-node tl-node--${size}`}
      data-id={id}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      {/* glow halo */}
      <circle
        cx={x} cy={y} r={glowR}
        fill="var(--road)"
        fillOpacity={isLarge ? 0.1 : isSmall ? 0.04 : 0.06}
      />

      {/* main circle */}
      {isLarge ? (
        <>
          {/* corona: outer ring + filled center */}
          <circle cx={x} cy={y} r={glowR * 0.65} fill="none" stroke="var(--road)" strokeWidth={0.8} opacity={0.25} />
          <circle cx={x} cy={y} r={r} fill="var(--road)" fillOpacity={0.18} stroke="var(--road)" strokeWidth={2} filter="url(#tl-glow)" />
        </>
      ) : (
        <circle
          cx={x} cy={y} r={r}
          fill="var(--page-bg)"
          stroke="var(--road)"
          strokeWidth={isSmall ? 1 : 1.5}
          strokeOpacity={isSmall ? 0.4 : isKey ? 0.75 : 0.55}
        />
      )}

      {/* label */}
      <text
        x={x + LABEL_OFFSET_X}
        y={y + LABEL_OFFSET_Y}
        fill="var(--text-secondary)"
        fillOpacity={isLarge ? 1 : isSmall ? 0.6 : 0.85}
        fontSize={isLarge ? 16 : isSmall ? 11 : 14}
        fontFamily="Alef, sans-serif"
        pointerEvents="none"
      >
        {content.title}
      </text>
    </g>
  );
}
