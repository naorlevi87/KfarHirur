// src/pages/admin/AdminItemPage.jsx
// Admin: create or edit a single timeline item + its blocks.

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchItemBySlug,
  createItem,
  updateItem,
  deleteItem,
} from '../../data/admin/timelineAdminQueries.js';
import { EVENT_TYPES } from '../../data/admin/eventTypes.js';
import { ITEM_GRADE_CONFIG, GRADE_COUNT } from '../../features/timeline/timelineData.js';
import { useSave } from '../../utils/useSave.js';
import { NaorShayInput } from './components/NaorShayInput.jsx';
import { BlockEditor } from './components/BlockEditor.jsx';
import './AdminItemPage.css';

// Date display helpers — form stores yyyy-mm-dd (ISO for DB), UI shows dd/mm/yyyy.
function isoToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function displayToIso(display) {
  const match = display.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return display; // return as-is while still typing
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Grade labels — built from ITEM_GRADE_CONFIG so the list stays in sync automatically.
// Index 0 in config is null (unused); grades are 1-based.
const GRADE_OPTIONS = ITEM_GRADE_CONFIG.slice(1).map((_, i) => {
  const grade = i + 1;
  const minScale = ITEM_GRADE_CONFIG[grade].minScale;
  const visibility = minScale === 0 ? 'תמיד גלוי' : `נראה מזום ${minScale}`;
  return { value: grade, label: `דרגה ${grade} — ${visibility}` };
});

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'טיוטה' },
  { value: 'published', label: 'פורסם' },
];

const VIS_OPTIONS = [
  { value: 'both',      label: 'שניהם' },
  { value: 'naor_only', label: 'נאור בלבד' },
  { value: 'shay_only', label: 'שי בלבד' },
];


const emptyForm = () => ({
  slug:       '',
  date:       '',
  event_type: EVENT_TYPES[0].value,
  status:     'draft',
  visibility: 'both',
  grade:      1,
  naor_title: '',
  shay_title: '',
});

