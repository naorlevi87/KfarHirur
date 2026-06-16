// src/commons/pages/OverviewPage/DayPage.jsx
// "בימים האחרונים" drill-in: one op-day's picture — its done (✓ + who) and what's still to handle, with
// the same mutual-aid actions as the snapshot (claim / resolve / defer / skip). Pushes the day to a
// clean, complete state. Reuses the snapshot styles; read-mostly, actions reuse existing occurrence ops.

import './overview.css';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../../data/commons/workspaceQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { IconChevronStart } from '../../icons.jsx';
import { spectrumConic, spectrumHex } from '../../styles/spectrum.js';
import { buildDay } from './snapshot.js';
import { AttributionSheet } from './AttributionSheet.jsx';
import { useAttribution } from './useAttribution.js';

function dateLabel(dayStr, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'numeric' })
      .format(new Date(`${dayStr}T08:00:00`));
  } catch { return dayStr; }
}
function fmtTime(iso, locale) {
  try { return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso)); }
  catch { return ''; }
}
function nextOpDayStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function relTime(iso, locale) {
  try {
    const diff = (new Date(iso).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(locale === 'he' ? 'he' : 'en', { numeric: 'auto' });
    const a = Math.abs(diff);
    if (a < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  } catch { return ''; }
}
function pickLine(pool, key) {
  if (!Array.isArray(pool) || !pool.length) return '';
  const i = [...String(key)].reduce((a, c) => a + c.charCodeAt(0), 0) % pool.length;
  return pool[i];
}

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const rowV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 18 } } };

export function DayPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const { workspaceSlug, date } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const t = shell.snapshot;
  const d = shell.day;
  const tree = useWorkspaceTree(workspace?.id);
  const canManage = ['admin', 'manager'].includes(permissionLevel);

  const [roster, setRoster] = useState([]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then((r) => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  const attrib = useAttribution(tree);
  const day = useMemo(() => buildDay({ nodes: tree.nodes, roster, dayStr: date }), [tree.nodes, roster, date]);

  if (tree.loading) return <section className="commons-snapshot"><CommonsLoading /></section>;

  const open = (id) => navigate(`/commons/${workspaceSlug}/task/${id}`);
  const hue = spectrumHex(day.progress.fraction);

  return (
    <section className="commons-snapshot">
      <header className="commons-dayHead">
        <button type="button" className="commons-dayHead__back" aria-label={d.back}
                onClick={() => navigate(`/commons/${workspaceSlug}/overview`)}>
          <IconChevronStart size={20} />
        </button>
        <h1 className="commons-dayHead__title">{dateLabel(date, locale)}</h1>
      </header>

      <div className="commons-ring" style={{ filter: `drop-shadow(0 0 14px ${hue}55)` }}>
        <div className="commons-ring__track" />
        <div className="commons-ring__arc" style={{ background: spectrumConic(day.progress.fraction) }} />
        <div className="commons-ring__glass" />
        <div className="commons-ring__center" role="img"
             aria-label={`${t.center} ${day.progress.doneLeaves} ${t.countOf} ${day.progress.totalLeaves}`}>
          <span className="commons-ring__sub">{t.center}</span>
          <span className="commons-ring__count">{day.progress.doneLeaves} {t.countOf} {day.progress.totalLeaves}</span>
        </div>
      </div>

      {day.toHandle.length > 0 && (
        <section className="commons-snapSection">
          <h2 className="commons-snapH">{d.toHandle}</h2>
          <motion.ul className="commons-snapSection__list" variants={listV} initial="hidden" animate="show">
            {day.toHandle.map((n) => (
              <motion.li key={n.id} className="commons-snapRow is-stuck" variants={rowV}>
                <div className="commons-snapRow__head">
                  <span className="commons-snapDot is-stuck" aria-hidden="true" />
                  <div className="commons-snapRow__titleWrap">
                    <button type="button" className="commons-snapRow__title" onClick={() => open(n.id)}>{n.title}</button>
                    {n.due && <span className="commons-snapRow__meta">{t.since}{fmtTime(n.due, locale)}</span>}
                  </div>
                </div>
                <div className="commons-snapRow__actions">
                  <button type="button" className="commons-snapBtn is-claim" onClick={() => tree.claim(n.id)}>
                    <span className="commons-snapBtn__lbl">{t.claim}</span><span className="commons-snapBtn__e" aria-hidden="true">{t.claimE}</span>
                  </button>
                  <button type="button" className="commons-snapBtn is-did" onClick={() => attrib.openResolve(n.id)}>
                    <span className="commons-snapBtn__lbl">{t.didHappen}</span><span className="commons-snapBtn__e" aria-hidden="true">{t.didHappenE}</span>
                  </button>
                  {canManage && (
                    <button type="button" className="commons-snapBtn is-assign" onClick={() => attrib.openAssign(n.id)}>
                      <span className="commons-snapBtn__lbl">{t.assign}</span><span className="commons-snapBtn__e" aria-hidden="true">{t.assignE}</span>
                    </button>
                  )}
                  {canManage && (
                    <button type="button" className="commons-snapBtn is-defer" onClick={() => tree.deferOccurrence(n.id, nextOpDayStr())}>
                      <span className="commons-snapBtn__lbl">{t.deferTomorrow}</span><span className="commons-snapBtn__e" aria-hidden="true">{t.deferTomorrowE}</span>
                    </button>
                  )}
                  {canManage && (
                    <button type="button" className="commons-snapBtn is-skip" onClick={() => tree.deferOccurrence(n.id, null)}>
                      <span className="commons-snapBtn__lbl">{t.skip}</span><span className="commons-snapBtn__e" aria-hidden="true">{t.skipE}</span>
                    </button>
                  )}
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      )}

      {day.done.length > 0 && (
        <section className="commons-snapSection">
          <h2 className="commons-snapH">{d.done}</h2>
          <ul className="commons-recent__list">
            {day.done.map((e) => (
              <li key={e.id} className="commons-recent__item">
                <span className="commons-recent__text">{e.title} <span className="commons-recent__flavour">{pickLine(e.late ? t.creditLate : t.creditOnTime, e.id)}</span></span>
                <span className="commons-recent__time">{e.at ? relTime(e.at, locale) : ''}{e.doer ? ` · ${t.by} ${e.doer}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {day.progress.totalLeaves === 0 && <p className="commons-snapshot__empty">{t.empty}</p>}

      <AttributionSheet open={!!attrib.sheet} mode={attrib.sheet?.mode} members={roster}
                        t={t} onConfirm={attrib.confirm} onCancel={attrib.close} />
    </section>
  );
}
