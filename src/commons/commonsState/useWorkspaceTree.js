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
  unclaimNode as unclaimNodeQuery,
  resolveMissed as resolveMissedQuery,
  assignNode as assignNodeQuery,
  deferOccurrence as deferOccurrenceQuery,
  deferRun as deferRunQuery,
  cloneNode as cloneNodeQuery,
  cancelRun as cancelRunQuery,
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
  const addNode = useCallback(async ({ parentId = null, kind, title, occurrenceDate, dayMask, dueTime, ownerId, roleIds }) => {
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
    if (ownerId) input.owner_id = ownerId;
    if (roleIds && roleIds.length) input.role_ids = roleIds;
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

  // Release ownership (member removes self, or manager clears). Returns the updated row.
  const unclaim = useCallback(async (id) => {
    const updated = await unclaimNodeQuery(id);
    setNodes(prev => prev.map(n => (n.id === id ? updated : n)));
    return updated;
  }, []);

  // "זה כן קרה" — resolve a missed occurrence as a late completion by `didBy` (a member id, or null),
  // optionally with when it happened (`doneAt`, an ISO string; defaults to now server-side).
  const resolveMissed = useCallback(async (id, didBy, doneAt) => {
    const updated = await resolveMissedQuery(id, didBy, doneAt);
    setNodes(prev => prev.map(n => (n.id === id ? updated : n)));
    return updated;
  }, []);

  // "עליו" — manager/admin assigns a task to a specific member (or null to clear ownership).
  const assign = useCallback(async (id, memberId) => {
    const updated = await assignNodeQuery(id, memberId);
    setNodes(prev => prev.map(n => (n.id === id ? updated : n)));
    return updated;
  }, []);

  // Defer (toDate = 'YYYY-MM-DD') or skip (toDate null) one occurrence. Reload to pick up any spawned instance.
  const deferOccurrence = useCallback(async (id, toDate) => {
    await deferOccurrenceQuery(id, toDate);
    await reload();
  }, [reload]);

  // Defer a whole run subtree to a target op-day (manager+). Cascades to 'deferred' and re-creates on toDate.
  const deferRun = useCallback(async (id, toDate) => {
    await deferRunQuery(id, toDate);
    await reload();
  }, [reload]);

  // Clone a definition subtree (returns the new root id); cancel a whole run for its day.
  const cloneNode = useCallback(async (id) => {
    const newId = await cloneNodeQuery(id);
    await reload();
    return newId;
  }, [reload]);
  const cancelRun = useCallback(async (id) => {
    await cancelRunQuery(id);
    await reload();
  }, [reload]);

  // Leaf-descendant progress for a node: { done, total } over tasks with no task-children.
  // Stays within the node's own layer (definition vs instance) so a routine's count doesn't
  // fold in its generated run, and a run's count doesn't fold in the template definitions.
  const progress = useCallback((id) => {
    const start = nodes.find(n => n.id === id);
    const layer = Boolean(start?.occurrence_date);
    let done = 0, total = 0;
    const walk = (pid) => {
      for (const child of byParent.get(pid) ?? []) {
        if (child.kind !== 'task' || Boolean(child.occurrence_date) !== layer) continue;
        const kids = (byParent.get(child.id) ?? []).filter(n => n.kind === 'task' && Boolean(n.occurrence_date) === layer);
        if (kids.length === 0) { total += 1; if (child.status === 'done') done += 1; }
        else walk(child.id);
      }
    };
    walk(id);
    return { done, total };
  }, [byParent, nodes]);

  const hasChildren = useCallback(
    (id) => {
      const start = nodes.find(n => n.id === id);
      const layer = Boolean(start?.occurrence_date);
      return (byParent.get(id) ?? []).some(n => n.kind === 'task' && Boolean(n.occurrence_date) === layer);
    },
    [byParent, nodes]);

  // Effective owner of a node: its own owner_id if set, else the nearest ancestor's. Derived, never
  // copied — so claiming a parent makes you owner of its sub-tasks, and claiming a sub-task overrides.
  const effectiveOwner = useCallback((node) => {
    let cur = node;
    while (cur) {
      if (cur.owner_id) return cur.owner_id;
      cur = cur.parent_id ? nodes.find(n => n.id === cur.parent_id) : null;
    }
    return null;
  }, [nodes]);

  const saveTask = useCallback(async (id, patch) => {
    const updated = await updateNode(id, patch);
    setNodes(prev => prev.map(n => (n.id === id ? updated : n)));
    return updated;
  }, []);

  const removeNode = useCallback(async (id) => {
    await deleteNode(id);
    await reload();
  }, [reload]);

  return { nodes, byParent, loading, addNode, toggleDone, saveTask, removeNode, reload, completeSubtree, claim, unclaim, assign, resolveMissed, deferOccurrence, deferRun, cloneNode, cancelRun, progress, hasChildren, effectiveOwner };
}