export function AdminItemPage() {
  const { slug } = useParams();   // undefined when creating new
  const isNew = !slug || slug === 'new';
  const navigate = useNavigate();

  const [form,     setForm]     = useState(emptyForm);
  const [itemId,   setItemId]   = useState(null);
  const [blocks,   setBlocks]   = useState([]);
  const [loading,  setLoading]  = useState(!isNew);
  const [deleting, setDeleting] = useState(false);
  const [titleDiff, setTitleDiff] = useState(false);

  const save = useSave(form);

  useEffect(() => {
    if (isNew) {
      save.setBaseline(null); // new item — no baseline
      return;
    }
    fetchItemBySlug(slug)
      .then(item => {
        setItemId(item.id);
        setBlocks(item.timeline_item_blocks ?? []);
        setTitleDiff((item.naor_title ?? '') !== (item.shay_title ?? ''));

        // Decode grade from zoom_tier. New rows: zoom_tier = grade + 100.
        // Legacy rows: 0|1|2 (map to 1, 3, GRADE_COUNT).
        const rawTier = item.zoom_tier ?? (item.initial_view ? 0 : 1);
        let grade;
        if (rawTier >= 101 && rawTier <= 100 + GRADE_COUNT) grade = rawTier - 100;
        else if (rawTier === 0) grade = 1;
        else if (rawTier === 1) grade = 3;
        else if (rawTier === 2) grade = GRADE_COUNT;
        else grade = 1;

        const loadedForm = {
          slug:       item.slug ?? '',
          date:       item.date?.slice(0, 10) ?? '',
          event_type: item.event_type ?? 'milestone',
          status:     item.status ?? 'draft',
          visibility: item.visibility ?? 'both',
          grade,
          naor_title: item.naor_title ?? '',
          shay_title: item.shay_title ?? '',
        };
        setForm(loadedForm);
        save.setBaseline(loadedForm);
      })
      .catch(err => save.clearError()) // surface via useSave's error
      .finally(() => setLoading(false));
  }, [isNew, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    const payload = {
      slug:       form.slug.trim(),
      date:       form.date || null,
      event_type: form.event_type,
      status:     form.status,
      visibility: form.visibility,
      zoom_tier:  form.grade + 100, // grade+100 avoids legacy 0|1|2 overlap
      naor_title: form.naor_title,
      shay_title: titleDiff ? form.shay_title : form.naor_title,
    };
    if (isNew) {
      // New item: bypass useSave — navigate away on success
      await save.run(async () => {
        const created = await createItem(payload);
        navigate(`/admin/timeline/items/${created.slug}`, { replace: true });
      });
    } else {
      await save.run(() => updateItem(itemId, payload));
    }
  }

  async function handleDelete() {
    if (!window.confirm(`למחוק את "${form.naor_title || form.slug}"? הפעולה אינה הפיכה.`)) return;
    setDeleting(true);
    try {
      await deleteItem(itemId);
      navigate('/admin/timeline', { replace: true });
    } catch (err) {
      setDeleting(false);
    }
  }

  if (loading) return (
    <div className="admin-item-page" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-header__right">
            <Link className="admin-header__back" to="/admin/timeline">→ רשימה</Link>
          </div>
        </div>
      </header>
      <div className="admin-item-page__body">
        <p className="admin-item-page__loading">טוען...</p>
      </div>
    </div>
  );

  return (
    <div className="admin-item-page" dir="rtl">
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-header__right">
            <Link className="admin-header__back" to="/admin/timeline">→ רשימה</Link>
            <h1 className="admin-header__title">
              {isNew ? 'פריט חדש' : (form.naor_title || form.slug || 'עריכת פריט')}
            </h1>
          </div>
          <div className="admin-item-page__header-actions">
            {save.saved  && <span className="admin-item-page__success">נשמר ✓</span>}
            {save.error  && <span className="admin-item-page__error">{save.error}</span>}
            <button
              className="admin-item-page__save-btn"
              type="submit"
              form="item-form"
              disabled={save.saving || !(isNew || save.isDirty)}
            >
              {save.saving ? 'שומר...' : isNew ? 'צור פריט' : 'שמור שינויים'}
            </button>
          </div>
        </div>
      </header>

      <div className="admin-item-page__body">
        <form id="item-form" className="admin-item-page__form" onSubmit={handleSave}>

          {/* כותרת */}
          <section className="admin-item-page__section">
            <NaorShayInput
              label="כותרת"
              value={{ naor: form.naor_title, shay: form.shay_title }}
              onChange={val => { set('naor_title', val.naor); set('shay_title', val.shay); }}
              isDifferent={titleDiff}
              onToggleDifferent={() => {
                if (titleDiff) set('shay_title', form.naor_title);
                setTitleDiff(d => !d);
              }}
            />
          </section>

          {/* תאריך */}
          <section className="admin-item-page__section">
            <div className="admin-item-page__row">
              <label className="admin-item-page__label">תאריך</label>
              <input
                className="admin-item-page__input admin-item-page__input--date"
                type="text"
                value={isoToDisplay(form.date)}
                onChange={e => set('date', displayToIso(e.target.value))}
                placeholder="dd/mm/yyyy"
                dir="ltr"
              />
            </div>
          </section>

          {/* מטא */}
          <section className="admin-item-page__section">
            <div className="admin-item-page__row admin-item-page__row--grid-2">
              <div>
                <label className="admin-item-page__label">סוג אירוע</label>
                <select className="admin-item-page__select" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                  {EVENT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-item-page__label">
                  דרגת פריט
                  <span className="admin-item-page__hint"> (עיצוב + זום)</span>
                </label>
                <select
                  className="admin-item-page__select"
                  value={form.grade}
                  onChange={e => set('grade', Number(e.target.value))}
                >
                  {GRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="admin-item-page__row admin-item-page__row--grid-2">
              <div>
                <label className="admin-item-page__label">סטטוס</label>
                <select className="admin-item-page__select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-item-page__label">מוצג ב:</label>
                <select className="admin-item-page__select" value={form.visibility} onChange={e => set('visibility', e.target.value)}>
                  {VIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="admin-item-page__row">
              <label className="admin-item-page__label">כתובת URL <span className="admin-item-page__hint">(באנגלית)</span></label>
              <input
                className="admin-item-page__input"
                type="text"
                value={form.slug}
                onChange={e => set('slug', e.target.value)}
                dir="ltr"
                required
                placeholder="e.g. first-meeting"
              />
            </div>
          </section>

        </form>

        {/* תוכן */}
        <section className="admin-item-page__section">
          <h2 className="admin-item-page__section-title">תוכן</h2>
          {!isNew && itemId
            ? <BlockEditor itemId={itemId} initialBlocks={blocks} />
            : <p className="admin-item-page__blocks-note">שמור את הפריט כדי להוסיף תוכן.</p>
          }
        </section>

        {/* מחק */}
        {!isNew && (
          <section className="admin-item-page__section admin-item-page__section--delete">
            <button
              className="admin-item-page__delete-btn"
              type="button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '...' : 'מחק פריט'}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
