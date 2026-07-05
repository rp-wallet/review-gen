import React from 'react';

type MarkerStrikeProps = {
  text: string;
  className?: string;
};

// Deterministic per-text tilt so every hidden name gets a slightly different
// hand-drawn angle, but re-renders and exports stay stable.
function markerTilt(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 997;
  return ((h % 5) - 2) * 0.45;
}

/**
 * Strikes a name out with an opaque "marker" stroke — the way people redact
 * names on vouch screenshots. The real text keeps its natural width but is
 * hidden underneath the ink.
 */
export default function MarkerStrike({ text, className }: MarkerStrikeProps) {
  return (
    <span
      className={`marker-strike ${className ?? ''}`}
      aria-label="Hidden name"
      style={{ '--marker-tilt': `${markerTilt(text)}deg` } as React.CSSProperties}
    >
      <span className="marker-strike__text" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}
