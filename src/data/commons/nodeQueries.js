// src/data/commons/nodeQueries.js
// Reads/writes for the workspace node tree (containers + tasks). The data source
// (Supabase, `commons` schema, RLS) stays hidden behind these functions.

import { commonsDb } from './commonsClient.js';

const FIELDS =
  'id, workspace_id, parent_id, kind, title, description, status, owner_id, due_date, recurrence, next_run, position, created_at';

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

export async function setNodeStatus(id, status) {
  return updateNode(id, { status });
}

export async function deleteNode(id) {
  const { error } = await commonsDb.from('nodes').delete().eq('id', id);
  if (error) throw error;
}

export async function moveNode(id, parentId, position) {
  return updateNode(id, { parent_id: parentId, position });
}
