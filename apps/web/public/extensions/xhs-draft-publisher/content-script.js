const WEB_SOURCE = "ai-omni-ops-web";
const EXTENSION_SOURCE = "ai-omni-xhs-extension";
const PENDING_DRAFT_KEY = "aiOmniPendingDraft";
const CREATOR_BADGE_ID = "ai-omni-xhs-extension-badge";
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;
let isRunningPendingDraft = false;

if (location.hostname === "creator.xiaohongshu.com") {
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

    if (payload.type === "AI_OMNI_XHS_EXTENSION_PING") {
      window.postMessage({ source: EXTENSION_SOURCE, type: "AI_OMNI_XHS_EXTENSION_PONG" }, "*");
      return;
    }

    if (payload.type === "AI_OMNI_XHS_EXTENSION_START_DRAFT") {
      chrome.runtime.sendMessage(
        {
          source: EXTENSION_SOURCE,
          type: "AI_OMNI_XHS_EXTENSION_START_DRAFT",
          payload: payload.payload,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            window.postMessage(
              {
                source: EXTENSION_SOURCE,
                type: "AI_OMNI_XHS_EXTENSION_DRAFT_FAILED",
                note: chrome.runtime.lastError.message,
              },
              "*",
            );
            return;
          }

          if (response && response.ok === false) {
            window.postMessage(
              {
                source: EXTENSION_SOURCE,
                type: "AI_OMNI_XHS_EXTENSION_DRAFT_FAILED",
                note: response.error || "电脑端发布扩展执行失败",
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

  window.postMessage({ source: EXTENSION_SOURCE, type: "AI_OMNI_XHS_EXTENSION_PONG" }, "*");
}

function setupCreatorBridge() {
  updateCreatorBadge("扩展已注入，等待发布任务");
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.source !== EXTENSION_SOURCE) {
      return undefined;
    }

    if (message.type === "AI_OMNI_XHS_CREATOR_RUN_DRAFT") {
      void runCreatorDraft(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "发布失败" }));
      return true;
    }

    if (message.type === "AI_OMNI_XHS_CREATOR_RUN_DRAFT_DESCRIPTOR") {
      updateCreatorBadge("收到后台直推任务，准备执行");
      void resolveAndRunDraft(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "发布失败" }));
      return true;
    }

    return undefined;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    const changed = changes[PENDING_DRAFT_KEY];
    const payload = changed?.newValue;
    if (!payload?.payload?.session?.token) {
      return;
    }
    updateCreatorBadge("检测到待发布任务，准备开始执行");
    void resolveAndRunDraft(payload.payload);
  });

  void resumePendingDraft();
  void queryPendingDraftFromBackground();
  void resolveDraftFromLocation();
}

async function runCreatorDraft(payload) {
  if (isRunningPendingDraft) {
    return;
  }
  isRunningPendingDraft = true;
  const session = payload?.session;
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim();
  const appTabId = typeof payload?.appTabId === "number" ? payload.appTabId : undefined;
  const imageFiles = Array.isArray(payload?.imageFiles) ? payload.imageFiles : [];
  if (!session?.token) {
    isRunningPendingDraft = false;
    throw new Error("缺少发布会话 token。");
  }

  try {
    updateCreatorBadge("正在切换到图文发布模式");
    await notifyProgress(appTabId, session.token, "已接管创作者页，正在切换到图文发布模式。");
    await ensureImageMode();
    updateCreatorBadge("正在上传配图");
    await notifyProgress(appTabId, session.token, "已进入图文模式，开始上传配图。");
    await uploadImages(imageFiles, session.title || "xiaohongshu-note");
    await waitForEditorReady();
    updateCreatorBadge("正在填写标题和正文");
    await notifyProgress(appTabId, session.token, "配图上传完成，开始填写标题和正文。");
    await fillTitle(session.title || "");
    await fillContent(buildDraftContent(session));
    updateCreatorBadge("正在保存到草稿箱");
    await notifyProgress(appTabId, session.token, "标题和正文已写入，准备保存到草稿箱。");
    await clickSaveDraft();
    await sleep(1800);
    await clearPendingDraft(session.token);
    updateCreatorBadge("已自动保存到草稿箱");

    chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_CREATOR_DRAFT_RESULT",
      payload: {
        apiBaseUrl,
        appTabId,
        note: "已自动保存到草稿箱",
        sessionToken: session.token,
        success: true,
      },
    });
  } catch (error) {
    await clearPendingDraft(session.token);
    updateCreatorBadge(`执行失败：${error instanceof Error ? error.message : "自动发布失败"}`);
    chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_CREATOR_DRAFT_RESULT",
      payload: {
        apiBaseUrl,
        appTabId,
        note: error instanceof Error ? error.message : "自动发布失败",
        sessionToken: session.token,
        success: false,
      },
    });
    throw error;
  } finally {
    isRunningPendingDraft = false;
  }
}

