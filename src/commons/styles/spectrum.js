// src/commons/styles/spectrum.js
// Maps a completion fraction (0..1) to the Commons progress spectrum: orange → yellow → green → blue →
// purple. NO red — low/empty is warm orange ("just starting", never "behind"). The filled arc is a
// single solid hue chosen by the fraction; the big ring blooms into a full rainbow at 100%. Pure; used
// by the snapshot ring and the week cakes. Keep in sync with --commons-spectrum-*.

export const SPECTRUM = ['#ff9a3d', '#ffce4d', '#5cd66e', '#46c0ff', '#9a6bff']; // orange → purple, no red

const clamp = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

// The single hue for a given fraction (orange at 0 → purple at 1).
export function spectrumHex(fraction) {
  const f = clamp(fraction);
  const idx = Math.min(SPECTRUM.length - 1, Math.floor(f * SPECTRUM.length));
  return SPECTRUM[idx];
}

// Conic for the big ring: fill [0, fraction] with the solid hue; the rest transparent.
// At 100% the whole wheel becomes a full rainbow (the celebration). Small cakes use cakeBg() instead.
export function spectrumConic(fraction) {
  const f = clamp(fraction);
  if (f >= 1) {
    return `conic-gradient(${SPECTRUM.join(', ')}, ${SPECTRUM[0]})`; // full rainbow wheel
  }
  const hex = spectrumHex(f);
  const pct = Math.round(f * 100);
  return `conic-gradient(${hex} 0 ${pct}%, transparent ${pct}%)`;
}

// Pie for a small week-cake: a wedge cut to the fraction in that fraction's hue, the rest a neutral
// track. Ends at solid purple at 100% (no rainbow — that's reserved for the big ring).
export function cakeConic(fraction, track = '#14161f') {
  const f = clamp(fraction);
  const hex = spectrumHex(f);
  if (f >= 1) return `conic-gradient(${hex} 0 100%)`;
  const pct = Math.round(f * 100);
  return `conic-gradient(${hex} 0 ${pct}%, ${track} ${pct}% 100%)`;
}
