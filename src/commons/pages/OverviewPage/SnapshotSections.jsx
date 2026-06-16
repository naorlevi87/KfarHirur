// src/commons/pages/OverviewPage/SnapshotSections.jsx
// The three invitation-framed, time-aware lists. Actions reuse existing occurrence ops — no new
// mutations. "פנוי" → claim; "נתקע" → claim / resolve-missed / defer / skip (defer & skip manager+).

import { motion } from 'motion/react';

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const rowV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 18 } } };

function Section({ label, children }) {
  return (
    <section className="commons-snapSection">
      <h2 className="commons-snapSection__label">{label}</h2>
      <motion.ul className="commons-snapSection__list" variants={listV} initial="hidden" animate="show">
        {children}
      </motion.ul>
    </section>
  );
}

export function SnapshotSections({ s, t, canManage, onOpen, onClaim, onResolve, onDefer, onSkip, anchorRef }) {
  const minsTo = (due) => Math.max(0, Math.round((new Date(due).getTime() - Date.now()) / 60000));

  return (
    <>
      {s.approaching.length > 0 && (
        <Section label={t.approaching}>
          {s.approaching.map((n) => (
            <motion.li key={n.id} className="commons-snapRow" variants={rowV}>
              <span className="commons-snapDot is-soon" aria-hidden="true" />
              <button type="button" className="commons-snapRow__title" onClick={() => onOpen(n.id)}>{n.title}</button>
              {n.due_date && <span className="commons-snapRow__meta">{t.timeLeftMin.replace('{n}', minsTo(n.due_date))}</span>}
            </motion.li>
          ))}
        </Section>
      )}

      {s.free.length > 0 && (
        <section ref={anchorRef} className="commons-snapSection is-free">
          <h2 className="commons-snapSection__label">{t.free}</h2>
          <motion.ul className="commons-snapSection__list" variants={listV} initial="hidden" animate="show">
            {s.free.map((n) => (
              <motion.li key={n.id} className="commons-snapRow" variants={rowV}>
                <span className="commons-snapDot is-free" aria-hidden="true" />
                <button type="button" className="commons-snapRow__title" onClick={() => onOpen(n.id)}>{n.title}</button>
                <button type="button" className="commons-snapBtn is-claim" onClick={() => onClaim(n.id)}>{t.claim}</button>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      )}

      {s.stuck.length > 0 && (
        <Section label={t.stuck}>
          {s.stuck.map((n) => (
            <motion.li key={n.id} className="commons-snapRow is-stuck" variants={rowV}>
              <div className="commons-snapRow__head">
                <span className="commons-snapDot is-stuck" aria-hidden="true" />
                <button type="button" className="commons-snapRow__title" onClick={() => onOpen(n.id)}>{n.title}</button>
              </div>
              <div className="commons-snapRow__actions">
                <button type="button" className="commons-snapBtn is-claim" onClick={() => onClaim(n.id)}>{t.claim}</button>
                <button type="button" className="commons-snapBtn is-did" onClick={() => onResolve(n.id)}>{t.didHappen}</button>
                {canManage && <button type="button" className="commons-snapBtn is-defer" onClick={() => onDefer(n.id)}>{t.deferTomorrow}</button>}
                {canManage && <button type="button" className="commons-snapBtn is-skip" onClick={() => onSkip(n.id)}>{t.skip}</button>}
              </div>
            </motion.li>
          ))}
        </Section>
      )}
    </>
  );
}
