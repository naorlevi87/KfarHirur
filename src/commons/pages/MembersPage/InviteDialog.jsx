// src/commons/pages/MembersPage/InviteDialog.jsx
// Aesthetic modal for inviting a member: name + email + permission + skills. First name, last name,
// and email are required — clicking send validates them and shows a conventional red asterisk + a
// "required field" message under each empty one (first invalid field receives focus). On a valid send
// it creates a pending invite (consent-based — a membership is created only when the invitee accepts),
// emails the link via Resend (best-effort), and shows a copyable /join/<token> link.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { SelectField } from '../../SelectField.jsx';
import { MultiSelectField } from '../../MultiSelectField.jsx';
import { createInvite, sendInviteEmail } from '../../../data/commons/memberQueries.js';

const LEVELS = ['admin', 'manager', 'member'];

export function InviteDialog({ workspace, locale, m, levelLabel, skillOptions, onClose, onCreated }) {
  const ref = useRef(null);
  const firstRef = useRef(null);
  const lastRef = useRef(null);
  const emailRef = useRef(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [level, setLevel] = useState('member');
  const [roleIds, setRoleIds] = useState([]);
  const [link, setLink] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({}); // { firstName?, lastName?, email? } → message strings

  // Intentionally NOT closable by backdrop click or Escape — only the explicit close button exits,
  // so a stray tap (or finding an email to paste) can't discard a half-filled invite.
  useEffect(() => { firstRef.current?.focus(); }, []);

  const clearError = (field) => setErrors(prev => (prev[field] ? { ...prev, [field]: '' } : prev));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;

    const next = {};
    if (!firstName.trim()) next.firstName = m.requiredField;
    if (!lastName.trim())  next.lastName  = m.requiredField;
    if (!email.trim())     next.email     = m.requiredField;
    if (Object.keys(next).length) {
      setErrors(next);
      (next.firstName ? firstRef : next.lastName ? lastRef : emailRef).current?.focus();
      return;
    }
    setErrors({});

    const mail = email.trim();
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

        <form className="commons-invite" onSubmit={submit} noValidate>
          <div className="commons-memberRow__names">
            <label className="commons-field">
              <span className="commons-field__label">{m.firstName} <span className="commons-field__req" aria-hidden="true">*</span></span>
              <input ref={firstRef} className="commons-field__input" value={firstName}
                placeholder={m.firstName} aria-required="true"
                aria-invalid={errors.firstName ? 'true' : undefined}
                aria-describedby={errors.firstName ? 'inv-err-first' : undefined}
                onChange={e => { setFirstName(e.target.value); clearError('firstName'); }} />
              {errors.firstName && <span id="inv-err-first" className="commons-field__error" role="alert">{errors.firstName}</span>}
            </label>
            <label className="commons-field">
              <span className="commons-field__label">{m.lastName} <span className="commons-field__req" aria-hidden="true">*</span></span>
              <input ref={lastRef} className="commons-field__input" value={lastName}
                placeholder={m.lastName} aria-required="true"
                aria-invalid={errors.lastName ? 'true' : undefined}
                aria-describedby={errors.lastName ? 'inv-err-last' : undefined}
                onChange={e => { setLastName(e.target.value); clearError('lastName'); }} />
              {errors.lastName && <span id="inv-err-last" className="commons-field__error" role="alert">{errors.lastName}</span>}
            </label>
          </div>
          <label className="commons-field">
            <span className="commons-field__label">{m.inviteEmail} <span className="commons-field__req" aria-hidden="true">*</span></span>
            <input ref={emailRef} className="commons-field__input" type="email" value={email}
              placeholder={m.inviteEmailPlaceholder} aria-required="true"
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby={errors.email ? 'inv-err-email' : undefined}
              onChange={e => { setEmail(e.target.value); clearError('email'); }} />
            {errors.email && <span id="inv-err-email" className="commons-field__error" role="alert">{errors.email}</span>}
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
            <button type="submit" className="commons-btn commons-btn--primary commons-invite__send" disabled={busy}>
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
