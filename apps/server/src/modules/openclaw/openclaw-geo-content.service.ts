import { randomUUID } from "node:crypto";
import { Inject, BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OssStorageService } from "../../storage/oss-storage.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  type OpenClawWorkspaceScope,
  normalizeOpenClawWorkspaceScope,
} from "./openclaw-workspace-scope";
import {
  type OpenClawGeoContentGenerationMode,
  type OpenClawGeoContentType,
  getOpenClawGeoContentAttachmentLabel,
  getOpenClawGeoContentGenerationMode,
  getOpenClawGeoContentLabel,
  listOpenClawGeoContentCatalog,
  normalizeOpenClawGeoContentType,
} from "./openclaw-geo-content-catalog";

type OpenClawGeoContentRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  contentType: string;
  title: string;
  description: string;
  htmlContent: string;
  attachmentFileUrl: string | null;
  attachmentFileName: string | null;
  attachmentMimeType: string | null;
  attachmentStorageKey: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawGeoContentStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  contentType: OpenClawGeoContentType;
  sectionLabel: string;
  generationMode: OpenClawGeoContentGenerationMode;
  title: string;
  description: string;
  htmlContent: string;
  attachmentLabel: string;
  attachmentFileUrl?: string;
  attachmentFileName?: string;
  attachmentMimeType?: string;
  attachmentStorageKey?: string;
  storageAddress?: string;
  createdAt: string;
  updatedAt: string;
};

type OpenClawGeoContentUploadPayload = {
  fileName?: string;
  contentType?: string;
  dataBase64?: string;
};

export type OpenClawGeoContentRecord = OpenClawGeoContentStoredRecord;

export type OpenClawGeoContentWorkspace = {
  items: OpenClawGeoContentRecord[];
  total: number;
};

