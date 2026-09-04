import { BadRequestException, Injectable } from "@nestjs/common";
import { OpenClawCreativeMaterialService, type OpenClawCreativeMaterialRecord } from "./openclaw-creative-material.service";
import { OpenClawVideoWorkService, type OpenClawVideoWorkRecord } from "./openclaw-video-work.service";
import {
  getOpenClawWorkspaceDisplayName,
  type OpenClawWorkspaceScope,
  normalizeOpenClawWorkspaceScope,
} from "./openclaw-workspace-scope";

export type OpenChatCutBridgeAssetRecord = {
  id: string;
  sourceType: "creative_material" | "video_work";
  title: string;
  assetType: "image" | "video" | "audio" | "text";
  fileUrl?: string;
  coverImageUrl?: string;
  localFilePath?: string;
  textContent?: string;
  mimeType?: string;
  fileName?: string;
  materialType?: string;
  tags: string[];
  workspaceScope: OpenClawWorkspaceScope;
  workspaceLabel: string;
  createdAt: string;
};

export type OpenChatCutStoryboardDraft = {
  title: string;
  summary: string;
  workspaceScope: OpenClawWorkspaceScope;
  workspaceLabel: string;
  recommendedAssets: OpenChatCutBridgeAssetRecord[];
  timelineDraft: Array<{
    order: number;
    clipType: "video" | "image" | "audio" | "cover" | "script";
    sourceId: string;
    sourceType: "creative_material" | "video_work";
    title: string;
    notes: string;
    fileUrl?: string;
    coverImageUrl?: string;
    localFilePath?: string;
    textContent?: string;
  }>;
};

@Injectable()
export class OpenClawOpenChatCutBridgeService {
  constructor(
    private readonly creativeMaterialService: OpenClawCreativeMaterialService,
    private readonly videoWorkService: OpenClawVideoWorkService,
  ) {}

  async listBridgeAssets(
    brandId: string,
    options?: {
      workspaceScope?: string;
      includeCreativeMaterials?: boolean;
      includeVideoWorks?: boolean;
      materialCategories?: string[];
      limit?: number;
    },
  ) {
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const includeCreativeMaterials = options?.includeCreativeMaterials !== false;
    const includeVideoWorks = options?.includeVideoWorks !== false;
    const resolvedLimit = this.normalizeLimit(options?.limit);
    const normalizedCategories = this.normalizeCategories(options?.materialCategories);

    const [creativeWorkspace, videoWorkspace] = await Promise.all([
      includeCreativeMaterials ? this.creativeMaterialService.listWorkspace(brandId, workspaceScope, 200) : Promise.resolve({ items: [], total: 0 }),
      includeVideoWorks ? this.videoWorkService.listWorkspace(brandId, workspaceScope, 100) : Promise.resolve({ items: [], total: 0 }),
    ]);

    const creativeAssets = creativeWorkspace.items
      .filter((item) => (normalizedCategories.length ? normalizedCategories.includes(item.materialCategory) : true))
      .map((item) => this.mapCreativeMaterial(item));
    const videoAssets = videoWorkspace.items
      .map((item) => this.mapVideoWork(item))
      .filter((item) => (normalizedCategories.length ? normalizedCategories.includes(item.assetType) : true));
    const sortedAssets = [...creativeAssets, ...videoAssets]
      .sort((left, right) => this.getTimestamp(right.createdAt) - this.getTimestamp(left.createdAt));
    const items = sortedAssets.slice(0, resolvedLimit);

    return {
      workspaceScope,
      workspaceLabel,
      total: sortedAssets.length,
      counts: {
        image: sortedAssets.filter((item) => item.assetType === "image").length,
        video: sortedAssets.filter((item) => item.assetType === "video").length,
        audio: sortedAssets.filter((item) => item.assetType === "audio").length,
        text: sortedAssets.filter((item) => item.assetType === "text").length,
      },
      items,
    };
  }

