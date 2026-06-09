import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { KnowledgeBase, KnowledgeBaseFile, KnowledgeBaseSyncRun, KnowledgeBinding } from "@prisma/client";
import {
  database,
  type KnowledgeBindingRecord,
  type KnowledgeBaseFileRecord,
  type KnowledgeBaseRecord,
  type KnowledgeBaseSyncRunRecord,
} from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

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

@Injectable()
export class KnowledgeBasesService {
  private bootstrapPromise?: Promise<void>;
  private bindingBootstrapPromise?: Promise<void>;

  constructor(private readonly prismaService: PrismaService) {}

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

      return this.normalizeKnowledgeBase(created);
    }

    database.knowledgeBases.unshift(record);
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

  private enrichMockKnowledgeBinding(row: KnowledgeBindingRecord): KnowledgeBindingView {
    const knowledgeBase = database.knowledgeBases.find((item) => item.id === row.knowledgeBaseId);
    return {
      ...row,
      knowledgeBaseName: knowledgeBase?.name,
      knowledgeBaseSlug: knowledgeBase?.slug,
    };
  }

  private createId(prefix: "kb" | "kbf" | "kbsr" | "kbb") {
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
        `SELECT to_regclass('"KnowledgeBase"') AS "knowledgeBase",
                to_regclass('"KnowledgeBaseFile"') AS "knowledgeBaseFile",
                to_regclass('"KnowledgeBaseSyncRun"') AS "knowledgeBaseSyncRun"`,
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
        `SELECT to_regclass('"KnowledgeBinding"') AS "knowledgeBinding"`,
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

  private validateBindingType(value: string): KnowledgeBindingRecord["bindingType"] {
    const bindingType = String(value || "").trim().toUpperCase();
    if (!["MODULE", "SKILL_PACKAGE", "PROMPT", "WORKFLOW_STEP"].includes(bindingType)) {
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

  private buildFileSyncSummary(file: Pick<KnowledgeBaseFileRecord, "fileName" | "fileType">, chunkCount: number) {
    return `文件 ${file.fileName} 已完成最小解析，按 ${file.fileType} 规则生成 ${chunkCount} 个分片，当前仍为执行骨架，待后续接入真实解析器与向量索引。`;
  }

  private buildFullSyncSummary(fileCount: number, chunkCount: number) {
    return fileCount > 0
      ? `全量同步已完成，共处理 ${fileCount} 个文件，累计生成 ${chunkCount} 个分片，当前为最小 ingestion 骨架。`
      : "全量同步已完成，但当前知识库暂无可处理文件。";
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
        summary: "文件同步任务已创建，正在执行最小解析骨架。",
      });
      const normalizedCurrentFile = this.normalizeKnowledgeBaseFile(currentFile);
      const chunkCount = this.estimateChunkCount({
        fileName: normalizedCurrentFile.fileName,
        fileType: normalizedCurrentFile.fileType,
        sourceName: normalizedCurrentFile.sourceName,
        chunkCount: normalizedCurrentFile.chunkCount,
      });
      const completedFile = await this.prismaService.knowledgeBaseFile.update({
        where: { id: file.id },
        data: {
          status: "INDEXED",
          chunkCount,
          updatedAt: new Date(),
        },
      });
      const completedRun = await this.completeSyncRunInDatabase(run.id, {
        result: "SUCCESS",
        summary: this.buildFileSyncSummary(this.normalizeKnowledgeBaseFile(completedFile), chunkCount),
      });
      const refreshedKnowledgeBase = await this.refreshKnowledgeBaseSummaryInDatabase(file.knowledgeBaseId);

      return {
        file: this.normalizeKnowledgeBaseFile(completedFile),
        knowledgeBase: refreshedKnowledgeBase,
        run: completedRun,
      };
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
      summary: this.buildFileSyncSummary(file, chunkCount),
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
        summary: "全量同步任务已创建，正在执行最小 ingestion 骨架。",
      });
      const files = await this.prismaService.knowledgeBaseFile.findMany({
        where: { knowledgeBaseId: id },
        orderBy: { uploadedAt: "desc" },
      });
      let totalChunks = 0;
      for (const item of files) {
        const normalized = this.normalizeKnowledgeBaseFile(item);
        const chunkCount = this.estimateChunkCount(normalized);
        totalChunks += chunkCount;
        await this.prismaService.knowledgeBaseFile.update({
          where: { id: item.id },
          data: {
            status: "INDEXED",
            chunkCount,
            updatedAt: new Date(),
          },
        });
      }
      const completedRun = await this.completeSyncRunInDatabase(run.id, {
        result: "SUCCESS",
        summary: this.buildFullSyncSummary(files.length, totalChunks),
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
