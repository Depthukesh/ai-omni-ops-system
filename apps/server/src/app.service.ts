import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

const serverPackageJson: { version?: string } = require("../package.json");

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
        version: serverPackageJson.version || "0.0.0",
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
