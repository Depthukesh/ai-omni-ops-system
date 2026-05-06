const EXTENSION_SOURCE = "ai-omni-xhs-extension";
const CREATOR_URL = "https://creator.xiaohongshu.com/publish/publish";
const PENDING_DRAFT_KEY = "aiOmniPendingDraft";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.source !== EXTENSION_SOURCE) {
    return undefined;
  }

  if (message.type === "AI_OMNI_XHS_EXTENSION_START_DRAFT") {
    void handleStartDraft(message.payload, sender.tab?.id)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "扩展启动失败" }));
    return true;
  }

  if (message.type === "AI_OMNI_XHS_CREATOR_DRAFT_RESULT") {
    void handleCreatorResult(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "扩展结果回写失败" }));
    return true;
  }

  if (message.type === "AI_OMNI_XHS_CREATOR_DRAFT_PROGRESS") {
    void notifyApp(message.payload?.appTabId, {
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_EXTENSION_DRAFT_PROGRESS",
      token: message.payload?.token,
      note: message.payload?.note,
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "AI_OMNI_XHS_QUERY_ACTIVE_TAB") {
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => sendResponse({ tabId: tabs[0]?.id }))
      .catch(() => sendResponse({ tabId: undefined }));
    return true;
  }

  if (message.type === "AI_OMNI_XHS_QUERY_PENDING_DRAFT") {
    void chrome.storage.local
      .get(PENDING_DRAFT_KEY)
      .then((payload) => sendResponse({ pendingDraft: payload?.[PENDING_DRAFT_KEY] }))
      .catch(() => sendResponse({ pendingDraft: undefined }));
    return true;
  }

  if (message.type === "AI_OMNI_XHS_EXTENSION_HEALTHCHECK") {
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "AI_OMNI_XHS_RESOLVE_DRAFT_PAYLOAD") {
    void buildDraftPayload(message.payload)
      .then((draftPayload) => sendResponse({ draftPayload }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "构建发布负载失败" }));
    return true;
  }

  if (message.type === "AI_OMNI_XHS_RESOLVE_DRAFT_BY_TOKEN") {
    void resolveDraftPayloadByToken(message.payload)
      .then((draftPayload) => sendResponse({ draftPayload }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "按 token 构建发布负载失败" }));
    return true;
  }

  return undefined;
});

async function handleStartDraft(payload, appTabId) {
  const session = payload?.session;
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim();
  if (!session?.token || !apiBaseUrl) {
    throw new Error("发布会话数据不完整。");
  }

  const draftDescriptor = {
    apiBaseUrl,
    appTabId,
    session,
  };

  await notifyApp(appTabId, {
    source: EXTENSION_SOURCE,
    type: "AI_OMNI_XHS_EXTENSION_DRAFT_STARTED",
    token: session.token,
  });

  await notifyApp(appTabId, {
    source: EXTENSION_SOURCE,
    type: "AI_OMNI_XHS_EXTENSION_DRAFT_PROGRESS",
    token: session.token,
    note: "正在准备发布任务，并打开小红书创作者中心。",
  });

  const tab = await chrome.tabs.create({
    url: buildCreatorUrl(session.creatorUrl || CREATOR_URL, {
      apiBaseUrl,
      appTabId,
      sessionToken: session.token,
    }),
    active: true,
  });
  const creatorTabId = tab.id;
  if (typeof creatorTabId !== "number") {
    throw new Error("无法打开小红书创作者中心。");
  }

  await chrome.storage.local.set({
    [PENDING_DRAFT_KEY]: {
      creatorTabId,
      payload: draftDescriptor,
      savedAt: Date.now(),
      token: session.token,
    },
  });

  await waitForTabComplete(creatorTabId);
  await injectCreatorContentScript(creatorTabId);
  await sendMessageWithRetry(
    creatorTabId,
    {
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_CREATOR_RUN_DRAFT_DESCRIPTOR",
      payload: draftDescriptor,
    },
    12,
    800,
  );
}

async function buildDraftPayload(payload) {
  const session = payload?.session;
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim();
  const appTabId = typeof payload?.appTabId === "number" ? payload.appTabId : undefined;
  if (!session?.token || !apiBaseUrl) {
    throw new Error("发布任务描述不完整。");
  }

  const imageFiles = await Promise.all((Array.isArray(session.imageUrls) ? session.imageUrls : []).map(downloadImageAsTransferableFile));
  return {
    apiBaseUrl,
    appTabId,
    imageFiles,
    session,
  };
}

async function resolveDraftPayloadByToken(payload) {
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim().replace(/\/$/, "");
  const sessionToken = String(payload?.sessionToken || "").trim();
  const appTabId = typeof payload?.appTabId === "number" ? payload.appTabId : undefined;
  if (!apiBaseUrl || !sessionToken) {
    throw new Error("按 token 解析发布任务缺少必要字段。");
  }

  const response = await fetch(`${apiBaseUrl}/publishing/xiaohongshu/desktop-sessions/${encodeURIComponent(sessionToken)}`);
  if (!response.ok) {
    throw new Error(`读取桌面发布会话失败：${response.status}`);
  }
  const data = await response.json();
  return buildDraftPayload({
    apiBaseUrl,
    appTabId,
    session: data?.session,
  });
}

async function handleCreatorResult(payload) {
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim().replace(/\/$/, "");
  const sessionToken = String(payload?.sessionToken || "").trim();
  const appTabId = typeof payload?.appTabId === "number" ? payload.appTabId : undefined;
  const success = Boolean(payload?.success);
  const note = String(payload?.note || "").trim();

  if (!apiBaseUrl || !sessionToken) {
    throw new Error("扩展结果缺少必要字段。");
  }

  await fetch(`${apiBaseUrl}/publishing/xiaohongshu/desktop-sessions/${encodeURIComponent(sessionToken)}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      result: success ? "SUCCESS" : "FAILED",
      note: note || (success ? "电脑端扩展已自动写入草稿箱" : "电脑端扩展执行失败"),
    }),
  });

  await notifyApp(appTabId, {
    source: EXTENSION_SOURCE,
    type: success ? "AI_OMNI_XHS_EXTENSION_DRAFT_SUCCESS" : "AI_OMNI_XHS_EXTENSION_DRAFT_FAILED",
    token: sessionToken,
    note,
  });
}

async function notifyApp(tabId, message) {
  if (typeof tabId !== "number") {
    return;
  }
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Ignore app tab notification failures.
  }
}

async function downloadImageAsTransferableFile(url, index) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`配图下载失败：${response.status}`);
  }

  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  return {
    buffer: Array.from(new Uint8Array(buffer)),
    fileName: `xhs-draft-${index + 1}.${inferExtension(blob.type)}`,
    mimeType: blob.type || "image/png",
  };
}

function inferExtension(mimeType) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "png";
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
  throw new Error("小红书创作者页加载超时。");
}

async function injectCreatorContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-script.js"],
  });
}

function buildCreatorUrl(baseUrl, payload) {
  const url = new URL(baseUrl || CREATOR_URL);
  url.hash = new URLSearchParams({
    ai_omni_token: String(payload?.sessionToken || ""),
    ai_omni_api: String(payload?.apiBaseUrl || ""),
    ai_omni_app_tab_id: typeof payload?.appTabId === "number" ? String(payload.appTabId) : "",
  }).toString();
  return url.toString();
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
  throw new Error(lastError || "无法向创作者页发送待发布任务。");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
