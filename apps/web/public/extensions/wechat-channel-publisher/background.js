const EXTENSION_SOURCE = "ai-omni-wechat-channel-extension";
const CREATOR_URL = "https://channels.weixin.qq.com/";
const PENDING_PUBLISH_KEY = "aiOmniPendingWechatChannelPublish";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.source !== EXTENSION_SOURCE) {
    return undefined;
  }

  if (message.type === "AI_OMNI_WECHAT_CHANNEL_EXTENSION_START_PUBLISH") {
    void handleStartPublish(message.payload, sender.tab?.id)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "视频号 PoC 启动失败" }));
    return true;
  }

  if (message.type === "AI_OMNI_WECHAT_CHANNEL_QUERY_PENDING_PUBLISH") {
    void chrome.storage.local
      .get(PENDING_PUBLISH_KEY)
      .then((payload) => sendResponse({ pendingPublish: payload?.[PENDING_PUBLISH_KEY] }))
      .catch(() => sendResponse({ pendingPublish: undefined }));
    return true;
  }

  if (message.type === "AI_OMNI_WECHAT_CHANNEL_CREATOR_PROBE_RESULT") {
    void notifyApp(message.payload?.appTabId, {
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PROBE_RESULT",
      payload: message.payload,
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "AI_OMNI_WECHAT_CHANNEL_EXTENSION_HEALTHCHECK") {
    sendResponse({ ok: true });
    return false;
  }

  return undefined;
});

async function handleStartPublish(payload, appTabId) {
  const session = normalizeSession(payload?.session);
  const tab = await chrome.tabs.create({
    url: buildCreatorUrl(session),
    active: true,
  });
  const creatorTabId = tab.id;
  if (typeof creatorTabId !== "number") {
    throw new Error("无法打开视频号助手。");
  }

  await chrome.storage.local.set({
    [PENDING_PUBLISH_KEY]: {
      creatorTabId,
      payload: {
        appTabId,
        session,
      },
      savedAt: Date.now(),
    },
  });

  await waitForTabComplete(creatorTabId);
  await injectCreatorContentScript(creatorTabId);
  await sendMessageWithRetry(
    creatorTabId,
    {
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_WECHAT_CHANNEL_CREATOR_RUN_PROBE",
      payload: {
        appTabId,
        session,
      },
    },
    10,
    800,
  );
}

function normalizeSession(session) {
  return {
    mode: String(session?.mode || "VIDEO"),
    title: String(session?.title || "AI全域运营视频号 PoC"),
    content: String(session?.content || "这是视频号浏览器辅助发布的最小验证任务，用于确认上传与文案填写能力。"),
    videoUrl: typeof session?.videoUrl === "string" ? session.videoUrl : "",
    imageUrls: Array.isArray(session?.imageUrls) ? session.imageUrls.filter((item) => typeof item === "string") : [],
  };
}

function buildCreatorUrl(session) {
  const url = new URL(CREATOR_URL);
  url.hash = new URLSearchParams({
    ai_omni_mode: session.mode,
    ai_omni_title: session.title,
    ai_omni_content: session.content,
  }).toString();
  return url.toString();
}

async function waitForTabComplete(tabId, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") {
      return;
    }
    await sleep(500);
  }
  throw new Error("视频号页面加载超时。");
}

async function injectCreatorContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-script.js"],
  });
}

async function notifyApp(tabId, message) {
  if (typeof tabId !== "number") {
    return;
  }
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Ignore app tab notification failures during PoC.
  }
}

async function sendMessageWithRetry(tabId, message, attempts, intervalMs) {
  let lastError = "";
  for (let index = 0; index < attempts; index += 1) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "发送消息失败";
      await sleep(intervalMs);
    }
  }
  throw new Error(lastError || "无法向视频号页面发送 PoC 任务。");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
