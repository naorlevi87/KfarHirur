// src/commons/tasks/TaskViewPage.jsx
// Full-screen read-only view of a task: title, status/recurrence/due chips, owner, description.
// Anyone can complete/reopen (status RPC via the hook). עריכה (→ edit form) shows for managers/admins
// on tasks, admins on folders.

import './taskScreens.css';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { useWorkspace } from '../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../data/commons/workspaceQueries.js';
import { fetchRoles } from '../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../resolveCommonsShellContent.js';
import { buildRecurrenceSummary } from './recurrence.js';
import { ConfirmDialog } from '../ConfirmDialog.jsx';
import { CommonsLoading } from '../CommonsLoading.jsx';
import { IconChevronStart, IconCheck, IconRepeat, IconClock, IconPlus } from '../icons.jsx';
import raiseHand from '../../assets/images/raise-hand.svg';

function formatDue(due, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long' }).format(new Date(due)); }
  catch { return ''; }
}

export function TaskViewPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel, roles: myRoles } = useWorkspace();
  const { workspaceSlug, nodeId } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const v = shell.view;
  const tree = useWorkspaceTree(workspace?.id);
  const node = tree.nodes.find(n => n.id === nodeId);

  const [roster, setRoster] = useState([]);
  const [roles, setRoles] = useState([]);
  const [adding, setAdding] = useState('');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then(r => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoles(workspace.id).then(rs => { if (!cancelled) setRoles(rs); });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  if (!node) {
    return (
      <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <header className="commons-screen__bar">
          <button type="button" className="commons-screen__back" onClick={() => navigate(-1)} aria-label={v.back}>
            <IconChevronStart size={20} />
          </button>
        </header>
        {tree.loading && <CommonsLoading />}
      </div>
    );
  }

  const owner = node.owner_id ? roster.find(m => m.id === node.owner_id) : null;
  const ownerName = owner?.display_name ?? null;
  const requiredRoles = (node.role_ids ?? []).map(id => roles.find(r => r.id === id)).filter(Boolean);
  const canClaim = !(node.role_ids?.length) || (myRoles ?? []).some(r => node.role_ids.includes(r.id));
  const canEdit = node.kind === 'container' ? permissionLevel === 'admin' : ['admin', 'manager'].includes(permissionLevel);
  const done = node.status === 'done';
  const missed = node.status === 'missed';

  const kids = (tree.byParent.get(node.id) ?? []).filter(n => n.kind === 'task');
  const hasKids = kids.length > 0;
  const openKids = kids.filter(k => k.status !== 'done');
  const prog = tree.progress(node.id);

  async function addSub(e) {
    e.preventDefault();
    const title = adding.trim();
    if (!title) return;
    await tree.addNode({ parentId: node.id, kind: 'task', title });
    setAdding('');
  }
  function onCompleteParent() {
    if (openKids.length > 0) { setConfirm(true); return; }
    tree.completeSubtree(node.id);
  }

  return (
    <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-screen__bar">
        <button type="button" className="commons-screen__back" onClick={() => navigate(-1)} aria-label={v.back}>
          <IconChevronStart size={20} />
        </button>
        <span className="commons-screen__title commons-screen__title--flex">{node.title}</span>
        {canEdit && (
          <button type="button" className="commons-screen__edit" onClick={() => navigate(`/commons/${workspaceSlug}/task/${nodeId}/edit`)}>
            {v.edit}
          </button>
        )}
      </header>

      <motion.div
        className="commons-screen__body"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      >
        <h1 className="commons-view__title">{node.title}</h1>
        <div className="commons-view__chips">
          <span className={`commons-view__chip${done ? ' commons-view__chip--done' : missed ? ' commons-view__chip--missed' : ''}`}>
            {done ? v.statusDone : missed ? v.statusMissed : v.statusOpen}
          </span>
          {node.recurrence && (
            <span className="commons-view__chip commons-view__chip--recur">
              <IconRepeat size={14} /> {buildRecurrenceSummary(node.recurrence, shell.tasks.recurrence)}
            </span>
          )}
          {node.due_date && (
            <span className="commons-view__chip"><IconClock size={14} /> {formatDue(node.due_date, locale)}</span>
          )}
          {requiredRoles.map(role => (
            <span key={role.id} className="commons-view__chip commons-view__chip--skill" data-role-color={role.color ?? ''}>
              {role.name}
            </span>
          ))}
        </div>

        <div className="commons-view__block">
          <div className="commons-view__label">{v.owner}</div>
          <div className="commons-view__owner">
            <span className="commons-view__avatar">{ownerName ? [...ownerName][0] : '·'}</span>
            <span>{ownerName ?? v.unassigned}</span>
            {!owner && node.kind === 'task' && canClaim && (
              <button type="button" className="commons-claim commons-claim--lg" aria-label={shell.tasks.claimAria}
                onClick={() => tree.claim(node.id)}>
                <img src={raiseHand} alt="" className="commons-claim__icon" /> {shell.tasks.claim}
              </button>
            )}
          </div>
        </div>
        <div className="commons-view__block">
          <div className={node.description?.trim() ? 'commons-view__desc' : 'commons-view__desc is-empty'}>
            {node.description?.trim() ? node.description : v.noDescription}
          </div>
        </div>

        {node.kind === 'task' && (
          <>
            {hasKids && (
              <div className="commons-view__block">
                <div className="commons-view__label">{v.subtasks} · {prog.done}/{prog.total}</div>
                <ul className="commons-subs">
                  {kids.map(k => {
                    const kHasKids = tree.hasChildren(k.id);
                    const kDone = k.status === 'done';
                    return (
                      <li key={k.id} className="commons-subRow">
                        {kHasKids ? (
                          <span className="commons-chip commons-chip--progress">
                            {(() => { const p = tree.progress(k.id); return `${p.done}/${p.total}`; })()}
                          </span>
                        ) : (
                          <button type="button" className={kDone ? 'commons-check is-on' : 'commons-check'} role="checkbox"
                            aria-checked={kDone} aria-label={shell.tasks.toggleDoneAria} onClick={() => tree.toggleDone(k)}>
                            {kDone && <IconCheck size={14} />}
                          </button>
                        )}
                        <button type="button" className={kDone ? 'commons-subRow__title is-done' : 'commons-subRow__title'}
                          onClick={() => navigate(`/commons/${workspaceSlug}/task/${k.id}`)}>{k.title}</button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <form className="commons-subAdd" onSubmit={addSub}>
              <input className="commons-field__input" value={adding} placeholder={v.addSub}
                onChange={e => setAdding(e.target.value)} aria-label={v.addSub} />
              <button
                type="button"
                className="commons-btn commons-btn--primary"
                aria-label={v.addSubDetailed}
                onClick={() => {
                  const t = adding.trim();
                  navigate(`/commons/${workspaceSlug}/task/new?parent=${node.id}${t ? `&title=${encodeURIComponent(t)}` : ''}`);
                }}
              >
                <IconPlus size={18} />
              </button>
            </form>

            {!node.recurrence && (
              <div className="commons-view__actions">
                {hasKids ? (
                  <button type="button" className="commons-btn commons-btn--primary"
                    onClick={onCompleteParent} disabled={prog.total === 0 || prog.done === prog.total}>
                    <IconCheck size={18} /> {v.completeAll}
                  </button>
                ) : (
                  <button type="button" className={done ? 'commons-btn commons-btn--ghost' : 'commons-btn commons-btn--primary'}
                    onClick={() => tree.toggleDone(node)}>
                    {done ? v.reopen : <><IconCheck size={18} /> {v.markDone}</>}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>

      {confirm && (
        <ConfirmDialog
          title={v.confirmTitle}
          body={`${v.stillOpen}: ${openKids.map(k => k.title).join(', ')}`}
          confirmLabel={v.completeAll}
          cancelLabel={shell.form.back}
          onConfirm={() => { setConfirm(false); tree.completeSubtree(node.id); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
