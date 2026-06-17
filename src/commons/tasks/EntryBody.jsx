// src/commons/tasks/EntryBody.jsx
// Renders one node-entry's body — note / link / photo / file — shared by the per-occurrence doc feed
// (DocumentationBox) and the recurring-task standing reference (StandingAttachments). The row wrapper
// (avatar/name/time, or the "מהקבועה" tag + delete) stays with each caller; only the body lives here.

import { useState } from 'react';
import { signedUrl } from '../../data/commons/entryQueries.js';

function PhotoEntry({ entry }) {
  const [src, setSrc] = useState(null);
  if (src === null) signedUrl(entry.url).then(u => setSrc(u ?? ''));
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

export function EntryBody({ entry, v }) {
  if (entry.kind === 'photo') return <PhotoEntry entry={entry} />;
  if (entry.kind === 'file') return <FileEntry entry={entry} v={v} />;
  // Link: body is the short name (link text), url is the href. Legacy links stored the URL in body
  // with no url — fall back to it so they keep working.
  if (entry.kind === 'link' && entry.body) {
    return <a className="commons-entry__chip" href={entry.url || entry.body} target="_blank" rel="noreferrer">🔗 {entry.body}</a>;
  }
  return <div className="commons-entry__text">{entry.body}</div>;
}
