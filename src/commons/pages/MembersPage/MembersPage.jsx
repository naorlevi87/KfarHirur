// src/commons/pages/MembersPage/MembersPage.jsx
// Admin-only member management: one compact line per member — name, permission, and a pencil that
// opens an inline edit panel (name, permission, skills, remove). Mirrors the site's users table.

import './members.css';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useCommonsChrome } from '../../commonsState/CommonsChromeContext.jsx';
import { fetchMembers, updateMemberLevel, updateMemberName, removeMember,
         listInvites, cancelInvite, sendInviteEmail } from '../../../data/commons/memberQueries.js';
import { fetchRoles, fetchMemberRolesMap, setMemberRoles } from '../../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { SelectField } from '../../SelectField.jsx';
import { MultiSelectField } from '../../MultiSelectField.jsx';
import { InviteDialog } from './InviteDialog.jsx';
import { ConfirmDialog } from '../../ConfirmDialog.jsx';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { IconPencil, IconTrash, IconPlus } from '../../icons.jsx';

const LEVELS = ['admin', 'manager', 'member'];

function fullName(member) {
  return [member.display_name, member.last_name].filter(Boolean).join(' ') || '—';
}
function formatJoined(date, locale) {
  if (!date) return '';
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date)); }
  catch { return ''; }
}

