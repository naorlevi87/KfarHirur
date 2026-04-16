// src/content/site/he/home.content.js
// Hebrew copy for the home page. Naor = introspective/intentional. Shay = warm/communal.

const BASE = 'https://kqlfvwlzayinngrgafec.supabase.co/storage/v1/object/public/homepage/';
const img = name => BASE + encodeURIComponent(name);

export const homeContent = {
  shared: {
    origin: {
      heading: 'הסיפור שלנו',
      body: 'קהילה שהתחילה ברגע אחד בזולה בנווה ים, והתמקמה בעתלית.',
    },
    visit: {
      heading: 'מוזמנים לבוא להתארח',
      reserveLabel: 'הזמנת מקום',
      reserveUrl: 'https://ontopo.com/he/il/page/jozveloz?source=kfarhirur',
      instagramLabel: 'אינסטגרם',
      instagramUrl: 'https://www.instagram.com/joz_ve_loz/',
      facebookLabel: 'פייסבוק',
      facebookUrl: 'https://www.facebook.com/JozVeLoz',
    },
    fundraising: {
      heading: 'וכן זה עובד! אבל...',
      ctaLabel: 'לעמוד הגיוס',
      videoUrl: img('fundraising-video.mp4'),
    },
    join: {
      ctaLabel: 'להצטרף אלינו',
    },
    timeline: {
      heading: 'ציר הזמן',
      teaser: 'רוצים לחפור יותר בסיפור?',
      label: 'לציר הזמן',
      // Upload screenshot to Supabase Storage homepage bucket and set the filename here
      previewImage: img('timeline-preview.jpg'),
    },
    images: {
      // Carousel 1 — Zola origins
      zola: [
        img('HomePage - zola 1.jpg'),
        img('HomePage - zola 2.jpg'),
        img('HomePage - zola 3.jpg'),
        img('HomePage - zola 4.jpg'),
        img('HomePage - zola 5.jpg'),
      ],
      // Carousel 2 — Atlit: place + people mixed
      atlit: [
        img('HomePage - atlit front.jpg'),
        img('HomePage - atlit ppl.jpg'),
        img('HomePage - atlit back.jpg'),
        img('HomePage - atlit ppl 2.jpg'),
        img('HomePage - atlit garden.jpg'),
        img('HomePage - atlit pool.jpg'),
        img('HomePage - atlit living room.jpg'),
        img('HomePage - atlit kitchen.jpg'),
        img('HomePage - atlit dog.jpg'),
      ],
      // Carousel 3 — Joz Veloz (after Joz text section)
      joz: [
        img('HomePage - Joz crew.jpg'),
        img('HomePage - Joz vibe.jpg'),
        img('HomePage - Joz1.jpg'),
        img('HomePage - Joz2.JPG'),
        img('HomePage - Joz3.JPG'),
        img('HomePage - Joz4.JPG'),
        img('IMG_7621.JPG'),
      ],
      // Single crew photo — shown after the join-team section
      crew: img('HomePage - Joz crew.jpg'),
    },
  },

  naor: {
    community: {
      heading: 'כפר הירעור',
      body: 'מסגרת פעילה שעוזרת לאנשים עם מוגבלות להשתלב בחיים של ממש — בעבודה, בבית, ובקהילה. לא מוסד ולא תוכנית. חיים.',
    },
    joz: {
      heading: "ג'וז ולוז",
      body: 'המסעדה שהקמנו כדי שהקהילה תוכל לעמוד ברגליה. כל ביקור תומך בשכר, בשיכון, ובעצמאות של האנשים שחיים פה.',
    },
    fundraising: {
      subtext: 'אנחנו עוד לא שם. הפער בין מה שיש לבין מה שצריך — אפשר לגשר עליו.',
    },
    join: {
      heading: 'רוצים להצטרף לצוות?',
      subtext: 'מחפשים אנשים שבאמת רוצים להיות חלק ממשהו.',
    },
  },

  shay: {
    community: {
      heading: 'כפר הירעור',
      body: 'אנשים שמצאו אחד את השני. ישבו על אותו שולחן, שיתפו אותה מטבח, ובנו ביחד משהו שהוא יותר מסתם מקום לגור בו.',
    },
    joz: {
      heading: "ג'וז ולוז",
      body: 'מגיעים בשביל האוכל, נשארים בשביל האנשים. המקום שבו הקהילה פוגשת את כולם.',
    },
    fundraising: {
      subtext: 'הסיפור הארוך קצת יותר מורכב. אפשר לעזור.',
    },
    join: {
      heading: 'רוצים להצטרף לצוות?',
      subtext: 'אישפוז ארוך בכפר הירעור. בואו להיות חלק מהמשפחה.',
    },
  },
};
