import { AppRoute } from "../types";

export interface PendingToolFile {
  file: File;
  toolId: string;
  route: AppRoute;
  source: "quick-drop";
  createdAt: string;
}

let pendingToolFile: PendingToolFile | null = null;

export function setPendingToolFile(file: File, toolId: string, route: AppRoute) {
  pendingToolFile = {
    file,
    toolId,
    route,
    source: "quick-drop",
    createdAt: new Date().toISOString(),
  };
}

export function takePendingToolFile(toolId: string) {
  if (!pendingToolFile || pendingToolFile.toolId !== toolId) return null;
  const pending = pendingToolFile;
  pendingToolFile = null;
  return pending;
}

export function clearPendingToolFile() {
  pendingToolFile = null;
}
