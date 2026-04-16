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
        { path: 'community.heading', label: 'כותרת',      type: 'input',    mode: 'both' },
        { path: 'community.body',    label: 'גוף טקסט',   type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'media_atlit',
      label: 'תמונות עתלית',
      fields: [
        { path: 'images.atlit', label: 'תמונות עתלית', type: 'media-gallery', mode: 'shared' },
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
      key: 'media_joz',
      label: "תמונות ג'וז ולוז",
      fields: [
        { path: 'images.joz', label: "תמונות ג'וז ולוז", type: 'media-gallery', mode: 'shared' },
      ],
    },
    {
      key: 'visit',
      label: 'תגיעו לבקר',
      fields: [
        { path: 'visit.heading',        label: 'כותרת',           type: 'input', mode: 'shared' },
        { path: 'visit.reserveLabel',   label: 'תווית הזמנה',     type: 'input', mode: 'shared' },
        { path: 'visit.instagramLabel', label: 'תווית אינסטגרם',  type: 'input', mode: 'shared' },
        { path: 'visit.facebookLabel',  label: 'תווית פייסבוק',   type: 'input', mode: 'shared' },
      ],
    },
    {
      key: 'fundraising',
      label: 'גיוס',
      fields: [
        { path: 'fundraising.heading',  label: 'כותרת',      type: 'input',        mode: 'shared' },
        { path: 'fundraising.subtext',  label: 'טקסט משנה',  type: 'textarea',     mode: 'both' },
        { path: 'fundraising.ctaLabel', label: 'כפתור',      type: 'input',        mode: 'shared' },
        { path: 'fundraising.videoUrl', label: 'וידאו',      type: 'media-single', mode: 'shared' },
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
      key: 'media_crew',
      label: 'תמונת צוות',
      fields: [
        { path: 'images.crew', label: 'תמונת צוות', type: 'media-single', mode: 'shared' },
      ],
    },
    {
      key: 'timeline',
      label: 'ציר הזמן',
      fields: [
        { path: 'timeline.heading',      label: 'כותרת',         type: 'input',        mode: 'shared' },
        { path: 'timeline.teaser',       label: 'טקסט הזמנה',    type: 'input',        mode: 'shared' },
        { path: 'timeline.label',        label: 'תווית כפתור',   type: 'input',        mode: 'shared' },
        { path: 'timeline.previewImage', label: 'תמונת preview', type: 'media-single', mode: 'shared' },
      ],
    },
    {
      key: 'media_zola',
      label: 'תמונות זולה',
      fields: [
        { path: 'images.zola', label: 'תמונות זולה', type: 'media-gallery', mode: 'shared' },
      ],
    },
  ],
};
