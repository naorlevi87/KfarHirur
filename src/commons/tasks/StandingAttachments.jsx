// src/commons/tasks/StandingAttachments.jsx
// "הערות קבועות" — standing reference (note / link / photo / file) attached to a recurring task's
// DEFINITION node. The same node_entries the doc-log uses, but here they mean "appears on every
// occurrence": on a base they are edited (add/remove, manager+); on an occurrence they are shown
// read-only, tagged "מהקבועה", by reading the occurrence's source definition (template_id).
// Removing one on the base makes it stop appearing everywhere (live read — no per-occurrence copy).
// Deliberately separate from DocumentationBox so the per-occurrence log and standing reference stay
// distinct (docs/superpowers/specs/2026-06-16-commons-standing-attachments-design.md).

import { useState } from 'react';
import { useNodeEntries } from '../commonsState/useNodeEntries.js';
import { signedUrl } from '../../data/commons/entryQueries.js';
import { ConfirmDialog } from '../ConfirmDialog.jsx';
import { IconTrash } from '../icons.jsx';

const URL_RE = /^https?:\/\/\S+$/i;

function PhotoEntry({ entry }) {
  const [src, setSrc] = useState(null);
  if (src === null) signedUrl(entry.url).then(u => setSrc(u ?? ''));
  return src
    ? <a href={src} target="_blank" rel="noreferrer"><img className="commons-entry__photo" src={src} alt={entry.body || entry.file_name || ''} /></a>
    : <div className="commons-entry__photo commons-entry__photo--loading" aria-hidden="true" />;
}

function FileChip({ entry, v }) {
  async function open() { const u = await signedUrl(entry.url); if (u) window.open(u, '_blank', 'noopener'); }
  return (
    <button type="button" className="commons-entry__chip" onClick={open}>
      📎 {entry.file_name || v.docFile}{entry.file_size ? ` · ${Math.round(entry.file_size / 1024)}KB` : ''}
    </button>
  );
}

// One attachment's body — shared by editable + read-only modes.
function Body({ entry, v }) {
  if (entry.kind === 'photo') return <PhotoEntry entry={entry} />;
  if (entry.kind === 'file') return <FileChip entry={entry} v={v} />;
  if (entry.kind === 'link' && entry.body) {
    return <a className="commons-entry__chip" href={entry.body} target="_blank" rel="noreferrer">🔗 {entry.body}</a>;
  }
  return <div className="commons-entry__text">{entry.body}</div>;
}

export function StandingAttachments({ nodeId, workspaceId, v, canManage = false, readOnly = false, MAX = 5 * 1024 * 1024 }) {
  const { entries, addNote, addFile, remove } = useNodeEntries(nodeId, workspaceId);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [delTarget, setDelTarget] = useState(null);

  // Read-only (occurrence): show nothing if the definition has no standing attachments.
  if (readOnly && entries.length === 0) return null;

  async function post() {
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

  return (
    <div className="commons-standing">
      <div className="commons-standing__head">
        <span className="commons-view__label">{v.standingTitle}{entries.length ? ` · ${entries.length}` : ''}</span>
        <span className="commons-standing__hint">{readOnly ? v.standingFromRoutine : v.standingHint}</span>
      </div>

      {entries.length > 0 && (
        <ul className="commons-standing__list">
          {entries.map(en => (
            <li key={en.id} className="commons-standing__item">
              <div className="commons-standing__body"><Body entry={en} v={v} /></div>
              {!readOnly && canManage && (
                <button type="button" className="commons-standing__del" aria-label={v.docDelete} onClick={() => setDelTarget(en)}>
                  <IconTrash size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && canManage && (
        <div className="commons-composer">
          <textarea className="commons-composer__in" rows={2} value={text} placeholder={v.docPlaceholder}
            onChange={e => setText(e.target.value)} aria-label={v.standingTitle} />
          <div className="commons-composer__bar">
            <label className="commons-attBtn" title={v.docPhoto}>📷
              <input type="file" accept="image/*" hidden aria-label={v.docPhoto} onChange={e => pickFile(e, 'photo')} /></label>
            <label className="commons-attBtn" title={v.docFile}>📎
              <input type="file" hidden aria-label={v.docFile} onChange={e => pickFile(e, 'file')} /></label>
            <button type="button" className="commons-composer__send" disabled={busy || !text.trim()} onClick={post}>{v.docPost}</button>
          </div>
          {err && <div className="commons-composer__err">{err}</div>}
        </div>
      )}

      {delTarget && (
        <ConfirmDialog
          title={v.standingRemoveTitle}
          body={delTarget.body || delTarget.file_name || ''}
          confirmLabel={v.docDelete}
          cancelLabel={v.docDeleteCancel}
          onConfirm={async () => { const t = delTarget; setDelTarget(null); await remove(t); }}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
