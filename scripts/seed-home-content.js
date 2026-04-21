// scripts/seed-home-content.js
// One-time seed: writes static home page content to the DB.
// Uses ignoreDuplicates — existing DB rows are never overwritten.
//
// Run:
//   node --env-file=.env.local scripts/seed-home-content.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const BASE = 'https://kqlfvwlzayinngrgafec.supabase.co/storage/v1/object/public/homepage/';
const img  = name => BASE + encodeURIComponent(name);

// All home page content, flat — mirrors home.content.js exactly.
// mode: 'shared' | 'naor' | 'shay'
const rows = [
  // ── shared ────────────────────────────────────────────────
  { mode: 'shared', field_path: 'origin.heading',        value: 'הסיפור שלנו' },
  { mode: 'shared', field_path: 'origin.body',           value: 'קהילה שהתחילה ברגע אחד בזולה בנווה ים, והתמקמה בעתלית.' },

  { mode: 'shared', field_path: 'visit.heading',         value: 'מוזמנים לבוא להתארח' },
  { mode: 'shared', field_path: 'visit.reserveLabel',    value: 'הזמנת מקום' },
  { mode: 'shared', field_path: 'visit.reserveUrl',      value: 'https://ontopo.com/he/il/page/jozveloz?source=kfarhirur' },
  { mode: 'shared', field_path: 'visit.instagramLabel',  value: 'אינסטגרם' },
  { mode: 'shared', field_path: 'visit.instagramUrl',    value: 'https://www.instagram.com/joz_ve_loz/' },
  { mode: 'shared', field_path: 'visit.facebookLabel',   value: 'פייסבוק' },
  { mode: 'shared', field_path: 'visit.facebookUrl',     value: 'https://www.facebook.com/JozVeLoz' },

  { mode: 'shared', field_path: 'fundraising.heading',   value: 'וכן זה עובד! אבל...' },
  { mode: 'shared', field_path: 'fundraising.ctaLabel',  value: 'לעמוד הגיוס' },
  { mode: 'shared', field_path: 'fundraising.videoUrl',  value: img('fundraising-video.mp4') },

  { mode: 'shared', field_path: 'join.ctaLabel',         value: 'להצטרף אלינו' },

  { mode: 'shared', field_path: 'timeline.heading',      value: 'ציר הזמן' },
  { mode: 'shared', field_path: 'timeline.teaser',       value: 'רוצים לחפור יותר בסיפור?' },
  { mode: 'shared', field_path: 'timeline.label',        value: 'לציר הזמן' },
  { mode: 'shared', field_path: 'timeline.previewImage', value: img('timeline-preview.jpg') },

  { mode: 'shared', field_path: 'images.zola', value: [
    img('HomePage - zola 1.jpg'),
    img('HomePage - zola 2.jpg'),
    img('HomePage - zola 3.jpg'),
    img('HomePage - zola 4.jpg'),
    img('HomePage - zola 5.jpg'),
  ]},
  { mode: 'shared', field_path: 'images.atlit', value: [
    img('HomePage - atlit front.jpg'),
    img('HomePage - atlit ppl.jpg'),
    img('HomePage - atlit back.jpg'),
    img('HomePage - atlit ppl 2.jpg'),
    img('HomePage - atlit garden.jpg'),
    img('HomePage - atlit pool.jpg'),
    img('HomePage - atlit living room.jpg'),
    img('HomePage - atlit kitchen.jpg'),
    img('HomePage - atlit dog.jpg'),
  ]},
  { mode: 'shared', field_path: 'images.joz', value: [
    img('HomePage - Joz crew.jpg'),
    img('HomePage - Joz vibe.jpg'),
    img('HomePage - Joz1.jpg'),
    img('HomePage - Joz2.JPG'),
    img('HomePage - Joz3.JPG'),
    img('HomePage - Joz4.JPG'),
    img('IMG_7621.JPG'),
  ]},
  { mode: 'shared', field_path: 'images.crew', value: img('HomePage - Joz crew.jpg') },

  // ── naor ──────────────────────────────────────────────────
  { mode: 'naor', field_path: 'community.heading',     value: 'כפר הירעור' },
  { mode: 'naor', field_path: 'community.body',        value: 'מסגרת פעילה שעוזרת לאנשים עם מוגבלות להשתלב בחיים של ממש — בעבודה, בבית, ובקהילה. לא מוסד ולא תוכנית. חיים.' },
  { mode: 'naor', field_path: 'joz.heading',           value: "ג'וז ולוז" },
  { mode: 'naor', field_path: 'joz.body',              value: 'המסעדה שהקמנו כדי שהקהילה תוכל לעמוד ברגליה. כל ביקור תומך בשכר, בשיכון, ובעצמאות של האנשים שחיים פה.' },
  { mode: 'naor', field_path: 'fundraising.subtext',   value: 'אנחנו עוד לא שם. הפער בין מה שיש לבין מה שצריך — אפשר לגשר עליו.' },
  { mode: 'naor', field_path: 'join.heading',          value: 'רוצים להצטרף לצוות?' },
  { mode: 'naor', field_path: 'join.subtext',          value: 'מחפשים אנשים שבאמת רוצים להיות חלק ממשהו.' },

  // ── shay ──────────────────────────────────────────────────
  { mode: 'shay', field_path: 'community.heading',     value: 'כפר הירעור' },
  { mode: 'shay', field_path: 'community.body',        value: 'אנשים שמצאו אחד את השני. ישבו על אותו שולחן, שיתפו אותה מטבח, ובנו ביחד משהו שהוא יותר מסתם מקום לגור בו.' },
  { mode: 'shay', field_path: 'joz.heading',           value: "ג'וז ולוז" },
  { mode: 'shay', field_path: 'joz.body',              value: 'מגיעים בשביל האוכל, נשארים בשביל האנשים. המקום שבו הקהילה פוגשת את כולם.' },
  { mode: 'shay', field_path: 'fundraising.subtext',   value: 'הסיפור הארוך קצת יותר מורכב. אפשר לעזור.' },
  { mode: 'shay', field_path: 'join.heading',          value: 'רוצים להצטרף לצוות?' },
  { mode: 'shay', field_path: 'join.subtext',          value: 'אישפוז ארוך בכפר הירעור. בואו להיות חלק מהמשפחה.' },
];

const records = rows.map(r => ({
  page_key:   'home',
  locale:     'he',
  field_path: r.field_path,
  mode:       r.mode,
  value:      r.value,
}));

const { error } = await supabase
  .from('page_content')
  .upsert(records, {
    onConflict:       'page_key,field_path,mode,locale',
    ignoreDuplicates: true,   // existing rows are never touched
  });

if (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}

console.log(`Seeded ${records.length} rows (existing rows untouched).`);
