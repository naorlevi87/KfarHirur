// src/pages/privacy/PrivacyPage.jsx
// מדיניות פרטיות — דף סטטי בעברית בהתאם לחוק הגנת הפרטיות הישראלי.

import './PrivacyPage.css';

const LAST_UPDATED = '5 באפריל 2026';

export function PrivacyPage() {
  return (
    <div className="privacy-page">
      <div className="privacy-content">
        <h1 className="privacy-title">מדיניות פרטיות</h1>
        <p className="privacy-updated">עודכן לאחרונה: {LAST_UPDATED}</p>

        <section className="privacy-section">
          <h2>1. מי אנחנו</h2>
          <p>
            כפר הירעור בע"מ (ח.פ 515647725), התנופה 7, תל אביב יפו ("החברה", "אנחנו").
            האתר פועל בכתובת <strong>kfarhirur.com</strong>.
          </p>
          <p>
            ליצירת קשר בכל עניין הנוגע לפרטיות:{' '}
            <a href="mailto:office@jozveloz.com">office@jozveloz.com</a>
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. אילו מידע אנחנו אוספים</h2>
          <p>בעת הרשמה והתחברות לאתר, אנחנו אוספים:</p>
          <ul>
            <li><strong>כתובת אימייל</strong> — לצורך זיהוי וכניסה לחשבון.</li>
            <li><strong>שם תצוגה</strong> — שם שנמסר על ידך או שנלקח מחשבון Google / Facebook.</li>
            <li><strong>תמונת פרופיל</strong> — אם נמסרה על ידך או הועברה מרשת חברתית.</li>
            <li><strong>מזהה ייחודי</strong> — נוצר אוטומטית עבור כל חשבון.</li>
            <li><strong>תאריך יצירת החשבון</strong> — לצורכי ניהול.</li>
          </ul>
          <p>
            אנחנו <strong>לא</strong> אוספים: מספרי טלפון, כתובות, פרטי תשלום, מיקום גאוגרפי, או מידע על
            פעילות מחוץ לאתר.
          </p>
        </section>

        <section className="privacy-section">
          <h2>3. למה אנחנו משתמשים במידע</h2>
          <ul>
            <li>לצורך זיהוי והתחברות לחשבונך האישי.</li>
            <li>להצגת שמך ותמונתך בפרופיל ובפעילות באתר.</li>
            <li>לניהול הרשאות גישה (משתמש רגיל / עורך / מנהל).</li>
            <li>לשליחת עדכונים שביקשת לקבל (בהסכמה מפורשת בלבד).</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>4. שיתוף מידע עם צדדים שלישיים</h2>
          <p>אנחנו משתמשים בשירותים הבאים לצורך הפעלת האתר:</p>
          <ul>
            <li>
              <strong>Supabase</strong> — אחסון נתוני המשתמשים ואימות זהות.
              המידע מאוחסן בשרתים באירופה.{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
                מדיניות פרטיות של Supabase
              </a>
            </li>
            <li>
              <strong>Google</strong> — כניסה באמצעות חשבון Google (אופציונלי).{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                מדיניות פרטיות של Google
              </a>
            </li>
            <li>
              <strong>Facebook / Meta</strong> — כניסה באמצעות חשבון Facebook (אופציונלי).{' '}
              <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">
                מדיניות פרטיות של Meta
              </a>
            </li>
          </ul>
          <p>
            אנחנו <strong>לא מוכרים</strong> ולא משתפים את המידע שלך עם גורמים נוספים לצורכי
            שיווק או מסחר.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. כמה זמן שומרים את המידע</h2>
          <p>
            המידע שלך נשמר כל עוד חשבונך פעיל באתר. עם מחיקת החשבון, המידע האישי
            נמחק תוך 30 יום.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. הזכויות שלך</h2>
          <p>בהתאם לחוק הגנת הפרטיות התשמ"א-1981 ותיקוניו, יש לך זכות:</p>
          <ul>
            <li><strong>לעיין</strong> במידע שנשמר עליך.</li>
            <li><strong>לתקן</strong> מידע שגוי — דרך עמוד הפרופיל באתר.</li>
            <li><strong>למחוק</strong> את חשבונך ואת כל המידע הקשור אליו.</li>
            <li><strong>להתנגד</strong> לשימוש במידע שלך לצורכי דיוור.</li>
          </ul>
          <p>
            לממש את זכויותיך, פנה אלינו בדוא"ל:{' '}
            <a href="mailto:office@jozveloz.com">office@jozveloz.com</a>
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. מחיקת חשבון</h2>
          <p>
            לבקשת מחיקת החשבון וכל המידע הקשור אליו, שלח אימייל ל{' '}
            <a href="mailto:office@jozveloz.com">office@jozveloz.com</a> עם הכותרת
            "בקשת מחיקת חשבון". נטפל בבקשה תוך 14 ימי עסקים.
          </p>
        </section>

        <section className="privacy-section">
          <h2>8. עוגיות (Cookies)</h2>
          <p>
            האתר משתמש בעוגיות הכרחיות בלבד לצורך שמירת סשן הכניסה. אין שימוש
            בעוגיות לצורכי פרסום או מעקב.
          </p>
        </section>

        <section className="privacy-section">
          <h2>9. שינויים במדיניות</h2>
          <p>
            אנחנו עשויים לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר
            ויישלחו במייל למשתמשים רשומים.
          </p>
        </section>

        <section className="privacy-section">
          <h2>10. יצירת קשר</h2>
          <p>
            כפר הירעור בע"מ<br />
            ח.פ 515647725<br />
            התנופה 7, תל אביב יפו<br />
            <a href="mailto:office@jozveloz.com">office@jozveloz.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
