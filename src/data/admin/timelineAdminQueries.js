// src/data/admin/timelineAdminQueries.js
// All CRUD queries for the admin UI. Uses the authenticated supabase client.
// Components never import supabase directly — they call these functions.

import { supabase } from '../timeline/supabaseClient.js';

// ── Items ─────────────────────────────────────────────────────────────────────

export async function fetchAllItems() {
  const { data, error } = await supabase
    .from('timeline_items')
    .select('id, slug, date, event_type, size, status, visibility, naor_title, shay_title, initial_view, zoom_tier')
    .order('date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchItemBySlug(slug) {
  const { data, error } = await supabase
    .from('timeline_items')
    .select(`
      *,
      timeline_item_blocks (
        id, block_type, sort_order, visibility, content
      )
    `)
    .eq('slug', slug)
    .single();
  if (error) throw error;
  data.timeline_item_blocks.sort((a, b) => a.sort_order - b.sort_order);
  return data;
}

export async function createItem(payload) {
  const { data, error } = await supabase
    .from('timeline_items')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(id, payload) {
  const { error } = await supabase
    .from('timeline_items')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteItem(id) {
  const { error } = await supabase
    .from('timeline_items')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ── Blocks ────────────────────────────────────────────────────────────────────

export async function createBlock(itemId, blockPayload) {
  const { data, error } = await supabase
    .from('timeline_item_blocks')
    .insert({ item_id: itemId, ...blockPayload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBlock(id, blockPayload) {
  const { error } = await supabase
    .from('timeline_item_blocks')
    .update(blockPayload)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteBlock(id) {
  const { error } = await supabase
    .from('timeline_item_blocks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function reorderBlocks(blocks) {
  // blocks: array of { id, sort_order }
  const updates = blocks.map(({ id, sort_order }) =>
    supabase.from('timeline_item_blocks').update({ sort_order }).eq('id', id)
  );
  await Promise.all(updates);
}

// ── Media ─────────────────────────────────────────────────────────────────────

export async function uploadMedia(file, path) {
  const { error } = await supabase.storage
    .from('timeline-media')
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage
    .from('timeline-media')
    .getPublicUrl(path);
  return data.publicUrl;
}
