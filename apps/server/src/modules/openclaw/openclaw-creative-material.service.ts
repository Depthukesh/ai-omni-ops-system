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

type OpenClawCreativeMaterialRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  createdByUserId: string;
  title: string;
  description: string;
  materialType: string;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  textContent: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawCreativeMaterialStoredRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  createdByUserId: string;
  title: string;
  description: string;
  materialType: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  textContent?: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawCreativeMaterialRecord = OpenClawCreativeMaterialStoredRecord;

export type OpenClawCreativeMaterialWorkspace = {
  items: OpenClawCreativeMaterialRecord[];
  total: number;
};

type OpenClawCreativeMaterialUploadPayload = {
  fileName?: string;
  contentType?: string;
  dataBase64?: string;
};

@Injectable()
export class OpenClawCreativeMaterialService {
  private bootstrapPromise: Promise<void> | null = null;

  private readonly fallbackItems: OpenClawCreativeMaterialStoredRecord[] = [];

  constructor(
    private readonly prismaService: PrismaService,
    @Inject(OssStorageService)
    private readonly ossStorageService: OssStorageService,
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
  ) {}

  async listWorkspace(brandId: string, workspaceScope?: string, limit?: number): Promise<OpenClawCreativeMaterialWorkspace> {
    const items = await this.listRecords(brandId, workspaceScope, limit);
    return {
      items,
      total: items.length,
    };
  }

