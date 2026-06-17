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
import { buildRecurrenceSummary, effectiveDaysFor } from './recurrence.js';
import { inheritedSubDefaults } from './subDefaults.js';
import { SelectField } from '../SelectField.jsx';
import { ConfirmDialog } from '../ConfirmDialog.jsx';
import { CompletionSheet } from './CompletionSheet.jsx';
import { DocumentationBox } from './DocumentationBox.jsx';
import { ActivityLog } from './ActivityLog.jsx';
import { StandingAttachments } from './StandingAttachments.jsx';
import { addEntry } from '../../data/commons/entryQueries.js';
import { CommonsLoading } from '../CommonsLoading.jsx';
import { currentOpDayStart, isOverdue } from '../opDay.js';
import { IconCheck, IconRepeat, IconClock, IconPlus, IconInfo } from '../icons.jsx';
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
// A row's "עד שעה": a definition carries due_time ("HH:MM[:ss]"); an instance carries a dated due_date.
function rowTime(k, locale) {
  if (k.due_time) return k.due_time.slice(0, 5);
  if (k.due_date) return timeOf(k.due_date, locale);
  return '';
}
// Pre-08:00 belongs to the next calendar morning of the op-day — show a "↪" hint.
function rowTimeNextDay(k) {
  if (k.due_time) return parseInt(k.due_time.slice(0, 2), 10) < 8;
  if (k.due_date) return new Date(k.due_date).getHours() < 8;
  return false;
}
// Does this run item's definition run again tomorrow? (If so, no "defer to tomorrow" — it returns on
// its own; only "not needed this time".) A daily item always recurs tomorrow. Ad-hoc one-offs (no
// template) do not recur. `nodes` is the flat tree; `template_id` points at the source definition.
function recursTomorrow(item, nodes) {
  if (!item.template_id) return false;
  const days = effectiveDaysFor(nodes, item.template_id);
  const t = currentOpDayStart();
  t.setDate(t.getDate() + 1);
  return days.includes(t.getDay());
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
  const [editChoice, setEditChoice] = useState(false); // instance edit: series vs today-only
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
  // Editing an instance forks: "the series" (its definition) vs "today only" (this occurrence). The
  // choice is offered in a dialog; a definition edits directly.
  const isInstanceNode = !!node?.occurrence_date;
  const goEdit = (id) => navigate(`/commons/${workspaceSlug}/task/${id}/edit`);
  const canEdit = node
    ? (node.kind === 'container' ? permissionLevel === 'admin' : canManage)
    : false;
  const editAction = canEdit ? (
    <button type="button" className="commons-topbar__action"
      onClick={() => { if (isInstanceNode) setEditChoice(true); else goEdit(nodeId); }}>{v.edit}</button>
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

  // A base/definition (template) vs a run instance. A base order sits under a routine with no
  // occurrence_date; the routine root carries its own recurrence. Bases declare capability + cadence
  // + an assignment choice — never a status or a per-day claim.
  const underRoutine = !isRun && (() => {
    let c = tree.nodes.find(n => n.id === node.parent_id);
    while (c) { if (c.recurrence) return true; c = tree.nodes.find(n => n.id === c.parent_id); }
    return false;
  })();
  const isBase = isRoutine || underRoutine;
  const baseDays = underRoutine ? effectiveDaysFor(tree.nodes, node.id) : [];
  const baseDaysText = baseDays.length === 7 ? v.everyDay : baseDays.map(d => rc.dayShort[d]).join(' ');

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
    // Inherit the parent's assignment + who-can; due_time only applies to a definition (not an occurrence).
    const inh = inheritedSubDefaults(node);
    await tree.addNode({
      parentId: node.id, kind: 'task', title,
      occurrenceDate: node.occurrence_date ?? undefined,
      ownerId: inh.ownerId, roleIds: inh.roleIds,
      dueTime: node.occurrence_date ? undefined : inh.dueTime,
    });
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
  async function doDefer(toDate) { await tree.deferRun(deferItem.id, toDate); setDeferItem(null); navigate(-1); }
  async function doSkip() { await tree.cancelRun(deferItem.id); setDeferItem(null); navigate(-1); }
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
            {hasNote && <span className="commons-subRow__note" title={k.description.trim()} aria-label={v.hasNote}><IconInfo size={14} /></span>}
          </span>
          {kDone && !kHasKids && completer && (
            <span className="commons-subRow__meta">
              {v.statusDone} · {completer.display_name ?? '—'}
              {k.completed_at ? ` · ${timeOf(k.completed_at, locale)}` : ''}{k.completed_late ? ` · ${v.late}` : ''}
            </span>
          )}
        </button>

        {rowTime(k, locale) && (
          <span className={overdue && !kDone ? 'commons-chip commons-chip--due' : 'commons-chip'}>
            {rowTimeNextDay(k) ? '↪ ' : ''}{rc.until} {rowTime(k, locale)}
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
          {!isBase && (
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
          {underRoutine && baseDaysText && (
            <span className="commons-view__chip">{v.settingsDays}: {baseDaysText}</span>
          )}
          {underRoutine && node.due_time && (
            <span className="commons-view__chip"><IconClock size={14} /> {rc.until} {node.due_time.slice(0, 5)}</span>
          )}
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
                <span>{ownerName ?? v.ownerOpen}</span>
              </>
            )}
            {!owner && node.kind === 'task' && canClaim && !isBase
              && (node.status === 'open' || node.status === 'in_progress') && (
              <button type="button" className="commons-claim commons-claim--lg" aria-label={shell.tasks.claimAria}
                onClick={() => tree.claim(node.id)}>
                <img src={raiseHand} alt="" className="commons-claim__icon" /> {shell.tasks.claim}
              </button>
            )}
          </div>
        </div>
        {node.description?.trim() && (
          <div className="commons-view__block">
            <div className="commons-view__desc">{node.description}</div>
          </div>
        )}

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

            {!isBase && (
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
                {isRun && canManage && (node.status === 'open' || node.status === 'in_progress') && (
                  <button type="button" className="commons-btn commons-btn--ghost commons-view__defer commons-cancelBtn"
                    onClick={() => openDefer(node)}>{v.deferTitle}</button>
                )}
              </div>
            )}

            {isRoutine && canManage && (
              <div className="commons-view__actions">
                <button type="button" className="commons-btn commons-btn--ghost" onClick={doClone}>{v.cloneRoutine}</button>
              </div>
            )}

            {isBase && (
              <StandingAttachments nodeId={node.id} workspaceId={workspace.id} v={v} canManage={canManage} />
            )}

            {!isBase && (
              <>
                <div className="commons-formDivider" aria-hidden="true" />
                {isRun && node.template_id && (
                  <StandingAttachments nodeId={node.template_id} workspaceId={workspace.id} v={v} readOnly />
                )}
                <DocumentationBox
                  nodeId={node.id} workspaceId={workspace.id} v={v} locale={locale}
                  roster={roster} canManage={canManage} />
                <ActivityLog nodes={tree.nodes} nodeId={node.id} v={v} locale={locale} roster={roster} />
              </>
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
          destructive={false}
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

      {editChoice && (
        <div className="commons-sheetRoot">
          <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={() => setEditChoice(false)} />
          <div className="commons-confirm" role="dialog" aria-modal="true" aria-label={v.editSeriesTitle}>
            <h2 className="commons-confirm__title">{v.editSeriesTitle}</h2>
            <p className="commons-confirm__body">{v.editSeriesBody}</p>
            <div className="commons-confirm__actions commons-confirm__actions--stack">
              <button type="button" className="commons-btn commons-btn--primary"
                onClick={() => { setEditChoice(false); goEdit(node.template_id); }}>{v.editSeriesConfirm}</button>
              <button type="button" className="commons-btn commons-btn--ghost"
                onClick={() => { setEditChoice(false); goEdit(nodeId); }}>{v.editTodayOnly}</button>
              <button type="button" className="commons-btn commons-btn--ghost"
                onClick={() => setEditChoice(false)}>{shell.form.cancel}</button>
            </div>
          </div>
        </div>
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

      {deferItem && (() => {
        const canTomorrow = !recursTomorrow(deferItem, tree.nodes);
        return (
          <div className="commons-sheetRoot">
            <div className="commons-sheetBackdrop" role="presentation" aria-hidden="true" onClick={() => setDeferItem(null)} />
            <div className="commons-confirm" role="dialog" aria-modal="true" aria-label={v.deferTitle}>
              <h2 className="commons-confirm__title">{v.deferTitle}</h2>
              <div className="commons-deferMenu">
                {canTomorrow && (
                  <button type="button" className="commons-btn commons-btn--ghost" onClick={() => doDefer(tomorrowStr())}>
                    <span aria-hidden="true">🙆</span> {v.deferTomorrow}
                  </button>
                )}
                <div className="commons-deferMenu__date">
                  <input type="date" className="commons-field__input" value={deferDate} onChange={e => setDeferDate(e.target.value)} aria-label={v.deferDate} />
                  <button type="button" className="commons-btn commons-btn--ghost" disabled={!deferDate} onClick={() => doDefer(deferDate)}>
                    <span aria-hidden="true">📅</span> {v.deferDate}
                  </button>
                </div>
                <button type="button" className="commons-btn commons-btn--ghost commons-cancelOpt" onClick={doSkip}>
                  <span aria-hidden="true">🤷</span> {v.deferSkip}
                </button>
              </div>
              <div className="commons-confirm__actions">
                <button type="button" className="commons-btn commons-btn--ghost" onClick={() => setDeferItem(null)}>{shell.form.cancel}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
