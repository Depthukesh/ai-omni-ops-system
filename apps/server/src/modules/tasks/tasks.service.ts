import { Injectable, NotFoundException } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

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

  async listTasks() {
    if (await this.prismaService.canUseDatabase()) {
      const tasks = await this.prismaService.task.findMany({
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
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      }));
    }

    return [...database.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createTask(payload: CreateTaskPayload) {
    if (await this.prismaService.canUseDatabase()) {
      const userId = payload.userId ?? (await this.getDefaultUserId());

      if (payload.brandId) {
        await this.ensureBrandExists(payload.brandId);
      }

      const task = await this.prismaService.task.create({
        data: {
          userId,
          brandId: payload.brandId,
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
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      };
    }

    const now = new Date().toISOString();
    const task = {
      id: createId("tsk"),
      userId: payload.userId ?? database.users[0].id,
      brandId: payload.brandId,
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

  async retryTask(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      const existing = await this.prismaService.task.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException("任务不存在");
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
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      };
    }

    const task = database.tasks.find((item) => item.id === id);
    if (!task) {
      throw new NotFoundException("任务不存在");
    }

    task.taskStatus = "QUEUED";
    task.updatedAt = new Date().toISOString();
    return task;
  }

  private async getDefaultUserId() {
    const user = await this.prismaService.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("当前数据库中不存在可绑定的用户");
    }

    return user.id;
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
