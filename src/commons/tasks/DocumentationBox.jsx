// src/commons/tasks/DocumentationBox.jsx
// "מה קרה כאן" — the per-node documentation log. Lazy: when empty it shows only an add affordance;
// once there is ≥1 entry (or the composer is opened) it shows composer + newest-first feed.
// Everyone reads; only managers see the delete control.

import { useState } from 'react';
import { useNodeEntries } from '../commonsState/useNodeEntries.js';
import { signedUrl } from '../../data/commons/entryQueries.js';
import { ConfirmDialog } from '../ConfirmDialog.jsx';

const URL_RE = /^https?:\/\/\S+$/i;

function relTime(iso, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US',
      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch { return ''; }
}

function PhotoEntry({ entry }) {
  const [src, setSrc] = useState(null);
  if (src === null) { signedUrl(entry.url).then(u => setSrc(u ?? '')); }
  return src
    ? <a href={src} target="_blank" rel="noreferrer"><img className="commons-entry__photo" src={src} alt={entry.body || entry.file_name || ''} /></a>
    : <div className="commons-entry__photo commons-entry__photo--loading" aria-hidden="true" />;
}

function FileEntry({ entry, v }) {
  async function open() { const u = await signedUrl(entry.url); if (u) window.open(u, '_blank', 'noopener'); }
  return (
    <button type="button" className="commons-entry__chip" onClick={open}>
      📎 {entry.file_name || v.docFile}{entry.file_size ? ` · ${Math.round(entry.file_size / 1024)}KB` : ''}
    </button>
  );
}

export function DocumentationBox({ nodeId, workspaceId, v, locale, roster, canManage, MAX = 5 * 1024 * 1024 }) {
  const { entries, addNote, addFile, remove } = useNodeEntries(nodeId, workspaceId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [err, setErr] = useState('');

  const has = entries.length > 0;
  if (!has && !open) {
    return (
      <div className="commons-view__block">
        <button type="button" className="commons-docAdd" onClick={() => setOpen(true)}>➕ {v.docAdd}</button>
      </div>
    );
  }

  async function postNote() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try { await addNote({ kind: URL_RE.test(body) ? 'link' : 'note', body }); setText(''); }
    finally { setBusy(false); }
  }
  async function pickFile(e, kind) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX) { setErr(v.docTooBig); return; }
    setErr(''); setBusy(true);
    try { await addFile(file, kind); } catch { setErr(v.docTooBig); } finally { setBusy(false); }
  }
  function addLink() {
    const url = window.prompt(v.docLinkPrompt);
    if (url && URL_RE.test(url.trim())) addNote({ kind: 'link', body: url.trim() });
  }

  return (
    <div className="commons-view__block">
      <div className="commons-view__label">{v.docTitle}{has ? ` · ${entries.length}` : ''}</div>

      <div className="commons-composer">
        <textarea className="commons-composer__in" rows={2} value={text} placeholder={v.docPlaceholder}
          onChange={e => setText(e.target.value)} aria-label={v.docPlaceholder} />
        <div className="commons-composer__bar">
          <label className="commons-attBtn" title={v.docPhoto}>📷
            <input type="file" accept="image/*" hidden aria-label={v.docPhoto} onChange={e => pickFile(e, 'photo')} /></label>
          <button type="button" className="commons-attBtn" title={v.docLink} aria-label={v.docLink} onClick={addLink}>🔗</button>
          <label className="commons-attBtn" title={v.docFile}>📎
            <input type="file" hidden aria-label={v.docFile} onChange={e => pickFile(e, 'file')} /></label>
          <button type="button" className="commons-composer__send" disabled={busy || !text.trim()} onClick={postNote}>{v.docPost}</button>
        </div>
        {err && <div className="commons-composer__err">{err}</div>}
      </div>

      <ul className="commons-feed">
        {entries.map(en => {
          const who = roster.find(m => m.id === en.created_by);
          const name = who?.display_name ?? '—';
          return (
            <li key={en.id} className="commons-entry">
              <span className="commons-entry__ava" aria-hidden="true">{[...name][0] ?? '·'}</span>
              <div className="commons-entry__body">
                <div className="commons-entry__top">
                  <span className="commons-entry__name">{name}</span>
                  <span className="commons-entry__time">{relTime(en.created_at, locale)}</span>
                </div>
                {(en.kind === 'note' || en.kind === 'link') && en.body && (
                  en.kind === 'link'
                    ? <a className="commons-entry__chip" href={en.body} target="_blank" rel="noreferrer">🔗 {en.body}</a>
                    : <div className="commons-entry__text">{en.body}</div>
                )}
                {en.kind === 'photo' && <PhotoEntry entry={en} />}
                {en.kind === 'file' && <FileEntry entry={en} v={v} />}
                {en.is_completion && <span className="commons-entry__badge">✓ {v.docCompletionBadge}</span>}
              </div>
              {canManage && (
                <button type="button" className="commons-entry__del" title={v.docDelete} aria-label={v.docDelete}
                  onClick={() => setDelTarget(en)}>🗑</button>
              )}
            </li>
          );
        })}
      </ul>

      {delTarget && (
        <ConfirmDialog title={v.docDeleteTitle} body={v.docDeleteBody}
          confirmLabel={v.docDelete} cancelLabel={v.docDeleteCancel}
          onConfirm={async () => { const t = delTarget; setDelTarget(null); await remove(t); }}
          onCancel={() => setDelTarget(null)} />
      )}
    </div>
  );
}
