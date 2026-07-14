import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { postRuntimeDebugEvent } from "../../common/runtime-debug";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestAuthContext } from "../auth/auth.service";

const ACTIVE_TASK_TIMEOUT_MS_BY_TYPE: Record<string, number> = {
  BRAND_GROWTH_REPORT: 15 * 60 * 1000,
  BRAND_GROWTH_VISUAL_REPORT: 10 * 60 * 1000,
  BRAND_HALF_YEAR_MARKETING_PLAN: 15 * 60 * 1000,
  XHS_MARKETING_PLAN: 60 * 60 * 1000,
  DOUYIN_MARKETING_PLAN: 60 * 60 * 1000,
  XHS_MARKETING_CALENDAR: 10 * 60 * 1000,
  XHS_ORIGINAL_NOTE: 20 * 60 * 1000,
  XHS_REWRITE_NOTE: 20 * 60 * 1000,
  WECHAT_ARTICLE_AI: 20 * 60 * 1000,
  WECHAT_IMAGE_AI: 20 * 60 * 1000,
  WECHAT_HTML_AI: 20 * 60 * 1000,
  WECHAT_ARTICLE_DRAFT_AI: 20 * 60 * 1000,
  WECHAT_WORKFLOW_PUBLISH: 10 * 60 * 1000,
  WECHAT_ARTICLE_DRAFT_PUBLISH: 10 * 60 * 1000,
};

export type CreateTaskPayload = {
  userId?: string;
  brandId?: string;
  taskType: string;
  taskTitle: string;
  modelName?: string;
  pointsCost?: number;
};

@Injectable()
export class TasksService {
  constructor(private readonly prismaService: PrismaService) {}

