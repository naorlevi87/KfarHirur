// src/pages/tipCalc/tipMath.js
// Splits a total amount into bill + tip given a tip percentage, rounded to whole shekels.
// tip = total - bill (not independently rounded) so bill + tip always equals total exactly.

export function splitBillAndTip(total, percent) {
  const bill = Math.round(total / (1 + percent / 100));
  const tip = total - bill;
  return { bill, tip };
}
