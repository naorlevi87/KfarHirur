// src/commons/pages/OverviewPage/AreaLens.jsx
// Scope row: "הכל" + one pill per root area. Equal pills, fixed order (never sorted by progress) — a
// lens, not a leaderboard. Controlled: parent owns the selected id (null = all).

export function AreaLens({ areas, value, onChange, allLabel }) {
  if (!areas.length) return null;
  const Pill = ({ id, label }) => (
    <button
      type="button"
      className={`commons-lensPill${value === id ? ' is-on' : ''}`}
      aria-pressed={value === id}
      onClick={() => onChange(id)}
    >
      {label}
    </button>
  );
  return (
    <div className="commons-lens" role="group" aria-label={allLabel}>
      <Pill id={null} label={allLabel} />
      {areas.map((a) => <Pill key={a.id} id={a.id} label={a.title} />)}
    </div>
  );
}
