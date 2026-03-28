// src/content/site/he/kenZeOved.content.js
// Hebrew fundraising page copy. All keys duplicated in naor + shay even if identical today —
// lets future copy variation happen in content only, zero code change.

export const kenZeOvedContent = {
  shared: {
    donateUrl: 'https://pay.grow.link/668e556e129d64d2d124e380300a1133-MzIyODgxNw',
    visitUrl: 'https://ontopo.com/he/il/page/jozveloz?source=kfarhirur',
    progress: {
      raisedAmount: 0,        // ← update this number manually when raising
      goalA: 180000,
      goalB: 340000,
      goalC: 520000,
      currencySymbol: '₪',
    },
    video: {
      placeholder: 'ראיון עם שי ונאור — יעלה בקרוב',
      _meta: { author: 'claude', ts: '2026-03-28' },
    },
    transparency: {
      heading: 'שקיפות כלכלית',
      placeholder: 'הנתונים יתווספו בקרוב.',
      _meta: { author: 'claude', ts: '2026-03-28' },
    },
    share: {
      whatsappLabel: 'וואטסאפ',
      facebookLabel: 'פייסבוק',
      copyLabel: 'העתיקו לינק',
      whatsappMessage: 'ג׳וז ולוז עדיין עובדת. אם יכולים — עוזרים: ',
      _meta: { author: 'claude', ts: '2026-03-28' },
    },
    footer: {
      backLabel: 'חזרה לאתר',
      _meta: { author: 'claude', ts: '2026-03-28' },
    },
  },

  naor: {
    share: {
      heading: 'שתפו, מכפת לכם, זה ממש עוזר :)',
      _meta: { author: 'naor', ts: '2026-03-28' },
    },
    progress: {
      goalALabel: 'יאיי, אין הוצאה לפועל',
      goalBLabel: 'חוזרים לשוטף פלוס סביר',
      goalCLabel: 'ככה זה מרגיש בלי חרדות?',
      raisedLabel: 'עד כה גויס',
      outOfLabel: 'מתוך',
      _meta: { author: 'naor', ts: '2026-03-28' },
    },
    hero: {
      heading: 'כן, זה עובד',
      body: 'אפשר הפעם לשאול אנחנו אתכם?\n\nזה עובד?',
      _meta: { author: 'shay', ts: '2026-03-28' },
    },
    cta: {
      donateLabel: 'מה שמרגיש לכם נכון',
      donateAriaLabel: 'תמיכה בג׳וז ולוז',
      visitLabel: 'בואו',
      visitAriaLabel: 'הגיעו לג׳וז ולוז',
      _meta: { author: 'claude', ts: '2026-03-28' },
    },
    longText: {
      paragraphs: [
        'ג׳וז ולוז פתחה ב-2017 עם תפריט ומחירים, כמו כולם. ב-2018 זרקנו את זה. מאז — מגיעים, אוכלים, מחליטים מה היה שווה. זה עבד. עדיין עובד.',
        'ארבע שנות מלחמה, לפני זה קורונה. מסעדות שעמדו עשרים שנה — לא עמדו. לא כי נכשלו. כי זה בלתי אפשרי. אנחנו בפנים, כמו כולם. לקחנו הלוואות. האמנו שיירגע.\n[לא נרגע.]',
        'אז הנה. אם ג׳וז ולוז שווה לכם משהו — גם מבחוץ, גם עכשיו — תחליטו כמה. אפשר לתרום. אפשר לבוא לאכול. אפשר להעביר הלאה.',
      ],
      _meta: { author: 'claude', ts: '2026-03-28' },
    },
  },

  shay: {
    share: {
      heading: 'תעבירו את זה הלאה',
      _meta: { author: 'shay', ts: '2026-03-28' },
    },
    progress: {
      goalALabel: 'יאיי, אין הוצאה לפועל',
      goalBLabel: 'חוזרים לשוטף פלוס סביר',
      goalCLabel: 'אה, זה לא הייתה צרבת',
      raisedLabel: 'עד כה גויס',
      outOfLabel: 'מתוך',
      _meta: { author: 'shay', ts: '2026-03-28' },
    },
    hero: {
      heading: 'כן, זה עובד',
      body: 'אפשר הפעם לשאול אנחנו אתכם?\n\nזה עובד?',
      _meta: { author: 'shay', ts: '2026-03-28' },
    },
    cta: {
      donateLabel: 'כמה שאתם מעריכים את המצוקה',
      donateAriaLabel: 'תמיכה בג׳וז ולוז',
      visitLabel: 'בואו לאכול',
      visitAriaLabel: 'הגיעו לג׳וז ולוז',
      _meta: { author: 'shay', ts: '2026-03-28' },
    },
    longText: {
      paragraphs: [
        'שני שולחנות בחוץ, שמן זית, לחם. בסוף הערב אתם אומרים לנו מה שווה לכם. ככה זה עובד פה מ-2018. תמיד עבד — כשיש אנשים.',
        'אנחנו לא מיוחדים בזה שנשארנו. זה מה שבחרנו לעשות, כל יום מחדש. כל התעשייה הזאת מנסה לשרוד את מה שבלתי אפשרי לשרוד. לקחנו הלוואות, אמרנו עוד רגע של שקט ויהיה בסדר. לא היה.',
        'אם ג׳וז ולוז שווה לכם משהו — תגידו כמה. מהספה, מהטלפון, מהמטבח שלכם. אותו הסכם. רק עכשיו אנחנו מבקשים שתתחילו אתם.',
      ],
      _meta: { author: 'claude', ts: '2026-03-28' },
    },
  },
};
