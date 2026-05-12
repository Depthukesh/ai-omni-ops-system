import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { MediaType } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { AppConfigService } from "../../config/app-config.service";
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
  private readonly appConfigService = new AppConfigService();

  constructor(private readonly prismaService: PrismaService) {}

  async listMedia(auth?: RequestAuthContext) {
    const userId = this.requireUserId(auth);
    if (await this.prismaService.canUseDatabase()) {
      const mediaAssets = await this.prismaService.mediaAsset.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return mediaAssets.map((item) => this.toMediaRecord(item));
    }

    return [...database.media]
      .filter((item) => item.userId === userId)
      .map((item) => this.toMediaRecord(item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createMedia(payload: CreateMediaPayload, auth?: RequestAuthContext) {
    const userId = this.requireUserId(auth);
    if (await this.prismaService.canUseDatabase()) {
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

      return this.toMediaRecord(media);
    }

    const media = {
      id: createId("med"),
      userId,
      brandId: auth?.brandId ?? payload.brandId,
      taskId: payload.taskId,
      title: payload.title,
      mediaType: payload.mediaType,
      sourceUrl: payload.sourceUrl,
      storageKey: payload.storageKey,
      createdAt: new Date().toISOString(),
    };

    database.media.unshift(media);
    return this.toMediaRecord(media);
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

  private async ensureTaskExists(taskId: string) {
    const task = await this.prismaService.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException("任务不存在");
    }
  }

  private toMediaRecord(item: {
    id: string;
    userId: string;
    brandId?: string | null;
    taskId?: string | null;
    title: string;
    mediaType: MediaType | CreateMediaPayload["mediaType"];
    sourceUrl?: string | null;
    storageKey?: string | null;
    mimeType?: string | null;
    fileSize?: number | null;
    createdAt: Date | string;
    updatedAt?: Date | string | null;
  }) {
    const storageKey = item.storageKey ?? "";
    const sourceUrl = item.sourceUrl ?? "";
    return {
      id: item.id,
      userId: item.userId,
      brandId: item.brandId ?? undefined,
      taskId: item.taskId ?? undefined,
      title: item.title,
      mediaType: item.mediaType,
      assetUrl: this.resolveMediaAssetUrl(item.brandId ?? undefined, storageKey, sourceUrl),
      scope: this.resolveMediaScope(item.title, storageKey, sourceUrl),
      mimeType: item.mimeType ?? undefined,
      fileSize: item.fileSize ?? undefined,
      createdAt: this.toIsoString(item.createdAt),
      updatedAt: item.updatedAt ? this.toIsoString(item.updatedAt) : undefined,
    };
  }

  private resolveMediaAssetUrl(brandId?: string, storageKey = "", sourceUrl = "") {
    const internalAssetUrl = this.resolveGeneratedWorkAssetUrl(brandId, storageKey);
    if (internalAssetUrl) {
      return internalAssetUrl;
    }
    return this.normalizePublicSourceUrl(sourceUrl);
  }

  private resolveGeneratedWorkAssetUrl(brandId: string | undefined, storageKey: string) {
    if (!brandId || !storageKey) {
      return "";
    }
    const match = /^works\/([^/]+)\/(.+)$/.exec(storageKey);
    if (!match || match[1] !== brandId) {
      return "";
    }
    return `${this.appConfigService.getServerBaseUrl()}/api/works/brands/${brandId}/assets/${encodeURIComponent(match[2])}`;
  }

  private normalizePublicSourceUrl(sourceUrl: string) {
    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      return "";
    }
    try {
      const parsed = new URL(trimmed, this.appConfigService.getServerBaseUrl());
      const isPrivateHost = parsed.hostname === "localhost"
        || parsed.hostname === "127.0.0.1"
        || /^10\./.test(parsed.hostname)
        || /^192\.168\./.test(parsed.hostname)
        || /^172\.(1[6-9]|2\d|3[0-1])\./.test(parsed.hostname);
      if (process.env.NODE_ENV !== "development" && isPrivateHost) {
        return "";
      }
      return parsed.toString();
    } catch {
      return "";
    }
  }

  private resolveMediaScope(title: string, storageKey: string, sourceUrl: string) {
    const keyword = `${title} ${storageKey} ${sourceUrl}`.toLowerCase();
    return keyword.includes("xiaohongshu") || keyword.includes("xhs") ? "XIAOHONGSHU" : "OTHER";
  }

  private toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : value;
  }
}