export function MembersPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const shell = resolveCommonsShellContent(locale);
  const m = shell.members;
  const isAdmin = permissionLevel === 'admin';

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolesByMember, setRolesByMember] = useState(new Map());
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [resentId, setResentId] = useState(null);
  const [draft, setDraft] = useState({ firstName: '', lastName: '', level: 'member', skillIds: [] });
  const [removeTarget, setRemoveTarget] = useState(null);   // member pending removal confirmation
  const [cancelTarget, setCancelTarget] = useState(null);   // invite pending cancel confirmation

  // "Invite" lives in the shell's top bar. Gated to admins (non-admins get a null body below).
  const inviteAction = useMemo(() => (isAdmin ? (
    <button type="button" className="commons-topbar__action" onClick={() => setInviting(true)}>
      <IconPlus size={16} /> {m.invite}
    </button>
  ) : null), [isAdmin, m.invite]);
  useCommonsChrome({ title: m.title, showBack: true, action: inviteAction });

  function openEdit(member) {
    setDraft({
      firstName: member.display_name ?? '', lastName: member.last_name ?? '',
      level: member.permission_level, skillIds: (rolesByMember.get(member.id) ?? []).map(x => x.id),
    });
    setEditingId(member.id);
  }

  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    Promise.all([
      fetchMembers(workspace.id), fetchRoles(workspace.id), fetchMemberRolesMap(workspace.id), listInvites(workspace.id),
    ]).then(([mem, rs, map, inv]) => {
      if (cancelled) return;
      setMembers(mem); setRoles(rs); setRolesByMember(map); setInvites(inv); setLoading(false);
    });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  async function refreshInvites() { setInvites(await listInvites(workspace.id)); }
  async function onResendInvite(inv) {
    try {
      await sendInviteEmail({
        workspaceId: workspace.id, email: inv.email, token: inv.token, hasAccount: true,
        workspaceName: workspace.name, origin: window.location.origin, slug: workspace.slug,
      });
    } catch { /* email best-effort; the link still works */ }
    setResentId(inv.id);
    setTimeout(() => setResentId(id => (id === inv.id ? null : id)), 2500);
  }
  async function doCancelInvite() {
    const inv = cancelTarget;
    setCancelTarget(null);
    await cancelInvite(inv.id);
    setInvites(prev => prev.filter(x => x.id !== inv.id));
  }

  const adminCount = useMemo(() => members.filter(x => x.permission_level === 'admin').length, [members]);
  const levelLabel = { admin: m.levelAdmin, manager: m.levelManager, member: m.levelMember };
  const skillOptions = useMemo(() => roles.map(r => ({ value: r.id, label: r.name, color: r.color })), [roles]);

  if (!isAdmin) return null;

  // Commit the whole draft at once (docs/commons-standards.md §2.3 — explicit Save). Only fields that
  // actually changed are written; optimistic update first, then persist.
  async function saveEdit(member) {
    const firstName = draft.firstName.trim() || null;
    const lastName = draft.lastName.trim() || null;
    const { level, skillIds } = draft;

    if (member.permission_level === 'admin' && level !== 'admin' && adminCount <= 1) { alert(m.lastAdmin); return; }

    const nameChanged = firstName !== (member.display_name ?? null) || lastName !== (member.last_name ?? null);
    const levelChanged = level !== member.permission_level;
    const currentIds = (rolesByMember.get(member.id) ?? []).map(x => x.id);
    const skillsChanged = currentIds.length !== skillIds.length || skillIds.some(id => !currentIds.includes(id));

    if (nameChanged || levelChanged) {
      setMembers(prev => prev.map(x => (x.id === member.id ? {
        ...x,
        display_name: nameChanged ? firstName : x.display_name,
        last_name: nameChanged ? lastName : x.last_name,
        permission_level: levelChanged ? level : x.permission_level,
      } : x)));
    }
    if (skillsChanged) {
      const nextRoles = roles.filter(rr => skillIds.includes(rr.id));
      setRolesByMember(prev => { const c = new Map(prev); c.set(member.id, nextRoles); return c; });
    }
    setEditingId(null);

    if (nameChanged) await updateMemberName(member.id, { firstName: draft.firstName, lastName: draft.lastName });
    if (levelChanged) await updateMemberLevel(member.id, level);
    if (skillsChanged) await setMemberRoles(member.id, skillIds);
  }
  function askRemove(member) {
    if (member.permission_level === 'admin' && adminCount <= 1) { alert(m.lastAdmin); return; }
    setRemoveTarget(member);
  }
  async function doRemove() {
    const member = removeTarget;
    setRemoveTarget(null);
    await removeMember(member.id);
    setMembers(prev => prev.filter(x => x.id !== member.id));
    setEditingId(null);
  }

  return (
    <div className="commons-screen">
      <motion.div className="commons-screen__body"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
        <p className="commons-members__subtitle">{m.subtitle}</p>

        {loading ? <CommonsLoading /> : members.length === 0 ? (
          <p className="commons-members__empty">{m.empty}</p>
        ) : (
          <ul className="commons-members__list">
            {members.map(member => {
              const editing = editingId === member.id;
              return (
                <li key={member.id} className={editing ? 'commons-memberRow is-editing' : 'commons-memberRow'}>
                  <div className="commons-memberRow__line">
                    <span className="commons-memberRow__name">{fullName(member)}</span>
                    <span className="commons-levelBadge" data-level={member.permission_level}>
                      {levelLabel[member.permission_level]}
                    </span>
                    <button type="button" className="commons-memberRow__edit"
                      aria-label={m.edit} aria-expanded={editing}
                      onClick={() => (editing ? setEditingId(null) : openEdit(member))}>
                      <IconPencil size={18} />
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {editing && (
                      <motion.div className="commons-editPanel"
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 32 }} style={{ overflow: 'hidden' }}>
                        <div className="commons-editPanel__inner">
                          <div className="commons-memberRow__names">
                            <label className="commons-field">
                              <span className="commons-field__label">{m.firstName}</span>
                              <input className="commons-field__input" value={draft.firstName}
                                placeholder={m.firstName}
                                onChange={e => setDraft(d => ({ ...d, firstName: e.target.value }))} />
                            </label>
                            <label className="commons-field">
                              <span className="commons-field__label">{m.lastName}</span>
                              <input className="commons-field__input" value={draft.lastName}
                                placeholder={m.lastName}
                                onChange={e => setDraft(d => ({ ...d, lastName: e.target.value }))} />
                            </label>
                          </div>
                          <label className="commons-field">
                            <span className="commons-field__label">{m.levelLabel}</span>
                            <SelectField ariaLabel={m.levelLabel} value={draft.level}
                              onChange={(v) => setDraft(d => ({ ...d, level: v }))}
                              options={LEVELS.map(l => ({ value: l, label: levelLabel[l] }))} />
                          </label>
                          <label className="commons-field">
                            <span className="commons-field__label">{m.colSkills}</span>
                            <MultiSelectField ariaLabel={m.colSkills} value={draft.skillIds}
                              onChange={(ids) => setDraft(d => ({ ...d, skillIds: ids }))} options={skillOptions}
                              placeholder={roles.length ? m.skillsPlaceholder : m.noSkills} />
                          </label>
                          <div className="commons-memberRow__meta">
                            {member.email}{member.created_at ? ` · ${m.joined} ${formatJoined(member.created_at, locale)}` : ''}
                          </div>
                          <div className="commons-editPanel__actions">
                            <button type="button" className="commons-editPanel__btn commons-editPanel__btn--danger" onClick={() => askRemove(member)}>
                              <IconTrash size={16} /> {m.remove}
                            </button>
                            <div className="commons-editPanel__commit">
                              <button type="button" className="commons-editPanel__btn" onClick={() => setEditingId(null)}>{m.cancel}</button>
                              <button type="button" className="commons-editPanel__btn commons-editPanel__btn--save" onClick={() => saveEdit(member)}>{m.save}</button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        )}

        {invites.length > 0 && (
          <section className="commons-pending">
            <h2 className="commons-pending__title">{m.pendingTitle}</h2>
            <ul className="commons-pending__list">
              {invites.map(inv => (
                <li key={inv.id} className="commons-pendingRow">
                  <span className="commons-pendingRow__email">
                    {[inv.first_name, inv.last_name].filter(Boolean).join(' ') || inv.email}
                    {(inv.first_name || inv.last_name) && ` · ${inv.email}`}
                  </span>
                  <span className="commons-pendingRow__status">{m.pendingStatus}</span>
                  <button type="button" className="commons-memberRow__btn" onClick={() => onResendInvite(inv)} disabled={resentId === inv.id}>
                    {resentId === inv.id ? m.resent : m.resend}
                  </button>
                  <button type="button" className="commons-memberRow__btn commons-memberRow__btn--danger" onClick={() => setCancelTarget(inv)}>{m.cancelInvite}</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </motion.div>

      {inviting && (
        <InviteDialog
          workspace={workspace} locale={locale}
          m={{ ...m, levelLabel: m.levelLabel, colSkills: m.colSkills }}
          levelLabel={levelLabel} skillOptions={skillOptions}
          onClose={() => setInviting(false)} onCreated={refreshInvites}
        />
      )}

      {removeTarget && (
        <ConfirmDialog
          title={m.removeTitle} body={m.removeBody}
          confirmLabel={m.remove} cancelLabel={m.cancel}
          onConfirm={doRemove} onCancel={() => setRemoveTarget(null)}
        />
      )}
      {cancelTarget && (
        <ConfirmDialog
          title={m.cancelInviteTitle} body={m.cancelInviteBody}
          confirmLabel={m.cancelInvite} cancelLabel={m.cancel}
          onConfirm={doCancelInvite} onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
