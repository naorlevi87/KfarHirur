# Keep It Going — Fundraising Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the `/keep-it-going` fundraising page with a full story, two CTA buttons, animated progress bar, video placeholder, long emotional text, financial transparency placeholder, WhatsApp share, and page footer link.

**Architecture:** Full rewrite of the existing `KeepItGoingPage.jsx`, `KeepItGoingPage.css`, and both content files. Two new page-local motion components (`ProgressBar`, `DonateButton`) live in the page folder. Resolver is updated to expose a new semantic payload. No new global state, no new folders outside the existing pattern.

**Tech Stack:** React 19, Vite, Tailwind v4, Motion v12 (import from `"motion/react"`), Alef font (already loaded), CSS custom properties from `globals.css`.

> **No test suite** is configured in this project — skip all test steps.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/content/site/he/keepItGoing.content.js` | All Hebrew copy, naor/shay structure |
| Modify | `src/content/site/en/keepItGoing.content.js` | All English copy, naor/shay structure |
| Modify | `src/pages/keepItGoing/resolveKeepItGoingPageData.js` | New payload shape for redesigned page |
| Create | `src/pages/keepItGoing/ProgressBar.jsx` | Animated progress bar, isolated motion component |
| Create | `src/pages/keepItGoing/DonateButton.jsx` | Primary CTA with magnetic hover + spring press |
| Modify | `src/pages/keepItGoing/KeepItGoingPage.jsx` | Page structure + composition only |
| Modify | `src/styles/app/KeepItGoingPage.css` | All page styles, token-only colors |

---

## Task 1: Update Hebrew content file

**Files:**
- Modify: `src/content/site/he/keepItGoing.content.js`

The resolver reads `root.shared`, `root.naor`, `root.shay`. All new keys must live in this structure. Mode-specific keys go inside `naor` / `shay`. Keys that are identical across modes still go in both — no cross-mode fallback in components.

- [ ] **Step 1: Replace the file content**

```js
// src/content/site/he/keepItGoing.content.js
// Hebrew fundraising page copy. All keys duplicated in naor + shay even if identical today —
// lets future copy variation happen in content only, zero code change.

