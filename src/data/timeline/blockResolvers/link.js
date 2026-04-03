// src/data/timeline/blockResolvers/link.js
// Resolves a link block for the given mode.

export function resolveLinkBlock(block, mode) {
  const side = block.content[mode] ?? block.content.naor ?? {};
  return {
    type: 'link',
    label: side.label ?? '',
    url: side.url ?? '',
  };
}
