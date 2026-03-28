// src/features/timeline/TimelineNode.jsx
// Single timeline node rendered inside the SVG.
// Handles size variants (standard/key/large/small) and tap callback.

const SIZE_CONFIG = {
  standard: { r: 11, glowR: 24 },
  key:      { r: 13, glowR: 28 },
  large:    { r: 18, glowR: 50 },
  small:    { r: 7,  glowR: 16 },
};

// label offsets: place label to the right of the node by default
const LABEL_OFFSET_X = 14;
const LABEL_OFFSET_Y = 5;

export function TimelineNode({ item, mode, onTap }) {
  const { id, x, y, size = 'standard' } = item;
  const { r, glowR } = SIZE_CONFIG[size] ?? SIZE_CONFIG.standard;
  const content = item[mode] ?? item.naor;
  const isLarge = size === 'large';
  const isSmall = size === 'small';

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
      {isLarge ? (
        <>
          <circle cx={x} cy={y} r={glowR} fill="none" stroke="var(--road)" strokeWidth={0.8} opacity={0.18} />
          <circle cx={x} cy={y} r={r} fill="var(--road)" fillOpacity={0.12} stroke="var(--road)" strokeWidth={2.5} filter="url(#tl-glow)" />
        </>
      ) : (
        <circle cx={x} cy={y} r={glowR} fill="var(--road)" fillOpacity={isSmall ? 0.03 : 0.04} />
      )}

      {/* main circle */}
      {!isLarge && (
        <circle
          cx={x} cy={y} r={r}
          fill="#0c0c1a"
          stroke="var(--road)"
          strokeWidth={isSmall ? 1 : 1.5}
          strokeOpacity={isSmall ? 0.35 : size === 'key' ? 0.55 : 0.28}
        />
      )}

      {/* label */}
      <text
        x={x + LABEL_OFFSET_X}
        y={y + LABEL_OFFSET_Y}
        fill="var(--road)"
        fillOpacity={isLarge ? 0.85 : isSmall ? 0.45 : 0.55}
        fontSize={isLarge ? 17 : isSmall ? 12 : 15}
        fontFamily="var(--font-family, sans-serif)"
        pointerEvents="none"
      >
        {content.title}
      </text>
    </g>
  );
}
