import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

function readServerVersion() {
  try {
    const packageJsonPath = resolve(process.cwd(), "package.json");
    if (!existsSync(packageJsonPath)) {
      return "0.1.0";
    }
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: string };
    return String(parsed.version || "").trim() || "0.1.0";
  } catch {
    return "0.1.0";
  }
}

const serverVersion = readServerVersion();

@Injectable()
export class AppService {
  constructor(private readonly prismaService: PrismaService) {}

  private readBooleanEnv(name: string) {
    const normalized = String(process.env[name] || "").trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
  }

  async getHealth() {
    const databaseAvailable = await this.prismaService.canUseDatabase();
    const memoryUsage = process.memoryUsage();
    const runtimeSeconds = Math.floor(process.uptime());
    const bodyLimit = String(process.env.SERVER_BODY_LIMIT || "100mb").trim() || "100mb";
    const gitSha = String(
      process.env.GIT_SHA
      || process.env.GITHUB_SHA
      || process.env.VERCEL_GIT_COMMIT_SHA
      || "",
    ).trim();

    return {
      app: {
        name: "ai-omni-ops-system-server",
        version: serverVersion,
        node: process.version,
        pid: process.pid,
        uptimeSeconds: runtimeSeconds,
        uptimeHuman: `${Math.floor(runtimeSeconds / 60)}m ${runtimeSeconds % 60}s`,
        gitSha: gitSha || null,
      },
      status: databaseAvailable ? "ok" : this.prismaService.isConfigured() ? "degraded" : "mock-ready",
      database: {
        ...(await this.prismaService.getSchemaSummary()),
        reachable: databaseAvailable,
      },
      runtime: {
        bodyLimit,
        runtimeDebugEnabled: this.readBooleanEnv("ENABLE_RUNTIME_DEBUG"),
        tikhubConfigured: Boolean(String(process.env.TIKHUB_API_KEY || "").trim()),
      },
      startupControls: {
        collectorsDailyHotspotCatchUp: this.readBooleanEnv("COLLECTORS_STARTUP_DAILY_HOTSPOT_CATCHUP"),
        collectorsVideoCacheCleanupCatchUp: this.readBooleanEnv("COLLECTORS_STARTUP_VIDEO_CACHE_CLEANUP_CATCHUP"),
        collectorsResumeDouyinVideoCache: this.readBooleanEnv("COLLECTORS_STARTUP_RESUME_DOUYIN_VIDEO_CACHE"),
        collectorsResumeDouyinTranscripts: this.readBooleanEnv("COLLECTORS_STARTUP_RESUME_DOUYIN_TRANSCRIPTS"),
      },
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
