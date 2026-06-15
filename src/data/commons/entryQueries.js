// src/data/commons/entryQueries.js
// Reads/writes for the per-node "מה קרה כאן" documentation log + its Storage attachments.
// The data source (Supabase commons schema, RPCs, the commons-attachments bucket) stays hidden here.

import { commonsDb } from './commonsClient.js';
import { supabase } from '../core/supabaseClient.js';

const BUCKET = 'commons-attachments';

const ENTRY_FIELDS =
  'id, node_id, workspace_id, kind, body, url, file_name, file_size, mime, is_completion, created_by, created_at';

// Newest first.
export async function fetchEntries(nodeId) {
  const { data, error } = await commonsDb
    .from('node_entries')
    .select(ENTRY_FIELDS)
    .eq('node_id', nodeId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

// Add a note/link entry (no file). For photo/file, upload first (uploadAttachment) then pass url+meta.
export async function addEntry({ nodeId, kind, body = null, url = null, fileName = null, fileSize = null, mime = null, isCompletion = false }) {
  const { data, error } = await commonsDb.rpc('add_node_entry', {
    p_node_id: nodeId, p_kind: kind, p_body: body, p_url: url,
    p_file_name: fileName, p_file_size: fileSize, p_mime: mime, p_is_completion: isCompletion,
  });
  if (error) throw error;
  return data;
}

// Upload a photo/file to {workspace_id}/{node_id}/{rand}-{name}; returns the storage path.
export async function uploadAttachment({ workspaceId, nodeId, file }) {
  const safe = file.name.replace(/[^\w.-]+/g, '_');
  const rand = crypto.randomUUID();
  const path = `${workspaceId}/${nodeId}/${rand}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (error) throw error;
  return path;
}

// A short-lived signed URL to view a private attachment.
export async function signedUrl(path, expiresIn = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// Delete an entry. For photo/file, remove the storage object first, then the row (manager-only RPC).
export async function deleteEntry(entry) {
  if ((entry.kind === 'photo' || entry.kind === 'file') && entry.url) {
    await supabase.storage.from(BUCKET).remove([entry.url]);
  }
  const { error } = await commonsDb.rpc('delete_node_entry', { p_entry_id: entry.id });
  if (error) throw error;
}
