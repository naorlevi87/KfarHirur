// src/data/timeline/blockResolvers/embed.js
// Resolves embed blocks (youtube, facebook, instagram) — URL is shared across modes.

export function resolveEmbedBlock(block, _mode) {
  const side = block.content?.naor ?? block.content?.shay ?? {};
  return {
    type:         block.block_type, // 'youtube' | 'facebook' | 'instagram'
    url:          side.url ?? '',
    showComments: side.showComments ?? true,
  };
}
