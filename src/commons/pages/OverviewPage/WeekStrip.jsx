// src/commons/pages/OverviewPage/WeekStrip.jsx
// "בימים האחרונים" — seven small spectrum rings, one per op-day (today highlighted), each labelled with
// its weekday letter. Colour = that day's completion fraction. Tapping a day opens its handling screen
// (DayPage) — the nudge to go finish what's left.

import { spectrumHex } from '../../styles/spectrum.js';

function dayLetter(date, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { weekday: 'narrow' })
      .format(new Date(`${date}T08:00:00`));
  } catch { return ''; }
}

export function WeekStrip({ week, label, locale, onPick }) {
  return (
    <section className="commons-snapSection">
      <h2 className="commons-snapH">{label}</h2>
      <div className="commons-week__dots">
        {week.map((d) => (
          <button
            key={d.date}
            type="button"
            className="commons-week__day"
            onClick={() => onPick(d.date)}
            aria-label={`${d.date}: ${Math.round(d.fraction * 100)}%`}
          >
            <span
              className={`commons-week__dot${d.isToday ? ' is-today' : ''}`}
              style={{ background: d.total === 0 ? 'var(--commons-ring-track)' : spectrumHex(d.fraction) }}
              aria-hidden="true"
            />
            <span className="commons-week__lbl">{dayLetter(d.date, locale)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
