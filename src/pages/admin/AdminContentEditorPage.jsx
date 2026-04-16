// src/pages/admin/AdminContentEditorPage.jsx
// Admin: edit all user-facing text for a specific page.
// Sections driven by page schema. Per-section save with dirty tracking.

import { useEffect, useMemo, useReducer, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { fetchPageContent, upsertPageContentBatch, deletePageContentRows } from '../../data/pageContent/pageContent.queries.js';
import { kenZeOvedSchema } from '../../data/pageContent/kenZeOved.schema.js';
import { homeSchema } from '../../data/pageContent/home.schema.js';
import { resolveKenZeOvedPageData } from '../../pages/kenZeOved/resolveKenZeOvedPageData.js';
import { resolveHomePageData } from '../../pages/home/resolveHomePageData.js';
import './AdminContentEditorPage.css';

// Extract only schema-declared field paths from a resolved payload
function flattenPayload(payload, schema) {
  const result = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      const val = field.path.split('.').reduce((cur, k) => cur?.[k], payload);
      if (val !== undefined) result[field.path] = val;
    }
  }
  return result;
}

const SCHEMAS = {
  kenZeOved: kenZeOvedSchema,
  home:      homeSchema,
};

// Static defaults per page — pre-populates editor from live static content
const STATIC_DEFAULTS = {
  kenZeOved: () => {
    const naor = resolveKenZeOvedPageData('he', 'naor');
    const shay = resolveKenZeOvedPageData('he', 'shay');
    return {
      naor:   flattenPayload(naor, kenZeOvedSchema),
      shay:   flattenPayload(shay, kenZeOvedSchema),
      shared: flattenPayload(naor, kenZeOvedSchema),
    };
  },
  home: () => {
    const naor = resolveHomePageData('he', 'naor');
    const shay = resolveHomePageData('he', 'shay');
    return {
      naor:   flattenPayload(naor, homeSchema),
      shay:   flattenPayload(shay, homeSchema),
      shared: flattenPayload(naor, homeSchema),
    };
  },
};

// edits shape: { naor: { [path]: value }, shay: { [path]: value }, shared: { [path]: value } }
// Starts from static defaults, DB values win on conflict.
function initEdits(rows, staticDefaults) {
  const edits = {
    naor:   { ...staticDefaults.naor },
    shay:   { ...staticDefaults.shay },
    shared: { ...staticDefaults.shared },
  };
  for (const row of rows) {
    if (edits[row.mode]) {
      edits[row.mode][row.field_path] = row.value;
    }
  }
  return edits;
}

function editsReducer(state, action) {
  switch (action.type) {
    case 'init':
      return action.edits;
    case 'set': {
      const { mode, path, value } = action;
      return {
        ...state,
        [mode]: { ...state[mode], [path]: value },
      };
    }
    default:
      return state;
  }
}

function isSectionDirty(section, edits, saved, splitPaths) {
  for (const field of section.fields) {
    const modes = splitPaths.has(field.path) ? ['naor', 'shay'] : ['shared'];
    for (const m of modes) {
      const cur = edits[m]?.[field.path];
      const sav = saved[m]?.[field.path];
      if (JSON.stringify(cur) !== JSON.stringify(sav)) return true;
    }
  }
  return false;
}

function getValue(edits, mode, path, type) {
  const val = edits[mode]?.[path];
  if (val !== undefined) return val;
  return type === 'paragraphs' ? [] : '';
}

function ParagraphsField({ value, onChange }) {
  const paras = Array.isArray(value) ? value : [];

  function update(i, text) {
    const next = [...paras];
    next[i] = text;
    onChange(next);
  }
  function moveUp(i) {
    if (i === 0) return;
    const next = [...paras];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  }
  function moveDown(i) {
    if (i === paras.length - 1) return;
    const next = [...paras];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  }
  function remove(i) {
    onChange(paras.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...paras, '']);
  }

  return (
    <div className="ace-paragraphs">
      {paras.map((p, i) => (
        <div key={i} className="ace-para-row">
          <textarea
            className="ace-textarea"
            value={p}
            onChange={e => update(i, e.target.value)}
            rows={3}
          />
          <div className="ace-para-row__controls">
            <button className="ace-para-btn" onClick={() => moveUp(i)} disabled={i === 0} aria-label="העלה">↑</button>
            <button className="ace-para-btn" onClick={() => moveDown(i)} disabled={i === paras.length - 1} aria-label="הורד">↓</button>
            <button className="ace-para-btn ace-para-btn--delete" onClick={() => remove(i)} aria-label="מחק">×</button>
          </div>
        </div>
      ))}
      <button className="ace-add-para-btn" onClick={add}>+ הוסף פסקה</button>
    </div>
  );
}

