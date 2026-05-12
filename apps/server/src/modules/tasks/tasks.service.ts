import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestAuthContext } from "../auth/auth.service";

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
    if (await this.prismaService.canUseDatabase()) {
      const tasks = await this.prismaService.task.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return tasks.map((task) => ({
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
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createTask(payload: CreateTaskPayload, auth?: RequestAuthContext) {
    const userId = this.requireUserId(auth);
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
          modelName: payload.modelName ?? "gpt-5.5",
          pointsCost: payload.pointsCost ?? 0,
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

    const now = new Date().toISOString();
    const task = {
      id: createId("tsk"),
      userId,
      brandId: auth?.brandId ?? payload.brandId,
      taskType: payload.taskType,
      taskTitle: payload.taskTitle,
      taskStatus: "QUEUED" as const,
      modelName: payload.modelName ?? "gpt-5.5",
      pointsCost: payload.pointsCost ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    database.tasks.unshift(task);
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
