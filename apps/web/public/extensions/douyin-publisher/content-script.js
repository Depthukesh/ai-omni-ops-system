const WEB_SOURCE = "ai-omni-ops-web";
const EXTENSION_SOURCE = "ai-omni-douyin-extension";
const PENDING_PUBLISH_KEY = "aiOmniPendingDouyinPublish";
const CREATOR_BADGE_ID = "ai-omni-douyin-extension-badge";
const PENDING_MAX_AGE_MS = 10 * 60 * 1000;
let isRunningPendingPublish = false;

if (location.hostname === "creator.douyin.com") {
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

    if (payload.type === "AI_OMNI_DOUYIN_EXTENSION_PING") {
      chrome.runtime.sendMessage(
        {
          source: EXTENSION_SOURCE,
          type: "AI_OMNI_DOUYIN_EXTENSION_HEALTHCHECK",
        },
        (response) => {
          if (chrome.runtime.lastError || !response?.ok) {
            return;
          }
          window.postMessage({ source: EXTENSION_SOURCE, type: "AI_OMNI_DOUYIN_EXTENSION_PONG" }, "*");
        },
      );
      return;
    }

    if (payload.type === "AI_OMNI_DOUYIN_EXTENSION_START_PUBLISH") {
      chrome.runtime.sendMessage(
        {
          source: EXTENSION_SOURCE,
          type: "AI_OMNI_DOUYIN_EXTENSION_START_PUBLISH",
          payload: payload.payload,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            window.postMessage(
              {
                source: EXTENSION_SOURCE,
                type: "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_FAILED",
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
                type: "AI_OMNI_DOUYIN_EXTENSION_PUBLISH_FAILED",
                note: response.error || "电脑端辅助发布扩展执行失败",
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

  chrome.runtime.sendMessage(
    {
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_EXTENSION_HEALTHCHECK",
    },
    (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        return;
      }
      window.postMessage({ source: EXTENSION_SOURCE, type: "AI_OMNI_DOUYIN_EXTENSION_PONG" }, "*");
    },
  );
}

function setupCreatorBridge() {
  updateCreatorBadge("扩展已注入，等待发布任务");
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.source !== EXTENSION_SOURCE) {
      return undefined;
    }

    if (message.type === "AI_OMNI_DOUYIN_CREATOR_RUN_PUBLISH_DESCRIPTOR") {
      updateCreatorBadge("收到后台直推任务，准备执行");
      void resolveAndRunPublish(message.payload)
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
    const changed = changes[PENDING_PUBLISH_KEY];
    const payload = changed?.newValue;
    if (!payload?.payload?.session?.token) {
      return;
    }
    updateCreatorBadge("检测到待发布任务，准备开始执行");
    void resolveAndRunPublish(payload.payload);
  });

  void resumePendingPublish();
  void queryPendingPublishFromBackground();
  void resolvePublishFromLocation();
}

async function runCreatorPublish(payload) {
  if (isRunningPendingPublish) {
    return;
  }
  isRunningPendingPublish = true;
  const session = payload?.session;
  const apiBaseUrl = String(payload?.apiBaseUrl || "").trim();
  const appTabId = typeof payload?.appTabId === "number" ? payload.appTabId : undefined;
  const videoFile = payload?.videoFile;
  if (!session?.token) {
    isRunningPendingPublish = false;
    throw new Error("缺少发布会话 token。");
  }

  try {
    updateCreatorBadge("正在查找视频上传控件");
    await notifyProgress(appTabId, session.token, "已接管创作者页，正在准备上传视频。");
    await uploadVideo(videoFile, session.title || "douyin-video");
    updateCreatorBadge("视频上传中，等待表单可编辑");
    await notifyProgress(appTabId, session.token, "视频已开始上传，正在等待抖音创作者中心解析素材。");
    await waitForEditorReady();
    updateCreatorBadge("正在填写标题和描述");
    await notifyProgress(appTabId, session.token, "发布表单已可编辑，开始填写标题和描述。");
    await fillTitle(session.title || "");
    await fillContent(buildPublishContent(session));
    await clearPendingPublish(session.token);
    updateCreatorBadge("已填写发布信息，请人工确认后点击发布");

    chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_CREATOR_PUBLISH_RESULT",
      payload: {
        apiBaseUrl,
        appTabId,
        note: "已自动上传视频并填写标题描述，请在抖音创作者中心确认后手动点击发布。",
        sessionToken: session.token,
        success: true,
      },
    });
  } catch (error) {
    await clearPendingPublish(session.token);
    updateCreatorBadge(`执行失败：${error instanceof Error ? error.message : "自动发布失败"}`);
    chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_CREATOR_PUBLISH_RESULT",
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
    isRunningPendingPublish = false;
  }
}

