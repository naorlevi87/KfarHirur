// src/commons/pages/AreaPage/AreaPage.jsx
// One area (container) drilled in from the board: its subtree via TaskTree. Rows open the task view;
// the checkbox completes. The "root" pseudo-area lists loose top-level tasks only. FAB pre-fills
// this area as the new task's parent.

import './area.css';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../../data/commons/workspaceQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { TaskTree } from '../../tasks/TaskTree.jsx';
import { Fab } from '../../Fab.jsx';
import { IconChevronStart } from '../../icons.jsx';

export function AreaPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel, roles: myRoles } = useWorkspace();
  const { workspaceSlug, containerId } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const tree = useWorkspaceTree(workspace?.id);
  const canTask = ['admin', 'manager'].includes(permissionLevel);

  const [roster, setRoster] = useState([]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then(r => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);
  const rosterById = useMemo(() => new Map(roster.map(m => [m.id, m])), [roster]);
  const myRoleIds = useMemo(() => new Set((myRoles ?? []).map(r => r.id)), [myRoles]);

  const isRoot = containerId === 'root';
  const area = isRoot ? null : tree.nodes.find(n => n.id === containerId);
  const title = isRoot ? shell.board.rootAreaTitle : (area?.title ?? '');

  const goNew = () => navigate(`/commons/${workspaceSlug}/task/new${isRoot ? '' : `?parent=${containerId}`}`);

  return (
    <section className="commons-area">
      <header className="commons-area__head">
        <button type="button" className="commons-area__back" onClick={() => navigate(`/commons/${workspaceSlug}/board`)} aria-label={shell.board.back}>
          <IconChevronStart size={20} />
        </button>
        <h1 className="commons-area__title">{title}</h1>
      </header>

      {tree.loading ? (
        <CommonsLoading />
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
          <TaskTree
            tree={tree}
            rootId={containerId}
            rootKinds={isRoot ? ['task'] : undefined}
            rosterById={rosterById}
            myRoleIds={myRoleIds}
            t={shell.tasks}
            locale={locale}
            onOpenTask={(id) => navigate(`/commons/${workspaceSlug}/task/${id}`)}
          />
        </motion.div>
      )}

      {canTask && <Fab onClick={goNew} label={shell.fab.newTaskAria} />}
    </section>
  );
}
