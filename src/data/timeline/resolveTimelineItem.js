// src/data/timeline/resolveTimelineItem.js
// Resolves a raw DB item for the given mode.
// - Applies visibility filtering (item and blocks)
// - Picks naor/shay title + label
// - Resolves all blocks via resolveBlock
// - Returns a flat semantic payload — no DB field names, no naor/shay keys visible
// - Attaches geometry (x, y, tx, ty) passed in from the caller

import { resolveBlock } from './resolveBlock.js';
import { ZOOM_TIER_SCALE } from '../../features/timeline/timelineData.js';

// Returns null if this item should not appear for the given mode.
export function resolveTimelineItem(rawItem, mode, geometry) {
  const { visibility } = rawItem;

  if (visibility === 'naor_only' && mode !== 'naor') return null;
  if (visibility === 'shay_only' && mode !== 'shay') return null;

  const title = mode === 'shay' ? (rawItem.shay_title ?? rawItem.naor_title ?? '')
                                : (rawItem.naor_title ?? '');
  const label = mode === 'shay' ? (rawItem.shay_label ?? rawItem.naor_label ?? '')
                                : (rawItem.naor_label ?? '');

  const blocks = (rawItem.timeline_item_blocks ?? [])
    .filter(block => {
      if (block.visibility === 'naor_only' && mode !== 'naor') return false;
      if (block.visibility === 'shay_only' && mode !== 'shay') return false;
      return true;
    })
    .map(block => resolveBlock(block, mode))
    .filter(Boolean);

  // content shape maintains backward compat with existing timeline components.
  // First text block provides content.text; title + label come from item fields.
  const firstText = blocks.find(b => b.type === 'text');
  const content = {
    tag:   label,
    title,
    text:  firstText?.text ?? '',
  };

  // zoom_tier (0|1|2) is a semantic level stored in DB — map to canvas scale here.
  // Falls back to initial_view for legacy rows that predate zoom_tier.
  const tier = rawItem.zoom_tier ?? (rawItem.initial_view ? 0 : 1);
  const rawMinScale = ZOOM_TIER_SCALE[tier] ?? ZOOM_TIER_SCALE[0];

  return {
    id:          rawItem.id,
    slug:        rawItem.slug,
    date:        rawItem.date,
    eventType:   rawItem.event_type,
    size:        rawItem.size,
    minScale:    rawMinScale,
    // geometry attached from timelinePath — null when resolving without canvas position
    x:  geometry?.x  ?? null,
    y:  geometry?.y  ?? null,
    tx: geometry?.tx ?? null,
    ty: geometry?.ty ?? null,
    // resolved content
    content,
    blocks,
  };
}
