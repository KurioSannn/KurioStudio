import React, { useState, useEffect } from "react";
import { loadWorkspaceHistory, clearWorkspaceHistory } from "@/src/lib/workspace/history";
import { WorkspaceItem } from "@/src/lib/types";
import { formatBytes } from "@/src/lib/utils";
import { useRoute } from "@/src/context/RouteContext";
import { Button } from "@/src/components/ui/button";
import { Trash2, History, Database, ArrowRight, ExternalLink, RefreshCw } from "lucide-react";

export function WorkspacePage() {
  const { navigate } = useRoute();
  const [history, setHistory] = useState<WorkspaceItem[]>([]);

  useEffect(() => {
    setHistory(loadWorkspaceHistory());
  }, []);

  const handleWipeHistory = () => {
    if (confirm("Are you sure you want to flush all local workspace transaction cache? All file logs will be deleted.")) {
      clearWorkspaceHistory();
      setHistory([]);
    }
  };

  const getToolRoute = (toolId: string) => {
    if (toolId === "pdf-to-png") return "/tools/pdf-to-png";
    if (toolId === "compress-image") return "/tools/compress-image";
    if (toolId === "resize-image") return "/tools/resize-image";
    if (toolId === "lottie-preview") return "/tools/lottie-preview";
    if (toolId === "json-formatter") return "/tools/json-formatter";
    return "/tools";
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-10">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3.5xl flex items-center gap-2">
            <History className="h-6 w-6 text-accent-secondary" />
            Creator Workspace History
          </h1>
          <p className="text-xs text-text-secondary">
            Trace your optimized assets. Under total security mandates, all parameters remain persisted solely on your disk.
          </p>
        </div>

        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleWipeHistory}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
          >
            <Trash2 className="h-4 w-4" />
            Wipe Cache
          </Button>
        )}
      </div>

      {/* History log block */}
      {history.length > 0 ? (
        <div className="space-y-4">
          
          <div className="rounded-xl border border-[#FFF3D6] bg-[#FFF3D6]/35 p-4 text-xs text-accent-secondary flex items-start gap-2.5">
            <Database className="h-4.5 w-4.5 shrink-0" />
            <div>
              <span className="font-bold block">Secure Browser Ingestion Active</span>
              <p className="mt-0.5 leading-normal text-[11px] text-text-secondary">
                This diagnostic listing is read from standard client key-value layers. No files or details are ever transmitted outside this browser process.
              </p>
            </div>
          </div>

          <div className="divide-y divide-brand-soft border border-brand-border bg-brand-surface rounded-2xl overflow-hidden shadow-xs">
            {history.map((record) => (
              <div
                key={record.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-[#FAFAF7] transition-colors"
                style={{ contentVisibility: "auto" }}
              >
                {/* Meta details */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-accent-secondary bg-accent-bg py-0.5 px-2 rounded-md font-sans">
                      {record.toolName}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">{new Date(record.timestamp).toLocaleTimeString()}</span>
                  </div>
                  
                  <span className="text-xs font-bold text-text-primary font-sans block truncate max-w-full">
                    {record.fileName}
                  </span>
                  
                  <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                    <span>{formatBytes(record.fileSize)}</span>
                    <span className="text-brand-border">&#8226;</span>
                    <span className="font-mono text-text-muted">Export: {record.outputType}</span>
                  </div>
                </div>

                {/* Launch matching module */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(getToolRoute(record.toolId))}
                  className="shrink-0 flex items-center gap-1 text-xs py-4.5"
                >
                  Relaunch module
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

        </div>
      ) : (
        <div className="text-center py-20 border border-brand-border border-dashed rounded-2xl bg-[#FAFAF7] space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-text-muted">
            <History className="h-5.5 w-5.5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">Workspace log history is empty</h4>
            <p className="text-xs text-text-secondary mt-1">
              Begin by processing creative files inside one of our standard localized modules.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate("/tools")} className="mt-2 text-xs">
            Show all tools
          </Button>
        </div>
      )}

    </div>
  );
}
export default WorkspacePage;
