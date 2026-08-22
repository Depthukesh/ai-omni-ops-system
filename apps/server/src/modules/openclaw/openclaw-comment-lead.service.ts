import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  CollectorsService,
  type DouyinCollectedTargetUserRecord,
  type XhsCollectedTargetUserRecord,
} from "../collectors/collectors.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type OpenClawWorkspaceScope,
  normalizeOpenClawWorkspaceScope,
} from "./openclaw-workspace-scope";

const OPENCLAW_COMMENT_LEAD_PLATFORMS = ["xiaohongshu", "douyin"] as const;

export type OpenClawCommentLeadPlatform = (typeof OPENCLAW_COMMENT_LEAD_PLATFORMS)[number];

type OpenClawCommentLeadRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  sourcePlatform: string;
  sourceUrl: string;
  sourceCommentId: string | null;
  userName: string;
  userComment: string;
  selectedReason: string;
  userProfileUrl: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawCommentLeadStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  sourcePlatform: OpenClawCommentLeadPlatform;
  sourcePlatformLabel: "小红书" | "抖音";
  sourceUrl: string;
  sourceCommentId?: string;
  userName: string;
  userComment: string;
  selectedReason: string;
  userProfileUrl: string;
  selectedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawCommentLeadRecord = OpenClawCommentLeadStoredRecord;

export type OpenClawCommentLeadWorkspace = {
  items: OpenClawCommentLeadRecord[];
  total: number;
};

export type OpenClawCommentLeadCreateResult = {
  items: OpenClawCommentLeadRecord[];
  createdCount: number;
  updatedCount: number;
  platformCounts: Record<OpenClawCommentLeadPlatform, number>;
};

