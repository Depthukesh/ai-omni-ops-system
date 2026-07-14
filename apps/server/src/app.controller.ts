import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Body, Controller, Delete, Get, Post, Query } from "@nestjs/common";
import { isRuntimeDebugEnabled } from "./common/runtime-debug";

type BrowserDebugEvent = {
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
  location?: string;
  msg?: string;
  data?: unknown;
  ts?: number;
};

function normalizeSessionId(value: string | undefined) {
  return (value || "browser-debug").trim().replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "browser-debug";
}

function resolveLogFilePath(sessionId: string) {
  return resolve(process.cwd(), ".dbg", `browser-debug-${sessionId}.ndjson`);
}

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      app: "ai-omni-ops-system-server",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Post("debug/browser-event")
  async recordBrowserDebugEvent(@Body() payload: BrowserDebugEvent) {
    if (!isRuntimeDebugEnabled()) {
      return { ok: false, disabled: true };
    }

    const sessionId = normalizeSessionId(payload.sessionId);
    const filePath = resolveLogFilePath(sessionId);
    await mkdir(resolve(process.cwd(), ".dbg"), { recursive: true });
    const event = {
      sessionId,
      runId: String(payload.runId || "pre-fix"),
      hypothesisId: String(payload.hypothesisId || "U"),
      location: String(payload.location || "unknown"),
      msg: String(payload.msg || "[DEBUG] browser event"),
      data: payload.data ?? null,
      ts: typeof payload.ts === "number" ? payload.ts : Date.now(),
    };
    await appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");
    return { ok: true };
  }

  @Get("debug/browser-logs")
  async getBrowserDebugLogs(@Query("sessionId") sessionIdQuery?: string, @Query("last") lastQuery?: string) {
    if (!isRuntimeDebugEnabled()) {
      return {
        sessionId: normalizeSessionId(sessionIdQuery),
        count: 0,
        items: [],
        disabled: true,
      };
    }

    const sessionId = normalizeSessionId(sessionIdQuery);
    const filePath = resolveLogFilePath(sessionId);
    const content = await readFile(filePath, "utf8").catch(() => "");
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const last = Number.parseInt(String(lastQuery || ""), 10);
    const selected = Number.isFinite(last) && last > 0 ? lines.slice(-last) : lines;
    return {
      sessionId,
      count: selected.length,
      items: selected.map((line) => JSON.parse(line)),
    };
  }

  @Delete("debug/browser-logs")
  async clearBrowserDebugLogs(@Query("sessionId") sessionIdQuery?: string) {
    if (!isRuntimeDebugEnabled()) {
      return { ok: false, disabled: true, sessionId: normalizeSessionId(sessionIdQuery) };
    }

    const sessionId = normalizeSessionId(sessionIdQuery);
    const filePath = resolveLogFilePath(sessionId);
    await mkdir(resolve(process.cwd(), ".dbg"), { recursive: true });
    await writeFile(filePath, "", "utf8");
    return { ok: true, sessionId };
  }
}
