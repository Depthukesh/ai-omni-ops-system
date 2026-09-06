import { Readable } from "node:stream";
import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import type { RequestAuthContext } from "../auth/auth.service";
import { AuthService } from "../auth/auth.service";
import { DUOYUANX_API_BASE_URL } from "../../common/api-provider-catalog";
import { ThirdPartyPlatformsService } from "../third-party-platforms/third-party-platforms.service";
import { OpenClawInstallationService } from "./openclaw-installation.service";

type HeadersMap = Record<string, string | string[] | undefined>;

type ProxyResponse = {
  status: number;
  headers: Record<string, string>;
  body?: Readable;
};

@Injectable()
export class OpenClawOpenChatCutGatewayService {
  private readonly responseHeadersToSkip = new Set([
    "connection",
    "content-encoding",
    "content-length",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ]);

  constructor(
    private readonly authService: AuthService,
    private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService,
    private readonly openClawInstallationService: OpenClawInstallationService,
  ) {}

  async proxyRequest(
    headers: HeadersMap,
    request: {
      method?: string;
      headers?: Record<string, unknown>;
      body?: unknown;
      originalUrl?: string;
      raw?: unknown;
    },
    upstreamPath: string,
  ): Promise<ProxyResponse> {
    const gatewayAccess = await this.resolveGatewayAccess(headers);
    const targetUrl = this.buildTargetUrl(upstreamPath, request.originalUrl);
    const method = String(request.method || "GET").trim().toUpperCase() || "GET";
    const requestHeaders = this.buildUpstreamHeaders(request.headers, gatewayAccess.apiKey, request.body);
    const requestBody = this.buildUpstreamBody(method, request.headers, request.body, request.raw);

    let response: globalThis.Response;
    try {
      response = await fetch(targetUrl, {
        method,
        headers: requestHeaders,
        body: requestBody.body,
        duplex: requestBody.duplex,
      } as RequestInit & { duplex?: "half" });
    } catch (error) {
      throw new ServiceUnavailableException(
        `OpenChatCut 网关暂时无法连接多元探索接口：${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      status: response.status,
      headers: this.collectResponseHeaders(response.headers),
      body: response.body ? Readable.fromWeb(response.body as any) : undefined,
    };
  }

  private async resolveGatewayAccess(headers: HeadersMap) {
    const auth = await this.requireAuth(headers);
    const brandId = await this.requireCurrentBrandId(auth);
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(brandId, [DUOYUANX_API_BASE_URL]);
    const apiKey = String(resolution.apiKeys[0] || "").trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "当前品牌还没有可用的多元探索共享 Key。请先到 个人中心 -> 第三方平台 配置多元探索，再让 OpenChatCut 走本站网关。",
      );
    }
    return {
      brandId,
      apiKey,
      resolvedFrom: resolution.resolvedFrom || "",
    };
  }

  private async requireAuth(headers: HeadersMap): Promise<RequestAuthContext> {
    const installAuth = await this.openClawInstallationService.resolveInstallToken(headers);
    const auth = installAuth ?? await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录，或使用 OpenClaw 安装令牌访问 OpenChatCut 网关");
    }
    return auth;
  }

  private async requireCurrentBrandId(auth: RequestAuthContext) {
    if (auth.brandId) {
      return auth.brandId;
    }
    const brands = await this.authService.getBrands(auth);
    if (!brands.currentBrandId) {
      throw new UnauthorizedException("当前账号没有可用品牌");
    }
    return brands.currentBrandId;
  }

  private buildTargetUrl(upstreamPath: string, originalUrl?: string) {
    const url = new URL(upstreamPath, `${DUOYUANX_API_BASE_URL}/`);
    const query = String(originalUrl || "").split("?")[1] || "";
    if (query) {
      url.search = query;
    }
    return url.toString();
  }

  private buildUpstreamHeaders(
    sourceHeaders: Record<string, unknown> | undefined,
    apiKey: string,
    body: unknown,
  ) {
    const headers = new Headers();
    headers.set("authorization", `Bearer ${apiKey}`);

    const accept = this.readRequestHeader(sourceHeaders, "accept");
    if (accept) {
      headers.set("accept", accept);
    }

    const contentType = this.readRequestHeader(sourceHeaders, "content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    } else if (body !== undefined && body !== null) {
      headers.set("content-type", "application/json");
    }

    return headers;
  }

  private buildUpstreamBody(
    method: string,
    sourceHeaders: Record<string, unknown> | undefined,
    body: unknown,
    rawRequest: unknown,
  ): { body?: BodyInit; duplex?: "half" } {
    if (method === "GET" || method === "HEAD") {
      return {};
    }

    const contentType = this.readRequestHeader(sourceHeaders, "content-type").toLowerCase();
    if (contentType.includes("multipart/form-data")) {
      return {
        body: rawRequest as BodyInit,
        duplex: "half",
      };
    }

    if (body === undefined || body === null) {
      return {};
    }
    if (typeof body === "string" || body instanceof Uint8Array || body instanceof ArrayBuffer || Buffer.isBuffer(body)) {
      return {
        body: body as BodyInit,
      };
    }

    return {
      body: JSON.stringify(body),
    };
  }

  private collectResponseHeaders(source: globalThis.Headers) {
    const headers: Record<string, string> = {};
    source.forEach((value, key) => {
      if (this.responseHeadersToSkip.has(key.toLowerCase())) {
        return;
      }
      headers[key] = value;
    });
    return headers;
  }

  private readRequestHeader(sourceHeaders: Record<string, unknown> | undefined, key: string) {
    if (!sourceHeaders) {
      return "";
    }
    const value = sourceHeaders[key] ?? sourceHeaders[key.toLowerCase()] ?? sourceHeaders[key.toUpperCase()];
    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : "";
    }
    return typeof value === "string" ? value : "";
  }
}
