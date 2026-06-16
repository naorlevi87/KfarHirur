// src/commons/tasks/TaskFormPage.jsx
// Create/edit form for a task or folder, rendered inside the persistent shell (the top bar is its
// chrome — declared via useCommonsChrome — not a per-screen bar). Task mode: title, location (parent),
// description, owner, due, recurrence. Folder mode: title + location only. In edit mode the loader
// waits for the node so the inner form seeds its state directly. The form tracks a `dirty` flag and
// registers it with the nav guard so leaving with unsaved changes prompts; delete is confirmed.

import './taskScreens.css';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { useWorkspace } from '../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../commonsState/useWorkspaceTree.js';
import { useCommonsChrome } from '../commonsState/CommonsChromeContext.jsx';
import { useUnsavedGuard, useNavGuard } from '../commonsState/NavGuardContext.jsx';
import { fetchRoster } from '../../data/commons/workspaceQueries.js';
import { fetchRoles } from '../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../resolveCommonsShellContent.js';
import { RecurrenceField } from './RecurrenceField.jsx';
import { SkillSelect } from './SkillSelect.jsx';
import { SelectField } from '../SelectField.jsx';
import { ConfirmDialog } from '../ConfirmDialog.jsx';
import { CommonsLoading } from '../CommonsLoading.jsx';
import { IconTrash, IconPlus } from '../icons.jsx';
import { normalizeRule, computeFirstNextRun, effectiveDaysFor } from './recurrence.js';
import { inheritedSubDefaults } from './subDefaults.js';

function toDateInput(due) {
  if (!due) return '';
  const d = new Date(due);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function toTimeInput(due) {
  if (!due) return '';
  const d = new Date(due);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(11, 16);
}
// A pre-08:00 routine item time belongs to the next calendar morning of its op-day — but only for
// generated routine occurrences (handled in run_recurrences). A one-off deadline has an explicit
// date, so it's stored literally.
function beforeOpDay(time) { return !!time && parseInt(time.slice(0, 2), 10) < 8; }
// A sub-task's "עד שעה", if any: a definition carries due_time, an occurrence item a dated due_date.
function subTime(k, locale) {
  if (k.due_time) return k.due_time.slice(0, 5);
  if (k.due_date) {
    try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(k.due_date)); }
    catch { return ''; }
  }
  return '';
}

// Spring reveal for conditional blocks / list rows (MOTION_INTENSITY 6 — no instant pop-in).
const reveal = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { type: 'spring', stiffness: 320, damping: 30 },
};
function dueToIso(date, time) {
  return new Date(`${date}T${time || '08:00'}:00`).toISOString();
}

// Brief loading state while an edited node resolves — still shows the back chevron via chrome.
function FormLoading() {
  useCommonsChrome({ title: '', showBack: true });
  return <div className="commons-screen"><div className="commons-screen__body"><CommonsLoading /></div></div>;
}

// Loader: in edit mode, hold until the node resolves, then mount the form seeded from it.
export function TaskFormPage({ mode }) {
  const { workspace } = useWorkspace();
  const { nodeId } = useParams();
  const [params] = useSearchParams();
  const tree = useWorkspaceTree(workspace?.id);

  const editing = mode === 'edit';
  const node = editing ? tree.nodes.find(n => n.id === nodeId) : null;

  if (editing && !node) return <FormLoading />;

  const kind = editing ? node.kind : (params.get('kind') === 'container' ? 'container' : 'task');
  const initialParent = editing ? (node.parent_id ?? '') : (params.get('parent') ?? '');
  const initialTitle = editing ? '' : (params.get('title') ?? '');

  return <TaskForm key={editing ? node.id : 'new'} mode={mode} node={node} kind={kind} initialParent={initialParent} initialTitle={initialTitle} tree={tree} />;
}

