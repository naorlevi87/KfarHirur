// src/data/timeline/blockResolvers/video.js
// Resolves a video block for the given mode.

export function resolveVideoBlock(block, mode) {
  const side = block.content[mode] ?? block.content.naor ?? {};
  return {
    type: 'video',
    url: side.url ?? '',
    thumbnailUrl: side.thumbnail_url ?? '',
    caption: side.caption ?? '',
  };
}
