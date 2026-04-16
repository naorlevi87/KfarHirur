// src/pages/admin/components/MediaGalleryModal.jsx
// Native <dialog> modal for editing media: gallery, single image, or video.
// Props:
//   open       {boolean}
//   title      {string}
//   type       {'gallery' | 'single' | 'video'}
//   value      {string[] | string | {type:'youtube'|'upload', url:string} | null}
//   onSave     {(newValue) => void}
//   onClose    {() => void}

import { useEffect, useRef, useState } from 'react';
import { uploadToHomepage, deleteStorageFile } from '../../../data/admin/mediaQueries.js';
import './MediaGalleryModal.css';

// ── YouTube embed URL ──────────────────────────────────────────────────────────
function toYouTubeEmbed(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

// ── Gallery (multi-image) ──────────────────────────────────────────────────────
function GalleryEditor({ items, setItems }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function moveUp(i) {
    if (i === 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setItems(next);
  }

  function moveDown(i) {
    if (i === items.length - 1) return;
    const next = [...items];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setItems(next);
  }

  async function remove(i) {
    const url = items[i];
    await deleteStorageFile(url).catch(() => {});
    setItems(items.filter((_, idx) => idx !== i));
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadToHomepage(f)));
      setItems([...items, ...urls]);
    } catch (err) {
      setError(err.message ?? 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <>
      <div className="mgm-grid">
        {items.map((url, i) => (
          <div key={i} className="mgm-thumb">
            <img src={url} alt={`תמונה ${i + 1}`} />
            <div className="mgm-thumb__controls">
              <button className="mgm-thumb__btn" onClick={() => moveUp(i)} disabled={i === 0} aria-label="הזז למעלה">↑</button>
              <button className="mgm-thumb__btn" onClick={() => moveDown(i)} disabled={i === items.length - 1} aria-label="הזז למטה">↓</button>
              <button className="mgm-thumb__btn mgm-thumb__btn--delete" onClick={() => remove(i)} aria-label="מחק">×</button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mgm-error">{error}</p>}
      <button
        className="mgm-add-btn"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'מעלה...' : '+ הוסף תמונות'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFiles}
      />
    </>
  );
}

// ── Single image ───────────────────────────────────────────────────────────────
function SingleEditor({ value, setValue }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadToHomepage(file);
      setValue(url);
    } catch (err) {
      setError(err.message ?? 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemove() {
    await deleteStorageFile(value).catch(() => {});
    setValue('');
  }

  return (
    <div className="mgm-single">
      {value
        ? <img className="mgm-single__preview" src={value} alt="תמונה נוכחית" />
        : <div className="mgm-single__empty">אין תמונה</div>
      }
      {error && <p className="mgm-error">{error}</p>}
      <div className="mgm-single__actions">
        <button
          className="mgm-action-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'מעלה...' : value ? 'החלף' : 'העלה תמונה'}
        </button>
        {value && (
          <button className="mgm-action-btn mgm-action-btn--danger" onClick={handleRemove}>
            מחק
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}

// ── Video (YouTube or upload) ──────────────────────────────────────────────────
function VideoEditor({ value, setValue }) {
  const fileRef = useRef(null);
  const [tab, setTab] = useState(value?.type ?? 'youtube');
  const [urlInput, setUrlInput] = useState(value?.type === 'youtube' ? (value.url ?? '') : '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Restore YouTube URL input when switching back to youtube tab
  useEffect(() => {
    if (tab === 'youtube' && value?.type === 'youtube') {
      setUrlInput(value.url ?? '');
    }
  }, [tab]);

  const embedUrl = tab === 'youtube' ? toYouTubeEmbed(urlInput) : null;

  function handleUrlChange(e) {
    setUrlInput(e.target.value);
    setValue({ type: 'youtube', url: e.target.value });
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const url = await uploadToHomepage(file);
      setValue({ type: 'upload', url });
    } catch (err) {
      setError(err.message ?? 'שגיאה בהעלאה');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleRemove() {
    setValue(null);
    setUrlInput('');
  }

  return (
    <div className="mgm-video">
      <div className="mgm-video__tabs">
        {['youtube', 'upload'].map(t => (
          <button
            key={t}
            className={`mgm-video__tab${tab === t ? ' mgm-video__tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'youtube' ? 'YouTube' : 'העלאה ישירה'}
          </button>
        ))}
      </div>

      {tab === 'youtube' && (
        <>
          <input
            className="mgm-video__input"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={urlInput}
            onChange={handleUrlChange}
          />
          {embedUrl && (
            <div className="mgm-video__preview">
              <iframe src={embedUrl} title="YouTube preview" allowFullScreen />
            </div>
          )}
        </>
      )}

      {tab === 'upload' && (
        <>
          {value?.type === 'upload' && value.url && (
            <div className="mgm-video__current">{value.url}</div>
          )}
          <button
            className="mgm-action-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'מעלה...' : 'בחר קובץ וידאו'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </>
      )}

      {error && <p className="mgm-error">{error}</p>}

      {value?.url && (
        <button className="mgm-action-btn mgm-action-btn--danger" onClick={handleRemove}>
          הסר וידאו
        </button>
      )}
    </div>
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────────
export function MediaGalleryModal({ open, title, type, value, onSave, onClose }) {
  const dialogRef = useRef(null);

  // Local working copy — discarded on cancel, committed on save
  const [localValue, setLocalValue] = useState(value);

  // Sync local state when modal opens with new value
  useEffect(() => {
    if (open) {
      setLocalValue(type === 'gallery' ? (Array.isArray(value) ? [...value] : []) : value ?? (type === 'single' ? '' : null));
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open, value, type]);

  // Close on backdrop click
  function handleDialogClick(e) {
    if (e.target === dialogRef.current) onClose();
  }

  function handleSave() {
    onSave(localValue);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="mgm-backdrop"
      onClick={handleDialogClick}
      onClose={onClose}
      dir="rtl"
    >
      <div className="mgm-header">
        <h2 className="mgm-title">{title}</h2>
        <button className="mgm-close-btn" onClick={onClose} aria-label="סגור">×</button>
      </div>

      <div className="mgm-body">
        {type === 'gallery' && (
          <GalleryEditor items={localValue} setItems={setLocalValue} />
        )}
        {type === 'single' && (
          <SingleEditor value={localValue} setValue={setLocalValue} />
        )}
        {type === 'video' && (
          <VideoEditor value={localValue} setValue={setLocalValue} />
        )}
      </div>

      <div className="mgm-footer">
        <button className="mgm-cancel-btn" onClick={onClose}>ביטול</button>
        <button className="mgm-save-btn" onClick={handleSave}>שמור</button>
      </div>
    </dialog>
  );
}
