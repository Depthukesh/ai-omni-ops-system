import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { MediaType, Prisma } from "@prisma/client";
import { database } from "../../common/mock-data";
import type { ApiProviderRecord } from "../../common/mock-data";
import {
  THIRD_PARTY_PLATFORM_SEEDS,
  isDecommissionedPlatformBaseUrl,
  resolvePlatformWebsiteUrl,
  type ThirdPartyPlatformRecord,
} from "../../common/third-party-platform-catalog";
import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OssStorageService } from "../../storage/oss-storage.service";
import { DEFAULT_OPENCLAW_WORKSPACE_SCOPE, normalizeOpenClawWorkspaceScope } from "../openclaw/openclaw-workspace-scope";
import { ApiProvidersService } from "../admin/api-providers.service";
import { ChanjingOpenApiService } from "../works/chanjing-open-api.service";

export type CreateThirdPartyPlatformPayload = {
  name: string;
  providerType: ThirdPartyPlatformRecord["providerType"];
  status?: ThirdPartyPlatformRecord["status"];
  baseUrl: string;
  websiteUrl?: string;
  tutorialUrl?: string;
  modelIds?: string[];
  defaultModel?: string;
  remark?: string;
};

export type UpdateThirdPartyPlatformPayload = {
  name?: string;
  providerType?: ThirdPartyPlatformRecord["providerType"];
  status?: ThirdPartyPlatformRecord["status"];
  baseUrl?: string;
  websiteUrl?: string;
  tutorialUrl?: string;
  modelIds?: string[];
  defaultModel?: string;
  remark?: string;
};

export type UpdateBrandThirdPartyPlatformSecretPayload = {
  apiKey?: string;
};

export type UserThirdPartyPlatformRecord = ThirdPartyPlatformRecord & {
  apiKey: string;
  effectiveApiKeyMasked: string;
  dynamicStats?: {
    status: "ready" | "partial" | "missing_credential" | "error";
    templateCount?: number;
    customPersonCount?: number;
    tagCount?: number;
    syncedAt?: string;
    message?: string;
  };
};

export type BrandRuntimeApiKeyResolution =
  | {
      status: "no-platform-match" | "brand-context-missing";
      platform?: undefined;
      resolvedFrom?: undefined;
      apiKeys: [];
    }
  | {
      status: "resolved";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl">;
      resolvedFrom: "brand" | "local-env";
      apiKeys: string[];
    }
  | {
      status: "brand-api-key-missing";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl">;
      resolvedFrom?: undefined;
      apiKeys: [];
    };

export type BrandRuntimeAccessSummary =
  | {
      status: "brand-context-missing" | "no-platform-match";
      platform?: undefined;
      openClawCanUse: false;
      effectiveApiKeyMasked: "";
      resolvedFrom?: undefined;
    }
  | {
      status: "resolved";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl" | "websiteUrl" | "defaultModel">;
      openClawCanUse: true;
      effectiveApiKeyMasked: string;
      resolvedFrom: "brand" | "local-env";
    }
  | {
      status: "brand-api-key-missing";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl" | "websiteUrl" | "defaultModel">;
      openClawCanUse: false;
      effectiveApiKeyMasked: "";
      resolvedFrom?: undefined;
    };

export type MixedcutCapabilityKey = "llm" | "vision" | "image";

export type MixedcutAiConfigSyncSource = {
  capability: MixedcutCapabilityKey;
  providerId: string;
  providerName: string;
  baseUrl: string;
  model: string;
  appliedField: string;
};

export type MixedcutAiConfigPreview = {
  installRoot: string;
  configFilePath: string;
  configFileExists: boolean;
  config: Record<string, unknown>;
  sources: MixedcutAiConfigSyncSource[];
  warnings: string[];
};

