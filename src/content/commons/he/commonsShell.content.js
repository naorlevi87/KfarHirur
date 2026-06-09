// src/content/commons/he/commonsShell.content.js
// Hebrew UI copy for the Commons Engine shell (Increment 1).
// Voice: playful, warm, light — never corporate (see docs/voice.md). Strings are placeholder-quality;
// a dedicated copy pass comes later (display name still TBD).

export const commonsShellContent = {
  appName: 'מרחב העבודה',
  nav: {
    myTasks: 'שלי',
    board: 'לוח',
    overview: 'תמונת מצב',
    alerts: 'התראות',
    menuAriaLabel: 'ניווט מרחב העבודה',
  },
  dashboard: {
    emptyTitle: 'הכל רגוע פה',
    emptyBody: 'עוד אין משימות. תכף נמלא את זה.',
  },
  comingSoon: {
    title: 'בקרוב כאן',
    body: 'עוד עובדים על זה.',
  },
  picker: {
    title: 'איפה עובדים היום?',
    subtitle: 'בחרו מרחב עבודה כדי להיכנס.',
    chooseAria: 'בחירת מרחב עבודה',
  },
  switcher: {
    title: 'מעבר בין מרחבים',
    triggerAria: 'החלפת מרחב עבודה',
  },
  tasks: {
    addTask: 'משימה חדשה',
    addContainer: 'תיקייה חדשה',
    newTaskPlaceholder: 'מה צריך לעשות?',
    newContainerPlaceholder: 'שם התיקייה',
    add: 'הוספה',
    cancel: 'ביטול',
    emptyTitle: 'אין עדיין משימות',
    emptyBody: 'הוסיפו את הראשונה למטה.',
    detailTitle: 'פרטי משימה',
    titleLabel: 'כותרת',
    description: 'תיאור',
    descriptionPlaceholder: 'פרטים, הערות, קישורים…',
    assignee: 'אחראי/ת',
    unassigned: 'לא משויך',
    dueDate: 'תאריך יעד',
    noDue: 'ללא תאריך',
    save: 'שמירה',
    delete: 'מחיקה',
    addChildAria: 'הוספה לתיקייה',
    toggleDoneAria: 'סימון שהמשימה בוצעה',
    expandAria: 'פתיחה או סגירה של התיקייה',
    openTaskAria: 'פתיחת פרטי המשימה',
  },
  access: {
    loading: 'רגע, פותחים לך…',
    noAccessTitle: 'אופס, אין לך גישה לפה עדיין',
    noAccessBody: 'המרחב הזה פתוח רק לחברי הצוות. דברו עם מנהל כדי שיוסיפו אותך.',
    backToSite: 'חזרה לאתר',
  },
};
