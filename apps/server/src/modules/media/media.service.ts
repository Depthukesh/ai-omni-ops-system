import { Injectable, NotFoundException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestAuthContext } from "../auth/auth.service";

export type CreateMediaPayload = {
  userId?: string;
  brandId?: string;
  taskId?: string;
  title: string;
  mediaType: "IMAGE" | "VIDEO" | "DOCUMENT" | "HTML";
  sourceUrl?: string;
  storageKey: string;
  mimeType?: string;
  fileSize?: number;
};

@Injectable()
export class MediaService {
  constructor(private readonly prismaService: PrismaService) {}

  async listMedia(auth?: RequestAuthContext) {
    if (await this.prismaService.canUseDatabase()) {
      const userId = auth?.userId ?? (await this.getDefaultUserId());
      const mediaAssets = await this.prismaService.mediaAsset.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return mediaAssets.map((item) => ({
        id: item.id,
        userId: item.userId,
        brandId: item.brandId ?? undefined,
        taskId: item.taskId ?? undefined,
        title: item.title,
        mediaType: item.mediaType,
        sourceUrl: item.sourceUrl ?? undefined,
        storageKey: item.storageKey ?? "",
        mimeType: item.mimeType ?? undefined,
        fileSize: item.fileSize ?? undefined,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }));
    }

    const userId = auth?.userId ?? database.users[0]?.id;
    return [...database.media]
      .filter((item) => !userId || item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createMedia(payload: CreateMediaPayload, auth?: RequestAuthContext) {
    if (await this.prismaService.canUseDatabase()) {
      const userId = auth?.userId ?? payload.userId ?? (await this.getDefaultUserId());
      const brandId = auth?.brandId ?? payload.brandId;

      if (brandId) {
        await this.ensureBrandExists(brandId);
      }

      if (payload.taskId) {
        await this.ensureTaskExists(payload.taskId);
      }

      const media = await this.prismaService.mediaAsset.create({
        data: {
          userId,
          brandId,
          taskId: payload.taskId,
          title: payload.title,
          mediaType: payload.mediaType as MediaType,
          sourceUrl: payload.sourceUrl,
          storageKey: payload.storageKey,
          mimeType: payload.mimeType,
          fileSize: payload.fileSize,
        },
      });

      return {
        id: media.id,
        userId: media.userId,
        brandId: media.brandId ?? undefined,
        taskId: media.taskId ?? undefined,
        title: media.title,
        mediaType: media.mediaType,
        sourceUrl: media.sourceUrl ?? undefined,
        storageKey: media.storageKey ?? "",
        mimeType: media.mimeType ?? undefined,
        fileSize: media.fileSize ?? undefined,
        createdAt: media.createdAt.toISOString(),
        updatedAt: media.updatedAt.toISOString(),
      };
    }

    const media = {
      id: createId("med"),
      userId: auth?.userId ?? payload.userId ?? database.users[0].id,
      brandId: auth?.brandId ?? payload.brandId,
      taskId: payload.taskId,
      title: payload.title,
      mediaType: payload.mediaType,
      sourceUrl: payload.sourceUrl,
      storageKey: payload.storageKey,
      createdAt: new Date().toISOString(),
    };

    database.media.unshift(media);
    return media;
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

  private async ensureTaskExists(taskId: string) {
    const task = await this.prismaService.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException("任务不存在");
    }
  }
}
