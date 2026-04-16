// src/data/pageContent/home.schema.js
// Field schema for the home page content editor.

export const homeSchema = {
  pageKey: 'home',
  label: 'דף בית',
  sections: [
    {
      key: 'origin',
      label: 'פתיחה',
      fields: [
        { path: 'origin.heading', label: 'כותרת', type: 'input',    mode: 'shared' },
        { path: 'origin.body',    label: 'טקסט',  type: 'textarea', mode: 'shared' },
      ],
    },
    {
      key: 'community',
      label: 'כפר הירעור',
      fields: [
        { path: 'community.heading', label: 'כותרת', type: 'input',    mode: 'both' },
        { path: 'community.body',    label: 'גוף טקסט', type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'joz',
      label: "ג'וז ולוז",
      fields: [
        { path: 'joz.heading', label: 'כותרת',    type: 'input',    mode: 'both' },
        { path: 'joz.body',    label: 'גוף טקסט', type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'visit',
      label: 'תגיעו לבקר',
      fields: [
        { path: 'visit.heading',       label: 'כותרת',            type: 'input', mode: 'shared' },
        { path: 'visit.reserveLabel',  label: 'תווית הזמנה',      type: 'input', mode: 'shared' },
        { path: 'visit.instagramLabel',label: 'תווית אינסטגרם',   type: 'input', mode: 'shared' },
        { path: 'visit.facebookLabel', label: 'תווית פייסבוק',    type: 'input', mode: 'shared' },
      ],
    },
    {
      key: 'fundraising',
      label: 'גיוס',
      fields: [
        { path: 'fundraising.heading',  label: 'כותרת',       type: 'input',    mode: 'shared' },
        { path: 'fundraising.subtext',  label: 'טקסט משנה',   type: 'textarea', mode: 'both' },
        { path: 'fundraising.ctaLabel', label: 'כפתור',       type: 'input',    mode: 'shared' },
      ],
    },
    {
      key: 'join',
      label: 'הצטרפות לצוות',
      fields: [
        { path: 'join.heading',  label: 'כותרת',     type: 'input',    mode: 'both' },
        { path: 'join.subtext',  label: 'טקסט משנה', type: 'textarea', mode: 'both' },
        { path: 'join.ctaLabel', label: 'כפתור',     type: 'input',    mode: 'shared' },
      ],
    },
    {
      key: 'timeline',
      label: 'ציר הזמן',
      fields: [
        { path: 'timeline.heading', label: 'כותרת',       type: 'input', mode: 'shared' },
        { path: 'timeline.teaser',  label: 'טקסט הזמנה',  type: 'input', mode: 'shared' },
        { path: 'timeline.label',   label: 'תווית כפתור', type: 'input', mode: 'shared' },
      ],
    },
  ],
};
