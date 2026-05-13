import { Buffer } from "node:buffer";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import OSS from "ali-oss";
import { AppConfigService } from "../config/app-config.service";

type StoredObject = {
  buffer: Buffer;
  contentType: string;
};

@Injectable()
export class OssStorageService {
  private client: InstanceType<typeof OSS> | null = null;

  constructor(
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
  ) {}

  isEnabled() {
    return Boolean(this.appConfigService.getOssConfig());
  }

  async putObject(storageKey: string, buffer: Buffer, contentType: string) {
    if (this.shouldUseLocalFallback()) {
      return this.putLocalObject(storageKey, buffer, contentType);
    }
    const client = this.getClient();
    try {
      await client.put(storageKey, buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000",
        },
      });
      return true;
    } catch (error) {
      throw this.toStorageError(error, `上传 OSS 文件失败：${storageKey}`);
    }
  }

  async getObject(storageKey: string): Promise<StoredObject | null> {
    if (this.shouldUseLocalFallback()) {
      return this.getLocalObject(storageKey);
    }
    const client = this.getClient();
    try {
      const result = await client.get(storageKey);
      const content = result.content;
      const buffer = Buffer.isBuffer(content)
        ? content
        : Buffer.from(typeof content === "string" ? content : new Uint8Array(content as ArrayBuffer));
      const contentType = this.readHeader(result.res.headers, "content-type") || "application/octet-stream";
      return {
        buffer,
        contentType,
      };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return null;
      }
      throw this.toStorageError(error, `读取 OSS 文件失败：${storageKey}`);
    }
  }

  async deleteObject(storageKey: string) {
    if (this.shouldUseLocalFallback()) {
      return this.deleteLocalObject(storageKey);
    }
    const client = this.getClient();
    try {
      await client.delete(storageKey);
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw this.toStorageError(error, `删除 OSS 文件失败：${storageKey}`);
    }
  }

  private getClient() {
    const config = this.appConfigService.getOssConfig();
    if (!config) {
      throw new ServiceUnavailableException(
        "未配置 OSS 存储，请先设置 OSS_ACCESS_KEY_ID、OSS_ACCESS_KEY_SECRET、OSS_BUCKET、OSS_REGION。",
      );
    }
    if (!this.client) {
      this.client = new OSS({
        region: config.region,
        bucket: config.bucket,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        internal: true,
        secure: true,
      });
    }
    return this.client;
  }

  private shouldUseLocalFallback() {
    return !this.appConfigService.getOssConfig() && process.env.NODE_ENV !== "production";
  }

  private getLocalFallbackRoot() {
    return resolve(process.cwd(), ".runtime", "local-oss");
  }

  private resolveLocalFallbackPaths(storageKey: string) {
    const normalizedKey = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
    const baseDir = this.getLocalFallbackRoot();
    const filePath = resolve(baseDir, normalizedKey);
    if (!filePath.startsWith(baseDir)) {
      throw new ServiceUnavailableException(`本地存储路径非法：${storageKey}`);
    }
    return {
      filePath,
      metaPath: `${filePath}.meta.json`,
    };
  }

  private async putLocalObject(storageKey: string, buffer: Buffer, contentType: string) {
    const { filePath, metaPath } = this.resolveLocalFallbackPaths(storageKey);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    await writeFile(metaPath, JSON.stringify({ contentType }, null, 2), "utf8");
    return true;
  }

  private async getLocalObject(storageKey: string): Promise<StoredObject | null> {
    const { filePath, metaPath } = this.resolveLocalFallbackPaths(storageKey);
    try {
      await stat(filePath);
    } catch {
      return null;
    }
    const [buffer, metaText] = await Promise.all([
      readFile(filePath),
      readFile(metaPath, "utf8").catch(() => ""),
    ]);
    let contentType = "application/octet-stream";
    if (metaText) {
      try {
        const parsed = JSON.parse(metaText) as { contentType?: string };
        if (parsed?.contentType?.trim()) {
          contentType = parsed.contentType.trim();
        }
      } catch {
        contentType = "application/octet-stream";
      }
    }
    return {
      buffer,
      contentType,
    };
  }

  private async deleteLocalObject(storageKey: string) {
    const { filePath, metaPath } = this.resolveLocalFallbackPaths(storageKey);
    const [fileDeleted] = await Promise.all([
      rm(filePath, { force: true }).then(() => true).catch(() => false),
      rm(metaPath, { force: true }).catch(() => false),
    ]);
    return fileDeleted;
  }

  private readHeader(headers: object | undefined, key: string) {
    const map = headers as Record<string, unknown> | undefined;
    const value = map?.[key] ?? map?.[key.toLowerCase()] ?? map?.[key.toUpperCase()];
    return typeof value === "string" ? value : "";
  }

  private isNotFoundError(error: unknown) {
    if (!error || typeof error !== "object") {
      return false;
    }
    const status = "status" in error ? error.status : undefined;
    const code = "code" in error ? error.code : undefined;
    return status === 404 || code === "NoSuchKey";
  }

  private toStorageError(error: unknown, fallbackMessage: string) {
    const detail = error instanceof Error ? error.message : "";
    return new ServiceUnavailableException(detail ? `${fallbackMessage}：${detail}` : fallbackMessage);
  }
}
