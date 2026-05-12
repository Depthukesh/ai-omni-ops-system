import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { BadRequestException, Inject, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { AssetCategory, Prisma } from "@prisma/client";
import { createId, database, type AssetRecord, type PlatformAccountRecord } from "../../common/mock-data";
import { getFeishuUserAppConfig, getFeishuUserIntegration, setFeishuUserIntegration } from "../../common/user-integrations";
import { PrismaService } from "../../prisma/prisma.service";
import { SchedulerService } from "../scheduler/scheduler.service";

const execFileAsync = promisify(execFile);

type CollectorAccountKind = "XHS_BRAND_ACCOUNT" | "XHS_COMPETITOR_ACCOUNT";
type CollectorNoteKind = "XHS_BRAND_NOTE" | "XHS_BENCHMARK_NOTE";
type CollectorTargetKind = "XHS_TARGET_USER";
type CollectorAssetKind = CollectorAccountKind | CollectorNoteKind | CollectorTargetKind;
type CollectorSyncStatus = "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";
type DailyHotspotSyncStatus = "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";

type DailyHotspotConfig = {
  platformKey: string;
  title: string;
  boardType: string;
  description: string;
  sourceLink: string;
  path: string;
};

const DAILY_HOTSPOT_CONFIGS: DailyHotspotConfig[] = [
  {
    platformKey: "douyin-hot-search",
    title: "热搜榜",
    boardType: "热搜",
    description: "抖音站内综合热搜，适合查看当天大众传播话题。",
    sourceLink: "https://www.douyin.com/hot",
    path: "/api/v1/douyin/app/v3/fetch_hot_search_list",
  },
];

const FEISHU_BINDING_TITLE = "FEISHU_COPY_BINDING";

const FEISHU_TABLE_MATCHERS = {
  brandAccounts: ["品牌账号信息", "品牌账号", "品牌账号表", "鍝佺墝璐﹀彿淇℃伅"],
  competitorAccounts: ["竞品账号信息", "竞品账号", "竞品账号表", "绔炲搧璐﹀彿淇℃伅"],
  brandNotes: ["品牌作品信息及数据", "品牌作品", "品牌笔记", "品牌作品表", "鍝佺墝浣滃搧淇℃伅鍙婃暟鎹"],
  benchmarkNotes: ["对标作品信息及数据", "对标作品", "竞品作品", "对标作品表", "瀵规爣浣滃搧淇℃伅鍙婃暟鎹"],
  targetUsers: ["目标用户查找", "目标用户", "目标用户线索"],
} as const;

type FeishuBindingRecord = {
  id: string;
  wikiUrl: string;
  wikiToken: string;
  host: string;
  tableId: string;
  viewId: string;
  baseToken: string;
  templateUrl: string;
  syncStatus: CollectorSyncStatus;
  lastError: string;
  lastBoundAt: string;
  lastSyncAt: string;
};

type FeishuTableRecord = {
  tableId: string;
  tableName: string;
};

type FeishuRowRecord = {
  recordId: string;
  fields: Record<string, unknown>;
};

export type XhsCollectedAccountRecord = {
  id: string;
  kind: CollectorAccountKind;
  sourceAccountId: string;
  sourceAccountLink: string;
  accountName: string;
  externalUserId?: string;
  postedCount?: number;
  likedCount?: number;
  collectedCount?: number;
  avatar?: string;
  description?: string;
  ipLocation?: string;
  followCount?: number;
  fanCount?: number;
  collectedAt: string;
};

export type XhsCollectedNoteRecord = {
  id: string;
  sourceAccountId: string;
  noteId: string;
  title: string;
  noteType?: string;
  nickname?: string;
  imageList?: string[];
  externalUserId?: string;
  noteUrl?: string;
  description?: string;
  likeCount?: number;
  collectCount?: number;
  createdAtText?: string;
  shareCount?: number;
  commentCount?: number;
  likeCollectRatio?: number;
  likeCommentRatio?: number;
  shareRatio?: number;
  isExplosive?: string;
  followUpDecision?: string;
  videoUrl?: string;
  collectedAt: string;
  sourceUrl?: string;
  syncStatus?: CollectorSyncStatus;
  retryCount?: number;
  nextRetryAt?: string;
  lastError?: string;
  isInMaterialLibrary?: boolean;
  materialAddedAt?: string;
  sourceTableId?: string;
  sourceRecordId?: string;
  rawFields?: Record<string, unknown>;
};

export type XhsCollectedTargetUserRecord = {
  id: string;
  sourceUrl: string;
  profileUrl?: string;
  userId?: string;
  nickname: string;
  noteTitle?: string;
  collectedAt: string;
  syncStatus: CollectorSyncStatus;
  retryCount: number;
  nextRetryAt?: string;
  lastError?: string;
};

export type XhsCollectionWorkspace = {
  brandAccounts: XhsCollectedAccountRecord[];
  competitorAccounts: XhsCollectedAccountRecord[];
  brandNotes: XhsCollectedNoteRecord[];
  benchmarkNotes: XhsCollectedNoteRecord[];
  targetUsers: XhsCollectedTargetUserRecord[];
};

export type DailyHotspotItemRecord = {
  id: string;
  rank: number;
  title: string;
  hot?: number;
  url?: string;
  mobileUrl?: string;
  timestamp?: number;
};

export type DailyHotspotPlatformRecord = {
  id: string;
  platformKey: string;
  title: string;
  snapshotDate: string;
  boardType?: string;
  description?: string;
  sourceLink?: string;
  total: number;
  updateTime?: string;
  fromCache?: boolean;
  collectedAt?: string;
  syncStatus: DailyHotspotSyncStatus;
  lastError?: string;
  items: DailyHotspotItemRecord[];
};

export type DailyHotspotWorkspace = {
  selectedDate: string;
  availableDates: string[];
  platforms: DailyHotspotPlatformRecord[];
};

@Injectable()
export class CollectorsService implements OnModuleInit, OnModuleDestroy {
  private static readonly DAILY_HOTSPOT_JOB_NAME = "collectors.daily-hotspots.sync";

  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(SchedulerService)
    private readonly schedulerService: SchedulerService,
  ) {}

  onModuleInit() {
    this.schedulerService.registerDailyJob({
      name: CollectorsService.DAILY_HOTSPOT_JOB_NAME,
      hour: 4,
      minute: 0,
      runOnStartupIfMissed: true,
      shouldRunOnStartup: () => this.shouldCatchUpDailyHotspotRun(),
      onTick: () => this.runDailyHotspotSyncJob(),
    });
  }

  onModuleDestroy() {
    this.schedulerService.unregisterJob(CollectorsService.DAILY_HOTSPOT_JOB_NAME);
  }

  async getXiaohongshuWorkspace(brandId: string): Promise<XhsCollectionWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      return this.getWorkspaceFromDatabase(brandId);
    }

    return this.getWorkspaceFromMock(brandId);
  }

  async syncBrandAccounts(brandId: string) {
    const accounts = await this.getConfiguredAccounts(brandId, "brand");
    const collected = await Promise.all(
      accounts.map((account) => this.collectAndStoreAccount(brandId, account, "XHS_BRAND_ACCOUNT")),
    );
    return {
      syncedCount: collected.length,
      items: collected,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncCompetitorAccounts(brandId: string) {
    const accounts = await this.getConfiguredAccounts(brandId, "competitor");
    const collected = await Promise.all(
      accounts.map((account) => this.collectAndStoreAccount(brandId, account, "XHS_COMPETITOR_ACCOUNT")),
    );
    return {
      syncedCount: collected.length,
      items: collected,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncBrandNotes(brandId: string) {
    const accounts = await this.getConfiguredAccounts(brandId, "brand");
    const rows = await Promise.all(accounts.map((account) => this.collectAndStoreNotes(brandId, account)));
    return {
      syncedCount: rows.reduce((sum, items) => sum + items.length, 0),
      items: rows.flat(),
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncBenchmarkNotes(brandId: string, sourceUrls: string[]) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const rows = await Promise.all(sourceUrls.filter(Boolean).map((url) => this.collectAndStoreBenchmarkNote(brandId, url)));
    return {
      syncedCount: rows.filter((item) => item.syncStatus === "SUCCESS").length,
      items: rows,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncTargetUsers(brandId: string, sourceUrls: string[]) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const rows = await Promise.all(sourceUrls.filter(Boolean).map((url) => this.collectAndStoreTargetUser(brandId, url)));
    return {
      syncedCount: rows.filter((item) => item.syncStatus === "SUCCESS").length,
      items: rows,
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async addBenchmarkNoteToMaterialLibrary(brandId: string, assetId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = await this.getCollectorAssetById(brandId, assetId);
    const meta = this.asMeta(asset.metadataJson);
    if (this.readMetaString(meta, "kind") !== "XHS_BENCHMARK_NOTE") {
      throw new BadRequestException("仅支持将对标作品加入素材库");
    }

    const materialAddedAt = this.readMetaString(meta, "materialAddedAt") || new Date().toISOString();
    await this.updateCollectorAssetMeta(brandId, assetId, {
      inMaterialLibrary: true,
      materialAddedAt,
    });

    return {
      item: {
        ...this.mapCollectedNote({
          ...asset,
          metadataJson: {
            ...meta,
            inMaterialLibrary: true,
            materialAddedAt,
          },
        }),
        isInMaterialLibrary: true,
        materialAddedAt,
      },
      workspace: await this.getXiaohongshuWorkspace(brandId),
    };
  }

  async syncFeishuWorkspace(brandId: string) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const binding = await this.getFeishuBinding(brandId);
    if (!binding) {
      throw new NotFoundException("请先在品牌增长策略中绑定飞书副本链接");
    }

    await this.updateFeishuBindingState(brandId, {
      syncStatus: "RUNNING",
      lastError: "",
    });

    try {
      const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
      const baseToken = await this.resolveFeishuBaseToken(binding, userAccessToken);
      const tables = await this.listFeishuTables(baseToken, userAccessToken);
      const matchedTables = await this.matchFeishuTables(baseToken, userAccessToken, tables, binding);
      await this.clearExistingXiaohongshuCollectorAssets(brandId);
      const tableCount = Object.values(matchedTables).filter(Boolean).length;
      let syncedCount = 0;

      if (matchedTables.brandAccounts) {
        syncedCount += await this.syncFeishuAccountTable(brandId, baseToken, matchedTables.brandAccounts, "XHS_BRAND_ACCOUNT");
      }
      if (matchedTables.competitorAccounts) {
        syncedCount += await this.syncFeishuAccountTable(brandId, baseToken, matchedTables.competitorAccounts, "XHS_COMPETITOR_ACCOUNT");
      }
      if (matchedTables.brandNotes) {
        syncedCount += await this.syncFeishuBrandNotesTable(brandId, baseToken, matchedTables.brandNotes);
      }
      if (matchedTables.benchmarkNotes) {
        syncedCount += await this.syncFeishuBenchmarkNotesTable(brandId, baseToken, matchedTables.benchmarkNotes);
      }
      if (matchedTables.targetUsers) {
        syncedCount += await this.syncFeishuTargetUsersTable(brandId, baseToken, matchedTables.targetUsers);
      }
      await this.cleanupDuplicateCollectorAssets(brandId);

      const lastSyncAt = new Date().toISOString();
      await this.updateFeishuBindingState(brandId, {
        baseToken,
        syncStatus: "SUCCESS",
        lastError: "",
        lastSyncAt,
      });

      return {
        syncedCount,
        tableCount,
        workspace: await this.getXiaohongshuWorkspace(brandId),
        binding: await this.getFeishuBinding(brandId),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "飞书副本同步失败";
      await this.updateFeishuBindingState(brandId, {
        syncStatus: "FAILED",
        lastError: message,
      });
      throw new ServiceUnavailableException(`飞书副本同步失败：${message}`);
    }
  }

  async fetchFeishuMedia(brandId: string, sourceUrl: string) {
    if (!sourceUrl?.trim()) {
      throw new BadRequestException("缺少附件地址");
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(sourceUrl);
    } catch {
      throw new BadRequestException("附件地址无效");
    }

    const isAllowedHost = targetUrl.hostname === "open.feishu.cn"
      || targetUrl.hostname === "open.larkoffice.com"
      || targetUrl.hostname.endsWith(".feishu.cn")
      || targetUrl.hostname.endsWith(".larkoffice.com")
      || targetUrl.hostname.endsWith(".larksuite.com");
    const isAllowedPath = /\/open-apis\/drive\/v1\/medias\/[^/]+\/download/i.test(targetUrl.pathname)
      || /\/space\/api\/box\/stream\/download/i.test(targetUrl.pathname)
      || /\/media\/download/i.test(targetUrl.pathname);
    if (!isAllowedHost || !isAllowedPath) {
      throw new BadRequestException("当前只支持代理飞书附件下载地址");
    }

    let userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    let response = await fetch(targetUrl.toString(), {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });
    if (response.status === 401) {
      userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId, true);
      response = await fetch(targetUrl.toString(), {
        headers: {
          Authorization: `Bearer ${userAccessToken}`,
        },
      });
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`飞书附件获取失败：${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const disposition = response.headers.get("content-disposition") || "";
    const fileName = this.extractFileNameFromDisposition(disposition)
      || this.extractFileNameFromMediaUrl(targetUrl.toString())
      || "feishu-media";

    return {
      buffer,
      contentType,
      fileName,
    };
  }

  async getDailyHotspotWorkspace(
    brandId: string,
    targetDate?: string,
    options?: { skipAutoCatchUp?: boolean },
  ): Promise<DailyHotspotWorkspace> {
    const workspace = await this.readDailyHotspotWorkspace(brandId, targetDate);
    if (targetDate || options?.skipAutoCatchUp) {
      return workspace;
    }
    if (!(await this.shouldCatchUpDailyHotspotBrand(brandId))) {
      return workspace;
    }

    try {
      await this.syncDailyHotspots(brandId, []);
      return this.readDailyHotspotWorkspace(brandId, targetDate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      console.error(`每日热点工作区自动补抓失败: ${brandId} - ${message}`);
      return workspace;
    }
  }

  private async readDailyHotspotWorkspace(brandId: string, targetDate?: string): Promise<DailyHotspotWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        orderBy: { updatedAt: "desc" },
      });

      return this.buildDailyHotspotWorkspace(
        assets.map((item) => ({
          id: item.id,
          brandId: item.brandId,
          category: "PLATFORM_EXPORT" as const,
          title: item.title,
          description: item.description ?? "",
          sourceName: "每日热点采集",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        })),
        targetDate,
      );
    }

    this.ensureBrandExistsInMock(brandId);
    const assets = database.assets.filter((item) => item.brandId === brandId && item.category === "PLATFORM_EXPORT");
    return this.buildDailyHotspotWorkspace(assets, targetDate);
  }

  async syncDailyHotspots(brandId: string, platformTitles: string[] = []) {
    this.ensureBrandExistsInMockOrDatabase(brandId);
    const targets = this.resolveDailyHotspotConfigs(platformTitles);
    const results = await Promise.all(targets.map((config) => this.collectAndStoreDailyHotspotPlatform(brandId, config)));

    return {
      syncedCount: results.filter((item) => item.syncStatus === "SUCCESS").length,
      results,
      workspace: await this.getDailyHotspotWorkspace(brandId, undefined, { skipAutoCatchUp: true }),
    };
  }

  private async getWorkspaceFromDatabase(brandId: string): Promise<XhsCollectionWorkspace> {
    await this.ensureBrandExistsInDatabase(brandId);
    const assets = await this.prismaService.businessAsset.findMany({
      where: {
        brandId,
        category: AssetCategory.PLATFORM_EXPORT,
      },
      orderBy: { updatedAt: "desc" },
    });

    return this.buildWorkspaceFromAssets(
      assets.map((item) => ({
        id: item.id,
        brandId: item.brandId,
        category: "PLATFORM_EXPORT" as const,
        title: item.title,
        description: item.description ?? "",
        sourceName: "小红书采集",
        fileUrl: item.fileUrl ?? undefined,
        metadataJson: this.asMeta(item.metadataJson),
      })),
    );
  }

  private getWorkspaceFromMock(brandId: string): XhsCollectionWorkspace {
    this.ensureBrandExistsInMock(brandId);
    const assets = database.assets.filter((item) => item.brandId === brandId && item.category === "PLATFORM_EXPORT");
    return this.buildWorkspaceFromAssets(assets);
  }

  private buildWorkspaceFromAssets(assets: AssetRecord[]): XhsCollectionWorkspace {
    const brandAccounts = assets
      .filter((item) => item.metadataJson?.kind === "XHS_BRAND_ACCOUNT")
      .map((item) => this.mapCollectedAccount(item, "XHS_BRAND_ACCOUNT"));
    const competitorAccounts = assets
      .filter((item) => item.metadataJson?.kind === "XHS_COMPETITOR_ACCOUNT")
      .map((item) => this.mapCollectedAccount(item, "XHS_COMPETITOR_ACCOUNT"));
    const brandNotes = assets
      .filter((item) => item.metadataJson?.kind === "XHS_BRAND_NOTE")
      .map((item) => this.mapCollectedNote(item));
    const benchmarkNotes = assets
      .filter((item) => item.metadataJson?.kind === "XHS_BENCHMARK_NOTE")
      .map((item) => this.mapCollectedNote(item));
    const targetUsers = assets
      .filter((item) => item.metadataJson?.kind === "XHS_TARGET_USER")
      .map((item) => this.mapCollectedTargetUser(item));

    return { brandAccounts, competitorAccounts, brandNotes, benchmarkNotes, targetUsers };
  }

  private mapCollectedAccount(asset: AssetRecord, kind: CollectorAccountKind): XhsCollectedAccountRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      kind,
      sourceAccountId: this.readMetaString(meta, "sourceAccountId"),
      sourceAccountLink: this.readMetaString(meta, "sourceAccountLink"),
      accountName: asset.title,
      externalUserId: this.readMetaString(meta, "externalUserId") || undefined,
      postedCount: this.readMetaNumber(meta, "postedCount"),
      likedCount: this.readMetaNumber(meta, "likedCount"),
      collectedCount: this.readMetaNumber(meta, "collectedCount"),
      avatar: this.readMetaString(meta, "avatar") || undefined,
      description: this.readMetaString(meta, "description") || undefined,
      ipLocation: this.readMetaString(meta, "ipLocation") || undefined,
      followCount: this.readMetaNumber(meta, "followCount"),
      fanCount: this.readMetaNumber(meta, "fanCount"),
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
    };
  }

  private mapCollectedNote(asset: AssetRecord): XhsCollectedNoteRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      sourceAccountId: this.readMetaString(meta, "sourceAccountId"),
      noteId: this.readMetaString(meta, "noteId"),
      title: asset.title,
      noteType: this.readMetaString(meta, "noteType") || undefined,
      nickname: this.readMetaString(meta, "nickname") || undefined,
      imageList: this.readMetaStringArray(meta, "imageList"),
      externalUserId: this.readMetaString(meta, "externalUserId") || undefined,
      noteUrl: this.readMetaString(meta, "noteUrl") || asset.fileUrl,
      description: asset.description,
      likeCount: this.readMetaNumber(meta, "likeCount"),
      collectCount: this.readMetaNumber(meta, "collectCount"),
      createdAtText: this.readMetaString(meta, "createdAtText") || undefined,
      shareCount: this.readMetaNumber(meta, "shareCount"),
      commentCount: this.readMetaNumber(meta, "commentCount"),
      likeCollectRatio: this.readMetaNumber(meta, "likeCollectRatio"),
      likeCommentRatio: this.readMetaNumber(meta, "likeCommentRatio"),
      shareRatio: this.readMetaNumber(meta, "shareRatio"),
      isExplosive: this.readMetaString(meta, "isExplosive") || undefined,
      followUpDecision: this.readMetaString(meta, "followUpDecision") || undefined,
      videoUrl: this.readMetaString(meta, "videoUrl") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
      sourceUrl: this.readMetaString(meta, "sourceUrl") || undefined,
      syncStatus: (this.readMetaString(meta, "syncStatus") as CollectorSyncStatus) || "SUCCESS",
      retryCount: this.readMetaNumber(meta, "retryCount"),
      nextRetryAt: this.readMetaString(meta, "nextRetryAt") || undefined,
      lastError: this.readMetaString(meta, "lastError") || undefined,
      isInMaterialLibrary: this.readMetaBoolean(meta, "inMaterialLibrary") || undefined,
      materialAddedAt: this.readMetaString(meta, "materialAddedAt") || undefined,
      sourceTableId: this.readMetaString(meta, "sourceTableId") || undefined,
      sourceRecordId: this.readMetaString(meta, "sourceRecordId") || undefined,
      rawFields: this.asMeta(meta.rawFields),
    };
  }

  private async getCollectorAssetById(brandId: string, assetId: string): Promise<AssetRecord> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: assetId,
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
      });

      if (!asset) {
        throw new NotFoundException("未找到对应的小红书采集记录");
      }

      return {
        id: asset.id,
        brandId: asset.brandId,
        category: "PLATFORM_EXPORT",
        title: asset.title,
        description: asset.description ?? "",
        sourceName: "小红书采集",
        fileUrl: asset.fileUrl ?? undefined,
        metadataJson: this.asMeta(asset.metadataJson),
      };
    }

    this.ensureBrandExistsInMockOrDatabase(brandId);
    const asset = database.assets.find((item) => item.id === assetId && item.brandId === brandId && item.category === "PLATFORM_EXPORT");
    if (!asset) {
      throw new NotFoundException("未找到对应的小红书采集记录");
    }
    return {
      ...asset,
      metadataJson: this.asMeta(asset.metadataJson),
    };
  }

  private async updateCollectorAssetMeta(brandId: string, assetId: string, patch: Record<string, unknown>) {
    if (await this.prismaService.canUseDatabase()) {
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: assetId,
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
      });

      if (!asset) {
        throw new NotFoundException("未找到对应的小红书采集记录");
      }

      await this.prismaService.businessAsset.update({
        where: { id: asset.id },
        data: {
          metadataJson: {
            ...this.asMeta(asset.metadataJson),
            ...patch,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const index = database.assets.findIndex((item) => item.id === assetId && item.brandId === brandId && item.category === "PLATFORM_EXPORT");
    if (index < 0) {
      throw new NotFoundException("未找到对应的小红书采集记录");
    }

    database.assets[index] = {
      ...database.assets[index],
      metadataJson: {
        ...this.asMeta(database.assets[index].metadataJson),
        ...patch,
      },
    };
  }

  private mapCollectedTargetUser(asset: AssetRecord): XhsCollectedTargetUserRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      sourceUrl: this.readMetaString(meta, "sourceUrl"),
      profileUrl: this.readMetaString(meta, "profileUrl") || undefined,
      userId: this.readMetaString(meta, "userId") || undefined,
      nickname: asset.title,
      noteTitle: this.readMetaString(meta, "noteTitle") || undefined,
      collectedAt: this.readMetaString(meta, "collectedAt") || new Date().toISOString(),
      syncStatus: (this.readMetaString(meta, "syncStatus") as CollectorSyncStatus) || "FAILED",
      retryCount: this.readMetaNumber(meta, "retryCount") ?? 0,
      nextRetryAt: this.readMetaString(meta, "nextRetryAt") || undefined,
      lastError: this.readMetaString(meta, "lastError") || undefined,
    };
  }

  private buildDailyHotspotWorkspace(assets: AssetRecord[], targetDate?: string): DailyHotspotWorkspace {
    const allowedPlatformKeys = new Set(DAILY_HOTSPOT_CONFIGS.map((item) => item.platformKey));
    const filteredAssets = assets.filter((asset) => {
      const meta = this.asMeta(asset.metadataJson);
      return (
        this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM"
        && allowedPlatformKeys.has(this.readMetaString(meta, "platformKey"))
      );
    });
    const availableDates = Array.from(
      new Set(
        filteredAssets
          .map((asset) => this.getDailyHotspotSnapshotDate(this.asMeta(asset.metadataJson)))
          .filter(Boolean),
      ),
    ).sort((left, right) => right.localeCompare(left));
    const selectedDate = availableDates.includes(targetDate ?? "") ? (targetDate as string) : (availableDates[0] ?? "");
    const latestByPlatform = new Map<string, AssetRecord>();

    for (const asset of filteredAssets) {
      const meta = this.asMeta(asset.metadataJson);
      if (selectedDate && this.getDailyHotspotSnapshotDate(meta) !== selectedDate) {
        continue;
      }

      const platformKey = this.readMetaString(meta, "platformKey");
      if (!platformKey || latestByPlatform.has(platformKey)) {
        continue;
      }
      latestByPlatform.set(platformKey, asset);
    }

    const platforms = Array.from(latestByPlatform.values()).map((item) => this.mapDailyHotspotPlatform(item));
    return { selectedDate, availableDates, platforms };
  }

  private mapDailyHotspotPlatform(asset: AssetRecord): DailyHotspotPlatformRecord {
    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      platformKey: this.readMetaString(meta, "platformKey"),
      title: asset.title,
      snapshotDate: this.getDailyHotspotSnapshotDate(meta),
      boardType: this.readMetaString(meta, "boardType") || undefined,
      description: asset.description || undefined,
      sourceLink: this.readMetaString(meta, "sourceLink") || asset.fileUrl || undefined,
      total: this.readMetaNumber(meta, "total") ?? this.readMetaJsonArray(meta, "items").length,
      updateTime: this.readMetaString(meta, "updateTime") || undefined,
      fromCache: this.readMetaBoolean(meta, "fromCache"),
      collectedAt: this.readMetaString(meta, "collectedAt") || undefined,
      syncStatus: (this.readMetaString(meta, "syncStatus") as DailyHotspotSyncStatus) || "IDLE",
      lastError: this.readMetaString(meta, "lastError") || undefined,
      items: this.readMetaJsonArray(meta, "items")
        .map((item, index) => this.normalizeDailyHotspotItem(item, index + 1, this.readMetaString(meta, "platformKey")))
        .filter((item): item is DailyHotspotItemRecord => Boolean(item))
        .filter((item) => Boolean(item.hot !== undefined || item.timestamp !== undefined || item.url || item.mobileUrl))
        .sort((left, right) => left.rank - right.rank)
        .slice(0, 20),
    };
  }

  private async getFeishuBinding(brandId: string): Promise<FeishuBindingRecord | null> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          brandId,
          category: AssetCategory.BUSINESS_DATA,
          title: FEISHU_BINDING_TITLE,
        },
        orderBy: { updatedAt: "desc" },
      });
      if (!asset) {
        return null;
      }

      const meta = this.asMeta(asset.metadataJson);
      return {
        id: asset.id,
        wikiUrl: asset.fileUrl ?? this.readMetaString(meta, "wikiUrl"),
        wikiToken: this.readMetaString(meta, "wikiToken"),
        host: this.readMetaString(meta, "host"),
        tableId: this.readMetaString(meta, "tableId"),
        viewId: this.readMetaString(meta, "viewId"),
        baseToken: this.readMetaString(meta, "baseToken"),
        templateUrl: this.readMetaString(meta, "templateUrl"),
        syncStatus: (this.readMetaString(meta, "syncStatus") as CollectorSyncStatus) || "IDLE",
        lastError: this.readMetaString(meta, "lastError"),
        lastBoundAt: this.readMetaString(meta, "lastBoundAt"),
        lastSyncAt: this.readMetaString(meta, "lastSyncAt"),
      };
    }

    const asset = database.assets.find((item) => item.brandId === brandId && item.title === FEISHU_BINDING_TITLE);
    if (!asset) {
      return null;
    }

    const meta = this.asMeta(asset.metadataJson);
    return {
      id: asset.id,
      wikiUrl: asset.fileUrl ?? this.readMetaString(meta, "wikiUrl"),
      wikiToken: this.readMetaString(meta, "wikiToken"),
      host: this.readMetaString(meta, "host"),
      tableId: this.readMetaString(meta, "tableId"),
      viewId: this.readMetaString(meta, "viewId"),
      baseToken: this.readMetaString(meta, "baseToken"),
      templateUrl: this.readMetaString(meta, "templateUrl"),
      syncStatus: (this.readMetaString(meta, "syncStatus") as CollectorSyncStatus) || "IDLE",
      lastError: this.readMetaString(meta, "lastError"),
      lastBoundAt: this.readMetaString(meta, "lastBoundAt"),
      lastSyncAt: this.readMetaString(meta, "lastSyncAt"),
    };
  }

  private async updateFeishuBindingState(
    brandId: string,
    patch: Partial<Pick<FeishuBindingRecord, "baseToken" | "syncStatus" | "lastError" | "lastSyncAt">>,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          brandId,
          category: AssetCategory.BUSINESS_DATA,
          title: FEISHU_BINDING_TITLE,
        },
      });
      if (!asset) {
        return;
      }

      const meta = {
        ...this.asMeta(asset.metadataJson),
        ...(patch.baseToken === undefined ? {} : { baseToken: patch.baseToken }),
        ...(patch.syncStatus === undefined ? {} : { syncStatus: patch.syncStatus }),
        ...(patch.lastError === undefined ? {} : { lastError: patch.lastError }),
        ...(patch.lastSyncAt === undefined ? {} : { lastSyncAt: patch.lastSyncAt }),
      };

      await this.prismaService.businessAsset.update({
        where: { id: asset.id },
        data: {
          metadataJson: meta as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const index = database.assets.findIndex((item) => item.brandId === brandId && item.title === FEISHU_BINDING_TITLE);
    if (index < 0) {
      return;
    }
    database.assets[index] = {
      ...database.assets[index],
      metadataJson: {
        ...this.asMeta(database.assets[index].metadataJson),
        ...(patch.baseToken === undefined ? {} : { baseToken: patch.baseToken }),
        ...(patch.syncStatus === undefined ? {} : { syncStatus: patch.syncStatus }),
        ...(patch.lastError === undefined ? {} : { lastError: patch.lastError }),
        ...(patch.lastSyncAt === undefined ? {} : { lastSyncAt: patch.lastSyncAt }),
      },
    };
  }

  private async resolveFeishuBaseToken(binding: FeishuBindingRecord, userAccessToken: string) {
    if (binding.baseToken) {
      return binding.baseToken;
    }

    const tokenFromWikiNode = await this.tryResolveBaseTokenFromWikiNode(binding, userAccessToken);
    if (tokenFromWikiNode) {
      return tokenFromWikiNode;
    }

    const tokenFromWikiPage = await this.tryResolveBaseTokenFromWikiPage(binding.wikiUrl);
    if (tokenFromWikiPage) {
      return tokenFromWikiPage;
    }

    throw new ServiceUnavailableException("当前链接尚未解析出 Base Token，请优先绑定飞书多维表格 base 链接，或确认当前授权用户对该飞书副本仍有访问权限。");
  }

  private async listFeishuTables(baseToken: string, userAccessToken: string): Promise<FeishuTableRecord[]> {
    const items = await this.fetchFeishuApiItems(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables?page_size=100`,
      userAccessToken,
    );
    return items
      .map((item) => ({
        tableId: this.readMetaString(item, "table_id") || this.readMetaString(item, "tableId") || this.readMetaString(item, "id"),
        tableName: this.readMetaString(item, "table_name") || this.readMetaString(item, "tableName") || this.readMetaString(item, "name"),
      }))
      .filter((item) => item.tableId && item.tableName);
  }

  private async matchFeishuTables(
    baseToken: string,
    userAccessToken: string,
    tables: FeishuTableRecord[],
    binding: FeishuBindingRecord,
  ) {
    const matchedByName = {
      brandAccounts: this.findFeishuTableByKeywords(tables, FEISHU_TABLE_MATCHERS.brandAccounts),
      competitorAccounts: this.findFeishuTableByKeywords(tables, FEISHU_TABLE_MATCHERS.competitorAccounts),
      brandNotes: this.findFeishuTableByKeywords(tables, FEISHU_TABLE_MATCHERS.brandNotes),
      benchmarkNotes: this.findFeishuTableByKeywords(tables, FEISHU_TABLE_MATCHERS.benchmarkNotes),
      targetUsers: this.findFeishuTableByKeywords(tables, FEISHU_TABLE_MATCHERS.targetUsers),
    };

    if (Object.values(matchedByName).some(Boolean)) {
      return matchedByName;
    }

    return this.classifyFeishuTablesByContent(baseToken, userAccessToken, tables, binding);
  }

  private findFeishuTableByKeywords(tables: FeishuTableRecord[], keywords: readonly string[]) {
    const normalizedKeywords = keywords.map((item) => this.normalizeFieldKey(item));
    return (
      tables.find((item) => normalizedKeywords.includes(this.normalizeFieldKey(item.tableName)))
      ?? tables.find((item) => normalizedKeywords.some((keyword) => this.normalizeFieldKey(item.tableName).includes(keyword)))
      ?? null
    );
  }

  private async classifyFeishuTablesByContent(
    baseToken: string,
    userAccessToken: string,
    tables: FeishuTableRecord[],
    binding: FeishuBindingRecord,
  ) {
    const previews = await Promise.all(
      tables.map(async (table) => {
        const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
        return {
          table,
          rows,
          accountScore: this.scoreFeishuAccountTable(rows),
          noteScore: this.scoreFeishuNoteTable(rows),
          targetUserScore: this.scoreFeishuTargetUserTable(rows),
        };
      }),
    );

    const byTableId = new Map(previews.map((item) => [item.table.tableId, item]));
    const brandAccounts = (binding.tableId ? byTableId.get(binding.tableId)?.table : undefined) ?? null;
    const remaining = previews.filter((item) => item.table.tableId !== brandAccounts?.tableId);
    const accountTables = remaining.filter((item) => item.accountScore > 0).sort((a, b) => b.accountScore - a.accountScore);
    const noteTables = remaining.filter((item) => item.noteScore > 0).sort((a, b) => b.rows.length - a.rows.length);
    const targetUserTables = remaining
      .filter((item) => item.targetUserScore > 0)
      .sort((a, b) => b.targetUserScore - a.targetUserScore);

    return {
      brandAccounts,
      competitorAccounts: accountTables[0]?.table ?? null,
      brandNotes: noteTables[0]?.table ?? null,
      benchmarkNotes: noteTables[1]?.table ?? null,
      targetUsers: targetUserTables[0]?.table ?? null,
    };
  }

  private scoreFeishuAccountTable(rows: FeishuRowRecord[]) {
    if (!rows.length) {
      return 0;
    }

    let score = 0;
    for (const row of rows.slice(0, 10)) {
      const values = Object.values(row.fields).flatMap((item) => this.flattenFeishuValue(item));
      if (values.some((item) => item.includes("xiaohongshu.com/user/profile"))) {
        score += 5;
      }
      if (values.some((item) => /粉丝|关注|获赞|点赞/.test(item))) {
        score += 2;
      }
    }
    return score;
  }

  private scoreFeishuNoteTable(rows: FeishuRowRecord[]) {
    if (!rows.length) {
      return 0;
    }

    let score = 0;
    for (const row of rows.slice(0, 10)) {
      const values = Object.values(row.fields).flatMap((item) => this.flattenFeishuValue(item));
      if (values.some((item) => item.includes("xiaohongshu.com/explore") || item.includes("xiaohongshu.com/discovery/item"))) {
        score += 5;
      }
      if (values.some((item) => /点赞|评论|收藏|正文|标题/.test(item))) {
        score += 2;
      }
    }
    return score;
  }

  private scoreFeishuTargetUserTable(rows: FeishuRowRecord[]) {
    if (!rows.length) {
      return 0;
    }

    let score = 0;
    for (const row of rows.slice(0, 10)) {
      const values = Object.values(row.fields).flatMap((item) => this.flattenFeishuValue(item));
      if (values.some((item) => item.includes("线索") || item.includes("目标用户"))) {
        score += 4;
      }
      if (values.some((item) => item.includes("xiaohongshu.com/user/profile"))) {
        score += 2;
      }
    }
    return score;
  }

  private async listFeishuRecords(
    baseToken: string,
    userAccessToken: string,
    table: FeishuTableRecord,
    viewId?: string,
  ): Promise<FeishuRowRecord[]> {
    const rows: FeishuRowRecord[] = [];
    let pageToken = "";
    let hasMore = true;

    while (hasMore && rows.length < 500) {
      const url = new URL(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${encodeURIComponent(baseToken)}/tables/${encodeURIComponent(table.tableId)}/records`,
      );
      url.searchParams.set("page_size", "100");
      if (pageToken) {
        url.searchParams.set("page_token", pageToken);
      }
      if (viewId) {
        url.searchParams.set("view_id", viewId);
      }

      const payload = await this.fetchFeishuApi(url.toString(), userAccessToken);
      const dataMeta = this.asMeta(this.asMeta(payload).data);
      const items = this.extractItems(dataMeta.items);

      rows.push(
        ...items.map((item, index) => ({
          recordId:
            this.readMetaString(item, "record_id")
            || this.readMetaString(item, "recordId")
            || `${table.tableId}-${rows.length + index + 1}`,
          fields: this.asMeta(this.asMeta(item).fields),
        })),
      );

      hasMore = Boolean(dataMeta.has_more);
      pageToken = this.readMetaString(dataMeta, "page_token");
      if (!items.length) {
        break;
      }
    }

    return rows;
  }

  private mapFeishuTabularRow(row: unknown, fieldNames: string[], fieldIds: string[]) {
    if (!Array.isArray(row)) {
      return {};
    }

    return row.reduce<Record<string, unknown>>((accumulator, cell, index) => {
      const key = fieldNames[index] || fieldIds[index] || `field_${index + 1}`;
      accumulator[key] = cell;
      return accumulator;
    }, {});
  }

  private async getFeishuUserAccessTokenForBrand(brandId: string, forceRefresh = false): Promise<string> {
    const ownerUserId = await this.getBrandOwnerUserId(brandId);
    const canUseDatabase = await this.prismaService.canUseDatabase();
    const integration = canUseDatabase
      ? await this.prismaService.userFeishuIntegration.findUnique({
          where: { userId: ownerUserId },
          select: {
            appId: true,
            appSecret: true,
            redirectUri: true,
            accessToken: true,
            refreshToken: true,
            scope: true,
            providerUserOpenId: true,
            providerUserName: true,
            providerUserAvatar: true,
            expiresAt: true,
            refreshExpiresAt: true,
          },
        })
      : getFeishuUserIntegration(ownerUserId);
    if (canUseDatabase && !integration?.accessToken) {
      const fallbackIntegration = getFeishuUserIntegration(ownerUserId);
      if (fallbackIntegration?.accessToken && fallbackIntegration.refreshToken) {
        const fallbackConfig = getFeishuUserAppConfig(ownerUserId);
        await this.prismaService.userFeishuIntegration.upsert({
          where: { userId: ownerUserId },
          create: {
            userId: ownerUserId,
            appId: fallbackConfig?.appId || "",
            appSecret: fallbackConfig?.appSecret || "",
            redirectUri: fallbackConfig?.redirectUri || this.getDefaultFeishuRedirectUri(),
            scope: fallbackIntegration.scope || fallbackConfig?.scope || "",
            providerUserOpenId: fallbackIntegration.providerUserOpenId,
            providerUserName: fallbackIntegration.providerUserName,
            providerUserAvatar: fallbackIntegration.providerUserAvatar,
            accessToken: fallbackIntegration.accessToken,
            refreshToken: fallbackIntegration.refreshToken,
            expiresAt: fallbackIntegration.expiresAt ? new Date(fallbackIntegration.expiresAt) : null,
            refreshExpiresAt: fallbackIntegration.refreshExpiresAt ? new Date(fallbackIntegration.refreshExpiresAt) : null,
          },
          update: {
            providerUserOpenId: fallbackIntegration.providerUserOpenId,
            providerUserName: fallbackIntegration.providerUserName,
            providerUserAvatar: fallbackIntegration.providerUserAvatar,
            accessToken: fallbackIntegration.accessToken,
            refreshToken: fallbackIntegration.refreshToken,
            scope: fallbackIntegration.scope || fallbackConfig?.scope || "",
            expiresAt: fallbackIntegration.expiresAt ? new Date(fallbackIntegration.expiresAt) : null,
            refreshExpiresAt: fallbackIntegration.refreshExpiresAt ? new Date(fallbackIntegration.refreshExpiresAt) : null,
            appId: fallbackConfig?.appId || "",
            appSecret: fallbackConfig?.appSecret || "",
            redirectUri: fallbackConfig?.redirectUri || this.getDefaultFeishuRedirectUri(),
          },
        });
        return this.getFeishuUserAccessTokenForBrand(brandId, forceRefresh);
      }
    }
    if (!integration?.accessToken) {
      throw new ServiceUnavailableException("当前品牌所属用户尚未连接飞书账号，请先使用该用户完成飞书授权。");
    }

    const expiresAtMs = "expiresAt" in integration && integration.expiresAt
      ? new Date(integration.expiresAt).getTime()
      : 0;
    const shouldRefresh = forceRefresh || !expiresAtMs || expiresAtMs <= Date.now() + 60 * 1000;
    if (shouldRefresh && integration.refreshToken && "appId" in integration && integration.appId && "appSecret" in integration && integration.appSecret) {
      return this.refreshFeishuUserAccessToken(ownerUserId);
    }

    return integration.accessToken;
  }

  private async refreshFeishuUserAccessToken(userId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const row = await this.prismaService.userFeishuIntegration.findUnique({
        where: { userId },
      });
      if (!row?.refreshToken || !row.appId || !row.appSecret) {
        throw new ServiceUnavailableException("飞书授权已失效，请重新连接飞书。");
      }

      const tokenResponse = await fetch("https://open.feishu.cn/open-apis/authen/v2/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: row.refreshToken,
          client_id: row.appId,
          client_secret: row.appSecret,
        }),
      });
      const tokenPayload = await this.readJsonLikeResponse(tokenResponse);
      const tokenData = Object.keys(this.asMeta(tokenPayload.data)).length ? this.asMeta(tokenPayload.data) : tokenPayload;
      const accessToken = this.readMetaString(tokenData, "access_token");
      const refreshToken = this.readMetaString(tokenData, "refresh_token") || row.refreshToken;
      const scope = this.readMetaString(tokenData, "scope") || row.scope;
      const tokenCode = this.readMetaNumber(tokenPayload, "code");
      if (!tokenResponse.ok || tokenCode !== 0 || !accessToken) {
        const message = this.readMetaString(tokenPayload, "msg") || this.readMetaString(tokenPayload, "message") || "飞书 token 刷新失败";
        throw new ServiceUnavailableException(`${message}，请重新连接飞书。`);
      }

      const expiresIn = this.readMetaNumber(tokenData, "expires_in") ?? 0;
      const refreshExpiresIn = this.readMetaNumber(tokenData, "refresh_expires_in") ?? 0;
      await this.prismaService.userFeishuIntegration.update({
        where: { userId },
        data: {
          accessToken,
          refreshToken,
          scope,
          expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : row.expiresAt,
          refreshExpiresAt: refreshExpiresIn > 0 ? new Date(Date.now() + refreshExpiresIn * 1000) : row.refreshExpiresAt,
        },
      });
      return accessToken;
    }

    const integration = getFeishuUserIntegration(userId);
    const config = getFeishuUserAppConfig(userId);
    if (!integration?.refreshToken || !config?.appId || !config?.appSecret) {
      throw new ServiceUnavailableException("飞书授权已失效，请重新连接飞书。");
    }

    const tokenResponse = await fetch("https://open.feishu.cn/open-apis/authen/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: integration.refreshToken,
        client_id: config.appId,
        client_secret: config.appSecret,
      }),
    });
    const tokenPayload = await this.readJsonLikeResponse(tokenResponse);
    const tokenData = Object.keys(this.asMeta(tokenPayload.data)).length ? this.asMeta(tokenPayload.data) : tokenPayload;
    const accessToken = this.readMetaString(tokenData, "access_token");
    const refreshToken = this.readMetaString(tokenData, "refresh_token") || integration.refreshToken;
    const scope = this.readMetaString(tokenData, "scope") || integration.scope;
    const tokenCode = this.readMetaNumber(tokenPayload, "code");
    if (!tokenResponse.ok || tokenCode !== 0 || !accessToken) {
      const message = this.readMetaString(tokenPayload, "msg") || this.readMetaString(tokenPayload, "message") || "飞书 token 刷新失败";
      throw new ServiceUnavailableException(`${message}，请重新连接飞书。`);
    }

    const expiresIn = this.readMetaNumber(tokenData, "expires_in") ?? 0;
    const refreshExpiresIn = this.readMetaNumber(tokenData, "refresh_expires_in") ?? 0;
    setFeishuUserIntegration({
      ...integration,
      accessToken,
      refreshToken,
      scope,
      expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : integration.expiresAt,
      refreshExpiresAt: refreshExpiresIn > 0 ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString() : integration.refreshExpiresAt,
      updatedAt: new Date().toISOString(),
    });
    return accessToken;
  }

  private async getBrandOwnerUserId(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { ownerUserId: true },
      });
      if (!brand?.ownerUserId) {
        throw new NotFoundException("品牌不存在");
      }
      return brand.ownerUserId;
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand?.ownerUserId) {
      throw new NotFoundException("品牌不存在");
    }
    return brand.ownerUserId;
  }

  private async fetchFeishuApiItems(url: string, userAccessToken: string) {
    const payload = await this.fetchFeishuApi(url, userAccessToken);
    const dataMeta = this.asMeta(this.asMeta(payload).data);
    return this.extractItems(dataMeta.items).length ? this.extractItems(dataMeta.items) : this.extractItems(dataMeta.tables);
  }

  private getDefaultFeishuRedirectUri() {
    const configured = process.env.FEISHU_OAUTH_REDIRECT_URI?.trim();
    if (configured) {
      return configured;
    }
    const webBaseUrl = this.getDefaultWebBaseUrl();
    return `${webBaseUrl}/api/auth/feishu/oauth/callback`;
  }

  private getDefaultWebBaseUrl() {
    const candidates = [
      process.env.WEB_BASE_URL,
      process.env.WEB_PUBLIC_BASE_URL,
      process.env.NEXT_PUBLIC_WEB_BASE_URL,
    ];
    for (const candidate of candidates) {
      const normalized = this.normalizeWebBaseUrl(candidate);
      if (normalized) {
        return normalized;
      }
    }
    return "https://17ai.site";
  }

  private normalizeWebBaseUrl(value?: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      return "";
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
      return process.env.NODE_ENV === "development" ? trimmed : "https://17ai.site";
    }
    return trimmed.replace(/\/$/, "");
  }

  private async fetchFeishuApi(url: string, userAccessToken: string) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });
    const payload = await this.readJsonLikeResponse(response);
    const meta = this.asMeta(payload);
    const code = this.readMetaNumber(meta, "code");
    if (!response.ok || code !== 0) {
      const message = this.readMetaString(meta, "msg")
        || this.readMetaString(meta, "message")
        || this.readMetaString(meta, "_rawText")
        || "飞书开放平台请求失败";
      throw new ServiceUnavailableException(this.normalizeUpstreamHtmlError(message, "飞书开放平台请求失败"));
    }
    return payload;
  }

  private async readJsonLikeResponse(response: Response) {
    const text = await response.text();
    if (!text.trim()) {
      return {} as Record<string, unknown>;
    }

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { _rawText: text } as Record<string, unknown>;
    }
  }

  private normalizeUpstreamHtmlError(message: string, fallback: string) {
    const trimmed = message.trim();
    if (!trimmed) {
      return fallback;
    }
    if (/<html[\s>]/i.test(trimmed) || /<body[\s>]/i.test(trimmed) || /502 Bad Gateway/i.test(trimmed)) {
      return `${fallback}：上游服务暂时不可用（502 Bad Gateway），请稍后重试`;
    }
    return trimmed;
  }

  private async syncFeishuAccountTable(
    brandId: string,
    baseToken: string,
    table: FeishuTableRecord,
    kind: CollectorAccountKind,
  ) {
    const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
    let syncedCount = 0;

    for (const row of rows) {
      const accountName = this.readFeishuFieldString(row.fields, ["账号名称", "账号名", "昵称", "品牌名称", "竞品名称", "名称", "显示名", "小红书号", "鏄电О", "灏忕孩涔﹀彿"]);
      const sourceAccountLink = this.readFeishuFieldUrl(
        row.fields,
        ["主页链接", "账号链接", "链接", "小红书主页链接", "品牌主页链接", "竞品主页链接", "灏忕孩涔︿富椤甸摼鎺"],
      );
      if (!accountName && !sourceAccountLink) {
        continue;
      }

      await this.upsertCollectorAsset({
        brandId,
        kind,
        matchValue: `feishu:${row.recordId}`,
        title: accountName || `飞书同步账号 ${row.recordId}`,
        description: this.readFeishuFieldString(row.fields, ["简介", "描述"]),
        fileUrl: sourceAccountLink || undefined,
        metadata: {
          kind,
          sourceAccountId: `feishu:${row.recordId}`,
          sourceAccountLink,
          externalUserId: this.readFeishuFieldString(row.fields, ["外部用户ID", "用户ID", "user_id", "userid", "小红书号", "灏忕孩涔﹀彿"]),
          postedCount: this.readFeishuFieldNumber(row.fields, ["作品数", "笔记数", "发布数", "作品数量"]),
          likedCount: this.readFeishuFieldNumber(row.fields, ["获赞数", "总点赞", "点赞数", "获赞", "鑾疯禐鏁"]),
          collectedCount: this.readFeishuFieldNumber(row.fields, ["收藏数", "总收藏", "收藏"]),
          avatar: this.readFeishuFieldUrl(row.fields, ["头像", "头像链接", "澶村儚"]) || this.readFeishuFieldString(row.fields, ["头像", "头像链接", "澶村儚"]),
          description: this.readFeishuFieldString(row.fields, ["简介", "描述", "个人简介", "涓汉绠€浠"]),
          ipLocation: this.readFeishuFieldString(row.fields, ["IP属地", "地区", "IP灞炲湴"]),
          followCount: this.readFeishuFieldNumber(row.fields, ["关注数", "鍏虫敞鏁"]),
          fanCount: this.readFeishuFieldNumber(row.fields, ["粉丝数", "绮変笣鏁"]),
          collectedAt: new Date().toISOString(),
          sourceTableId: table.tableId,
          sourceRecordId: row.recordId,
          rawFields: row.fields,
        },
      });
      syncedCount += 1;
    }

    return syncedCount;
  }

  private async syncFeishuBrandNotesTable(brandId: string, baseToken: string, table: FeishuTableRecord) {
    const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
    let syncedCount = 0;

    for (const row of rows) {
      const noteUrl = this.readFeishuFieldUrl(row.fields, ["笔记链接", "作品链接", "作品地址", "链接", "浣滃搧閾炬帴"]);
      const noteId = this.readFeishuFieldString(row.fields, ["笔记ID", "作品ID", "note_id"]) || this.extractNoteIdFromUrl(noteUrl) || row.recordId;
      const title = this.readFeishuFieldString(row.fields, ["标题", "作品标题", "笔记标题", "内容标题", "文案标题", "作品名称", "名称", "原文标题"])
        || this.findLikelyTitleInFields(row.fields)
        || this.readFeishuMediaNames(row.fields)[0]
        || "";
      if (!noteId && !title) {
        continue;
      }

      await this.upsertCollectorAsset({
        brandId,
        kind: "XHS_BRAND_NOTE",
        matchValue: noteId,
        title: title || `飞书同步品牌作品 ${row.recordId}`,
        description: this.readFeishuFieldString(row.fields, ["正文", "正文内容", "内容", "内容详情", "描述", "文案", "文案内容", "作品内容", "笔记内容", "笔记正文", "作品正文", "原文", "原文内容", "笔记文案"]),
        fileUrl: noteUrl || undefined,
        metadata: {
          kind: "XHS_BRAND_NOTE",
          sourceAccountId: this.readFeishuFieldString(row.fields, ["来源账号ID", "来源账号", "账号ID", "账号", "账号标识", "作者ID"]) || `feishu:${table.tableId}:${row.recordId}`,
          noteId,
          noteUrl,
          noteType: this.readFeishuFieldString(row.fields, ["类型", "笔记类型", "作品类型", "内容类型", "作品形式", "笔记形式", "内容形式", "图文/视频", "图文视频"]),
          nickname: this.readFeishuFieldString(row.fields, ["作者昵称", "博主昵称", "作者名称", "作者", "昵称", "账号昵称", "达人昵称", "博主", "博主名称", "创作者", "创作者昵称"]),
          imageList: this.readFeishuFieldImageUrls(row.fields, ["图片", "图片列表", "图片链接", "封面图", "图集", "附件", "作品图片", "作品封面", "配图", "封面"])
            .concat(this.readFeishuImageUrls(row.fields)),
          externalUserId: this.readFeishuFieldString(row.fields, ["作者ID", "用户ID", "用户 ID", "外部用户ID", "外部用户 ID", "小红书号", "博主ID", "创作者ID", "主页ID"]),
          likeCount: this.readFeishuFieldNumber(row.fields, ["点赞数", "点赞"]),
          collectCount: this.readFeishuFieldNumber(row.fields, ["收藏数", "收藏"]),
          createdAtText: this.readFeishuFieldString(row.fields, ["发布时间", "发布日期", "创建时间", "创建日期", "发布时间文本", "采集时间", "采集日期"]),
          shareCount: this.readFeishuFieldNumber(row.fields, ["分享数", "分享"]),
          commentCount: this.readFeishuFieldNumber(row.fields, ["评论数", "评论"]),
          videoUrl: this.readFeishuFieldVideoUrl(row.fields, ["视频链接", "视频地址", "下载链接", "视频附件", "附件", "视频"]) || this.readFeishuVideoUrl(row.fields),
          collectedAt: new Date().toISOString(),
          sourceTableId: table.tableId,
          sourceRecordId: row.recordId,
          rawFields: row.fields,
        },
      });
      syncedCount += 1;
    }

    return syncedCount;
  }

  private async syncFeishuBenchmarkNotesTable(brandId: string, baseToken: string, table: FeishuTableRecord) {
    const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
    let syncedCount = 0;

    for (const row of rows) {
      const sourceUrl = this.findFirstUrlInFields(row.fields, ["xiaohongshu.com/explore", "xiaohongshu.com/discovery/item"])
        || this.readFeishuFieldString(row.fields, ["来源链接", "笔记链接", "作品链接", "作品地址", "链接", "浣滃搧閾炬帴"]);
      const noteId = this.readFeishuFieldString(row.fields, ["笔记ID", "作品ID", "note_id"]) || this.extractNoteIdFromUrl(sourceUrl) || row.recordId;
      const title = this.readFeishuFieldString(row.fields, ["标题", "作品标题", "笔记标题", "内容标题", "文案标题", "作品名称", "名称", "原文标题"])
        || this.findLikelyTitleInFields(row.fields);
      if (!sourceUrl && !title) {
        continue;
      }

      await this.upsertCollectorAsset({
        brandId,
        kind: "XHS_BENCHMARK_NOTE",
        matchValue: sourceUrl || noteId,
        title: title || `飞书同步对标作品 ${row.recordId}`,
        description: this.readFeishuFieldString(row.fields, ["正文", "正文内容", "内容", "内容详情", "描述", "文案", "文案内容", "作品内容", "笔记内容", "笔记正文", "作品正文", "原文", "原文内容", "笔记文案"]),
        fileUrl: sourceUrl || undefined,
        metadata: {
          kind: "XHS_BENCHMARK_NOTE",
          sourceUrl,
          noteId,
          noteUrl: sourceUrl,
          noteType: this.readFeishuFieldString(row.fields, ["类型", "笔记类型", "作品类型", "内容类型", "作品形式", "笔记形式", "内容形式", "图文/视频", "图文视频"]),
          nickname: this.readFeishuFieldString(row.fields, ["作者昵称", "博主昵称", "作者名称", "昵称", "作者", "账号昵称", "达人昵称", "博主", "博主名称", "创作者", "创作者昵称"]),
          imageList: this.readFeishuFieldImageUrls(row.fields, ["图片", "图片列表", "图片链接", "封面图", "图集", "附件", "作品图片", "作品封面", "配图", "封面"])
            .concat(this.readFeishuImageUrls(row.fields)),
          likeCount: this.readFeishuFieldNumber(row.fields, ["点赞数", "点赞"]),
          collectCount: this.readFeishuFieldNumber(row.fields, ["收藏数", "收藏"]),
          shareCount: this.readFeishuFieldNumber(row.fields, ["分享数", "分享"]),
          commentCount: this.readFeishuFieldNumber(row.fields, ["评论数", "评论"]),
          likeCollectRatio: this.readFeishuFieldNumber(row.fields, ["赞藏率", "点赞收藏比", "璧炶棌鐜"]),
          likeCommentRatio: this.readFeishuFieldNumber(row.fields, ["赞评率", "点赞评论比", "璧炶瘎鐜"]),
          shareRatio: this.readFeishuFieldNumber(row.fields, ["分享率", "赞享率", "赞分享率", "点赞分享比", "璧炰韩鐜"]),
          isExplosive: this.readFeishuFieldString(row.fields, ["是否爆款", "是否为爆款", "爆款判断", "爆款", "是否爆文", "鏄惁鐖嗘"]),
          followUpDecision: this.readFeishuFieldString(row.fields, ["是否追投", "是否选用", "是否继续投放", "是否追加投放", "是否跟进", "是否跟投", "是否参考", "后续动作", "鏄惁杩芥姇"]),
          videoUrl: this.readFeishuFieldVideoUrl(row.fields, ["视频链接", "视频地址", "下载链接", "视频附件", "附件", "视频"]) || this.readFeishuVideoUrl(row.fields),
          syncStatus: this.normalizeCollectorStatus(this.readFeishuFieldString(row.fields, ["状态", "同步状态"])) || "SUCCESS",
          retryCount: this.readFeishuFieldNumber(row.fields, ["重试次数"]),
          nextRetryAt: this.readFeishuFieldString(row.fields, ["下次重试时间"]),
          lastError: this.readFeishuFieldString(row.fields, ["错误原因", "失败原因"]),
          collectedAt: new Date().toISOString(),
          sourceTableId: table.tableId,
          sourceRecordId: row.recordId,
          rawFields: row.fields,
        },
      });
      syncedCount += 1;
    }

    return syncedCount;
  }

  private async syncFeishuTargetUsersTable(brandId: string, baseToken: string, table: FeishuTableRecord) {
    const userAccessToken = await this.getFeishuUserAccessTokenForBrand(brandId);
    const rows = await this.listFeishuRecords(baseToken, userAccessToken, table);
    let syncedCount = 0;

    for (const row of rows) {
      const nickname = this.readFeishuFieldString(row.fields, ["昵称", "用户昵称", "用户名"]);
      const sourceUrl = this.readFeishuFieldUrl(row.fields, ["来源链接", "笔记链接", "线索链接"]);
      if (!nickname && !sourceUrl) {
        continue;
      }

      await this.upsertTargetAsset({
        brandId,
        matchValue: sourceUrl || `feishu:${row.recordId}`,
        title: nickname || `飞书同步目标用户 ${row.recordId}`,
        description: this.readFeishuFieldString(row.fields, ["备注", "说明"]),
        metadata: {
          kind: "XHS_TARGET_USER",
          sourceUrl,
          profileUrl: this.readFeishuFieldUrl(row.fields, ["主页链接", "用户主页链接"]),
          userId: this.readFeishuFieldString(row.fields, ["用户ID", "外部用户ID"]),
          noteTitle: this.readFeishuFieldString(row.fields, ["来源标题", "笔记标题"]),
          collectedAt: new Date().toISOString(),
          syncStatus: this.normalizeCollectorStatus(this.readFeishuFieldString(row.fields, ["状态", "同步状态"])) || "SUCCESS",
          retryCount: this.readFeishuFieldNumber(row.fields, ["重试次数"]) ?? 0,
          nextRetryAt: this.readFeishuFieldString(row.fields, ["下次重试时间"]),
          lastError: this.readFeishuFieldString(row.fields, ["错误原因", "失败原因"]),
          sourceTableId: table.tableId,
          sourceRecordId: row.recordId,
          rawFields: row.fields,
        },
      });
      syncedCount += 1;
    }

    return syncedCount;
  }

  private normalizeCollectorStatus(value: string): CollectorSyncStatus | undefined {
    const normalized = value.trim().toUpperCase();
    if (normalized === "IDLE" || normalized === "RUNNING" || normalized === "SUCCESS" || normalized === "FAILED") {
      return normalized;
    }
    return undefined;
  }

  private async tryResolveBaseTokenFromWikiNode(binding: FeishuBindingRecord, userAccessToken: string) {
    if (!binding.wikiToken) {
      return "";
    }

    try {
      const url = new URL("https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node");
      url.searchParams.set("token", binding.wikiToken);

      const payload = await this.fetchFeishuApi(url.toString(), userAccessToken);
      const dataMeta = this.asMeta(this.asMeta(payload).data);
      const nodeMeta = this.asMeta(dataMeta.node);
      const objType = this.readMetaString(nodeMeta, "obj_type") || this.readMetaString(nodeMeta, "objType");
      const objToken = this.readMetaString(nodeMeta, "obj_token") || this.readMetaString(nodeMeta, "objToken");

      if (objType === "bitable" && objToken) {
        return objToken;
      }
      return "";
    } catch {
      return "";
    }
  }

  private async tryResolveBaseTokenFromWikiPage(wikiUrl: string) {
    try {
      const response = await fetch(wikiUrl, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0",
        },
      });
      const html = await response.text();
      const bitableMatch = html.match(/space\/api\/bitable\/([A-Za-z0-9]+)\//);
      if (bitableMatch?.[1]) {
        return bitableMatch[1];
      }
      const metaMatch = html.match(/space\/api\/meta\/\?type=8&token=([A-Za-z0-9]+)/);
      if (metaMatch?.[1]) {
        return metaMatch[1];
      }
      return "";
    } catch {
      return "";
    }
  }

  private extractItems(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
  }

  private readFeishuFieldString(fields: Record<string, unknown>, aliases: string[]) {
    const value = this.findFeishuFieldValue(fields, aliases);
    return this.flattenFeishuValue(value)[0] ?? "";
  }

  private readFeishuFieldUrl(fields: Record<string, unknown>, aliases: string[]) {
    const value = this.findFeishuFieldValue(fields, aliases);
    const flattened = this.flattenFeishuValue(value);
    const urls = flattened.flatMap((item) => this.extractUrlsFromText(item));
    return urls[0] ?? flattened.find((item) => /^https?:\/\//i.test(item)) ?? "";
  }

  private readFeishuFieldNumber(fields: Record<string, unknown>, aliases: string[]) {
    const value = this.findFeishuFieldValue(fields, aliases);
    if (typeof value === "number") {
      return value;
    }
    const text = this.flattenFeishuValue(value)[0];
    if (!text) {
      return undefined;
    }
    const parsed = Number(text.replace(/,/g, ""));
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private readFeishuFieldStringArray(fields: Record<string, unknown>, aliases: string[]) {
    return this.flattenFeishuValue(this.findFeishuFieldValue(fields, aliases));
  }

  private readFeishuFieldUrls(fields: Record<string, unknown>, aliases: string[]) {
    return this.extractUrlsFromUnknown(this.findFeishuFieldValue(fields, aliases));
  }

  private readFeishuFieldImageUrls(fields: Record<string, unknown>, aliases: string[]) {
    return this.extractTypedUrlsFromUnknown(this.findFeishuFieldValue(fields, aliases), "image");
  }

  private readFeishuFieldVideoUrl(fields: Record<string, unknown>, aliases: string[]) {
    return this.extractTypedUrlsFromUnknown(this.findFeishuFieldValue(fields, aliases), "video")[0] ?? "";
  }

  private readFeishuMediaUrls(fields: Record<string, unknown>) {
    const urls = Object.values(fields)
      .flatMap((item) => this.extractFeishuMediaEntries(item))
      .map((item) => item.url)
      .filter(Boolean);
    return Array.from(new Set(urls));
  }

  private readFeishuImageUrls(fields: Record<string, unknown>) {
    return Array.from(new Set(
      Object.values(fields)
        .flatMap((item) => this.extractFeishuMediaEntries(item))
        .filter((item) => this.isImageMediaEntry(item))
        .map((item) => item.url)
        .filter(Boolean),
    ));
  }

  private readFeishuMediaNames(fields: Record<string, unknown>) {
    const names = Object.values(fields)
      .flatMap((item) => this.extractFeishuMediaEntries(item))
      .map((item) => item.name)
      .filter(Boolean);
    return Array.from(new Set(names));
  }

  private readFeishuVideoUrl(fields: Record<string, unknown>) {
    return this.extractFeishuMediaEntries(fields)
      .find((item) => this.isVideoMediaEntry(item))?.url ?? "";
  }

  private findFirstUrlInFields(fields: Record<string, unknown>, keywords: string[] = []) {
    const urls = Object.values(fields)
      .flatMap((item) => this.flattenFeishuValue(item))
      .flatMap((item) => this.extractUrlsFromText(item));
    return (
      urls.find((item) => keywords.some((keyword) => item.includes(keyword)))
      || urls[0]
      || ""
    );
  }

  private findLikelyTitleInFields(fields: Record<string, unknown>) {
    const candidates = Object.values(fields)
      .flatMap((item) => this.flattenFeishuValue(item))
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => !/^https?:\/\//i.test(item))
      .filter((item) => !/\.(png|jpe?g|webp|gif|bmp|svg|mp4|mov|avi|mkv|m4v)$/i.test(item))
      .filter((item) => !/^\d{4}-\d{2}-\d{2}/.test(item))
      .filter((item) => !/^\d+(\.\d+)?$/.test(item))
      .filter((item) => item.length >= 4 && item.length <= 60);

    return candidates[0] ?? "";
  }

  private findFeishuFieldValue(fields: Record<string, unknown>, aliases: string[]) {
    const entries = Object.entries(fields);
    const normalizedAliases = aliases.map((item) => this.normalizeFieldKey(item));
    for (const alias of normalizedAliases) {
      const exact = entries.find(([key]) => this.normalizeFieldKey(key) === alias);
      if (exact) {
        return exact[1];
      }
    }
    for (const alias of normalizedAliases) {
      if (alias.length < 4) {
        continue;
      }
      const fuzzy = entries.find(([key]) => {
        const normalizedKey = this.normalizeFieldKey(key);
        if (normalizedKey.length < 4) {
          return false;
        }
        return normalizedKey.includes(alias) || alias.includes(normalizedKey);
      });
      if (fuzzy) {
        return fuzzy[1];
      }
    }
    return undefined;
  }

  private flattenFeishuValue(value: unknown): string[] {
    if (value === undefined || value === null) {
      return [];
    }
    if (typeof value === "string") {
      return value.trim() ? [value.trim()] : [];
    }
    if (typeof value === "number") {
      return [String(value)];
    }
    if (typeof value === "boolean") {
      return [value ? "true" : "false"];
    }
    if (Array.isArray(value)) {
      return Array.from(new Set(value.flatMap((item) => this.flattenFeishuValue(item)).filter(Boolean)));
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const preferredKeys = ["text", "link", "name", "url", "title", "value", "label", "email", "id", "token"];
      const preferredValues = preferredKeys.flatMap((key) => this.flattenFeishuValue(record[key]));
      if (preferredValues.length) {
        return Array.from(new Set(preferredValues));
      }
      return Array.from(new Set(Object.values(record).flatMap((item) => this.flattenFeishuValue(item)).filter(Boolean)));
    }
    return [];
  }

  private extractFeishuMediaEntries(value: unknown): Array<{ url: string; name: string; type: string }> {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractFeishuMediaEntries(item));
    }
    if (typeof value !== "object") {
      return [];
    }
    const record = value as Record<string, unknown>;
    const candidateUrls = [
      record.url,
      record.tmp_url,
      record.tmpUrl,
      record.download_url,
      record.downloadUrl,
      record.preview_url,
      record.previewUrl,
      record.file_url,
      record.fileUrl,
    ].filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item));
    const name = typeof record.name === "string"
      ? record.name
      : typeof record.file_name === "string"
        ? record.file_name
        : typeof record.fileName === "string"
          ? record.fileName
          : "";
    const type = typeof record.type === "string"
      ? record.type
      : typeof record.mime_type === "string"
        ? record.mime_type
        : typeof record.mimeType === "string"
          ? record.mimeType
          : typeof record.content_type === "string"
            ? record.content_type
            : typeof record.contentType === "string"
              ? record.contentType
              : "";
    const current = candidateUrls.map((url) => ({ url, name, type }));
    return current.concat(Object.values(record).flatMap((item) => this.extractFeishuMediaEntries(item)));
  }

  private extractUrlsFromUnknown(value: unknown) {
    const mediaUrls = this.extractFeishuMediaEntries(value).map((item) => item.url);
    const textUrls = this.flattenFeishuValue(value).flatMap((item) => this.extractUrlsFromText(item));
    return Array.from(new Set([...mediaUrls, ...textUrls].filter(Boolean)));
  }

  private extractTypedUrlsFromUnknown(value: unknown, mediaType: "image" | "video") {
    const mediaUrls = this.extractFeishuMediaEntries(value)
      .filter((item) => (mediaType === "image" ? this.isImageMediaEntry(item) : this.isVideoMediaEntry(item)))
      .map((item) => item.url);
    const textUrls = this.flattenFeishuValue(value)
      .flatMap((item) => this.extractUrlsFromText(item))
      .filter((item) => (mediaType === "image" ? this.isLikelyImageUrl(item) : this.isLikelyVideoUrl(item)));
    return Array.from(new Set([...mediaUrls, ...textUrls].filter(Boolean)));
  }

  private isVideoMediaEntry(item: { url: string; name: string; type: string }) {
    const type = item.type.toLowerCase();
    const target = `${item.name} ${item.url}`.toLowerCase();
    return type.startsWith("video/") || /\.(mp4|mov|m4v|avi|mkv|webm)(\?|$)/i.test(target);
  }

  private isImageMediaEntry(item: { url: string; name: string; type: string }) {
    const type = item.type.toLowerCase();
    const target = `${item.name} ${item.url}`.toLowerCase();
    return type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(target);
  }

  private isLikelyImageUrl(url: string) {
    return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url);
  }

  private isLikelyVideoUrl(url: string) {
    return /\.(mp4|mov|m4v|avi|mkv|webm)(\?|$)/i.test(url);
  }

  private extractUrlsFromText(value: string) {
    const matches = value.match(/https?:\/\/[^\s)\]]+/gi);
    return matches ? Array.from(new Set(matches)) : [];
  }

  private extractFileNameFromDisposition(disposition: string) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        return utf8Match[1];
      }
    }
    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
    return plainMatch?.[1] ?? "";
  }

  private extractFileNameFromMediaUrl(sourceUrl: string) {
    try {
      const url = new URL(sourceUrl);
      const tokenMatch = url.pathname.match(/\/medias\/([^/]+)\/download/i);
      return tokenMatch?.[1] ?? "";
    } catch {
      return "";
    }
  }

  private normalizeFieldKey(value: string) {
    return value.replace(/\s+/g, "").replace(/[_-]/g, "").toLowerCase();
  }

  private async runLarkCliJson(args: string[]) {
    try {
      const cliHome = this.resolveLarkCliHomeDir();
      const env = {
        ...process.env,
        HOME: cliHome,
        USERPROFILE: cliHome,
      };
      const result = process.platform === "win32"
        ? await execFileAsync(
            "powershell.exe",
            ["-NoProfile", "-Command", `& '${this.resolveLarkCliCommand()}' ${args.map((item) => this.escapePowerShellArg(item)).join(" ")}`],
            {
              encoding: "buffer",
              env,
              maxBuffer: 8 * 1024 * 1024,
            },
          )
        : await execFileAsync(this.resolveLarkCliCommand(), args, {
            encoding: "buffer",
            env,
            maxBuffer: 8 * 1024 * 1024,
          });
      const text = this.decodeCliOutput(result.stdout);
      return text ? (JSON.parse(text) as unknown) : {};
    } catch (error) {
      const stdout = this.decodeUnknownCliStream(
        typeof error === "object" && error && "stdout" in error ? (error as { stdout?: unknown }).stdout : undefined,
      );
      const stderr = this.decodeUnknownCliStream(
        typeof error === "object" && error && "stderr" in error ? (error as { stderr?: unknown }).stderr : undefined,
      );
      const message = stderr.trim() || stdout.trim() || (error instanceof Error ? error.message : "lark-cli 执行失败");
      throw new ServiceUnavailableException(message);
    }
  }

  private decodeCliOutput(stdout: Buffer | string | null | undefined) {
    if (!stdout) {
      return "";
    }
    if (typeof stdout === "string") {
      return stdout.trim();
    }
    const utf8Text = stdout.toString("utf8").trim();

    if (process.platform === "win32") {
      if (!utf8Text.includes("�")) {
        return utf8Text;
      }
      try {
        const gbText = new TextDecoder("gb18030").decode(stdout).trim();
        return gbText || utf8Text;
      } catch {
        return utf8Text;
      }
    }

    return utf8Text;
  }

  private decodeUnknownCliStream(value: unknown) {
    if (!value) {
      return "";
    }
    if (Buffer.isBuffer(value) || typeof value === "string") {
      return this.decodeCliOutput(value);
    }
    return String(value);
  }

  private escapePowerShellArg(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
  }

  private resolveLarkCliCommand() {
    if (process.platform === "win32") {
      const appData = process.env.APPDATA || process.env.USERPROFILE;
      if (appData) {
        const baseDir = appData.endsWith("\\Roaming") ? `${appData}\\npm` : `${appData}\\Roaming\\npm`;
        return `${baseDir}\\lark-cli.cmd`;
      }
      return "lark-cli.cmd";
    }

    return "lark-cli";
  }

  private resolveLarkCliHomeDir() {
    const candidates = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "..", "..")];
    for (const candidate of candidates) {
      if (existsSync(join(candidate, ".lark-cli", "config.json"))) {
        return candidate;
      }
    }

    const fromUserProfile = process.env.USERPROFILE ? resolve(process.env.USERPROFILE) : "";
    if (fromUserProfile && existsSync(join(fromUserProfile, ".lark-cli", "config.json"))) {
      return fromUserProfile;
    }

    return process.cwd();
  }

  private async collectAndStoreAccount(
    brandId: string,
    account: PlatformAccountRecord,
    kind: CollectorAccountKind,
  ): Promise<XhsCollectedAccountRecord> {
    const raw = await this.fetchXhs("/api/v1/xiaohongshu/app/get_user_info", {
      user_id: this.extractUserIdFromUrl(account.accountLink),
      user_url: account.accountLink,
    });

    const accountName = this.pickString(raw, ["nickname"]) || account.accountName;
    const externalUserId = this.pickString(raw, ["userid", "user_id", "userId", "uid", "id"]) || this.extractUserIdFromUrl(account.accountLink);
    const collectedAt = new Date().toISOString();

    const payload = {
      kind,
      sourceAccountId: account.id,
      sourceAccountLink: account.accountLink,
      externalUserId,
      postedCount: this.pickNumber(raw, ["posted"]),
      likedCount: this.pickNumber(raw, ["liked"]),
      collectedCount: this.pickNumber(raw, ["collected"]),
      avatar: this.pickString(raw, ["avatar"]),
      description: this.pickString(raw, ["desc"]),
      ipLocation: this.pickString(raw, ["ip_location"]),
      followCount: this.pickNumber(raw, ["follows"]),
      fanCount: this.pickNumber(raw, ["fans"]),
      collectedAt,
      raw,
    };

    const asset = await this.upsertCollectorAsset({
      brandId,
      kind,
      matchValue: account.id,
      title: accountName,
      description: kind === "XHS_BRAND_ACCOUNT" ? "小红书品牌账号采集快照" : "小红书竞品账号采集快照",
      metadata: payload,
    });

    return this.mapCollectedAccount(asset, kind);
  }

  private async collectAndStoreNotes(brandId: string, account: PlatformAccountRecord): Promise<XhsCollectedNoteRecord[]> {
    const raw = await this.fetchXhs("/api/v1/xiaohongshu/web/get_user_notes_v2", {
      user_id: this.extractUserIdFromUrl(account.accountLink),
      user_url: account.accountLink,
      lastCursor: "",
    });

    const noteItems = this.extractNoteItems(raw);
    const collectedAt = new Date().toISOString();
    const rows: XhsCollectedNoteRecord[] = [];

    for (const item of noteItems) {
      const noteId = this.pickString(item, ["note_id", "noteId", "id"]);
      if (!noteId) {
        continue;
      }

      const noteUrl =
        this.pickString(item, ["note_url", "noteUrl", "share_url", "shareUrl"])
        || `https://www.xiaohongshu.com/explore/${noteId}`;
      const title = this.pickString(item, ["title", "name"]) || `小红书作品 ${noteId}`;
      const description = this.pickString(item, ["desc", "description", "content", "text"]) || "";
      const likeCount = this.pickNumber(item, ["likes", "liked_count", "like_count", "likedCount"]);
      const collectCount = this.pickNumber(item, ["collected_count", "collect_count", "collectedCount"]);
      const shareCount = this.pickNumber(item, ["share_count", "shareCount", "shared_count"]);
      const commentCount = this.pickNumber(item, ["comments_count", "comment_count", "commentCount"]);
      const noteType = this.pickString(item, ["type"]);
      const nickname = this.pickString(item, ["nickname"]);
      const imageList = this.pickStringArray(item, ["images_list"]);
      const externalUserId = this.pickString(item, ["userid", "user_id", "userId"]);
      const createdAtText = this.pickString(item, ["create_time"]);
      const videoUrl = this.pickString(item, ["video_download_url"]);

      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: "XHS_BRAND_NOTE",
        matchValue: noteId,
        title,
        description,
        fileUrl: noteUrl,
        metadata: {
          kind: "XHS_BRAND_NOTE",
          sourceAccountId: account.id,
          sourceAccountLink: account.accountLink,
          noteId,
          noteUrl,
          noteType,
          nickname,
          imageList,
          externalUserId,
          likeCount,
          collectCount,
          createdAtText,
          shareCount,
          commentCount,
          videoUrl,
          collectedAt,
          raw: item,
        },
      });

      rows.push(this.mapCollectedNote(asset));
    }

    return rows;
  }

  private async collectAndStoreBenchmarkNote(brandId: string, sourceUrl: string): Promise<XhsCollectedNoteRecord> {
    const collectedAt = new Date().toISOString();
    const nextRetryAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    try {
      throw new Error("缺少 1.4 对标作品接口的可访问文档链接，当前先记录重试任务");
    } catch (error) {
      const asset = await this.upsertCollectorAsset({
        brandId,
        kind: "XHS_BENCHMARK_NOTE",
        matchValue: sourceUrl,
        title: `待采集对标作品`,
        description: "等待对接对标作品接口",
        fileUrl: sourceUrl,
        metadata: {
          kind: "XHS_BENCHMARK_NOTE",
          sourceUrl,
          noteId: this.extractNoteIdFromUrl(sourceUrl),
          noteUrl: sourceUrl,
          collectedAt,
          syncStatus: "FAILED",
          retryCount: 1,
          nextRetryAt,
          lastError: error instanceof Error ? error.message : "采集失败",
        },
      });

      return this.mapCollectedNote(asset);
    }
  }

  private async collectAndStoreTargetUser(brandId: string, sourceUrl: string): Promise<XhsCollectedTargetUserRecord> {
    const collectedAt = new Date().toISOString();
    const nextRetryAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    try {
      throw new Error("缺少 1.5 目标用户接口的可访问文档链接，当前先记录重试任务");
    } catch (error) {
      const asset = await this.upsertTargetAsset({
        brandId,
        matchValue: sourceUrl,
        title: "待采集目标用户",
        description: "等待对接目标用户接口",
        metadata: {
          kind: "XHS_TARGET_USER",
          sourceUrl,
          profileUrl: undefined,
          userId: undefined,
          noteTitle: undefined,
          collectedAt,
          syncStatus: "FAILED",
          retryCount: 1,
          nextRetryAt,
          lastError: error instanceof Error ? error.message : "采集失败",
        },
      });

      return this.mapCollectedTargetUser(asset);
    }
  }

  private async collectAndStoreDailyHotspotPlatform(
    brandId: string,
    config: DailyHotspotConfig,
  ): Promise<DailyHotspotPlatformRecord> {
    const collectedAt = new Date().toISOString();
    const snapshotDate = this.getLocalDateString();

    try {
      const raw = await this.fetchTikHub(config.path);
      const items = this.extractDailyHotspotItems(raw, config.platformKey)
        .sort((left, right) => left.rank - right.rank)
        .slice(0, 20);
      const updateTime = this.extractDailyHotspotUpdateTime(raw);
      const asset = await this.upsertDailyHotspotAsset({
        brandId,
        config,
        metadata: {
          kind: "DAILY_HOTSPOT_PLATFORM",
          platformKey: config.platformKey,
          snapshotDate,
          boardType: config.boardType,
          sourceLink: config.sourceLink,
          total: items.length,
          updateTime,
          fromCache: this.pickBoolean(raw, ["from_cache", "is_cache", "cache"]),
          collectedAt,
          syncStatus: "SUCCESS",
          lastError: undefined,
          items,
          raw,
        },
      });

      return this.mapDailyHotspotPlatform(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : "热点采集失败";
      const asset = await this.upsertDailyHotspotAsset({
        brandId,
        config,
        metadata: {
          kind: "DAILY_HOTSPOT_PLATFORM",
          platformKey: config.platformKey,
          snapshotDate,
          boardType: config.boardType,
          sourceLink: config.sourceLink,
          total: 0,
          updateTime: undefined,
          fromCache: false,
          collectedAt,
          syncStatus: "FAILED",
          lastError: message,
          items: [],
        },
      });

      return this.mapDailyHotspotPlatform(asset);
    }
  }

  private async upsertCollectorAsset(params: {
    brandId: string;
    kind: CollectorAssetKind;
    matchValue: string;
    title: string;
    description: string;
    fileUrl?: string;
    metadata: Record<string, unknown>;
  }): Promise<AssetRecord> {
    const { brandId, kind, matchValue, title, description, fileUrl, metadata } = params;
    const sourceTableId = this.readMetaString(metadata, "sourceTableId");
    const sourceRecordId = this.readMetaString(metadata, "sourceRecordId");

    if (await this.prismaService.canUseDatabase()) {
      const existing = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
      });

      const matched = existing.find((item) => {
        const meta = this.asMeta(item.metadataJson);
        if (
          sourceTableId
          && sourceRecordId
          && meta.kind === kind
          && this.readMetaString(meta, "sourceTableId") === sourceTableId
          && this.readMetaString(meta, "sourceRecordId") === sourceRecordId
        ) {
          return true;
        }
        if (kind === "XHS_BRAND_NOTE" || kind === "XHS_BENCHMARK_NOTE") {
          return meta.kind === kind && this.readMetaString(meta, "noteId") === matchValue;
        }
        if (kind === "XHS_TARGET_USER") {
          return meta.kind === kind && this.readMetaString(meta, "sourceUrl") === matchValue;
        }
        return meta.kind === kind && this.readMetaString(meta, "sourceAccountId") === matchValue;
      });

      if (matched) {
        const updated = await this.prismaService.businessAsset.update({
          where: { id: matched.id },
          data: {
            title,
            description,
            fileUrl,
            metadataJson: metadata as Prisma.InputJsonValue,
          },
        });

        return {
          id: updated.id,
          brandId: updated.brandId,
          category: "PLATFORM_EXPORT",
          title: updated.title,
          description: updated.description ?? "",
          sourceName: "小红书采集",
          fileUrl: updated.fileUrl ?? undefined,
          metadataJson: this.asMeta(updated.metadataJson),
        };
      }

      const created = await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
          title,
          description,
          fileUrl,
          metadataJson: metadata as Prisma.InputJsonValue,
        },
      });

      return {
        id: created.id,
        brandId: created.brandId,
        category: "PLATFORM_EXPORT",
        title: created.title,
        description: created.description ?? "",
        sourceName: "小红书采集",
        fileUrl: created.fileUrl ?? undefined,
        metadataJson: this.asMeta(created.metadataJson),
      };
    }

    const index = database.assets.findIndex((item) => {
      const meta = this.asMeta(item.metadataJson);
      if (
        sourceTableId
        && sourceRecordId
        && item.brandId === brandId
        && meta.kind === kind
        && this.readMetaString(meta, "sourceTableId") === sourceTableId
        && this.readMetaString(meta, "sourceRecordId") === sourceRecordId
      ) {
        return true;
      }
      if (kind === "XHS_BRAND_NOTE" || kind === "XHS_BENCHMARK_NOTE") {
        return item.brandId === brandId && meta.kind === kind && this.readMetaString(meta, "noteId") === matchValue;
      }
      if (kind === "XHS_TARGET_USER") {
        return item.brandId === brandId && meta.kind === kind && this.readMetaString(meta, "sourceUrl") === matchValue;
      }
      return item.brandId === brandId && meta.kind === kind && this.readMetaString(meta, "sourceAccountId") === matchValue;
    });

    const asset: AssetRecord = {
      id: index >= 0 ? database.assets[index].id : createId("ast"),
      brandId,
      category: "PLATFORM_EXPORT",
      title,
      description,
      sourceName: "小红书采集",
      fileUrl,
      metadataJson: metadata,
    };

    if (index >= 0) {
      database.assets[index] = asset;
    } else {
      database.assets.unshift(asset);
    }

    return asset;
  }

  private async cleanupDuplicateCollectorAssets(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });
      const duplicateIds = this.collectDuplicateCollectorAssetIds(
        assets.map((item) => ({
          id: item.id,
          brandId: item.brandId,
          category: "PLATFORM_EXPORT" as const,
          title: item.title,
          description: item.description ?? "",
          sourceName: "小红书采集",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        })),
      );
      if (duplicateIds.length) {
        await this.prismaService.businessAsset.deleteMany({
          where: {
            id: { in: duplicateIds },
          },
        });
      }
      return duplicateIds.length;
    }

    const duplicateIds = new Set(
      this.collectDuplicateCollectorAssetIds(
        database.assets.filter((item) => item.brandId === brandId && item.category === "PLATFORM_EXPORT"),
      ),
    );
    if (!duplicateIds.size) {
      return 0;
    }

    database.assets = database.assets.filter((item) => !duplicateIds.has(item.id));
    return duplicateIds.size;
  }

  private async clearExistingXiaohongshuCollectorAssets(brandId: string) {
    const collectorKinds = new Set<CollectorAssetKind | CollectorTargetKind>([
      "XHS_BRAND_ACCOUNT",
      "XHS_COMPETITOR_ACCOUNT",
      "XHS_BRAND_NOTE",
      "XHS_BENCHMARK_NOTE",
      "XHS_TARGET_USER",
    ]);

    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        select: {
          id: true,
          metadataJson: true,
        },
      });
      const assetIds = assets
        .filter((item) => collectorKinds.has(this.readMetaString(this.asMeta(item.metadataJson), "kind") as CollectorAssetKind | CollectorTargetKind))
        .map((item) => item.id);
      if (!assetIds.length) {
        return 0;
      }
      const result = await this.prismaService.businessAsset.deleteMany({
        where: {
          id: { in: assetIds },
        },
      });
      return result.count;
    }

    const initialSize = database.assets.length;
    database.assets = database.assets.filter((item) => {
      if (item.brandId !== brandId || item.category !== "PLATFORM_EXPORT") {
        return true;
      }
      const kind = this.readMetaString(this.asMeta(item.metadataJson), "kind");
      return !collectorKinds.has(kind as CollectorAssetKind | CollectorTargetKind);
    });
    return initialSize - database.assets.length;
  }

  private collectDuplicateCollectorAssetIds(assets: AssetRecord[]) {
    const seenKeys = new Set<string>();
    const duplicateIds: string[] = [];

    for (const asset of assets) {
      const duplicateKey = this.buildCollectorDuplicateKey(asset);
      if (!duplicateKey) {
        continue;
      }
      if (seenKeys.has(duplicateKey)) {
        duplicateIds.push(asset.id);
        continue;
      }
      seenKeys.add(duplicateKey);
    }

    duplicateIds.push(...this.collectLegacyBenchmarkAvatarAssetIds(assets));
    return duplicateIds;
  }

  private collectLegacyBenchmarkAvatarAssetIds(assets: AssetRecord[]) {
    const benchmarkAssets = assets.filter((asset) => this.readMetaString(this.asMeta(asset.metadataJson), "kind") === "XHS_BENCHMARK_NOTE");
    const validTitles = new Set(
      benchmarkAssets
        .filter((asset) => this.isRealXiaohongshuNoteUrl(this.readBenchmarkAssetUrl(asset)))
        .map((asset) => asset.title.trim())
        .filter(Boolean),
    );

    return benchmarkAssets
      .filter((asset) => {
        const url = this.readBenchmarkAssetUrl(asset);
        const noteId = this.readMetaString(this.asMeta(asset.metadataJson), "noteId");
        return (
          validTitles.has(asset.title.trim())
          && (this.isAvatarCdnUrl(url) || noteId.startsWith("rec"))
        );
      })
      .map((asset) => asset.id);
  }

  private buildCollectorDuplicateKey(asset: AssetRecord) {
    const meta = this.asMeta(asset.metadataJson);
    const kind = this.readMetaString(meta, "kind");
    if (!kind) {
      return "";
    }

    const sourceTableId = this.readMetaString(meta, "sourceTableId");
    const sourceRecordId = this.readMetaString(meta, "sourceRecordId");
    if (sourceTableId && sourceRecordId) {
      return `${kind}:feishu:${sourceTableId}:${sourceRecordId}`;
    }

    if (kind === "XHS_BRAND_NOTE" || kind === "XHS_BENCHMARK_NOTE") {
      const noteId = this.readMetaString(meta, "noteId");
      if (noteId) {
        return `${kind}:note:${noteId}`;
      }
    }

    if (kind === "XHS_TARGET_USER") {
      const sourceUrl = this.readMetaString(meta, "sourceUrl");
      if (sourceUrl) {
        return `${kind}:target:${sourceUrl}`;
      }
    }

    if (kind === "XHS_BRAND_ACCOUNT" || kind === "XHS_COMPETITOR_ACCOUNT") {
      const sourceAccountId = this.readMetaString(meta, "sourceAccountId");
      if (sourceAccountId) {
        return `${kind}:account:${sourceAccountId}`;
      }
    }

    return "";
  }

  private readBenchmarkAssetUrl(asset: AssetRecord) {
    const meta = this.asMeta(asset.metadataJson);
    return this.readMetaString(meta, "sourceUrl") || this.readMetaString(meta, "noteUrl") || asset.fileUrl || "";
  }

  private isRealXiaohongshuNoteUrl(value: string) {
    return /https?:\/\/www\.xiaohongshu\.com\/(explore|discovery\/item)\//i.test(value);
  }

  private isAvatarCdnUrl(value: string) {
    return /https?:\/\/sns-avatar[^/\s]*\.xhscdn\.com\//i.test(value);
  }

  private async upsertTargetAsset(params: {
    brandId: string;
    matchValue: string;
    title: string;
    description: string;
    metadata: Record<string, unknown>;
  }): Promise<AssetRecord> {
    return this.upsertCollectorAsset({
      brandId: params.brandId,
      kind: "XHS_TARGET_USER",
      matchValue: params.matchValue,
      title: params.title,
      description: params.description,
      metadata: params.metadata,
    });
  }

  private async upsertDailyHotspotAsset(params: {
    brandId: string;
    config: DailyHotspotConfig;
    metadata: Record<string, unknown>;
  }): Promise<AssetRecord> {
    const { brandId, config, metadata } = params;

    if (await this.prismaService.canUseDatabase()) {
      const existing = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
      });

      const matched = existing.find((item) => {
        const meta = this.asMeta(item.metadataJson);
        return (
          this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM"
          && this.readMetaString(meta, "platformKey") === config.platformKey
          && this.getDailyHotspotSnapshotDate(meta) === this.getDailyHotspotSnapshotDate(metadata)
        );
      });

      if (matched) {
        const updated = await this.prismaService.businessAsset.update({
          where: { id: matched.id },
          data: {
            title: config.title,
            description: config.description,
            fileUrl: config.sourceLink,
            metadataJson: metadata as Prisma.InputJsonValue,
          },
        });

        return {
          id: updated.id,
          brandId: updated.brandId,
          category: "PLATFORM_EXPORT",
          title: updated.title,
          description: updated.description ?? "",
          sourceName: "每日热点采集",
          fileUrl: updated.fileUrl ?? undefined,
          metadataJson: this.asMeta(updated.metadataJson),
        };
      }

      const created = await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
          title: config.title,
          description: config.description,
          fileUrl: config.sourceLink,
          metadataJson: metadata as Prisma.InputJsonValue,
        },
      });

      return {
        id: created.id,
        brandId: created.brandId,
        category: "PLATFORM_EXPORT",
        title: created.title,
        description: created.description ?? "",
        sourceName: "每日热点采集",
        fileUrl: created.fileUrl ?? undefined,
        metadataJson: this.asMeta(created.metadataJson),
      };
    }

    const index = database.assets.findIndex((item) => {
      const meta = this.asMeta(item.metadataJson);
      return (
        item.brandId === brandId
        && this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM"
        && this.readMetaString(meta, "platformKey") === config.platformKey
        && this.getDailyHotspotSnapshotDate(meta) === this.getDailyHotspotSnapshotDate(metadata)
      );
    });

    const asset: AssetRecord = {
      id: index >= 0 ? database.assets[index].id : createId("ast"),
      brandId,
      category: "PLATFORM_EXPORT",
      title: config.title,
      description: config.description,
      sourceName: "每日热点采集",
      fileUrl: config.sourceLink,
      metadataJson: metadata,
    };

    if (index >= 0) {
      database.assets[index] = asset;
    } else {
      database.assets.unshift(asset);
    }

    return asset;
  }

  private async getConfiguredAccounts(brandId: string, target: "brand" | "competitor"): Promise<PlatformAccountRecord[]> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);

      if (target === "brand") {
        const rows = await this.prismaService.platformAccount.findMany({
          where: { brandId, platform: "XIAOHONGSHU" },
        });
        return rows.map((item) => ({
          id: item.id,
          brandId: item.brandId,
          platform: item.platform,
          accountName: item.accountName ?? item.username ?? "未命名账号",
          accountLink: item.accountLink,
        }));
      }

      const rows = await this.prismaService.competitorAccount.findMany({
        where: { brandId, platform: "XIAOHONGSHU" },
      });
      return rows.map((item) => ({
        id: item.id,
        brandId: item.brandId,
        platform: item.platform,
        accountName: item.accountName ?? item.username ?? "未命名竞品账号",
        accountLink: item.accountLink,
      }));
    }

    this.ensureBrandExistsInMock(brandId);
    const source = target === "brand" ? database.platformAccounts : database.competitorAccounts;
    return source.filter((item) => item.brandId === brandId && item.platform === "XIAOHONGSHU");
  }

  private async fetchXhs(path: string, params: Record<string, string | undefined>) {
    const token = process.env.XHS_DATA_API_KEY;
    if (!token) {
      throw new ServiceUnavailableException("缺少 XHS_DATA_API_KEY，无法调用小红书采集接口");
    }

    const url = new URL(`https://www.zyunaigc.com${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`小红书采集接口请求失败: ${response.status}`);
    }

    const payload = (await response.json()) as {
      success?: boolean;
      message?: string;
      data?: unknown;
    };

    if (payload && typeof payload === "object" && payload.success === false) {
      throw new ServiceUnavailableException(payload.message || "小红书采集接口业务校验失败");
    }

    return payload?.data ?? payload;
  }

  private async fetchTikHub(path: string, params: Record<string, string | undefined> = {}) {
    const token = process.env.TIKHUB_API_KEY;
    if (!token) {
      throw new ServiceUnavailableException("缺少 TIKHUB_API_KEY，无法调用每日热点接口");
    }

    const url = new URL(`https://api.tikhub.io${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const payloadText = await response.text();
    let payload: unknown = payloadText;

    try {
      payload = payloadText ? JSON.parse(payloadText) : {};
    } catch {
      payload = payloadText;
    }

    if (!response.ok) {
      const hint = response.status === 403 ? "，请确认当前 API Key 是否已开通对应热点接口权限" : "";
      throw new ServiceUnavailableException(`TikHub 热点接口请求失败: ${response.status}${hint}`);
    }

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const code = this.pickNumber(payload, ["code"]);
      const message = this.pickString(payload, ["message", "msg", "message_zh"]);
      if (typeof code === "number" && code !== 200) {
        throw new ServiceUnavailableException(message || `TikHub 热点接口业务校验失败: ${code}`);
      }
      return payload;
    }

    return payload;
  }

  private extractNoteItems(raw: unknown): unknown[] {
    const queue: unknown[] = [raw];

    while (queue.length) {
      const current = queue.shift();
      if (Array.isArray(current)) {
        if (current.some((item) => this.pickString(item, ["note_id", "noteId", "title", "desc"]))) {
          return current;
        }
        queue.push(...current);
        continue;
      }

      if (current && typeof current === "object") {
        for (const value of Object.values(current)) {
          queue.push(value);
        }
      }
    }

    return [];
  }

  private extractDailyHotspotItems(raw: unknown, platformKey: string): DailyHotspotItemRecord[] {
    const queue: unknown[] = [raw];
    let bestCandidates: DailyHotspotItemRecord[] = [];

    while (queue.length) {
      const current = queue.shift();
      if (Array.isArray(current)) {
        const signalCount = current.filter((item) => this.looksLikeDailyHotspotRawItem(item)).length;
        const candidates = current
          .map((item, index) => this.normalizeDailyHotspotItem(item, index + 1, platformKey))
          .filter((item): item is DailyHotspotItemRecord => Boolean(item));
        if (candidates.length && signalCount) {
          if (candidates.length > bestCandidates.length) {
            bestCandidates = candidates;
          }
        }
        queue.push(...current);
        continue;
      }

      if (current && typeof current === "object") {
        for (const value of Object.values(current)) {
          queue.push(value);
        }
      }
    }

    return bestCandidates;
  }

  private looksLikeDailyHotspotRawItem(raw: unknown) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return false;
    }

    const record = raw as Record<string, unknown>;
    return Boolean(record.word || record.title || record.name)
      && (
        record.hot_value !== undefined
        || record.event_time !== undefined
        || record.position !== undefined
        || record.group_id !== undefined
        || record.sentence_id !== undefined
      );
  }

  private normalizeDailyHotspotItem(raw: unknown, fallbackRank: number, platformKey: string): DailyHotspotItemRecord | null {
    const title =
      this.pickString(raw, ["word", "sentence", "title", "name", "keyword", "display_word"])
      || this.pickString(raw, ["desc"]);
    if (!title) {
      return null;
    }

    const explicitRank = this.pickNumber(raw, ["position", "rank", "index", "hot_rank", "order", "num"]);
    const hotRaw = this.pickNumber(raw, ["hot_value", "hot", "hotness", "view_count", "aweme_cnt", "video_count"]);
    const hot = typeof hotRaw === "number" && hotRaw > 0 ? hotRaw : undefined;
    const url =
      this.pickString(raw, ["url", "link", "sentence_url", "share_url", "web_url"])
      || undefined;
    const mobileUrl =
      this.pickString(raw, ["app_url", "mobile_url", "schema"])
      || undefined;
    const timestamp =
      this.pickNumber(raw, ["event_time", "timestamp", "create_time", "update_time"])
      ?? undefined;
    if (explicitRank === undefined && hot === undefined && timestamp === undefined) {
      return null;
    }

    const rank = explicitRank ?? fallbackRank;
    const id =
      this.pickString(raw, ["word_id", "group_id", "sentence_id", "id"])
      || `${platformKey}-${rank}-${title}`;

    return {
      id,
      rank,
      title,
      hot,
      url,
      mobileUrl,
      timestamp: this.normalizeUnixTimestamp(timestamp),
    };
  }

  private extractDailyHotspotUpdateTime(raw: unknown) {
    const textValue =
      this.pickString(raw, ["update_time", "active_time", "refresh_time", "version", "time", "date"])
      || this.pickString(raw, ["message_time"]);
    if (textValue) {
      return textValue;
    }

    const timestamp = this.pickNumber(raw, ["time_stamp", "timestamp", "event_time", "update_timestamp"]);
    return typeof timestamp === "number" ? new Date(this.normalizeUnixTimestamp(timestamp) ?? timestamp).toISOString() : undefined;
  }

  private pickString(raw: unknown, keys: string[]): string {
    const value = this.pickDeepValue(raw, keys);
    return typeof value === "string" ? value : "";
  }

  private pickStringArray(raw: unknown, keys: string[]): string[] {
    const value = this.pickDeepValue(raw, keys);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private pickBoolean(raw: unknown, keys: string[]): boolean | undefined {
    const value = this.pickDeepValue(raw, keys);
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
    }
    return undefined;
  }

  private pickNumber(raw: unknown, keys: string[]): number | undefined {
    const value = this.pickDeepValue(raw, keys);
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private pickDeepValue(raw: unknown, keys: string[]) {
    const targetKeys = new Set(keys);
    const queue: unknown[] = [raw];
    let visited = 0;

    while (queue.length && visited < 300) {
      visited += 1;
      const current = queue.shift();

      if (!current || typeof current !== "object") {
        continue;
      }

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      for (const [key, value] of Object.entries(current)) {
        if (targetKeys.has(key)) {
          return value;
        }
        queue.push(value);
      }
    }

    return undefined;
  }

  private extractUserIdFromUrl(url: string) {
    const match = url.match(/user\/profile\/([^/?#]+)/i);
    return match?.[1] ?? "";
  }

  private extractNoteIdFromUrl(url: string) {
    const match = url.match(/explore\/([^/?#]+)/i);
    return match?.[1] ?? "";
  }

  private asMeta(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private readMetaString(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return typeof value === "string" ? value : "";
  }

  private readMetaNumber(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return typeof value === "number" ? value : undefined;
  }

  private readMetaBoolean(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return typeof value === "boolean" ? value : undefined;
  }

  private readMetaStringArray(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private readMetaJsonArray(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return Array.isArray(value) ? value : [];
  }

  private getDailyHotspotSnapshotDate(meta: Record<string, unknown>) {
    const snapshotDate = this.readMetaString(meta, "snapshotDate");
    if (snapshotDate) {
      return snapshotDate;
    }

    const collectedAt = this.readMetaString(meta, "collectedAt");
    if (collectedAt) {
      return collectedAt.slice(0, 10);
    }

    const updateTime = this.readMetaString(meta, "updateTime");
    if (updateTime) {
      return updateTime.slice(0, 10);
    }

    return "";
  }

  private normalizeUnixTimestamp(value?: number) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return undefined;
    }

    return value >= 1e12 ? value : value * 1000;
  }

  private async ensureBrandExistsInDatabase(brandId: string) {
    const brand = await this.prismaService.brand.findUnique({ where: { id: brandId } });
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
  }

  private ensureBrandExistsInMock(brandId: string) {
    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
  }

  private ensureBrandExistsInMockOrDatabase(brandId: string) {
    const brand = database.brands.find((item) => item.id === brandId);
    if (brand) {
      return;
    }
  }

  private resolveDailyHotspotConfigs(platformTitles: string[]) {
    if (!platformTitles.length) {
      return DAILY_HOTSPOT_CONFIGS;
    }

    const normalizedTitles = platformTitles.map((item) => item.trim()).filter(Boolean);
    const matched = DAILY_HOTSPOT_CONFIGS.filter((item) =>
      normalizedTitles.some((title) => title === item.title || title === item.platformKey || title === item.boardType),
    );

    return matched.length ? matched : DAILY_HOTSPOT_CONFIGS;
  }

  private async runDailyHotspotSyncJob() {
    if (!process.env.TIKHUB_API_KEY) {
      console.warn("跳过每日热点定时采集：缺少 TIKHUB_API_KEY");
      return;
    }

    const brandIds = await this.getDailyHotspotBrandIds();
    await Promise.all(
      brandIds.map(async (brandId) => {
        try {
          await this.syncDailyHotspots(brandId, []);
        } catch (error) {
          const message = error instanceof Error ? error.message : "未知错误";
          console.error(`每日热点定时采集失败: ${brandId} - ${message}`);
        }
      }),
    );
  }

  private async shouldCatchUpDailyHotspotRun() {
    if (!process.env.TIKHUB_API_KEY) {
      return false;
    }

    const today = this.getLocalDateString();
    const brandIds = await this.getDailyHotspotBrandIds();
    if (!brandIds.length) {
      return false;
    }

    for (const brandId of brandIds) {
      const snapshots = await this.getDailyHotspotSnapshotStatuses(brandId);
      for (const config of DAILY_HOTSPOT_CONFIGS) {
        const matched = snapshots.find((item) => item.platformKey === config.platformKey && item.snapshotDate === today);
        if (!matched || matched.syncStatus !== "SUCCESS") {
          return true;
        }
      }
    }

    return false;
  }

  private async shouldCatchUpDailyHotspotBrand(brandId: string) {
    if (!process.env.TIKHUB_API_KEY) {
      return false;
    }

    const today = this.getLocalDateString();
    const snapshots = await this.getDailyHotspotSnapshotStatuses(brandId);
    for (const config of DAILY_HOTSPOT_CONFIGS) {
      const matched = snapshots.find((item) => item.platformKey === config.platformKey && item.snapshotDate === today);
      if (!matched || matched.syncStatus !== "SUCCESS") {
        return true;
      }
    }

    return false;
  }

  private async getDailyHotspotBrandIds() {
    if (await this.prismaService.canUseDatabase()) {
      const brands = await this.prismaService.brand.findMany({
        select: { id: true },
      });
      return brands.map((item) => item.id);
    }

    return database.brands.map((item) => item.id);
  }

  private async getDailyHotspotSnapshotStatuses(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.PLATFORM_EXPORT,
        },
        orderBy: { updatedAt: "desc" },
      });

      return assets
        .map((asset) => this.asMeta(asset.metadataJson))
        .filter((meta) => this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM")
        .map((meta) => ({
          platformKey: this.readMetaString(meta, "platformKey"),
          snapshotDate: this.getDailyHotspotSnapshotDate(meta),
          syncStatus: (this.readMetaString(meta, "syncStatus") as DailyHotspotSyncStatus) || "IDLE",
        }));
    }

    return database.assets
      .filter((asset) => asset.brandId === brandId && asset.category === "PLATFORM_EXPORT")
      .map((asset) => this.asMeta(asset.metadataJson))
      .filter((meta) => this.readMetaString(meta, "kind") === "DAILY_HOTSPOT_PLATFORM")
      .map((meta) => ({
        platformKey: this.readMetaString(meta, "platformKey"),
        snapshotDate: this.getDailyHotspotSnapshotDate(meta),
        syncStatus: (this.readMetaString(meta, "syncStatus") as DailyHotspotSyncStatus) || "IDLE",
      }));
  }

  private getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
