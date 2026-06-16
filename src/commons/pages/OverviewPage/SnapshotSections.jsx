// src/commons/pages/OverviewPage/SnapshotSections.jsx
// The invitation-framed lists. Actions reuse existing occurrence ops — no new mutations.
// "פנוי" → claim (each row shows "עד <time>" with an urgency tint); "נתקע" → claim / resolve-missed /
// defer / skip (defer & skip manager+) with "since <time>". Emoji on buttons are decorative
// (aria-hidden) and render on their own line so every button reads the same.

import { motion } from 'motion/react';

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const rowV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 18 } } };

function fmtTime(iso, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
  catch { return ''; }
}

// Urgency tint from minutes-left: '' normal · 'is-soon' ≤2h · 'is-last' ≤1h (last hour).
function tier(minsLeft) {
  if (minsLeft == null) return '';
  if (minsLeft <= 60) return 'is-last';
  if (minsLeft <= 120) return 'is-soon';
  return '';
}

// Hebrew-ish duration from minutes overdue.
function fmtDur(mins, t) {
  if (mins == null) return '';
  if (mins >= 120) return `${Math.floor(mins / 60)} ${t.durHours}`;
  if (mins >= 60) return t.durHour;
  return `${Math.max(1, mins)} ${t.durMins}`;
}

// A cute "waiting since…" line, picked deterministically by item id (not random — render stays pure).
function stuckMeta(n, t, locale) {
  if (!n.due) return t.sincePrev;
  const lines = t.stuckLines && t.stuckLines.length ? t.stuckLines : [`${t.since}{time}`];
  const i = [...String(n.id)].reduce((a, c) => a + c.charCodeAt(0), 0) % lines.length;
  return lines[i].replace('{time}', fmtTime(n.due, locale)).replace('{dur}', fmtDur(n.overdueMins, t));
}

// Module-level button (not declared during render) — label on top, decorative emoji beneath.
function Btn({ kind, label, emoji, onClick }) {
  return (
    <button type="button" className={`commons-snapBtn ${kind}`} onClick={onClick}>
      <span className="commons-snapBtn__lbl">{label}</span>
      <span className="commons-snapBtn__e" aria-hidden="true">{emoji}</span>
    </button>
  );
}

export function SnapshotSections({ s, t, locale, canManage, onOpen, onClaim, onAssign, onResolve, onDefer, onSkip, anchorRef }) {
  return (
    <>
      {s.free.length > 0 && (
        <section ref={anchorRef} className="commons-snapSection is-free">
          <h2 className="commons-snapH">{t.free}</h2>
          <motion.ul className="commons-snapSection__list" variants={listV} initial="hidden" animate="show">
            {s.free.map((n) => (
              <motion.li key={n.id} className="commons-snapRow" variants={rowV}>
                <span className="commons-snapDot is-free" aria-hidden="true" />
                <button type="button" className="commons-snapRow__title" onClick={() => onOpen(n.id)}>{n.title}</button>
                {n.due && <span className={`commons-untilChip ${tier(n.minsLeft)}`}>{t.until} {fmtTime(n.due, locale)}</span>}
                <Btn kind="is-claim" label={t.claim} emoji={t.claimE} onClick={() => onClaim(n.id)} />
                {canManage && <Btn kind="is-assign" label={t.assign} emoji={t.assignE} onClick={() => onAssign(n.id)} />}
              </motion.li>
            ))}
          </motion.ul>
        </section>
      )}

      {s.stuck.length > 0 && (
        <section className="commons-snapSection">
          <h2 className="commons-snapH">{t.stuck}</h2>
          <motion.ul className="commons-snapSection__list" variants={listV} initial="hidden" animate="show">
            {s.stuck.map((n) => (
              <motion.li key={n.id} className="commons-snapRow is-stuck" variants={rowV}>
                <div className="commons-snapRow__head">
                  <span className="commons-snapDot is-stuck" aria-hidden="true" />
                  <div className="commons-snapRow__titleWrap">
                    <button type="button" className="commons-snapRow__title" onClick={() => onOpen(n.id)}>{n.title}</button>
                    <span className="commons-snapRow__meta">{stuckMeta(n, t, locale)}</span>
                  </div>
                </div>
                <div className="commons-snapRow__actions">
                  <Btn kind="is-claim" label={t.claim} emoji={t.claimE} onClick={() => onClaim(n.id)} />
                  <Btn kind="is-did" label={t.didHappen} emoji={t.didHappenE} onClick={() => onResolve(n.id)} />
                  {canManage && <Btn kind="is-assign" label={t.assign} emoji={t.assignE} onClick={() => onAssign(n.id)} />}
                  {canManage && <Btn kind="is-defer" label={t.deferTomorrow} emoji={t.deferTomorrowE} onClick={() => onDefer(n.id)} />}
                  {canManage && <Btn kind="is-skip" label={t.skip} emoji={t.skipE} onClick={() => onSkip(n.id)} />}
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      )}
    </>
  );
}
