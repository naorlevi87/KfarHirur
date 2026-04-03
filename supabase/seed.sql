-- supabase/seed.sql
-- Migrates all existing static timeline items into the DB.
-- Run after schema.sql in the Supabase SQL Editor.

-- ── Items ─────────────────────────────────────────────────────────────────────

insert into timeline_items
  (slug, date, event_type, size, min_scale, initial_view, naor_title, shay_title, naor_label, shay_label)
values
  ('zula',            '2014-10-01', 'milestone', 'standard', 0, true,  'הזולה בחוף',         'הזולה בחוף',         'תחילת 2012',            'תחילת 2012'),
  ('atlit',           '2014-11-01', 'milestone', 'standard', 0, false, 'עתלית',               'עתלית',               'נוב׳ 2014 – דצמ׳ 2016', 'נוב׳ 2014 – דצמ׳ 2016'),
  ('einkemunim',      '2016-06-01', 'milestone', 'standard', 0, false, 'עין כמונים',          'עין כמונים',          '2016',                  '2016'),
  ('project24',       '2015-05-01', 'milestone', 'standard', 0, true,  'פרויקט 24',           'פרויקט 24',           'מאי 2015',              'מאי 2015'),
  ('manuela',         '2015-07-01', 'milestone', 'standard', 0, false, 'מנואלה, זכרון',       'מנואלה, זכרון',       '2015',                  '2015'),
  ('placeholder-1',   '2015-10-01', 'milestone', 'standard', 0, false, 'פריט 1',              'פריט 1',              '2015–2016',             '2015–2016'),
  ('placeholder-2',   '2016-04-01', 'milestone', 'standard', 0, false, 'פריט 2',              'פריט 2',              '2016',                  '2016'),
  ('tlv',             '2016-10-01', 'milestone', 'standard', 0, false, 'למה אנחנו מחכים?',   'למה אנחנו מחכים?',   'סוף 2016',              'סוף 2016'),
  ('joz-open',        '2017-07-01', 'milestone', 'key',      0, true,  'ג׳וז ולוז נפתח',     'ג׳וז ולוז נפתח',     'יולי 2017',             'יולי 2017'),
  ('corona',          '2020-06-01', 'milestone', 'key',      0, true,  'קורונה',              'קורונה',              '2020',                  '2020'),
  ('placeholder-3',   '2020-10-01', 'milestone', 'standard', 0, false, 'פריט 3',              'פריט 3',              '2020–2021',             '2020–2021'),
  ('pinum',           '2021-06-01', 'milestone', 'standard', 0, true,  '[לא] צו פינוי',       '[לא] צו פינוי',       '2021',                  '2021'),
  ('milchama',        '2023-10-01', 'milestone', 'key',      0, true,  'מלחמה',               'מלחמה',               '7.10.2023',             '7.10.2023'),
  ('now',             '2026-03-01', 'milestone', 'standard', 0, true,  'עכשיו',               'עכשיו',               '2024–2026',             '2024–2026'),
  ('corona-lockdown', '2020-03-01', 'milestone', 'small',    2, false, 'סגר ראשון',           'סגר ראשון',           'מרץ 2020',              'מרץ 2020'),
  ('joz-delivery',    '2020-04-01', 'milestone', 'small',    2, false, 'ג׳וז עד הבית',       'ג׳וז עד הבית',       'אפריל 2020',            'אפריל 2020'),
  ('milchama-return', '2023-11-01', 'milestone', 'small',    2, false, 'חזרנו',               'חזרנו',               'אוקטובר 2023',          'אוקטובר 2023'),
  ('joz-no-menu',     '2017-08-01', 'milestone', 'small',    2, false, 'ללא תפריט',           'ללא תפריט',           'יולי 2017',             'יולי 2017')
on conflict (slug) do nothing;

