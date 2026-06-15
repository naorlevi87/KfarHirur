// src/commons/tasks/TaskViewPage.jsx
// Full-screen task view. A task shows ONLY its sub-tasks (the temporal bands live one level up, in
// AreaPage). The sub-task list uses the row grammar: leaf checkbox / leaf-with-details › /
// parent caret+progress, with completion attribution. Occurrence actions on a run's items: resolve a
// missed item ("זה כן קרה", attributing who did it) and defer/skip a single occurrence (managers).
// Status / resolve / defer go through the hook (SECURITY DEFINER RPCs).

import './taskScreens.css';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { useWorkspace } from '../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../commonsState/useWorkspaceTree.js';
import { useCommonsChrome } from '../commonsState/CommonsChromeContext.jsx';
import { fetchRoster } from '../../data/commons/workspaceQueries.js';
import { fetchRoles } from '../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../resolveCommonsShellContent.js';
import { buildRecurrenceSummary } from './recurrence.js';
import { SelectField } from '../SelectField.jsx';
import { ConfirmDialog } from '../ConfirmDialog.jsx';
import { CompletionSheet } from './CompletionSheet.jsx';
import { DocumentationBox } from './DocumentationBox.jsx';
import { addEntry } from '../../data/commons/entryQueries.js';
import { CommonsLoading } from '../CommonsLoading.jsx';
import { currentOpDayStart, isOverdue } from '../opDay.js';
import { IconCheck, IconRepeat, IconClock, IconPlus } from '../icons.jsx';
import raiseHand from '../../assets/images/raise-hand.svg';