async function ensureImageMode() {
  await sleep(1800);
  if (isImageModeReady()) {
    return;
  }

  const candidates = findImageTabCandidates();
  for (const candidate of candidates) {
    if (isImageModeReady()) {
      break;
    }
    clickElement(candidate);
    await sleep(1200);
  }

  await waitFor(() => isImageModeReady(), 15000, 600, "切换到图文发布模式失败");
  const fileInput = await waitFor(() => findFileInput(), 15000, 600, "未找到图文上传控件");
  fileInput.scrollIntoView({ block: "center", behavior: "smooth" });
}

async function uploadImages(imageFiles, title) {
  if (!Array.isArray(imageFiles) || !imageFiles.length) {
    throw new Error("当前作品没有可上传的配图。");
  }

  const input = await waitFor(() => findFileInput(), 20000, 500, "未找到图文上传控件");
  const files = [];
  for (let index = 0; index < imageFiles.length; index += 1) {
    files.push(createFileFromTransferable(imageFiles[index], `${sanitizeFileName(title)}-${index + 1}.png`));
  }

  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
  }

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files")?.set;
  if (!setter) {
    throw new Error("浏览器不支持文件控件自动写入。");
  }
  setter.call(input, dataTransfer.files);
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(Math.max(5000, files.length * 1600));
}

async function waitForEditorReady() {
  await waitFor(() => findTitleElement() && findContentElement(), 30000, 800, "未找到标题或正文编辑区");
}

async function fillTitle(value) {
  const target = findTitleElement();
  if (!target) {
    throw new Error("未找到标题输入框。");
  }
  setElementValue(target, value.slice(0, 20));
  await sleep(300);
}

async function fillContent(value) {
  const target = findContentElement();
  if (!target) {
    throw new Error("未找到正文输入区。");
  }
  setElementValue(target, value);
  await sleep(300);
}

async function clickSaveDraft() {
  const button = await waitFor(
    () => findElementByText(["保存到草稿箱", "保存到草稿", "保存草稿"]),
    15000,
    500,
    "未找到保存草稿按钮",
  );
  button.click();
}

function findFileInput() {
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  return inputs.find((element) => {
    const accept = String(element.getAttribute("accept") || "");
    return accept.includes("image") || accept.includes("png") || accept.includes("jpeg");
  });
}

function findImageTabCandidates() {
  const base = Array.from(document.querySelectorAll('[role="tab"], button, span, div, li'));
  const matched = [];

  for (const element of base) {
    const text = String(element.textContent || "").trim();
    if (!isVisible(element)) {
      continue;
    }
    if (text !== "上传图文" && text !== "图文") {
      continue;
    }

    const chain = [
      element,
      element.closest('[role="tab"]'),
      element.closest("button"),
      element.closest("li"),
      element.parentElement,
      element.parentElement?.parentElement,
      element.parentElement?.parentElement?.parentElement,
    ].filter(Boolean);

    for (const item of chain) {
      if (item && !matched.includes(item)) {
        matched.push(item);
      }
    }
  }

  return matched;
}

