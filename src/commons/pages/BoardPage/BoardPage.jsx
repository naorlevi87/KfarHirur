// src/commons/pages/BoardPage/BoardPage.jsx
// "לוח" — the areas board. Root containers render as cards with a live open/overdue strip; tapping
// one drills into AreaPage. A virtual "general tasks" card collects top-level loose tasks. Cards
// stagger in with spring physics. FAB creates (manager/admin).

import './board.css';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { Fab } from '../../Fab.jsx';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { IconBoard } from '../../icons.jsx';
import { isOverdue } from '../../opDay.js';

// Open top-level tasks directly under an area (a parent task counts once — its sub-tasks live inside).
function countOpenTopTasks(byParent, parentId) {
  let open = 0, overdue = 0;
  for (const n of byParent.get(parentId) ?? []) {
    if (n.kind !== 'task' || n.recurrence) continue;
    if (n.status === 'open' || n.status === 'in_progress') {
      open += 1;
      if (isOverdue(n.due_date)) overdue += 1;
    }
  }
  return { open, overdue };
}

// A short strip of dots: overdue first (danger), then remaining open (accent). Caps at 7.
function Strip({ open, overdue }) {
  if (open === 0) return <span className="commons-areaCard__clear" />;
  const total = Math.min(open, 7);
  return (
    <span className="commons-areaCard__strip" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < overdue ? 'commons-dot commons-dot--late' : 'commons-dot'} />
      ))}
    </span>
  );
}

const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const cardV = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 18 } },
};

export function BoardPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const b = shell.board;
  const tree = useWorkspaceTree(workspace?.id);
  const canTask = ['admin', 'manager'].includes(permissionLevel);

  const roots = tree.byParent.get('root') ?? [];
  const areas = roots.filter(n => n.kind === 'container');
  const rootTasks = roots.filter(n => n.kind === 'task' && !n.recurrence);

  const goArea = (id) => navigate(`/commons/${workspaceSlug}/board/${id}`);

  if (tree.loading) {
    return <section className="commons-board"><CommonsLoading /></section>;
  }

  if (areas.length === 0 && rootTasks.length === 0) {
    return (
      <section className="commons-board">
        <div className="commons-board__empty">
          <span className="commons-board__emptyIcon"><IconBoard size={30} /></span>
          <p>{b.empty}</p>
        </div>
        {canTask && <Fab onClick={() => navigate(`/commons/${workspaceSlug}/task/new`)} label={shell.fab.newTaskAria} />}
      </section>
    );
  }

  return (
    <section className="commons-board">
      <motion.div className="commons-board__grid" variants={gridV} initial="hidden" animate="show">
        {areas.map(area => {
          const { open, overdue } = countOpenTopTasks(tree.byParent, area.id);
          return (
            <motion.button
              key={area.id}
              type="button"
              className="commons-areaCard"
              variants={cardV}
              whileTap={{ scale: 0.97 }}
              onClick={() => goArea(area.id)}
              aria-label={`${area.title} — ${open} ${b.open}`}
            >
              <span className="commons-areaCard__name">{area.title}</span>
              <Strip open={open} overdue={overdue} />
              <span className="commons-areaCard__meta">
                <span className="commons-areaCard__count">{open}</span>
                <span className="commons-areaCard__unit">{b.open}</span>
                {overdue > 0 && <span className="commons-areaCard__late">{overdue} {b.overdue}</span>}
              </span>
            </motion.button>
          );
        })}

        {rootTasks.length > 0 && (
          <motion.button
            type="button"
            className="commons-areaCard commons-areaCard--root"
            variants={cardV}
            whileTap={{ scale: 0.97 }}
            onClick={() => goArea('root')}
            aria-label={`${b.rootAreaTitle} — ${rootTasks.length} ${b.open}`}
          >
            <span className="commons-areaCard__name">{b.rootAreaTitle}</span>
            <span className="commons-areaCard__meta">
              <span className="commons-areaCard__count">{rootTasks.length}</span>
              <span className="commons-areaCard__unit">{b.open}</span>
            </span>
          </motion.button>
        )}
      </motion.div>

      {canTask && <Fab onClick={() => navigate(`/commons/${workspaceSlug}/task/new`)} label={shell.fab.newTaskAria} />}
    </section>
  );
}
