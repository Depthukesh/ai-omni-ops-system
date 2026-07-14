export type RuntimeDebugEvent = {
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
  location?: string;
  msg?: string;
  data?: unknown;
  ts?: number;
};

const CLIENT_RUNTIME_DEBUG_ENABLED = process.env.NEXT_PUBLIC_ENABLE_RUNTIME_DEBUG === "true";
const SERVER_RUNTIME_DEBUG_ENABLED = process.env.ENABLE_RUNTIME_DEBUG === "true";

export function isRuntimeDebugEnabled() {
  return CLIENT_RUNTIME_DEBUG_ENABLED || SERVER_RUNTIME_DEBUG_ENABLED;
}

export function postRuntimeDebugEvent(payload: RuntimeDebugEvent) {
  if (!isRuntimeDebugEnabled()) {
    return;
  }

  void fetch(resolveRuntimeDebugEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      ts: typeof payload.ts === "number" ? payload.ts : Date.now(),
    }),
    keepalive: typeof window !== "undefined",
    cache: "no-store",
  }).catch(() => {});
}

function resolveRuntimeDebugEndpoint() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/debug/browser-event`;
  }

  const configuredBaseUrl = String(
    process.env.INTERNAL_API_BASE_URL || process.env.API_PROXY_TARGET || "http://127.0.0.1:3011/api",
  ).trim().replace(/\/$/, "");

  return `${configuredBaseUrl}/debug/browser-event`;
}
