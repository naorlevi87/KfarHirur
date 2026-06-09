// src/commons/commonsState/useWorkspaceTree.js
// Loads the node tree for a workspace and exposes CRUD actions with optimistic updates.
// Components call this hook and render from `byParent` — they never touch Supabase.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import {
  fetchTree,
  createNode,
  updateNode,
  setNodeStatus,
  deleteNode,
} from '../../data/commons/nodeQueries.js';

export function useWorkspaceTree(workspaceId) {
  const { user } = useAuth();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!workspaceId) return;
    setNodes(await fetchTree(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!workspaceId) { if (!cancelled) setLoading(false); return; }
      const rows = await fetchTree(workspaceId);
      if (!cancelled) { setNodes(rows); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [workspaceId]);

  // parent_id ('root' for top level) -> ordered children
  const byParent = useMemo(() => {
    const map = new Map();
    for (const n of nodes) {
      const key = n.parent_id ?? 'root';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    }
    return map;
  }, [nodes]);

  const addNode = useCallback(async ({ parentId = null, kind, title }) => {
    const created = await createNode({
      workspace_id: workspaceId,
      parent_id: parentId,
      kind,
      title: title.trim(),
      status: kind === 'task' ? 'open' : null,
      created_by: user?.id ?? null,
      position: Date.now(),
    });
    setNodes(prev => [...prev, created]);
    return created;
  }, [workspaceId, user]);

  const toggleDone = useCallback(async (node) => {
    const next = node.status === 'done' ? 'open' : 'done';
    setNodes(prev => prev.map(n => (n.id === node.id ? { ...n, status: next } : n)));
    try {
      await setNodeStatus(node.id, next);
    } catch {
      setNodes(prev => prev.map(n => (n.id === node.id ? { ...n, status: node.status } : n)));
    }
  }, []);

  const saveTask = useCallback(async (id, patch) => {
    const updated = await updateNode(id, patch);
    setNodes(prev => prev.map(n => (n.id === id ? updated : n)));
    return updated;
  }, []);

  const removeNode = useCallback(async (id) => {
    await deleteNode(id);
    await reload();
  }, [reload]);

  return { nodes, byParent, loading, addNode, toggleDone, saveTask, removeNode, reload };
}