function timeOf(due, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(due)); }
  catch { return ''; }
}
function formatDue(due, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'long' }).format(new Date(due)); }
  catch { return ''; }
}
function dateStr(d) {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function TaskViewPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel, roles: myRoles, membership } = useWorkspace();
  const { workspaceSlug, nodeId } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const v = shell.view;
  const rc = shell.tasks.recurrence;
  const tree = useWorkspaceTree(workspace?.id);
  const node = tree.nodes.find(n => n.id === nodeId);

  const [roster, setRoster] = useState([]);
  const [roles, setRoles] = useState([]);
  const [adding, setAdding] = useState('');
  const [completeTarget, setCompleteTarget] = useState(null);
  const [resolveItem, setResolveItem] = useState(null);
  const [resolveWho, setResolveWho] = useState('');
  const [deferItem, setDeferItem] = useState(null);
  const [deferDate, setDeferDate] = useState('');
  const [ownerEdit, setOwnerEdit] = useState(false);
  const [ownerPick, setOwnerPick] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [sheet, setSheet] = useState(null);   // { node, conflictName, run } | null

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

  const canManage = ['admin', 'manager'].includes(permissionLevel);
  // Editing an instance is meaningless — send it to the definition it came from (the recurring task).
  const editTargetId = node?.occurrence_date ? node.template_id : nodeId;
  const canEdit = node
    ? (node.kind === 'container' ? permissionLevel === 'admin' : canManage)
    : false;
  const editAction = (canEdit && editTargetId) ? (
    <button type="button" className="commons-topbar__action"
      onClick={() => navigate(`/commons/${workspaceSlug}/task/${editTargetId}/edit`)}>{v.edit}</button>
  ) : null;
  useCommonsChrome({ title: node?.title ?? '', showBack: true, action: editAction });

  if (!node) {
    return (
      <div className="commons-screen">
        <div className="commons-screen__body">{tree.loading && <CommonsLoading />}</div>
      </div>
    );
  }

  const owner = node.owner_id ? roster.find(m => m.id === node.owner_id) : null;
  const ownerName = owner?.display_name ?? null;
  const requiredRoles = (node.role_ids ?? []).map(id => roles.find(r => r.id === id)).filter(Boolean);
  const canClaim = !(node.role_ids?.length) || (myRoles ?? []).some(r => node.role_ids.includes(r.id));
  const ownerIsMe = !!owner && membership?.id === node.owner_id;
  const ownerEditable = !!owner && node.kind === 'task' && (canManage || ownerIsMe);  // reassign (mgr) / remove self (member)
  const done = node.status === 'done';
  const missed = node.status === 'missed';
  const isRoutine = !!node.recurrence;
  const isRun = !!node.occurrence_date;                              // a run instance
  const isRunRoot = isRun && node.template_id === node.parent_id;    // the run's top node (not a deferrable item)

  // Show children on the same layer as this node: a definition lists its definitions (orders),
  // a run lists its instances. Without this, a routine's view would show its own run root as a
  // phantom sub-task (the run carries the routine's title).
  const kids = (tree.byParent.get(node.id) ?? []).filter(n => n.kind === 'task' && Boolean(n.occurrence_date) === isRun);
  const hasKids = kids.length > 0;
  const prog = tree.progress(node.id);

  // open sub-tasks of a node, same layer (used by the complete-confirm dialog)
  const openSubsOf = (target) => (tree.byParent.get(target.id) ?? []).filter(n =>
    n.kind === 'task' && Boolean(n.occurrence_date) === Boolean(target.occurrence_date) && n.status !== 'done');

  async function addSub(e) {
    e?.preventDefault?.();
    const title = adding.trim();
    if (!title) return;
    // Inside a run → an ad-hoc item carries that run's day (one-off for that day only).
    await tree.addNode({ parentId: node.id, kind: 'task', title, occurrenceDate: node.occurrence_date ?? undefined });
    setAdding('');
  }
  const myMid = membership?.id ?? null;
  // Decide how a completion proceeds: confirm sheet if the task is "עם אישור" OR someone else owns it
  // (effective owner, inherited up the tree). Otherwise run the action straight away.
  function requestComplete(target, run) {
    const effOwner = tree.effectiveOwner(target);
    const conflict = effOwner && effOwner !== myMid;
    const conflictName = conflict ? (roster.find(m => m.id === effOwner)?.display_name ?? '') : '';
    if (target.confirm_on_complete || conflict) setSheet({ node: target, conflictName, run });
    else run();
  }
  async function finishComplete(noteText) {
    const { node: target, run } = sheet;
    setSheet(null);
    await run();
    if (noteText) {
      try { await addEntry({ nodeId: target.id, kind: 'note', body: noteText, isCompletion: true }); }
      catch { /* note is best-effort; the completion already happened */ }
    }
  }

  // Completing a parent: confirm the moment first, then (if it still has open sub-tasks) confirm the cascade.
  function openComplete(target) {
    const open = openSubsOf(target);
    requestComplete(target, () => {
      if (open.length > 0) setCompleteTarget(target); else tree.completeSubtree(target.id);
    });
  }
  function openResolve(item) { setResolveItem(item); setResolveWho(membership?.id ?? ''); }
  async function confirmResolve() {
    await tree.resolveMissed(resolveItem.id, resolveWho || membership?.id || null);
    setResolveItem(null);
  }
  function openDefer(item) { setDeferItem(item); setDeferDate(''); }
  async function doDefer(toDate) { await tree.deferOccurrence(deferItem.id, toDate); setDeferItem(null); navigate(-1); }
  const tomorrowStr = () => { const d = currentOpDayStart(); d.setDate(d.getDate() + 1); return dateStr(d); };
  async function doClone() {
    const newId = await tree.cloneNode(node.id);
    if (newId) navigate(`/commons/${workspaceSlug}/task/${newId}`);
  }

  // One checklist row. Tap the NAME to open the item. Checkbox completes (a parent's checkbox
  // confirms via its sub-tasks first). A `!` badge marks an item that has a note. Progress sits
  // at the end. Missed leaf → "זה כן קרה" resolve.
  function ItemRow(k) {
    const kHasKids = tree.hasChildren(k.id);
    const p = kHasKids ? tree.progress(k.id) : null;
    const allDone = kHasKids && p.total > 0 && p.done === p.total;
    const kDone = kHasKids ? allDone : k.status === 'done';
    const kMissed = k.status === 'missed';
    const kClosed = k.status === 'cancelled' || k.status === 'deferred';
    const overdue = (k.status === 'open' || k.status === 'in_progress') && isOverdue(k.due_date);
    const hasNote = !!(k.description && k.description.trim());
    const completer = k.completed_by ? roster.find(m => m.id === k.completed_by) : null;
    const kOwner = k.owner_id ? roster.find(m => m.id === k.owner_id) : null;
    return (
      <li key={k.id} className="commons-subRow">
        {kMissed ? (
          <span className="commons-check commons-check--missed" aria-hidden="true" />
        ) : (
          <button type="button" className={kDone ? 'commons-check is-on' : 'commons-check'} role="checkbox"
            aria-checked={kDone} aria-label={shell.tasks.toggleDoneAria}
            onClick={() => (kHasKids ? openComplete(k) : (k.status === 'done' ? tree.toggleDone(k) : requestComplete(k, () => tree.toggleDone(k))))}>
            {kDone && <IconCheck size={14} />}
          </button>
        )}

        <button type="button" className="commons-subRow__title"
          onClick={() => navigate(`/commons/${workspaceSlug}/task/${k.id}`)}>
          <span className="commons-subRow__name">
            <span className={kDone || kClosed ? 'commons-subRow__nameText is-done' : 'commons-subRow__nameText'}>{k.title}</span>
            {kHasKids && <span className="commons-chip commons-chip--progress">{p.done}/{p.total}</span>}
            {hasNote && <span className="commons-subRow__note" title={k.description.trim()} aria-label={v.hasNote}>!</span>}
          </span>
          {kDone && !kHasKids && completer && (
            <span className="commons-subRow__meta">
              {v.statusDone} · {completer.display_name ?? '—'}
              {k.completed_at ? ` · ${timeOf(k.completed_at, locale)}` : ''}{k.completed_late ? ` · ${v.late}` : ''}
            </span>
          )}
        </button>

        {k.due_date && !kHasKids && !kDone && (
          <span className={overdue ? 'commons-chip commons-chip--due' : 'commons-chip'}>
            {new Date(k.due_date).getHours() < 8 ? '↪ ' : ''}{rc.until} {timeOf(k.due_date, locale)}
          </span>
        )}
        {kMissed && (
          <button type="button" className="commons-chip commons-chip--resolve" onClick={() => openResolve(k)}>
            {v.didHappen}
          </button>
        )}
        {k.status === 'deferred' && <span className="commons-chip">↦</span>}
        {k.status === 'cancelled' && <span className="commons-chip">—</span>}
        {kOwner && <span className="commons-owner" title={kOwner.display_name ?? ''}>{[...(kOwner.display_name ?? '?')][0]}</span>}
      </li>
    );
  }

  const canAdd = isRun || canManage;   // members add ad-hoc to a run; managers manage definitions

  return (
    <div className="commons-screen">
      <motion.div
        className="commons-screen__body"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      >
        <h1 className="commons-view__title">{node.title}</h1>
        <div className="commons-view__chips">
          {!isRoutine && (
            <span className={`commons-view__chip${done ? ' commons-view__chip--done' : missed ? ' commons-view__chip--missed' : ''}`}>
              {done ? v.statusDone : missed ? v.statusMissed : v.statusOpen}
            </span>
          )}
          {node.recurrence && (
            <span className="commons-view__chip commons-view__chip--recur">
              <IconRepeat size={14} /> {buildRecurrenceSummary(node.recurrence, rc)}
            </span>
          )}
          {node.due_date && !isRoutine && (
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
            {ownerEditable ? (
              <button type="button" className="commons-view__ownerBtn"
                onClick={() => { setOwnerPick(node.owner_id ?? ''); setOwnerEdit(true); }}>
                <span className="commons-view__avatar">{ownerName ? [...ownerName][0] : '·'}</span>
                <span>{ownerName}</span>
              </button>
            ) : (
              <>
                <span className="commons-view__avatar">{ownerName ? [...ownerName][0] : '·'}</span>
                <span>{ownerName ?? v.unassigned}</span>
              </>
            )}
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
            {(hasKids || canAdd) && (
              <div className="commons-view__block">
                <div className="commons-view__label">{v.subtasks}{hasKids ? ` · ${prog.done}/${prog.total}` : ''}</div>
                {hasKids && <ul className="commons-subs">{kids.map(ItemRow)}</ul>}
                {canAdd && (
                  <form className="commons-subAdd" onSubmit={addSub}>
                    <input className="commons-field__input" value={adding} placeholder={v.addSub}
                      onChange={e => setAdding(e.target.value)} aria-label={v.addSub} />
                    <button type="button" className="commons-btn commons-btn--primary" aria-label={v.addSubDetailed}
                      onClick={() => {
                        const t = adding.trim();
                        navigate(`/commons/${workspaceSlug}/task/new?parent=${node.id}${t ? `&title=${encodeURIComponent(t)}` : ''}`);
                      }}>
                      <IconPlus size={18} />
                    </button>
                  </form>
                )}
              </div>
            )}

            {!isRoutine && (
              <div className="commons-view__actions">
                {hasKids ? (
                  <button type="button" className="commons-btn commons-btn--primary"
                    onClick={() => openComplete(node)} disabled={prog.total === 0 || prog.done === prog.total}>
                    <IconCheck size={18} /> {v.completeAll}
                  </button>
                ) : (
                  <button type="button" className={done ? 'commons-btn commons-btn--ghost' : 'commons-btn commons-btn--primary'}
                    onClick={() => (done ? tree.toggleDone(node) : requestComplete(node, () => tree.toggleDone(node)))}>
                    {done ? v.reopen : <><IconCheck size={18} /> {v.markDone}</>}
                  </button>
                )}
                {isRun && !isRunRoot && !hasKids && canManage && (node.status === 'open' || node.status === 'in_progress') && (
                  <button type="button" className="commons-btn commons-btn--ghost commons-view__defer"
                    onClick={() => openDefer(node)}>{v.deferTitle}</button>
                )}
                {isRunRoot && canManage && (
                  <button type="button" className="commons-btn commons-btn--ghost commons-view__defer commons-deferMenu__skip"
                    onClick={() => setConfirmCancel(true)}>{v.cancelDay}</button>
                )}
              </div>
            )}

            {isRoutine && canManage && (
              <div className="commons-view__actions">
                <button type="button" className="commons-btn commons-btn--ghost" onClick={doClone}>{v.cloneRoutine}</button>
              </div>
            )}

            {!isRoutine && (
              <DocumentationBox
                nodeId={node.id} workspaceId={workspace.id} v={v} locale={locale}
                roster={roster} canManage={canManage} />
            )}
          </>
        )}
      </motion.div>

      {completeTarget && (
        <ConfirmDialog
          title={v.confirmTitle}
          body={openSubsOf(completeTarget).map(k => k.title).join(', ')}
          confirmLabel={v.completeAll}
          cancelLabel={shell.form.back}
          onConfirm={() => { const id = completeTarget.id; setCompleteTarget(null); tree.completeSubtree(id); }}
          onCancel={() => setCompleteTarget(null)}
        />
      )}

      {sheet && (
        <CompletionSheet
          v={v}
          cancelLabel={shell.form.cancel}
          title={sheet.node.title}
          ownerConflictName={sheet.conflictName}
          onConfirm={finishComplete}
          onCancel={() => setSheet(null)}
        />
      )}

      {confirmCancel && (
        <ConfirmDialog
          title={v.cancelDayTitle}
          body={v.cancelDayBody}
          confirmLabel={v.cancelDay}
          cancelLabel={shell.form.cancel}
          onConfirm={async () => { setConfirmCancel(false); await tree.cancelRun(node.id); navigate(-1); }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}

      {resolveItem && (
        <div className="commons-sheetRoot">
          <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={() => setResolveItem(null)} />
          <div className="commons-confirm" role="dialog" aria-modal="true" aria-label={v.didHappenTitle}>
            <h2 className="commons-confirm__title">{v.didHappenTitle}</h2>
            <SelectField ariaLabel={v.didHappenTitle} value={resolveWho} onChange={setResolveWho}
              placeholder={v.unassigned}
              options={roster.map(m => ({ value: m.id, label: m.display_name ?? '—' }))} />
            <div className="commons-confirm__actions">
              <button type="button" className="commons-btn commons-btn--ghost" onClick={() => setResolveItem(null)}>{shell.form.cancel}</button>
              <button type="button" className="commons-btn commons-btn--primary" onClick={confirmResolve}>{v.didHappenConfirm}</button>
            </div>
          </div>
        </div>
      )}

      {ownerEdit && (
        <div className="commons-sheetRoot">
          <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={() => setOwnerEdit(false)} />
          <div className="commons-confirm" role="dialog" aria-modal="true" aria-label={v.owner}>
            <h2 className="commons-confirm__title">{v.owner}</h2>
            {canManage ? (
              <>
                <SelectField ariaLabel={v.ownerChange} value={ownerPick} onChange={setOwnerPick}
                  placeholder={v.unassigned}
                  options={[{ value: '', label: v.unassigned }, ...roster.map(m => ({ value: m.id, label: m.display_name ?? '—' }))]} />
                <div className="commons-confirm__actions">
                  <button type="button" className="commons-btn commons-btn--ghost" onClick={() => setOwnerEdit(false)}>{shell.form.cancel}</button>
                  <button type="button" className="commons-btn commons-btn--primary"
                    onClick={async () => { await tree.saveTask(node.id, { owner_id: ownerPick || null }); setOwnerEdit(false); }}>{v.ownerSave}</button>
                </div>
              </>
            ) : (
              <div className="commons-confirm__actions">
                <button type="button" className="commons-btn commons-btn--ghost" onClick={() => setOwnerEdit(false)}>{shell.form.cancel}</button>
                <button type="button" className="commons-btn commons-btn--ghost commons-deferMenu__skip"
                  onClick={async () => { await tree.unclaim(node.id); setOwnerEdit(false); }}>{v.removeMe}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {deferItem && (
        <div className="commons-sheetRoot">
          <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={() => setDeferItem(null)} />
          <div className="commons-confirm" role="dialog" aria-modal="true" aria-label={v.deferTitle}>
            <h2 className="commons-confirm__title">{v.deferTitle}</h2>
            <div className="commons-deferMenu">
              <button type="button" className="commons-btn commons-btn--ghost" onClick={() => doDefer(tomorrowStr())}>{v.deferTomorrow}</button>
              <div className="commons-deferMenu__date">
                <input type="date" className="commons-field__input" value={deferDate} onChange={e => setDeferDate(e.target.value)} aria-label={v.deferDate} />
                <button type="button" className="commons-btn commons-btn--ghost" disabled={!deferDate} onClick={() => doDefer(deferDate)}>{v.deferDate}</button>
              </div>
              <button type="button" className="commons-btn commons-btn--ghost commons-deferMenu__skip" onClick={() => doDefer(null)}>{v.deferSkip}</button>
            </div>
            <div className="commons-confirm__actions">
              <button type="button" className="commons-btn commons-btn--ghost" onClick={() => setDeferItem(null)}>{shell.form.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
