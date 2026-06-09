// src/commons/pages/DashboardPage/DashboardPage.jsx
// "My Tasks" home — the workspace node tree: add tasks/containers, complete them, open a task
// to edit title/description/owner/due. State + data live in useWorkspaceTree (data-source opaque).

import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../../data/commons/workspaceQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { TaskTree } from '../../tasks/TaskTree.jsx';
import { AddNode } from '../../tasks/AddNode.jsx';
import { TaskDetailSheet } from '../../tasks/TaskDetailSheet.jsx';

export function DashboardPage() {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const shell = resolveCommonsShellContent(locale);
  const t = shell.tasks;

  const tree = useWorkspaceTree(workspace?.id);
  const [roster, setRoster] = useState([]);
  const [openTaskId, setOpenTaskId] = useState(null);

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then(r => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  const rosterById = useMemo(() => new Map(roster.map(m => [m.id, m])), [roster]);
  // store id, derive the node each render so the sheet reflects live updates
  const openTask = openTaskId ? tree.nodes.find(n => n.id === openTaskId) : null;

  return (
    <div className="commons-tasks">
      <TaskTree tree={tree} rosterById={rosterById} t={t} locale={locale} onOpenTask={setOpenTaskId} />

      <div className="commons-tasks__add">
        <AddNode t={t} onAdd={(kind, title) => tree.addNode({ kind, title })} />
      </div>

      {openTask && (
        <TaskDetailSheet
          key={openTask.id}
          task={openTask}
          roster={roster}
          t={t}
          onClose={() => setOpenTaskId(null)}
          onSave={patch => tree.saveTask(openTask.id, patch)}
          onDelete={() => { tree.removeNode(openTask.id); setOpenTaskId(null); }}
        />
      )}
    </div>
  );
}
