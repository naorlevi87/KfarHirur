# Tip Calculator — `/tipCalc`

**Date:** 2026-09-15
**Status:** Approved

## Purpose

A standalone, mobile-first utility page for waiters. Customers sometimes state a total amount they want to pay and a tip percentage to back out of it. Waiters need a quick way to split that total into the bill portion and the tip portion, rounded to whole shekels.

## Route & Access

- New route: `/tipCalc`, registered alongside existing routes in the app's router.
- No authentication — open to anyone with the link.
- Rendered as a standalone page: does **not** go through `MainLayout` (no `SiteHeader`/`SiteFooter`/`HamburgerMenu`), and does not read/apply the Naor/Shay consciousness mode. It's a staff utility, not a branded public page.
- Lives in `src/pages/` per existing folder conventions, but opts out of the shared layout wrapper.

## Calculation

Inputs:
- **Total** (₪) — whole numbers only.
- **Tip %** — whole number, 0–100.

Formula:
```
bill = Math.round(total / (1 + percent / 100))
tip  = total - bill
```

Subtracting from `total` (rather than independently rounding the tip) guarantees `bill + tip === total` exactly — no rounding drift.

Example: total = 100, percent = 15 → bill = Math.round(100 / 1.15) = Math.round(86.96) = 87 → tip = 100 − 87 = 13.

## Input Validation

- Total: only whole, non-negative numbers accepted. Reject decimals, negatives, non-numeric input (block at input level via `inputmode="numeric"` + pattern, and/or strip non-digit characters on change).
- Percent: whole numbers 0–100 only, same validation approach.
- No submit button — result recalculates live as soon as both fields hold valid values. If either field is empty/invalid, show no result (not a zero or error state).

## UI

- Big, touch-friendly numeric inputs, `inputmode="numeric"` for mobile keyboards.
- Result (bill / tip) displayed large and immediately below the inputs.
- Simple, clean layout — own minimal styling, not themed with Naor/Shay CSS tokens (per user decision: standalone tool, not a branded page).
- Still meets IS 5568 / WCAG 2.1 AA baseline regardless of branding choice: 4.5:1 contrast on text, visible focus indicators, keyboard-navigable inputs, meaningful labels (no bare placeholders as the only label).

## Data & Privacy

- Pure client-side calculation. Nothing is persisted, sent to a server, or logged. No personal data involved — no privacy-consent concerns under Israeli Privacy Protection Law.

## Out of Scope

- No history of past calculations.
- No multi-currency support.
- No integration with the rest of the site's content/i18n layer (fixed Hebrew UI is fine given the audience is internal staff) — confirm this assumption is acceptable; if English support is ever needed here, it's a separate follow-up.
