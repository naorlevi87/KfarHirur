// src/pages/home/FundraisingVideo.jsx
// Autoplay looping video (no controls). Sound off by default, mute toggle bottom-right.

import { useRef, useState } from 'react';
import './FundraisingVideo.css';

export function FundraisingVideo({ src }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  return (
    <div className="fv-wrap">
      <video
        ref={videoRef}
        src={src}
        className="fv-video"
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
      />
      <button
        className="fv-sound-btn"
        onClick={toggleSound}
        aria-label={muted ? 'הפעל סאונד' : 'השתק'}
        type="button"
      >
        {muted ? <IconMuted /> : <IconSound />}
      </button>
    </div>
  );
}

function IconMuted() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function IconSound() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}
