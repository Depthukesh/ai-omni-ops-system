import { API_BASE_URL } from "../../../services/http";
import { type XiaohongshuDesktopDraftSession } from "../../../services/publishing";

export const WEB_DESKTOP_PUBLISH_SOURCE = "ai-omni-ops-web";
export const EXTENSION_DESKTOP_PUBLISH_SOURCE = "ai-omni-xhs-extension";

type BridgeMessagePayload = {
  source?: unknown;
  type?: unknown;
  note?: unknown;
};

type DesktopBridgeHandlers = {
  onReady: () => void;
  onDraftStarted: () => void;
  onDraftProgress: (note?: string) => void;
  onDraftSuccess: () => void;
  onDraftFailed: (note?: string) => void;
};

export function startDesktopPublisherBridge(handlers: DesktopBridgeHandlers) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleMessage = (event: MessageEvent) => {
    const payload = event.data as BridgeMessagePayload;
    if (!payload || typeof payload !== "object" || payload.source !== EXTENSION_DESKTOP_PUBLISH_SOURCE) {
      return;
    }

    if (payload.type === "AI_OMNI_XHS_EXTENSION_PONG") {
      handlers.onReady();
      return;
    }

    if (payload.type === "AI_OMNI_XHS_EXTENSION_DRAFT_STARTED") {
      handlers.onDraftStarted();
      return;
    }

    if (payload.type === "AI_OMNI_XHS_EXTENSION_DRAFT_PROGRESS") {
      handlers.onDraftProgress(typeof payload.note === "string" ? payload.note : undefined);
      return;
    }

    if (payload.type === "AI_OMNI_XHS_EXTENSION_DRAFT_SUCCESS") {
      handlers.onDraftSuccess();
      return;
    }

    if (payload.type === "AI_OMNI_XHS_EXTENSION_DRAFT_FAILED") {
      handlers.onDraftFailed(typeof payload.note === "string" ? payload.note : undefined);
    }
  };

  window.addEventListener("message", handleMessage);
  pingDesktopPublisher();
  return () => window.removeEventListener("message", handleMessage);
}

export async function probeDesktopPublisher(options?: {
  timeoutMs?: number;
  onReady?: () => void;
  onMissing?: () => void;
}) {
  if (typeof window === "undefined") {
    return false;
  }

  const timeoutMs = options?.timeoutMs ?? 1200;
  return new Promise<boolean>((resolve) => {
    let finished = false;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
    const onMessage = (event: MessageEvent) => {
      const payload = event.data as BridgeMessagePayload;
      if (!payload || typeof payload !== "object") {
        return;
      }
      if (payload.source === EXTENSION_DESKTOP_PUBLISH_SOURCE && payload.type === "AI_OMNI_XHS_EXTENSION_PONG") {
        finished = true;
        options?.onReady?.();
        cleanup();
        resolve(true);
      }
    };
    const timer = window.setTimeout(() => {
      if (finished) {
        return;
      }
      options?.onMissing?.();
      cleanup();
      resolve(false);
    }, timeoutMs);

    window.addEventListener("message", onMessage);
    pingDesktopPublisher();
  });
}

export function buildDesktopCreatorLaunchUrl(session: XiaohongshuDesktopDraftSession) {
  const baseUrl = String(session.creatorUrl || "https://creator.xiaohongshu.com/publish/publish").trim();
  const url = new URL(baseUrl);
  url.hash = new URLSearchParams({
    ai_omni_token: String(session.token || ""),
    ai_omni_api: API_BASE_URL,
  }).toString();
  return url.toString();
}

export function notifyExtensionStartDraft(session: XiaohongshuDesktopDraftSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.postMessage(
    {
      source: WEB_DESKTOP_PUBLISH_SOURCE,
      type: "AI_OMNI_XHS_EXTENSION_START_DRAFT",
      payload: {
        apiBaseUrl: API_BASE_URL,
        session,
      },
    },
    "*",
  );
}

function pingDesktopPublisher() {
  window.postMessage({ source: WEB_DESKTOP_PUBLISH_SOURCE, type: "AI_OMNI_XHS_EXTENSION_PING" }, "*");
}