  async buildStoryboardDraft(
    brandId: string,
    options?: {
      workspaceScope?: string;
      title?: string;
      objective?: string;
      selectedMaterialIds?: string[];
      selectedVideoWorkIds?: string[];
      limit?: number;
    },
  ): Promise<OpenChatCutStoryboardDraft> {
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope);
    const workspaceLabel = getOpenClawWorkspaceDisplayName(workspaceScope);
    const selectedMaterialIds = this.normalizeIdList(options?.selectedMaterialIds);
    const selectedVideoWorkIds = this.normalizeIdList(options?.selectedVideoWorkIds);
    const hasManualSelection = selectedMaterialIds.length > 0 || selectedVideoWorkIds.length > 0;

    let selectedAssets: OpenChatCutBridgeAssetRecord[] = [];
    if (selectedMaterialIds.length) {
      const materials = await Promise.all(
        selectedMaterialIds.map((materialId) => this.creativeMaterialService.getMaterialById(brandId, workspaceScope, materialId)),
      );
      selectedAssets.push(
        ...materials.filter(Boolean).map((item) => this.mapCreativeMaterial(item as OpenClawCreativeMaterialRecord)),
      );
    }
    if (selectedVideoWorkIds.length) {
      const videoWorks = await Promise.all(
        selectedVideoWorkIds.map((workId) => this.videoWorkService.getVideoWorkById(brandId, workspaceScope, workId)),
      );
      selectedAssets.push(
        ...videoWorks.filter(Boolean).map((item) => this.mapVideoWork(item as OpenClawVideoWorkRecord)),
      );
    }

    if (selectedAssets.length) {
      selectedAssets = Array.from(new Map(selectedAssets.map((item) => [item.id, item])).values());
    }

    if (!selectedAssets.length) {
      const fallbackAssets = await this.listBridgeAssets(brandId, {
        workspaceScope,
        includeCreativeMaterials: true,
        includeVideoWorks: true,
        limit: this.normalizeLimit(options?.limit || 12),
      });
      selectedAssets = fallbackAssets.items;
    }

    if (!selectedAssets.length) {
      throw new BadRequestException(`当前品牌 ${workspaceLabel} 板块还没有可提供给 OpenChatCut 的素材或视频作品`);
    }

    const title = String(options?.title || "").trim() || `${workspaceLabel}视频剪辑草案`;
    const objective = String(options?.objective || "").trim();
    const videoAssets = selectedAssets.filter((item) => item.assetType === "video");
    const imageAssets = selectedAssets.filter((item) => item.assetType === "image");
    const audioAssets = selectedAssets.filter((item) => item.assetType === "audio");
    const textAssets = selectedAssets.filter((item) => item.assetType === "text");
    const primaryVideo = videoAssets[0];
    const coverAsset = imageAssets[0] || selectedAssets.find((item) => item.coverImageUrl);
    const scriptAsset = textAssets[0];
    const backgroundAudio = audioAssets[0];

