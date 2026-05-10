import { Buffer } from "node:buffer";
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
