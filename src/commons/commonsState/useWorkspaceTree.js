// src/commons/commonsState/useWorkspaceTree.js
// Loads the node tree for a workspace and exposes CRUD actions with optimistic updates.
// Components call this hook and render from `byParent` — they never touch Supabase.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from '../../app/appState/AccountContext.jsx';
import {
  fetchTree,
  createNode,
  updateNode,
  setNodeStatus,
  deleteNode,
  completeSubtree as completeSubtreeQuery,
  claimNode as claimNodeQuery,
  resolveMissed as resolveMissedQuery,
  deferOccurrence as deferOccurrenceQuery,
} from '../../data/commons/nodeQueries.js';

export function useWorkspaceTree(workspaceId) {
  const { user } = useAccount();
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

  // Create a node. occurrenceDate/dayMask/dueTime are optional: occurrenceDate makes it an
  // ad-hoc run instance (e.g. "+ הוסף משימה" on a run); dayMask/dueTime belong to definition items.
  const addNode = useCallback(async ({ parentId = null, kind, title, occurrenceDate, dayMask, dueTime }) => {
    const input = {
      workspace_id: workspaceId,
      parent_id: parentId,
      kind,
      title: title.trim(),
      status: kind === 'task' ? 'open' : null,
      created_by: user?.id ?? null,
      position: Date.now(),
    };
    if (occurrenceDate) input.occurrence_date = occurrenceDate;
    if (dayMask) input.day_mask = dayMask;
    if (dueTime) input.due_time = dueTime;
    const created = await createNode(input);
    setNodes(prev => [...prev, created]);
    return created;
  }, [workspaceId, user]);

  const toggleDone = useCallback(async (node) => {
    const next = node.status === 'done' ? 'open' : 'done';
    setNodes(prev => prev.map(n => (n.id === node.id ? { ...n, status: next } : n)));
    try {
      await setNodeStatus(node.id, next);
      await reload();   // resync ancestor statuses the rollup trigger may have changed
    } catch {
      setNodes(prev => prev.map(n => (n.id === node.id ? { ...n, status: node.status } : n)));
    }
  }, [reload]);

  const completeSubtree = useCallback(async (id) => {
    await completeSubtreeQuery(id);
    await reload();
  }, [reload]);

  const claim = useCallback(async (id) => {
    const updated = await claimNodeQuery(id);
    setNodes(prev => prev.map(n => (n.id === id ? updated : n)));
    return updated;
  }, []);

  // "זה כן קרה" — resolve a missed occurrence as a late completion by `didBy` (a member id, or null).
  const resolveMissed = useCallback(async (id, didBy) => {
    const updated = await resolveMissedQuery(id, didBy);
    setNodes(prev => prev.map(n => (n.id === id ? updated : n)));
    return updated;
  }, []);

  // Defer (toDate = 'YYYY-MM-DD') or skip (toDate null) one occurrence. Reload to pick up any spawned instance.
  const deferOccurrence = useCallback(async (id, toDate) => {
    await deferOccurrenceQuery(id, toDate);
    await reload();
  }, [reload]);

  // Leaf-descendant progress for a node: { done, total } over tasks with no task-children.
  const progress = useCallback((id) => {
    let done = 0, total = 0;
    const walk = (pid) => {
      for (const child of byParent.get(pid) ?? []) {
        if (child.kind !== 'task') continue;
        const kids = (byParent.get(child.id) ?? []).filter(n => n.kind === 'task');
        if (kids.length === 0) { total += 1; if (child.status === 'done') done += 1; }
        else walk(child.id);
      }
    };
    walk(id);
    return { done, total };
  }, [byParent]);

  const hasChildren = useCallback(
    (id) => (byParent.get(id) ?? []).some(n => n.kind === 'task'),
    [byParent]);

  const saveTask = useCallback(async (id, patch) => {
    const updated = await updateNode(id, patch);
    setNodes(prev => prev.map(n => (n.id === id ? updated : n)));
    return updated;
  }, []);

  const removeNode = useCallback(async (id) => {
    await deleteNode(id);
    await reload();
  }, [reload]);

  return { nodes, byParent, loading, addNode, toggleDone, saveTask, removeNode, reload, completeSubtree, claim, resolveMissed, deferOccurrence, progress, hasChildren };
}
