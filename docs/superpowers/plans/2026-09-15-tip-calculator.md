# Tip Calculator (`/tipCalc`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone, public, mobile-first `/tipCalc` route where waiters enter a total amount and a tip percentage, and instantly see the bill portion and tip portion, rounded to whole shekels and guaranteed to sum exactly to the total.

**Architecture:** One new page component (`TipCalcPage.jsx`) + its own CSS file, registered as a top-level route in `App.jsx` — outside `MainLayout`, following the same "no shell" pattern already used for `commons/*`. No new state, no context changes, no data layer — pure local component state and a plain calculation function.

**Tech Stack:** React 19, React Router v6 (existing `Routes`/`Route` in `src/app/App.jsx`), plain CSS (own file, not `globals.css`, per design decision to keep this unbranded).

**Note on testing:** This repo has no test suite configured (see CLAUDE.md — "No test suite is configured"). Verification steps below use the dev server + manual/browser checks instead of automated tests.

---

### Task 1: Create the calculation helper

**Files:**
- Create: `src/pages/tipCalc/tipMath.js`

- [ ] **Step 1: Write the file**

```javascript
// src/pages/tipCalc/tipMath.js
// Splits a total amount into bill + tip given a tip percentage, rounded to whole shekels.
// tip = total - bill (not independently rounded) so bill + tip always equals total exactly.

export function splitBillAndTip(total, percent) {
  const bill = Math.round(total / (1 + percent / 100));
  const tip = total - bill;
  return { bill, tip };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/tipCalc/tipMath.js
git commit -m "feat(tipCalc): add bill/tip split calculation helper"
```

---

### Task 2: Build the TipCalcPage component

**Files:**
- Create: `src/pages/tipCalc/TipCalcPage.jsx`
- Create: `src/pages/tipCalc/TipCalcPage.css`

- [ ] **Step 1: Write the CSS file**

```css
/* src/pages/tipCalc/TipCalcPage.css */
/* Standalone, unbranded layout for the waiter tip-split tool — no site chrome, no consciousness-mode tokens. */

.tip-calc-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: #f7f7f5;
  color: #1a1a1a;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  direction: rtl;
}

.tip-calc-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  text-align: center;
}

.tip-calc-form {
  width: 100%;
  max-width: 22rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.tip-calc-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tip-calc-field label {
  font-size: 1rem;
  font-weight: 600;
}

.tip-calc-field input {
  font-size: 1.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid #ccc;
  border-radius: 0.75rem;
  text-align: center;
  background: #fff;
  color: #1a1a1a;
}

.tip-calc-field input:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
  border-color: #2563eb;
}

.tip-calc-error {
  color: #b91c1c;
  font-size: 0.95rem;
  text-align: center;
  min-height: 1.25rem;
}

.tip-calc-result {
  width: 100%;
  max-width: 22rem;
  display: flex;
  gap: 1rem;
}

.tip-calc-result-box {
  flex: 1;
  background: #fff;
  border: 2px solid #e5e5e0;
  border-radius: 0.75rem;
  padding: 1rem;
  text-align: center;
}

.tip-calc-result-label {
  font-size: 0.9rem;
  color: #555;
}

.tip-calc-result-value {
  font-size: 2rem;
  font-weight: 800;
  margin-top: 0.25rem;
}

@media (prefers-color-scheme: dark) {
  .tip-calc-page {
    background: #14141a;
    color: #f0f0f0;
  }

  .tip-calc-field input {
    background: #1f1f27;
    color: #f0f0f0;
    border-color: #3a3a45;
  }

  .tip-calc-result-box {
    background: #1f1f27;
    border-color: #3a3a45;
  }

  .tip-calc-result-label {
    color: #b0b0b8;
  }
}
```

- [ ] **Step 2: Write the page component**

