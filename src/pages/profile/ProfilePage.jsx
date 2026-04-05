// src/pages/profile/ProfilePage.jsx
// Profile editing: display name and avatar upload.

import { useState, useRef } from 'react';
import { useAuth } from '../../app/appState/AuthContext.jsx';
import { upsertUserProfile, uploadAvatar } from '../../data/auth/profileQueries.js';
import './ProfilePage.css';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();

  const currentName   = profile?.displayName ?? user?.user_metadata?.full_name ?? '';
  const currentAvatar = profile?.avatarUrl    ?? user?.user_metadata?.avatar_url ?? null;

  const [name,    setName]    = useState(currentName);
  const [preview, setPreview] = useState(currentAvatar);
  const [file,    setFile]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');
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

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="profile-page">
      <h1 className="profile-page__title">הפרופיל שלי</h1>

      <form className="profile-form" onSubmit={handleSave}>
        <div className="profile-avatar-wrap">
          <button
            type="button"
            className="profile-avatar-btn"
            onClick={() => fileRef.current?.click()}
            aria-label="שנה תמונת פרופיל"
          >
            {preview ? (
              <img className="profile-avatar__img" src={preview} alt={name} />
            ) : (
              <span className="profile-avatar__initials">{initials}</span>
            )}
            <span className="profile-avatar__overlay">שנה</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="profile-avatar__file-input"
            onChange={handleFileChange}
            aria-label="העלה תמונת פרופיל"
          />
        </div>

        <label className="profile-form__label" htmlFor="profile-name">שם תצוגה</label>
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
          {saving ? 'שומר...' : saved ? 'נשמר!' : 'שמור שינויים'}
        </button>
      </form>
    </div>
  );
}