function FieldInput({ field, edits, dispatch, split, onToggleSplit }) {
  const isShared = !split;

  function renderInput(mode, value, onChange) {
    if (field.type === 'paragraphs') return <ParagraphsField value={value} onChange={onChange} />;
    if (field.type === 'textarea')   return <textarea className="ace-textarea" value={value} onChange={e => onChange(e.target.value)} />;
    return <input className="ace-input" type="text" value={value} onChange={e => onChange(e.target.value)} />;
  }

  return (
    <div className="ace-field">
      <div className="ace-field__header">
        <span className="ace-field__label">{field.label}</span>
        <select
          className="ace-split-select"
          value={split ? 'split' : 'shared'}
          onChange={e => { if ((e.target.value === 'split') !== split) onToggleSplit(); }}
          aria-label="מצב עריכה"
        >
          <option value="shared">משותף לשניהם</option>
          <option value="split">נאור / שי בנפרד</option>
        </select>
      </div>

      {isShared ? (
        (() => {
          const value  = getValue(edits, 'shared', field.path, field.type);
          const onChange = v => dispatch({ type: 'set', mode: 'shared', path: field.path, value: v });
          return renderInput('shared', value, onChange);
        })()
      ) : (
        <div className="ace-field__cols">
          {['naor', 'shay'].map(m => {
            const value    = getValue(edits, m, field.path, field.type);
            const onChange = v => dispatch({ type: 'set', mode: m, path: field.path, value: v });
            return (
              <div key={m}>
                <div className="ace-field__col-label">{m === 'naor' ? 'נאור' : 'שי'}</div>
                {renderInput(m, value, onChange)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, pageKey, edits, dispatch, saved, onSaved }) {
  const [open, setOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Track which field paths are in split (naor/shay) mode.
  // Default to split only if naor and shay values actually differ.
  const [splitPaths, setSplitPaths] = useState(() => {
    const paths = new Set();
    for (const f of section.fields) {
      if (f.mode === 'shared') continue;
      const naorVal = JSON.stringify(edits.naor?.[f.path] ?? '');
      const shayVal = JSON.stringify(edits.shay?.[f.path] ?? '');
      if (naorVal !== shayVal) paths.add(f.path);
    }
    return paths;
  });

  // Track the initial split state to detect mode-toggle as a dirty change
  const [savedSplitPaths] = useState(() => new Set(
    section.fields
      .filter(f => f.mode !== 'shared')
      .filter(f => JSON.stringify(edits.naor?.[f.path] ?? '') !== JSON.stringify(edits.shay?.[f.path] ?? ''))
      .map(f => f.path)
  ));

  function toggleSplit(field) {
    setSplitPaths(prev => {
      const next = new Set(prev);
      if (next.has(field.path)) {
        // Split → shared: copy naor value into shared
        const naorVal = edits.naor?.[field.path];
        if (naorVal !== undefined) dispatch({ type: 'set', mode: 'shared', path: field.path, value: naorVal });
        next.delete(field.path);
      } else {
        // Shared → split: seed both naor and shay from shared
        const sharedVal = edits.shared?.[field.path];
        if (sharedVal !== undefined) {
          dispatch({ type: 'set', mode: 'naor', path: field.path, value: sharedVal });
          dispatch({ type: 'set', mode: 'shay', path: field.path, value: sharedVal });
        }
        next.add(field.path);
      }
      return next;
    });
  }

  const splitChanged = section.fields.some(f =>
    splitPaths.has(f.path) !== savedSplitPaths.has(f.path)
  );
  const dirty = splitChanged || isSectionDirty(section, edits, saved, splitPaths);

  async function handleSave() {
    setSaving(true);
    setSaveStatus(null);
    try {
      const rows = [];
      const toDeleteShared = [];
      const toDeleteSplit  = [];

      for (const field of section.fields) {
        if (splitPaths.has(field.path)) {
          // Split: save naor + shay, delete any stale shared row
          toDeleteShared.push(field.path);
          for (const m of ['naor', 'shay']) {
            const value = edits[m]?.[field.path];
            if (value !== undefined) rows.push({ fieldPath: field.path, mode: m, value });
          }
        } else {
          // Shared: save one shared row, delete any stale naor/shay rows
          toDeleteSplit.push(field.path);
          const value = edits.shared?.[field.path];
          if (value !== undefined) rows.push({ fieldPath: field.path, mode: 'shared', value });
        }
      }

      if (toDeleteShared.length) await deletePageContentRows({ pageKey, fieldPaths: toDeleteShared, modes: ['shared'] });
      if (toDeleteSplit.length)  await deletePageContentRows({ pageKey, fieldPaths: toDeleteSplit,  modes: ['naor', 'shay'] });
      await upsertPageContentBatch({ pageKey, rows });
      setSaveStatus('ok');
      onSaved(section, edits);
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err) {
      setSaveStatus(err.message ?? 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ace-section">
      <div
        className="ace-section__header"
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); }}
      >
        <h2 className="ace-section__title">
          {dirty && <span className="ace-section__dirty" aria-label="שינויים לא שמורים" />}
          {section.label}
        </h2>
        <span className={`ace-section__chevron${open ? ' ace-section__chevron--open' : ''}`}>▼</span>
      </div>

      {open && (
        <>
          <div className="ace-section__body">
            {section.fields.map(field => (
              <FieldInput
                key={field.path}
                field={field}
                edits={edits}
                dispatch={dispatch}
                split={splitPaths.has(field.path)}
                onToggleSplit={() => toggleSplit(field)}
              />
            ))}
          </div>
          <div className="ace-section__footer">
            {saveStatus === 'ok' && <span className="ace-save-status ace-save-status--ok">נשמר ✓</span>}
            {saveStatus && saveStatus !== 'ok' && <span className="ace-save-status ace-save-status--error">{saveStatus}</span>}
            {dirty && (
              <button
                className="ace-cancel-btn"
                type="button"
                onClick={() => {
                  // Restore edits to saved state
                  for (const field of section.fields) {
                    for (const m of ['naor', 'shay', 'shared']) {
                      const val = saved[m]?.[field.path];
                      if (val !== undefined) dispatch({ type: 'set', mode: m, path: field.path, value: val });
                    }
                  }
                  // Restore split state
                  setSplitPaths(new Set(savedSplitPaths));
                }}
                disabled={saving}
              >
                בטל שינויים
              </button>
            )}
            <button
              className="ace-save-btn"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? 'שומר...' : 'שמירה'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AdminContentEditorPage() {
  const { pageKey } = useParams();
  const schema = SCHEMAS[pageKey];

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // useMemo so defaults object is stable across renders for the same pageKey
  const defaults = useMemo(
    () => STATIC_DEFAULTS[pageKey]?.() ?? { naor: {}, shay: {}, shared: {} },
    [pageKey]
  );
  const [edits, dispatch] = useReducer(editsReducer, defaults);
  const [saved, setSaved] = useState(defaults);

  useEffect(() => {
    if (!schema) return;

    fetchPageContent(pageKey, 'he')
      .then(rows => {
        const merged = initEdits(rows, defaults);
        dispatch({ type: 'init', edits: merged });
        setSaved(merged);
      })
      .catch(err => setLoadError(err.message ?? 'שגיאה בטעינה'))
      .finally(() => setLoading(false));
  }, [pageKey, schema, defaults]);

  function handleSaved(section, currentEdits) {
    setSaved(prev => {
      const next = { naor: { ...prev.naor }, shay: { ...prev.shay }, shared: { ...prev.shared } };
      for (const field of section.fields) {
        const modes = field.mode === 'shared' ? ['shared'] : ['naor', 'shay'];
        for (const m of modes) {
          if (currentEdits[m]?.[field.path] !== undefined) {
            next[m][field.path] = currentEdits[m][field.path];
          }
        }
      }
      return next;
    });
  }

  if (!schema) return <Navigate to="/admin/content" replace />;

  return (
    <div className="ace-page" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-header__right">
            <Link to="/admin/content" className="admin-back-btn">→ חזרה</Link>
            <h1 className="admin-header__title">{schema.label}</h1>
          </div>
        </div>
      </header>

      <main className="ace-main">
        {loading && <p className="ace-state">טוען...</p>}
        {loadError && <p className="ace-state" style={{ color: '#dc2626' }}>{loadError}</p>}

        {!loading && !loadError && schema.sections.map(section => (
          <SectionCard
            key={section.key}
            section={section}
            pageKey={pageKey}
            edits={edits}
            dispatch={dispatch}
            saved={saved}
            onSaved={handleSaved}
          />
        ))}
      </main>
    </div>
  );
}
