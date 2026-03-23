// src/app/ConsciousnessSwitcher.jsx
// Single persistent track + orbit: closed = compact shell + centered filled orbit; open = expanded + same orbit drags on rail.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import * as Motion from 'motion/react';
import { resolveSiteShellContent } from '../content/site/resolveSiteShellContent.js';
import { getText } from '../utils/content/getText.js';
import { useAppContext } from './appState/useAppContext.js';

const THRESHOLD_RATIO = 0.6;

function useFinePointerHover() {
  const [fine, setFine] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const run = () => setFine(mq.matches);
    run();
    mq.addEventListener('change', run);
    return () => mq.removeEventListener('change', run);
  }, []);
  return fine;
}

export function ConsciousnessSwitcher() {
  const { locale, mode, setMode } = useAppContext();
  const content = resolveSiteShellContent(locale).consciousness ?? {};

  const semanticLabel = getText(content, 'label');
  const activeShort = getText(
    content,
    mode === 'shay' ? 'shortShay' : 'shortNaor',
  );
  const activeFull = getText(
    content,
    mode === 'shay' ? 'optionShay' : 'optionNaor',
  );
  const inactiveFull = getText(
    content,
    mode === 'shay' ? 'optionNaor' : 'optionShay',
  );
  const inactiveMode = mode === 'shay' ? 'naor' : 'shay';

  const fineHover = useFinePointerHover();
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const bubbleRef = useRef(null);
  const maxDragRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [maxDrag, setMaxDrag] = useState(0);
  const dragMovedRef = useRef(false);
  const snapBackRef = useRef(false);

  const x = Motion.useMotionValue(0);

  const measure = useCallback(() => {
    const track = trackRef.current;
    const bubble = bubbleRef.current;
    if (!track || !bubble) return;
    const tw = track.getBoundingClientRect().width;
    const bw = bubble.getBoundingClientRect().width;
    const next = Math.max(0, tw - bw);
    maxDragRef.current = next;
    setMaxDrag(next);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (trackRef.current) ro.observe(trackRef.current);
    if (bubbleRef.current) ro.observe(bubbleRef.current);
    return () => ro.disconnect();
  }, [isOpen, measure, mode, locale, activeFull, inactiveFull]);

  useLayoutEffect(() => {
    if (isOpen) x.set(0);
  }, [isOpen, x]);

  const dragRange = isOpen ? maxDrag : 0;

  const close = useCallback(() => {
    setIsOpen(false);
    x.set(0);
    setIsAnimating(false);
  }, [x]);

  const commit = useCallback(() => {
    setMode(inactiveMode);
    x.set(0);
    setIsOpen(false);
    setIsAnimating(false);
  }, [inactiveMode, setMode, x]);

  const animateToLeftEdgeThenCommit = useCallback(() => {
    const target = -maxDragRef.current;
    if (target >= 0) {
      commit();
      return;
    }
    setIsAnimating(true);
    Motion.animate(x, target, {
      type: 'tween',
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1],
      onComplete: commit,
    });
  }, [commit, x]);

  const snapRightThenClose = useCallback(() => {
    setIsAnimating(true);
    snapBackRef.current = true;
    Motion.animate(x, 0, {
      type: 'spring',
      stiffness: 440,
      damping: 34,
      onComplete: () => {
        snapBackRef.current = false;
        close();
      },
    });
  }, [close, x]);

  const onDragEnd = useCallback(() => {
    setIsDragging(false);
    const cx = x.get();
    const md = maxDragRef.current;
    const lim = -THRESHOLD_RATIO * md;

    if (md <= 0) {
      close();
      return;
    }

    if (cx <= lim) {
      if (cx <= -md + 0.75) {
        commit();
      } else {
        animateToLeftEdgeThenCommit();
      }
      return;
    }

    snapRightThenClose();
  }, [animateToLeftEdgeThenCommit, close, commit, snapRightThenClose, x]);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        if (!isDragging && !isAnimating) close();
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [isOpen, isDragging, isAnimating, close]);

  const open = useCallback(() => setIsOpen(true), []);

  const onRootEnter = () => {
    if (fineHover && !isOpen) open();
  };

  const onRootLeave = () => {
    if (!fineHover || !isOpen) return;
    if (isDragging || isAnimating || snapBackRef.current) return;
    close();
  };

  const onOpenBubbleClick = () => {
    if (!fineHover && !dragMovedRef.current) close();
  };

  const onOrbitClick = () => {
    if (!isOpen) open();
    else onOpenBubbleClick();
  };

  const onOrbitFocus = () => {
    if (!isOpen) open();
  };

  const onLeftLabelClick = (e) => {
    e.stopPropagation();
    if (!isOpen || isAnimating || isDragging) return;
    measure();
    requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(animateToLeftEdgeThenCommit);
    });
  };

  const modeClass = mode === 'shay' ? 'shay' : 'naor';

  return (
    <div
      ref={rootRef}
      className={
        isOpen
          ? 'consciousness-switcher consciousness-switcher--open'
          : 'consciousness-switcher consciousness-switcher--closed'
      }
      dir="ltr"
      role="group"
      aria-label={semanticLabel}
      onMouseEnter={onRootEnter}
      onMouseLeave={onRootLeave}
      onBlurCapture={(e) => {
        if (!fineHover || isDragging || isAnimating || snapBackRef.current) return;
        const n = e.relatedTarget;
        if (n instanceof Node && rootRef.current?.contains(n)) return;
        if (isOpen) close();
      }}
    >
      <Motion.motion.div
        className="consciousness-switcher-shell"
        initial={false}
        animate={{
          width: isOpen
            ? 'var(--consciousness-switcher-open-w)'
            : 'var(--consciousness-switcher-bubble)',
          height: isOpen
            ? 'var(--consciousness-switcher-open-h)'
            : 'var(--consciousness-switcher-bubble)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      >
        <div className="consciousness-switcher-trackWrap">
          <div ref={trackRef} className="consciousness-switcher-track">
            <div
              className={`consciousness-switcher-trackFill consciousness-switcher-trackFill--${modeClass}`}
              aria-hidden
            />
            <Motion.motion.button
              ref={bubbleRef}
              type="button"
              className={`consciousness-switcher-orbit consciousness-switcher-orbit--${modeClass}`}
              style={isOpen ? { x } : undefined}
              drag={dragRange > 0 ? 'x' : false}
              dragConstraints={{ left: -dragRange, right: 0 }}
              dragElastic={0}
              dragMomentum={false}
              aria-label={semanticLabel}
              aria-expanded={isOpen}
              onDragStart={() => {
                dragMovedRef.current = false;
                setIsDragging(true);
              }}
              onDrag={(_e, info) => {
                if (Math.abs(info.offset.x) > 5) dragMovedRef.current = true;
              }}
              onDragEnd={onDragEnd}
              onPointerDown={() => {
                dragMovedRef.current = false;
              }}
              onClick={onOrbitClick}
              onFocus={onOrbitFocus}
            >
              <span className="consciousness-switcher-orbitLetter">
                {activeShort}
              </span>
            </Motion.motion.button>
            <span
              className="consciousness-switcher-trackCenter"
              aria-hidden={!isOpen}
            >
              {semanticLabel}
            </span>
            <button
              type="button"
              className="consciousness-switcher-pole consciousness-switcher-pole--left"
              tabIndex={isOpen ? 0 : -1}
              aria-hidden={!isOpen}
              onClick={onLeftLabelClick}
            >
              {inactiveFull}
            </button>
            <span
              className="consciousness-switcher-pole consciousness-switcher-pole--right"
              aria-hidden={!isOpen}
            >
              {activeFull}
            </span>
          </div>
        </div>
      </Motion.motion.div>
    </div>
  );
}
