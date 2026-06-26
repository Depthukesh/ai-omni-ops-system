import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession, type AuthUser } from "./auth-session";

export const API_BASE_URL = resolveApiBaseUrl();

let refreshPromise: Promise<boolean> | undefined;
const DOUYIN_WORKSPACE_DEBUG_SESSION_ID = "douyin-workspace-false-502";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await performRequest(path, init);

  if (response.status === 401 && path !== "/auth/refresh" && await refreshAccessToken()) {
    const retried = await performRequest(path, init);
    return readJsonResponse<T>(retried);
  }

  return readJsonResponse<T>(response);
}

export async function requestBlobByUrl(url: string, init?: RequestInit): Promise<{
  blob: Blob;
  fileName: string;
  contentType: string;
}> {
  const response = await performRequestUrl(url, init);

  if (response.status === 401 && await refreshAccessToken()) {
    const retried = await performRequestUrl(url, init);
    return readBlobResponse(retried, url);
  }

  return readBlobResponse(response, url);
}

async function performRequest(path: string, init?: RequestInit) {
  return performRequestUrl(resolveRequestUrl(path), init);
}

async function performRequestUrl(url: string, init?: RequestInit) {
  const session = getStoredAuthSession();
  const headers = new Headers(init?.headers);
  const resolvedPathname = readPathname(url);
  const isAuthRoute = resolvedPathname.startsWith("/auth/");
  const isFormDataBody = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!headers.has("Content-Type") && !isFormDataBody) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Authorization") && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  if (!isAuthRoute && !headers.has("x-brand-id") && session?.currentBrandId) {
    headers.set("x-brand-id", session.currentBrandId);
  }

  // #region debug-point H:http-request-start
  if (resolvedPathname.includes("/douyin/digital-human")) {
    fetch("http://127.0.0.1:7777/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: DOUYIN_WORKSPACE_DEBUG_SESSION_ID,
        runId: "pre-fix",
        hypothesisId: "H",
        location: "apps/web/src/services/http.ts:performRequestUrl",
        msg: "[DEBUG] 前端开始请求数字人接口",
        data: {
          method: init?.method || "GET",
          url,
          resolvedPathname,
          currentBrandId: session?.currentBrandId || null,
        },
        ts: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
  // #region debug-point H:http-request-response
  if (resolvedPathname.includes("/douyin/digital-human")) {
    fetch("http://127.0.0.1:7777/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: DOUYIN_WORKSPACE_DEBUG_SESSION_ID,
        runId: "pre-fix",
        hypothesisId: "H",
        location: "apps/web/src/services/http.ts:performRequestUrl",
        msg: "[DEBUG] 前端收到数字人接口响应",
        data: {
          method: init?.method || "GET",
          url,
          resolvedPathname,
          status: response.status,
          statusText: response.statusText,
        },
        ts: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion
  return response;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessTokenOnce().finally(() => {
      refreshPromise = undefined;
    });
  }

  return refreshPromise;
}

async function refreshAccessTokenOnce() {
  const session = getStoredAuthSession();
  if (!session?.refreshToken) {
    clearStoredAuthSession();
    return false;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken: session.refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    clearStoredAuthSession();
    return false;
  }

  const payload = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
    currentBrandId?: string;
    brands?: Array<{ id: string; brandName: string; industry: string; role: string }>;
    user?: AuthUser;
  };

  setStoredAuthSession({
    ...session,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    currentBrandId: payload.currentBrandId ?? session.currentBrandId,
    brands: payload.brands ?? session.brands,
    user: payload.user ?? session.user,
  });
  return true;
}

async function readJsonResponse<T>(response: Response) {
  if (!response.ok) {
    const message = await readErrorMessage(response);
    // #region debug-point H:http-json-error
    if (readPathname(response.url).includes("/douyin/digital-human")) {
      fetch("http://127.0.0.1:7777/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: DOUYIN_WORKSPACE_DEBUG_SESSION_ID,
          runId: "pre-fix",
          hypothesisId: "H",
          location: "apps/web/src/services/http.ts:readJsonResponse",
          msg: "[DEBUG] 前端数字人接口进入错误分支",
          data: {
            url: response.url,
            pathname: readPathname(response.url),
            status: response.status,
            statusText: response.statusText,
            message,
          },
          ts: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function readBlobResponse(response: Response, fallbackUrl: string) {
  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const blob = await response.blob();
  const contentType = response.headers.get("content-type") || blob.type || "application/octet-stream";
  const disposition = response.headers.get("content-disposition") || "";
  const fileName = extractFileNameFromDisposition(disposition) || extractFileNameFromUrl(fallbackUrl) || "media";

  return {
    blob,
    fileName,
    contentType,
  };
}

export function jsonRequest<T>(path: string, method: string, body: unknown) {
  return request<T>(path, {
    method,
    body: JSON.stringify(body),
  });
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        return payload.message.join("；");
      }
      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message.trim();
      }
    }

    const text = await response.text();
    if (text.trim()) {
      const trimmed = text.trim();
      if (/<html[\s>]/i.test(trimmed) || /<body[\s>]/i.test(trimmed) || /502 Bad Gateway/i.test(trimmed)) {
        // #region debug-point H:http-html-502-translation
        if (readPathname(response.url).includes("/douyin/digital-human")) {
          fetch("http://127.0.0.1:7777/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: DOUYIN_WORKSPACE_DEBUG_SESSION_ID,
              runId: "pre-fix",
              hypothesisId: "H",
              location: "apps/web/src/services/http.ts:readErrorMessage",
              msg: "[DEBUG] 前端把数字人接口响应翻译为 502 通用文案",
              data: {
                url: response.url,
                pathname: readPathname(response.url),
                status: response.status,
                contentType,
                preview: trimmed.slice(0, 180),
              },
              ts: Date.now(),
            }),
          }).catch(() => {});
        }
        // #endregion
        return "上游服务暂时不可用（502 Bad Gateway），请稍后重试";
      }
      return trimmed;
    }
  } catch {
    // Fall through to the generic status message.
  }

  return `Request failed: ${response.status}`;
}

function resolveApiBaseUrl() {
  const configured = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }

  return "http://127.0.0.1:3011/api";
}

function resolveRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function readPathname(url: string) {
  try {
    if (/^https?:\/\//i.test(url)) {
      return new URL(url).pathname;
    }
  } catch {
    return url;
  }

  return url;
}

function extractFileNameFromDisposition(disposition: string) {
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const quotedMatch = disposition.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return "";
}

function extractFileNameFromUrl(url: string) {
  try {
    const target = new URL(url);
    const candidate = target.pathname.split("/").pop() || "";
    return candidate.trim();
  } catch {
    return "";
  }
}
