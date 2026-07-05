import React from 'react';

type MosaicTextProps = {
  text: string;
  className?: string;
};

function tileSeed(text: string, index: number) {
  return (text.charCodeAt(index % Math.max(text.length, 1)) + index * 17) % 11;
}

export default function MosaicText({ text, className }: MosaicTextProps) {
  const count = Math.max(5, Math.min(14, Math.ceil(text.length * 0.8)));

  return (
    <span className={`mosaic-text ${className ?? ''}`} aria-label="Hidden name">
      {Array.from({ length: count }).map((_, index) => {
        const seed = tileSeed(text, index);
        return (
          <span
            key={`${text}-${index}`}
            className="mosaic-text__tile"
            style={{
              '--tile-w': `${8 + (seed % 5) * 3}px`,
              '--tile-h': `${7 + (seed % 3)}px`,
              '--tile-alpha': `${0.55 + (seed % 4) * 0.08}`,
              '--tile-y': `${(seed % 5) - 2}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </span>
  );
}
