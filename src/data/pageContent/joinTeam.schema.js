// src/data/pageContent/joinTeam.schema.js
// Field schema for the join-team page content editor. Section order matches page order.
// Each "join us" section (kitchen, hospitality) carries its own copy + WhatsApp config.

export const joinTeamSchema = {
  pageKey: 'joinTeam',
  label: 'הצטרפות לצוות',
  sections: [
    {
      key: 'general',
      label: 'כללי ג׳וז',
      fields: [
        { path: 'general.heading', label: 'כותרת',     type: 'input',    mode: 'both' },
        { path: 'general.body',    label: 'גוף הטקסט', type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'kitchen',
      label: 'מטבח',
      fields: [
        { path: 'kitchen.heading',          label: 'כותרת',                type: 'input',    mode: 'both' },
        { path: 'kitchen.body',             label: 'גוף הטקסט',            type: 'textarea', mode: 'both' },
        { path: 'kitchen.buttonLabel',      label: 'כיתוב הכפתור',         type: 'input',    mode: 'both' },
        { path: 'kitchen.whatsappPhone',    label: 'טלפון וואטסאפ',        type: 'input',    mode: 'both' },
        { path: 'kitchen.whatsappMessage',  label: 'טקסט ההודעה בוואטסאפ', type: 'textarea', mode: 'both' },
      ],
    },
    {
      key: 'hospitality',
      label: 'אנשי אירוח',
      fields: [
        { path: 'hospitality.heading',         label: 'כותרת',                type: 'input',    mode: 'both' },
        { path: 'hospitality.body',            label: 'גוף הטקסט',            type: 'textarea', mode: 'both' },
        { path: 'hospitality.buttonLabel',     label: 'כיתוב הכפתור',         type: 'input',    mode: 'both' },
        { path: 'hospitality.whatsappPhone',   label: 'טלפון וואטסאפ',        type: 'input',    mode: 'both' },
        { path: 'hospitality.whatsappMessage', label: 'טקסט ההודעה בוואטסאפ', type: 'textarea', mode: 'both' },
      ],
    },
  ],
};
