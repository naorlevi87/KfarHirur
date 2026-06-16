// src/commons/styles/spectrum.js
// Maps a completion fraction (0..1) to the Commons progress spectrum: red → orange → yellow → green →
// blue → purple. The whole filled arc is a SINGLE colour, chosen by the fraction (not a gradient
// sweep). Pure; used by the snapshot ring and the week strip. Keep in sync with --commons-spectrum-*.

export const SPECTRUM = ['#ff5a5a', '#ff9a3d', '#ffce4d', '#5cd66e', '#46c0ff', '#9a6bff'];

const clamp = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

// The single hue for a given fraction (red at 0 → purple at 1).
export function spectrumHex(fraction) {
  const f = clamp(fraction);
  const idx = Math.min(SPECTRUM.length - 1, Math.floor(f * SPECTRUM.length));
  return SPECTRUM[idx];
}

// A conic-gradient that fills [0, fraction] with the SOLID hue for that fraction; the rest transparent.
// At 100% the whole ring is the solid purple.
export function spectrumConic(fraction) {
  const f = clamp(fraction);
  const hex = spectrumHex(f);
  if (f >= 1) return `conic-gradient(${hex} 0 100%)`;
  const pct = Math.round(f * 100);
  return `conic-gradient(${hex} 0 ${pct}%, transparent ${pct}%)`;
}
