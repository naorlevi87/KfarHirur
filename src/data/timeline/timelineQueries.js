// src/data/timeline/timelineQueries.js
// Raw DB queries for timeline data. Returns DB rows — no resolution, no geometry.

import { supabase } from './supabaseClient.js';

const ITEM_FIELDS = `
  id,
  slug,
  date,
  event_type,
  size,
  zoom_tier,
  initial_view,
  status,
  visibility,
  locale,
  naor_title,
  shay_title,
  naor_label,
  shay_label,
  timeline_item_blocks (
    id,
    block_type,
    sort_order,
    visibility,
    content
  )
`;

function sortBlocks(item) {
  return {
    ...item,
    timeline_item_blocks: [...item.timeline_item_blocks].sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  };
}

// Fetches all published items with their blocks, ordered by date.
export async function fetchTimelineItems() {
  const { data, error } = await supabase
    .from('timeline_items')
    .select(ITEM_FIELDS)
    .eq('status', 'published')
    .order('date', { ascending: true });

  if (error) throw error;
  return data.map(sortBlocks);
}

// Fetches a single published item by slug, including its blocks.
export async function fetchTimelineItemBySlug(slug) {
  const { data, error } = await supabase
    .from('timeline_items')
    .select(ITEM_FIELDS)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) throw error;
  return sortBlocks(data);
}
