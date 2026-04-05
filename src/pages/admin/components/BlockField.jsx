// src/pages/admin/components/BlockField.jsx
// Inline editor for a single block. Expands to show fields by block_type.

import { useState } from 'react';
import { NaorShayInput } from './NaorShayInput.jsx';
import { MediaInput } from './MediaInput.jsx';
import { updateBlock, deleteBlock } from '../../../data/admin/timelineAdminQueries.js';
import './BlockField.css';

const EMBED_TYPES = ['youtube', 'facebook', 'instagram'];

const EMBED_PLACEHOLDERS = {
  youtube:   'https://www.youtube.com/watch?v=...',
  facebook:  'https://www.facebook.com/photo?...',
  instagram: 'https://www.instagram.com/p/...',
};

const EMBED_HINTS = {
  youtube:   'קישור לסרטון מיוטיוב',
  facebook:  'קישור לפוסט או תמונה מפייסבוק',
  instagram: 'קישור לפוסט או ריל מאינסטגרם',
};

const BLOCK_LABELS = {
  text:      'טקסט',
  image:     'תמונה',
  video:     'וידאו',
  link:      'לינק',
  cta:       'כפתור',
  youtube:   'YouTube',
  facebook:  'Facebook',
  instagram: 'Instagram',
};

const VISIBILITY_OPTIONS = [
  { value: 'both',      label: 'שניהם' },
  { value: 'naor_only', label: 'נאור בלבד' },
  { value: 'shay_only', label: 'שי בלבד' },
];

// Initialize "different" toggles: true if naor !== shay for a given field
function initDiff(content, fields) {
  const diff = {};
  fields.forEach(f => {
    diff[f] = (content?.naor?.[f] ?? '') !== (content?.shay?.[f] ?? '');
  });
  return diff;
}

export function BlockField({ block, onDeleted, onSaved }) {
  const [expanded,   setExpanded]   = useState(false);
  const [content,    setContent]    = useState(block.content ?? { naor: {}, shay: {} });
  const [visibility, setVisibility] = useState(block.visibility ?? 'both');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const fields = getFieldsForType(block.block_type);
  const [diff, setDiff] = useState(() => initDiff(block.content, fields.map(f => f.key)));

  function handleFieldChange(fieldKey, val) {
    setContent(prev => ({
      naor: { ...prev.naor, [fieldKey]: val.naor },
      shay: { ...prev.shay, [fieldKey]: val.shay },
    }));
  }

  function handleMediaChange(fieldKey, mode, url) {
    setContent(prev => ({
      ...prev,
      [mode]: { ...prev[mode], [fieldKey]: url },
    }));
  }

  function toggleDiff(fieldKey) {
    setDiff(prev => {
      const next = { ...prev, [fieldKey]: !prev[fieldKey] };
      // When turning off: sync shay to naor
      if (!next[fieldKey]) {
        setContent(c => ({
          ...c,
          shay: { ...c.shay, [fieldKey]: c.naor?.[fieldKey] ?? '' },
        }));
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await updateBlock(block.id, { content, visibility });
      onSaved?.({ ...block, content, visibility });
      setExpanded(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('למחוק את הבלוק?')) return;
    try {
      await deleteBlock(block.id);
      onDeleted?.(block.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={`block-field ${expanded ? 'block-field--open' : ''}`}>
      <div className="block-field__bar" onClick={() => setExpanded(e => !e)}>
        <span className="block-field__type-badge">{BLOCK_LABELS[block.block_type] ?? block.block_type}</span>
        <span className="block-field__preview">{previewText(block.content)}</span>
        <span className="block-field__vis">{visibility !== 'both' ? visibility : ''}</span>
        <span className="block-field__chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="block-field__body">
          <div className="block-field__row">
            <label className="block-field__vis-label">נראות</label>
            <select
              className="block-field__vis-select"
              value={visibility}
              onChange={e => setVisibility(e.target.value)}
            >
              {VISIBILITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {fields.length === 0 && EMBED_TYPES.includes(block.block_type) && (
            <div className="block-field__embed-input">
              <label className="block-field__embed-label">קישור</label>
              <input
                className="block-field__embed-url"
                type="url"
                dir="ltr"
                placeholder={EMBED_PLACEHOLDERS[block.block_type] ?? 'https://...'}
                value={content.naor?.url ?? ''}
                onChange={e => {
                  const url = e.target.value;
                  setContent(prev => ({ naor: { ...prev.naor, url }, shay: { ...prev.shay, url } }));
                }}
              />
              <p className="block-field__embed-hint">{EMBED_HINTS[block.block_type] ?? ''}</p>
            </div>
          )}

          {fields.map(field => field.isMedia ? (
            <div key={field.key} className="block-field__media-pair">
              <MediaInput
                label={`${field.label} — נאור`}
                value={content.naor?.[field.key] ?? ''}
                onChange={url => handleMediaChange(field.key, 'naor', url)}
              />
              <MediaInput
                label={`${field.label} — שי`}
                value={content.shay?.[field.key] ?? ''}
                onChange={url => handleMediaChange(field.key, 'shay', url)}
              />
            </div>
          ) : (
            <NaorShayInput
              key={field.key}
              label={field.label}
              multiline={field.multiline}
              value={{
                naor: content.naor?.[field.key] ?? '',
                shay: content.shay?.[field.key] ?? '',
              }}
              onChange={val => handleFieldChange(field.key, val)}
              isDifferent={diff[field.key] ?? false}
              onToggleDifferent={() => toggleDiff(field.key)}
            />
          ))}

          {error && <p className="block-field__error">{error}</p>}

          <div className="block-field__actions">
            <button className="block-field__save" onClick={handleSave} disabled={saving}>
              {saving ? 'שומר...' : 'שמור בלוק'}
            </button>
            <button className="block-field__delete" onClick={handleDelete}>מחק</button>
          </div>
        </div>
      )}
    </div>
  );
}

function getFieldsForType(type) {
  switch (type) {
    case 'text':  return [{ key: 'text',  label: 'טקסט', multiline: true }];
    case 'image': return [
      { key: 'url',     label: 'תמונה', isMedia: true },
      { key: 'caption', label: 'כיתוב' },
    ];
    case 'video': return [
      { key: 'url',           label: 'וידאו', isMedia: true },
      { key: 'thumbnail_url', label: 'תמונה ממוזערת', isMedia: true },
      { key: 'caption',       label: 'כיתוב' },
    ];
    case 'link': return [
      { key: 'label', label: 'טקסט הלינק' },
      { key: 'url',   label: 'כתובת URL' },
    ];
    case 'cta': return [
      { key: 'label', label: 'טקסט הכפתור' },
      { key: 'url',   label: 'כתובת URL' },
      { key: 'style', label: 'סגנון' },
    ];
    case 'youtube':
    case 'facebook':
    case 'instagram':
      return []; // handled by embed input above
    default: return [];
  }
}

function previewText(content) {
  const t = content?.naor?.text || content?.naor?.label || content?.naor?.url || '';
  return t.length > 40 ? t.slice(0, 40) + '...' : t;
}
