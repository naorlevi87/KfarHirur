// Textarea with a custom large drag handle for manual resize.
// The native browser resize handle is ~10px and impossible to grab on mobile —
// this wraps the textarea and adds a 44px-tall touch-friendly grip at the bottom.

import { useRef, useState } from 'react';
import './AutoGrowTextarea.css';

export function AutoGrowTextarea({ value, onChange, className, minRows = 3, ...rest }) {
  const taRef = useRef(null);
  const [height, setHeight] = useState(null);
  const dragRef = useRef(null);

  function onPointerDown(e) {
    e.preventDefault();
    const ta = taRef.current;
    if (!ta) return;
    dragRef.current = {
      startY: e.clientY,
      startH: ta.getBoundingClientRect().height,
      pointerId: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const next = Math.max(60, d.startH + (e.clientY - d.startY));
    setHeight(next);
  }

  function onPointerUp(e) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* capture already released */ }
  }

  return (
    <div className="agt">
      <textarea
        ref={taRef}
        className={className}
        value={value ?? ''}
        rows={minRows}
        onChange={onChange}
        style={height != null ? { height: height + 'px' } : undefined}
        {...rest}
      />
      <div
        className="agt__grip"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="שנה גודל"
        role="separator"
      >
        <span className="agt__grip-line" />
        <span className="agt__grip-line" />
      </div>
    </div>
  );
}
