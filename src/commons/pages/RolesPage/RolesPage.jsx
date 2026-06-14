// src/commons/pages/RolesPage/RolesPage.jsx
// Admin-only abilities catalogue: list/add/edit/delete commons.roles for the workspace.
// Follows the list-row grammar (docs/commons-standards.md §2–3): a collapsed row shows a color dot +
// name + pencil; the pencil expands a shared inline edit panel (name + color picker + Save/Cancel).
// "+" in the screen bar opens that same panel, empty, at the top of the list. Delete lives inside the
// panel and routes through ConfirmDialog. Abilities gate task-taking (nodes.role_ids) and tag members.

import './roles.css';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useCommonsChrome } from '../../commonsState/CommonsChromeContext.jsx';
import { fetchRoles, createRole, updateRole, deleteRole } from '../../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { ConfirmDialog } from '../../ConfirmDialog.jsx';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { IconPlus, IconPencil, IconTrash } from '../../icons.jsx';

const SWATCHES = ['1', '2', '3', '4', '5', '6'];
const byName = (a, b) => a.name.localeCompare(b.name);

export function RolesPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const shell = resolveCommonsShellContent(locale);
  const r = shell.rolesScreen;
  const isAdmin = permissionLevel === 'admin';

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null);                 // null | { mode:'add' } | { mode:'edit', id }
  const [draft, setDraft] = useState({ name: '', color: '1' });
  const [deleteTarget, setDeleteTarget] = useState(null);

  // "+" lives in the shell screen bar (band ②); it opens an empty panel atop the list.
  const addAction = useMemo(() => (isAdmin ? (
    <button type="button" className="commons-topbar__action"
      onClick={() => { setDraft({ name: '', color: '1' }); setPanel({ mode: 'add' }); }}>
      <IconPlus size={16} /> {r.add}
    </button>
  ) : null), [isAdmin, r.add]);
  useCommonsChrome({ title: r.title, showBack: true, action: addAction });

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoles(workspace.id).then(rs => { if (!cancelled) { setRoles(rs); setLoading(false); } });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  if (!isAdmin) return null;

  function openEdit(role) {
    setDraft({ name: role.name, color: role.color ?? '' });
    setPanel({ mode: 'edit', id: role.id });
  }
  function closePanel() { setPanel(null); }

  async function save() {
    const name = draft.name.trim();
    if (!name) return;
    if (panel.mode === 'add') {
      const created = await createRole({ workspaceId: workspace.id, name, color: draft.color || '1' });
      setRoles(prev => [...prev, created].sort(byName));
    } else {
      const updated = await updateRole(panel.id, { name, color: draft.color });
      setRoles(prev => prev.map(x => (x.id === panel.id ? updated : x)).sort(byName));
    }
    setPanel(null);
  }

  async function doDelete() {
    const role = deleteTarget;
    setDeleteTarget(null);
    setPanel(null);
    await deleteRole(role.id);
    setRoles(prev => prev.filter(x => x.id !== role.id));
  }

  // Shared panel body — reused by the add panel (no delete) and each row's edit panel (with delete).
  const panelBody = (onDelete) => (
    <div className="commons-editPanel__inner">
      <label className="commons-field">
        <span className="commons-field__label">{r.namePlaceholder}</span>
        <input className="commons-field__input" value={draft.name} placeholder={r.namePlaceholder}
          autoFocus aria-label={r.namePlaceholder}
          onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} />
      </label>
      <div className="commons-field">
        <span className="commons-field__label">{r.colorLabel}</span>
        <div className="commons-roles__swatches" role="group" aria-label={r.colorLabel}>
          {SWATCHES.map(c => (
            <button type="button" key={c} data-role-color={c}
              className={c === draft.color ? 'commons-swatch is-on' : 'commons-swatch'}
              aria-pressed={c === draft.color} aria-label={`${r.colorLabel} ${c}`}
              onClick={() => setDraft(d => ({ ...d, color: c }))} />
          ))}
        </div>
      </div>
      <div className="commons-editPanel__actions">
        {onDelete && (
          <button type="button" className="commons-editPanel__btn commons-editPanel__btn--danger" onClick={onDelete}>
            <IconTrash size={16} /> {r.delete}
          </button>
        )}
        <div className="commons-editPanel__commit">
          <button type="button" className="commons-editPanel__btn" onClick={closePanel}>{r.cancel}</button>
          <button type="button" className="commons-editPanel__btn commons-editPanel__btn--save"
            onClick={save} disabled={!draft.name.trim()}>{r.save}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="commons-screen">
      <motion.div className="commons-screen__body"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
        <p className="commons-roles__subtitle">{r.subtitle}</p>

        <AnimatePresence initial={false}>
          {panel?.mode === 'add' && (
            <motion.div className="commons-editPanel commons-roles__addPanel"
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }} style={{ overflow: 'hidden' }}>
              {panelBody(null)}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? <CommonsLoading /> : (
          roles.length === 0 && panel?.mode !== 'add' ? (
            <p className="commons-roles__empty">{r.empty}</p>
          ) : roles.length > 0 ? (
            <ul className="commons-roles__list">
              {roles.map(role => {
                const editing = panel?.mode === 'edit' && panel.id === role.id;
                return (
                  <li key={role.id} className={editing ? 'commons-roleRow is-editing' : 'commons-roleRow'}>
                    <div className="commons-roleRow__line">
                      <span className="commons-roleRow__dot" data-role-color={role.color ?? ''} aria-hidden="true" />
                      <span className="commons-roleRow__name">{role.name}</span>
                      <button type="button" className="commons-roleRow__edit"
                        aria-label={r.edit} aria-expanded={editing}
                        onClick={() => (editing ? closePanel() : openEdit(role))}>
                        <IconPencil size={18} />
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {editing && (
                        <motion.div className="commons-editPanel"
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 32 }} style={{ overflow: 'hidden' }}>
                          {panelBody(() => setDeleteTarget(role))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          ) : null
        )}
      </motion.div>

      {deleteTarget && (
        <ConfirmDialog
          title={r.deleteTitle} body={r.deleteBody}
          confirmLabel={r.delete} cancelLabel={r.cancel}
          onConfirm={doDelete} onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
