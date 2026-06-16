// src/commons/pages/OverviewPage/SnapshotList.jsx
// The full picture behind "רשימה": EVERY today's leaf — done (✓ + who) and open (○ + "עד <time>").
// Always in the DOM (visually-hidden) so it doubles as the accessible linear layer under the ring
// (IS 5568); the toggle reveals it on screen.

import { useState } from 'react';

function fmtTime(iso, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
  catch { return ''; }
}

export function SnapshotList({ items, t, locale, onOpen }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`commons-snapList${open ? ' is-visible' : ''}`}>
      <button type="button" className="commons-snapList__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {t.listToggle}
      </button>
      <ul className="commons-snapList__ul">
        {items.map((n) => {
          const done = n.status === 'done';
          let meta;
          if (done) {
            meta = n.doer ? `${t.by} ${n.doer}` : t.listDone;
          } else {
            const parts = [];
            if (n.owner) parts.push(`${t.onPerson} ${n.owner}`);          // already taken → by whom
            if (n.due) parts.push(`${t.until} ${fmtTime(n.due, locale)}`);
            meta = parts.length ? parts.join(' · ') : t.listOpen;
          }
          return (
            <li key={n.id}>
              <button type="button" onClick={() => onOpen(n.id)}
                aria-label={`${n.title} — ${done ? t.listDone : t.listOpen}${meta ? `, ${meta}` : ''}`}>
                <span className={`commons-snapList__mark${done ? ' is-done' : ''}`} aria-hidden="true">{done ? '✓' : '○'}</span>
                <span className="commons-snapList__title">{n.title}</span>
                <span className="commons-snapList__meta">{meta}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
