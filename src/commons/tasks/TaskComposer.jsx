// src/commons/tasks/TaskComposer.jsx
// The shared add-entry composer for a task: a plain-text note + three attachment affordances —
// 📷 (camera / gallery menu), 🔗 (in-app link form: URL + a required short name), 📎 (file).
// Owns its own field/menu/busy/error state; parents pass async post handlers and read nothing back.
// Used by DocumentationBox (per-occurrence log) and StandingAttachments (recurring standing reference).

import { useEffect, useRef, useState } from 'react';

const URL_RE = /^https?:\/\/\S+$/i;

export function TaskComposer({ v, placeholder, onNote, onLink, onFile, MAX = 5 * 1024 * 1024 }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [imgOpen, setImgOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');

  const imgRef = useRef(null);
  const linkRef = useRef(null);
  const urlRef = useRef(null);

  // Close the image menu / link form on outside click or Escape (in-app, theme-aware — no native UI).
  useEffect(() => {
    if (!imgOpen && !linkOpen) return;
    function onDown(e) {
      if (imgOpen && imgRef.current && !imgRef.current.contains(e.target)) setImgOpen(false);
      if (linkOpen && linkRef.current && !linkRef.current.contains(e.target)) closeLink();
    }
    function onKey(e) { if (e.key === 'Escape') { setImgOpen(false); closeLink(); } }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [imgOpen, linkOpen]);

  useEffect(() => { if (linkOpen) urlRef.current?.focus(); }, [linkOpen]);

  function closeLink() { setLinkOpen(false); setUrl(''); setName(''); }

  async function postNote() {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try { await onNote(body); setText(''); }
    finally { setBusy(false); }
  }

  const linkValid = URL_RE.test(url.trim()) && name.trim().length > 0;
  async function postLink() {
    if (!linkValid) return;
    setBusy(true);
    try { await onLink({ url: url.trim(), label: name.trim() }); closeLink(); }
    finally { setBusy(false); }
  }

  async function pickFile(e, kind) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setImgOpen(false);
    if (!file) return;
    if (file.size > MAX) { setErr(v.docTooBig); return; }
    setErr(''); setBusy(true);
    try { await onFile(file, kind); } catch { setErr(v.docTooBig); } finally { setBusy(false); }
  }

  return (
    <div className="commons-composer">
      <textarea className="commons-composer__in" rows={2} value={text} placeholder={placeholder}
        onChange={e => setText(e.target.value)} aria-label={placeholder} />

      {linkOpen && (
        <div className="commons-linkForm" ref={linkRef}>
          <input ref={urlRef} type="url" inputMode="url" className="commons-linkForm__in" value={url}
            placeholder={v.docLinkUrl} aria-label={v.docLinkUrl} onChange={e => setUrl(e.target.value)} />
          <input type="text" className="commons-linkForm__in" value={name}
            placeholder={v.docLinkName} aria-label={v.docLinkName} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && linkValid) postLink(); }} />
          <div className="commons-linkForm__bar">
            <button type="button" className="commons-btn commons-btn--ghost commons-btn--sm" onClick={closeLink}>{v.docLinkCancel}</button>
            <button type="button" className="commons-btn commons-btn--primary commons-btn--sm" disabled={!linkValid || busy} onClick={postLink}>{v.docLinkAdd}</button>
          </div>
        </div>
      )}

      <div className="commons-composer__bar">
        <div className="commons-imgPick" ref={imgRef}>
          <button type="button" className="commons-attBtn" title={v.docPhoto} aria-label={v.docPhoto}
            aria-haspopup="menu" aria-expanded={imgOpen} onClick={() => { setImgOpen(o => !o); closeLink(); }}>📷</button>
          {imgOpen && (
            <div className="commons-imgMenu" role="menu">
              <label className="commons-imgMenu__item" role="menuitem">📷 {v.docImgCamera}
                <input type="file" accept="image/*" capture="environment" hidden aria-label={v.docImgCamera} onChange={e => pickFile(e, 'photo')} /></label>
              <label className="commons-imgMenu__item" role="menuitem">🖼️ {v.docImgGallery}
                <input type="file" accept="image/*" hidden aria-label={v.docImgGallery} onChange={e => pickFile(e, 'photo')} /></label>
            </div>
          )}
        </div>
        <button type="button" className="commons-attBtn" title={v.docLink} aria-label={v.docLink}
          aria-expanded={linkOpen} onClick={() => { setLinkOpen(o => !o); setImgOpen(false); }}>🔗</button>
        <label className="commons-attBtn" title={v.docFile}>📎
          <input type="file" hidden aria-label={v.docFile} onChange={e => pickFile(e, 'file')} /></label>
        <button type="button" className="commons-composer__send" disabled={busy || !text.trim()} onClick={postNote}>{v.docPost}</button>
      </div>
      {err && <div className="commons-composer__err">{err}</div>}
    </div>
  );
}
