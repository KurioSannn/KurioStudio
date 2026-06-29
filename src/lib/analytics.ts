export type AnalyticsEventName =
  | "page_view"
  | "tool_opened"
  | "file_processed"
  | "batch_file_processed"
  | "conversion_success"
  | "conversion_failed"
  | "ai_request_used"
  | "feedback_opened"
  | "app_error";

interface AnalyticsPayload {
  toolId?: string;
  fileType?: string;
  fileSize?: number;
  mode?: string;
  message?: string;
  [key: string]: unknown;
}

export function trackEvent(event: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  const body = {
    event,
    payload,
    path: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "",
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem("kurio_beta_analytics_v1") || "[]");
      const events = Array.isArray(existing) ? existing : [];
      events.unshift(body);
      localStorage.setItem("kurio_beta_analytics_v1", JSON.stringify(events.slice(0, 250)));
    } catch {
      localStorage.setItem("kurio_beta_analytics_v1", JSON.stringify([body]));
    }

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
        navigator.sendBeacon("/api/analytics", blob);
        return;
      }
    } catch {
      // Fall through to fetch when Beacon is unavailable or blocked.
    }
  }

  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    console.info("[kurio analytics]", body);
  });
}

export function trackError(error: unknown, payload: AnalyticsPayload = {}) {
  const message = error instanceof Error ? error.message : String(error);
  trackEvent("app_error", {
    ...payload,
    message,
    stack: error instanceof Error ? error.stack?.slice(0, 900) : undefined,
  });
}
