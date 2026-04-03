// src/data/timeline/resolveBlock.js
// Dispatcher: routes a raw DB block to the correct resolver by block_type.
// Returns a flat, mode-resolved payload. No naor/shay keys visible after this point.

import { resolveTextBlock  } from './blockResolvers/text.js';
import { resolveImageBlock } from './blockResolvers/image.js';
import { resolveVideoBlock } from './blockResolvers/video.js';
import { resolveLinkBlock  } from './blockResolvers/link.js';
import { resolveCtaBlock   } from './blockResolvers/cta.js';

const resolvers = {
  text:  resolveTextBlock,
  image: resolveImageBlock,
  video: resolveVideoBlock,
  link:  resolveLinkBlock,
  cta:   resolveCtaBlock,
};

export function resolveBlock(block, mode) {
  const fn = resolvers[block.block_type];
  // Unknown block types are silently skipped by the caller.
  if (!fn) return null;
  return fn(block, mode);
}
