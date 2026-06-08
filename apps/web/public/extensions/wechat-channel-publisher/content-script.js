const WEB_SOURCE = "ai-omni-ops-web";
const EXTENSION_SOURCE = "ai-omni-wechat-channel-extension";
const PENDING_PUBLISH_KEY = "aiOmniPendingWechatChannelPublish";
const CREATOR_BADGE_ID = "ai-omni-wechat-channel-extension-badge";
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;
let isRunningProbe = false;

if (location.hostname === "channels.weixin.qq.com") {
  setupCreatorBridge();
} else {
  setupWorkspaceBridge();
}

function setupWorkspaceBridge() {
  window.addEventListener("message", (event) => {
    if (event.source !== window) {
      return;
    }
    const payload = event.data;
    if (!payload || payload.source !== WEB_SOURCE) {
      return;
    }

    if (payload.type === "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PING") {
      chrome.runtime.sendMessage(
        {
          source: EXTENSION_SOURCE,
          type: "AI_OMNI_WECHAT_CHANNEL_EXTENSION_HEALTHCHECK",
        },
        (response) => {
          if (chrome.runtime.lastError || !response?.ok) {
            return;
          }
          window.postMessage({ source: EXTENSION_SOURCE, type: "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PONG" }, "*");
        },
      );
      return;
    }

    if (payload.type === "AI_OMNI_WECHAT_CHANNEL_EXTENSION_START_PUBLISH") {
      chrome.runtime.sendMessage(
        {
          source: EXTENSION_SOURCE,
          type: "AI_OMNI_WECHAT_CHANNEL_EXTENSION_START_PUBLISH",
          payload: payload.payload,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            window.postMessage(
              {
                source: EXTENSION_SOURCE,
                type: "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PUBLISH_FAILED",
                note: chrome.runtime.lastError.message,
              },
              "*",
            );
            return;
          }
          if (response?.ok === false) {
            window.postMessage(
              {
                source: EXTENSION_SOURCE,
                type: "AI_OMNI_WECHAT_CHANNEL_EXTENSION_PUBLISH_FAILED",
                note: response.error || "视频号 PoC 扩展执行失败",
              },
              "*",
            );
          }
        },
      );
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.source !== EXTENSION_SOURCE) {
      return;
    }
    window.postMessage(message, "*");
  });
}

function setupCreatorBridge() {
  updateCreatorBadge("视频号 PoC 已注入，等待验证任务");

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.source !== EXTENSION_SOURCE) {
      return undefined;
    }

    if (message.type === "AI_OMNI_WECHAT_CHANNEL_CREATOR_RUN_PROBE") {
      void runCreatorProbe(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "视频号 PoC 失败" }));
      return true;
    }

    return undefined;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    const changed = changes[PENDING_PUBLISH_KEY];
    const payload = changed?.newValue?.payload;
    if (!payload?.session) {
      return;
    }
    void runCreatorProbe(payload);
  });

  void resumePendingPublish();
  void queryPendingPublishFromBackground();
  void probeFromLocationHash();
}

async function runCreatorProbe(payload) {
  if (isRunningProbe) {
    return;
  }
  isRunningProbe = true;
  const session = payload?.session || {};
  try {
    updateCreatorBadge("正在探测视频号页面结构");
    await ensureExpectedPage(session);
    await sleep(1200);
    const result = collectProbeResult(session);
    updateCreatorBadge(
      result.ready
        ? `PoC 探测完成：${result.pageKindLabel}页已命中，上传控件 ${result.fileInputCount} 个`
        : "PoC 探测完成：页面已注入，但未命中稳定发布结构",
    );
    await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_WECHAT_CHANNEL_CREATOR_PROBE_RESULT",
      payload: {
        ...result,
        appTabId: payload?.appTabId,
        session,
      },
    });
  } finally {
    isRunningProbe = false;
  }
}

async function ensureExpectedPage(session) {
  const expectedMode = String(session?.mode || "VIDEO");
  if (expectedMode !== "VIDEO") {
    return;
  }
  if (detectPageKind() === "VIDEO") {
    return;
  }

  updateCreatorBadge("已进入视频号后台，正在尝试打开发表视频页");
  for (let index = 0; index < 6; index += 1) {
    if (detectPageKind() === "VIDEO") {
      return;
    }
    const trigger = findPublishVideoTrigger();
    if (trigger) {
      trigger.click();
    }
    await sleep(1200);
  }
}

