import { Injectable, NotFoundException } from "@nestjs/common";
import {
  database,
  type KnowledgeBaseFileRecord,
  type KnowledgeBaseRecord,
  type KnowledgeBaseSyncRunRecord,
} from "../../common/mock-data";

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

@Injectable()
export class KnowledgeBasesService {
  listKnowledgeBases() {
    return [...database.knowledgeBases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createKnowledgeBase(payload: CreateKnowledgeBasePayload) {
    const now = new Date().toISOString();
    const record: KnowledgeBaseRecord = {
      id: `kb_${Date.now()}`,
      name: payload.name,
      slug: payload.slug,
      sourceType: payload.sourceType,
      status: "DRAFT",
      syncStatus: "IDLE",
      documentCount: 0,
      chunkCount: 0,
      description: payload.description || "",
      updatedAt: now,
    };

    database.knowledgeBases.unshift(record);
    return record;
  }

  private getKnowledgeBaseOrThrow(id: string) {
    const knowledgeBase = database.knowledgeBases.find((item) => item.id === id);
    if (!knowledgeBase) {
      throw new NotFoundException("知识库不存在");
    }

    return knowledgeBase;
  }

  private getKnowledgeBaseFileOrThrow(fileId: string) {
    const file = database.knowledgeBaseFiles.find((item) => item.id === fileId);
    if (!file) {
      throw new NotFoundException("知识库文件不存在");
    }

    return file;
  }

  private getKnowledgeBaseSyncRunOrThrow(runId: string) {
    const run = database.knowledgeBaseSyncRuns.find((item) => item.id === runId);
    if (!run) {
      throw new NotFoundException("同步记录不存在");
    }

    return run;
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
    const knowledgeBase = this.getKnowledgeBaseOrThrow(knowledgeBaseId);
    const files = database.knowledgeBaseFiles.filter((item) => item.knowledgeBaseId === knowledgeBaseId);
    knowledgeBase.documentCount = files.length;
    knowledgeBase.chunkCount = files.reduce((sum, item) => sum + item.chunkCount, 0);
    knowledgeBase.syncStatus = this.deriveSyncStatus(files);
    knowledgeBase.updatedAt = updatedAt;
    return knowledgeBase;
  }

  private createSyncRun(
    knowledgeBaseId: string,
    payload: Pick<KnowledgeBaseSyncRunRecord, "scope" | "operator" | "result" | "summary"> &
      Partial<Pick<KnowledgeBaseSyncRunRecord, "fileId" | "fileName" | "errorDetail" | "completedAt">>,
  ) {
    const run: KnowledgeBaseSyncRunRecord = {
      id: `kbsr_${Date.now()}`,
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

  listKnowledgeBaseFiles(knowledgeBaseId?: string) {
    const list = knowledgeBaseId
      ? database.knowledgeBaseFiles.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : database.knowledgeBaseFiles;

    return [...list].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }

  listKnowledgeBaseSyncRuns(knowledgeBaseId?: string) {
    const list = knowledgeBaseId
      ? database.knowledgeBaseSyncRuns.filter((item) => item.knowledgeBaseId === knowledgeBaseId)
      : database.knowledgeBaseSyncRuns;

    return [...list].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  updateKnowledgeBase(id: string, payload: UpdateKnowledgeBasePayload) {
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

  archiveKnowledgeBase(id: string) {
    const knowledgeBase = database.knowledgeBases.find((item) => item.id === id);
    if (!knowledgeBase) {
      throw new NotFoundException("知识库不存在");
    }

    knowledgeBase.status = "DISABLED";
    knowledgeBase.updatedAt = new Date().toISOString();
    return knowledgeBase;
  }

  deleteKnowledgeBase(id: string) {
    const index = database.knowledgeBases.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("知识库不存在");
    }

    const [removed] = database.knowledgeBases.splice(index, 1);
    database.knowledgeBaseFiles = database.knowledgeBaseFiles.filter((item) => item.knowledgeBaseId !== id);
    database.knowledgeBaseSyncRuns = database.knowledgeBaseSyncRuns.filter((item) => item.knowledgeBaseId !== id);
    return removed;
  }

  createKnowledgeBaseFile(
    knowledgeBaseId: string,
    payload: CreateKnowledgeBaseFilePayload,
  ): KnowledgeBaseFileMutationResult {
    this.getKnowledgeBaseOrThrow(knowledgeBaseId);

    const chunkCount = payload.chunkCount ?? 0;
    const now = new Date().toISOString();
    const file: KnowledgeBaseFileRecord = {
      id: `kbf_${Date.now()}`,
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

  updateKnowledgeBaseFile(fileId: string, payload: UpdateKnowledgeBaseFilePayload): KnowledgeBaseFileMutationResult {
    const file = this.getKnowledgeBaseFileOrThrow(fileId);
    if (payload.status) {
      file.status = payload.status;
    }

    const knowledgeBase = this.refreshKnowledgeBaseSummary(file.knowledgeBaseId);
    return { file, knowledgeBase };
  }

  startKnowledgeBaseFileSync(fileId: string): KnowledgeBaseSyncMutationResult {
    const file = this.getKnowledgeBaseFileOrThrow(fileId);
    const knowledgeBase = this.getKnowledgeBaseOrThrow(file.knowledgeBaseId);
    file.status = "PENDING";
    knowledgeBase.syncStatus = "SYNCING";
    knowledgeBase.updatedAt = new Date().toISOString();

    const run = this.createSyncRun(file.knowledgeBaseId, {
      scope: "FILE",
      operator: "后台管理员",
      fileId: file.id,
      fileName: file.fileName,
      result: "RUNNING",
      summary: "文件同步任务已创建，等待索引完成。",
    });
    return { file, knowledgeBase, run };
  }

  startKnowledgeBaseFullSync(id: string): KnowledgeBaseRunMutationResult {
    const knowledgeBase = this.getKnowledgeBaseOrThrow(id);
    knowledgeBase.syncStatus = "SYNCING";
    knowledgeBase.updatedAt = new Date().toISOString();

    const run = this.createSyncRun(id, {
      scope: "FULL",
      operator: "后台管理员",
      result: "RUNNING",
      summary: "全量同步任务已创建，正在扫描知识库文件。",
    });

    return { knowledgeBase, run };
  }

  completeKnowledgeBaseSyncRun(runId: string, payload: CompleteKnowledgeBaseSyncRunPayload): KnowledgeBaseRunMutationResult {
    const run = this.getKnowledgeBaseSyncRunOrThrow(runId);
    run.result = payload.result;
    run.summary =
      payload.summary ||
      (payload.result === "SUCCESS" ? "同步任务执行成功。" : "同步任务执行失败，请查看失败原因。");
    run.errorDetail = payload.result === "FAILED" ? payload.errorDetail || "未提供失败原因。" : undefined;
    run.completedAt = new Date().toISOString();

    let file: KnowledgeBaseFileRecord | undefined;
    if (run.fileId) {
      file = this.getKnowledgeBaseFileOrThrow(run.fileId);
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

  deleteKnowledgeBaseFile(fileId: string): KnowledgeBaseFileMutationResult {
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
