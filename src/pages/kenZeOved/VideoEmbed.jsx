// src/pages/kenZeOved/VideoEmbed.jsx
// Renders a video from { type: 'youtube'|'upload', url: string }.
// Returns null if no value or url.

function toYouTubeEmbed(url) {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return null;
}

export function VideoEmbed({ value, className = '' }) {
  if (!value?.url) return null;

  if (value.type === 'youtube') {
    const embedUrl = toYouTubeEmbed(value.url);
    if (!embedUrl) return null;
    return (
      <div className={className} style={{ aspectRatio: '16/9', overflow: 'hidden', borderRadius: '12px' }}>
        <iframe
          src={embedUrl}
          title="סרטון"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    );
  }

  if (value.type === 'upload') {
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
