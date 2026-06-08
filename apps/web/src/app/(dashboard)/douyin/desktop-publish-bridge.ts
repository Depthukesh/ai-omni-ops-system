"use client";

import { API_BASE_URL } from "../../../services/http";
import { type DouyinDesktopPublishSession } from "../../../services/publishing";

export const WEB_DESKTOP_PUBLISH_SOURCE = "ai-omni-ops-web";
export const EXTENSION_DESKTOP_PUBLISH_SOURCE = "ai-omni-douyin-extension";

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

    if (payload.type === "AI_OMNI_DOUYIN_EXTENSION_PONG") {
      handlers.onReady();
      return;
    }

    if (payload.type === "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_STARTED") {
      handlers.onDraftStarted();
      return;
    }

    if (payload.type === "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_PROGRESS") {
      handlers.onDraftProgress(typeof payload.note === "string" ? payload.note : undefined);
      return;
    }

    if (payload.type === "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_SUCCESS") {
      handlers.onDraftSuccess();
      return;
    }

    if (payload.type === "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_FAILED") {
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

  const timeoutMs = options?.timeoutMs ?? 2400;
  return new Promise<boolean>((resolve) => {
    let finished = false;
    let pingTimer: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      if (pingTimer) {
        window.clearInterval(pingTimer);
      }
    };
    const onMessage = (event: MessageEvent) => {
      const payload = event.data as BridgeMessagePayload;
      if (!payload || typeof payload !== "object") {
        return;
      }
      if (payload.source === EXTENSION_DESKTOP_PUBLISH_SOURCE && payload.type === "AI_OMNI_DOUYIN_EXTENSION_PONG") {
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
    pingTimer = window.setInterval(() => {
      if (!finished) {
        pingDesktopPublisher();
      }
    }, 500);
  });
}

export function buildDesktopCreatorLaunchUrl(session: DouyinDesktopPublishSession) {
  const baseUrl = String(session.creatorUrl || "https://creator.douyin.com/creator-micro/content/upload?enter_from=dou_web").trim();
  const url = new URL(baseUrl);
  url.hash = new URLSearchParams({
    ai_omni_token: String(session.token || ""),
    ai_omni_api: API_BASE_URL,
  }).toString();
  return url.toString();
}

export function notifyExtensionStartDraft(session: DouyinDesktopPublishSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.postMessage(
    {
      source: WEB_DESKTOP_PUBLISH_SOURCE,
      type: "AI_OMNI_DOUYIN_EXTENSION_START_PUBLISH",
      payload: {
        apiBaseUrl: API_BASE_URL,
        session,
      },
    },
    "*",
  );
}

function pingDesktopPublisher() {
  window.postMessage({ source: WEB_DESKTOP_PUBLISH_SOURCE, type: "AI_OMNI_DOUYIN_EXTENSION_PING" }, "*");
}
