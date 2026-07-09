'use client';

import { Send, Camera, MessagesSquare } from 'lucide-react';
import { PLATFORM_LIST, PlatformId } from '@/lib/platforms';

const PLATFORM_ICONS: Record<PlatformId, typeof Send> = {
  telegram: Send,
  instagram: Camera,
  reddit: MessagesSquare,
};

interface PlatformPickerProps {
  value: PlatformId;
  onChange: (platform: PlatformId) => void;
  /** Platforms shown but not selectable (canvas not built yet). */
  disabled?: PlatformId[];
}

export default function PlatformPicker({ value, onChange, disabled = [] }: PlatformPickerProps) {
  return (
    <div className="platform-picker" role="radiogroup" aria-label="Platform">
      {PLATFORM_LIST.map((p) => {
        const Icon = PLATFORM_ICONS[p.id];
        const active = p.id === value;
        const isDisabled = disabled.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={isDisabled}
            title={isDisabled ? 'Coming soon' : undefined}
            className={`platform-picker__opt${active ? ' is-active' : ''}`}
            onClick={() => onChange(p.id)}
          >
            <Icon size={13} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
