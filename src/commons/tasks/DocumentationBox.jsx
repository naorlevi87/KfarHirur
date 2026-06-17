// src/commons/tasks/DocumentationBox.jsx
// "מה קרה כאן" — the per-node documentation log. Lazy: when empty it shows only an add affordance;
// once there is ≥1 entry (or the composer is opened) it shows composer + newest-first feed.
// Everyone reads; only managers see the delete control. Composer + entry rendering are shared
// (TaskComposer / EntryBody).

import { useState } from 'react';
import { useNodeEntries } from '../commonsState/useNodeEntries.js';
import { ConfirmDialog } from '../ConfirmDialog.jsx';
import { TaskComposer } from './TaskComposer.jsx';
import { EntryBody } from './EntryBody.jsx';

function relTime(iso, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US',
      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch { return ''; }
}

export function DocumentationBox({ nodeId, workspaceId, v, locale, roster, canManage, MAX = 5 * 1024 * 1024 }) {
  const { entries, addNote, addFile, remove } = useNodeEntries(nodeId, workspaceId);
  const [open, setOpen] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [delErr, setDelErr] = useState('');

  const has = entries.length > 0;
  if (!has && !open) {
    return (
      <div className="commons-view__block">
        <button type="button" className="commons-docAdd" onClick={() => setOpen(true)}>➕ {v.docAdd}</button>
      </div>
    );
  }

  return (
    <div className="commons-view__block">
      <div className="commons-view__label">{v.docTitle}{has ? ` · ${entries.length}` : ''}</div>

      <TaskComposer v={v} placeholder={v.docPlaceholder} MAX={MAX}
        onNote={body => addNote({ kind: 'note', body })}
        onLink={({ url, label }) => addNote({ kind: 'link', body: label, url })}
        onFile={(file, kind) => addFile(file, kind)} />

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
                <EntryBody entry={en} v={v} />
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

      {delErr && <div className="commons-composer__err">{delErr}</div>}

      {delTarget && (
        <ConfirmDialog title={v.docDeleteTitle} body={v.docDeleteBody}
          confirmLabel={v.docDelete} cancelLabel={v.docDeleteCancel}
          onConfirm={async () => { const t = delTarget; setDelTarget(null); setDelErr('');
            try { await remove(t); } catch { setDelErr(v.docDeleteFailed); } }}
          onCancel={() => setDelTarget(null)} />
      )}
    </div>
  );
}
