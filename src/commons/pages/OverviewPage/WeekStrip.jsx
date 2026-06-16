// src/commons/pages/OverviewPage/WeekStrip.jsx
// Seven small spectrum rings, one per op-day (today highlighted). Each day's colour = that day's
// completion fraction. Reads as a little rainbow — trend without a chart. Per-day drill-in deferred.

import { spectrumConic } from '../../styles/spectrum.js';

export function WeekStrip({ week, label }) {
  return (
    <div className="commons-week">
      <span className="commons-week__label">{label}</span>
      <div className="commons-week__dots">
        {week.map((d) => (
          <span
            key={d.date}
            className={`commons-week__dot${d.isToday ? ' is-today' : ''}`}
            style={{ background: spectrumConic(d.fraction) }}
            title={d.date}
            aria-label={`${d.date}: ${Math.round(d.fraction * 100)}%`}
          />
        ))}
      </div>
    </div>
  );
}
