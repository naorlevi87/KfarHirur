// src/data/timeline/blockResolvers/text.js
// Resolves a text block for the given mode.

export function resolveTextBlock(block, mode) {
  const side = block.content[mode] ?? block.content.naor ?? {};
  return {
    type: 'text',
    text: side.text ?? '',
  };
}
