// src/commons/pages/RolesPage/RolesPage.jsx
// Admin-only skills catalogue: list/add/rename/recolor/delete commons.roles for the workspace.
// Skills gate task-taking (nodes.role_ids) and tag members (member_roles).

import './roles.css';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useCommonsChrome } from '../../commonsState/CommonsChromeContext.jsx';
import { fetchRoles, createRole, updateRole, deleteRole } from '../../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { ConfirmDialog } from '../../ConfirmDialog.jsx';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { IconPlus } from '../../icons.jsx';

const SWATCHES = ['1', '2', '3', '4', '5', '6'];

export function RolesPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const shell = resolveCommonsShellContent(locale);
  const r = shell.rolesScreen;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [color, setColor] = useState('1');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useCommonsChrome({ title: r.title, showBack: true });

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoles(workspace.id).then(rs => { if (!cancelled) { setRoles(rs); setLoading(false); } });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  if (permissionLevel !== 'admin') return null;

  async function add(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const created = await createRole({ workspaceId: workspace.id, name: n, color });
    setRoles(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setName('');
  }
  async function rename(role) {
    const next = window.prompt(r.rename, role.name);
    if (next == null || !next.trim()) return;
    const updated = await updateRole(role.id, { name: next.trim() });
    setRoles(prev => prev.map(x => (x.id === role.id ? updated : x)));
  }
  async function recolor(role, c) {
    const updated = await updateRole(role.id, { color: c });
    setRoles(prev => prev.map(x => (x.id === role.id ? updated : x)));
  }
  async function doDelete() {
    const role = deleteTarget;
    setDeleteTarget(null);
    await deleteRole(role.id);
    setRoles(prev => prev.filter(x => x.id !== role.id));
  }

  return (
    <div className="commons-screen">
      <motion.div className="commons-screen__body"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
        <p className="commons-roles__subtitle">{r.subtitle}</p>

        <form className="commons-roles__add" onSubmit={add}>
          <input className="commons-field__input" value={name} placeholder={r.namePlaceholder}
            onChange={e => setName(e.target.value)} aria-label={r.add} />
          <div className="commons-roles__swatches" role="group" aria-label={r.colorLabel}>
            {SWATCHES.map(c => (
              <button type="button" key={c} data-role-color={c}
                className={c === color ? 'commons-swatch is-on' : 'commons-swatch'}
                aria-pressed={c === color} aria-label={`${r.colorLabel} ${c}`} onClick={() => setColor(c)} />
            ))}
          </div>
          <button type="submit" className="commons-btn commons-btn--primary" disabled={!name.trim()} aria-label={r.add}>
            <IconPlus size={18} />
          </button>
        </form>

        {loading ? <CommonsLoading /> : roles.length === 0 ? (
          <p className="commons-roles__empty">{r.empty}</p>
        ) : (
          <ul className="commons-roles__list">
            {roles.map(role => (
              <li key={role.id} className="commons-roleRow">
                <span className="commons-roleRow__dot" data-role-color={role.color ?? ''} aria-hidden="true" />
                <span className="commons-roleRow__name">{role.name}</span>
                <div className="commons-roleRow__swatches" role="group" aria-label={r.colorLabel}>
                  {SWATCHES.map(c => (
                    <button type="button" key={c} data-role-color={c}
                      className={c === (role.color ?? '') ? 'commons-swatch is-on' : 'commons-swatch'}
                      aria-label={`${r.colorLabel} ${c}`} onClick={() => recolor(role, c)} />
                  ))}
                </div>
                <button type="button" className="commons-roleRow__btn" onClick={() => rename(role)}>{r.rename}</button>
                <button type="button" className="commons-roleRow__btn commons-roleRow__btn--danger" onClick={() => setDeleteTarget(role)}>{r.delete}</button>
              </li>
            ))}
          </ul>
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
