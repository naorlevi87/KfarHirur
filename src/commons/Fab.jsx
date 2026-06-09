// src/commons/Fab.jsx
// Floating create button: blue circle, bottom-left, above the tab bar. Rendered by the board/area
// screens for manager/admin. Spring tap feedback; navigates to the create form via onClick.

import { motion } from 'motion/react';
import { IconPlus } from './icons.jsx';

export function Fab({ onClick, label }) {
  return (
    <motion.button
      type="button"
      className="commons-fab"
      onClick={onClick}
      aria-label={label}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 22, delay: 0.1 }}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.06 }}
    >
      <IconPlus size={26} />
    </motion.button>
  );
}
