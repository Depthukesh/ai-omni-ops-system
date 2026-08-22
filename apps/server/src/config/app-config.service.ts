import { readFileSync } from "node:fs";
import { homedir, networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
import { Injectable } from "@nestjs/common";

export type AppRuntimeMode = "standard" | "local-single-user";
export type StorageProviderMode = "auto" | "local" | "oss";
type LocalLauncherSettingsRecord = {
  localAppDataRoot?: string;
  pendingMigrationFrom?: string;
  materialLibraryBaseRoot?: string;
  updatedAt?: string;
};

@Injectable()
export class AppConfigService {
  getRuntimeMode(): AppRuntimeMode {
    const value = this.readFirst("APP_RUNTIME_MODE").toLowerCase();
    return value === "local-single-user" ? "local-single-user" : "standard";
  }

  isLocalSingleUserMode() {
    return this.getRuntimeMode() === "local-single-user";
  }

  isWorkerBootMode() {
    return this.readFirst("SERVER_BOOT_MODE").toLowerCase() === "worker";
  }

  getStorageProviderMode(): StorageProviderMode {
    if (this.isLocalSingleUserMode()) {
      return "local";
    }
    const value = this.readFirst("STORAGE_PROVIDER_MODE").toLowerCase();
    if (value === "local" || value === "oss") {
      return value;
    }
    return "auto";
  }

  shouldForceLocalManagedStorage() {
    return this.getStorageProviderMode() === "local";
  }

  shouldForceOssStorage() {
    return this.getStorageProviderMode() === "oss";
  }

  getServerHost() {
    return this.readFirst("SERVER_HOST", "HOST") || "127.0.0.1";
  }

  getServerPort() {
    return this.readNumber("PORT", 3011);
  }

  getLocalAppRoot() {
    const explicit = this.readFirst("LOCAL_APP_DATA_ROOT", "AI_OMNI_LOCAL_ROOT");
    if (explicit) {
      return resolve(explicit);
    }

    return this.getDefaultLocalAppRoot();
  }

  getDefaultLocalAppRoot() {
    if (process.platform === "win32") {
      const appData = this.readFirst("APPDATA");
      if (appData) {
        return resolve(appData, "AiOmniOps");
      }
    }

    if (process.platform === "darwin") {
      return resolve(homedir(), "Library", "Application Support", "AiOmniOps");
    }

    return resolve(homedir(), ".local", "share", "ai-omni-ops");
  }

  getLocalLauncherSettingsPath() {
    return join(this.getDefaultLocalAppRoot(), "launcher-settings.json");
  }

  getLocalMaterialLibraryFolderName() {
    return "素材库";
  }

  getLocalManagedStorageFolderName() {
    return "站内存储";
  }

  getDefaultMaterialLibraryBaseRoot() {
    return this.getLocalAppRoot();
  }

  getConfiguredMaterialLibraryBaseRoot() {
    const explicit = this.readFirst("MATERIAL_LIBRARY_BASE_ROOT", "LOCAL_MATERIAL_LIBRARY_BASE_ROOT");
    if (explicit) {
      return resolve(explicit);
    }
    const settings = this.readLocalLauncherSettings();
    const configured = String(settings.materialLibraryBaseRoot || "").trim();
    return configured ? resolve(configured) : this.getDefaultMaterialLibraryBaseRoot();
  }

  getConfiguredMaterialLibraryDisplayRoot() {
    const explicit = this.readFirst("MATERIAL_LIBRARY_DISPLAY_ROOT", "LOCAL_MATERIAL_LIBRARY_DISPLAY_ROOT");
    if (explicit) {
      return resolve(explicit);
    }
    return this.getConfiguredMaterialLibraryBaseRoot();
  }

  getLocalMaterialLibraryRoot() {
    return join(this.getConfiguredMaterialLibraryBaseRoot(), this.getLocalMaterialLibraryFolderName());
  }

  getConfiguredLocalManagedStorageRoot() {
    const explicit = this.readFirst("MANAGED_STORAGE_ROOT", "LOCAL_MANAGED_STORAGE_ROOT");
    if (explicit) {
      return resolve(explicit);
    }
    return join(this.getConfiguredMaterialLibraryBaseRoot(), this.getLocalManagedStorageFolderName());
  }

  getConfiguredLocalManagedStorageDisplayRoot() {
    const explicit = this.readFirst("MANAGED_STORAGE_DISPLAY_ROOT", "LOCAL_MANAGED_STORAGE_DISPLAY_ROOT");
    if (explicit) {
      return resolve(explicit);
    }
    return join(this.getConfiguredMaterialLibraryDisplayRoot(), this.getLocalManagedStorageFolderName());
  }

  getLocalMaterialLibraryCategoryRoot(category: "text" | "image" | "audio" | "video") {
    return join(this.getLocalMaterialLibraryRoot(), this.getMaterialCategoryFolderName(category));
  }

  getLocalMaterialLibraryDisplayCategoryRoot(category: "text" | "image" | "audio" | "video") {
    return join(this.getConfiguredMaterialLibraryDisplayRoot(), this.getMaterialCategoryFolderName(category));
  }

  getLocalPathsForRoot(rootPath: string) {
    const appRoot = resolve(rootPath);
    return {
      appRoot,
      dataRoot: join(appRoot, "data"),
      dbPath: join(appRoot, "db", "local-single-user.sqlite"),
      logsRoot: join(appRoot, "logs"),
      runtimeRoot: join(appRoot, "runtime"),
      storageRoot: join(appRoot, "storage"),
      cacheRoot: join(appRoot, "cache"),
      backupRoot: join(appRoot, "backup"),
      updatesRoot: join(appRoot, "updates"),
    };
  }

  getLocalDataRoot() {
    return join(this.getLocalAppRoot(), "data");
  }

  getLocalDatabasePath() {
    return join(this.getLocalAppRoot(), "db", "local-single-user.sqlite");
  }

  getLocalLogsRoot() {
    return join(this.getLocalAppRoot(), "logs");
  }

  getLocalRuntimeRoot() {
    return join(this.getLocalAppRoot(), "runtime");
  }

  getLocalStorageRoot() {
    return join(this.getLocalAppRoot(), "storage");
  }

  getLocalCacheRoot() {
    return join(this.getLocalAppRoot(), "cache");
  }

  getLocalBackupRoot() {
    return join(this.getLocalAppRoot(), "backup");
  }

  getLocalUpdatesRoot() {
    return join(this.getLocalAppRoot(), "updates");
  }

  getWebPublicBaseUrl() {
    const explicit = this.readFirst("WEB_PUBLIC_BASE_URL", "NEXT_PUBLIC_WEB_BASE_URL");
    if (explicit) {
      return trimTrailingSlash(explicit);
    }

    const runtimeBrowserUrl = this.readLocalRuntimeBrowserUrl();
    if (runtimeBrowserUrl) {
      return runtimeBrowserUrl;
    }

    if (isLoopbackHost(this.getServerHost())) {
      return "http://127.0.0.1:3001";
    }

    const lanAddress = this.findPrivateIpv4Address();
    if (lanAddress) {
      return `http://${lanAddress}:3001`;
    }

    return "http://127.0.0.1:3001";
  }

  getPublicApiBaseUrl() {
    const explicit = this.readFirst("API_PUBLIC_BASE_URL", "NEXT_PUBLIC_API_BASE_URL", "WEB_API_BASE_URL");
    if (explicit) {
      return ensureApiPath(explicit);
    }

    try {
      const parsed = new URL(this.getWebPublicBaseUrl());
      parsed.port = String(this.getServerPort());
      parsed.pathname = "/api";
      parsed.search = "";
      parsed.hash = "";
      return trimTrailingSlash(parsed.toString());
    } catch {
      return `http://127.0.0.1:${this.getServerPort()}/api`;
    }
  }

  getServerBaseUrl() {
    const explicit = this.readFirst("API_PUBLIC_BASE_URL", "WEB_API_BASE_URL", "NEXT_PUBLIC_API_BASE_URL");
    if (explicit) {
      return stripApiPath(explicit);
    }

    return normalizePublicOrigin(this.getWebPublicBaseUrl(), process.env.NODE_ENV) || `http://localhost:${this.getServerPort()}`;
  }

  getOssConfig() {
    const accessKeyId = this.readFirst("OSS_ACCESS_KEY_ID");
    const accessKeySecret = this.readFirst("OSS_ACCESS_KEY_SECRET");
    const bucket = this.readFirst("OSS_BUCKET");
    const region = this.readFirst("OSS_REGION");
    if (!accessKeyId || !accessKeySecret || !bucket || !region) {
      return null;
    }
    return {
      accessKeyId,
      accessKeySecret,
      bucket,
      region,
      internal: this.readBoolean("OSS_INTERNAL", false),
    };
  }

  getOpenClawInstallTokenEncryptionSecret() {
    return this.readFirst("OPENCLAW_INSTALL_TOKEN_SECRET", "AUTH_TOKEN_SECRET") || "ai-omni-ops-system-dev-secret";
  }

  getStandardRuntimeUpdateManifestUrl() {
    return this.readFirst("STANDARD_RUNTIME_UPDATE_MANIFEST_URL", "DOCKER_STANDARD_UPDATE_MANIFEST_URL");
  }

  private readLocalLauncherSettings(): LocalLauncherSettingsRecord {
    const settingsFilePath = this.getLocalLauncherSettingsPath();
    try {
      const content = readFileSync(settingsFilePath, "utf8").replace(/^\uFEFF/, "");
      if (!content.trim()) {
        return {};
      }
      const parsed = JSON.parse(content) as LocalLauncherSettingsRecord;
      return {
        localAppDataRoot: typeof parsed.localAppDataRoot === "string" ? parsed.localAppDataRoot.trim() : "",
        pendingMigrationFrom: typeof parsed.pendingMigrationFrom === "string" ? parsed.pendingMigrationFrom.trim() : "",
        materialLibraryBaseRoot: typeof parsed.materialLibraryBaseRoot === "string" ? parsed.materialLibraryBaseRoot.trim() : "",
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      };
    } catch {
      return {};
    }
  }

  private readLocalRuntimeBrowserUrl() {
    if (!this.isLocalSingleUserMode()) {
      return "";
    }

    const runtimeMetadataPath = join(this.getLocalRuntimeRoot(), "local-single-user-runtime.json");
    try {
      const content = readFileSync(runtimeMetadataPath, "utf8").replace(/^\uFEFF/, "");
      if (!content.trim()) {
        return "";
      }
      const parsed = JSON.parse(content) as {
        browserUrl?: string;
        previewUrl?: string;
      };
      const browserUrl = trimTrailingSlash(String(parsed.browserUrl || "").trim());
      if (browserUrl) {
        return browserUrl;
      }
      const previewUrl = trimTrailingSlash(String(parsed.previewUrl || "").trim());
      if (!previewUrl) {
        return "";
      }
      return trimTrailingSlash(new URL(previewUrl).origin);
    } catch {
      return "";
    }
  }

  private getMaterialCategoryFolderName(category: "text" | "image" | "audio" | "video") {
    switch (category) {
      case "image":
        return "图片";
      case "audio":
        return "语音";
      case "video":
        return "视频";
      case "text":
      default:
        return "文本";
    }
  }

  private readFirst(...keys: string[]) {
    for (const key of keys) {
      const value = process.env[key]?.trim();
      if (value) {
        return value;
      }
    }
    return "";
  }

  private readNumber(key: string, fallback: number) {
    const raw = process.env[key]?.trim();
    if (!raw) {
      return fallback;
    }

    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private readBoolean(key: string, fallback: boolean) {
    const raw = process.env[key]?.trim().toLowerCase();
    if (!raw) {
      return fallback;
    }
    if (["1", "true", "yes", "on"].includes(raw)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(raw)) {
      return false;
    }
    return fallback;
  }

  private findPrivateIpv4Address() {
    const networkList = networkInterfaces();
    for (const name of Object.keys(networkList)) {
      for (const item of networkList[name] || []) {
        if (item.family === "IPv4" && !item.internal && isPrivateIpv4(item.address)) {
          return item.address;
        }
      }
    }
    return "";
  }
}

function isLoopbackHost(host: string) {
  const normalized = String(host || "").trim().toLowerCase();
  return !normalized || normalized === "127.0.0.1" || normalized === "localhost" || normalized === "::1";
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function ensureApiPath(value: string) {
  try {
    const parsed = new URL(value);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    parsed.pathname = normalizedPath.endsWith("/api") ? normalizedPath : `${normalizedPath}/api`;
    parsed.search = "";
    parsed.hash = "";
    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimTrailingSlash(value).endsWith("/api") ? trimTrailingSlash(value) : `${trimTrailingSlash(value)}/api`;
  }
}

function stripApiPath(value: string) {
  try {
    const parsed = new URL(value);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    parsed.pathname = normalizedPath.endsWith("/api")
      ? normalizedPath.slice(0, Math.max(0, normalizedPath.length - 4)) || "/"
      : normalizedPath || "/";
    parsed.search = "";
    parsed.hash = "";
    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimTrailingSlash(value).replace(/\/api$/, "");
  }
}

function isPrivateIpv4(value: string) {
  return /^10\./.test(value) || /^192\.168\./.test(value) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(value);
}

function normalizePublicOrigin(value: string, nodeEnv?: string) {
  const trimmed = trimTrailingSlash(value);
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    const isPrivateHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || isPrivateIpv4(parsed.hostname);
    if (nodeEnv !== "development" && isPrivateHost) {
      return "https://17ai.site";
    }
    parsed.search = "";
    parsed.hash = "";
    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimmed;
  }
}
