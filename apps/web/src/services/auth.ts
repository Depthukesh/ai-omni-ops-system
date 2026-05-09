import { jsonRequest, request } from "./http";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  mergeStoredAuthSession,
  setStoredAuthSession,
  type AuthBrand,
  type AuthSession,
  type AuthUser,
} from "./auth-session";

export type LoginPayload = {
  account: string;
  password: string;
};

export type AuthSuccessPayload = AuthSession & {
  user: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
  brands: AuthBrand[];
  currentBrandId?: string;
};

export async function login(payload: LoginPayload) {
  const response = await jsonRequest<AuthSuccessPayload>("/auth/login", "POST", payload);
  setStoredAuthSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    currentBrandId: response.currentBrandId,
    brands: response.brands,
    user: response.user,
  });
  return response;
}

export async function getMe() {
  const response = await request<MeResponse>("/auth/me");
  mergeStoredAuthSession({
    brands: response.brands,
    currentBrandId: response.currentBrandId,
    user: response.user,
  });
  return response;
}

export async function getBrands() {
  const response = await request<Pick<AuthSession, "brands" | "currentBrandId">>("/auth/brands");
  mergeStoredAuthSession(response);
  return response;
}

export async function switchBrand(brandId: string) {
  const response = await request<AuthSuccessPayload | Pick<AuthSession, "accessToken" | "refreshToken" | "brands" | "currentBrandId">>(
    "/auth/switch-brand",
    {
      method: "PATCH",
      body: JSON.stringify({ brandId }),
    },
  );
  mergeStoredAuthSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    brands: response.brands,
    currentBrandId: response.currentBrandId,
  });
  return response;
}

export async function logout() {
  try {
    await request<{ success: boolean }>("/auth/logout", {
      method: "POST",
    });
  } finally {
    clearStoredAuthSession();
  }
}

export function readAuthSession() {
  return getStoredAuthSession();
}
