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
import { NaorShayInput } from './components/NaorShayInput.jsx';
import { BlockEditor } from './components/BlockEditor.jsx';
import './AdminItemPage.css';

const SIZE_OPTIONS = [
  { value: 'small',    label: 'קטן — צומת רגיל' },
  { value: 'standard', label: 'רגיל — ברירת מחדל' },
  { value: 'key',      label: 'מרכזי — מודגש' },
];

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'טיוטה' },
  { value: 'published', label: 'פורסם' },
];

const VIS_OPTIONS = [
  { value: 'both',      label: 'שניהם' },
  { value: 'naor_only', label: 'נאור בלבד' },
  { value: 'shay_only', label: 'שי בלבד' },
];


const ZOOM_TIER_OPTIONS = [
  { value: 0, label: 'תמיד גלוי — מיילסטון ראשי' },
  { value: 1, label: 'זום בינוני' },
  { value: 2, label: 'זום קרוב בלבד' },
];

const emptyForm = () => ({
  slug:       '',
  date:       '',
  event_type: EVENT_TYPES[0].value,
  size:       'standard',
  status:     'draft',
  visibility: 'both',
  zoom_tier:  0,
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
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState('');
  const [saved,    setSaved]    = useState(false);

  const [titleDiff, setTitleDiff] = useState(false);

  useEffect(() => {
    if (isNew) return;
    fetchItemBySlug(slug)
      .then(item => {
        setItemId(item.id);
        setBlocks(item.timeline_item_blocks ?? []);
        setTitleDiff((item.naor_title ?? '') !== (item.shay_title ?? ''));
        setForm({
          slug:       item.slug ?? '',
          date:       item.date?.slice(0, 10) ?? '',
          event_type: item.event_type ?? 'milestone',
          size:       item.size ?? 'standard',
          status:     item.status ?? 'draft',
          visibility: item.visibility ?? 'both',
          zoom_tier:  item.zoom_tier ?? (item.initial_view ? 0 : 1),
          naor_title: item.naor_title ?? '',
          shay_title: item.shay_title ?? '',
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isNew, slug]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = {
        slug:       form.slug.trim(),
        date:       form.date || null,
        event_type: form.event_type,
        size:       form.size,
        status:     form.status,
        visibility: form.visibility,
        zoom_tier:  form.zoom_tier,
        naor_title: form.naor_title,
        shay_title: titleDiff ? form.shay_title : form.naor_title,
      };
      if (isNew) {
        const created = await createItem(payload);
        navigate(`/admin/timeline/items/${created.slug}`, { replace: true });
      } else {
        await updateItem(itemId, payload);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`למחוק את "${form.naor_title || form.slug}"? הפעולה אינה הפיכה.`)) return;
    setDeleting(true);
    try {
      await deleteItem(itemId);
      navigate('/admin/timeline', { replace: true });
    } catch (err) {
      setError(err.message);
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
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header__inner">
          <div className="admin-header__right">
            <Link className="admin-header__back" to="/admin/timeline">→ רשימה</Link>
            <h1 className="admin-header__title">
              {isNew ? 'פריט חדש' : (form.naor_title || form.slug || 'עריכת פריט')}
            </h1>
          </div>
        </div>
      </header>

      <div className="admin-item-page__body">
        <form id="item-form" className="admin-item-page__form" onSubmit={handleSave}>

          <section className="admin-item-page__section">
            <h2 className="admin-item-page__section-title">מטא-נתונים</h2>

            <div className="admin-item-page__row">
              <label className="admin-item-page__label">Slug <span className="admin-item-page__hint">(מזהה ב-URL, באנגלית)</span></label>
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

            <div className="admin-item-page__row">
              <label className="admin-item-page__label">תאריך</label>
              <input
                className="admin-item-page__input admin-item-page__input--date"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="admin-item-page__row admin-item-page__row--grid">
              <div>
                <label className="admin-item-page__label">סוג אירוע</label>
                <select className="admin-item-page__select" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                  {EVENT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-item-page__label">
                  גודל צומת
                  <span className="admin-item-page__hint"> (בציר)</span>
                </label>
                <select className="admin-item-page__select" value={form.size} onChange={e => set('size', e.target.value)}>
                  {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-item-page__label">סטטוס</label>
                <select className="admin-item-page__select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-item-page__label">נראות</label>
                <select className="admin-item-page__select" value={form.visibility} onChange={e => set('visibility', e.target.value)}>
                  {VIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-item-page__label">
                  גילוי בזום
                </label>
                <select
                  className="admin-item-page__select"
                  value={form.zoom_tier}
                  onChange={e => set('zoom_tier', Number(e.target.value))}
                >
                  {ZOOM_TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="admin-item-page__section">
            <h2 className="admin-item-page__section-title">כותרות</h2>

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

        </form>

        {!isNew && itemId && (
          <section className="admin-item-page__section admin-item-page__blocks">
            <BlockEditor itemId={itemId} initialBlocks={blocks} />
          </section>
        )}
        {isNew && (
          <p className="admin-item-page__blocks-note">שמור את הפריט כדי להוסיף בלוקים.</p>
        )}

        {error && <p className="admin-item-page__error admin-item-page__error--bottom">{error}</p>}
        {saved  && <p className="admin-item-page__success">נשמר בהצלחה ✓</p>}

        <div className="admin-item-page__actions admin-item-page__actions--bottom">
          <button className="admin-item-page__save-btn" type="submit" form="item-form" disabled={saving}>
            {saving ? 'שומר...' : isNew ? 'צור פריט' : 'שמור שינויים'}
          </button>
          {!isNew && (
            <button
              className="admin-item-page__delete-btn"
              type="button"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '...' : 'מחק פריט'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
