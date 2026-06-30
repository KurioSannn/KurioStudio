import { WorkspaceItem } from "../types";
import { toast } from "sonner";

const HISTORY_KEY = "kurio_studio_history_v1";

export function loadWorkspaceHistory(): WorkspaceItem[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load workspace history:", e);
    return [];
  }
}

export function saveWorkspaceHistory(items: WorkspaceItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    // Dispatch a storage event so components on the same page can re-render if needed
    window.dispatchEvent(new Event("storage_history_updated"));
  } catch (e) {
    console.error("Failed to save workspace history:", e);
  }
}

export function addToWorkspaceHistory(item: Omit<WorkspaceItem, "id" | "createdAt">): WorkspaceItem {
  const history = loadWorkspaceHistory();
  const newItem: WorkspaceItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString(),
    pinned: item.pinned ?? false,
  };
  
  // Keep the most recent 50 executions to prevent localStorage bloat
  const updated = [newItem, ...history].slice(0, 50);
  saveWorkspaceHistory(updated);
  return newItem;
}

export function deleteWorkspaceHistoryItem(id: string) {
  saveWorkspaceHistory(loadWorkspaceHistory().filter((item) => item.id !== id));
  toast.success("Item removed from workspace");
}

export function toggleWorkspaceHistoryPin(id: string) {
  const updated = loadWorkspaceHistory().map((item) => {
    if (item.id === id) {
      toast.success(item.pinned ? "Unpinned from workspace" : "Pinned to workspace");
      return { ...item, pinned: !item.pinned };
    }
    return item;
  });
  saveWorkspaceHistory(updated);
}

export function clearWorkspaceHistory() {
  saveWorkspaceHistory([]);
  toast.success("Workspace history cleared");
}
