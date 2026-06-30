import { Buffer } from "node:buffer";
import { extname } from "node:path";
import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service";

type WechatCredential = {
  appId: string;
  appSecret: string;
};

type PublishWechatDraftPayload = {
  title: string;
  author?: string;
  summary?: string;
  htmlContent: string;
  coverImageUrl: string;
  needOpenComment: boolean;
  onlyFansCanComment: boolean;
};

type WechatTokenResponse = {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
};

type WechatMaterialUploadResponse = {
  media_id?: string;
  url?: string;
  errcode?: number;
  errmsg?: string;
};

type WechatDraftAddResponse = {
  media_id?: string;
  errcode?: number;
  errmsg?: string;
};

type WechatContentImageUploadResponse = {
  url?: string;
  errcode?: number;
  errmsg?: string;
};

type CachedToken = {
  accessToken: string;
  expireAtMs: number;
};

const WECHAT_API_BASE_URL = "https://api.weixin.qq.com";

@Injectable()
export class WechatOfficialAccountApiService {
  private readonly tokenCache = new Map<string, CachedToken>();

  constructor(
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
  ) {}

  async publishDraft(credential: WechatCredential, payload: PublishWechatDraftPayload) {
    return this.withAccessTokenRetry(credential, async (accessToken) => {
      const thumbMediaId = await this.uploadCoverImage(accessToken, payload.coverImageUrl);
      const resolvedHtmlContent = await this.uploadContentImages(accessToken, payload.htmlContent);
      const normalizedDigest = this.normalizeWechatDigest(payload.summary, resolvedHtmlContent);
      const response = await this.requestJson<WechatDraftAddResponse>(
        `/cgi-bin/draft/add?access_token=${encodeURIComponent(accessToken)}`,
        {
          method: "POST",
          body: {
            articles: [
              {
                title: payload.title,
                author: payload.author || "",
                digest: normalizedDigest,
                content: resolvedHtmlContent,
                thumb_media_id: thumbMediaId,
                need_open_comment: payload.needOpenComment ? 1 : 0,
                only_fans_can_comment: payload.onlyFansCanComment ? 1 : 0,
              },
            ],
          },
        },
      );
      const mediaId = String(response.media_id || "").trim();
      if (!mediaId) {
        throw new ServiceUnavailableException("微信公众号 draft/add 发布失败：未返回 media_id");
      }
      return {
        mediaId,
        thumbMediaId,
      };
    });
  }

  private async uploadCoverImage(accessToken: string, coverImageUrl: string) {
    const file = await this.downloadRemoteFile(coverImageUrl);
    const form = new FormData();
    form.set("media", new Blob([file.buffer], { type: file.contentType }), file.fileName);
    const response = await this.requestJson<WechatMaterialUploadResponse>(
      `/cgi-bin/material/add_material?access_token=${encodeURIComponent(accessToken)}&type=image`,
      {
        method: "POST",
        body: form,
        contentType: "multipart/form-data",
      },
    );
    const mediaId = String(response.media_id || "").trim();
    if (!mediaId) {
      throw new ServiceUnavailableException("微信公众号素材上传失败：未返回 media_id");
    }
    return mediaId;
  }

