import { NextRequest, NextResponse } from "next/server";
import { postRuntimeDebugEvent } from "../../../lib/runtime-debug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BACKEND_API_BASE_URL = resolveBackendApiBaseUrl();
const UPSTREAM_TIMEOUT_MS = 5 * 60 * 1000;
const DOUYIN_WORKSPACE_DEBUG_SESSION_ID = "douyin-workspace-false-502";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

async function proxyToBackend(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const requestUrl = new URL(request.url);
  const targetUrl = buildBackendUrl(path, requestUrl.search);
  const headers = buildUpstreamHeaders(request.headers);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const hasRequestBody = request.method !== "GET" && request.method !== "HEAD";
    const upstreamInit: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    };

    if (hasRequestBody && request.body) {
      // Stream large uploads through the Next proxy instead of buffering the whole body in memory.
      upstreamInit.body = request.body;
      upstreamInit.duplex = "half";
    }

    // #region debug-point I:digital-human-proxy-request
    if (targetUrl.includes("/douyin/digital-human")) {
      postRuntimeDebugEvent({
        sessionId: DOUYIN_WORKSPACE_DEBUG_SESSION_ID,
        runId: "pre-fix",
        hypothesisId: "I",
        location: "apps/web/src/app/api/[...path]/route.ts:proxyToBackend",
        msg: "[DEBUG] Next 代理准备转发数字人接口请求",
        data: { method: request.method, targetUrl },
      });
    }
    // #endregion

    const upstreamResponse = await fetch(targetUrl, upstreamInit);

    // #region debug-point I:digital-human-proxy-response
    if (targetUrl.includes("/douyin/digital-human")) {
      postRuntimeDebugEvent({
        sessionId: DOUYIN_WORKSPACE_DEBUG_SESSION_ID,
        runId: "pre-fix",
        hypothesisId: "I",
        location: "apps/web/src/app/api/[...path]/route.ts:proxyToBackend",
        msg: "[DEBUG] Next 代理收到数字人接口响应",
        data: { targetUrl, status: upstreamResponse.status, statusText: upstreamResponse.statusText },
      });
    }
    // #endregion

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上游接口代理失败";
    // #region debug-point I:digital-human-proxy-error
    if (targetUrl.includes("/douyin/digital-human")) {
      postRuntimeDebugEvent({
        sessionId: DOUYIN_WORKSPACE_DEBUG_SESSION_ID,
        runId: "pre-fix",
        hypothesisId: "I",
        location: "apps/web/src/app/api/[...path]/route.ts:proxyToBackend",
        msg: "[DEBUG] Next 代理抛出数字人接口异常",
        data: { targetUrl, message },
      });
    }
    // #endregion
    return NextResponse.json(
      {
        message: `上游服务暂时不可用（API 代理失败）：${message}`,
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function buildBackendUrl(pathSegments: string[], search: string) {
  const normalizedPath = Array.isArray(pathSegments) ? pathSegments.join("/") : "";
  const path = normalizedPath ? `/${normalizedPath}` : "";
  return `${BACKEND_API_BASE_URL}${path}${search || ""}`;
}

function buildUpstreamHeaders(sourceHeaders: Headers) {
  const headers = new Headers(sourceHeaders);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("x-forwarded-host");
  headers.delete("x-forwarded-port");
  headers.delete("x-forwarded-proto");
  return headers;
}

function resolveBackendApiBaseUrl() {
  const configured = String(process.env.INTERNAL_API_BASE_URL || process.env.API_PROXY_TARGET || "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://127.0.0.1:3011/api";
}
