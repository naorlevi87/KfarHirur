// src/pages/kenZeOved/VideoEmbed.jsx
// Renders a video from { type: 'youtube'|'upload', url: string }.
// Returns null if no value or url.
// In autoplay mode the native controls are hidden and a custom mute toggle is overlaid,
// so the timeline / extra buttons under the player are gone but sound is still reachable.

import { useRef, useState } from 'react';

function extractYouTubeId(url) {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function MuteToggle({ muted, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={muted ? 'הפעלת קול' : 'השתקה'}
      style={{
        position: 'absolute',
        bottom: 12,
        insetInlineEnd: 12,
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: 'none',
        background: 'rgba(0,0,0,0.55)',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 2,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        {muted ? (
          <path d="M16 9l5 6m0-6l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M16 8c1.5 1 2.5 2.4 2.5 4S17.5 15 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        )}
      </svg>
    </button>
  );
}

export function VideoEmbed({ value, className = '', autoplay = false }) {
  const iframeRef = useRef(null);
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);

  // Reset mute state when the source changes (React's render-time reset pattern).
  const [lastUrl, setLastUrl] = useState(value?.url);
  if (value?.url !== lastUrl) {
    setLastUrl(value?.url);
    setMuted(true);
  }

  if (!value?.url) return null;

  if (value.type === 'youtube') {
    const id = extractYouTubeId(value.url);
    if (!id) return null;

    const params = autoplay
      ? `?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0&enablejsapi=1`
      : '';

    const toggleMute = () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      const func = muted ? 'unMute' : 'mute';
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        '*'
      );
      setMuted(!muted);
    };

    return (
      <div
        className={className}
        style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '12px' }}
      >
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${id}${params}`}
          title="סרטון"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
        {autoplay && <MuteToggle muted={muted} onToggle={toggleMute} />}
      </div>
    );
  }

  if (value.type === 'upload') {
    if (autoplay) {
      const toggleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setMuted(v.muted);
      };
      return (
        <div className={className} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
          <video
            ref={videoRef}
            src={value.url}
            autoPlay
            muted
            loop
            playsInline
            style={{ width: '100%', display: 'block' }}
          />
          <MuteToggle muted={muted} onToggle={toggleMute} />
        </div>
      );
    }
    return (
      <video
        className={className}
        src={value.url}
        controls
        style={{ width: '100%', borderRadius: '12px', display: 'block' }}
      />
    );
  }

  return null;
}
