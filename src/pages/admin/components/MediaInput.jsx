// src/pages/admin/components/MediaInput.jsx
// URL input + file upload button. Returns a URL string.

import { useRef, useState } from 'react';
import { uploadMedia } from '../../../data/admin/timelineAdminQueries.js';
import './MediaInput.css';

export function MediaInput({ label, value, onChange }) {
  const inputRef  = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name}`;
      const url  = await uploadMedia(file, path);
      onChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="media-input">
      <label className="media-input__label">{label}</label>
      <div className="media-input__row">
        <input
          className="media-input__url"
          type="url"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          dir="ltr"
        />
        <button
          type="button"
          className="media-input__upload-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '...' : 'העלה'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>
      {error && <p className="media-input__error">{error}</p>}
      {value && (
        <img
          className="media-input__preview"
          src={value}
          alt=""
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
    </div>
  );
}
