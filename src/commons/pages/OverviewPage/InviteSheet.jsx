// src/commons/pages/OverviewPage/InviteSheet.jsx
// The flat "מי לוקח?" invite, opened by the עליי affordance. Two steps:
//   choice → take it myself (onMine) or suggest to someone else.
//   who    → pick a teammate (self excluded by the caller) → onPropose(memberId).
// No hierarchy: any member can take or suggest. Cancel/back never mutate.

import { useState } from 'react';

// Mounted only while open (the parent conditionally renders it), so each open is a fresh instance —
// no reset effect needed.
export function InviteSheet({ members, t, onMine, onPropose, onCancel }) {
  const [step, setStep] = useState('choice');
  const [memberId, setMemberId] = useState(null);

  return (
    <div className="commons-attribBackdrop" onClick={onCancel}>
      <div className="commons-attrib" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {step === 'choice' ? (
          <>
            <h3 className="commons-attrib__title">{t.whoTakes}</h3>
            <div className="commons-invite__choices">
              <button type="button" className="commons-attrib__btn is-primary" onClick={onMine}>
                {t.meSelf} <span aria-hidden="true">{t.claimE}</span>
              </button>
              <button type="button" className="commons-attrib__btn" onClick={() => setStep('who')}>
                {t.someoneElse} <span aria-hidden="true">←</span>
              </button>
            </div>
            <div className="commons-attrib__actions">
              <button type="button" className="commons-attrib__btn" onClick={onCancel}>{t.cancel}</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="commons-attrib__title">{t.proposeWho}</h3>
            <div className="commons-attrib__members">
              {members.map((m) => (
                <button key={m.id} type="button"
                  className={`commons-attrib__member${memberId === m.id ? ' is-on' : ''}`}
                  aria-pressed={memberId === m.id}
                  onClick={() => setMemberId(m.id)}>
                  {m.display_name}
                </button>
              ))}
            </div>
            <div className="commons-attrib__actions">
              <button type="button" className="commons-attrib__btn" onClick={() => setStep('choice')}>{t.cancel}</button>
              <button type="button" className="commons-attrib__btn is-primary" disabled={!memberId}
                      onClick={() => onPropose(memberId)}>{t.confirm}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
