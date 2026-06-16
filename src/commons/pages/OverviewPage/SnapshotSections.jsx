// src/commons/pages/OverviewPage/SnapshotSections.jsx
// The pulse's three live states, in order: עבר הזמן (overdue, emphasised, first) · מה פנוי? · מה בדרך?.
// Each is a list of groups: a task with sub-items is a collapsible parent (▸ title · X/Y · time) that
// expands to only that state's children; a task without sub-items is a single row. A parent can appear
// in several sections. Actions reuse existing occurrence ops; taking a whole parent cascades (confirm).

import { useState } from 'react';
import { motion } from 'motion/react';

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const rowV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 18 } } };

function fmtTime(iso, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
  catch { return ''; }
}
function dayMonth(iso, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric' }).format(new Date(iso)); }
  catch { return ''; }
}
function whenLabel(it, t, locale) {
  const time = fmtTime(it.due, locale);
  if (it.dueDayKind === 'yesterday') return `${t.yesterday} ${time}`;
  if (it.dueDayKind === 'older') return `${dayMonth(it.due, locale)} ${time}`;
  return time;
}
function fmtDur(mins, t) {
  if (mins == null) return '';
  if (mins >= 120) return `${Math.floor(mins / 60)} ${t.durHours}`;
  if (mins >= 60) return t.durHour;
  return `${Math.max(1, mins)} ${t.durMins}`;
}
function stuckLine(it, t, locale) {
  if (!it.due) return t.sincePrev;
  const lines = t.stuckLines?.length ? t.stuckLines : [`${t.since}{time}`];
  const i = [...String(it.id)].reduce((a, c) => a + c.charCodeAt(0), 0) % lines.length;
  return lines[i].replace('{time}', whenLabel(it, t, locale)).replace('{dur}', fmtDur(it.overdueMins, t));
}
function tier(minsLeft) {
  if (minsLeft == null) return '';
  if (minsLeft <= 60) return 'is-last';
  if (minsLeft <= 120) return 'is-soon';
  return '';
}

// The chip beside a parent = how many of its sub-items are in THIS block ("2 פנויות" / "1 בדרך").
const COUNT_KEY = { overdue: 'countOverdue', free: 'countFree', inProgress: 'countInProgress' };
function countLabel(section, n, t) {
  return (t[COUNT_KEY[section]] || '{n}').replace('{n}', n);
}

function Btn({ kind, label, emoji, onClick }) {
  return (
    <button type="button" className={`commons-snapBtn ${kind}`} onClick={onClick}>
      <span className="commons-snapBtn__lbl">{label}</span>
      <span className="commons-snapBtn__e" aria-hidden="true">{emoji}</span>
    </button>
  );
}

// One compact line per item. Overdue: title + its "waiting" note sit together (meta hugs the title);
// free: title + "עד" chip + inline claim (emoji beside the word); in-progress: title + who's on it.
// `nested` = a child inside an expanded parent → indented with a sub-task elbow marker.
function ItemRow({ item, section, t, locale, canManage, h, nested }) {
  return (
    <motion.li className={`commons-snapRow is-${section}${nested ? ' is-sub' : ''}`} variants={rowV}>
      <div className="commons-snapRow__line">
        {nested && <span className="commons-subMark" aria-hidden="true">↳</span>}
        <span className={`commons-snapDot is-${section}`} aria-hidden="true" />
        {section === 'overdue' ? (
          <span className="commons-snapRow__lead">
            <button type="button" className="commons-snapRow__title" onClick={() => h.onOpen(item.id)}>{item.title}</button>
            <span className="commons-snapRow__meta">{stuckLine(item, t, locale)}</span>
          </span>
        ) : (
          <>
            <button type="button" className="commons-snapRow__title" onClick={() => h.onOpen(item.id)}>{item.title}</button>
            {section === 'inProgress' && item.owner && <span className="commons-snapRow__meta">{t.onPerson} {item.owner}</span>}
            {section === 'free' && item.due && <span className={`commons-untilChip ${tier(item.minsLeft)}`}>{t.until} {whenLabel(item, t, locale)}</span>}
            {section === 'free' && (
              <button type="button" className="commons-snapBtn is-claim commons-snapBtn--inline" onClick={() => h.onClaim(item.id)}>
                {t.claim} <span aria-hidden="true">{t.claimE}</span>
              </button>
            )}
          </>
        )}
      </div>
      {section === 'overdue' && (
        <div className="commons-snapRow__actions">
          <Btn kind="is-claim" label={t.claim} emoji={t.claimE} onClick={() => h.onClaim(item.id)} />
          <Btn kind="is-did" label={t.didHappen} emoji={t.didHappenE} onClick={() => h.onResolve(item.id)} />
          {canManage && <Btn kind="is-defer" label={t.deferTomorrow} emoji={t.deferTomorrowE} onClick={() => h.onDefer(item.id)} />}
          {canManage && <Btn kind="is-skip" label={t.skip} emoji={t.skipE} onClick={() => h.onSkip(item.id)} />}
        </div>
      )}
    </motion.li>
  );
}

