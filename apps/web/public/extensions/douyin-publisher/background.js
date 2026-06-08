const EXTENSION_SOURCE = "ai-omni-douyin-extension";
const CREATOR_URL = "https://creator.douyin.com/creator-micro/content/upload?enter_from=dou_web";
const PENDING_PUBLISH_KEY = "aiOmniPendingDouyinPublish";
const DEBUG_SESSION_ID = "unified-publisher-bug";
const DEBUG_RUN_ID = "post-fix";

function reportDebug(apiBaseUrl, hypothesisId, location, msg, data) {
  const debugUrl = resolveDebugUrl(apiBaseUrl);
  if (!debugUrl) {
    return;
  }
  fetch(debugUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      runId: DEBUG_RUN_ID,
      hypothesisId,
      location,
      msg,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
}

function resolveDebugUrl(apiBaseUrl) {
  const base = String(apiBaseUrl || "").trim().replace(/\/$/, "");
  return base ? `${base}/debug/browser-event` : "";
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.source !== EXTENSION_SOURCE) {
    return undefined;
  }

  if (message.type === "AI_OMNI_DOUYIN_EXTENSION_START_PUBLISH") {
    void handleStartPublish(message.payload, sender.tab?.id)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "扩展启动失败" }));
    return true;
  }

  if (message.type === "AI_OMNI_DOUYIN_CREATOR_PUBLISH_RESULT") {
    void handleCreatorResult(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "扩展结果回写失败" }));
    return true;
  }

  if (message.type === "AI_OMNI_DOUYIN_CREATOR_PUBLISH_PROGRESS") {
    void notifyApp(message.payload?.appTabId, {
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_PROGRESS",
      token: message.payload?.token,
      note: message.payload?.note,
    }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "AI_OMNI_DOUYIN_QUERY_PENDING_PUBLISH") {
    void chrome.storage.local
      .get(PENDING_PUBLISH_KEY)
      .then((payload) => sendResponse({ pendingPublish: payload?.[PENDING_PUBLISH_KEY] }))
      .catch(() => sendResponse({ pendingPublish: undefined }));
    return true;
  }

  if (message.type === "AI_OMNI_DOUYIN_EXTENSION_HEALTHCHECK") {
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === "AI_OMNI_DOUYIN_RESOLVE_PUBLISH_PAYLOAD") {
    void buildPublishPayload(message.payload)
      .then((publishPayload) => sendResponse({ publishPayload }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "构建发布负载失败" }));
    return true;
  }

  if (message.type === "AI_OMNI_DOUYIN_RESOLVE_PUBLISH_BY_TOKEN") {
    void resolvePublishPayloadByToken(message.payload)
      .then((publishPayload) => sendResponse({ publishPayload }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "按 token 构建发布负载失败" }));
    return true;
  }

  return undefined;
});

async function handleStartPublish(payload, appTabId) {
  const session = payload?.session;
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim();
  // #region debug-point B:start-publish
  reportDebug(apiBaseUrl, "B", "douyin-publisher/background.js:handleStartPublish", "[DEBUG] handleStartPublish received publish session", {
    hasApiBaseUrl: Boolean(apiBaseUrl),
    hasSession: Boolean(session),
    hasToken: Boolean(session?.token),
    hasVideoUrl: Boolean(session?.videoUrl),
    appTabId: typeof appTabId === "number" ? appTabId : null,
    creatorUrl: session?.creatorUrl || null,
  });
  // #endregion
  if (!session?.token || !apiBaseUrl) {
    throw new Error("发布会话数据不完整。");
  }

  const publishDescriptor = {
    apiBaseUrl,
    appTabId,
    session,
  };

  await notifyApp(appTabId, {
    source: EXTENSION_SOURCE,
    type: "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_STARTED",
    token: session.token,
  });

  await notifyApp(appTabId, {
    source: EXTENSION_SOURCE,
    type: "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_PROGRESS",
    token: session.token,
    note: "正在准备发布任务，并打开抖音创作者中心。",
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
    throw new Error("无法打开抖音创作者中心。");
  }

  await chrome.storage.local.set({
    [PENDING_PUBLISH_KEY]: {
      creatorTabId,
      payload: publishDescriptor,
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
      type: "AI_OMNI_DOUYIN_CREATOR_RUN_PUBLISH_DESCRIPTOR",
      payload: publishDescriptor,
    },
    12,
    800,
  );
}

async function buildPublishPayload(payload) {
  const session = payload?.session;
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim();
  const appTabId = typeof payload?.appTabId === "number" ? payload.appTabId : undefined;
  // #region debug-point B:build-payload
  reportDebug(apiBaseUrl, "B", "douyin-publisher/background.js:buildPublishPayload", "[DEBUG] buildPublishPayload start", {
    hasApiBaseUrl: Boolean(apiBaseUrl),
    hasSession: Boolean(session),
    hasToken: Boolean(session?.token),
    videoUrl: session?.videoUrl || null,
    appTabId: typeof appTabId === "number" ? appTabId : null,
  });
  // #endregion
  if (!session?.token || !apiBaseUrl) {
    throw new Error("发布任务描述不完整。");
  }
  // #region debug-point C:build-payload-done
  reportDebug(apiBaseUrl, "C", "douyin-publisher/background.js:buildPublishPayload", "[DEBUG] buildPublishPayload resolved lightweight session payload", {
    hasVideoUrl: Boolean(session?.videoUrl),
    videoUrl: session?.videoUrl || null,
  });
  // #endregion
  return {
    apiBaseUrl,
    appTabId,
    session,
  };
}

async function resolvePublishPayloadByToken(payload) {
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim().replace(/\/$/, "");
  const sessionToken = String(payload?.sessionToken || "").trim();
  const appTabId = typeof payload?.appTabId === "number" ? payload.appTabId : undefined;
  // #region debug-point B:resolve-by-token
  reportDebug(apiBaseUrl, "B", "douyin-publisher/background.js:resolvePublishPayloadByToken", "[DEBUG] resolvePublishPayloadByToken start", {
    apiBaseUrl,
    hasSessionToken: Boolean(sessionToken),
    appTabId: typeof appTabId === "number" ? appTabId : null,
  });
  // #endregion
  if (!apiBaseUrl || !sessionToken) {
    throw new Error("按 token 解析发布任务缺少必要字段。");
  }

  const response = await fetch(`${apiBaseUrl}/publishing/douyin/desktop-sessions/${encodeURIComponent(sessionToken)}`);
  // #region debug-point B:resolve-by-token-response
  reportDebug(apiBaseUrl, "B", "douyin-publisher/background.js:resolvePublishPayloadByToken", "[DEBUG] resolvePublishPayloadByToken fetched desktop session", {
    status: response.status,
    ok: response.ok,
  });
  // #endregion
  if (!response.ok) {
    throw new Error(`读取桌面发布会话失败：${response.status}`);
  }
  const data = await response.json();
  return buildPublishPayload({
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

  await fetch(`${apiBaseUrl}/publishing/douyin/desktop-sessions/${encodeURIComponent(sessionToken)}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      result: success ? "SUCCESS" : "FAILED",
      note: note || (success ? "电脑端扩展已自动填写抖音发布表单" : "电脑端扩展执行失败"),
    }),
  });

  await notifyApp(appTabId, {
    source: EXTENSION_SOURCE,
    type: success ? "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_SUCCESS" : "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_FAILED",
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

async function waitForTabComplete(tabId, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") {
      return;
    }
    await sleep(500);
  }
  throw new Error("抖音创作者页加载超时。");
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
