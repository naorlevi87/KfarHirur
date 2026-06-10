// src/data/commons/roleQueries.js
// Reads/writes for the workspace skills catalogue (commons.roles) and member skills (member_roles).
// The data source (Supabase, `commons` schema, RLS) stays hidden behind these functions.

import { commonsDb } from './commonsClient.js';

// All skills in a workspace.
export async function fetchRoles(workspaceId) {
  const { data, error } = await commonsDb
    .from('roles')
    .select('id, name, color')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });
  if (error) return [];
  return data ?? [];
}

export async function createRole({ workspaceId, name, color }) {
  const { data, error } = await commonsDb
    .from('roles')
    .insert({ workspace_id: workspaceId, name: name.trim(), color: color ?? null })
    .select('id, name, color').single();
  if (error) throw error;
  return data;
}

export async function updateRole(id, patch) {
  const { data, error } = await commonsDb
    .from('roles').update(patch).eq('id', id).select('id, name, color').single();
  if (error) throw error;
  return data;
}

export async function deleteRole(id) {
  const { error } = await commonsDb.from('roles').delete().eq('id', id);
  if (error) throw error;
}

// member_id -> array of { id, name, color } for every active member of the workspace.
export async function fetchMemberRolesMap(workspaceId) {
  const { data, error } = await commonsDb
    .from('member_roles')
    .select('member_id, roles!inner(id, name, color), workspace_members!inner(workspace_id)')
    .eq('workspace_members.workspace_id', workspaceId);
  if (error) return new Map();
  const map = new Map();
  for (const row of data ?? []) {
    if (!row.roles) continue;
    if (!map.has(row.member_id)) map.set(row.member_id, []);
    map.get(row.member_id).push(row.roles);
  }
  return map;
}

// Replace a member's skills with exactly `roleIds` (diff insert/delete on member_roles).
export async function setMemberRoles(memberId, roleIds) {
  const { data: existing } = await commonsDb
    .from('member_roles').select('role_id').eq('member_id', memberId);
  const have = new Set((existing ?? []).map(r => r.role_id));
  const want = new Set(roleIds);
  const toAdd = roleIds.filter(id => !have.has(id));
  const toRemove = [...have].filter(id => !want.has(id));
  if (toAdd.length) {
    const { error } = await commonsDb.from('member_roles')
      .insert(toAdd.map(role_id => ({ member_id: memberId, role_id })));
    if (error) throw error;
  }
  if (toRemove.length) {
    const { error } = await commonsDb.from('member_roles')
      .delete().eq('member_id', memberId).in('role_id', toRemove);
    if (error) throw error;
  }
}
