// src/commons/pages/OverviewPage/AreaLens.jsx
// Scope row: "הכל" + one pill per root area. Equal pills, fixed order (never sorted by progress) — a
// lens, not a leaderboard. Controlled: parent owns the selected id (null = all).

export function AreaLens({ areas, value, onChange, allLabel }) {
  if (!areas.length) return null;
  // "הכל" (id null) + one option per area. Flat map — no nested component declared in render.
  const options = [{ id: null, title: allLabel }, ...areas];
  return (
    <div className="commons-lens" role="group" aria-label={allLabel}>
      {options.map((o) => (
        <button
          key={o.id ?? '__all'}
          type="button"
          className={`commons-lensPill${value === o.id ? ' is-on' : ''}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.title}
        </button>
      ))}
    </div>
  );
}
