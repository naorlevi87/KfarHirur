// src/commons/pages/MembersPage/InviteDialog.jsx
// Aesthetic modal for inviting a member: email + permission + skills. On send it creates a pending
// invite (consent-based — a membership is created only when the invitee accepts), emails the link via
// Resend (best-effort), and shows a copyable /join/<token> link. Closes on backdrop / Escape.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { SelectField } from '../../SelectField.jsx';
import { MultiSelectField } from '../../MultiSelectField.jsx';
import { createInvite, sendInviteEmail } from '../../../data/commons/memberQueries.js';

const LEVELS = ['admin', 'manager', 'member'];

export function InviteDialog({ workspace, locale, m, levelLabel, skillOptions, onClose, onCreated }) {
  const ref = useRef(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState('member');
  const [roleIds, setRoleIds] = useState([]);
  const [link, setLink] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Name + email are all required: a new member should arrive with a real name, not an email prefix.
  const canSend = !!(firstName.trim() && lastName.trim() && email.trim()) && !busy;

  // Intentionally NOT closable by backdrop click or Escape — only the explicit close button exits,
  // so a stray tap (or finding an email to paste) can't discard a half-filled invite.
  useEffect(() => { ref.current?.querySelector('input')?.focus(); }, []);

  async function submit(e) {
    e.preventDefault();
    const mail = email.trim();
    if (!canSend) return;
    setBusy(true);
    try {
      const { token, has_account } = await createInvite(workspace.id, mail, level, roleIds, firstName, lastName);
      const url = `${window.location.origin}/commons/${workspace.slug}/join/${token}`;
      setLink(url);
      try {
        await sendInviteEmail({
          workspaceId: workspace.id, email: mail, token, hasAccount: has_account,
          workspaceName: workspace.name, origin: window.location.origin, slug: workspace.slug,
        });
        setNotice(m.inviteSent);
      } catch { setNotice(m.inviteEmailFailed); }
      onCreated?.();
    } finally { setBusy(false); }
  }

  function copy() { navigator.clipboard?.writeText(link); setNotice(m.inviteCopied); }

  return (
    <div className="commons-sheetRoot" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div className="commons-sheetBackdrop" aria-hidden="true" />
      <div className="commons-inviteCenter">
        <motion.div className="commons-inviteCard" ref={ref} role="dialog" aria-modal="true" aria-label={m.inviteTitle}
          initial={{ opacity: 0, y: 16, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
          <h2 className="commons-inviteCard__title">{m.inviteTitle}</h2>

        <form className="commons-invite" onSubmit={submit}>
          <div className="commons-memberRow__names">
            <label className="commons-field">
              <span className="commons-field__label">{m.firstName}</span>
              <input className="commons-field__input" value={firstName}
                placeholder={m.firstName} onChange={e => setFirstName(e.target.value)} />
            </label>
            <label className="commons-field">
              <span className="commons-field__label">{m.lastName}</span>
              <input className="commons-field__input" value={lastName}
                placeholder={m.lastName} onChange={e => setLastName(e.target.value)} />
            </label>
          </div>
          <label className="commons-field">
            <span className="commons-field__label">{m.inviteEmail}</span>
            <input className="commons-field__input" type="email" value={email}
              placeholder={m.inviteEmailPlaceholder} onChange={e => setEmail(e.target.value)} />
          </label>
          <label className="commons-field">
            <span className="commons-field__label">{m.levelLabel}</span>
            <SelectField ariaLabel={m.levelLabel} value={level} onChange={setLevel}
              options={LEVELS.map(l => ({ value: l, label: levelLabel[l] }))} />
          </label>
          <label className="commons-field">
            <span className="commons-field__label">{m.colSkills}</span>
            <MultiSelectField ariaLabel={m.colSkills} value={roleIds} onChange={setRoleIds}
              options={skillOptions} placeholder={skillOptions.length ? m.skillsPlaceholder : m.noSkills} />
          </label>

          {link ? (
            <div className="commons-invite__result">
              <span className="commons-field__label">{m.inviteLinkLabel}</span>
              <div className="commons-invite__linkRow">
                <code className="commons-invite__url">{link}</code>
                <button type="button" className="commons-btn commons-btn--ghost" onClick={copy}>{m.inviteCopy}</button>
              </div>
            </div>
          ) : (
            <button type="submit" className="commons-btn commons-btn--primary commons-invite__send" disabled={!canSend}>
              {m.inviteSend}
            </button>
          )}
          {notice && <p className="commons-invite__notice" role="status">{notice}</p>}
        </form>

          <button type="button" className="commons-inviteCard__close" onClick={onClose}>{m.close}</button>
        </motion.div>
      </div>
    </div>
  );
}