  async listTasks(auth?: RequestAuthContext) {
    const userId = this.requireUserId(auth);
    const brandId = String(auth?.brandId || "").trim() || undefined;
    // #region debug-point C:list-tasks-enter
    postRuntimeDebugEvent({sessionId:"digital-human-silent-upload",runId:"pre-fix",hypothesisId:"C",location:"tasks.service.ts:37",msg:"[DEBUG] list tasks enter",data:{userId,brandId:auth?.brandId||null}});
    // #endregion
    // #region debug-point F:list-tasks-enter-current-session
    postRuntimeDebugEvent({
      sessionId: "digital-human-502-list",
      runId: "pre-fix",
      hypothesisId: "F",
      location: "apps/server/src/modules/tasks/tasks.service.ts:listTasks",
      msg: "[DEBUG] TasksService 开始查询任务中心",
      data: {
        userId,
        brandId: brandId || null,
        authSource: auth?.source || null,
      },
    });
    // #endregion
    if (await this.prismaService.canUseDatabase()) {
      const tasks = await this.prismaService.task.findMany({
        where: brandId
          ? {
              OR: [
                { userId },
                { brandId },
              ],
            }
          : { userId },
        orderBy: { createdAt: "desc" },
      });
      const normalizedTasks = await Promise.all(tasks.map((task) => this.normalizeDatabaseTaskStatus(task)));
      // #region debug-point C:list-tasks-db-result
      postRuntimeDebugEvent({sessionId:"digital-human-silent-upload",runId:"pre-fix",hypothesisId:"C",location:"tasks.service.ts:44",msg:"[DEBUG] list tasks db result",data:{userId,count:normalizedTasks.length,digitalHumanCount:normalizedTasks.filter((task)=>task.taskType==="DOUYIN_DIGITAL_HUMAN_CUSTOM").length}});
      // #endregion
      // #region debug-point F:list-tasks-db-result-current-session
      postRuntimeDebugEvent({
        sessionId: "digital-human-502-list",
        runId: "pre-fix",
        hypothesisId: "F",
        location: "apps/server/src/modules/tasks/tasks.service.ts:listTasks",
        msg: "[DEBUG] TasksService 返回任务中心结果",
        data: {
          userId,
          brandId: brandId || null,
          totalCount: normalizedTasks.length,
          digitalHumanCount: normalizedTasks.filter((task) => task.taskType === "DOUYIN_DIGITAL_HUMAN_CUSTOM").length,
          latestDigitalHumanTaskIds: normalizedTasks
            .filter((task) => task.taskType === "DOUYIN_DIGITAL_HUMAN_CUSTOM")
            .slice(0, 5)
            .map((task) => task.id),
        },
      });
      // #endregion

      return normalizedTasks.map((task) => ({
        id: task.id,
        userId: task.userId,
        brandId: task.brandId ?? undefined,
        taskType: task.taskType,
        taskTitle: task.taskTitle ?? "",
        taskStatus: task.taskStatus,
        modelName: task.modelName ?? "",
        pointsCost: task.pointsCost,
        errorMessage: task.errorMessage ?? undefined,
        startedAt: task.startedAt?.toISOString(),
        finishedAt: task.finishedAt?.toISOString(),
        inputJson: (task.inputJson as Record<string, unknown> | null) ?? undefined,
        outputJson: (task.outputJson as Record<string, unknown> | null) ?? undefined,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      }));
    }

    return [...database.tasks]
      .filter((item) => item.userId === userId || Boolean(brandId && item.brandId === brandId))
      .map((item) => this.normalizeMockTaskStatus(item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createTask(payload: CreateTaskPayload, auth?: RequestAuthContext) {
    const userId = this.requireUserId(auth);
    // #region debug-point C:create-task-enter
    postRuntimeDebugEvent({sessionId:"digital-human-silent-upload",runId:"pre-fix",hypothesisId:"C",location:"tasks.service.ts:71",msg:"[DEBUG] create task enter",data:{authUserId:auth?.userId||null,resolvedUserId:userId,authBrandId:auth?.brandId||null,payloadBrandId:payload.brandId||null,taskType:payload.taskType,taskTitle:payload.taskTitle}});
    // #endregion
    if (await this.prismaService.canUseDatabase()) {
      const brandId = auth?.brandId ?? payload.brandId;

      if (brandId) {
        await this.ensureBrandExists(brandId);
      }

      const task = await this.prismaService.task.create({
        data: {
          userId,
          brandId,
          taskType: payload.taskType,
          taskTitle: payload.taskTitle,
          taskStatus: TaskStatus.QUEUED,
          modelName: payload.modelName ?? "gpt-5.4",
          pointsCost: payload.pointsCost ?? 0,
        },
      });
      // #region debug-point C:create-task-db-result
      postRuntimeDebugEvent({sessionId:"digital-human-silent-upload",runId:"pre-fix",hypothesisId:"C",location:"tasks.service.ts:80",msg:"[DEBUG] create task db result",data:{taskId:task.id,userId:task.userId,brandId:task.brandId||null,taskType:task.taskType,taskStatus:task.taskStatus}});
      // #endregion

      return {
        id: task.id,
        userId: task.userId,
        brandId: task.brandId ?? undefined,
        taskType: task.taskType,
        taskTitle: task.taskTitle ?? "",
        taskStatus: task.taskStatus,
        modelName: task.modelName ?? "",
        pointsCost: task.pointsCost,
        errorMessage: task.errorMessage ?? undefined,
        startedAt: task.startedAt?.toISOString(),
        finishedAt: task.finishedAt?.toISOString(),
        inputJson: (task.inputJson as Record<string, unknown> | null) ?? undefined,
        outputJson: (task.outputJson as Record<string, unknown> | null) ?? undefined,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const task = {
      id: createId("tsk"),
      userId,
      brandId: auth?.brandId ?? payload.brandId,
      taskType: payload.taskType,
      taskTitle: payload.taskTitle,
      taskStatus: "QUEUED" as const,
      modelName: payload.modelName ?? "gpt-5.4",
      pointsCost: payload.pointsCost ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    database.tasks.unshift(task);
    // #region debug-point C:create-task-mock-result
    postRuntimeDebugEvent({sessionId:"digital-human-silent-upload",runId:"pre-fix",hypothesisId:"C",location:"tasks.service.ts:125",msg:"[DEBUG] create task mock result",data:{taskId:task.id,userId:task.userId,brandId:task.brandId||null,taskType:task.taskType,taskStatus:task.taskStatus}});
    // #endregion
    return task;
  }

  async retryTask(id: string, auth?: RequestAuthContext) {
    const userId = this.requireUserId(auth);
    if (await this.prismaService.canUseDatabase()) {
      const existing = await this.prismaService.task.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException("任务不存在");
      }
      if (existing.userId !== userId) {
        throw new UnauthorizedException("当前用户无权重试该任务");
      }

      const task = await this.prismaService.task.update({
        where: { id },
        data: {
          taskStatus: TaskStatus.QUEUED,
          errorMessage: null,
          startedAt: null,
          finishedAt: null,
        },
      });

      return {
        id: task.id,
        userId: task.userId,
        brandId: task.brandId ?? undefined,
        taskType: task.taskType,
        taskTitle: task.taskTitle ?? "",
        taskStatus: task.taskStatus,
        modelName: task.modelName ?? "",
        pointsCost: task.pointsCost,
        errorMessage: task.errorMessage ?? undefined,
        startedAt: task.startedAt?.toISOString(),
        finishedAt: task.finishedAt?.toISOString(),
        inputJson: (task.inputJson as Record<string, unknown> | null) ?? undefined,
        outputJson: (task.outputJson as Record<string, unknown> | null) ?? undefined,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      };
    }

    const task = database.tasks.find((item) => item.id === id);
    if (!task) {
      throw new NotFoundException("任务不存在");
    }
    if (task.userId !== userId) {
      throw new UnauthorizedException("当前用户无权重试该任务");
    }

    task.taskStatus = "QUEUED";
    task.updatedAt = new Date().toISOString();
    return task;
  }

  async cancelTask(id: string, auth?: RequestAuthContext) {
    const userId = this.requireUserId(auth);
    if (await this.prismaService.canUseDatabase()) {
      const existing = await this.prismaService.task.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException("任务不存在");
      }
      if (existing.userId !== userId) {
        throw new UnauthorizedException("当前用户无权取消该任务");
      }
      if (existing.taskStatus !== TaskStatus.QUEUED && existing.taskStatus !== TaskStatus.RUNNING) {
        throw new BadRequestException("只有排队中或运行中的任务才可以取消");
      }

      const task = await this.prismaService.task.update({
        where: { id },
        data: {
          taskStatus: TaskStatus.CANCELLED,
          errorMessage: "用户已在任务中心取消任务",
          finishedAt: new Date(),
        },
      });

      return {
        id: task.id,
        userId: task.userId,
        brandId: task.brandId ?? undefined,
        taskType: task.taskType,
        taskTitle: task.taskTitle ?? "",
        taskStatus: task.taskStatus,
        modelName: task.modelName ?? "",
        pointsCost: task.pointsCost,
        errorMessage: task.errorMessage ?? undefined,
        startedAt: task.startedAt?.toISOString(),
        finishedAt: task.finishedAt?.toISOString(),
        inputJson: (task.inputJson as Record<string, unknown> | null) ?? undefined,
        outputJson: (task.outputJson as Record<string, unknown> | null) ?? undefined,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      };
    }

    const task = database.tasks.find((item) => item.id === id);
    if (!task) {
      throw new NotFoundException("任务不存在");
    }
    if (task.userId !== userId) {
      throw new UnauthorizedException("当前用户无权取消该任务");
    }
    if (task.taskStatus !== "QUEUED" && task.taskStatus !== "RUNNING") {
      throw new BadRequestException("只有排队中或运行中的任务才可以取消");
    }

    task.taskStatus = "CANCELLED";
    task.errorMessage = "用户已在任务中心取消任务";
    task.finishedAt = new Date().toISOString();
    task.updatedAt = task.finishedAt;
    return task;
  }

  private requireUserId(auth?: RequestAuthContext) {
    if (!auth?.userId) {
      throw new UnauthorizedException("请先登录");
    }
    return auth.userId;
  }

  private async normalizeDatabaseTaskStatus(task: {
    id: string;
    taskType: string;
    taskTitle: string | null;
    taskStatus: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    errorMessage: string | null;
    userId: string;
    brandId: string | null;
    modelName: string | null;
    pointsCost: number;
    inputJson: unknown;
    outputJson: unknown;
  }) {
    const timeoutMs = ACTIVE_TASK_TIMEOUT_MS_BY_TYPE[task.taskType];
    if (!timeoutMs || (task.taskStatus !== TaskStatus.QUEUED && task.taskStatus !== TaskStatus.RUNNING)) {
      return task;
    }

    const referenceMs = this.resolveTaskReferenceMs(task.startedAt, task.updatedAt, task.createdAt);
    if (!referenceMs || Date.now() - referenceMs <= timeoutMs) {
      return task;
    }

    return this.prismaService.task.update({
      where: { id: task.id },
      data: {
        taskStatus: TaskStatus.FAILED,
        finishedAt: new Date(),
        errorMessage: this.buildTaskTimeoutMessage(task.taskTitle || task.taskType, timeoutMs),
      },
    });
  }

  private normalizeMockTaskStatus(task: {
    taskType: string;
    taskTitle: string;
    taskStatus: string;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    finishedAt?: string;
    errorMessage?: string;
  }) {
    const timeoutMs = ACTIVE_TASK_TIMEOUT_MS_BY_TYPE[task.taskType];
    if (!timeoutMs || (task.taskStatus !== "QUEUED" && task.taskStatus !== "RUNNING")) {
      return task;
    }

    const referenceMs = this.resolveTaskReferenceMs(task.startedAt, task.updatedAt, task.createdAt);
    if (!referenceMs || Date.now() - referenceMs <= timeoutMs) {
      return task;
    }

    const finishedAt = new Date().toISOString();
    task.taskStatus = "FAILED";
    task.finishedAt = finishedAt;
    task.updatedAt = finishedAt;
    task.errorMessage = this.buildTaskTimeoutMessage(task.taskTitle || task.taskType, timeoutMs);
    return task;
  }

  private resolveTaskReferenceMs(startedAt?: Date | string | null, updatedAt?: Date | string | null, createdAt?: Date | string | null) {
    const reference = startedAt || updatedAt || createdAt;
    if (!reference) {
      return 0;
    }
    const next = new Date(reference).getTime();
    return Number.isFinite(next) ? next : 0;
  }

  private buildTaskTimeoutMessage(taskLabel: string, timeoutMs: number) {
    const minutes = Math.round(timeoutMs / 60000);
    return `${taskLabel}运行超过 ${minutes} 分钟，系统已自动终止并标记失败；请重试或切换兜底模型。`;
  }

  private async ensureBrandExists(brandId: string) {
    const brand = await this.prismaService.brand.findUnique({
      where: { id: brandId },
      select: { id: true },
    });

    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
  }
}
