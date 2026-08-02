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

export type RegisterPayload = {
  mobile: string;
  email: string;
  inviteCode?: string;
  password: string;
  nickname?: string;
};

export type RegisterConfigResponse = {
  runtimeMode: "standard" | "local-single-user";
  inviteCodeRequired: boolean;
  registrationMode: "invite" | "open";
};

export type UpdateProfilePayload = {
  nickname: string;
  mobile: string;
  avatarUrl?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  nextPassword: string;
};

export type ChangePasswordResponse = {
  success: boolean;
  message: string;
  updatedAt: string;
};

export type UploadProfileAvatarResponse = {
  fileName: string;
  avatarUrl: string;
};

export type AuthSuccessPayload = AuthSession & {
  user: AuthUser;
};

export type MeResponse = {
  user: AuthUser;
  brands: AuthBrand[];
  currentBrandId?: string;
};

const ME_CACHE_TTL_MS = 30_000;

let meCache:
  | {
      data?: MeResponse;
      expiresAt: number;
      promise?: Promise<MeResponse>;
    }
  | undefined;

export async function login(payload: LoginPayload) {
  const response = await jsonRequest<AuthSuccessPayload>("/auth/login", "POST", payload);
  clearMeCache();
  setStoredAuthSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    currentBrandId: response.currentBrandId,
    brands: response.brands,
    user: response.user,
  });
  return response;
}

export async function register(payload: RegisterPayload) {
  const response = await jsonRequest<AuthSuccessPayload>("/auth/register", "POST", payload);
  clearMeCache();
  setStoredAuthSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    currentBrandId: response.currentBrandId,
    brands: response.brands,
    user: response.user,
  });
  return response;
}

export async function getRegisterConfig() {
  return request<RegisterConfigResponse>("/auth/register-config");
}

export async function getMe(options?: { force?: boolean }) {
  if (!options?.force && meCache?.data && meCache.expiresAt > Date.now()) {
    return meCache.data;
  }

  if (!options?.force && meCache?.promise) {
    return meCache.promise;
  }

  const pending = request<MeResponse>("/auth/me").then((response) => {
    meCache = {
      data: response,
      expiresAt: Date.now() + ME_CACHE_TTL_MS,
    };
    return response;
  }).finally(() => {
    if (meCache?.promise === pending) {
      meCache = meCache.data
        ? { data: meCache.data, expiresAt: meCache.expiresAt }
        : undefined;
    }
  });

  meCache = {
    data: meCache?.data,
    expiresAt: meCache?.expiresAt || 0,
    promise: pending,
  };

  const response = await pending;
  mergeStoredAuthSession({
    brands: response.brands,
    currentBrandId: response.currentBrandId,
    user: response.user,
  });
  return response;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const response = await request<AuthUser>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  clearMeCache();
  mergeStoredAuthSession({
    user: response,
  });
  return response;
}

export async function changePassword(payload: ChangePasswordPayload) {
  return request<ChangePasswordResponse>("/auth/change-password", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function uploadProfileAvatar(file: File) {
  const dataBase64 = await readFileAsBase64(file);
  return jsonRequest<UploadProfileAvatarResponse>("/auth/profile/avatar", "POST", {
    fileName: file.name,
    contentType: file.type || "image/jpeg",
    dataBase64,
  });
}

export async function getBrands() {
  const response = await request<Pick<AuthSession, "brands" | "currentBrandId">>("/auth/brands");
  clearMeCache();
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
  clearMeCache();
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
    clearMeCache();
    clearStoredAuthSession();
  }
}

export function readAuthSession() {
  return getStoredAuthSession();
}

function clearMeCache() {
  meCache = undefined;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}
