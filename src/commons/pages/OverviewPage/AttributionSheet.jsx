// src/commons/pages/OverviewPage/AttributionSheet.jsx
// A small bottom sheet for attribution. Two modes:
//   resolve ("זה כן קרה") → pick WHO did it (or "not sure") + WHEN (now, or an earlier time today).
//   assign  ("עליו")      → pick WHO it's on (required). Manager/admin only (gated by the caller).
// onConfirm({ memberId, doneAt }) — doneAt is an ISO string or null (→ server uses now()).

import { useEffect, useState } from 'react';

export function AttributionSheet({ open, mode, members, t, onConfirm, onCancel }) {
  const [memberId, setMemberId] = useState(null);
  const [earlier, setEarlier] = useState(false);
  const [time, setTime] = useState('');

  useEffect(() => { if (open) { setMemberId(null); setEarlier(false); setTime(''); } }, [open]);

  if (!open) return null;
  const isResolve = mode === 'resolve';

  const confirm = () => {
    let doneAt = null;
    if (isResolve && earlier && time) {
      const d = new Date();
      const [h, m] = time.split(':');
      d.setHours(Number(h), Number(m), 0, 0);
      doneAt = d.toISOString();
    }
    onConfirm({ memberId, doneAt });
  };
  const canConfirm = isResolve || Boolean(memberId); // assign requires a person

  return (
    <div className="commons-sheetBackdrop" onClick={onCancel}>
      <div className="commons-attrib" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 className="commons-attrib__title">{isResolve ? t.whoTitle : t.whoAssign}</h3>

        <div className="commons-attrib__members">
          {members.map((m) => (
            <button key={m.id} type="button"
              className={`commons-attrib__member${memberId === m.id ? ' is-on' : ''}`}
              aria-pressed={memberId === m.id}
              onClick={() => setMemberId(m.id)}>
              {m.display_name}
            </button>
          ))}
          {isResolve && (
            <button type="button"
              className={`commons-attrib__member${memberId === null ? ' is-on' : ''}`}
              aria-pressed={memberId === null}
              onClick={() => setMemberId(null)}>
              {t.nobody}
            </button>
          )}
        </div>

        {isResolve && (
          <div className="commons-attrib__when">
            <button type="button" className={`commons-attrib__chip${!earlier ? ' is-on' : ''}`} onClick={() => setEarlier(false)}>{t.whenNow}</button>
            <button type="button" className={`commons-attrib__chip${earlier ? ' is-on' : ''}`} onClick={() => setEarlier(true)}>{t.whenEarlier}</button>
            {earlier && (
              <input type="time" className="commons-attrib__time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t.whenEarlier} />
            )}
          </div>
        )}

        <div className="commons-attrib__actions">
          <button type="button" className="commons-attrib__btn" onClick={onCancel}>{t.cancel}</button>
          <button type="button" className="commons-attrib__btn is-primary" disabled={!canConfirm} onClick={confirm}>{t.confirm}</button>
        </div>
      </div>
    </div>
  );
}
