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