  async createMaterial(payload: {
    brandId: string;
    workspaceScope?: string;
    createdByUserId: string;
    title?: string;
    description?: string;
    materialType?: string;
    fileUrl?: string;
    fileName?: string;
    mimeType?: string;
    textContent?: string;
    upload?: OpenClawCreativeMaterialUploadPayload;
  }): Promise<OpenClawCreativeMaterialRecord> {
    const brandId = this.requireText(payload.brandId, "缺少品牌 ID");
    const workspaceScope = normalizeOpenClawWorkspaceScope(payload.workspaceScope);
    const createdByUserId = this.requireText(payload.createdByUserId, "缺少创建人 ID");
    const title = this.requireText(payload.title, "请填写标题", 160);
    const description = this.requireOptionalText(payload.description, 10_000);
    const materialType = this.requireText(payload.materialType, "请填写素材类型", 80);
    let fileUrl = this.requireOptionalUrl(payload.fileUrl);
    let fileName = this.requireOptionalText(payload.fileName, 260);
    let mimeType = this.requireOptionalText(payload.mimeType, 160);
    const textContent = this.requireOptionalText(payload.textContent, 50_000);
    const upload = this.normalizeUploadPayload(payload.upload);
    if (upload) {
      const uploaded = await this.persistUploadedMaterialFile(brandId, upload, title);
      fileUrl = uploaded.fileUrl;
      fileName = fileName || uploaded.fileName;
      mimeType = mimeType || uploaded.mimeType;
    }
    if (!fileUrl && !textContent) {
      throw new BadRequestException("请至少提供素材文件地址或文本内容");
    }
    const id = `openclaw_creative_material_${randomUUID()}`;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        INSERT INTO "OpenClawCreativeMaterial" (
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "title",
          "description",
          "materialType",
          "fileUrl",
          "fileName",
          "mimeType",
          "textContent",
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
          ${materialType},
          ${fileUrl},
          ${fileName},
          ${mimeType},
          ${textContent},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      const stored = await this.findRecordById(brandId, workspaceScope, id);
      if (!stored) {
        throw new NotFoundException("创作素材创建后未找到记录");
      }
      return stored;
    }

    const now = new Date().toISOString();
    const stored: OpenClawCreativeMaterialStoredRecord = {
      id,
      brandId,
      workspaceScope,
      createdByUserId,
      title,
      description,
      materialType,
      ...(fileUrl ? { fileUrl } : {}),
      ...(fileName ? { fileName } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(textContent ? { textContent } : {}),
      createdAt: now,
      updatedAt: now,
    };
    this.fallbackItems.unshift(stored);
    return stored;
  }

  private normalizeUploadPayload(payload?: OpenClawCreativeMaterialUploadPayload): OpenClawCreativeMaterialUploadPayload | undefined {
    if (!payload || typeof payload !== "object") {
      return undefined;
    }
    const dataBase64 = String(payload.dataBase64 || "").trim();
    if (!dataBase64) {
      return undefined;
    }
    const fileName = this.requireOptionalText(payload.fileName, 260) || `openclaw-material-${Date.now()}`;
    const contentType = this.requireOptionalText(payload.contentType, 160) || "application/octet-stream";
    return {
      fileName,
      contentType,
      dataBase64,
    };
  }

  private async persistUploadedMaterialFile(
    brandId: string,
    upload: OpenClawCreativeMaterialUploadPayload,
    title: string,
  ) {
    const fileName = this.requireOptionalText(upload.fileName, 260) || `openclaw-material-${Date.now()}`;
    const contentType = this.requireOptionalText(upload.contentType, 160) || "application/octet-stream";
    const base64 = String(upload.dataBase64 || "").trim();
    if (!base64) {
      throw new BadRequestException("上传文件内容为空");
    }
    const extension = this.resolveExtension(fileName, contentType);
    const relativePath = `openclaw/creative-materials/${randomUUID()}-${this.slugifyFileName(title || fileName)}${extension}`;
    const storageKey = `works/${brandId}/${relativePath}`;
    await this.ossStorageService.putObject(storageKey, Buffer.from(base64, "base64"), contentType);
    return {
      fileUrl: `${this.appConfigService.getServerBaseUrl()}/api/works/brands/${brandId}/assets?fileName=${encodeURIComponent(relativePath)}`,
      fileName,
      mimeType: contentType,
    };
  }

  private resolveExtension(fileName: string, contentType: string) {
    const matched = /\.[a-zA-Z0-9]+$/.exec(String(fileName || "").trim());
    if (matched) {
      return matched[0].toLowerCase();
    }
    const normalizedType = String(contentType || "").trim().toLowerCase();
    if (normalizedType === "image/png") {
      return ".png";
    }
    if (normalizedType === "image/webp") {
      return ".webp";
    }
    if (normalizedType === "image/gif") {
      return ".gif";
    }
    if (normalizedType === "image/jpeg" || normalizedType === "image/jpg") {
      return ".jpg";
    }
    if (normalizedType === "video/mp4") {
      return ".mp4";
    }
    if (normalizedType === "audio/mpeg") {
      return ".mp3";
    }
    if (normalizedType === "audio/wav" || normalizedType === "audio/x-wav") {
      return ".wav";
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
    return (normalized || "material").slice(0, 80);
  }

  async deleteMaterial(brandId: string, workspaceScope: string | undefined, materialId: string): Promise<OpenClawCreativeMaterialRecord> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope);
    const normalizedMaterialId = this.requireText(materialId, "缺少素材 ID");
    const existing = await this.findRecordById(normalizedBrandId, normalizedWorkspaceScope, normalizedMaterialId);
    if (!existing) {
      throw new NotFoundException("创作素材不存在或已删除");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      await this.prismaService.$executeRaw`
        DELETE FROM "OpenClawCreativeMaterial"
        WHERE "brandId" = ${normalizedBrandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${normalizedMaterialId}
      `;
      return existing;
    }

    const nextItems = this.fallbackItems.filter(
      (item) => !(item.brandId === normalizedBrandId && item.workspaceScope === normalizedWorkspaceScope && item.id === normalizedMaterialId),
    );
    this.fallbackItems.length = 0;
    this.fallbackItems.push(...nextItems);
    return existing;
  }

