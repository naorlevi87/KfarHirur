// src/data/timeline/resolveTimelineItem.js
// Resolves a raw DB item for the given mode.
// - Applies visibility filtering (item and blocks)
// - Picks naor/shay title + label
// - Resolves all blocks via resolveBlock
// - Returns a flat semantic payload — no DB field names, no naor/shay keys visible
// - Attaches geometry (x, y, tx, ty) passed in from the caller

import { resolveBlock } from './resolveBlock.js';
import { ITEM_GRADE_CONFIG, GRADE_COUNT } from '../../features/timeline/timelineData.js';

// Resolves the DB zoom_tier column to a 1-based grade (1–GRADE_COUNT).
//
// Two eras of data in the DB:
//   Legacy (old admin): zoom_tier 0 | 1 | 2  — semantic tier, not a grade.
//   New (updated admin): zoom_tier stored as grade + 100 (101–105) to avoid
//     any overlap with the old 0–2 range.
//
// Legacy mapping: 0 → grade 1 (always visible), 1 → grade 3 (mid), 2 → grade 5 (detail).
function resolveGrade(raw) {
  const g = Number(raw);
  // New-era values written by the updated admin (grade + 100).
  if (g >= 101 && g <= 100 + GRADE_COUNT) return g - 100;
  // Legacy: 0, 1, 2 from the old zoom_tier system.
  if (g === 0) return 1;
  if (g === 1) return 3;
  if (g === 2) return GRADE_COUNT;
  return 1;
}

// "1 ביוני 2017" or "יוני 2017" if no day
function formatHebrewDate(dateStr) {
  if (!dateStr) return '';
  const hasDay = dateStr.length > 7;
  const d = new Date(dateStr + (hasDay ? '' : '-01'));
  if (hasDay) return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
}

// "dd.mm.yy" — compact format for inline timeline node tags
function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const hasDay = dateStr.length > 7;
  const d = new Date(dateStr + (hasDay ? '' : '-01'));
  const dd = hasDay ? String(d.getDate()).padStart(2, '0') + '.' : '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}${mm}.${yy}`;
}

// Returns null if this item should not appear for the given mode.
export function resolveTimelineItem(rawItem, mode, geometry) {
  const { visibility } = rawItem;

  if (visibility === 'naor_only' && mode !== 'naor') return null;
  if (visibility === 'shay_only' && mode !== 'shay') return null;

  const title = mode === 'shay' ? (rawItem.shay_title ?? rawItem.naor_title ?? '')
                                : (rawItem.naor_title ?? '');

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
    tag:      formatShortDate(rawItem.date),
    fullDate: formatHebrewDate(rawItem.date),
    title,
    text:  firstText?.text ?? '',
  };

  // grade (1–GRADE_COUNT) drives both zoom visibility and visual size.
  // zoom_tier in DB stores the grade value; legacy rows (0|1|2) are mapped up.
  // Falls back to initial_view for rows that predate zoom_tier entirely.
  const rawTier = rawItem.zoom_tier ?? (rawItem.initial_view ? 0 : 1);
  const grade = resolveGrade(rawTier);

  return {
    id:          rawItem.id,
    slug:        rawItem.slug,
    date:        rawItem.date,
    eventType:   rawItem.event_type,
    grade,
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