function collectProbeResult(session) {
  const titleElement = findTitleElement();
  const contentElement = findContentElement();
  const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
  const buttons = Array.from(document.querySelectorAll("button"))
    .map((element) => element.textContent?.trim())
    .filter(Boolean);
  const pageKind = detectPageKind();
  return {
    ready: Boolean(titleElement || contentElement || fileInputs.length > 0),
    pageKind,
    pageKindLabel: pageKind === "IMAGE_TEXT" ? "图文" : pageKind === "VIDEO" ? "视频" : "未知",
    expectedMode: String(session?.mode || "VIDEO"),
    titleDetected: Boolean(titleElement),
    contentDetected: Boolean(contentElement),
    fileInputCount: fileInputs.length,
    buttonLabels: buttons.slice(0, 12),
    locationHref: location.href,
  };
}

function detectPageKind() {
  const bodyText = String(document.body?.innerText || "");
  if (bodyText.includes("发表图文") || bodyText.includes("图文")) {
    return "IMAGE_TEXT";
  }
  if (bodyText.includes("发表视频") || bodyText.includes("视频")) {
    return "VIDEO";
  }
  return "UNKNOWN";
}

function findPublishVideoTrigger() {
  const candidates = Array.from(document.querySelectorAll("button, a, [role='button']"));
  for (const element of candidates) {
    if (!(element instanceof HTMLElement) || !isVisible(element)) {
      continue;
    }
    const text = String(element.innerText || element.textContent || "").replace(/\s+/g, "");
    if (!text) {
      continue;
    }
    if (text.includes("发表视频")) {
      return element;
    }
  }
  return null;
}

function findTitleElement() {
  const selectors = [
    'input[placeholder*="标题"]',
    'textarea[placeholder*="标题"]',
    '[contenteditable="true"][data-placeholder*="标题"]',
    '[contenteditable="true"][placeholder*="标题"]',
  ];
  return findVisibleElement(selectors);
}

function findContentElement() {
  const selectors = [
    'textarea[placeholder*="描述"]',
    'textarea[placeholder*="正文"]',
    'textarea[placeholder*="内容"]',
    '[contenteditable="true"][data-placeholder*="描述"]',
    '[contenteditable="true"][data-placeholder*="正文"]',
    '[contenteditable="true"][data-placeholder*="内容"]',
    '[contenteditable="true"][placeholder*="描述"]',
    '[contenteditable="true"][placeholder*="正文"]',
    '[contenteditable="true"][placeholder*="内容"]',
  ];
  return findVisibleElement(selectors);
}

function findVisibleElement(selectors) {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));
    for (const element of elements) {
      if (isVisible(element)) {
        return element;
      }
    }
  }
  return null;
}

function isVisible(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

async function resumePendingPublish() {
  const stored = await chrome.storage.local.get(PENDING_PUBLISH_KEY);
  const payload = stored?.[PENDING_PUBLISH_KEY];
  if (!payload?.payload?.session) {
    return;
  }
  if (Date.now() - Number(payload.savedAt || 0) > PENDING_MAX_AGE_MS) {
    updateCreatorBadge("PoC 任务已过期，等待新任务");
    return;
  }
  void runCreatorProbe(payload.payload);
}

async function queryPendingPublishFromBackground() {
  try {
    const response = await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_WECHAT_CHANNEL_QUERY_PENDING_PUBLISH",
    });
    const payload = response?.pendingPublish?.payload;
    if (!payload?.session) {
      return;
    }
    void runCreatorProbe(payload);
  } catch {
    // Ignore probe query failures during PoC.
  }
}

async function probeFromLocationHash() {
  const hash = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
  const mode = hash.get("ai_omni_mode");
  if (!mode) {
    return;
  }
  await runCreatorProbe({
    session: {
      mode,
      title: hash.get("ai_omni_title") || "",
      content: hash.get("ai_omni_content") || "",
    },
  });
}

function updateCreatorBadge(message) {
  let badge = document.getElementById(CREATOR_BADGE_ID);
  if (!badge) {
    badge = document.createElement("div");
    badge.id = CREATOR_BADGE_ID;
    badge.style.position = "fixed";
    badge.style.top = "16px";
    badge.style.left = "16px";
    badge.style.zIndex = "2147483647";
    badge.style.maxWidth = "320px";
    badge.style.padding = "10px 12px";
    badge.style.borderRadius = "12px";
    badge.style.background = "rgba(17, 24, 39, 0.92)";
    badge.style.color = "#ffffff";
    badge.style.fontSize = "12px";
    badge.style.lineHeight = "1.5";
    badge.style.boxShadow = "0 12px 32px rgba(15, 23, 42, 0.28)";
    badge.style.whiteSpace = "pre-wrap";
    document.body.appendChild(badge);
  }
  badge.textContent = `AI全域运营\n${message}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
