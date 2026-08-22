import { createHash } from "node:crypto";
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ThirdPartyPlatformsService } from "./third-party-platforms.service";

const RUANWENJIE_BASE_URL = "https://api.kol.cn";
const RUANWENJIE_IDENTITY = "advertiser";
const RUANWENJIE_DEFAULT_CAPTCHA = "advertiser";
const RUANWENJIE_PLATFORM_BASE_URLS = [RUANWENJIE_BASE_URL, "https://www.ruanwenjie.com"];

type RuanwenjieCredential = {
  apiKey: string;
  mobile: string;
  password: string;
  identity: string;
  captchaToken: string;
  captcha: string;
};

type RuanwenjieApiEnvelope = {
  success?: boolean;
  message?: string;
  status?: number;
  data?: unknown;
  [key: string]: unknown;
};

type RuanwenjieApiError = {
  status?: number;
  message: string;
};

export type RuanwenjieMediaResourceRecord = {
  id: string;
  sortType: string;
  platform: string;
  taxonomy: string;
  area: string;
  name: string;
  caseUrl?: string;
  price: string;
  publishTime: string;
  successRate: string;
  includeRate: string;
  isSelfMedia: boolean;
  raw: Record<string, unknown>;
};

export type RuanwenjieMediaResourceWorkspace = {
  items: RuanwenjieMediaResourceRecord[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  syncedAt: string;
};

export type RuanwenjieDeliveryRecord = {
  orderId: string;
  resourceId: string;
  resourceName: string;
  articleId: string;
  articleTitle: string;
  createdAt: string;
  raw: Record<string, unknown>;
};

@Injectable()
export class RuanwenjieMediaService {
  private readonly tokenCache = new Map<string, string>();

  constructor(private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService) {}

  async listResources(brandId: string, page?: number): Promise<RuanwenjieMediaResourceWorkspace> {
    const credential = await this.resolveCredential(brandId);
    const normalizedPage = this.normalizePage(page);
    const payload = await this.callApiWithToken(credential, {
      method: "GET",
      path: "/api/news_resource_2/data",
      searchParams: {
        page: String(normalizedPage),
      },
    });
    return this.normalizeResourceWorkspace(payload, normalizedPage);
  }

  async createDelivery(
    brandId: string,
    payload: {
      resourceId: string;
      articleId: string;
      articleTitle: string;
      htmlContent: string;
    },
  ): Promise<RuanwenjieDeliveryRecord> {
    const credential = await this.resolveCredential(brandId);
    const resourceId = String(payload.resourceId || "").trim();
    const articleId = String(payload.articleId || "").trim();
    const articleTitle = String(payload.articleTitle || "").trim();
    const htmlContent = String(payload.htmlContent || "").trim();
    if (!resourceId) {
      throw new BadRequestException("请选择投放媒体");
    }
    if (!articleId) {
      throw new BadRequestException("请选择要投放的第三方媒体文章");
    }
    if (!articleTitle) {
      throw new BadRequestException("当前文章标题为空，暂时无法投放");
    }
    if (!htmlContent) {
      throw new BadRequestException("当前文章没有可投放的 HTML 内容");
    }

    const envelope = await this.callApiWithToken(credential, {
      method: "POST",
      path: "/api/news_order",
      body: {
        title: articleTitle,
        content: htmlContent,
        resource_id: resourceId,
      },
    });
    const data = this.asRecord(envelope.data);
    const createdAt = new Date().toISOString();
    return {
      orderId: this.readText(data.order_id) || this.readText(data.id) || "",
      resourceId: this.readText(data.resource_id) || resourceId,
      resourceName: this.readText(data.resource_name) || this.readText(data.name) || "",
      articleId,
      articleTitle,
      createdAt,
      raw: this.asRecord(data),
    };
  }

  private async resolveCredential(brandId: string): Promise<RuanwenjieCredential> {
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(brandId, RUANWENJIE_PLATFORM_BASE_URLS);
    if (resolution.status !== "resolved") {
      throw new ServiceUnavailableException(
        "当前品牌尚未配置软文街投放凭证，请先到个人中心-第三方接口配置里填写 API Key、登录账号和登录密码。",
      );
    }
    const rawCredential = String(resolution.apiKeys[0] || "").trim();
    return this.parseCredential(rawCredential);
  }

  private parseCredential(rawCredential: string): RuanwenjieCredential {
    const normalized = String(rawCredential || "").trim();
    if (!normalized) {
      throw new ServiceUnavailableException(
        "软文街投放凭证为空，请先到个人中心-第三方接口配置里填写 API Key、登录账号和登录密码。",
      );
    }

    const parsedJson = this.parseJsonRecord(normalized);
    if (parsedJson) {
      const apiKey = this.readText(parsedJson.apiKey);
      const mobile = this.readText(parsedJson.mobile);
      const password = this.readText(parsedJson.password);
      if (apiKey && mobile && password) {
        return {
          apiKey,
          mobile,
          password,
          identity: this.readText(parsedJson.identity) || RUANWENJIE_IDENTITY,
          captchaToken: this.readText(parsedJson.captchaToken) || this.readText(parsedJson.captcha_token) || RUANWENJIE_DEFAULT_CAPTCHA,
          captcha: this.readText(parsedJson.captcha) || RUANWENJIE_DEFAULT_CAPTCHA,
        };
      }
    }

    const parts = normalized
      .split("::")
      .map((item) => item.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      return {
        apiKey: parts[0],
        mobile: parts[1],
        password: parts[2],
        identity: parts[3] || RUANWENJIE_IDENTITY,
        captchaToken: parts[4] || RUANWENJIE_DEFAULT_CAPTCHA,
        captcha: parts[5] || RUANWENJIE_DEFAULT_CAPTCHA,
      };
    }

    throw new ServiceUnavailableException(
      "软文街投放凭证格式不正确，请在个人中心填写 API Key、登录账号和登录密码后再重试。",
    );
  }

  private async callApiWithToken(
    credential: RuanwenjieCredential,
    request: {
      method: "GET" | "POST";
      path: string;
      searchParams?: Record<string, string>;
      body?: Record<string, string>;
    },
    hasRetried = false,
  ): Promise<RuanwenjieApiEnvelope> {
    const token = await this.getToken(credential, hasRetried);
    try {
      return await this.requestEnvelope(credential, {
        ...request,
        token,
      });
    } catch (error) {
      const apiError = this.normalizeApiError(error);
      if (!hasRetried && apiError.status === 401) {
        this.tokenCache.delete(this.buildCredentialCacheKey(credential));
        return this.callApiWithToken(credential, request, true);
      }
      throw error;
    }
  }

  private async getToken(credential: RuanwenjieCredential, forceRefresh = false) {
    const cacheKey = this.buildCredentialCacheKey(credential);
    if (!forceRefresh) {
      const cached = this.tokenCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const envelope = await this.requestEnvelope(credential, {
      method: "POST",
      path: "/api/auth/authenticate",
      body: {
        mobile: credential.mobile,
        password: credential.password,
        identity: credential.identity,
        captcha_token: credential.captchaToken,
        captcha: credential.captcha,
        api_key: credential.apiKey,
      },
    });
    const token = this.readText(this.asRecord(envelope.data).token);
    if (!token) {
      throw new ServiceUnavailableException("软文街登录成功但未返回 token，请稍后重试。");
    }
    this.tokenCache.set(cacheKey, token);
    return token;
  }

  private async requestEnvelope(
    credential: RuanwenjieCredential,
    options: {
      method: "GET" | "POST";
      path: string;
      token?: string;
      searchParams?: Record<string, string>;
      body?: Record<string, string>;
    },
  ): Promise<RuanwenjieApiEnvelope> {
    const url = new URL(`${RUANWENJIE_BASE_URL}${options.path}`);
    const searchParams = new URLSearchParams();
    if (options.token && options.method === "GET") {
      searchParams.set("token", options.token);
    }
    Object.entries(options.searchParams || {}).forEach(([key, value]) => {
      if (String(value || "").trim()) {
        searchParams.set(key, String(value));
      }
    });
    url.search = searchParams.toString();

    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
    };
    let bodyText: string | undefined;
    if (options.method === "POST") {
      headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
      const formData = new URLSearchParams();
      if (options.token) {
        formData.set("token", options.token);
      }
      Object.entries(options.body || {}).forEach(([key, value]) => {
        formData.set(key, String(value || ""));
      });
      bodyText = formData.toString();
    }

    const response = await fetch(url.toString(), {
      method: options.method,
      headers,
      body: bodyText,
    });
    const rawText = await response.text();
    const envelope = this.parseEnvelope(rawText);
    const envelopeStatus = this.readStatusCode(envelope);
    const message = this.readMessage(envelope) || `${options.path} 调用失败`;

    if (!response.ok || envelopeStatus === 401) {
      throw {
        status: envelopeStatus || response.status,
        message,
      } satisfies RuanwenjieApiError;
    }
    if (envelope.success === false) {
      throw {
        status: envelopeStatus || response.status,
        message,
      } satisfies RuanwenjieApiError;
    }
    return envelope;
  }

  private normalizeResourceWorkspace(payload: RuanwenjieApiEnvelope, requestedPage: number): RuanwenjieMediaResourceWorkspace {
    const container = this.unwrapListContainer(payload);
    const items = this.unwrapListItems(container).map((item) => this.normalizeResourceItem(item));
    const pageSize = this.readNumber(container.per_page)
      || this.readNumber(container.page_size)
      || this.readNumber(container.pageSize)
      || items.length
      || 100;
    const currentPage = this.readNumber(container.current_page)
      || this.readNumber(container.page)
      || requestedPage;
    const total = this.readNumber(container.total)
      || this.readNumber(container.count)
      || this.readNumber(container.total_count)
      || (items.length + (currentPage - 1) * pageSize);
    const lastPage = this.readNumber(container.last_page)
      || this.readNumber(container.total_page)
      || Math.max(currentPage, pageSize > 0 ? Math.ceil(total / pageSize) : currentPage);
    return {
      items,
      page: currentPage,
      pageSize,
      total,
      hasMore: currentPage < lastPage || (currentPage * pageSize < total),
      syncedAt: new Date().toISOString(),
    };
  }

  private unwrapListContainer(payload: RuanwenjieApiEnvelope) {
    const data = payload.data;
    if (Array.isArray(data)) {
      return { list: data };
    }
    const first = this.asRecord(data);
    if (Array.isArray(first.data) || Array.isArray(first.list) || Array.isArray(first.items)) {
      return first;
    }
    const nestedData = this.asRecord(first.data);
    if (Array.isArray(nestedData.data) || Array.isArray(nestedData.list) || Array.isArray(nestedData.items)) {
      return nestedData;
    }
    return first;
  }

  private unwrapListItems(container: Record<string, unknown>) {
    if (Array.isArray(container.data)) {
      return container.data.map((item) => this.asRecord(item));
    }
    if (Array.isArray(container.list)) {
      return container.list.map((item) => this.asRecord(item));
    }
    if (Array.isArray(container.items)) {
      return container.items.map((item) => this.asRecord(item));
    }
    return [];
  }

  private normalizeResourceItem(item: Record<string, unknown>): RuanwenjieMediaResourceRecord {
    return {
      id: this.readText(item.id),
      sortType: this.readText(item.sort_type),
      platform: this.readText(item.platform),
      taxonomy: this.readText(item.taxonomy),
      area: this.readText(item.area),
      name: this.readText(item.name),
      caseUrl: this.readText(item.case_url) || undefined,
      price: this.readText(item.price),
      publishTime: this.readText(item.publish_time),
      successRate: this.readText(item.success_radio),
      includeRate: this.readText(item.include_radio),
      isSelfMedia: this.readBoolean(item.is_zimeiti),
      raw: item,
    };
  }

  private parseEnvelope(rawText: string): RuanwenjieApiEnvelope {
    if (!rawText.trim()) {
      return {};
    }
    try {
      return JSON.parse(rawText) as RuanwenjieApiEnvelope;
    } catch {
      throw new ServiceUnavailableException("软文街接口返回了无法解析的响应内容，请稍后重试。");
    }
  }

  private normalizeApiError(error: unknown): RuanwenjieApiError {
    if (error && typeof error === "object" && "message" in error) {
      return {
        status: "status" in error && typeof (error as { status?: unknown }).status === "number"
          ? Number((error as { status?: number }).status)
          : undefined,
        message: String((error as { message: unknown }).message || "软文街接口调用失败"),
      };
    }
    return {
      message: error instanceof Error ? error.message : "软文街接口调用失败",
    };
  }

  private normalizePage(value?: number) {
    const page = Number(value || 1);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  }

  private buildCredentialCacheKey(credential: RuanwenjieCredential) {
    return createHash("sha1")
      .update(JSON.stringify({
        apiKey: credential.apiKey,
        mobile: credential.mobile,
        password: credential.password,
      }))
      .digest("hex");
  }

  private parseJsonRecord(value: string) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : undefined;
    } catch {
      return undefined;
    }
  }

  private asRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private readText(value: unknown) {
    return typeof value === "string" || typeof value === "number"
      ? String(value).trim()
      : "";
  }

  private readNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private readBoolean(value: unknown) {
    const normalized = this.readText(value).toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  private readStatusCode(payload: RuanwenjieApiEnvelope) {
    return this.readNumber(payload.status)
      || this.readNumber(this.asRecord(payload.data).status)
      || this.readNumber(this.asRecord(this.asRecord(payload.data).data).status);
  }

  private readMessage(payload: RuanwenjieApiEnvelope) {
    return this.readText(payload.message)
      || this.readText(this.asRecord(payload.data).message)
      || this.readText(this.asRecord(this.asRecord(payload.data).data).message);
  }
}
