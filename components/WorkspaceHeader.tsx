'use client';

import { Smartphone } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WorkspaceHeaderProps {
  title: string;
  subtitle: string;
  /** Small inline annotation beside the title (e.g. a count chip). */
  meta?: React.ReactNode;
  /** Right-aligned actions (buttons). */
  children?: React.ReactNode;
}

export default function WorkspaceHeader({
  title,
  subtitle,
  meta,
  children,
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
        {/* Device mockup selector — single option for now, preselected. */}
        <Select defaultValue="iphone-16-pro">
          <SelectTrigger className="header-device w-[172px]" aria-label="Device mockup">
            <span className="flex items-center gap-2">
              <Smartphone size={14} className="text-muted-foreground" />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="iphone-16-pro">iPhone 16 Pro</SelectItem>
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
