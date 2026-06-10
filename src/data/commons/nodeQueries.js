// src/data/commons/nodeQueries.js
// Reads/writes for the workspace node tree (containers + tasks). The data source
// (Supabase, `commons` schema, RLS) stays hidden behind these functions.

import { commonsDb } from './commonsClient.js';

const FIELDS =
  'id, workspace_id, parent_id, kind, title, description, status, owner_id, role_ids, due_date, recurrence, next_run, template_id, position, created_at, updated_at';

// All nodes in a workspace, ordered for stable tree rendering.
export async function fetchTree(workspaceId) {
  const { data, error } = await commonsDb
    .from('nodes')
    .select(FIELDS)
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function createNode(input) {
  const { data, error } = await commonsDb.from('nodes').insert(input).select(FIELDS).single();
  if (error) throw error;
  return data;
}

export async function updateNode(id, patch) {
  const { data, error } = await commonsDb.from('nodes').update(patch).eq('id', id).select(FIELDS).single();
  if (error) throw error;
  return data;
}

// Status changes go through a SECURITY DEFINER RPC so any active member can complete a task,
// even though direct table writes are restricted to managers/admins.
export async function setNodeStatus(id, status) {
  const { data, error } = await commonsDb.rpc('set_node_status', { node_id: id, new_status: status });
  if (error) throw error;
  return data;
}

export async function deleteNode(id) {
  const { error } = await commonsDb.from('nodes').delete().eq('id', id);
  if (error) throw error;
}

export async function moveNode(id, parentId, position) {
  return updateNode(id, { parent_id: parentId, position });
}

// Mark a task and all its descendant tasks done (the rollup trigger then completes ancestors).
// SECURITY DEFINER RPC so any active member can run the cascade.
export async function completeSubtree(id) {
  const { data, error } = await commonsDb.rpc('complete_subtree', { node_id: id });
  if (error) throw error;
  return data;
}

// "עלי" — take an unassigned task onto the signed-in member (server sets owner_id). Returns the row.
export async function claimNode(id) {
  const { data, error } = await commonsDb.rpc('claim_node', { node_id: id });
  if (error) throw error;
  return data;
}
