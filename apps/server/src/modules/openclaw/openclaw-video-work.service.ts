import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type OpenClawWorkspaceScope,
  normalizeOpenClawWorkspaceScope,
} from "./openclaw-workspace-scope";

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

type OpenClawVideoWorkStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  title: string;
  description: string;
  scriptContent: string;
  coverImageUrl?: string;
  videoUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawVideoWorkRecord = OpenClawVideoWorkStoredRecord;

export type OpenClawVideoWorkWorkspace = {
  items: OpenClawVideoWorkRecord[];
  total: number;
};

@Injectable()
export class OpenClawVideoWorkService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: OpenClawVideoWorkStoredRecord[] = [];

  constructor(private readonly prismaService: PrismaService) {}

  async listWorkspace(brandId: string, workspaceScope?: string, limit?: number): Promise<OpenClawVideoWorkWorkspace> {
    const items = await this.listRecords(brandId, workspaceScope, limit);
    return {
      items,
      total: items.length,
    };
  }

  async createVideoWork(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    title?: string;
    description?: string;
    scriptContent?: string;
    coverImageUrl?: string;
    videoUrl?: string;
  }): Promise<OpenClawVideoWorkRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeOpenClawWorkspaceScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const title = this.requireText(payload.title, "请填写作品标题", 160);
    const description = this.requireOptionalText(payload.description, 10_000);
    const scriptContent = this.requireOptionalText(payload.scriptContent, 50_000);
    const coverImageUrl = this.requireOptionalUrl(payload.coverImageUrl);
    const videoUrl = this.requireRequiredUrl(payload.videoUrl, "请提供作品视频地址");
    const id = `openclaw_video_work_${randomUUID()}`;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
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
          ${scriptContent},
          ${coverImageUrl},
          ${videoUrl},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, id);
      if (!stored) {
        throw new NotFoundException("视频作品创建后未找到记录");
      }
      return stored;
    }

    const now = new Date().toISOString();
    const stored: OpenClawVideoWorkStoredRecord = {
      id,
      brandId,
      workspaceScope,
      createdByUserId,
      title,
      description,
      scriptContent,
      ...(coverImageUrl ? { coverImageUrl } : {}),
      videoUrl,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(stored);
    return stored;
  }

  async deleteVideoWork(brandId: string, workspaceScope: string | undefined, workId: string): Promise<OpenClawVideoWorkRecord> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope);
    const normalizedWorkId = this.requireText(workId, "缺少作品 ID");
    const existing = await this.findRecordById(normalizedBrandId, normalizedWorkspaceScope, normalizedWorkId);
    if (!existing) {
      throw new NotFoundException("视频作品不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "OpenClawVideoWork"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedWorkId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedWorkId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  async getVideoWorkById(brandId: string, workspaceScope: string | undefined, workId: string) {
    return this.findRecordById(brandId, workspaceScope, workId);
  }

  private async listRecords(brandId: string, workspaceScope: string | undefined, limit?: number): Promise<OpenClawVideoWorkRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope);
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
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
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
        ORDER BY "createdAt" DESC
        LIMIT ${resolvedLimit}
      `;
      return rows.map((item) => this.normalizeRow(item));
    }

    return this.fallbackItems
      .filter((item) => item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, resolvedLimit);
  }

  private async findRecordById(
    brandId: string,
    workspaceScope: string | undefined,
    workId: string,
  ): Promise<OpenClawVideoWorkRecord | undefined> {
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
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
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${workId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === normalizedWorkspaceScope && item.id === workId,
    );
  }

  private normalizeRow(row: OpenClawVideoWorkRow): OpenClawVideoWorkStoredRecord {
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
      createdAt: this.normalizeDate(row.createdAt),
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

  private requireOptionalText(value: string | undefined, maxLength = 10_000) {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, maxLength) : "";
  }

  private requireOptionalUrl(value?: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "";
    }
    if (!/^https?:\/\//i.test(normalized)) {
      throw new BadRequestException("封面地址必须为 http/https URL");
    }
    return normalized.slice(0, 2000);
  }

  private requireRequiredUrl(value: string | undefined, message: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }
    if (!/^https?:\/\//i.test(normalized)) {
      throw new BadRequestException("视频地址必须为 http/https URL");
    }
    return normalized.slice(0, 2000);
  }

  private normalizeLimit(limit?: number) {
    if (!Number.isFinite(limit) || Number(limit) <= 0) {
      return 100;
    }
    return Math.min(200, Math.floor(Number(limit)));
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
}
