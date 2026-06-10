import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import {
  AssetCategory,
  KnowledgeBase,
  KnowledgeBaseFile,
  KnowledgeBaseSyncRun,
  KnowledgeBinding,
  KnowledgeChunk,
  KnowledgeEmbedding,
  KnowledgeRetrievalConfig,
  Prisma,
} from "@prisma/client";
import {
  database,
  type KnowledgeBindingRecord,
  type KnowledgeBaseFileRecord,
  type KnowledgeBaseRecord,
  type KnowledgeRetrievalConfigRecord,
  type KnowledgeBaseSyncRunRecord,
} from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";
import { OssStorageService } from "../../storage/oss-storage.service";
import { ApiProvidersService } from "./api-providers.service";
import { ThirdPartyPlatformsService } from "../third-party-platforms/third-party-platforms.service";

export type CreateKnowledgeBasePayload = {
  name: string;
  slug: string;
  sourceType: KnowledgeBaseRecord["sourceType"];
  description?: string;
};

export type UpdateKnowledgeBasePayload = {
  status?: KnowledgeBaseRecord["status"];
  syncStatus?: KnowledgeBaseRecord["syncStatus"];
  sourceType?: KnowledgeBaseRecord["sourceType"];
  description?: string;
};

export type CreateKnowledgeBaseFilePayload = {
  fileName: string;
  fileType: KnowledgeBaseFileRecord["fileType"];
  sourceName?: string;
  chunkCount?: number;
};

export type UpdateKnowledgeBaseFilePayload = {
  status?: KnowledgeBaseFileRecord["status"];
};

export type CompleteKnowledgeBaseSyncRunPayload = {
  result: "SUCCESS" | "FAILED";
  summary?: string;
  errorDetail?: string;
};

export type RunKnowledgeRetrievalTestPayload = {
  query: string;
  topK?: number;
};

export type KnowledgeBaseFileMutationResult = {
  file: KnowledgeBaseFileRecord;
  knowledgeBase: KnowledgeBaseRecord;
};

export type KnowledgeBaseSyncMutationResult = KnowledgeBaseFileMutationResult & {
  run: KnowledgeBaseSyncRunRecord;
};

export type KnowledgeBaseRunMutationResult = {
  knowledgeBase: KnowledgeBaseRecord;
  run: KnowledgeBaseSyncRunRecord;
  file?: KnowledgeBaseFileRecord;
};