export const keepItGoingContent = {
  shared: {
    donateUrl: 'https://pay.grow.link/668e556e129d64d2d124e380300a1133-MzIyODgxNw',
    visitUrl: '#', // placeholder — TBD: reservation / address link
    progress: {
      raisedAmount: 0,        // ← update this number manually when raising
      goalA: 180000,
      goalB: 340000,
      goalALabel: 'המשך פעילות ותשלום מיסים',
      goalBLabel: 'תחילת צמצום חובות לספקים',
      raisedLabel: 'גויסו עד כה',
      outOfLabel: 'מתוך',
      currencySymbol: '₪',
    },
    video: {
      placeholder: 'ראיון עם שי ונאור — יעלה בקרוב',
    },
    transparency: {
      heading: 'שקיפות כלכלית',
      placeholder: 'הנתונים יתווספו בקרוב.',
    },
    share: {
      heading: 'תעבירו הלאה',
      whatsappLabel: 'שתפו בוואטסאפ',
      copyLabel: 'העתיקו לינק',
      whatsappMessage: 'כפר הירעור והג\'וז ולוז צריכים אתכם. תרמו או פשוט תבואו: ',
    },
    footer: {
      backLabel: 'חזרה לאתר',
    },
  },

  naor: {
    hero: {
      heading: '[לא] גיוס המונים',
      body: 'התחלנו ב-2015 עם דלי וכפפות בחוף עתלית. שש שנים של קורונה, מלחמות, ועוד מלחמות. כל פעם שנפלנו קמנו. אבל זה מצטבר.\n\nג׳וז ולוז פתוחה כי אנשים אמינו בה. שילמו מה שבא להם. אנחנו עושים את אותו הדבר עכשיו — מבקשים שתתנו מה שיכולים.',
    },
    cta: {
      donateLabel: 'תרמו עכשיו',
      donateAriaLabel: 'תרומה לג׳וז ולוז',
      visitLabel: 'תבואו אלינו',
      visitAriaLabel: 'הגיעו לג׳וז ולוז',
    },
    longText: {
      paragraphs: [
        'ג׳וז ולוז היא לא מסעדה רגילה. היא מקום שאמר מהיום הראשון — אתם תחליטו כמה שווה לכם. שש שנים אחר כך, זה עדיין עובד. כי אנשים הגיעו, אכלו, הרגישו משהו, ושילמו בהתאם.',
        'הגענו לנקודה שבה ספקים על הקצה, פנסיות לא שולמו, מיסים באיחור. כל פעם שעמדנו לקום שוב — הגיעה עוד מלחמה.',
        'אנחנו לא מבקשים צדקה. אנחנו מרחיבים את אותו הסכם שהיה מהתחלה: תנו מה שבא לכם. אפשר לתרום, אפשר לבוא לאכול, אפשר להעביר הלאה.',
      ],
    },
  },

  shay: {
    hero: {
      heading: 'עלינו',
      body: 'התחלנו ב-2015 עם דלי וכפפות בחוף עתלית. שש שנים של קורונה, מלחמות, ועוד מלחמות. כל פעם שנפלנו קמנו. אבל זה מצטבר.\n\nג׳וז ולוז פתוחה כי אנשים אמינו בה. שילמו מה שבא להם. אנחנו עושים את אותו הדבר עכשיו — מבקשים שתתנו מה שיכולים.',
    },
    cta: {
      donateLabel: 'תרמו עכשיו',
      donateAriaLabel: 'תרומה לג׳וז ולוז',
      visitLabel: 'תבואו אלינו',
      visitAriaLabel: 'הגיעו לג׳וז ולוז',
    },
    longText: {
      paragraphs: [
        'ג׳וז ולוז היא לא מסעדה רגילה. היא מקום שאמר מהיום הראשון — אתם תחליטו כמה שווה לכם. שש שנים אחר כך, זה עדיין עובד. כי אנשים הגיעו, אכלו, הרגישו משהו, ושילמו בהתאם.',
        'הגענו לנקודה שבה ספקים על הקצה, פנסיות לא שולמו, מיסים באיחור. כל פעם שעמדנו לקום שוב — הגיעה עוד מלחמה.',
        'אנחנו לא מבקשים צדקה. אנחנו מרחיבים את אותו הסכם שהיה מהתחלה: תנו מה שבא לכם. אפשר לתרום, אפשר לבוא לאכול, אפשר להעביר הלאה.',
      ],
    },
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/content/site/he/keepItGoing.content.js
git commit -m "content(he): rewrite keepItGoing content — full naor/shay structure"
```

---

## Task 2: Update English content file

**Files:**
- Modify: `src/content/site/en/keepItGoing.content.js`

- [ ] **Step 1: Replace the file content**

```js
// src/content/site/en/keepItGoing.content.js
// English fundraising page copy. Mirrors Hebrew structure exactly.

export const keepItGoingContent = {
  shared: {
    donateUrl: 'https://pay.grow.link/668e556e129d64d2d124e380300a1133-MzIyODgxNw',
    visitUrl: '#', // placeholder — TBD: reservation / address link
    progress: {
      raisedAmount: 0,
      goalA: 180000,
      goalB: 340000,
      goalALabel: 'Continue operating and pay taxes',
      goalBLabel: 'Start reducing supplier debt',
      raisedLabel: 'Raised so far',
      outOfLabel: 'out of',
      currencySymbol: '₪',
    },
    video: {
      placeholder: 'Interview with Shay and Naor — coming soon',
    },
    transparency: {
      heading: 'Financial transparency',
      placeholder: 'Data coming soon.',
    },
    share: {
      heading: 'Pass it on',
      whatsappLabel: 'Share on WhatsApp',
      copyLabel: 'Copy link',
      whatsappMessage: "Kfar Hirur and Joz ve Loz need you. Donate or just come by: ",
    },
    footer: {
      backLabel: 'Back to site',
    },
  },

  naor: {
    hero: {
      heading: '[Not] a crowdfunding campaign',
      body: 'We started in 2015 with a bucket and gloves on a beach in Atlit. Six years of COVID, wars, and more wars. Every time we fell, we got back up. But it accumulates.\n\nJoz ve Loz stayed open because people believed in it. Paid what felt right. We\'re asking the same thing now — give what you can.',
    },
    cta: {
      donateLabel: 'Donate now',
      donateAriaLabel: 'Donate to Joz ve Loz',
      visitLabel: 'Come visit us',
      visitAriaLabel: 'Visit Joz ve Loz',
    },
    longText: {
      paragraphs: [
        "Joz ve Loz isn't a regular restaurant. From day one it said: you decide what it's worth to you. Six years later, it still works. Because people came, ate, felt something, and paid accordingly.",
        "We've reached a point where suppliers are at the edge, pensions unpaid, taxes delayed. Every time we were about to get back up — another war.",
        "We're not asking for charity. We're extending the same agreement that existed from the beginning: give what you can. Donate, come eat, or pass this along.",
      ],
    },
  },

  shay: {
    hero: {
      heading: 'About us',
      body: 'We started in 2015 with a bucket and gloves on a beach in Atlit. Six years of COVID, wars, and more wars. Every time we fell, we got back up. But it accumulates.\n\nJoz ve Loz stayed open because people believed in it. Paid what felt right. We\'re asking the same thing now — give what you can.',
    },
    cta: {
      donateLabel: 'Donate now',
      donateAriaLabel: 'Donate to Joz ve Loz',
      visitLabel: 'Come visit us',
      visitAriaLabel: 'Visit Joz ve Loz',
    },
    longText: {
      paragraphs: [
        "Joz ve Loz isn't a regular restaurant. From day one it said: you decide what it's worth to you. Six years later, it still works. Because people came, ate, felt something, and paid accordingly.",
        "We've reached a point where suppliers are at the edge, pensions unpaid, taxes delayed. Every time we were about to get back up — another war.",
        "We're not asking for charity. We're extending the same agreement that existed from the beginning: give what you can. Donate, come eat, or pass this along.",
      ],
    },
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/content/site/en/keepItGoing.content.js
git commit -m "content(en): rewrite keepItGoing content — full naor/shay structure"
```

---

## Task 3: Update resolver

**Files:**
- Modify: `src/pages/keepItGoing/resolveKeepItGoingPageData.js`

The resolver assembles a clean semantic payload from `shared` + the active mode branch. Components receive a flat, named payload — they never see the raw content structure.

- [ ] **Step 1: Replace the file content**

```js
// src/pages/keepItGoing/resolveKeepItGoingPageData.js
// Page-local resolver: merges shared + mode branch into a semantic payload.
// Exports both a pure function (for tests) and a hook (for the page component).

import { useAppContext } from '../../app/appState/useAppContext.js';
import { keepItGoingContent as keepItGoingHe } from '../../content/site/he/keepItGoing.content.js';
import { keepItGoingContent as keepItGoingEn } from '../../content/site/en/keepItGoing.content.js';

const byLocale = {
  he: keepItGoingHe,
  en: keepItGoingEn,
};

function resolveRoot(locale) {
  return byLocale[locale] ?? byLocale.he;
}

function resolveMode(root, mode) {
  const key = mode === 'shay' ? 'shay' : 'naor';
  return root[key] ?? root.naor ?? {};
}

export function resolveKeepItGoingPageData(locale, mode) {
  const root = resolveRoot(locale);
  const shared = root.shared ?? {};
  const branch = resolveMode(root, mode);

  return {
    hero: branch.hero ?? {},
    cta: { ...branch.cta, donateUrl: shared.donateUrl, visitUrl: shared.visitUrl },
    progress: shared.progress ?? {},
    video: shared.video ?? {},
    longText: branch.longText ?? {},
    transparency: shared.transparency ?? {},
    share: shared.share ?? {},
    footer: shared.footer ?? {},
  };
}

export function useKeepItGoingPageData() {
  const { locale, mode } = useAppContext();
  return resolveKeepItGoingPageData(locale, mode);
}
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/keepItGoing/resolveKeepItGoingPageData.js
git commit -m "refactor(resolver): rebuild keepItGoing resolver — new semantic payload shape"
```

---

## Task 4: Create ProgressBar component

**Files:**
- Create: `src/pages/keepItGoing/ProgressBar.jsx`

Isolated motion component. Animates from 0 to the real percentage when it enters the viewport. Uses `useInView` + `animate` from Motion v12. No `useState` for the animation value.

- [ ] **Step 1: Create the file**

```jsx
// src/pages/keepItGoing/ProgressBar.jsx
// Animated fundraising progress bar. Spring-fills on scroll-into-view.
// Isolated motion component — uses useMotionValue + animate, no useState for animation.

import { useRef, useEffect } from 'react';
import { useMotionValue, useTransform, motion, animate, useInView } from 'motion/react';

export function ProgressBar({ progress }) {
  const {
    raisedAmount,
    goalA,
    goalB,
    goalALabel,
    goalBLabel,
    raisedLabel,
    outOfLabel,
    currencySymbol,
  } = progress;

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const pctA = Math.min(raisedAmount / goalA, 1);
  const motionPct = useMotionValue(0);
  const barWidth = useTransform(motionPct, (v) => `${(v * 100).toFixed(2)}%`);

  useEffect(() => {
    if (!isInView) return;
    animate(motionPct, pctA, {
      type: 'spring',
      stiffness: 60,
      damping: 18,
      restDelta: 0.001,
    });
  }, [isInView, pctA, motionPct]);

  const formattedRaised = raisedAmount.toLocaleString('he-IL');
  const formattedGoalA = goalA.toLocaleString('he-IL');
  const formattedGoalB = goalB.toLocaleString('he-IL');

  return (
    <div ref={ref} className="kig-progress" aria-label={`${raisedLabel}: ${formattedRaised} ${currencySymbol} ${outOfLabel} ${formattedGoalA} ${currencySymbol}`}>
      <div className="kig-progress-track" role="progressbar" aria-valuenow={raisedAmount} aria-valuemin={0} aria-valuemax={goalA}>
        <motion.div className="kig-progress-fill" style={{ width: barWidth }} />
        {/* goalB marker at proportional position within goalA scale */}
        <div
          className="kig-progress-marker"
          style={{ right: `${(1 - Math.min(goalB / goalA, 1)) * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="kig-progress-labels">
        <span className="kig-progress-raised">
          {raisedLabel}: <strong>{currencySymbol}{formattedRaised}</strong>
        </span>
        <span className="kig-progress-goal">
          {outOfLabel} {currencySymbol}{formattedGoalA}
        </span>
      </div>
      <div className="kig-progress-milestones">
        <div className="kig-progress-milestone">
          <span className="kig-progress-milestone-amount">{currencySymbol}{formattedGoalA}</span>
          <span className="kig-progress-milestone-label">{goalALabel}</span>
        </div>
        <div className="kig-progress-milestone kig-progress-milestone--b">
          <span className="kig-progress-milestone-amount">{currencySymbol}{formattedGoalB}</span>
          <span className="kig-progress-milestone-label">{goalBLabel}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/keepItGoing/ProgressBar.jsx
git commit -m "feat(keepItGoing): add animated ProgressBar component"
```

---

## Task 5: Create DonateButton component

**Files:**
- Create: `src/pages/keepItGoing/DonateButton.jsx`

Primary CTA button. Uses `useMotionValue` + `useTransform` for a subtle magnetic hover effect. Scale spring on press. Renders as `<a>` (external link). No `useState` for motion.

- [ ] **Step 1: Create the file**

```jsx
// src/pages/keepItGoing/DonateButton.jsx
// Primary CTA — animated anchor to grow.link. Magnetic hover + spring press.
// Motion via useMotionValue/useTransform only — no useState for animation.

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';

export function DonateButton({ href, label, ariaLabel }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { stiffness: 200, damping: 20 };
  const moveX = useSpring(useTransform(x, [-50, 50], [-6, 6]), springConfig);
  const moveY = useSpring(useTransform(y, [-30, 30], [-4, 4]), springConfig);

  function handleMouseMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="kig-donateBtn"
      aria-label={ariaLabel}
      style={{ x: moveX, y: moveY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {label}
    </motion.a>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/keepItGoing/DonateButton.jsx
git commit -m "feat(keepItGoing): add magnetic DonateButton component"
```

---

## Task 6: Rewrite KeepItGoingPage.jsx

**Files:**
- Modify: `src/pages/keepItGoing/KeepItGoingPage.jsx`

Page owns structure and composition only. All copy comes from the resolver. All motion comes from leaf components or `motion.section` wrappers with stagger variants.

- [ ] **Step 1: Replace the file content**

```jsx
// src/pages/keepItGoing/KeepItGoingPage.jsx
// Fundraising page — structure + composition only.
// All copy from useKeepItGoingPageData. Motion via staggered section entries.

import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import '../../styles/app/KeepItGoingPage.css';
import { getText } from '../../utils/content/getText.js';
import { useKeepItGoingPageData } from './resolveKeepItGoingPageData.js';
import { ProgressBar } from './ProgressBar.jsx';
import { DonateButton } from './DonateButton.jsx';

// Stagger parent — reveals children sequentially as page loads
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const blockVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 18 } },
};

export function KeepItGoingPage() {
  const { hero, cta, progress, video, longText, transparency, share, footer } =
    useKeepItGoingPageData();

  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    getText(share, 'whatsappMessage') + window.location.href
  )}`;

  const heroParagraphs = (getText(hero, 'body') || '').split('\n\n').filter(Boolean);
  const longParagraphs = longText.paragraphs ?? [];

  return (
    <div className="kig-page">
      <motion.div
        className="kig-inner"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Block 1 — Story header */}
        <motion.section
          className="kig-hero"
          variants={blockVariants}
          aria-labelledby="kig-heading"
        >
          <h1 id="kig-heading" className="kig-heading">
            {getText(hero, 'heading')}
          </h1>
          <div className="kig-heroCopy">
            {heroParagraphs.map((p, i) => (
              <p key={i} className="kig-heroP">{p}</p>
            ))}
          </div>
        </motion.section>

        {/* Block 2 — CTAs + progress */}
        <motion.section className="kig-cta" variants={blockVariants} aria-label="תמיכה">
          <DonateButton
            href={cta.donateUrl}
            label={getText(cta, 'donateLabel')}
            ariaLabel={getText(cta, 'donateAriaLabel')}
          />
          <a
            href={cta.visitUrl}
            className="kig-visitBtn"
            aria-label={getText(cta, 'visitAriaLabel')}
          >
            {getText(cta, 'visitLabel')}
          </a>
          <ProgressBar progress={progress} />
        </motion.section>

        {/* Block 3 — Video placeholder */}
        <motion.section
          className="kig-video"
          variants={blockVariants}
          aria-label={getText(video, 'placeholder')}
        >
          <div className="kig-videoCard" role="img" aria-label={getText(video, 'placeholder')}>
            <p className="kig-videoPlaceholder">{getText(video, 'placeholder')}</p>
          </div>
        </motion.section>

        {/* Block 4 — Long emotional text */}
        <motion.section className="kig-longText" variants={blockVariants}>
          {longParagraphs.map((p, i) => (
            <p key={i} className="kig-longP">{p}</p>
          ))}
        </motion.section>

        {/* Block 5 — Financial transparency placeholder */}
        <motion.section
          className="kig-transparency"
          variants={blockVariants}
          aria-labelledby="kig-transparencyHeading"
        >
          <h2 id="kig-transparencyHeading" className="kig-transparencyHeading">
            {getText(transparency, 'heading')}
          </h2>
          <p className="kig-transparencyPlaceholder">
            {getText(transparency, 'placeholder')}
          </p>
        </motion.section>

        {/* Block 6 — Share */}
        <motion.section
          className="kig-share"
          variants={blockVariants}
          aria-labelledby="kig-shareHeading"
        >
          <h2 id="kig-shareHeading" className="kig-shareHeading">
            {getText(share, 'heading')}
          </h2>
          <div className="kig-shareActions">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kig-whatsappBtn"
              aria-label={getText(share, 'whatsappLabel')}
            >
              {getText(share, 'whatsappLabel')}
            </a>
            <button
              type="button"
              className="kig-copyBtn"
              onClick={handleCopyLink}
              aria-live="polite"
            >
              {copied ? '✓ הועתק' : getText(share, 'copyLabel')}
            </button>
          </div>
        </motion.section>

        {/* Block 7 — Footer link */}
        <motion.div className="kig-footer" variants={blockVariants}>
          <Link to="/" className="kig-backLink">
            {getText(footer, 'backLabel')}
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/keepItGoing/KeepItGoingPage.jsx
git commit -m "feat(keepItGoing): rewrite page structure — 7 blocks, motion stagger"
```

---

## Task 7: Rewrite KeepItGoingPage.css

**Files:**
- Modify: `src/styles/app/KeepItGoingPage.css`

Full CSS rewrite. All colors via `var(--...)`. Mobile-first. No hardcoded colors. Desktop breakpoint handled via `@media (min-width: 48rem)` for minor tweaks only — full desktop pass is a separate spec.

- [ ] **Step 1: Replace the file content**

```css
/* src/styles/app/KeepItGoingPage.css */
/* Fundraising page styles. All colors from globals.css tokens. Mobile-first baseline. */

/* ── Page shell ─────────────────────────────────────────── */

.kig-page {
  box-sizing: border-box;
  flex: 1;
  width: 100%;
  padding: 0 0 clamp(2.5rem, 10vw, 4rem);
}

.kig-inner {
  box-sizing: border-box;
  width: 100%;
  max-width: 40rem;
  margin: 0 auto;
  padding: 0 clamp(1rem, 5vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: clamp(1.75rem, 6vw, 2.5rem);
}

/* ── Block 1: Hero ──────────────────────────────────────── */

.kig-hero {
  padding-top: clamp(1.25rem, 5vw, 2rem);
}

.kig-heading {
  margin: 0 0 1rem;
  font-size: clamp(1.75rem, 7vw, 2.6rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: var(--text-heading);
  text-align: start;
}

.kig-heroP {
  margin: 0 0 0.85rem;
  font-size: clamp(0.97rem, 3.5vw, 1.05rem);
  line-height: 1.7;
  color: var(--text-body);
}

.kig-heroP:last-child {
  margin-bottom: 0;
}

/* ── Block 2: CTA + progress ────────────────────────────── */

.kig-cta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Primary donate button — styled via component class */
.kig-donateBtn {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 1rem 1.5rem;
  font: inherit;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  color: var(--accent-text);
  cursor: pointer;
  border: none;
  border-radius: 999px;
  background: linear-gradient(
    160deg,
    var(--accent-soft) 0%,
    var(--accent) 50%,
    var(--accent-strong) 100%
  );
  box-shadow:
    0 6px 28px var(--accent-shadow),
    inset 0 2px 0 var(--accent-highlight);
}

.kig-donateBtn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

/* Secondary visit button */
.kig-visitBtn {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 0.9rem 1.5rem;
  font: inherit;
  font-size: 0.97rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
  text-decoration: none;
  color: var(--text-primary);
  cursor: pointer;
  border: 1.5px solid var(--surface-border);
  border-radius: 999px;
  background: var(--surface);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.kig-visitBtn:hover {
  border-color: var(--accent);
  background: var(--page-bg-secondary);
}

.kig-visitBtn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

/* ── ProgressBar ────────────────────────────────────────── */

.kig-progress {
  padding-top: 0.25rem;
}

.kig-progress-track {
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: var(--surface-inset);
  overflow: hidden;
}

.kig-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-soft), var(--accent));
  will-change: width;
}

.kig-progress-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--surface-border);
  border-radius: 999px;
}

.kig-progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.45rem;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--text-meta);
}

.kig-progress-raised strong {
  color: var(--text-primary);
}

.kig-progress-milestones {
  display: flex;
  justify-content: space-between;
  margin-top: 0.65rem;
  gap: 0.5rem;
}

.kig-progress-milestone {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.kig-progress-milestone--b {
  text-align: end;
}

.kig-progress-milestone-amount {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-meta-label);
}

.kig-progress-milestone-label {
  font-size: 0.7rem;
  line-height: 1.35;
  color: var(--text-muted);
}

/* ── Block 3: Video ─────────────────────────────────────── */

.kig-videoCard {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 11rem;
  border-radius: 1.15rem;
  background: var(--surface);
  border: 1px dashed var(--surface-border);
  box-shadow: inset 0 0 0 1px var(--surface-inset);
  padding: 1.25rem;
}

.kig-videoPlaceholder {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  text-align: center;
  color: var(--text-muted);
}

/* ── Block 4: Long text ─────────────────────────────────── */

.kig-longText {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.kig-longP {
  margin: 0;
  font-size: clamp(0.97rem, 3.5vw, 1.05rem);
  line-height: 1.75;
  color: var(--text-body);
  max-width: 65ch;
}

/* ── Block 5: Transparency ──────────────────────────────── */

.kig-transparency {
  padding: 1.25rem;
  border-radius: 1rem;
  background: var(--surface);
  border: 1px solid var(--surface-border);
}

.kig-transparencyHeading {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-section);
}

.kig-transparencyPlaceholder {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-muted);
}

/* ── Block 6: Share ─────────────────────────────────────── */

.kig-shareHeading {
  margin: 0 0 0.85rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-section);
}

.kig-shareActions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.kig-whatsappBtn {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 0.85rem 1.25rem;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  color: var(--accent-text);
  border-radius: 999px;
  background: #25d366;
  transition: opacity 0.15s ease;
}

.kig-whatsappBtn:hover {
  opacity: 0.9;
}

.kig-whatsappBtn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

.kig-copyBtn {
  appearance: none;
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 0.75rem 1.25rem;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  text-align: center;
  color: var(--text-secondary);
  cursor: pointer;
  border: 1px dashed var(--surface-border);
  border-radius: 999px;
  background: transparent;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.kig-copyBtn:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}

.kig-copyBtn:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

/* ── Block 7: Footer link ───────────────────────────────── */

.kig-footer {
  text-align: center;
  padding-top: 0.5rem;
}

.kig-backLink {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

.kig-backLink:hover {
  color: var(--text-primary);
}

.kig-backLink:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}

/* ── Desktop tweaks (mobile-first — desktop is a separate pass) ── */

@media (min-width: 48rem) {
  .kig-inner {
    max-width: 42rem;
  }

  .kig-hero {
    padding-top: 2rem;
  }

  .kig-videoCard {
    min-height: 13rem;
  }
}
```

- [ ] **Step 2: Verify build + lint**

```bash
npm run build && npm run lint
```

Expected: no errors, no warnings.

- [ ] **Step 3: Commit**

```bash
git add src/styles/app/KeepItGoingPage.css
git commit -m "style(keepItGoing): full CSS rewrite — token-only colors, mobile-first"
```

---

## Task 8: Final integration check

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Manually verify on mobile viewport** (375px width in DevTools)

Check:
- [ ] Hero heading is large, right-aligned
- [ ] "תרמו עכשיו" button is full-width, visible, links to grow.link in new tab
- [ ] "תבואו אלינו" button renders (href is `#` placeholder — OK)
- [ ] Progress bar renders (₪0 of ₪180,000 — two milestones visible)
- [ ] Progress bar animates on scroll-into-view
- [ ] Video card renders as a styled placeholder
- [ ] Long text paragraphs render
- [ ] Transparency section renders with placeholder
- [ ] WhatsApp button renders and produces correct URL
- [ ] Copy link button copies URL and shows "✓ הועתק" for 2 seconds
- [ ] "חזרה לאתר" links to `/`
- [ ] Both consciousness modes (naor / shay) show correct copy
- [ ] No hardcoded colors (inspect element — all `var(--)`)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(keepItGoing): page redesign complete — story, CTA, progress, share"
```

---

## Updating the raised amount

When the fundraising number changes, edit one line in `src/content/site/he/keepItGoing.content.js`:

```js
raisedAmount: 43000,  // ← update this
```

Then do the same in `src/content/site/en/keepItGoing.content.js`. Commit and push.