-- ── Text blocks ───────────────────────────────────────────────────────────────

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "תוכן בקרוב."}, "shay": {"text": "תוכן בקרוב."}}'::jsonb
from timeline_items where slug = 'zula';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "הזולה על חוף הים. DMT, מדורה, סופה. שני אנשים שעדיין לא יודעים מה הם עושים ביחד — אבל יודעים שהם עושים."}, "shay": {"text": "הים בלילה. אש. ריח של מלח ועשן. לא ידענו כלום, אבל הכל היה שם כבר — בזולה, ברוח, בעיניים זה של זה."}}'::jsonb
from timeline_items where slug = 'atlit';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "חוות גבינות עיזים בצפון. ניהול ראשון משותף. הבנו שאנחנו יודעים לעשות את זה — ושאנחנו עושים את זה אחרת."}, "shay": {"text": "עיזים, גבינה, צפון. בפעם הראשונה ניהלנו ביחד — ולא היה ויכוח אחד על מה \"צריך\" לעשות. רק עשינו."}}'::jsonb
from timeline_items where slug = 'einkemunim';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "תוכן בקרוב."}, "shay": {"text": "תוכן בקרוב."}}'::jsonb
from timeline_items where slug = 'project24';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "מסעדה איטלקית. שי טבח, אני מלצר. אחרי משמרת ישבנו על הגדר. \"מסעדה שנתיים מהיום.\" עברו שבעה חודשים."}, "shay": {"text": "ישבנו על הגדר אחרי משמרת. אני רק פתחתי את הפה ואמרתי את זה — ונאור כבר ענה \"כן\". בלי להסס שנייה."}}'::jsonb
from timeline_items where slug = 'manuela';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "תוכן בקרוב."}, "shay": {"text": "תוכן בקרוב."}}'::jsonb
from timeline_items where slug = 'placeholder-1';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "תוכן בקרוב."}, "shay": {"text": "תוכן בקרוב."}}'::jsonb
from timeline_items where slug = 'placeholder-2';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "\"נאור, למה אנחנו מחכים?\" — שי חזר ממשמרת, שאל אותי. עזבנו את העבודות. 25 אלף כל אחד. שלושה חודשים לגרום לזה לקרות."}, "shay": {"text": "חזרתי ממשמרת ב-3 בלילה ושאלתי. לא ידעתי מה אני מצפה שיגיד. הוא אמר \"לכלום\". קמנו בבוקר ועזבנו."}}'::jsonb
from timeline_items where slug = 'tlv';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "גבולות 5, פלורנטין. אין תפריט. אין מחיר. אתם מחליטים. שלושה שולחנות, ארוחה אחת, כל ערב."}, "shay": {"text": "הלילה הראשון — שישה אנשים ישבו ואכלו מה שהכנתי. שילמו מה שהחליטו. לא היה כלום חוץ מהרגע הזה."}}'::jsonb
from timeline_items where slug = 'joz-open';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "חזרנו לג׳וז אחרי שלושה שבועות של שקט. לא ידענו אם יהיה למי לחזור. פתחנו משלוחים — ג׳וז עד הבית."}, "shay": {"text": "שלושה שבועות שתיקה. ואז קמנו. כי הבית לא נסגר — הוא משתנה. פתחנו משלוחים וזה היה אחרת לגמרי, וזה היה בסדר."}}'::jsonb
from timeline_items where slug = 'corona';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "תוכן בקרוב."}, "shay": {"text": "תוכן בקרוב."}}'::jsonb
from timeline_items where slug = 'placeholder-3';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "שלוש מילים שינו הכל. עברנו לתנופה 7. הג׳וז חזק יותר עכשיו — בגלל שנאלצנו לבחור אותו מחדש."}, "shay": {"text": "חשבנו שזהו. ואז הבנו שאין לנו ברירה אלא לרצות את זה יותר. עברנו לתנופה 7 ופתחנו מחדש, קצת אחרים."}}'::jsonb
from timeline_items where slug = 'pinum';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "7.10. כל מה שבנינו עמד בסכנה. חזרנו בכל זאת. כי אין ברירה אחרת — כי הג׳וז הוא הסיבה להישאר."}, "shay": {"text": "עצרנו. השתקנו. ואז פתחנו. כי הבית לא מתנצל על כך שהוא בית. כי ראו אותם — ואנחנו רוצים להמשיך לראות אנשים."}}'::jsonb
from timeline_items where slug = 'milchama';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "לשמור על הבית פתוח. לחזור לעבוד ביחד. לבנות משהו שיכול לראות עוד אנשים. הכביש חוזר."}, "shay": {"text": "חזרנו לעבוד יחד — אחרי שנים. האתר הזה הוא הדבר הראשון שבנינו ביחד מחדש. הכביש חוזר."}}'::jsonb
from timeline_items where slug = 'now';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "שלושה שבועות סגר. הג׳וז שקט לגמרי. ניסינו להבין מה עושים."}, "shay": {"text": "הבית השתתק. לא ידעתי אם לבכות על זה או לשמוח שיש רגע נשימה."}}'::jsonb
from timeline_items where slug = 'corona-lockdown';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "פתחנו משלוחים. אנשים קיבלו את האוכל בבית. זה לא היה אותו דבר — וזה עבד בצורה מדהימה."}, "shay": {"text": "אנשים כתבו לנו: \"הארוחה שלכם הייתה הדבר הכי נורמלי השבוע שלי.\" זה היה הכל."}}'::jsonb
from timeline_items where slug = 'joz-delivery';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "שלושה שבועות עצרנו. חזרנו בחושך, לאט, ללא הכרזות. רק פתחנו."}, "shay": {"text": "לא ידענו אם לחזור. ואז הבנו שהשאלה לא נכונה — כי אין \"לא לחזור\" בלי לאבד את עצמנו."}}'::jsonb
from timeline_items where slug = 'milchama-return';

insert into timeline_item_blocks (item_id, block_type, sort_order, content)
select id, 'text', 0,
  '{"naor": {"text": "ביום הראשון מישהו שאל \"מה אפשר להזמין?\" אמרתי: \"מה שאתה רוצה לשלם.\" הוא עמד שם חמש דקות."}, "shay": {"text": "תפריט הוא חוזה. אמרנו: אין חוזה. יש ארוחה, יש שולחן, יש שיחה. אתם מחליטים כמה שווה לכם."}}'::jsonb
from timeline_items where slug = 'joz-no-menu';
