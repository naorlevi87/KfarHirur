// src/commons/pages/OverviewPage/WeekStrip.jsx
// "בימים האחרונים" — seven small spectrum rings, one per op-day (today highlighted), each labelled with
// its weekday letter. Colour = that day's completion fraction. Reads as a little rainbow — trend
// without a chart. (Tapping a day → that day's handling screen is a planned next step.)

import { spectrumConic } from '../../styles/spectrum.js';

function dayLetter(date, locale) {
  try {
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { weekday: 'narrow' })
      .format(new Date(`${date}T08:00:00`));
  } catch { return ''; }
}

export function WeekStrip({ week, label, locale }) {
  return (
    <section className="commons-snapSection">
      <h2 className="commons-snapH">{label}</h2>
      <div className="commons-week__dots">
        {week.map((d) => (
          <div key={d.date} className="commons-week__day">
            <span
              className={`commons-week__dot${d.isToday ? ' is-today' : ''}`}
              style={{ background: spectrumConic(d.fraction) }}
              aria-label={`${d.date}: ${Math.round(d.fraction * 100)}%`}
            />
            <span className="commons-week__lbl">{dayLetter(d.date, locale)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