function TaskForm({ mode, node, kind, initialParent, initialTitle, tree }) {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const { workspaceSlug, nodeId } = useParams();
  const navigate = useNavigate();
  const { guardedNavigate } = useNavGuard();
  const shell = resolveCommonsShellContent(locale);
  const f = shell.form;
  const editing = mode === 'edit';
  const isFolder = kind === 'container';

  const [title, setTitle] = useState(node?.title ?? initialTitle ?? '');
  const parentId = initialParent; // fixed by where the task was opened (FAB/area/sub-task); no UI field
  const [description, setDescription] = useState(node?.description ?? '');
  const [ownerId, setOwnerId] = useState(node?.owner_id ?? '');
  const [due, setDue] = useState(toDateInput(node?.due_date) || toDateInput(new Date()));  // default: today
  const [recurrence, setRecurrence] = useState(node?.recurrence ?? null);
  const [roster, setRoster] = useState([]);
  const [roleIds, setRoleIds] = useState(node?.role_ids ?? []);
  const [roles, setRoles] = useState([]);
  const dirtyRef = useRef(false); // synchronous dirty flag — read live by the nav guard / blocker
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Day-mask + per-item time apply when this task sits inside a routine (an "order" definition).
  const [dayMask, setDayMask] = useState(node?.day_mask?.length ? node.day_mask : null);
  const [dueTime, setDueTime] = useState(
    node?.due_time ? node.due_time.slice(0, 5) : (node?.due_date ? toTimeInput(node.due_date) : ''));
  const [startDate, setStartDate] = useState(toDateInput(node?.start_date));  // "בתאריך" — when it becomes actionable
  const [confirmOnComplete, setConfirmOnComplete] = useState(node?.confirm_on_complete ?? true);
  const [subAdd, setSubAdd] = useState('');          // quick-add a sub-task — commits immediately
  const [removeSub, setRemoveSub] = useState(null);  // sub-task pending removal confirmation
  const mark = () => { dirtyRef.current = true; }; // any user edit arms the unsaved-changes guard

  // Same-layer child sub-tasks (live card in edit mode). Layer-aware: a definition lists its
  // definition children; an occurrence lists that day's instance children (so you can drop an item
  // from today's run without touching the series).
  const subKids = (editing && !isFolder)
    ? (tree.byParent.get(node.id) ?? []).filter(n => n.kind === 'task' && Boolean(n.occurrence_date) === Boolean(node?.occurrence_date))
    : [];

  const rcDays = shell.tasks.recurrence;
  const routineRoot = (() => {
    let c = tree.nodes.find(n => n.id === parentId);
    while (c) { if (c.recurrence) return c; c = tree.nodes.find(n => n.id === c.parent_id); }
    return null;
  })();
  const underRoutine = !isFolder && !!routineRoot;        // an order inside a routine
  const isInstance = !isFolder && !!node?.occurrence_date; // editing one run occurrence (today only)
  const parentDays = underRoutine ? effectiveDaysFor(tree.nodes, parentId) : [];
  const selectedDays = dayMask ?? parentDays;             // null mask = inherit the parent's days
  // null when "all parent days" (inherit) or empty; a strict subset is the real restriction.
  const persistMask = (selectedDays.length === 0 || selectedDays.length === parentDays.length)
    ? null : [...selectedDays].sort((a, b) => a - b);

  function toggleDay(d) {
    const set = new Set(selectedDays);
    if (set.has(d)) set.delete(d); else set.add(d);
    setDayMask([...set].sort((a, b) => a - b));
    mark();
  }

  const heading = isFolder
    ? (editing ? f.editFolderTitle : f.newFolderTitle)
    : (editing ? f.editTaskTitle : f.newTaskTitle);
  useCommonsChrome({ title: heading, showBack: true });
  useUnsavedGuard(() => dirtyRef.current, persist); // the leave dialog can Save (persist) or discard

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then(r => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  // A task with no required skills means "anyone" (כל עובד). We represent that in the picker as
  // all skills checked, so a new task (or an "anyone" task) defaults to every skill selected.
  const seedInited = useRef(false);
  const skillInited = useRef(false);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoles(workspace.id).then(rs => {
      if (cancelled) return;
      setRoles(rs);
      if (!skillInited.current && (node?.role_ids?.length ?? 0) === 0) {
        setRoleIds(rs.map(r => r.id)); // programmatic default — does NOT mark dirty
        skillInited.current = true;
      }
    });
    return () => { cancelled = true; };
  }, [workspace?.id, node]);

  // Create-with-parent: seed owner/skills/עד-שעה from the parent as editable defaults (once the
  // parent node is in the tree). Programmatic — does NOT mark dirty. Sets skillInited so the
  // all-skills default cannot clobber an inherited skill set.
  useEffect(() => {
    if (editing || !parentId || seedInited.current) return;
    const parent = tree.nodes.find(n => n.id === parentId);
    if (!parent) return;
    seedInited.current = true;
    const inh = inheritedSubDefaults(parent);
    // Defer updates out of the synchronous effect body to satisfy react-hooks/set-state-in-effect.
    Promise.resolve().then(() => {
      setOwnerId(prev => prev || inh.ownerId);
      if (inh.roleIds.length) { setRoleIds(inh.roleIds); skillInited.current = true; }
      setDueTime(prev => prev || inh.dueTime);
    });
  }, [editing, parentId, tree.nodes]);

  // Commit the form's fields. Returns true on success, false if it can't save (empty title) — the
  // leave-guard uses the boolean to decide whether to proceed. Does not navigate.
  async function persist() {
    const name = title.trim();
    if (!name) return false;
    const parent = parentId || null;
    // All-selected or none-selected both mean "anyone" → store an empty set (future-proof: it
    // stays open even when new skills are later added). A strict subset is the real restriction.
    const persistRoleIds = (roleIds.length === 0 || roleIds.length === roles.length) ? [] : roleIds;

    // An order inside a routine carries a day-mask + per-item time; it never recurs or has a due date.
    const taskFields = () => {
      const base = { description: description.trim() || null, owner_id: ownerId || null, role_ids: persistRoleIds, confirm_on_complete: confirmOnComplete };
      // A single occurrence: only identity-ish fields change; never touch the schedule/recurrence
      // (that belongs to the series). Its own due_date / occurrence_date stay as generated.
      if (isInstance) return base;
      if (underRoutine) {
        return { ...base, day_mask: persistMask, due_time: dueTime || null, recurrence: null, due_date: null, next_run: null, start_date: null };
      }
      const rule = normalizeRule(recurrence);
      return {
        ...base,
        recurrence: rule,
        due_date: rule ? null : (due ? dueToIso(due, dueTime) : null),
        next_run: rule ? computeFirstNextRun(rule) : null,
        start_date: rule ? null : (startDate || null),
      };
    };

    if (editing) {
      const patch = { title: name, parent_id: parent };
      if (!isFolder) {
        const f2 = taskFields();
        const ruleChanged = JSON.stringify(f2.recurrence) !== JSON.stringify(normalizeRule(node.recurrence ?? null));
        Object.assign(patch, f2);
        // keep an unchanged rule's existing next_run so generation isn't reset on an unrelated edit
        if (f2.recurrence && !ruleChanged && node.next_run) patch.next_run = node.next_run;
      }
      await tree.saveTask(nodeId, patch);
    } else if (isFolder) {
      await tree.addNode({ parentId: parent, kind: 'container', title: name });
    } else {
      const created = await tree.addNode({ parentId: parent, kind: 'task', title: name });
      await tree.saveTask(created.id, taskFields());
    }
    dirtyRef.current = false; // saved — leaving now is safe
    return true;
  }

  async function submit(e) {
    e.preventDefault();
    if (await persist()) navigate(-1);
  }

  async function doRemove() {
    setConfirmDelete(false);
    dirtyRef.current = false;
    await tree.removeNode(nodeId);
    navigate(`/commons/${workspaceSlug}/board`);
  }

  // Sub-task ops act immediately (a sub-task is its own object), independent of the form's Save — the
  // card is visibly marked "saves instantly". Navigations route through the guard so a dirty form warns.
  async function quickAddSub() {
    const t = subAdd.trim();
    if (!t) return;
    // Inherit the parent's assignment + who-can; due_time only applies to a definition (not an occurrence).
    const inh = inheritedSubDefaults(node);
    await tree.addNode({
      parentId: node.id, kind: 'task', title: t,
      occurrenceDate: node.occurrence_date ?? undefined,
      ownerId: inh.ownerId, roleIds: inh.roleIds,
      dueTime: node.occurrence_date ? undefined : inh.dueTime,
    });
    setSubAdd('');
  }
  function detailedAddSub() {
    // Days/time only apply to a definition — for an occurrence the "+" just quick-adds a one-off item.
    if (isInstance) { quickAddSub(); return; }
    const t = subAdd.trim();
    guardedNavigate(`/commons/${workspaceSlug}/task/new?parent=${node.id}${t ? `&title=${encodeURIComponent(t)}` : ''}`);
  }
  async function doRemoveSub() {
    const id = removeSub.id;
    setRemoveSub(null);
    await tree.removeNode(id);
  }

  return (
    <div className="commons-screen">
      <motion.form
        className="commons-screen__body"
        onSubmit={submit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      >
        <label className="commons-field">
          <span className="commons-field__label">{f.titleLabel}</span>
          <input className="commons-field__input" value={title} onChange={e => { setTitle(e.target.value); mark(); }} />
        </label>

        {!isFolder && (
          <>
            {isInstance && <p className="commons-occNote">{f.occurrenceNote}</p>}
            <label className="commons-field">
              <span className="commons-field__label">{f.description}</span>
              <textarea
                className="commons-field__input commons-field__area" rows={3}
                value={description} placeholder={f.descriptionPlaceholder}
                onChange={e => { setDescription(e.target.value); mark(); }}
              />
            </label>
            <div className="commons-fieldRow">
              <label className="commons-field">
                <span className="commons-field__label">{f.owner}</span>
                <SelectField
                  ariaLabel={f.owner}
                  value={ownerId}
                  onChange={(v) => { setOwnerId(v); mark(); }}
                  placeholder={f.ownerOpen}
                  options={[{ value: '', label: f.ownerOpen }, ...roster.map(mb => ({ value: mb.id, label: mb.display_name ?? '—' }))]}
                />
              </label>
              <div className="commons-field commons-field--grow">
                <span className="commons-field__label">{f.skill}</span>
                {roles.length === 0 ? (
                  <span className="commons-field__hint">{f.skillAnyone}</span>
                ) : (
                  <SkillSelect roles={roles} value={roleIds} onChange={(v) => { setRoleIds(v); mark(); }} anyoneLabel={f.skillAnyone} />
                )}
              </div>
            </div>

            {/* Timing zone — one cadence control: an order carries a day-mask, anything else uses the
                single recurrence control (its "בלי" state reveals the one-off date fields). Hidden
                for a single occurrence — the schedule belongs to the series. */}
            {!isInstance && (
            <div className="commons-formZone">
              {underRoutine ? (
                <>
                  <div className="commons-field">
                    <span className="commons-field__label">{f.orderDays}</span>
                    <div className="commons-recur__days" role="group" aria-label={f.orderDays}>
                      {rcDays.dayShort.map((label, d) => {
                        const allowed = parentDays.includes(d);
                        const on = selectedDays.includes(d);
                        return (
                          <button key={d} type="button" className={on ? 'is-active' : ''} aria-pressed={on}
                            disabled={!allowed} onClick={() => toggleDay(d)}>{label}</button>
                        );
                      })}
                    </div>
                    <span className="commons-field__hint">{f.orderDaysHint}</span>
                  </div>
                  <label className="commons-field">
                    <span className="commons-field__label">{f.dueTime}</span>
                    <input type="time" className="commons-field__input" value={dueTime}
                      onChange={e => { setDueTime(e.target.value); mark(); }} />
                    {beforeOpDay(dueTime) && <span className="commons-field__hint commons-dueNext">↪ {rcDays.nextDay}</span>}
                  </label>
                </>
              ) : (
                <>
                  <RecurrenceField value={recurrence} rc={shell.tasks.recurrence} onChange={(v) => { setRecurrence(v); mark(); }} />
                  <AnimatePresence initial={false}>
                    {!recurrence && (
                      <motion.div key="oneoff" {...reveal}>
                        <label className="commons-field">
                          <span className="commons-field__label">{f.startDate}</span>
                          <input type="date" className="commons-field__input" value={startDate} onChange={e => { setStartDate(e.target.value); mark(); }} />
                        </label>
                        <label className="commons-field">
                          <span className="commons-field__label">{f.due}</span>
                          <input type="date" className="commons-field__input" value={due} onChange={e => { setDue(e.target.value); mark(); }} />
                        </label>
                        <label className="commons-field">
                          <span className="commons-field__label">{f.dueTime}</span>
                          <input type="time" className="commons-field__input" value={dueTime} onChange={e => { setDueTime(e.target.value); mark(); }} />
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
            )}

            {/* How completion is recorded — a quiet option, last (most tasks use the default). */}
            <div className="commons-field commons-formZone">
              <span className="commons-field__label">{f.completionStyle}</span>
              <div className="commons-completeStyle" role="group" aria-label={f.completionStyle}>
                <button type="button" className={confirmOnComplete ? 'is-active' : ''} aria-pressed={confirmOnComplete}
                  onClick={() => { setConfirmOnComplete(true); mark(); }}>
                  <span className="commons-completeStyle__t">{f.completionConfirm}</span>
                  <span className="commons-completeStyle__d">{f.completionConfirmHint}</span>
                </button>
                <button type="button" className={!confirmOnComplete ? 'is-active' : ''} aria-pressed={!confirmOnComplete}
                  onClick={() => { setConfirmOnComplete(false); mark(); }}>
                  <span className="commons-completeStyle__t">{f.completionQuick}</span>
                  <span className="commons-completeStyle__d">{f.completionQuickHint}</span>
                </button>
              </div>
            </div>

            {/* Sub-tasks — a live card: add/remove commit immediately (a sub-task is its own object),
                marked "saves instantly" so the divergence from the form's Save/Cancel is honest.
                A divider sets it apart from the fields above. */}
            {editing && <div className="commons-formDivider" aria-hidden="true" />}
            {editing && (
              <div className="commons-subCard">
                <div className="commons-subCard__head">
                  <span className="commons-field__label">{shell.view.subtasks}</span>
                  <span className="commons-subCard__live">{f.subtasksLive}</span>
                </div>
                {subKids.length > 0 && (
                  <ul className="commons-subCard__list">
                    <AnimatePresence initial={false}>
                      {subKids.map(k => {
                        const t = subTime(k, locale);
                        return (
                          <motion.li key={k.id} layout className="commons-subCard__row"
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 12 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 32 }}>
                            <button type="button" className="commons-subCard__name"
                              onClick={() => guardedNavigate(`/commons/${workspaceSlug}/task/${k.id}/edit`)}>{k.title}</button>
                            {t && <span className="commons-subCard__time">{t}</span>}
                            <button type="button" className="commons-subCard__del" aria-label={`${f.removeSub} · ${k.title}`}
                              onClick={() => setRemoveSub(k)}><IconTrash size={16} /></button>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                )}
                <div className="commons-subAdd">
                  <input className="commons-field__input" value={subAdd} placeholder={shell.view.addSub}
                    onChange={e => setSubAdd(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); quickAddSub(); } }}
                    aria-label={shell.view.addSub} />
                  <button type="button" className="commons-btn commons-btn--primary" aria-label={shell.view.addSubDetailed}
                    onClick={detailedAddSub}><IconPlus size={18} /></button>
                </div>
              </div>
            )}
          </>
        )}

        <button type="submit" className="commons-btn commons-btn--primary commons-screen__save" disabled={!title.trim()}>
          {editing ? f.save : f.create}
        </button>
        {editing && (
          <button type="button" className="commons-screen__delete" onClick={() => setConfirmDelete(true)}>{f.delete}</button>
        )}
      </motion.form>

      {confirmDelete && (
        <ConfirmDialog
          title={f.deleteTitle}
          body={f.deleteBody}
          confirmLabel={f.delete}
          cancelLabel={f.cancel}
          onConfirm={doRemove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {removeSub && (
        <ConfirmDialog
          title={f.removeSubTitle}
          body={removeSub.title}
          confirmLabel={f.removeSub}
          cancelLabel={f.cancel}
          onConfirm={doRemoveSub}
          onCancel={() => setRemoveSub(null)}
        />
      )}
    </div>
  );
}