@Injectable()
export class OpenClawCommentLeadService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: OpenClawCommentLeadStoredRecord[] = [];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly collectorsService: CollectorsService,
  ) {}

  async listWorkspace(params: {
    brandId: string;
    workspaceScope?: string;
    sourcePlatform?: string;
    limit?: number;
  }): Promise<OpenClawCommentLeadWorkspace> {
    const items = await this.listRecords(params);
    return {
      items,
      total: items.length,
    };
  }

  async createLeadsFromCollectors(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    sourcePlatforms?: string[];
    xiaohongshuSourceUrls?: string[];
    douyinSourceUrls?: string[];
    matchKeywords?: string[];
    syncCommentsFirst?: boolean;
  }): Promise<OpenClawCommentLeadCreateResult> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeOpenClawWorkspaceScope(payload.workspaceScope || "all_network_growth");
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const platforms = this.normalizePlatforms(payload.sourcePlatforms);
    const matchKeywords = this.normalizeKeywords(payload.matchKeywords);
    const xiaohongshuSourceUrls = this.normalizeSourceUrls(payload.xiaohongshuSourceUrls);
    const douyinSourceUrls = this.normalizeSourceUrls(payload.douyinSourceUrls);

    const result: OpenClawCommentLeadCreateResult = {
      items: [],
      createdCount: 0,
      updatedCount: 0,
      platformCounts: {
        xiaohongshu: 0,
        douyin: 0,
      },
    };

    if (platforms.includes("xiaohongshu")) {
      const items = await this.collectXiaohongshuLeadCandidates(brandId, xiaohongshuSourceUrls, matchKeywords, payload.syncCommentsFirst === true);
      for (const item of items) {
        const upserted = await this.upsertLead({
          brandId,
          workspaceScope,
          createdByUserId,
          sourcePlatform: "xiaohongshu",
          sourceUrl: item.sourceUrl,
          sourceCommentId: item.sourceCommentId,
          userName: item.nickname,
          userComment: item.commentText || "",
          selectedReason: this.buildSelectedReason("xiaohongshu", item.matchedKeyword),
          userProfileUrl: item.profileUrl || this.buildFallbackLeadIdentityUrl("xiaohongshu", item.userId),
        });
        result.items.push(upserted.item);
        result.platformCounts.xiaohongshu += 1;
        if (upserted.created) {
          result.createdCount += 1;
        } else {
          result.updatedCount += 1;
        }
      }
    }

    if (platforms.includes("douyin")) {
      const items = await this.collectDouyinLeadCandidates(brandId, douyinSourceUrls, matchKeywords, payload.syncCommentsFirst === true);
      for (const item of items) {
        const upserted = await this.upsertLead({
          brandId,
          workspaceScope,
          createdByUserId,
          sourcePlatform: "douyin",
          sourceUrl: item.sourceUrl,
          sourceCommentId: item.sourceCommentId,
          userName: item.nickname,
          userComment: item.commentText || "",
          selectedReason: this.buildSelectedReason("douyin", item.matchedKeyword),
          userProfileUrl: item.profileUrl || this.buildFallbackLeadIdentityUrl("douyin", item.secUserId),
        });
        result.items.push(upserted.item);
        result.platformCounts.douyin += 1;
        if (upserted.created) {
          result.createdCount += 1;
        } else {
          result.updatedCount += 1;
        }
      }
    }

    return result;
  }

  async deleteLead(brandId: string, workspaceScope: string | undefined, leadId: string) {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope || "all_network_growth");
    const normalizedLeadId = this.requireText(leadId, "缺少评论获客 ID");
    const existing = await this.findById(normalizedBrandId, normalizedWorkspaceScope, normalizedLeadId);
    if (!existing) {
      throw new NotFoundException("评论获客记录不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "OpenClawCommentLead"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedLeadId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedLeadId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  private async collectXiaohongshuLeadCandidates(
    brandId: string,
    sourceUrls: string[],
    matchKeywords: string[],
    syncCommentsFirst: boolean,
  ) {
    if (sourceUrls.length) {
      const result = await this.collectorsService.syncTargetUsers(brandId, {
        sourceUrls,
        matchKeywords,
        syncCommentsFirst,
      });
      return result.items.filter((item) => this.isUsableXiaohongshuLead(item));
    }

    const workspace = await this.collectorsService.getXiaohongshuWorkspace(brandId);
    return workspace.targetUsers
      .filter((item) => this.isUsableXiaohongshuLead(item))
      .filter((item) => this.matchLeadKeywords([item.commentText, item.nickname, item.userId], matchKeywords));
  }

  private async collectDouyinLeadCandidates(
    brandId: string,
    sourceUrls: string[],
    matchKeywords: string[],
    syncCommentsFirst: boolean,
  ) {
    if (sourceUrls.length) {
      const result = await this.collectorsService.syncDouyinTargetUsers(brandId, {
        sourceUrls,
        matchKeywords,
        syncCommentsFirst,
      });
      return result.items.filter((item) => this.isUsableDouyinLead(item));
    }

    const workspace = await this.collectorsService.getDouyinWorkspace(brandId);
    return workspace.targetUsers
      .filter((item) => this.isUsableDouyinLead(item))
      .filter((item) => this.matchLeadKeywords([item.commentText, item.nickname, item.secUserId], matchKeywords));
  }

  private isUsableXiaohongshuLead(item: XhsCollectedTargetUserRecord) {
    return Boolean(String(item.profileUrl || "").trim() && String(item.nickname || "").trim());
  }

  private isUsableDouyinLead(item: DouyinCollectedTargetUserRecord) {
    return Boolean(String(item.profileUrl || "").trim() && String(item.nickname || "").trim());
  }

  private matchLeadKeywords(fields: Array<string | undefined>, keywords: string[]) {
    if (!keywords.length) {
      return true;
    }
    const haystack = fields
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean);
    return keywords.some((keyword) => haystack.some((value) => value.includes(keyword)));
  }

  private buildSelectedReason(platform: OpenClawCommentLeadPlatform, matchedKeyword?: string) {
    if (matchedKeyword) {
      return `评论命中关键词「${matchedKeyword}」`;
    }
    return `${this.getPlatformLabel(platform)}评论用户已进入评论获客候选列表`;
  }

  private buildFallbackLeadIdentityUrl(platform: OpenClawCommentLeadPlatform, identity?: string) {
    const normalized = String(identity || "").trim();
    if (!normalized) {
      return "";
    }
    return platform === "douyin"
      ? `https://www.douyin.com/user/${normalized}`
      : `https://www.xiaohongshu.com/user/profile/${normalized}`;
  }

  private async upsertLead(payload: {
    brandId: string;
    workspaceScope: OpenClawWorkspaceScope;
    createdByUserId: string;
    sourcePlatform: OpenClawCommentLeadPlatform;
    sourceUrl: string;
    sourceCommentId?: string;
    userName: string;
    userComment: string;
    selectedReason: string;
    userProfileUrl: string;
  }) {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeOpenClawWorkspaceScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const sourcePlatform = this.normalizePlatform(payload.sourcePlatform);
    const sourceUrl = this.requireText(payload.sourceUrl, "缺少来源作品链接", 1000);
    const sourceCommentId = this.normalizeOptionalText(payload.sourceCommentId, 200);
    const userName = this.requireText(payload.userName, "缺少用户名", 200);
    const userComment = this.normalizeOptionalText(payload.userComment, 5000);
    const selectedReason = this.requireText(payload.selectedReason, "缺少入选理由", 500);
    const userProfileUrl = this.requireText(payload.userProfileUrl, "缺少用户主页", 1000);

    const existing = await this.findExistingLead({
      brandId,
      workspaceScope,
      sourcePlatform,
      sourceUrl,
      sourceCommentId,
      userProfileUrl,
    });

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      if (existing) {
        await this.prismaService.$executeRaw`
          UPDATE "OpenClawCommentLead"
          SET "createdByUserId" = ${createdByUserId},
              "sourceUrl" = ${sourceUrl},
              "sourceCommentId" = ${sourceCommentId || null},
              "userName" = ${userName},
              "userComment" = ${userComment},
              "selectedReason" = ${selectedReason},
              "userProfileUrl" = ${userProfileUrl},
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${existing.id}
        `;
        const updated = await this.findById(brandId, workspaceScope, existing.id);
        if (!updated) {
          throw new NotFoundException("评论获客记录更新后未找到");
        }
        return { item: updated, created: false };
      }

      const id = `openclaw_comment_lead_${randomUUID()}`;
      await this.prismaService.$executeRaw`
        INSERT INTO "OpenClawCommentLead" (
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "sourcePlatform",
          "sourceUrl",
          "sourceCommentId",
          "userName",
          "userComment",
          "selectedReason",
          "userProfileUrl",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${brandId},
          ${workspaceScope},
          ${createdByUserId},
          ${sourcePlatform},
          ${sourceUrl},
          ${sourceCommentId || null},
          ${userName},
          ${userComment},
          ${selectedReason},
          ${userProfileUrl},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const created = await this.findById(brandId, workspaceScope, id);
      if (!created) {
        throw new NotFoundException("评论获客记录创建后未找到");
      }
      return { item: created, created: true };
    }

    const now = new Date().toISOString();
    if (existing) {
      const updated: OpenClawCommentLeadStoredRecord = {
        ...existing,
        createdByUserId,
        sourceUrl,
        ...(sourceCommentId ? { sourceCommentId } : {}),
        userName,
        userComment,
        selectedReason,
        userProfileUrl,
        updatedAt: now,
      };
      const index = this.fallbackItems.findIndex((item) => item.id === existing.id);
      if (index >= 0) {
        this.fallbackItems[index] = updated;
      }
      return { item: updated, created: false };
    }

    const created: OpenClawCommentLeadStoredRecord = {
      id: `openclaw_comment_lead_${randomUUID()}`,
      brandId,
      workspaceScope,
      createdByUserId,
      sourcePlatform,
      sourcePlatformLabel: this.getPlatformLabel(sourcePlatform),
      sourceUrl,
      ...(sourceCommentId ? { sourceCommentId } : {}),
      userName,
      userComment,
      selectedReason,
      userProfileUrl,
      selectedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(created);
    return { item: created, created: true };
  }

  private async listRecords(params: {
    brandId: string;
    workspaceScope?: string;
    sourcePlatform?: string;
    limit?: number;
  }) {
    const brandId = this.requireText(params.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeOpenClawWorkspaceScope(params.workspaceScope || "all_network_growth");
    const sourcePlatform = this.normalizeOptionalPlatform(params.sourcePlatform);
    const limit = this.normalizeLimit(params.limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = sourcePlatform
        ? await this.prismaService.$queryRaw<OpenClawCommentLeadRow[]>`
          SELECT
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "sourcePlatform",
            "sourceUrl",
            "sourceCommentId",
            "userName",
            "userComment",
            "selectedReason",
            "userProfileUrl",
            "createdAt",
            "updatedAt"
          FROM "OpenClawCommentLead"
          WHERE "brandId" = ${brandId}
            AND "workspaceScope" = ${workspaceScope}
            AND "sourcePlatform" = ${sourcePlatform}
          ORDER BY "createdAt" DESC
          LIMIT ${limit}
        `
        : await this.prismaService.$queryRaw<OpenClawCommentLeadRow[]>`
          SELECT
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "sourcePlatform",
            "sourceUrl",
            "sourceCommentId",
            "userName",
            "userComment",
            "selectedReason",
            "userProfileUrl",
            "createdAt",
            "updatedAt"
          FROM "OpenClawCommentLead"
          WHERE "brandId" = ${brandId}
            AND "workspaceScope" = ${workspaceScope}
          ORDER BY "createdAt" DESC
          LIMIT ${limit}
        `;
      return rows.map((row) => this.normalizeRow(row));
    }

    return this.fallbackItems
      .filter((item) => item.brandId === brandId && item.workspaceScope === workspaceScope)
      .filter((item) => !sourcePlatform || item.sourcePlatform === sourcePlatform)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  private async findById(brandId: string, workspaceScope: OpenClawWorkspaceScope, leadId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawCommentLeadRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "sourcePlatform",
          "sourceUrl",
          "sourceCommentId",
          "userName",
          "userComment",
          "selectedReason",
          "userProfileUrl",
          "createdAt",
          "updatedAt"
        FROM "OpenClawCommentLead"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
          AND "id" = ${leadId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === workspaceScope && item.id === leadId,
    );
  }

  private async findExistingLead(params: {
    brandId: string;
    workspaceScope: OpenClawWorkspaceScope;
    sourcePlatform: OpenClawCommentLeadPlatform;
    sourceUrl: string;
    sourceCommentId?: string;
    userProfileUrl: string;
  }) {
    const sourceCommentId = this.normalizeOptionalText(params.sourceCommentId, 200);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = sourceCommentId
        ? await this.prismaService.$queryRaw<OpenClawCommentLeadRow[]>`
          SELECT
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "sourcePlatform",
            "sourceUrl",
            "sourceCommentId",
            "userName",
            "userComment",
            "selectedReason",
            "userProfileUrl",
            "createdAt",
            "updatedAt"
          FROM "OpenClawCommentLead"
          WHERE "brandId" = ${params.brandId}
            AND "workspaceScope" = ${params.workspaceScope}
            AND "sourcePlatform" = ${params.sourcePlatform}
            AND "sourceCommentId" = ${sourceCommentId}
          LIMIT 1
        `
        : await this.prismaService.$queryRaw<OpenClawCommentLeadRow[]>`
          SELECT
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "sourcePlatform",
            "sourceUrl",
            "sourceCommentId",
            "userName",
            "userComment",
            "selectedReason",
            "userProfileUrl",
            "createdAt",
            "updatedAt"
          FROM "OpenClawCommentLead"
          WHERE "brandId" = ${params.brandId}
            AND "workspaceScope" = ${params.workspaceScope}
            AND "sourcePlatform" = ${params.sourcePlatform}
            AND "sourceUrl" = ${params.sourceUrl}
            AND "userProfileUrl" = ${params.userProfileUrl}
          LIMIT 1
        `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find((item) => {
      if (
        item.brandId !== params.brandId
        || item.workspaceScope !== params.workspaceScope
        || item.sourcePlatform !== params.sourcePlatform
      ) {
        return false;
      }
      if (sourceCommentId) {
        return item.sourceCommentId === sourceCommentId;
      }
      return item.sourceUrl === params.sourceUrl && item.userProfileUrl === params.userProfileUrl;
    });
  }

  private normalizeRow(row: OpenClawCommentLeadRow): OpenClawCommentLeadStoredRecord {
    const sourcePlatform = this.normalizePlatform(row.sourcePlatform);
    const createdAt = this.normalizeDate(row.createdAt);
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeOpenClawWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      sourcePlatform,
      sourcePlatformLabel: this.getPlatformLabel(sourcePlatform),
      sourceUrl: String(row.sourceUrl || "").trim(),
      ...(String(row.sourceCommentId || "").trim() ? { sourceCommentId: String(row.sourceCommentId || "").trim() } : {}),
      userName: String(row.userName || "").trim(),
      userComment: String(row.userComment || "").trim(),
      selectedReason: String(row.selectedReason || "").trim(),
      userProfileUrl: String(row.userProfileUrl || "").trim(),
      selectedAt: createdAt,
      createdAt,
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private normalizeDate(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value || new Date().toISOString());
  }

  private requireText(value: string | undefined, message: string, maxLength = 200) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }
    return normalized.slice(0, maxLength);
  }

  private normalizeOptionalText(value: string | undefined, maxLength = 200) {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, maxLength) : "";
  }

  private normalizePlatforms(values?: string[]) {
    if (!Array.isArray(values) || !values.length) {
      return [...OPENCLAW_COMMENT_LEAD_PLATFORMS];
    }
    return Array.from(new Set(values.map((item) => this.normalizePlatform(item))));
  }

  private normalizePlatform(value?: string): OpenClawCommentLeadPlatform {
    const normalized = String(value || "").trim().toLowerCase();
    if (!OPENCLAW_COMMENT_LEAD_PLATFORMS.includes(normalized as OpenClawCommentLeadPlatform)) {
      throw new BadRequestException("sourcePlatform 仅支持 xiaohongshu 或 douyin");
    }
    return normalized as OpenClawCommentLeadPlatform;
  }

  private normalizeOptionalPlatform(value?: string) {
    const normalized = String(value || "").trim();
    return normalized ? this.normalizePlatform(normalized) : undefined;
  }

  private normalizeKeywords(values?: string[]) {
    return Array.from(
      new Set(
        (values ?? [])
          .map((item) => String(item || "").trim().toLowerCase())
          .filter(Boolean),
      ),
    );
  }

  private normalizeSourceUrls(values?: string[]) {
    return Array.from(
      new Set(
        (values ?? [])
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
  }

  private normalizeLimit(limit?: number) {
    if (!Number.isFinite(limit) || Number(limit) <= 0) {
      return 100;
    }
    return Math.min(200, Math.floor(Number(limit)));
  }

  private getPlatformLabel(platform: OpenClawCommentLeadPlatform) {
    return platform === "douyin" ? "抖音" : "小红书";
  }

  private async ensureTableReady() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapTable();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapTable() {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
    }
    if (this.prismaService.isLocalSqliteMode()) {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawCommentLead" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "sourcePlatform" TEXT NOT NULL DEFAULT '',
          "sourceUrl" TEXT NOT NULL DEFAULT '',
          "sourceCommentId" TEXT,
          "userName" TEXT NOT NULL DEFAULT '',
          "userComment" TEXT NOT NULL DEFAULT '',
          "selectedReason" TEXT NOT NULL DEFAULT '',
          "userProfileUrl" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("OpenClawCommentLead", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "createdByUserId", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "sourcePlatform", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "sourceUrl", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "sourceCommentId", definition: "TEXT" },
        { name: "userName", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "userComment", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "selectedReason", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "userProfileUrl", definition: "TEXT NOT NULL DEFAULT ''" },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawCommentLead" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "sourcePlatform" TEXT NOT NULL DEFAULT '',
          "sourceUrl" TEXT NOT NULL DEFAULT '',
          "sourceCommentId" TEXT,
          "userName" TEXT NOT NULL DEFAULT '',
          "userComment" TEXT NOT NULL DEFAULT '',
          "selectedReason" TEXT NOT NULL DEFAULT '',
          "userProfileUrl" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawCommentLead"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawCommentLead"
        ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawCommentLead"
        ADD COLUMN IF NOT EXISTS "sourcePlatform" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawCommentLead"
        ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawCommentLead"
        ADD COLUMN IF NOT EXISTS "sourceCommentId" TEXT
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawCommentLead"
        ADD COLUMN IF NOT EXISTS "userName" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawCommentLead"
        ADD COLUMN IF NOT EXISTS "userComment" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawCommentLead"
        ADD COLUMN IF NOT EXISTS "selectedReason" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawCommentLead"
        ADD COLUMN IF NOT EXISTS "userProfileUrl" TEXT NOT NULL DEFAULT ''
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "OpenClawCommentLead"
      SET "workspaceScope" = 'all_network_growth'
      WHERE COALESCE(NULLIF(TRIM("workspaceScope"), ''), '') IN ('', '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}')
        AND COALESCE(NULLIF(TRIM("sourcePlatform"), ''), '') <> ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawCommentLead_brand_scope_platform_created_idx"
      ON "OpenClawCommentLead" ("brandId", "workspaceScope", "sourcePlatform", "createdAt" DESC)
    `);
  }
}
