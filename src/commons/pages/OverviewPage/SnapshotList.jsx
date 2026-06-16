// src/commons/pages/OverviewPage/SnapshotList.jsx
// The accessible linear layer under the ring. Always in the DOM (visually-hidden) as an ordered list of
// every in-scope leaf with a full label; a visible "רשימה" toggle reveals it on screen. The radial ring
// is an enhancement over this base (IS 5568).

import { useState } from 'react';

export function SnapshotList({ items, statusLabel, toggleLabel, onOpen }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`commons-snapList${open ? ' is-visible' : ''}`}>
      <button type="button" className="commons-snapList__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {toggleLabel}
      </button>
      <ul className="commons-snapList__ul">
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => onOpen(n.id)} aria-label={`${n.title} — ${statusLabel(n)}`}>
              {n.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
