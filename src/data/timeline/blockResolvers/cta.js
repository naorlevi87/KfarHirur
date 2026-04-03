// src/data/timeline/blockResolvers/cta.js
// Resolves a CTA block for the given mode.

export function resolveCtaBlock(block, mode) {
  const side = block.content[mode] ?? block.content.naor ?? {};
  return {
    type: 'cta',
    label: side.label ?? '',
    url: side.url ?? '',
    style: side.style ?? 'primary',
  };
}
