// src/commons/tasks/TaskFormPage.jsx
// Create/edit form for a task or folder, rendered inside the persistent shell (the top bar is its
// chrome — declared via useCommonsChrome — not a per-screen bar). Task mode: title, location (parent),
// description, owner, due, recurrence. Folder mode: title + location only. In edit mode the loader
// waits for the node so the inner form seeds its state directly. The form tracks a `dirty` flag and
// registers it with the nav guard so leaving with unsaved changes prompts; delete is confirmed.

import './taskScreens.css';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { useWorkspace } from '../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../commonsState/useWorkspaceTree.js';
import { useCommonsChrome } from '../commonsState/CommonsChromeContext.jsx';
import { useUnsavedGuard } from '../commonsState/NavGuardContext.jsx';
import { fetchRoster } from '../../data/commons/workspaceQueries.js';
import { fetchRoles } from '../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../resolveCommonsShellContent.js';
import { RecurrenceField } from './RecurrenceField.jsx';
import { SkillSelect } from './SkillSelect.jsx';
import { SelectField } from '../SelectField.jsx';
import { ConfirmDialog } from '../ConfirmDialog.jsx';
import { CommonsLoading } from '../CommonsLoading.jsx';
import { normalizeRule, computeFirstNextRun, effectiveDaysFor } from './recurrence.js';

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
// Operational day = 08:00→08:00, so a deadline before 08:00 belongs to the NEXT calendar morning.
function beforeOpDay(time) { return !!time && parseInt(time.slice(0, 2), 10) < 8; }
function dueToIso(date, time) {
  const t = time || '08:00';
  const dt = new Date(`${date}T${t}:00`);
  if (beforeOpDay(t)) dt.setDate(dt.getDate() + 1);
  return dt.toISOString();
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
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Day-mask + per-item time apply when this task sits inside a routine (an "order" definition).
  const [dayMask, setDayMask] = useState(node?.day_mask?.length ? node.day_mask : null);
  const [dueTime, setDueTime] = useState(
    node?.due_time ? node.due_time.slice(0, 5) : (node?.due_date ? toTimeInput(node.due_date) : ''));
  const [startDate, setStartDate] = useState(toDateInput(node?.start_date));  // "בתאריך" — when it becomes actionable
  const mark = () => setDirty(true); // any user edit arms the unsaved-changes guard

  const rcDays = shell.tasks.recurrence;
  const routineRoot = (() => {
    let c = tree.nodes.find(n => n.id === parentId);
    while (c) { if (c.recurrence) return c; c = tree.nodes.find(n => n.id === c.parent_id); }
    return null;
  })();
  const underRoutine = !isFolder && !!routineRoot;        // an order inside a routine
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
  useUnsavedGuard(dirty);

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then(r => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  // A task with no required skills means "anyone" (כל עובד). We represent that in the picker as
  // all skills checked, so a new task (or an "anyone" task) defaults to every skill selected.
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

  async function submit(e) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    const parent = parentId || null;
    // All-selected or none-selected both mean "anyone" → store an empty set (future-proof: it
    // stays open even when new skills are later added). A strict subset is the real restriction.
    const persistRoleIds = (roleIds.length === 0 || roleIds.length === roles.length) ? [] : roleIds;

    // An order inside a routine carries a day-mask + per-item time; it never recurs or has a due date.
    const taskFields = () => {
      const base = { description: description.trim() || null, owner_id: ownerId || null, role_ids: persistRoleIds };
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
    setDirty(false); // saved — leaving now is safe
    navigate(-1);
  }

  async function doRemove() {
    setConfirmDelete(false);
    setDirty(false);
    await tree.removeNode(nodeId);
    navigate(`/commons/${workspaceSlug}/board`);
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
          <input className="commons-field__input" value={title} onChange={e => { setTitle(e.target.value); mark(); }} autoFocus />
        </label>

        {!isFolder && (
          <>
            <label className="commons-field">
              <span className="commons-field__label">{f.description}</span>
              <textarea
                className="commons-field__input commons-field__area" rows={3}
                value={description} placeholder={f.descriptionPlaceholder}
                onChange={e => { setDescription(e.target.value); mark(); }}
              />
            </label>
            <label className="commons-field">
              <span className="commons-field__label">{f.owner}</span>
              <SelectField
                ariaLabel={f.owner}
                value={ownerId}
                onChange={(v) => { setOwnerId(v); mark(); }}
                placeholder={f.unassigned}
                options={[{ value: '', label: f.unassigned }, ...roster.map(mb => ({ value: mb.id, label: mb.display_name ?? '—' }))]}
              />
            </label>
            <div className="commons-field">
              <span className="commons-field__label">{f.skill}</span>
              {roles.length === 0 ? (
                <span className="commons-field__hint">{f.skillAnyone}</span>
              ) : (
                <SkillSelect roles={roles} value={roleIds} onChange={(v) => { setRoleIds(v); mark(); }} anyoneLabel={f.skillAnyone} />
              )}
            </div>
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
                  {beforeOpDay(dueTime) && <span className="commons-field__hint commons-dueNext">↪ {f.nextMorning}</span>}
                </label>
              </>
            ) : (
              <>
                <div className="commons-field">
                  <span className="commons-field__label">{f.scheduling}</span>
                  <div className="commons-recur__freqs" role="group" aria-label={f.scheduling}>
                    <button type="button" className={recurrence ? '' : 'is-active'} aria-pressed={!recurrence}
                      onClick={() => { setRecurrence(null); mark(); }}>{f.once}</button>
                    <button type="button" className={recurrence ? 'is-active' : ''} aria-pressed={!!recurrence}
                      onClick={() => { setRecurrence(recurrence ?? { freq: 'daily', interval: 1, time: '20:00' }); mark(); }}>{f.repeats}</button>
                  </div>
                </div>

                {recurrence ? (
                  <RecurrenceField value={recurrence} rc={shell.tasks.recurrence} onChange={(v) => { setRecurrence(v); mark(); }} />
                ) : (
                  <>
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
                      {beforeOpDay(dueTime) && <span className="commons-field__hint commons-dueNext">↪ {f.nextMorning}</span>}
                    </label>
                  </>
                )}
              </>
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
    </div>
  );
}