function isImageModeReady() {
  const bodyText = document.body?.innerText || "";
  if (bodyText.includes("拖拽图片到此处") || bodyText.includes("上传图片")) {
    return true;
  }

  const input = findFileInput();
  if (!input) {
    return false;
  }

  const accept = String(input.getAttribute("accept") || "");
  return accept.includes("image") || accept.includes("png") || accept.includes("jpeg");
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
    'textarea[placeholder*="正文"]',
    '[contenteditable="true"][data-placeholder*="正文"]',
    '[contenteditable="true"][placeholder*="正文"]',
    '[contenteditable="true"]',
  ];
  return findVisibleElement(selectors, (element) => !matchesTitleElement(element));
}

function matchesTitleElement(element) {
  const placeholder = String(element.getAttribute("placeholder") || element.getAttribute("data-placeholder") || "");
  return placeholder.includes("标题");
}

function findVisibleElement(selectors, predicate = () => true) {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll(selector));
    for (const element of elements) {
      if (!isVisible(element)) {
        continue;
      }
      if (predicate(element)) {
        return element;
      }
    }
  }
  return null;
}

function findElementByText(textList) {
  const candidates = Array.from(document.querySelectorAll("button, span, div"));
  for (const text of textList) {
    const matched = candidates.find((element) => isVisible(element) && element.textContent && element.textContent.includes(text));
    if (matched) {
      return matched.closest("button") || matched;
    }
  }
  return null;
}

function setElementValue(element, value) {
  element.scrollIntoView({ block: "center", behavior: "smooth" });
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
  }
}

function clickElement(element) {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  element.scrollIntoView({ block: "center", behavior: "smooth" });
  element.focus?.();
  element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  element.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  element.click();
}

function createFileFromTransferable(item, fallbackName) {
  const buffer = Array.isArray(item?.buffer) ? new Uint8Array(item.buffer) : new Uint8Array();
  const blob = new Blob([buffer], {
    type: String(item?.mimeType || "image/png"),
  });
  const fileName = String(item?.fileName || fallbackName || "xhs-draft.png");
  return new File([blob], fileName, {
    type: blob.type || "image/png",
  });
}

async function resumePendingDraft() {
  const stored = await chrome.storage.local.get(PENDING_DRAFT_KEY);
  const payload = stored?.[PENDING_DRAFT_KEY];
  if (!payload) {
    updateCreatorBadge("扩展已注入，未在本地存储发现待发布任务");
    return;
  }
  if (!payload?.payload?.session?.token) {
    updateCreatorBadge("待发布任务存在，但缺少会话 token");
    return;
  }

  if (Date.now() - Number(payload.savedAt || 0) > PENDING_MAX_AGE_MS) {
    updateCreatorBadge("待发布任务已过期，等待新任务");
    return;
  }

  updateCreatorBadge("从本地存储恢复到待发布任务，准备执行");
  await sleep(1200);
  void resolveAndRunDraft(payload.payload);
}

async function clearPendingDraft(token) {
  const stored = await chrome.storage.local.get(PENDING_DRAFT_KEY);
  if (stored?.[PENDING_DRAFT_KEY]?.token === token) {
    await chrome.storage.local.remove(PENDING_DRAFT_KEY);
  }
}

async function notifyProgress(appTabId, token, note) {
  try {
    await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_CREATOR_DRAFT_PROGRESS",
      payload: {
        appTabId,
        token,
        note,
      },
    });
  } catch {
    // Ignore progress notification failures.
  }
}

