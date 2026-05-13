import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BACKEND_API_BASE_URL = resolveBackendApiBaseUrl();
const UPSTREAM_TIMEOUT_MS = 5 * 60 * 1000;

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
    const body = request.method === "GET" || request.method === "HEAD"
      ? undefined
      : Buffer.from(await request.arrayBuffer());

    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });

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
