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

    return `http://localhost:${this.getServerPort()}`;
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
    };
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
