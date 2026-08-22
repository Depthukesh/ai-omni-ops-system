import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import OSS from "ali-oss";
import { AppConfigService } from "../config/app-config.service";

type StoredObject = {
  buffer: Buffer;
  contentType: string;
};

const OSS_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const OSS_MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024;
const OSS_MULTIPART_PART_SIZE_BYTES = 8 * 1024 * 1024;
const OSS_MULTIPART_PARALLEL = 2;
const OSS_UPLOAD_RETRY_COUNT = 2;

@Injectable()
export class OssStorageService {
  private client: InstanceType<typeof OSS> | null = null;

  constructor(
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
  ) {}

  isEnabled() {
    return !this.shouldUseLocalFallback() && Boolean(this.appConfigService.getOssConfig());
  }

  isUsingLocalFallback() {
    return this.shouldUseLocalFallback();
  }

  async putObject(storageKey: string, buffer: Buffer, contentType: string) {
    if (this.shouldUseLocalFallback()) {
      return this.putLocalObject(storageKey, buffer, contentType);
    }
    const client = this.getClient();
    const upload = async () => {
      if (buffer.length >= OSS_MULTIPART_THRESHOLD_BYTES) {
        await client.multipartUpload(storageKey, buffer, {
          timeout: OSS_UPLOAD_TIMEOUT_MS,
          partSize: OSS_MULTIPART_PART_SIZE_BYTES,
          parallel: OSS_MULTIPART_PARALLEL,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000",
          },
        });
        return;
      }
      await client.put(storageKey, buffer, {
        timeout: OSS_UPLOAD_TIMEOUT_MS,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000",
        },
      });
    };
    try {
      await this.retryUploadOnTimeout(upload);
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

  getSignedReadUrl(storageKey: string, expiresInSeconds = 3600) {
    if (this.shouldUseLocalFallback()) {
      return "";
    }
    const client = this.getClient();
    try {
      return client.signatureUrl(storageKey, {
        method: "GET",
        expires: expiresInSeconds,
      });
    } catch (error) {
      throw this.toStorageError(error, `生成 OSS 签名链接失败：${storageKey}`);
    }
  }

  getLocalObjectPath(storageKey: string) {
    if (!this.shouldUseLocalFallback()) {
      return "";
    }
    const candidates = this.listLocalFallbackPathCandidates(storageKey);
    const existing = candidates.find((item) => existsSync(item.filePath));
    return (existing || candidates[0])?.filePath || "";
  }

  getLocalObjectDisplayPath(storageKey: string) {
    if (!this.shouldUseLocalFallback()) {
      return "";
    }
    const runtimeCandidates = this.listLocalFallbackPathCandidates(storageKey);
    const displayCandidates = this.listLocalDisplayPathCandidates(storageKey);
    const existingIndex = runtimeCandidates.findIndex((item) => existsSync(item.filePath));
    if (existingIndex >= 0 && displayCandidates[existingIndex]) {
      return displayCandidates[existingIndex]?.filePath || "";
    }
    return displayCandidates[0]?.filePath || "";
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
        internal: Boolean(config.internal),
        secure: true,
      });
    }
    return this.client;
  }

  private shouldUseLocalFallback() {
    if (this.appConfigService.shouldForceLocalManagedStorage()) {
      return true;
    }
    if (this.appConfigService.shouldForceOssStorage()) {
      return false;
    }
    return !this.appConfigService.getOssConfig() && process.env.NODE_ENV !== "production";
  }

  private getLocalFallbackRoot() {
    if (this.appConfigService.shouldForceLocalManagedStorage()) {
      return resolve(this.appConfigService.getConfiguredLocalManagedStorageRoot());
    }
    return resolve(process.cwd(), ".runtime", "local-oss");
  }

  private getLegacyLocalFallbackRoot() {
    if (this.appConfigService.isLocalSingleUserMode()) {
      return resolve(this.appConfigService.getLocalStorageRoot(), "oss");
    }
    return this.getLocalFallbackRoot();
  }

  private getLocalDisplayRoot() {
    if (this.appConfigService.shouldForceLocalManagedStorage()) {
      return resolve(this.appConfigService.getConfiguredLocalManagedStorageDisplayRoot());
    }
    return this.getLocalFallbackRoot();
  }

  private getLegacyLocalDisplayRoot() {
    if (this.appConfigService.isLocalSingleUserMode()) {
      return resolve(this.appConfigService.getLocalStorageRoot(), "oss");
    }
    return this.getLocalDisplayRoot();
  }

  private resolveLocalFallbackPaths(baseDir: string, relativePath: string, storageKey: string) {
    const normalizedBaseDir = resolve(baseDir);
    const normalizedRelativePath = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
    const filePath = resolve(normalizedBaseDir, normalizedRelativePath);
    if (!filePath.startsWith(normalizedBaseDir)) {
      throw new ServiceUnavailableException(`本地存储路径非法：${storageKey}`);
    }
    return {
      filePath,
      metaPath: `${filePath}.meta.json`,
    };
  }

  private listLocalFallbackPathCandidates(storageKey: string) {
    return this.listLocalPathCandidates(storageKey, false);
  }

  private listLocalDisplayPathCandidates(storageKey: string) {
    return this.listLocalPathCandidates(storageKey, true);
  }

  private listLocalPathCandidates(storageKey: string, displayOnly: boolean) {
    const normalizedKey = storageKey.replace(/\\/g, "/").replace(/^\/+/, "");
    const materialLibraryMatch = this.matchMaterialLibraryStorageKey(normalizedKey, displayOnly);
    const relativePath = materialLibraryMatch ? materialLibraryMatch.relativePath : normalizedKey;
    const candidates = [
      this.resolveLocalFallbackPaths(
        materialLibraryMatch ? materialLibraryMatch.baseDir : (displayOnly ? this.getLocalDisplayRoot() : this.getLocalFallbackRoot()),
        relativePath,
        storageKey,
      ),
    ];
    if (!materialLibraryMatch) {
      const legacyRoot = displayOnly ? this.getLegacyLocalDisplayRoot() : this.getLegacyLocalFallbackRoot();
      const currentRoot = displayOnly ? this.getLocalDisplayRoot() : this.getLocalFallbackRoot();
      if (legacyRoot.toLowerCase() !== currentRoot.toLowerCase()) {
        candidates.push(this.resolveLocalFallbackPaths(legacyRoot, relativePath, storageKey));
      }
    }
    return candidates.filter((item, index, array) => array.findIndex((candidate) => candidate.filePath === item.filePath) === index);
  }

  private async putLocalObject(storageKey: string, buffer: Buffer, contentType: string) {
    const { filePath, metaPath } = this.listLocalFallbackPathCandidates(storageKey)[0];
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    await writeFile(metaPath, JSON.stringify({ contentType }, null, 2), "utf8");
    return true;
  }

  private async getLocalObject(storageKey: string): Promise<StoredObject | null> {
    for (const { filePath, metaPath } of this.listLocalFallbackPathCandidates(storageKey)) {
      try {
        await stat(filePath);
      } catch {
        continue;
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
    return null;
  }

  private async deleteLocalObject(storageKey: string) {
    const deleteResults = await Promise.all(
      this.listLocalFallbackPathCandidates(storageKey).map(async ({ filePath, metaPath }) => {
        const [fileDeleted] = await Promise.all([
          rm(filePath, { force: true }).then(() => true).catch(() => false),
          rm(metaPath, { force: true }).catch(() => false),
        ]);
        return fileDeleted;
      }),
    );
    return deleteResults.some(Boolean);
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

  private isTimeoutError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    return /timeout|timed out|response timeout|socket hang up|abort/i.test(message);
  }

  private async retryUploadOnTimeout(work: () => Promise<void>) {
    let lastError: unknown;
    for (let attempt = 0; attempt <= OSS_UPLOAD_RETRY_COUNT; attempt += 1) {
      try {
        await work();
        return;
      } catch (error) {
        lastError = error;
        if (!this.isTimeoutError(error) || attempt >= OSS_UPLOAD_RETRY_COUNT) {
          throw error;
        }
      }
    }
    throw lastError;
  }

  private toStorageError(error: unknown, fallbackMessage: string) {
    const detail = error instanceof Error ? error.message : "";
    return new ServiceUnavailableException(detail ? `${fallbackMessage}：${detail}` : fallbackMessage);
  }

  private matchMaterialLibraryStorageKey(normalizedKey: string, displayOnly = false) {
    const matched = /^works\/([^/]+)\/material-library\/(text|image|audio|video)\/(.+)$/i.exec(normalizedKey);
    if (!matched) {
      return null;
    }
    const [, brandId, category, rest] = matched;
    const normalizedCategory = this.normalizeMaterialCategory(category);
    const baseDir = displayOnly
      ? this.appConfigService.getLocalMaterialLibraryDisplayCategoryRoot(normalizedCategory)
      : this.appConfigService.getLocalMaterialLibraryCategoryRoot(normalizedCategory);
    return {
      baseDir,
      relativePath: `${brandId}/${rest}`.replace(/\\/g, "/").replace(/^\/+/, ""),
    };
  }

  private normalizeMaterialCategory(category: string): "text" | "image" | "audio" | "video" {
    const normalized = String(category || "").trim().toLowerCase();
    if (normalized === "image" || normalized === "audio" || normalized === "video") {
      return normalized;
    }
    return "text";
  }
}
