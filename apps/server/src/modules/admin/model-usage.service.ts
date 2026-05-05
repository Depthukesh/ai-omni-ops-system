import { Injectable } from "@nestjs/common";
import { database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ModelUsageService {
  constructor(private readonly prismaService: PrismaService) {}

  async listUsage() {
    if (await this.prismaService.canUseDatabase()) {
      const tasks = await this.prismaService.task.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          modelName: true,
          taskStatus: true,
          pointsCost: true,
          updatedAt: true,
        },
      });

      const grouped = new Map<
        string,
        {
          id: string;
          modelName: string;
          provider: string;
          taskCount: number;
          successCount: number;
          failedCount: number;
          totalPointsCost: number;
          estimatedAmountYuan: number;
          lastCalledAt: string;
        }
      >();

      for (const task of tasks) {
        const modelName = task.modelName || "unknown";
        const current = grouped.get(modelName) ?? {
          id: `usage_${modelName}`,
          modelName,
          provider: inferProvider(modelName),
          taskCount: 0,
          successCount: 0,
          failedCount: 0,
          totalPointsCost: 0,
          estimatedAmountYuan: 0,
          lastCalledAt: task.updatedAt.toISOString(),
        };

        current.taskCount += 1;
        if (task.taskStatus === "SUCCESS") {
          current.successCount += 1;
        }
        if (task.taskStatus === "FAILED" || task.taskStatus === "CANCELLED") {
          current.failedCount += 1;
        }
        current.totalPointsCost += task.pointsCost;
        current.estimatedAmountYuan = Number((current.totalPointsCost / 100).toFixed(2));
        if (new Date(task.updatedAt).getTime() > new Date(current.lastCalledAt).getTime()) {
          current.lastCalledAt = task.updatedAt.toISOString();
        }

        grouped.set(modelName, current);
      }

      return [...grouped.values()].sort((a, b) => b.taskCount - a.taskCount);
    }

    return [...database.modelUsage].sort((a, b) => b.taskCount - a.taskCount);
  }
}

function inferProvider(modelName: string) {
  if (modelName.includes("gpt")) {
    return "OpenAI Proxy";
  }
  if (modelName.includes("gemini")) {
    return "Google Proxy";
  }
  if (modelName.includes("doubao")) {
    return "Doubao";
  }
  return "Custom Provider";
}
