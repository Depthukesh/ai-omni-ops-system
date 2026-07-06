import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type OpenClawWorkspaceScope,
  normalizeOpenClawWorkspaceScope,
} from "./openclaw-workspace-scope";

type OpenClawGeoVisibilityReportRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  title: string;
  description: string;
  htmlContent: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawGeoVisibilityReportStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  title: string;
  description: string;
  htmlContent: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawGeoVisibilityReportRecord = OpenClawGeoVisibilityReportStoredRecord;

export type OpenClawGeoVisibilityReportWorkspace = {
  items: OpenClawGeoVisibilityReportRecord[];
  total: number;
};

@Injectable()
export class OpenClawGeoVisibilityReportService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: OpenClawGeoVisibilityReportStoredRecord[] = [];

  constructor(private readonly prismaService: PrismaService) {}

  async listWorkspace(brandId: string, workspaceScope?: string, limit?: number): Promise<OpenClawGeoVisibilityReportWorkspace> {
    const items = await this.listRecords(brandId, workspaceScope, limit);
    return {
      items,
      total: items.length,
    };
  }

  async createReport(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    title?: string;
    description?: string;
    htmlContent?: string;
  }): Promise<OpenClawGeoVisibilityReportRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeOpenClawWorkspaceScope(payload.workspaceScope || "geo");
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const title = this.requireText(payload.title, "请填写报告标题", 160);
    const description = this.requireOptionalText(payload.description, 10_000);
    const htmlContent = this.requireHtmlContent(payload.htmlContent);
    const id = `openclaw_geo_visibility_report_${randomUUID()}`;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        INSERT INTO "OpenClawGeoVisibilityReport" (
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "title",
          "description",
          "htmlContent",
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
          ${htmlContent},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, id);
      if (!stored) {
        throw new NotFoundException("GEO 可见度诊断报告创建后未找到记录");
      }
      return stored;
    }

    const now = new Date().toISOString();
    const stored: OpenClawGeoVisibilityReportStoredRecord = {
      id,
      brandId,
      workspaceScope,
      createdByUserId,
      title,
      description,
      htmlContent,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(stored);
    return stored;
  }

  async deleteReport(brandId: string, workspaceScope: string | undefined, reportId: string): Promise<OpenClawGeoVisibilityReportRecord> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope || "geo");
    const normalizedReportId = this.requireText(reportId, "缺少报告 ID");
    const existing = await this.findRecordById(normalizedBrandId, normalizedWorkspaceScope, normalizedReportId);
    if (!existing) {
      throw new NotFoundException("GEO 可见度诊断报告不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "OpenClawGeoVisibilityReport"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedReportId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedReportId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  async getReportById(brandId: string, workspaceScope: string | undefined, reportId: string) {
    return this.findRecordById(brandId, workspaceScope, reportId);
  }

  private async listRecords(brandId: string, workspaceScope: string | undefined, limit?: number): Promise<OpenClawGeoVisibilityReportRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope || "geo");
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawGeoVisibilityReportRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "title",
          "description",
          "htmlContent",
          "createdAt",
          "updatedAt"
        FROM "OpenClawGeoVisibilityReport"
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
    reportId: string,
  ): Promise<OpenClawGeoVisibilityReportRecord | undefined> {
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope || "geo");
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawGeoVisibilityReportRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "title",
          "description",
          "htmlContent",
          "createdAt",
          "updatedAt"
        FROM "OpenClawGeoVisibilityReport"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${reportId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === normalizedWorkspaceScope && item.id === reportId,
    );
  }

  private normalizeRow(row: OpenClawGeoVisibilityReportRow): OpenClawGeoVisibilityReportStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeOpenClawWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      title: String(row.title || "").trim(),
      description: String(row.description || "").trim(),
      htmlContent: String(row.htmlContent || "").trim(),
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

  private requireHtmlContent(value: string | undefined) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new BadRequestException("请提供 htmlContent");
    }
    return normalized.slice(0, 2_000_000);
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
      CREATE TABLE IF NOT EXISTS "OpenClawGeoVisibilityReport" (
        "id" TEXT PRIMARY KEY,
        "brandId" TEXT NOT NULL,
        "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
        "createdByUserId" TEXT NOT NULL,
        "title" TEXT NOT NULL DEFAULT '',
        "description" TEXT NOT NULL DEFAULT '',
        "htmlContent" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawGeoVisibilityReport"
      ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawGeoVisibilityReport"
      ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawGeoVisibilityReport"
      ADD COLUMN IF NOT EXISTS "htmlContent" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "OpenClawGeoVisibilityReport"
      SET "workspaceScope" = 'geo'
      WHERE COALESCE(NULLIF(TRIM("workspaceScope"), ''), '') = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawGeoVisibilityReport_brand_scope_created_idx"
      ON "OpenClawGeoVisibilityReport" ("brandId", "workspaceScope", "createdAt" DESC)
    `);
  }
}