async function queryPendingDraftFromBackground() {
  try {
    const response = await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_QUERY_PENDING_DRAFT",
    });
    const payload = response?.pendingDraft;
    if (!payload?.payload?.session?.token) {
      return;
    }
    if (Date.now() - Number(payload.savedAt || 0) > PENDING_MAX_AGE_MS) {
      return;
    }
    updateCreatorBadge("从后台查询到待发布任务，准备执行");
    void resolveAndRunDraft(payload.payload);
  } catch {
    // Ignore query failures and keep waiting.
  }
}

async function resolveAndRunDraft(payload) {
  try {
    updateCreatorBadge("正在向扩展后台获取完整发布素材");
    const response = await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_RESOLVE_DRAFT_PAYLOAD",
      payload,
    });
    if (response?.error) {
      throw new Error(String(response.error));
    }
    if (!response?.draftPayload?.session?.token) {
      throw new Error("后台未返回完整发布任务。");
    }
    updateCreatorBadge("完整发布素材已就绪，准备执行");
    await runCreatorDraft(response.draftPayload);
  } catch (error) {
    updateCreatorBadge(`执行前准备失败：${error instanceof Error ? error.message : "未知错误"}`);
  }
}

async function resolveDraftFromLocation() {
  try {
    const hash = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
    const sessionToken = hash.get("ai_omni_token") || "";
    const apiBaseUrl = hash.get("ai_omni_api") || "";
    const appTabIdRaw = hash.get("ai_omni_app_tab_id") || "";
    if (!sessionToken || !apiBaseUrl) {
      return;
    }
    const appTabId = /^\d+$/.test(appTabIdRaw) ? Number(appTabIdRaw) : undefined;
    updateCreatorBadge("从页面地址读取到待发布任务，正在向后台获取完整素材");
    const response = await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_RESOLVE_DRAFT_BY_TOKEN",
      payload: {
        sessionToken,
        apiBaseUrl,
        appTabId,
      },
    });
    if (response?.error) {
      throw new Error(String(response.error));
    }
    if (!response?.draftPayload?.session?.token) {
      throw new Error("按页面地址读取到的任务未返回完整负载。");
    }
    updateCreatorBadge("已从页面地址解析到完整任务，准备执行");
    await runCreatorDraft(response.draftPayload);
  } catch (error) {
    updateCreatorBadge(`页面地址任务解析失败：${error instanceof Error ? error.message : "未知错误"}`);
  }
}

function buildDraftContent(session) {
  const content = String(session?.content || "").trim();
  const hashtags = Array.isArray(session?.hashtags) ? session.hashtags.filter(Boolean) : [];
  if (!hashtags.length) {
    return content;
  }
  const normalizedTags = hashtags.map((item) => (String(item).startsWith("#") ? String(item) : `#${item}`));
  return `${content}\n\n${normalizedTags.join(" ")}`.trim();
}

function sanitizeFileName(value) {
  return String(value || "xiaohongshu-note")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 40);
}

function isVisible(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
}

function updateCreatorBadge(text) {
  if (typeof document === "undefined") {
    return;
  }

  const mount = document.body || document.documentElement;
  if (!mount) {
    return;
  }

  let badge = document.getElementById(CREATOR_BADGE_ID);
  if (!badge) {
    badge = document.createElement("div");
    badge.id = CREATOR_BADGE_ID;
    Object.assign(badge.style, {
      position: "fixed",
      top: "16px",
      left: "16px",
      zIndex: "2147483647",
      maxWidth: "320px",
      padding: "10px 12px",
      borderRadius: "10px",
      background: "rgba(20, 23, 31, 0.88)",
      color: "#fff",
      fontSize: "12px",
      lineHeight: "1.5",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
      pointerEvents: "none",
      whiteSpace: "pre-wrap",
    });
    mount.appendChild(badge);
  }

  badge.textContent = `AI发布扩展\n${text}`;
}

async function waitFor(getter, timeoutMs, intervalMs, errorMessage) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = getter();
    if (value) {
      return value;
    }
    await sleep(intervalMs);
  }
  throw new Error(errorMessage);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
