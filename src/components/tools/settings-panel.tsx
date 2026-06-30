import React from "react";
import { Sliders } from "lucide-react";

interface SettingsPanelProps {
  title?: string;
  children: React.ReactNode;
}

export function SettingsPanel({ title = "Tool Settings", children }: SettingsPanelProps) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4 shadow-xs">
      <div className="flex items-center gap-2 pb-3 border-b border-brand-soft-border">
        <Sliders className="h-4.5 w-4.5 text-accent-secondary" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
          {title}
        </h4>
      </div>
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
export default SettingsPanel;
