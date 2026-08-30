import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type OpenClawWorkspaceScope,
  normalizeOpenClawWorkspaceScope,
} from "./openclaw-workspace-scope";

type OpenClawStrategyOptimizationRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  generatedAt: Date | string;
  title: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawStrategyOptimizationStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  generatedAt: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawStrategyOptimizationRecord = OpenClawStrategyOptimizationStoredRecord;

export type OpenClawStrategyOptimizationWorkspace = {
  items: OpenClawStrategyOptimizationRecord[];
  total: number;
};

@Injectable()
export class OpenClawStrategyOptimizationService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: OpenClawStrategyOptimizationStoredRecord[] = [];

  constructor(private readonly prismaService: PrismaService) {}

  async listWorkspace(brandId: string, workspaceScope?: string, limit?: number): Promise<OpenClawStrategyOptimizationWorkspace> {
    const items = await this.listRecords(brandId, workspaceScope, limit);
    return {
      items,
      total: items.length,
    };
  }

  async createRecord(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    generatedAt?: string;
    title?: string;
    content?: string;
  }): Promise<OpenClawStrategyOptimizationRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeOpenClawWorkspaceScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const generatedAt = this.normalizeGeneratedAt(payload.generatedAt);
    const title = this.requireText(payload.title, "请填写标题", 120);
    const content = this.requireText(payload.content, "请填写内容", 20_000);
    const id = `openclaw_strategy_optimization_${randomUUID()}`;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        INSERT INTO "OpenClawStrategyOptimization" (
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "generatedAt",
          "title",
          "content",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${brandId},
          ${workspaceScope},
          ${createdByUserId},
          ${generatedAt},
          ${title},
          ${content},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, id);
      if (!stored) {
        throw new NotFoundException("策略优化记录创建后未找到记录");
      }
      return stored;
    }

    const now = new Date().toISOString();
    const stored: OpenClawStrategyOptimizationStoredRecord = {
      id,
      brandId,
      workspaceScope,
      createdByUserId,
      generatedAt,
      title,
      content,
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(stored);
    return stored;
  }

  async deleteRecord(brandId: string, workspaceScope: string | undefined, recordId: string): Promise<OpenClawStrategyOptimizationRecord> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope);
    const normalizedRecordId = this.requireText(recordId, "缺少策略优化记录 ID");
    const existing = await this.findRecordById(normalizedBrandId, normalizedWorkspaceScope, normalizedRecordId);
    if (!existing) {
      throw new NotFoundException("策略优化记录不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "OpenClawStrategyOptimization"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedRecordId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedRecordId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  async updateRecord(payload: {
    brandId: string;
    workspaceScope?: string;
    recordId: string;
    title?: string;
    content?: string;
  }): Promise<OpenClawStrategyOptimizationRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeOpenClawWorkspaceScope(payload.workspaceScope);
    const recordId = this.requireText(payload.recordId, "缺少策略优化记录 ID");
    const existing = await this.findRecordById(brandId, workspaceScope, recordId);
    if (!existing) {
      throw new NotFoundException("策略优化记录不存在或已删除");
    }

    const title = this.requireText(payload.title ?? existing.title, "请填写标题", 120);
    const content = this.requireText(payload.content ?? existing.content, "请填写内容", 20_000);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        UPDATE "OpenClawStrategyOptimization"
        SET "title" = ${title},
            "content" = ${content},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
          AND "id" = ${recordId}
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, recordId);
      if (!stored) {
        throw new NotFoundException("策略优化记录更新后未找到记录");
      }
      return stored;
    }

    const index = this.fallbackItems.findIndex(
      (item) => item.brandId === brandId && item.workspaceScope === workspaceScope && item.id === recordId,
    );
    if (index < 0) {
      throw new NotFoundException("策略优化记录不存在或已删除");
    }
    const updated: OpenClawStrategyOptimizationStoredRecord = {
      ...this.fallbackItems[index],
      title,
      content,
      updatedAt: new Date().toISOString(),
    };
    this.fallbackItems.splice(index, 1, updated);
    return updated;
  }

  private async listRecords(
    brandId: string,
    workspaceScope: string | undefined,
    limit?: number,
  ): Promise<OpenClawStrategyOptimizationRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope);
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawStrategyOptimizationRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "generatedAt",
          "title",
          "content",
          "createdAt",
          "updatedAt"
        FROM "OpenClawStrategyOptimization"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
        ORDER BY "generatedAt" DESC, "createdAt" DESC
        LIMIT ${resolvedLimit}
      `;
      return rows.map((item) => this.normalizeRow(item));
    }

    return this.fallbackItems
      .filter((item) => item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope)
      .sort((left, right) => {
        if (left.generatedAt === right.generatedAt) {
          return right.createdAt.localeCompare(left.createdAt);
        }
        return right.generatedAt.localeCompare(left.generatedAt);
      })
      .slice(0, resolvedLimit);
  }

  private async findRecordById(
    brandId: string,
    workspaceScope: string | undefined,
    recordId: string,
  ): Promise<OpenClawStrategyOptimizationRecord | undefined> {
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawStrategyOptimizationRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "generatedAt",
          "title",
          "content",
          "createdAt",
          "updatedAt"
        FROM "OpenClawStrategyOptimization"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${recordId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === normalizedWorkspaceScope && item.id === recordId,
    );
  }

  private normalizeRow(row: OpenClawStrategyOptimizationRow): OpenClawStrategyOptimizationStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeOpenClawWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      generatedAt: this.normalizeDate(row.generatedAt),
      title: String(row.title || "").trim(),
      content: String(row.content || "").trim(),
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

  private normalizeGeneratedAt(value?: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return new Date().toISOString();
    }
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("生成时间格式不正确");
    }
    return parsed.toISOString();
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
    if (this.prismaService.isLocalSqliteMode()) {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawStrategyOptimization" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "title" TEXT NOT NULL DEFAULT '',
          "content" TEXT NOT NULL DEFAULT '',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("OpenClawStrategyOptimization", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "generatedAt", definition: "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP" },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawStrategyOptimization" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "title" TEXT NOT NULL DEFAULT '',
          "content" TEXT NOT NULL DEFAULT '',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawStrategyOptimization"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawStrategyOptimization"
        ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "OpenClawStrategyOptimization"
      SET "workspaceScope" = '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      WHERE "workspaceScope" IS NULL
         OR TRIM("workspaceScope") = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawStrategyOptimization_brand_generated_idx"
      ON "OpenClawStrategyOptimization" ("brandId", "generatedAt" DESC, "createdAt" DESC)
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawStrategyOptimization_brand_scope_generated_idx"
      ON "OpenClawStrategyOptimization" ("brandId", "workspaceScope", "generatedAt" DESC, "createdAt" DESC)
    `);
  }
}
