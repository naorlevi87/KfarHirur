// src/commons/tasks/StandingAttachments.jsx
// "הערות קבועות" — standing reference (note / link / photo / file) attached to a recurring task's
// DEFINITION node. The same node_entries the doc-log uses, but here they mean "appears on every
// occurrence": on a base they are edited (add/remove, manager+); on an occurrence they are shown
// read-only, tagged "מהקבועה", by reading the occurrence's source definition (template_id).
// Removing one on the base makes it stop appearing everywhere (live read — no per-occurrence copy).
// Composer + entry rendering are shared (TaskComposer / EntryBody). Deliberately separate from
// DocumentationBox so the per-occurrence log and standing reference stay distinct
// (docs/superpowers/specs/2026-06-16-commons-standing-attachments-design.md).

import { useState } from 'react';
import { useNodeEntries } from '../commonsState/useNodeEntries.js';
import { ConfirmDialog } from '../ConfirmDialog.jsx';
import { IconTrash } from '../icons.jsx';
import { TaskComposer } from './TaskComposer.jsx';
import { EntryBody } from './EntryBody.jsx';

// A short, clean label for the delete-confirm body — never a giant raw URL.
function entryLabel(en) {
  if (!en) return '';
  if (en.kind === 'photo') return en.file_name || '';
  if (en.kind === 'file') return en.file_name || '';
  const text = en.body || en.url || '';
  if (en.kind === 'link' && /^https?:\/\//i.test(text)) {
    try { return new URL(text).hostname; } catch { /* fall through to truncation */ }
  }
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export function StandingAttachments({ nodeId, workspaceId, v, canManage = false, readOnly = false, MAX = 5 * 1024 * 1024 }) {
  const { entries, addNote, addFile, remove } = useNodeEntries(nodeId, workspaceId);
  const [delTarget, setDelTarget] = useState(null);
  const [delErr, setDelErr] = useState('');

  // Read-only (occurrence): show nothing if the definition has no standing attachments.
  if (readOnly && entries.length === 0) return null;

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
              <div className="commons-standing__body"><EntryBody entry={en} v={v} /></div>
              {!readOnly && canManage && (
                <button type="button" className="commons-standing__del" aria-label={v.docDelete} onClick={() => setDelTarget(en)}>
                  <IconTrash size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {delErr && <div className="commons-composer__err">{delErr}</div>}

      {!readOnly && canManage && (
        <TaskComposer v={v} placeholder={v.docPlaceholder} MAX={MAX}
          onNote={body => addNote({ kind: 'note', body })}
          onLink={({ url, label }) => addNote({ kind: 'link', body: label, url })}
          onFile={(file, kind) => addFile(file, kind)} />
      )}

      {delTarget && (
        <ConfirmDialog
          title={v.standingRemoveTitle}
          body={entryLabel(delTarget)}
          confirmLabel={v.docDelete}
          cancelLabel={v.docDeleteCancel}
          onConfirm={async () => { const t = delTarget; setDelTarget(null); setDelErr('');
            try { await remove(t); }
            catch (err) { console.error('[standing delete]', err); setDelErr(`${v.docDeleteFailed} (${err?.code || err?.message || err})`); } }}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
