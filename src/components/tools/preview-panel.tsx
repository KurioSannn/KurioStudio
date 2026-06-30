import React from "react";
import { Eye } from "lucide-react";

interface PreviewPanelProps {
  title?: string;
  imgUrl?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  children?: React.ReactNode;
}

export function PreviewPanel({
  title = "Canvas Preview",
  imgUrl,
  emptyTitle = "No preview yet",
  emptyDescription = "Upload a supported file or generate an output to inspect it here before downloading.",
  children,
}: PreviewPanelProps) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4 shadow-xs">
      <div className="flex items-center gap-2 pb-3 border-b border-brand-soft-border">
        <Eye className="h-4.5 w-4.5 text-accent-secondary" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
          {title}
        </h4>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-brand-border bg-brand-bg flex items-center justify-center p-4">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt="Asset inspection render"
            referrerPolicy="no-referrer"
            className="max-h-[350px] object-contain rounded-lg border border-brand-border/40 select-none shadow-xs"
          />
        ) : children ? (
          <div className="w-full">{children}</div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted text-xs">
            <span className="font-bold text-text-primary">{emptyTitle}</span>
            <span className="mt-1 max-w-sm leading-relaxed">{emptyDescription}</span>
          </div>
        )}
      </div>
    </div>
  );
}
export default PreviewPanel;
