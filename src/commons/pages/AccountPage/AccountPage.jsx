// src/commons/pages/AccountPage/AccountPage.jsx
// Commons' own account screen — the ACCOUNT section of settings, rendered inside the Commons shell
// (no more punting the user to the community site's /profile). Edits the neutral account: name,
// avatar, sign out, delete account. Reads/writes via useAccount() + the product-agnostic
// profileQueries. See docs/superpowers/specs/2026-06-14-account-and-products-model-design.md.

import './account.css';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useAccount } from '../../../app/appState/AccountContext.jsx';
import { useCommonsChrome } from '../../commonsState/CommonsChromeContext.jsx';
import { useUnsavedGuard } from '../../commonsState/NavGuardContext.jsx';
import { upsertUserProfile, uploadAvatar } from '../../../data/auth/profileQueries.js';
import { resolveMemberIdentity } from '../../../data/commons/identity.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { ConfirmDialog } from '../../ConfirmDialog.jsx';
import { IconExit } from '../../icons.jsx';

export function AccountPage() {
  const { locale } = useAppContext();
  const a = resolveCommonsShellContent(locale).account;
  const { user, profile, refreshProfile, signOut, deleteAccount } = useAccount();
  const navigate = useNavigate();

  const currentName = profile?.displayName ?? '';
  const [name,    setName]    = useState(currentName);
  const [preview, setPreview] = useState(profile?.avatarUrl ?? null);
  const [file,    setFile]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');
  const [deleteState, setDeleteState] = useState('idle'); // idle | confirming | deleting
  const [deleteError, setDeleteError] = useState('');
  const fileRef = useRef(null);

  useCommonsChrome({ title: a.title, showBack: true });

  const dirty = name.trim() !== currentName.trim() || !!file;
  useUnsavedGuard(dirty && !saving);

  // Resolved identity drives the avatar initials when no photo is set (account name, email fallback).
  const identity = resolveMemberIdentity({ accountProfile: { displayName: name }, email: user?.email });
  const initials = (identity.displayName || '?')
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    let avatarUrl = profile?.avatarUrl ?? null;
    if (file) {
      const { url, error: uploadErr } = await uploadAvatar(user.id, file);
      if (uploadErr) { setError(uploadErr); setSaving(false); return; }
      avatarUrl = url;
    }

    const err = await upsertUserProfile(user.id, { displayName: name, avatarUrl });
    setSaving(false);
    if (err) { setError(err); return; }

    refreshProfile({ displayName: name, avatarUrl });
    setFile(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  async function handleDelete() {
    setDeleteError('');
    setDeleteState('deleting');
    const err = await deleteAccount();
    if (err) { setDeleteError(err); setDeleteState('confirming'); return; }
    await signOut();
    navigate('/');
  }

  return (
    <div className="commons-screen">
      <motion.div className="commons-screen__body commons-account"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}>

        <p className="commons-account__intro">{a.intro}</p>

        <form className="commons-account__form" onSubmit={handleSave}>
          <div className="commons-account__avatarWrap">
            <button type="button" className="commons-account__avatarBtn"
              onClick={() => fileRef.current?.click()} aria-label={a.changeAvatar}>
              {preview
                ? <img className="commons-account__avatarImg" src={preview} alt="" />
                : <span className="commons-account__initials">{initials}</span>}
              <span className="commons-account__avatarOverlay">{a.changeAvatar}</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="commons-account__file"
              onChange={handleFileChange} aria-label={a.changeAvatar} />
          </div>

          <label className="commons-field">
            <span className="commons-field__label">{a.nameLabel}</span>
            <input className="commons-field__input" type="text" value={name}
              placeholder={a.namePlaceholder} autoComplete="name"
              onChange={e => setName(e.target.value)} />
          </label>

          <label className="commons-field">
            <span className="commons-field__label">{a.emailLabel}</span>
            <input className="commons-field__input" type="email" value={user?.email ?? ''}
              disabled readOnly />
          </label>

          {error && <p className="commons-account__error" role="alert">{error}</p>}

          <button className="commons-btn commons-btn--primary commons-screen__save" type="submit" disabled={saving || !dirty}>
            {saving ? a.saving : saved ? a.saved : a.save}
          </button>
        </form>

        <button type="button" className="commons-account__signout" onClick={handleSignOut}>
          <IconExit size={18} /> {a.signOut}
        </button>

        <div className="commons-account__danger">
          <button type="button" className="commons-screen__delete" onClick={() => setDeleteState('confirming')}>
            {a.deleteAccount}
          </button>
        </div>
      </motion.div>

      {(deleteState === 'confirming' || deleteState === 'deleting') && (
        <ConfirmDialog
          title={a.deleteTitle}
          body={deleteError ? `${a.deleteBody}\n\n${a.errorPrefix} ${deleteError}` : a.deleteBody}
          confirmLabel={deleteState === 'deleting' ? a.deleting : a.deleteConfirm}
          cancelLabel={a.cancel}
          onConfirm={handleDelete}
          onCancel={() => { if (deleteState !== 'deleting') { setDeleteState('idle'); setDeleteError(''); } }}
        />
      )}
    </div>
  );
}