    const timelineDraft = [
      coverAsset ? {
        order: 1,
        clipType: "cover" as const,
        sourceId: coverAsset.id,
        sourceType: coverAsset.sourceType,
        title: coverAsset.title,
        notes: "建议作为开场封面或首帧参考图导入 OpenChatCut。",
        fileUrl: coverAsset.fileUrl,
        coverImageUrl: coverAsset.coverImageUrl,
        localFilePath: coverAsset.localFilePath,
        textContent: coverAsset.textContent,
      } : null,
      primaryVideo ? {
        order: 2,
        clipType: "video" as const,
        sourceId: primaryVideo.id,
        sourceType: primaryVideo.sourceType,
        title: primaryVideo.title,
        notes: "建议作为主时间线素材导入 OpenChatCut，并按需要切段。",
        fileUrl: primaryVideo.fileUrl,
        coverImageUrl: primaryVideo.coverImageUrl,
        localFilePath: primaryVideo.localFilePath,
        textContent: primaryVideo.textContent,
      } : null,
      backgroundAudio ? {
        order: 3,
        clipType: "audio" as const,
        sourceId: backgroundAudio.id,
        sourceType: backgroundAudio.sourceType,
        title: backgroundAudio.title,
        notes: "建议作为背景音乐或配音轨道导入 OpenChatCut。",
        fileUrl: backgroundAudio.fileUrl,
        coverImageUrl: backgroundAudio.coverImageUrl,
        localFilePath: backgroundAudio.localFilePath,
        textContent: backgroundAudio.textContent,
      } : null,
      scriptAsset ? {
        order: 4,
        clipType: "script" as const,
        sourceId: scriptAsset.id,
        sourceType: scriptAsset.sourceType,
        title: scriptAsset.title,
        notes: "建议作为字幕、旁白或剪辑备注文本使用。",
        fileUrl: scriptAsset.fileUrl,
        coverImageUrl: scriptAsset.coverImageUrl,
        localFilePath: scriptAsset.localFilePath,
        textContent: scriptAsset.textContent,
      } : null,
    ].filter(Boolean) as OpenChatCutStoryboardDraft["timelineDraft"];

    return {
      title,
      summary: hasManualSelection
        ? `已按手动选择素材生成 ${workspaceLabel} 的 OpenChatCut 剪辑草案，可直接把下面清单喂给外部剪辑 MCP。${objective ? `剪辑目标：${objective}` : ""}`.trim()
        : `已基于 ${workspaceLabel} 板块最近素材自动生成 OpenChatCut 剪辑草案，可直接把下面清单喂给外部剪辑 MCP。${objective ? `剪辑目标：${objective}` : ""}`.trim(),
      workspaceScope,
      workspaceLabel,
      recommendedAssets: selectedAssets,
      timelineDraft,
    };
  }

  private mapCreativeMaterial(item: OpenClawCreativeMaterialRecord): OpenChatCutBridgeAssetRecord {
    return {
      id: item.id,
      sourceType: "creative_material",
      title: item.title,
      assetType: item.materialCategory,
      fileUrl: item.fileUrl,
      localFilePath: item.localFilePath,
      textContent: item.textContent,
      mimeType: item.mimeType,
      fileName: item.fileName,
      materialType: item.materialType,
      tags: item.materialTags,
      workspaceScope: item.workspaceScope,
      workspaceLabel: getOpenClawWorkspaceDisplayName(item.workspaceScope),
      createdAt: item.createdAt,
    };
  }

  private mapVideoWork(item: OpenClawVideoWorkRecord): OpenChatCutBridgeAssetRecord {
    return {
      id: item.id,
      sourceType: "video_work",
      title: item.title,
      assetType: "video",
      fileUrl: item.videoUrl,
      coverImageUrl: item.coverImageUrl,
      textContent: item.scriptContent,
      tags: ["video_work"],
      workspaceScope: item.workspaceScope,
      workspaceLabel: getOpenClawWorkspaceDisplayName(item.workspaceScope),
      createdAt: item.createdAt,
    };
  }

  private normalizeCategories(categories?: string[]) {
    return Array.isArray(categories)
      ? categories.map((item) => String(item || "").trim().toLowerCase()).filter((item) => ["image", "video", "audio", "text"].includes(item))
      : [];
  }

  private normalizeIdList(value?: string[]) {
    return Array.isArray(value)
      ? value.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  }

  private normalizeLimit(limit?: number) {
    if (!Number.isFinite(limit) || Number(limit) <= 0) {
      return 20;
    }
    return Math.min(50, Math.floor(Number(limit)));
  }

  private getTimestamp(value?: string) {
    const timestamp = value ? Date.parse(value) : NaN;
    return Number.isFinite(timestamp) ? timestamp : 0;
  }
}
