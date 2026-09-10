import { randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import {
  CollectorsService,
  type DouyinCreatorProfileRecord,
  type DouyinWorkDetailSnapshot,
} from "../collectors/collectors.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SchedulerService } from "../scheduler/scheduler.service";
import {
  type OpenClawWorkspaceScope,
  normalizeOpenClawWorkspaceScope,
} from "./openclaw-workspace-scope";

const DEFAULT_CREATOR_COOPERATION_WORKSPACE_SCOPE = "paid_acquisition";
const CREATOR_COOPERATION_REFRESH_JOB_NAME = "openclaw_creator_cooperation_work_refresh";

type OpenClawCreatorCooperationSnapshot = {
  creatorId: string;
  oAuthorId: string;
  secUserId?: string;
  uniqueId?: string;
  douyinUid?: string;
  nickname: string;
  avatar?: string;
  signature?: string;
  region?: string;
  categoryLabels?: string[];
  contentThemeLabels?: string[];
  fansCount?: number;
  expectedPlayCount?: number;
  interactRate?: number;
  playOverRate?: number;
  spreadIndex?: number;
  price?: number;
  priceType?: string;
  cpm?: number;
  cpe?: number;
  profileUrl?: string;
  contactPhone?: string;
  contactWechat?: string;
  contactEmail?: string;
  mcnName?: string;
  marketingLabel?: string;
  taskCategoryLabel?: string;
  linkType?: number;
  fansDistributionSummary?: string[];
  audienceDistributionSummary?: string[];
  hotCommentTokens?: string[];
  contentHotKeywords?: string[];
  recommendedVideoTitles?: string[];
  homepageVideoCount?: number;
  recommendedVideoCount?: number;
  lastFetchedAt?: string;
};

type OpenClawCreatorMatchRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  sourceProfileId: string;
  creatorId: string;
  nickname: string;
  recommendedReason: string;
  snapshotJson: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawCreatorTrackingRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  sourceProfileId: string;
  creatorId: string;
  nickname: string;
  snapshotJson: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawCreatorWorkRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  trackingId: string;
  createdByUserId: string;
  douyinWorkUrl: string;
  awemeId: string;
  title: string;
  coverUrl: string;
  playCount: number | null;
  likeCount: number | null;
  collectCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  resultEvaluation: string;
  nextAction: string;
  refreshIntervalDays: number;
  lastSyncedAt: Date | string;
  nextRefreshAt: Date | string;
  lastSyncError: string;
  rawFieldsJson: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawCreatorMatchStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  sourceProfileId: string;
  creatorId: string;
  nickname: string;
  recommendedReason: string;
  snapshot: OpenClawCreatorCooperationSnapshot;
  createdAt: string;
  updatedAt: string;
};

type OpenClawCreatorTrackingStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  sourceProfileId: string;
  creatorId: string;
  nickname: string;
  snapshot: OpenClawCreatorCooperationSnapshot;
  createdAt: string;
  updatedAt: string;
};

type OpenClawCreatorWorkStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  trackingId: string;
  createdByUserId: string;
  douyinWorkUrl: string;
  awemeId: string;
  title: string;
  coverUrl?: string;
  playCount?: number;
  likeCount?: number;
  collectCount?: number;
  commentCount?: number;
  shareCount?: number;
  resultEvaluation: string;
  nextAction?: OpenClawCreatorWorkNextAction;
  refreshIntervalDays: number;
  lastSyncedAt: string;
  nextRefreshAt: string;
  lastSyncError?: string;
  rawFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawCreatorWorkNextAction = "复投" | "调整" | "暂停";