  private async uploadContentImages(accessToken: string, htmlContent: string) {
    const normalizedHtml = String(htmlContent || "").trim();
    if (!normalizedHtml) {
      return normalizedHtml;
    }
    const imageTags = Array.from(normalizedHtml.matchAll(/<img\b[^>]*>/gi));
    if (!imageTags.length) {
      return normalizedHtml;
    }
    const uploadCache = new Map<string, string>();
    for (const tagMatch of imageTags) {
      const tag = String(tagMatch[0] || "");
      const sourceUrl = this.extractImageSource(tag);
      if (!sourceUrl || uploadCache.has(sourceUrl) || this.isWechatHostedImageUrl(sourceUrl)) {
        continue;
      }
      uploadCache.set(sourceUrl, await this.uploadContentImage(accessToken, sourceUrl));
    }
    if (!uploadCache.size) {
      return normalizedHtml;
    }
    return normalizedHtml.replace(/<img\b[^>]*>/gi, (tag) => {
      const sourceUrl = this.extractImageSource(tag);
      if (!sourceUrl) {
        return tag;
      }
      const uploadedUrl = uploadCache.get(sourceUrl);
      if (!uploadedUrl || uploadedUrl === sourceUrl) {
        return tag;
      }
      if (/\bsrc\s*=/i.test(tag)) {
        return tag.replace(/\bsrc\s*=\s*(['"])(.*?)\1/i, `src="${uploadedUrl}"`);
      }
      return tag.replace(/<img\b/i, `<img src="${uploadedUrl}"`);
    });
  }

  private async uploadContentImage(accessToken: string, imageUrl: string) {
    const file = await this.downloadRemoteFile(imageUrl);
    const form = new FormData();
    form.set("media", new Blob([file.buffer], { type: file.contentType }), file.fileName);
    const response = await this.requestJson<WechatContentImageUploadResponse>(
      `/cgi-bin/media/uploadimg?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        body: form,
        contentType: "multipart/form-data",
      },
    );
    const uploadedUrl = String(response.url || "").trim();
    if (!uploadedUrl) {
      throw new ServiceUnavailableException("微信公众号正文图片上传失败：未返回 url");
    }
    return uploadedUrl;
  }

  private extractImageSource(tag: string) {
    const match = String(tag || "").match(/\bsrc\s*=\s*(['"])(.*?)\1/i);
    return String(match?.[2] || "").trim();
  }

  private isWechatHostedImageUrl(url: string) {
    return /^https?:\/\/mmbiz\.qpic\.cn\//i.test(String(url || "").trim());
  }

  private normalizeWechatDigest(summary: string | undefined, htmlContent: string) {
    const preferred = String(summary || "").trim() || this.extractPlainTextFromHtml(htmlContent);
    const normalized = preferred
      .replace(/\s+/g, " ")
      .replace(/[“”]/g, "\"")
      .replace(/[‘’]/g, "'")
      .trim();
    return this.truncateUtf8ByByteLength(normalized, 120);
  }

  private truncateUtf8ByByteLength(content: string, maxBytes: number) {
    const normalized = String(content || "").trim();
    if (!normalized || maxBytes <= 0) {
      return "";
    }
    let result = "";
    let currentBytes = 0;
    for (const char of normalized) {
      const byteLength = Buffer.byteLength(char, "utf8");
      if (currentBytes + byteLength > maxBytes) {
        break;
      }
      result += char;
      currentBytes += byteLength;
    }
    return result.trim();
  }

  private extractPlainTextFromHtml(htmlContent: string) {
    return String(htmlContent || "")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|blockquote|pre)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, "\"")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  private async withAccessTokenRetry<T>(credential: WechatCredential, run: (accessToken: string) => Promise<T>) {
    try {
      return await run(await this.getAccessToken(credential));
    } catch (error) {
      if (!this.isExpiredAccessTokenError(error)) {
        throw error;
      }
      this.clearAccessTokenCache(credential);
      return run(await this.getAccessToken(credential));
    }
  }

  private async getAccessToken(credential: WechatCredential) {
    const cacheKey = `${credential.appId}::${credential.appSecret}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expireAtMs > Date.now() + 60_000) {
      return cached.accessToken;
    }
    const response = await this.requestJson<WechatTokenResponse>(
      `/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(credential.appId)}&secret=${encodeURIComponent(credential.appSecret)}`,
      {
        method: "GET",
      },
    );
    const accessToken = String(response.access_token || "").trim();
    if (!accessToken) {
      throw new ServiceUnavailableException("微信公众号 Access Token 获取失败：未返回 access_token");
    }
    const expireAtMs = Date.now() + Math.max(300, Number(response.expires_in || 7200)) * 1000;
    this.tokenCache.set(cacheKey, {
      accessToken,
      expireAtMs,
    });
    return accessToken;
  }

  private clearAccessTokenCache(credential: WechatCredential) {
    this.tokenCache.delete(`${credential.appId}::${credential.appSecret}`);
  }

  private isExpiredAccessTokenError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    return /\b(40001|40014|42001)\b/.test(message);
  }

  private async downloadRemoteFile(url: string) {
    const normalizedUrl = String(url || "").trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      throw new ServiceUnavailableException("公众号封面图地址无效，必须是可访问的 http/https URL。");
    }
    const response = await fetch(normalizedUrl, {
      method: "GET",
      headers: {
        Accept: "image/*,application/octet-stream;q=0.8,*/*;q=0.2",
      },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`下载公众号封面图失败：${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) {
      throw new ServiceUnavailableException("下载公众号封面图失败：返回内容为空");
    }
    const contentType = this.normalizeContentType(response.headers.get("content-type"));
    return {
      buffer,
      contentType,
      fileName: this.resolveFileName(normalizedUrl, contentType),
    };
  }

  private normalizeContentType(value: string | null) {
    const text = String(value || "").split(";")[0].trim().toLowerCase();
    if (text.startsWith("image/")) {
      return text;
    }
    return "image/jpeg";
  }

  private resolveFileName(url: string, contentType: string) {
    try {
      const pathname = new URL(url).pathname;
      const rawExtension = extname(pathname).toLowerCase();
      const extension = rawExtension || this.extensionFromContentType(contentType);
      return `wechat-cover${extension || ".jpg"}`;
    } catch {
      return `wechat-cover${this.extensionFromContentType(contentType) || ".jpg"}`;
    }
  }

  private extensionFromContentType(contentType: string) {
    switch (contentType) {
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      case "image/gif":
        return ".gif";
      default:
        return ".jpg";
    }
  }

  private async requestJson<T>(
    requestPath: string,
    options: {
      method: "GET" | "POST";
      body?: Record<string, unknown> | FormData;
      contentType?: "application/json" | "multipart/form-data";
    },
  ) {
    const response = await fetch(`${WECHAT_API_BASE_URL}${requestPath}`, {
      method: options.method,
      headers: {
        Accept: "application/json",
        ...(options.method === "POST" && options.contentType !== "multipart/form-data"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        options.method === "POST"
          ? options.contentType === "multipart/form-data"
            ? options.body as FormData
            : JSON.stringify(options.body || {})
          : undefined,
    });
    const rawText = await response.text();
    const payload = this.tryParseJson<T & { errcode?: number; errmsg?: string }>(rawText);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `微信公众号接口请求失败：${options.method} ${requestPath} ${response.status}${this.buildApiErrorSuffix(payload?.errmsg, rawText)}`,
      );
    }
    if (!payload) {
      throw new ServiceUnavailableException(`微信公众号接口返回非 JSON：${options.method} ${requestPath}`);
    }
    if (Number(payload.errcode || 0) !== 0) {
      throw new ServiceUnavailableException(
        `微信公众号接口返回异常：${payload.errcode || "UNKNOWN"} ${String(payload.errmsg || "未知错误").trim()}`,
      );
    }
    return payload as T;
  }

  private tryParseJson<T>(rawText: string) {
    const normalized = String(rawText || "").trim();
    if (!normalized) {
      return undefined;
    }
    try {
      return JSON.parse(normalized) as T;
    } catch {
      return undefined;
    }
  }

  private buildApiErrorSuffix(apiMessage: string | undefined, rawText: string) {
    const detail = String(apiMessage || "").trim() || String(rawText || "").replace(/\s+/g, " ").trim();
    return detail ? `，${detail.slice(0, 180)}` : "";
  }
}
