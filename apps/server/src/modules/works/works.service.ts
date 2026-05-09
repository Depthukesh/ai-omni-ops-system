import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { MediaType, TaskStatus, type Prisma } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SkillsPromptsService } from "../admin/skills-prompts.service";
import type { RequestAuthContext } from "../auth/auth.service";
import { BrandsService } from "../brands/brands.service";
import { CollectorsService } from "../collectors/collectors.service";
import { ReportsService, type XiaohongshuMarketingCalendarRecord } from "../reports/reports.service";

type UploadFilePayload = {
  fileName: string;
  contentType: string;
  dataBase64: string;
};

export type GenerateXiaohongshuOriginalNotePayload = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  imageCount?: number;
  additionalInstruction?: string;
  coverReferenceImage?: UploadFilePayload;
  galleryReferenceImages?: UploadFilePayload[];
};

export type UpdateXiaohongshuOriginalNotePayload = {
  title?: string;
  content?: string;
};

export type GenerateXiaohongshuRewriteNotePayload = {
  sourceMaterialId?: string;
  productId?: string;
  additionalInstruction?: string;
};

export type UpdateXiaohongshuRewriteNotePayload = {
  title?: string;
  content?: string;
};

export type GenerateXiaohongshuVideoNotePayload = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  referenceImage?: UploadFilePayload;
  copyAdditionalInstruction?: string;
  videoProvider?: string;
  customVideoModelName?: string;
  durationSec?: number;
  includeMarketingPlan?: boolean;
  outputVideoPrompt?: boolean;
  videoAdditionalInstruction?: string;
};

export type UpdateXiaohongshuVideoNotePayload = {
  title?: string;
  content?: string;
  videoPrompt?: string;
};

type WorkTaskStatus = "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";

type ImageTextPlanEntry = {
  title: string;
  badges: string[];
};

type OriginalWorkAssetMeta = {
  kind: "XHS_ORIGINAL_NOTE";
  taskId: string;
  noteCategory: "原创";
  noteType: "图文";
  title: string;
  content: string;
  htmlContent: string;
  hashtags: string[];
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  productImageUrl?: string;
  imageCount?: number;
  additionalInstruction?: string;
  coverImageId?: string;
  coverImageUrl?: string;
  galleryImageIds: string[];
  imageUrls: string[];
  coverText?: ImageTextPlanEntry;
  imageTexts?: ImageTextPlanEntry[];
  coverPrompt: string;
  imagePrompts: string[];
  coverReferenceStyle?: string;
  galleryReferenceStyles?: string[];
  styleAnalysisModel?: string;
  copyModel?: string;
  imagePromptModel?: string;
  imageGenerationModel?: string;
  createdAt: string;
  updatedAt: string;
};

type OriginalImageAssetMeta = {
  kind: "XHS_ORIGINAL_NOTE_IMAGE";
  workId: string;
  taskId: string;
  role: "COVER" | "GALLERY";
  order: number;
  prompt: string;
  createdAt: string;
};

type RewriteWorkAssetMeta = {
  kind: "XHS_REWRITE_NOTE";
  taskId: string;
  noteCategory: "二创";
  noteType: "图文";
  title: string;
  content: string;
  htmlContent: string;
  hashtags: string[];
  sourceMaterialId: string;
  sourceMaterialTitle: string;
  sourceMaterialDescription?: string;
  sourceMaterialUrl?: string;
  sourceMaterialImageUrls: string[];
  productId?: string;
  productName?: string;
  productImageUrl?: string;
  additionalInstruction?: string;
  coverImageId?: string;
  coverImageUrl?: string;
  galleryImageIds: string[];
  imageUrls: string[];
  coverText?: ImageTextPlanEntry;
  imageTexts?: ImageTextPlanEntry[];
  coverPrompt: string;
  imagePrompts: string[];
  copyModel?: string;
  imagePromptModel?: string;
  imageGenerationModel?: string;
  createdAt: string;
  updatedAt: string;
};

type RewriteImageAssetMeta = {
  kind: "XHS_REWRITE_NOTE_IMAGE";
  workId: string;
  taskId: string;
  role: "COVER" | "GALLERY";
  order: number;
  prompt: string;
  createdAt: string;
};

type VideoWorkAssetMeta = {
  kind: "XHS_VIDEO_NOTE";
  taskId: string;
  noteCategory: "原创";
  noteType: "视频";
  title: string;
  content: string;
  htmlContent: string;
  hashtags: string[];
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  referenceImageUrl?: string;
  copyAdditionalInstruction?: string;
  videoAdditionalInstruction?: string;
  includeMarketingPlan: boolean;
  requestedVideoProvider: string;
  resolvedVideoProvider: string;
  resolvedVideoModel?: string;
  requestedDurationSec: number;
  renderedDurationSec?: number;
  outputVideoPrompt: boolean;
  videoPrompt?: string;
  fullVideoPrompt?: string;
  videoReasoning?: string;
  businessScene?: string;
  videoType?: string;
  segmentBrief?: string;
  referenceStrategy?: string;
  padImageStrategy?: string;
  continuityRules?: string[];
  segmentPrompts: string[];
  segmentExecutionStatus?: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
  segmentExecutionError?: string;
  segmentAssets?: VideoSegmentAssetEntry[];
  providerTaskId?: string;
  videoAssetId?: string;
  videoUrl?: string;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
};

type VideoAssetMeta = {
  kind: "XHS_VIDEO_NOTE_VIDEO";
  workId: string;
  taskId: string;
  providerTaskId?: string;
  provider: string;
  modelName?: string;
  durationSec?: number;
  createdAt: string;
};

type VideoSegmentAssetEntry = {
  order: number;
  prompt: string;
  videoUrl: string;
  coverImageUrl?: string;
  provider: string;
  modelName?: string;
  providerTaskId?: string;
  renderedDurationSec?: number;
  referenceImageUrl?: string;
  videoAssetId?: string;
};

export type XiaohongshuOriginalWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  title: string;
  content: string;
  coverImageUrl?: string;
  imageUrls: string[];
  noteCategory: "原创";
  noteType: "图文";
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  additionalInstruction?: string;
  hashtags: string[];
  coverText?: ImageTextPlanEntry;
  imageTexts: ImageTextPlanEntry[];
  coverPrompt: string;
  imagePrompts: string[];
  coverReferenceStyle?: string;
  galleryReferenceStyles: string[];
  copyModel?: string;
  imagePromptModel?: string;
  imageGenerationModel?: string;
  taskStatus?: WorkTaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type XiaohongshuRewriteWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  title: string;
  content: string;
  coverImageUrl?: string;
  imageUrls: string[];
  noteCategory: "二创";
  noteType: "图文";
  sourceMaterialId: string;
  sourceMaterialTitle: string;
  sourceMaterialDescription?: string;
  sourceMaterialUrl?: string;
  sourceMaterialImageUrls: string[];
  productId?: string;
  productName?: string;
  additionalInstruction?: string;
  hashtags: string[];
  coverText?: ImageTextPlanEntry;
  imageTexts: ImageTextPlanEntry[];
  coverPrompt: string;
  imagePrompts: string[];
  copyModel?: string;
  imagePromptModel?: string;
  imageGenerationModel?: string;
  taskStatus?: WorkTaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type XiaohongshuVideoWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  title: string;
  content: string;
  coverImageUrl?: string;
  videoUrl?: string;
  noteCategory: "原创";
  noteType: "视频";
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  referenceImageUrl?: string;
  copyAdditionalInstruction?: string;
  videoAdditionalInstruction?: string;
  includeMarketingPlan: boolean;
  requestedVideoProvider: string;
  resolvedVideoProvider: string;
  resolvedVideoModel?: string;
  requestedDurationSec: number;
  renderedDurationSec?: number;
  outputVideoPrompt: boolean;
  videoPrompt?: string;
  fullVideoPrompt?: string;
  videoReasoning?: string;
  businessScene?: string;
  videoType?: string;
  segmentBrief?: string;
  referenceStrategy?: string;
  padImageStrategy?: string;
  continuityRules: string[];
  segmentPrompts: string[];
  segmentExecutionStatus?: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
  segmentExecutionError?: string;
  segmentAssets: VideoSegmentAssetEntry[];
  taskStatus?: WorkTaskStatus;
  createdAt: string;
  updatedAt: string;
};

export type XiaohongshuPublishableWorkRecord = {
  id: string;
  brandId?: string;
  taskId: string;
  workKind: "ORIGINAL" | "REWRITE";
  noteCategory: "原创" | "二创";
  noteType: "图文";
  title: string;
  content: string;
  coverImageUrl?: string;
  imageUrls: string[];
  allImageUrls: string[];
  hashtags: string[];
  productName?: string;
  sourceLabel: string;
  createdAt: string;
  updatedAt: string;
};

type OriginalCopyModelResult = {
  title: string;
  content: string;
  hashtags: string[];
  modelName: string;
};

type VideoCopyModelResult = OriginalCopyModelResult & {
  businessScene?: string;
  videoType?: string;
  communicationGoal?: string;
  storyHook?: string;
  motionLanguage?: string;
  shotLanguage?: string;
  segmentStrategy?: string;
  antiErrorRules: string[];
};

type OriginalImagePromptResult = {
  coverText: ImageTextPlanEntry;
  imageTexts: ImageTextPlanEntry[];
  coverPrompt: string;
  imagePrompts: string[];
  modelName: string;
};

type GeneratedImageResult = {
  url: string;
  modelName: string;
};

type VideoPromptModelResult = {
  videoReasoning: string;
  videoPrompt: string;
  fullVideoPrompt: string;
  negativePrompt?: string;
  businessScene?: string;
  videoType?: string;
  segmentBrief?: string;
  referenceStrategy?: string;
  padImageStrategy?: string;
  continuityRules: string[];
  segmentPrompts: string[];
  modelName: string;
};

type GeneratedVideoResult = {
  url: string;
  coverImageUrl?: string;
  provider: string;
  modelName: string;
  providerTaskId: string;
  renderedDurationSec?: number;
};

type ThirdPartyChatConfig = {
  baseUrls: string[];
  completionPath: string;
  apiKeys: string[];
};

type TextProviderConfig = ThirdPartyChatConfig & {
  provider: "THIRD_PARTY" | "DEEPSEEK" | "KIMI" | "ARK";
  models: string[];
  temperature: number;
  maxTokens: number;
  requestTimeoutMs?: number;
  payloadExtras?: Record<string, unknown>;
  tokenLimitField?: "max_tokens" | "max_completion_tokens";
};

type ImageProviderConfig = ThirdPartyChatConfig & {
  provider: "IMAGE_API";
  models: string[];
  requestTimeoutMs?: number;
};

type VideoBackendKey = "hailuo" | "kling" | "seedance" | "veo" | "wan";

type VideoProviderConfig = {
  backend: VideoBackendKey;
  baseUrls: string[];
  apiKeys: string[];
  createPath: string;
  queryPath: string;
  textModel: string;
  imageModel: string;
  fastModel?: string;
  proModel?: string;
  multiImageModel?: string;
  modelName?: string;
  textCreatePath?: string;
  imageCreatePath?: string;
  textQueryPath?: string;
  imageQueryPath?: string;
  requestTimeoutMs?: number;
};

@Injectable()
export class WorksService {
  constructor(
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(BrandsService)
    private readonly brandsService: BrandsService,
    @Inject(CollectorsService)
    private readonly collectorsService: CollectorsService,
    @Inject(ReportsService)
    private readonly reportsService: ReportsService,
    @Inject(SkillsPromptsService)
    private readonly skillsPromptsService: SkillsPromptsService,
  ) {}

  async listXiaohongshuOriginalWorks(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const workRows = await this.prismaService.mediaAsset.findMany({
        where: {
          brandId,
          mediaType: MediaType.HTML,
        },
        orderBy: { createdAt: "desc" },
      });

      const items = await Promise.all(
        workRows
          .filter((item) => this.isOriginalWorkMeta(item.metadataJson))
          .map(async (item) => this.mapOriginalWorkFromDatabase(item)),
      );

      return {
        items: items.filter((item): item is XiaohongshuOriginalWorkRecord => Boolean(item)),
      };
    }

