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