export type OpenClawCreatorMatchRecord = OpenClawCreatorCooperationSnapshot & {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  sourceProfileId: string;
  recommendedReason: string;
  isInTrackingList: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawCreatorMatchWorkspace = {
  items: OpenClawCreatorMatchRecord[];
  total: number;
};

export type OpenClawCreatorTrackingRecord = OpenClawCreatorCooperationSnapshot & {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  sourceProfileId: string;
  cooperationWorkCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawCreatorTrackingWorkspace = {
  items: OpenClawCreatorTrackingRecord[];
  total: number;
};

export type OpenClawCreatorTrackingWorkRecord = OpenClawCreatorWorkStoredRecord;

export type OpenClawCreatorTrackingWorkWorkspace = {
  trackingId: string;
  items: OpenClawCreatorTrackingWorkRecord[];
  total: number;
};

@Injectable()
export class OpenClawCreatorCooperationService implements OnModuleInit {
  private readonly logger = new Logger(OpenClawCreatorCooperationService.name);
  private bootstrapPromise: Promise<void> | null = null;
  private readonly fallbackMatches: OpenClawCreatorMatchStoredRecord[] = [];
  private readonly fallbackTracking: OpenClawCreatorTrackingStoredRecord[] = [];
  private readonly fallbackWorks: OpenClawCreatorWorkStoredRecord[] = [];

  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(CollectorsService)
    private readonly collectorsService: CollectorsService,
    @Inject(SchedulerService)
    private readonly schedulerService: SchedulerService,
  ) {}

  onModuleInit() {
    this.schedulerService.registerDailyJob({
      name: CREATOR_COOPERATION_REFRESH_JOB_NAME,
      hour: 3,
      minute: 20,
      runOnStartupIfMissed: process.env.NODE_ENV !== "production",
      onTick: () => this.refreshDueWorks(),
    });
  }

  async listMatchingWorkspace(brandId: string, workspaceScope?: string, limit?: number): Promise<OpenClawCreatorMatchWorkspace> {
    const items = await this.listMatchingRecords(brandId, workspaceScope, limit);
    const trackingItems = await this.listTrackingRecords(brandId, workspaceScope, 500);
    const trackingCreatorIds = new Set(trackingItems.map((item) => item.creatorId));
    return {
      items: items.map((item) => this.toMatchRecord(item, trackingCreatorIds.has(item.creatorId))),
      total: items.length,
    };
  }

  async createMatchingRecords(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    items?: Array<{
      sourceProfileId?: string;
      creatorId?: string;
      recommendedReason?: string;
    }>;
  }): Promise<OpenClawCreatorMatchRecord[]> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = this.normalizeScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      throw new BadRequestException("请至少提供一位匹配达人");
    }

    const lookup = await this.buildCreatorProfileLookup(brandId);
    const saved: OpenClawCreatorMatchStoredRecord[] = [];
    for (const item of items) {
      const profile = this.resolveCreatorProfile(lookup, item.sourceProfileId, item.creatorId);
      const savedItem = await this.upsertMatchingRecord({
        brandId,
        workspaceScope,
        createdByUserId,
        sourceProfileId: profile.id,
        creatorId: profile.creatorId,
        nickname: profile.nickname,
        recommendedReason: this.requireText(item.recommendedReason, `请填写达人 ${profile.nickname} 的推荐理由`, 2_000),
        snapshot: this.buildSnapshot(profile),
      });
      saved.push(savedItem);
    }

    const trackingItems = await this.listTrackingRecords(brandId, workspaceScope, 500);
    const trackingCreatorIds = new Set(trackingItems.map((item) => item.creatorId));
    return saved.map((item) => this.toMatchRecord(item, trackingCreatorIds.has(item.creatorId)));
  }

  async deleteMatchingRecords(brandId: string, workspaceScope: string | undefined, recordIds: string[]): Promise<number> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedScope = this.normalizeScope(workspaceScope);
    const normalizedIds = Array.from(new Set(recordIds.map((item) => String(item || "").trim()).filter(Boolean)));
    if (!normalizedIds.length) {
      throw new BadRequestException("请至少选择一条达人匹配记录");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      let deletedCount = 0;
      for (const recordId of normalizedIds) {
        deletedCount += Number(
          await this.prismaService.$executeRaw`
            DELETE FROM "OpenClawCreatorCooperationMatch"
            WHERE "brandId" = ${normalizedBrandId}
              AND "workspaceScope" = ${normalizedScope}
              AND "id" = ${recordId}
          `,
        );
      }
      return deletedCount;
    }

    const before = this.fallbackMatches.length;
    const next = this.fallbackMatches.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedScope && normalizedIds.includes(item.id)),
    );
    this.fallbackMatches.length = 0;
    this.fallbackMatches.push(...next);
    return before - next.length;
  }

  async moveMatchesToTracking(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    recordIds: string[];
  }): Promise<OpenClawCreatorTrackingRecord[]> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = this.normalizeScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const recordIds = Array.from(new Set(payload.recordIds.map((item) => String(item || "").trim()).filter(Boolean)));
    if (!recordIds.length) {
      throw new BadRequestException("请至少选择一位达人加入合作清单");
    }

    const matches = await this.listMatchingRecords(brandId, workspaceScope, 500);
    const targetMatches = matches.filter((item) => recordIds.includes(item.id));
    if (!targetMatches.length) {
      throw new NotFoundException("未找到要加入合作清单的达人匹配记录");
    }

    const saved: OpenClawCreatorTrackingStoredRecord[] = [];
    for (const item of targetMatches) {
      saved.push(await this.upsertTrackingRecord({
        brandId,
        workspaceScope,
        createdByUserId,
        sourceProfileId: item.sourceProfileId,
        creatorId: item.creatorId,
        nickname: item.nickname,
        snapshot: item.snapshot,
      }));
    }

    const workCountMap = await this.getTrackingWorkCountMap(brandId, workspaceScope);
    return saved.map((item) => this.toTrackingRecord(item, workCountMap.get(item.id) ?? 0));
  }

  async listTrackingWorkspace(brandId: string, workspaceScope?: string, limit?: number): Promise<OpenClawCreatorTrackingWorkspace> {
    const items = await this.listTrackingRecords(brandId, workspaceScope, limit);
    const workCountMap = await this.getTrackingWorkCountMap(brandId, workspaceScope);
    return {
      items: items.map((item) => this.toTrackingRecord(item, workCountMap.get(item.id) ?? 0)),
      total: items.length,
    };
  }

  async createTrackingRecords(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    items?: Array<{
      sourceProfileId?: string;
      creatorId?: string;
    }>;
  }): Promise<OpenClawCreatorTrackingRecord[]> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = this.normalizeScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) {
      throw new BadRequestException("请至少提供一位达人");
    }

    const lookup = await this.buildCreatorProfileLookup(brandId);
    const saved: OpenClawCreatorTrackingStoredRecord[] = [];
    for (const item of items) {
      const profile = this.resolveCreatorProfile(lookup, item.sourceProfileId, item.creatorId);
      saved.push(await this.upsertTrackingRecord({
        brandId,
        workspaceScope,
        createdByUserId,
        sourceProfileId: profile.id,
        creatorId: profile.creatorId,
        nickname: profile.nickname,
        snapshot: this.buildSnapshot(profile),
      }));
    }

    const workCountMap = await this.getTrackingWorkCountMap(brandId, workspaceScope);
    return saved.map((item) => this.toTrackingRecord(item, workCountMap.get(item.id) ?? 0));
  }

  async deleteTrackingRecord(brandId: string, workspaceScope: string | undefined, trackingId: string): Promise<OpenClawCreatorTrackingRecord> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedScope = this.normalizeScope(workspaceScope);
    const normalizedTrackingId = this.requireText(trackingId, "缺少达人跟踪记录 ID");
    const existing = await this.findTrackingRecordById(normalizedBrandId, normalizedScope, normalizedTrackingId);
    if (!existing) {
      throw new NotFoundException("达人跟踪记录不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "OpenClawCreatorCooperationWork"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedScope}
          AND "trackingId" = ${normalizedTrackingId}
      `;
      await this.prismaService.$executeRaw`
        DELETE FROM "OpenClawCreatorCooperationTracking"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedScope}
          AND "id" = ${normalizedTrackingId}
      `;
    } else {
      this.fallbackWorks.splice(
        0,
        this.fallbackWorks.length,
        ...this.fallbackWorks.filter(
          (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedScope && item.trackingId === normalizedTrackingId),
        ),
      );
      this.fallbackTracking.splice(
        0,
        this.fallbackTracking.length,
        ...this.fallbackTracking.filter(
          (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedScope && item.id === normalizedTrackingId),
        ),
      );
    }

    const workCountMap = await this.getTrackingWorkCountMap(normalizedBrandId, normalizedScope);
    return this.toTrackingRecord(existing, workCountMap.get(existing.id) ?? 0);
  }

  async listTrackingWorkWorkspace(
    brandId: string,
    workspaceScope: string | undefined,
    trackingId: string,
    limit?: number,
  ): Promise<OpenClawCreatorTrackingWorkWorkspace> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedScope = this.normalizeScope(workspaceScope);
    const normalizedTrackingId = this.requireText(trackingId, "缺少达人跟踪记录 ID");
    const tracking = await this.findTrackingRecordById(normalizedBrandId, normalizedScope, normalizedTrackingId);
    if (!tracking) {
      throw new NotFoundException("达人跟踪记录不存在");
    }
    const items = await this.listWorkRecords(normalizedBrandId, normalizedScope, normalizedTrackingId, limit);
    return {
      trackingId: tracking.id,
      items,
      total: items.length,
    };
  }

  async createTrackingWork(payload: {
    brandId: string;
    workspaceScope?: string;
    trackingId: string;
    createdByUserId: string;
    douyinWorkUrl?: string;
    refreshIntervalDays?: number;
    resultEvaluation?: string;
    nextAction?: string;
  }): Promise<OpenClawCreatorTrackingWorkRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = this.normalizeScope(payload.workspaceScope);
    const trackingId = this.requireText(payload.trackingId, "缺少达人跟踪记录 ID");
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const tracking = await this.findTrackingRecordById(brandId, workspaceScope, trackingId);
    if (!tracking) {
      throw new NotFoundException("达人跟踪记录不存在");
    }

    const snapshot = await this.collectorsService.getDouyinWorkDetailSnapshot(
      brandId,
      this.requireText(payload.douyinWorkUrl, "请填写抖音作品链接", 2_000),
    );
    return this.upsertTrackingWorkRecord({
      brandId,
      workspaceScope,
      trackingId,
      createdByUserId,
      douyinWorkUrl: snapshot.workUrl || this.requireText(payload.douyinWorkUrl, "请填写抖音作品链接", 2_000),
      awemeId: snapshot.workId,
      title: snapshot.title,
      coverUrl: snapshot.coverUrl,
      playCount: snapshot.playCount,
      likeCount: snapshot.likeCount,
      collectCount: snapshot.collectCount,
      commentCount: snapshot.commentCount,
      shareCount: snapshot.shareCount,
      resultEvaluation: String(payload.resultEvaluation || "").trim(),
      nextAction: this.normalizeNextAction(payload.nextAction),
      refreshIntervalDays: this.normalizeRefreshIntervalDays(payload.refreshIntervalDays),
      lastSyncedAt: snapshot.collectedAt,
      lastSyncError: "",
      rawFields: {
        snapshot,
      },
    });
  }

  async updateTrackingWork(payload: {
    brandId: string;
    workspaceScope?: string;
    trackingId: string;
    workId: string;
    douyinWorkUrl?: string;
    refreshIntervalDays?: number;
    resultEvaluation?: string;
    nextAction?: string;
    refreshNow?: boolean;
  }): Promise<OpenClawCreatorTrackingWorkRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = this.normalizeScope(payload.workspaceScope);
    const trackingId = this.requireText(payload.trackingId, "缺少达人跟踪记录 ID");
    const workId = this.requireText(payload.workId, "缺少作品记录 ID");
    const existing = await this.findWorkRecordById(brandId, workspaceScope, trackingId, workId);
    if (!existing) {
      throw new NotFoundException("合作作品记录不存在");
    }

    const shouldRefresh = Boolean(payload.refreshNow) || Boolean(String(payload.douyinWorkUrl || "").trim());
    let snapshot: DouyinWorkDetailSnapshot | null = null;
    const nextWorkUrl = String(payload.douyinWorkUrl || "").trim() || existing.douyinWorkUrl;
    if (shouldRefresh) {
      snapshot = await this.collectorsService.getDouyinWorkDetailSnapshot(brandId, nextWorkUrl);
    }

    const lastSyncedAt = snapshot?.collectedAt || existing.lastSyncedAt;
    const refreshIntervalDays = this.normalizeRefreshIntervalDays(payload.refreshIntervalDays ?? existing.refreshIntervalDays);
    const updated = {
      ...existing,
      douyinWorkUrl: snapshot?.workUrl || nextWorkUrl,
      awemeId: snapshot?.workId || existing.awemeId,
      title: snapshot?.title || existing.title,
      coverUrl: snapshot?.coverUrl || existing.coverUrl,
      playCount: snapshot?.playCount ?? existing.playCount,
      likeCount: snapshot?.likeCount ?? existing.likeCount,
      collectCount: snapshot?.collectCount ?? existing.collectCount,
      commentCount: snapshot?.commentCount ?? existing.commentCount,
      shareCount: snapshot?.shareCount ?? existing.shareCount,
      resultEvaluation: payload.resultEvaluation !== undefined ? String(payload.resultEvaluation || "").trim() : existing.resultEvaluation,
      nextAction: payload.nextAction !== undefined ? this.normalizeNextAction(payload.nextAction) : existing.nextAction,
      refreshIntervalDays,
      lastSyncedAt,
      nextRefreshAt: this.addDays(lastSyncedAt, refreshIntervalDays),
      lastSyncError: "",
      rawFields: snapshot
        ? {
            ...(existing.rawFields || {}),
            snapshot,
          }
        : existing.rawFields,
    } satisfies OpenClawCreatorWorkStoredRecord;

    return this.saveTrackingWorkRecord(updated);
  }

  async deleteTrackingWork(brandId: string, workspaceScope: string | undefined, trackingId: string, workId: string) {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedScope = this.normalizeScope(workspaceScope);
    const normalizedTrackingId = this.requireText(trackingId, "缺少达人跟踪记录 ID");
    const normalizedWorkId = this.requireText(workId, "缺少作品记录 ID");
    const existing = await this.findWorkRecordById(normalizedBrandId, normalizedScope, normalizedTrackingId, normalizedWorkId);
    if (!existing) {
      throw new NotFoundException("合作作品记录不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "OpenClawCreatorCooperationWork"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedScope}
          AND "trackingId" = ${normalizedTrackingId}
          AND "id" = ${normalizedWorkId}
      `;
    } else {
      this.fallbackWorks.splice(
        0,
        this.fallbackWorks.length,
        ...this.fallbackWorks.filter(
          (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedScope && item.trackingId === normalizedTrackingId && item.id === normalizedWorkId),
        ),
      );
    }

    return existing;
  }

  private async refreshDueWorks() {
    const dueWorks = await this.listDueWorks();
    if (!dueWorks.length) {
      return;
    }

    for (const item of dueWorks) {
      try {
        const snapshot = await this.collectorsService.getDouyinWorkDetailSnapshot(item.brandId, item.douyinWorkUrl || item.awemeId);
        await this.saveTrackingWorkRecord({
          ...item,
          douyinWorkUrl: snapshot.workUrl || item.douyinWorkUrl,
          awemeId: snapshot.workId,
          title: snapshot.title,
          coverUrl: snapshot.coverUrl,
          playCount: snapshot.playCount,
          likeCount: snapshot.likeCount,
          collectCount: snapshot.collectCount,
          commentCount: snapshot.commentCount,
          shareCount: snapshot.shareCount,
          lastSyncedAt: snapshot.collectedAt,
          nextRefreshAt: this.addDays(snapshot.collectedAt, item.refreshIntervalDays),
          lastSyncError: "",
          rawFields: {
            ...(item.rawFields || {}),
            snapshot,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "合作作品自动刷新失败";
        this.logger.warn(`refresh creator cooperation work failed: ${item.id} - ${message}`);
        await this.saveTrackingWorkRecord({
          ...item,
          nextRefreshAt: this.addDays(new Date().toISOString(), 1),
          lastSyncError: message,
        });
      }
    }
  }

  private async buildCreatorProfileLookup(brandId: string) {
    const workspace = await this.collectorsService.getDouyinWorkspace(brandId);
    const bySourceProfileId = new Map<string, DouyinCreatorProfileRecord>();
    const byCreatorId = new Map<string, DouyinCreatorProfileRecord>();
    for (const item of workspace.creatorProfiles) {
      bySourceProfileId.set(item.id, item);
      if (item.creatorId) {
        byCreatorId.set(item.creatorId, item);
      }
      if (item.oAuthorId) {
        byCreatorId.set(item.oAuthorId, item);
      }
    }
    return {
      bySourceProfileId,
      byCreatorId,
    };
  }

  private resolveCreatorProfile(
    lookup: Awaited<ReturnType<OpenClawCreatorCooperationService["buildCreatorProfileLookup"]>>,
    sourceProfileId?: string,
    creatorId?: string,
  ) {
    const normalizedSourceProfileId = String(sourceProfileId || "").trim();
    const normalizedCreatorId = String(creatorId || "").trim();
    const matched =
      (normalizedSourceProfileId ? lookup.bySourceProfileId.get(normalizedSourceProfileId) : undefined)
      || (normalizedCreatorId ? lookup.byCreatorId.get(normalizedCreatorId) : undefined);
    if (!matched) {
      throw new NotFoundException("未在达人结果池里找到对应达人，请先确认结果池数据是否存在");
    }
    return matched;
  }

  private buildSnapshot(profile: DouyinCreatorProfileRecord): OpenClawCreatorCooperationSnapshot {
    return {
      creatorId: profile.creatorId,
      oAuthorId: profile.oAuthorId,
      secUserId: profile.secUserId,
      uniqueId: profile.uniqueId,
      douyinUid: profile.douyinUid,
      nickname: profile.nickname,
      avatar: profile.avatar,
      signature: profile.signature,
      region: profile.region,
      categoryLabels: profile.categoryLabels,
      contentThemeLabels: profile.contentThemeLabels,
      fansCount: profile.fansCount,
      expectedPlayCount: profile.expectedPlayCount,
      interactRate: profile.interactRate,
      playOverRate: profile.playOverRate,
      spreadIndex: profile.spreadIndex,
      price: profile.price,
      priceType: profile.priceType,
      cpm: profile.cpm,
      cpe: profile.cpe,
      profileUrl: profile.profileUrl,
      contactPhone: profile.contactPhone,
      contactWechat: profile.contactWechat,
      contactEmail: profile.contactEmail,
      mcnName: profile.mcnName,
      marketingLabel: profile.marketingLabel,
      taskCategoryLabel: profile.taskCategoryLabel,
      linkType: profile.linkType,
      fansDistributionSummary: profile.fansDistributionSummary,
      audienceDistributionSummary: profile.audienceDistributionSummary,
      hotCommentTokens: profile.hotCommentTokens,
      contentHotKeywords: profile.contentHotKeywords,
      recommendedVideoTitles: profile.recommendedVideoTitles,
      homepageVideoCount: profile.homepageVideoCount,
      recommendedVideoCount: profile.recommendedVideoCount,
      lastFetchedAt: profile.lastFetchedAt,
    };
  }

  private toMatchRecord(item: OpenClawCreatorMatchStoredRecord, isInTrackingList: boolean): OpenClawCreatorMatchRecord {
    return {
      id: item.id,
      brandId: item.brandId,
      workspaceScope: item.workspaceScope,
      createdByUserId: item.createdByUserId,
      sourceProfileId: item.sourceProfileId,
      recommendedReason: item.recommendedReason,
      isInTrackingList,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      ...item.snapshot,
    };
  }

  private toTrackingRecord(item: OpenClawCreatorTrackingStoredRecord, cooperationWorkCount: number): OpenClawCreatorTrackingRecord {
    return {
      id: item.id,
      brandId: item.brandId,
      workspaceScope: item.workspaceScope,
      createdByUserId: item.createdByUserId,
      sourceProfileId: item.sourceProfileId,
      cooperationWorkCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      ...item.snapshot,
    };
  }

  private async getTrackingWorkCountMap(brandId: string, workspaceScope?: string) {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedScope = this.normalizeScope(workspaceScope);
    const map = new Map<string, number>();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<Array<{ trackingId: string; count: bigint | number }>>`
        SELECT "trackingId", COUNT(*) AS "count"
        FROM "OpenClawCreatorCooperationWork"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedScope}
        GROUP BY "trackingId"
      `;
      for (const row of rows) {
        map.set(row.trackingId, Number(row.count));
      }
      return map;
    }

    for (const item of this.fallbackWorks) {
      if (item.brandId !== normalizedBrandId || item.workspaceScope !== normalizedScope) {
        continue;
      }
      map.set(item.trackingId, (map.get(item.trackingId) ?? 0) + 1);
    }
    return map;
  }

  private async upsertMatchingRecord(payload: {
    brandId: string;
    workspaceScope: OpenClawWorkspaceScope;
    createdByUserId: string;
    sourceProfileId: string;
    creatorId: string;
    nickname: string;
    recommendedReason: string;
    snapshot: OpenClawCreatorCooperationSnapshot;
  }): Promise<OpenClawCreatorMatchStoredRecord> {
    const existing = await this.findMatchingRecordByCreatorId(payload.brandId, payload.workspaceScope, payload.creatorId);
    const id = existing?.id || `openclaw_creator_match_${randomUUID()}`;
    const now = new Date().toISOString();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      if (existing) {
        await this.prismaService.$executeRaw`
          UPDATE "OpenClawCreatorCooperationMatch"
          SET
            "sourceProfileId" = ${payload.sourceProfileId},
            "nickname" = ${payload.nickname},
            "recommendedReason" = ${payload.recommendedReason},
            "snapshotJson" = ${JSON.stringify(payload.snapshot)},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${existing.id}
        `;
      } else {
        await this.prismaService.$executeRaw`
          INSERT INTO "OpenClawCreatorCooperationMatch" (
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "sourceProfileId",
            "creatorId",
            "nickname",
            "recommendedReason",
            "snapshotJson",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${id},
            ${payload.brandId},
            ${payload.workspaceScope},
            ${payload.createdByUserId},
            ${payload.sourceProfileId},
            ${payload.creatorId},
            ${payload.nickname},
            ${payload.recommendedReason},
            ${JSON.stringify(payload.snapshot)},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `;
      }
      const saved = await this.findMatchingRecordById(payload.brandId, payload.workspaceScope, id);
      if (!saved) {
        throw new NotFoundException("达人匹配记录保存后未找到");
      }
      return saved;
    }

    const stored: OpenClawCreatorMatchStoredRecord = {
      id,
      brandId: payload.brandId,
      workspaceScope: payload.workspaceScope,
      createdByUserId: existing?.createdByUserId || payload.createdByUserId,
      sourceProfileId: payload.sourceProfileId,
      creatorId: payload.creatorId,
      nickname: payload.nickname,
      recommendedReason: payload.recommendedReason,
      snapshot: payload.snapshot,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    const next = this.fallbackMatches.filter((item) => item.id !== id);
    next.unshift(stored);
    this.fallbackMatches.length = 0;
    this.fallbackMatches.push(...next);
    return stored;
  }

  private async upsertTrackingRecord(payload: {
    brandId: string;
    workspaceScope: OpenClawWorkspaceScope;
    createdByUserId: string;
    sourceProfileId: string;
    creatorId: string;
    nickname: string;
    snapshot: OpenClawCreatorCooperationSnapshot;
  }): Promise<OpenClawCreatorTrackingStoredRecord> {
    const existing = await this.findTrackingRecordByCreatorId(payload.brandId, payload.workspaceScope, payload.creatorId);
    const id = existing?.id || `openclaw_creator_tracking_${randomUUID()}`;
    const now = new Date().toISOString();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      if (existing) {
        await this.prismaService.$executeRaw`
          UPDATE "OpenClawCreatorCooperationTracking"
          SET
            "sourceProfileId" = ${payload.sourceProfileId},
            "nickname" = ${payload.nickname},
            "snapshotJson" = ${JSON.stringify(payload.snapshot)},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${existing.id}
        `;
      } else {
        await this.prismaService.$executeRaw`
          INSERT INTO "OpenClawCreatorCooperationTracking" (
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "sourceProfileId",
            "creatorId",
            "nickname",
            "snapshotJson",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${id},
            ${payload.brandId},
            ${payload.workspaceScope},
            ${payload.createdByUserId},
            ${payload.sourceProfileId},
            ${payload.creatorId},
            ${payload.nickname},
            ${JSON.stringify(payload.snapshot)},
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
        `;
      }
      const saved = await this.findTrackingRecordById(payload.brandId, payload.workspaceScope, id);
      if (!saved) {
        throw new NotFoundException("达人跟踪记录保存后未找到");
      }
      return saved;
    }

    const stored: OpenClawCreatorTrackingStoredRecord = {
      id,
      brandId: payload.brandId,
      workspaceScope: payload.workspaceScope,
      createdByUserId: existing?.createdByUserId || payload.createdByUserId,
      sourceProfileId: payload.sourceProfileId,
      creatorId: payload.creatorId,
      nickname: payload.nickname,
      snapshot: payload.snapshot,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    const next = this.fallbackTracking.filter((item) => item.id !== id);
    next.unshift(stored);
    this.fallbackTracking.length = 0;
    this.fallbackTracking.push(...next);
    return stored;
  }

  private async upsertTrackingWorkRecord(payload: {
    brandId: string;
    workspaceScope: OpenClawWorkspaceScope;
    trackingId: string;
    createdByUserId: string;
    douyinWorkUrl: string;
    awemeId: string;
    title: string;
    coverUrl?: string;
    playCount?: number;
    likeCount?: number;
    collectCount?: number;
    commentCount?: number;
    shareCount?: number;
    resultEvaluation: string;
    nextAction?: OpenClawCreatorWorkNextAction;
    refreshIntervalDays: number;
    lastSyncedAt: string;
    lastSyncError?: string;
    rawFields?: Record<string, unknown>;
  }): Promise<OpenClawCreatorTrackingWorkRecord> {
    const existing = await this.findWorkRecordByAwemeId(payload.brandId, payload.workspaceScope, payload.trackingId, payload.awemeId);
    const id = existing?.id || `openclaw_creator_work_${randomUUID()}`;
    return this.saveTrackingWorkRecord({
      id,
      brandId: payload.brandId,
      workspaceScope: payload.workspaceScope,
      trackingId: payload.trackingId,
      createdByUserId: existing?.createdByUserId || payload.createdByUserId,
      douyinWorkUrl: payload.douyinWorkUrl,
      awemeId: payload.awemeId,
      title: payload.title,
      coverUrl: payload.coverUrl,
      playCount: payload.playCount,
      likeCount: payload.likeCount,
      collectCount: payload.collectCount,
      commentCount: payload.commentCount,
      shareCount: payload.shareCount,
      resultEvaluation: payload.resultEvaluation,
      nextAction: payload.nextAction,
      refreshIntervalDays: payload.refreshIntervalDays,
      lastSyncedAt: payload.lastSyncedAt,
      nextRefreshAt: this.addDays(payload.lastSyncedAt, payload.refreshIntervalDays),
      lastSyncError: payload.lastSyncError,
      rawFields: payload.rawFields,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  private async saveTrackingWorkRecord(record: OpenClawCreatorWorkStoredRecord): Promise<OpenClawCreatorTrackingWorkRecord> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const existing = await this.findWorkRecordById(record.brandId, record.workspaceScope, record.trackingId, record.id);
      if (existing) {
        await this.prismaService.$executeRaw`
          UPDATE "OpenClawCreatorCooperationWork"
          SET
            "douyinWorkUrl" = ${record.douyinWorkUrl},
            "awemeId" = ${record.awemeId},
            "title" = ${record.title},
            "coverUrl" = ${record.coverUrl || ""},
            "playCount" = ${record.playCount ?? null},
            "likeCount" = ${record.likeCount ?? null},
            "collectCount" = ${record.collectCount ?? null},
            "commentCount" = ${record.commentCount ?? null},
            "shareCount" = ${record.shareCount ?? null},
            "resultEvaluation" = ${record.resultEvaluation},
            "nextAction" = ${record.nextAction || ""},
            "refreshIntervalDays" = ${record.refreshIntervalDays},
            "lastSyncedAt" = ${new Date(record.lastSyncedAt)},
            "nextRefreshAt" = ${new Date(record.nextRefreshAt)},
            "lastSyncError" = ${record.lastSyncError || ""},
            "rawFieldsJson" = ${JSON.stringify(record.rawFields || {})},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${record.id}
        `;
      } else {
        await this.prismaService.$executeRaw`
          INSERT INTO "OpenClawCreatorCooperationWork" (
            "id",
            "brandId",
            "workspaceScope",
            "trackingId",
            "createdByUserId",
            "douyinWorkUrl",
            "awemeId",
            "title",
            "coverUrl",
            "playCount",
            "likeCount",
            "collectCount",
            "commentCount",
            "shareCount",
            "resultEvaluation",
            "nextAction",
            "refreshIntervalDays",
            "lastSyncedAt",
            "nextRefreshAt",
            "lastSyncError",
            "rawFieldsJson",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${record.id},
            ${record.brandId},
            ${record.workspaceScope},
            ${record.trackingId},
            ${record.createdByUserId},
            ${record.douyinWorkUrl},
            ${record.awemeId},
            ${record.title},
            ${record.coverUrl || ""},
            ${record.playCount ?? null},
            ${record.likeCount ?? null},
            ${record.collectCount ?? null},
            ${record.commentCount ?? null},
            ${record.shareCount ?? null},
            ${record.resultEvaluation},
            ${record.nextAction || ""},
            ${record.refreshIntervalDays},
            ${new Date(record.lastSyncedAt)},
            ${new Date(record.nextRefreshAt)},
            ${record.lastSyncError || ""},
            ${JSON.stringify(record.rawFields || {})},
            ${new Date(record.createdAt)},
            CURRENT_TIMESTAMP
          )
        `;
      }
      const saved = await this.findWorkRecordById(record.brandId, record.workspaceScope, record.trackingId, record.id);
      if (!saved) {
        throw new NotFoundException("合作作品记录保存后未找到");
      }
      return saved;
    }

    const stored: OpenClawCreatorWorkStoredRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    const next = this.fallbackWorks.filter((item) => item.id !== stored.id);
    next.unshift(stored);
    this.fallbackWorks.length = 0;
    this.fallbackWorks.push(...next);
    return stored;
  }

  private async listMatchingRecords(brandId: string, workspaceScope?: string, limit?: number): Promise<OpenClawCreatorMatchStoredRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedScope = this.normalizeScope(workspaceScope);
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<OpenClawCreatorMatchRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "sourceProfileId",
          "creatorId",
          "nickname",
          "recommendedReason",
          "snapshotJson",
          "createdAt",
          "updatedAt"
        FROM "OpenClawCreatorCooperationMatch"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedScope}
        ORDER BY "createdAt" DESC, "updatedAt" DESC
        LIMIT ${resolvedLimit}
      `;
      return rows.map((item) => this.normalizeMatchRow(item));
    }

    return this.fallbackMatches
      .filter((item) => item.brandId === normalizedBrandId && item.workspaceScope === normalizedScope)
      .sort((left, right) => `${right.createdAt}${right.updatedAt}`.localeCompare(`${left.createdAt}${left.updatedAt}`))
      .slice(0, resolvedLimit);
  }

  private async listTrackingRecords(brandId: string, workspaceScope?: string, limit?: number): Promise<OpenClawCreatorTrackingStoredRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedScope = this.normalizeScope(workspaceScope);
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<OpenClawCreatorTrackingRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "sourceProfileId",
          "creatorId",
          "nickname",
          "snapshotJson",
          "createdAt",
          "updatedAt"
        FROM "OpenClawCreatorCooperationTracking"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedScope}
        ORDER BY "createdAt" DESC, "updatedAt" DESC
        LIMIT ${resolvedLimit}
      `;
      return rows.map((item) => this.normalizeTrackingRow(item));
    }

    return this.fallbackTracking
      .filter((item) => item.brandId === normalizedBrandId && item.workspaceScope === normalizedScope)
      .sort((left, right) => `${right.createdAt}${right.updatedAt}`.localeCompare(`${left.createdAt}${left.updatedAt}`))
      .slice(0, resolvedLimit);
  }

  private async listWorkRecords(
    brandId: string,
    workspaceScope: string | undefined,
    trackingId: string,
    limit?: number,
  ): Promise<OpenClawCreatorTrackingWorkRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedScope = this.normalizeScope(workspaceScope);
    const normalizedTrackingId = this.requireText(trackingId, "缺少达人跟踪记录 ID");
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<OpenClawCreatorWorkRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "trackingId",
          "createdByUserId",
          "douyinWorkUrl",
          "awemeId",
          "title",
          "coverUrl",
          "playCount",
          "likeCount",
          "collectCount",
          "commentCount",
          "shareCount",
          "resultEvaluation",
          "nextAction",
          "refreshIntervalDays",
          "lastSyncedAt",
          "nextRefreshAt",
          "lastSyncError",
          "rawFieldsJson",
          "createdAt",
          "updatedAt"
        FROM "OpenClawCreatorCooperationWork"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedScope}
          AND "trackingId" = ${normalizedTrackingId}
        ORDER BY "createdAt" DESC, "updatedAt" DESC
        LIMIT ${resolvedLimit}
      `;
      return rows.map((item) => this.normalizeWorkRow(item));
    }

    return this.fallbackWorks
      .filter((item) => item.brandId === normalizedBrandId && item.workspaceScope === normalizedScope && item.trackingId === normalizedTrackingId)
      .sort((left, right) => `${right.createdAt}${right.updatedAt}`.localeCompare(`${left.createdAt}${left.updatedAt}`))
      .slice(0, resolvedLimit);
  }

  private async listDueWorks(): Promise<OpenClawCreatorTrackingWorkRecord[]> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<OpenClawCreatorWorkRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "trackingId",
          "createdByUserId",
          "douyinWorkUrl",
          "awemeId",
          "title",
          "coverUrl",
          "playCount",
          "likeCount",
          "collectCount",
          "commentCount",
          "shareCount",
          "resultEvaluation",
          "nextAction",
          "refreshIntervalDays",
          "lastSyncedAt",
          "nextRefreshAt",
          "lastSyncError",
          "rawFieldsJson",
          "createdAt",
          "updatedAt"
        FROM "OpenClawCreatorCooperationWork"
        WHERE "nextRefreshAt" <= CURRENT_TIMESTAMP
        ORDER BY "nextRefreshAt" ASC
        LIMIT 200
      `;
      return rows.map((item) => this.normalizeWorkRow(item));
    }

    const now = Date.now();
    return this.fallbackWorks
      .filter((item) => new Date(item.nextRefreshAt).getTime() <= now)
      .sort((left, right) => left.nextRefreshAt.localeCompare(right.nextRefreshAt))
      .slice(0, 200);
  }

  private async findMatchingRecordById(brandId: string, workspaceScope: string | undefined, recordId: string) {
    const items = await this.listMatchingRecords(brandId, workspaceScope, 500);
    return items.find((item) => item.id === recordId);
  }

  private async findMatchingRecordByCreatorId(brandId: string, workspaceScope: string | undefined, creatorId: string) {
    const items = await this.listMatchingRecords(brandId, workspaceScope, 500);
    return items.find((item) => item.creatorId === creatorId);
  }

  private async findTrackingRecordById(brandId: string, workspaceScope: string | undefined, trackingId: string) {
    const items = await this.listTrackingRecords(brandId, workspaceScope, 500);
    return items.find((item) => item.id === trackingId);
  }

  private async findTrackingRecordByCreatorId(brandId: string, workspaceScope: string | undefined, creatorId: string) {
    const items = await this.listTrackingRecords(brandId, workspaceScope, 500);
    return items.find((item) => item.creatorId === creatorId);
  }

  private async findWorkRecordById(brandId: string, workspaceScope: string | undefined, trackingId: string, workId: string) {
    const items = await this.listWorkRecords(brandId, workspaceScope, trackingId, 500);
    return items.find((item) => item.id === workId);
  }

  private async findWorkRecordByAwemeId(brandId: string, workspaceScope: string | undefined, trackingId: string, awemeId: string) {
    const items = await this.listWorkRecords(brandId, workspaceScope, trackingId, 500);
    return items.find((item) => item.awemeId === awemeId);
  }

  private normalizeMatchRow(row: OpenClawCreatorMatchRow): OpenClawCreatorMatchStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: this.normalizeScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      sourceProfileId: String(row.sourceProfileId || "").trim(),
      creatorId: String(row.creatorId || "").trim(),
      nickname: String(row.nickname || "").trim(),
      recommendedReason: String(row.recommendedReason || "").trim(),
      snapshot: this.parseSnapshot(row.snapshotJson),
      createdAt: this.normalizeDate(row.createdAt),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private normalizeTrackingRow(row: OpenClawCreatorTrackingRow): OpenClawCreatorTrackingStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: this.normalizeScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      sourceProfileId: String(row.sourceProfileId || "").trim(),
      creatorId: String(row.creatorId || "").trim(),
      nickname: String(row.nickname || "").trim(),
      snapshot: this.parseSnapshot(row.snapshotJson),
      createdAt: this.normalizeDate(row.createdAt),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private normalizeWorkRow(row: OpenClawCreatorWorkRow): OpenClawCreatorWorkStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: this.normalizeScope(row.workspaceScope),
      trackingId: row.trackingId,
      createdByUserId: row.createdByUserId,
      douyinWorkUrl: String(row.douyinWorkUrl || "").trim(),
      awemeId: String(row.awemeId || "").trim(),
      title: String(row.title || "").trim(),
      coverUrl: String(row.coverUrl || "").trim() || undefined,
      playCount: this.normalizeNullableNumber(row.playCount),
      likeCount: this.normalizeNullableNumber(row.likeCount),
      collectCount: this.normalizeNullableNumber(row.collectCount),
      commentCount: this.normalizeNullableNumber(row.commentCount),
      shareCount: this.normalizeNullableNumber(row.shareCount),
      resultEvaluation: String(row.resultEvaluation || "").trim(),
      nextAction: this.normalizeNextAction(row.nextAction),
      refreshIntervalDays: Math.max(1, Number(row.refreshIntervalDays) || 7),
      lastSyncedAt: this.normalizeDate(row.lastSyncedAt),
      nextRefreshAt: this.normalizeDate(row.nextRefreshAt),
      lastSyncError: String(row.lastSyncError || "").trim() || undefined,
      rawFields: this.parseRecord(row.rawFieldsJson),
      createdAt: this.normalizeDate(row.createdAt),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private parseSnapshot(value: string) {
    const parsed = this.parseRecord(value);
    return {
      creatorId: this.readRecordString(parsed, "creatorId"),
      oAuthorId: this.readRecordString(parsed, "oAuthorId"),
      secUserId: this.readRecordString(parsed, "secUserId") || undefined,
      uniqueId: this.readRecordString(parsed, "uniqueId") || undefined,
      douyinUid: this.readRecordString(parsed, "douyinUid") || undefined,
      nickname: this.readRecordString(parsed, "nickname"),
      avatar: this.readRecordString(parsed, "avatar") || undefined,
      signature: this.readRecordString(parsed, "signature") || undefined,
      region: this.readRecordString(parsed, "region") || undefined,
      categoryLabels: this.readRecordStringArray(parsed, "categoryLabels"),
      contentThemeLabels: this.readRecordStringArray(parsed, "contentThemeLabels"),
      fansCount: this.readRecordNumber(parsed, "fansCount"),
      expectedPlayCount: this.readRecordNumber(parsed, "expectedPlayCount"),
      interactRate: this.readRecordNumber(parsed, "interactRate"),
      playOverRate: this.readRecordNumber(parsed, "playOverRate"),
      spreadIndex: this.readRecordNumber(parsed, "spreadIndex"),
      price: this.readRecordNumber(parsed, "price"),
      priceType: this.readRecordString(parsed, "priceType") || undefined,
      cpm: this.readRecordNumber(parsed, "cpm"),
      cpe: this.readRecordNumber(parsed, "cpe"),
      profileUrl: this.readRecordString(parsed, "profileUrl") || undefined,
      contactPhone: this.readRecordString(parsed, "contactPhone") || undefined,
      contactWechat: this.readRecordString(parsed, "contactWechat") || undefined,
      contactEmail: this.readRecordString(parsed, "contactEmail") || undefined,
      mcnName: this.readRecordString(parsed, "mcnName") || undefined,
      marketingLabel: this.readRecordString(parsed, "marketingLabel") || undefined,
      taskCategoryLabel: this.readRecordString(parsed, "taskCategoryLabel") || undefined,
      linkType: this.readRecordNumber(parsed, "linkType"),
      fansDistributionSummary: this.readRecordStringArray(parsed, "fansDistributionSummary"),
      audienceDistributionSummary: this.readRecordStringArray(parsed, "audienceDistributionSummary"),
      hotCommentTokens: this.readRecordStringArray(parsed, "hotCommentTokens"),
      contentHotKeywords: this.readRecordStringArray(parsed, "contentHotKeywords"),
      recommendedVideoTitles: this.readRecordStringArray(parsed, "recommendedVideoTitles"),
      homepageVideoCount: this.readRecordNumber(parsed, "homepageVideoCount"),
      recommendedVideoCount: this.readRecordNumber(parsed, "recommendedVideoCount"),
      lastFetchedAt: this.readRecordString(parsed, "lastFetchedAt") || undefined,
    } satisfies OpenClawCreatorCooperationSnapshot;
  }

  private parseRecord(value: string | undefined) {
    try {
      const parsed = JSON.parse(String(value || "{}"));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }

  private readRecordString(record: Record<string, unknown>, key: string) {
    return String(record[key] || "").trim();
  }

  private readRecordNumber(record: Record<string, unknown>, key: string) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private readRecordStringArray(record: Record<string, unknown>, key: string) {
    const value = record[key];
    return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : undefined;
  }

  private normalizeDate(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const normalized = String(value || "").trim();
    return normalized || new Date().toISOString();
  }

  private normalizeNullableNumber(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  private normalizeScope(value?: string): OpenClawWorkspaceScope {
    return normalizeOpenClawWorkspaceScope(value || DEFAULT_CREATOR_COOPERATION_WORKSPACE_SCOPE);
  }

  private normalizeLimit(limit?: number) {
    if (!Number.isFinite(limit) || Number(limit) <= 0) {
      return 100;
    }
    return Math.min(500, Math.floor(Number(limit)));
  }

  private requireText(value: string | undefined, message: string, maxLength = 200) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }
    return normalized.slice(0, maxLength);
  }

  private normalizeRefreshIntervalDays(value?: number) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return 7;
    }
    return Math.min(365, Math.floor(normalized));
  }

  private normalizeNextAction(value?: string): OpenClawCreatorWorkNextAction | undefined {
    const normalized = String(value || "").trim();
    if (normalized === "复投" || normalized === "调整" || normalized === "暂停") {
      return normalized;
    }
    return undefined;
  }

  private addDays(isoText: string, days: number) {
    const date = new Date(isoText);
    date.setDate(date.getDate() + Math.max(1, days));
    return date.toISOString();
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

    if (this.prismaService.isLocalSqliteMode()) {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawCreatorCooperationMatch" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_CREATOR_COOPERATION_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "sourceProfileId" TEXT NOT NULL DEFAULT '',
          "creatorId" TEXT NOT NULL,
          "nickname" TEXT NOT NULL DEFAULT '',
          "recommendedReason" TEXT NOT NULL DEFAULT '',
          "snapshotJson" TEXT NOT NULL DEFAULT '{}',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawCreatorCooperationTracking" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_CREATOR_COOPERATION_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "sourceProfileId" TEXT NOT NULL DEFAULT '',
          "creatorId" TEXT NOT NULL,
          "nickname" TEXT NOT NULL DEFAULT '',
          "snapshotJson" TEXT NOT NULL DEFAULT '{}',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawCreatorCooperationWork" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_CREATOR_COOPERATION_WORKSPACE_SCOPE}',
          "trackingId" TEXT NOT NULL,
          "createdByUserId" TEXT NOT NULL,
          "douyinWorkUrl" TEXT NOT NULL DEFAULT '',
          "awemeId" TEXT NOT NULL DEFAULT '',
          "title" TEXT NOT NULL DEFAULT '',
          "coverUrl" TEXT NOT NULL DEFAULT '',
          "playCount" REAL,
          "likeCount" REAL,
          "collectCount" REAL,
          "commentCount" REAL,
          "shareCount" REAL,
          "resultEvaluation" TEXT NOT NULL DEFAULT '',
          "nextAction" TEXT NOT NULL DEFAULT '',
          "refreshIntervalDays" INTEGER NOT NULL DEFAULT 7,
          "lastSyncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "nextRefreshAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastSyncError" TEXT NOT NULL DEFAULT '',
          "rawFieldsJson" TEXT NOT NULL DEFAULT '{}',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawCreatorCooperationMatch" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_CREATOR_COOPERATION_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "sourceProfileId" TEXT NOT NULL DEFAULT '',
          "creatorId" TEXT NOT NULL,
          "nickname" TEXT NOT NULL DEFAULT '',
          "recommendedReason" TEXT NOT NULL DEFAULT '',
          "snapshotJson" TEXT NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawCreatorCooperationTracking" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_CREATOR_COOPERATION_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "sourceProfileId" TEXT NOT NULL DEFAULT '',
          "creatorId" TEXT NOT NULL,
          "nickname" TEXT NOT NULL DEFAULT '',
          "snapshotJson" TEXT NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawCreatorCooperationWork" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_CREATOR_COOPERATION_WORKSPACE_SCOPE}',
          "trackingId" TEXT NOT NULL,
          "createdByUserId" TEXT NOT NULL,
          "douyinWorkUrl" TEXT NOT NULL DEFAULT '',
          "awemeId" TEXT NOT NULL DEFAULT '',
          "title" TEXT NOT NULL DEFAULT '',
          "coverUrl" TEXT NOT NULL DEFAULT '',
          "playCount" DOUBLE PRECISION,
          "likeCount" DOUBLE PRECISION,
          "collectCount" DOUBLE PRECISION,
          "commentCount" DOUBLE PRECISION,
          "shareCount" DOUBLE PRECISION,
          "resultEvaluation" TEXT NOT NULL DEFAULT '',
          "nextAction" TEXT NOT NULL DEFAULT '',
          "refreshIntervalDays" INTEGER NOT NULL DEFAULT 7,
          "lastSyncedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "nextRefreshAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastSyncError" TEXT NOT NULL DEFAULT '',
          "rawFieldsJson" TEXT NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawCreatorCooperationMatch_brand_scope_created_idx"
      ON "OpenClawCreatorCooperationMatch" ("brandId", "workspaceScope", "createdAt" DESC, "updatedAt" DESC)
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawCreatorCooperationMatch_brand_scope_creator_idx"
      ON "OpenClawCreatorCooperationMatch" ("brandId", "workspaceScope", "creatorId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawCreatorCooperationTracking_brand_scope_created_idx"
      ON "OpenClawCreatorCooperationTracking" ("brandId", "workspaceScope", "createdAt" DESC, "updatedAt" DESC)
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawCreatorCooperationTracking_brand_scope_creator_idx"
      ON "OpenClawCreatorCooperationTracking" ("brandId", "workspaceScope", "creatorId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawCreatorCooperationWork_brand_scope_tracking_idx"
      ON "OpenClawCreatorCooperationWork" ("brandId", "workspaceScope", "trackingId", "createdAt" DESC)
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawCreatorCooperationWork_refresh_idx"
      ON "OpenClawCreatorCooperationWork" ("nextRefreshAt")
    `);
  }
}
