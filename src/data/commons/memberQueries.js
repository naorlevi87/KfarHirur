// src/data/commons/memberQueries.js
// Admin reads/writes for workspace membership (commons.workspace_members) + the consent-based invite
// flow (commons.invites). The data source (Supabase, `commons` schema, RLS) stays hidden here.

import { commonsDb } from './commonsClient.js';
import { supabase } from '../core/supabaseClient.js';

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

// ── Invites ──────────────────────────────────────────────────────
// Create (or replace) a pending invite. The invitee's name is captured here so a new member
// arrives with a real name (not the email prefix). Returns { token, has_account }.
export async function createInvite(workspaceId, email, level, roleIds, firstName, lastName) {
  const { data, error } = await commonsDb.rpc('create_invite', {
    p_workspace_id: workspaceId, p_email: email.trim(), p_level: level, p_role_ids: roleIds ?? [],
    p_first_name: firstName?.trim() ?? '', p_last_name: lastName?.trim() ?? '',
  });
  if (error) throw error;
  return data;
}

export async function listInvites(workspaceId) {
  const { data, error } = await commonsDb
    .from('invites')
    .select('id, email, first_name, last_name, permission_level, status, token, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function cancelInvite(inviteId) {
  const { error } = await commonsDb.from('invites').delete().eq('id', inviteId);
  if (error) throw error;
}

// Fire the Resend email (best-effort; the copyable link is always available as a fallback).
// Edge Functions live on the BASE client, not the schema-scoped commonsDb.
export async function sendInviteEmail(payload) {
  const { error } = await supabase.functions.invoke('send-invite', { body: payload });
  if (error) throw error;
}

// ── Invitee side (matched by the signed-in user's verified email) ──
export async function myPendingInvites() {
  const { data, error } = await commonsDb.rpc('my_pending_invites');
  if (error) return [];
  return data ?? [];
}
export async function acceptInvite(token) {
  const { data, error } = await commonsDb.rpc('accept_invite', { p_token: token });
  if (error) throw error;
  return data; // workspace_id
}
export async function declineInvite(token) {
  const { error } = await commonsDb.rpc('decline_invite', { p_token: token });
  if (error) throw error;
}