async function uploadVideo(videoFile, title) {
  if (!videoFile) {
    throw new Error("当前作品没有可上传的视频。");
  }

  const input = await waitFor(() => findVideoFileInput(), 30000, 600, "未找到视频上传控件");
  const file = createFileFromTransferable(videoFile, `${sanitizeFileName(title)}.mp4`);
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files")?.set;
  if (!setter) {
    throw new Error("浏览器不支持文件控件自动写入。");
  }
  setter.call(input, dataTransfer.files);
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(2400);
}

async function waitForEditorReady() {
  await waitFor(() => findTitleElement() || findContentElement(), 90000, 1200, "等待抖音发布表单可编辑超时");
}

async function fillTitle(value) {
  const target = findTitleElement();
  if (!target) {
    return;
  }
  setElementValue(target, value.slice(0, 30));
  await sleep(300);
}

async function fillContent(value) {
  const target = await waitFor(() => findContentElement(), 30000, 800, "未找到描述输入区");
  setElementValue(target, value.slice(0, 2200));
  await sleep(300);
}

function findVideoFileInput() {
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  return inputs.find((element) => {
    const accept = String(element.getAttribute("accept") || "").toLowerCase();
    return accept.includes("video") || accept.includes("mp4") || accept.includes("mov") || !accept;
  });
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
    'textarea[placeholder*="简介"]',
    '[contenteditable="true"][data-placeholder*="描述"]',
    '[contenteditable="true"][data-placeholder*="简介"]',
    '[contenteditable="true"][placeholder*="描述"]',
    '[contenteditable="true"][placeholder*="简介"]',
    'textarea[maxlength]',
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

function createFileFromTransferable(item, fallbackName) {
  const buffer = Array.isArray(item?.buffer) ? new Uint8Array(item.buffer) : new Uint8Array();
  const blob = new Blob([buffer], {
    type: String(item?.mimeType || "video/mp4"),
  });
  const fileName = String(item?.fileName || fallbackName || "douyin-video.mp4");
  return new File([blob], fileName, {
    type: blob.type || "video/mp4",
  });
}

async function resumePendingPublish() {
  const stored = await chrome.storage.local.get(PENDING_PUBLISH_KEY);
  const payload = stored?.[PENDING_PUBLISH_KEY];
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
  void resolveAndRunPublish(payload.payload);
}

async function clearPendingPublish(token) {
  const stored = await chrome.storage.local.get(PENDING_PUBLISH_KEY);
  if (stored?.[PENDING_PUBLISH_KEY]?.token === token) {
    await chrome.storage.local.remove(PENDING_PUBLISH_KEY);
  }
}

async function notifyProgress(appTabId, token, note) {
  try {
    await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_CREATOR_PUBLISH_PROGRESS",
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

async function queryPendingPublishFromBackground() {
  try {
    const response = await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_QUERY_PENDING_PUBLISH",
    });
    const payload = response?.pendingPublish;
    if (!payload?.payload?.session?.token) {
      return;
    }
    if (Date.now() - Number(payload.savedAt || 0) > PENDING_MAX_AGE_MS) {
      return;
    }
    updateCreatorBadge("从后台查询到待发布任务，准备执行");
    void resolveAndRunPublish(payload.payload);
  } catch {
    // Ignore query failures and keep waiting.
  }
}

async function resolveAndRunPublish(payload) {
  try {
    updateCreatorBadge("正在向扩展后台获取完整发布素材");
    const response = await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_RESOLVE_PUBLISH_PAYLOAD",
      payload,
    });
    if (response?.error) {
      throw new Error(String(response.error));
    }
    if (!response?.publishPayload?.session?.token) {
      throw new Error("后台未返回完整发布任务。");
    }
    updateCreatorBadge("完整发布素材已就绪，准备执行");
    await runCreatorPublish(response.publishPayload);
  } catch (error) {
    updateCreatorBadge(`执行前准备失败：${error instanceof Error ? error.message : "未知错误"}`);
  }
}

async function resolvePublishFromLocation() {
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
      type: "AI_OMNI_DOUYIN_RESOLVE_PUBLISH_BY_TOKEN",
      payload: {
        sessionToken,
        apiBaseUrl,
        appTabId,
      },
    });
    if (response?.error) {
      throw new Error(String(response.error));
    }
    if (!response?.publishPayload?.session?.token) {
      throw new Error("按页面地址读取到的任务未返回完整负载。");
    }
    updateCreatorBadge("已从页面地址解析到完整任务，准备执行");
    await runCreatorPublish(response.publishPayload);
  } catch (error) {
    updateCreatorBadge(`页面地址任务解析失败：${error instanceof Error ? error.message : "未知错误"}`);
  }
}

function buildPublishContent(session) {
  const content = String(session?.content || "").trim();
  const hashtags = Array.isArray(session?.hashtags) ? session.hashtags.filter(Boolean) : [];
  if (!hashtags.length) {
    return content;
  }
  const normalizedTags = hashtags.map((item) => (String(item).startsWith("#") ? String(item) : `#${item}`));
  return `${content}\n\n${normalizedTags.join(" ")}`.trim();
}

function sanitizeFileName(value) {
  return String(value || "douyin-video")
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
      maxWidth: "340px",
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
