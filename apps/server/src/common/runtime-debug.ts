export type RuntimeDebugEvent = {
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
  location?: string;
  msg?: string;
  data?: unknown;
  ts?: number;
};

const RUNTIME_DEBUG_ENABLED = String(process.env.ENABLE_RUNTIME_DEBUG || "").trim() === "true";
const DEFAULT_RUNTIME_DEBUG_ENDPOINT = "http://127.0.0.1:3011/api/debug/browser-event";

export function isRuntimeDebugEnabled() {
  return RUNTIME_DEBUG_ENABLED;
}

export function postRuntimeDebugEvent(payload: RuntimeDebugEvent) {
  if (!RUNTIME_DEBUG_ENABLED) {
    return;
  }

  const targetUrl = String(process.env.RUNTIME_DEBUG_ENDPOINT || DEFAULT_RUNTIME_DEBUG_ENDPOINT).trim() || DEFAULT_RUNTIME_DEBUG_ENDPOINT;
  void fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      ts: typeof payload.ts === "number" ? payload.ts : Date.now(),
    }),
  }).catch(() => {});
}
