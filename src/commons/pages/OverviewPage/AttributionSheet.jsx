// src/commons/pages/OverviewPage/AttributionSheet.jsx
// A small bottom sheet for "זה כן קרה" (resolve a missed item): pick WHO did it (or "not sure") + WHEN
// (now, or an earlier time today). onConfirm({ memberId, doneAt }) — doneAt is an ISO string or null
// (→ server uses now()).

import { useState } from 'react';

// Mounted only while open (the parent conditionally renders it), so each open is a fresh instance —
// no reset effect needed.
export function AttributionSheet({ members, t, onConfirm, onCancel }) {
  const [memberId, setMemberId] = useState(null);
  const [earlier, setEarlier] = useState(false);
  const [time, setTime] = useState('');

  const confirm = () => {
    let doneAt = null;
    if (earlier && time) {
      const d = new Date();
      const [h, m] = time.split(':');
      d.setHours(Number(h), Number(m), 0, 0);
      doneAt = d.toISOString();
    }
    onConfirm({ memberId, doneAt });
  };

  return (
    <div className="commons-attribBackdrop" onClick={onCancel}>
      <div className="commons-attrib" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 className="commons-attrib__title">{t.whoTitle}</h3>

        <div className="commons-attrib__members">
          {members.map((m) => (
            <button key={m.id} type="button"
              className={`commons-attrib__member${memberId === m.id ? ' is-on' : ''}`}
              aria-pressed={memberId === m.id}
              onClick={() => setMemberId(m.id)}>
              {m.display_name}
            </button>
          ))}
          <button type="button"
            className={`commons-attrib__member${memberId === null ? ' is-on' : ''}`}
            aria-pressed={memberId === null}
            onClick={() => setMemberId(null)}>
            {t.nobody}
          </button>
        </div>

        <div className="commons-attrib__when">
          <button type="button" className={`commons-attrib__chip${!earlier ? ' is-on' : ''}`} onClick={() => setEarlier(false)}>{t.whenNow}</button>
          <button type="button" className={`commons-attrib__chip${earlier ? ' is-on' : ''}`} onClick={() => setEarlier(true)}>{t.whenEarlier}</button>
          {earlier && (
            <input type="time" className="commons-attrib__time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t.whenEarlier} />
          )}
        </div>

        <div className="commons-attrib__actions">
          <button type="button" className="commons-attrib__btn" onClick={onCancel}>{t.cancel}</button>
          <button type="button" className="commons-attrib__btn is-primary" onClick={confirm}>{t.confirm}</button>
        </div>
      </div>
    </div>
  );
}
