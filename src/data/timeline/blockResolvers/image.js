// src/data/timeline/blockResolvers/image.js
// Resolves an image block for the given mode.

export function resolveImageBlock(block, mode) {
  const side = block.content[mode] ?? block.content.naor ?? {};
  return {
    type: 'image',
    url: side.url ?? '',
    caption: side.caption ?? '',
  };
}