    const items = database.media
      .filter((item) => item.brandId === brandId && item.mediaType === "HTML")
      .filter((item) => this.isOriginalWorkMeta((item as { metadataJson?: unknown }).metadataJson))
      .map((item) => this.mapOriginalWorkFromMock(item))
      .filter((item): item is XiaohongshuOriginalWorkRecord => Boolean(item))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { items };
  }

  async listXiaohongshuRewriteWorks(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const workRows = await this.prismaService.mediaAsset.findMany({
        where: {
          brandId,
          mediaType: MediaType.HTML,
        },
        orderBy: { createdAt: "desc" },
      });

      const items = await Promise.all(
        workRows
          .filter((item) => this.isRewriteWorkMeta(item.metadataJson))
          .map(async (item) => this.mapRewriteWorkFromDatabase(item)),
      );

      return {
        items: items.filter((item): item is XiaohongshuRewriteWorkRecord => Boolean(item)),
      };
    }

    const items = database.media
      .filter((item) => item.brandId === brandId && item.mediaType === "HTML")
      .filter((item) => this.isRewriteWorkMeta((item as { metadataJson?: unknown }).metadataJson))
      .map((item) => this.mapRewriteWorkFromMock(item))
      .filter((item): item is XiaohongshuRewriteWorkRecord => Boolean(item))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { items };
  }

  async listXiaohongshuVideoWorks(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const workRows = await this.prismaService.mediaAsset.findMany({
        where: {
          brandId,
          mediaType: MediaType.HTML,
        },
        orderBy: { createdAt: "desc" },
      });

      const items = await Promise.all(
        workRows
          .filter((item) => this.isVideoWorkMeta(item.metadataJson))
          .map(async (item) => this.mapVideoWorkFromDatabase(item)),
      );

      return {
        items: items.filter((item): item is XiaohongshuVideoWorkRecord => Boolean(item)),
      };
    }

    const items = database.media
      .filter((item) => item.brandId === brandId && item.mediaType === "HTML")
      .filter((item) => this.isVideoWorkMeta((item as { metadataJson?: unknown }).metadataJson))
      .map((item) => this.mapVideoWorkFromMock(item))
      .filter((item): item is XiaohongshuVideoWorkRecord => Boolean(item))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { items };
  }

  async getXiaohongshuPublishableWork(brandId: string, workId: string): Promise<XiaohongshuPublishableWorkRecord> {
    try {
      const target = await this.getOriginalWorkRowById(brandId, workId);
      const meta = this.readOriginalWorkMeta(this.getMediaMetadata(target));
      const record = this.mapOriginalWorkRecord(
        target.id,
        target.brandId ?? undefined,
        target.taskId ?? meta.taskId,
        meta,
        targetTaskStatus(target),
        normalizeMaybeDate(target.createdAt),
        normalizeMaybeDate(target.updatedAt),
      );
      return {
        id: record.id,
        brandId: record.brandId,
        taskId: record.taskId,
        workKind: "ORIGINAL",
        noteCategory: record.noteCategory,
        noteType: record.noteType,
        title: record.title,
        content: record.content,
        coverImageUrl: record.coverImageUrl,
        imageUrls: record.imageUrls,
        allImageUrls: mergeWorkImageUrls(record.coverImageUrl, record.imageUrls),
        hashtags: record.hashtags,
        productName: record.productName,
        sourceLabel: record.calendarLabel || record.customTopicName || "原创笔记",
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    const target = await this.getRewriteWorkRowById(brandId, workId);
    const meta = this.readRewriteWorkMeta(this.getMediaMetadata(target));
    const record = this.mapRewriteWorkRecord(
      target.id,
      target.brandId ?? undefined,
      target.taskId ?? meta.taskId,
      meta,
      targetTaskStatus(target),
      normalizeMaybeDate(target.createdAt),
      normalizeMaybeDate(target.updatedAt),
    );
    return {
      id: record.id,
      brandId: record.brandId,
      taskId: record.taskId,
      workKind: "REWRITE",
      noteCategory: record.noteCategory,
      noteType: record.noteType,
      title: record.title,
      content: record.content,
      coverImageUrl: record.coverImageUrl,
      imageUrls: record.imageUrls,
      allImageUrls: mergeWorkImageUrls(record.coverImageUrl, record.imageUrls),
      hashtags: record.hashtags,
      productName: record.productName,
      sourceLabel: record.sourceMaterialTitle || "二创素材",
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async generateXiaohongshuOriginalNote(
    brandId: string,
    payload: GenerateXiaohongshuOriginalNotePayload,
    auth?: RequestAuthContext,
  ) {
    const archive = await this.brandsService.getArchive(brandId);
    const marketingPlanWorkspace = await this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
    const latestMarketingPlan = marketingPlanWorkspace.latest;
    if (!latestMarketingPlan) {
      throw new BadRequestException("请先生成小红书营销策划方案，再创作原创笔记。");
    }

    const calendarWorkspace = await this.reportsService.getXiaohongshuMarketingCalendarWorkspace(brandId);
    const selectedCalendarItem = this.findSelectedCalendarItem(calendarWorkspace.history, payload.calendarItemId);

    if (!selectedCalendarItem && !payload.customTopicName?.trim()) {
      throw new BadRequestException("请选择营销日历选题，或填写自定义选题。");
    }

    const selectedProduct = payload.productId
      ? archive.products.find((item) => item.id === payload.productId)
      : undefined;
    const normalizedProduct = selectedProduct
      ? {
          id: selectedProduct.id,
          productName: selectedProduct.productName,
          detailDescription: selectedProduct.detailDescription || "",
          usageScenario: selectedProduct.usageScenario || "",
          targetAudience: selectedProduct.targetAudience || "",
          differentiators: selectedProduct.differentiators || "",
          imageUrl: selectedProduct.imageUrl || undefined,
        }
      : undefined;

    const userId = await this.resolveTaskUserId(brandId, auth);
    const taskTitle = `生成小红书原创笔记：${selectedCalendarItem?.topicName || payload.customTopicName?.trim() || "自定义选题"}`;
    const task = await this.createOriginalTask({
      userId,
      brandId,
      taskTitle,
    });

    try {
      await this.markTaskRunning(task.id);
      await this.ensureTaskNotCancelled(task.id);

      const referenceFiles = this.normalizeReferenceFiles(payload);
      const referenceStyles = referenceFiles.length
        ? await this.analyzeReferenceImages(referenceFiles, latestMarketingPlan.reportMarkdown)
        : { coverReferenceStyle: undefined, galleryReferenceStyles: [], modelName: undefined };
      await this.ensureTaskNotCancelled(task.id);

      const copyResult = await this.generateOriginalCopy({
        marketingPlanMarkdown: latestMarketingPlan.reportMarkdown,
        selectedCalendarItem,
        customTopicName: payload.customTopicName?.trim(),
        product: normalizedProduct,
        additionalInstruction: payload.additionalInstruction?.trim(),
      });
      await this.ensureTaskNotCancelled(task.id);

      const imagePromptResult = await this.generateOriginalImagePrompts({
        marketingPlanMarkdown: latestMarketingPlan.reportMarkdown,
        selectedCalendarItem,
        customTopicName: payload.customTopicName?.trim(),
        product: normalizedProduct,
        additionalInstruction: payload.additionalInstruction?.trim(),
        imageCount: payload.imageCount,
        noteTitle: copyResult.title,
        noteContent: copyResult.content,
        referenceStyles,
      });
      await this.ensureTaskNotCancelled(task.id);

      const coverImage = await this.generateImageAsset({
        brandId,
        taskId: task.id,
        title: `原创笔记封面 - ${copyResult.title}`,
        role: "COVER",
        order: 0,
        prompt: imagePromptResult.coverPrompt,
        textPlan: imagePromptResult.coverText,
        referenceImageUrls: this.collectImageReferenceUrls(selectedProduct),
      });

      const galleryImages = await Promise.all(
        imagePromptResult.imagePrompts.map((prompt, index) =>
          this.generateImageAsset({
            brandId,
            taskId: task.id,
            title: `原创笔记配图${index + 1} - ${copyResult.title}`,
            role: "GALLERY",
            order: index + 1,
            prompt,
            textPlan: imagePromptResult.imageTexts[index],
            referenceImageUrls: this.collectImageReferenceUrls(selectedProduct),
          }),
        ),
      );
      await this.ensureTaskNotCancelled(task.id);

      const now = new Date().toISOString();
      const htmlContent = this.renderGeneratedNoteHtml({
        title: copyResult.title,
        content: copyResult.content,
        hashtags: copyResult.hashtags,
        coverImageUrl: coverImage.url,
        imageUrls: galleryImages.map((item) => item.url),
        noteLabel: "原创图文笔记",
      });
      const htmlFile = this.writeGeneratedTextFile(brandId, `${task.id}-note.html`, htmlContent);

      const metadata: OriginalWorkAssetMeta = {
        kind: "XHS_ORIGINAL_NOTE",
        taskId: task.id,
        noteCategory: "原创",
        noteType: "图文",
        title: copyResult.title,
        content: copyResult.content,
        htmlContent,
        hashtags: copyResult.hashtags,
        calendarItemId: selectedCalendarItem?.id,
        calendarLabel: selectedCalendarItem ? `${selectedCalendarItem.date}｜${selectedCalendarItem.topicName}` : undefined,
        customTopicName: selectedCalendarItem ? undefined : payload.customTopicName?.trim(),
        productId: selectedProduct?.id,
        productName: selectedProduct?.productName,
        productImageUrl: selectedProduct?.imageUrl || undefined,
        imageCount: payload.imageCount,
        additionalInstruction: payload.additionalInstruction?.trim() || undefined,
        coverImageUrl: coverImage.url,
        galleryImageIds: [],
        imageUrls: galleryImages.map((item) => item.url),
        coverText: imagePromptResult.coverText,
        imageTexts: imagePromptResult.imageTexts,
        coverPrompt: coverImage.prompt,
        imagePrompts: galleryImages.map((item) => item.prompt),
        coverReferenceStyle: referenceStyles.coverReferenceStyle,
        galleryReferenceStyles: referenceStyles.galleryReferenceStyles,
        styleAnalysisModel: referenceStyles.modelName,
        copyModel: copyResult.modelName,
        imagePromptModel: imagePromptResult.modelName,
        imageGenerationModel: coverImage.modelName,
        createdAt: now,
        updatedAt: now,
      };

      const workMedia = await this.createWorkHtmlMedia({
        userId,
        brandId,
        taskId: task.id,
        title: `小红书原创笔记 - ${copyResult.title}`,
        storageKey: htmlFile.storageKey,
        sourceUrl: htmlFile.url,
        metadata,
      });

      const coverMedia = await this.createWorkImageMedia({
        kind: "XHS_ORIGINAL_NOTE_IMAGE",
        userId,
        brandId,
        taskId: task.id,
        workId: workMedia.id,
        title: `原创笔记封面 - ${copyResult.title}`,
        sourceUrl: coverImage.url,
        role: "COVER",
        order: 0,
        prompt: coverImage.prompt,
      });

      const galleryMedia = await Promise.all(
        galleryImages.map((item, index) =>
          this.createWorkImageMedia({
            kind: "XHS_ORIGINAL_NOTE_IMAGE",
            userId,
            brandId,
            taskId: task.id,
            workId: workMedia.id,
            title: `原创笔记配图${index + 1} - ${copyResult.title}`,
            sourceUrl: item.url,
            role: "GALLERY",
            order: index + 1,
            prompt: item.prompt,
          }),
        ),
      );

      const updatedMetadata: OriginalWorkAssetMeta = {
        ...metadata,
        coverImageId: coverMedia.id,
        galleryImageIds: galleryMedia.map((item) => item.id),
        updatedAt: new Date().toISOString(),
      };

      await this.updateWorkHtmlMetadata(workMedia.id, brandId, updatedMetadata, workMedia.title);
      await this.ensureTaskNotCancelled(task.id);
      await this.markTaskSuccess(task.id, {
        workId: workMedia.id,
        title: copyResult.title,
        imageCount: 1 + galleryImages.length,
      });

      return {
        item: this.mapOriginalWorkRecord(workMedia.id, brandId, task.id, updatedMetadata, "SUCCESS"),
      };
    } catch (error) {
      if (!(await this.isTaskCancelled(task.id))) {
        await this.markTaskFailed(task.id, error instanceof Error ? error.message : "原创笔记生成失败");
      }
      throw error;
    }
  }

  async generateXiaohongshuRewriteNote(
    brandId: string,
    payload: GenerateXiaohongshuRewriteNotePayload,
    auth?: RequestAuthContext,
  ) {
    const sourceMaterialId = payload.sourceMaterialId?.trim();
    if (!sourceMaterialId) {
      throw new BadRequestException("请选择一个素材库作品，再开始二创。");
    }

    const archive = await this.brandsService.getArchive(brandId);
    const marketingPlanWorkspace = await this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
    const latestMarketingPlan = marketingPlanWorkspace.latest;
    if (!latestMarketingPlan) {
      throw new BadRequestException("请先生成小红书营销策划方案，再创作二创笔记。");
    }

    const collectionWorkspace = await this.collectorsService.getXiaohongshuWorkspace(brandId);
    const sourceMaterial = collectionWorkspace.benchmarkNotes.find(
      (item) => item.id === sourceMaterialId && item.isInMaterialLibrary,
    );
    if (!sourceMaterial) {
      throw new BadRequestException("未找到你选择的素材库作品，请先确认该作品已加入素材库。");
    }

    const selectedProduct = payload.productId
      ? archive.products.find((item) => item.id === payload.productId)
      : undefined;
    const normalizedProduct = selectedProduct
      ? {
          id: selectedProduct.id,
          productName: selectedProduct.productName,
          detailDescription: selectedProduct.detailDescription || "",
          usageScenario: selectedProduct.usageScenario || "",
          targetAudience: selectedProduct.targetAudience || "",
          differentiators: selectedProduct.differentiators || "",
          imageUrl: selectedProduct.imageUrl || undefined,
        }
      : undefined;

    const allowProductEmbedding = Boolean(normalizedProduct);
    const rewritePromptSourceMaterial = this.buildRewritePromptSourceMaterial(sourceMaterial, allowProductEmbedding);
    const rewriteMarketingPlanContext = this.buildRewriteMarketingPlanContext(
      latestMarketingPlan.reportMarkdown,
      allowProductEmbedding,
    );
    const rewriteTopicContext = this.buildRewriteTopicContext(sourceMaterial, allowProductEmbedding);
    const rewriteReferenceImageUrls = this.collectRewriteReferenceImageUrls(sourceMaterial.imageList || [], selectedProduct);

    const userId = await this.resolveTaskUserId(brandId, auth);
    const taskTitle = `生成小红书二创笔记：${sourceMaterial.title}`;
    const task = await this.createRewriteTask({
      userId,
      brandId,
      taskTitle,
    });

    try {
      await this.markTaskRunning(task.id);
      await this.ensureTaskNotCancelled(task.id);

      const copyResult = await this.generateRewriteCopy({
        marketingPlanMarkdown: rewriteMarketingPlanContext,
        sourceMaterial: rewritePromptSourceMaterial,
        product: normalizedProduct,
        additionalInstruction: payload.additionalInstruction?.trim(),
        topicContext: rewriteTopicContext,
      });
      await this.ensureTaskNotCancelled(task.id);

      const imagePromptResult = await this.generateRewriteImagePrompts({
        marketingPlanMarkdown: rewriteMarketingPlanContext,
        sourceMaterial: rewritePromptSourceMaterial,
        product: normalizedProduct,
        additionalInstruction: payload.additionalInstruction?.trim(),
        noteTitle: copyResult.title,
        noteContent: copyResult.content,
        topicContext: rewriteTopicContext,
      });
      await this.ensureTaskNotCancelled(task.id);

      const coverImage = await this.generateImageAsset({
        brandId,
        taskId: task.id,
        title: `二创笔记封面 - ${copyResult.title}`,
        role: "COVER",
        order: 0,
        prompt: imagePromptResult.coverPrompt,
        textPlan: imagePromptResult.coverText,
        referenceImageUrls: rewriteReferenceImageUrls,
      });

      const galleryImages = await Promise.all(
        imagePromptResult.imagePrompts.map((prompt, index) =>
          this.generateImageAsset({
            brandId,
            taskId: task.id,
            title: `二创笔记配图${index + 1} - ${copyResult.title}`,
            role: "GALLERY",
            order: index + 1,
            prompt,
            textPlan: imagePromptResult.imageTexts[index],
            referenceImageUrls: rewriteReferenceImageUrls,
          }),
        ),
      );
      await this.ensureTaskNotCancelled(task.id);

      const now = new Date().toISOString();
      const htmlContent = this.renderGeneratedNoteHtml({
        title: copyResult.title,
        content: copyResult.content,
        hashtags: copyResult.hashtags,
        coverImageUrl: coverImage.url,
        imageUrls: galleryImages.map((item) => item.url),
        noteLabel: "二创图文笔记",
      });
      const htmlFile = this.writeGeneratedTextFile(brandId, `${task.id}-rewrite-note.html`, htmlContent);

      const metadata: RewriteWorkAssetMeta = {
        kind: "XHS_REWRITE_NOTE",
        taskId: task.id,
        noteCategory: "二创",
        noteType: "图文",
        title: copyResult.title,
        content: copyResult.content,
        htmlContent,
        hashtags: copyResult.hashtags,
        sourceMaterialId: sourceMaterial.id,
        sourceMaterialTitle: sourceMaterial.title,
        sourceMaterialDescription: sourceMaterial.description || undefined,
        sourceMaterialUrl: sourceMaterial.noteUrl || sourceMaterial.sourceUrl || undefined,
        sourceMaterialImageUrls: sourceMaterial.imageList || [],
        productId: selectedProduct?.id,
        productName: selectedProduct?.productName,
        productImageUrl: selectedProduct?.imageUrl || undefined,
        additionalInstruction: payload.additionalInstruction?.trim() || undefined,
        coverImageUrl: coverImage.url,
        galleryImageIds: [],
        imageUrls: galleryImages.map((item) => item.url),
        coverText: imagePromptResult.coverText,
        imageTexts: imagePromptResult.imageTexts,
        coverPrompt: coverImage.prompt,
        imagePrompts: galleryImages.map((item) => item.prompt),
        copyModel: copyResult.modelName,
        imagePromptModel: imagePromptResult.modelName,
        imageGenerationModel: coverImage.modelName,
        createdAt: now,
        updatedAt: now,
      };

      const workMedia = await this.createWorkHtmlMedia({
        userId,
        brandId,
        taskId: task.id,
        title: `小红书二创笔记 - ${copyResult.title}`,
        storageKey: htmlFile.storageKey,
        sourceUrl: htmlFile.url,
        metadata,
      });

      const coverMedia = await this.createWorkImageMedia({
        kind: "XHS_REWRITE_NOTE_IMAGE",
        userId,
        brandId,
        taskId: task.id,
        workId: workMedia.id,
        title: `二创笔记封面 - ${copyResult.title}`,
        sourceUrl: coverImage.url,
        role: "COVER",
        order: 0,
        prompt: coverImage.prompt,
      });

      const galleryMedia = await Promise.all(
        galleryImages.map((item, index) =>
          this.createWorkImageMedia({
            kind: "XHS_REWRITE_NOTE_IMAGE",
            userId,
            brandId,
            taskId: task.id,
            workId: workMedia.id,
            title: `二创笔记配图${index + 1} - ${copyResult.title}`,
            sourceUrl: item.url,
            role: "GALLERY",
            order: index + 1,
            prompt: item.prompt,
          }),
        ),
      );

      const updatedMetadata: RewriteWorkAssetMeta = {
        ...metadata,
        coverImageId: coverMedia.id,
        galleryImageIds: galleryMedia.map((item) => item.id),
        updatedAt: new Date().toISOString(),
      };

      await this.updateWorkHtmlMetadata(workMedia.id, brandId, updatedMetadata, workMedia.title);
      await this.ensureTaskNotCancelled(task.id);
      await this.markTaskSuccess(task.id, {
        workId: workMedia.id,
        title: copyResult.title,
        imageCount: 1 + galleryImages.length,
      });

      return {
        item: this.mapRewriteWorkRecord(workMedia.id, brandId, task.id, updatedMetadata, "SUCCESS"),
      };
    } catch (error) {
      if (!(await this.isTaskCancelled(task.id))) {
        await this.markTaskFailed(task.id, error instanceof Error ? error.message : "二创笔记生成失败");
      }
      throw error;
    }
  }

  async generateXiaohongshuVideoNote(
    brandId: string,
    payload: GenerateXiaohongshuVideoNotePayload,
    auth?: RequestAuthContext,
  ) {
    const archive = await this.brandsService.getArchive(brandId);
    const marketingPlanWorkspace = await this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
    const latestMarketingPlan = marketingPlanWorkspace.latest;
    if (!latestMarketingPlan) {
      throw new BadRequestException("请先生成小红书营销策划方案，再创作视频笔记。");
    }

    const calendarWorkspace = await this.reportsService.getXiaohongshuMarketingCalendarWorkspace(brandId);
    const selectedCalendarItem = this.findSelectedCalendarItem(calendarWorkspace.history, payload.calendarItemId);
    if (!selectedCalendarItem && !payload.customTopicName?.trim()) {
      throw new BadRequestException("请选择营销日历选题，或填写自定义选题。");
    }

    if (payload.productId && payload.referenceImage?.dataBase64) {
      throw new BadRequestException("上传参考图时不能同时选择产品，请二选一。");
    }

    const selectedProduct = payload.productId
      ? archive.products.find((item) => item.id === payload.productId)
      : undefined;
    const normalizedProduct = selectedProduct
      ? {
          id: selectedProduct.id,
          productName: selectedProduct.productName,
          detailDescription: selectedProduct.detailDescription || "",
          usageScenario: selectedProduct.usageScenario || "",
          targetAudience: selectedProduct.targetAudience || "",
          differentiators: selectedProduct.differentiators || "",
          imageUrl: selectedProduct.imageUrl || undefined,
        }
      : undefined;

    const userId = await this.resolveTaskUserId(brandId, auth);
    const topicLabel = selectedCalendarItem?.topicName || payload.customTopicName?.trim() || "自定义选题";
    const requestedVideoProvider = this.normalizeVideoProvider(payload.videoProvider);
    const requestedDurationSec = this.normalizeRequestedVideoDuration(payload.durationSec);
    const includeMarketingPlan = payload.includeMarketingPlan !== false;
    const outputVideoPrompt = payload.outputVideoPrompt !== false;
    const videoMarketingPlanMarkdown = includeMarketingPlan ? latestMarketingPlan.reportMarkdown : "";
    const task = await this.createVideoTask({
      userId,
      brandId,
      taskTitle: `生成小红书视频笔记：${topicLabel}`,
      requestedVideoProvider,
    });

    try {
      await this.markTaskRunning(task.id);
      await this.ensureTaskNotCancelled(task.id);

      const referenceImageFile = payload.referenceImage?.dataBase64
        ? this.persistUploadFile(
            brandId,
            `${task.id}-video-reference${this.resolveExtensionFromFileName(payload.referenceImage.fileName, ".png")}`,
            payload.referenceImage,
          )
        : undefined;
      await this.ensureTaskNotCancelled(task.id);

      const copyResult = await this.generateVideoCopy({
        marketingPlanMarkdown: videoMarketingPlanMarkdown,
        selectedCalendarItem,
        customTopicName: payload.customTopicName?.trim(),
        product: normalizedProduct,
        includeMarketingPlan,
        additionalInstruction: payload.copyAdditionalInstruction?.trim(),
      });
      await this.ensureTaskNotCancelled(task.id);

      const promptResult = await this.generateVideoPromptPack({
        marketingPlanMarkdown: videoMarketingPlanMarkdown,
        selectedCalendarItem,
        customTopicName: payload.customTopicName?.trim(),
        product: normalizedProduct,
        noteTitle: copyResult.title,
        noteContent: copyResult.content,
        copyBusinessScene: copyResult.businessScene,
        copyVideoType: copyResult.videoType,
        copyCommunicationGoal: copyResult.communicationGoal,
        copyStoryHook: copyResult.storyHook,
        copyMotionLanguage: copyResult.motionLanguage,
        copyShotLanguage: copyResult.shotLanguage,
        copySegmentStrategy: copyResult.segmentStrategy,
        copyAntiErrorRules: copyResult.antiErrorRules,
        requestedVideoProvider,
        requestedDurationSec,
        referenceImageUrl: referenceImageFile?.url,
        includeMarketingPlan,
        additionalInstruction: payload.videoAdditionalInstruction?.trim(),
      });
      await this.ensureTaskNotCancelled(task.id);

      const videoResult = await this.generateVideoAsset({
        brandId,
        taskId: task.id,
        title: `视频笔记视频 - ${copyResult.title}`,
        requestedVideoProvider,
        customVideoModelName: payload.customVideoModelName?.trim(),
        prompt: promptResult.fullVideoPrompt || promptResult.videoPrompt,
        negativePrompt: promptResult.negativePrompt,
        requestedDurationSec,
        referenceImageUrl: referenceImageFile?.url,
      });
      await this.ensureTaskNotCancelled(task.id);
      const segmentExecution = {
        status: "SKIPPED" as const,
        error: "已关闭自动分段生成，当前仅保留主成片生成",
        assets: [],
      };

      const now = new Date().toISOString();
      const coverImageUrl = referenceImageFile?.url || videoResult.coverImageUrl || selectedProduct?.imageUrl || undefined;
      const htmlContent = this.renderGeneratedVideoNoteHtml({
        title: copyResult.title,
        content: copyResult.content,
        hashtags: copyResult.hashtags,
        coverImageUrl,
        videoUrl: videoResult.url,
        videoPrompt: outputVideoPrompt ? promptResult.fullVideoPrompt : undefined,
        noteLabel: "原创视频笔记",
      });
      const htmlFile = this.writeGeneratedTextFile(brandId, `${task.id}-video-note.html`, htmlContent);

      const metadata: VideoWorkAssetMeta = {
        kind: "XHS_VIDEO_NOTE",
        taskId: task.id,
        noteCategory: "原创",
        noteType: "视频",
        title: copyResult.title,
        content: copyResult.content,
        htmlContent,
        hashtags: copyResult.hashtags,
        calendarItemId: selectedCalendarItem?.id,
        calendarLabel: selectedCalendarItem ? `${selectedCalendarItem.date}｜${selectedCalendarItem.topicName}` : undefined,
        customTopicName: selectedCalendarItem ? undefined : payload.customTopicName?.trim(),
        productId: selectedProduct?.id,
        productName: selectedProduct?.productName,
        referenceImageUrl: referenceImageFile?.url,
        copyAdditionalInstruction: payload.copyAdditionalInstruction?.trim() || undefined,
        videoAdditionalInstruction: payload.videoAdditionalInstruction?.trim() || undefined,
        includeMarketingPlan,
        requestedVideoProvider,
        resolvedVideoProvider: videoResult.provider,
        resolvedVideoModel: videoResult.modelName,
        requestedDurationSec,
        renderedDurationSec: videoResult.renderedDurationSec,
        outputVideoPrompt,
        videoPrompt: promptResult.videoPrompt,
        fullVideoPrompt: promptResult.fullVideoPrompt,
        videoReasoning: promptResult.videoReasoning,
        businessScene: promptResult.businessScene,
        videoType: promptResult.videoType,
        segmentBrief: promptResult.segmentBrief,
        referenceStrategy: promptResult.referenceStrategy,
        padImageStrategy: promptResult.padImageStrategy,
        continuityRules: promptResult.continuityRules,
        segmentPrompts: promptResult.segmentPrompts,
        segmentExecutionStatus: segmentExecution.status,
        segmentExecutionError: segmentExecution.error,
        segmentAssets: segmentExecution.assets,
        providerTaskId: videoResult.providerTaskId,
        videoUrl: videoResult.url,
        coverImageUrl,
        createdAt: now,
        updatedAt: now,
      };

      const workMedia = await this.createWorkHtmlMedia({
        userId,
        brandId,
        taskId: task.id,
        title: `小红书视频笔记 - ${copyResult.title}`,
        storageKey: htmlFile.storageKey,
        sourceUrl: htmlFile.url,
        metadata,
      });

      const videoMedia = await this.createWorkVideoMedia({
        userId,
        brandId,
        taskId: task.id,
        workId: workMedia.id,
        title: `视频笔记视频 - ${copyResult.title}`,
        sourceUrl: videoResult.url,
        provider: videoResult.provider,
        modelName: videoResult.modelName,
        providerTaskId: videoResult.providerTaskId,
        durationSec: videoResult.renderedDurationSec,
      });
      const segmentAssetsWithMedia = await this.createVideoSegmentMediaAssets({
        userId,
        brandId,
        taskId: task.id,
        workId: workMedia.id,
        title: copyResult.title,
        assets: segmentExecution.assets,
      });

      const updatedMetadata: VideoWorkAssetMeta = {
        ...metadata,
        videoAssetId: videoMedia.id,
        segmentAssets: segmentAssetsWithMedia,
        updatedAt: new Date().toISOString(),
      };

      await this.updateWorkHtmlMetadata(workMedia.id, brandId, updatedMetadata, workMedia.title);
      await this.ensureTaskNotCancelled(task.id);
      await this.markTaskSuccess(task.id, {
        workId: workMedia.id,
        title: copyResult.title,
        videoProvider: videoResult.provider,
        videoModelName: videoResult.modelName,
        videoDurationSec: videoResult.renderedDurationSec ?? requestedDurationSec,
      }, {
        modelName: `deepseek-v4-pro + ${videoResult.provider}/${videoResult.modelName}`,
      });

      return {
        item: this.mapVideoWorkRecord(workMedia.id, brandId, task.id, updatedMetadata, "SUCCESS"),
      };
    } catch (error) {
      if (!(await this.isTaskCancelled(task.id))) {
        await this.markTaskFailed(task.id, error instanceof Error ? error.message : "视频笔记生成失败");
      }
      throw error;
    }
  }

  async updateXiaohongshuOriginalNote(brandId: string, workId: string, payload: UpdateXiaohongshuOriginalNotePayload) {
    const target = await this.getOriginalWorkRowById(brandId, workId);
    const meta = this.readOriginalWorkMeta(this.getMediaMetadata(target));
    const nextTitle = payload.title?.trim() || meta.title;
    const nextContent = payload.content?.trim() || meta.content;
    const nextHtmlContent = this.renderGeneratedNoteHtml({
      title: nextTitle,
      content: nextContent,
      hashtags: meta.hashtags,
      coverImageUrl: meta.coverImageUrl,
      imageUrls: meta.imageUrls,
      noteLabel: "原创图文笔记",
    });
    const nextMeta: OriginalWorkAssetMeta = {
      ...meta,
      title: nextTitle,
      content: nextContent,
      htmlContent: nextHtmlContent,
      updatedAt: new Date().toISOString(),
    };
    this.writeGeneratedTextFile(brandId, this.extractFileName(target.storageKey || `${target.id}.html`), nextHtmlContent);
    await this.updateWorkHtmlMetadata(workId, brandId, nextMeta, `小红书原创笔记 - ${nextTitle}`);
    return {
      item: this.mapOriginalWorkRecord(workId, brandId, nextMeta.taskId, nextMeta, targetTaskStatus(target)),
    };
  }

  async updateXiaohongshuRewriteNote(brandId: string, workId: string, payload: UpdateXiaohongshuRewriteNotePayload) {
    const target = await this.getRewriteWorkRowById(brandId, workId);
    const meta = this.readRewriteWorkMeta(this.getMediaMetadata(target));
    const nextTitle = payload.title?.trim() || meta.title;
    const nextContent = payload.content?.trim() || meta.content;
    const nextHtmlContent = this.renderGeneratedNoteHtml({
      title: nextTitle,
      content: nextContent,
      hashtags: meta.hashtags,
      coverImageUrl: meta.coverImageUrl,
      imageUrls: meta.imageUrls,
      noteLabel: "二创图文笔记",
    });
    const nextMeta: RewriteWorkAssetMeta = {
      ...meta,
      title: nextTitle,
      content: nextContent,
      htmlContent: nextHtmlContent,
      updatedAt: new Date().toISOString(),
    };
    this.writeGeneratedTextFile(brandId, this.extractFileName(target.storageKey || `${target.id}.html`), nextHtmlContent);
    await this.updateWorkHtmlMetadata(workId, brandId, nextMeta, `小红书二创笔记 - ${nextTitle}`);
    return {
      item: this.mapRewriteWorkRecord(workId, brandId, nextMeta.taskId, nextMeta, targetTaskStatus(target)),
    };
  }

  async updateXiaohongshuVideoNote(brandId: string, workId: string, payload: UpdateXiaohongshuVideoNotePayload) {
    const target = await this.getVideoWorkRowById(brandId, workId);
    const meta = this.readVideoWorkMeta(this.getMediaMetadata(target));
    const nextTitle = payload.title?.trim() || meta.title;
    const nextContent = payload.content?.trim() || meta.content;
    const nextVideoPrompt = payload.videoPrompt?.trim() || meta.videoPrompt;
    const nextHtmlContent = this.renderGeneratedVideoNoteHtml({
      title: nextTitle,
      content: nextContent,
      hashtags: meta.hashtags,
      coverImageUrl: meta.coverImageUrl,
      videoUrl: meta.videoUrl,
      videoPrompt: meta.outputVideoPrompt ? nextVideoPrompt : undefined,
      noteLabel: "原创视频笔记",
    });
    const nextMeta: VideoWorkAssetMeta = {
      ...meta,
      title: nextTitle,
      content: nextContent,
      htmlContent: nextHtmlContent,
      videoPrompt: nextVideoPrompt,
      fullVideoPrompt: nextVideoPrompt || meta.fullVideoPrompt,
      updatedAt: new Date().toISOString(),
    };
    this.writeGeneratedTextFile(brandId, this.extractFileName(target.storageKey || `${target.id}.html`), nextHtmlContent);
    await this.updateWorkHtmlMetadata(workId, brandId, nextMeta, `小红书视频笔记 - ${nextTitle}`);
    return {
      item: this.mapVideoWorkRecord(workId, brandId, nextMeta.taskId, nextMeta, targetTaskStatus(target)),
    };
  }

  async deleteXiaohongshuOriginalNote(brandId: string, workId: string) {
    const target = await this.getOriginalWorkRowById(brandId, workId);
    const meta = this.readOriginalWorkMeta(this.getMediaMetadata(target));
    const taskId = meta.taskId || target.taskId || undefined;

    if (await this.prismaService.canUseDatabase()) {
      const relatedRows = await this.prismaService.mediaAsset.findMany({
        where: {
          OR: [
            { id: workId },
            ...(taskId ? [{ taskId }] : []),
          ],
        },
      });
      if (relatedRows.length) {
        await this.prismaService.mediaAsset.deleteMany({
          where: {
            id: { in: relatedRows.map((item) => item.id) },
          },
        });
      }
      if (taskId) {
        await this.prismaService.task.deleteMany({
          where: { id: taskId },
        });
      }
    } else {
      database.media = database.media.filter((item) => item.id !== workId && item.taskId !== taskId);
      if (taskId) {
        database.tasks = database.tasks.filter((item) => item.id !== taskId);
      }
    }

    this.deleteGeneratedFileIfExists(brandId, this.extractFileName(target.storageKey || ""));
    return { success: true };
  }

  async deleteXiaohongshuRewriteNote(brandId: string, workId: string) {
    const target = await this.getRewriteWorkRowById(brandId, workId);
    const meta = this.readRewriteWorkMeta(this.getMediaMetadata(target));
    const taskId = meta.taskId || target.taskId || undefined;

    if (await this.prismaService.canUseDatabase()) {
      const relatedRows = await this.prismaService.mediaAsset.findMany({
        where: {
          OR: [{ id: workId }, ...(taskId ? [{ taskId }] : [])],
        },
      });
      if (relatedRows.length) {
        await this.prismaService.mediaAsset.deleteMany({
          where: {
            id: { in: relatedRows.map((item) => item.id) },
          },
        });
      }
      if (taskId) {
        await this.prismaService.task.deleteMany({
          where: { id: taskId },
        });
      }
    } else {
      database.media = database.media.filter((item) => item.id !== workId && item.taskId !== taskId);
      if (taskId) {
        database.tasks = database.tasks.filter((item) => item.id !== taskId);
      }
    }

    this.deleteGeneratedFileIfExists(brandId, this.extractFileName(target.storageKey || ""));
    return { success: true };
  }

  async deleteXiaohongshuVideoNote(brandId: string, workId: string) {
    const target = await this.getVideoWorkRowById(brandId, workId);
    const meta = this.readVideoWorkMeta(this.getMediaMetadata(target));
    const taskId = meta.taskId || target.taskId || undefined;

    if (await this.prismaService.canUseDatabase()) {
      const relatedRows = await this.prismaService.mediaAsset.findMany({
        where: {
          OR: [{ id: workId }, ...(taskId ? [{ taskId }] : [])],
        },
      });
      if (relatedRows.length) {
        await this.prismaService.mediaAsset.deleteMany({
          where: {
            id: { in: relatedRows.map((item) => item.id) },
          },
        });
      }
      if (taskId) {
        await this.prismaService.task.deleteMany({
          where: { id: taskId },
        });
      }
    } else {
      database.media = database.media.filter((item) => item.id !== workId && item.taskId !== taskId);
      if (taskId) {
        database.tasks = database.tasks.filter((item) => item.id !== taskId);
      }
    }

    this.deleteGeneratedFileIfExists(brandId, this.extractFileName(target.storageKey || ""));
    const localVideoFileName = meta.videoUrl ? this.extractLocalAssetFileName(meta.videoUrl, brandId) : "";
    const localReferenceFileName = meta.referenceImageUrl ? this.extractLocalAssetFileName(meta.referenceImageUrl, brandId) : "";
    this.deleteGeneratedFileIfExists(brandId, localVideoFileName);
    this.deleteGeneratedFileIfExists(brandId, localReferenceFileName);
    return { success: true };
  }

  getGeneratedAsset(brandId: string, fileName: string) {
    const filePath = join(this.getGeneratedAssetDir(brandId), fileName);
    if (!existsSync(filePath)) {
      throw new NotFoundException("作品文件不存在");
    }
    return {
      buffer: readFileSync(filePath),
      contentType: this.getContentTypeByExtension(fileName),
    };
  }

  private async analyzeReferenceImages(
    files: Array<{ label: string; payload: UploadFilePayload }>,
    marketingPlanMarkdown: string,
  ) {
    const provider = this.loadDoubaoImageAnalysisProvider();
    const prompt = this.loadImageAnalysisPrompt();
    const result: string[] = [];

    for (const file of files) {
      let lastError = "";
      for (const apiKey of provider.apiKeys) {
        try {
          const response = await this.requestModelCompletion(
            provider.baseUrls[0],
            provider.completionPath,
            apiKey,
            {
              model: provider.models[0],
              stream: false,
              temperature: 0.2,
              max_tokens: 1400,
              messages: [
                {
                  role: "system",
                  content: [
                    prompt,
                    "",
                    "请直接输出一段“画面风格档案”描述，不要输出代码块，不要重复提示词标题。",
                  ].join("\n"),
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: `图片角色：${file.label}\n营销策划方案摘要：${marketingPlanMarkdown.slice(0, 1200)}` },
                    { type: "image_url", image_url: { url: this.toDataUrl(file.payload) } },
                  ],
                },
              ],
            },
            120000,
          );
          if (!response.ok) {
            lastError = `图片分析请求失败：${response.status}`;
            continue;
          }
          const payload = await response.json() as {
            choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
          };
          const content = this.extractResponseText(payload);
          if (!content) {
            lastError = "图片分析结果为空";
            continue;
          }
          result.push(`${file.label}画面风格档案：${content}`);
          lastError = "";
          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "图片分析失败";
        }
      }

      if (lastError) {
        throw new ServiceUnavailableException(`参考图风格分析失败：${file.label}，${lastError}`);
      }
    }

    return {
      coverReferenceStyle: result[0],
      galleryReferenceStyles: result.slice(1),
      modelName: provider.models[0],
    };
  }

  private async generateOriginalCopy(params: {
    marketingPlanMarkdown: string;
    selectedCalendarItem?: {
      id: string;
      date: string;
      topicName: string;
      topicContent?: string;
      titleDirections: string[];
      contentGoal?: string;
      targetAudience?: string;
      expressionFocus?: string;
    };
    customTopicName?: string;
    product?: {
      id: string;
      productName: string;
      detailDescription: string;
      usageScenario: string;
      targetAudience: string;
      differentiators: string;
      imageUrl?: string;
    };
    additionalInstruction?: string;
  }): Promise<OriginalCopyModelResult> {
    const skillPrompt = await this.loadOriginalCopyPrompt();
    const providers = this.loadOriginalCopyProviders();
    const inputPayload = {
      marketingPlanMarkdown: params.marketingPlanMarkdown,
      topic_context: params.selectedCalendarItem
        ? {
            date: params.selectedCalendarItem.date,
            topicName: params.selectedCalendarItem.topicName,
            topicContent: params.selectedCalendarItem.topicContent,
            titleDirections: params.selectedCalendarItem.titleDirections,
            contentGoal: params.selectedCalendarItem.contentGoal,
            targetAudience: params.selectedCalendarItem.targetAudience,
            expressionFocus: params.selectedCalendarItem.expressionFocus,
          }
        : null,
      customTopicName: params.customTopicName,
      product: params.product
        ? {
            productName: params.product.productName,
            detailDescription: params.product.detailDescription,
            usageScenario: params.product.usageScenario,
            targetAudience: params.product.targetAudience,
            differentiators: params.product.differentiators,
          }
        : null,
      additional_instruction: params.additionalInstruction,
    };

    const systemPrompt = [
      skillPrompt,
      "",
      "你当前要输出一篇可直接发布的小红书原创图文笔记。",
      "请仅输出 JSON 对象，不要输出 Markdown 代码块或额外解释。",
      "JSON 结构固定为：",
      "{",
      '  "title": "20字以内标题",',
      '  "content": "300字以内正文，分段，末尾带#标签",',
      '  "hashtags": ["标签1", "标签2"]',
      "}",
    ].join("\n");
    const userPrompt = ["以下是本次原创笔记创作输入：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                provider.requestTimeoutMs ?? 180000,
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const title = String(parsed.title ?? "").trim();
              const body = String(parsed.content ?? "").trim();
              const hashtags = this.normalizeStringArray(parsed.hashtags, [], 8);
              if (!title || !body) {
                lastError = `${provider.provider}/${modelName} 返回字段不完整`;
                continue;
              }
              return {
                title,
                content: body,
                hashtags: hashtags.length ? hashtags : this.extractHashtagsFromContent(body),
                modelName,
              };
            } catch (error) {
              lastError = error instanceof Error ? error.message : "文案生成失败";
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(`原创笔记文案生成失败：${lastError || "未获取到有效响应"}`);
  }

  private async generateOriginalImagePrompts(params: {
    marketingPlanMarkdown: string;
    selectedCalendarItem?: {
      id: string;
      date: string;
      topicName: string;
      topicContent?: string;
      titleDirections: string[];
      contentGoal?: string;
      targetAudience?: string;
      expressionFocus?: string;
    };
    customTopicName?: string;
    product?: {
      productName: string;
      detailDescription: string;
      usageScenario: string;
      targetAudience: string;
      differentiators: string;
      imageUrl?: string;
    };
    additionalInstruction?: string;
    imageCount?: number;
    noteTitle: string;
    noteContent: string;
    referenceStyles: {
      coverReferenceStyle?: string;
      galleryReferenceStyles?: string[];
    };
  }): Promise<OriginalImagePromptResult> {
    const skillPrompt = await this.loadOriginalImagePrompt();
    const providers = this.loadOriginalImagePromptProviders();
    const inputPayload = {
      marketingPlanMarkdown: params.marketingPlanMarkdown,
      topic_context: params.selectedCalendarItem
        ? {
            date: params.selectedCalendarItem.date,
            topicName: params.selectedCalendarItem.topicName,
            topicContent: params.selectedCalendarItem.topicContent,
            titleDirections: params.selectedCalendarItem.titleDirections,
            contentGoal: params.selectedCalendarItem.contentGoal,
            targetAudience: params.selectedCalendarItem.targetAudience,
            expressionFocus: params.selectedCalendarItem.expressionFocus,
          }
        : null,
      customTopicName: params.customTopicName,
      product: params.product
        ? {
            productName: params.product.productName,
            detailDescription: params.product.detailDescription,
            usageScenario: params.product.usageScenario,
            targetAudience: params.product.targetAudience,
            differentiators: params.product.differentiators,
          }
        : null,
      noteTitle: params.noteTitle,
      noteContent: params.noteContent,
      imageCount: params.imageCount,
      coverReferenceStyle: params.referenceStyles.coverReferenceStyle,
      galleryReferenceStyles: params.referenceStyles.galleryReferenceStyles || [],
      additional_instruction: params.additionalInstruction,
    };
    const systemPrompt = [
      skillPrompt,
      "",
      "你当前需要输出小红书原创图文的封面与配图提示词。",
      params.imageCount
        ? `请严格生成 ${params.imageCount} 张图的提示词，其中第一张为封面，其余 ${Math.max(params.imageCount - 1, 0)} 张为配图。`
        : "图片张数可自由发挥，但至少返回 1 条封面提示词和 2 条配图提示词。",
      "除封面与配图提示词外，你还必须先提取每张图要排版到画面上的中文标题和小标签。",
      "请仅输出 JSON 对象，不要输出 Markdown 代码块或额外解释。",
      "{",
      '  "cover_text": { "title": "封面主标题", "badges": ["封面小标签1", "封面小标签2"] },',
      '  "image_texts": [',
      '    { "title": "第2张配图标题", "badges": ["第2张小标签1"] },',
      '    { "title": "第3张配图标题", "badges": ["第3张小标签1"] }',
      "  ],",
      '  "cover_prompt": "封面提示词",',
      '  "image_prompts": ["配图提示词1", "配图提示词2"]',
      "}",
    ].join("\n");
    const userPrompt = ["以下是本次原创笔记配图输入：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                provider.requestTimeoutMs ?? 180000,
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const textPlan = this.normalizeImageTextPlan({
                coverTextRaw: parsed.cover_text ?? parsed.coverText,
                imageTextsRaw: parsed.image_texts ?? parsed.imageTexts,
                noteTitle: params.noteTitle,
                noteContent: params.noteContent,
                imageCount: params.imageCount,
              });
              const coverPrompt = String(parsed.cover_prompt ?? parsed.coverPrompt ?? "").trim();
              const imagePrompts = this.normalizeStringArray(parsed.image_prompts ?? parsed.imagePrompts, [], 10);
              if (!coverPrompt) {
                lastError = `${provider.provider}/${modelName} 封面提示词为空`;
                continue;
              }
              const normalizedImagePrompts = params.imageCount
                ? this.normalizeFixedImagePromptCount(imagePrompts, coverPrompt, params.imageCount)
                : (imagePrompts.length ? imagePrompts : this.normalizeFixedImagePromptCount([], coverPrompt, 3));
              return {
                coverText: textPlan.coverText,
                imageTexts: this.normalizeImageTextEntries(textPlan.imageTexts, textPlan.imageTexts, normalizedImagePrompts.length),
                coverPrompt,
                imagePrompts: normalizedImagePrompts,
                modelName,
              };
            } catch (error) {
              lastError = error instanceof Error ? error.message : "配图提示词生成失败";
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(`原创笔记配图提示词生成失败：${lastError || "未获取到有效响应"}`);
  }

  private async generateImageAsset(params: {
    brandId: string;
    taskId: string;
    title: string;
    role: "COVER" | "GALLERY";
    order: number;
    prompt: string;
    textPlan?: ImageTextPlanEntry;
    referenceImageUrls: string[];
  }) {
    const providers = this.loadImageGenerationProviders();
    let lastError = "";
    const promptsToTry = this.buildImagePromptCandidates(
      this.buildImagePromptWithTextPlan(params.prompt, params.textPlan, params.role, params.order),
    );

    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            for (const promptCandidate of promptsToTry) {
              try {
                const response = await this.requestModelCompletion(
                  baseUrl,
                  provider.completionPath,
                  apiKey,
                  this.buildImageGenerationPayload(modelName, promptCandidate, params.referenceImageUrls),
                  provider.requestTimeoutMs ?? 180000,
                );
                if (!response.ok) {
                  const responseSnippet = await this.readResponseSnippet(response);
                  lastError = `${modelName} 请求失败：${response.status}${responseSnippet ? `，${responseSnippet}` : ""}`;
                  continue;
                }
                const payload = await response.json() as Record<string, unknown>;
                const asset = this.extractGeneratedImagePayload(payload);
                if (!asset) {
                  lastError = `${modelName} 未返回图片`;
                  continue;
                }

                const fileName = `${params.taskId}-${params.role.toLowerCase()}-${params.order + 1}${asset.extension}`;
                const base64Content = asset.base64
                  ? (await this.normalizeGeneratedImageBuffer(
                    Buffer.from(asset.base64, "base64"),
                    asset.contentType,
                    fileName,
                  )).toString("base64")
                  : undefined;
                const finalUrl = asset.url
                  ? await this.cacheRemoteGeneratedImage(params.brandId, fileName, asset.url, asset.contentType)
                  : (base64Content
                    ? this.writeGeneratedBinaryFile(params.brandId, fileName, base64Content, asset.contentType).url
                    : "");
                if (!finalUrl) {
                  lastError = `${modelName} 未返回可保存的图片内容`;
                  continue;
                }
                return {
                  url: finalUrl,
                  modelName,
                  prompt: promptCandidate,
                };
              } catch (error) {
                lastError = error instanceof Error ? error.message : "图片生成失败";
              }
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(`原创笔记图片生成失败：${lastError || "未获取到有效图片"}`);
  }

  private async cacheRemoteGeneratedImage(brandId: string, fileName: string, remoteUrl: string, fallbackContentType: string) {
    return this.cacheRemoteGeneratedFile({
      brandId,
      fileName,
      remoteUrl,
      fallbackContentType: fallbackContentType || "image/png",
      resolveExtension: (contentType, nextFileName) => this.resolveImageExtensionFromMimeType(contentType, nextFileName),
      requestLabel: `下载远程生成图片 ${remoteUrl}`,
      normalizeImageAspectRatio: true,
    });
  }

  private async createOriginalTask(params: { userId: string; brandId: string; taskTitle: string }) {
    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.task.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskType: "XHS_ORIGINAL_NOTE",
          taskTitle: params.taskTitle,
          taskStatus: TaskStatus.QUEUED,
          modelName: "deepseek-v4-pro",
          pointsCost: 260,
        },
      });
    }

    const now = new Date().toISOString();
    const task = {
      id: createId("tsk"),
      userId: params.userId,
      brandId: params.brandId,
      taskType: "XHS_ORIGINAL_NOTE",
      taskTitle: params.taskTitle,
      taskStatus: "QUEUED" as const,
      modelName: "deepseek-v4-pro",
      pointsCost: 260,
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return task;
  }

  private async createRewriteTask(params: { userId: string; brandId: string; taskTitle: string }) {
    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.task.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskType: "XHS_REWRITE_NOTE",
          taskTitle: params.taskTitle,
          taskStatus: TaskStatus.QUEUED,
          modelName: "deepseek-v4-pro",
          pointsCost: 220,
        },
      });
    }

    const now = new Date().toISOString();
    const task = {
      id: createId("tsk"),
      userId: params.userId,
      brandId: params.brandId,
      taskType: "XHS_REWRITE_NOTE",
      taskTitle: params.taskTitle,
      taskStatus: "QUEUED" as const,
      modelName: "deepseek-v4-pro",
      pointsCost: 220,
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return task;
  }

  private async createVideoTask(params: {
    userId: string;
    brandId: string;
    taskTitle: string;
    requestedVideoProvider: string;
  }) {
    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.task.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskType: "XHS_VIDEO_NOTE",
          taskTitle: params.taskTitle,
          taskStatus: TaskStatus.QUEUED,
          modelName: `deepseek-v4-pro + ${params.requestedVideoProvider}`,
          pointsCost: 360,
        },
      });
    }

    const now = new Date().toISOString();
    const task = {
      id: createId("tsk"),
      userId: params.userId,
      brandId: params.brandId,
      taskType: "XHS_VIDEO_NOTE",
      taskTitle: params.taskTitle,
      taskStatus: "QUEUED" as const,
      modelName: `deepseek-v4-pro + ${params.requestedVideoProvider}`,
      pointsCost: 360,
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return task;
  }

  private async markTaskRunning(taskId: string) {
    if (await this.isTaskCancelled(taskId)) {
      return;
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: TaskStatus.RUNNING,
          startedAt: new Date(),
          errorMessage: null,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId);
    if (task) {
      task.taskStatus = "RUNNING";
      task.startedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();
    }
  }

  private async markTaskSuccess(
    taskId: string,
    outputJson: Record<string, unknown>,
    options?: { modelName?: string },
  ) {
    if (await this.isTaskCancelled(taskId)) {
      return;
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: TaskStatus.SUCCESS,
          finishedAt: new Date(),
          outputJson: outputJson as Prisma.InputJsonValue,
          ...(options?.modelName ? { modelName: options.modelName } : {}),
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId);
    if (task) {
      task.taskStatus = "SUCCESS";
      task.finishedAt = new Date().toISOString();
      task.outputJson = outputJson;
      if (options?.modelName) {
        task.modelName = options.modelName;
      }
      task.updatedAt = new Date().toISOString();
    }
  }

  private async markTaskFailed(taskId: string, errorMessage: string) {
    if (await this.isTaskCancelled(taskId)) {
      return;
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: TaskStatus.FAILED,
          finishedAt: new Date(),
          errorMessage,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId);
    if (task) {
      task.taskStatus = "FAILED";
      task.errorMessage = errorMessage;
      task.finishedAt = new Date().toISOString();
      task.updatedAt = new Date().toISOString();
    }
  }

  private async createWorkHtmlMedia(params: {
    userId: string;
    brandId: string;
    taskId: string;
    title: string;
    storageKey: string;
    sourceUrl: string;
    metadata: OriginalWorkAssetMeta | RewriteWorkAssetMeta | VideoWorkAssetMeta;
  }) {
    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.mediaAsset.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskId: params.taskId,
          title: params.title,
          mediaType: MediaType.HTML,
          storageKey: params.storageKey,
          sourceUrl: params.sourceUrl,
          mimeType: "text/html",
          metadataJson: params.metadata as Prisma.InputJsonValue,
        },
      });
    }

    const record = {
      id: createId("med"),
      userId: params.userId,
      brandId: params.brandId,
      taskId: params.taskId,
      title: params.title,
      mediaType: "HTML" as const,
      storageKey: params.storageKey,
      sourceUrl: params.sourceUrl,
      mimeType: "text/html",
      metadataJson: params.metadata,
      createdAt: params.metadata.createdAt,
      updatedAt: params.metadata.updatedAt,
    };
    database.media.unshift(record);
    return record;
  }

  private async createWorkImageMedia(params: {
    kind: OriginalImageAssetMeta["kind"] | RewriteImageAssetMeta["kind"];
    userId: string;
    brandId: string;
    taskId: string;
    workId: string;
    title: string;
    sourceUrl: string;
    role: "COVER" | "GALLERY";
    order: number;
    prompt: string;
  }) {
    const metadata: OriginalImageAssetMeta | RewriteImageAssetMeta = {
      kind: params.kind,
      workId: params.workId,
      taskId: params.taskId,
      role: params.role,
      order: params.order,
      prompt: params.prompt,
      createdAt: new Date().toISOString(),
    };

    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.mediaAsset.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskId: params.taskId,
          title: params.title,
          mediaType: MediaType.IMAGE,
          sourceUrl: params.sourceUrl,
          storageKey: this.toStorageKeyFromUrl(params.sourceUrl),
          mimeType: "image/png",
          metadataJson: metadata as Prisma.InputJsonValue,
        },
      });
    }

    const record = {
      id: createId("med"),
      userId: params.userId,
      brandId: params.brandId,
      taskId: params.taskId,
      title: params.title,
      mediaType: "IMAGE" as const,
      sourceUrl: params.sourceUrl,
      storageKey: this.toStorageKeyFromUrl(params.sourceUrl),
      mimeType: "image/png",
      metadataJson: metadata,
      createdAt: metadata.createdAt,
      updatedAt: metadata.createdAt,
    };
    database.media.unshift(record);
    return record;
  }

  private async createWorkVideoMedia(params: {
    userId: string;
    brandId: string;
    taskId: string;
    workId: string;
    title: string;
    sourceUrl: string;
    provider: string;
    modelName?: string;
    providerTaskId?: string;
    durationSec?: number;
  }) {
    const metadata: VideoAssetMeta = {
      kind: "XHS_VIDEO_NOTE_VIDEO",
      workId: params.workId,
      taskId: params.taskId,
      providerTaskId: params.providerTaskId,
      provider: params.provider,
      modelName: params.modelName,
      durationSec: params.durationSec,
      createdAt: new Date().toISOString(),
    };

    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.mediaAsset.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskId: params.taskId,
          title: params.title,
          mediaType: MediaType.VIDEO,
          sourceUrl: params.sourceUrl,
          storageKey: this.toStorageKeyFromUrl(params.sourceUrl),
          mimeType: "video/mp4",
          durationSec: params.durationSec,
          metadataJson: metadata as Prisma.InputJsonValue,
        },
      });
    }

    const record = {
      id: createId("med"),
      userId: params.userId,
      brandId: params.brandId,
      taskId: params.taskId,
      title: params.title,
      mediaType: "VIDEO" as const,
      sourceUrl: params.sourceUrl,
      storageKey: this.toStorageKeyFromUrl(params.sourceUrl),
      mimeType: "video/mp4",
      durationSec: params.durationSec,
      metadataJson: metadata,
      createdAt: metadata.createdAt,
      updatedAt: metadata.createdAt,
    };
    database.media.unshift(record);
    return record;
  }

  private buildVideoSegmentDurations(totalDurationSec: number, segmentCount: number) {
    const safeCount = Math.max(1, Math.min(segmentCount, 3));
    const safeTotal = Math.max(6, Math.min(totalDurationSec || 10, 15));
    const base = Math.floor(safeTotal / safeCount);
    const remainder = safeTotal % safeCount;
    return Array.from({ length: safeCount }, (_, index) => {
      const duration = base + (index < remainder ? 1 : 0);
      return Math.max(4, Math.min(duration, 6));
    });
  }

  private async generateVideoSegmentAssets(params: {
    brandId: string;
    taskId: string;
    title: string;
    requestedVideoProvider: string;
    customVideoModelName?: string;
    requestedDurationSec: number;
    referenceImageUrl?: string;
    negativePrompt?: string;
    segmentPrompts: string[];
  }): Promise<{
    status: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
    error?: string;
    assets: VideoSegmentAssetEntry[];
  }> {
    const prompts = params.segmentPrompts.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3);
    if (prompts.length < 2) {
      return {
        status: "SKIPPED",
        error: prompts.length ? "分段提示词少于 2 段，跳过逐段生成" : "未返回可执行的分段提示词",
        assets: [],
      };
    }

    const durations = this.buildVideoSegmentDurations(params.requestedDurationSec, prompts.length);
    const assets: VideoSegmentAssetEntry[] = [];
    let carryReferenceImageUrl = params.referenceImageUrl;
    let lastError = "";

    for (let index = 0; index < prompts.length; index += 1) {
      const prompt = prompts[index];
      try {
        const result = await this.generateVideoAsset({
          brandId: params.brandId,
          taskId: `${params.taskId}-segment-${index + 1}`,
          title: `视频片段 ${index + 1} - ${params.title}`,
          requestedVideoProvider: params.requestedVideoProvider,
          customVideoModelName: params.customVideoModelName,
          prompt,
          negativePrompt: params.negativePrompt,
          requestedDurationSec: durations[index] || 5,
          referenceImageUrl: carryReferenceImageUrl,
        });
        assets.push({
          order: index,
          prompt,
          videoUrl: result.url,
          coverImageUrl: result.coverImageUrl,
          provider: result.provider,
          modelName: result.modelName,
          providerTaskId: result.providerTaskId,
          renderedDurationSec: result.renderedDurationSec,
          referenceImageUrl: carryReferenceImageUrl,
        });
        if (result.coverImageUrl) {
          carryReferenceImageUrl = result.coverImageUrl;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : `视频片段 ${index + 1} 生成失败`;
        break;
      }
    }

    if (assets.length === prompts.length) {
      return { status: "SUCCESS", assets };
    }
    if (assets.length > 0) {
      return { status: "PARTIAL", error: lastError || "仅部分视频片段生成成功", assets };
    }
    return { status: "FAILED", error: lastError || "视频分段生成失败", assets };
  }

  private async createVideoSegmentMediaAssets(params: {
    userId: string;
    brandId: string;
    taskId: string;
    workId: string;
    title: string;
    assets: VideoSegmentAssetEntry[];
  }) {
    const result: VideoSegmentAssetEntry[] = [];
    for (const asset of params.assets) {
      const media = await this.createWorkVideoMedia({
        userId: params.userId,
        brandId: params.brandId,
        taskId: params.taskId,
        workId: params.workId,
        title: `视频片段 ${asset.order + 1} - ${params.title}`,
        sourceUrl: asset.videoUrl,
        provider: asset.provider,
        modelName: asset.modelName,
        providerTaskId: asset.providerTaskId,
        durationSec: asset.renderedDurationSec,
      });
      result.push({
        ...asset,
        videoAssetId: media.id,
      });
    }
    return result;
  }

  private async updateWorkHtmlMetadata(
    workId: string,
    brandId: string,
    metadata: OriginalWorkAssetMeta | RewriteWorkAssetMeta | VideoWorkAssetMeta,
    title: string,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.mediaAsset.update({
        where: { id: workId },
        data: {
          title,
          metadataJson: metadata as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const target = database.media.find((item) => item.id === workId && item.brandId === brandId);
    if (target) {
      target.title = title;
      (target as { metadataJson?: unknown }).metadataJson = metadata;
      target.updatedAt = new Date().toISOString();
    }
  }

  private async getBrandOwnerUserId(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { ownerUserId: true },
      });
      if (!brand) {
        throw new NotFoundException("品牌不存在");
      }
      return brand.ownerUserId;
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
    return brand.ownerUserId;
  }

  private async resolveTaskUserId(brandId: string, auth?: RequestAuthContext) {
    if (auth?.userId) {
      return auth.userId;
    }

    return this.getBrandOwnerUserId(brandId);
  }

  private async ensureTaskNotCancelled(taskId: string) {
    if (await this.isTaskCancelled(taskId)) {
      throw new BadRequestException("任务已取消，已停止继续执行。");
    }
  }

  private async isTaskCancelled(taskId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const task = await this.prismaService.task.findUnique({
        where: { id: taskId },
        select: { taskStatus: true },
      });
      return task?.taskStatus === TaskStatus.CANCELLED;
    }

    return database.tasks.find((item) => item.id === taskId)?.taskStatus === "CANCELLED";
  }

  private findSelectedCalendarItem(history: XiaohongshuMarketingCalendarRecord[], calendarItemId?: string) {
    if (!calendarItemId) {
      return undefined;
    }
    for (const record of history) {
      const matched = record.items.find((item) => item.id === calendarItemId);
      if (matched) {
        return matched;
      }
    }
    return undefined;
  }

  private normalizeReferenceFiles(payload: GenerateXiaohongshuOriginalNotePayload) {
    const files: Array<{ label: string; payload: UploadFilePayload }> = [];
    if (payload.coverReferenceImage?.dataBase64) {
      files.push({ label: "封面参考图", payload: payload.coverReferenceImage });
    }
    (payload.galleryReferenceImages || []).forEach((item, index) => {
      if (item?.dataBase64) {
        files.push({ label: `配图参考图${index + 1}`, payload: item });
      }
    });
    return files;
  }

  private collectImageReferenceUrls(product?: { imageUrl?: string }) {
    return product?.imageUrl ? [product.imageUrl] : [];
  }

  private collectRewriteReferenceImageUrls(sourceMaterialImageUrls: string[], product?: { imageUrl?: string }) {
    return Array.from(
      new Set(
        [...sourceMaterialImageUrls, ...this.collectImageReferenceUrls(product)]
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    ).slice(0, 6);
  }

  private buildRewritePromptSourceMaterial(
    sourceMaterial: {
      id: string;
      title: string;
      description?: string;
      noteUrl?: string;
      sourceUrl?: string;
      imageList?: string[];
      nickname?: string;
      noteType?: string;
      likeCount?: number;
      collectCount?: number;
      commentCount?: number;
      shareCount?: number;
    },
    allowProductEmbedding: boolean,
  ) {
    if (allowProductEmbedding) {
      return sourceMaterial;
    }
    return {
      ...sourceMaterial,
      description: this.sanitizeRewriteTextForNoProduct(sourceMaterial.description),
    };
  }

  private buildRewriteTopicContext(
    sourceMaterial: { title: string; description?: string },
    allowProductEmbedding: boolean,
  ) {
    const topicContent = allowProductEmbedding
      ? String(sourceMaterial.description || "").trim()
      : this.sanitizeRewriteTextForNoProduct(sourceMaterial.description);
    return {
      topicName: sourceMaterial.title,
      topicContent: topicContent || sourceMaterial.title,
      contentGoal: allowProductEmbedding
        ? "围绕对标素材主事件做二创，并只在必要时自然融合已选产品。"
        : "围绕对标素材主事件、人物情绪和城市氛围做二创，不植入任何具体产品。",
      expressionFocus: allowProductEmbedding
        ? "优先保留原素材的事件主线、情绪张力和场景体验，产品不能压过主事件。"
        : "优先突出原素材的事件主线、人物状态、城市氛围和情绪变化，背景品牌露出不能抬升为主卖点。",
    };
  }

  private buildRewriteMarketingPlanContext(markdown: string, allowProductEmbedding: boolean) {
    if (allowProductEmbedding) {
      return markdown;
    }
    const blockedPattern = /(牛角包|提拉米苏|蛋糕|面包|奶油|门店|核销|价格|优惠|下单|购买|早餐|下午茶|礼赠|自提|团购|爆浆|现烤|产品|sku|SKU)/;
    const filteredLines = String(markdown || "")
      .split(/\r?\n/)
      .map((item) => item.trimEnd())
      .filter((item) => item.trim() && !blockedPattern.test(item))
      .slice(0, 120);
    return [
      "本次二创未选择产品，营销策划内容仅允许参考品牌调性、城市事件联动、人群洞察、内容结构和情绪表达。",
      "严禁引用策划方案里的具体产品、价格、门店核销、购买路径、福利促销和商品卖点。",
      ...filteredLines,
    ].join("\n");
  }

  private sanitizeRewriteTextForNoProduct(value?: string) {
    const blockedPattern = /(牛角包|提拉米苏|蛋糕|面包|奶油|门店|价格|优惠|兑换券|下单|购买|现烤|爆浆|产品|SKU|sku)/;
    const filteredLines = String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item && !blockedPattern.test(item));
    return filteredLines.join("\n").trim();
  }

  private renderGeneratedNoteHtml(params: {
    title: string;
    content: string;
    hashtags: string[];
    coverImageUrl?: string;
    imageUrls: string[];
    noteLabel: string;
  }) {
    const paragraphs = params.content
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `<p style="margin:0 0 14px;color:#24314a;font-size:16px;line-height:1.9;">${this.escapeHtml(item)}</p>`)
      .join("");
    const gallery = params.imageUrls.length
      ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:24px;">${params.imageUrls.map((item) => `<img src="${this.escapeHtml(item)}" alt="" style="width:100%;aspect-ratio:0.82;object-fit:cover;border-radius:20px;border:1px solid #e8edf7;background:#fff;" />`).join("")}</div>`
      : "";
    const tags = params.hashtags.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;">${params.hashtags.map((item) => `<span style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:#f3f5ff;color:#5166ff;font-size:13px;font-weight:700;">#${this.escapeHtml(item.replace(/^#/, ""))}</span>`).join("")}</div>`
      : "";
    const cover = params.coverImageUrl
      ? `<img src="${this.escapeHtml(params.coverImageUrl)}" alt="" style="width:100%;aspect-ratio:0.82;object-fit:cover;border-radius:28px;border:1px solid #dfe5f2;background:#fff;box-shadow:0 18px 40px rgba(37,51,90,0.12);" />`
      : "";

    return [
      '<!DOCTYPE html>',
      '<html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>',
      this.escapeHtml(params.title),
      '</title></head><body style="margin:0;background:linear-gradient(180deg,#f7f8fc 0%,#eef2ff 100%);font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;">',
      '<main style="max-width:880px;margin:0 auto;padding:28px 16px 48px;">',
      '<section style="padding:22px;border-radius:30px;background:rgba(255,255,255,0.9);border:1px solid rgba(226,232,250,0.9);box-shadow:0 20px 56px rgba(52,68,118,0.12);">',
      cover,
      `<h1 style="margin:20px 0 14px;font-size:32px;line-height:1.25;color:#17233f;">${this.escapeHtml(params.title)}</h1>`,
      `<div style="color:#63708a;font-size:13px;margin-bottom:18px;">${this.escapeHtml(params.noteLabel)}</div>`,
      paragraphs,
      tags,
      gallery,
      "</section></main></body></html>",
    ].join("");
  }

  private renderGeneratedVideoNoteHtml(params: {
    title: string;
    content: string;
    hashtags: string[];
    coverImageUrl?: string;
    videoUrl?: string;
    videoPrompt?: string;
    noteLabel: string;
  }) {
    const paragraphs = params.content
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `<p style="margin:0 0 14px;color:#24314a;font-size:16px;line-height:1.9;">${this.escapeHtml(item)}</p>`)
      .join("");
    const tags = params.hashtags.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;">${params.hashtags.map((item) => `<span style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:#f3f5ff;color:#5166ff;font-size:13px;font-weight:700;">#${this.escapeHtml(item.replace(/^#/, ""))}</span>`).join("")}</div>`
      : "";
    const cover = params.coverImageUrl
      ? `<img src="${this.escapeHtml(params.coverImageUrl)}" alt="" style="width:100%;aspect-ratio:0.82;object-fit:cover;border-radius:28px;border:1px solid #dfe5f2;background:#fff;box-shadow:0 18px 40px rgba(37,51,90,0.12);" />`
      : "";
    const video = params.videoUrl
      ? `<video controls preload="metadata" src="${this.escapeHtml(params.videoUrl)}" style="width:100%;margin-top:20px;border-radius:24px;background:#0f1525;box-shadow:0 18px 40px rgba(24,36,68,0.16);"></video>`
      : "";
    const videoPrompt = params.videoPrompt
      ? [
          '<section style="margin-top:24px;padding:18px 20px;border-radius:24px;background:#111827;color:#e5eefc;">',
          '<div style="font-size:13px;letter-spacing:0.04em;color:#8ea3d6;text-transform:uppercase;">视频生成提示词</div>',
          `<pre style="margin:12px 0 0;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.8;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${this.escapeHtml(params.videoPrompt)}</pre>`,
          "</section>",
        ].join("")
      : "";

    return [
      "<!DOCTYPE html>",
      '<html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>',
      this.escapeHtml(params.title),
      '</title></head><body style="margin:0;background:linear-gradient(180deg,#f7f8fc 0%,#eef2ff 100%);font-family:\'PingFang SC\',\'Microsoft YaHei\',sans-serif;">',
      '<main style="max-width:880px;margin:0 auto;padding:28px 16px 48px;">',
      '<section style="padding:22px;border-radius:30px;background:rgba(255,255,255,0.9);border:1px solid rgba(226,232,250,0.9);box-shadow:0 20px 56px rgba(52,68,118,0.12);">',
      cover,
      `<h1 style="margin:20px 0 14px;font-size:32px;line-height:1.25;color:#17233f;">${this.escapeHtml(params.title)}</h1>`,
      `<div style="color:#63708a;font-size:13px;margin-bottom:18px;">${this.escapeHtml(params.noteLabel)}</div>`,
      paragraphs,
      tags,
      video,
      videoPrompt,
      "</section></main></body></html>",
    ].join("");
  }

  private mapOriginalWorkFromDatabase(
    item: {
      id: string;
      brandId: string | null;
      taskId: string | null;
      metadataJson: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    const meta = this.readOriginalWorkMeta(item.metadataJson);
    return this.mapOriginalWorkRecord(
      item.id,
      item.brandId ?? undefined,
      item.taskId ?? meta.taskId,
      meta,
      undefined,
      item.createdAt.toISOString(),
      item.updatedAt.toISOString(),
    );
  }

  private mapOriginalWorkFromMock(item: { id: string; brandId?: string; taskId?: string; metadataJson?: unknown; createdAt: string; updatedAt?: string }) {
    const meta = this.readOriginalWorkMeta(item.metadataJson);
    const task = database.tasks.find((entry) => entry.id === (item.taskId || meta.taskId));
    return this.mapOriginalWorkRecord(
      item.id,
      item.brandId,
      item.taskId || meta.taskId,
      meta,
      task?.taskStatus,
      item.createdAt,
      item.updatedAt || item.createdAt,
    );
  }

  private mapOriginalWorkRecord(
    id: string,
    brandId: string | undefined,
    taskId: string | undefined,
    meta: OriginalWorkAssetMeta,
    taskStatus?: WorkTaskStatus,
    createdAt?: string,
    updatedAt?: string,
  ): XiaohongshuOriginalWorkRecord {
    return {
      id,
      taskId: taskId || meta.taskId,
      brandId,
      title: meta.title,
      content: meta.content,
      coverImageUrl: meta.coverImageUrl,
      imageUrls: meta.imageUrls || [],
      noteCategory: "原创",
      noteType: "图文",
      calendarItemId: meta.calendarItemId,
      calendarLabel: meta.calendarLabel,
      customTopicName: meta.customTopicName,
      productId: meta.productId,
      productName: meta.productName,
      additionalInstruction: meta.additionalInstruction,
      hashtags: meta.hashtags || [],
      coverText: meta.coverText,
      imageTexts: meta.imageTexts || [],
      coverPrompt: meta.coverPrompt,
      imagePrompts: meta.imagePrompts || [],
      coverReferenceStyle: meta.coverReferenceStyle,
      galleryReferenceStyles: meta.galleryReferenceStyles || [],
      copyModel: meta.copyModel,
      imagePromptModel: meta.imagePromptModel,
      imageGenerationModel: meta.imageGenerationModel,
      taskStatus,
      createdAt: createdAt || meta.createdAt,
      updatedAt: updatedAt || meta.updatedAt,
    };
  }

  private isOriginalWorkMeta(metadataJson: unknown) {
    const meta = this.asRecord(metadataJson);
    return meta?.kind === "XHS_ORIGINAL_NOTE";
  }

  private readOriginalWorkMeta(metadataJson: unknown): OriginalWorkAssetMeta {
    const meta = this.asRecord(metadataJson);
    if (!meta || meta.kind !== "XHS_ORIGINAL_NOTE") {
      throw new NotFoundException("原创笔记不存在");
    }
    const normalizedImagePrompts = this.normalizeStringArray(meta.imagePrompts, [], 12);
    return {
      kind: "XHS_ORIGINAL_NOTE",
      taskId: String(meta.taskId ?? ""),
      noteCategory: "原创",
      noteType: "图文",
      title: String(meta.title ?? "").trim(),
      content: String(meta.content ?? "").trim(),
      htmlContent: String(meta.htmlContent ?? "").trim(),
      hashtags: this.normalizeStringArray(meta.hashtags, [], 12),
      calendarItemId: this.readOptionalString(meta.calendarItemId),
      calendarLabel: this.readOptionalString(meta.calendarLabel),
      customTopicName: this.readOptionalString(meta.customTopicName),
      productId: this.readOptionalString(meta.productId),
      productName: this.readOptionalString(meta.productName),
      productImageUrl: this.readOptionalString(meta.productImageUrl),
      imageCount: typeof meta.imageCount === "number" ? meta.imageCount : undefined,
      additionalInstruction: this.readOptionalString(meta.additionalInstruction),
      coverImageId: this.readOptionalString(meta.coverImageId),
      coverImageUrl: this.readOptionalString(meta.coverImageUrl),
      galleryImageIds: this.normalizeStringArray(meta.galleryImageIds, [], 20),
      imageUrls: this.normalizeStringArray(meta.imageUrls, [], 20),
      coverText: this.normalizeImageTextEntry(meta.coverText, { title: String(meta.title ?? "").trim(), badges: [] }),
      imageTexts: this.normalizeImageTextEntries(
        meta.imageTexts,
        [],
        normalizedImagePrompts.length || (typeof meta.imageCount === "number" ? Math.max(meta.imageCount - 1, 0) : undefined),
      ),
      coverPrompt: String(meta.coverPrompt ?? "").trim(),
      imagePrompts: normalizedImagePrompts,
      coverReferenceStyle: this.readOptionalString(meta.coverReferenceStyle),
      galleryReferenceStyles: this.normalizeStringArray(meta.galleryReferenceStyles, [], 12),
      styleAnalysisModel: this.readOptionalString(meta.styleAnalysisModel),
      copyModel: this.readOptionalString(meta.copyModel),
      imagePromptModel: this.readOptionalString(meta.imagePromptModel),
      imageGenerationModel: this.readOptionalString(meta.imageGenerationModel),
      createdAt: this.readOptionalString(meta.createdAt) || new Date().toISOString(),
      updatedAt: this.readOptionalString(meta.updatedAt) || new Date().toISOString(),
    };
  }

  private async getOriginalWorkRowById(brandId: string, workId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const row = await this.prismaService.mediaAsset.findUnique({
        where: { id: workId },
      });
      if (!row || row.brandId !== brandId || !this.isOriginalWorkMeta(row.metadataJson)) {
        throw new NotFoundException("原创笔记不存在");
      }
      return row;
    }

    const row = database.media.find((item) => item.id === workId && item.brandId === brandId);
    if (!row || !this.isOriginalWorkMeta((row as { metadataJson?: unknown }).metadataJson)) {
      throw new NotFoundException("原创笔记不存在");
    }
    return row;
  }

  private mapRewriteWorkFromDatabase(
    item: {
      id: string;
      brandId: string | null;
      taskId: string | null;
      metadataJson: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    const meta = this.readRewriteWorkMeta(item.metadataJson);
    return this.mapRewriteWorkRecord(
      item.id,
      item.brandId ?? undefined,
      item.taskId ?? meta.taskId,
      meta,
      undefined,
      item.createdAt.toISOString(),
      item.updatedAt.toISOString(),
    );
  }

  private mapRewriteWorkFromMock(item: { id: string; brandId?: string; taskId?: string; metadataJson?: unknown; createdAt: string; updatedAt?: string }) {
    const meta = this.readRewriteWorkMeta(item.metadataJson);
    const task = database.tasks.find((entry) => entry.id === (item.taskId || meta.taskId));
    return this.mapRewriteWorkRecord(
      item.id,
      item.brandId,
      item.taskId || meta.taskId,
      meta,
      task?.taskStatus,
      item.createdAt,
      item.updatedAt || item.createdAt,
    );
  }

  private mapRewriteWorkRecord(
    id: string,
    brandId: string | undefined,
    taskId: string | undefined,
    meta: RewriteWorkAssetMeta,
    taskStatus?: WorkTaskStatus,
    createdAt?: string,
    updatedAt?: string,
  ): XiaohongshuRewriteWorkRecord {
    return {
      id,
      taskId: taskId || meta.taskId,
      brandId,
      title: meta.title,
      content: meta.content,
      coverImageUrl: meta.coverImageUrl,
      imageUrls: meta.imageUrls || [],
      noteCategory: "二创",
      noteType: "图文",
      sourceMaterialId: meta.sourceMaterialId,
      sourceMaterialTitle: meta.sourceMaterialTitle,
      sourceMaterialDescription: meta.sourceMaterialDescription,
      sourceMaterialUrl: meta.sourceMaterialUrl,
      sourceMaterialImageUrls: meta.sourceMaterialImageUrls || [],
      productId: meta.productId,
      productName: meta.productName,
      additionalInstruction: meta.additionalInstruction,
      hashtags: meta.hashtags || [],
      coverText: meta.coverText,
      imageTexts: meta.imageTexts || [],
      coverPrompt: meta.coverPrompt,
      imagePrompts: meta.imagePrompts || [],
      copyModel: meta.copyModel,
      imagePromptModel: meta.imagePromptModel,
      imageGenerationModel: meta.imageGenerationModel,
      taskStatus,
      createdAt: createdAt || meta.createdAt,
      updatedAt: updatedAt || meta.updatedAt,
    };
  }

  private isRewriteWorkMeta(metadataJson: unknown) {
    const meta = this.asRecord(metadataJson);
    return meta?.kind === "XHS_REWRITE_NOTE";
  }

  private readRewriteWorkMeta(metadataJson: unknown): RewriteWorkAssetMeta {
    const meta = this.asRecord(metadataJson);
    if (!meta || meta.kind !== "XHS_REWRITE_NOTE") {
      throw new NotFoundException("二创笔记不存在");
    }
    const normalizedImagePrompts = this.normalizeStringArray(meta.imagePrompts, [], 12);
    return {
      kind: "XHS_REWRITE_NOTE",
      taskId: String(meta.taskId ?? ""),
      noteCategory: "二创",
      noteType: "图文",
      title: String(meta.title ?? "").trim(),
      content: String(meta.content ?? "").trim(),
      htmlContent: String(meta.htmlContent ?? "").trim(),
      hashtags: this.normalizeStringArray(meta.hashtags, [], 12),
      sourceMaterialId: String(meta.sourceMaterialId ?? "").trim(),
      sourceMaterialTitle: String(meta.sourceMaterialTitle ?? "").trim(),
      sourceMaterialDescription: this.readOptionalString(meta.sourceMaterialDescription),
      sourceMaterialUrl: this.readOptionalString(meta.sourceMaterialUrl),
      sourceMaterialImageUrls: this.normalizeStringArray(meta.sourceMaterialImageUrls, [], 20),
      productId: this.readOptionalString(meta.productId),
      productName: this.readOptionalString(meta.productName),
      productImageUrl: this.readOptionalString(meta.productImageUrl),
      additionalInstruction: this.readOptionalString(meta.additionalInstruction),
      coverImageId: this.readOptionalString(meta.coverImageId),
      coverImageUrl: this.readOptionalString(meta.coverImageUrl),
      galleryImageIds: this.normalizeStringArray(meta.galleryImageIds, [], 20),
      imageUrls: this.normalizeStringArray(meta.imageUrls, [], 20),
      coverText: this.normalizeImageTextEntry(meta.coverText, { title: String(meta.title ?? "").trim(), badges: [] }),
      imageTexts: this.normalizeImageTextEntries(meta.imageTexts, [], normalizedImagePrompts.length || undefined),
      coverPrompt: String(meta.coverPrompt ?? "").trim(),
      imagePrompts: normalizedImagePrompts,
      copyModel: this.readOptionalString(meta.copyModel),
      imagePromptModel: this.readOptionalString(meta.imagePromptModel),
      imageGenerationModel: this.readOptionalString(meta.imageGenerationModel),
      createdAt: this.readOptionalString(meta.createdAt) || new Date().toISOString(),
      updatedAt: this.readOptionalString(meta.updatedAt) || new Date().toISOString(),
    };
  }

  private async getRewriteWorkRowById(brandId: string, workId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const row = await this.prismaService.mediaAsset.findUnique({
        where: { id: workId },
      });
      if (!row || row.brandId !== brandId || !this.isRewriteWorkMeta(row.metadataJson)) {
        throw new NotFoundException("二创笔记不存在");
      }
      return row;
    }

    const row = database.media.find((item) => item.id === workId && item.brandId === brandId);
    if (!row || !this.isRewriteWorkMeta((row as { metadataJson?: unknown }).metadataJson)) {
      throw new NotFoundException("二创笔记不存在");
    }
    return row;
  }

  private mapVideoWorkFromDatabase(
    item: {
      id: string;
      brandId: string | null;
      taskId: string | null;
      metadataJson: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    const meta = this.readVideoWorkMeta(item.metadataJson);
    return this.mapVideoWorkRecord(
      item.id,
      item.brandId ?? undefined,
      item.taskId ?? meta.taskId,
      meta,
      undefined,
      item.createdAt.toISOString(),
      item.updatedAt.toISOString(),
    );
  }

  private mapVideoWorkFromMock(item: { id: string; brandId?: string; taskId?: string; metadataJson?: unknown; createdAt: string; updatedAt?: string }) {
    const meta = this.readVideoWorkMeta(item.metadataJson);
    const task = database.tasks.find((entry) => entry.id === (item.taskId || meta.taskId));
    return this.mapVideoWorkRecord(
      item.id,
      item.brandId,
      item.taskId || meta.taskId,
      meta,
      task?.taskStatus,
      item.createdAt,
      item.updatedAt || item.createdAt,
    );
  }

  private mapVideoWorkRecord(
    id: string,
    brandId: string | undefined,
    taskId: string | undefined,
    meta: VideoWorkAssetMeta,
    taskStatus?: WorkTaskStatus,
    createdAt?: string,
    updatedAt?: string,
  ): XiaohongshuVideoWorkRecord {
    return {
      id,
      taskId: taskId || meta.taskId,
      brandId,
      title: meta.title,
      content: meta.content,
      coverImageUrl: meta.coverImageUrl,
      videoUrl: meta.videoUrl,
      noteCategory: "原创",
      noteType: "视频",
      calendarItemId: meta.calendarItemId,
      calendarLabel: meta.calendarLabel,
      customTopicName: meta.customTopicName,
      productId: meta.productId,
      productName: meta.productName,
      referenceImageUrl: meta.referenceImageUrl,
      copyAdditionalInstruction: meta.copyAdditionalInstruction,
      videoAdditionalInstruction: meta.videoAdditionalInstruction,
      includeMarketingPlan: meta.includeMarketingPlan,
      requestedVideoProvider: meta.requestedVideoProvider,
      resolvedVideoProvider: meta.resolvedVideoProvider,
      resolvedVideoModel: meta.resolvedVideoModel,
      requestedDurationSec: meta.requestedDurationSec,
      renderedDurationSec: meta.renderedDurationSec,
      outputVideoPrompt: meta.outputVideoPrompt,
      videoPrompt: meta.outputVideoPrompt ? meta.videoPrompt : undefined,
      fullVideoPrompt: meta.outputVideoPrompt ? meta.fullVideoPrompt : undefined,
      videoReasoning: meta.videoReasoning,
      businessScene: meta.businessScene,
      videoType: meta.videoType,
      segmentBrief: meta.segmentBrief,
      referenceStrategy: meta.referenceStrategy,
      padImageStrategy: meta.padImageStrategy,
      continuityRules: meta.continuityRules || [],
      segmentPrompts: meta.segmentPrompts || [],
      segmentExecutionStatus: meta.segmentExecutionStatus,
      segmentExecutionError: meta.segmentExecutionError,
      segmentAssets: meta.segmentAssets || [],
      taskStatus,
      createdAt: createdAt || meta.createdAt,
      updatedAt: updatedAt || meta.updatedAt,
    };
  }

  private isVideoWorkMeta(metadataJson: unknown) {
    const meta = this.asRecord(metadataJson);
    return meta?.kind === "XHS_VIDEO_NOTE";
  }

  private readVideoWorkMeta(metadataJson: unknown): VideoWorkAssetMeta {
    const meta = this.asRecord(metadataJson);
    if (!meta || meta.kind !== "XHS_VIDEO_NOTE") {
      throw new NotFoundException("视频笔记不存在");
    }
    return {
      kind: "XHS_VIDEO_NOTE",
      taskId: String(meta.taskId ?? ""),
      noteCategory: "原创",
      noteType: "视频",
      title: String(meta.title ?? "").trim(),
      content: String(meta.content ?? "").trim(),
      htmlContent: String(meta.htmlContent ?? "").trim(),
      hashtags: this.normalizeStringArray(meta.hashtags, [], 12),
      calendarItemId: this.readOptionalString(meta.calendarItemId),
      calendarLabel: this.readOptionalString(meta.calendarLabel),
      customTopicName: this.readOptionalString(meta.customTopicName),
      productId: this.readOptionalString(meta.productId),
      productName: this.readOptionalString(meta.productName),
      referenceImageUrl: this.readOptionalString(meta.referenceImageUrl),
      copyAdditionalInstruction: this.readOptionalString(meta.copyAdditionalInstruction),
      videoAdditionalInstruction: this.readOptionalString(meta.videoAdditionalInstruction),
      includeMarketingPlan: meta.includeMarketingPlan !== false,
      requestedVideoProvider: this.readOptionalString(meta.requestedVideoProvider) || "seedance",
      resolvedVideoProvider: this.readOptionalString(meta.resolvedVideoProvider) || this.readOptionalString(meta.requestedVideoProvider) || "seedance",
      resolvedVideoModel: this.readOptionalString(meta.resolvedVideoModel),
      requestedDurationSec: Number(meta.requestedDurationSec || 10),
      renderedDurationSec: typeof meta.renderedDurationSec === "number" ? meta.renderedDurationSec : undefined,
      outputVideoPrompt: meta.outputVideoPrompt !== false,
      videoPrompt: this.readOptionalString(meta.videoPrompt),
      fullVideoPrompt: this.readOptionalString(meta.fullVideoPrompt),
      videoReasoning: this.readOptionalString(meta.videoReasoning),
      businessScene: this.readOptionalString(meta.businessScene),
      videoType: this.readOptionalString(meta.videoType),
      segmentBrief: this.readOptionalString(meta.segmentBrief),
      referenceStrategy: this.readOptionalString(meta.referenceStrategy),
      padImageStrategy: this.readOptionalString(meta.padImageStrategy),
      continuityRules: this.normalizeStringArray(meta.continuityRules, [], 8),
      segmentPrompts: this.normalizeStringArray(meta.segmentPrompts, [], 12),
      segmentExecutionStatus: this.readOptionalString(meta.segmentExecutionStatus) as VideoWorkAssetMeta["segmentExecutionStatus"],
      segmentExecutionError: this.readOptionalString(meta.segmentExecutionError),
      segmentAssets: this.normalizeVideoSegmentAssets(meta.segmentAssets),
      providerTaskId: this.readOptionalString(meta.providerTaskId),
      videoAssetId: this.readOptionalString(meta.videoAssetId),
      videoUrl: this.readOptionalString(meta.videoUrl),
      coverImageUrl: this.readOptionalString(meta.coverImageUrl),
      createdAt: this.readOptionalString(meta.createdAt) || new Date().toISOString(),
      updatedAt: this.readOptionalString(meta.updatedAt) || new Date().toISOString(),
    };
  }

  private normalizeVideoSegmentAssets(value: unknown) {
    const items = Array.isArray(value) ? value : [];
    const result: VideoSegmentAssetEntry[] = [];
    items.forEach((item, index) => {
      const record = this.asRecord(item);
      if (!record) {
        return;
      }
      const videoUrl = this.readOptionalString(record.videoUrl);
      if (!videoUrl) {
        return;
      }
      result.push({
        order: typeof record.order === "number" ? record.order : index,
        prompt: String(record.prompt ?? "").trim(),
        videoUrl,
        coverImageUrl: this.readOptionalString(record.coverImageUrl),
        provider: this.readOptionalString(record.provider) || "seedance",
        modelName: this.readOptionalString(record.modelName),
        providerTaskId: this.readOptionalString(record.providerTaskId),
        renderedDurationSec: typeof record.renderedDurationSec === "number" ? record.renderedDurationSec : undefined,
        referenceImageUrl: this.readOptionalString(record.referenceImageUrl),
        videoAssetId: this.readOptionalString(record.videoAssetId),
      });
    });
    return result;
  }

  private async getVideoWorkRowById(brandId: string, workId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const row = await this.prismaService.mediaAsset.findUnique({
        where: { id: workId },
      });
      if (!row || row.brandId !== brandId || !this.isVideoWorkMeta(row.metadataJson)) {
        throw new NotFoundException("视频笔记不存在");
      }
      return row;
    }

    const row = database.media.find((item) => item.id === workId && item.brandId === brandId);
    if (!row || !this.isVideoWorkMeta((row as { metadataJson?: unknown }).metadataJson)) {
      throw new NotFoundException("视频笔记不存在");
    }
    return row;
  }

  private getMediaMetadata(item: { metadataJson?: unknown }) {
    return item.metadataJson;
  }

  private async loadOriginalCopyPrompt() {
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_xhs_original_copy");
    if (prompt?.content?.trim()) {
      return prompt.content.trim();
    }
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), ".runtime", "prompt_extract", "original_copy", "original_copy", "SKILL.md"),
      resolve(this.resolveWorkspaceRoot(), ".runtime", "prompt_extract", "original_copy", "original_copy", "SKILL.md"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8").trim();
      }
    }
    return [
      "# 小红书原创文案生成器",
      "你需要根据营销策划方案、营销日历、产品信息和用户附加要求生成一篇小红书原创图文笔记。",
      "输出标题、正文和标签，确保标题20字以内，正文300字以内，适合小红书图文发布。",
    ].join("\n");
  }

  private async loadOriginalImagePrompt() {
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_xhs_original_note");
    if (prompt?.content?.trim()) {
      return prompt.content.trim();
    }
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), ".runtime", "prompt_extract", "original_image", "SKILL.md"),
      resolve(this.resolveWorkspaceRoot(), ".runtime", "prompt_extract", "original_image", "SKILL.md"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8").trim();
      }
    }
    return [
      "# 小红书原创配图提示词生成器",
      "你需要根据营销规划、营销日历、原创笔记文案、产品和用户要求，输出封面提示词与多张配图提示词。",
      "请保证整体风格统一、适合小红书图文封面与内页展示。",
    ].join("\n");
  }

  private async loadRewriteCopyPrompt() {
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_xhs_rewrite_copy");
    if (prompt?.content?.trim()) {
      return prompt.content.trim();
    }
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), ".runtime", "prompt_extract", "rewrite_copy", "SKILL.md"),
      resolve(this.resolveWorkspaceRoot(), ".runtime", "prompt_extract", "rewrite_copy", "SKILL.md"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8").trim();
      }
    }
    return [
      "# 小红书二创文案生成器",
      "你需要根据营销策划方案、素材库作品、产品信息和用户附加要求，重写并优化出一篇小红书二创图文笔记。",
      "输出标题、正文和标签，保持平台表达习惯，并避免直接复刻原文。",
    ].join("\n");
  }

  private async loadRewriteImagePrompt() {
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_xhs_rewrite_note");
    if (prompt?.content?.trim()) {
      return prompt.content.trim();
    }
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), ".runtime", "prompt_extract", "rewrite_image", "SKILL.md"),
      resolve(this.resolveWorkspaceRoot(), ".runtime", "prompt_extract", "rewrite_image", "SKILL.md"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8").trim();
      }
    }
    return [
      "# 小红书二创配图提示词生成器",
      "你需要根据素材库作品、二创文案、营销策划方案和产品信息，输出二创封面提示词与配图提示词。",
      "请保证画面有明显差异化，但仍能承接素材作品的爆款结构与品牌调性。",
    ].join("\n");
  }

  private async loadVideoCopyPrompt() {
    return this.loadVideoSkillPrompt();
  }

  private async loadShortVideoPromptSkill() {
    return this.loadVideoSkillPrompt();
  }

  private async loadVideoSkillPrompt() {
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_xhs_video_note");
    const skillPrompt = prompt?.content?.trim() || this.readFirstExistingTextFromCandidates(this.resolveVideoSkillPromptCandidates());
    const referenceExcerpt = this.loadVideoSkillReferenceExcerpt();
    if (skillPrompt) {
      return [skillPrompt, referenceExcerpt].filter(Boolean).join("\n\n");
    }
    return [
      "# short-video-api-studio",
      "你需要把短视频需求转成结构化视频生成提示词，并给出分段提示词和完整版提示词。",
      "请优先适配小红书竖屏短视频，输出适合第三方视频生成接口调用的提示词。",
    ].join("\n");
  }

  private resolveVideoSkillPromptCandidates() {
    return [
      resolve(this.resolveWorkspaceRoot(), ".runtime", "prompt_extract", "short-video-api-studio", "SKILL.md"),
      resolve(this.resolveAiWorkspaceRoot(), ".runtime", "prompt_extract", "short-video-api-studio", "SKILL.md"),
      resolve(this.resolveAiWorkspaceRoot(), "提示词", "short-video-api-studio", "short-video-api-studio", "SKILL.md"),
      resolve(this.resolveOperationRoot(), "提示词", "short-video-api-studio", "short-video-api-studio", "SKILL.md"),
    ];
  }

  private loadVideoSkillReferenceExcerpt() {
    const candidates = [
      {
        title: "商业短片五大场景参考",
        paths: [
          resolve(this.resolveAiWorkspaceRoot(), "提示词", "short-video-api-studio", "short-video-api-studio", "03_商业短片五大场景参考.md"),
          resolve(this.resolveOperationRoot(), "提示词", "short-video-api-studio", "short-video-api-studio", "03_商业短片五大场景参考.md"),
        ],
        maxChars: 1600,
      },
      {
        title: "社媒创意营销短片参考",
        paths: [
          resolve(this.resolveAiWorkspaceRoot(), "提示词", "short-video-api-studio", "short-video-api-studio", "04_社媒创意营销短片参考.md"),
          resolve(this.resolveOperationRoot(), "提示词", "short-video-api-studio", "short-video-api-studio", "04_社媒创意营销短片参考.md"),
        ],
        maxChars: 1400,
      },
      {
        title: "10到15秒分段生成参考",
        paths: [
          resolve(this.resolveAiWorkspaceRoot(), "提示词", "short-video-api-studio", "short-video-api-studio", "05_API调用与10到15秒分段生成参考.md"),
          resolve(this.resolveOperationRoot(), "提示词", "short-video-api-studio", "short-video-api-studio", "05_API调用与10到15秒分段生成参考.md"),
        ],
        maxChars: 1400,
      },
    ];
    const sections = candidates
      .map((item) => {
        const content = this.readFirstExistingTextFromCandidates(item.paths);
        if (!content) {
          return "";
        }
        return [`## ${item.title} 摘录`, content.slice(0, item.maxChars).trim()].join("\n");
      })
      .filter(Boolean);
    if (!sections.length) {
      return "";
    }
    return ["# short-video-api-studio 参考摘录", ...sections].join("\n\n");
  }

  private readFirstExistingTextFromCandidates(candidates: string[]) {
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8").trim();
      }
    }
    return "";
  }

  private buildVideoMarketingPlanContext(markdown: string) {
    const blockedPattern = /(¥|￥|\b\d+\s*元\b|优惠|折扣|券|抽[0-9一二三四五六七八九十]+位|门店|核销|下单|购买|团购|自提|直播|sku|SKU|价格|限时|促销)/i;
    const filteredLines = String(markdown || "")
      .split(/\r?\n/)
      .map((item) => item.trimEnd())
      .filter((item) => item.trim() && !blockedPattern.test(item))
      .slice(0, 80);
    return [
      "视频笔记文案和视频提示词阶段，只允许参考营销策划中的品牌调性、人群洞察、情绪目标、内容结构与场景方向。",
      "默认不要把价格、门店数、优惠、抽奖、购买路径、促销口号直接写进正文或镜头脚本，除非用户额外明确要求。",
      ...filteredLines,
    ].join("\n");
  }

  private loadImageAnalysisPrompt() {
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), "提示词", "拆解图片提示词.txt"),
      resolve(this.resolveOperationRoot(), "提示词", "拆解图片提示词.txt"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8").trim();
      }
    }
    throw new ServiceUnavailableException("未找到拆解图片提示词文件");
  }

  private loadOriginalCopyProviders() {
    const domesticContent = readFileSync(this.resolveDomesticThirdPartyApiConfigPath(), "utf8");
    const deepseekSection = this.extractProviderSection(domesticContent, "deepseek", ["kimi", "GLM"]);
    const kimiSection = this.extractProviderSection(domesticContent, "kimi", ["GLM"]);
    const deepseekApiKeys = this.collectRegexMatches(deepseekSection, /sk-[A-Za-z0-9]+/g);
    const kimiApiKeys = this.collectRegexMatches(kimiSection, /sk-[A-Za-z0-9]+/g);
    const arkApiKeys = this.collectRegexMatches(domesticContent, /ark-[A-Za-z0-9-]+/g);

    const providers: TextProviderConfig[] = [];
    if (deepseekApiKeys.length) {
      providers.push({
        provider: "DEEPSEEK",
        baseUrls: ["https://api.deepseek.com"],
        completionPath: "/chat/completions",
        apiKeys: deepseekApiKeys.slice(0, 2),
        models: ["deepseek-v4-pro"],
        temperature: 0.3,
        maxTokens: 2200,
        requestTimeoutMs: 180000,
        payloadExtras: {
          response_format: { type: "json_object" },
          thinking: { type: "disabled" },
        },
      });
    }
    if (arkApiKeys.length) {
      providers.push({
        provider: "ARK",
        baseUrls: ["https://ark.cn-beijing.volces.com/api/v3"],
        completionPath: "/chat/completions",
        apiKeys: arkApiKeys.slice(0, 1),
        models: ["doubao-seed-2-0-pro-260215"],
        temperature: 0.6,
        maxTokens: 2200,
        requestTimeoutMs: 180000,
        payloadExtras: {
          response_format: { type: "json_object" },
        },
      });
    }
    if (kimiApiKeys.length) {
      providers.push({
        provider: "KIMI",
        baseUrls: ["https://api.moonshot.cn/v1"],
        completionPath: "/chat/completions",
        apiKeys: kimiApiKeys.slice(0, 1),
        models: ["kimi-k2.6"],
        temperature: 1,
        maxTokens: 2200,
        tokenLimitField: "max_completion_tokens",
        requestTimeoutMs: 180000,
        payloadExtras: {
          response_format: { type: "json_object" },
        },
      });
    }
    if (!providers.length) {
      throw new ServiceUnavailableException("原创笔记文案模型配置读取失败");
    }
    return providers;
  }

  private loadOriginalImagePromptProviders() {
    const domesticContent = readFileSync(this.resolveDomesticThirdPartyApiConfigPath(), "utf8");
    const deepseekSection = this.extractProviderSection(domesticContent, "deepseek", ["kimi", "GLM"]);
    const kimiSection = this.extractProviderSection(domesticContent, "kimi", ["GLM"]);
    const deepseekApiKeys = this.collectRegexMatches(deepseekSection, /sk-[A-Za-z0-9]+/g);
    const kimiApiKeys = this.collectRegexMatches(kimiSection, /sk-[A-Za-z0-9]+/g);
    const arkApiKeys = this.collectRegexMatches(domesticContent, /ark-[A-Za-z0-9-]+/g);

    const providers: TextProviderConfig[] = [];
    if (deepseekApiKeys.length) {
      providers.push({
        provider: "DEEPSEEK",
        baseUrls: ["https://api.deepseek.com"],
        completionPath: "/chat/completions",
        apiKeys: deepseekApiKeys.slice(0, 2),
        models: ["deepseek-v4-pro"],
        temperature: 0.3,
        maxTokens: 2800,
        requestTimeoutMs: 180000,
        payloadExtras: {
          response_format: { type: "json_object" },
          thinking: { type: "disabled" },
        },
      });
    }
    if (arkApiKeys.length) {
      providers.push({
        provider: "ARK",
        baseUrls: ["https://ark.cn-beijing.volces.com/api/v3"],
        completionPath: "/chat/completions",
        apiKeys: arkApiKeys.slice(0, 1),
        models: ["doubao-seed-2-0-pro-260215"],
        temperature: 0.5,
        maxTokens: 2800,
        requestTimeoutMs: 180000,
        payloadExtras: {
          response_format: { type: "json_object" },
        },
      });
    }
    if (kimiApiKeys.length) {
      providers.push({
        provider: "KIMI",
        baseUrls: ["https://api.moonshot.cn/v1"],
        completionPath: "/chat/completions",
        apiKeys: kimiApiKeys.slice(0, 1),
        models: ["kimi-k2.6"],
        temperature: 1,
        maxTokens: 2800,
        tokenLimitField: "max_completion_tokens",
        requestTimeoutMs: 180000,
        payloadExtras: {
          response_format: { type: "json_object" },
        },
      });
    }
    if (!providers.length) {
      throw new ServiceUnavailableException("原创笔记配图提示词模型配置读取失败");
    }
    return providers;
  }

  private async generateRewriteCopy(params: {
    marketingPlanMarkdown: string;
    sourceMaterial: {
      id: string;
      title: string;
      description?: string;
      noteUrl?: string;
      sourceUrl?: string;
      imageList?: string[];
      nickname?: string;
      noteType?: string;
      likeCount?: number;
      collectCount?: number;
      commentCount?: number;
      shareCount?: number;
    };
    topicContext?: {
      topicName: string;
      topicContent: string;
      contentGoal: string;
      expressionFocus: string;
    };
    product?: {
      id: string;
      productName: string;
      detailDescription: string;
      usageScenario: string;
      targetAudience: string;
      differentiators: string;
      imageUrl?: string;
    };
    additionalInstruction?: string;
  }): Promise<OriginalCopyModelResult> {
    const skillPrompt = await this.loadRewriteCopyPrompt();
    const providers = this.loadOriginalCopyProviders();
    const inputPayload = {
      marketingPlanMarkdown: params.marketingPlanMarkdown,
      benchmark_note: {
        id: params.sourceMaterial.id,
        title: params.sourceMaterial.title,
        description: params.sourceMaterial.description,
        noteUrl: params.sourceMaterial.noteUrl || params.sourceMaterial.sourceUrl,
        imageUrls: params.sourceMaterial.imageList || [],
        nickname: params.sourceMaterial.nickname,
        noteType: params.sourceMaterial.noteType,
        likeCount: params.sourceMaterial.likeCount,
        collectCount: params.sourceMaterial.collectCount,
        commentCount: params.sourceMaterial.commentCount,
        shareCount: params.sourceMaterial.shareCount,
      },
      topic_context: params.topicContext ?? null,
      product: params.product
        ? {
            productName: params.product.productName,
            detailDescription: params.product.detailDescription,
            usageScenario: params.product.usageScenario,
            targetAudience: params.product.targetAudience,
            differentiators: params.product.differentiators,
          }
        : null,
      additional_instruction: params.additionalInstruction,
    };

    const systemPrompt = [
      skillPrompt,
      "",
      "你当前要输出一篇可直接发布的小红书二创图文笔记。",
      "必须优先围绕 benchmark_note 的核心事件、场景、人物关系和情绪主题进行二创，不能脱离原素材主线另起题。",
      "如果 benchmark_note 中的商品或品牌露出只是背景信息、补给细节或陪跑元素，严禁把它升级为标题主钩子、核心卖点或主要带货内容。",
      params.product
        ? "本次已明确提供产品资料，可以在不破坏对标素材主线的前提下自然植入该产品。"
        : "本次未提供产品资料，严禁自行引入任何具体产品 SKU、商品名、价格、门店购买引导、优惠信息、下单路径或强转化文案；如果原素材里有品牌露出，只能保留为背景信息，不能扩写成具体卖货笔记，也不能新增 benchmark_note 未明确出现的第二个产品。",
      "请仅输出 JSON 对象，不要输出 Markdown 代码块或额外解释。",
      "JSON 结构固定为：",
      "{",
      '  "title": "最终标题",',
      '  "content": "二创后的正文内容",',
      '  "tags": ["#关键词1", "#关键词2"]',
      "}",
    ].join("\n");
    const userPrompt = ["以下是本次二创笔记创作输入：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                provider.requestTimeoutMs ?? 180000,
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const title = String(parsed.title ?? "").trim();
              const body = String(parsed.content ?? "").trim();
              const hashtags = this.normalizeStringArray(parsed.tags ?? parsed.hashtags, [], 8);
              if (!title || !body) {
                lastError = `${provider.provider}/${modelName} 返回字段不完整`;
                continue;
              }
              return {
                title,
                content: body,
                hashtags: hashtags.length ? hashtags : this.extractHashtagsFromContent(body),
                modelName,
              };
            } catch (error) {
              lastError = error instanceof Error ? error.message : "二创文案生成失败";
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(`二创笔记文案生成失败：${lastError || "未获取到有效响应"}`);
  }

  private async generateRewriteImagePrompts(params: {
    marketingPlanMarkdown: string;
    sourceMaterial: {
      id: string;
      title: string;
      description?: string;
      noteUrl?: string;
      sourceUrl?: string;
      imageList?: string[];
      nickname?: string;
      noteType?: string;
    };
    topicContext?: {
      topicName: string;
      topicContent: string;
      contentGoal: string;
      expressionFocus: string;
    };
    product?: {
      productName: string;
      detailDescription: string;
      usageScenario: string;
      targetAudience: string;
      differentiators: string;
      imageUrl?: string;
    };
    additionalInstruction?: string;
    noteTitle: string;
    noteContent: string;
  }): Promise<OriginalImagePromptResult> {
    const skillPrompt = await this.loadRewriteImagePrompt();
    const providers = this.loadOriginalImagePromptProviders();
    const inputPayload = {
      marketingPlanMarkdown: params.marketingPlanMarkdown,
      benchmark_note: {
        id: params.sourceMaterial.id,
        title: params.sourceMaterial.title,
        description: params.sourceMaterial.description,
        noteUrl: params.sourceMaterial.noteUrl || params.sourceMaterial.sourceUrl,
        imageUrls: params.sourceMaterial.imageList || [],
        nickname: params.sourceMaterial.nickname,
        noteType: params.sourceMaterial.noteType,
      },
      topic_context: params.topicContext ?? null,
      noteTitle: params.noteTitle,
      noteContent: params.noteContent,
      product: params.product
        ? {
            productName: params.product.productName,
            detailDescription: params.product.detailDescription,
            usageScenario: params.product.usageScenario,
            targetAudience: params.product.targetAudience,
            differentiators: params.product.differentiators,
          }
        : null,
      additional_instruction: params.additionalInstruction,
    };
    const systemPrompt = [
      skillPrompt,
      "",
      "你当前需要输出小红书二创图文的封面与配图提示词。",
      "请至少返回 1 条封面提示词和 2 条配图提示词。",
      "图片主题必须服务于 benchmark_note 的核心事件和主场景，不能偏离到无关商品展示或纯带货画面。",
      "如果 benchmark_note 中的商品或品牌露出只是背景信息、补给细节或陪跑元素，画面中不得把它放大成核心产品海报或主视觉主体。",
      params.product
        ? "本次已明确提供产品资料，可以在画面中自然植入该产品形象。"
        : "本次未提供产品资料，严禁在封面或配图中自行生成具体商品、SKU、价格牌、门店陈列、购买引导文案或卖货主视觉；若原素材本身含有品牌元素，只能保留事件相关的弱露出，不得强化成产品销售海报，也不得新增 benchmark_note 未明确出现的第二个产品。",
      "除封面与配图提示词外，你还必须给出每张图要排版到画面上的中文标题和小标签。",
      "请仅输出 JSON 对象，不要输出 Markdown 代码块或额外解释。",
      "{",
      '  "cover_text": { "title": "封面主标题", "badges": ["封面小标签1", "封面小标签2"] },',
      '  "image_texts": [',
      '    { "title": "第2张配图标题", "badges": ["第2张小标签1"] },',
      '    { "title": "第3张配图标题", "badges": ["第3张小标签1"] }',
      "  ],",
      '  "cover_prompt": "封面提示词",',
      '  "image_prompts": ["配图提示词1", "配图提示词2"]',
      "}",
    ].join("\n");
    const userPrompt = ["以下是本次二创笔记配图输入：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                provider.requestTimeoutMs ?? 180000,
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const textPlan = this.normalizeImageTextPlan({
                coverTextRaw: parsed.cover_text ?? parsed.coverText,
                imageTextsRaw: parsed.image_texts ?? parsed.imageTexts,
                noteTitle: params.noteTitle,
                noteContent: params.noteContent,
              });
              const coverPrompt = String(parsed.cover_prompt ?? parsed.coverPrompt ?? "").trim();
              const imagePrompts = this.normalizeStringArray(parsed.image_prompts ?? parsed.imagePrompts, [], 10);
              if (!coverPrompt) {
                lastError = `${provider.provider}/${modelName} 封面提示词为空`;
                continue;
              }
              const normalizedImagePrompts = imagePrompts.length
                ? imagePrompts
                : this.normalizeFixedImagePromptCount([], coverPrompt, 3);
              return {
                coverText: textPlan.coverText,
                imageTexts: this.normalizeImageTextEntries(textPlan.imageTexts, textPlan.imageTexts, normalizedImagePrompts.length),
                coverPrompt,
                imagePrompts: normalizedImagePrompts,
                modelName,
              };
            } catch (error) {
              lastError = error instanceof Error ? error.message : "二创配图提示词生成失败";
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(`二创笔记配图提示词生成失败：${lastError || "未获取到有效响应"}`);
  }

  private async generateVideoCopy(params: {
    marketingPlanMarkdown: string;
    selectedCalendarItem?: {
      id: string;
      date: string;
      topicName: string;
      topicContent?: string;
      titleDirections: string[];
      contentGoal?: string;
      targetAudience?: string;
      expressionFocus?: string;
    };
    customTopicName?: string;
    product?: {
      id: string;
      productName: string;
      detailDescription: string;
      usageScenario: string;
      targetAudience: string;
      differentiators: string;
      imageUrl?: string;
    };
    includeMarketingPlan?: boolean;
    additionalInstruction?: string;
  }): Promise<VideoCopyModelResult> {
    const skillPrompt = await this.loadVideoCopyPrompt();
    const providers = this.loadOriginalCopyProviders();
    const inputPayload = {
      marketingPlanMarkdown: this.buildVideoMarketingPlanContext(params.marketingPlanMarkdown),
      topic_context: params.selectedCalendarItem
        ? {
            date: params.selectedCalendarItem.date,
            topicName: params.selectedCalendarItem.topicName,
            topicContent: params.selectedCalendarItem.topicContent,
            titleDirections: params.selectedCalendarItem.titleDirections,
            contentGoal: params.selectedCalendarItem.contentGoal,
            targetAudience: params.selectedCalendarItem.targetAudience,
            expressionFocus: params.selectedCalendarItem.expressionFocus,
          }
        : null,
      customTopicName: params.customTopicName,
      product: params.product
        ? {
            productName: params.product.productName,
            detailDescription: params.product.detailDescription,
            usageScenario: params.product.usageScenario,
            targetAudience: params.product.targetAudience,
            differentiators: params.product.differentiators,
          }
        : null,
      additional_instruction: params.additionalInstruction,
      include_marketing_plan: params.includeMarketingPlan !== false,
      note_type: "VIDEO",
      platform: "XIAOHONGSHU",
    };
    const systemPrompt = [
      skillPrompt,
      "",
      "你当前要输出一篇可直接发布的小红书原创视频笔记文案。",
      "请先按 short-video-api-studio 的方法完成商业场景、任务类型、镜头节奏和情绪结构理解，再生成与后续视频镜头相匹配的标题与正文。",
      params.includeMarketingPlan === false
        ? "本次明确要求不要植入营销策划方案；你只能使用营销日历选题、产品资料、参考图和用户要求，禁止自行吸收营销策划方案里的卖点、产品矩阵、价格、门店、促销或投放口径。"
        : "本次允许有限参考营销策划方案，但只能吸收品牌调性、人群洞察、情绪目标、内容结构和场景方向，禁止把产品卖点表、价格、门店、促销口径直接写进正文。",
      "正文不能退化成普通图文种草稿，必须和后续 10-15 秒短视频的开场钩子、镜头承接和结尾互动一致。",
      "正文默认禁止写成硬广口播、价格播报、优惠券通知、门店数量宣传、抽奖送券或直接下单引导，除非用户额外明确要求。",
      "请仅输出 JSON 对象，不要输出 Markdown 代码块或额外解释。",
      "JSON 结构固定为：",
      "{",
      '  "business_scene": "商业场景",',
      '  "video_type": "任务类型",',
      '  "communication_goal": "这条视频和正文要完成的传播目标",',
      '  "story_hook": "开场钩子",',
      '  "motion_language": "运镜/节奏语言",',
      '  "shot_language": "镜头组织方式",',
      '  "segment_strategy": "10-15秒如何拆段推进",',
      '  "anti_error_rules": ["不要写成什么", "不要出现什么"],',
      '  "title": "20字以内标题",',
      '  "content": "适合小红书视频笔记的正文，建议包含镜头/情绪承接和结尾互动",',
      '  "hashtags": ["标签1", "标签2"]',
      "}",
    ].join("\n");
    const userPrompt = ["以下是本次视频笔记文案输入：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                provider.requestTimeoutMs ?? 180000,
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const title = String(parsed.title ?? "").trim();
              const body = String(parsed.content ?? "").trim();
              const hashtags = this.normalizeStringArray(parsed.hashtags ?? parsed.tags, [], 8);
              const antiErrorRules = this.normalizeStringArray(parsed.anti_error_rules ?? parsed.antiErrorRules, [], 8);
              if (!title || !body) {
                lastError = `${provider.provider}/${modelName} 返回字段不完整`;
                continue;
              }
              return {
                title,
                content: body,
                hashtags: hashtags.length ? hashtags : this.extractHashtagsFromContent(body),
                modelName,
                businessScene: this.readOptionalString(parsed.business_scene ?? parsed.businessScene),
                videoType: this.readOptionalString(parsed.video_type ?? parsed.videoType),
                communicationGoal: this.readOptionalString(parsed.communication_goal ?? parsed.communicationGoal),
                storyHook: this.readOptionalString(parsed.story_hook ?? parsed.storyHook),
                motionLanguage: this.readOptionalString(parsed.motion_language ?? parsed.motionLanguage),
                shotLanguage: this.readOptionalString(parsed.shot_language ?? parsed.shotLanguage),
                segmentStrategy: this.readOptionalString(parsed.segment_strategy ?? parsed.segmentStrategy),
                antiErrorRules,
              };
            } catch (error) {
              lastError = error instanceof Error ? error.message : "视频笔记文案生成失败";
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(`视频笔记文案生成失败：${lastError || "未获取到有效响应"}`);
  }

  private async generateVideoPromptPack(params: {
    marketingPlanMarkdown: string;
    selectedCalendarItem?: {
      id: string;
      date: string;
      topicName: string;
      topicContent?: string;
      titleDirections: string[];
      contentGoal?: string;
      targetAudience?: string;
      expressionFocus?: string;
    };
    customTopicName?: string;
    product?: {
      id: string;
      productName: string;
      detailDescription: string;
      usageScenario: string;
      targetAudience: string;
      differentiators: string;
      imageUrl?: string;
    };
    noteTitle: string;
    noteContent: string;
    copyBusinessScene?: string;
    copyVideoType?: string;
    copyCommunicationGoal?: string;
    copyStoryHook?: string;
    copyMotionLanguage?: string;
    copyShotLanguage?: string;
    copySegmentStrategy?: string;
    copyAntiErrorRules?: string[];
    requestedVideoProvider: string;
    requestedDurationSec: number;
    referenceImageUrl?: string;
    includeMarketingPlan?: boolean;
    additionalInstruction?: string;
  }): Promise<VideoPromptModelResult> {
    const skillPrompt = await this.loadShortVideoPromptSkill();
    const providers = this.loadOriginalCopyProviders();
    const inputPayload = {
      marketingPlanMarkdown: this.buildVideoMarketingPlanContext(params.marketingPlanMarkdown),
      topic_context: params.selectedCalendarItem
        ? {
            date: params.selectedCalendarItem.date,
            topicName: params.selectedCalendarItem.topicName,
            topicContent: params.selectedCalendarItem.topicContent,
            titleDirections: params.selectedCalendarItem.titleDirections,
            contentGoal: params.selectedCalendarItem.contentGoal,
            targetAudience: params.selectedCalendarItem.targetAudience,
            expressionFocus: params.selectedCalendarItem.expressionFocus,
          }
        : null,
      customTopicName: params.customTopicName,
      product: params.product
        ? {
            productName: params.product.productName,
            detailDescription: params.product.detailDescription,
            usageScenario: params.product.usageScenario,
            targetAudience: params.product.targetAudience,
            differentiators: params.product.differentiators,
          }
        : null,
      noteTitle: params.noteTitle,
      noteContent: params.noteContent,
      copy_plan: {
        businessScene: params.copyBusinessScene,
        videoType: params.copyVideoType,
        communicationGoal: params.copyCommunicationGoal,
        storyHook: params.copyStoryHook,
        motionLanguage: params.copyMotionLanguage,
        shotLanguage: params.copyShotLanguage,
        segmentStrategy: params.copySegmentStrategy,
        antiErrorRules: params.copyAntiErrorRules || [],
      },
      requestedVideoProvider: params.requestedVideoProvider,
      requestedDurationSec: params.requestedDurationSec,
      referenceImageUrl: params.referenceImageUrl,
      include_marketing_plan: params.includeMarketingPlan !== false,
      additional_instruction: params.additionalInstruction,
      output_language: "zh-CN",
      aspect_ratio: "9:16",
      segment_count_hint: params.requestedDurationSec >= 13 ? 3 : 2,
    };
    const systemPrompt = [
      skillPrompt,
      "",
      "你当前需要输出短视频生成所需的结构化提示词。",
      "必须尽量遵循 short-video-api-studio 的执行结构，先识别商业场景与任务类型，再给出分段 brief、连续性规则和最终视频提示词。",
      params.includeMarketingPlan === false
        ? "本次明确要求不要植入营销策划方案；你只能基于营销日历选题、产品资料、参考图、正文和用户要求生成镜头，不要吸收营销策划方案中的产品矩阵、卖点清单、价格、门店、促销或投放表达。"
        : "本次允许有限参考营销策划方案，但只能吸收品牌调性、人群洞察、情绪目标、内容结构和场景方向，不要把产品卖点表、价格、门店、促销和投放表达直接翻译成视频提示词。",
      "输入里的 copy_plan 是上一阶段已经完成的视频推理层，请优先沿用它，不要重新退化成普通带货稿或促销海报说明。",
      "如果 copy_plan 已经明确禁止价格播报、优惠券、门店数量、抽奖送券、直接下单引导，你必须在视频提示词里继续遵守。",
      "本次输出至少要覆盖：business_scene、video_type、segment_brief、reference_strategy、pad_image_strategy、continuity_rules、segment_prompts、video_prompt、full_video_prompt。",
      "请仅输出 JSON 对象，不要输出 Markdown 代码块或额外解释。",
      "JSON 结构固定为：",
      "{",
      '  "business_scene": "品牌广告类/电商投放类/种草视频类/服务展示类/短剧类 之一",',
      '  "video_type": "完整故事短片/产品展示/参考视频复刻/创意特效短片/视频延长/口播/分镜图转视频/沉浸式/卡点MV 等",',
      '  "video_reasoning": "说明为什么这样设计视频",',
      '  "segment_brief": "用 2-4 句话概括视频用途、第一眼钩子、分段推进方式与结尾承接",',
      '  "reference_strategy": "参考图/产品图/参考视频在本次生成中的作用；没有则写无",',
      '  "pad_image_strategy": "是否需要垫图以及为什么；没有则写无需垫图",',
      '  "continuity_rules": ["片段连续性规则1", "片段连续性规则2"],',
      '  "video_prompt": "用于直接调用视频接口的精简提示词",',
      '  "full_video_prompt": "完整版本视频提示词",',
      '  "negative_prompt": "可选，不希望出现的内容",',
      '  "segment_prompts": ["分镜提示词1", "分镜提示词2"]',
      "}",
    ].join("\n");
    const userPrompt = ["以下是本次视频提示词输入：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                provider.requestTimeoutMs ?? 180000,
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const videoPrompt = String(parsed.video_prompt ?? parsed.videoPrompt ?? "").trim();
              const fullVideoPrompt = String(parsed.full_video_prompt ?? parsed.fullVideoPrompt ?? "").trim() || videoPrompt;
              const segmentPrompts = this.normalizeStringArray(parsed.segment_prompts ?? parsed.segmentPrompts, [], 8);
              if (!videoPrompt) {
                lastError = `${provider.provider}/${modelName} 视频提示词为空`;
                continue;
              }
              return {
                businessScene: this.readOptionalString(parsed.business_scene ?? parsed.businessScene),
                videoType: this.readOptionalString(parsed.video_type ?? parsed.videoType),
                videoReasoning: String(parsed.video_reasoning ?? parsed.videoReasoning ?? "").trim(),
                segmentBrief: this.readOptionalString(parsed.segment_brief ?? parsed.segmentBrief),
                referenceStrategy: this.readOptionalString(parsed.reference_strategy ?? parsed.referenceStrategy),
                padImageStrategy: this.readOptionalString(parsed.pad_image_strategy ?? parsed.padImageStrategy),
                continuityRules: this.normalizeStringArray(parsed.continuity_rules ?? parsed.continuityRules, [], 8),
                videoPrompt,
                fullVideoPrompt,
                negativePrompt: this.readOptionalString(parsed.negative_prompt ?? parsed.negativePrompt),
                segmentPrompts: segmentPrompts.length ? segmentPrompts : [videoPrompt],
                modelName,
              };
            } catch (error) {
              lastError = error instanceof Error ? error.message : "视频提示词生成失败";
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(`视频提示词生成失败：${lastError || "未获取到有效响应"}`);
  }

  private loadDoubaoImageAnalysisProvider() {
    const domesticContent = readFileSync(this.resolveDomesticThirdPartyApiConfigPath(), "utf8");
    const arkApiKeys = this.collectRegexMatches(domesticContent, /ark-[A-Za-z0-9-]+/g);
    if (!arkApiKeys.length) {
      throw new ServiceUnavailableException("已上传参考图，但未找到 Doubao-Seed-1.8 的可用配置");
    }
    return {
      baseUrls: ["https://ark.cn-beijing.volces.com/api/v3"],
      completionPath: "/chat/completions",
      apiKeys: arkApiKeys.slice(0, 1),
      models: ["doubao-seed-1-8-251228"],
    };
  }

  private loadImageGenerationProviders(): ImageProviderConfig[] {
    const content = readFileSync(this.resolveImageGenerationConfigPath(), "utf8");
    const baseUrls = this.collectRegexMatches(content, /https?:\/\/[^\s]+/g);
    const apiKeys = this.collectRegexMatches(content, /sk-[A-Za-z0-9]+/g);
    if (!baseUrls.length || !apiKeys.length) {
      throw new ServiceUnavailableException("未找到文生图接口配置");
    }
    return [
      {
        provider: "IMAGE_API",
        baseUrls: baseUrls.slice(0, 3),
        completionPath: "/v1/chat/completions",
        apiKeys: apiKeys.slice(0, 4),
        models: ["gpt-image-2", "nano-banana-pro-2k", "gemini-3-pro-image-preview-2k"],
        requestTimeoutMs: 240000,
      },
    ];
  }

  private resolveVideoGenerationConfigPath(backend: VideoBackendKey) {
    const fileNameMap: Record<VideoBackendKey, string> = {
      hailuo: "第三方api接口hailuo文生视频或图生视频.txt",
      kling: "第三方api接口kling文生视频或图生视频.txt",
      seedance: "第三方api接口seedance文生视频或图生视频.txt",
      veo: "第三方api接口VEO文生视频或图生视频.txt",
      wan: "第三方api接口WAN文生视频或图生视频.txt",
    };
    const fileName = fileNameMap[backend];
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), fileName),
      resolve(this.resolveOperationRoot(), fileName),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    throw new ServiceUnavailableException(`未找到 ${backend} 视频接口配置文件`);
  }

  private loadVideoProviderConfig(backend: VideoBackendKey): VideoProviderConfig {
    const content = readFileSync(this.resolveVideoGenerationConfigPath(backend), "utf8");
    const baseUrls = this.collectRegexMatches(content, /https?:\/\/[^\s)]+/g).slice(0, 3);
    const apiKeys = this.collectRegexMatches(content, /sk-[A-Za-z0-9]+/g).slice(0, 4);
    if (!baseUrls.length || !apiKeys.length) {
      throw new ServiceUnavailableException(`${backend} 视频接口配置读取失败`);
    }

    switch (backend) {
      case "hailuo":
        return {
          backend,
          baseUrls,
          apiKeys,
          createPath: "/minimax/v1/video_generation",
          queryPath: "/minimax/v1/query/video_generation",
          textCreatePath: "/minimax/v1/video_generation",
          imageCreatePath: "/minimax/v1/video_generation",
          textQueryPath: "/minimax/v1/query/video_generation",
          imageQueryPath: "/minimax/v1/query/video_generation",
          textModel: "MiniMax-Hailuo-02",
          imageModel: "I2V-01",
          fastModel: "MiniMax-Hailuo-02",
          proModel: "MiniMax-Hailuo-02",
          requestTimeoutMs: 180000,
        };
      case "kling":
        return {
          backend,
          baseUrls,
          apiKeys,
          createPath: "/kling/v1/videos/text2video",
          queryPath: "/kling/v1/images/text2video/{task_id}",
          textCreatePath: "/kling/v1/videos/text2video",
          imageCreatePath: "/kling/v1/videos/image2video",
          textQueryPath: "/kling/v1/images/text2video/{task_id}",
          imageQueryPath: "/kling/v1/images/image2video/{task_id}",
          textModel: "kling-v1-6",
          imageModel: "kling-v1-6",
          fastModel: "kling-v1-5",
          proModel: "kling-v1-6",
          requestTimeoutMs: 180000,
        };
      case "veo":
        return {
          backend,
          baseUrls,
          apiKeys,
          createPath: "/v2/videos/generations",
          queryPath: "/v2/videos/generations/{task_id}",
          textModel: "veo3.1",
          imageModel: "veo3-pro-frames",
          fastModel: "veo3.1",
          proModel: "veo3.1-pro",
          multiImageModel: "veo3.1-components",
          requestTimeoutMs: 240000,
        };
      case "wan":
        return {
          backend,
          baseUrls,
          apiKeys,
          createPath: "/v2/videos/generations",
          queryPath: "/v2/videos/generations/{task_id}",
          textModel: "wan2.5-t2v-preview",
          imageModel: "wan2.5-i2v-preview",
          requestTimeoutMs: 240000,
        };
      case "seedance":
      default:
        return {
          backend: "seedance",
          baseUrls,
          apiKeys,
          createPath: "/v2/videos/generations",
          queryPath: "/v2/videos/generations/{task_id}",
          textModel: "doubao-seedance-2-0-260128",
          imageModel: "doubao-seedance-2-0-260128",
          fastModel: "doubao-seedance-2-0-260128",
          proModel: "doubao-seedance-2-0-260128",
          requestTimeoutMs: 240000,
        };
    }
  }

  private normalizeVideoProvider(value?: string): VideoBackendKey {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/_/g, "")
      .replace(/-/g, "")
      .replace(/\./g, "");
    if (!normalized) {
      return "seedance";
    }
    if (normalized === "seedance" || normalized === "seedance20") {
      return "seedance";
    }
    if (normalized === "hailuo") {
      return "hailuo";
    }
    if (normalized === "kling") {
      return "kling";
    }
    if (normalized === "veo") {
      return "veo";
    }
    if (normalized === "wan") {
      return "wan";
    }
    throw new BadRequestException("暂不支持所选视频模型，请从 hailuo、kling、veo、wan、seedance2.0 中选择。");
  }

  private normalizeRequestedVideoDuration(value?: number) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return 10;
    }
    const normalized = Math.max(1, Math.round(value));
    return normalized;
  }

  private normalizeProviderDuration(backend: VideoBackendKey, requestedDurationSec: number) {
    const candidates = backend === "hailuo" ? [6, 10] : [5, 10];
    return candidates.reduce((best, current) =>
      Math.abs(current - requestedDurationSec) < Math.abs(best - requestedDurationSec) ? current : best,
    );
  }

  private buildVideoProviderFallbackOrder(requestedBackend: VideoBackendKey, hasReferenceImage: boolean) {
    void hasReferenceImage;
    return [requestedBackend];
  }

  private resolveVideoModelName(
    config: VideoProviderConfig,
    requestedVideoProvider: string,
    customVideoModelName?: string,
    hasReferenceImage?: boolean,
  ) {
    const customModel = customVideoModelName?.trim();
    if (customModel) {
      return customModel;
    }
    if (hasReferenceImage) {
      return config.imageModel || config.modelName || requestedVideoProvider;
    }
    return config.proModel || config.textModel || config.modelName || requestedVideoProvider;
  }

  private buildVideoCreatePayload(params: {
    config: VideoProviderConfig;
    modelName: string;
    prompt: string;
    negativePrompt?: string;
    requestedDurationSec: number;
    referenceImageUrl?: string;
  }) {
    const normalizedDuration = this.normalizeProviderDuration(params.config.backend, params.requestedDurationSec);
    const hasReferenceImage = Boolean(params.referenceImageUrl);

    switch (params.config.backend) {
      case "hailuo":
        return {
          payload: {
            model: params.modelName,
            prompt: params.prompt,
            duration: normalizedDuration,
            resolution: "768P",
            ...(hasReferenceImage ? { first_frame_image: params.referenceImageUrl } : {}),
          } as Record<string, unknown>,
          createPath: hasReferenceImage ? params.config.imageCreatePath || params.config.createPath : params.config.textCreatePath || params.config.createPath,
          queryPath: hasReferenceImage ? params.config.imageQueryPath || params.config.queryPath : params.config.textQueryPath || params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "kling":
        return {
          payload: {
            prompt: params.prompt,
            negative_prompt: params.negativePrompt,
            aspect_ratio: "9:16",
            duration: String(normalizedDuration),
            model_name: params.modelName,
            mode: "std",
            ...(hasReferenceImage ? { image: params.referenceImageUrl } : {}),
          } as Record<string, unknown>,
          createPath: hasReferenceImage ? params.config.imageCreatePath || params.config.createPath : params.config.textCreatePath || params.config.createPath,
          queryPath: hasReferenceImage ? params.config.imageQueryPath || params.config.queryPath : params.config.textQueryPath || params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "veo":
        return {
          payload: {
            prompt: params.prompt,
            model: params.modelName,
            aspect_ratio: "9:16",
            enhance_prompt: false,
            ...(hasReferenceImage ? { images: [params.referenceImageUrl] } : {}),
          } as Record<string, unknown>,
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "wan":
        return {
          payload: {
            prompt: params.prompt,
            model: params.modelName,
            duration: normalizedDuration,
            size: "720*1280",
            watermark: false,
            prompt_extend: true,
            negative_prompt: params.negativePrompt,
            ...(hasReferenceImage ? { images: [params.referenceImageUrl] } : { audio: false }),
          } as Record<string, unknown>,
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "seedance":
      default:
        return {
          payload: {
            prompt: params.prompt,
            model: params.modelName,
            duration: normalizedDuration,
            resolution: "720p",
            ratio: "9:16",
            watermark: false,
            ...(hasReferenceImage ? { images: [params.referenceImageUrl] } : {}),
          } as Record<string, unknown>,
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
    }
  }

  private async generateVideoAsset(params: {
    brandId: string;
    taskId: string;
    title: string;
    requestedVideoProvider: string;
    customVideoModelName?: string;
    prompt: string;
    negativePrompt?: string;
    requestedDurationSec: number;
    referenceImageUrl?: string;
  }): Promise<GeneratedVideoResult> {
    const requestedBackend = this.normalizeVideoProvider(params.requestedVideoProvider);
    const providerOrder = this.buildVideoProviderFallbackOrder(requestedBackend, Boolean(params.referenceImageUrl));
    const providerErrors: string[] = [];

    for (const backend of providerOrder) {
      const config = this.loadVideoProviderConfig(backend);
      const modelName = this.resolveVideoModelName(
        config,
        backend,
        backend === requestedBackend ? params.customVideoModelName : undefined,
        Boolean(params.referenceImageUrl),
      );
      const requestConfig = this.buildVideoCreatePayload({
        config,
        modelName,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        requestedDurationSec: params.requestedDurationSec,
        referenceImageUrl: params.referenceImageUrl,
      });

      const baseUrl = config.baseUrls[0];
      const apiKey = config.apiKeys[0];
      let lastError = "";
      try {
        const createResponse = await this.requestAuthorizedJson(baseUrl, requestConfig.createPath, apiKey, {
          method: "POST",
          body: requestConfig.payload,
          timeoutMs: config.requestTimeoutMs ?? 240000,
        });
        const taskId = this.extractVideoTaskId(createResponse);
        if (!taskId) {
          throw new ServiceUnavailableException(`${config.backend} 未返回任务 ID`);
        }

        const result = await this.pollVideoGenerationResult(baseUrl, apiKey, config.backend, requestConfig.queryPath, taskId, {
          fallbackDurationSec: requestConfig.renderedDurationSec,
        });
        if (!result.videoUrl) {
          throw new ServiceUnavailableException("视频任务完成，但未返回视频地址");
        }
        const cachedVideoUrl = await this.cacheRemoteGeneratedVideo(
          params.brandId,
          `${params.taskId}-video-${config.backend}.mp4`,
          result.videoUrl,
        );
        const cachedCoverImageUrl = result.coverImageUrl
          ? await this.cacheRemoteGeneratedImage(
            params.brandId,
            `${params.taskId}-video-cover-${config.backend}.png`,
            result.coverImageUrl,
            "image/png",
          )
          : undefined;
        return {
          url: cachedVideoUrl,
          coverImageUrl: cachedCoverImageUrl,
          provider: config.backend,
          modelName,
          providerTaskId: taskId,
          renderedDurationSec: result.renderedDurationSec || requestConfig.renderedDurationSec,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "视频生成失败";
      }

      if (lastError) {
        providerErrors.push(`${backend}：${lastError}`);
      }
    }

    throw new ServiceUnavailableException(`视频生成失败：${providerErrors.join("；") || "未获取到有效视频"}`);
  }

  private describeFetchError(error: unknown, requestLabel: string) {
    if (error instanceof ServiceUnavailableException) {
      return error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      return new ServiceUnavailableException(`${requestLabel} 超时`);
    }
    const topLevel = this.asRecord(error);
    const cause = this.asRecord(topLevel?.cause);
    const detail = this.readOptionalString(cause?.code)
      || this.readOptionalString(topLevel?.code)
      || this.readOptionalString(cause?.message);
    return new ServiceUnavailableException(
      `${requestLabel} 网络请求失败${detail && detail !== "fetch failed" ? `：${detail}` : ""}`,
    );
  }

  private async requestAuthorizedJson(
    baseUrl: string,
    requestPath: string,
    apiKey: string,
    options: {
      method: "GET" | "POST";
      body?: Record<string, unknown>;
      timeoutMs?: number;
    },
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60000);
    try {
      const response = await fetch(`${baseUrl}${requestPath}`, {
        method: options.method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(options.method === "POST" ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        const snippet = await this.readResponseSnippet(response);
        throw new ServiceUnavailableException(`${options.method} ${requestPath} 失败：${response.status}${snippet ? `，${snippet}` : ""}`);
      }
      return await response.json() as Record<string, unknown>;
    } catch (error) {
      throw this.describeFetchError(error, `${options.method} ${baseUrl}${requestPath}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private async pollVideoGenerationResult(
    baseUrl: string,
    apiKey: string,
    backend: VideoBackendKey,
    queryPath: string,
    taskId: string,
    options: { fallbackDurationSec?: number },
  ) {
    let lastState = "";
    let lastError = "";
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const response = await this.requestAuthorizedJson(
        baseUrl,
        this.resolveVideoQueryPath(queryPath, backend, taskId),
        apiKey,
        {
          method: "GET",
          timeoutMs: 120000,
        },
      );
      const snapshot = this.readVideoTaskSnapshot(response, backend, options.fallbackDurationSec);
      lastState = snapshot.status;
      if (snapshot.status === "SUCCESS" && snapshot.videoUrl) {
        return snapshot;
      }
      if (snapshot.status === "FAILED") {
        throw new ServiceUnavailableException(snapshot.failReason || "第三方视频生成任务失败");
      }
      if (snapshot.status === "SUCCESS" && !snapshot.videoUrl) {
        lastError = "视频任务完成，但未返回视频地址";
      } else {
        lastError = snapshot.failReason || "";
      }
      await wait(4000);
    }

    throw new ServiceUnavailableException(lastError || `视频任务长时间未完成，当前状态：${lastState || "UNKNOWN"}`);
  }

  private resolveVideoQueryPath(queryPath: string, backend: VideoBackendKey, taskId: string) {
    if (backend === "hailuo") {
      return `${queryPath}?task_id=${encodeURIComponent(taskId)}`;
    }
    return queryPath.replace("{task_id}", encodeURIComponent(taskId));
  }

  private extractVideoTaskId(payload: Record<string, unknown>) {
    return this.readOptionalString(payload.task_id)
      || this.readOptionalString(payload.id)
      || this.readOptionalString(this.asRecord(payload.data)?.task_id)
      || this.readOptionalString(this.asRecord(payload.data)?.id);
  }

  private readVideoTaskSnapshot(payload: Record<string, unknown>, backend: VideoBackendKey, fallbackDurationSec?: number) {
    const topLevelData = this.asRecord(payload.data);
    const taskStatusRaw = String(
      topLevelData?.task_status
      || payload.status
      || this.readOptionalString(topLevelData?.status)
      || "",
    ).trim();
    const normalizedStatus = this.normalizeVideoTaskStatus(taskStatusRaw);

    const directVideoUrl = this.readOptionalString(topLevelData?.output)
      || this.readOptionalString(topLevelData?.video_url)
      || this.readOptionalString(this.asRecord(topLevelData?.task_result)?.url);
    const firstVideo = Array.isArray(this.asRecord(topLevelData?.task_result)?.videos)
      ? this.asRecord((this.asRecord(topLevelData?.task_result)?.videos as unknown[])[0])
      : null;
    const videoUrl = directVideoUrl
      || this.readOptionalString(firstVideo?.url)
      || this.readOptionalString(payload.output)
      || this.readOptionalString(payload.download_url);
    const coverImageUrl = this.readOptionalString(topLevelData?.last_frame_url)
      || this.readOptionalString(topLevelData?.cover_url)
      || this.readOptionalString(payload.cover_url);
    const failReason = this.readOptionalString(payload.fail_reason)
      || this.readOptionalString(payload.message)
      || this.readOptionalString(topLevelData?.task_status_msg)
      || this.readOptionalString(this.asRecord(payload.base_resp)?.status_msg);
    const renderedDurationSec = this.parseDurationValue(
      topLevelData?.duration
      || firstVideo?.duration
      || payload.duration,
      fallbackDurationSec,
    );

    return {
      status: normalizedStatus,
      videoUrl,
      coverImageUrl,
      failReason,
      renderedDurationSec,
      backend,
    };
  }

  private normalizeVideoTaskStatus(rawStatus: string) {
    const normalized = rawStatus.toUpperCase();
    if (!normalized) {
      return "IN_PROGRESS";
    }
    if (normalized.includes("SUCCESS") || normalized.includes("SUCCEED")) {
      return "SUCCESS";
    }
    if (normalized.includes("FAIL")) {
      return "FAILED";
    }
    if (normalized.includes("NOT_START") || normalized.includes("SUBMITTED") || normalized.includes("PROCESS") || normalized.includes("PROGRESS") || normalized.includes("QUEUE")) {
      return "IN_PROGRESS";
    }
    return "IN_PROGRESS";
  }

  private parseDurationValue(value: unknown, fallback?: number) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const text = String(value ?? "").trim();
    if (!text) {
      return fallback;
    }
    const matched = text.match(/\d+/);
    if (!matched) {
      return fallback;
    }
    const duration = Number(matched[0]);
    return Number.isFinite(duration) ? duration : fallback;
  }

  private buildTextProviderPayload(
    provider: TextProviderConfig,
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
  ) {
    const payload: Record<string, unknown> = {
      model: modelName,
      stream: false,
      temperature: provider.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(provider.payloadExtras ?? {}),
    };
    payload[provider.tokenLimitField === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens"] = provider.maxTokens;
    return payload;
  }

  private buildImageGenerationPayload(modelName: string, prompt: string, referenceImageUrls: string[]) {
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: prompt,
      },
    ];
    for (const url of referenceImageUrls) {
      content.push({
        type: "image_url",
        image_url: {
          url,
        },
      });
    }
    return {
      model: modelName,
      stream: false,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    };
  }

  private extractGeneratedImagePayload(payload: Record<string, unknown>) {
    const directData = Array.isArray(payload.data) ? payload.data : [];
    for (const item of directData) {
      const record = this.asRecord(item);
      if (!record) {
        continue;
      }
      const url = this.readOptionalString(record.url);
      const base64 = this.readOptionalString(record.b64_json) || this.readOptionalString(record.base64);
      if (url || base64) {
        return {
          url,
          base64,
          extension: ".png",
          contentType: "image/png",
        };
      }
    }

    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    for (const choice of choices) {
      const message = this.asRecord(this.asRecord(choice)?.message);
      if (!message) {
        continue;
      }
      const directUrl = this.readOptionalString(message.url);
      if (directUrl) {
        return {
          url: directUrl,
          base64: undefined,
          extension: this.resolveImageExtensionFromUrl(directUrl),
          contentType: this.getContentTypeByExtension(directUrl),
        };
      }
      const content = message.content;
      if (typeof content === "string") {
        const asset = this.extractGeneratedImageFromText(content);
        if (asset) {
          return asset;
        }
      }
      if (Array.isArray(content)) {
        for (const part of content) {
          const partRecord = this.asRecord(part);
          const text = this.readOptionalString(partRecord?.text);
          if (!text) {
            continue;
          }
          const asset = this.extractGeneratedImageFromText(text);
          if (asset) {
            return asset;
          }
        }
      }
    }

    return undefined;
  }

  private extractGeneratedImageFromText(content: string) {
    const jsonCandidate = this.tryParseJson(content);
    if (jsonCandidate && typeof jsonCandidate === "object") {
      const jsonRecord = this.asRecord(jsonCandidate);
      const jsonUrl = this.readOptionalString(jsonRecord?.url);
      const jsonBase64 = this.readOptionalString(jsonRecord?.b64_json) || this.readOptionalString(jsonRecord?.base64);
      if (jsonUrl || jsonBase64) {
        return {
          url: jsonUrl,
          base64: jsonBase64,
          extension: ".png",
          contentType: "image/png",
        };
      }
    }

    const markdownImageMatch = content.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);
    const markdownLinkMatch = content.match(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/);
    const matchedUrl =
      markdownImageMatch?.[1]
      || markdownLinkMatch?.[1]
      || content.match(/https?:\/\/[^\s)"']+/)?.[0];
    if (!matchedUrl) {
      return undefined;
    }
    return {
      url: matchedUrl,
      base64: undefined,
      extension: this.resolveImageExtensionFromUrl(matchedUrl),
      contentType: this.getContentTypeByExtension(matchedUrl),
    };
  }

  private buildImagePromptWithTextPlan(
    prompt: string,
    textPlan: ImageTextPlanEntry | undefined,
    role: "COVER" | "GALLERY",
    order: number,
  ) {
    const title = this.normalizeImageTextValue(textPlan?.title, 20);
    const badges = (textPlan?.badges || []).map((item) => this.normalizeImageTextValue(item, 16)).filter(Boolean);
    const imageLabel = role === "COVER" ? "封面图" : `第${order + 1}张配图`;
    return [
      prompt.trim(),
      "",
      `补充强制要求：这是一张${imageLabel}，必须输出带清晰中文排版的社媒成品图，不能只生成纯场景摄影图。`,
      "画面必须为竖版小红书图文比例，严格按 1242x1660（宽3:高4）构图，禁止输出横图、方图或接近方图的比例。",
      title ? `画面主标题必须直接排版为：${title}` : "",
      badges.length ? `画面中还必须出现这些小标签：${badges.join("、")}` : "",
      "文字必须直接出现在画面主体版式中，清晰可读，不能只写在手写卡片、包装角落、远处招牌或模糊背景里。",
      "标题和小标签必须有明确的字号层级、颜色对比和留白，任何一项都不能省略。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private buildImagePromptCandidates(prompt: string) {
    const normalized = prompt.trim();
    const compact = normalized
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[{}[\]<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const concise = compact.length > 360 ? `${compact.slice(0, 360)}。` : compact;
    const fallback = `请根据以下中文描述生成一张高质量社媒图片：${concise}`;
    return Array.from(new Set([normalized, fallback].filter(Boolean)));
  }

  private async readResponseSnippet(response: Response) {
    try {
      const text = await response.text();
      return text.replace(/\s+/g, " ").trim().slice(0, 180);
    } catch {
      return "";
    }
  }

  private normalizeFixedImagePromptCount(imagePrompts: string[], coverPrompt: string, imageCount: number) {
    const targetGalleryCount = Math.max(imageCount - 1, 0);
    if (!targetGalleryCount) {
      return [];
    }
    const next = [...imagePrompts];
    while (next.length < targetGalleryCount) {
      next.push(`${coverPrompt}，并调整为第${next.length + 2}张配图的不同场景角度`);
    }
    return next.slice(0, targetGalleryCount);
  }

  private extractHashtagsFromContent(content: string) {
    return this.collectRegexMatches(content, /#[^\s#]+/g).map((item) => item.replace(/^#/, ""));
  }

  private parseJsonObject(content: string) {
    const parsed = this.tryParseJson(this.extractJsonObject(this.stripMarkdownCodeFence(content)));
    if (!parsed || typeof parsed !== "object") {
      throw new ServiceUnavailableException("模型未返回有效 JSON");
    }
    return parsed as Record<string, unknown>;
  }

  private tryParseJson(content: string) {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private stripMarkdownCodeFence(content: string) {
    const trimmed = content.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return fencedMatch?.[1]?.trim() || trimmed;
  }

  private extractJsonObject(content: string) {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return content.slice(start, end + 1);
    }
    return content;
  }

  private extractResponseText(payload: {
    choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>;
  }) {
    const message = payload.choices?.[0]?.message;
    const content = this.normalizeMessageContent(message?.content);
    if (content) {
      return content;
    }
    return this.normalizeMessageContent(message?.reasoning_content);
  }

  private normalizeMessageContent(content: unknown) {
    if (typeof content === "string") {
      return content.trim();
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => this.asRecord(item))
        .map((item) => {
          if (!item) {
            return "";
          }
          if (typeof item.text === "string") {
            return item.text;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n")
        .trim();
    }
    return "";
  }

  private loadThirdPartyChatConfig(filePath: string): ThirdPartyChatConfig {
    const content = readFileSync(filePath, "utf8");
    const baseUrls = this.collectRegexMatches(content, /https?:\/\/[^\s]+/g);
    const apiKeys = this.collectRegexMatches(content, /sk-[A-Za-z0-9]+/g);
    if (!baseUrls.length || !apiKeys.length) {
      throw new ServiceUnavailableException("第三方文生文接口配置读取失败");
    }
    return {
      baseUrls,
      completionPath: "/v1/chat/completions",
      apiKeys,
    };
  }

  private resolveThirdPartyApiConfigPath() {
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), "第三方api接口文生文.txt"),
      resolve(this.resolveOperationRoot(), "第三方api接口文生文.txt"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    throw new ServiceUnavailableException("未找到第三方文生文接口配置文件");
  }

  private resolveDomesticThirdPartyApiConfigPath() {
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), "第三方api接口文生文国内.txt"),
      resolve(this.resolveOperationRoot(), "第三方api接口文生文国内.txt"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    throw new ServiceUnavailableException("未找到国内第三方文生文接口配置文件");
  }

  private resolveImageGenerationConfigPath() {
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), "第三方api接口文生图或图生图.txt"),
      resolve(this.resolveOperationRoot(), "第三方api接口文生图或图生图.txt"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    throw new ServiceUnavailableException("未找到文生图接口配置文件");
  }

  private resolveAiWorkspaceRoot() {
    const candidates = [
      process.cwd(),
      resolve(process.cwd(), ".."),
      resolve(process.cwd(), "..", ".."),
      resolve(process.cwd(), "..", "..", ".."),
      resolve(process.cwd(), "..", "..", "..", ".."),
    ];
    for (const candidate of candidates) {
      if (existsSync(join(candidate, "提示词")) || existsSync(join(candidate, "第三方api接口文生文.txt"))) {
        return candidate;
      }
    }
    return resolve(process.cwd(), "..");
  }

  private resolveOperationRoot() {
    return resolve(this.resolveAiWorkspaceRoot(), "..");
  }

  private resolveWorkspaceRoot() {
    return resolve(process.cwd(), "..", "..", "..");
  }

  private extractProviderSection(content: string, startLabel: string, nextLabels: string[] = []) {
    const lines = content.split(/\r?\n/);
    const startRegex = new RegExp(`^\\s*${startLabel}\\s*[：:]`, "i");
    const nextRegex = nextLabels.length ? new RegExp(`^\\s*(?:${nextLabels.join("|")})\\s*[：:]`, "i") : null;
    let started = false;
    const section: string[] = [];
    for (const line of lines) {
      if (!started) {
        if (startRegex.test(line)) {
          started = true;
          section.push(line);
        }
        continue;
      }
      if (nextRegex?.test(line)) {
        break;
      }
      section.push(line);
    }
    return section.join("\n");
  }

  private collectRegexMatches(content: string, pattern: RegExp) {
    return [...content.matchAll(pattern)]
      .map((item) => item[0]?.trim() || "")
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  private asRecord(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private normalizeStringArray(raw: unknown, fallback: string[] = [], limit = 8) {
    const values = Array.isArray(raw)
      ? raw.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
    return (values.length ? values : fallback).slice(0, limit);
  }

  private normalizeImageTextPlan(params: {
    coverTextRaw: unknown;
    imageTextsRaw: unknown;
    noteTitle: string;
    noteContent: string;
    imageCount?: number;
  }) {
    const fallback = this.buildFallbackImageTextPlan(params.noteTitle, params.noteContent, params.imageCount);
    return {
      coverText: this.normalizeImageTextEntry(params.coverTextRaw, fallback.coverText),
      imageTexts: this.normalizeImageTextEntries(params.imageTextsRaw, fallback.imageTexts, fallback.imageTexts.length),
    };
  }

  private buildFallbackImageTextPlan(noteTitle: string, noteContent: string, imageCount?: number) {
    const hashtags = this.extractHashtagsFromContent(noteContent)
      .map((item) => item.replace(/^#/, "").trim())
      .filter(Boolean)
      .slice(0, 6);
    const paragraphs = noteContent
      .split(/\n+/)
      .map((item) => item.replace(/#[^\s#]+/g, "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const targetGalleryCount = imageCount !== undefined ? Math.max(imageCount - 1, 0) : Math.max(paragraphs.length, 2);
    const coverText: ImageTextPlanEntry = {
      title: this.normalizeImageTextValue(noteTitle, 20) || "推荐内容",
      badges: hashtags.slice(0, 2),
    };
    const imageTexts = Array.from({ length: targetGalleryCount }, (_, index) => {
      const paragraph = paragraphs[index] || paragraphs[index % Math.max(paragraphs.length, 1)] || noteTitle;
      const title = this.extractImageTextTitle(paragraph) || coverText.title || `配图${index + 1}`;
      const badgeStart = hashtags.length ? Math.min(index, Math.max(hashtags.length - 1, 0)) : 0;
      return {
        title,
        badges: hashtags.length ? hashtags.slice(badgeStart, badgeStart + 2) : [],
      } satisfies ImageTextPlanEntry;
    });
    return { coverText, imageTexts };
  }

  private normalizeImageTextEntries(raw: unknown, fallback: ImageTextPlanEntry[] = [], targetCount?: number) {
    const values = Array.isArray(raw)
      ? raw.map((item, index) => this.normalizeImageTextEntry(item, fallback[index] || fallback[fallback.length - 1]))
      : [];
    const next = values.length ? values : [...fallback];
    const resolvedTargetCount = targetCount ?? next.length;
    while (resolvedTargetCount && next.length < resolvedTargetCount) {
      next.push(
        next[next.length - 1]
          ? {
              title: next[next.length - 1].title,
              badges: [...next[next.length - 1].badges],
            }
          : { title: `配图${next.length + 1}`, badges: [] },
      );
    }
    return resolvedTargetCount ? next.slice(0, resolvedTargetCount) : next;
  }

  private normalizeImageTextEntry(raw: unknown, fallback?: ImageTextPlanEntry): ImageTextPlanEntry {
    if (typeof raw === "string") {
      return {
        title: this.normalizeImageTextValue(raw, 20) || fallback?.title || "推荐内容",
        badges: fallback?.badges || [],
      };
    }
    const record = this.asRecord(raw);
    const title = this.normalizeImageTextValue(
      this.readOptionalString(record?.title)
      || this.readOptionalString(record?.heading)
      || this.readOptionalString(record?.main_title)
      || this.readOptionalString(record?.mainTitle)
      || this.readOptionalString(record?.text)
      || fallback?.title,
      20,
    ) || "推荐内容";
    const subtitle = this.normalizeImageTextValue(
      this.readOptionalString(record?.subtitle)
      || this.readOptionalString(record?.subTitle)
      || this.readOptionalString(record?.label)
      || this.readOptionalString(record?.small_label)
      || this.readOptionalString(record?.smallLabel),
      16,
    );
    const badges = this.normalizeStringArray(
      record?.badges ?? record?.tags ?? record?.labels ?? record?.small_labels ?? record?.smallLabels,
      subtitle ? [subtitle] : (fallback?.badges || []),
      3,
    ).map((item) => this.normalizeImageTextValue(item, 16)).filter(Boolean);
    return { title, badges };
  }

  private extractImageTextTitle(content: string) {
    const firstSegment = String(content || "").split(/[。！？!?]/)[0] || content;
    return this.normalizeImageTextValue(firstSegment, 20);
  }

  private normalizeImageTextValue(value: string | undefined, maxLength: number) {
    const text = String(value || "")
      .replace(/#[^\s#]+/g, " ")
      .replace(/[“”"'`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) {
      return "";
    }
    return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
  }

  private readOptionalString(value: unknown) {
    const text = String(value ?? "").trim();
    return text || undefined;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private async requestModelCompletion(
    baseUrl: string,
    completionPath: string,
    apiKey: string,
    payload: Record<string, unknown>,
    timeoutMs = 60000,
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${baseUrl}${completionPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private toDataUrl(payload: UploadFilePayload) {
    return `data:${payload.contentType || "image/jpeg"};base64,${payload.dataBase64}`;
  }

  private getGeneratedAssetDir(brandId: string) {
    const dir = resolve(this.resolveWorkspaceRoot(), ".runtime", "generated-works", brandId);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  private writeGeneratedTextFile(brandId: string, fileName: string, content: string) {
    const dir = this.getGeneratedAssetDir(brandId);
    const target = join(dir, fileName);
    writeFileSync(target, content, "utf8");
    return {
      storageKey: `works/${brandId}/${fileName}`,
      url: `${this.resolveServerBaseUrl()}/api/works/brands/${brandId}/assets/${encodeURIComponent(fileName)}`,
    };
  }

  private writeGeneratedBinaryFile(brandId: string, fileName: string, base64: string, _contentType: string) {
    const dir = this.getGeneratedAssetDir(brandId);
    const target = join(dir, fileName);
    writeFileSync(target, Buffer.from(base64, "base64"));
    return {
      storageKey: `works/${brandId}/${fileName}`,
      url: `${this.resolveServerBaseUrl()}/api/works/brands/${brandId}/assets/${encodeURIComponent(fileName)}`,
    };
  }

  private persistUploadFile(brandId: string, fileName: string, payload: UploadFilePayload) {
    return this.writeGeneratedBinaryFile(brandId, fileName, payload.dataBase64, payload.contentType || "application/octet-stream");
  }

  private deleteGeneratedFileIfExists(brandId: string, fileName: string) {
    if (!fileName) {
      return;
    }
    const target = join(this.getGeneratedAssetDir(brandId), fileName);
    if (existsSync(target)) {
      unlinkSync(target);
    }
  }

  private extractFileName(storageKey: string) {
    const parts = storageKey.split("/").filter(Boolean);
    return parts[parts.length - 1] || storageKey;
  }

  private resolveExtensionFromFileName(fileName: string, fallback = ".bin") {
    const extension = extname(fileName || "").toLowerCase();
    return extension || fallback;
  }

  private resolveImageExtensionFromMimeType(mimeType: string, fallbackFileName = "") {
    const normalized = String(mimeType || "").toLowerCase();
    if (normalized.includes("jpeg") || normalized.includes("jpg")) {
      return ".jpg";
    }
    if (normalized.includes("webp")) {
      return ".webp";
    }
    if (normalized.includes("gif")) {
      return ".gif";
    }
    if (normalized.includes("png")) {
      return ".png";
    }
    return this.resolveExtensionFromFileName(fallbackFileName, ".png");
  }

  private resolveVideoExtensionFromMimeType(mimeType: string, fallbackFileName = "") {
    const normalized = String(mimeType || "").toLowerCase();
    if (normalized.includes("webm")) {
      return ".webm";
    }
    if (normalized.includes("quicktime") || normalized.includes("mov")) {
      return ".mov";
    }
    if (normalized.includes("mp4")) {
      return ".mp4";
    }
    return this.resolveExtensionFromFileName(fallbackFileName, ".mp4");
  }

  private async cacheRemoteGeneratedVideo(brandId: string, fileName: string, remoteUrl: string) {
    return this.cacheRemoteGeneratedFile({
      brandId,
      fileName,
      remoteUrl,
      fallbackContentType: "video/mp4",
      resolveExtension: (contentType, nextFileName) => this.resolveVideoExtensionFromMimeType(contentType, nextFileName),
      requestLabel: `下载远程生成视频 ${remoteUrl}`,
    });
  }

  private async normalizeGeneratedImageBuffer(buffer: Buffer, contentType: string, fileName: string) {
    const normalizedType = String(contentType || "").toLowerCase();
    const fileExtension = extname(fileName).toLowerCase();
    if (
      !normalizedType.startsWith("image/")
      || normalizedType.includes("gif")
      || normalizedType.includes("svg")
      || fileExtension === ".gif"
      || fileExtension === ".svg"
    ) {
      return buffer;
    }

    try {
      const { default: sharp } = await import("sharp");
      const targetWidth = 1242;
      const targetHeight = 1660;
      const image = sharp(buffer, { animated: false, failOn: "none" }).rotate();
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) {
        return buffer;
      }

      let pipeline = image.resize({
        width: targetWidth,
        height: targetHeight,
        fit: "cover",
        position: "centre",
      });

      if (normalizedType.includes("jpeg") || normalizedType.includes("jpg") || fileExtension === ".jpg" || fileExtension === ".jpeg") {
        pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
      } else if (normalizedType.includes("webp") || fileExtension === ".webp") {
        pipeline = pipeline.webp({ quality: 92 });
      } else {
        pipeline = pipeline.png();
      }

      return await pipeline.toBuffer();
    } catch {
      return buffer;
    }
  }

  private async cacheRemoteGeneratedFile(params: {
    brandId: string;
    fileName: string;
    remoteUrl: string;
    fallbackContentType: string;
    resolveExtension: (contentType: string, fileName: string) => string;
    requestLabel: string;
    normalizeImageAspectRatio?: boolean;
  }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(params.remoteUrl, {
        method: "GET",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ServiceUnavailableException(`${params.requestLabel}失败：${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || params.fallbackContentType;
      const extension = params.resolveExtension(contentType, params.fileName);
      const targetName = params.fileName.endsWith(extension)
        ? params.fileName
        : `${params.fileName.replace(/\.[^.]+$/, "")}${extension}`;
      const normalizedBuffer = params.normalizeImageAspectRatio
        ? await this.normalizeGeneratedImageBuffer(buffer, contentType, targetName)
        : buffer;
      return this.writeGeneratedBinaryFile(params.brandId, targetName, normalizedBuffer.toString("base64"), contentType).url;
    } catch (error) {
      throw this.describeFetchError(error, params.requestLabel);
    } finally {
      clearTimeout(timer);
    }
  }

  private extractLocalAssetFileName(url: string, brandId: string) {
    const expectedPrefix = `${this.resolveServerBaseUrl()}/api/works/brands/${brandId}/assets/`;
    if (!url.startsWith(expectedPrefix)) {
      return "";
    }
    return decodeURIComponent(url.slice(expectedPrefix.length));
  }

  private resolveServerBaseUrl() {
    return this.appConfigService.getServerBaseUrl();
  }

  private toStorageKeyFromUrl(url: string) {
    const serverBaseUrl = this.resolveServerBaseUrl();
    if (url.startsWith(serverBaseUrl)) {
      const relative = url.replace(`${serverBaseUrl}/api/works/brands/`, "");
      const [brandId = "", rest = ""] = relative.split("/assets/");
      if (brandId && rest) {
        return `works/${brandId}/${decodeURIComponent(rest)}`;
      }
    }
    return url;
  }

  private getContentTypeByExtension(fileName: string) {
    const extension = extname(fileName).toLowerCase();
    switch (extension) {
      case ".mp4":
        return "video/mp4";
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      case ".webp":
        return "image/webp";
      case ".gif":
        return "image/gif";
      case ".html":
        return "text/html; charset=utf-8";
      default:
        return "image/jpeg";
    }
  }

  private resolveImageExtensionFromUrl(url: string) {
    const extension = extname(url.split("?")[0] || "").toLowerCase();
    return extension || ".png";
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function targetTaskStatus(item: { taskId?: string | null }) {
  const task = database.tasks.find((entry) => entry.id === item.taskId);
  return task?.taskStatus;
}

function mergeWorkImageUrls(coverImageUrl: string | undefined, imageUrls: string[]) {
  return Array.from(new Set([coverImageUrl, ...imageUrls].filter((item): item is string => Boolean(item))));
}

function normalizeMaybeDate(value: string | Date | undefined | null) {
  if (!value) {
    return undefined;
  }
  return typeof value === "string" ? value : value.toISOString();
}
