const WEB_SOURCE = "ai-omni-ops-web";
const EXTENSION_SOURCE = "ai-omni-wechat-channel-extension";
const PENDING_PUBLISH_KEY = "aiOmniPendingWechatChannelPublish";
const CREATOR_BADGE_ID = "ai-omni-wechat-channel-extension-badge";
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;
let isRunningProbe = false;
let manualComposerWatch = null;

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
}

async function runCreatorProbe(payload) {
  const session = payload?.session || {};
  if (String(session?.mode || "VIDEO") === "VIDEO" && !isVideoComposerReady()) {
    startManualComposerWatch(payload);
    return;
  }

  if (isRunningProbe) {
    return;
  }
  isRunningProbe = true;
  stopManualComposerWatch();
  try {
    updateCreatorBadge("已进入视频号发布页，正在探测页面结构");
    await sleep(1200);
    const automationResult = String(session?.mode || "VIDEO") === "VIDEO"
      ? await runVideoComposerAutomation(session)
      : { note: "当前仅实现视频页最小自动化。" };
    const result = collectProbeResult(session);
    updateCreatorBadge(
      result.ready
        ? automationResult.note || `PoC 探测完成：${result.pageKindLabel}页已命中，上传控件 ${result.fileInputCount} 个`
        : "PoC 探测完成：页面已注入，但未命中稳定发布结构",
    );
    await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_WECHAT_CHANNEL_CREATOR_PROBE_RESULT",
      payload: {
        ...result,
        note: automationResult.note,
        appTabId: payload?.appTabId,
        session,
      },
    });
  } catch (error) {
    const result = collectProbeResult(session);
    const note = error instanceof Error ? error.message : "视频号自动化执行失败";
    updateCreatorBadge(`执行失败：${note}`);
    await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_WECHAT_CHANNEL_CREATOR_PROBE_RESULT",
      payload: {
        ...result,
        note,
        ready: false,
        appTabId: payload?.appTabId,
        session,
      },
    });
    throw error;
  } finally {
    isRunningProbe = false;
  }
}

async function runVideoComposerAutomation(session) {
  const title = String(session?.title || "").trim();
  const content = String(session?.content || "").trim();

  if (title) {
    updateCreatorBadge("已进入发布页，正在填写标题和描述");
    await fillTitle(title);
  }
  if (content) {
    await fillContent(content);
  }

  const videoUrl = String(session?.videoUrl || "").trim();
  if (!videoUrl) {
    return {
      note: "已填写标题和描述，但当前任务没有视频地址，未执行自动上传。",
    };
  }

  updateCreatorBadge("已填写文案，正在下载视频素材");
  const videoFile = await downloadVideoFile(videoUrl, title || "wechat-channel-video");
  updateCreatorBadge("视频下载完成，正在查找上传控件");
  await uploadVideo(videoFile);
  return {
    note: "已尝试上传视频并填写标题描述，请等待视频号解析素材后再人工确认发表。",
  };
}

function collectProbeResult(session) {
  const titleElement = findTitleElement();
  const contentElement = findContentElement();
  const fileInputs = queryAllDeep('input[type="file"]');
  const uploadZone = findVideoUploadZone();
  const buttons = queryAllDeep("button")
    .map((element) => element.textContent?.trim())
    .filter(Boolean);
  const pageKind = detectPageKind();
  return {
    ready: Boolean(titleElement || contentElement || uploadZone || fileInputs.length > 0 || pageKind === "VIDEO"),
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

async function uploadVideo(videoFile) {
  if (!videoFile) {
    throw new Error("当前作品没有可上传的视频。");
  }

  const input = await ensureVideoFileInput();
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(videoFile);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files")?.set;
  if (!setter) {
    throw new Error("当前浏览器不支持自动写入文件。");
  }
  setter.call(input, dataTransfer.files);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(2400);
}

async function ensureVideoFileInput() {
  const existingInput = findVideoFileInput();
  if (existingInput) {
    return existingInput;
  }

  const uploadZone = findVideoUploadZone();
  if (uploadZone instanceof HTMLElement) {
    const clickable = findClickableAncestor(uploadZone) || uploadZone;
    clickable.scrollIntoView({ block: "center", inline: "center" });
    clickable.click();
    await sleep(800);
  }

  return waitFor(() => findVideoFileInput(), 10000, 500, "未找到视频上传控件，请确认当前账号是否有权限在网页端上传视频。");
}

function findVideoFileInput() {
  const inputs = queryAllDeep('input[type="file"]');
  return inputs.find((element) => {
    const accept = String(element.getAttribute("accept") || "").toLowerCase();
    return accept.includes("video") || accept.includes("mp4") || accept.includes("mov") || !accept;
  }) || null;
}

function queryAllDeep(selector, root = document) {
  const results = [];
  const seen = new Set();

  const walk = (currentRoot) => {
    if (!currentRoot || typeof currentRoot.querySelectorAll !== "function") {
      return;
    }

    const matched = Array.from(currentRoot.querySelectorAll(selector));
    for (const element of matched) {
      if (!seen.has(element)) {
        seen.add(element);
        results.push(element);
      }
    }

    const allElements = Array.from(currentRoot.querySelectorAll("*"));
    for (const element of allElements) {
      if (element instanceof HTMLElement && element.shadowRoot) {
        walk(element.shadowRoot);
      }
    }
  };

  const wujieApp = document.querySelector("wujie-app");
  if (wujieApp instanceof HTMLElement && wujieApp.shadowRoot) {
    walk(wujieApp.shadowRoot);
  }
  walk(root);
  return results;
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
    'input[placeholder="概括视频主要内容，字数建议6-16个字符"]',
    'input[placeholder*="标题"]',
    'input[placeholder*="填写"]',
    'input[placeholder*="概括视频主要内容"]',
    'textarea[placeholder*="标题"]',
    '[contenteditable="true"][data-placeholder*="标题"]',
    '[contenteditable="true"][placeholder*="标题"]',
  ];
  return findVisibleElement(selectors);
}

function findContentElement() {
  const selectors = [
    'div[data-placeholder="添加描述"]',
    'div[data-placeholder*="添加描述"]',
    'textarea[placeholder*="添加描述"]',
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

async function fillTitle(value) {
  const target = findTitleElement();
  if (!target) {
    return;
  }
  setElementValue(target, value.slice(0, 32));
  await sleep(300);
}

async function fillContent(value) {
  const target = findContentElement();
  if (!target) {
    return;
  }
  setElementValue(target, value.slice(0, 1000));
  await sleep(300);
}

function isVideoComposerReady() {
  const titleElement = findTitleElement();
  const contentElement = findContentElement();
  const visibleFileInput = findVisibleElement(['input[type="file"]']);
  const uploadZone = findVideoUploadZone();
  const bodyText = String(document.body?.innerText || "");
  const pathName = String(location.pathname || "");
  return Boolean(
    pathName.includes("/platform/post/create")
    || visibleFileInput
    || uploadZone
    || titleElement
    || contentElement
    || bodyText.includes("上传视频")
    || bodyText.includes("发表动态")
    || bodyText.includes("视频管理")
    || bodyText.includes("视频描述")
    || bodyText.includes("短标题")
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
    const elements = queryAllDeep(selector);
    for (const element of elements) {
      if (isVisible(element)) {
        return element;
      }
    }
  }
  return null;
}

function setElementValue(element, value) {
  element.scrollIntoView({ block: "center", inline: "center" });
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus();
    element.value = "";
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    element.focus();
    document.execCommand("selectAll", false);
    document.execCommand("insertText", false, value);
    if (!element.textContent || !element.textContent.trim()) {
      element.textContent = value;
    }
    element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
    return;
  }

  if (element instanceof HTMLDivElement) {
    element.focus();
    try {
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer(),
      });
      pasteEvent.clipboardData?.setData("text/plain", value);
      element.dispatchEvent(pasteEvent);
    } catch {
      element.textContent = value;
      element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
    }
  }
}

