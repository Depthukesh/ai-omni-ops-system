(() => {
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
      chrome.runtime.sendMessage(
        {
          source: EXTENSION_SOURCE,
          type: "AI_OMNI_XHS_EXTENSION_HEALTHCHECK",
        },
        (response) => {
          if (chrome.runtime.lastError || !response?.ok) {
            return;
          }
          window.postMessage({ source: EXTENSION_SOURCE, type: "AI_OMNI_XHS_EXTENSION_PONG" }, "*");
        },
      );
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
                note: response.error || "鐢佃剳绔彂甯冩墿灞曟墽琛屽け璐?,
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
      type: "AI_OMNI_XHS_EXTENSION_HEALTHCHECK",
    },
    (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        return;
      }
      window.postMessage({ source: EXTENSION_SOURCE, type: "AI_OMNI_XHS_EXTENSION_PONG" }, "*");
    },
  );
}

function setupCreatorBridge() {
  updateCreatorBadge("鎵╁睍宸叉敞鍏ワ紝绛夊緟鍙戝竷浠诲姟");
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.source !== EXTENSION_SOURCE) {
      return undefined;
    }

    if (message.type === "AI_OMNI_XHS_CREATOR_RUN_DRAFT") {
      void runCreatorDraft(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "鍙戝竷澶辫触" }));
      return true;
    }

    if (message.type === "AI_OMNI_XHS_CREATOR_RUN_DRAFT_DESCRIPTOR") {
      updateCreatorBadge("鏀跺埌鍚庡彴鐩存帹浠诲姟锛屽噯澶囨墽琛?);
      void resolveAndRunDraft(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "鍙戝竷澶辫触" }));
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
    updateCreatorBadge("妫€娴嬪埌寰呭彂甯冧换鍔★紝鍑嗗寮€濮嬫墽琛?);
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
    throw new Error("缂哄皯鍙戝竷浼氳瘽 token銆?);
  }

  try {
    updateCreatorBadge("姝ｅ湪鍒囨崲鍒板浘鏂囧彂甯冩ā寮?);
    await notifyProgress(appTabId, session.token, "宸叉帴绠″垱浣滆€呴〉锛屾鍦ㄥ垏鎹㈠埌鍥炬枃鍙戝竷妯″紡銆?);
    await ensureImageMode();
    updateCreatorBadge("姝ｅ湪涓婁紶閰嶅浘");
    await notifyProgress(appTabId, session.token, "宸茶繘鍏ュ浘鏂囨ā寮忥紝寮€濮嬩笂浼犻厤鍥俱€?);
    await uploadImages(imageFiles, session.title || "xiaohongshu-note");
    await waitForEditorReady();
    updateCreatorBadge("姝ｅ湪濉啓鏍囬鍜屾鏂?);
    await notifyProgress(appTabId, session.token, "閰嶅浘涓婁紶瀹屾垚锛屽紑濮嬪～鍐欐爣棰樺拰姝ｆ枃銆?);
    await fillTitle(session.title || "");
    await fillContent(buildDraftContent(session));
    updateCreatorBadge("姝ｅ湪淇濆瓨鍒拌崏绋跨");
    await notifyProgress(appTabId, session.token, "鏍囬鍜屾鏂囧凡鍐欏叆锛屽噯澶囦繚瀛樺埌鑽夌绠便€?);
    await clickSaveDraft();
    await sleep(1800);
    await clearPendingDraft(session.token);
    updateCreatorBadge("宸茶嚜鍔ㄤ繚瀛樺埌鑽夌绠?);

    chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_CREATOR_DRAFT_RESULT",
      payload: {
        apiBaseUrl,
        appTabId,
        note: "宸茶嚜鍔ㄤ繚瀛樺埌鑽夌绠?,
        sessionToken: session.token,
        success: true,
      },
    });
  } catch (error) {
    await clearPendingDraft(session.token);
    updateCreatorBadge(`鎵ц澶辫触锛?{error instanceof Error ? error.message : "鑷姩鍙戝竷澶辫触"}`);
    chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_CREATOR_DRAFT_RESULT",
      payload: {
        apiBaseUrl,
        appTabId,
        note: error instanceof Error ? error.message : "鑷姩鍙戝竷澶辫触",
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

  await waitFor(() => isImageModeReady(), 15000, 600, "鍒囨崲鍒板浘鏂囧彂甯冩ā寮忓け璐?);
  const fileInput = await waitFor(() => findFileInput(), 15000, 600, "鏈壘鍒板浘鏂囦笂浼犳帶浠?);
  fileInput.scrollIntoView({ block: "center", behavior: "smooth" });
}

async function uploadImages(imageFiles, title) {
  if (!Array.isArray(imageFiles) || !imageFiles.length) {
    throw new Error("褰撳墠浣滃搧娌℃湁鍙笂浼犵殑閰嶅浘銆?);
  }

  const input = await waitFor(() => findFileInput(), 20000, 500, "鏈壘鍒板浘鏂囦笂浼犳帶浠?);
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
    throw new Error("娴忚鍣ㄤ笉鏀寔鏂囦欢鎺т欢鑷姩鍐欏叆銆?);
  }
  setter.call(input, dataTransfer.files);
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(Math.max(5000, files.length * 1600));
}

async function waitForEditorReady() {
  await waitFor(() => findTitleElement() && findContentElement(), 30000, 800, "鏈壘鍒版爣棰樻垨姝ｆ枃缂栬緫鍖?);
}

async function fillTitle(value) {
  const target = findTitleElement();
  if (!target) {
    throw new Error("鏈壘鍒版爣棰樿緭鍏ユ銆?);
  }
  setElementValue(target, value.slice(0, 20));
  await sleep(300);
}

async function fillContent(value) {
  const target = findContentElement();
  if (!target) {
    throw new Error("鏈壘鍒版鏂囪緭鍏ュ尯銆?);
  }
  setElementValue(target, value);
  await sleep(300);
}

async function clickSaveDraft() {
  const button = await waitFor(
    () => findElementByText(["淇濆瓨鍒拌崏绋跨", "淇濆瓨鍒拌崏绋?, "淇濆瓨鑽夌"]),
    15000,
    500,
    "鏈壘鍒颁繚瀛樿崏绋挎寜閽?,
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
    if (text !== "涓婁紶鍥炬枃" && text !== "鍥炬枃") {
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
  if (bodyText.includes("鎷栨嫿鍥剧墖鍒版澶?) || bodyText.includes("涓婁紶鍥剧墖")) {
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
    'input[placeholder*="鏍囬"]',
    'textarea[placeholder*="鏍囬"]',
    '[contenteditable="true"][data-placeholder*="鏍囬"]',
    '[contenteditable="true"][placeholder*="鏍囬"]',
  ];
  return findVisibleElement(selectors);
}

function findContentElement() {
  const selectors = [
    'textarea[placeholder*="姝ｆ枃"]',
    '[contenteditable="true"][data-placeholder*="姝ｆ枃"]',
    '[contenteditable="true"][placeholder*="姝ｆ枃"]',
    '[contenteditable="true"]',
  ];
  return findVisibleElement(selectors, (element) => !matchesTitleElement(element));
}

function matchesTitleElement(element) {
  const placeholder = String(element.getAttribute("placeholder") || element.getAttribute("data-placeholder") || "");
  return placeholder.includes("鏍囬");
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
    updateCreatorBadge("鎵╁睍宸叉敞鍏ワ紝鏈湪鏈湴瀛樺偍鍙戠幇寰呭彂甯冧换鍔?);
    return;
  }
  if (!payload?.payload?.session?.token) {
    updateCreatorBadge("寰呭彂甯冧换鍔″瓨鍦紝浣嗙己灏戜細璇?token");
    return;
  }

  if (Date.now() - Number(payload.savedAt || 0) > PENDING_MAX_AGE_MS) {
    updateCreatorBadge("寰呭彂甯冧换鍔″凡杩囨湡锛岀瓑寰呮柊浠诲姟");
    return;
  }

  updateCreatorBadge("浠庢湰鍦板瓨鍌ㄦ仮澶嶅埌寰呭彂甯冧换鍔★紝鍑嗗鎵ц");
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
    updateCreatorBadge("浠庡悗鍙版煡璇㈠埌寰呭彂甯冧换鍔★紝鍑嗗鎵ц");
    void resolveAndRunDraft(payload.payload);
  } catch {
    // Ignore query failures and keep waiting.
  }
}

async function resolveAndRunDraft(payload) {
  try {
    updateCreatorBadge("姝ｅ湪鍚戞墿灞曞悗鍙拌幏鍙栧畬鏁村彂甯冪礌鏉?);
    const response = await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_XHS_RESOLVE_DRAFT_PAYLOAD",
      payload,
    });
    if (response?.error) {
      throw new Error(String(response.error));
    }
    if (!response?.draftPayload?.session?.token) {
      throw new Error("鍚庡彴鏈繑鍥炲畬鏁村彂甯冧换鍔°€?);
    }
    updateCreatorBadge("瀹屾暣鍙戝竷绱犳潗宸插氨缁紝鍑嗗鎵ц");
    await runCreatorDraft(response.draftPayload);
  } catch (error) {
    updateCreatorBadge(`鎵ц鍓嶅噯澶囧け璐ワ細${error instanceof Error ? error.message : "鏈煡閿欒"}`);
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
    updateCreatorBadge("浠庨〉闈㈠湴鍧€璇诲彇鍒板緟鍙戝竷浠诲姟锛屾鍦ㄥ悜鍚庡彴鑾峰彇瀹屾暣绱犳潗");
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
      throw new Error("鎸夐〉闈㈠湴鍧€璇诲彇鍒扮殑浠诲姟鏈繑鍥炲畬鏁磋礋杞姐€?);
    }
    updateCreatorBadge("宸蹭粠椤甸潰鍦板潃瑙ｆ瀽鍒板畬鏁翠换鍔★紝鍑嗗鎵ц");
    await runCreatorDraft(response.draftPayload);
  } catch (error) {
    updateCreatorBadge(`椤甸潰鍦板潃浠诲姟瑙ｆ瀽澶辫触锛?{error instanceof Error ? error.message : "鏈煡閿欒"}`);
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

  badge.textContent = `AI鍙戝竷鎵╁睍\n${text}`;
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

})();

(() => {
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
                note: response.error || "鐢佃剳绔緟鍔╁彂甯冩墿灞曟墽琛屽け璐?,
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
  updateCreatorBadge("鎵╁睍宸叉敞鍏ワ紝绛夊緟鍙戝竷浠诲姟");
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.source !== EXTENSION_SOURCE) {
      return undefined;
    }

    if (message.type === "AI_OMNI_DOUYIN_CREATOR_RUN_PUBLISH_DESCRIPTOR") {
      updateCreatorBadge("鏀跺埌鍚庡彴鐩存帹浠诲姟锛屽噯澶囨墽琛?);
      void resolveAndRunPublish(message.payload)
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "鍙戝竷澶辫触" }));
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
    updateCreatorBadge("妫€娴嬪埌寰呭彂甯冧换鍔★紝鍑嗗寮€濮嬫墽琛?);
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
    throw new Error("缂哄皯鍙戝竷浼氳瘽 token銆?);
  }

  try {
    updateCreatorBadge("姝ｅ湪鏌ユ壘瑙嗛涓婁紶鎺т欢");
    await notifyProgress(appTabId, session.token, "宸叉帴绠″垱浣滆€呴〉锛屾鍦ㄥ噯澶囦笂浼犺棰戙€?);
    await uploadVideo(videoFile, session.title || "douyin-video");
    updateCreatorBadge("瑙嗛涓婁紶涓紝绛夊緟琛ㄥ崟鍙紪杈?);
    await notifyProgress(appTabId, session.token, "瑙嗛宸插紑濮嬩笂浼狅紝姝ｅ湪绛夊緟鎶栭煶鍒涗綔鑰呬腑蹇冭В鏋愮礌鏉愩€?);
    await waitForEditorReady();
    updateCreatorBadge("姝ｅ湪濉啓鏍囬鍜屾弿杩?);
    await notifyProgress(appTabId, session.token, "鍙戝竷琛ㄥ崟宸插彲缂栬緫锛屽紑濮嬪～鍐欐爣棰樺拰鎻忚堪銆?);
    await fillTitle(session.title || "");
    await fillContent(buildPublishContent(session));
    await clearPendingPublish(session.token);
    updateCreatorBadge("宸插～鍐欏彂甯冧俊鎭紝璇蜂汉宸ョ‘璁ゅ悗鐐瑰嚮鍙戝竷");

    chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_CREATOR_PUBLISH_RESULT",
      payload: {
        apiBaseUrl,
        appTabId,
        note: "宸茶嚜鍔ㄤ笂浼犺棰戝苟濉啓鏍囬鎻忚堪锛岃鍦ㄦ姈闊冲垱浣滆€呬腑蹇冪‘璁ゅ悗鎵嬪姩鐐瑰嚮鍙戝竷銆?,
        sessionToken: session.token,
        success: true,
      },
    });
  } catch (error) {
    await clearPendingPublish(session.token);
    updateCreatorBadge(`鎵ц澶辫触锛?{error instanceof Error ? error.message : "鑷姩鍙戝竷澶辫触"}`);
    chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_CREATOR_PUBLISH_RESULT",
      payload: {
        apiBaseUrl,
        appTabId,
        note: error instanceof Error ? error.message : "鑷姩鍙戝竷澶辫触",
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
    throw new Error("褰撳墠浣滃搧娌℃湁鍙笂浼犵殑瑙嗛銆?);
  }

  const input = await waitFor(() => findVideoFileInput(), 30000, 600, "鏈壘鍒拌棰戜笂浼犳帶浠?);
  const file = createFileFromTransferable(videoFile, `${sanitizeFileName(title)}.mp4`);
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files")?.set;
  if (!setter) {
    throw new Error("娴忚鍣ㄤ笉鏀寔鏂囦欢鎺т欢鑷姩鍐欏叆銆?);
  }
  setter.call(input, dataTransfer.files);
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(2400);
}

async function waitForEditorReady() {
  await waitFor(() => findTitleElement() || findContentElement(), 90000, 1200, "绛夊緟鎶栭煶鍙戝竷琛ㄥ崟鍙紪杈戣秴鏃?);
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
  const target = await waitFor(() => findContentElement(), 30000, 800, "鏈壘鍒版弿杩拌緭鍏ュ尯");
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
    'input[placeholder*="鏍囬"]',
    'textarea[placeholder*="鏍囬"]',
    '[contenteditable="true"][data-placeholder*="鏍囬"]',
    '[contenteditable="true"][placeholder*="鏍囬"]',
  ];
  return findVisibleElement(selectors);
}

function findContentElement() {
  const selectors = [
    'textarea[placeholder*="鎻忚堪"]',
    'textarea[placeholder*="绠€浠?]',
    '[contenteditable="true"][data-placeholder*="鎻忚堪"]',
    '[contenteditable="true"][data-placeholder*="绠€浠?]',
    '[contenteditable="true"][placeholder*="鎻忚堪"]',
    '[contenteditable="true"][placeholder*="绠€浠?]',
    'textarea[maxlength]',
    '[contenteditable="true"]',
  ];
  return findVisibleElement(selectors, (element) => !matchesTitleElement(element));
}

function matchesTitleElement(element) {
  const placeholder = String(element.getAttribute("placeholder") || element.getAttribute("data-placeholder") || "");
  return placeholder.includes("鏍囬");
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
    updateCreatorBadge("鎵╁睍宸叉敞鍏ワ紝鏈湪鏈湴瀛樺偍鍙戠幇寰呭彂甯冧换鍔?);
    return;
  }
  if (!payload?.payload?.session?.token) {
    updateCreatorBadge("寰呭彂甯冧换鍔″瓨鍦紝浣嗙己灏戜細璇?token");
    return;
  }

  if (Date.now() - Number(payload.savedAt || 0) > PENDING_MAX_AGE_MS) {
    updateCreatorBadge("寰呭彂甯冧换鍔″凡杩囨湡锛岀瓑寰呮柊浠诲姟");
    return;
  }

  updateCreatorBadge("浠庢湰鍦板瓨鍌ㄦ仮澶嶅埌寰呭彂甯冧换鍔★紝鍑嗗鎵ц");
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
    updateCreatorBadge("浠庡悗鍙版煡璇㈠埌寰呭彂甯冧换鍔★紝鍑嗗鎵ц");
    void resolveAndRunPublish(payload.payload);
  } catch {
    // Ignore query failures and keep waiting.
  }
}

async function resolveAndRunPublish(payload) {
  try {
    updateCreatorBadge("姝ｅ湪鍚戞墿灞曞悗鍙拌幏鍙栧畬鏁村彂甯冪礌鏉?);
    const response = await chrome.runtime.sendMessage({
      source: EXTENSION_SOURCE,
      type: "AI_OMNI_DOUYIN_RESOLVE_PUBLISH_PAYLOAD",
      payload,
    });
    if (response?.error) {
      throw new Error(String(response.error));
    }
    if (!response?.publishPayload?.session?.token) {
      throw new Error("鍚庡彴鏈繑鍥炲畬鏁村彂甯冧换鍔°€?);
    }
    updateCreatorBadge("瀹屾暣鍙戝竷绱犳潗宸插氨缁紝鍑嗗鎵ц");
    await runCreatorPublish(response.publishPayload);
  } catch (error) {
    updateCreatorBadge(`鎵ц鍓嶅噯澶囧け璐ワ細${error instanceof Error ? error.message : "鏈煡閿欒"}`);
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
    updateCreatorBadge("浠庨〉闈㈠湴鍧€璇诲彇鍒板緟鍙戝竷浠诲姟锛屾鍦ㄥ悜鍚庡彴鑾峰彇瀹屾暣绱犳潗");
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
      throw new Error("鎸夐〉闈㈠湴鍧€璇诲彇鍒扮殑浠诲姟鏈繑鍥炲畬鏁磋礋杞姐€?);
    }
    updateCreatorBadge("宸蹭粠椤甸潰鍦板潃瑙ｆ瀽鍒板畬鏁翠换鍔★紝鍑嗗鎵ц");
    await runCreatorPublish(response.publishPayload);
  } catch (error) {
    updateCreatorBadge(`椤甸潰鍦板潃浠诲姟瑙ｆ瀽澶辫触锛?{error instanceof Error ? error.message : "鏈煡閿欒"}`);
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

  badge.textContent = `AI鍙戝竷鎵╁睍\n${text}`;
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

})();

