export type AuthUser = {
  id: string;
  mobile: string;
  email: string;
  nickname: string;
  status: "ACTIVE" | "DISABLED";
  membership: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  systemRole: "USER" | "SUPER_ADMIN" | "ADMIN_OPERATOR" | "FINANCE_OPERATOR" | "SUPPORT_OPERATOR";
  pointsBalance: number;
};

export type AuthBrand = {
  id: string;
  brandName: string;
  industry: string;
  role: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  currentBrandId?: string;
  brands: AuthBrand[];
  user?: AuthUser;
};

const AUTH_SESSION_STORAGE_KEY = "ai-omni-auth-session";

export function getStoredAuthSession(): AuthSession | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    return undefined;
  }
}

export function setStoredAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function mergeStoredAuthSession(next: Partial<AuthSession>) {
  const current = getStoredAuthSession();
  if (!current) {
    return undefined;
  }

  const merged: AuthSession = {
    ...current,
    ...next,
    brands: next.brands ?? current.brands,
    accessToken: next.accessToken ?? current.accessToken,
    refreshToken: next.refreshToken ?? current.refreshToken,
    currentBrandId: next.currentBrandId ?? current.currentBrandId,
    user: next.user ?? current.user,
  };
  setStoredAuthSession(merged);
  return merged;
}
