import React from "react";
import { Download, CheckSquare } from "lucide-react";
import { formatBytes } from "@/src/lib/utils";

interface OutputPanelProps {
  title?: string;
  originalSize?: number;
  compressedSize?: number;
  onDownloadAll?: () => void;
  downloadLabel?: string;
  isProcessing?: boolean;
  children?: React.ReactNode;
}

export function OutputPanel({
  title = "Export Queue",
  originalSize,
  compressedSize,
  onDownloadAll,
  downloadLabel = "Download output package",
  isProcessing = false,
  children,
}: OutputPanelProps) {
  // calculate saving factor for compressors
  const percentageSaved =
    originalSize && compressedSize && originalSize > compressedSize
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : null;

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-brand-soft-border gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4.5 w-4.5 text-accent-secondary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            {title}
          </h4>
        </div>
        
        {percentageSaved !== null && percentageSaved > 0 && (
          <span className="text-[10px] font-bold text-accent-secondary bg-accent-bg px-2 py-0.5 rounded-md">
            Reduced by -{percentageSaved}%
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Metric comparatives */}
        {originalSize !== undefined && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-brand-secondary p-4.5 rounded-xl border border-brand-border/60 text-xs text-text-secondary">
            <div>
              <span className="block text-text-muted text-[9px] uppercase font-bold tracking-wider">Before resize</span>
              <span className="font-mono text-text-primary mt-0.5 block">{formatBytes(originalSize)}</span>
            </div>
            {compressedSize !== undefined && (
              <div className="border-l border-brand-border/80 pl-3">
                <span className="block text-text-muted text-[9px] uppercase font-bold tracking-wider">After compile</span>
                <span className="font-mono text-text-primary mt-1.5 block font-bold">{formatBytes(compressedSize)}</span>
              </div>
            )}
            {percentageSaved !== null && (
              <div className="hidden sm:block border-l border-brand-border/80 pl-3">
                <span className="block text-text-muted text-[9px] uppercase font-bold tracking-wider">Savings scale</span>
                <span className="font-mono text-accent-secondary mt-1.5 block font-bold">-{percentageSaved}% shrink</span>
              </div>
            )}
          </div>
        )}

        {/* Dynamic content rendering */}
        {children}

        {/* Trigger exports */}
        {onDownloadAll && (
          <button
            onClick={onDownloadAll}
            disabled={isProcessing}
            className="w-full h-11 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all bg-accent-primary hover:bg-amber-500 border border-amber-500 text-text-primary shadow-sm hover:-translate-y-0.5 active:scale-98 disabled:pointer-events-none disabled:bg-brand-soft disabled:text-text-muted cursor-pointer"
          >
            <Download className="h-4 w-4" />
            {isProcessing ? "Assembling exports..." : downloadLabel}
          </button>
        )}
      </div>
    </div>
  );
}
export default OutputPanel;
