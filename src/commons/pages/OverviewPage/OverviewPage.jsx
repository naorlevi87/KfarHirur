// src/commons/pages/OverviewPage/OverviewPage.jsx
// "מה קורה היום?" — the communal snapshot ("us" view). Derives a view model from the loaded tree +
// roster (snapshot.js), renders the spectrum ring + invitation-framed sections + credit strip + week.
// Read-mostly; the few actions reuse existing occurrence ops. No new DB reads.

import './overview.css';
import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/appState/useAppContext.js';
import { useWorkspace } from '../../commonsState/WorkspaceContext.jsx';
import { useWorkspaceTree } from '../../commonsState/useWorkspaceTree.js';
import { fetchRoster } from '../../../data/commons/workspaceQueries.js';
import { resolveCommonsShellContent } from '../../resolveCommonsShellContent.js';
import { CommonsLoading } from '../../CommonsLoading.jsx';
import { Fab } from '../../Fab.jsx';
import { buildSnapshot } from './snapshot.js';
import { SnapshotRing } from './SnapshotRing.jsx';
import { AreaLens } from './AreaLens.jsx';
import { SnapshotSections } from './SnapshotSections.jsx';
import { RecentStrip } from './RecentStrip.jsx';
import { WeekStrip } from './WeekStrip.jsx';
import { SnapshotList } from './SnapshotList.jsx';
import { AttributionSheet } from './AttributionSheet.jsx';
import { useAttribution } from './useAttribution.js';
import { ConfirmDialog } from '../../ConfirmDialog.jsx';

// Bold down-chevron for the living line (taps to jump to the open items).
function ChevDown() {
  return (
    <svg className="commons-snapHeader__chev" width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function OverviewPage() {
  const { locale } = useAppContext();
  const { workspace, permissionLevel } = useWorkspace();
  const { workspaceSlug } = useParams();
  const navigate = useNavigate();
  const shell = resolveCommonsShellContent(locale);
  const t = shell.snapshot;
  const tree = useWorkspaceTree(workspace?.id);
  const canTask = ['admin', 'manager'].includes(permissionLevel);
  const canManage = canTask;

  const [roster, setRoster] = useState([]);
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    fetchRoster(workspace.id).then((r) => { if (!cancelled) setRoster(r); });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  const [scope, setScope] = useState(null);
  const freeRef = useRef(null);
  const attrib = useAttribution(tree);
  const [cascade, setCascade] = useState(null); // { id, title } — confirm taking a whole parent

  const areas = useMemo(
    () => (tree.byParent.get('root') ?? []).filter((n) => n.kind === 'container'),
    [tree.byParent]);

  const s = useMemo(
    () => buildSnapshot({ nodes: tree.nodes, roster, now: new Date(), scopeAreaId: scope }),
    [tree.nodes, roster, scope]);

  if (tree.loading) return <section className="commons-snapshot"><CommonsLoading /></section>;

  const open = (id) => navigate(`/commons/${workspaceSlug}/task/${id}`);
  const line = buildLine(t, s);

  return (
    <section className="commons-snapshot">
      <header className="commons-snapHeader">
        <div className="commons-snapHeader__kicker">{t.heading}</div>
        <button type="button" className="commons-snapHeader__line"
                onClick={() => freeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>{line}</span><ChevDown />
        </button>
      </header>

      <AreaLens areas={areas} value={scope} onChange={setScope} allLabel={t.scopeAll} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20 }}>
        <SnapshotRing fraction={s.progress.fraction} done={s.progress.doneLeaves}
                      total={s.progress.totalLeaves} centerLabel={t.center} countOf={t.countOf} />

        <SnapshotList items={s.list} t={t} locale={locale} onOpen={open} />

        <SnapshotSections
          pulse={s.pulse} t={t} locale={locale} canManage={canManage} onOpen={open} anchorRef={freeRef}
          onClaim={(id) => tree.claim(id)}
          onResolve={attrib.openResolve}
          onDefer={(id) => tree.deferOccurrence(id, nextOpDayStr())}
          onSkip={(id) => tree.deferOccurrence(id, null)}
          onTakeParent={(id, title) => setCascade({ id, title })}
        />

        <RecentStrip recent={s.recent} closed={s.closedToday} t={t} locale={locale} />
        <WeekStrip week={s.week} label={t.week} locale={locale}
                   onPick={(date) => navigate(`/commons/${workspaceSlug}/day/${date}`)} />
      </motion.div>

      {(s.progress.totalLeaves === 0) && <p className="commons-snapshot__empty">{t.empty}</p>}

      {canTask && <Fab onClick={() => navigate(`/commons/${workspaceSlug}/task/new`)} label={shell.fab.newTaskAria} />}

      <AttributionSheet open={!!attrib.sheet} mode={attrib.sheet?.mode} members={roster}
                        t={t} onConfirm={attrib.confirm} onCancel={attrib.close} />

      {cascade && (
        <ConfirmDialog
          title={t.takeAllTitle}
          body={t.takeAllBody.replace('{title}', cascade.title)}
          confirmLabel={t.claim}
          cancelLabel={t.cancel}
          onConfirm={() => { tree.claim(cascade.id); setCascade(null); }}
          onCancel={() => setCascade(null)}
        />
      )}
    </section>
  );
}

// Pick a living-line template by op-day phase + counts (never says "ביחד").
function buildLine(t, s) {
  const { doneLeaves: done, totalLeaves: total } = s.progress;
  const left = total - done;
  if (total > 0 && left === 0) return t.lineAllDone;
  if (s.stuck.length >= 3) return t.lineHardDay;
  const h = new Date().getHours();
  const tmpl = h < 12 ? t.lineMorning : h < 17 ? t.lineMidday : t.lineEvening;
  return tmpl.replace('{done}', done).replace('{left}', left).replace('{free}', s.free.length);
}

// Tomorrow's op-day as 'YYYY-MM-DD' (deferOccurrence target).
function nextOpDayStr() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
