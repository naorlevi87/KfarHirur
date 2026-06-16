// src/commons/styles/spectrum.js
// Maps a completion fraction (0..1) to the Commons progress spectrum: red → orange → yellow →
// green → blue → purple, closing through magenta back to red at 100%. Pure; used by the snapshot
// ring and the week strip. Keep the stops in sync with the --commons-spectrum-* tokens.

export const SPECTRUM = ['#ff5a5a', '#ff9a3d', '#ffce4d', '#5cd66e', '#46c0ff', '#9a6bff'];
const MAGENTA = '#e85ac0';

const clamp = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

// The hue that "leads" at a given fraction — the colour of the leading edge / glow / cap.
export function spectrumHex(fraction) {
  const f = clamp(fraction);
  const idx = Math.min(SPECTRUM.length - 1, Math.floor(f * SPECTRUM.length));
  return SPECTRUM[idx];
}

// A banded conic-gradient string. Each colour holds a plateau; transitions are short.
// fraction < 1 → fill ends at the fraction, remainder transparent (track shows through).
// fraction === 1 → closed wheel: purple → magenta → red at the seam.
export function spectrumConic(fraction) {
  const f = clamp(fraction);
  if (f >= 1) {
    return 'conic-gradient(' +
      '#ff5a5a 2% 12%, #ff9a3d 19% 29%, #ffce4d 36% 45%, ' +
      '#5cd66e 52% 61%, #46c0ff 68% 77%, #9a6bff 84% 90%, ' +
      `${MAGENTA} 96%, #ff5a5a 100%)`;
  }
  const pct = Math.round(f * 100);
  // Compress the 6 plateaus into the filled arc [0, pct], then go transparent.
  const stops = SPECTRUM.map((c, i) => {
    const a = Math.round((i / SPECTRUM.length) * pct);
    const b = Math.round(((i + 0.65) / SPECTRUM.length) * pct);
    return `${c} ${a}% ${b}%`;
  });
  return `conic-gradient(${stops.join(', ')}, ${spectrumHex(f)} ${pct}%, transparent ${pct}%)`;
}
