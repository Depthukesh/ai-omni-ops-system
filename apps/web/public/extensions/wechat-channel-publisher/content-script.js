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
  if (isVideoComposerReady()) {
    return;
  }

  updateCreatorBadge("已进入视频号后台，正在尝试打开发表视频页");
  for (let index = 0; index < 8; index += 1) {
    if (isVideoComposerReady()) {
      return;
    }
    const trigger = findPublishVideoTrigger();
    if (trigger) {
      const jumped = tryDirectNavigateFromTrigger(trigger);
      if (jumped) {
        updateCreatorBadge(`已命中“发表视频”入口，正在直达发布页（第 ${index + 1} 次）`);
      } else {
        triggerPublishVideo(trigger);
        updateCreatorBadge(`已命中“发表视频”入口，正在尝试进入发布页（第 ${index + 1} 次）`);
      }
    } else {
      updateCreatorBadge(`未找到“发表视频”入口，继续重试中（第 ${index + 1} 次）`);
    }
    await sleep(1500);
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
  if (isImageTextComposerReady()) {
    return "IMAGE_TEXT";
  }
  if (isVideoComposerReady()) {
    return "VIDEO";
  }
  if (bodyText.includes("发表图文") || bodyText.includes("图文")) {
    return "IMAGE_TEXT";
  }
  return "UNKNOWN";
}

function findPublishVideoTrigger() {
  const candidates = Array.from(document.querySelectorAll("button, a, [role='button'], div, span"));
  for (const element of candidates) {
    if (!(element instanceof HTMLElement) || !isVisible(element)) {
      continue;
    }
    const text = String(element.innerText || element.textContent || "").replace(/\s+/g, "");
    if (!text) {
      continue;
    }
    if (text === "发表视频" || text.includes("发表视频")) {
      return findClickableAncestor(element);
    }
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = String(node.textContent || "").replace(/\s+/g, "");
      return text.includes("发表视频") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    const parent = currentNode.parentElement;
    if (parent && isVisible(parent)) {
      const clickable = findClickableAncestor(parent);
      if (clickable) {
        return clickable;
      }
    }
    currentNode = walker.nextNode();
  }

  return findPublishVideoByViewportHint();
}

function triggerPublishVideo(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  element.scrollIntoView({ block: "center", inline: "center" });
  const rect = element.getBoundingClientRect();
  const target = document.elementFromPoint(
    Math.min(Math.max(rect.left + rect.width / 2, 1), window.innerWidth - 1),
    Math.min(Math.max(rect.top + rect.height / 2, 1), window.innerHeight - 1),
  );
  const clickableTarget = target instanceof HTMLElement ? findClickableAncestor(target) || target : element;
  clickableTarget.focus?.();
  clickableTarget.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "mouse" }));
  element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerType: "mouse" }));
  element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  clickableTarget.click();
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

function isVideoComposerReady() {
  const titleElement = findTitleElement();
  const contentElement = findContentElement();
  const visibleFileInput = findVisibleElement(['input[type="file"]']);
  const bodyText = String(document.body?.innerText || "");
  return Boolean(
    visibleFileInput
    || titleElement
    || contentElement
    || bodyText.includes("上传视频")
    || bodyText.includes("拖拽视频到此处")
    || bodyText.includes("添加描述")
    || bodyText.includes("视频简介"),
  );
}

function isImageTextComposerReady() {
  const bodyText = String(document.body?.innerText || "");
  return Boolean(
    bodyText.includes("上传图片")
    || bodyText.includes("拖拽图片到此处")
    || bodyText.includes("添加图片")
    || bodyText.includes("发表图文"),
  );
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

function findClickableAncestor(element) {
  let current = element;
  while (current && current !== document.body) {
    if (isClickableElement(current) && isVisible(current)) {
      return current;
    }
    current = current.parentElement;
  }
  return element instanceof HTMLElement && isVisible(element) ? element : null;
}

function tryDirectNavigateFromTrigger(element) {
  const target = extractNavigationTarget(element);
  if (!target) {
    return false;
  }
  try {
    const url = new URL(target, location.origin);
    if (url.origin !== location.origin) {
      return false;
    }
    if (url.href === location.href) {
      return false;
    }
    location.assign(url.href);
    return true;
  } catch {
    return false;
  }
}

function extractNavigationTarget(element) {
  let current = element;
  while (current && current !== document.body) {
    if (!(current instanceof HTMLElement)) {
      break;
    }
    const attrNames = ["href", "data-href", "data-url", "data-link", "data-route", "to"];
    for (const attrName of attrNames) {
      const value = String(current.getAttribute(attrName) || "").trim();
      if (!value) {
        continue;
      }
      if (value.startsWith("/") || value.startsWith("http")) {
        return value;
      }
    }
    if (current instanceof HTMLAnchorElement && current.href) {
      return current.href;
    }
    current = current.parentElement;
  }
  return null;
}

function isClickableElement(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const role = String(element.getAttribute("role") || "").toLowerCase();
  const tagName = element.tagName.toLowerCase();
  const style = window.getComputedStyle(element);
  return Boolean(
    tagName === "button"
    || tagName === "a"
    || role === "button"
    || typeof element.onclick === "function"
    || element.tabIndex >= 0
    || style.cursor === "pointer",
  );
}

function findPublishVideoByViewportHint() {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const candidates = Array.from(document.querySelectorAll("*"));
  let bestMatch = null;

  for (const element of candidates) {
    if (!(element instanceof HTMLElement) || !isVisible(element)) {
      continue;
    }
    const text = String(element.innerText || element.textContent || "").replace(/\s+/g, "");
    if (!text.includes("发表视频")) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    const clickable = findClickableAncestor(element);
    if (!clickable) {
      continue;
    }
    if (rect.left < viewportWidth * 0.55) {
      continue;
    }
    bestMatch = clickable;
    break;
  }

  return bestMatch;
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
