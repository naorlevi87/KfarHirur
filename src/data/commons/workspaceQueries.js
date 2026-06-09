// src/data/commons/workspaceQueries.js
// Reads for workspace identity and the signed-in user's membership + roles.
// "Workspace" is the tenant/org domain object (kept distinct from the module name).
// The data source (Supabase, `commons` schema, RLS) is hidden behind these functions.

import { commonsDb } from './commonsClient.js';

// Every active workspace the user belongs to — drives the picker + switcher.
export async function fetchMyWorkspaces(userId) {
  const { data, error } = await commonsDb
    .from('workspace_members')
    .select('permission_level, workspaces(id, slug, name)')
    .eq('user_id', userId)
    .eq('status', 'active');
  if (error) return [];
  return (data ?? [])
    .map(r => (r.workspaces ? { ...r.workspaces, permission_level: r.permission_level } : null))
    .filter(Boolean);
}

// The workspace a slug points to, or null.
export async function fetchWorkspaceBySlug(slug) {
  const { data, error } = await commonsDb
    .from('workspaces')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

// The current user's active membership in a workspace, or null.
export async function fetchMyMembership(workspaceId, userId) {
  const { data, error } = await commonsDb
    .from('workspace_members')
    .select('id, permission_level, status, display_name')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

// The role names/colors attached to a membership.
export async function fetchMemberRoles(memberId) {
  const { data, error } = await commonsDb
    .from('member_roles')
    .select('roles(name, color)')
    .eq('member_id', memberId);
  if (error) return [];
  return (data ?? []).map(r => r.roles).filter(Boolean);
}
