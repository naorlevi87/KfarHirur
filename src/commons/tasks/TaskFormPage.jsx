// src/commons/tasks/TaskFormPage.jsx
// Full-screen create/edit form for a task or folder. Task mode: title, location (parent), description,
// owner, due, recurrence. Folder mode: title + location only. In edit mode the loader waits for the
// node so the inner form can seed its state directly (no hydration effect). Persists via
// useWorkspaceTree, then returns. Reached from the FAB / menu (create) and the task view's עריכה.

import './taskScreens.css';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { useWorkspace } from '../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../data/commons/workspaceQueries.js';
import { fetchRoles } from '../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../resolveCommonsShellContent.js';
import { RecurrenceField } from './RecurrenceField.jsx';
import { SkillSelect } from './SkillSelect.jsx';
import { SelectField } from '../SelectField.jsx';
import { normalizeRule, computeFirstNextRun } from './recurrence.js';
import { IconChevronStart } from '../icons.jsx';

function toDateInput(due) {
  if (!due) return '';
  const d = new Date(due);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function ScreenBar({ title, onBack, backLabel }) {
  return (
    <header className="commons-screen__bar">
      <button type="button" className="commons-screen__back" onClick={onBack} aria-label={backLabel}>
        <IconChevronStart size={20} />
      </button>
      {title && <span className="commons-screen__title">{title}</span>}
    </header>
  );
}

// Loader: in edit mode, hold until the node resolves, then mount the form seeded from it.
export function TaskFormPage({ mode }) {
  const { locale } = useAppContext();
  const { workspace } = useWorkspace();
  const { nodeId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tree = useWorkspaceTree(workspace?.id);

  const editing = mode === 'edit';
  const node = editing ? tree.nodes.find(n => n.id === nodeId) : null;

  if (editing && !node) {
    return (
      <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
        <ScreenBar onBack={() => navigate(-1)} backLabel="" />
      </div>
    );
  }

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
  const [due, setDue] = useState(toDateInput(node?.due_date));
  const [recurrence, setRecurrence] = useState(node?.recurrence ?? null);
  const [roster, setRoster] = useState([]);
  const [roleIds, setRoleIds] = useState(node?.role_ids ?? []);
  const [roles, setRoles] = useState([]);

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
        setRoleIds(rs.map(r => r.id));
        skillInited.current = true;
      }
    });
    return () => { cancelled = true; };
  }, [workspace?.id, node]);

  const heading = isFolder
    ? (editing ? f.editFolderTitle : f.newFolderTitle)
    : (editing ? f.editTaskTitle : f.newTaskTitle);

  async function submit(e) {
    e.preventDefault();
    const name = title.trim();
    if (!name) return;
    const parent = parentId || null;
    // All-selected or none-selected both mean "anyone" → store an empty set (future-proof: it
    // stays open even when new skills are later added). A strict subset is the real restriction.
    const persistRoleIds = (roleIds.length === 0 || roleIds.length === roles.length) ? [] : roleIds;

    if (editing) {
      const patch = { title: name, parent_id: parent };
      if (!isFolder) {
        const rule = normalizeRule(recurrence);
        const ruleChanged = JSON.stringify(rule) !== JSON.stringify(normalizeRule(node.recurrence ?? null));
        patch.description = description.trim() || null;
        patch.owner_id = ownerId || null;
        patch.role_ids = persistRoleIds;
        patch.recurrence = rule;
        patch.due_date = rule ? null : (due ? new Date(`${due}T08:00:00`).toISOString() : null);
        patch.next_run = !rule ? null : (!ruleChanged && node.next_run ? node.next_run : computeFirstNextRun(rule));
      }
      await tree.saveTask(nodeId, patch);
    } else if (isFolder) {
      await tree.addNode({ parentId: parent, kind: 'container', title: name });
    } else {
      const rule = normalizeRule(recurrence);
      const created = await tree.addNode({ parentId: parent, kind: 'task', title: name });
      await tree.saveTask(created.id, {
        description: description.trim() || null,
        owner_id: ownerId || null,
        role_ids: persistRoleIds,
        recurrence: rule,
        due_date: rule ? null : (due ? new Date(`${due}T08:00:00`).toISOString() : null),
        next_run: rule ? computeFirstNextRun(rule) : null,
      });
    }
    navigate(-1);
  }

  async function remove() {
    await tree.removeNode(nodeId);
    navigate(`/commons/${workspaceSlug}/board`);
  }

  return (
    <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <ScreenBar title={heading} onBack={() => navigate(-1)} backLabel={f.back} />

      <motion.form
        className="commons-screen__body"
        onSubmit={submit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      >
        <label className="commons-field">
          <span className="commons-field__label">{f.titleLabel}</span>
          <input className="commons-field__input" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </label>

        {!isFolder && (
          <>
            <label className="commons-field">
              <span className="commons-field__label">{f.description}</span>
              <textarea
                className="commons-field__input commons-field__area" rows={3}
                value={description} placeholder={f.descriptionPlaceholder}
                onChange={e => setDescription(e.target.value)}
              />
            </label>
            <label className="commons-field">
              <span className="commons-field__label">{f.owner}</span>
              <SelectField
                ariaLabel={f.owner}
                value={ownerId}
                onChange={setOwnerId}
                placeholder={f.unassigned}
                options={[{ value: '', label: f.unassigned }, ...roster.map(mb => ({ value: mb.id, label: mb.display_name ?? '—' }))]}
              />
            </label>
            <div className="commons-field">
              <span className="commons-field__label">{f.skill}</span>
              {roles.length === 0 ? (
                <span className="commons-field__hint">{f.skillAnyone}</span>
              ) : (
                <SkillSelect roles={roles} value={roleIds} onChange={setRoleIds} anyoneLabel={f.skillAnyone} />
              )}
            </div>
            <div className="commons-field">
              <span className="commons-field__label">{f.scheduling}</span>
              <div className="commons-recur__freqs" role="group" aria-label={f.scheduling}>
                <button type="button" className={recurrence ? '' : 'is-active'} aria-pressed={!recurrence}
                  onClick={() => setRecurrence(null)}>{f.once}</button>
                <button type="button" className={recurrence ? 'is-active' : ''} aria-pressed={!!recurrence}
                  onClick={() => setRecurrence(recurrence ?? { freq: 'daily', interval: 1, time: '20:00' })}>{f.repeats}</button>
              </div>
            </div>

            {recurrence ? (
              <RecurrenceField value={recurrence} rc={shell.tasks.recurrence} onChange={setRecurrence} />
            ) : (
              <label className="commons-field">
                <span className="commons-field__label">{f.due}</span>
                <input type="date" className="commons-field__input" value={due} onChange={e => setDue(e.target.value)} />
              </label>
            )}
          </>
        )}

        <button type="submit" className="commons-btn commons-btn--primary commons-screen__save" disabled={!title.trim()}>
          {editing ? f.save : f.create}
        </button>
        {editing && (
          <button type="button" className="commons-screen__delete" onClick={remove}>{f.delete}</button>
        )}
      </motion.form>
    </div>
  );
}