function findVideoUploadZone() {
  const selectors = [
    'input[type="file"][accept*="video"]',
    'input[type="file"]',
    '[class*="upload"]',
    '[class*="Upload"]',
    '[data-testid*="upload"]',
  ];

  const zone = findVisibleElement(selectors);
  if (zone) {
    return zone;
  }

  const textCandidates = queryAllDeep("div, span, p");
  for (const element of textCandidates) {
    if (!(element instanceof HTMLElement) || !isVisible(element)) {
      continue;
    }
    const text = String(element.innerText || element.textContent || "").replace(/\s+/g, "");
    if (
      text.includes("上传时长")
      || text.includes("格式为MP4")
      || text.includes("小于2G")
      || text.includes("上传视频")
    ) {
      return element;
    }
  }

  return null;
}

async function downloadVideoFile(videoUrl, title) {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`视频素材下载失败：${response.status}`);
  }
  const blob = await response.blob();
  const extension = guessFileExtension(blob.type || "video/mp4", videoUrl);
  const fileName = `${sanitizeFileName(title || "wechat-channel-video")}.${extension}`;
  return new File([blob], fileName, {
    type: blob.type || "video/mp4",
  });
}

function guessFileExtension(mimeType, videoUrl) {
  const normalized = String(mimeType || "").toLowerCase();
  if (normalized.includes("quicktime")) {
    return "mov";
  }
  if (normalized.includes("webm")) {
    return "webm";
  }
  try {
    const parsed = new URL(String(videoUrl || ""));
    const lastPart = parsed.pathname.split("/").filter(Boolean).pop() || "";
    const matched = lastPart.match(/\.([a-z0-9]+)$/i);
    if (matched?.[1]) {
      return matched[1].toLowerCase();
    }
  } catch {
    // Ignore invalid url and fall back to mp4.
  }
  return "mp4";
}

function sanitizeFileName(value) {
  return String(value || "wechat-channel-video")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "wechat-channel-video";
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

function startManualComposerWatch(payload) {
  const session = payload?.session || {};
  if (String(session?.mode || "VIDEO") !== "VIDEO") {
    return;
  }

  if (isVideoComposerReady()) {
    void runCreatorProbe(payload);
    return;
  }

  stopManualComposerWatch();
  updateCreatorBadge("已打开视频号后台，请手动点击首页右侧“发表视频”。进入发布页后扩展会自动继续接管。");

  const deadline = Date.now() + PENDING_MAX_AGE_MS;
  const tick = () => {
    if (isRunningProbe) {
      return;
    }
    if (isVideoComposerReady()) {
      stopManualComposerWatch();
      void runCreatorProbe(payload);
      return;
    }
    if (Date.now() >= deadline) {
      stopManualComposerWatch();
      updateCreatorBadge("等待手动进入发布页已超时，请回到工作台重新发起视频号任务。");
    }
  };

  const observer = new MutationObserver(() => {
    tick();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  const intervalId = window.setInterval(() => {
    tick();
  }, 1000);

  manualComposerWatch = { observer, intervalId };
}

function stopManualComposerWatch() {
  if (!manualComposerWatch) {
    return;
  }
  manualComposerWatch.observer.disconnect();
  window.clearInterval(manualComposerWatch.intervalId);
  manualComposerWatch = null;
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

async function waitFor(getter, timeoutMs, intervalMs, errorMessage) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = getter();
    if (result) {
      return result;
    }
    await sleep(intervalMs);
  }
  throw new Error(errorMessage);
}
