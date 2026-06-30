import React, { useMemo, useState, useEffect } from "react";
import {
  loadWorkspaceHistory,
  clearWorkspaceHistory,
  deleteWorkspaceHistoryItem,
  toggleWorkspaceHistoryPin,
} from "@/src/lib/workspace/history";
import { WorkspaceItem } from "@/src/lib/types";
import { formatBytes } from "@/src/lib/utils";
import { useRoute } from "@/src/context/RouteContext";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Trash2,
  History,
  Database,
  ExternalLink,
  Search,
  Pin,
  PinOff,
  Download,
  X,
  CheckCircle2,
  Clock3,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";

type HistoryStatusFilter = "all" | WorkspaceItem["status"];

export function WorkspacePage() {
  const { navigate } = useRoute();
  const [history, setHistory] = useState<WorkspaceItem[]>([]);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");

  useEffect(() => {
    setHistory(loadWorkspaceHistory());
  }, []);

  const handleWipeHistory = () => {
    clearWorkspaceHistory();
    setHistory([]);
    setConfirmWipe(false);
  };

  const handleDeleteItem = (id: string) => {
    deleteWorkspaceHistoryItem(id);
    setHistory(loadWorkspaceHistory());
  };

  const handleTogglePin = (id: string) => {
    toggleWorkspaceHistoryPin(id);
    setHistory(loadWorkspaceHistory());
  };

  const exportHistory = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "Kurio Studio",
      records: history,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kurio-workspace-history-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const getToolRoute = (toolId: string) => {
    if (toolId === "pdf-to-png") return "/tools/pdf-to-png";
    if (toolId === "image-to-pdf") return "/tools/image-to-pdf";
    if (toolId === "pdf-merge") return "/tools/pdf-merge";
    if (toolId === "resize-pdf") return "/tools/resize-pdf";
    if (toolId === "pdf-compressor") return "/tools/pdf-compressor";
    if (toolId === "doc-to-md") return "/tools/doc-to-md";
    if (toolId === "compress-image") return "/tools/compress-image";
    if (toolId === "resize-image") return "/tools/resize-image";
    if (toolId === "lottie-preview") return "/tools/lottie-preview";
    if (toolId === "json-formatter") return "/tools/json-formatter";
    return "/tools";
  };

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history
      .filter((record) => {
        const matchesSearch =
          !query ||
          record.fileName.toLowerCase().includes(query) ||
          record.toolName.toLowerCase().includes(query) ||
          record.outputType.toLowerCase().includes(query) ||
          Object.entries(record.metadata || {})
            .map(([key, value]) => `${key} ${value}`)
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchesStatus = statusFilter === "all" || record.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [history, search, statusFilter]);

  const completedCount = history.filter((record) => record.status === "completed").length;
  const pinnedCount = history.filter((record) => record.pinned).length;

  const statusDetails: Record<WorkspaceItem["status"], { label: string; className: string; Icon: LucideIcon }> = {
    idle: {
      label: "Ready",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      Icon: Clock3,
    },
    processing: {
      label: "Processing",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      Icon: Clock3,
    },
    completed: {
      label: "Completed",
      className: "bg-green-50 text-green-700 border-green-200",
      Icon: CheckCircle2,
    },
    error: {
      label: "Error",
      className: "bg-red-50 text-red-700 border-red-200",
      Icon: AlertCircle,
    },
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-10">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <h1 className="font-sans text-2xl font-extrabold tracking-tight text-text-primary md:text-3.5xl flex items-center gap-2">
            <History className="h-6 w-6 text-accent-secondary" />
            Workspace History
          </h1>
          <p className="text-xs text-text-secondary">
            Review recent file activity stored in this browser. Files are not uploaded from this page.
          </p>
        </div>

        {history.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={exportHistory}
              className="gap-2 text-xs"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmWipe(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Wipe Cache
            </Button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted">Records</span>
            <span className="mt-1 block font-mono text-lg font-bold text-text-primary">{history.length}</span>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted">Completed</span>
            <span className="mt-1 block font-mono text-lg font-bold text-text-primary">{completedCount}</span>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
            <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted">Pinned</span>
            <span className="mt-1 block font-mono text-lg font-bold text-text-primary">{pinnedCount}</span>
          </div>
        </div>
      )}

      {/* History log block */}
      {history.length > 0 ? (
        <div className="space-y-4">
          {confirmWipe && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="font-semibold">Clear all local workspace history? This only removes records stored in this browser.</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmWipe(false)} className="border border-red-200 bg-white text-xs">
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleWipeHistory} className="text-xs">
                  Clear history
                </Button>
              </div>
            </div>
          )}
          
          <div className="rounded-xl border border-accent-bg bg-accent-bg/35 p-4 text-xs text-accent-secondary flex items-start gap-2.5">
            <Database className="h-4.5 w-4.5 shrink-0" />
            <div>
              <span className="font-bold block">Local browser history</span>
              <p className="mt-0.5 leading-normal text-[11px] text-text-secondary">
                This list is saved in localStorage for quick access. Clearing it does not delete files from your device.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between rounded-xl border border-brand-border bg-brand-surface p-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search file, tool, or output..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", "idle", "completed", "error"] as HistoryStatusFilter[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    statusFilter === status
                      ? "bg-accent-secondary text-white"
                      : "border border-brand-border bg-brand-surface text-text-secondary hover:bg-brand-bg"
                  }`}
                >
                  {status === "all" ? "All" : statusDetails[status].label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-brand-soft border border-brand-border bg-brand-surface rounded-2xl overflow-hidden shadow-xs">
            {filteredHistory.map((record) => {
              const status = statusDetails[record.status];
              const StatusIcon = status.Icon;
              return (
              <div
                key={record.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-brand-secondary transition-colors"
                style={{ contentVisibility: "auto" }}
              >
                {/* Meta details */}
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {record.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-accent-primary/20 bg-accent-bg px-2 py-0.5 text-[10px] font-bold text-accent-secondary">
                        <Pin className="h-3 w-3" />
                        Pinned
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-accent-secondary bg-accent-bg py-0.5 px-2 rounded-md font-sans">
                      {record.toolName}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${status.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </div>
                  
                  <span className="text-xs font-bold text-text-primary font-sans block truncate max-w-full">
                    {record.fileName}
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-secondary">
                    <span>{formatBytes(record.fileSize)}</span>
                    <span className="text-brand-border">&#8226;</span>
                    <span className="font-mono text-text-muted">Export: {record.outputType}</span>
                    <span className="text-brand-border">&#8226;</span>
                    <span className="font-mono text-text-muted">{new Date(record.createdAt).toLocaleString()}</span>
                  </div>

                  {record.metadata && Object.keys(record.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(record.metadata).slice(0, 5).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-md border border-brand-border bg-brand-secondary px-2 py-0.5 text-[9px] font-semibold text-text-secondary"
                        >
                          {key}: <span className="font-mono text-text-primary">{String(value)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Launch matching module */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleTogglePin(record.id)}
                    className="h-8 w-8"
                    title={record.pinned ? "Unpin item" : "Pin item"}
                  >
                    {record.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(getToolRoute(record.toolId))}
                    className="flex items-center gap-1 text-xs py-4.5"
                  >
                    Open again
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteItem(record.id)}
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                    title="Remove from history"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )})}
          </div>

          {filteredHistory.length === 0 && (
            <div className="rounded-2xl border border-brand-border border-dashed bg-brand-secondary/40 py-12 text-center">
              <h4 className="text-sm font-bold text-text-primary">No matching history items</h4>
              <p className="mt-1 text-xs text-text-secondary">Try another keyword or status filter.</p>
            </div>
          )}

        </div>
      ) : (
        <div className="text-center py-20 border border-brand-border border-dashed rounded-2xl bg-brand-secondary space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-text-muted">
            <History className="h-5.5 w-5.5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">Workspace log history is empty</h4>
            <p className="text-xs text-text-secondary mt-1">
              Process a file with any tool or drop a file on the home page to start a local history.
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
