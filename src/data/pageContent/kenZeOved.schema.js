// src/data/pageContent/kenZeOved.schema.js
// Field schema for the kenZeOved page content editor.
// path = dot-notation matching field_path in DB and payload keys.
// mode: 'both' = separate naor + shay inputs; 'shared' = single shared input.
// type: 'input' | 'textarea' | 'paragraphs'

export const kenZeOvedSchema = {
  pageKey: 'kenZeOved',
  label: 'כן זה עובד',
  sections: [
    {
      key: 'hero',
      label: 'כותרת ראשית',
      fields: [
        { path: 'hero.heading', label: 'כותרת',     type: 'input',    mode: 'both' },
        { path: 'hero.body',    label: 'גוף הטקסט', type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'cta',
      label: 'כפתורים',
      fields: [
        { path: 'cta.donateLabel', label: 'כפתור תרומה', type: 'input', mode: 'both' },
        { path: 'cta.visitLabel',  label: 'כפתור ביקור', type: 'input', mode: 'both' },
      ],
    },
    {
      key: 'progress',
      label: 'מד התקדמות',
      fields: [
        { path: 'progress.goalALabel',  label: 'תווית יעד א׳',    type: 'input', mode: 'both' },
        { path: 'progress.goalBLabel',  label: 'תווית יעד ב׳',    type: 'input', mode: 'both' },
        { path: 'progress.goalCLabel',  label: 'תווית יעד ג׳',    type: 'input', mode: 'both' },
        { path: 'progress.raisedLabel', label: 'גויס עד כה',      type: 'input', mode: 'both' },
        { path: 'progress.outOfLabel',  label: 'מתוך',            type: 'input', mode: 'both' },
      ],
    },
    {
      key: 'longText',
      label: 'טקסט ארוך',
      fields: [
        { path: 'longText.body', label: 'טקסט', type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'share',
      label: 'שיתוף',
      fields: [
        { path: 'share.heading',          label: 'כותרת שיתוף',        type: 'input',    mode: 'both' },
        { path: 'share.whatsappLabel',    label: 'תווית וואטסאפ',      type: 'input',    mode: 'shared' },
        { path: 'share.facebookLabel',    label: 'תווית פייסבוק',      type: 'input',    mode: 'shared' },
        { path: 'share.copyLabel',        label: 'תווית העתקת לינק',   type: 'input',    mode: 'shared' },
        { path: 'share.whatsappMessage',  label: 'הודעת וואטסאפ',      type: 'textarea', mode: 'shared' },
      ],
    },
    {
      key: 'transparency',
      label: 'שקיפות כלכלית',
      fields: [
        { path: 'transparency.heading',     label: 'כותרת',      type: 'input',    mode: 'shared' },
        { path: 'transparency.placeholder', label: 'טקסט זמני',  type: 'textarea', mode: 'shared' },
      ],
    },
    {
      key: 'video',
      label: 'וידאו',
      fields: [
        { path: 'video.placeholder', label: 'טקסט placeholder', type: 'input', mode: 'shared' },
      ],
    },
  ],
};
