// src/commons/pages/MembersPage/MembersPage.jsx
// Admin-only member management: one compact line per member — name, permission, and a pencil that
// opens an inline edit panel (name, permission, skills, remove). Mirrors the site's users table.

import './members.css';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { fetchMembers, updateMemberLevel, updateMemberName, removeMember,
         listInvites, cancelInvite, sendInviteEmail } from '../../../data/commons/memberQueries.js';
import { fetchRoles, fetchMemberRolesMap, setMemberRoles } from '../../../data/commons/roleQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { SelectField } from '../../SelectField.jsx';
import { MultiSelectField } from '../../MultiSelectField.jsx';
import { InviteDialog } from './InviteDialog.jsx';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { IconChevronStart, IconPencil, IconTrash, IconPlus } from '../../icons.jsx';

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
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const m = shell.members;

  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolesByMember, setRolesByMember] = useState(new Map());
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [resentId, setResentId] = useState(null);
  const [nameDraft, setNameDraft] = useState({ firstName: '', lastName: '' });

  function openEdit(member) {
    setNameDraft({ firstName: member.display_name ?? '', lastName: member.last_name ?? '' });
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
  async function onCancelInvite(inv) {
    await cancelInvite(inv.id);
    setInvites(prev => prev.filter(x => x.id !== inv.id));
  }

  const adminCount = useMemo(() => members.filter(x => x.permission_level === 'admin').length, [members]);
  const levelLabel = { admin: m.levelAdmin, manager: m.levelManager, member: m.levelMember };
  const skillOptions = useMemo(() => roles.map(r => ({ value: r.id, label: r.name, color: r.color })), [roles]);

  if (permissionLevel !== 'admin') return null;

  async function onLevel(member, level) {
    if (member.permission_level === 'admin' && level !== 'admin' && adminCount <= 1) { alert(m.lastAdmin); return; }
    setMembers(prev => prev.map(x => (x.id === member.id ? { ...x, permission_level: level } : x)));
    await updateMemberLevel(member.id, level);
  }
  async function saveName(member) {
    const firstName = nameDraft.firstName.trim() || null;
    const lastName = nameDraft.lastName.trim() || null;
    if (firstName === (member.display_name ?? null) && lastName === (member.last_name ?? null)) return;
    setMembers(prev => prev.map(x => (x.id === member.id ? { ...x, display_name: firstName, last_name: lastName } : x)));
    await updateMemberName(member.id, nameDraft);
  }
  async function onSkills(member, nextIds) {
    const nextRoles = roles.filter(r => nextIds.includes(r.id));
    setRolesByMember(prev => { const c = new Map(prev); c.set(member.id, nextRoles); return c; });
    await setMemberRoles(member.id, nextIds);
  }
  async function onRemove(member) {
    if (member.permission_level === 'admin' && adminCount <= 1) { alert(m.lastAdmin); return; }
    if (!window.confirm(m.removeConfirm)) return;
    await removeMember(member.id);
    setMembers(prev => prev.filter(x => x.id !== member.id));
    setEditingId(null);
  }

  return (
    <div className="commons-root commons-screen" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <header className="commons-screen__bar">
        <button type="button" className="commons-screen__back" onClick={() => navigate(-1)} aria-label={m.back}>
          <IconChevronStart size={20} />
        </button>
        <span className="commons-screen__title commons-screen__title--flex">{m.title}</span>
        <button type="button" className="commons-screen__edit" onClick={() => setInviting(true)}>
          <IconPlus size={16} /> {m.invite}
        </button>
      </header>

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
              const myRoles = (rolesByMember.get(member.id) ?? []).map(r => r.id);
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
                      <motion.div className="commons-memberRow__panel"
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 32 }} style={{ overflow: 'hidden' }}>
                        <div className="commons-memberRow__panelInner">
                          <div className="commons-memberRow__names">
                            <label className="commons-field">
                              <span className="commons-field__label">{m.firstName}</span>
                              <input className="commons-field__input" value={nameDraft.firstName}
                                placeholder={m.firstName}
                                onChange={e => setNameDraft(d => ({ ...d, firstName: e.target.value }))}
                                onBlur={() => saveName(member)} />
                            </label>
                            <label className="commons-field">
                              <span className="commons-field__label">{m.lastName}</span>
                              <input className="commons-field__input" value={nameDraft.lastName}
                                placeholder={m.lastName}
                                onChange={e => setNameDraft(d => ({ ...d, lastName: e.target.value }))}
                                onBlur={() => saveName(member)} />
                            </label>
                          </div>
                          <label className="commons-field">
                            <span className="commons-field__label">{m.levelLabel}</span>
                            <SelectField ariaLabel={m.levelLabel} value={member.permission_level}
                              onChange={(v) => onLevel(member, v)}
                              options={LEVELS.map(l => ({ value: l, label: levelLabel[l] }))} />
                          </label>
                          <label className="commons-field">
                            <span className="commons-field__label">{m.colSkills}</span>
                            <MultiSelectField ariaLabel={m.colSkills} value={myRoles}
                              onChange={(ids) => onSkills(member, ids)} options={skillOptions}
                              placeholder={roles.length ? m.skillsPlaceholder : m.noSkills} />
                          </label>
                          <div className="commons-memberRow__meta">
                            {member.email}{member.created_at ? ` · ${m.joined} ${formatJoined(member.created_at, locale)}` : ''}
                          </div>
                          <div className="commons-memberRow__panelActions">
                            <button type="button" className="commons-memberRow__btn commons-memberRow__btn--danger" onClick={() => onRemove(member)}>
                              <IconTrash size={16} /> {m.remove}
                            </button>
                            <button type="button" className="commons-memberRow__btn commons-memberRow__btn--done" onClick={() => setEditingId(null)}>{m.done}</button>
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
                  <span className="commons-pendingRow__email">{inv.email}</span>
                  <span className="commons-pendingRow__status">{m.pendingStatus}</span>
                  <button type="button" className="commons-memberRow__btn" onClick={() => onResendInvite(inv)} disabled={resentId === inv.id}>
                    {resentId === inv.id ? m.resent : m.resend}
                  </button>
                  <button type="button" className="commons-memberRow__btn commons-memberRow__btn--danger" onClick={() => onCancelInvite(inv)}>{m.cancelInvite}</button>
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
    </div>
  );
}
