(() => {
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
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "鎵╁睍鍚姩澶辫触" }));
    return true;
  }

  if (message.type === "AI_OMNI_XHS_CREATOR_DRAFT_RESULT") {
    void handleCreatorResult(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "鎵╁睍缁撴灉鍥炲啓澶辫触" }));
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
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "鏋勫缓鍙戝竷璐熻浇澶辫触" }));
    return true;
  }

  if (message.type === "AI_OMNI_XHS_RESOLVE_DRAFT_BY_TOKEN") {
    void resolveDraftPayloadByToken(message.payload)
      .then((draftPayload) => sendResponse({ draftPayload }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "鎸?token 鏋勫缓鍙戝竷璐熻浇澶辫触" }));
    return true;
  }

  return undefined;
});

async function handleStartDraft(payload, appTabId) {
  const session = payload?.session;
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim();
  if (!session?.token || !apiBaseUrl) {
    throw new Error("鍙戝竷浼氳瘽鏁版嵁涓嶅畬鏁淬€?);
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
    note: "姝ｅ湪鍑嗗鍙戝竷浠诲姟锛屽苟鎵撳紑灏忕孩涔﹀垱浣滆€呬腑蹇冦€?,
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
    throw new Error("鏃犳硶鎵撳紑灏忕孩涔﹀垱浣滆€呬腑蹇冦€?);
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
    throw new Error("鍙戝竷浠诲姟鎻忚堪涓嶅畬鏁淬€?);
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
    throw new Error("鎸?token 瑙ｆ瀽鍙戝竷浠诲姟缂哄皯蹇呰瀛楁銆?);
  }

  const response = await fetch(`${apiBaseUrl}/publishing/xiaohongshu/desktop-sessions/${encodeURIComponent(sessionToken)}`);
  if (!response.ok) {
    throw new Error(`璇诲彇妗岄潰鍙戝竷浼氳瘽澶辫触锛?{response.status}`);
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
    throw new Error("鎵╁睍缁撴灉缂哄皯蹇呰瀛楁銆?);
  }

  await fetch(`${apiBaseUrl}/publishing/xiaohongshu/desktop-sessions/${encodeURIComponent(sessionToken)}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      result: success ? "SUCCESS" : "FAILED",
      note: note || (success ? "鐢佃剳绔墿灞曞凡鑷姩鍐欏叆鑽夌绠? : "鐢佃剳绔墿灞曟墽琛屽け璐?),
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
    throw new Error(`閰嶅浘涓嬭浇澶辫触锛?{response.status}`);
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
  throw new Error("灏忕孩涔﹀垱浣滆€呴〉鍔犺浇瓒呮椂銆?);
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
      lastError = error instanceof Error ? error.message : "鍙戦€佹秷鎭け璐?;
      await sleep(intervalMs);
    }
  }
  throw new Error(lastError || "鏃犳硶鍚戝垱浣滆€呴〉鍙戦€佸緟鍙戝竷浠诲姟銆?);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

})();

(() => {
const EXTENSION_SOURCE = "ai-omni-douyin-extension";
const CREATOR_URL = "https://creator.douyin.com/creator-micro/content/upload?enter_from=dou_web";
const PENDING_PUBLISH_KEY = "aiOmniPendingDouyinPublish";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.source !== EXTENSION_SOURCE) {
    return undefined;
  }

  if (message.type === "AI_OMNI_DOUYIN_EXTENSION_START_PUBLISH") {
    void handleStartPublish(message.payload, sender.tab?.id)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "鎵╁睍鍚姩澶辫触" }));
    return true;
  }

  if (message.type === "AI_OMNI_DOUYIN_CREATOR_PUBLISH_RESULT") {
    void handleCreatorResult(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "鎵╁睍缁撴灉鍥炲啓澶辫触" }));
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
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "鏋勫缓鍙戝竷璐熻浇澶辫触" }));
    return true;
  }

  if (message.type === "AI_OMNI_DOUYIN_RESOLVE_PUBLISH_BY_TOKEN") {
    void resolvePublishPayloadByToken(message.payload)
      .then((publishPayload) => sendResponse({ publishPayload }))
      .catch((error) => sendResponse({ error: error instanceof Error ? error.message : "鎸?token 鏋勫缓鍙戝竷璐熻浇澶辫触" }));
    return true;
  }

  return undefined;
});

async function handleStartPublish(payload, appTabId) {
  const session = payload?.session;
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim();
  if (!session?.token || !apiBaseUrl) {
    throw new Error("鍙戝竷浼氳瘽鏁版嵁涓嶅畬鏁淬€?);
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
    note: "姝ｅ湪鍑嗗鍙戝竷浠诲姟锛屽苟鎵撳紑鎶栭煶鍒涗綔鑰呬腑蹇冦€?,
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
    throw new Error("鏃犳硶鎵撳紑鎶栭煶鍒涗綔鑰呬腑蹇冦€?);
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
  if (!session?.token || !apiBaseUrl) {
    throw new Error("鍙戝竷浠诲姟鎻忚堪涓嶅畬鏁淬€?);
  }

  const videoFile = await downloadFileAsTransferable(session.videoUrl, "douyin-video.mp4", "video/mp4");
  return {
    apiBaseUrl,
    appTabId,
    session,
    videoFile,
  };
}

async function resolvePublishPayloadByToken(payload) {
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim().replace(/\/$/, "");
  const sessionToken = String(payload?.sessionToken || "").trim();
  const appTabId = typeof payload?.appTabId === "number" ? payload.appTabId : undefined;
  if (!apiBaseUrl || !sessionToken) {
    throw new Error("鎸?token 瑙ｆ瀽鍙戝竷浠诲姟缂哄皯蹇呰瀛楁銆?);
  }

  const response = await fetch(`${apiBaseUrl}/publishing/douyin/desktop-sessions/${encodeURIComponent(sessionToken)}`);
  if (!response.ok) {
    throw new Error(`璇诲彇妗岄潰鍙戝竷浼氳瘽澶辫触锛?{response.status}`);
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
    throw new Error("鎵╁睍缁撴灉缂哄皯蹇呰瀛楁銆?);
  }

  await fetch(`${apiBaseUrl}/publishing/douyin/desktop-sessions/${encodeURIComponent(sessionToken)}/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      result: success ? "SUCCESS" : "FAILED",
      note: note || (success ? "鐢佃剳绔墿灞曞凡鑷姩濉啓鎶栭煶鍙戝竷琛ㄥ崟" : "鐢佃剳绔墿灞曟墽琛屽け璐?),
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

async function downloadFileAsTransferable(url, fallbackName, fallbackMimeType) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`绱犳潗涓嬭浇澶辫触锛?{response.status}`);
  }

  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  return {
    buffer: Array.from(new Uint8Array(buffer)),
    fileName: guessFileName(url, fallbackName),
    mimeType: blob.type || fallbackMimeType,
  };
}

function guessFileName(url, fallbackName) {
  try {
    const parsed = new URL(url);
    const lastPart = parsed.pathname.split("/").filter(Boolean).pop() || "";
    if (lastPart.includes(".")) {
      return lastPart;
    }
  } catch {
    // Ignore invalid url and fall back to default name.
  }
  return fallbackName;
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
  throw new Error("鎶栭煶鍒涗綔鑰呴〉鍔犺浇瓒呮椂銆?);
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
      lastError = error instanceof Error ? error.message : "鍙戦€佹秷鎭け璐?;
      await sleep(intervalMs);
    }
  }
  throw new Error(lastError || "鏃犳硶鍚戝垱浣滆€呴〉鍙戦€佸緟鍙戝竷浠诲姟銆?);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

})();