function GroupRow({ group, section, t, locale, canManage, h, expanded, onToggle }) {
  if (!group.isParent) {
    return <ItemRow item={group.items[0]} section={section} t={t} locale={locale} canManage={canManage} h={h} />;
  }
  const key = `${section}:${group.id}`; // section-scoped, so a parent expands independently per section
  const open = expanded.has(key);
  return (
    <motion.li className="commons-snapGroup" variants={rowV}>
      <div className="commons-snapGroup__head">
        <button type="button" className="commons-snapGroup__toggle" aria-expanded={open} onClick={() => onToggle(key)}>
          <span className={`commons-caret${open ? ' is-open' : ''}`} aria-hidden="true">▾</span>
          <span className="commons-snapGroup__title">{group.title}</span>
          <span className="commons-chip commons-chip--count">{countLabel(section, group.items.length, t)}</span>
        </button>
        {section === 'free' && (
          <button type="button" className="commons-snapBtn is-claim commons-snapBtn--inline commons-snapGroup__take" onClick={() => h.onTakeParent(group.id, group.title)}>
            {t.claim} <span aria-hidden="true">{t.claimE}</span>
          </button>
        )}
      </div>
      {open && (
        <ul className="commons-snapGroup__items">
          {group.items.map((it) => <ItemRow key={it.id} item={it} section={section} t={t} locale={locale} canManage={canManage} h={h} nested />)}
        </ul>
      )}
    </motion.li>
  );
}

function Section({ label, groups, section, emphasised, t, locale, canManage, h, expanded, onToggle, anchorRef }) {
  if (!groups.length) return null;
  return (
    <section ref={anchorRef} className={`commons-snapSection${emphasised ? ' is-urgent' : ''}${section === 'free' ? ' is-free' : ''}`}>
      <h2 className="commons-snapH">{label}</h2>
      <motion.ul className="commons-snapSection__list" variants={listV} initial="hidden" animate="show">
        {groups.map((g) => <GroupRow key={g.id} group={g} section={section} t={t} locale={locale} canManage={canManage} h={h} expanded={expanded} onToggle={onToggle} />)}
      </motion.ul>
    </section>
  );
}

export function SnapshotSections({ pulse, t, locale, canManage, onOpen, onClaim, onResolve, onDefer, onSkip, onTakeParent, anchorRef }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const onToggle = (id) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const h = { onOpen, onClaim, onResolve, onDefer, onSkip, onTakeParent };
  const common = { t, locale, canManage, h, expanded, onToggle };
  return (
    <>
      <Section label={t.overdueTitle} groups={pulse.overdue} section="overdue" emphasised {...common} />
      <Section label={t.free} groups={pulse.free} section="free" anchorRef={anchorRef} {...common} />
      <Section label={t.inProgressTitle} groups={pulse.inProgress} section="inProgress" {...common} />
    </>
  );
}
