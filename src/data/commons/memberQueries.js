// src/data/commons/memberQueries.js
// Admin reads/writes for workspace membership (commons.workspace_members). Invite flow wrappers
// are added in Phase C. The data source (Supabase, `commons` schema, RLS) stays hidden behind these functions.

import { commonsDb } from './commonsClient.js';

// Active members of a workspace, for the member-management screen. Goes through an admin-gated
// SECURITY DEFINER function so the email (from auth.users) can be included; returns [] for non-admins.
export async function fetchMembers(workspaceId) {
  const { data, error } = await commonsDb.rpc('list_members', { p_workspace_id: workspaceId });
  if (error) return [];
  return data ?? [];
}

export async function updateMemberLevel(memberId, level) {
  const { data, error } = await commonsDb
    .from('workspace_members').update({ permission_level: level })
    .eq('id', memberId).select('id, permission_level').single();
  if (error) throw error;
  return data;
}

// First name (display_name) + family name (last_name).
export async function updateMemberName(memberId, { firstName, lastName }) {
  const { data, error } = await commonsDb
    .from('workspace_members')
    .update({ display_name: firstName.trim() || null, last_name: lastName.trim() || null })
    .eq('id', memberId).select('id, display_name, last_name').single();
  if (error) throw error;
  return data;
}

export async function removeMember(memberId) {
  const { error } = await commonsDb.from('workspace_members').delete().eq('id', memberId);
  if (error) throw error;
}
