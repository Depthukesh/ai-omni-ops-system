import { clearStoredAuthSession, getStoredAuthSession, setStoredAuthSession, type AuthUser } from "./auth-session";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3011/api";

let refreshPromise: Promise<boolean> | undefined;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await performRequest(path, init);

  if (response.status === 401 && path !== "/auth/refresh" && await refreshAccessToken()) {
    const retried = await performRequest(path, init);
    return readJsonResponse<T>(retried);
  }

  return readJsonResponse<T>(response);
}

async function performRequest(path: string, init?: RequestInit) {
  const session = getStoredAuthSession();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Authorization") && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  if (!headers.has("x-brand-id") && session?.currentBrandId) {
    headers.set("x-brand-id", session.currentBrandId);
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
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
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
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
      return text.trim();
    }
  } catch {
    // Fall through to the generic status message.
  }

  return `Request failed: ${response.status}`;
}
