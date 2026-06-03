export type AnalyticsEventName =
  | "tool_opened"
  | "file_processed"
  | "conversion_success"
  | "conversion_failed"
  | "ai_request_used"
  | "feedback_opened";

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
    path: typeof window !== "undefined" ? window.location.hash || window.location.pathname : "",
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem("kurio_beta_analytics_v1") || "[]");
      const events = Array.isArray(existing) ? existing : [];
      events.unshift(body);
      localStorage.setItem("kurio_beta_analytics_v1", JSON.stringify(events.slice(0, 100)));
    } catch {
      localStorage.setItem("kurio_beta_analytics_v1", JSON.stringify([body]));
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