  async getMaterialById(brandId: string, workspaceScope: string | undefined, materialId: string) {
    return this.findRecordById(brandId, workspaceScope, materialId);
  }

  private async listRecords(brandId: string, workspaceScope: string | undefined, limit?: number): Promise<OpenClawCreativeMaterialRecord[]> {
    const normalizedBrandId = this.requireText(brandId, "缺少品牌 ID");
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope);
    const resolvedLimit = this.normalizeLimit(limit);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawCreativeMaterialRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "title",
          "description",
          "materialType",
          "fileUrl",
          "fileName",
          "mimeType",
          "textContent",
          "createdAt",
          "updatedAt"
        FROM "OpenClawCreativeMaterial"
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
    materialId: string,
  ): Promise<OpenClawCreativeMaterialRecord | undefined> {
    const normalizedWorkspaceScope = normalizeOpenClawWorkspaceScope(workspaceScope);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawCreativeMaterialRow[]>`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "createdByUserId",
          "title",
          "description",
          "materialType",
          "fileUrl",
          "fileName",
          "mimeType",
          "textContent",
          "createdAt",
          "updatedAt"
        FROM "OpenClawCreativeMaterial"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${normalizedWorkspaceScope}
          AND "id" = ${materialId}
        LIMIT 1
      `;
      const matched = rows[0];
      return matched ? this.normalizeRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId && item.workspaceScope === normalizedWorkspaceScope && item.id === materialId,
    );
  }

  private normalizeRow(row: OpenClawCreativeMaterialRow): OpenClawCreativeMaterialStoredRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeOpenClawWorkspaceScope(row.workspaceScope),
      createdByUserId: row.createdByUserId,
      title: String(row.title || "").trim(),
      description: String(row.description || "").trim(),
      materialType: String(row.materialType || "").trim(),
      ...(row.fileUrl ? { fileUrl: String(row.fileUrl).trim() } : {}),
      ...(row.fileName ? { fileName: String(row.fileName).trim() } : {}),
      ...(row.mimeType ? { mimeType: String(row.mimeType).trim() } : {}),
      ...(row.textContent ? { textContent: String(row.textContent).trim() } : {}),
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
      throw new BadRequestException("素材文件地址必须为 http/https URL");
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
      CREATE TABLE IF NOT EXISTS "OpenClawCreativeMaterial" (
        "id" TEXT PRIMARY KEY,
        "brandId" TEXT NOT NULL,
        "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
        "createdByUserId" TEXT NOT NULL,
        "title" TEXT NOT NULL DEFAULT '',
        "description" TEXT NOT NULL DEFAULT '',
        "materialType" TEXT NOT NULL DEFAULT '',
        "fileUrl" TEXT,
        "fileName" TEXT,
        "mimeType" TEXT,
        "textContent" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawCreativeMaterial"
      ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawCreativeMaterial"
      ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawCreativeMaterial"
      ADD COLUMN IF NOT EXISTS "materialType" TEXT NOT NULL DEFAULT ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawCreativeMaterial"
      ADD COLUMN IF NOT EXISTS "fileUrl" TEXT
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawCreativeMaterial"
      ADD COLUMN IF NOT EXISTS "fileName" TEXT
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawCreativeMaterial"
      ADD COLUMN IF NOT EXISTS "mimeType" TEXT
    `);
    await this.prismaService.$executeRawUnsafe(`
      ALTER TABLE "OpenClawCreativeMaterial"
      ADD COLUMN IF NOT EXISTS "textContent" TEXT
    `);
    await this.prismaService.$executeRawUnsafe(`
      UPDATE "OpenClawCreativeMaterial"
      SET "workspaceScope" = '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      WHERE COALESCE(NULLIF(TRIM("workspaceScope"), ''), '') = ''
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawCreativeMaterial_brand_scope_created_idx"
      ON "OpenClawCreativeMaterial" ("brandId", "workspaceScope", "createdAt" DESC)
    `);
  }
}
