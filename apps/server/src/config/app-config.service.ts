import { networkInterfaces } from "node:os";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AppConfigService {
  getServerHost() {
    return this.readFirst("SERVER_HOST", "HOST") || "127.0.0.1";
  }

  getServerPort() {
    return this.readNumber("PORT", 3011);
  }

  getWebPublicBaseUrl() {
    const explicit = this.readFirst("WEB_PUBLIC_BASE_URL", "NEXT_PUBLIC_WEB_BASE_URL");
    if (explicit) {
      return trimTrailingSlash(explicit);
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
