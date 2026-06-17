// src/data/commons/nodeQueries.js
// Reads/writes for the workspace node tree (containers + tasks). The data source
// (Supabase, `commons` schema, RLS) stays hidden behind these functions.

import { commonsDb } from './commonsClient.js';

const FIELDS =
  'id, workspace_id, parent_id, kind, title, description, status, owner_id, role_ids, due_date, start_date, recurrence, next_run, template_id, occurrence_date, day_mask, due_time, show_from, completed_by, completed_at, completed_late, proposed_to, proposed_by, proposed_at, position, created_at, updated_at, confirm_on_complete';

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

// Deep-copy a definition subtree (routine + orders, or any task/folder). Returns the new root id.
export async function cloneNode(id) {
  const { data, error } = await commonsDb.rpc('clone_node', { node_id: id });
  if (error) throw error;
  return data;
}

// Cancel a whole run for its day (cascade its subtree to 'cancelled'). Manager+.
export async function cancelRun(id) {
  const { data, error } = await commonsDb.rpc('cancel_run', { node_id: id });
  if (error) throw error;
  return data;
}

// Release a task's owner — a member removing themselves, or a manager clearing anyone.
export async function unclaimNode(id) {
  const { data, error } = await commonsDb.rpc('unclaim_node', { node_id: id });
  if (error) throw error;
  return data;
}

// "זה כן קרה" — record a missed occurrence as a late completion attributed to a member (didBy) and,
// optionally, when it actually happened (doneAt, an ISO string; defaults to now server-side).
// Member-allowed; the row keeps completed_late computed against doneAt. didBy is a workspace_members.id.
export async function resolveMissed(id, didBy, doneAt) {
  const { data, error } = await commonsDb.rpc('resolve_missed', {
    node_id: id, did_by: didBy ?? null, done_at: doneAt ?? null,
  });
  if (error) throw error;
  return data;
}

// "מציע ל-X": suggest a free task to a teammate (flat invite, any active member). memberId is a
// workspace_members.id. The task stays open and gains a "proposed_to" marker until the teammate responds.
export async function proposeNode(id, memberId) {
  const { data, error } = await commonsDb.rpc('propose_node', { node_id: id, to_member: memberId });
  if (error) throw error;
  return data;
}

// Respond to a proposal (only the proposed member): accept → it becomes theirs; pass → back to open.
export async function respondProposal(id, accept) {
  const { data, error } = await commonsDb.rpc('respond_proposal', { node_id: id, accept });
  if (error) throw error;
  return data;
}

// Defer/skip a single occurrence (manager+). toDate null → skip ('cancelled'); else mark this one
// 'deferred' and spawn an open instance on the target op-day. toDate is a 'YYYY-MM-DD' string.
export async function deferOccurrence(id, toDate) {
  const { data, error } = await commonsDb.rpc('defer_occurrence', { node_id: id, to_date: toDate ?? null });
  if (error) throw error;
  return data;
}

// Defer a whole run subtree (run root, parent item, or leaf) to a target op-day (manager+). Cascades
// the subtree to 'deferred' and re-creates it on to_date with structure preserved. 'YYYY-MM-DD'.
export async function deferRun(id, toDate) {
  const { data, error } = await commonsDb.rpc('defer_run', { node_id: id, to_date: toDate });
  if (error) throw error;
  return data;
}
