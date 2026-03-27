// src/pages/keepItGoing/DonateButton.jsx
// Primary CTA — animated anchor to grow.link. Magnetic hover + spring press.
// Motion via useMotionValue/useTransform only — no useState for animation.

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react'; // eslint-disable-line no-unused-vars

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