@Injectable()
export class OpenClawGeoContentService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: OpenClawGeoContentStoredRecord[] = [];

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(OssStorageService)
    private readonly ossStorageService: OssStorageService,
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
  ) {}

  async listWorkspace(
    brandId: string,
    workspaceScope?: string,
    options?: {
      contentType?: string;
      limit?: number;
    },
  ): Promise<OpenClawGeoContentWorkspace> {
    const items = await this.listRecords(brandId, workspaceScope, options?.contentType, options?.limit);
    return {
      items,
      total: items.length,
    };
  }

  async createContent(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    contentType?: string;
    title?: string;
    description?: string;
    htmlContent?: string;
    attachmentFileUrl?: string;
    attachmentFileName?: string;
    attachmentMimeType?: string;
    attachmentStorageKey?: string;
    attachmentUpload?: OpenClawGeoContentUploadPayload;
  }): Promise<OpenClawGeoContentRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeOpenClawWorkspaceScope(payload.workspaceScope || "geo");
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const contentType = this.requireContentType(payload.contentType);
    const title = this.requireText(payload.title, "请填写内容标题", 160);
    const description = this.requireOptionalText(payload.description, 10_000);
    const htmlContent = this.requireHtmlContent(payload.htmlContent);
    let attachmentFileUrl = this.requireOptionalUrl(payload.attachmentFileUrl);
    let attachmentFileName = this.requireOptionalText(payload.attachmentFileName, 260);
    let attachmentMimeType = this.requireOptionalText(payload.attachmentMimeType, 160);
    let attachmentStorageKey = this.requireOptionalText(payload.attachmentStorageKey, 500);
    const attachmentUpload = this.normalizeUploadPayload(payload.attachmentUpload);

    if (attachmentUpload) {
      const uploaded = await this.persistAttachmentFile(brandId, contentType, attachmentUpload, title);
      attachmentFileUrl = uploaded.attachmentFileUrl;
      attachmentFileName = attachmentFileName || uploaded.attachmentFileName;
      attachmentMimeType = attachmentMimeType || uploaded.attachmentMimeType;
      attachmentStorageKey = uploaded.attachmentStorageKey;
    } else if (attachmentStorageKey && !attachmentFileUrl) {
      attachmentFileUrl = this.buildAttachmentFileUrl(brandId, attachmentStorageKey);
    } else if (attachmentFileUrl && !attachmentStorageKey) {
      attachmentStorageKey = this.resolveStorageKeyFromFileUrl(brandId, attachmentFileUrl);
    }

    const id = `openclaw_geo_content_${randomUUID()}`;
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        INSERT INTO "OpenClawGeoContent" (
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "contentType",
          "title",
          "description",
          "htmlContent",
          "attachmentFileUrl",
          "attachmentFileName",
          "attachmentMimeType",
          "attachmentStorageKey",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${brandId},
          ${workspaceScope},
          ${createdByUserId},
          ${contentType},
          ${title},
          ${description},
          ${htmlContent},
          ${attachmentFileUrl || null},
          ${attachmentFileName || null},
          ${attachmentMimeType || null},
          ${attachmentStorageKey || null},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, id);
      if (!stored) {
        throw new NotFoundException("GEO 内容创建后未找到记录");
      }
      return stored;
    }

    const now = new Date().toISOString();
    const stored: OpenClawGeoContentStoredRecord = {
      id,
      brandId,
      workspaceScope,
      createdByUserId,
      contentType,
      sectionLabel: getOpenClawGeoContentLabel(contentType),
      generationMode: getOpenClawGeoContentGenerationMode(contentType),
      title,
      description,
      htmlContent,
      attachmentLabel: getOpenClawGeoContentAttachmentLabel(contentType),
      ...(attachmentFileUrl ? { attachmentFileUrl } : {}),
      ...(attachmentFileName ? { attachmentFileName } : {}),
      ...(attachmentMimeType ? { attachmentMimeType } : {}),
      ...(attachmentStorageKey ? { attachmentStorageKey } : {}),
      ...(attachmentStorageKey ? { storageAddress: this.buildStorageAddress(attachmentStorageKey) } : {}),
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(stored);
    return stored;
  }

  async deleteContent(brandId: string, workspaceScope: string | undefined, contentId: string): Promise<OpenClawGeoContentRecord> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope || "geo");
    const normalizedContentId = this.requireText(contentId, "缺少内容 ID");
    const existing = await this.findRecordById(normalizedBrandId, normalizedWorkspaceScope, normalizedContentId);
    if (!existing) {
      throw new NotFoundException("GEO 内容不存在或已删除");
    }
    if (existing.attachmentStorageKey) {
      await this.ossStorageService.deleteObject(existing.attachmentStorageKey).catch(() => false);
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "OpenClawGeoContent"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedContentId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedContentId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  async getContentById(brandId: string, workspaceScope: string | undefined, contentId: string) {
    return this.findRecordById(brandId, workspaceScope, contentId);
  }

  private async listRecords(
    brandId: string,
    workspaceScope: string | undefined,
    contentType?: string,
    limit?: number,
  ): Promise<OpenClawGeoContentRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope || "geo");
    const normalizedContentType = this.normalizeOptionalContentType(contentType);
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = normalizedContentType
        ? await this.prismaService.$queryRaw<OpenClawGeoContentRow[]>`
          SELECT
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "contentType",
            "title",
            "description",
            "htmlContent",
            "attachmentFileUrl",
            "attachmentFileName",
            "attachmentMimeType",
            "attachmentStorageKey",
            "createdAt",
            "updatedAt"
          FROM "OpenClawGeoContent"
          WHERE "brandId" = ${normalizedBrandId}
            AND "workspaceScope" = ${normalizedWorkspaceScope}
            AND "contentType" = ${normalizedContentType}
          ORDER BY "createdAt" DESC
          LIMIT ${resolvedLimit}
        `
        : await this.prismaService.$queryRaw<OpenClawGeoContentRow[]>`
          SELECT
            "id",
            "brandId",
            "workspaceScope",
            "createdByUserId",
            "contentType",
            "title",
            "description",
            "htmlContent",
            "attachmentFileUrl",
            "attachmentFileName",
            "attachmentMimeType",
            "attachmentStorageKey",
            "createdAt",
            "updatedAt"
          FROM "OpenClawGeoContent"
          WHERE "brandId" = ${normalizedBrandId}
            AND "workspaceScope" = ${normalizedWorkspaceScope}
          ORDER BY "createdAt" DESC
          LIMIT ${resolvedLimit}
        `;
      return rows.map((item) => this.normalizeRow(item));
    }

    return this.fallbackItems
      .filter((item) => item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope)
      .filter((item) => !normalizedContentType || item.contentType === normalizedContentType)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, resolvedLimit);
  }

  private async findRecordById(
    brandId: string,
    workspaceScope: string | undefined,
    contentId: string,
  ): Promise<OpenClawGeoContentRecord | undefined> {
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope || "geo");
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawGeoContentRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "contentType",
          "title",
          "description",
          "htmlContent",
          "attachmentFileUrl",
          "attachmentFileName",
          "attachmentMimeType",
          "attachmentStorageKey",
          "createdAt",
          "updatedAt"
        FROM "OpenClawGeoContent"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${contentId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === normalizedWorkspaceScope && item.id === contentId,
    );
  }

  private normalizeRow(row: OpenClawGeoContentRow): OpenClawGeoContentStoredRecord {
    const contentType = this.requireContentType(row.contentType);
    const attachmentStorageKey = row.attachmentStorageKey ? String(row.attachmentStorageKey).trim() : "";
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeOpenClawWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      contentType,
      sectionLabel: getOpenClawGeoContentLabel(contentType),
      generationMode: getOpenClawGeoContentGenerationMode(contentType),
      title: String(row.title || "").trim(),
      description: String(row.description || "").trim(),
      htmlContent: String(row.htmlContent || "").trim(),
      attachmentLabel: getOpenClawGeoContentAttachmentLabel(contentType),
      ...(row.attachmentFileUrl ? { attachmentFileUrl: String(row.attachmentFileUrl).trim() } : {}),
      ...(row.attachmentFileName ? { attachmentFileName: String(row.attachmentFileName).trim() } : {}),
      ...(row.attachmentMimeType ? { attachmentMimeType: String(row.attachmentMimeType).trim() } : {}),
      ...(attachmentStorageKey ? { attachmentStorageKey } : {}),
      ...(attachmentStorageKey ? { storageAddress: this.buildStorageAddress(attachmentStorageKey) } : {}),
      createdAt: this.normalizeDate(row.createdAt),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private normalizeUploadPayload(payload?: OpenClawGeoContentUploadPayload): OpenClawGeoContentUploadPayload | undefined {
    if (!payload || typeof payload !== "object") {
      return undefined;
    }
    const dataBase64 = String(payload.dataBase64 || "").trim();
    if (!dataBase64) {
      return undefined;
    }
    const fileName = this.requireOptionalText(payload.fileName, 260) || `openclaw-geo-content-${Date.now()}`;
    const contentType = this.requireOptionalText(payload.contentType, 160) || "application/octet-stream";
    return {
      fileName,
      contentType,
      dataBase64,
    };
  }

  private async persistAttachmentFile(
    brandId: string,
    contentType: OpenClawGeoContentType,
    upload: OpenClawGeoContentUploadPayload,
    title: string,
  ) {
    const attachmentFileName = this.requireOptionalText(upload.fileName, 260) || `openclaw-geo-content-${Date.now()}`;
    const attachmentMimeType = this.requireOptionalText(upload.contentType, 160) || "application/octet-stream";
    const base64 = String(upload.dataBase64 || "").trim();
    if (!base64) {
      throw new BadRequestException("上传附件内容为空");
    }
    const extension = this.resolveExtension(attachmentFileName, attachmentMimeType);
    const relativePath = `openclaw/geo/${contentType}/${randomUUID()}-${this.slugifyFileName(title || attachmentFileName)}${extension}`;
    const attachmentStorageKey = `reports/${brandId}/${relativePath}`;
    await this.ossStorageService.putObject(attachmentStorageKey, Buffer.from(base64, "base64"), attachmentMimeType);
    return {
      attachmentFileUrl: `${this.appConfigService.getServerBaseUrl()}/api/reports/brands/${brandId}/assets/${encodeURIComponent(relativePath)}`,
      attachmentFileName,
      attachmentMimeType,
      attachmentStorageKey,
    };
  }

  private resolveExtension(fileName: string, contentType: string) {
    const matched = /\.[a-zA-Z0-9]+$/.exec(String(fileName || "").trim());
    if (matched) {
      return matched[0].toLowerCase();
    }
    const normalizedType = String(contentType || "").trim().toLowerCase();
    if (normalizedType.includes("spreadsheet") || normalizedType.includes("sheet")) {
      return ".xlsx";
    }
    if (normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return ".docx";
    }
    if (normalizedType.includes("markdown")) {
      return ".md";
    }
    return ".bin";
  }

  private slugifyFileName(input: string) {
    const normalized = String(input || "")
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    return (normalized || "geo-content").slice(0, 80);
  }

  private buildAttachmentFileUrl(brandId: string, attachmentStorageKey: string) {
    const normalizedStorageKey = attachmentStorageKey.replace(/[\\/]+/g, "/").replace(/^\/+/, "");
    const prefix = `reports/${brandId}/`;
    if (!normalizedStorageKey.startsWith(prefix)) {
      return "";
    }
    const relativePath = normalizedStorageKey.slice(prefix.length);
    return `${this.appConfigService.getServerBaseUrl()}/api/reports/brands/${brandId}/assets/${encodeURIComponent(relativePath)}`;
  }

  private resolveStorageKeyFromFileUrl(brandId: string, attachmentFileUrl?: string) {
    const normalized = String(attachmentFileUrl || "").trim();
    if (!normalized) {
      return "";
    }
    try {
      const parsed = new URL(normalized);
      const prefix = `/api/reports/brands/${brandId}/assets/`;
      if (!parsed.pathname.startsWith(prefix)) {
        return "";
      }
      const relativePath = decodeURIComponent(parsed.pathname.slice(prefix.length)).replace(/[\\/]+/g, "/").replace(/^\/+/, "");
      if (!relativePath.startsWith("openclaw/geo/")) {
        return "";
      }
      return `reports/${brandId}/${relativePath}`;
    } catch {
      return "";
    }
  }

  private buildStorageAddress(storageKey: string) {
    if (!storageKey) {
      return "";
    }
    if (!this.ossStorageService.isUsingLocalFallback()) {
      return storageKey;
    }
    return this.ossStorageService.getLocalObjectDisplayPath(storageKey);
  }

  private requireContentType(value: string | undefined) {
    const normalized = String(value || "").trim();
    try {
      return normalizeOpenClawGeoContentType(normalized);
    } catch {
      const labels = listOpenClawGeoContentCatalog().map((item) => `${item.type}(${item.label})`).join("、");
      throw new BadRequestException(`不支持的 GEO 内容类型，当前仅支持：${labels}`);
    }
  }

  private normalizeOptionalContentType(value?: string) {
    const normalized = String(value || "").trim();
    return normalized ? this.requireContentType(normalized) : undefined;
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
      throw new BadRequestException("附件地址必须为 http/https URL");
    }
    return normalized.slice(0, 2000);
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
    if (this.prismaService.isLocalSqliteMode()) {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawGeoContent" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "contentType" TEXT NOT NULL DEFAULT '',
          "title" TEXT NOT NULL DEFAULT '',
          "description" TEXT NOT NULL DEFAULT '',
          "htmlContent" TEXT NOT NULL DEFAULT '',
          "attachmentFileUrl" TEXT,
          "attachmentFileName" TEXT,
          "attachmentMimeType" TEXT,
          "attachmentStorageKey" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("OpenClawGeoContent", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "contentType", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "description", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "htmlContent", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "attachmentFileUrl", definition: "TEXT" },
        { name: "attachmentFileName", definition: "TEXT" },
        { name: "attachmentMimeType", definition: "TEXT" },
        { name: "attachmentStorageKey", definition: "TEXT" },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawGeoContent" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "createdByUserId" TEXT NOT NULL,
          "contentType" TEXT NOT NULL DEFAULT '',
          "title" TEXT NOT NULL DEFAULT '',
          "description" TEXT NOT NULL DEFAULT '',
          "htmlContent" TEXT NOT NULL DEFAULT '',
          "attachmentFileUrl" TEXT,
          "attachmentFileName" TEXT,
          "attachmentMimeType" TEXT,
          "attachmentStorageKey" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawGeoContent"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawGeoContent"
        ADD COLUMN IF NOT EXISTS "contentType" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawGeoContent"
        ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawGeoContent"
        ADD COLUMN IF NOT EXISTS "htmlContent" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawGeoContent"
        ADD COLUMN IF NOT EXISTS "attachmentFileUrl" TEXT
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawGeoContent"
        ADD COLUMN IF NOT EXISTS "attachmentFileName" TEXT
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawGeoContent"
        ADD COLUMN IF NOT EXISTS "attachmentMimeType" TEXT
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawGeoContent"
        ADD COLUMN IF NOT EXISTS "attachmentStorageKey" TEXT
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "OpenClawGeoContent"
      SET "workspaceScope" = 'geo'
      WHERE COALESCE(NULLIF(TRIM("workspaceScope"), ''), '') = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawGeoContent_brand_scope_type_created_idx"
      ON "OpenClawGeoContent" ("brandId", "workspaceScope", "contentType", "createdAt" DESC)
    `);
  }
}
