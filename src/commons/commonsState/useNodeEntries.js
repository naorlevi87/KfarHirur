// src/commons/commonsState/useNodeEntries.js
// The per-node documentation log ("מה קרה כאן"). Loads entries for one node and exposes add/remove.
// Components render from `entries` and never touch Supabase.

import { useCallback, useEffect, useState } from 'react';
import { fetchEntries, addEntry, uploadAttachment, deleteEntry } from '../../data/commons/entryQueries.js';

export function useNodeEntries(nodeId, workspaceId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!nodeId) return;
    setEntries(await fetchEntries(nodeId));
  }, [nodeId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!nodeId) { setLoading(false); return; }
      const rows = await fetchEntries(nodeId);
      if (!cancelled) { setEntries(rows); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [nodeId]);

  const addNote = useCallback(async ({ kind = 'note', body = null, url = null, isCompletion = false }) => {
    await addEntry({ nodeId, kind, body, url, isCompletion });
    await reload();
  }, [nodeId, reload]);

  const addFile = useCallback(async (file, kind) => {
    const path = await uploadAttachment({ workspaceId, nodeId, file });
    await addEntry({ nodeId, kind, url: path, fileName: file.name, fileSize: file.size, mime: file.type });
    await reload();
  }, [nodeId, workspaceId, reload]);

  const remove = useCallback(async (entry) => {
    await deleteEntry(entry);
    await reload();
  }, [reload]);

  return { entries, loading, reload, addNote, addFile, remove };
}