export type KnowledgeChunkRecord = {
  id: string;
  knowledgeBaseId: string;
  fileId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  charCount: number;
  sourceLabel?: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeEmbeddingRecord = {
  id: string;
  knowledgeBaseId: string;
  fileId: string;
  chunkId: string;
  modelName: string;
  providerName: string;
  dimensions: number;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeRetrievalTestHit = {
  chunkId: string;
  fileId: string;
  fileName: string;
  chunkIndex: number;
  score: number;
  content: string;
  sourceLabel?: string;
};

export type KnowledgeRetrievalTestResult = {
  knowledgeBaseId: string;
  query: string;
  topK: number;
  modelName: string;
  hitCount: number;
  hits: KnowledgeRetrievalTestHit[];
};

export type KnowledgeInvocationRecord = {
  id: string;
  brandId?: string;
  sourceModule: "REPORTS" | "WORKS";
  sceneLabel: string;
  moduleTargetId?: string;
  skillPackageKey?: string;
  skillSlug?: string;
  knowledgeBaseIds: string[];
  knowledgeBaseNames: string[];
  matchedKnowledgeBaseIds: string[];
  matchedKnowledgeBaseNames: string[];
  retrievalQuery?: string;
  hitCount: number;
  status: "UNBOUND" | "NO_HIT" | "HIT" | "FAILED";
  summary: string;
  createdAt: string;
};

export type RecordKnowledgeInvocationPayload = {
  brandId?: string;
  sourceModule: KnowledgeInvocationRecord["sourceModule"];
  sceneLabel: string;
  moduleTargetId?: string;
  skillPackageKey?: string;
  skillSlug?: string;
  knowledgeBaseIds?: string[];
  knowledgeBaseNames?: string[];
  matchedKnowledgeBaseIds?: string[];
  matchedKnowledgeBaseNames?: string[];
  retrievalQuery?: string;
  hitCount?: number;
  status: KnowledgeInvocationRecord["status"];
  summary: string;
};

export type CreateKnowledgeBindingPayload = {
  knowledgeBaseId: string;
  bindingType: KnowledgeBindingRecord["bindingType"];
  targetId: string;
  targetKey?: string;
  targetName?: string;
  priority: number;
  retrievalMode: KnowledgeBindingRecord["retrievalMode"];
  isRequired?: boolean;
  enabled?: boolean;
};

export type UpdateKnowledgeBindingPayload = {
  targetKey?: string;
  targetName?: string;
  priority?: number;
  retrievalMode?: KnowledgeBindingRecord["retrievalMode"];
  isRequired?: boolean;
  enabled?: boolean;
};

export type KnowledgeBindingQuery = {
  knowledgeBaseId?: string;
  bindingType?: KnowledgeBindingRecord["bindingType"];
  targetId?: string;
  enabled?: boolean;
};

export type KnowledgeBindingView = KnowledgeBindingRecord & {
  knowledgeBaseName?: string;
  knowledgeBaseSlug?: string;
};

export type UpdateKnowledgeRetrievalConfigPayload = {
  defaultTopK?: number;
  recallMode?: KnowledgeRetrievalConfigRecord["recallMode"];
  rerankEnabled?: boolean;
  rerankModelName?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  retrievalThreshold?: number;
};

type ZipEntryLike = {
  entryName: string;
  isDirectory: boolean;
  getData(): Buffer;
};

type AdmZipLike = {
  getEntries(): ZipEntryLike[];
};

type ExtractedKnowledgeText = {
  content: string;
  sourceLabel: string;
  usedFallback: boolean;
  note?: string;
  resolvedFileType?: KnowledgeBaseFileRecord["fileType"];
};

type PersistedKnowledgeChunkInput = {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  charCount: number;
  sourceLabel?: string;
  metadataJson?: Prisma.InputJsonValue;
};

type EmbeddingProviderConfig = {
  providerId: string;
  providerName: string;
  baseUrl: string;
  embeddingPath: string;
  modelName: string;
  dimensions: number;
  timeoutMs: number;
};

const BRAND_KNOWLEDGE_EMBEDDING_MODEL = "doubao-embedding-vision-250615";

type KnowledgeInvocationRow = {
  id: string;
  brandId: string | null;
  sourceModule: string;
  sceneLabel: string;
  moduleTargetId: string | null;
  skillPackageKey: string | null;
  skillSlug: string | null;
  knowledgeBaseIdsJson: Prisma.JsonValue;
  knowledgeBaseNamesJson: Prisma.JsonValue;
  matchedKnowledgeBaseIdsJson: Prisma.JsonValue;
  matchedKnowledgeBaseNamesJson: Prisma.JsonValue;
  retrievalQuery: string | null;
  hitCount: number;
  status: string;
  summary: string;
  createdAt: Date;
};

@Injectable()
export class KnowledgeBasesService {
  private bootstrapPromise?: Promise<void>;
  private bindingBootstrapPromise?: Promise<void>;
  private retrievalConfigBootstrapPromise?: Promise<void>;
  private invocationBootstrapPromise?: Promise<void>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly ossStorageService: OssStorageService,
    private readonly apiProvidersService: ApiProvidersService,
    private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService,
  ) {}

  async listKnowledgeBases() {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const rows = await this.prismaService.knowledgeBase.findMany({
        orderBy: { updatedAt: "desc" },
      });
      return rows.map((item) => this.normalizeKnowledgeBase(item));
    }

    return this.listKnowledgeBasesFromMock();
  }

  async createKnowledgeBase(payload: CreateKnowledgeBasePayload) {
    const name = String(payload.name || "").trim();
    const slug = String(payload.slug || "").trim();
    if (!name) {
      throw new BadRequestException("知识库名称不能为空");
    }
    if (!slug) {
      throw new BadRequestException("知识库 Slug 不能为空");
    }

    const now = new Date().toISOString();
    const record: KnowledgeBaseRecord = {
      id: this.createId("kb"),
      name,
      slug,
      sourceType: payload.sourceType,
      status: "DRAFT",
      syncStatus: "IDLE",
      documentCount: 0,
      chunkCount: 0,
      description: String(payload.description || "").trim(),
      updatedAt: now,
    };

    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const existing = await this.prismaService.knowledgeBase.findUnique({
        where: { slug: record.slug },
      });
      if (existing) {
        throw new ConflictException("知识库 Slug 已存在");
      }

      const created = await this.prismaService.knowledgeBase.create({
        data: {
          id: record.id,
          name: record.name,
          slug: record.slug,
          sourceType: record.sourceType,
          status: record.status,
          syncStatus: record.syncStatus,
          documentCount: record.documentCount,
          chunkCount: record.chunkCount,
          description: record.description,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      });

      if (await this.canUseKnowledgeRetrievalConfigStorage()) {
        await this.ensureKnowledgeRetrievalConfigStorageSeeded();
        const defaults = this.buildDefaultKnowledgeRetrievalConfigRecord(created.id, now);
        await this.prismaService.knowledgeRetrievalConfig.upsert({
          where: { knowledgeBaseId: created.id },
          update: {
            updatedAt: new Date(now),
          },
          create: {
            id: defaults.id,
            knowledgeBaseId: created.id,
            defaultTopK: defaults.defaultTopK,
            recallMode: defaults.recallMode,
            rerankEnabled: defaults.rerankEnabled,
            rerankModelName: defaults.rerankModelName ?? null,
            chunkSize: defaults.chunkSize ?? null,
            chunkOverlap: defaults.chunkOverlap ?? null,
            retrievalThreshold: defaults.retrievalThreshold ?? null,
            createdAt: new Date(now),
            updatedAt: new Date(now),
          },
        });
      }

      return this.normalizeKnowledgeBase(created);
    }

    database.knowledgeBases.unshift(record);
    database.knowledgeRetrievalConfigs.unshift(this.buildDefaultKnowledgeRetrievalConfigRecord(record.id, now));
    return record;
  }

  private listKnowledgeBasesFromMock() {
    return [...database.knowledgeBases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private listKnowledgeBaseFilesFromMock(knowledgeBaseId?: string) {
    const list = knowledgeBaseId
      ? database.knowledgeBaseFiles.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : database.knowledgeBaseFiles;

    return [...list].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  private listKnowledgeBaseSyncRunsFromMock(knowledgeBaseId?: string) {
    const list = knowledgeBaseId
      ? database.knowledgeBaseSyncRuns.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : database.knowledgeBaseSyncRuns;

    return [...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  private listKnowledgeInvocationRunsFromMock(knowledgeBaseId?: string) {
    const list = knowledgeBaseId
      ? database.knowledgeInvocationRuns.filter(
          (item) => item.knowledgeBaseIds.includes(knowledgeBaseId) || item.matchedKnowledgeBaseIds.includes(knowledgeBaseId),
        )
      : database.knowledgeInvocationRuns;

    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private listKnowledgeBindingsFromMock(query: KnowledgeBindingQuery = {}) {
    const list = database.knowledgeBindings.filter((item) => {
      if (query.knowledgeBaseId && item.knowledgeBaseId !== query.knowledgeBaseId) {
        return false;
      }
      if (query.bindingType && item.bindingType !== query.bindingType) {
        return false;
      }
      if (query.targetId && item.targetId !== query.targetId) {
        return false;
      }
      if (typeof query.enabled === "boolean" && item.enabled !== query.enabled) {
        return false;
      }
      return true;
    });

    return [...list]
      .sort((a, b) => (a.priority === b.priority ? b.updatedAt.localeCompare(a.updatedAt) : a.priority - b.priority))
      .map((item) => this.enrichMockKnowledgeBinding(item));
  }

  private listKnowledgeRetrievalConfigsFromMock(knowledgeBaseId?: string) {
    if (knowledgeBaseId) {
      this.getKnowledgeBaseOrThrowFromMock(knowledgeBaseId);
      const existing = database.knowledgeRetrievalConfigs.find((item) => item.knowledgeBaseId === knowledgeBaseId);
      if (existing) {
        return [existing];
      }

      const created = this.buildDefaultKnowledgeRetrievalConfigRecord(knowledgeBaseId);
      database.knowledgeRetrievalConfigs.unshift(created);
      return [created];
    }

    return [...database.knowledgeRetrievalConfigs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private getKnowledgeBaseOrThrowFromMock(id: string) {
    const knowledgeBase = database.knowledgeBases.find((item) => item.id === id);
    if (!knowledgeBase) {
      throw new NotFoundException("知识库不存在");
    }

    return knowledgeBase;
  }

  private getKnowledgeBaseFileOrThrowFromMock(fileId: string) {
    const file = database.knowledgeBaseFiles.find((item) => item.id === fileId);
    if (!file) {
      throw new NotFoundException("知识库文件不存在");
    }

    return file;
  }

  private getKnowledgeBaseSyncRunOrThrowFromMock(runId: string) {
    const run = database.knowledgeBaseSyncRuns.find((item) => item.id === runId);
    if (!run) {
      throw new NotFoundException("同步记录不存在");
    }

    return run;
  }

  private getKnowledgeBindingOrThrowFromMock(bindingId: string) {
    const binding = database.knowledgeBindings.find((item) => item.id === bindingId);
    if (!binding) {
      throw new NotFoundException("知识绑定不存在");
    }

    return binding;
  }

  private normalizeKnowledgeBase(row: KnowledgeBase): KnowledgeBaseRecord {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      sourceType: row.sourceType as KnowledgeBaseRecord["sourceType"],
      status: row.status as KnowledgeBaseRecord["status"],
      syncStatus: row.syncStatus as KnowledgeBaseRecord["syncStatus"],
      documentCount: row.documentCount,
      chunkCount: row.chunkCount,
      description: row.description,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private normalizeKnowledgeBaseFile(row: KnowledgeBaseFile): KnowledgeBaseFileRecord {
    return {
      id: row.id,
      knowledgeBaseId: row.knowledgeBaseId,
      fileName: row.fileName,
      fileType: row.fileType as KnowledgeBaseFileRecord["fileType"],
      sourceName: row.sourceName,
      chunkCount: row.chunkCount,
      status: row.status as KnowledgeBaseFileRecord["status"],
      uploadedAt: row.uploadedAt.toISOString(),
    };
  }

  private normalizeKnowledgeChunk(row: KnowledgeChunk): KnowledgeChunkRecord {
    return {
      id: row.id,
      knowledgeBaseId: row.knowledgeBaseId,
      fileId: row.fileId,
      chunkIndex: row.chunkIndex,
      content: row.content,
      tokenCount: row.tokenCount,
      charCount: row.charCount,
      sourceLabel: row.sourceLabel ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private normalizeKnowledgeEmbedding(row: KnowledgeEmbedding): KnowledgeEmbeddingRecord {
    return {
      id: row.id,
      knowledgeBaseId: row.knowledgeBaseId,
      fileId: row.fileId,
      chunkId: row.chunkId,
      modelName: row.modelName,
      providerName: row.providerName,
      dimensions: row.dimensions,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private normalizeKnowledgeBaseSyncRun(row: KnowledgeBaseSyncRun): KnowledgeBaseSyncRunRecord {
    return {
      id: row.id,
      knowledgeBaseId: row.knowledgeBaseId,
      scope: row.scope as KnowledgeBaseSyncRunRecord["scope"],
      operator: row.operator,
      fileId: row.fileId ?? undefined,
      fileName: row.fileName ?? undefined,
      result: row.result as KnowledgeBaseSyncRunRecord["result"],
      summary: row.summary,
      errorDetail: row.errorDetail ?? undefined,
      startedAt: row.startedAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
    };
  }

  private normalizeKnowledgeInvocation(row: KnowledgeInvocationRow): KnowledgeInvocationRecord {
    return {
      id: row.id,
      brandId: row.brandId ?? undefined,
      sourceModule: row.sourceModule as KnowledgeInvocationRecord["sourceModule"],
      sceneLabel: row.sceneLabel,
      moduleTargetId: row.moduleTargetId ?? undefined,
      skillPackageKey: row.skillPackageKey ?? undefined,
      skillSlug: row.skillSlug ?? undefined,
      knowledgeBaseIds: this.normalizeStringList(row.knowledgeBaseIdsJson),
      knowledgeBaseNames: this.normalizeStringList(row.knowledgeBaseNamesJson),
      matchedKnowledgeBaseIds: this.normalizeStringList(row.matchedKnowledgeBaseIdsJson),
      matchedKnowledgeBaseNames: this.normalizeStringList(row.matchedKnowledgeBaseNamesJson),
      retrievalQuery: row.retrievalQuery ?? undefined,
      hitCount: Number(row.hitCount || 0),
      status: row.status as KnowledgeInvocationRecord["status"],
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private normalizeKnowledgeBinding(
    row: KnowledgeBinding & {
      knowledgeBase?: KnowledgeBase | null;
    },
  ): KnowledgeBindingView {
    return {
      id: row.id,
      knowledgeBaseId: row.knowledgeBaseId,
      knowledgeBaseName: row.knowledgeBase?.name,
      knowledgeBaseSlug: row.knowledgeBase?.slug,
      bindingType: row.bindingType as KnowledgeBindingRecord["bindingType"],
      targetId: row.targetId,
      targetKey: row.targetKey ?? undefined,
      targetName: row.targetName ?? undefined,
      priority: row.priority,
      retrievalMode: row.retrievalMode as KnowledgeBindingRecord["retrievalMode"],
      isRequired: row.isRequired,
      enabled: row.enabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private normalizeKnowledgeRetrievalConfig(row: KnowledgeRetrievalConfig): KnowledgeRetrievalConfigRecord {
    return {
      id: row.id,
      knowledgeBaseId: row.knowledgeBaseId,
      defaultTopK: row.defaultTopK,
      recallMode: row.recallMode as KnowledgeRetrievalConfigRecord["recallMode"],
      rerankEnabled: row.rerankEnabled,
      rerankModelName: row.rerankModelName ?? undefined,
      chunkSize: row.chunkSize ?? undefined,
      chunkOverlap: row.chunkOverlap ?? undefined,
      retrievalThreshold: row.retrievalThreshold ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private normalizeStringList(value: Prisma.JsonValue | undefined) {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) {
          return Array.from(new Set(parsed.map((item) => String(item || "").trim()).filter(Boolean)));
        }
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) {
      return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)));
    }
    return [];
  }

  private enrichMockKnowledgeBinding(row: KnowledgeBindingRecord): KnowledgeBindingView {
    const knowledgeBase = database.knowledgeBases.find((item) => item.id === row.knowledgeBaseId);
    return {
      ...row,
      knowledgeBaseName: knowledgeBase?.name,
      knowledgeBaseSlug: knowledgeBase?.slug,
    };
  }

  private buildDefaultKnowledgeRetrievalConfigRecord(
    knowledgeBaseId: string,
    timestamp = new Date().toISOString(),
  ): KnowledgeRetrievalConfigRecord {
    return {
      id: this.createId("kbrc"),
      knowledgeBaseId,
      defaultTopK: 8,
      recallMode: "HYBRID",
      rerankEnabled: false,
      chunkSize: 800,
      chunkOverlap: 120,
      retrievalThreshold: 0.65,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private createId(prefix: "kb" | "kbf" | "kbsr" | "kbb" | "kbrc" | "kbc" | "kbe" | "kbir") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private async canUseKnowledgeBaseStorage() {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }

    try {
      const rows = await this.prismaService.$queryRawUnsafe<
        Array<{
          knowledgeBase: string | null;
          knowledgeBaseFile: string | null;
          knowledgeBaseSyncRun: string | null;
        }>
      >(
        `SELECT to_regclass('"KnowledgeBase"')::text AS "knowledgeBase",
                to_regclass('"KnowledgeBaseFile"')::text AS "knowledgeBaseFile",
                to_regclass('"KnowledgeBaseSyncRun"')::text AS "knowledgeBaseSyncRun"`,
      );
      const row = rows[0];
      return Boolean(row?.knowledgeBase && row?.knowledgeBaseFile && row?.knowledgeBaseSyncRun);
    } catch {
      return false;
    }
  }

  private async ensureKnowledgeBaseStorageSeeded() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapKnowledgeBaseStorage();
    }

    await this.bootstrapPromise;
  }

  private async canUseKnowledgeBindingStorage() {
    if (!(await this.canUseKnowledgeBaseStorage())) {
      return false;
    }

    try {
      const rows = await this.prismaService.$queryRawUnsafe<Array<{ knowledgeBinding: string | null }>>(
        `SELECT to_regclass('"KnowledgeBinding"')::text AS "knowledgeBinding"`,
      );
      return Boolean(rows[0]?.knowledgeBinding);
    } catch {
      return false;
    }
  }

  private async ensureKnowledgeBindingStorageSeeded() {
    if (!this.bindingBootstrapPromise) {
      this.bindingBootstrapPromise = this.bootstrapKnowledgeBindingStorage();
    }

    await this.bindingBootstrapPromise;
  }

  private async canUseKnowledgeRetrievalConfigStorage() {
    if (!(await this.canUseKnowledgeBaseStorage())) {
      return false;
    }

    try {
      const rows = await this.prismaService.$queryRawUnsafe<Array<{ knowledgeRetrievalConfig: string | null }>>(
        `SELECT to_regclass('"KnowledgeRetrievalConfig"')::text AS "knowledgeRetrievalConfig"`,
      );
      return Boolean(rows[0]?.knowledgeRetrievalConfig);
    } catch {
      return false;
    }
  }

  private async ensureKnowledgeRetrievalConfigStorageSeeded() {
    if (!this.retrievalConfigBootstrapPromise) {
      this.retrievalConfigBootstrapPromise = this.bootstrapKnowledgeRetrievalConfigStorage();
    }

    await this.retrievalConfigBootstrapPromise;
  }

  private async ensureKnowledgeInvocationStorageSeeded() {
    if (!this.invocationBootstrapPromise) {
      this.invocationBootstrapPromise = this.bootstrapKnowledgeInvocationStorage();
    }

    await this.invocationBootstrapPromise;
  }

  private async bootstrapKnowledgeBaseStorage() {
    if (!(await this.canUseKnowledgeBaseStorage())) {
      return;
    }

    const existingCount = await this.prismaService.knowledgeBase.count();
    if (existingCount > 0) {
      return;
    }

    if (database.knowledgeBases.length) {
      await this.prismaService.knowledgeBase.createMany({
        data: database.knowledgeBases.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          sourceType: item.sourceType,
          status: item.status,
          syncStatus: item.syncStatus,
          documentCount: item.documentCount,
          chunkCount: item.chunkCount,
          description: item.description,
          createdAt: new Date(item.updatedAt),
          updatedAt: new Date(item.updatedAt),
        })),
        skipDuplicates: true,
      });
    }

    if (database.knowledgeBaseFiles.length) {
      await this.prismaService.knowledgeBaseFile.createMany({
        data: database.knowledgeBaseFiles.map((item) => ({
          id: item.id,
          knowledgeBaseId: item.knowledgeBaseId,
          fileName: item.fileName,
          fileType: item.fileType,
          sourceName: item.sourceName,
          chunkCount: item.chunkCount,
          status: item.status,
          uploadedAt: new Date(item.uploadedAt),
          updatedAt: new Date(item.uploadedAt),
        })),
        skipDuplicates: true,
      });
    }

    if (database.knowledgeBaseSyncRuns.length) {
      await this.prismaService.knowledgeBaseSyncRun.createMany({
        data: database.knowledgeBaseSyncRuns.map((item) => ({
          id: item.id,
          knowledgeBaseId: item.knowledgeBaseId,
          fileId: item.fileId,
          scope: item.scope,
          operator: item.operator,
          fileName: item.fileName,
          result: item.result,
          summary: item.summary,
          errorDetail: item.errorDetail,
          startedAt: new Date(item.startedAt),
          completedAt: item.completedAt ? new Date(item.completedAt) : null,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async bootstrapKnowledgeInvocationStorage() {
    if (!(await this.canUseKnowledgeBaseStorage())) {
      return;
    }

    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "KnowledgeInvocationRun" (
        "id" TEXT PRIMARY KEY,
        "brandId" TEXT NULL,
        "sourceModule" TEXT NOT NULL,
        "sceneLabel" TEXT NOT NULL,
        "moduleTargetId" TEXT NULL,
        "skillPackageKey" TEXT NULL,
        "skillSlug" TEXT NULL,
        "knowledgeBaseIdsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "knowledgeBaseNamesJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "matchedKnowledgeBaseIdsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "matchedKnowledgeBaseNamesJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "retrievalQuery" TEXT NULL,
        "hitCount" INTEGER NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL,
        "summary" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.prismaService.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "KnowledgeInvocationRun_createdAt_idx" ON "KnowledgeInvocationRun" ("createdAt")`,
    );
  }

  private async bootstrapKnowledgeBindingStorage() {
    if (!(await this.canUseKnowledgeBindingStorage())) {
      return;
    }

    const existingCount = await this.prismaService.knowledgeBinding.count();
    if (existingCount > 0) {
      return;
    }

    if (!database.knowledgeBindings.length) {
      return;
    }

    await this.prismaService.knowledgeBinding.createMany({
      data: database.knowledgeBindings.map((item) => ({
        id: item.id,
        knowledgeBaseId: item.knowledgeBaseId,
        bindingType: item.bindingType,
        targetId: item.targetId,
        targetKey: item.targetKey,
        targetName: item.targetName,
        priority: item.priority,
        retrievalMode: item.retrievalMode,
        isRequired: item.isRequired,
        enabled: item.enabled,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      skipDuplicates: true,
    });
  }

  private async bootstrapKnowledgeRetrievalConfigStorage() {
    if (!(await this.canUseKnowledgeRetrievalConfigStorage())) {
      return;
    }

    const existingCount = await this.prismaService.knowledgeRetrievalConfig.count();
    if (existingCount > 0) {
      return;
    }

    if (!database.knowledgeRetrievalConfigs.length) {
      return;
    }

    await this.prismaService.knowledgeRetrievalConfig.createMany({
      data: database.knowledgeRetrievalConfigs.map((item) => ({
        id: item.id,
        knowledgeBaseId: item.knowledgeBaseId,
        defaultTopK: item.defaultTopK,
        recallMode: item.recallMode,
        rerankEnabled: item.rerankEnabled,
        rerankModelName: item.rerankModelName,
        chunkSize: item.chunkSize,
        chunkOverlap: item.chunkOverlap,
        retrievalThreshold: item.retrievalThreshold,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      skipDuplicates: true,
    });
  }

  private async getKnowledgeBaseOrThrow(id: string) {
    const knowledgeBase = await this.prismaService.knowledgeBase.findUnique({
      where: { id },
    });
    if (!knowledgeBase) {
      throw new NotFoundException("知识库不存在");
    }

    return knowledgeBase;
  }

  private async getKnowledgeBaseFileOrThrow(fileId: string) {
    const file = await this.prismaService.knowledgeBaseFile.findUnique({
      where: { id: fileId },
    });
    if (!file) {
      throw new NotFoundException("知识库文件不存在");
    }

    return file;
  }

  private async getKnowledgeBaseSyncRunOrThrow(runId: string) {
    const run = await this.prismaService.knowledgeBaseSyncRun.findUnique({
      where: { id: runId },
    });
    if (!run) {
      throw new NotFoundException("同步记录不存在");
    }

    return run;
  }

  private async getKnowledgeBindingOrThrow(bindingId: string) {
    const binding = await this.prismaService.knowledgeBinding.findUnique({
      where: { id: bindingId },
      include: { knowledgeBase: true },
    });
    if (!binding) {
      throw new NotFoundException("知识绑定不存在");
    }

    return binding;
  }

  private async getKnowledgeRetrievalConfigOrThrow(knowledgeBaseId: string) {
    const config = await this.prismaService.knowledgeRetrievalConfig.findUnique({
      where: { knowledgeBaseId },
    });
    if (!config) {
      throw new NotFoundException("知识检索配置不存在");
    }

    return config;
  }

  private validateBindingType(value: string): KnowledgeBindingRecord["bindingType"] {
    const bindingType = String(value || "").trim().toUpperCase();
    if (!["MODULE", "SKILL_PACKAGE", "SKILL", "PROMPT", "WORKFLOW_STEP"].includes(bindingType)) {
      throw new BadRequestException("知识绑定类型不合法");
    }
    return bindingType as KnowledgeBindingRecord["bindingType"];
  }

  private validateRetrievalMode(value: string): KnowledgeBindingRecord["retrievalMode"] {
    const retrievalMode = String(value || "").trim().toUpperCase();
    if (!["SEMANTIC", "HYBRID", "MANUAL"].includes(retrievalMode)) {
      throw new BadRequestException("知识检索模式不合法");
    }
    return retrievalMode as KnowledgeBindingRecord["retrievalMode"];
  }

  private validateBindingPriority(value: number): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      throw new BadRequestException("知识绑定优先级必须为正整数");
    }
    return Math.floor(normalized);
  }

  private validateRetrievalRecallMode(value: string): KnowledgeRetrievalConfigRecord["recallMode"] {
    const recallMode = String(value || "").trim().toUpperCase();
    if (!["SEMANTIC", "HYBRID"].includes(recallMode)) {
      throw new BadRequestException("知识库召回模式不合法");
    }
    return recallMode as KnowledgeRetrievalConfigRecord["recallMode"];
  }

  private validatePositiveIntegerField(value: number, fieldLabel: string, allowZero = false): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized < 0 || (!allowZero && normalized <= 0)) {
      throw new BadRequestException(`${fieldLabel}必须为${allowZero ? "非负整数" : "正整数"}`);
    }
    return Math.floor(normalized);
  }

  private validateRetrievalThreshold(value: number): number {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
      throw new BadRequestException("检索阈值必须在 0 到 1 之间");
    }
    return normalized;
  }

  private deriveSyncStatus(files: KnowledgeBaseFileRecord[]): KnowledgeBaseRecord["syncStatus"] {
    if (!files.length) {
      return "IDLE";
    }
    if (files.some((item) => item.status === "FAILED")) {
      return "FAILED";
    }
    if (files.every((item) => item.status === "INDEXED")) {
      return "SUCCESS";
    }
    if (files.some((item) => item.status === "PENDING")) {
      return "IDLE";
    }

    return "SYNCING";
  }

  private refreshKnowledgeBaseSummary(knowledgeBaseId: string, updatedAt = new Date().toISOString()) {
    const knowledgeBase = this.getKnowledgeBaseOrThrowFromMock(knowledgeBaseId);
    const files = database.knowledgeBaseFiles.filter((item) => item.knowledgeBaseId === knowledgeBaseId);
    knowledgeBase.documentCount = files.length;
    knowledgeBase.chunkCount = files.reduce((sum, item) => sum + item.chunkCount, 0);
    knowledgeBase.syncStatus = this.deriveSyncStatus(files);
    knowledgeBase.updatedAt = updatedAt;
    return knowledgeBase;
  }

  private estimateChunkCount(file: Pick<KnowledgeBaseFileRecord, "fileName" | "fileType" | "sourceName" | "chunkCount">) {
    if (file.chunkCount > 0) {
      return file.chunkCount;
    }

    const basis = `${file.fileName || ""} ${file.sourceName || ""}`.trim();
    const signalLength = basis.replace(/\s+/g, "").length;
    const baselineByType: Record<KnowledgeBaseFileRecord["fileType"], number> = {
      PDF: 24,
      DOCX: 18,
      XLSX: 12,
      MD: 10,
      LINK: 8,
    };
    const lengthBoost = Math.max(1, Math.ceil(signalLength / 8));
    return baselineByType[file.fileType] + lengthBoost;
  }

  private buildFileSyncSummary(
    file: Pick<KnowledgeBaseFileRecord, "fileName" | "fileType">,
    chunkCount: number,
    extracted: ExtractedKnowledgeText,
    providerStatus: string,
  ) {
    const extractionSummary = extracted.usedFallback
      ? `当前未提取到 ${file.fileType} 正文，先按文件元数据生成 ${chunkCount} 个占位分片`
      : `已提取正文并按 ${file.fileType} 规则生成 ${chunkCount} 个真实分片`;
    const note = extracted.note ? `，${extracted.note}` : "";
    return `文件 ${file.fileName} 同步完成，${extractionSummary}${note}。${providerStatus}。`;
  }

  private buildFullSyncSummary(fileCount: number, chunkCount: number, failedCount = 0) {
    if (fileCount <= 0) {
      return "全量同步已完成，但当前知识库暂无可处理文件。";
    }
    if (failedCount > 0) {
      return `全量同步已完成，共处理 ${fileCount} 个文件，成功 ${fileCount - failedCount} 个，失败 ${failedCount} 个，累计生成 ${chunkCount} 个分片。`;
    }
    return `全量同步已完成，共处理 ${fileCount} 个文件，累计生成 ${chunkCount} 个分片。`;
  }

  private extractBusinessAssetsBrandId(knowledgeBaseId: string) {
    const matched = /^kb_brand_business_assets_(.+)$/.exec(String(knowledgeBaseId || "").trim());
    return matched?.[1] || "";
  }

  private buildBrandAssetFileStorageKey(brandId: string, fileName: string) {
    return `brands/${brandId}/asset-files/${this.sanitizeStoredFileName(fileName)}`;
  }

  private sanitizeStoredFileName(fileName: string) {
    return String(fileName || "").trim().replace(/^.*[\\/]/, "");
  }

  private extractStoredFileNameFromUrl(fileUrl?: string) {
    const raw = String(fileUrl || "").trim();
    if (!raw) {
      return "";
    }
    try {
      const parsed = new URL(raw);
      const lastSegment = parsed.pathname.split("/").pop() || "";
      return this.sanitizeStoredFileName(decodeURIComponent(lastSegment));
    } catch {
      const normalized = raw.split("#")[0]?.split("?")[0] || "";
      const lastSegment = normalized.split("/").pop() || normalized.split("\\").pop() || "";
      try {
        return this.sanitizeStoredFileName(decodeURIComponent(lastSegment));
      } catch {
        return this.sanitizeStoredFileName(lastSegment);
      }
    }
  }

  private inferKnowledgeFileType(...candidates: Array<string | undefined>): KnowledgeBaseFileRecord["fileType"] {
    for (const candidate of candidates) {
      const target = String(candidate || "").trim().toLowerCase();
      if (!target) {
        continue;
      }
      if (target.endsWith(".pdf")) {
        return "PDF";
      }
      if (target.endsWith(".doc") || target.endsWith(".docx")) {
        return "DOCX";
      }
      if (target.endsWith(".xls") || target.endsWith(".xlsx") || target.endsWith(".csv")) {
        return "XLSX";
      }
      if (target.endsWith(".md") || target.endsWith(".markdown") || target.endsWith(".txt")) {
        return "MD";
      }
    }
    return "LINK";
  }

  private async resolveBusinessAssetStoredFileName(brandId: string, file: Pick<KnowledgeBaseFileRecord, "fileName">) {
    const linkedAsset = await this.prismaService.businessAsset.findFirst({
      where: {
        brandId,
        category: AssetCategory.BUSINESS_DATA,
        title: file.fileName,
      },
      orderBy: { createdAt: "desc" },
      select: {
        fileUrl: true,
      },
    });
    return this.extractStoredFileNameFromUrl(linkedAsset?.fileUrl ?? "");
  }

  private normalizeTextContent(value: string) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private decodeXmlEntities(value: string) {
    return String(value || "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }

  private stripXmlTags(value: string) {
    return this.normalizeTextContent(
      this.decodeXmlEntities(
        String(value || "")
          .replace(/<w:tab[^>]*\/>/g, " ")
          .replace(/<\/(w:p|a:p|row|si|sheetData|worksheet|t)>/g, "\n")
          .replace(/<[^>]+>/g, " "),
      ),
    );
  }

  private scoreTextCandidate(value: string) {
    const normalized = this.normalizeTextContent(value);
    if (!normalized) {
      return 0;
    }
    const readableCount = (normalized.match(/[\u4e00-\u9fa5A-Za-z0-9，。；：“”、《》？！（）,.!?:;\-_\n ]/g) || []).length;
    return readableCount / Math.max(1, normalized.length);
  }

  private decodeBufferAsText(buffer: Buffer) {
    const candidates = [
      buffer.toString("utf8"),
      buffer.toString("utf16le"),
      buffer.toString("latin1"),
    ]
      .map((item) => this.normalizeTextContent(item))
      .filter(Boolean);
    if (!candidates.length) {
      return "";
    }
    const bestCandidate = candidates
      .map((item) => ({ item, score: this.scoreTextCandidate(item) }))
      .sort((left, right) => right.score - left.score || right.item.length - left.item.length)[0];
    return bestCandidate.score >= 0.25 ? bestCandidate.item : "";
  }

  private extractTextFromPdfBuffer(buffer: Buffer) {
    const raw = buffer.toString("latin1");
    const matches = raw.match(/\((?:\\.|[^\\()]){2,240}\)/g) || [];
    const fragments = matches
      .map((item) =>
        item
          .slice(1, -1)
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, " ")
          .replace(/\\t/g, " ")
          .replace(/\\([()\\])/g, "$1"),
      )
      .map((item) => this.normalizeTextContent(item))
      .filter((item) => item.length >= 2 && /[\u4e00-\u9fa5A-Za-z0-9]/.test(item));
    return this.normalizeTextContent(fragments.join("\n"));
  }

  private readZipEntries(buffer: Buffer): ZipEntryLike[] {
    try {
      const AdmZip = require("adm-zip") as { new (input: Buffer): AdmZipLike };
      const archive = new AdmZip(buffer);
      return archive.getEntries().filter((item) => !item.isDirectory);
    } catch {
      return [];
    }
  }

  private extractTextFromDocxBuffer(buffer: Buffer) {
    const entry = this.readZipEntries(buffer).find((item) => item.entryName === "word/document.xml");
    if (!entry) {
      return "";
    }
    return this.stripXmlTags(entry.getData().toString("utf8"));
  }

  private extractTextFromXlsxBuffer(buffer: Buffer) {
    const entries = this.readZipEntries(buffer);
    const sharedStringsEntry = entries.find((item) => item.entryName === "xl/sharedStrings.xml");
    const sheetEntries = entries.filter((item) => /^xl\/worksheets\/sheet\d+\.xml$/.test(item.entryName));
    const sharedStrings = sharedStringsEntry
      ? this.stripXmlTags(sharedStringsEntry.getData().toString("utf8"))
      : "";
    const sheetTexts = sheetEntries
      .map((item) => this.stripXmlTags(item.getData().toString("utf8")))
      .filter(Boolean)
      .join("\n");
    return this.normalizeTextContent([sharedStrings, sheetTexts].filter(Boolean).join("\n\n"));
  }

  private buildMetadataFallbackText(file: Pick<KnowledgeBaseFileRecord, "fileName" | "fileType" | "sourceName">) {
    return this.normalizeTextContent(
      [
        `资料标题：${file.fileName}`,
        `资料类型：${file.fileType}`,
        file.sourceName ? `资料来源：${file.sourceName}` : "",
        "说明：当前文件尚未完成正文提取，系统先按元数据生成占位分片，后续可继续补真实解析器。",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  private estimateTokenCount(value: string) {
    return Math.max(1, Math.ceil(String(value || "").length / 4));
  }

  private resolveChunkingConfig(config?: KnowledgeRetrievalConfigRecord) {
    const chunkSize = Math.max(200, Math.floor(config?.chunkSize ?? 800));
    const chunkOverlap = Math.max(0, Math.min(chunkSize - 1, Math.floor(config?.chunkOverlap ?? 120)));
    return {
      chunkSize,
      chunkOverlap,
    };
  }

  private splitTextIntoChunks(content: string, chunkSize: number, chunkOverlap: number) {
    const normalized = this.normalizeTextContent(content);
    if (!normalized) {
      return [];
    }
    if (normalized.length <= chunkSize) {
      return [normalized];
    }
    const chunks: string[] = [];
    let cursor = 0;
    while (cursor < normalized.length) {
      const nextCursor = Math.min(normalized.length, cursor + chunkSize);
      const chunk = this.normalizeTextContent(normalized.slice(cursor, nextCursor));
      if (chunk) {
        chunks.push(chunk);
      }
      if (nextCursor >= normalized.length) {
        break;
      }
      cursor = Math.max(nextCursor - chunkOverlap, cursor + 1);
    }
    return chunks;
  }

  private async getOrCreateKnowledgeRetrievalConfigInDatabase(knowledgeBaseId: string) {
    const existing = await this.prismaService.knowledgeRetrievalConfig.findUnique({
      where: { knowledgeBaseId },
    });
    if (existing) {
      return this.normalizeKnowledgeRetrievalConfig(existing);
    }
    const defaults = this.buildDefaultKnowledgeRetrievalConfigRecord(knowledgeBaseId);
    const created = await this.prismaService.knowledgeRetrievalConfig.create({
      data: {
        id: defaults.id,
        knowledgeBaseId,
        defaultTopK: defaults.defaultTopK,
        recallMode: defaults.recallMode,
        rerankEnabled: defaults.rerankEnabled,
        rerankModelName: defaults.rerankModelName ?? null,
        chunkSize: defaults.chunkSize ?? null,
        chunkOverlap: defaults.chunkOverlap ?? null,
        retrievalThreshold: defaults.retrievalThreshold ?? null,
        createdAt: new Date(defaults.createdAt),
        updatedAt: new Date(defaults.updatedAt),
      },
    });
    return this.normalizeKnowledgeRetrievalConfig(created);
  }

  private async extractKnowledgeBaseFileText(file: KnowledgeBaseFileRecord): Promise<ExtractedKnowledgeText> {
    const brandId = this.extractBusinessAssetsBrandId(file.knowledgeBaseId);
    if (!brandId) {
      return {
        content: this.buildMetadataFallbackText(file),
        sourceLabel: "metadata-fallback",
        usedFallback: true,
        note: "当前知识库文件没有关联品牌原始文档路径",
      };
    }
    const storedFileName = (await this.resolveBusinessAssetStoredFileName(brandId, file)) || this.sanitizeStoredFileName(file.fileName);
    const resolvedFileType = this.inferKnowledgeFileType(storedFileName, file.fileName);
    const storedFile = await this.ossStorageService.getObject(
      this.buildBrandAssetFileStorageKey(brandId, storedFileName),
    );
    if (!storedFile) {
      return {
        content: this.buildMetadataFallbackText(file),
        sourceLabel: "metadata-fallback",
        usedFallback: true,
        note: "未在 OSS 中找到对应原始文件",
        resolvedFileType,
      };
    }
    const extractedContent =
      resolvedFileType === "DOCX"
        ? this.extractTextFromDocxBuffer(storedFile.buffer)
        : resolvedFileType === "XLSX"
          ? this.extractTextFromXlsxBuffer(storedFile.buffer)
          : resolvedFileType === "PDF"
            ? this.extractTextFromPdfBuffer(storedFile.buffer)
            : this.decodeBufferAsText(storedFile.buffer);
    if (extractedContent) {
      return {
        content: extractedContent,
        sourceLabel: "file-content",
        usedFallback: false,
        resolvedFileType,
      };
    }
    return {
      content: this.buildMetadataFallbackText(file),
      sourceLabel: "metadata-fallback",
      usedFallback: true,
      note: "当前文件类型尚未提取到稳定正文",
      resolvedFileType,
    };
  }

  private async buildKnowledgeBaseProviderStatus(knowledgeBaseId: string) {
    const brandId = this.extractBusinessAssetsBrandId(knowledgeBaseId);
    if (!brandId) {
      const envApiKey = this.resolveEnvArkApiKey();
      return envApiKey ? "当前知识库暂无品牌共享 API Key 上下文，已启用本地 ARK_API_KEY 兜底" : "当前知识库暂无品牌共享 API Key 上下文";
    }
    const platform = await this.findBrandKnowledgeEmbeddingPlatform(brandId);
    if (!platform) {
      return `当前品牌尚未配置可用的火山方舟 embedding 平台，需包含模型 ${BRAND_KNOWLEDGE_EMBEDDING_MODEL}`;
    }
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(brandId, [platform.baseUrl]);
    if (resolution.status === "resolved") {
      return `已识别${resolution.platform?.name || platform.name || "火山方舟平台"}品牌共享 API Key，将使用 ${BRAND_KNOWLEDGE_EMBEDDING_MODEL} 生成 embedding`;
    }
    if (resolution.status === "brand-api-key-missing") {
      return `当前品牌尚未配置${resolution.platform?.name || platform.name || "火山方舟平台"}共享 API Key，无法执行知识库 embedding`;
    }
    if (resolution.status === "no-platform-match") {
      return `当前品牌未匹配到 ${platform.name || "火山方舟平台"} 的共享 API Key 配置`;
    }
    return "当前缺少品牌上下文，暂不能读取共享 API Key";
  }

  private resolveEnvArkApiKey() {
    return String(process.env.ARK_API_KEY || process.env.VOLCENGINE_ARK_API_KEY || "").trim();
  }

  private normalizeApiKeyForHeader(apiKey: string) {
    return String(apiKey || "").trim().replace(/^Bearer\s+/i, "");
  }

  private async readResponseSnippet(response: Response) {
    try {
      const text = (await response.text()).trim();
      if (!text) {
        return "";
      }
      return text.length > 180 ? `${text.slice(0, 180)}...` : text;
    } catch {
      return "";
    }
  }

  private describeFetchError(error: unknown, requestLabel: string) {
    if (error instanceof ServiceUnavailableException) {
      return error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      return new ServiceUnavailableException(`${requestLabel} 超时`);
    }
    const message = error instanceof Error ? error.message : "";
    return new ServiceUnavailableException(
      `${requestLabel} 网络请求失败${message && message !== "fetch failed" ? `：${message}` : ""}`,
    );
  }

  private async requestAuthorizedJson(
    baseUrl: string,
    requestPath: string,
    apiKey: string,
    body: Record<string, unknown>,
    timeoutMs: number,
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}${requestPath}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.normalizeApiKeyForHeader(apiKey)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        const snippet = await this.readResponseSnippet(response);
        throw new ServiceUnavailableException(
          `POST ${requestPath} 失败：${response.status}${snippet ? `，${snippet}` : ""}`,
        );
      }
      return await response.json() as Record<string, unknown>;
    } catch (error) {
      throw this.describeFetchError(error, `POST ${baseUrl}${requestPath}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private parseEmbeddingNumbers(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }

  private resolveEmbeddingVector(payload: Record<string, unknown>) {
    const data = payload.data;
    if (Array.isArray(data) && data.length) {
      const first = data[0];
      if (first && typeof first === "object") {
        const embedding = this.parseEmbeddingNumbers((first as Record<string, unknown>).embedding);
        if (embedding.length) {
          return embedding;
        }
      }
    }
    if (data && typeof data === "object") {
      const embedding = this.parseEmbeddingNumbers((data as Record<string, unknown>).embedding);
      if (embedding.length) {
        return embedding;
      }
    }
    return this.parseEmbeddingNumbers(payload.embedding);
  }

  private computeCosineSimilarity(left: number[], right: number[]) {
    if (!left.length || !right.length) {
      return 0;
    }
    const length = Math.min(left.length, right.length);
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < length; index += 1) {
      const leftValue = left[index] || 0;
      const rightValue = right[index] || 0;
      dot += leftValue * rightValue;
      leftNorm += leftValue * leftValue;
      rightNorm += rightValue * rightValue;
    }
    if (leftNorm <= 0 || rightNorm <= 0) {
      return 0;
    }
    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
  }

  private async resolveEmbeddingProviderConfig() {
    const providers = await this.apiProvidersService.listActiveProvidersByRuntimeKey("embedding-multimodal");
    const provider = providers.find((item) => item.defaultModel === "doubao-embedding-vision-250615")
      || providers.find((item) => item.modelWhitelist.includes("doubao-embedding-vision-250615"))
      || providers[0];
    if (!provider) {
      throw new ServiceUnavailableException("未找到可用的 embedding 供应商配置");
    }
    const baseUrl = this.apiProvidersService.getBaseUrls(provider)[0] || provider.baseUrl;
    if (!baseUrl) {
      throw new ServiceUnavailableException("embedding 供应商未配置 baseUrl");
    }
    const embeddingPath = this.apiProvidersService.getStringExtra(provider, "embeddingPath") || "/embeddings/multimodal";
    const dimensions = Math.max(256, this.apiProvidersService.getNumberExtra(provider, "dimensions") || 1024);
    return {
      providerId: provider.id,
      providerName: provider.name,
      baseUrl,
      embeddingPath,
      modelName: provider.defaultModel || provider.modelWhitelist[0] || "doubao-embedding-vision-250615",
      dimensions,
      timeoutMs: provider.timeoutMs || 60000,
    } satisfies EmbeddingProviderConfig;
  }

  private async findBrandKnowledgeEmbeddingPlatform(brandId: string) {
    const normalizedBrandId = String(brandId || "").trim();
    if (!normalizedBrandId) {
      return null;
    }
    const platforms = await this.thirdPartyPlatformsService.listPlatforms();
    return platforms.find((item) =>
      item.status === "ACTIVE"
      && item.providerType === "DOUBAO"
      && (
        item.defaultModel === BRAND_KNOWLEDGE_EMBEDDING_MODEL
        || item.modelIds.includes(BRAND_KNOWLEDGE_EMBEDDING_MODEL)
      ),
    ) || null;
  }

  private async resolveKnowledgeBaseEmbeddingProviderConfig(knowledgeBaseId: string) {
    const brandId = this.extractBusinessAssetsBrandId(knowledgeBaseId);
    if (!brandId) {
      return this.resolveEmbeddingProviderConfig();
    }
    const platform = await this.findBrandKnowledgeEmbeddingPlatform(brandId);
    if (!platform) {
      throw new ServiceUnavailableException(
        `当前品牌尚未配置可用的火山方舟 embedding 平台，需包含模型 ${BRAND_KNOWLEDGE_EMBEDDING_MODEL}`,
      );
    }
    return {
      providerId: platform.id,
      providerName: platform.name,
      baseUrl: String(platform.baseUrl || "").trim().replace(/\/+$/, ""),
      embeddingPath: "/embeddings/multimodal",
      modelName: BRAND_KNOWLEDGE_EMBEDDING_MODEL,
      dimensions: 1024,
      timeoutMs: 60000,
    } satisfies EmbeddingProviderConfig;
  }

  private async resolveKnowledgeBaseEmbeddingApiKey(knowledgeBaseId: string, provider: EmbeddingProviderConfig) {
    const brandId = this.extractBusinessAssetsBrandId(knowledgeBaseId);
    if (!brandId) {
      return this.resolveEnvArkApiKey();
    }
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(brandId, [provider.baseUrl]);
    if (resolution.status !== "resolved") {
      throw new ServiceUnavailableException(
        `当前品牌尚未配置${resolution.platform?.name || provider.providerName || "火山方舟平台"}共享 API Key，无法执行检索测试`,
      );
    }
    const apiKey = String(resolution.apiKeys[0] || "").trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        `当前品牌尚未配置${resolution.platform?.name || provider.providerName || "火山方舟平台"}共享 API Key，无法执行检索测试`,
      );
    }
    return apiKey;
  }

  private async replaceKnowledgeChunkEmbeddingsInDatabase(
    file: KnowledgeBaseFileRecord,
    provider: EmbeddingProviderConfig,
    apiKey: string,
  ) {
    const chunks = await this.prismaService.knowledgeChunk.findMany({
      where: { fileId: file.id },
      orderBy: { chunkIndex: "asc" },
    });
    await this.prismaService.knowledgeEmbedding.deleteMany({
      where: {
        fileId: file.id,
        modelName: provider.modelName,
      },
    });
    if (!chunks.length || !apiKey) {
      return 0;
    }
    let createdCount = 0;
    for (const chunk of chunks) {
      const payload = await this.requestAuthorizedJson(
        provider.baseUrl,
        provider.embeddingPath,
        apiKey,
        {
          model: provider.modelName,
          encoding_format: "float",
          dimensions: provider.dimensions,
          input: [
            {
              type: "text",
              text: chunk.content,
            },
          ],
        },
        provider.timeoutMs,
      );
      const embedding = this.resolveEmbeddingVector(payload);
      if (!embedding.length) {
        continue;
      }
      await this.prismaService.knowledgeEmbedding.create({
        data: {
          id: this.createId("kbe"),
          knowledgeBaseId: file.knowledgeBaseId,
          fileId: file.id,
          chunkId: chunk.id,
          modelName: provider.modelName,
          providerName: provider.providerName,
          dimensions: embedding.length,
          embeddingJson: embedding as unknown as Prisma.InputJsonValue,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      createdCount += 1;
    }
    return createdCount;
  }

  private async createQueryEmbedding(
    provider: EmbeddingProviderConfig,
    apiKey: string,
    query: string,
  ) {
    const payload = await this.requestAuthorizedJson(
      provider.baseUrl,
      provider.embeddingPath,
      apiKey,
      {
        model: provider.modelName,
        encoding_format: "float",
        dimensions: provider.dimensions,
        input: [
          {
            type: "text",
            text: query,
          },
        ],
      },
      provider.timeoutMs,
    );
    return this.resolveEmbeddingVector(payload);
  }

  private async replaceKnowledgeBaseFileChunksInDatabase(
    file: KnowledgeBaseFileRecord,
    chunks: PersistedKnowledgeChunkInput[],
  ) {
    await this.prismaService.knowledgeChunk.deleteMany({
      where: { fileId: file.id },
    });
    if (!chunks.length) {
      return;
    }
    await this.prismaService.knowledgeChunk.createMany({
      data: chunks.map((item) => ({
        id: this.createId("kbc"),
        knowledgeBaseId: file.knowledgeBaseId,
        fileId: file.id,
        chunkIndex: item.chunkIndex,
        content: item.content,
        tokenCount: item.tokenCount,
        charCount: item.charCount,
        contentHash: createHash("sha256").update(item.content).digest("hex"),
        sourceLabel: item.sourceLabel ?? null,
        metadataJson: item.metadataJson,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });
  }

  private async ingestKnowledgeBaseFileInDatabase(file: KnowledgeBaseFileRecord) {
    const retrievalConfig = await this.getOrCreateKnowledgeRetrievalConfigInDatabase(file.knowledgeBaseId);
    const extracted = await this.extractKnowledgeBaseFileText(file);
    const effectiveFile =
      extracted.resolvedFileType && extracted.resolvedFileType !== file.fileType
        ? {
            ...file,
            fileType: extracted.resolvedFileType,
          }
        : file;
    if (effectiveFile !== file) {
      await this.prismaService.knowledgeBaseFile.update({
        where: { id: file.id },
        data: {
          fileType: effectiveFile.fileType,
        },
      });
    }
    const chunking = this.resolveChunkingConfig(retrievalConfig);
    const chunks = this.splitTextIntoChunks(extracted.content, chunking.chunkSize, chunking.chunkOverlap).map(
      (item, index) => ({
        chunkIndex: index,
        content: item,
        tokenCount: this.estimateTokenCount(item),
        charCount: item.length,
        sourceLabel: extracted.sourceLabel,
        metadataJson: {
          sourceLabel: extracted.sourceLabel,
          usedFallback: extracted.usedFallback,
          fileName: effectiveFile.fileName,
          fileType: effectiveFile.fileType,
        } as Prisma.InputJsonValue,
      }),
    );
    await this.replaceKnowledgeBaseFileChunksInDatabase(effectiveFile, chunks);
    let providerStatus = await this.buildKnowledgeBaseProviderStatus(file.knowledgeBaseId);
    try {
      const provider = await this.resolveKnowledgeBaseEmbeddingProviderConfig(effectiveFile.knowledgeBaseId);
      const apiKey = await this.resolveKnowledgeBaseEmbeddingApiKey(effectiveFile.knowledgeBaseId, provider);
      const embeddingCount = await this.replaceKnowledgeChunkEmbeddingsInDatabase(effectiveFile, provider, apiKey);
      if (apiKey) {
        providerStatus = `${providerStatus}，已生成 ${embeddingCount} 条 embedding`;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "embedding 写入失败";
      providerStatus = `${providerStatus}，embedding 暂未落库：${message}`;
    }
    return {
      chunkCount: chunks.length,
      summary: this.buildFileSyncSummary(effectiveFile, chunks.length, extracted, providerStatus),
    };
  }

  private async refreshKnowledgeBaseSummaryInDatabase(knowledgeBaseId: string, updatedAt = new Date().toISOString()) {
    const files = await this.prismaService.knowledgeBaseFile.findMany({
      where: { knowledgeBaseId },
      orderBy: { uploadedAt: "desc" },
    });
    const normalizedFiles = files.map((item) => this.normalizeKnowledgeBaseFile(item));
    const knowledgeBase = await this.prismaService.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: {
        documentCount: normalizedFiles.length,
        chunkCount: normalizedFiles.reduce((sum, item) => sum + item.chunkCount, 0),
        syncStatus: this.deriveSyncStatus(normalizedFiles),
        updatedAt: new Date(updatedAt),
      },
    });

    return this.normalizeKnowledgeBase(knowledgeBase);
  }

  private createSyncRunFromMock(
    knowledgeBaseId: string,
    payload: Pick<KnowledgeBaseSyncRunRecord, "scope" | "operator" | "result" | "summary"> &
      Partial<Pick<KnowledgeBaseSyncRunRecord, "fileId" | "fileName" | "errorDetail" | "completedAt">>,
  ) {
    const run: KnowledgeBaseSyncRunRecord = {
      id: this.createId("kbsr"),
      knowledgeBaseId,
      scope: payload.scope,
      operator: payload.operator,
      fileId: payload.fileId,
      fileName: payload.fileName,
      result: payload.result,
      summary: payload.summary,
      errorDetail: payload.errorDetail,
      startedAt: new Date().toISOString(),
      completedAt: payload.completedAt,
    };

    database.knowledgeBaseSyncRuns.unshift(run);
    return run;
  }

  private completeSyncRunFromMock(runId: string, payload: CompleteKnowledgeBaseSyncRunPayload) {
    const run = this.getKnowledgeBaseSyncRunOrThrowFromMock(runId);
    run.result = payload.result;
    run.summary =
      payload.summary ||
      (payload.result === "SUCCESS" ? "同步任务执行成功。" : "同步任务执行失败，请查看失败原因。");
    run.errorDetail = payload.result === "FAILED" ? payload.errorDetail || "未提供失败原因。" : undefined;
    run.completedAt = new Date().toISOString();
    return run;
  }

  private async completeSyncRunInDatabase(runId: string, payload: CompleteKnowledgeBaseSyncRunPayload) {
    const run = await this.prismaService.knowledgeBaseSyncRun.update({
      where: { id: runId },
      data: {
        result: payload.result,
        summary:
          payload.summary ||
          (payload.result === "SUCCESS" ? "同步任务执行成功。" : "同步任务执行失败，请查看失败原因。"),
        errorDetail: payload.result === "FAILED" ? payload.errorDetail || "未提供失败原因。" : null,
        completedAt: new Date(),
      },
    });
    return this.normalizeKnowledgeBaseSyncRun(run);
  }

  private async createSyncRunInDatabase(
    knowledgeBaseId: string,
    payload: Pick<KnowledgeBaseSyncRunRecord, "scope" | "operator" | "result" | "summary"> &
      Partial<Pick<KnowledgeBaseSyncRunRecord, "fileId" | "fileName" | "errorDetail" | "completedAt">>,
  ) {
    const run = await this.prismaService.knowledgeBaseSyncRun.create({
      data: {
        id: this.createId("kbsr"),
        knowledgeBaseId,
        scope: payload.scope,
        operator: payload.operator,
        fileId: payload.fileId,
        fileName: payload.fileName,
        result: payload.result,
        summary: payload.summary,
        errorDetail: payload.errorDetail,
        startedAt: new Date(),
        completedAt: payload.completedAt ? new Date(payload.completedAt) : undefined,
      },
    });

    return this.normalizeKnowledgeBaseSyncRun(run);
  }

  async listKnowledgeBaseFiles(knowledgeBaseId?: string) {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const rows = await this.prismaService.knowledgeBaseFile.findMany({
        where: knowledgeBaseId ? { knowledgeBaseId } : undefined,
        orderBy: { uploadedAt: "desc" },
      });
      return rows.map((item) => this.normalizeKnowledgeBaseFile(item));
    }

    return this.listKnowledgeBaseFilesFromMock(knowledgeBaseId);
  }

  async listKnowledgeFileChunks(fileId: string): Promise<KnowledgeChunkRecord[]> {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.getKnowledgeBaseFileOrThrow(fileId);
      const rows = await this.prismaService.knowledgeChunk.findMany({
        where: { fileId },
        orderBy: { chunkIndex: "asc" },
      });
      return rows.map((item) => this.normalizeKnowledgeChunk(item));
    }
    return [];
  }

  async listKnowledgeFileEmbeddings(fileId: string): Promise<KnowledgeEmbeddingRecord[]> {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.getKnowledgeBaseFileOrThrow(fileId);
      const rows = await this.prismaService.knowledgeEmbedding.findMany({
        where: { fileId },
        orderBy: [{ createdAt: "desc" }],
      });
      return rows.map((item) => this.normalizeKnowledgeEmbedding(item));
    }
    return [];
  }

  async listKnowledgeBaseSyncRuns(knowledgeBaseId?: string) {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const rows = await this.prismaService.knowledgeBaseSyncRun.findMany({
        where: knowledgeBaseId ? { knowledgeBaseId } : undefined,
        orderBy: { startedAt: "desc" },
      });
      return rows.map((item) => this.normalizeKnowledgeBaseSyncRun(item));
    }

    return this.listKnowledgeBaseSyncRunsFromMock(knowledgeBaseId);
  }

  async listKnowledgeInvocationRuns(knowledgeBaseId?: string): Promise<KnowledgeInvocationRecord[]> {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.ensureKnowledgeInvocationStorageSeeded();
      const rows = await this.prismaService.$queryRawUnsafe<KnowledgeInvocationRow[]>(
        `SELECT "id",
                "brandId",
                "sourceModule",
                "sceneLabel",
                "moduleTargetId",
                "skillPackageKey",
                "skillSlug",
                "knowledgeBaseIdsJson",
                "knowledgeBaseNamesJson",
                "matchedKnowledgeBaseIdsJson",
                "matchedKnowledgeBaseNamesJson",
                "retrievalQuery",
                "hitCount",
                "status",
                "summary",
                "createdAt"
           FROM "KnowledgeInvocationRun"
          ORDER BY "createdAt" DESC
          LIMIT 200`,
      );
      const normalized = rows.map((item) => this.normalizeKnowledgeInvocation(item));
      if (!knowledgeBaseId) {
        return normalized;
      }
      return normalized.filter(
        (item) => item.knowledgeBaseIds.includes(knowledgeBaseId) || item.matchedKnowledgeBaseIds.includes(knowledgeBaseId),
      );
    }

    return this.listKnowledgeInvocationRunsFromMock(knowledgeBaseId);
  }

  async recordKnowledgeInvocation(payload: RecordKnowledgeInvocationPayload): Promise<KnowledgeInvocationRecord | null> {
    const sceneLabel = String(payload.sceneLabel || "").trim();
    const summary = String(payload.summary || "").trim();
    if (!sceneLabel || !summary) {
      return null;
    }

    const record: KnowledgeInvocationRecord = {
      id: this.createId("kbir"),
      brandId: String(payload.brandId || "").trim() || undefined,
      sourceModule: payload.sourceModule,
      sceneLabel,
      moduleTargetId: String(payload.moduleTargetId || "").trim() || undefined,
      skillPackageKey: String(payload.skillPackageKey || "").trim() || undefined,
      skillSlug: String(payload.skillSlug || "").trim() || undefined,
      knowledgeBaseIds: Array.from(new Set((payload.knowledgeBaseIds || []).map((item) => String(item || "").trim()).filter(Boolean))),
      knowledgeBaseNames: Array.from(new Set((payload.knowledgeBaseNames || []).map((item) => String(item || "").trim()).filter(Boolean))),
      matchedKnowledgeBaseIds: Array.from(
        new Set((payload.matchedKnowledgeBaseIds || []).map((item) => String(item || "").trim()).filter(Boolean)),
      ),
      matchedKnowledgeBaseNames: Array.from(
        new Set((payload.matchedKnowledgeBaseNames || []).map((item) => String(item || "").trim()).filter(Boolean)),
      ),
      retrievalQuery: String(payload.retrievalQuery || "").trim() || undefined,
      hitCount: Math.max(0, Number(payload.hitCount || 0)),
      status: payload.status,
      summary,
      createdAt: new Date().toISOString(),
    };

    try {
      if (await this.canUseKnowledgeBaseStorage()) {
        await this.ensureKnowledgeBaseStorageSeeded();
        await this.ensureKnowledgeInvocationStorageSeeded();
        await this.prismaService.$executeRawUnsafe(
          `INSERT INTO "KnowledgeInvocationRun" (
            "id",
            "brandId",
            "sourceModule",
            "sceneLabel",
            "moduleTargetId",
            "skillPackageKey",
            "skillSlug",
            "knowledgeBaseIdsJson",
            "knowledgeBaseNamesJson",
            "matchedKnowledgeBaseIdsJson",
            "matchedKnowledgeBaseNamesJson",
            "retrievalQuery",
            "hitCount",
            "status",
            "summary",
            "createdAt"
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15,$16
          )`,
          record.id,
          record.brandId ?? null,
          record.sourceModule,
          record.sceneLabel,
          record.moduleTargetId ?? null,
          record.skillPackageKey ?? null,
          record.skillSlug ?? null,
          JSON.stringify(record.knowledgeBaseIds),
          JSON.stringify(record.knowledgeBaseNames),
          JSON.stringify(record.matchedKnowledgeBaseIds),
          JSON.stringify(record.matchedKnowledgeBaseNames),
          record.retrievalQuery ?? null,
          record.hitCount,
          record.status,
          record.summary,
          new Date(record.createdAt),
        );
        return record;
      }

      database.knowledgeInvocationRuns.unshift(record);
      database.knowledgeInvocationRuns = database.knowledgeInvocationRuns.slice(0, 200);
      return record;
    } catch {
      return null;
    }
  }

  async listKnowledgeBindings(query: KnowledgeBindingQuery = {}): Promise<KnowledgeBindingView[]> {
    if (await this.canUseKnowledgeBindingStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.ensureKnowledgeBindingStorageSeeded();
      const rows = await this.prismaService.knowledgeBinding.findMany({
        where: {
          knowledgeBaseId: query.knowledgeBaseId,
          bindingType: query.bindingType,
          targetId: query.targetId,
          enabled: typeof query.enabled === "boolean" ? query.enabled : undefined,
        },
        include: { knowledgeBase: true },
        orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      });
      return rows.map((item) => this.normalizeKnowledgeBinding(item));
    }

    return this.listKnowledgeBindingsFromMock(query);
  }

  async listKnowledgeRetrievalConfigs(knowledgeBaseId?: string): Promise<KnowledgeRetrievalConfigRecord[]> {
    if (await this.canUseKnowledgeRetrievalConfigStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.ensureKnowledgeRetrievalConfigStorageSeeded();
      if (knowledgeBaseId) {
        await this.getKnowledgeBaseOrThrow(knowledgeBaseId);
        const existing = await this.prismaService.knowledgeRetrievalConfig.findUnique({
          where: { knowledgeBaseId },
        });
        if (existing) {
          return [this.normalizeKnowledgeRetrievalConfig(existing)];
        }

        const defaults = this.buildDefaultKnowledgeRetrievalConfigRecord(knowledgeBaseId);
        const created = await this.prismaService.knowledgeRetrievalConfig.create({
          data: {
            id: defaults.id,
            knowledgeBaseId,
            defaultTopK: defaults.defaultTopK,
            recallMode: defaults.recallMode,
            rerankEnabled: defaults.rerankEnabled,
            rerankModelName: defaults.rerankModelName ?? null,
            chunkSize: defaults.chunkSize ?? null,
            chunkOverlap: defaults.chunkOverlap ?? null,
            retrievalThreshold: defaults.retrievalThreshold ?? null,
            createdAt: new Date(defaults.createdAt),
            updatedAt: new Date(defaults.updatedAt),
          },
        });
        return [this.normalizeKnowledgeRetrievalConfig(created)];
      }

      const rows = await this.prismaService.knowledgeRetrievalConfig.findMany({
        orderBy: { updatedAt: "desc" },
      });
      return rows.map((item) => this.normalizeKnowledgeRetrievalConfig(item));
    }

    return this.listKnowledgeRetrievalConfigsFromMock(knowledgeBaseId);
  }

  async listKnowledgeBindingsByTarget(
    bindingType: string,
    targetId: string,
    enabled?: boolean,
  ): Promise<KnowledgeBindingView[]> {
    const normalizedBindingType = this.validateBindingType(bindingType);
    const normalizedTargetId = String(targetId || "").trim();
    if (!normalizedTargetId) {
      throw new BadRequestException("目标对象 ID 不能为空");
    }

    return this.listKnowledgeBindings({
      bindingType: normalizedBindingType,
      targetId: normalizedTargetId,
      enabled,
    });
  }

  async createKnowledgeBinding(payload: CreateKnowledgeBindingPayload): Promise<KnowledgeBindingView> {
    const knowledgeBaseId = String(payload.knowledgeBaseId || "").trim();
    const targetId = String(payload.targetId || "").trim();
    if (!knowledgeBaseId) {
      throw new BadRequestException("知识库 ID 不能为空");
    }
    if (!targetId) {
      throw new BadRequestException("目标对象 ID 不能为空");
    }

    const bindingType = this.validateBindingType(payload.bindingType);
    const retrievalMode = this.validateRetrievalMode(payload.retrievalMode);
    const priority = this.validateBindingPriority(payload.priority);

    if (await this.canUseKnowledgeBindingStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.ensureKnowledgeBindingStorageSeeded();
      const knowledgeBase = await this.getKnowledgeBaseOrThrow(knowledgeBaseId);
      if (knowledgeBase.status === "DISABLED") {
        throw new BadRequestException("停用的知识库不允许新增绑定");
      }

      const existing = await this.prismaService.knowledgeBinding.findUnique({
        where: {
          knowledgeBaseId_bindingType_targetId: {
            knowledgeBaseId,
            bindingType,
            targetId,
          },
        },
      });
      if (existing) {
        throw new ConflictException("同一目标对象已绑定该知识库");
      }

      const binding = await this.prismaService.knowledgeBinding.create({
        data: {
          id: this.createId("kbb"),
          knowledgeBaseId,
          bindingType,
          targetId,
          targetKey: String(payload.targetKey || "").trim() || null,
          targetName: String(payload.targetName || "").trim() || null,
          priority,
          retrievalMode,
          isRequired: Boolean(payload.isRequired),
          enabled: typeof payload.enabled === "boolean" ? payload.enabled : true,
        },
        include: { knowledgeBase: true },
      });

      return this.normalizeKnowledgeBinding(binding);
    }

    const knowledgeBase = this.getKnowledgeBaseOrThrowFromMock(knowledgeBaseId);
    if (knowledgeBase.status === "DISABLED") {
      throw new BadRequestException("停用的知识库不允许新增绑定");
    }
    const duplicated = database.knowledgeBindings.find(
      (item) => item.knowledgeBaseId === knowledgeBaseId && item.bindingType === bindingType && item.targetId === targetId,
    );
    if (duplicated) {
      throw new ConflictException("同一目标对象已绑定该知识库");
    }

    const now = new Date().toISOString();
    const binding: KnowledgeBindingRecord = {
      id: this.createId("kbb"),
      knowledgeBaseId,
      bindingType,
      targetId,
      targetKey: String(payload.targetKey || "").trim() || undefined,
      targetName: String(payload.targetName || "").trim() || undefined,
      priority,
      retrievalMode,
      isRequired: Boolean(payload.isRequired),
      enabled: typeof payload.enabled === "boolean" ? payload.enabled : true,
      createdAt: now,
      updatedAt: now,
    };
    database.knowledgeBindings.unshift(binding);
    return this.enrichMockKnowledgeBinding(binding);
  }

  async updateKnowledgeBinding(bindingId: string, payload: UpdateKnowledgeBindingPayload): Promise<KnowledgeBindingView> {
    if (await this.canUseKnowledgeBindingStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.ensureKnowledgeBindingStorageSeeded();
      const current = await this.getKnowledgeBindingOrThrow(bindingId);
      const binding = await this.prismaService.knowledgeBinding.update({
        where: { id: bindingId },
        data: {
          targetKey: payload.targetKey !== undefined ? String(payload.targetKey || "").trim() || null : current.targetKey,
          targetName:
            payload.targetName !== undefined ? String(payload.targetName || "").trim() || null : current.targetName,
          priority: payload.priority !== undefined ? this.validateBindingPriority(payload.priority) : current.priority,
          retrievalMode:
            payload.retrievalMode !== undefined
              ? this.validateRetrievalMode(payload.retrievalMode)
              : current.retrievalMode,
          isRequired: payload.isRequired ?? current.isRequired,
          enabled: payload.enabled ?? current.enabled,
          updatedAt: new Date(),
        },
        include: { knowledgeBase: true },
      });

      return this.normalizeKnowledgeBinding(binding);
    }

    const binding = this.getKnowledgeBindingOrThrowFromMock(bindingId);
    if (payload.targetKey !== undefined) {
      binding.targetKey = String(payload.targetKey || "").trim() || undefined;
    }
    if (payload.targetName !== undefined) {
      binding.targetName = String(payload.targetName || "").trim() || undefined;
    }
    if (payload.priority !== undefined) {
      binding.priority = this.validateBindingPriority(payload.priority);
    }
    if (payload.retrievalMode !== undefined) {
      binding.retrievalMode = this.validateRetrievalMode(payload.retrievalMode);
    }
    if (typeof payload.isRequired === "boolean") {
      binding.isRequired = payload.isRequired;
    }
    if (typeof payload.enabled === "boolean") {
      binding.enabled = payload.enabled;
    }
    binding.updatedAt = new Date().toISOString();

    return this.enrichMockKnowledgeBinding(binding);
  }

  async deleteKnowledgeBinding(bindingId: string): Promise<KnowledgeBindingView> {
    if (await this.canUseKnowledgeBindingStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.ensureKnowledgeBindingStorageSeeded();
      const binding = await this.getKnowledgeBindingOrThrow(bindingId);
      await this.prismaService.knowledgeBinding.delete({
        where: { id: bindingId },
      });
      return this.normalizeKnowledgeBinding(binding);
    }

    const index = database.knowledgeBindings.findIndex((item) => item.id === bindingId);
    if (index < 0) {
      throw new NotFoundException("知识绑定不存在");
    }

    const [binding] = database.knowledgeBindings.splice(index, 1);
    return this.enrichMockKnowledgeBinding(binding);
  }

  async updateKnowledgeRetrievalConfig(
    knowledgeBaseId: string,
    payload: UpdateKnowledgeRetrievalConfigPayload,
  ): Promise<KnowledgeRetrievalConfigRecord> {
    const normalizedKnowledgeBaseId = String(knowledgeBaseId || "").trim();
    if (!normalizedKnowledgeBaseId) {
      throw new BadRequestException("知识库 ID 不能为空");
    }

    const now = new Date().toISOString();
    const applyResolvedConfig = (current?: KnowledgeRetrievalConfigRecord): KnowledgeRetrievalConfigRecord => {
      const defaults = current ?? this.buildDefaultKnowledgeRetrievalConfigRecord(normalizedKnowledgeBaseId, now);
      const defaultTopK =
        payload.defaultTopK !== undefined
          ? this.validatePositiveIntegerField(payload.defaultTopK, "默认 TopK")
          : defaults.defaultTopK;
      const recallMode =
        payload.recallMode !== undefined ? this.validateRetrievalRecallMode(payload.recallMode) : defaults.recallMode;
      const rerankEnabled = payload.rerankEnabled ?? defaults.rerankEnabled;
      const chunkSize =
        payload.chunkSize !== undefined
          ? this.validatePositiveIntegerField(payload.chunkSize, "切片大小")
          : defaults.chunkSize;
      const chunkOverlap =
        payload.chunkOverlap !== undefined
          ? this.validatePositiveIntegerField(payload.chunkOverlap, "切片重叠", true)
          : defaults.chunkOverlap;
      const retrievalThreshold =
        payload.retrievalThreshold !== undefined
          ? this.validateRetrievalThreshold(payload.retrievalThreshold)
          : defaults.retrievalThreshold;
      if (
        chunkSize !== undefined &&
        chunkOverlap !== undefined &&
        Number.isFinite(chunkSize) &&
        Number.isFinite(chunkOverlap) &&
        chunkOverlap >= chunkSize
      ) {
        throw new BadRequestException("切片重叠必须小于切片大小");
      }
      const rerankModelName = rerankEnabled
        ? payload.rerankModelName !== undefined
          ? String(payload.rerankModelName || "").trim() || undefined
          : defaults.rerankModelName
        : undefined;

      return {
        id: defaults.id,
        knowledgeBaseId: normalizedKnowledgeBaseId,
        defaultTopK,
        recallMode,
        rerankEnabled,
        rerankModelName,
        chunkSize,
        chunkOverlap,
        retrievalThreshold,
        createdAt: defaults.createdAt,
        updatedAt: now,
      };
    };

    if (await this.canUseKnowledgeRetrievalConfigStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.ensureKnowledgeRetrievalConfigStorageSeeded();
      await this.getKnowledgeBaseOrThrow(normalizedKnowledgeBaseId);

      let current: KnowledgeRetrievalConfigRecord | undefined;
      try {
        current = this.normalizeKnowledgeRetrievalConfig(
          await this.getKnowledgeRetrievalConfigOrThrow(normalizedKnowledgeBaseId),
        );
      } catch (error) {
        if (!(error instanceof NotFoundException)) {
          throw error;
        }
      }

      const resolved = applyResolvedConfig(current);
      const saved = current
        ? await this.prismaService.knowledgeRetrievalConfig.update({
            where: { knowledgeBaseId: normalizedKnowledgeBaseId },
            data: {
              defaultTopK: resolved.defaultTopK,
              recallMode: resolved.recallMode,
              rerankEnabled: resolved.rerankEnabled,
              rerankModelName: resolved.rerankModelName ?? null,
              chunkSize: resolved.chunkSize ?? null,
              chunkOverlap: resolved.chunkOverlap ?? null,
              retrievalThreshold: resolved.retrievalThreshold ?? null,
              updatedAt: new Date(now),
            },
          })
        : await this.prismaService.knowledgeRetrievalConfig.create({
            data: {
              id: resolved.id,
              knowledgeBaseId: normalizedKnowledgeBaseId,
              defaultTopK: resolved.defaultTopK,
              recallMode: resolved.recallMode,
              rerankEnabled: resolved.rerankEnabled,
              rerankModelName: resolved.rerankModelName ?? null,
              chunkSize: resolved.chunkSize ?? null,
              chunkOverlap: resolved.chunkOverlap ?? null,
              retrievalThreshold: resolved.retrievalThreshold ?? null,
              createdAt: new Date(resolved.createdAt),
              updatedAt: new Date(now),
            },
          });

      return this.normalizeKnowledgeRetrievalConfig(saved);
    }

    this.getKnowledgeBaseOrThrowFromMock(normalizedKnowledgeBaseId);
    const index = database.knowledgeRetrievalConfigs.findIndex((item) => item.knowledgeBaseId === normalizedKnowledgeBaseId);
    const current = index >= 0 ? database.knowledgeRetrievalConfigs[index] : undefined;
    const resolved = applyResolvedConfig(current);
    if (index >= 0) {
      database.knowledgeRetrievalConfigs[index] = resolved;
    } else {
      database.knowledgeRetrievalConfigs.unshift(resolved);
    }
    return resolved;
  }

  async updateKnowledgeBase(id: string, payload: UpdateKnowledgeBasePayload) {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const current = await this.getKnowledgeBaseOrThrow(id);
      const updated = await this.prismaService.knowledgeBase.update({
        where: { id },
        data: {
          status: payload.status ?? current.status,
          syncStatus: payload.syncStatus ?? current.syncStatus,
          sourceType: payload.sourceType ?? current.sourceType,
          description: payload.description ?? current.description,
          updatedAt: new Date(),
        },
      });
      return this.normalizeKnowledgeBase(updated);
    }

    const knowledgeBase = database.knowledgeBases.find((item) => item.id === id);
    if (!knowledgeBase) {
      throw new NotFoundException("知识库不存在");
    }

    if (payload.status) {
      knowledgeBase.status = payload.status;
    }
    if (payload.syncStatus) {
      knowledgeBase.syncStatus = payload.syncStatus;
    }
    if (payload.sourceType) {
      knowledgeBase.sourceType = payload.sourceType;
    }
    if (payload.description !== undefined) {
      knowledgeBase.description = payload.description;
    }
    knowledgeBase.updatedAt = new Date().toISOString();

    return knowledgeBase;
  }

  async runKnowledgeRetrievalTest(
    knowledgeBaseId: string,
    payload: RunKnowledgeRetrievalTestPayload,
  ): Promise<KnowledgeRetrievalTestResult> {
    const query = String(payload.query || "").trim();
    if (!query) {
      throw new BadRequestException("检索问题不能为空");
    }
    if (!(await this.canUseKnowledgeBaseStorage())) {
      return {
        knowledgeBaseId,
        query,
        topK: Math.max(1, Math.floor(payload.topK || 5)),
        modelName: "mock",
        hitCount: 0,
        hits: [],
      };
    }
    await this.ensureKnowledgeBaseStorageSeeded();
    await this.getKnowledgeBaseOrThrow(knowledgeBaseId);
    const retrievalConfig = await this.getOrCreateKnowledgeRetrievalConfigInDatabase(knowledgeBaseId);
    const provider = await this.resolveKnowledgeBaseEmbeddingProviderConfig(knowledgeBaseId);
    const apiKey = await this.resolveKnowledgeBaseEmbeddingApiKey(knowledgeBaseId, provider);
    if (!apiKey) {
      throw new ServiceUnavailableException("当前未找到可用的火山方舟 API Key，无法执行检索测试");
    }
    const queryEmbedding = await this.createQueryEmbedding(provider, apiKey, query);
    if (!queryEmbedding.length) {
      throw new ServiceUnavailableException("检索向量生成失败");
    }
    const topK = Math.max(1, Math.min(20, Math.floor(payload.topK || retrievalConfig.defaultTopK || 5)));
    const threshold = typeof retrievalConfig.retrievalThreshold === "number" ? retrievalConfig.retrievalThreshold : -1;
    const embeddings = await this.prismaService.knowledgeEmbedding.findMany({
      where: {
        knowledgeBaseId,
        modelName: provider.modelName,
      },
      include: {
        chunk: true,
        file: true,
      },
    });
    const hits = embeddings
      .map((item) => {
        const embedding = this.parseEmbeddingNumbers(item.embeddingJson);
        const score = this.computeCosineSimilarity(queryEmbedding, embedding);
        return {
          chunkId: item.chunkId,
          fileId: item.fileId,
          fileName: item.file.fileName,
          chunkIndex: item.chunk.chunkIndex,
          score,
          content: item.chunk.content,
          sourceLabel: item.chunk.sourceLabel ?? undefined,
        } satisfies KnowledgeRetrievalTestHit;
      })
      .filter((item) => item.score >= threshold)
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
    return {
      knowledgeBaseId,
      query,
      topK,
      modelName: provider.modelName,
      hitCount: hits.length,
      hits,
    };
  }

  async archiveKnowledgeBase(id: string) {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      await this.getKnowledgeBaseOrThrow(id);
      const knowledgeBase = await this.prismaService.knowledgeBase.update({
        where: { id },
        data: {
          status: "DISABLED",
          updatedAt: new Date(),
        },
      });
      return this.normalizeKnowledgeBase(knowledgeBase);
    }

    const knowledgeBase = database.knowledgeBases.find((item) => item.id === id);
    if (!knowledgeBase) {
      throw new NotFoundException("知识库不存在");
    }

    knowledgeBase.status = "DISABLED";
    knowledgeBase.updatedAt = new Date().toISOString();
    return knowledgeBase;
  }

  async deleteKnowledgeBase(id: string) {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const knowledgeBase = await this.getKnowledgeBaseOrThrow(id);
      await this.prismaService.knowledgeBase.delete({
        where: { id },
      });
      return this.normalizeKnowledgeBase(knowledgeBase);
    }

    const index = database.knowledgeBases.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("知识库不存在");
    }

    const [removed] = database.knowledgeBases.splice(index, 1);
    database.knowledgeBaseFiles = database.knowledgeBaseFiles.filter((item) => item.knowledgeBaseId !== id);
    database.knowledgeBaseSyncRuns = database.knowledgeBaseSyncRuns.filter((item) => item.knowledgeBaseId !== id);
    database.knowledgeRetrievalConfigs = database.knowledgeRetrievalConfigs.filter((item) => item.knowledgeBaseId !== id);
    return removed;
  }

  async createKnowledgeBaseFile(
    knowledgeBaseId: string,
    payload: CreateKnowledgeBaseFilePayload,
  ): Promise<KnowledgeBaseFileMutationResult> {
    const normalizedChunkCount = Number(payload.chunkCount ?? 0);
    const chunkCount = Number.isFinite(normalizedChunkCount) ? Math.max(0, Math.floor(normalizedChunkCount)) : 0;

    if (await this.canUseKnowledgeBaseStorage()) {
      return this.createKnowledgeBaseFileInDatabase(knowledgeBaseId, payload, chunkCount);
    }

    this.getKnowledgeBaseOrThrowFromMock(knowledgeBaseId);
    const now = new Date().toISOString();
    const file: KnowledgeBaseFileRecord = {
      id: this.createId("kbf"),
      knowledgeBaseId,
      fileName: payload.fileName,
      fileType: payload.fileType,
      sourceName: payload.sourceName || "后台手动录入",
      chunkCount,
      status: chunkCount > 0 ? "INDEXED" : "PENDING",
      uploadedAt: now,
    };

    database.knowledgeBaseFiles.unshift(file);
    const knowledgeBase = this.refreshKnowledgeBaseSummary(knowledgeBaseId, now);

    return { file, knowledgeBase };
  }

  private async createKnowledgeBaseFileInDatabase(
    knowledgeBaseId: string,
    payload: CreateKnowledgeBaseFilePayload,
    chunkCount: number,
  ): Promise<KnowledgeBaseFileMutationResult> {
    await this.ensureKnowledgeBaseStorageSeeded();
    await this.getKnowledgeBaseOrThrow(knowledgeBaseId);

    const now = new Date().toISOString();
    const file = await this.prismaService.knowledgeBaseFile.create({
      data: {
        id: this.createId("kbf"),
        knowledgeBaseId,
        fileName: String(payload.fileName || "").trim(),
        fileType: payload.fileType,
        sourceName: String(payload.sourceName || "").trim() || "后台手动录入",
        chunkCount,
        status: chunkCount > 0 ? "INDEXED" : "PENDING",
        uploadedAt: new Date(now),
        updatedAt: new Date(now),
      },
    });
    const knowledgeBase = await this.refreshKnowledgeBaseSummaryInDatabase(knowledgeBaseId, now);

    return {
      file: this.normalizeKnowledgeBaseFile(file),
      knowledgeBase,
    };
  }

  async updateKnowledgeBaseFile(fileId: string, payload: UpdateKnowledgeBaseFilePayload): Promise<KnowledgeBaseFileMutationResult> {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const current = await this.getKnowledgeBaseFileOrThrow(fileId);
      const file = await this.prismaService.knowledgeBaseFile.update({
        where: { id: fileId },
        data: {
          status: payload.status ?? current.status,
          updatedAt: new Date(),
        },
      });
      const knowledgeBase = await this.refreshKnowledgeBaseSummaryInDatabase(file.knowledgeBaseId);
      return {
        file: this.normalizeKnowledgeBaseFile(file),
        knowledgeBase,
      };
    }

    const file = this.getKnowledgeBaseFileOrThrowFromMock(fileId);
    if (payload.status) {
      file.status = payload.status;
    }

    const knowledgeBase = this.refreshKnowledgeBaseSummary(file.knowledgeBaseId);
    return { file, knowledgeBase };
  }

  async startKnowledgeBaseFileSync(fileId: string): Promise<KnowledgeBaseSyncMutationResult> {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const currentFile = await this.getKnowledgeBaseFileOrThrow(fileId);
      const updatedAt = new Date().toISOString();
      const file = await this.prismaService.knowledgeBaseFile.update({
        where: { id: fileId },
        data: {
          status: "PENDING",
          updatedAt: new Date(updatedAt),
        },
      });
      await this.prismaService.knowledgeBase.update({
        where: { id: file.knowledgeBaseId },
        data: {
          syncStatus: "SYNCING",
          updatedAt: new Date(updatedAt),
        },
      });
      const run = await this.createSyncRunInDatabase(file.knowledgeBaseId, {
        scope: "FILE",
        operator: "后台管理员",
        fileId: file.id,
        fileName: file.fileName,
        result: "RUNNING",
        summary: "文件同步任务已创建，正在执行正文提取与切片入库。",
      });
      try {
        const normalizedCurrentFile = this.normalizeKnowledgeBaseFile(currentFile);
        const ingestion = await this.ingestKnowledgeBaseFileInDatabase(normalizedCurrentFile);
        const completedFile = await this.prismaService.knowledgeBaseFile.update({
          where: { id: file.id },
          data: {
            status: "INDEXED",
            chunkCount: ingestion.chunkCount,
            updatedAt: new Date(),
          },
        });
        const completedRun = await this.completeSyncRunInDatabase(run.id, {
          result: "SUCCESS",
          summary: ingestion.summary,
        });
        const refreshedKnowledgeBase = await this.refreshKnowledgeBaseSummaryInDatabase(file.knowledgeBaseId);

        return {
          file: this.normalizeKnowledgeBaseFile(completedFile),
          knowledgeBase: refreshedKnowledgeBase,
          run: completedRun,
        };
      } catch (error) {
        const failedFile = await this.prismaService.knowledgeBaseFile.update({
          where: { id: file.id },
          data: {
            status: "FAILED",
            updatedAt: new Date(),
          },
        });
        const completedRun = await this.completeSyncRunInDatabase(run.id, {
          result: "FAILED",
          summary: `文件 ${file.fileName} 同步失败。`,
          errorDetail: error instanceof Error ? error.message : "未知错误",
        });
        const refreshedKnowledgeBase = await this.refreshKnowledgeBaseSummaryInDatabase(file.knowledgeBaseId);
        return {
          file: this.normalizeKnowledgeBaseFile(failedFile),
          knowledgeBase: refreshedKnowledgeBase,
          run: completedRun,
        };
      }
    }

    const file = this.getKnowledgeBaseFileOrThrowFromMock(fileId);
    file.status = "PENDING";
    const knowledgeBase = this.getKnowledgeBaseOrThrowFromMock(file.knowledgeBaseId);
    knowledgeBase.syncStatus = "SYNCING";
    knowledgeBase.updatedAt = new Date().toISOString();

    const run = this.createSyncRunFromMock(file.knowledgeBaseId, {
      scope: "FILE",
      operator: "后台管理员",
      fileId: file.id,
      fileName: file.fileName,
      result: "RUNNING",
      summary: "文件同步任务已创建，正在执行最小解析骨架。",
    });
    const chunkCount = this.estimateChunkCount(file);
    file.chunkCount = chunkCount;
    file.status = "INDEXED";
    const completedRun = this.completeSyncRunFromMock(run.id, {
      result: "SUCCESS",
      summary: this.buildFileSyncSummary(
        file,
        chunkCount,
        {
          content: this.buildMetadataFallbackText(file),
          sourceLabel: "mock-metadata",
          usedFallback: true,
          note: "当前为演示数据模式，仍使用估算分片",
        },
        "演示数据模式不读取品牌共享 API Key",
      ),
    });
    const refreshedKnowledgeBase = this.refreshKnowledgeBaseSummary(file.knowledgeBaseId, completedRun.completedAt);
    return { file, knowledgeBase: refreshedKnowledgeBase, run: completedRun };
  }

  async startKnowledgeBaseFullSync(id: string): Promise<KnowledgeBaseRunMutationResult> {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const knowledgeBase = await this.prismaService.knowledgeBase.update({
        where: { id },
        data: {
          syncStatus: "SYNCING",
          updatedAt: new Date(),
        },
      });
      const run = await this.createSyncRunInDatabase(id, {
        scope: "FULL",
        operator: "后台管理员",
        result: "RUNNING",
        summary: "全量同步任务已创建，正在执行正文提取与切片入库。",
      });
      const files = await this.prismaService.knowledgeBaseFile.findMany({
        where: { knowledgeBaseId: id },
        orderBy: { uploadedAt: "desc" },
      });
      let totalChunks = 0;
      let failedCount = 0;
      for (const item of files) {
        try {
          const normalized = this.normalizeKnowledgeBaseFile(item);
          const ingestion = await this.ingestKnowledgeBaseFileInDatabase(normalized);
          totalChunks += ingestion.chunkCount;
          await this.prismaService.knowledgeBaseFile.update({
            where: { id: item.id },
            data: {
              status: "INDEXED",
              chunkCount: ingestion.chunkCount,
              updatedAt: new Date(),
            },
          });
        } catch {
          failedCount += 1;
          await this.prismaService.knowledgeBaseFile.update({
            where: { id: item.id },
            data: {
              status: "FAILED",
              updatedAt: new Date(),
            },
          });
        }
      }
      const completedRun = await this.completeSyncRunInDatabase(run.id, {
        result: failedCount > 0 ? "FAILED" : "SUCCESS",
        summary: this.buildFullSyncSummary(files.length, totalChunks, failedCount),
        errorDetail: failedCount > 0 ? `共有 ${failedCount} 个文件未完成正文提取或切片入库。` : undefined,
      });
      const refreshedKnowledgeBase = await this.refreshKnowledgeBaseSummaryInDatabase(id);

      return {
        knowledgeBase: refreshedKnowledgeBase,
        run: completedRun,
      };
    }

    const knowledgeBase = this.getKnowledgeBaseOrThrowFromMock(id);
    knowledgeBase.syncStatus = "SYNCING";
    knowledgeBase.updatedAt = new Date().toISOString();

    const run = this.createSyncRunFromMock(id, {
      scope: "FULL",
      operator: "后台管理员",
      result: "RUNNING",
      summary: "全量同步任务已创建，正在执行最小 ingestion 骨架。",
    });
    const relatedFiles = database.knowledgeBaseFiles.filter((item) => item.knowledgeBaseId === id);
    let totalChunks = 0;
    relatedFiles.forEach((item) => {
      const chunkCount = this.estimateChunkCount(item);
      item.chunkCount = chunkCount;
      item.status = "INDEXED";
      totalChunks += chunkCount;
    });
    const completedRun = this.completeSyncRunFromMock(run.id, {
      result: "SUCCESS",
      summary: this.buildFullSyncSummary(relatedFiles.length, totalChunks),
    });
    const refreshedKnowledgeBase = this.refreshKnowledgeBaseSummary(id, completedRun.completedAt);

    return { knowledgeBase: refreshedKnowledgeBase, run: completedRun };
  }

  async completeKnowledgeBaseSyncRun(
    runId: string,
    payload: CompleteKnowledgeBaseSyncRunPayload,
  ): Promise<KnowledgeBaseRunMutationResult> {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const currentRun = await this.getKnowledgeBaseSyncRunOrThrow(runId);
      const completedAt = new Date().toISOString();
      const run = await this.prismaService.knowledgeBaseSyncRun.update({
        where: { id: runId },
        data: {
          result: payload.result,
          summary:
            payload.summary ||
            (payload.result === "SUCCESS" ? "同步任务执行成功。" : "同步任务执行失败，请查看失败原因。"),
          errorDetail: payload.result === "FAILED" ? payload.errorDetail || "未提供失败原因。" : null,
          completedAt: new Date(completedAt),
        },
      });

      let file: KnowledgeBaseFileRecord | undefined;
      if (currentRun.fileId) {
        const updatedFile = await this.prismaService.knowledgeBaseFile.update({
          where: { id: currentRun.fileId },
          data: {
            status: payload.result === "SUCCESS" ? "INDEXED" : "FAILED",
            updatedAt: new Date(completedAt),
          },
        });
        file = this.normalizeKnowledgeBaseFile(updatedFile);
      } else if (currentRun.scope === "FULL" && payload.result === "SUCCESS") {
        await this.prismaService.knowledgeBaseFile.updateMany({
          where: {
            knowledgeBaseId: currentRun.knowledgeBaseId,
            NOT: { status: "FAILED" },
          },
          data: {
            status: "INDEXED",
            updatedAt: new Date(completedAt),
          },
        });
      }

      const knowledgeBase = await this.refreshKnowledgeBaseSummaryInDatabase(currentRun.knowledgeBaseId, completedAt);
      return {
        file,
        knowledgeBase,
        run: this.normalizeKnowledgeBaseSyncRun(run),
      };
    }

    const run = this.getKnowledgeBaseSyncRunOrThrowFromMock(runId);
    run.result = payload.result;
    run.summary =
      payload.summary ||
      (payload.result === "SUCCESS" ? "同步任务执行成功。" : "同步任务执行失败，请查看失败原因。");
    run.errorDetail = payload.result === "FAILED" ? payload.errorDetail || "未提供失败原因。" : undefined;
    run.completedAt = new Date().toISOString();

    let file: KnowledgeBaseFileRecord | undefined;
    if (run.fileId) {
      file = this.getKnowledgeBaseFileOrThrowFromMock(run.fileId);
      file.status = payload.result === "SUCCESS" ? "INDEXED" : "FAILED";
    } else if (run.scope === "FULL" && payload.result === "SUCCESS") {
      database.knowledgeBaseFiles = database.knowledgeBaseFiles.map((item) =>
        item.knowledgeBaseId === run.knowledgeBaseId
          ? {
              ...item,
              status: item.status === "FAILED" ? item.status : "INDEXED",
            }
          : item,
      );
    }

    const knowledgeBase = this.refreshKnowledgeBaseSummary(run.knowledgeBaseId, run.completedAt);
    return { file, knowledgeBase, run };
  }

  async deleteKnowledgeBaseFile(fileId: string): Promise<KnowledgeBaseFileMutationResult> {
    if (await this.canUseKnowledgeBaseStorage()) {
      await this.ensureKnowledgeBaseStorageSeeded();
      const file = await this.getKnowledgeBaseFileOrThrow(fileId);
      await this.prismaService.knowledgeBaseSyncRun.deleteMany({
        where: { fileId },
      });
      await this.prismaService.knowledgeBaseFile.delete({
        where: { id: fileId },
      });
      const knowledgeBase = await this.refreshKnowledgeBaseSummaryInDatabase(file.knowledgeBaseId);

      return {
        file: this.normalizeKnowledgeBaseFile(file),
        knowledgeBase,
      };
    }

    const index = database.knowledgeBaseFiles.findIndex((item) => item.id === fileId);
    if (index < 0) {
      throw new NotFoundException("知识库文件不存在");
    }

    const [file] = database.knowledgeBaseFiles.splice(index, 1);
    database.knowledgeBaseSyncRuns = database.knowledgeBaseSyncRuns.filter((item) => item.fileId !== fileId);
    const knowledgeBase = this.refreshKnowledgeBaseSummary(file.knowledgeBaseId);

    return { file, knowledgeBase };
  }
}
