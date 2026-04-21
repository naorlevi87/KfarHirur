// src/data/pageContent/kenZeOved.schema.js
// Field schema for the kenZeOved page content editor. Section order matches page order.

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
      key: 'video_short',
      label: 'סרטון קצר (autoplay)',
      fields: [
        { path: 'videoShort.src', label: 'סרטון קצר', type: 'media-single', mode: 'shared' },
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
        { path: 'progress.goalALabel',  label: 'תווית יעד א׳', type: 'input', mode: 'both' },
        { path: 'progress.goalBLabel',  label: 'תווית יעד ב׳', type: 'input', mode: 'both' },
        { path: 'progress.goalCLabel',  label: 'תווית יעד ג׳', type: 'input', mode: 'both' },
        { path: 'progress.raisedLabel', label: 'גויס עד כה',   type: 'input', mode: 'both' },
        { path: 'progress.outOfLabel',  label: 'מתוך',          type: 'input', mode: 'both' },
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
      key: 'video_long',
      label: 'סרטון ארוך',
      fields: [
        { path: 'videoLong', label: 'סרטון', type: 'video', mode: 'shared' },
      ],
    },
    {
      key: 'share',
      label: 'שיתוף',
      fields: [
        { path: 'share.heading',             label: 'כותרת',                      type: 'input',        mode: 'both' },
        { path: 'share.whatsappMessage',     label: 'הודעת וואטסאפ',              type: 'textarea',     mode: 'shared' },
        { path: 'share.facebookMedia',       label: 'תמונה/וידאו לפייסבוק',       type: 'media-single', mode: 'shared' },
        { path: 'share.instagramStoryMedia', label: 'וידאו/תמונה לסטורי אינסטגרם', type: 'media-single', mode: 'shared' },
      ],
    },
    {
      key: 'transparency',
      label: 'שקיפות כלכלית (מוסתר)',
      fields: [
        { path: 'transparency.heading',     label: 'כותרת',     type: 'input',    mode: 'shared' },
        { path: 'transparency.placeholder', label: 'טקסט זמני', type: 'textarea', mode: 'shared' },
      ],
    },
  ],
};