export type MixedcutMediaAssetRecord = {
  id: string;
  brandId?: string;
  title: string;
  mediaType: string;
  assetUrl?: string;
  sourceUrl?: string;
  mimeType?: string;
  fileSize?: number;
  durationSec?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateMixedcutRemixTaskPayload = {
  mediaAssetIds?: string[];
  name?: string;
  style?: "dynamic" | "calm" | "exciting";
  targetDurationSeconds?: number;
  workspaceScope?: string;
  archiveToOpenClawVideoWorks?: boolean;
  createdByUserId?: string;
};

export type MixedcutUploadedVideoRecord = {
  mediaAssetId: string;
  title: string;
  fileName: string;
  mixedcutPath: string;
};

export type MixedcutRemixSourceRecord = {
  id: string;
  brandId?: string | null;
  title: string;
  sourceUrl?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  durationSec?: number | null;
  metadataJson?: unknown;
};

export type MixedcutRemixTaskRecord = {
  taskId: string;
  projectId?: string;
  status: string;
  progress: number;
  error?: string;
  videoUrl?: string;
  videoPath?: string;
  outputPath?: string;
  duration?: number;
  targetDurationSeconds?: number;
  actualDurationSeconds?: number;
  durationDeltaSeconds?: number;
  durationWithinTolerance?: boolean;
  videoCount?: number;
  mode?: string;
  editingMode?: string;
  timeline: unknown[];
  uploadedVideos?: MixedcutUploadedVideoRecord[];
  openClawVideoWorkId?: string;
  openClawVideoWorkWorkspaceScope?: string;
  archiveStatus?: "saved" | "failed";
  archiveMessage?: string;
};

type ThirdPartyPlatformRow = {
  id: string;
  name: string;
  providerType: string;
  status: string;
  baseUrl: string;
  websiteUrl: string;
  tutorialUrl: string;
  modelIdsJson: unknown;
  defaultModel: string;
  remark: string;
  updatedAt: Date | string;
};

type BrandThirdPartyPlatformSecretRow = {
  id: string;
  brandId: string;
  platformId: string;
  apiKey: string;
  updatedAt: Date | string;
};

type ThirdPartyPlatformGroup = {
  platform: ThirdPartyPlatformRecord;
  aliasIds: string[];
};

type OpenClawVideoWorkRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  title: string;
  description: string;
  scriptContent: string;
  coverImageUrl: string | null;
  videoUrl: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

@Injectable()
export class ThirdPartyPlatformsService {
  private static readonly MIXEDCUT_DURATION_TOLERANCE_SECONDS = 0.35;

  private bootstrapPromise?: Promise<void>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly apiProvidersService: ApiProvidersService,
    private readonly chanjingOpenApiService: ChanjingOpenApiService,
    private readonly appConfigService: AppConfigService,
    private readonly ossStorageService: OssStorageService,
  ) {}

  async previewBrandMixedcutAiConfig(brandId: string): Promise<MixedcutAiConfigPreview> {
    return this.buildMixedcutAiConfigPreview(brandId);
  }

  async syncBrandMixedcutAiConfig(brandId: string): Promise<MixedcutAiConfigPreview> {
    const preview = await this.buildMixedcutAiConfigPreview(brandId);
    await mkdir(path.dirname(preview.configFilePath), { recursive: true });
    await writeFile(preview.configFilePath, `${JSON.stringify(preview.config, null, 2)}\n`, "utf8");
    return {
      ...preview,
      configFileExists: true,
    };
  }

  async listBrandMixedcutMediaAssets(brandId: string): Promise<{ items: MixedcutMediaAssetRecord[] }> {
    if (await this.prismaService.canUseDatabase()) {
      const items = await this.prismaService.mediaAsset.findMany({
        where: {
          brandId,
          mediaType: { in: [MediaType.VIDEO, MediaType.HTML] },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        items: this.mapMixedcutMediaAssetList(items),
      };
    }

    return {
      items: this.mapMixedcutMediaAssetList(
        (database.media || [])
          .filter((item) => item.brandId === brandId && (item.mediaType === "VIDEO" || item.mediaType === "HTML"))
          .sort((a, b) => new Date(String(b.createdAt || "")).getTime() - new Date(String(a.createdAt || "")).getTime()),
      ),
    };
  }

  async createBrandMixedcutRemixTask(
    brandId: string,
    payload: CreateMixedcutRemixTaskPayload,
  ): Promise<MixedcutRemixTaskRecord> {
    const mediaAssetIds = Array.from(
      new Set(
        (payload.mediaAssetIds || [])
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
    if (!mediaAssetIds.length) {
      throw new BadRequestException("请至少选择一个站内视频素材。");
    }

    const targetDurationSeconds = Number(payload.targetDurationSeconds);
    if (!Number.isFinite(targetDurationSeconds) || targetDurationSeconds <= 0) {
      throw new BadRequestException("目标时长必须是大于 0 的数字。");
    }

    const style = this.normalizeMixedcutStyle(payload.style);
    const assets = await Promise.all(mediaAssetIds.map((item) => this.loadMixedcutMediaAssetById(brandId, item)));
    return this.createMixedcutRemixTaskFromResolvedSources(payload, assets, style);
  }

  async createMixedcutRemixTaskFromSources(
    payload: CreateMixedcutRemixTaskPayload,
    sources: MixedcutRemixSourceRecord[],
  ): Promise<MixedcutRemixTaskRecord> {
    const normalizedSources = Array.from(
      new Map(
        (sources || [])
          .filter((item) => item && typeof item === "object" && String(item.id || "").trim())
          .map((item) => [String(item.id || "").trim(), item]),
      ).values(),
    );
    if (!normalizedSources.length) {
      throw new BadRequestException("请至少提供一个可用的视频素材来源。");
    }

    const targetDurationSeconds = Number(payload.targetDurationSeconds);
    if (!Number.isFinite(targetDurationSeconds) || targetDurationSeconds <= 0) {
      throw new BadRequestException("目标时长必须是大于 0 的数字。");
    }

    const style = this.normalizeMixedcutStyle(payload.style);
    return this.createMixedcutRemixTaskFromResolvedSources(payload, normalizedSources, style);
  }

  private async createMixedcutRemixTaskFromResolvedSources(
    payload: CreateMixedcutRemixTaskPayload,
    sources: MixedcutRemixSourceRecord[],
    style: "dynamic" | "calm" | "exciting",
  ) {
    const targetDurationSeconds = Number(payload.targetDurationSeconds);
    const durationSummary = this.summarizeMixedcutAssetDurations(sources);
    if (
      durationSummary.knownCount === sources.length
      && durationSummary.totalDurationSec > 0
      && targetDurationSeconds > durationSummary.totalDurationSec + ThirdPartyPlatformsService.MIXEDCUT_DURATION_TOLERANCE_SECONDS
    ) {
      throw new BadRequestException(
        `当前所选素材总时长约 ${durationSummary.totalDurationSec.toFixed(1)} 秒，无法支撑 ${targetDurationSeconds.toFixed(1)} 秒的混剪目标。请缩短目标时长或补充更多视频素材；mixedcut 对贴边时长比较敏感，建议再额外预留 10%-30% 的时长余量。`,
      );
    }
    const uploadedVideos: MixedcutUploadedVideoRecord[] = [];

    for (const asset of sources) {
      const uploaded = await this.uploadMixedcutMediaAsset(asset);
      uploadedVideos.push(uploaded);
    }

    const generateResponse = await this.callMixedcutJson("/api/remix/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(payload.name || "").trim() || this.buildMixedcutTaskName(sources),
        video_paths: uploadedVideos.map((item) => item.mixedcutPath),
        remix_mode: "general",
        style,
        target_duration_seconds: targetDurationSeconds,
        auto_highlight: true,
        auto_transition: true,
        auto_bgm: false,
        transition_style: "auto",
        template: "vlog",
        quality: "1080p",
      }),
    }, "创建 mixedcut 混剪任务");
    const data = this.asRecord(generateResponse.data);
    const taskId = this.readOptionalString(data.task_id);
    if (!taskId) {
      throw new ServiceUnavailableException("mixedcut 未返回 task_id，无法继续追踪任务进度。");
    }

    return {
      taskId,
      projectId: this.readOptionalString(data.project_id) || undefined,
      status: "pending",
      progress: 0,
      mode: this.readOptionalString(this.asRecord(data.plan)?.mode) || "general",
      timeline: [],
      uploadedVideos,
    };
  }

  async getBrandMixedcutRemixTaskProgress(
    brandId: string,
    taskId: string,
    options?: {
      workspaceScope?: string;
      archiveToOpenClawVideoWorks?: boolean;
      createdByUserId?: string;
    },
  ): Promise<MixedcutRemixTaskRecord> {
    const normalizedTaskId = String(taskId || "").trim();
    if (!normalizedTaskId) {
      throw new BadRequestException("缺少 mixedcut 任务 ID。");
    }
    const response = await this.callMixedcutJson(
      `/api/remix/progress/${encodeURIComponent(normalizedTaskId)}`,
      { method: "GET" },
      "查询 mixedcut 任务进度",
    );
    const task = this.normalizeMixedcutTaskRecord(response.data, undefined, normalizedTaskId);
    return this.syncMixedcutTaskToOpenClawVideoWork(brandId, task, options);
  }

  private async syncMixedcutTaskToOpenClawVideoWork(
    brandId: string,
    task: MixedcutRemixTaskRecord,
    options?: {
      workspaceScope?: string;
      archiveToOpenClawVideoWorks?: boolean;
      createdByUserId?: string;
    },
  ) {
    const shouldArchive = options?.archiveToOpenClawVideoWorks !== false;
    const createdByUserId = String(options?.createdByUserId || "").trim();
    if (!shouldArchive || !createdByUserId) {
      return task;
    }
    const normalizedStatus = String(task.status || "").trim().toLowerCase();
    if (normalizedStatus !== "completed") {
      return task;
    }
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope || "douyin");
    try {
      const synced = await this.ensureMixedcutTaskArchivedVideoWork(brandId, workspaceScope, createdByUserId, task);
      if (!synced) {
        return task;
      }
      return {
        ...task,
        videoUrl: synced.videoUrl,
        openClawVideoWorkId: synced.id,
        openClawVideoWorkWorkspaceScope: synced.workspaceScope,
        archiveStatus: "saved" as const,
        archiveMessage: `已同步到 ${synced.workspaceScope} 板块作品列表`,
      };
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "mixedcut 成片同步失败";
      return {
        ...task,
        archiveStatus: "failed" as const,
        archiveMessage: message,
      };
    }
  }

  private async ensureMixedcutTaskArchivedVideoWork(
    brandId: string,
    workspaceScope: string,
    createdByUserId: string,
    task: MixedcutRemixTaskRecord,
  ) {
    const archivedVideo = await this.persistMixedcutTaskOutputAsManagedVideo(brandId, workspaceScope, task);
    if (!archivedVideo?.url) {
      return undefined;
    }
    const existing = await this.findOpenClawVideoWorkByVideoUrl(brandId, workspaceScope, archivedVideo.url);
    if (existing) {
      return existing;
    }
    await this.ensureOpenClawVideoWorkTableReady();
    const id = `openclaw_video_work_${randomUUID()}`;
    const title = await this.resolveMixedcutTaskArchiveTitle(task);
    const description = [
      "来源：mixedcut 混剪成片",
      `mixedcut taskId：${task.taskId}`,
      task.projectId ? `mixedcut projectId：${task.projectId}` : "",
      task.actualDurationSeconds ? `实际时长：${task.actualDurationSeconds.toFixed(1)} 秒` : "",
    ].filter(Boolean).join("\n");
    await this.prismaService.$executeRaw`
      INSERT INTO "OpenClawVideoWork" (
        "id",
        "brandId",
        "workspaceScope",
        "createdByUserId",
        "title",
        "description",
        "scriptContent",
        "coverImageUrl",
        "videoUrl",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${brandId},
        ${workspaceScope},
        ${createdByUserId},
        ${title},
        ${description},
        ${""},
        ${""},
        ${archivedVideo.url},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;
    return this.findOpenClawVideoWorkById(brandId, workspaceScope, id);
  }

  private async persistMixedcutTaskOutputAsManagedVideo(
    brandId: string,
    workspaceScope: string,
    task: MixedcutRemixTaskRecord,
  ) {
    const output = await this.resolveMixedcutTaskOutputBinary(task);
    if (!output) {
      return undefined;
    }
    const relativeFileName = `openclaw/video/mixedcut/${workspaceScope}/${task.taskId}${path.extname(output.fileName || "") || ".mp4"}`;
    const storageKey = `works/${brandId}/${relativeFileName}`;
    await this.ossStorageService.putObject(storageKey, output.buffer, output.contentType);
    return {
      storageKey,
      url: `${this.resolveServerBaseUrl()}/api/works/brands/${brandId}/assets?fileName=${encodeURIComponent(relativeFileName)}`,
    };
  }

  private async resolveMixedcutTaskOutputBinary(task: MixedcutRemixTaskRecord) {
    const localCandidates = [
      ...this.buildMixedcutOutputLocalPathCandidates(task.outputPath),
      ...this.buildMixedcutOutputLocalPathCandidates(task.videoPath),
    ].filter(Boolean);

    for (const candidate of localCandidates) {
      try {
        return {
          buffer: await readFile(candidate),
          contentType: this.resolveVideoContentType(candidate, "video/mp4"),
          fileName: path.basename(candidate),
        };
      } catch {
        continue;
      }
    }

    const remoteVideoUrl = this.readOptionalString(task.videoUrl);
    if (!remoteVideoUrl || !/^https?:\/\//i.test(remoteVideoUrl)) {
      return undefined;
    }
    const response = await this.fetchWithTimeout(remoteVideoUrl, { method: "GET" }, 120000);
    if (!response.ok) {
      throw new ServiceUnavailableException(`下载 mixedcut 成片失败：${response.status}`);
    }
    const fileName = path.basename(remoteVideoUrl.split("?")[0] || `${task.taskId}.mp4`) || `${task.taskId}.mp4`;
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || this.resolveVideoContentType(fileName, "video/mp4"),
      fileName,
    };
  }

  private buildMixedcutOutputLocalPathCandidates(value?: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return [] as string[];
    }
    const installRoot = this.resolveMixedcutInstallRoot();
    const candidates = [
      normalized,
      normalized.startsWith("/app/") ? path.join(installRoot, normalized.slice("/app/".length)) : "",
      normalized.startsWith("/output/") ? path.join(installRoot, normalized.slice(1)) : "",
      normalized.startsWith("output/") ? path.join(installRoot, normalized) : "",
    ].filter(Boolean).map((item) => path.resolve(item));
    const preferredCandidates = Array.from(new Set(candidates)).sort((left, right) => {
      const installRootLower = path.resolve(installRoot).toLowerCase();
      const leftScore = left.toLowerCase().startsWith(installRootLower) ? 0 : 1;
      const rightScore = right.toLowerCase().startsWith(installRootLower) ? 0 : 1;
      return leftScore - rightScore;
    });
    return preferredCandidates;
  }

  private async resolveMixedcutTaskArchiveTitle(task: MixedcutRemixTaskRecord) {
    const projectId = String(task.projectId || "").trim();
    if (projectId) {
      try {
        const projectResponse = await this.callMixedcutJson(
          `/api/projects/${encodeURIComponent(projectId)}`,
          { method: "GET" },
          "查询 mixedcut 项目详情",
        );
        const project = this.asRecord(projectResponse.data);
        const title = this.readOptionalString(project.name);
        if (title) {
          return title;
        }
      } catch {
        // ignore and fall back
      }
    }
    return `mixedcut 混剪成片 ${String(task.taskId || "").slice(0, 8) || "未命名"}`;
  }

  async listPlatforms() {
    return (await this.listPlatformGroups()).map((item) => item.platform);
  }

  private async listPlatformsRaw() {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<ThirdPartyPlatformRow[]>`
        SELECT *
        FROM "ThirdPartyPlatformConfig"
        ORDER BY "updatedAt" DESC, "name" ASC
      `;
      return rows.map((item) => this.normalizePlatformRow(item));
    }

    if (!database.thirdPartyPlatforms?.length) {
      database.thirdPartyPlatforms = THIRD_PARTY_PLATFORM_SEEDS.map((item) => ({ ...item }));
    }
    database.thirdPartyPlatforms = (database.thirdPartyPlatforms || []).filter(
      (item) => !this.isDecommissionedPlatform(item),
    );
    database.brandThirdPartyPlatformSecrets = (database.brandThirdPartyPlatformSecrets || []).filter((item) =>
      database.thirdPartyPlatforms?.some((platform) => platform.id === item.platformId),
    );
    return [...database.thirdPartyPlatforms].map((item) => ({ ...item }));
  }

  async getPlatformById(platformId: string) {
    const normalizedPlatformId = String(platformId || "").trim();
    if (!normalizedPlatformId) {
      return undefined;
    }
    const rawPlatform = (await this.listPlatformsRaw()).find((item) => item.id === normalizedPlatformId);
    if (rawPlatform) {
      return rawPlatform;
    }
    return (await this.listPlatformGroups()).find((item) => item.aliasIds.includes(normalizedPlatformId))?.platform;
  }

  async createPlatform(payload: CreateThirdPartyPlatformPayload) {
    const nextRecord = this.buildPlatformRecord({
      id: `third_party_platform_${Date.now()}`,
      name: payload.name,
      providerType: payload.providerType,
      status: payload.status || "DRAFT",
      baseUrl: payload.baseUrl,
      websiteUrl: payload.websiteUrl || "",
      tutorialUrl: payload.tutorialUrl || "",
      modelIds: payload.modelIds || [],
      defaultModel: payload.defaultModel || "",
      remark: payload.remark || "",
      updatedAt: new Date().toISOString(),
    });

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const row = await this.prismaService.thirdPartyPlatformConfig.create({
        data: {
          id: nextRecord.id,
          name: nextRecord.name,
          providerType: nextRecord.providerType,
          status: nextRecord.status,
          baseUrl: nextRecord.baseUrl,
          websiteUrl: nextRecord.websiteUrl,
          tutorialUrl: nextRecord.tutorialUrl,
          modelIdsJson: nextRecord.modelIds,
          defaultModel: nextRecord.defaultModel,
          remark: nextRecord.remark,
          updatedAt: new Date(nextRecord.updatedAt),
        },
      });
      return this.normalizePlatformRow(row);
    }

    if (!database.thirdPartyPlatforms) {
      database.thirdPartyPlatforms = [];
    }
    database.thirdPartyPlatforms.unshift(nextRecord);
    return nextRecord;
  }

  async updatePlatform(platformId: string, payload: UpdateThirdPartyPlatformPayload) {
    const current = await this.getPlatformById(platformId);
    if (!current) {
      throw new NotFoundException("第三方平台不存在");
    }

    const nextRecord = this.buildPlatformRecord({
      ...current,
      name: payload.name ?? current.name,
      providerType: payload.providerType ?? current.providerType,
      status: payload.status ?? current.status,
      baseUrl: payload.baseUrl ?? current.baseUrl,
      websiteUrl: payload.websiteUrl ?? current.websiteUrl,
      tutorialUrl: payload.tutorialUrl ?? current.tutorialUrl,
      modelIds: payload.modelIds ?? current.modelIds,
      defaultModel: payload.defaultModel ?? current.defaultModel,
      remark: payload.remark ?? current.remark,
      updatedAt: new Date().toISOString(),
    });

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const row = await this.prismaService.thirdPartyPlatformConfig.update({
        where: { id: platformId },
        data: {
          name: nextRecord.name,
          providerType: nextRecord.providerType,
          status: nextRecord.status,
          baseUrl: nextRecord.baseUrl,
          websiteUrl: nextRecord.websiteUrl,
          tutorialUrl: nextRecord.tutorialUrl,
          modelIdsJson: nextRecord.modelIds,
          defaultModel: nextRecord.defaultModel,
          remark: nextRecord.remark,
        },
      });
      return this.normalizePlatformRow(row);
    }

    database.thirdPartyPlatforms = (database.thirdPartyPlatforms || []).map((item) =>
      item.id === platformId ? nextRecord : item,
    );
    return nextRecord;
  }

  async deletePlatform(platformId: string) {
    const group = await this.getPlatformGroupById(platformId);
    const current = group?.platform || await this.getPlatformById(platformId);
    if (!current) {
      throw new NotFoundException("第三方平台不存在");
    }
    const targetIds = group?.aliasIds.length ? group.aliasIds : [platformId];

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const deletedRows = await this.prismaService.thirdPartyPlatformConfig.findMany({
        where: {
          id: {
            in: targetIds,
          },
        },
      });
      await this.prismaService.brandThirdPartyPlatformSecret.deleteMany({
        where: {
          platformId: {
            in: targetIds,
          },
        },
      });
      await this.prismaService.userThirdPartyPlatformSecret.deleteMany({
        where: {
          platformId: {
            in: targetIds,
          },
        },
      });
      await this.prismaService.thirdPartyPlatformConfig.deleteMany({
        where: {
          id: {
            in: targetIds,
          },
        },
      });
      return this.normalizePlatformRow(deletedRows[0] ?? current);
    }

    const targetIdSet = new Set(targetIds);
    database.thirdPartyPlatforms = (database.thirdPartyPlatforms || []).filter((item) => !targetIdSet.has(item.id));
    database.brandThirdPartyPlatformSecrets = (database.brandThirdPartyPlatformSecrets || []).filter(
      (item) => !targetIdSet.has(item.platformId),
    );
    return current;
  }

  async listUserPlatforms(_userId: string, brandId: string) {
    const [platformGroups, secrets] = await Promise.all([this.listPlatformGroups(), this.listBrandSecrets(brandId)]);
    return Promise.all(platformGroups.map(async ({ platform, aliasIds }) => {
      const aliasIdSet = new Set(aliasIds);
      const secret = secrets.find((entry) => aliasIdSet.has(entry.platformId));
      const apiKey = secret?.apiKey || "";
      const dynamicStats = await this.buildDynamicStats(platform, apiKey);
      return {
        ...platform,
        apiKey,
        effectiveApiKeyMasked: this.maskSecret(apiKey),
        dynamicStats,
      } satisfies UserThirdPartyPlatformRecord;
    }));
  }

  async updateBrandPlatformSecret(brandId: string, platformId: string, payload: UpdateBrandThirdPartyPlatformSecretPayload) {
    const group = await this.getPlatformGroupById(platformId);
    const platform = group?.platform || await this.getPlatformById(platformId);
    if (!platform) {
      throw new NotFoundException("第三方平台不存在");
    }
    const targetPlatformIds = group?.aliasIds.length ? group.aliasIds : [platform.id];

    const nextApiKey = String(payload.apiKey || "").trim();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const existing = await this.findBrandPlatformSecretByPlatforms(brandId, targetPlatformIds);

      if (existing) {
        const row = await this.prismaService.brandThirdPartyPlatformSecret.update({
          where: { id: existing.id },
          data: {
            apiKey: nextApiKey,
          },
        });
        return this.normalizeUserPlatform(platform, row.apiKey || nextApiKey);
      }

      const row = await this.prismaService.brandThirdPartyPlatformSecret.create({
        data: {
          id: `brand_platform_secret_${Date.now()}`,
          brandId,
          platformId: platform.id,
          apiKey: nextApiKey,
        },
      });
      return this.normalizeUserPlatform(platform, row.apiKey || nextApiKey);
    }

    if (!database.brandThirdPartyPlatformSecrets) {
      database.brandThirdPartyPlatformSecrets = [];
    }
    const existing = database.brandThirdPartyPlatformSecrets.find(
      (item) => item.brandId === brandId && targetPlatformIds.includes(item.platformId),
    );
    if (existing) {
      existing.apiKey = nextApiKey;
      existing.updatedAt = new Date().toISOString();
      return this.normalizeUserPlatform(platform, existing.apiKey);
    }

    database.brandThirdPartyPlatformSecrets.push({
      id: `brand_platform_secret_${Date.now()}`,
      brandId,
      platformId,
      apiKey: nextApiKey,
      updatedAt: new Date().toISOString(),
    });
    return this.normalizeUserPlatform(platform, nextApiKey);
  }

  async inspectBrandRuntimeAccess(
    brandId: string | undefined,
    options?: {
      platformId?: string;
      baseUrls?: string[];
      platformName?: string;
    },
  ): Promise<BrandRuntimeAccessSummary> {
    const normalizedBrandId = String(brandId || "").trim();
    if (!normalizedBrandId) {
      return {
        status: "brand-context-missing",
        openClawCanUse: false,
        effectiveApiKeyMasked: "",
      };
    }

    const normalizedPlatformId = String(options?.platformId || "").trim();
    const normalizedPlatformName = String(options?.platformName || "").trim().toLowerCase();
    const normalizedBaseUrls = Array.from(new Set((options?.baseUrls || []).map((item) => String(item || "").trim()).filter(Boolean)));

    const platformGroups = await this.listPlatformGroups();
    const matchedGroup = normalizedPlatformId
      ? platformGroups.find((item) => item.aliasIds.includes(normalizedPlatformId))
      : normalizedBaseUrls.length
        ? platformGroups.find((item) => {
            const candidateBaseUrls = [item.platform.baseUrl, item.platform.websiteUrl]
              .filter(Boolean)
              .map((value) => this.normalizeBaseUrl(value));
            return normalizedBaseUrls.some((value) => candidateBaseUrls.includes(this.normalizeBaseUrl(value)));
          })
        : normalizedPlatformName
          ? platformGroups.find((item) => {
              const candidates = [
                item.platform.name,
                item.platform.baseUrl,
                item.platform.websiteUrl,
                item.platform.defaultModel,
                item.platform.remark,
              ]
                .map((value) => String(value || "").trim().toLowerCase())
                .filter(Boolean);
              return candidates.some((value) => value.includes(normalizedPlatformName));
            })
          : undefined;

    if (!matchedGroup) {
      return {
        status: "no-platform-match",
        openClawCanUse: false,
        effectiveApiKeyMasked: "",
      };
    }

    const resolution = await this.resolveRuntimeAccessForPlatformGroup(normalizedBrandId, matchedGroup.platform, matchedGroup.aliasIds);
    return {
      ...resolution,
      platform: resolution.platform
        ? {
            ...resolution.platform,
            websiteUrl: matchedGroup.platform.websiteUrl,
            defaultModel: matchedGroup.platform.defaultModel,
          }
        : undefined,
    } as BrandRuntimeAccessSummary;
  }

  async listBrandRuntimeAccessSummaries(brandId: string | undefined) {
    const normalizedBrandId = String(brandId || "").trim();
    if (!normalizedBrandId) {
      return [];
    }
    const platformGroups = await this.listPlatformGroups();
    return Promise.all(platformGroups.map(async (group) => {
      const resolution = await this.resolveRuntimeAccessForPlatformGroup(normalizedBrandId, group.platform, group.aliasIds);
      return {
        platformId: group.platform.id,
        aliasIds: group.aliasIds,
        platformName: group.platform.name,
        baseUrl: group.platform.baseUrl,
        websiteUrl: group.platform.websiteUrl,
        defaultModel: group.platform.defaultModel,
        status: resolution.status,
        openClawCanUse: resolution.openClawCanUse,
        resolvedFrom: resolution.resolvedFrom,
        effectiveApiKeyMasked: resolution.effectiveApiKeyMasked,
      };
    }));
  }

  async resolveBrandRuntimeApiKeys(brandId: string | undefined, baseUrls: string[]): Promise<BrandRuntimeApiKeyResolution> {
    const normalizedBrandId = String(brandId || "").trim();
    if (!normalizedBrandId) {
      return {
        status: "brand-context-missing",
        apiKeys: [],
      };
    }

    const matchedPlatforms = await this.findPlatformsByBaseUrls(baseUrls);
    const platform = matchedPlatforms[0];
    if (!platform) {
      return {
        status: "no-platform-match",
        apiKeys: [],
      };
    }
    const secret = await this.findBrandPlatformSecretByPlatforms(
      normalizedBrandId,
      matchedPlatforms.map((item) => item.id),
    );
    const apiKey = String(secret?.apiKey || "").trim();
    if (!apiKey) {
      const envApiKeys = this.resolveLocalEnvApiKeysForPlatform(platform);
      if (envApiKeys.length) {
        return {
          status: "resolved",
          platform: {
            id: platform.id,
            name: platform.name,
            baseUrl: platform.baseUrl,
          },
          resolvedFrom: "local-env",
          apiKeys: envApiKeys,
        };
      }
      return {
        status: "brand-api-key-missing",
        platform: {
          id: platform.id,
          name: platform.name,
          baseUrl: platform.baseUrl,
        },
        apiKeys: [],
      };
    }

    return {
      status: "resolved",
      platform: {
        id: platform.id,
        name: platform.name,
        baseUrl: platform.baseUrl,
      },
      resolvedFrom: "brand",
      apiKeys: [apiKey],
    };
  }

  private async resolveRuntimeAccessForPlatformGroup(
    brandId: string,
    platform: ThirdPartyPlatformRecord,
    aliasIds: string[],
  ): Promise<BrandRuntimeAccessSummary> {
    const secret = await this.findBrandPlatformSecretByPlatforms(brandId, aliasIds);
    const apiKey = String(secret?.apiKey || "").trim();
    if (apiKey) {
      return {
        status: "resolved",
        platform: {
          id: platform.id,
          name: platform.name,
          baseUrl: platform.baseUrl,
          websiteUrl: platform.websiteUrl,
          defaultModel: platform.defaultModel,
        },
        openClawCanUse: true,
        effectiveApiKeyMasked: this.maskPlatformSecret(platform, apiKey),
        resolvedFrom: "brand",
      };
    }

    const envApiKeys = this.resolveLocalEnvApiKeysForPlatform(platform);
    if (envApiKeys.length) {
      return {
        status: "resolved",
        platform: {
          id: platform.id,
          name: platform.name,
          baseUrl: platform.baseUrl,
          websiteUrl: platform.websiteUrl,
          defaultModel: platform.defaultModel,
        },
        openClawCanUse: true,
        effectiveApiKeyMasked: this.maskPlatformSecret(platform, envApiKeys[0] || ""),
        resolvedFrom: "local-env",
      };
    }

    return {
      status: "brand-api-key-missing",
      platform: {
        id: platform.id,
        name: platform.name,
        baseUrl: platform.baseUrl,
        websiteUrl: platform.websiteUrl,
        defaultModel: platform.defaultModel,
      },
      openClawCanUse: false,
      effectiveApiKeyMasked: "",
    };
  }

  private resolveLocalEnvApiKeysForPlatform(platform: Pick<ThirdPartyPlatformRecord, "baseUrl"> | undefined) {
    if (!platform || process.env.NODE_ENV === "production") {
      return [];
    }

    let host = "";
    try {
      host = new URL(platform.baseUrl).host.toLowerCase();
    } catch {
      return [];
    }

    if (host === "openspeech.bytedance.com") {
      const apiKeys = [
        String(process.env.VOLCENGINE_SPEECH_API_KEY || "").trim(),
        String(process.env.DOUBAO_SPEECH_API_KEY || "").trim(),
        String(process.env.DOUBAO_STT_API_KEY || "").trim(),
      ].filter(Boolean);
      const appId = String(process.env.DOUBAO_STT_APP_ID || process.env.VOLCENGINE_SPEECH_APP_ID || "").trim();
      const accessKey = String(
        process.env.DOUBAO_STT_ACCESS_KEY || process.env.DOUBAO_STT_ACCESS_TOKEN || process.env.VOLCENGINE_SPEECH_ACCESS_KEY || "",
      ).trim();
      if (appId && accessKey) {
        apiKeys.push(`${appId}::${accessKey}`);
      }
      return Array.from(new Set(apiKeys));
    }

    const envKeysByHost: Record<string, string[]> = {
      "api.apiz.ai": ["APIZ_API_KEY", "NEX_AI_API_KEY"],
      "api.deepseek.com": ["DEEPSEEK_API_KEY"],
      "api.moonshot.cn": ["KIMI_API_KEY", "MOONSHOT_API_KEY"],
      "api.tikhub.io": ["TIKHUB_API_KEY"],
      "api.xskill.ai": ["APIZ_API_KEY", "NEX_AI_API_KEY"],
      "ark.cn-beijing.volces.com": ["ARK_API_KEY", "VOLCENGINE_ARK_API_KEY", "DOUBAO_API_KEY"],
      "open.volcengineapi.com": ["VOLCENGINE_MUSIC_OPENAPI_CREDENTIAL", "VOLCENGINE_MUSIC_API_CREDENTIAL", "VOLCENGINE_OPENAPI_AKSK"],
      "open.bigmodel.cn": ["GLM_API_KEY", "ZHIPU_API_KEY"],
      "www.right.codes": ["RIGHT_CODES_API_KEY"],
    };

    const directEnvValues = Array.from(
      new Set(
        (envKeysByHost[host] || [])
          .map((envName) => String(process.env[envName] || "").trim())
          .filter(Boolean),
      ),
    );
    if (host !== "open.volcengineapi.com") {
      return directEnvValues;
    }

    const accessKeyId = String(
      process.env.VOLCENGINE_MUSIC_ACCESS_KEY_ID
      || process.env.VOLCENGINE_ACCESS_KEY_ID
      || process.env.VOLCENGINE_AK
      || "",
    ).trim();
    const secretAccessKey = String(
      process.env.VOLCENGINE_MUSIC_SECRET_ACCESS_KEY
      || process.env.VOLCENGINE_SECRET_ACCESS_KEY
      || process.env.VOLCENGINE_SK
      || "",
    ).trim();
    const combinedCredential = accessKeyId && secretAccessKey ? `${accessKeyId}::${secretAccessKey}` : "";
    return Array.from(new Set([
      ...directEnvValues,
      combinedCredential,
    ].filter(Boolean)));
  }

  private normalizeUserPlatform(platform: ThirdPartyPlatformRecord, apiKey: string): UserThirdPartyPlatformRecord {
    return {
      ...platform,
      apiKey,
      effectiveApiKeyMasked: this.maskPlatformSecret(platform, apiKey),
      dynamicStats: undefined,
    };
  }

  private async buildDynamicStats(platform: ThirdPartyPlatformRecord, apiKey: string) {
    if (!this.isChanjingPlatform(platform)) {
      return undefined;
    }
    const credential = String(apiKey || "").trim();
    if (!credential) {
      return {
        status: "missing_credential" as const,
        message: "配置蝉镜凭证后才会同步真实模板和定制数字人统计。",
      };
    }
    try {
      const [tagsResult, templatesResult, customPersonsResult] = await Promise.allSettled([
        this.chanjingOpenApiService.listTemplateTags(credential),
        this.chanjingOpenApiService.listCommonDigitalPersons(credential, { page: 1, size: 1 }),
        this.chanjingOpenApiService.listCustomisedPersons(credential, { page: 1, pageSize: 1 }),
      ]);
      const templateCount = templatesResult.status === "fulfilled"
        ? (templatesResult.value.pageInfo.totalCount || templatesResult.value.list.length)
        : undefined;
      const customPersonCount = customPersonsResult.status === "fulfilled"
        ? (customPersonsResult.value.pageInfo.totalCount || customPersonsResult.value.list.length)
        : undefined;
      const tagCount = tagsResult.status === "fulfilled" ? tagsResult.value.length : undefined;
      const failureMessages = [
        tagsResult.status === "rejected" ? this.describeDynamicStatsFailure("标签统计", tagsResult.reason) : "",
        templatesResult.status === "rejected" ? this.describeDynamicStatsFailure("模板统计", templatesResult.reason) : "",
        customPersonsResult.status === "rejected" ? this.describeDynamicStatsFailure("定制数字人统计", customPersonsResult.reason) : "",
      ].filter(Boolean);
      const mergedFailureMessage = Array.from(new Set(failureMessages)).join("；");
      if (typeof templateCount === "number" || typeof customPersonCount === "number" || typeof tagCount === "number") {
        return {
          status: failureMessages.length ? "partial" as const : "ready" as const,
          templateCount,
          customPersonCount,
          tagCount,
          syncedAt: new Date().toISOString(),
          message: mergedFailureMessage || undefined,
        };
      }
      return {
        status: "error" as const,
        message: mergedFailureMessage || "蝉镜统计同步失败",
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = this.normalizeChanjingDynamicStatsMessage(error instanceof Error ? error.message : "蝉镜统计同步失败");
      return {
        status: "error" as const,
        message,
        syncedAt: new Date().toISOString(),
      };
    }
  }

  private describeDynamicStatsFailure(label: string, error: unknown) {
    const message = this.normalizeChanjingDynamicStatsMessage(error instanceof Error ? error.message : "接口请求失败");
    if (message === "当前品牌配置的蝉镜凭证无效，请检查 appId::secretKey 后重新保存。") {
      return message;
    }
    return `${label}失败：${message}`;
  }

  private normalizeChanjingDynamicStatsMessage(message: string) {
    const normalized = String(message || "").trim();
    if (
      /无效APPID/i.test(normalized)
      || /无效APPID 和SecretKey/i.test(normalized)
      || /无效APPID和SecretKey/i.test(normalized)
      || /invalid.*appid/i.test(normalized)
      || /invalid.*secret/i.test(normalized)
      || /secretkey/i.test(normalized)
    ) {
      return "当前品牌配置的蝉镜凭证无效，请检查 appId::secretKey 后重新保存。";
    }
    return normalized || "蝉镜统计同步失败";
  }

  private async listBrandSecrets(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<BrandThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "BrandThirdPartyPlatformSecret"
        WHERE "brandId" = ${brandId}
      `;
      return rows.map((item) => ({
        id: item.id,
        brandId: item.brandId,
        platformId: item.platformId,
        apiKey: String(item.apiKey || ""),
        updatedAt: this.normalizeDate(item.updatedAt),
      }));
    }

    return (database.brandThirdPartyPlatformSecrets || [])
      .filter((item) => item.brandId === brandId)
      .map((item) => ({ ...item }));
  }

  private async findPlatformByBaseUrls(baseUrls: string[]) {
    return (await this.findPlatformsByBaseUrls(baseUrls))[0];
  }

  private async findPlatformsByBaseUrls(baseUrls: string[]) {
    const normalizedBaseUrls = Array.from(
      new Set(
        baseUrls
          .map((item) => this.normalizeBaseUrl(item))
          .filter(Boolean),
      ),
    );
    if (!normalizedBaseUrls.length) {
      return [];
    }

    const baseUrlHosts = Array.from(
      new Set(
        normalizedBaseUrls
          .map((item) => this.extractHost(item))
          .filter(Boolean),
      ),
    );
    const platforms = await this.listPlatformsRaw();
    const exactMatches = platforms.filter((item) => normalizedBaseUrls.includes(this.normalizeBaseUrl(item.baseUrl)));
    if (exactMatches.length) {
      const exactIds = new Set(exactMatches.map((item) => item.id));
      const siblingMatches = platforms.filter((item) => {
        if (exactIds.has(item.id)) {
          return false;
        }
        const host = this.extractHost(item.baseUrl);
        return Boolean(host) && baseUrlHosts.includes(host);
      });
      return [...exactMatches, ...siblingMatches];
    }

    return platforms.filter((item) => {
      const host = this.extractHost(item.baseUrl);
      return Boolean(host) && baseUrlHosts.includes(host);
    });
  }

  private async findBrandPlatformSecret(brandId: string, platformId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<BrandThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "BrandThirdPartyPlatformSecret"
        WHERE "brandId" = ${brandId}
          AND "platformId" = ${platformId}
        LIMIT 1
      `;
      return rows[0];
    }

    return (database.brandThirdPartyPlatformSecrets || []).find(
      (item) => item.brandId === brandId && item.platformId === platformId,
    );
  }

  private async listPlatformGroups(): Promise<ThirdPartyPlatformGroup[]> {
    return this.collapsePlatformGroups(await this.listPlatformsRaw());
  }

  private async getPlatformGroupById(platformId: string) {
    const normalizedPlatformId = String(platformId || "").trim();
    if (!normalizedPlatformId) {
      return undefined;
    }
    return (await this.listPlatformGroups()).find((item) => item.aliasIds.includes(normalizedPlatformId));
  }

  private collapsePlatformGroups(platforms: ThirdPartyPlatformRecord[]): ThirdPartyPlatformGroup[] {
    const groups = new Map<string, ThirdPartyPlatformGroup>();
    for (const platform of platforms) {
      const groupKey = this.resolvePlatformGroupKey(platform);
      const current = groups.get(groupKey);
      if (!current) {
        groups.set(groupKey, {
          platform: {
            ...platform,
            modelIds: [...platform.modelIds],
          },
          aliasIds: [platform.id],
        });
        continue;
      }

      current.aliasIds = Array.from(new Set([...current.aliasIds, platform.id]));
      current.platform = {
        ...current.platform,
        name: current.platform.name || platform.name,
        providerType:
          current.platform.providerType === platform.providerType
            ? current.platform.providerType
            : "CUSTOM",
        status: this.pickHigherStatus(current.platform.status, platform.status),
        baseUrl: this.pickPreferredPlatformBaseUrl(current.platform.baseUrl, platform.baseUrl),
        websiteUrl: current.platform.websiteUrl || platform.websiteUrl,
        tutorialUrl: current.platform.tutorialUrl || platform.tutorialUrl,
        modelIds: Array.from(new Set([...current.platform.modelIds, ...platform.modelIds])),
        defaultModel: current.platform.defaultModel || platform.defaultModel,
        remark: current.platform.remark || platform.remark,
        updatedAt:
          new Date(platform.updatedAt).getTime() > new Date(current.platform.updatedAt).getTime()
            ? platform.updatedAt
            : current.platform.updatedAt,
      };
    }
    return Array.from(groups.values());
  }

  private resolvePlatformGroupKey(platform: Pick<ThirdPartyPlatformRecord, "baseUrl" | "websiteUrl">) {
    const normalizedWebsiteUrl = this.normalizeBaseUrl(platform.websiteUrl || resolvePlatformWebsiteUrl(platform.baseUrl));
    if (normalizedWebsiteUrl) {
      return `website:${normalizedWebsiteUrl}`;
    }
    const baseHost = this.extractHost(platform.baseUrl);
    return baseHost ? `host:${baseHost}` : `base:${this.normalizeBaseUrl(platform.baseUrl)}`;
  }

  private pickHigherStatus(
    current: ThirdPartyPlatformRecord["status"],
    next: ThirdPartyPlatformRecord["status"],
  ): ThirdPartyPlatformRecord["status"] {
    const weights: Record<ThirdPartyPlatformRecord["status"], number> = {
      ACTIVE: 3,
      DRAFT: 2,
      DISABLED: 1,
    };
    return weights[next] > weights[current] ? next : current;
  }

  private pickPreferredPlatformBaseUrl(current: string, next: string) {
    return this.getPlatformBaseUrlPriority(next) > this.getPlatformBaseUrlPriority(current) ? next : current;
  }

  private getPlatformBaseUrlPriority(value: string) {
    const normalized = this.normalizeBaseUrl(value);
    if (!normalized) {
      return 0;
    }
    if (normalized === "https://api.xskill.ai") {
      return 100;
    }
    if (normalized === "https://api.apiz.ai") {
      return 90;
    }
    if (normalized === "https://www.right.codes/codex") {
      return 100;
    }
    if (normalized === "https://www.right.codes/draw") {
      return 90;
    }
    return 10;
  }

  private async findBrandPlatformSecretByPlatforms(brandId: string, platformIds: string[]) {
    const normalizedPlatformIds = Array.from(
      new Set(
        platformIds
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
    if (!normalizedPlatformIds.length) {
      return undefined;
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.brandThirdPartyPlatformSecret.findMany({
        where: {
          brandId,
          platformId: {
            in: normalizedPlatformIds,
          },
        },
      });
      const byPlatformId = new Map(rows.map((item) => [item.platformId, item] as const));
      return normalizedPlatformIds.map((item) => byPlatformId.get(item)).find(Boolean);
    }

    const byPlatformId = new Map(
      (database.brandThirdPartyPlatformSecrets || [])
        .filter((item) => item.brandId === brandId)
        .map((item) => [item.platformId, item] as const),
    );
    return normalizedPlatformIds.map((item) => byPlatformId.get(item)).find(Boolean);
  }

  private buildPlatformRecord(input: ThirdPartyPlatformRecord): ThirdPartyPlatformRecord {
    const modelIds = Array.from(
      new Set(
        (input.modelIds || [])
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
    const defaultModel = modelIds.includes(input.defaultModel) ? input.defaultModel : modelIds[0] || "";
    return {
      id: input.id,
      name: String(input.name || "").trim(),
      providerType: input.providerType,
      status: input.status,
      baseUrl: String(input.baseUrl || "").trim(),
      websiteUrl: String(input.websiteUrl || "").trim() || resolvePlatformWebsiteUrl(String(input.baseUrl || "").trim()),
      tutorialUrl: String(input.tutorialUrl || "").trim(),
      modelIds,
      defaultModel,
      remark: String(input.remark || "").trim(),
      updatedAt: this.normalizeDate(input.updatedAt),
    };
  }

  private normalizePlatformRow(row: ThirdPartyPlatformRow | ThirdPartyPlatformRecord): ThirdPartyPlatformRecord {
    const modelIds =
      "modelIdsJson" in row
        ? this.parseModelIds(row.modelIdsJson)
        : row.modelIds;

    return this.buildPlatformRecord({
      id: row.id,
      name: row.name,
      providerType: row.providerType as ThirdPartyPlatformRecord["providerType"],
      status: row.status as ThirdPartyPlatformRecord["status"],
      baseUrl: row.baseUrl,
      websiteUrl: "websiteUrl" in row ? row.websiteUrl : "",
      tutorialUrl: row.tutorialUrl,
      modelIds,
      defaultModel: row.defaultModel,
      remark: row.remark,
      updatedAt: this.normalizeDate(row.updatedAt),
    });
  }

  private normalizeDate(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value || new Date().toISOString());
  }

  private parseModelIds(value: unknown) {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item || "").trim())
        .filter(Boolean);
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item || "").trim())
            .filter(Boolean);
        }
      } catch {
        return [];
      }
    }
    return [];
  }

  private normalizeBaseUrl(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "";
    }
    try {
      const target = new URL(this.ensureUrlProtocol(normalized));
      const pathname = target.pathname.replace(/\/+$/, "");
      return `${target.protocol}//${target.host}${pathname}`.toLowerCase();
    } catch {
      return normalized.replace(/\/+$/, "").toLowerCase();
    }
  }

  private extractHost(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "";
    }
    try {
      return new URL(this.ensureUrlProtocol(normalized)).host.toLowerCase();
    } catch {
      const matched = normalized.match(/^(?:[a-z]+:\/\/)?([^/]+)/i);
      return matched?.[1]?.toLowerCase() || "";
    }
  }

  private ensureUrlProtocol(value: string) {
    return /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`;
  }

  private maskSecret(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "未设置";
    }
    if (normalized.length <= 8) {
      return `${normalized.slice(0, 2)}****`;
    }
    return `${normalized.slice(0, 4)}********${normalized.slice(-4)}`;
  }

  private maskPlatformSecret(
    platform: Pick<ThirdPartyPlatformRecord, "name" | "baseUrl" | "tutorialUrl" | "remark">,
    apiKey: string,
  ) {
    const normalized = String(apiKey || "").trim();
    if (!normalized) {
      return "未设置";
    }
    if (this.isRuanwenjiePlatform(platform)) {
      const parsed = this.parseRuanwenjieCredential(normalized);
      if (parsed?.apiKey) {
        return this.maskSecret(parsed.apiKey);
      }
      return "已配置投放凭证";
    }
    return this.maskSecret(normalized);
  }

  private isChanjingPlatform(platform: Pick<ThirdPartyPlatformRecord, "name" | "baseUrl" | "tutorialUrl" | "remark">) {
    const searchable = [platform.name, platform.baseUrl, platform.tutorialUrl, platform.remark].join(" ").toLowerCase();
    return searchable.includes("chanjing") || searchable.includes("蝉镜");
  }

  private isRuanwenjiePlatform(platform: Pick<ThirdPartyPlatformRecord, "name" | "baseUrl" | "tutorialUrl" | "remark">) {
    const searchable = [platform.name, platform.baseUrl, platform.tutorialUrl, platform.remark].join(" ").toLowerCase();
    return searchable.includes("api.kol.cn") || searchable.includes("ruanwenjie") || searchable.includes("软文街");
  }

  private parseRuanwenjieCredential(value: string) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return undefined;
      }
      const record = parsed as Record<string, unknown>;
      const apiKey = String(record.apiKey || "").trim();
      const mobile = String(record.mobile || "").trim();
      const password = String(record.password || "").trim();
      if (!apiKey || !mobile || !password) {
        return undefined;
      }
      return {
        apiKey,
        mobile,
        password,
      };
    } catch {
      return undefined;
    }
  }

  private async ensureTablesReady() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapTables();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapTables() {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
    }

    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ThirdPartyPlatformConfig" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "providerType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "baseUrl" TEXT NOT NULL DEFAULT '',
        "websiteUrl" TEXT NOT NULL DEFAULT '',
        "tutorialUrl" TEXT NOT NULL DEFAULT '',
        "modelIdsJson" JSON NOT NULL DEFAULT '[]',
        "defaultModel" TEXT NOT NULL DEFAULT '',
        "remark" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.ensureTableColumns("ThirdPartyPlatformConfig", [
      { name: "websiteUrl", definition: `TEXT NOT NULL DEFAULT ''` },
      { name: "tutorialUrl", definition: `TEXT NOT NULL DEFAULT ''` },
      { name: "modelIdsJson", definition: `JSON NOT NULL DEFAULT '[]'` },
      { name: "defaultModel", definition: `TEXT NOT NULL DEFAULT ''` },
      { name: "remark", definition: `TEXT NOT NULL DEFAULT ''` },
      { name: "updatedAt", definition: `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` },
    ]);
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserThirdPartyPlatformSecret" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "brandId" TEXT NOT NULL,
        "platformId" TEXT NOT NULL,
        "apiKey" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.ensureTableColumns("UserThirdPartyPlatformSecret", [
      { name: "brandId", definition: `TEXT NOT NULL DEFAULT ''` },
      { name: "platformId", definition: `TEXT NOT NULL DEFAULT ''` },
      { name: "apiKey", definition: `TEXT NOT NULL DEFAULT ''` },
      { name: "updatedAt", definition: `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` },
    ]);
    await this.prismaService.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UserThirdPartyPlatformSecret_user_brand_platform_key"
      ON "UserThirdPartyPlatformSecret" ("userId", "brandId", "platformId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BrandThirdPartyPlatformSecret" (
        "id" TEXT PRIMARY KEY,
        "brandId" TEXT NOT NULL,
        "platformId" TEXT NOT NULL,
        "apiKey" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.ensureTableColumns("BrandThirdPartyPlatformSecret", [
      { name: "platformId", definition: `TEXT NOT NULL DEFAULT ''` },
      { name: "apiKey", definition: `TEXT NOT NULL DEFAULT ''` },
      { name: "updatedAt", definition: `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` },
    ]);
    await this.prismaService.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BrandThirdPartyPlatformSecret_brand_platform_key"
      ON "BrandThirdPartyPlatformSecret" ("brandId", "platformId")
    `);
    await this.migrateUserSecretsToBrandSecrets();

    const existingRows = await this.prismaService.$queryRaw<ThirdPartyPlatformRow[]>`
      SELECT *
      FROM "ThirdPartyPlatformConfig"
    `;
    const existingById = new Map(existingRows.map((item) => {
      const normalized = this.normalizePlatformRow(item);
      return [normalized.id, normalized] as const;
    }));

    const decommissionedPlatformIds = Array.from(existingById.values())
      .filter((item) => this.isDecommissionedPlatform(item))
      .map((item) => item.id);
    if (decommissionedPlatformIds.length) {
      await this.prismaService.$executeRaw(Prisma.sql`
        DELETE FROM "BrandThirdPartyPlatformSecret"
        WHERE "platformId" IN (${Prisma.join(decommissionedPlatformIds.map((item) => Prisma.sql`${item}`))})
      `);
      await this.prismaService.$executeRaw(Prisma.sql`
        DELETE FROM "UserThirdPartyPlatformSecret"
        WHERE "platformId" IN (${Prisma.join(decommissionedPlatformIds.map((item) => Prisma.sql`${item}`))})
      `);
      await this.prismaService.$executeRaw(Prisma.sql`
        DELETE FROM "ThirdPartyPlatformConfig"
        WHERE "id" IN (${Prisma.join(decommissionedPlatformIds.map((item) => Prisma.sql`${item}`))})
      `);
      decommissionedPlatformIds.forEach((item) => existingById.delete(item));
    }

    for (const item of THIRD_PARTY_PLATFORM_SEEDS) {
      const current = existingById.get(item.id);
      if (current) {
        await this.syncSeedPlatform(current, item);
        continue;
      }
      await this.prismaService.thirdPartyPlatformConfig.create({
        data: {
          id: item.id,
          name: item.name,
          providerType: item.providerType,
          status: item.status,
          baseUrl: item.baseUrl,
          websiteUrl: item.websiteUrl,
          tutorialUrl: item.tutorialUrl,
          modelIdsJson: item.modelIds,
          defaultModel: item.defaultModel,
          remark: item.remark,
          updatedAt: new Date(item.updatedAt),
        },
      });
    }
  }

  private async syncSeedPlatform(current: ThirdPartyPlatformRecord, seed: ThirdPartyPlatformRecord) {
    const nextModelIds = Array.from(new Set([...(current.modelIds || []), ...(seed.modelIds || [])]));
    const nextName = current.name || seed.name || "";
    const nextProviderType = current.providerType || seed.providerType;
    const nextStatus = current.status || seed.status;
    const nextBaseUrl = this.resolveSystemSeedBaseUrl(current.baseUrl, seed.baseUrl);
    const nextWebsiteUrl = current.websiteUrl || seed.websiteUrl || resolvePlatformWebsiteUrl(nextBaseUrl);
    const nextTutorialUrl = current.tutorialUrl || seed.tutorialUrl || "";
    const nextDefaultModel = current.defaultModel || seed.defaultModel || "";
    const nextRemark = current.remark || seed.remark || "";
    const currentModelIdsJson = JSON.stringify(current.modelIds || []);
    const nextModelIdsJson = JSON.stringify(nextModelIds);
    if (
      current.name === nextName
      && current.providerType === nextProviderType
      && current.status === nextStatus
      && current.baseUrl === nextBaseUrl
      && current.websiteUrl === nextWebsiteUrl
      && currentModelIdsJson === nextModelIdsJson
      && current.tutorialUrl === nextTutorialUrl
      && current.defaultModel === nextDefaultModel
      && current.remark === nextRemark
    ) {
      return;
    }
    await this.prismaService.thirdPartyPlatformConfig.update({
      where: { id: current.id },
      data: {
        name: nextName,
        providerType: nextProviderType,
        status: nextStatus,
        baseUrl: nextBaseUrl,
        websiteUrl: nextWebsiteUrl,
        modelIdsJson: JSON.parse(nextModelIdsJson),
        tutorialUrl: nextTutorialUrl,
        defaultModel: nextDefaultModel,
        remark: nextRemark,
      },
    });
  }

  private async migrateUserSecretsToBrandSecrets() {
    const legacyRows = await this.prismaService.userThirdPartyPlatformSecret.findMany({
      where: {
        apiKey: {
          not: "",
        },
      },
      orderBy: [
        { brandId: "asc" },
        { platformId: "asc" },
        { updatedAt: "desc" },
      ],
    });
    if (!legacyRows.length) {
      return;
    }

    const existingRows = await this.prismaService.brandThirdPartyPlatformSecret.findMany({
      select: {
        brandId: true,
        platformId: true,
      },
    });
    const existingKeys = new Set(existingRows.map((item) => `${item.brandId}::${item.platformId}`));
    const seenKeys = new Set<string>();
    const pendingRows: Array<{
      id: string;
      brandId: string;
      platformId: string;
      apiKey: string;
      updatedAt: Date;
    }> = [];

    for (const row of legacyRows) {
      const key = `${row.brandId}::${row.platformId}`;
      if (existingKeys.has(key) || seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);
      pendingRows.push({
        id: `brand_platform_secret_migrated_${Date.now()}_${pendingRows.length}`,
        brandId: row.brandId,
        platformId: row.platformId,
        apiKey: row.apiKey,
        updatedAt: row.updatedAt,
      });
    }

    for (const row of pendingRows) {
      await this.prismaService.brandThirdPartyPlatformSecret.create({
        data: row,
      });
    }
  }

  private isDecommissionedPlatform(platform: Pick<ThirdPartyPlatformRecord, "id" | "baseUrl">) {
    return isDecommissionedPlatformBaseUrl(
      platform.baseUrl,
      "id" in platform ? String(platform.id || "").trim() : "",
    );
  }

  private resolveSystemSeedBaseUrl(currentBaseUrl: string, seedBaseUrl: string) {
    const normalizedCurrent = this.normalizeBaseUrl(currentBaseUrl);
    const normalizedSeed = this.normalizeBaseUrl(seedBaseUrl);
    if (!normalizedSeed) {
      return String(currentBaseUrl || "").trim();
    }
    if (!normalizedCurrent) {
      return String(seedBaseUrl || "").trim();
    }
    return normalizedCurrent === normalizedSeed ? String(currentBaseUrl || "").trim() : String(seedBaseUrl || "").trim();
  }

  private async buildMixedcutAiConfigPreview(brandId: string): Promise<MixedcutAiConfigPreview> {
    const installRoot = this.resolveMixedcutInstallRoot();
    const configFilePath = path.join(installRoot, "config", "ai_config.json");
    const llm: Record<string, unknown> = {};
    const vision: Record<string, unknown> = {};
    const image: Record<string, unknown> = {};
    const sources: MixedcutAiConfigSyncSource[] = [];
    const warnings: string[] = [];
    const activeProviders = await this.apiProvidersService.listActiveProviders();

    for (const provider of activeProviders) {
      const runtimeKey = this.apiProvidersService.getRuntimeKey(provider);
      const runtimeTags = this.apiProvidersService.getRuntimeTags(provider);
      const candidateBaseUrls = Array.from(
        new Set([
          ...this.apiProvidersService.getBaseUrls(provider),
          ...this.apiProvidersService.getStringArrayExtra(provider, "platformBaseUrls"),
        ].filter(Boolean)),
      );
      if (!candidateBaseUrls.length) {
        continue;
      }
      const resolution = await this.resolveBrandRuntimeApiKeys(brandId, candidateBaseUrls);
      if (resolution.status !== "resolved" || !resolution.apiKeys.length) {
        continue;
      }
      const apiKey = String(resolution.apiKeys[0] || "").trim();
      if (!apiKey) {
        continue;
      }

      if (this.isMixedcutLlmProvider(runtimeKey, runtimeTags)) {
        this.applyMixedcutLlmProvider(llm, provider, apiKey, sources, warnings);
      }
      if (this.isMixedcutVisionProvider(runtimeKey, runtimeTags)) {
        this.applyMixedcutVisionProvider(vision, provider, apiKey, sources, warnings);
      }
      if (this.isMixedcutImageProvider(runtimeKey, runtimeTags)) {
        this.applyMixedcutImageProvider(image, provider, apiKey, sources, warnings);
      }
    }

    this.applyMixedcutDefaults(llm, vision, image, warnings);

    const config: Record<string, unknown> = {};
    if (Object.keys(llm).length) {
      config.llm = llm;
    }
    if (Object.keys(vision).length) {
      config.vision = vision;
    }
    if (Object.keys(image).length) {
      config.image = image;
    }

    const configFileExists = await this.pathExists(configFilePath);
    return {
      installRoot,
      configFilePath,
      configFileExists,
      config,
      sources,
      warnings: Array.from(new Set(warnings)),
    };
  }

  private resolveMixedcutInstallRoot() {
    const overrideValue = String(process.env.MIXEDCUT_INSTALL_ROOT || "").trim();
    if (overrideValue) {
      return path.resolve(overrideValue);
    }
    return path.resolve(process.cwd(), "mixedcut_integration_bundle");
  }

  private resolveMixedcutServiceBaseUrl() {
    const explicit = String(process.env.MIXEDCUT_INTERNAL_BASE_URL || process.env.MIXEDCUT_BASE_URL || "").trim();
    if (explicit) {
      return explicit.replace(/\/+$/, "");
    }
    const installRoot = this.resolveMixedcutInstallRoot().replace(/\\/g, "/");
    if (installRoot.startsWith("/data/") || installRoot.startsWith("/app/")) {
      return "http://mixedcut:5000";
    }
    return "http://127.0.0.1:15000";
  }

  private resolveMixedcutServiceUrl(requestPath: string) {
    const baseUrl = this.resolveMixedcutServiceBaseUrl();
    const normalizedPath = String(requestPath || "").trim();
    if (!normalizedPath) {
      return baseUrl;
    }
    return `${baseUrl}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
  }

  private async pathExists(targetPath: string) {
    try {
      await readFile(targetPath, "utf8");
      return true;
    } catch {
      return false;
    }
  }

  private isMixedcutLlmProvider(runtimeKey: string, runtimeTags: string[]) {
    return runtimeKey.startsWith("text-")
      || runtimeTags.includes("text-global")
      || runtimeTags.includes("text-domestic");
  }

  private isMixedcutVisionProvider(runtimeKey: string, runtimeTags: string[]) {
    return runtimeKey.includes("visual-understanding")
      || runtimeTags.includes("visual-understanding")
      || runtimeTags.includes("image-analysis");
  }

  private isMixedcutImageProvider(runtimeKey: string, runtimeTags: string[]) {
    return runtimeKey === "image-generation" || runtimeTags.includes("image-generation");
  }

  private applyMixedcutLlmProvider(
    target: Record<string, unknown>,
    provider: ApiProviderRecord,
    apiKey: string,
    sources: MixedcutAiConfigSyncSource[],
    warnings: string[],
  ) {
    const baseUrl = String(provider.baseUrl || "").trim();
    const model = String(provider.defaultModel || "").trim();
    const host = this.extractHost(baseUrl);
    if (!host) {
      return;
    }
    if (host === "api.deepseek.com") {
      this.assignMixedcutField(target, "deepseek_api_key", apiKey, provider, "llm", "deepseek_api_key", sources, warnings);
      this.assignMixedcutField(target, "deepseek_base_url", baseUrl, provider, "llm", "deepseek_base_url", sources, warnings);
      this.assignMixedcutField(target, "deepseek_model", model, provider, "llm", "deepseek_model", sources, warnings);
      return;
    }
    if (host === "api.moonshot.cn") {
      this.assignMixedcutField(target, "kimi_api_key", apiKey, provider, "llm", "kimi_api_key", sources, warnings);
      this.assignMixedcutField(target, "kimi_base_url", baseUrl, provider, "llm", "kimi_base_url", sources, warnings);
      this.assignMixedcutField(target, "kimi_model", model, provider, "llm", "kimi_model", sources, warnings);
      return;
    }
    if (host === "open.bigmodel.cn") {
      this.assignMixedcutField(target, "chatglm_api_key", apiKey, provider, "llm", "chatglm_api_key", sources, warnings);
      this.assignMixedcutField(target, "chatglm_base_url", baseUrl, provider, "llm", "chatglm_base_url", sources, warnings);
      this.assignMixedcutField(target, "chatglm_model", model, provider, "llm", "chatglm_model", sources, warnings);
      return;
    }
    if (host === "ark.cn-beijing.volces.com") {
      this.assignMixedcutField(target, "doubao_api_key", apiKey, provider, "llm", "doubao_api_key", sources, warnings);
      this.assignMixedcutField(target, "doubao_base_url", baseUrl, provider, "llm", "doubao_base_url", sources, warnings);
      this.assignMixedcutField(target, "doubao_model", model, provider, "llm", "doubao_model", sources, warnings);
      return;
    }
    if (host === "dashscope.aliyuncs.com") {
      this.assignMixedcutField(target, "qwen_api_key", apiKey, provider, "llm", "qwen_api_key", sources, warnings);
      this.assignMixedcutField(target, "qwen_base_url", baseUrl, provider, "llm", "qwen_base_url", sources, warnings);
      this.assignMixedcutField(target, "qwen_model", model, provider, "llm", "qwen_model", sources, warnings);
      return;
    }
    this.assignMixedcutField(target, "custom_openai_name", provider.name, provider, "llm", "custom_openai_name", sources, warnings);
    this.assignMixedcutField(target, "custom_openai_api_key", apiKey, provider, "llm", "custom_openai_api_key", sources, warnings);
    this.assignMixedcutField(target, "custom_openai_base_url", baseUrl, provider, "llm", "custom_openai_base_url", sources, warnings);
    this.assignMixedcutField(target, "custom_openai_model", model, provider, "llm", "custom_openai_model", sources, warnings);
  }

  private applyMixedcutVisionProvider(
    target: Record<string, unknown>,
    provider: ApiProviderRecord,
    apiKey: string,
    sources: MixedcutAiConfigSyncSource[],
    warnings: string[],
  ) {
    const baseUrl = String(provider.baseUrl || "").trim();
    const model = String(provider.defaultModel || "").trim();
    const host = this.extractHost(baseUrl);
    if (!host) {
      return;
    }
    if (host === "open.bigmodel.cn" && /glm|chatglm|5v/i.test(model || provider.name)) {
      this.assignMixedcutField(target, "default_model", "chatglm", provider, "vision", "default_model", sources, warnings);
      return;
    }
    this.assignMixedcutField(target, "custom_openai_api_key", apiKey, provider, "vision", "custom_openai_api_key", sources, warnings);
    this.assignMixedcutField(target, "custom_openai_base_url", baseUrl, provider, "vision", "custom_openai_base_url", sources, warnings);
    this.assignMixedcutField(target, "custom_openai_vision_model", model, provider, "vision", "custom_openai_vision_model", sources, warnings);
    this.assignMixedcutField(target, "default_model", "custom_vision", provider, "vision", "default_model", sources, warnings);
  }

  private applyMixedcutImageProvider(
    target: Record<string, unknown>,
    provider: ApiProviderRecord,
    apiKey: string,
    sources: MixedcutAiConfigSyncSource[],
    warnings: string[],
  ) {
    const baseUrl = String(provider.baseUrl || "").trim();
    const model = String(provider.defaultModel || "").trim();
    const host = this.extractHost(baseUrl);
    if (!host) {
      return;
    }
    if (host === "ark.cn-beijing.volces.com") {
      this.assignMixedcutField(target, "doubao_api_key", apiKey, provider, "image", "doubao_api_key", sources, warnings);
      this.assignMixedcutField(target, "doubao_base_url", baseUrl, provider, "image", "doubao_base_url", sources, warnings);
      this.assignMixedcutField(target, "doubao_model", model, provider, "image", "doubao_model", sources, warnings);
      return;
    }
    if (host === "open.bigmodel.cn" && /cogview|glm/i.test(model || provider.name)) {
      this.assignMixedcutField(target, "chatglm_api_key", apiKey, provider, "image", "chatglm_api_key", sources, warnings);
      this.assignMixedcutField(target, "chatglm_base_url", baseUrl, provider, "image", "chatglm_base_url", sources, warnings);
      this.assignMixedcutField(target, "chatglm_model", model, provider, "image", "chatglm_model", sources, warnings);
      return;
    }
    if (host === "dashscope.aliyuncs.com") {
      this.assignMixedcutField(target, "qwen_api_key", apiKey, provider, "image", "qwen_api_key", sources, warnings);
      this.assignMixedcutField(target, "qwen_base_url", baseUrl, provider, "image", "qwen_base_url", sources, warnings);
      this.assignMixedcutField(target, "qwen_model", model, provider, "image", "qwen_model", sources, warnings);
      return;
    }
    this.assignMixedcutField(target, "custom_openai_name", provider.name, provider, "image", "custom_openai_name", sources, warnings);
    this.assignMixedcutField(target, "custom_openai_api_key", apiKey, provider, "image", "custom_openai_api_key", sources, warnings);
    this.assignMixedcutField(target, "custom_openai_base_url", baseUrl, provider, "image", "custom_openai_base_url", sources, warnings);
    this.assignMixedcutField(target, "custom_openai_model", model, provider, "image", "custom_openai_model", sources, warnings);
  }

  private applyMixedcutDefaults(
    llm: Record<string, unknown>,
    vision: Record<string, unknown>,
    image: Record<string, unknown>,
    warnings: string[],
  ) {
    if (!llm.default_model) {
      if (llm.custom_openai_api_key) {
        llm.default_model = "custom_openai";
      } else if (llm.deepseek_api_key) {
        llm.default_model = "deepseek";
      } else if (llm.doubao_api_key) {
        llm.default_model = "doubao";
      } else if (llm.kimi_api_key) {
        llm.default_model = "kimi";
      } else if (llm.chatglm_api_key) {
        llm.default_model = "chatglm";
      } else if (llm.qwen_api_key) {
        llm.default_model = "qwen";
      }
    }
    if (!vision.default_model) {
      if (vision.custom_openai_api_key) {
        vision.default_model = "custom_vision";
      } else if (llm.chatglm_api_key) {
        vision.default_model = "chatglm";
      }
    }
    if (!image.default_model) {
      if (image.custom_openai_api_key) {
        image.default_model = "custom_openai";
      } else if (image.doubao_api_key) {
        image.default_model = "doubao";
      } else if (image.chatglm_api_key) {
        image.default_model = "chatglm";
      } else if (image.qwen_api_key) {
        image.default_model = "qwen";
      }
    }
    if (!Object.keys(llm).length) {
      warnings.push("当前品牌还没有可同步到 mixedcut 的 LLM 配置。");
    }
    if (!Object.keys(vision).length) {
      warnings.push("当前品牌还没有可同步到 mixedcut 的视觉模型配置。");
    }
    if (!Object.keys(image).length) {
      warnings.push("当前品牌还没有可同步到 mixedcut 的生图模型配置。");
    }
  }

  private assignMixedcutField(
    target: Record<string, unknown>,
    field: string,
    value: unknown,
    provider: ApiProviderRecord,
    capability: MixedcutCapabilityKey,
    appliedField: string,
    sources: MixedcutAiConfigSyncSource[],
    warnings: string[],
  ) {
    const normalizedValue = typeof value === "string" ? value.trim() : value;
    if (normalizedValue === "" || normalizedValue === undefined || normalizedValue === null) {
      return;
    }
    if (target[field] && target[field] !== normalizedValue) {
      warnings.push(`${capability} 配置字段 ${field} 已由其他供应商占用，保留先写入的值。`);
      return;
    }
    target[field] = normalizedValue;
    sources.push({
      capability,
      providerId: provider.id,
      providerName: provider.name,
      baseUrl: provider.baseUrl,
      model: String(provider.defaultModel || "").trim(),
      appliedField,
    });
  }

  private mapMixedcutMediaAssetList(items: Array<{
    id: string;
    brandId?: string | null;
    title: string;
    mediaType: MediaType | string;
    sourceUrl?: string | null;
    storageKey?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    durationSec?: number | null;
    metadataJson?: unknown;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
  }>) {
    const itemIds = new Set(items.map((item) => item.id));
    return items
      .filter((item) => {
        if (item.mediaType === MediaType.VIDEO || item.mediaType === "VIDEO") {
          return true;
        }
        const derived = this.extractMixedcutVideoSource(item.metadataJson);
        if (!derived.sourceUrl) {
          return false;
        }
        if (derived.videoAssetId && itemIds.has(derived.videoAssetId)) {
          return false;
        }
        return true;
      })
      .map((item) => this.mapMixedcutMediaAsset(item));
  }

  private mapMixedcutMediaAsset(item: {
    id: string;
    brandId?: string | null;
    title: string;
    mediaType: MediaType | string;
    sourceUrl?: string | null;
    storageKey?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    durationSec?: number | null;
    metadataJson?: unknown;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
  }): MixedcutMediaAssetRecord {
    const derived = this.extractMixedcutVideoSource(item.metadataJson);
    const createdAt = this.normalizeDate(item.createdAt instanceof Date ? item.createdAt : String(item.createdAt || new Date().toISOString()));
    const updatedAt = this.normalizeDate(item.updatedAt instanceof Date ? item.updatedAt : String(item.updatedAt || createdAt));
    const assetUrl = this.resolveMixedcutAssetUrl(
      item.brandId ?? undefined,
      item.storageKey ?? undefined,
      item.sourceUrl ?? derived.sourceUrl ?? undefined,
    );
    return {
      id: item.id,
      brandId: item.brandId ?? undefined,
      title: item.title,
      mediaType: String(item.mediaType || "VIDEO"),
      assetUrl,
      sourceUrl: this.readOptionalString(item.sourceUrl) || derived.sourceUrl || assetUrl,
      mimeType: this.readOptionalString(item.mimeType) || undefined,
      fileSize: typeof item.fileSize === "number" ? item.fileSize : undefined,
      durationSec: typeof item.durationSec === "number" ? item.durationSec : derived.durationSec,
      createdAt,
      updatedAt,
    };
  }

  private summarizeMixedcutAssetDurations(items: Array<{ durationSec?: number | null; metadataJson?: unknown }>) {
    let knownCount = 0;
    let totalDurationSec = 0;
    for (const item of items) {
      const durationSec = this.resolveMixedcutAssetDurationSec(item);
      if (typeof durationSec !== "number" || !Number.isFinite(durationSec) || durationSec <= 0) {
        continue;
      }
      knownCount += 1;
      totalDurationSec += durationSec;
    }
    return {
      knownCount,
      totalDurationSec: Number(totalDurationSec.toFixed(3)),
    };
  }

  private resolveMixedcutAssetDurationSec(item: { durationSec?: number | null; metadataJson?: unknown }) {
    const direct = typeof item.durationSec === "number" ? item.durationSec : undefined;
    const normalizedDirect = typeof direct === "number" ? direct : undefined;
    if (normalizedDirect !== undefined && Number.isFinite(normalizedDirect) && normalizedDirect > 0) {
      return normalizedDirect;
    }
    return this.extractMixedcutVideoSource(item.metadataJson).durationSec;
  }

  private async loadMixedcutMediaAssetById(brandId: string, mediaAssetId: string) {
    const normalizedMediaAssetId = String(mediaAssetId || "").trim();
    if (!normalizedMediaAssetId) {
      throw new NotFoundException("视频素材不存在。");
    }

    if (await this.prismaService.canUseDatabase()) {
      const asset = await this.prismaService.mediaAsset.findFirst({
        where: {
          id: normalizedMediaAssetId,
          brandId,
          mediaType: { in: [MediaType.VIDEO, MediaType.HTML] },
        },
      });
      if (!asset || !this.isMixedcutVideoCandidate(asset)) {
        throw new NotFoundException("视频素材不存在。");
      }
      return asset;
    }

    const asset = (database.media || []).find((item) => item.id === normalizedMediaAssetId && item.brandId === brandId);
    if (!asset || !this.isMixedcutVideoCandidate(asset)) {
      throw new NotFoundException("视频素材不存在。");
    }
    return asset;
  }

  private isMixedcutVideoCandidate(item: { mediaType?: MediaType | string | null; metadataJson?: unknown }) {
    if (item.mediaType === MediaType.VIDEO || item.mediaType === "VIDEO") {
      return true;
    }
    return Boolean(this.extractMixedcutVideoSource(item.metadataJson).sourceUrl);
  }

  private extractMixedcutVideoSource(metadataJson: unknown): {
    sourceUrl?: string;
    durationSec?: number;
    videoAssetId?: string;
  } {
    if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
      return {};
    }
    const record = metadataJson as Record<string, unknown>;
    const sourceUrl = this.readOptionalString(record.videoUrl)
      || this.readOptionalString(record.sourceUrl)
      || this.readOptionalString(record.renderedVideoUrl)
      || this.readOptionalString(record.outputVideoUrl)
      || this.readOptionalString(record.finalVideoUrl);
    const durationSec = this.readOptionalNumber(record.renderedDurationSec)
      ?? this.readOptionalNumber(record.durationSec)
      ?? this.readOptionalNumber(record.duration);
    const videoAssetId = this.readOptionalString(record.videoAssetId) || undefined;
    return {
      sourceUrl: sourceUrl || undefined,
      durationSec,
      videoAssetId,
    };
  }

  private resolveMixedcutAssetUrl(brandId?: string, storageKey?: string | null, sourceUrl?: string | null) {
    const normalizedStorageKey = String(storageKey || "").trim();
    if (brandId && normalizedStorageKey.startsWith(`works/${brandId}/`)) {
      return `${this.resolveServerBaseUrl()}/api/works/brands/${brandId}/assets?fileName=${encodeURIComponent(
        normalizedStorageKey.slice(`works/${brandId}/`.length),
      )}`;
    }
    return this.readOptionalString(sourceUrl) || undefined;
  }

  private async uploadMixedcutMediaAsset(asset: MixedcutRemixSourceRecord): Promise<MixedcutUploadedVideoRecord> {
    const file = await this.resolveMixedcutMediaFile(asset);
    const form = new FormData();
    form.set("video", new Blob([file.buffer], { type: file.contentType }), file.fileName);
    form.set("scene", "remix");
    const response = await this.callMixedcutJson("/api/upload/video", {
      method: "POST",
      body: form,
    }, `上传站内视频素材《${asset.title || asset.id}》到 mixedcut`);
    const pathValue = this.readOptionalString(this.asRecord(response.data)?.path);
    if (!pathValue) {
      throw new ServiceUnavailableException("mixedcut 上传成功但未返回素材路径。");
    }
    return {
      mediaAssetId: asset.id,
      title: String(asset.title || "").trim() || "站内视频素材",
      fileName: file.fileName,
      mixedcutPath: pathValue,
    };
  }

  private async resolveMixedcutMediaFile(asset: MixedcutRemixSourceRecord) {
    const brandId = String(asset.brandId || "").trim();
    const derived = this.extractMixedcutVideoSource(asset.metadataJson);
    const directStorageKey = this.normalizeWorksStorageKey(brandId, asset.storageKey);
    const sourceCandidate = this.resolveMixedcutAssetUrl(
      brandId,
      asset.storageKey ?? undefined,
      asset.sourceUrl ?? derived.sourceUrl ?? undefined,
    ) || this.readOptionalString(asset.sourceUrl) || derived.sourceUrl || "";
    const storageKeyFromUrl = this.normalizeWorksStorageKey(brandId, this.toStorageKeyFromUrl(sourceCandidate));
    const storageKey = directStorageKey || storageKeyFromUrl;
    const fallbackName = this.buildMixedcutUploadFileName(asset.id, asset.title, sourceCandidate, asset.mimeType);

    if (storageKey) {
      const stored = await this.ossStorageService.getObject(storageKey);
      if (stored?.buffer?.length) {
        return {
          buffer: stored.buffer,
          contentType: stored.contentType || this.resolveVideoContentType(fallbackName, asset.mimeType),
          fileName: fallbackName,
        };
      }
    }

    const normalizedSource = String(sourceCandidate || "").trim();
    if (!normalizedSource) {
      throw new BadRequestException(`素材《${asset.title || asset.id}》缺少可读取的视频文件。`);
    }

    if (/^https?:\/\//i.test(normalizedSource)) {
      const response = await this.fetchWithTimeout(normalizedSource, { method: "GET" }, 120000);
      if (!response.ok) {
        throw new ServiceUnavailableException(`读取素材《${asset.title || asset.id}》失败：${response.status}`);
      }
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get("content-type") || this.resolveVideoContentType(fallbackName, asset.mimeType),
        fileName: fallbackName,
      };
    }

    if (/^[a-z]:[\\/]/i.test(normalizedSource) || normalizedSource.startsWith("/")) {
      return {
        buffer: await readFile(normalizedSource),
        contentType: this.resolveVideoContentType(fallbackName, asset.mimeType),
        fileName: fallbackName,
      };
    }

    throw new BadRequestException(`素材《${asset.title || asset.id}》暂不支持当前来源格式，请先确认视频文件已落到站内存储。`);
  }

  private normalizeMixedcutTaskRecord(
    data: unknown,
    uploadedVideos?: MixedcutUploadedVideoRecord[],
    fallbackTaskId?: string,
  ): MixedcutRemixTaskRecord {
    const record = this.asRecord(data);
    return {
      taskId: this.readOptionalString(record.task_id) || fallbackTaskId || "",
      projectId: this.readOptionalString(record.project_id) || undefined,
      status: this.readOptionalString(record.status) || "pending",
      progress: this.readOptionalNumber(record.progress) || 0,
      error: this.readOptionalString(record.error) || undefined,
      videoUrl: this.readOptionalString(record.video_url) || undefined,
      videoPath: this.readOptionalString(record.video_path) || undefined,
      outputPath: this.readOptionalString(record.output_path) || undefined,
      duration: this.readOptionalNumber(record.duration),
      targetDurationSeconds: this.readOptionalNumber(record.target_duration_seconds),
      actualDurationSeconds: this.readOptionalNumber(record.actual_duration_seconds),
      durationDeltaSeconds: this.readOptionalNumber(record.duration_delta_seconds),
      durationWithinTolerance: typeof record.duration_within_tolerance === "boolean" ? record.duration_within_tolerance : undefined,
      videoCount: this.readOptionalNumber(record.video_count),
      mode: this.readOptionalString(record.mode) || undefined,
      editingMode: this.readOptionalString(record.editing_mode) || undefined,
      timeline: Array.isArray(record.timeline) ? record.timeline : [],
      uploadedVideos,
    };
  }

  private async callMixedcutJson(requestPath: string, init: RequestInit, actionLabel: string) {
    const response = await this.fetchWithTimeout(this.resolveMixedcutServiceUrl(requestPath), init, 120000);
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const record = this.asRecord(payload);
    const message = this.readOptionalString(record.msg) || `${actionLabel}失败`;
    if (!response.ok || Number(record.code ?? 1) !== 0) {
      throw new ServiceUnavailableException(`${actionLabel}失败：${message}`);
    }
    return record;
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      const detail = error instanceof Error && error.message ? error.message : "请求失败";
      throw new ServiceUnavailableException(`访问 mixedcut 服务失败：${detail}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private buildMixedcutTaskName(assets: Array<{ title: string }>) {
    const firstTitle = String(assets[0]?.title || "").trim();
    if (!firstTitle) {
      return "站内视频混剪任务";
    }
    return assets.length > 1 ? `${firstTitle} 等 ${assets.length} 条素材混剪` : `${firstTitle} 混剪`;
  }

  private normalizeMixedcutStyle(value: unknown): "dynamic" | "calm" | "exciting" {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "calm" || normalized === "exciting") {
      return normalized;
    }
    return "dynamic";
  }

  private buildMixedcutUploadFileName(mediaAssetId: string, title: string, sourceUrl?: string, mimeType?: string | null) {
    const extension = path.extname(String(sourceUrl || "").split("?")[0] || "").toLowerCase()
      || this.extensionFromMimeType(mimeType)
      || ".mp4";
    const safeTitle = String(title || "").trim().replace(/[^\w\u4e00-\u9fa5-]+/g, "_").replace(/_+/g, "_").slice(0, 40) || mediaAssetId;
    return `${safeTitle}_${mediaAssetId}${extension}`;
  }

  private extensionFromMimeType(value?: string | null) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized.includes("webm")) {
      return ".webm";
    }
    if (normalized.includes("quicktime")) {
      return ".mov";
    }
    if (normalized.includes("ogg")) {
      return ".ogv";
    }
    return normalized.includes("mp4") ? ".mp4" : "";
  }

  private resolveVideoContentType(fileName: string, fallbackMimeType?: string | null) {
    const extension = path.extname(String(fileName || "")).toLowerCase();
    if (extension === ".webm") {
      return "video/webm";
    }
    if (extension === ".mov") {
      return "video/quicktime";
    }
    if (extension === ".ogv") {
      return "video/ogg";
    }
    return String(fallbackMimeType || "").trim() || "video/mp4";
  }

  private resolveServerBaseUrl() {
    return this.appConfigService.getServerBaseUrl();
  }

  private openClawVideoWorkBootstrapPromise: Promise<void> | null = null;

  private async ensureOpenClawVideoWorkTableReady() {
    if (!this.openClawVideoWorkBootstrapPromise) {
      this.openClawVideoWorkBootstrapPromise = this.bootstrapOpenClawVideoWorkTable();
    }
    await this.openClawVideoWorkBootstrapPromise;
  }

  private async bootstrapOpenClawVideoWorkTable() {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
    }
    if (this.prismaService.isLocalSqliteMode()) {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawVideoWork" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "description" TEXT NOT NULL DEFAULT '',
          "scriptContent" TEXT NOT NULL DEFAULT '',
          "coverImageUrl" TEXT,
          "videoUrl" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("OpenClawVideoWork", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "description", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "scriptContent", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "coverImageUrl", definition: "TEXT" },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawVideoWork" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "title" TEXT NOT NULL DEFAULT '',
          "description" TEXT NOT NULL DEFAULT '',
          "scriptContent" TEXT NOT NULL DEFAULT '',
          "coverImageUrl" TEXT,
          "videoUrl" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawVideoWork"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawVideoWork"
        ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawVideoWork"
        ADD COLUMN IF NOT EXISTS "scriptContent" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawVideoWork"
        ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "OpenClawVideoWork"
      SET "workspaceScope" = '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      WHERE COALESCE(NULLIF(TRIM("workspaceScope"), ''), '') = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawVideoWork_brand_scope_created_idx"
      ON "OpenClawVideoWork" ("brandId", "workspaceScope", "createdAt" DESC)
    `);
  }

  private async findOpenClawVideoWorkByVideoUrl(brandId: string, workspaceScope: string, videoUrl: string) {
    if (!(await this.prismaService.canUseDatabase())) {
      return undefined;
    }
    await this.ensureOpenClawVideoWorkTableReady();
    const rows = await this.prismaService.$queryRaw<OpenClawVideoWorkRow[]>`
      SELECT
        "id",
        "brandId",
        "workspaceScope",
        "createdByUserId",
        "title",
        "description",
        "scriptContent",
        "coverImageUrl",
        "videoUrl",
        "createdAt",
        "updatedAt"
      FROM "OpenClawVideoWork"
      WHERE "brandId" = ${brandId}
        AND "workspaceScope" = ${workspaceScope}
        AND "videoUrl" = ${videoUrl}
      LIMIT 1
    `;
    const matched = rows[0];
    return matched ? this.normalizeOpenClawVideoWorkRow(matched) : undefined;
  }

  private async findOpenClawVideoWorkById(brandId: string, workspaceScope: string, workId: string) {
    if (!(await this.prismaService.canUseDatabase())) {
      return undefined;
    }
    await this.ensureOpenClawVideoWorkTableReady();
    const rows = await this.prismaService.$queryRaw<OpenClawVideoWorkRow[]>`
      SELECT
        "id",
        "brandId",
        "workspaceScope",
        "createdByUserId",
        "title",
        "description",
        "scriptContent",
        "coverImageUrl",
        "videoUrl",
        "createdAt",
        "updatedAt"
      FROM "OpenClawVideoWork"
      WHERE "brandId" = ${brandId}
        AND "workspaceScope" = ${workspaceScope}
        AND "id" = ${workId}
      LIMIT 1
    `;
    const matched = rows[0];
    return matched ? this.normalizeOpenClawVideoWorkRow(matched) : undefined;
  }

  private normalizeOpenClawVideoWorkRow(row: OpenClawVideoWorkRow) {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeOpenClawWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      title: String(row.title || "").trim(),
      description: String(row.description || "").trim(),
      scriptContent: String(row.scriptContent || "").trim(),
      ...(row.coverImageUrl ? { coverImageUrl: String(row.coverImageUrl).trim() } : {}),
      videoUrl: String(row.videoUrl || "").trim(),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || ""),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || ""),
    };
  }

  private toStorageKeyFromUrl(url: string) {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) {
      return "";
    }
    const serverBaseUrl = this.resolveServerBaseUrl();
    if (normalizedUrl.startsWith(serverBaseUrl)) {
      const relative = normalizedUrl.replace(`${serverBaseUrl}/api/works/brands/`, "");
      const [brandId = "", rest = ""] = relative.split("/assets/");
      if (brandId && rest) {
        return `works/${brandId}/${decodeURIComponent(rest)}`;
      }
    }
    try {
      const parsed = new URL(normalizedUrl, serverBaseUrl);
      const matched = parsed.pathname.match(/^\/api\/works\/brands\/([^/]+)\/assets$/);
      if (!matched?.[1]) {
        return "";
      }
      const fileName = parsed.searchParams.get("fileName");
      if (!fileName) {
        return "";
      }
      return `works/${decodeURIComponent(matched[1])}/${decodeURIComponent(fileName)}`;
    } catch {
      return "";
    }
  }

  private normalizeWorksStorageKey(brandId: string, storageKey?: string | null) {
    const normalized = String(storageKey || "").trim();
    if (!normalized.startsWith(`works/${brandId}/`)) {
      return "";
    }
    return normalized;
  }

  private asRecord(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private readOptionalString(value: unknown) {
    const normalized = String(value || "").trim();
    return normalized || "";
  }

  private readOptionalNumber(value: unknown) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }
}
