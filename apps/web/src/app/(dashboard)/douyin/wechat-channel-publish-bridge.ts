"use client";

export const WEB_WECHAT_CHANNEL_PUBLISH_SOURCE = "ai-omni-ops-web";
export const EXTENSION_WECHAT_CHANNEL_PUBLISH_SOURCE = "ai-omni-wechat-channel-extension";

type BridgeMessagePayload = {
  source?: unknown;
  type?: unknown;
  note?: unknown;
  payload?: unknown;
};

export type WechatChannelPublishSession = {
  mode: "VIDEO";
  title: string;
  content: string;
  videoUrl?: string;
  imageUrls?: string[];
};

export type WechatChannelExtensionProbeResult = {
  ready: boolean;
  pageKind: "VIDEO" | "IMAGE_TEXT" | "UNKNOWN";
  pageKindLabel: string;
  expectedMode: string;
  titleDetected: boolean;
  contentDetected: boolean;
  fileInputCount: number;
  buttonLabels: string[];
  locationHref: string;
};

type WechatChannelBridgeHandlers = {
  onReady: () => void;
  onProbeResult: (result: WechatChannelExtensionProbeResult) => void;
  onPublishFailed: (note?: string) => void;
};

export function startWechatChannelPublisherBridge(handlers: WechatChannelBridgeHandlers) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleMessage = (event: MessageEvent) => {
    const data = event.data as BridgeMessagePayload;
    if (!data || typeof data !== "object" || data.source !== EXTENSION_WECHAT_CHANNEL_PUBLISH_SOURCE) {
      return;
    }

    if (data.type === "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PONG") {
      handlers.onReady();
      return;
    }

    if (data.type === "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PROBE_RESULT") {
      const result = data.payload as WechatChannelExtensionProbeResult | undefined;
      if (result && typeof result === "object") {
        handlers.onProbeResult(result);
      }
      return;
    }

    if (data.type === "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PUBLISH_FAILED") {
      handlers.onPublishFailed(typeof data.note === "string" ? data.note : undefined);
    }
  };

  window.addEventListener("message", handleMessage);
  pingWechatChannelPublisher();
  return () => window.removeEventListener("message", handleMessage);
}

export async function probeWechatChannelPublisher(options?: {
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
      const data = event.data as BridgeMessagePayload;
      if (!data || typeof data !== "object") {
        return;
      }
      if (data.source === EXTENSION_WECHAT_CHANNEL_PUBLISH_SOURCE && data.type === "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PONG") {
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
    pingWechatChannelPublisher();
    pingTimer = window.setInterval(() => {
      if (!finished) {
        pingWechatChannelPublisher();
      }
    }, 500);
  });
}

export function notifyWechatChannelExtensionStartPublish(session: WechatChannelPublishSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.postMessage(
    {
      source: WEB_WECHAT_CHANNEL_PUBLISH_SOURCE,
      type: "AI_OMNI_WECHAT_CHANNEL_EXTENSION_START_PUBLISH",
      payload: { session },
    },
    "*",
  );
}

function pingWechatChannelPublisher() {
  window.postMessage(
    {
      source: WEB_WECHAT_CHANNEL_PUBLISH_SOURCE,
      type: "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PING",
    },
    "*",
  );
}
