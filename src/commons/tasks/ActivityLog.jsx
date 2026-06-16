// src/commons/tasks/ActivityLog.jsx
// "יומן פעילות" — the derived, read-only activity log for a task. Reads node_events for the task and
// its same-layer sub-tasks (useNodeActivity), shapes them (buildActivityLog), and renders a newest-
// first feed: an emoji (decorative) + the verb carrying the meaning (IS 5568) + the sub-task it
// happened on + who + when. Lazy — renders nothing when there is no recorded activity yet.

import { useMemo, useState } from 'react';
import { useNodeActivity } from '../commonsState/useNodeActivity.js';
import { buildActivityLog } from './activityLog.js';

const CAP = 8;

function fmtDateTime(iso, locale) {
  try {
    const d = new Date(iso);
    const loc = locale === 'he' ? 'he-IL' : 'en-US';
    const date = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'numeric' }).format(d);
    const time = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(d);
    return `${date} ${time}`;
  } catch { return ''; }
}

// Two-line row: line 1 = what happened (verb + detail) with the sub-task chip when the event bubbled
// up from a child; line 2 = the quiet meta (who · date time). The verb carries the meaning (IS 5568);
// the emoji is decorative.
function ActivityRow({ r, v, locale, roster }) {
  const verb = v.activityTypes[r.type] ?? r.type;
  // resolved ("זה כן קרה") credits who actually did it; everything else credits the actor.
  const who = r.type === 'resolved' && r.detail?.did_by
    ? (roster.find((m) => m.id === r.detail.did_by)?.display_name ?? r.who)
    : r.who;

  let extra = '';
  if ((r.type === 'completed' || r.type === 'resolved') && r.detail?.late) extra = ` · ${v.activityLate}`;
  else if (r.type === 'edited' && Array.isArray(r.detail?.fields)) {
    extra = ` · ${r.detail.fields.map((f) => v.activityFields[f] ?? f).join(', ')}`;
  }

  // A late completion gets its own sheepish emoji; everything else keys off the event type.
  const emoji = r.type === 'completed' && r.detail?.late
    ? v.activityEmoji.completedLate
    : (v.activityEmoji[r.type] ?? '·');

  return (
    <li className="commons-actRow">
      <span className="commons-actRow__icon" aria-hidden="true">{emoji}</span>
      <div className="commons-actRow__body">
        <div className="commons-actRow__line">
          <span className="commons-actRow__verb">{verb}{extra}</span>
          {r.target && <span className="commons-actRow__target">{r.target}</span>}
        </div>
        <div className="commons-actRow__meta">
          {who && <span className="commons-actRow__who">{who}</span>}
          {who && <span aria-hidden="true">·</span>}
          <span className="commons-actRow__time">{fmtDateTime(r.at, locale)}</span>
        </div>
      </div>
    </li>
  );
}

export function ActivityLog({ nodes, nodeId, v, locale, roster }) {
  const { events } = useNodeActivity(nodes, nodeId);
  const [expanded, setExpanded] = useState(false);

  const { rows, total } = useMemo(
    () => buildActivityLog({ nodes, nodeId, events, roster, max: 200 }),
    [nodes, nodeId, events, roster]);

  if (!rows.length) return null;
  const shown = expanded ? rows : rows.slice(0, CAP);

  return (
    <div className="commons-view__block">
      <div className="commons-view__label">{v.activityTitle} · {total}</div>
      <ul className="commons-actLog">
        {shown.map((r) => <ActivityRow key={r.id} r={r} v={v} locale={locale} roster={roster} />)}
      </ul>
      {rows.length > CAP && (
        <button type="button" className="commons-actLog__more" onClick={() => setExpanded((x) => !x)}>
          {expanded ? v.activityShowLess : v.activityShowMore}
        </button>
      )}
    </div>
  );
}
