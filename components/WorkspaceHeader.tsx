'use client';

import { Smartphone } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEVICE_LIST, DeviceId, DEFAULT_DEVICE_ID } from '@/lib/devices';

interface WorkspaceHeaderProps {
  title: string;
  subtitle: string;
  /** Small inline annotation beside the title (e.g. a count chip). */
  meta?: React.ReactNode;
  /** Right-aligned actions (buttons). */
  children?: React.ReactNode;
  /** Selected device mockup; pass with onDeviceChange to control it. */
  device?: DeviceId;
  onDeviceChange?: (device: DeviceId) => void;
}

export default function WorkspaceHeader({
  title,
  subtitle,
  meta,
  children,
  device = DEFAULT_DEVICE_ID,
  onDeviceChange,
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[16px] font-semibold tracking-tight text-foreground">{title}</h1>
          {meta && <span className="header-chip">{meta}</span>}
        </div>
        <p className="truncate text-[12.5px] text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-none items-center gap-2.5">
        {/* Device mockup selector — drives the preview screen size. */}
        <Select value={device} onValueChange={(v) => onDeviceChange?.(v as DeviceId)}>
          <SelectTrigger className="header-device w-[188px]" aria-label="Device mockup">
            <span className="flex items-center gap-2">
              <Smartphone size={14} className="text-muted-foreground" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {DEVICE_LIST.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Light / Dark theme toggle — dark default, disabled for now. */}
        <div
          className="theme-toggle"
          role="group"
          aria-label="Theme"
          aria-disabled="true"
          title="Dark mode (light mode coming soon)"
        >
          <span className="theme-toggle__opt">Light</span>
          <span className="theme-toggle__opt is-active" aria-current="true">Dark</span>
        </div>

        {children}
      </div>
    </header>
  );
}
