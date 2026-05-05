import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { MediaType, TaskStatus, type Prisma } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";
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

type WorkTaskStatus = "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";

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

type OriginalCopyModelResult = {
  title: string;
  content: string;
  hashtags: string[];
  modelName: string;
};

type OriginalImagePromptResult = {
  coverPrompt: string;
  imagePrompts: string[];
  modelName: string;
};

type GeneratedImageResult = {
  url: string;
  modelName: string;
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

@Injectable()
export class WorksService {
  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(BrandsService)
    private readonly brandsService: BrandsService,
    @Inject(CollectorsService)
    private readonly collectorsService: CollectorsService,
    @Inject(ReportsService)
    private readonly reportsService: ReportsService,
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

  async generateXiaohongshuOriginalNote(brandId: string, payload: GenerateXiaohongshuOriginalNotePayload) {
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

    const userId = await this.getBrandOwnerUserId(brandId);
    const taskTitle = `生成小红书原创笔记：${selectedCalendarItem?.topicName || payload.customTopicName?.trim() || "自定义选题"}`;
    const task = await this.createOriginalTask({
      userId,
      brandId,
      taskTitle,
    });

    try {
      await this.markTaskRunning(task.id);

      const referenceFiles = this.normalizeReferenceFiles(payload);
      const referenceStyles = referenceFiles.length
        ? await this.analyzeReferenceImages(referenceFiles, latestMarketingPlan.reportMarkdown)
        : { coverReferenceStyle: undefined, galleryReferenceStyles: [], modelName: undefined };

      const copyResult = await this.generateOriginalCopy({
        marketingPlanMarkdown: latestMarketingPlan.reportMarkdown,
        selectedCalendarItem,
        customTopicName: payload.customTopicName?.trim(),
        product: normalizedProduct,
        additionalInstruction: payload.additionalInstruction?.trim(),
      });

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

      const coverImage = await this.generateImageAsset({
        brandId,
        taskId: task.id,
        title: `原创笔记封面 - ${copyResult.title}`,
        role: "COVER",
        order: 0,
        prompt: imagePromptResult.coverPrompt,
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
            referenceImageUrls: this.collectImageReferenceUrls(selectedProduct),
          }),
        ),
      );

      const now = new Date().toISOString();
      const htmlContent = this.renderOriginalNoteHtml({
        title: copyResult.title,
        content: copyResult.content,
        hashtags: copyResult.hashtags,
        coverImageUrl: coverImage.url,
        imageUrls: galleryImages.map((item) => item.url),
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
        coverPrompt: imagePromptResult.coverPrompt,
        imagePrompts: imagePromptResult.imagePrompts,
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
        userId,
        brandId,
        taskId: task.id,
        workId: workMedia.id,
        title: `原创笔记封面 - ${copyResult.title}`,
        sourceUrl: coverImage.url,
        role: "COVER",
        order: 0,
        prompt: imagePromptResult.coverPrompt,
      });

      const galleryMedia = await Promise.all(
        galleryImages.map((item, index) =>
          this.createWorkImageMedia({
            userId,
            brandId,
            taskId: task.id,
            workId: workMedia.id,
            title: `原创笔记配图${index + 1} - ${copyResult.title}`,
            sourceUrl: item.url,
            role: "GALLERY",
            order: index + 1,
            prompt: imagePromptResult.imagePrompts[index] || item.prompt,
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
      await this.markTaskSuccess(task.id, {
        workId: workMedia.id,
        title: copyResult.title,
        imageCount: 1 + galleryImages.length,
      });

      return {
        item: this.mapOriginalWorkRecord(workMedia.id, brandId, task.id, updatedMetadata, "SUCCESS"),
      };
    } catch (error) {
      await this.markTaskFailed(task.id, error instanceof Error ? error.message : "原创笔记生成失败");
      throw error;
    }
  }

  async updateXiaohongshuOriginalNote(brandId: string, workId: string, payload: UpdateXiaohongshuOriginalNotePayload) {
    const target = await this.getOriginalWorkRowById(brandId, workId);
    const meta = this.readOriginalWorkMeta(this.getMediaMetadata(target));
    const nextTitle = payload.title?.trim() || meta.title;
    const nextContent = payload.content?.trim() || meta.content;
    const nextHtmlContent = this.renderOriginalNoteHtml({
      title: nextTitle,
      content: nextContent,
      hashtags: meta.hashtags,
      coverImageUrl: meta.coverImageUrl,
      imageUrls: meta.imageUrls,
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
    const skillPrompt = this.loadOriginalCopyPrompt();
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
    const skillPrompt = this.loadOriginalImagePrompt();
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
      "请仅输出 JSON 对象，不要输出 Markdown 代码块或额外解释。",
      "{",
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
    referenceImageUrls: string[];
  }) {
    const providers = this.loadImageGenerationProviders();
    let lastError = "";
    const promptsToTry = this.buildImagePromptCandidates(params.prompt);

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
                const finalUrl = asset.url
                  || (asset.base64
                    ? this.writeGeneratedBinaryFile(params.brandId, fileName, asset.base64, asset.contentType).url
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

  private async markTaskRunning(taskId: string) {
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

  private async markTaskSuccess(taskId: string, outputJson: Record<string, unknown>) {
    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: TaskStatus.SUCCESS,
          finishedAt: new Date(),
          outputJson: outputJson as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId);
    if (task) {
      task.taskStatus = "SUCCESS";
      task.finishedAt = new Date().toISOString();
      task.outputJson = outputJson;
      task.updatedAt = new Date().toISOString();
    }
  }

  private async markTaskFailed(taskId: string, errorMessage: string) {
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
    metadata: OriginalWorkAssetMeta;
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
    const metadata: OriginalImageAssetMeta = {
      kind: "XHS_ORIGINAL_NOTE_IMAGE",
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

  private async updateWorkHtmlMetadata(
    workId: string,
    brandId: string,
    metadata: OriginalWorkAssetMeta,
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

  private renderOriginalNoteHtml(params: {
    title: string;
    content: string;
    hashtags: string[];
    coverImageUrl?: string;
    imageUrls: string[];
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
      `<div style="color:#63708a;font-size:13px;margin-bottom:18px;">原创图文笔记</div>`,
      paragraphs,
      tags,
      gallery,
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
      coverPrompt: String(meta.coverPrompt ?? "").trim(),
      imagePrompts: this.normalizeStringArray(meta.imagePrompts, [], 12),
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

  private getMediaMetadata(item: { metadataJson?: unknown }) {
    return item.metadataJson;
  }

  private loadOriginalCopyPrompt() {
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

  private loadOriginalImagePrompt() {
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

  private resolveServerBaseUrl() {
    return process.env.API_PUBLIC_BASE_URL
      || process.env.WEB_API_BASE_URL
      || `http://localhost:${Number(process.env.PORT || 3011)}`;
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

function targetTaskStatus(item: { taskId?: string | null }) {
  const task = database.tasks.find((entry) => entry.id === item.taskId);
  return task?.taskStatus;
}