```jsx
// src/pages/tipCalc/TipCalcPage.jsx
// Standalone waiter tool: splits a stated total into bill + tip at a given percentage.
// Public route, no site chrome, no auth — see docs/superpowers/specs/2026-09-15-tip-calculator-design.md

import { useState } from 'react';
import { splitBillAndTip } from './tipMath.js';
import './TipCalcPage.css';

function parseWholeNonNegative(raw) {
  if (raw === '') return null;
  if (!/^\d+$/.test(raw)) return undefined;
  return Number(raw);
}

export function TipCalcPage() {
  const [totalRaw, setTotalRaw] = useState('');
  const [percentRaw, setPercentRaw] = useState('');

  const total = parseWholeNonNegative(totalRaw);
  const percent = parseWholeNonNegative(percentRaw);

  const totalInvalid = total === undefined;
  const percentInvalid = percent === undefined || (percent !== null && percent > 100);

  const hasResult =
    total !== null && total !== undefined && total > 0 &&
    percent !== null && percent !== undefined && percent >= 0 && percent <= 100;

  const result = hasResult ? splitBillAndTip(total, percent) : null;

  return (
    <div className="tip-calc-page">
      <h1 className="tip-calc-title">מחשבון טיפ</h1>

      <div className="tip-calc-form">
        <div className="tip-calc-field">
          <label htmlFor="tip-calc-total">סכום כולל (₪)</label>
          <input
            id="tip-calc-total"
            inputMode="numeric"
            pattern="\d*"
            value={totalRaw}
            onChange={(e) => setTotalRaw(e.target.value)}
            placeholder="לדוגמה: 100"
          />
        </div>

        <div className="tip-calc-field">
          <label htmlFor="tip-calc-percent">אחוז טיפ</label>
          <input
            id="tip-calc-percent"
            inputMode="numeric"
            pattern="\d*"
            value={percentRaw}
            onChange={(e) => setPercentRaw(e.target.value)}
            placeholder="לדוגמה: 15"
          />
        </div>

        <p className="tip-calc-error">
          {totalInvalid && 'יש להזין סכום שלם וחיובי'}
          {!totalInvalid && percentInvalid && 'אחוז הטיפ חייב להיות מספר שלם בין 0 ל-100'}
        </p>
      </div>

      {result && (
        <div className="tip-calc-result">
          <div className="tip-calc-result-box">
            <div className="tip-calc-result-label">חשבון</div>
            <div className="tip-calc-result-value">{result.bill}₪</div>
          </div>
          <div className="tip-calc-result-box">
            <div className="tip-calc-result-label">טיפ</div>
            <div className="tip-calc-result-value">{result.tip}₪</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/tipCalc/TipCalcPage.jsx src/pages/tipCalc/TipCalcPage.css
git commit -m "feat(tipCalc): add TipCalcPage component"
```

---

### Task 3: Register the route and verify in the browser

**Files:**
- Modify: `src/app/App.jsx:27-28` (imports), `src/app/App.jsx:47-48` (route registration)

- [ ] **Step 1: Add the import**

In `src/app/App.jsx`, after line 27 (`import { CommonsModule } from '../commons/CommonsModule.jsx';`), add:

```jsx
import { TipCalcPage } from '../pages/tipCalc/TipCalcPage.jsx';
```

- [ ] **Step 2: Register the route outside MainLayout**

In `src/app/App.jsx`, inside the `<Routes>` block, add a new top-level route near the other unwrapped routes (after the `{/* Auth & static */}` block, i.e. after the `terms` route at line 48):

```jsx
        {/* Standalone staff tool — no chrome, no auth, no branding */}
        <Route path="tipCalc" element={<TipCalcPage />} />
```

So the block reads:

```jsx
        {/* Auth & static */}
        <Route path="login" element={<LoginPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />

        {/* Standalone staff tool — no chrome, no auth, no branding */}
        <Route path="tipCalc" element={<TipCalcPage />} />
```

- [ ] **Step 3: Start the dev server**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run dev`

Expected: Vite prints a local URL (e.g. `http://localhost:5173/`).

- [ ] **Step 4: Manually verify in the browser**

Navigate to `http://localhost:5173/tipCalc`. Confirm:
- Page renders with no site header/footer/hamburger menu.
- Entering total `100` and percent `15` shows bill `87₪` and tip `13₪`.
- Entering a decimal (e.g. `100.5`) in either field is rejected/ignored (input stays numeric-only) or shows the validation message.
- Entering percent `150` shows the "0–100" validation message and no result box.
- Clearing either field hides the result box (no zero/garbage shown).
- Tab through both inputs — focus ring is visible on each (IS 5568 keyboard/focus requirement).
- Resize to a narrow mobile width (e.g. 375px) — inputs and result boxes stay readable, no horizontal scroll.

- [ ] **Step 5: Stop the dev server, commit**

```bash
git add src/app/App.jsx
git commit -m "feat(tipCalc): register /tipCalc route"
```

---

### Task 4: Run lint and build

- [ ] **Step 1: Run lint**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run lint`

Expected: no errors. Fix any that appear (e.g. unused imports) and re-run before proceeding.

- [ ] **Step 2: Run build**

Run: `cd "d:/KfarHirurDrive/KfarHirurCom" && PATH="/c/Program Files/nodejs:$PATH" "/c/Program Files/nodejs/npm.cmd" run build`

Expected: build completes with no errors.

- [ ] **Step 3: Commit if lint/build required fixes**

If Steps 1–2 required code changes, stage and commit them:

```bash
git add -A
git commit -m "fix(tipCalc): address lint/build issues"
```

If no fixes were needed, skip this step — nothing to commit.

---

## Notes for the executor

- Do not commit until the user has reviewed the running page in the browser per the project's git-commit policy in CLAUDE.md ("Never commit without the user seeing the changes locally first" — for Task 3/4 commits specifically, pause and get explicit user confirmation after the manual browser check in Task 3 Step 4, before committing Task 3 and Task 4).
- The calculation helper in Task 1 has no automated test (repo has no test runner configured); its correctness is verified visually in Task 3 Step 4 via the browser against the 100/15%→87+13 example from the spec.
