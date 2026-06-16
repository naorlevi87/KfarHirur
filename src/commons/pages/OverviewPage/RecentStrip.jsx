// src/commons/pages/OverviewPage/RecentStrip.jsx
// "לאחרונה": a short, happy credit log of recent completions (props, never ranking). The heading sits
// OUTSIDE the list block, unified with the other section headings. Avatar is neutral (its colour means
// nothing). Emoji are decorative; the words carry the meaning. "כל היומן ←" links to the full feed.

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

export function RecentStrip({ recent, closed, t, locale, onFullLog }) {
  if (!recent.length && !closed) return null;
  return (
    <>
      {closed && (
        <div className="commons-closed" role="status">
          <div className="commons-closed__emoji" aria-hidden="true">🌈🎉</div>
          <div className="commons-closed__title">{t.closedTitle}</div>
          <div className="commons-closed__body">{t.closedBody}</div>
        </div>
      )}
      {recent.length > 0 && (
        <section className="commons-snapSection">
          <div className="commons-snapH commons-snapH--row">
            <span>{t.recent}</span>
            {onFullLog && <button type="button" className="commons-snapH__link" onClick={onFullLog}>{t.fullLog}</button>}
          </div>
          <ul className="commons-recent__list">
            {recent.map((e) => (
              <li key={e.id} className="commons-recent__item">
                <span className="commons-recent__avatar" aria-hidden="true">{(e.doer ?? '·').slice(0, 1)}</span>
                <span className="commons-recent__text">
                  {e.doer ? `${e.doer}: ` : ''}{e.title} <span className="commons-recent__flavour">{e.late ? t.creditLate : t.creditOnTime}</span>
                </span>
                <span className="commons-recent__time">{relTime(e.at, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
