// src/pages/profile/ProfilePage.jsx
// Profile editing: display name, avatar upload, and account deletion.

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { useAppContext } from '../../app/appState/useAppContext.js';
import { upsertUserProfile, uploadAvatar, deleteAccount } from '../../data/auth/profileQueries.js';
import { supabase } from '../../data/timeline/supabaseClient.js';
import { resolveProfileContent } from './resolveProfileContent.js';
import './ProfilePage.css';

export function ProfilePage() {
  const { locale } = useAppContext();
  const ui = resolveProfileContent(locale);
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const currentName   = profile?.displayName ?? user?.user_metadata?.full_name ?? '';
  const currentAvatar = profile?.avatarUrl    ?? user?.user_metadata?.avatar_url ?? null;

  const [name,    setName]    = useState(currentName);
  const [preview, setPreview] = useState(currentAvatar);
  const [file,    setFile]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');
  const [deleteState, setDeleteState] = useState('idle');
  const [deleteError, setDeleteError] = useState('');
  const fileRef = useRef(null);

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
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleDelete() {
    setDeleteError('');
    setDeleteState('deleting');
    const err = await deleteAccount(user.id);
    if (err) {
      setDeleteError(err);
      setDeleteState('idle');
      return;
    }
    await supabase.auth.signOut();
    navigate('/');
  }

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="profile-page">
      <h1 className="profile-page__title">{ui.pageTitle}</h1>

      <form className="profile-form" onSubmit={handleSave}>
        <div className="profile-avatar-wrap">
          <button
            type="button"
            className="profile-avatar-btn"
            onClick={() => fileRef.current?.click()}
            aria-label={ui.changeAvatarLabel}
          >
            {preview ? (
              <img className="profile-avatar__img" src={preview} alt={name} />
            ) : (
              <span className="profile-avatar__initials">{initials}</span>
            )}
            <span className="profile-avatar__overlay">{ui.changeOverlay}</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="profile-avatar__file-input"
            onChange={handleFileChange}
            aria-label={ui.uploadAvatarLabel}
          />
        </div>

        <label className="profile-form__label" htmlFor="profile-name">{ui.displayNameLabel}</label>
        <input
          id="profile-name"
          className="profile-form__input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          autoComplete="name"
        />

        {error && <p className="profile-form__error" role="alert">{error}</p>}

        <button className="profile-form__save" type="submit" disabled={saving}>
          {saving ? ui.savingButton : saved ? ui.savedButton : ui.saveButton}
        </button>
      </form>

          <div className="profile-delete-section">
            <hr className="profile-delete-divider" />

            {deleteState === 'idle' && (
              <button
                type="button"
                className="profile-delete-btn"
                onClick={() => setDeleteState('confirming')}
              >
                {ui.deleteAccountButton}
              </button>
            )}

            {(deleteState === 'confirming' || deleteState === 'deleting') && (
              <div className="profile-delete-confirm" role="alert">
                <p className="profile-delete-confirm__text">{ui.deleteConfirmText}</p>
                {deleteError && (
                  <p className="profile-delete-confirm__error">
                    {ui.deleteErrorPrefix} {deleteError}
                  </p>
                )}
                <div className="profile-delete-confirm__actions">
                  <button
                    type="button"
                    className="profile-delete-confirm__cancel"
                    onClick={() => setDeleteState('idle')}
                    disabled={deleteState === 'deleting'}
                  >
                    {ui.deleteCancelButton}
                  </button>
                  <button
                    type="button"
                    className="profile-delete-confirm__submit"
                    onClick={handleDelete}
                    disabled={deleteState === 'deleting'}
                  >
                    {deleteState === 'deleting' ? ui.deletingButton : ui.deleteConfirmButton}
                  </button>
                </div>
              </div>
            )}
          </div>
    </div>
  );
}
