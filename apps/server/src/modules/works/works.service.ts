import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { BadRequestException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { MediaType, TaskStatus, type Prisma } from "@prisma/client";
import { createId, database, type ApiProviderRecord } from "../../common/mock-data";
import { XHS_IMAGE_ANALYSIS_PROMPT_FALLBACK } from "../../common/prompt-fallbacks";
import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { OssStorageService } from "../../storage/oss-storage.service";
import { ApiProvidersService } from "../admin/api-providers.service";
import { SkillsPromptsService } from "../admin/skills-prompts.service";
import type { RequestAuthContext } from "../auth/auth.service";
import { BrandsService } from "../brands/brands.service";
import { CollectorsService } from "../collectors/collectors.service";
import { ReportsService, type XiaohongshuMarketingCalendarRecord } from "../reports/reports.service";
import { ThirdPartyPlatformsService } from "../third-party-platforms/third-party-platforms.service";
import { XHS_ORIGINAL_REFERENCE_TEMPLATE_LIBRARY } from "./xhs-original-reference-templates.generated";

const TEXT_MODEL_ATTEMPT_TIMEOUT_MS = 120 * 1000;
const IMAGE_MODEL_ATTEMPT_TIMEOUT_MS = 180 * 1000;
const VIDEO_STAGE_MODEL_ATTEMPT_TIMEOUT_MS = 300 * 1000;
const IMAGE_TASK_QUERY_TIMEOUT_MS = 20 * 1000;
const IMAGE_TASK_POLL_INTERVAL_MS = 15 * 1000;
const IMAGE_TASK_TOTAL_TIMEOUT_MS = 20 * 60 * 1000;
const IMAGE_RESULT_FETCH_TIMEOUT_MS = 30 * 1000;
const VIDEO_TASK_QUERY_TIMEOUT_MS = 20 * 1000;
const VIDEO_TASK_TOTAL_TIMEOUT_MS = 20 * 60 * 1000;

type UploadFilePayload = {
  fileName: string;
  contentType: string;
  dataBase64: string;
};

type OriginalAccountRole = "BRAND" | "STAFF" | "TALENT";
export type VideoNoteKind = "BRAND_PROMO" | "SPOKEN_SELLING" | "SKIT_SELLING" | "REMIX";
type VideoWorkflowStage =
  | "QUEUED"
  | "GENERATING_SCRIPT"
  | "GENERATING_STORYBOARD"
  | "WAITING_VIDEO"
  | "GENERATING_VIDEO"
  | "SUCCESS"
  | "FAILED";

export type GenerateXiaohongshuOriginalNotePayload = {
  calendarItemId?: string;
  customTopicName?: string;
  productId?: string;
  accountRole?: OriginalAccountRole;
  imageCount?: number;
  includeMarketingPlan?: boolean;
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
  accountRole?: OriginalAccountRole;
  includeMarketingPlan?: boolean;
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
  materialId?: string;
  accountRole?: OriginalAccountRole;
  referenceImage?: UploadFilePayload;
  videoKind?: VideoNoteKind;
  copyAdditionalInstruction?: string;
  videoProvider?: string;
  customVideoModelName?: string;
  storyboardImageModel?: string;
  durationSec?: number;
  includeMarketingPlan?: boolean;
  videoAdditionalInstruction?: string;
};

export type UpdateXiaohongshuVideoNotePayload = {
  title?: string;
  content?: string;
  storyboardPrompt?: string;
};

export type RegenerateXiaohongshuVideoStoryboardPayload = {
  storyboardPrompt?: string;
};

export type ContinueXiaohongshuVideoGenerationPayload = {
  customVideoModelName?: string;
};

export type RecoverXiaohongshuVideoGenerationPayload = {
  workId?: string;
  providerTaskId?: string;
  requestedVideoProvider?: string;
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
  accountRole: OriginalAccountRole;
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
  includeMarketingPlan: boolean;
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
  accountRole: OriginalAccountRole;
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
  includeMarketingPlan: boolean;
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

type VideoStoryboardRevisionEntry = {
  taskId: string;
  prompt: string;
  imageUrl?: string;
  createdAt: string;
};

type VideoProgressStepEntry = {
  key: "SCRIPT" | "STORYBOARD" | "VIDEO";
  label: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
};

type ResolvedVideoComposerContext = {
  accountRole: OriginalAccountRole;
  videoKind: VideoNoteKind;
  selectedCalendarItem?: XiaohongshuMarketingCalendarRecord["items"][number];
  customTopicName?: string;
  topicLabel: string;
  product?: {
    id: string;
    productName: string;
    detailDescription: string;
    usageScenario: string;
    targetAudience: string;
    differentiators: string;
    imageUrl?: string;
  };
  material?: {
    id: string;
    title: string;
    description?: string;
    noteUrl?: string;
    sourceUrl?: string;
    videoUrl: string;
  };
  referenceImageUrl?: string;
  includeMarketingPlan: boolean;
  marketingPlanMarkdown: string;
  requestedVideoProvider: string;
  requestedDurationSec: number;
  requestedStoryboardImageModel?: string;
  copyAdditionalInstruction?: string;
  videoAdditionalInstruction?: string;
};

type VideoScriptStageResult = {
  title: string;
  content: string;
  hashtags: string[];
  creativeScript: string;
  modelName: string;
  businessScene?: string;
  videoType?: string;
};

type VideoWorkAssetMeta = {
  kind: "XHS_VIDEO_NOTE";
  taskId: string;
  noteCategory: "原创";
  noteType: "视频";
  accountRole: OriginalAccountRole;
  videoKind: VideoNoteKind;
  workflowStage: VideoWorkflowStage;
  title: string;
  content: string;
  htmlContent: string;
  hashtags: string[];
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  materialId?: string;
  materialTitle?: string;
  materialVideoUrl?: string;
  referenceImageUrl?: string;
  storyboardImageUrl?: string;
  copyAdditionalInstruction?: string;
  videoAdditionalInstruction?: string;
  includeMarketingPlan: boolean;
  requestedVideoProvider: string;
  resolvedVideoProvider: string;
  resolvedVideoModel?: string;
  requestedStoryboardImageModel?: string;
  requestedDurationSec: number;
  renderedDurationSec?: number;
  scriptModel?: string;
  storyboardPromptModel?: string;
  storyboardImageModel?: string;
  storyboardImageProvider?: string;
  storyboardImageProviderHost?: string;
  storyboardImageProviderTaskId?: string;
  videoPrompt?: string;
  fullVideoPrompt?: string;
  storyboardPrompt?: string;
  creativeScript?: string;
  progressSteps?: VideoProgressStepEntry[];
  storyboardRevisions?: VideoStoryboardRevisionEntry[];
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
  thirdPartyStatus?: string;
  thirdPartyStatusLabel?: string;
  thirdPartyStatusDetail?: string;
  thirdPartyRawStatus?: string;
  thirdPartyStatusUpdatedAt?: string;
  videoProviderErrors?: string[];
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

type StoryboardImageModelOptionRecord = {
  selectionKey: string;
  label: string;
  providerName: string;
  modelName: string;
  recommended: boolean;
  displayOrder: number;
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

type XhsOriginalReferenceTemplateCategoryRecord = {
  id: string;
  label: string;
  count: number;
};

type XhsOriginalReferenceTemplateRecord = {
  id: string;
  title: string;
  order: number;
  categoryId: string;
  categoryLabel: string;
  fileName: string;
  sourcePath: string;
  assetUrl: string;
};

export type XiaohongshuOriginalWorkRecord = {
  id: string;
  taskId: string;
  brandId?: string;
  accountRole: OriginalAccountRole;
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
  includeMarketingPlan: boolean;
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
  accountRole: OriginalAccountRole;
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
  includeMarketingPlan: boolean;
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
  providerTaskId?: string;
  thirdPartyStatus?: string;
  thirdPartyStatusLabel?: string;
  thirdPartyStatusDetail?: string;
  thirdPartyRawStatus?: string;
  thirdPartyStatusUpdatedAt?: string;
  videoProviderErrors?: string[];
  accountRole: OriginalAccountRole;
  videoKind: VideoNoteKind;
  workflowStage: VideoWorkflowStage;
  title: string;
  content: string;
  coverImageUrl?: string;
  storyboardImageUrl?: string;
  videoUrl?: string;
  noteCategory: "原创";
  noteType: "视频";
  calendarItemId?: string;
  calendarLabel?: string;
  customTopicName?: string;
  productId?: string;
  productName?: string;
  materialId?: string;
  materialTitle?: string;
  materialVideoUrl?: string;
  referenceImageUrl?: string;
  copyAdditionalInstruction?: string;
  videoAdditionalInstruction?: string;
  includeMarketingPlan: boolean;
  requestedVideoProvider: string;
  resolvedVideoProvider: string;
  resolvedVideoModel?: string;
  requestedDurationSec: number;
  renderedDurationSec?: number;
  creativeScript?: string;
  storyboardPrompt?: string;
  progressSteps: VideoProgressStepEntry[];
  storyboardRevisions: VideoStoryboardRevisionEntry[];
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

type VideoProviderTaskSnapshot = {
  provider: string;
  modelName: string;
  providerTaskId: string;
  renderedDurationSec?: number;
};

type VideoProviderQuerySnapshot = VideoProviderTaskSnapshot & {
  status: "SUCCESS" | "FAILED" | "IN_PROGRESS";
  rawStatus?: string;
  videoUrl?: string;
  coverImageUrl?: string;
  failReason?: string;
  checkedAt: string;
};

type VideoProviderAttemptFailureSnapshot = VideoProviderTaskSnapshot & {
  attemptLabel: string;
  message: string;
  disposition: "retryable" | "hard";
  willFallback: boolean;
};

type ThirdPartyChatConfig = {
  baseUrls: string[];
  completionPath: string;
  apiKeys: string[];
};

type TextProviderConfig = ThirdPartyChatConfig & {
  provider: "THIRD_PARTY" | "DEEPSEEK" | "KIMI" | "ARK";
  providerId?: string;
  providerName?: string;
  models: string[];
  temperature: number;
  maxTokens: number;
  requestTimeoutMs?: number;
  payloadExtras?: Record<string, unknown>;
  tokenLimitField?: "max_tokens" | "max_completion_tokens";
};

type SkillModelPreference = {
  preferredModelName: string;
  configuredModels: string[];
  preferredProviderIds: string[];
};

type ImagePromptMode = "social_graphic" | "video_storyboard";

type ImageProviderConfig = ThirdPartyChatConfig & {
  provider: "IMAGE_API";
  providerId: string;
  providerName: string;
  models: string[];
  requestMode: "chat-completions" | "images-generations" | "apiz-task";
  supportsTextToImage: boolean;
  supportsReferenceImages: boolean;
  requiresReferenceImages: boolean;
  createPath?: string;
  queryPath?: string;
  queryMethod?: "GET" | "POST";
  queryBodyMode?: "taskId-json" | "task_id-json";
  requestTimeoutMs?: number;
};

type ImageGenerationRuntimeConfig = {
  providers: ImageProviderConfig[];
  executionPrompt: string;
  preferredModelName: string;
};

type VideoBackendKey = string;

type VideoProviderConfig = {
  backend: VideoBackendKey;
  providerId: string;
  providerName: string;
  displayLabel: string;
  baseUrls: string[];
  apiKeys: string[];
  createPath: string;
  queryPath: string;
  queryMethod: "GET" | "POST";
  queryBodyMode?: "taskId-json" | "task_id-json";
  requestProfile?: string;
  taskModel?: string;
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
  durationOptions: number[];
  requestTimeoutMs?: number;
  pollMaxAttempts?: number;
  pollIntervalMs?: number;
  minimumPollWindowMs?: number;
};

export type VideoProviderOptionRecord = {
  backendKey: VideoBackendKey;
  label: string;
  providerName: string;
  defaultModel: string;
  recommended: boolean;
  supportsTextToVideo: boolean;
  supportsImageToVideo: boolean;
  displayOrder: number;
};

type VideoProviderExecutionCandidate = {
  backend: VideoBackendKey;
  label: string;
  useReferenceImage: boolean;
};

type VideoProviderFailureDisposition = "hard" | "retryable";

@Injectable()
export class WorksService {
  constructor(
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
    @Inject(OssStorageService)
    private readonly ossStorageService: OssStorageService,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(BrandsService)
    private readonly brandsService: BrandsService,
    @Inject(CollectorsService)
    private readonly collectorsService: CollectorsService,
    @Inject(ReportsService)
    private readonly reportsService: ReportsService,
    @Inject(ApiProvidersService)
    private readonly apiProvidersService: ApiProvidersService,
    @Inject(SkillsPromptsService)
    private readonly skillsPromptsService: SkillsPromptsService,
    @Inject(ThirdPartyPlatformsService)
    private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService,
  ) {}

  private async resolveBrandAwareApiKeys(
    brandId: string | undefined,
    provider: ApiProviderRecord | undefined,
    options?: { sceneLabel?: string },
  ) {
    if (!provider) {
      return [];
    }
    const configuredBaseUrls = this.apiProvidersService.getBaseUrls(provider);
    const configuredPlatformBaseUrls = Array.from(
      new Set([
        ...configuredBaseUrls,
        ...this.apiProvidersService.getStringArrayExtra(provider, "platformBaseUrls"),
      ]),
    );
    const fallbackApiKeys = this.apiProvidersService.getApiKeys(provider);
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(
      brandId,
      configuredPlatformBaseUrls,
    );
    if (resolution.status === "owner-api-key-missing") {
      const prefix = options?.sceneLabel ? `${options.sceneLabel} Provider 已激活，但` : "";
      throw new ServiceUnavailableException(
        `${prefix}当前品牌的 Owner 尚未配置第三方平台「${resolution.platform.name}」API Key，请先前往个人中心-第三方接口配置完成设置后再试。`,
      );
    }
    if (resolution.status === "no-platform-match" && !fallbackApiKeys.length) {
      const firstBaseUrl = configuredPlatformBaseUrls[0] || configuredBaseUrls[0] || provider.baseUrl || "";
      throw new ServiceUnavailableException(
        `当前品牌未匹配到第三方平台配置，请检查个人中心中的平台 baseUrl 是否与运行时地址同域：${firstBaseUrl || "未配置运行时地址"}`,
      );
    }
    if (resolution.status === "resolved") {
      return resolution.apiKeys;
    }
    return fallbackApiKeys;
  }

  async listXiaohongshuVideoProviderOptions() {
    const providers = await this.apiProvidersService.listActiveProvidersByRuntimeKey("video-generation");
    const items = providers
      .map((item) => {
        const backendKey = this.parseVideoBackendKey(this.apiProvidersService.getStringExtra(item, "backendKey"));
        if (!backendKey) {
          return null;
        }
        return {
          backendKey,
          label: this.apiProvidersService.getStringExtra(item, "displayLabel") || item.name,
          providerName: this.resolveVideoProviderPlatformName(item.name, item.baseUrl),
          defaultModel: item.defaultModel || item.modelWhitelist[0] || "",
          recommended: this.apiProvidersService.getBooleanExtra(item, "recommended"),
          supportsTextToVideo: item.extraParams?.supportsTextToVideo !== false,
          supportsImageToVideo: item.extraParams?.supportsImageToVideo !== false,
          displayOrder: this.apiProvidersService.getNumberExtra(item, "displayOrder") ?? Number.MAX_SAFE_INTEGER,
        } satisfies VideoProviderOptionRecord;
      })
      .filter((item): item is VideoProviderOptionRecord => Boolean(item))
      .sort((left, right) => {
        if (left.displayOrder !== right.displayOrder) {
          return left.displayOrder - right.displayOrder;
        }
        return left.label.localeCompare(right.label, "zh-CN");
      });

    return { items };
  }

  async listXiaohongshuVideoStoryboardImageOptions() {
    const providers = await this.apiProvidersService.listActiveProvidersByRuntimeKey("image-generation");
    const items = providers
      .filter((provider) => this.supportsStoryboardTextOnlyImageGeneration(provider))
      .flatMap((provider) => {
        const displayOrder = this.apiProvidersService.getNumberExtra(provider, "displayOrder") ?? Number.MAX_SAFE_INTEGER;
        const models = this.pickProviderModels(
          provider.modelWhitelist,
          provider.defaultModel ? [provider.defaultModel] : [],
          provider.modelWhitelist,
        );
        return models.map((modelName, index) => ({
          selectionKey: `${provider.id}::${modelName}`,
          label: `${provider.name} · ${modelName}`,
          providerName: provider.name,
          modelName,
          recommended: index === 0,
          displayOrder,
        } satisfies StoryboardImageModelOptionRecord));
      })
      .sort((left, right) => {
        if (left.displayOrder !== right.displayOrder) {
          return left.displayOrder - right.displayOrder;
        }
        if (left.providerName !== right.providerName) {
          return left.providerName.localeCompare(right.providerName, "zh-CN");
        }
        return left.modelName.localeCompare(right.modelName, "zh-CN");
      });
    return { items };
  }

  private resolveVideoProviderPlatformName(name: string, baseUrl?: string | null) {
    const normalizedName = name.trim();
    if (normalizedName.includes("·")) {
      return normalizedName.split("·")[0]?.trim() || "未知平台";
    }
    if (baseUrl) {
      try {
        return new URL(baseUrl).hostname;
      } catch {
        return baseUrl;
      }
    }
    return "未知平台";
  }

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

  async listXiaohongshuOriginalReferenceTemplates() {
    const categories: XhsOriginalReferenceTemplateCategoryRecord[] = XHS_ORIGINAL_REFERENCE_TEMPLATE_LIBRARY.categories.map((item) => ({
      id: item.id,
      label: item.label,
      count: item.count,
    }));
    const items: XhsOriginalReferenceTemplateRecord[] = XHS_ORIGINAL_REFERENCE_TEMPLATE_LIBRARY.items.map((item) => ({
      id: item.id,
      title: item.title,
      order: item.order,
      categoryId: item.categoryId,
      categoryLabel: item.categoryLabel,
      fileName: item.fileName,
      sourcePath: item.sourcePath,
      assetUrl: this.resolveOriginalReferenceTemplateAssetUrl(item.id),
    }));
    return {
      generatedAt: XHS_ORIGINAL_REFERENCE_TEMPLATE_LIBRARY.generatedAt,
      storageMode: XHS_ORIGINAL_REFERENCE_TEMPLATE_LIBRARY.storageMode,
      categories,
      items,
    };
  }

  async getXiaohongshuOriginalReferenceTemplateAsset(templateId: string) {
    const template = this.findOriginalReferenceTemplateById(templateId);
    const file = await this.ossStorageService.getObject(template.storageKey);
    if (!file) {
      throw new NotFoundException("原创参考模板不存在或尚未导入存储");
    }
    return {
      ...file,
      fileName: template.fileName,
    };
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
    collaboratorRole: "ADMIN" | "STAFF" | "TALENT" = "ADMIN",
  ) {
    const archive = await this.brandsService.getArchive(brandId);
    const includeMarketingPlan = payload.includeMarketingPlan !== false;
    const marketingPlanWorkspace = await this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
    const latestMarketingPlan = marketingPlanWorkspace.latest;
    if (includeMarketingPlan && !latestMarketingPlan) {
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
    const resolvedAccountRole = this.resolveOriginalAccountRole(payload.accountRole, collaboratorRole);
    const taskTitle = `生成小红书原创笔记：${selectedCalendarItem?.topicName || payload.customTopicName?.trim() || "自定义选题"}`;
    const originalCopyPreference = await this.loadSkillModelPreference(
      "original_copy",
      "prompt_xhs_original_copy",
      ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"],
    );
    const originalCopyProviders = await this.loadOriginalCopyProviders(brandId, originalCopyPreference);
    const task = await this.createOriginalTask({
      userId,
      brandId,
      taskTitle,
      modelName: originalCopyProviders[0]?.models[0] || originalCopyPreference.preferredModelName,
    });
    const originalMarketingPlanMarkdown = includeMarketingPlan ? latestMarketingPlan?.reportMarkdown || "" : "";

    try {
      await this.markTaskRunning(task.id);
      await this.ensureTaskNotCancelled(task.id);
      await this.updateTaskOutputJson(task.id, { stage: "PREPARING_REFERENCES", title: taskTitle });

      const referenceFiles = this.normalizeReferenceFiles(payload);
      const referenceStyles = referenceFiles.length
        ? await this.analyzeReferenceImages(referenceFiles, originalMarketingPlanMarkdown, brandId)
        : { coverReferenceStyle: undefined, galleryReferenceStyles: [], modelName: undefined };
      await this.ensureTaskNotCancelled(task.id);
      await this.updateTaskOutputJson(task.id, { stage: "GENERATING_COPY", title: taskTitle });

      const copyResult = await this.generateOriginalCopy({
        brandId,
        accountRole: resolvedAccountRole,
        marketingPlanMarkdown: originalMarketingPlanMarkdown,
        selectedCalendarItem,
        customTopicName: payload.customTopicName?.trim(),
        product: normalizedProduct,
        includeMarketingPlan,
        additionalInstruction: payload.additionalInstruction?.trim(),
      });
      await this.ensureTaskNotCancelled(task.id);
      await this.updateTaskOutputJson(task.id, {
        stage: "GENERATING_IMAGE_PROMPTS",
        title: copyResult.title,
        copyModel: copyResult.modelName,
      });

      const imagePromptResult = await this.generateOriginalImagePrompts({
        brandId,
        accountRole: resolvedAccountRole,
        marketingPlanMarkdown: originalMarketingPlanMarkdown,
        selectedCalendarItem,
        customTopicName: payload.customTopicName?.trim(),
        product: normalizedProduct,
        includeMarketingPlan,
        additionalInstruction: payload.additionalInstruction?.trim(),
        imageCount: payload.imageCount,
        noteTitle: copyResult.title,
        noteContent: copyResult.content,
        referenceStyles,
      });
      await this.ensureTaskNotCancelled(task.id);
      await this.updateTaskOutputJson(task.id, {
        stage: "GENERATING_IMAGES",
        title: copyResult.title,
        copyModel: copyResult.modelName,
        imagePromptModel: imagePromptResult.modelName,
      });

      const originalImageGenerationConfig = await this.loadImageGenerationExecutionConfig({
        brandId,
        skillSlug: "xhs-original-image-generation",
        promptId: "prompt_xhs_original_image_generation",
        fallbackModels: ["gpt-image-2", "gpt-image-2-vip", "nano-banana-2"],
      });

      const coverImage = await this.generateImageAsset({
        brandId,
        taskId: task.id,
        title: `原创笔记封面 - ${copyResult.title}`,
        workLabel: "原创笔记",
        role: "COVER",
        order: 0,
        providers: originalImageGenerationConfig.providers,
        executionPrompt: originalImageGenerationConfig.executionPrompt,
        prompt: imagePromptResult.coverPrompt,
        textPlan: imagePromptResult.coverText,
        referenceImageUrls: this.collectImageReferenceUrls(selectedProduct),
        referenceImagePayloads: referenceFiles.map((item) => item.payload),
      });

      const galleryImages = await Promise.all(
        imagePromptResult.imagePrompts.map((prompt, index) =>
          this.generateImageAsset({
            brandId,
            taskId: task.id,
            title: `原创笔记配图${index + 1} - ${copyResult.title}`,
            workLabel: "原创笔记",
            role: "GALLERY",
            order: index + 1,
            providers: originalImageGenerationConfig.providers,
            executionPrompt: originalImageGenerationConfig.executionPrompt,
            prompt,
            textPlan: imagePromptResult.imageTexts[index],
            referenceImageUrls: this.collectImageReferenceUrls(selectedProduct),
            referenceImagePayloads: referenceFiles.map((item) => item.payload),
          }),
        ),
      );
      await this.ensureTaskNotCancelled(task.id);
      await this.updateTaskOutputJson(task.id, {
        stage: "SAVING_WORK",
        title: copyResult.title,
        imageCount: 1 + galleryImages.length,
        copyModel: copyResult.modelName,
        imagePromptModel: imagePromptResult.modelName,
        imageGenerationModel: coverImage.modelName,
      });

      const now = new Date().toISOString();
      const htmlContent = this.renderGeneratedNoteHtml({
        title: copyResult.title,
        content: copyResult.content,
        hashtags: copyResult.hashtags,
        coverImageUrl: coverImage.url,
        imageUrls: galleryImages.map((item) => item.url),
        noteLabel: "原创图文笔记",
      });
      const htmlFile = await this.writeGeneratedTextFile(brandId, `${task.id}-note.html`, htmlContent);

      const metadata: OriginalWorkAssetMeta = {
        kind: "XHS_ORIGINAL_NOTE",
        taskId: task.id,
        noteCategory: "原创",
        noteType: "图文",
        accountRole: resolvedAccountRole,
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
        includeMarketingPlan,
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
        stage: "WORK_READY",
        title: copyResult.title,
        imageCount: 1 + galleryImages.length,
        copyModel: copyResult.modelName,
        imagePromptModel: imagePromptResult.modelName,
        imageGenerationModel: coverImage.modelName,
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
    collaboratorRole: "ADMIN" | "STAFF" | "TALENT" = "ADMIN",
  ) {
    const sourceMaterialId = payload.sourceMaterialId?.trim();
    if (!sourceMaterialId) {
      throw new BadRequestException("请选择一个素材库作品，再开始二创。");
    }

    const archive = await this.brandsService.getArchive(brandId);
    const includeMarketingPlan = payload.includeMarketingPlan !== false;
    const marketingPlanWorkspace = await this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
    const latestMarketingPlan = marketingPlanWorkspace.latest;
    if (includeMarketingPlan && !latestMarketingPlan) {
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
      latestMarketingPlan?.reportMarkdown || "",
      allowProductEmbedding,
    );
    const rewriteTopicContext = this.buildRewriteTopicContext(sourceMaterial, allowProductEmbedding);
    const rewriteReferenceImageUrls = this.collectRewriteReferenceImageUrls(sourceMaterial.imageList || [], selectedProduct);
    const rewriteReferenceSources = await this.resolveImageGenerationReferenceSources(brandId, rewriteReferenceImageUrls);

    const userId = await this.resolveTaskUserId(brandId, auth);
    const resolvedAccountRole = this.resolveOriginalAccountRole(payload.accountRole, collaboratorRole);
    const taskTitle = `生成小红书二创笔记：${sourceMaterial.title}`;
    const rewriteCopyPreference = await this.loadSkillModelPreference(
      "rewrite_copy",
      "prompt_xhs_rewrite_copy",
      ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"],
    );
    const rewriteCopyProviders = await this.loadOriginalCopyProviders(brandId, rewriteCopyPreference);
    const task = await this.createRewriteTask({
      userId,
      brandId,
      taskTitle,
      modelName: rewriteCopyProviders[0]?.models[0] || rewriteCopyPreference.preferredModelName,
    });
    try {
      await this.markTaskRunning(task.id);
      await this.ensureTaskNotCancelled(task.id);
      await this.updateTaskOutputJson(task.id, { stage: "GENERATING_COPY", title: taskTitle });

      const copyResult = await this.generateRewriteCopy({
        brandId,
        accountRole: resolvedAccountRole,
        marketingPlanMarkdown: includeMarketingPlan ? rewriteMarketingPlanContext : "",
        sourceMaterial: rewritePromptSourceMaterial,
        product: normalizedProduct,
        includeMarketingPlan,
        additionalInstruction: payload.additionalInstruction?.trim(),
        topicContext: rewriteTopicContext,
      });
      await this.ensureTaskNotCancelled(task.id);
      await this.updateTaskOutputJson(task.id, {
        stage: "GENERATING_IMAGE_PROMPTS",
        title: copyResult.title,
        copyModel: copyResult.modelName,
      });

      const imagePromptResult = await this.generateRewriteImagePrompts({
        brandId,
        accountRole: resolvedAccountRole,
        marketingPlanMarkdown: includeMarketingPlan ? rewriteMarketingPlanContext : "",
        sourceMaterial: rewritePromptSourceMaterial,
        product: normalizedProduct,
        includeMarketingPlan,
        additionalInstruction: payload.additionalInstruction?.trim(),
        noteTitle: copyResult.title,
        noteContent: copyResult.content,
        topicContext: rewriteTopicContext,
      });
      await this.ensureTaskNotCancelled(task.id);
      await this.updateTaskOutputJson(task.id, {
        stage: "GENERATING_IMAGES",
        title: copyResult.title,
        copyModel: copyResult.modelName,
        imagePromptModel: imagePromptResult.modelName,
      });

      const rewriteImageGenerationConfig = await this.loadImageGenerationExecutionConfig({
        brandId,
        skillSlug: "rewrite_image_generation",
        promptId: "prompt_xhs_rewrite_image_generation",
        fallbackModels: ["gpt-image-2", "gpt-image-2-vip", "nano-banana-2"],
      });

      const coverImage = await this.generateImageAsset({
        brandId,
        taskId: task.id,
        title: `二创笔记封面 - ${copyResult.title}`,
        workLabel: "二创笔记",
        role: "COVER",
        order: 0,
        providers: rewriteImageGenerationConfig.providers,
        executionPrompt: rewriteImageGenerationConfig.executionPrompt,
        prompt: imagePromptResult.coverPrompt,
        textPlan: imagePromptResult.coverText,
        referenceImageUrls: rewriteReferenceSources.urls,
        referenceImagePayloads: rewriteReferenceSources.payloads,
      });

      const galleryImages = await Promise.all(
        imagePromptResult.imagePrompts.map((prompt, index) =>
          this.generateImageAsset({
            brandId,
            taskId: task.id,
            title: `二创笔记配图${index + 1} - ${copyResult.title}`,
            workLabel: "二创笔记",
            role: "GALLERY",
            order: index + 1,
            providers: rewriteImageGenerationConfig.providers,
            executionPrompt: rewriteImageGenerationConfig.executionPrompt,
            prompt,
            textPlan: imagePromptResult.imageTexts[index],
            referenceImageUrls: rewriteReferenceSources.urls,
            referenceImagePayloads: rewriteReferenceSources.payloads,
          }),
        ),
      );
      await this.ensureTaskNotCancelled(task.id);
      await this.updateTaskOutputJson(task.id, {
        stage: "SAVING_WORK",
        title: copyResult.title,
        imageCount: 1 + galleryImages.length,
        copyModel: copyResult.modelName,
        imagePromptModel: imagePromptResult.modelName,
        imageGenerationModel: coverImage.modelName,
      });

      const now = new Date().toISOString();
      const htmlContent = this.renderGeneratedNoteHtml({
        title: copyResult.title,
        content: copyResult.content,
        hashtags: copyResult.hashtags,
        coverImageUrl: coverImage.url,
        imageUrls: galleryImages.map((item) => item.url),
        noteLabel: "二创图文笔记",
      });
      const htmlFile = await this.writeGeneratedTextFile(brandId, `${task.id}-rewrite-note.html`, htmlContent);

      const metadata: RewriteWorkAssetMeta = {
        kind: "XHS_REWRITE_NOTE",
        taskId: task.id,
        noteCategory: "二创",
        noteType: "图文",
        accountRole: resolvedAccountRole,
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
        includeMarketingPlan,
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
        stage: "WORK_READY",
        title: copyResult.title,
        imageCount: 1 + galleryImages.length,
        copyModel: copyResult.modelName,
        imagePromptModel: imagePromptResult.modelName,
        imageGenerationModel: coverImage.modelName,
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
    collaboratorRole: "ADMIN" | "STAFF" | "TALENT" = "ADMIN",
  ) {
    const context = await this.resolveVideoComposerContext(brandId, payload, collaboratorRole);
    const userId = await this.resolveTaskUserId(brandId, auth);
    const task = await this.createVideoTask({
      userId,
      brandId,
      taskTitle: `生成视频笔记故事板：${context.topicLabel}`,
      requestedVideoProvider: context.requestedVideoProvider,
      modelName: "deepseek-v4-pro",
    });
    const now = new Date().toISOString();
    const htmlContent = this.renderGeneratedVideoNoteHtml({
      title: context.topicLabel,
      content: "",
      hashtags: [],
      coverImageUrl: context.referenceImageUrl || context.product?.imageUrl,
      noteLabel: "视频笔记生成中",
      videoKindLabel: this.getVideoKindLabel(context.videoKind),
      workflowStage: "QUEUED",
      progressSteps: this.buildVideoProgressSteps("QUEUED"),
    });
    const htmlFile = await this.writeGeneratedTextFile(brandId, `${task.id}-video-note.html`, htmlContent);
    const metadata: VideoWorkAssetMeta = {
      kind: "XHS_VIDEO_NOTE",
      taskId: task.id,
      noteCategory: "原创",
      noteType: "视频",
      accountRole: context.accountRole,
      videoKind: context.videoKind,
      workflowStage: "QUEUED",
      title: context.topicLabel,
      content: "",
      htmlContent,
      hashtags: [],
      calendarItemId: context.selectedCalendarItem?.id,
      calendarLabel: context.selectedCalendarItem ? `${context.selectedCalendarItem.date}｜${context.selectedCalendarItem.topicName}` : undefined,
      customTopicName: context.selectedCalendarItem ? undefined : context.customTopicName,
      productId: context.product?.id,
      productName: context.product?.productName,
      materialId: context.material?.id,
      materialTitle: context.material?.title,
      materialVideoUrl: context.material?.videoUrl,
      referenceImageUrl: context.referenceImageUrl,
      copyAdditionalInstruction: context.copyAdditionalInstruction,
      videoAdditionalInstruction: context.videoAdditionalInstruction,
      includeMarketingPlan: context.includeMarketingPlan,
      requestedVideoProvider: context.requestedVideoProvider,
      resolvedVideoProvider: context.requestedVideoProvider,
      requestedStoryboardImageModel: context.requestedStoryboardImageModel,
      requestedDurationSec: context.requestedDurationSec,
      progressSteps: this.buildVideoProgressSteps("QUEUED"),
      storyboardRevisions: [],
      segmentPrompts: [],
      createdAt: now,
      updatedAt: now,
    };
    const workMedia = await this.createWorkHtmlMedia({
      userId,
      brandId,
      taskId: task.id,
      title: `小红书视频笔记 - ${context.topicLabel}`,
      storageKey: htmlFile.storageKey,
      sourceUrl: htmlFile.url,
      metadata,
    });
    setTimeout(() => {
      void this.runInitialVideoWorkflowTask(brandId, workMedia.id, task.id, context, htmlFile.storageKey);
    }, 0);
    return {
      item: this.mapVideoWorkRecord(workMedia.id, brandId, task.id, metadata, "QUEUED"),
    };
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
    await this.writeGeneratedTextFile(brandId, this.extractFileName(target.storageKey || `${target.id}.html`), nextHtmlContent);
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
    await this.writeGeneratedTextFile(brandId, this.extractFileName(target.storageKey || `${target.id}.html`), nextHtmlContent);
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
    const nextStoryboardPrompt = payload.storyboardPrompt?.trim() || meta.storyboardPrompt;
    const nextHtmlContent = this.renderGeneratedVideoNoteHtml({
      title: nextTitle,
      content: nextContent,
      hashtags: meta.hashtags,
      coverImageUrl: meta.coverImageUrl,
      storyboardImageUrl: meta.storyboardImageUrl,
      videoUrl: meta.videoUrl,
      videoPrompt: meta.fullVideoPrompt || meta.videoPrompt,
      noteLabel: "原创视频笔记",
      videoKindLabel: this.getVideoKindLabel(meta.videoKind),
      workflowStage: meta.workflowStage,
      storyboardPrompt: nextStoryboardPrompt,
      creativeScript: meta.creativeScript,
      progressSteps: meta.progressSteps,
    });
    const nextMeta: VideoWorkAssetMeta = {
      ...meta,
      title: nextTitle,
      content: nextContent,
      htmlContent: nextHtmlContent,
      storyboardPrompt: nextStoryboardPrompt,
      updatedAt: new Date().toISOString(),
    };
    await this.writeGeneratedTextFile(brandId, this.extractFileName(target.storageKey || `${target.id}.html`), nextHtmlContent);
    await this.updateWorkHtmlMetadata(workId, brandId, nextMeta, `小红书视频笔记 - ${nextTitle}`);
    return {
      item: this.mapVideoWorkRecord(workId, brandId, nextMeta.taskId, nextMeta, targetTaskStatus(target)),
    };
  }

  async regenerateXiaohongshuVideoStoryboard(
    brandId: string,
    workId: string,
    payload: RegenerateXiaohongshuVideoStoryboardPayload,
    auth?: RequestAuthContext,
  ) {
    const target = await this.getVideoWorkRowById(brandId, workId);
    const meta = this.readVideoWorkMeta(this.getMediaMetadata(target));
    if (!meta.storyboardPrompt && !payload.storyboardPrompt?.trim()) {
      throw new BadRequestException("当前还没有可修改的故事板提示词，请先完成前两阶段生成。");
    }
    const userId = await this.resolveTaskUserId(brandId, auth);
    const task = await this.createVideoTask({
      userId,
      brandId,
      taskTitle: `重新生成故事板：${meta.title}`,
      requestedVideoProvider: meta.requestedVideoProvider,
      modelName: meta.storyboardPromptModel || "gpt-5.5",
    });
    const nextMeta: VideoWorkAssetMeta = {
      ...meta,
      taskId: task.id,
      workflowStage: "GENERATING_STORYBOARD",
      storyboardPrompt: payload.storyboardPrompt?.trim() || meta.storyboardPrompt,
      progressSteps: this.buildVideoProgressSteps("GENERATING_STORYBOARD"),
      updatedAt: new Date().toISOString(),
    };
    await this.saveVideoWorkMetadataSnapshot(brandId, workId, target.storageKey || `${workId}.html`, nextMeta);
    setTimeout(() => {
      void this.runRegenerateVideoStoryboardTask(brandId, workId, task.id, target.storageKey || `${workId}.html`);
    }, 0);
    return {
      item: this.mapVideoWorkRecord(workId, brandId, task.id, nextMeta, "QUEUED"),
    };
  }

  async continueXiaohongshuVideoGeneration(
    brandId: string,
    workId: string,
    payload: ContinueXiaohongshuVideoGenerationPayload,
    auth?: RequestAuthContext,
  ) {
    const target = await this.getVideoWorkRowById(brandId, workId);
    const meta = this.readVideoWorkMeta(this.getMediaMetadata(target));
    if (!meta.storyboardPrompt || !meta.storyboardImageUrl) {
      throw new BadRequestException("请先完成故事板生成，再继续生成短视频。");
    }
    const userId = await this.resolveTaskUserId(brandId, auth);
    const task = await this.createVideoTask({
      userId,
      brandId,
      taskTitle: `生成短视频：${meta.title}`,
      requestedVideoProvider: meta.requestedVideoProvider,
      modelName: payload.customVideoModelName?.trim() || meta.resolvedVideoModel || meta.requestedVideoProvider,
    });
    const nextMeta: VideoWorkAssetMeta = {
      ...meta,
      taskId: task.id,
      workflowStage: "GENERATING_VIDEO",
      progressSteps: this.buildVideoProgressSteps("GENERATING_VIDEO"),
      resolvedVideoModel: payload.customVideoModelName?.trim() || meta.resolvedVideoModel,
      updatedAt: new Date().toISOString(),
    };
    await this.saveVideoWorkMetadataSnapshot(brandId, workId, target.storageKey || `${workId}.html`, nextMeta);
    setTimeout(() => {
      void this.runContinueVideoGenerationTask(
        brandId,
        workId,
        task.id,
        target.storageKey || `${workId}.html`,
        payload.customVideoModelName?.trim(),
      );
    }, 0);
    return {
      item: this.mapVideoWorkRecord(workId, brandId, task.id, nextMeta, "QUEUED"),
    };
  }

  async recoverXiaohongshuVideoGeneration(
    brandId: string,
    payload: RecoverXiaohongshuVideoGenerationPayload,
  ) {
    const providerTaskId = payload.providerTaskId?.trim();
    if (!providerTaskId) {
      throw new BadRequestException("请提供第三方视频任务 ID。");
    }

    const target = payload.workId?.trim()
      ? await this.getVideoWorkRowById(brandId, payload.workId.trim())
      : await this.findRecoverableVideoWorkRow(brandId, providerTaskId, payload.requestedVideoProvider?.trim());
    const workId = String(target.id || "").trim();
    const storageKey = target.storageKey || `${workId}.html`;
    const meta = this.readVideoWorkMeta(this.getMediaMetadata(target));
    const taskId = meta.taskId || String(target.taskId || "").trim();
    if (!taskId) {
      throw new BadRequestException("当前视频笔记缺少站内任务记录，暂无法恢复。");
    }

    const backend = this.normalizeVideoProvider(
      payload.requestedVideoProvider?.trim() || meta.resolvedVideoProvider || meta.requestedVideoProvider,
    );
    const config = await this.loadVideoProviderConfig(brandId, backend);
    const snapshot = await this.queryVideoGenerationSnapshotWithTargets(
      this.buildVideoRequestTargets(config),
      config.backend,
      config.queryPath,
      providerTaskId,
      {
        fallbackDurationSec: meta.requestedDurationSec,
        queryMethod: config.queryMethod,
        queryBodyMode: config.queryBodyMode,
      },
    );

    if (snapshot.status === "FAILED") {
      await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
        ...meta,
        taskId,
        workflowStage: "FAILED",
        providerTaskId,
        progressSteps: this.buildVideoProgressSteps("FAILED"),
      });
      await this.markTaskFailed(taskId, snapshot.failReason || "第三方视频生成任务失败");
      throw new ServiceUnavailableException(snapshot.failReason || "第三方视频生成任务失败");
    }

    if (snapshot.status !== "SUCCESS" || !snapshot.videoUrl) {
      const nextMeta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
        ...meta,
        taskId,
        workflowStage: "GENERATING_VIDEO",
        providerTaskId,
        progressSteps: this.buildVideoProgressSteps("GENERATING_VIDEO"),
      });
      await this.markTaskRunning(taskId);
      return {
        recovered: false,
        providerTaskId,
        thirdPartyStatus: snapshot.status,
        item: this.mapVideoWorkRecord(workId, brandId, taskId, nextMeta, "RUNNING"),
      };
    }

    const cachedVideoUrl = await this.cacheRemoteGeneratedVideo(
      brandId,
      `${taskId}-video-recovered-${config.backend}.mp4`,
      snapshot.videoUrl,
    );
    const cachedCoverImageUrl = snapshot.coverImageUrl
      ? await this.cacheRemoteGeneratedImage(
        brandId,
        `${taskId}-video-cover-recovered-${config.backend}.png`,
        snapshot.coverImageUrl,
        "image/png",
      )
      : undefined;
    const userId = String((target as { userId?: string | null }).userId || "").trim() || await this.getBrandOwnerUserId(brandId);
    if (!userId) {
      throw new ServiceUnavailableException("恢复视频成功，但未找到作品归属用户，暂无法回填站内记录。");
    }
    const videoMedia = await this.upsertRecoveredVideoMedia({
      userId,
      brandId,
      taskId,
      workId,
      title: `视频笔记视频 - ${meta.title}`,
      sourceUrl: cachedVideoUrl,
      provider: config.backend,
      modelName: meta.resolvedVideoModel,
      providerTaskId,
      durationSec: snapshot.renderedDurationSec || meta.renderedDurationSec,
      videoAssetId: meta.videoAssetId,
    });
    const nextMeta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
      ...meta,
      taskId,
      workflowStage: "SUCCESS",
      providerTaskId,
      resolvedVideoProvider: config.backend,
      renderedDurationSec: snapshot.renderedDurationSec || meta.renderedDurationSec,
      videoAssetId: videoMedia.id,
      videoUrl: cachedVideoUrl,
      coverImageUrl: cachedCoverImageUrl || meta.storyboardImageUrl || meta.coverImageUrl,
      progressSteps: this.buildVideoProgressSteps("SUCCESS"),
    });
    await this.markTaskSuccess(
      taskId,
      { workId, stage: "VIDEO_RECOVERED", title: nextMeta.title, providerTaskId },
      { modelName: nextMeta.resolvedVideoModel },
    );
    return {
      recovered: true,
      providerTaskId,
      thirdPartyStatus: snapshot.status,
      item: this.mapVideoWorkRecord(workId, brandId, taskId, nextMeta, "SUCCESS"),
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

    await this.deleteGeneratedFileIfExists(brandId, this.extractFileName(target.storageKey || ""));
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

    await this.deleteGeneratedFileIfExists(brandId, this.extractFileName(target.storageKey || ""));
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

    await this.deleteGeneratedFileIfExists(brandId, this.extractFileName(target.storageKey || ""));
    const localVideoFileName = meta.videoUrl ? this.extractLocalAssetFileName(meta.videoUrl, brandId) : "";
    const localReferenceFileName = meta.referenceImageUrl ? this.extractLocalAssetFileName(meta.referenceImageUrl, brandId) : "";
    const localStoryboardFileName = meta.storyboardImageUrl ? this.extractLocalAssetFileName(meta.storyboardImageUrl, brandId) : "";
    await this.deleteGeneratedFileIfExists(brandId, localVideoFileName);
    await this.deleteGeneratedFileIfExists(brandId, localReferenceFileName);
    await this.deleteGeneratedFileIfExists(brandId, localStoryboardFileName);
    return { success: true };
  }

  async getGeneratedAsset(brandId: string, fileName: string) {
    const storageKey = this.buildGeneratedAssetStorageKey(brandId, fileName);
    const remoteFile = await this.ossStorageService.getObject(storageKey);
    if (!remoteFile) {
      throw new NotFoundException("作品文件不存在");
    }
    return remoteFile;
  }

  private async analyzeReferenceImages(
    files: Array<{ label: string; payload: UploadFilePayload }>,
    marketingPlanMarkdown: string,
    brandId?: string,
  ) {
    const provider = await this.loadDoubaoImageAnalysisProvider(brandId);
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
            this.resolveModelAttemptTimeoutMs(undefined, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
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
    brandId: string;
    accountRole: OriginalAccountRole;
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
  }): Promise<OriginalCopyModelResult> {
    const skillPrompt = await this.loadOriginalCopyPrompt();
    const preference = await this.loadSkillModelPreference(
      "original_copy",
      "prompt_xhs_original_copy",
      ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"],
    );
    const providers = await this.loadOriginalCopyProviders(params.brandId, preference);
    const inputPayload = {
      marketingPlanMarkdown: params.marketingPlanMarkdown,
      accountRole: params.accountRole,
      accountRoleLabel: this.getOriginalAccountRoleLabel(params.accountRole),
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
    };

    const systemPrompt = [
      skillPrompt,
      "",
      "你当前要输出一篇可直接发布的小红书原创图文笔记。",
      `本次发布账号角色为“${this.getOriginalAccountRoleLabel(params.accountRole)}”，请让人设、语气、叙述视角和可信度与该账号角色一致。`,
      params.includeMarketingPlan === false
        ? "本次明确要求不要植入营销策划方案；你只能使用营销日历选题、产品资料、参考图风格和用户要求，禁止自行吸收营销策划方案里的卖点、产品矩阵、价格、门店、促销或投放口径。"
        : "本次允许有限参考营销策划方案，但只能吸收品牌调性、人群洞察、情绪目标、内容结构和场景方向，禁止把产品卖点表、价格、门店、促销口径直接写进正文。",
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
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildTextAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const title = String(parsed.title ?? "").trim();
              const body = String(parsed.content ?? "").trim();
              const hashtags = this.normalizeStringArray(parsed.hashtags, [], 8);
              if (!title || !body) {
                lastError = `${provider.provider}/${modelName} 返回字段不完整`;
                attemptTrail.push(`${attemptLabel} -> 返回字段不完整`);
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
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(
      this.buildModelAttemptFailureMessage("原创笔记文案生成", preference.preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateOriginalImagePrompts(params: {
    brandId: string;
    accountRole: OriginalAccountRole;
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
    includeMarketingPlan?: boolean;
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
    const preference = await this.loadSkillModelPreference(
      "xhs-original-image-prompt",
      "prompt_xhs_original_note",
      ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"],
    );
    const providers = await this.loadOriginalImagePromptProviders(params.brandId, preference);
    const inputPayload = {
      marketingPlanMarkdown: params.marketingPlanMarkdown,
      accountRole: params.accountRole,
      accountRoleLabel: this.getOriginalAccountRoleLabel(params.accountRole),
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
      include_marketing_plan: params.includeMarketingPlan !== false,
    };
    const systemPrompt = [
      skillPrompt,
      "",
      "你当前需要输出小红书原创图文的封面与配图提示词。",
      `本次发布账号角色为“${this.getOriginalAccountRoleLabel(params.accountRole)}”，画面主体、文案语气、人物出镜关系和可信度表达需与该账号角色匹配。`,
      params.includeMarketingPlan === false
        ? "本次明确要求不要植入营销策划方案；你只能基于营销日历选题、产品资料、原创正文、参考图风格和用户要求生成画面，不要吸收营销策划方案中的产品矩阵、卖点清单、价格、门店、促销或投放表达。"
        : "本次允许有限参考营销策划方案，但只能吸收品牌调性、人群洞察、情绪目标、内容结构和场景方向，不要把产品卖点表、价格、门店、促销和投放表达直接翻译成画面文案或主视觉。",
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
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildTextAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
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
                attemptTrail.push(`${attemptLabel} -> 封面提示词为空`);
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
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(
      this.buildModelAttemptFailureMessage("原创笔记配图提示词生成", preference.preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateImageAsset(params: {
    brandId: string;
    taskId: string;
    title: string;
    workLabel: string;
    role: "COVER" | "GALLERY";
    order: number;
    providers: ImageProviderConfig[];
    executionPrompt?: string;
    prompt: string;
    textPlan?: ImageTextPlanEntry;
    referenceImageUrls: string[];
    referenceImagePayloads?: UploadFilePayload[];
    promptMode?: ImagePromptMode;
    includeFallbackPrompt?: boolean;
    maxProvidersToTry?: number;
    maxModelsPerProvider?: number;
    attemptTimeoutMs?: number;
  }) {
    let lastError = "";
    const attemptTrail: string[] = [];
    const promptMode = params.promptMode || "social_graphic";
    const promptsToTry = this.dedupeStringList(this.buildImagePromptCandidates(
      this.buildImagePromptWithTextPlan(
        params.executionPrompt,
        params.prompt,
        params.textPlan,
        params.role,
        params.order,
        promptMode,
      ),
      { includeFallback: params.includeFallbackPrompt ?? true },
    ));
    const referenceImages = this.buildImageGenerationReferenceInputs(params.referenceImageUrls, params.referenceImagePayloads);
    const providersToTry = this.dedupeImageProviderConfigs(this.prioritizeImageProvidersForReferenceInputs(params.providers, referenceImages))
      .slice(0, Math.max(1, params.maxProvidersToTry || params.providers.length));
    if (!providersToTry.length) {
      throw new ServiceUnavailableException(
        referenceImages.length
          ? "当前图片生成链路未找到支持参考图输入的可用模型，请检查所选生图模型与参考图模式是否匹配。"
          : "当前图片生成链路未找到支持纯文生图的可用模型，请重新选择故事板生图大模型。",
      );
    }

    for (const provider of providersToTry) {
      const modelsToTry = this.dedupeStringList(
        provider.models.slice(0, Math.max(1, params.maxModelsPerProvider || provider.models.length)),
      );
      const baseUrlsToTry = this.dedupeStringList(provider.baseUrls);
      const apiKeysToTry = this.dedupeStringList(provider.apiKeys);
      for (const baseUrl of baseUrlsToTry) {
        for (const apiKey of apiKeysToTry) {
          for (const modelName of modelsToTry) {
            for (const promptCandidate of promptsToTry) {
              const attemptLabel = this.buildImageAttemptLabel(provider.providerName, modelName, baseUrl);
              try {
                let asset: ReturnType<WorksService["extractGeneratedImagePayload"]>;
                let providerTaskIdForResult: string | undefined;
                if (provider.requestMode === "apiz-task") {
                  if (!provider.createPath || !provider.queryPath) {
                    lastError = `${modelName} 未配置 APIZ 图像任务路径`;
                    attemptTrail.push(`${attemptLabel} -> 未配置任务路径`);
                    continue;
                  }
                  const createResponse = await this.requestAuthorizedJson(baseUrl, provider.createPath, apiKey, {
                    method: "POST",
                    body: this.buildImageGenerationPayload(provider, modelName, promptCandidate, referenceImages, promptMode),
                    timeoutMs: this.resolveModelAttemptTimeoutMs(
                      params.attemptTimeoutMs ?? provider.requestTimeoutMs,
                      IMAGE_MODEL_ATTEMPT_TIMEOUT_MS,
                    ),
                  });
                  const providerTaskId = this.extractVideoTaskId(createResponse);
                  if (!providerTaskId) {
                    lastError = this.readVideoCreateFailureReason(createResponse) || `${modelName} 未返回任务 ID`;
                    attemptTrail.push(`${attemptLabel} -> ${lastError}`);
                    continue;
                  }
                  providerTaskIdForResult = providerTaskId;
                  asset = await this.pollImageGenerationResult(baseUrl, apiKey, provider.queryPath, providerTaskId, {
                    queryMethod: provider.queryMethod,
                    queryBodyMode: provider.queryBodyMode,
                    requestTimeoutMs: params.attemptTimeoutMs ?? provider.requestTimeoutMs,
                  });
                } else {
                  const response = await this.requestModelCompletion(
                    baseUrl,
                    provider.completionPath,
                    apiKey,
                    this.buildImageGenerationPayload(provider, modelName, promptCandidate, referenceImages, promptMode),
                    this.resolveModelAttemptTimeoutMs(
                      params.attemptTimeoutMs ?? provider.requestTimeoutMs,
                      IMAGE_MODEL_ATTEMPT_TIMEOUT_MS,
                    ),
                  );
                  if (!response.ok) {
                    const responseSnippet = await this.readResponseSnippet(response);
                    lastError = `${modelName} 请求失败：${response.status}${responseSnippet ? `，${responseSnippet}` : ""}`;
                    attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                    continue;
                  }
                  const payload = await response.json() as Record<string, unknown>;
                  asset = this.extractGeneratedImagePayload(payload);
                }
                if (!asset) {
                  lastError = `${modelName} 未返回图片`;
                  attemptTrail.push(`${attemptLabel} -> 未返回图片`);
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
                let finalUrl = "";
                if (asset.url) {
                  try {
                    finalUrl = await this.cacheRemoteGeneratedImage(params.brandId, fileName, asset.url, asset.contentType);
                  } catch (error) {
                    if (/^https?:\/\//i.test(asset.url)) {
                      // If third-party generation already succeeded, fall back to the original remote URL
                      // instead of silently retrying another model/provider and leaving the UI hanging.
                      finalUrl = asset.url;
                    } else {
                      throw error;
                    }
                  }
                } else if (base64Content) {
                  finalUrl = (await this.writeGeneratedBinaryFile(params.brandId, fileName, base64Content, asset.contentType)).url;
                }
                if (!finalUrl) {
                  lastError = `${modelName} 未返回可保存的图片内容`;
                  attemptTrail.push(`${attemptLabel} -> 未返回可保存的图片内容`);
                  continue;
                }
                return {
                  url: finalUrl,
                  modelName,
                  providerName: provider.providerName,
                  providerBaseUrl: baseUrl,
                  providerTaskId: providerTaskIdForResult,
                  prompt: promptCandidate,
                };
              } catch (error) {
                lastError = this.normalizeImageGenerationFailureMessage(error instanceof Error ? error.message : "图片生成失败");
                attemptTrail.push(`${attemptLabel} -> ${lastError}`);
              }
            }
          }
        }
      }
    }

    const referenceContext = this.buildReferenceImageFailureContext(params.referenceImageUrls, params.referenceImagePayloads);
    const trailDetail = attemptTrail.length ? `；实际尝试顺序：${this.formatAttemptTrail(attemptTrail)}` : "";
    throw new ServiceUnavailableException(
      `${params.workLabel}图片生成失败：${this.normalizeImageGenerationFailureMessage(lastError || "未获取到有效图片")}${referenceContext}${trailDetail}`,
    );
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
      fetchTimeoutMs: IMAGE_RESULT_FETCH_TIMEOUT_MS,
    });
  }

  private async createOriginalTask(params: { userId: string; brandId: string; taskTitle: string; modelName?: string }) {
    const modelName = params.modelName || "deepseek-v4-pro";
    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.task.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskType: "XHS_ORIGINAL_NOTE",
          taskTitle: params.taskTitle,
          taskStatus: TaskStatus.QUEUED,
          modelName,
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
      modelName,
      pointsCost: 260,
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return task;
  }

  private async createRewriteTask(params: { userId: string; brandId: string; taskTitle: string; modelName?: string }) {
    const modelName = params.modelName || "deepseek-v4-pro";
    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.task.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskType: "XHS_REWRITE_NOTE",
          taskTitle: params.taskTitle,
          taskStatus: TaskStatus.QUEUED,
          modelName,
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
      modelName,
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
    modelName?: string;
  }) {
    const modelName = params.modelName
      ? `${params.modelName} + ${params.requestedVideoProvider}`
      : `deepseek-v4-pro + ${params.requestedVideoProvider}`;
    if (await this.prismaService.canUseDatabase()) {
      return this.prismaService.task.create({
        data: {
          userId: params.userId,
          brandId: params.brandId,
          taskType: "XHS_VIDEO_NOTE",
          taskTitle: params.taskTitle,
          taskStatus: TaskStatus.QUEUED,
          modelName,
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
      modelName,
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
          errorMessage: null,
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

  private async updateTaskOutputJson(taskId: string, outputJson: Record<string, unknown>) {
    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          outputJson: outputJson as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId);
    if (task) {
      task.outputJson = outputJson;
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

  private async upsertRecoveredVideoMedia(params: {
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
    videoAssetId?: string;
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

    if (params.videoAssetId) {
      if (await this.prismaService.canUseDatabase()) {
        try {
          return await this.prismaService.mediaAsset.update({
            where: { id: params.videoAssetId },
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
        } catch {
          // Fall back to create when the historical media row no longer exists.
        }
      } else {
        const target = database.media.find((item) => item.id === params.videoAssetId);
        if (target) {
          const mutableTarget = target as typeof target & {
            durationSec?: number;
            metadataJson?: unknown;
          };
          target.userId = params.userId;
          target.brandId = params.brandId;
          target.taskId = params.taskId;
          target.title = params.title;
          target.mediaType = "VIDEO";
          target.sourceUrl = params.sourceUrl;
          target.storageKey = this.toStorageKeyFromUrl(params.sourceUrl);
          target.mimeType = "video/mp4";
          mutableTarget.durationSec = params.durationSec;
          mutableTarget.metadataJson = metadata;
          target.updatedAt = new Date().toISOString();
          return target;
        }
      }
    }

    return this.createWorkVideoMedia({
      userId: params.userId,
      brandId: params.brandId,
      taskId: params.taskId,
      workId: params.workId,
      title: params.title,
      sourceUrl: params.sourceUrl,
      provider: params.provider,
      modelName: params.modelName,
      providerTaskId: params.providerTaskId,
      durationSec: params.durationSec,
    });
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

  private isFeishuProtectedMediaUrl(sourceUrl: string) {
    try {
      const targetUrl = new URL(sourceUrl);
      const isAllowedHost = targetUrl.hostname === "open.feishu.cn"
        || targetUrl.hostname === "open.larkoffice.com"
        || targetUrl.hostname.endsWith(".feishu.cn")
        || targetUrl.hostname.endsWith(".larkoffice.com")
        || targetUrl.hostname.endsWith(".larksuite.com");
      const isAllowedPath = /\/open-apis\/drive\/v1\/medias\/[^/]+\/download/i.test(targetUrl.pathname)
        || /\/space\/api\/box\/stream\/download/i.test(targetUrl.pathname)
        || /\/media\/download/i.test(targetUrl.pathname);
      return isAllowedHost && isAllowedPath;
    } catch {
      return false;
    }
  }

  private async resolveImageGenerationReferenceSources(brandId: string, referenceImageUrls: string[]) {
    const normalizedUrls = Array.from(new Set(referenceImageUrls.map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 6);
    const directUrls: string[] = [];
    const uploadedPayloads: UploadFilePayload[] = [];

    for (const sourceUrl of normalizedUrls) {
      if (!this.isFeishuProtectedMediaUrl(sourceUrl)) {
        directUrls.push(sourceUrl);
        continue;
      }

      try {
        const media = await this.collectorsService.fetchFeishuMedia(brandId, sourceUrl);
        const contentType = String(media.contentType || "application/octet-stream").toLowerCase();
        if (!contentType.startsWith("image/")) {
          throw new ServiceUnavailableException(`参考图不是图片文件：${media.fileName || sourceUrl}`);
        }
        uploadedPayloads.push({
          fileName: media.fileName || "feishu-reference-image",
          contentType,
          dataBase64: media.buffer.toString("base64"),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "飞书参考图读取失败";
        throw new ServiceUnavailableException(`二创参考图读取失败：${message}`);
      }
    }

    return {
      urls: directUrls,
      payloads: uploadedPayloads,
    };
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
    storyboardImageUrl?: string;
    videoUrl?: string;
    videoPrompt?: string;
    noteLabel: string;
    videoKindLabel?: string;
    workflowStage?: VideoWorkflowStage;
    storyboardPrompt?: string;
    creativeScript?: string;
    progressSteps?: VideoProgressStepEntry[];
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
    const storyboardImage = params.storyboardImageUrl
      ? [
          '<section style="margin-top:24px;padding:18px 20px;border-radius:24px;background:#f7f9ff;border:1px solid #dfe5f2;">',
          '<div style="font-size:13px;letter-spacing:0.04em;color:#5166ff;text-transform:uppercase;">故事板图片</div>',
          `<img src="${this.escapeHtml(params.storyboardImageUrl)}" alt="" style="width:100%;margin-top:14px;border-radius:20px;border:1px solid #dfe5f2;background:#fff;" />`,
          "</section>",
        ].join("")
      : "";
    const video = params.videoUrl
      ? `<video controls preload="metadata" src="${this.escapeHtml(params.videoUrl)}" style="width:100%;margin-top:20px;border-radius:24px;background:#0f1525;box-shadow:0 18px 40px rgba(24,36,68,0.16);"></video>`
      : "";
    const progress = params.progressSteps?.length
      ? `<section style="margin-top:20px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">${params.progressSteps
          .map((item) => {
            const background = item.status === "SUCCESS" ? "#e7f8ee" : item.status === "RUNNING" ? "#eef2ff" : item.status === "FAILED" ? "#fff1f1" : "#f7f8fc";
            const color = item.status === "SUCCESS" ? "#0f8a46" : item.status === "RUNNING" ? "#5166ff" : item.status === "FAILED" ? "#d14343" : "#63708a";
            return `<div style="padding:14px 12px;border-radius:18px;background:${background};border:1px solid rgba(212,220,239,0.85);"><div style="font-size:12px;color:#63708a;">${this.escapeHtml(item.label)}</div><strong style="display:block;margin-top:6px;color:${color};font-size:14px;">${this.escapeHtml(item.status)}</strong></div>`;
          })
          .join("")}</section>`
      : "";
    const creativeScript = params.creativeScript
      ? [
          '<section style="margin-top:24px;padding:18px 20px;border-radius:24px;background:#f7f9ff;border:1px solid #dfe5f2;">',
          '<div style="font-size:13px;letter-spacing:0.04em;color:#5166ff;text-transform:uppercase;">创意剧本</div>',
          `<pre style="margin:12px 0 0;white-space:pre-wrap;word-break:break-word;font-size:14px;line-height:1.8;color:#24314a;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${this.escapeHtml(params.creativeScript)}</pre>`,
          "</section>",
        ].join("")
      : "";
    const storyboardPrompt = params.storyboardPrompt
      ? [
          '<section style="margin-top:24px;padding:18px 20px;border-radius:24px;background:#111827;color:#e5eefc;">',
          '<div style="font-size:13px;letter-spacing:0.04em;color:#8ea3d6;text-transform:uppercase;">故事板提示词</div>',
          `<pre style="margin:12px 0 0;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.8;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;">${this.escapeHtml(params.storyboardPrompt)}</pre>`,
          "</section>",
        ].join("")
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
      `<div style="color:#63708a;font-size:13px;margin-bottom:18px;">${this.escapeHtml(
        [params.noteLabel, params.videoKindLabel, params.workflowStage].filter(Boolean).join("｜"),
      )}</div>`,
      progress,
      paragraphs,
      tags,
      creativeScript,
      storyboardPrompt,
      storyboardImage,
      video,
      videoPrompt,
      "</section></main></body></html>",
    ].join("");
  }

  private getVideoKindLabel(kind: VideoNoteKind) {
    switch (kind) {
      case "BRAND_PROMO":
        return "品牌宣传视频";
      case "SPOKEN_SELLING":
        return "口播带货视频";
      case "SKIT_SELLING":
        return "短剧带货视频";
      case "REMIX":
        return "复刻视频";
      default:
        return "视频笔记";
    }
  }

  private buildVideoProgressSteps(stage: VideoWorkflowStage): VideoProgressStepEntry[] {
    const mapStatus = (key: VideoProgressStepEntry["key"]): VideoProgressStepEntry["status"] => {
      if (stage === "FAILED") {
        return key === "VIDEO" ? "FAILED" : "SUCCESS";
      }
      if (stage === "QUEUED") {
        return "PENDING";
      }
      if (stage === "GENERATING_SCRIPT") {
        return key === "SCRIPT" ? "RUNNING" : "PENDING";
      }
      if (stage === "GENERATING_STORYBOARD") {
        return key === "SCRIPT" ? "SUCCESS" : key === "STORYBOARD" ? "RUNNING" : "PENDING";
      }
      if (stage === "WAITING_VIDEO") {
        return key === "VIDEO" ? "PENDING" : "SUCCESS";
      }
      if (stage === "GENERATING_VIDEO") {
        return key === "VIDEO" ? "RUNNING" : "SUCCESS";
      }
      return "SUCCESS";
    };
    return [
      { key: "SCRIPT", label: "创意剧本", status: mapStatus("SCRIPT") },
      { key: "STORYBOARD", label: "故事板", status: mapStatus("STORYBOARD") },
      { key: "VIDEO", label: "短视频", status: mapStatus("VIDEO") },
    ];
  }

  private async resolveVideoComposerContext(
    brandId: string,
    payload: GenerateXiaohongshuVideoNotePayload,
    collaboratorRole: "ADMIN" | "STAFF" | "TALENT",
  ): Promise<ResolvedVideoComposerContext> {
    const archive = await this.brandsService.getArchive(brandId);
    const includeMarketingPlan = payload.includeMarketingPlan !== false;
    const marketingPlanWorkspace = await this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
    const latestMarketingPlan = marketingPlanWorkspace.latest;
    if (includeMarketingPlan && !latestMarketingPlan) {
      throw new BadRequestException("请先生成小红书营销策划方案，再创作视频笔记。");
    }
    const calendarWorkspace = await this.reportsService.getXiaohongshuMarketingCalendarWorkspace(brandId);
    const selectedCalendarItem = this.findSelectedCalendarItem(calendarWorkspace.history, payload.calendarItemId);
    const customTopicName = payload.customTopicName?.trim() || undefined;
    if (!selectedCalendarItem && !customTopicName) {
      throw new BadRequestException("请选择营销日历选题，或填写自定义选题。");
    }
    if (payload.productId && payload.referenceImage?.dataBase64) {
      throw new BadRequestException("上传参考图时不能同时选择产品，请二选一。");
    }
    const videoKind = (payload.videoKind || "BRAND_PROMO") as VideoNoteKind;
    const product = payload.productId
      ? archive.products.find((item) => item.id === payload.productId)
      : undefined;
    const normalizedProduct = product
      ? {
          id: product.id,
          productName: product.productName,
          detailDescription: product.detailDescription || "",
          usageScenario: product.usageScenario || "",
          targetAudience: product.targetAudience || "",
          differentiators: product.differentiators || "",
          imageUrl: product.imageUrl || undefined,
        }
      : undefined;
    let material: ResolvedVideoComposerContext["material"];
    if (payload.materialId?.trim()) {
      const workspace = await this.collectorsService.getXiaohongshuWorkspace(brandId);
      const target = workspace.benchmarkNotes.find((item) => item.id === payload.materialId?.trim() && item.isInMaterialLibrary);
      if (!target) {
        throw new BadRequestException("未找到你选择的素材库作品，请确认该素材已加入素材库。");
      }
      if (videoKind === "REMIX" && !target.videoUrl) {
        throw new BadRequestException("复刻视频必须选择视频类型素材，请重新选择素材库中的视频素材。");
      }
      material = {
        id: target.id,
        title: target.title,
        description: target.description || undefined,
        noteUrl: target.noteUrl || undefined,
        sourceUrl: target.sourceUrl || undefined,
        videoUrl: target.videoUrl || "",
      };
    } else if (videoKind === "REMIX") {
      throw new BadRequestException("复刻视频必须先选择一个视频素材。");
    }
    const referenceImageUrl = payload.referenceImage?.dataBase64
      ? (
          await this.persistUploadFile(
            brandId,
            `${randomUUID()}-video-reference${this.resolveExtensionFromFileName(payload.referenceImage.fileName, ".png")}`,
            payload.referenceImage,
          )
        ).url
      : undefined;
    const requestedVideoProvider = await this.resolveVideoProviderWithoutReferenceFallback(
      brandId,
      this.normalizeVideoProvider(payload.videoProvider),
      Boolean(referenceImageUrl || normalizedProduct?.imageUrl),
    );
    return {
      accountRole: this.resolveOriginalAccountRole(payload.accountRole, collaboratorRole),
      videoKind,
      selectedCalendarItem,
      customTopicName,
      topicLabel: selectedCalendarItem?.topicName || customTopicName || "自定义选题",
      product: normalizedProduct,
      material,
      referenceImageUrl,
      includeMarketingPlan,
      marketingPlanMarkdown: includeMarketingPlan ? latestMarketingPlan?.reportMarkdown || "" : "",
      requestedVideoProvider,
      requestedDurationSec: this.normalizeRequestedVideoDuration(payload.durationSec),
      requestedStoryboardImageModel: payload.storyboardImageModel?.trim() || undefined,
      copyAdditionalInstruction: payload.copyAdditionalInstruction?.trim() || undefined,
      videoAdditionalInstruction: payload.videoAdditionalInstruction?.trim() || undefined,
    };
  }

  private async saveVideoWorkMetadataSnapshot(
    brandId: string,
    workId: string,
    storageKey: string,
    meta: VideoWorkAssetMeta,
  ) {
    const nextMeta: VideoWorkAssetMeta = {
      ...meta,
      htmlContent: this.renderGeneratedVideoNoteHtml({
        title: meta.title,
        content: meta.content,
        hashtags: meta.hashtags,
        coverImageUrl: meta.coverImageUrl,
        storyboardImageUrl: meta.storyboardImageUrl,
        videoUrl: meta.videoUrl,
        videoPrompt: meta.fullVideoPrompt || meta.videoPrompt,
        noteLabel: "原创视频笔记",
        videoKindLabel: this.getVideoKindLabel(meta.videoKind),
        workflowStage: meta.workflowStage,
        storyboardPrompt: meta.storyboardPrompt,
        creativeScript: meta.creativeScript,
        progressSteps: meta.progressSteps,
      }),
      updatedAt: new Date().toISOString(),
    };
    await this.writeGeneratedTextFile(brandId, this.extractFileName(storageKey), nextMeta.htmlContent);
    await this.updateWorkHtmlMetadata(workId, brandId, nextMeta, `小红书视频笔记 - ${nextMeta.title}`);
    return nextMeta;
  }

  private async runInitialVideoWorkflowTask(
    brandId: string,
    workId: string,
    taskId: string,
    context: ResolvedVideoComposerContext,
    storageKey: string,
  ) {
    try {
      await this.markTaskRunning(taskId);
      await this.updateTaskOutputJson(taskId, { workId, stage: "GENERATING_SCRIPT", title: context.topicLabel });
      const target = await this.getVideoWorkRowById(brandId, workId);
      let meta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
        ...this.readVideoWorkMeta(this.getMediaMetadata(target)),
        taskId,
        workflowStage: "GENERATING_SCRIPT",
        progressSteps: this.buildVideoProgressSteps("GENERATING_SCRIPT"),
      });
      const scriptResult = context.videoKind === "REMIX"
        ? await this.generateVideoRemixScript(brandId, context)
        : await this.generateVideoCreativeScript(brandId, context);
      meta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
        ...meta,
        taskId,
        title: scriptResult.title,
        content: scriptResult.content,
        hashtags: scriptResult.hashtags,
        creativeScript: scriptResult.creativeScript,
        businessScene: scriptResult.businessScene,
        videoType: scriptResult.videoType,
        scriptModel: scriptResult.modelName,
        workflowStage: "GENERATING_STORYBOARD",
        progressSteps: this.buildVideoProgressSteps("GENERATING_STORYBOARD"),
      });
      await this.updateTaskOutputJson(taskId, {
        workId,
        stage: "GENERATING_STORYBOARD",
        title: scriptResult.title,
        scriptModel: scriptResult.modelName,
      });
      const storyboardResult = await this.generateVideoStoryboardPrompt(brandId, context, meta);
      const imageConfig = await this.loadImageGenerationExecutionConfig({
        brandId,
        skillSlug: "short-video-api-studio",
        promptId: "prompt_xhs_video_storyboard",
        fallbackModels: ["gpt-image-2", "gpt-image-2-vip", "nano-banana-2"],
        preferredModelSelection: context.requestedStoryboardImageModel,
        usage: "storyboard-text-only",
      });
      const storyboardImage = await this.generateImageAsset({
        brandId,
        taskId,
        title: `视频故事板 - ${meta.title}`,
        workLabel: "视频故事板",
        role: "COVER",
        order: 0,
        providers: imageConfig.providers,
        executionPrompt: imageConfig.executionPrompt,
        prompt: storyboardResult.prompt,
        referenceImageUrls: [context.referenceImageUrl, context.product?.imageUrl].filter((item): item is string => Boolean(item)),
        promptMode: "video_storyboard",
        includeFallbackPrompt: false,
        maxProvidersToTry: 2,
        maxModelsPerProvider: 1,
        attemptTimeoutMs: 120000,
      });
      meta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
        ...meta,
        taskId,
        workflowStage: "WAITING_VIDEO",
        storyboardPrompt: storyboardResult.prompt,
        storyboardImageUrl: storyboardImage.url,
        coverImageUrl: storyboardImage.url,
        storyboardPromptModel: storyboardResult.modelName,
        storyboardImageModel: storyboardImage.modelName,
        storyboardImageProvider: storyboardImage.providerName,
        storyboardImageProviderHost: this.describeProviderBaseUrl(storyboardImage.providerBaseUrl),
        storyboardImageProviderTaskId: storyboardImage.providerTaskId,
        storyboardRevisions: [
          ...(meta.storyboardRevisions || []),
          { taskId, prompt: storyboardResult.prompt, imageUrl: storyboardImage.url, createdAt: new Date().toISOString() },
        ],
        progressSteps: this.buildVideoProgressSteps("WAITING_VIDEO"),
      });
      await this.markTaskSuccess(taskId, {
        workId,
        stage: "STORYBOARD_READY",
        title: meta.title,
        scriptModel: meta.scriptModel,
        storyboardPromptModel: storyboardResult.modelName,
        storyboardImageModel: storyboardImage.modelName,
        storyboardImageProvider: storyboardImage.providerName,
        storyboardImageProviderHost: this.describeProviderBaseUrl(storyboardImage.providerBaseUrl),
      });
    } catch (error) {
      await this.handleVideoWorkflowFailure(brandId, workId, taskId, storageKey, error);
    }
  }

  private async runRegenerateVideoStoryboardTask(brandId: string, workId: string, taskId: string, storageKey: string) {
    try {
      await this.markTaskRunning(taskId);
      await this.updateTaskOutputJson(taskId, { workId, stage: "GENERATING_STORYBOARD", title: "重新生成故事板" });
      const target = await this.getVideoWorkRowById(brandId, workId);
      let meta = this.readVideoWorkMeta(this.getMediaMetadata(target));
      const imageConfig = await this.loadImageGenerationExecutionConfig({
        brandId,
        skillSlug: "short-video-api-studio",
        promptId: "prompt_xhs_video_storyboard",
        fallbackModels: ["gpt-image-2", "gpt-image-2-vip", "nano-banana-2"],
        preferredModelSelection: meta.requestedStoryboardImageModel,
        usage: "storyboard-text-only",
      });
      const storyboardImage = await this.generateImageAsset({
        brandId,
        taskId,
        title: `视频故事板 - ${meta.title}`,
        workLabel: "视频故事板",
        role: "COVER",
        order: 0,
        providers: imageConfig.providers,
        executionPrompt: imageConfig.executionPrompt,
        prompt: meta.storyboardPrompt || "",
        referenceImageUrls: [meta.referenceImageUrl].filter((item): item is string => Boolean(item)),
        promptMode: "video_storyboard",
        includeFallbackPrompt: false,
        maxProvidersToTry: 2,
        maxModelsPerProvider: 1,
        attemptTimeoutMs: 120000,
      });
      meta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
        ...meta,
        taskId,
        workflowStage: "WAITING_VIDEO",
        storyboardImageUrl: storyboardImage.url,
        coverImageUrl: storyboardImage.url,
        storyboardImageModel: storyboardImage.modelName,
        storyboardImageProvider: storyboardImage.providerName,
        storyboardImageProviderHost: this.describeProviderBaseUrl(storyboardImage.providerBaseUrl),
        storyboardImageProviderTaskId: storyboardImage.providerTaskId,
        storyboardRevisions: [
          ...(meta.storyboardRevisions || []),
          { taskId, prompt: meta.storyboardPrompt || "", imageUrl: storyboardImage.url, createdAt: new Date().toISOString() },
        ],
        progressSteps: this.buildVideoProgressSteps("WAITING_VIDEO"),
      });
      await this.markTaskSuccess(taskId, {
        workId,
        stage: "STORYBOARD_READY",
        title: meta.title,
        storyboardPromptModel: meta.storyboardPromptModel,
        storyboardImageModel: storyboardImage.modelName,
        storyboardImageProvider: storyboardImage.providerName,
        storyboardImageProviderHost: this.describeProviderBaseUrl(storyboardImage.providerBaseUrl),
      });
    } catch (error) {
      await this.handleVideoWorkflowFailure(brandId, workId, taskId, storageKey, error);
    }
  }

  private async runContinueVideoGenerationTask(
    brandId: string,
    workId: string,
    taskId: string,
    storageKey: string,
    customVideoModelName?: string,
  ) {
    try {
      await this.markTaskRunning(taskId);
      await this.updateTaskOutputJson(taskId, { workId, stage: "GENERATING_VIDEO", title: "生成短视频" });
      const target = await this.getVideoWorkRowById(brandId, workId);
      let meta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
        ...this.readVideoWorkMeta(this.getMediaMetadata(target)),
        taskId,
        workflowStage: "GENERATING_VIDEO",
        progressSteps: this.buildVideoProgressSteps("GENERATING_VIDEO"),
      });
      let lastThirdPartyStatusSignature = "";
      const persistThirdPartyStatus = async (params: {
        status: string;
        detail?: string;
        rawStatus?: string;
        provider?: string;
        modelName?: string;
        providerTaskId?: string;
        outputStage: string;
        videoProviderErrors?: string[];
      }) => {
        const updatedAt = new Date().toISOString();
        const nextProvider = params.provider || meta.resolvedVideoProvider;
        const nextModel = params.modelName || meta.resolvedVideoModel;
        const nextProviderTaskId = params.providerTaskId || meta.providerTaskId;
        const nextErrors = params.videoProviderErrors || meta.videoProviderErrors || [];
        const signature = JSON.stringify({
          status: params.status,
          detail: params.detail || "",
          rawStatus: params.rawStatus || "",
          provider: nextProvider || "",
          modelName: nextModel || "",
          providerTaskId: nextProviderTaskId || "",
          videoProviderErrors: nextErrors,
        });
        if (signature === lastThirdPartyStatusSignature) {
          return;
        }
        lastThirdPartyStatusSignature = signature;
        meta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
          ...meta,
          taskId,
          workflowStage: "GENERATING_VIDEO",
          resolvedVideoProvider: nextProvider,
          resolvedVideoModel: nextModel,
          providerTaskId: nextProviderTaskId,
          thirdPartyStatus: params.status,
          thirdPartyStatusLabel: this.buildVideoThirdPartyStatusLabel(params.status),
          thirdPartyStatusDetail: params.detail,
          thirdPartyRawStatus: params.rawStatus,
          thirdPartyStatusUpdatedAt: updatedAt,
          videoProviderErrors: nextErrors,
          updatedAt,
          progressSteps: this.buildVideoProgressSteps("GENERATING_VIDEO"),
        });
        await this.updateTaskOutputJson(taskId, {
          workId,
          stage: params.outputStage,
          title: meta.title,
          providerTaskId: nextProviderTaskId,
          provider: nextProvider,
          modelName: nextModel,
          thirdPartyStatus: params.status,
          thirdPartyStatusLabel: this.buildVideoThirdPartyStatusLabel(params.status),
          thirdPartyStatusDetail: params.detail,
          thirdPartyRawStatus: params.rawStatus,
          videoProviderErrors: nextErrors,
          updatedAt,
        });
      };
      const accessibleStoryboardImageUrl = await this.resolveThirdPartyAccessibleAssetUrl(meta.storyboardImageUrl, brandId);
      const directVideoPrompt = this.buildDirectVideoPrompt(meta);
      const videoResult = await this.generateVideoAsset({
        brandId,
        taskId,
        title: `视频笔记视频 - ${meta.title}`,
        requestedVideoProvider: meta.requestedVideoProvider,
        customVideoModelName,
        prompt: directVideoPrompt,
        requestedDurationSec: meta.requestedDurationSec,
        referenceImageUrl: accessibleStoryboardImageUrl,
        onProviderTaskCreated: async (snapshot) => {
          await persistThirdPartyStatus({
            status: "TASK_CREATED",
            detail: `已创建第三方视频任务，正在查询结果：${snapshot.providerTaskId}`,
            provider: snapshot.provider,
            modelName: snapshot.modelName,
            providerTaskId: snapshot.providerTaskId,
            outputStage: "VIDEO_PROVIDER_TASK_CREATED",
          });
          meta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
            ...meta,
            taskId,
            workflowStage: "GENERATING_VIDEO",
            resolvedVideoProvider: snapshot.provider,
            resolvedVideoModel: snapshot.modelName,
            renderedDurationSec: snapshot.renderedDurationSec,
            providerTaskId: snapshot.providerTaskId,
            progressSteps: this.buildVideoProgressSteps("GENERATING_VIDEO"),
          });
        },
        onProviderQueryStatus: async (snapshot) => {
          const nextStatus =
            snapshot.status === "FAILED"
              ? "FAILED"
              : snapshot.status === "SUCCESS" && !snapshot.videoUrl
                ? "SUCCESS_NO_VIDEO_URL"
                : snapshot.status === "SUCCESS"
                  ? "SUCCESS"
                  : "QUERYING";
          const detail =
            nextStatus === "SUCCESS"
              ? "第三方已返回最终视频地址，正在回存到本站"
              : nextStatus === "SUCCESS_NO_VIDEO_URL"
                ? "第三方返回成功状态，但没有返回最终视频地址"
                : nextStatus === "FAILED"
                  ? snapshot.failReason || "第三方任务失败"
                  : `第三方正在处理中，当前状态：${snapshot.rawStatus || snapshot.status}`;
          await persistThirdPartyStatus({
            status: nextStatus,
            detail,
            rawStatus: snapshot.rawStatus,
            provider: snapshot.provider,
            modelName: snapshot.modelName,
            providerTaskId: snapshot.providerTaskId,
            outputStage:
              nextStatus === "SUCCESS"
                ? "VIDEO_PROVIDER_SUCCESS"
                : nextStatus === "SUCCESS_NO_VIDEO_URL"
                  ? "VIDEO_PROVIDER_SUCCESS_NO_VIDEO_URL"
                  : nextStatus === "FAILED"
                    ? "VIDEO_PROVIDER_FAILED"
                    : "VIDEO_PROVIDER_QUERYING",
          });
        },
        onProviderQueryError: async (snapshot) => {
          await persistThirdPartyStatus({
            status: "QUERY_ERROR",
            detail: snapshot.message,
            provider: snapshot.provider,
            modelName: snapshot.modelName,
            providerTaskId: snapshot.providerTaskId,
            outputStage: "VIDEO_PROVIDER_QUERY_ERROR",
          });
        },
        onProviderAttemptFailed: async (snapshot) => {
          const nextErrors = this.appendVideoProviderError(meta.videoProviderErrors, `${snapshot.attemptLabel}：${snapshot.message}`);
          await persistThirdPartyStatus({
            status: snapshot.willFallback ? "FALLBACK_PENDING" : "FAILED",
            detail: snapshot.willFallback
              ? `${snapshot.attemptLabel} 失败：${snapshot.message}；准备尝试下一个候选`
              : `${snapshot.attemptLabel} 失败：${snapshot.message}`,
            provider: snapshot.provider,
            modelName: snapshot.modelName,
            providerTaskId: snapshot.providerTaskId,
            outputStage: snapshot.willFallback ? "VIDEO_PROVIDER_FALLBACK_PENDING" : "VIDEO_PROVIDER_FAILED",
            videoProviderErrors: nextErrors,
          });
        },
      });
      meta = await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
        ...meta,
        taskId,
        workflowStage: "SUCCESS",
        resolvedVideoProvider: videoResult.provider,
        resolvedVideoModel: videoResult.modelName,
        renderedDurationSec: videoResult.renderedDurationSec,
        videoPrompt: directVideoPrompt,
        fullVideoPrompt: directVideoPrompt,
        videoReasoning: undefined,
        segmentBrief: undefined,
        referenceStrategy: undefined,
        padImageStrategy: undefined,
        continuityRules: [],
        segmentPrompts: [],
        segmentExecutionStatus: "SKIPPED",
        segmentExecutionError: "当前直接使用故事板图片生成主成片",
        providerTaskId: videoResult.providerTaskId,
        thirdPartyStatus: "SUCCESS",
        thirdPartyStatusLabel: this.buildVideoThirdPartyStatusLabel("SUCCESS"),
        thirdPartyStatusDetail: "最终视频已生成并回存到本站",
        thirdPartyStatusUpdatedAt: new Date().toISOString(),
        videoUrl: videoResult.url,
        coverImageUrl: videoResult.coverImageUrl || meta.storyboardImageUrl || meta.coverImageUrl,
        progressSteps: this.buildVideoProgressSteps("SUCCESS"),
      });
      await this.markTaskSuccess(taskId, {
        workId,
        stage: "VIDEO_READY",
        title: meta.title,
        videoModel: videoResult.modelName,
      }, { modelName: videoResult.modelName });
    } catch (error) {
      await this.handleVideoWorkflowFailure(brandId, workId, taskId, storageKey, error);
    }
  }

  private async handleVideoWorkflowFailure(
    brandId: string,
    workId: string,
    taskId: string,
    storageKey: string,
    error: unknown,
  ) {
    const target = await this.getVideoWorkRowById(brandId, workId);
    const meta = this.readVideoWorkMeta(this.getMediaMetadata(target));
    const errorMessage = error instanceof Error ? error.message : "视频笔记生成失败";
    await this.saveVideoWorkMetadataSnapshot(brandId, workId, storageKey, {
      ...meta,
      taskId,
      workflowStage: "FAILED",
      thirdPartyStatus: "FAILED",
      thirdPartyStatusLabel: this.buildVideoThirdPartyStatusLabel("FAILED"),
      thirdPartyStatusDetail: errorMessage,
      thirdPartyStatusUpdatedAt: new Date().toISOString(),
      videoProviderErrors: this.appendVideoProviderError(meta.videoProviderErrors, errorMessage),
      progressSteps: this.buildVideoProgressSteps("FAILED"),
    });
    if (!(await this.isTaskCancelled(taskId))) {
      await this.markTaskFailed(taskId, errorMessage);
    }
  }

  private buildVideoThirdPartyStatusLabel(status?: string) {
    switch (status) {
      case "TASK_CREATED":
        return "第三方任务已创建";
      case "QUERYING":
        return "第三方查询中";
      case "QUERY_ERROR":
        return "第三方查询异常";
      case "SUCCESS_NO_VIDEO_URL":
        return "第三方已完成但无视频地址";
      case "FALLBACK_PENDING":
        return "准备切换兜底模型";
      case "SUCCESS":
        return "第三方已返回视频";
      case "FAILED":
        return "第三方任务失败";
      default:
        return undefined;
    }
  }

  private appendVideoProviderError(existing: string[] | undefined, nextError?: string) {
    const normalized = String(nextError || "").trim();
    const items = [...(existing || [])];
    if (!normalized) {
      return items.slice(0, 8);
    }
    if (!items.includes(normalized)) {
      items.unshift(normalized);
    }
    return items.slice(0, 8);
  }

  private async requestVideoStageJson(params: {
    brandId: string;
    promptId: string;
    fallbackModels: string[];
    fallbackPrompt: string;
    systemInstruction: string;
    inputPayload: Record<string, unknown>;
  }) {
    const prompt = await this.skillsPromptsService.getActivePromptById(params.promptId);
    const skillPrompt = String(prompt?.content || params.fallbackPrompt).trim() || params.fallbackPrompt;
    const preference = await this.loadSkillModelPreference("short-video-api-studio", params.promptId, params.fallbackModels);
    const providers = await this.loadOriginalCopyProviders(params.brandId, preference);
    const systemPrompt = [skillPrompt, "", params.systemInstruction].join("\n");
    const userPrompt = ["以下是本次视频阶段输入：", "", JSON.stringify(params.inputPayload, null, 2)].join("\n");
    let lastError = "";
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildTextAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              return {
                modelName,
                parsed: this.parseJsonObject(content),
              };
            } catch (error) {
              lastError = error instanceof Error ? error.message : "阶段生成失败";
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }
    throw new ServiceUnavailableException(
      this.buildModelAttemptFailureMessage("视频阶段生成", preference.preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateVideoCreativeScript(
    brandId: string,
    context: ResolvedVideoComposerContext,
  ): Promise<VideoScriptStageResult> {
    const promptId = context.videoKind === "SPOKEN_SELLING"
      ? "prompt_xhs_video_spoken_script"
      : context.videoKind === "SKIT_SELLING"
        ? "prompt_xhs_video_skit_script"
        : "prompt_xhs_video_brand_script";
    const result = await this.requestVideoStageJson({
      brandId,
      promptId,
      fallbackModels: ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215"],
      fallbackPrompt: "根据输入内容生成创意剧本。",
      systemInstruction: [
        "请仅输出 JSON 对象，不要输出 Markdown。",
        "JSON 结构固定为：",
        '{ "title": "剧本标题", "content": "创意剧本正文", "creative_script": "完整创意剧本", "hashtags": ["标签"], "business_scene": "商业场景", "video_type": "视频类型" }',
      ].join("\n"),
      inputPayload: {
        topic: context.topicLabel,
        accountRole: context.accountRole,
        videoKind: this.getVideoKindLabel(context.videoKind),
        durationSec: context.requestedDurationSec,
        marketingPlanMarkdown: this.buildVideoMarketingPlanContext(context.marketingPlanMarkdown),
        calendar: context.selectedCalendarItem || null,
        product: context.product || null,
        additionalInstruction: context.copyAdditionalInstruction || null,
      },
    });
    const title = String(result.parsed.title ?? "").trim() || context.topicLabel;
    const content = String(result.parsed.content ?? "").trim();
    const creativeScript = String(result.parsed.creative_script ?? result.parsed.creativeScript ?? content).trim() || content;
    return {
      title,
      content,
      creativeScript,
      hashtags: this.normalizeStringArray(result.parsed.hashtags, [], 8),
      modelName: result.modelName,
      businessScene: this.readOptionalString(result.parsed.business_scene ?? result.parsed.businessScene),
      videoType: this.readOptionalString(result.parsed.video_type ?? result.parsed.videoType),
    };
  }

  private async generateVideoRemixScript(
    brandId: string,
    context: ResolvedVideoComposerContext,
  ): Promise<VideoScriptStageResult> {
    const result = await this.requestVideoStageJson({
      brandId,
      promptId: "prompt_xhs_video_remix_script",
      fallbackModels: ["doubao-seed-2-0-pro-260215", "deepseek-v4-pro"],
      fallbackPrompt: "根据视频链接拆解短视频剧情脚本。",
      systemInstruction: [
        "请仅输出 JSON 对象，不要输出 Markdown。",
        "JSON 结构固定为：",
        '{ "title": "拆解标题", "content": "剧情脚本", "creative_script": "完整拆解脚本", "hashtags": ["标签"], "business_scene": "商业场景", "video_type": "视频类型" }',
      ].join("\n"),
      inputPayload: {
        topic: context.topicLabel,
        sourceMaterial: context.material,
        product: context.product || null,
        marketingPlanMarkdown: this.buildVideoMarketingPlanContext(context.marketingPlanMarkdown),
        additionalInstruction: context.copyAdditionalInstruction || null,
      },
    });
    const title = String(result.parsed.title ?? "").trim() || `${context.topicLabel}拆解`;
    const content = String(result.parsed.content ?? "").trim();
    const creativeScript = String(result.parsed.creative_script ?? result.parsed.creativeScript ?? content).trim() || content;
    return {
      title,
      content,
      creativeScript,
      hashtags: this.normalizeStringArray(result.parsed.hashtags, [], 8),
      modelName: result.modelName,
      businessScene: this.readOptionalString(result.parsed.business_scene ?? result.parsed.businessScene),
      videoType: this.readOptionalString(result.parsed.video_type ?? result.parsed.videoType),
    };
  }

  private async generateVideoStoryboardPrompt(brandId: string, context: ResolvedVideoComposerContext, meta: VideoWorkAssetMeta) {
    const result = await this.requestVideoStageJson({
      brandId,
      promptId: "prompt_xhs_video_storyboard",
      fallbackModels: ["gpt-5.5", "deepseek-v4-pro"],
      fallbackPrompt: "根据剧本、产品图和要求生成故事板提示词。",
      systemInstruction: [
        "请仅输出 JSON 对象，不要输出 Markdown。",
        "JSON 结构固定为：",
        '{ "storyboard_prompt": "故事板提示词", "business_scene": "商业场景", "video_type": "视频类型" }',
      ].join("\n"),
      inputPayload: {
        title: meta.title,
        content: meta.content,
        creativeScript: meta.creativeScript,
        videoKind: this.getVideoKindLabel(context.videoKind),
        product: context.product || null,
        sourceMaterial: context.material || null,
        additionalInstruction: context.videoAdditionalInstruction || null,
      },
    });
    return {
      prompt: String(result.parsed.storyboard_prompt ?? result.parsed.storyboardPrompt ?? "").trim(),
      modelName: result.modelName,
      businessScene: this.readOptionalString(result.parsed.business_scene ?? result.parsed.businessScene),
      videoType: this.readOptionalString(result.parsed.video_type ?? result.parsed.videoType),
    };
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
      accountRole: meta.accountRole,
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
      includeMarketingPlan: meta.includeMarketingPlan,
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
      accountRole: this.resolveOriginalAccountRole(this.readOptionalString(meta.accountRole), "ADMIN"),
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
      includeMarketingPlan: meta.includeMarketingPlan !== false,
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

  private resolveOriginalAccountRole(
    requestedRole: string | undefined,
    collaboratorRole: "ADMIN" | "STAFF" | "TALENT",
  ): OriginalAccountRole {
    if (collaboratorRole === "STAFF") {
      if (requestedRole && requestedRole !== "STAFF") {
        throw new BadRequestException("员工权限只能选择员工号");
      }
      return "STAFF";
    }
    if (collaboratorRole === "TALENT") {
      if (requestedRole && requestedRole !== "TALENT") {
        throw new BadRequestException("达人权限只能选择达人号");
      }
      return "TALENT";
    }
    if (requestedRole === "STAFF" || requestedRole === "TALENT") {
      return requestedRole;
    }
    return "BRAND";
  }

  private getOriginalAccountRoleLabel(role: OriginalAccountRole) {
    switch (role) {
      case "STAFF":
        return "员工号";
      case "TALENT":
        return "达人号";
      case "BRAND":
      default:
        return "品牌号";
    }
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
      accountRole: meta.accountRole,
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
      includeMarketingPlan: meta.includeMarketingPlan,
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
      accountRole: this.resolveOriginalAccountRole(this.readOptionalString(meta.accountRole), "ADMIN"),
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
      includeMarketingPlan: meta.includeMarketingPlan !== false,
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
      taskId: meta.taskId || taskId || "",
      brandId,
      accountRole: meta.accountRole,
      videoKind: meta.videoKind,
      workflowStage: meta.workflowStage,
      title: meta.title,
      content: meta.content,
      coverImageUrl: meta.coverImageUrl,
      storyboardImageUrl: meta.storyboardImageUrl,
      videoUrl: meta.videoUrl,
      noteCategory: "原创",
      noteType: "视频",
      calendarItemId: meta.calendarItemId,
      calendarLabel: meta.calendarLabel,
      customTopicName: meta.customTopicName,
      productId: meta.productId,
      productName: meta.productName,
      materialId: meta.materialId,
      materialTitle: meta.materialTitle,
      materialVideoUrl: meta.materialVideoUrl,
      referenceImageUrl: meta.referenceImageUrl,
      copyAdditionalInstruction: meta.copyAdditionalInstruction,
      videoAdditionalInstruction: meta.videoAdditionalInstruction,
      includeMarketingPlan: meta.includeMarketingPlan,
      requestedVideoProvider: meta.requestedVideoProvider,
      resolvedVideoProvider: meta.resolvedVideoProvider,
      resolvedVideoModel: meta.resolvedVideoModel,
      requestedDurationSec: meta.requestedDurationSec,
      renderedDurationSec: meta.renderedDurationSec,
      creativeScript: meta.creativeScript,
      storyboardPrompt: meta.storyboardPrompt,
      progressSteps: meta.progressSteps || [],
      storyboardRevisions: meta.storyboardRevisions || [],
      videoPrompt: meta.videoPrompt,
      fullVideoPrompt: meta.fullVideoPrompt,
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
      providerTaskId: meta.providerTaskId,
      thirdPartyStatus: meta.thirdPartyStatus,
      thirdPartyStatusLabel: meta.thirdPartyStatusLabel,
      thirdPartyStatusDetail: meta.thirdPartyStatusDetail,
      thirdPartyRawStatus: meta.thirdPartyRawStatus,
      thirdPartyStatusUpdatedAt: meta.thirdPartyStatusUpdatedAt,
      videoProviderErrors: meta.videoProviderErrors || [],
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
      accountRole: this.resolveOriginalAccountRole(this.readOptionalString(meta.accountRole), "ADMIN"),
      videoKind: (this.readOptionalString(meta.videoKind) as VideoNoteKind) || "BRAND_PROMO",
      workflowStage: (this.readOptionalString(meta.workflowStage) as VideoWorkflowStage) || "QUEUED",
      title: String(meta.title ?? "").trim(),
      content: String(meta.content ?? "").trim(),
      htmlContent: String(meta.htmlContent ?? "").trim(),
      hashtags: this.normalizeStringArray(meta.hashtags, [], 12),
      calendarItemId: this.readOptionalString(meta.calendarItemId),
      calendarLabel: this.readOptionalString(meta.calendarLabel),
      customTopicName: this.readOptionalString(meta.customTopicName),
      productId: this.readOptionalString(meta.productId),
      productName: this.readOptionalString(meta.productName),
      materialId: this.readOptionalString(meta.materialId),
      materialTitle: this.readOptionalString(meta.materialTitle),
      materialVideoUrl: this.readOptionalString(meta.materialVideoUrl),
      referenceImageUrl: this.readOptionalString(meta.referenceImageUrl),
      storyboardImageUrl: this.readOptionalString(meta.storyboardImageUrl),
      copyAdditionalInstruction: this.readOptionalString(meta.copyAdditionalInstruction),
      videoAdditionalInstruction: this.readOptionalString(meta.videoAdditionalInstruction),
      includeMarketingPlan: meta.includeMarketingPlan !== false,
      requestedVideoProvider: this.readOptionalString(meta.requestedVideoProvider) || "volcengine_seedance_20",
      resolvedVideoProvider: this.readOptionalString(meta.resolvedVideoProvider)
        || this.readOptionalString(meta.requestedVideoProvider)
        || "volcengine_seedance_20",
      resolvedVideoModel: this.readOptionalString(meta.resolvedVideoModel),
      requestedDurationSec: Number(meta.requestedDurationSec || 10),
      renderedDurationSec: typeof meta.renderedDurationSec === "number" ? meta.renderedDurationSec : undefined,
      scriptModel: this.readOptionalString(meta.scriptModel),
      storyboardPromptModel: this.readOptionalString(meta.storyboardPromptModel),
      storyboardImageModel: this.readOptionalString(meta.storyboardImageModel),
      storyboardImageProvider: this.readOptionalString(meta.storyboardImageProvider),
      storyboardImageProviderHost: this.readOptionalString(meta.storyboardImageProviderHost),
      storyboardImageProviderTaskId: this.readOptionalString(meta.storyboardImageProviderTaskId),
      videoPrompt: this.readOptionalString(meta.videoPrompt),
      fullVideoPrompt: this.readOptionalString(meta.fullVideoPrompt),
      storyboardPrompt: this.readOptionalString(meta.storyboardPrompt),
      creativeScript: this.readOptionalString(meta.creativeScript),
      progressSteps: this.normalizeVideoProgressSteps(meta.progressSteps),
      storyboardRevisions: this.normalizeVideoStoryboardRevisions(meta.storyboardRevisions),
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
      thirdPartyStatus: this.readOptionalString(meta.thirdPartyStatus),
      thirdPartyStatusLabel: this.readOptionalString(meta.thirdPartyStatusLabel),
      thirdPartyStatusDetail: this.readOptionalString(meta.thirdPartyStatusDetail),
      thirdPartyRawStatus: this.readOptionalString(meta.thirdPartyRawStatus),
      thirdPartyStatusUpdatedAt: this.readOptionalString(meta.thirdPartyStatusUpdatedAt),
      videoProviderErrors: this.normalizeStringArray(meta.videoProviderErrors, [], 12),
      videoAssetId: this.readOptionalString(meta.videoAssetId),
      videoUrl: this.readOptionalString(meta.videoUrl),
      coverImageUrl: this.readOptionalString(meta.coverImageUrl),
      createdAt: this.readOptionalString(meta.createdAt) || new Date().toISOString(),
      updatedAt: this.readOptionalString(meta.updatedAt) || new Date().toISOString(),
    };
  }

  private normalizeVideoProgressSteps(value: unknown) {
    const items = Array.isArray(value) ? value : [];
    const result: VideoProgressStepEntry[] = [];
    items.forEach((item) => {
      const record = this.asRecord(item);
      if (!record) {
        return;
      }
      const key = this.readOptionalString(record.key) as VideoProgressStepEntry["key"];
      const label = this.readOptionalString(record.label);
      const status = this.readOptionalString(record.status) as VideoProgressStepEntry["status"];
      if (!key || !label || !status) {
        return;
      }
      result.push({ key, label, status });
    });
    return result;
  }

  private normalizeVideoStoryboardRevisions(value: unknown) {
    const items = Array.isArray(value) ? value : [];
    const result: VideoStoryboardRevisionEntry[] = [];
    items.forEach((item) => {
      const record = this.asRecord(item);
      if (!record) {
        return;
      }
      const taskId = this.readOptionalString(record.taskId);
      const prompt = this.readOptionalString(record.prompt);
      if (!taskId || !prompt) {
        return;
      }
      result.push({
        taskId,
        prompt,
        imageUrl: this.readOptionalString(record.imageUrl),
        createdAt: this.readOptionalString(record.createdAt) || new Date().toISOString(),
      });
    });
    return result;
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
        provider: this.readOptionalString(record.provider) || "volcengine_seedance_20",
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

  private async findRecoverableVideoWorkRow(brandId: string, providerTaskId: string, requestedVideoProvider?: string) {
    const normalizedProvider = requestedVideoProvider
      ? this.normalizeVideoBackendLookupKey(requestedVideoProvider)
      : "";
    const matchesProvider = (value?: string) =>
      !normalizedProvider || this.normalizeVideoBackendLookupKey(value) === normalizedProvider;
    const isRecoverableStage = (stage?: string) => stage === "FAILED" || stage === "GENERATING_VIDEO" || stage === "WAITING_VIDEO";

    if (await this.prismaService.canUseDatabase()) {
      const rows = await this.prismaService.mediaAsset.findMany({
        where: {
          brandId,
          mediaType: MediaType.HTML,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const candidates = rows
        .filter((item) => this.isVideoWorkMeta(item.metadataJson))
        .map((item) => ({ row: item, meta: this.readVideoWorkMeta(item.metadataJson) }));
      const exact = candidates.find((item) => item.meta.providerTaskId === providerTaskId);
      if (exact) {
        return exact.row;
      }
      const recoverable = candidates.filter((item) =>
        !item.meta.videoUrl
        && isRecoverableStage(item.meta.workflowStage)
        && (matchesProvider(item.meta.resolvedVideoProvider) || matchesProvider(item.meta.requestedVideoProvider)),
      );
      if (recoverable.length === 1) {
        return recoverable[0].row;
      }
      const failedOnly = recoverable.filter((item) => item.meta.workflowStage === "FAILED");
      if (failedOnly.length === 1) {
        return failedOnly[0].row;
      }
      if (!recoverable.length) {
        throw new NotFoundException(`未找到可用于恢复第三方任务 ${providerTaskId} 的视频笔记。`);
      }
      throw new BadRequestException("当前品牌下存在多条待恢复的视频笔记，请补充 workId 后重试。");
    }

    const candidates = database.media
      .filter((item) => item.brandId === brandId && item.mediaType === "HTML")
      .filter((item) => this.isVideoWorkMeta((item as { metadataJson?: unknown }).metadataJson))
      .map((item) => ({ row: item, meta: this.readVideoWorkMeta((item as { metadataJson?: unknown }).metadataJson) }))
      .sort((a, b) => new Date(b.row.createdAt).getTime() - new Date(a.row.createdAt).getTime());
    const exact = candidates.find((item) => item.meta.providerTaskId === providerTaskId);
    if (exact) {
      return exact.row;
    }
    const recoverable = candidates.filter((item) =>
      !item.meta.videoUrl
      && isRecoverableStage(item.meta.workflowStage)
      && (matchesProvider(item.meta.resolvedVideoProvider) || matchesProvider(item.meta.requestedVideoProvider)),
    );
    if (recoverable.length === 1) {
      return recoverable[0].row;
    }
    const failedOnly = recoverable.filter((item) => item.meta.workflowStage === "FAILED");
    if (failedOnly.length === 1) {
      return failedOnly[0].row;
    }
    if (!recoverable.length) {
      throw new NotFoundException(`未找到可用于恢复第三方任务 ${providerTaskId} 的视频笔记。`);
    }
    throw new BadRequestException("当前品牌下存在多条待恢复的视频笔记，请补充 workId 后重试。");
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
    return XHS_IMAGE_ANALYSIS_PROMPT_FALLBACK;
  }

  private buildTextProviderConfig(
    provider: ApiProviderRecord | undefined,
    providerLabel: TextProviderConfig["provider"],
    preferredModels: string[],
    options: {
      apiKeys?: string[];
      temperature: number;
      maxTokens: number;
      requestTimeoutMs: number;
      jsonResponse?: boolean;
      thinkingDisabled?: boolean;
      tokenLimitField?: "max_tokens" | "max_completion_tokens";
    },
  ): TextProviderConfig | undefined {
    if (!provider) {
      return undefined;
    }
    const baseUrls = this.apiProvidersService.getBaseUrls(provider);
    const apiKeys = (options.apiKeys || []).length ? (options.apiKeys || []) : this.apiProvidersService.getApiKeys(provider);
    const models = this.pickProviderModels(provider.modelWhitelist, [], preferredModels);
    if (!baseUrls.length || !apiKeys.length || !models.length) {
      return undefined;
    }

    const payloadExtras: Record<string, unknown> = {};
    if (options.jsonResponse) {
      payloadExtras.response_format = { type: "json_object" };
    }
    if (options.thinkingDisabled || this.apiProvidersService.getStringExtra(provider, "thinking") === "disabled") {
      payloadExtras.thinking = { type: "disabled" };
    }

    return {
      provider: providerLabel,
      providerId: provider.id,
      providerName: provider.name,
      baseUrls,
      completionPath: this.apiProvidersService.getStringExtra(provider, "completionPath") || "/chat/completions",
      apiKeys,
      models,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      requestTimeoutMs: provider.timeoutMs || options.requestTimeoutMs,
      payloadExtras: Object.keys(payloadExtras).length ? payloadExtras : undefined,
      tokenLimitField:
        options.tokenLimitField
        || (this.apiProvidersService.getStringExtra(provider, "tokenLimitField") === "max_completion_tokens"
          ? "max_completion_tokens"
          : "max_tokens"),
    };
  }

  private parseDelimitedModels(value: string) {
    return String(value || "")
      .split(/[、,，\s]+/)
      .map((item) => this.parseScopedModelSelection(item).modelName)
      .filter(Boolean);
  }

  private parseScopedModelSelection(value: string) {
    const normalized = String(value || "").trim();
    const separatorIndex = normalized.indexOf("::");
    if (separatorIndex <= 0) {
      return {
        providerId: "",
        modelName: normalized,
      };
    }
    return {
      providerId: normalized.slice(0, separatorIndex).trim(),
      modelName: normalized.slice(separatorIndex + 2).trim(),
    };
  }

  private supportsStoryboardTextOnlyImageGeneration(provider: ApiProviderRecord) {
    const requestMode = this.apiProvidersService.getStringExtra(provider, "requestMode");
    const requiresReferenceImages = this.apiProvidersService.getBooleanExtra(provider, "requiresReferenceImages")
      || this.isEditOnlyImageProvider(provider.name, provider.modelWhitelist, provider.defaultModel);
    const explicitlySupportsTextToImage = this.apiProvidersService.getBooleanExtra(provider, "supportsTextToImage");
    if (requiresReferenceImages) {
      return false;
    }
    if (explicitlySupportsTextToImage) {
      return true;
    }
    return requestMode === "images-generations" || requestMode === "chat-completions" || requestMode === "apiz-task";
  }

  private resolveImageProviderCapabilities(provider: ApiProviderRecord) {
    const requestMode = this.apiProvidersService.getStringExtra(provider, "requestMode");
    const requiresReferenceImages = this.apiProvidersService.getBooleanExtra(provider, "requiresReferenceImages")
      || this.isEditOnlyImageProvider(provider.name, provider.modelWhitelist, provider.defaultModel);
    const supportsTextToImage = this.apiProvidersService.getBooleanExtra(provider, "supportsTextToImage")
      || (!requiresReferenceImages && (
        requestMode === "images-generations"
        || requestMode === "chat-completions"
        || requestMode === "apiz-task"
      ));
    const supportsReferenceImages = this.apiProvidersService.getBooleanExtra(provider, "supportsReferenceImages")
      || requestMode === "images-generations"
      || requestMode === "chat-completions";
    return {
      supportsTextToImage,
      supportsReferenceImages,
      requiresReferenceImages,
    };
  }

  private isEditOnlyImageProvider(providerName: string, modelWhitelist: string[], defaultModel?: string | null) {
    const normalizedName = String(providerName || "").toLowerCase();
    const models = [...modelWhitelist, String(defaultModel || "")]
      .map((item) => String(item || "").toLowerCase())
      .filter(Boolean);
    return normalizedName.includes("edit")
      || models.some((item) => item.includes("/edit"));
  }

  private mergeModelPreferenceOrder(...values: string[]) {
    const merged: string[] = [];
    for (const value of values) {
      for (const modelName of this.parseDelimitedModels(value)) {
        if (!merged.includes(modelName)) {
          merged.push(modelName);
        }
      }
    }
    return merged;
  }

  private extractPreferredProviderIds(...values: string[]) {
    const preferredProviderIds: string[] = [];
    for (const value of values) {
      for (const token of String(value || "").split(/[、,，\s]+/)) {
        const providerId = this.parseScopedModelSelection(token).providerId;
        if (providerId && !preferredProviderIds.includes(providerId)) {
          preferredProviderIds.push(providerId);
        }
      }
    }
    return preferredProviderIds;
  }

  private reorderTextProvidersByPrimaryModel(
    providers: TextProviderConfig[],
    preferredModelName: string,
    preferredProviderIds: string[] = [],
  ) {
    const normalizedPreferredModelName = preferredModelName.trim();
    const normalizedProviders = providers.map((provider) => ({
      ...provider,
      models: provider.models.includes(normalizedPreferredModelName)
        ? this.pickProviderModels(provider.models, [normalizedPreferredModelName], [normalizedPreferredModelName])
        : provider.models,
    }));
    return normalizedProviders.sort((left, right) => {
      const leftProviderRank = left.providerId ? preferredProviderIds.indexOf(left.providerId) : -1;
      const rightProviderRank = right.providerId ? preferredProviderIds.indexOf(right.providerId) : -1;
      const normalizedLeftProviderRank = leftProviderRank === -1 ? Number.MAX_SAFE_INTEGER : leftProviderRank;
      const normalizedRightProviderRank = rightProviderRank === -1 ? Number.MAX_SAFE_INTEGER : rightProviderRank;
      if (normalizedLeftProviderRank !== normalizedRightProviderRank) {
        return normalizedLeftProviderRank - normalizedRightProviderRank;
      }
      const leftMatchesModel = normalizedPreferredModelName ? left.models.includes(normalizedPreferredModelName) : false;
      const rightMatchesModel = normalizedPreferredModelName ? right.models.includes(normalizedPreferredModelName) : false;
      if (leftMatchesModel !== rightMatchesModel) {
        return leftMatchesModel ? -1 : 1;
      }
      return (left.providerName || left.provider).localeCompare(right.providerName || right.provider, "zh-CN");
    });
  }

  private reorderImageProvidersByPrimaryModel(
    providers: ImageProviderConfig[],
    preferredModelName: string,
    preferredProviderIds: string[] = [],
  ) {
    const normalizedPreferredModelName = preferredModelName.trim();
    const normalizedProviders = providers.map((provider) => ({
      ...provider,
      models: provider.models.includes(normalizedPreferredModelName)
        ? this.pickProviderModels(provider.models, [normalizedPreferredModelName], [normalizedPreferredModelName])
        : provider.models,
    }));
    return normalizedProviders.sort((left, right) => {
      const leftProviderRank = preferredProviderIds.indexOf(left.providerId);
      const rightProviderRank = preferredProviderIds.indexOf(right.providerId);
      const normalizedLeftProviderRank = leftProviderRank === -1 ? Number.MAX_SAFE_INTEGER : leftProviderRank;
      const normalizedRightProviderRank = rightProviderRank === -1 ? Number.MAX_SAFE_INTEGER : rightProviderRank;
      if (normalizedLeftProviderRank !== normalizedRightProviderRank) {
        return normalizedLeftProviderRank - normalizedRightProviderRank;
      }
      const leftMatchesModel = normalizedPreferredModelName ? left.models.includes(normalizedPreferredModelName) : false;
      const rightMatchesModel = normalizedPreferredModelName ? right.models.includes(normalizedPreferredModelName) : false;
      if (leftMatchesModel !== rightMatchesModel) {
        return leftMatchesModel ? -1 : 1;
      }
      return left.providerName.localeCompare(right.providerName, "zh-CN");
    });
  }

  private prioritizeImageProvidersForReferenceInputs(providers: ImageProviderConfig[], referenceImages: string[]) {
    const normalizedReferenceImages = referenceImages.map((item) => String(item || "").trim()).filter(Boolean);
    const capableProviders = normalizedReferenceImages.length
      ? providers.filter((provider) => provider.supportsReferenceImages)
      : providers.filter((provider) => provider.supportsTextToImage && !provider.requiresReferenceImages);
    if (!normalizedReferenceImages.length) {
      return capableProviders;
    }
    if (!capableProviders.some((provider) => provider.requestMode === "images-generations")) {
      if (!capableProviders.some((provider) => provider.requestMode === "apiz-task")) {
        return capableProviders;
      }
    }
    return [...capableProviders].sort((left, right) => {
      const leftRank = left.requestMode === "images-generations" || left.requestMode === "apiz-task" ? 0 : 1;
      const rightRank = right.requestMode === "images-generations" || right.requestMode === "apiz-task" ? 0 : 1;
      return leftRank - rightRank;
    });
  }

  private dedupeStringList(values: string[]) {
    return Array.from(
      new Set(
        values
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
  }

  private dedupeImageProviderConfigs(providers: ImageProviderConfig[]) {
    const merged = new Map<string, ImageProviderConfig>();
    for (const provider of providers) {
      const key = [
        provider.providerId,
        provider.requestMode,
        provider.completionPath,
        provider.createPath,
        provider.queryPath,
      ].join("::");
      const normalizedProvider: ImageProviderConfig = {
        ...provider,
        baseUrls: this.dedupeStringList(provider.baseUrls),
        apiKeys: this.dedupeStringList(provider.apiKeys),
        models: this.dedupeStringList(provider.models),
      };
      const current = merged.get(key);
      if (!current) {
        merged.set(key, normalizedProvider);
        continue;
      }
      current.baseUrls = this.dedupeStringList([...current.baseUrls, ...normalizedProvider.baseUrls]);
      current.apiKeys = this.dedupeStringList([...current.apiKeys, ...normalizedProvider.apiKeys]);
      current.models = this.dedupeStringList([...current.models, ...normalizedProvider.models]);
      current.supportsTextToImage = current.supportsTextToImage || normalizedProvider.supportsTextToImage;
      current.supportsReferenceImages = current.supportsReferenceImages || normalizedProvider.supportsReferenceImages;
      current.requiresReferenceImages = current.requiresReferenceImages || normalizedProvider.requiresReferenceImages;
    }
    return Array.from(merged.values());
  }

  private buildImageAttemptLabel(providerName: string, modelName: string, baseUrl: string) {
    return `${providerName}/${modelName}@${this.describeProviderBaseUrl(baseUrl)}`;
  }

  private buildTextAttemptLabel(provider: TextProviderConfig["provider"], modelName: string, baseUrl: string) {
    return `${provider}/${modelName}@${this.describeProviderBaseUrl(baseUrl)}`;
  }

  private formatAttemptTrail(trail: string[]) {
    return trail
      .slice(0, 8)
      .map((item, index) => `${index + 1}. ${item}`)
      .join(" | ");
  }

  private describeProviderBaseUrl(baseUrl: string) {
    try {
      const target = new URL(baseUrl);
      return `${target.host}${target.pathname === "/" ? "" : target.pathname}`;
    } catch {
      return baseUrl;
    }
  }

  private buildModelAttemptFailureMessage(
    taskLabel: string,
    preferredModelName: string,
    lastError: string,
    attemptTrail: string[],
    fallbackMessage: string,
  ) {
    const preferredDetail = preferredModelName ? `首选模型：${preferredModelName}；` : "";
    const trailDetail = attemptTrail.length ? `；实际尝试顺序：${this.formatAttemptTrail(attemptTrail)}` : "";
    return `${taskLabel}失败：${preferredDetail}最后失败：${lastError || fallbackMessage}${trailDetail}`;
  }

  private normalizeImageGenerationFailureMessage(message: string) {
    const normalized = String(message || "").trim();
    if (!normalized) {
      return "未获取到有效图片";
    }
    if (/\b524\b/.test(normalized) || /timeout occurred/i.test(normalized) || /cloudflare/i.test(normalized)) {
      return `上游图片接口超时（524），请稍后重试或切换图片模型/供应商。原始信息：${normalized}`;
    }
    if (/AbortError/i.test(normalized) || /超时/.test(normalized)) {
      return `上游图片接口请求超时，请稍后重试或切换图片模型/供应商。原始信息：${normalized}`;
    }
    return normalized;
  }

  private buildReferenceImageFailureContext(referenceImageUrls: string[], referenceImagePayloads?: UploadFilePayload[]) {
    const urlSummary = Array.from(
      new Set(
        referenceImageUrls
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    )
      .slice(0, 3)
      .join(" | ");
    const uploadSummary = (referenceImagePayloads || [])
      .map((item) => String(item.fileName || "").trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(" | ");
    const contextParts = [
      urlSummary ? `参考图URL：${urlSummary}` : "",
      uploadSummary ? `上传文件：${uploadSummary}` : "",
    ].filter(Boolean);
    return contextParts.length ? `；${contextParts.join("；")}` : "";
  }

  private async loadSkillModelPreference(
    skillSlug: string,
    promptId: string,
    fallbackModels: string[],
  ): Promise<SkillModelPreference> {
    const [skill, prompt] = await Promise.all([
      this.skillsPromptsService.getActiveSkillBySlug(skillSlug),
      this.skillsPromptsService.getActivePromptById(promptId),
    ]);
    const configuredModels = this.mergeModelPreferenceOrder(
      skill?.defaultModel || "",
      prompt?.modelName || "",
      fallbackModels.join(", "),
    );
    return {
      preferredModelName: configuredModels[0] || fallbackModels[0] || "",
      configuredModels,
      preferredProviderIds: this.extractPreferredProviderIds(skill?.defaultModel || "", prompt?.modelName || ""),
    };
  }

  private pickProviderModels(availableModels: string[], requestedModels: string[], preferredModels: string[]) {
    const normalizedAvailable = availableModels.map((item) => item.trim()).filter(Boolean);
    const normalizedRequested = requestedModels.map((item) => item.trim()).filter(Boolean);
    const candidateModels = normalizedRequested.length
      ? normalizedAvailable.filter((item) => normalizedRequested.includes(item))
      : normalizedAvailable;
    const ordered = preferredModels
      .filter((item) => candidateModels.includes(item))
      .concat(candidateModels.filter((item) => !preferredModels.includes(item)));
    return ordered.length ? ordered : normalizedAvailable;
  }

  private async loadOriginalCopyProviders(brandId: string | undefined, preference?: SkillModelPreference) {
    const [deepseekProvider, doubaoProvider, kimiProvider, globalProviders] = await Promise.all([
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-deepseek"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-doubao"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-kimi"),
      this.apiProvidersService.listActiveProvidersByRuntimeKey("text-global"),
    ]);
    const [deepseekApiKeys, doubaoApiKeys, kimiApiKeys, globalApiKeyGroups] = await Promise.all([
      this.resolveBrandAwareApiKeys(brandId, deepseekProvider),
      this.resolveBrandAwareApiKeys(brandId, doubaoProvider),
      this.resolveBrandAwareApiKeys(brandId, kimiProvider),
      Promise.all(globalProviders.map((item) => this.resolveBrandAwareApiKeys(brandId, item))),
    ]);
    const preferredModels = preference?.configuredModels?.length
      ? preference.configuredModels
      : ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"];

    const providers = [
      this.buildTextProviderConfig(deepseekProvider, "DEEPSEEK", preferredModels, {
        apiKeys: deepseekApiKeys,
        temperature: 0.3,
        maxTokens: 2200,
        requestTimeoutMs: 180000,
        jsonResponse: true,
        thinkingDisabled: true,
      }),
      this.buildTextProviderConfig(doubaoProvider, "ARK", preferredModels, {
        apiKeys: doubaoApiKeys,
        temperature: 0.6,
        maxTokens: 2200,
        requestTimeoutMs: 180000,
        jsonResponse: true,
      }),
      this.buildTextProviderConfig(kimiProvider, "KIMI", preferredModels, {
        apiKeys: kimiApiKeys,
        temperature: 1,
        maxTokens: 2200,
        requestTimeoutMs: 180000,
        jsonResponse: true,
        tokenLimitField: "max_completion_tokens",
      }),
      ...globalProviders.map((provider, index) =>
        this.buildTextProviderConfig(provider, "THIRD_PARTY", preferredModels, {
          apiKeys: globalApiKeyGroups[index],
          temperature: 0.7,
          maxTokens: 2200,
          requestTimeoutMs: 180000,
          jsonResponse: true,
        })),
    ].filter((item): item is TextProviderConfig => Boolean(item));

    if (!providers.length) {
      throw new ServiceUnavailableException("原创笔记文案模型配置读取失败");
    }
    return this.reorderTextProvidersByPrimaryModel(
      providers,
      preference?.preferredModelName || "",
      preference?.preferredProviderIds || [],
    );
  }

  private async loadOriginalImagePromptProviders(brandId: string | undefined, preference?: SkillModelPreference) {
    const [deepseekProvider, doubaoProvider, kimiProvider, globalProviders] = await Promise.all([
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-deepseek"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-doubao"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-kimi"),
      this.apiProvidersService.listActiveProvidersByRuntimeKey("text-global"),
    ]);
    const [deepseekApiKeys, doubaoApiKeys, kimiApiKeys, globalApiKeyGroups] = await Promise.all([
      this.resolveBrandAwareApiKeys(brandId, deepseekProvider),
      this.resolveBrandAwareApiKeys(brandId, doubaoProvider),
      this.resolveBrandAwareApiKeys(brandId, kimiProvider),
      Promise.all(globalProviders.map((item) => this.resolveBrandAwareApiKeys(brandId, item))),
    ]);
    const preferredModels = preference?.configuredModels?.length
      ? preference.configuredModels
      : ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"];

    const providers = [
      this.buildTextProviderConfig(deepseekProvider, "DEEPSEEK", preferredModels, {
        apiKeys: deepseekApiKeys,
        temperature: 0.3,
        maxTokens: 2800,
        requestTimeoutMs: 180000,
        jsonResponse: true,
        thinkingDisabled: true,
      }),
      this.buildTextProviderConfig(doubaoProvider, "ARK", preferredModels, {
        apiKeys: doubaoApiKeys,
        temperature: 0.5,
        maxTokens: 2800,
        requestTimeoutMs: 180000,
        jsonResponse: true,
      }),
      this.buildTextProviderConfig(kimiProvider, "KIMI", preferredModels, {
        apiKeys: kimiApiKeys,
        temperature: 1,
        maxTokens: 2800,
        requestTimeoutMs: 180000,
        jsonResponse: true,
        tokenLimitField: "max_completion_tokens",
      }),
      ...globalProviders.map((provider, index) =>
        this.buildTextProviderConfig(provider, "THIRD_PARTY", preferredModels, {
          apiKeys: globalApiKeyGroups[index],
          temperature: 0.8,
          maxTokens: 2800,
          requestTimeoutMs: 180000,
          jsonResponse: true,
        })),
    ].filter((item): item is TextProviderConfig => Boolean(item));

    if (!providers.length) {
      throw new ServiceUnavailableException("原创笔记配图提示词模型配置读取失败");
    }
    return this.reorderTextProvidersByPrimaryModel(
      providers,
      preference?.preferredModelName || "",
      preference?.preferredProviderIds || [],
    );
  }

  private async generateRewriteCopy(params: {
    brandId: string;
    accountRole: OriginalAccountRole;
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
    includeMarketingPlan?: boolean;
    additionalInstruction?: string;
  }): Promise<OriginalCopyModelResult> {
    const skillPrompt = await this.loadRewriteCopyPrompt();
    const preference = await this.loadSkillModelPreference(
      "rewrite_copy",
      "prompt_xhs_rewrite_copy",
      ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"],
    );
    const providers = await this.loadOriginalCopyProviders(params.brandId, preference);
    const inputPayload = {
      marketingPlanMarkdown: params.marketingPlanMarkdown,
      accountRole: params.accountRole,
      accountRoleLabel: this.getOriginalAccountRoleLabel(params.accountRole),
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
      include_marketing_plan: params.includeMarketingPlan !== false,
    };

    const systemPrompt = [
      skillPrompt,
      "",
      "你当前要输出一篇可直接发布的小红书二创图文笔记。",
      `本次发布账号角色为“${this.getOriginalAccountRoleLabel(params.accountRole)}”，请让叙述口吻、人设可信度、主观视角与发布主体身份保持一致。`,
      "必须优先围绕 benchmark_note 的核心事件、场景、人物关系和情绪主题进行二创，不能脱离原素材主线另起题。",
      "如果 benchmark_note 中的商品或品牌露出只是背景信息、补给细节或陪跑元素，严禁把它升级为标题主钩子、核心卖点或主要带货内容。",
      params.includeMarketingPlan === false
        ? "本次明确要求不要植入营销策划方案；你只能依据 benchmark_note、主题上下文、产品信息和用户要求做二创，禁止自行吸收营销策划方案中的品牌策略、卖点矩阵、价格、门店、促销或投放口径。"
        : "本次允许有限参考营销策划方案，但只能吸收品牌调性、人群洞察、情绪目标、内容结构和场景方向，禁止把营销策划方案中的价格、门店、促销和投放口径直接写进正文。",
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
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildTextAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const title = String(parsed.title ?? "").trim();
              const body = String(parsed.content ?? "").trim();
              const hashtags = this.normalizeStringArray(parsed.tags ?? parsed.hashtags, [], 8);
              if (!title || !body) {
                lastError = `${provider.provider}/${modelName} 返回字段不完整`;
                attemptTrail.push(`${attemptLabel} -> 返回字段不完整`);
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
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(
      this.buildModelAttemptFailureMessage("二创笔记文案生成", preference.preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateRewriteImagePrompts(params: {
    brandId: string;
    accountRole: OriginalAccountRole;
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
    includeMarketingPlan?: boolean;
    additionalInstruction?: string;
    noteTitle: string;
    noteContent: string;
  }): Promise<OriginalImagePromptResult> {
    const skillPrompt = await this.loadRewriteImagePrompt();
    const preference = await this.loadSkillModelPreference(
      "rewrite_image",
      "prompt_xhs_rewrite_note",
      ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"],
    );
    const providers = await this.loadOriginalImagePromptProviders(params.brandId, preference);
    const inputPayload = {
      marketingPlanMarkdown: params.marketingPlanMarkdown,
      accountRole: params.accountRole,
      accountRoleLabel: this.getOriginalAccountRoleLabel(params.accountRole),
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
      include_marketing_plan: params.includeMarketingPlan !== false,
    };
    const systemPrompt = [
      skillPrompt,
      "",
      "你当前需要输出小红书二创图文的封面与配图提示词。",
      `本次发布账号角色为“${this.getOriginalAccountRoleLabel(params.accountRole)}”，画面主体、文案语气、人物出镜关系和可信度表达需与该账号角色匹配。`,
      "请至少返回 1 条封面提示词和 2 条配图提示词。",
      "图片主题必须服务于 benchmark_note 的核心事件和主场景，不能偏离到无关商品展示或纯带货画面。",
      "如果 benchmark_note 中的商品或品牌露出只是背景信息、补给细节或陪跑元素，画面中不得把它放大成核心产品海报或主视觉主体。",
      params.includeMarketingPlan === false
        ? "本次明确要求不要植入营销策划方案；你只能基于 benchmark_note、正文、主题上下文、产品信息和用户要求生成画面，不要吸收营销策划方案中的卖点矩阵、价格、门店、促销或投放表达。"
        : "本次允许有限参考营销策划方案，但只能吸收品牌调性、人群洞察、情绪目标、内容结构和场景方向，不要把营销策划方案中的价格、门店、促销和投放表达直接翻译成画面文案或主视觉。",
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
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildTextAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
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
                attemptTrail.push(`${attemptLabel} -> 封面提示词为空`);
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
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(
      this.buildModelAttemptFailureMessage("二创笔记配图提示词生成", preference.preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateVideoCopy(params: {
    brandId: string;
    accountRole: OriginalAccountRole;
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
    const preference = await this.loadSkillModelPreference(
      "short-video-api-studio",
      "prompt_xhs_video_note",
      ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"],
    );
    const providers = await this.loadOriginalCopyProviders(params.brandId, preference);
    const inputPayload = {
      marketingPlanMarkdown: this.buildVideoMarketingPlanContext(params.marketingPlanMarkdown),
      accountRole: params.accountRole,
      accountRoleLabel: this.getOriginalAccountRoleLabel(params.accountRole),
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
      `本次发布账号角色为“${this.getOriginalAccountRoleLabel(params.accountRole)}”，请让文案视角、可信度、人物关系和表达语气与该账号角色保持一致。`,
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
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildTextAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const title = String(parsed.title ?? "").trim();
              const body = String(parsed.content ?? "").trim();
              const hashtags = this.normalizeStringArray(parsed.hashtags ?? parsed.tags, [], 8);
              const antiErrorRules = this.normalizeStringArray(parsed.anti_error_rules ?? parsed.antiErrorRules, [], 8);
              if (!title || !body) {
                lastError = `${provider.provider}/${modelName} 返回字段不完整`;
                attemptTrail.push(`${attemptLabel} -> 返回字段不完整`);
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
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(
      this.buildModelAttemptFailureMessage("视频笔记文案生成", preference.preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateVideoPromptPack(params: {
    brandId: string;
    accountRole: OriginalAccountRole;
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
    const preference = await this.loadSkillModelPreference(
      "short-video-api-studio",
      "prompt_xhs_video_note",
      ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "kimi-k2.6"],
    );
    const providers = await this.loadOriginalCopyProviders(params.brandId, preference);
    const inputPayload = {
      marketingPlanMarkdown: this.buildVideoMarketingPlanContext(params.marketingPlanMarkdown),
      accountRole: params.accountRole,
      accountRoleLabel: this.getOriginalAccountRoleLabel(params.accountRole),
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
      `本次发布账号角色为“${this.getOriginalAccountRoleLabel(params.accountRole)}”，镜头人设、出镜关系、叙事可信度和口播语气都必须与该账号角色一致。`,
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
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildTextAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildTextProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, VIDEO_STAGE_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 请求失败：${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractResponseText(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const parsed = this.parseJsonObject(content);
              const videoPrompt = String(parsed.video_prompt ?? parsed.videoPrompt ?? "").trim();
              const fullVideoPrompt = String(parsed.full_video_prompt ?? parsed.fullVideoPrompt ?? "").trim() || videoPrompt;
              const segmentPrompts = this.normalizeStringArray(parsed.segment_prompts ?? parsed.segmentPrompts, [], 8);
              if (!videoPrompt) {
                lastError = `${provider.provider}/${modelName} 视频提示词为空`;
                attemptTrail.push(`${attemptLabel} -> 视频提示词为空`);
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
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(
      this.buildModelAttemptFailureMessage("视频提示词生成", preference.preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async loadDoubaoImageAnalysisProvider(brandId?: string) {
    const provider = await this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-doubao");
    const apiKeys = await this.resolveBrandAwareApiKeys(brandId, provider);
    const config = this.buildTextProviderConfig(
      provider,
      "ARK",
      ["doubao-seed-1-8-251228", "doubao-seed-2-0-pro-260215"],
      {
        apiKeys,
        temperature: 0.2,
        maxTokens: 1400,
        requestTimeoutMs: 180000,
      },
    );
    if (!config) {
      throw new ServiceUnavailableException("已上传参考图，但未找到 Doubao-Seed-1.8 的可用配置");
    }
    return {
      baseUrls: config.baseUrls,
      completionPath: config.completionPath,
      apiKeys: config.apiKeys,
      models: config.models,
    };
  }

  private async loadImageGenerationExecutionConfig(params: {
    brandId?: string;
    skillSlug: string;
    promptId: string;
    fallbackModels: string[];
    preferredModelSelection?: string;
    usage?: "general" | "storyboard-text-only";
  }): Promise<ImageGenerationRuntimeConfig> {
    const [preference, prompt] = await Promise.all([
      this.loadSkillModelPreference(params.skillSlug, params.promptId, params.fallbackModels),
      this.skillsPromptsService.getActivePromptById(params.promptId),
    ]);
    const scopedSelection = this.parseScopedModelSelection(params.preferredModelSelection || "");
    const preferredModelName = scopedSelection.modelName || preference.preferredModelName;
    const preferredProviderIds = Array.from(
      new Set([scopedSelection.providerId, ...(preference?.preferredProviderIds || [])].filter(Boolean)),
    );
    return {
      providers: await this.loadImageGenerationProviders(params.brandId, preference, {
        preferredModelName,
        preferredProviderIds,
        usage: params.usage,
      }),
      executionPrompt: String(prompt?.content || "").trim(),
      preferredModelName,
    };
  }

  private async loadImageGenerationProviders(
    brandId?: string,
    preference?: SkillModelPreference,
    overridePreference?: { preferredModelName?: string; preferredProviderIds?: string[]; usage?: "general" | "storyboard-text-only" },
  ): Promise<ImageProviderConfig[]> {
    const providers = await this.apiProvidersService.listActiveProvidersByRuntimeKey("image-generation");
    if (!providers.length) {
      throw new ServiceUnavailableException(
        "未找到已激活的文生图 Provider，请先在后台接口配置中启用「Right Codes · 文生图/图生图」或其他 image-generation Provider。",
      );
    }
    const preferredModels = preference?.configuredModels?.length
      ? preference.configuredModels
      : ["gpt-image-2", "gpt-image-2-vip", "nano-banana-2", "nano-banana-pro-2k", "nano-banana-pro-4k", "gemini-3-pro-image-preview-2k"];
    const configs: ImageProviderConfig[] = [];
    const skippedReasons: string[] = [];
    for (const provider of providers) {
      if (overridePreference?.usage === "storyboard-text-only" && !this.supportsStoryboardTextOnlyImageGeneration(provider)) {
        skippedReasons.push(`${provider.name}：当前故事板场景只允许纯文生图模型`);
        continue;
      }
      const baseUrls = this.dedupeStringList(this.apiProvidersService.getBaseUrls(provider));
      let apiKeys: string[] = [];
      try {
        apiKeys = this.dedupeStringList(await this.resolveBrandAwareApiKeys(brandId, provider, { sceneLabel: "文生图" }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "当前 Provider 不可用";
        skippedReasons.push(`${provider.name}：${message}`);
        continue;
      }
      const models = this.dedupeStringList(this.pickProviderModels(
        provider.modelWhitelist,
        [],
        preferredModels,
      ));
      if (!baseUrls.length || !apiKeys.length || !models.length) {
        const reasonParts: string[] = [];
        if (!baseUrls.length) {
          reasonParts.push("未配置 baseUrl");
        }
        if (!apiKeys.length) {
          reasonParts.push("未配置 API Key");
        }
        if (!models.length) {
          reasonParts.push("未匹配到可用模型");
        }
        skippedReasons.push(`${provider.name}：${reasonParts.join("，")}`);
        continue;
      }
      const capability = this.resolveImageProviderCapabilities(provider);
      configs.push({
        provider: "IMAGE_API",
        providerId: provider.id,
        providerName: provider.name,
        baseUrls,
        completionPath: this.apiProvidersService.getStringExtra(provider, "completionPath") || "/v1/chat/completions",
        apiKeys,
        models,
        requestMode: this.apiProvidersService.getStringExtra(provider, "requestMode") === "images-generations"
          ? "images-generations"
          : this.apiProvidersService.getStringExtra(provider, "requestMode") === "apiz-task"
            ? "apiz-task"
            : "chat-completions",
        createPath: this.apiProvidersService.getStringExtra(provider, "createPath") || undefined,
        queryPath: this.apiProvidersService.getStringExtra(provider, "queryPath") || undefined,
        queryMethod: this.apiProvidersService.getStringExtra(provider, "queryMethod") === "POST" ? "POST" : "GET",
        queryBodyMode: this.apiProvidersService.getStringExtra(provider, "queryBodyMode") === "task_id-json"
          ? "task_id-json"
          : this.apiProvidersService.getStringExtra(provider, "queryBodyMode") === "taskId-json"
            ? "taskId-json"
            : undefined,
        supportsTextToImage: capability.supportsTextToImage,
        supportsReferenceImages: capability.supportsReferenceImages,
        requiresReferenceImages: capability.requiresReferenceImages,
        requestTimeoutMs: provider.timeoutMs || 240000,
      });
    }
    if (!configs.length) {
      const reasonText = skippedReasons.length
        ? `当前排查结果：${skippedReasons.join("；")}。`
        : "";
      throw new ServiceUnavailableException(
        `文生图 Provider 已激活，但当前没有可用的执行配置。请检查 Provider 的 baseUrl、API Key 和模型白名单是否完整。${reasonText}`,
      );
    }
    const normalizedConfigs = this.dedupeImageProviderConfigs(configs);
    if (!preference) {
      return normalizedConfigs;
    }
    return this.reorderImageProvidersByPrimaryModel(
      normalizedConfigs,
      overridePreference?.preferredModelName || preference.preferredModelName,
      overridePreference?.preferredProviderIds || preference.preferredProviderIds,
    );
  }

  private buildDirectVideoPrompt(meta: VideoWorkAssetMeta) {
    const basePrompt = "按照故事板的内容生成视频";
    const extraInstruction = meta.videoAdditionalInstruction?.trim();
    return extraInstruction ? `${basePrompt}。补充要求：${extraInstruction}` : basePrompt;
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

  private async loadVideoProviderConfig(brandId: string | undefined, backend: VideoBackendKey): Promise<VideoProviderConfig> {
    const providers = await this.apiProvidersService.listActiveProvidersByRuntimeKey("video-generation");
    const requestedBackendKey = this.normalizeVideoBackendLookupKey(backend);
    const provider = providers.find((item) => {
      const candidate = this.parseVideoBackendKey(this.apiProvidersService.getStringExtra(item, "backendKey"));
      return this.normalizeVideoBackendLookupKey(candidate) === requestedBackendKey;
    });
    if (!provider) {
      throw new ServiceUnavailableException(`${backend} 视频接口配置读取失败`);
    }

    const baseUrls = this.apiProvidersService.getBaseUrls(provider);
    const apiKeys = await this.resolveBrandAwareApiKeys(brandId, provider);
    if (!baseUrls.length || !apiKeys.length) {
      throw new ServiceUnavailableException(`${backend} 视频接口配置读取失败`);
    }

    const defaultModel = provider.defaultModel || provider.modelWhitelist[0] || backend;
    const pollIntervalMs = this.resolveVideoPollIntervalMs(provider, backend);
    const configuredPollMaxAttempts = this.resolveVideoPollMaxAttempts(provider, backend);
    const minimumPollWindowMs = this.resolveVideoMinimumPollWindowMs(backend);
    const pollMaxAttempts = minimumPollWindowMs
      ? Math.max(configuredPollMaxAttempts, Math.ceil(minimumPollWindowMs / pollIntervalMs))
      : configuredPollMaxAttempts;

    return {
      backend,
      providerId: provider.id,
      providerName: provider.name,
      displayLabel: this.apiProvidersService.getStringExtra(provider, "displayLabel") || provider.name,
      baseUrls,
      apiKeys,
      createPath: this.apiProvidersService.getStringExtra(provider, "createPath") || "/v2/videos/generations",
      queryPath: this.apiProvidersService.getStringExtra(provider, "queryPath") || "/v2/videos/generations/{task_id}",
      queryMethod: this.apiProvidersService.getStringExtra(provider, "queryMethod") === "POST" ? "POST" : "GET",
      queryBodyMode:
        this.apiProvidersService.getStringExtra(provider, "queryBodyMode") === "task_id-json"
          ? "task_id-json"
          : this.apiProvidersService.getStringExtra(provider, "queryBodyMode") === "taskId-json"
            ? "taskId-json"
            : undefined,
      requestProfile: this.apiProvidersService.getStringExtra(provider, "requestProfile") || undefined,
      taskModel: this.apiProvidersService.getStringExtra(provider, "taskModel") || undefined,
      textCreatePath: this.apiProvidersService.getStringExtra(provider, "textCreatePath") || undefined,
      imageCreatePath: this.apiProvidersService.getStringExtra(provider, "imageCreatePath") || undefined,
      textQueryPath: this.apiProvidersService.getStringExtra(provider, "textQueryPath") || undefined,
      imageQueryPath: this.apiProvidersService.getStringExtra(provider, "imageQueryPath") || undefined,
      textModel: this.apiProvidersService.getStringExtra(provider, "textModel") || defaultModel,
      imageModel: this.apiProvidersService.getStringExtra(provider, "imageModel") || defaultModel,
      fastModel: this.apiProvidersService.getStringExtra(provider, "fastModel") || undefined,
      proModel: this.apiProvidersService.getStringExtra(provider, "proModel") || undefined,
      multiImageModel: this.apiProvidersService.getStringExtra(provider, "multiImageModel") || undefined,
      modelName: defaultModel,
      durationOptions: this.normalizeNumberArray(provider.extraParams?.durationOptions, [], 12),
      requestTimeoutMs: provider.timeoutMs || 240000,
      pollMaxAttempts,
      pollIntervalMs,
      minimumPollWindowMs,
    };
  }

  private buildVideoRequestTargets(config: Pick<VideoProviderConfig, "baseUrls" | "apiKeys">) {
    const baseUrls = this.dedupeStringList(config.baseUrls);
    const apiKeys = this.dedupeStringList(config.apiKeys);
    const targets: Array<{ baseUrl: string; apiKey: string }> = [];
    for (const baseUrl of baseUrls) {
      for (const apiKey of apiKeys) {
        targets.push({ baseUrl, apiKey });
      }
    }
    return targets;
  }

  private resolveVideoPollMaxAttempts(provider: ApiProviderRecord, backend: VideoBackendKey) {
    const configured = this.apiProvidersService.getNumberExtra(provider, "pollMaxAttempts");
    if (typeof configured === "number" && Number.isFinite(configured) && configured > 0) {
      return Math.floor(configured);
    }
    const normalizedBackend = this.normalizeVideoBackendLookupKey(backend);
    if (normalizedBackend === "seedance") {
      return 180;
    }
    return 40;
  }

  private resolveVideoPollIntervalMs(provider: ApiProviderRecord, backend: VideoBackendKey) {
    const configured = this.apiProvidersService.getNumberExtra(provider, "pollIntervalMs");
    if (typeof configured === "number" && Number.isFinite(configured) && configured >= 1000) {
      return Math.floor(configured);
    }
    const normalizedBackend = this.normalizeVideoBackendLookupKey(backend);
    if (normalizedBackend === "seedance") {
      return 5000;
    }
    return 4000;
  }

  private resolveVideoMinimumPollWindowMs(backend: VideoBackendKey) {
    const normalizedBackend = this.normalizeVideoBackendLookupKey(backend);
    if (normalizedBackend.includes("seedance")) {
      return 15 * 60 * 1000;
    }
    return 0;
  }

  private parseVideoBackendKey(value?: string): VideoBackendKey | undefined {
    const raw = String(value ?? "").trim();
    if (!raw) {
      return undefined;
    }
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    if (!normalized) {
      return undefined;
    }
    if (normalized === "seedance" || normalized === "seedance20") {
      return "volcengine_seedance_20";
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
    return raw;
  }

  private normalizeVideoBackendLookupKey(value?: string) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  private normalizeVideoProvider(value?: string): VideoBackendKey {
    const backend = this.parseVideoBackendKey(value);
    if (backend) {
      return backend;
    }
    throw new BadRequestException("暂不支持所选视频模型，请从视频模型下拉列表重新选择。");
  }

  private normalizeRequestedVideoDuration(value?: number) {
    if (value === 15) {
      return 15;
    }
    if (typeof value !== "number" || Number.isNaN(value)) {
      return 10;
    }
    return 10;
  }

  private normalizeProviderDuration(config: VideoProviderConfig, requestedDurationSec: number) {
    const candidates = config.durationOptions.length
      ? config.durationOptions
      : (this.normalizeVideoBackendLookupKey(config.backend) === "hailuo" ? [6, 10] : [5, 10]);
    return candidates.reduce((best, current) =>
      Math.abs(current - requestedDurationSec) < Math.abs(best - requestedDurationSec) ? current : best,
    );
  }

  private inferVideoProviderFamily(backend: VideoBackendKey) {
    const normalized = this.normalizeVideoBackendLookupKey(backend);
    if (!normalized) {
      return "";
    }
    if (normalized.includes("seedance")) {
      return "seedance";
    }
    if (normalized.includes("hailuo")) {
      return "hailuo";
    }
    if (normalized.includes("kling")) {
      return "kling";
    }
    if (normalized.includes("veo")) {
      return "veo";
    }
    if (normalized.includes("happyhorse")) {
      return "happyhorse";
    }
    if (normalized.includes("vidu")) {
      return "vidu";
    }
    if (normalized.includes("wan")) {
      return "wan";
    }
    return normalized;
  }

  private async buildVideoProviderExecutionPlan(requestedBackend: VideoBackendKey, hasReferenceImage: boolean) {
    const providerOptions = (await this.listXiaohongshuVideoProviderOptions()).items;
    const requestedLookupKey = this.normalizeVideoBackendLookupKey(requestedBackend);
    const requestedFamily = this.inferVideoProviderFamily(requestedBackend);
    const sameFamilyOptions = providerOptions.filter((item) =>
      this.inferVideoProviderFamily(item.backendKey) === requestedFamily,
    );
    const candidateOptions = sameFamilyOptions.length
      ? sameFamilyOptions
      : providerOptions.filter((item) => this.normalizeVideoBackendLookupKey(item.backendKey) === requestedLookupKey);
    const executionPlan: VideoProviderExecutionCandidate[] = [];
    const seen = new Set<string>();
    const resolveCandidateLabel = (backend: VideoBackendKey, fallbackLabel?: string) => {
      const option = providerOptions.find((item) =>
        this.normalizeVideoBackendLookupKey(item.backendKey) === this.normalizeVideoBackendLookupKey(backend)
      );
      if (option) {
        return `${option.providerName} · ${option.label}`;
      }
      return fallbackLabel || backend;
    };
    const appendCandidate = (backend: VideoBackendKey, useReferenceImage: boolean, fallbackLabel?: string) => {
      const candidateKey = `${this.normalizeVideoBackendLookupKey(backend)}:${useReferenceImage ? "image" : "text"}`;
      if (!backend || seen.has(candidateKey)) {
        return;
      }
      seen.add(candidateKey);
      executionPlan.push({
        backend,
        label: resolveCandidateLabel(backend, fallbackLabel),
        useReferenceImage,
      });
    };
    const appendOptions = (
      predicate: (option: VideoProviderOptionRecord) => boolean,
      useReferenceImage: boolean,
    ) => {
      candidateOptions.forEach((option) => {
        if (predicate(option)) {
          appendCandidate(option.backendKey, useReferenceImage, `${option.providerName} · ${option.label}`);
        }
      });
    };
    const requestedOption = candidateOptions.find((item) =>
      this.normalizeVideoBackendLookupKey(item.backendKey) === requestedLookupKey,
    );

    if (hasReferenceImage) {
      if (requestedOption?.supportsImageToVideo) {
        appendCandidate(requestedOption.backendKey, true, `${requestedOption.providerName} · ${requestedOption.label}`);
      } else if (!requestedOption) {
        appendCandidate(requestedBackend, true);
      }
      appendOptions(
        (item) =>
          item.recommended
          && this.normalizeVideoBackendLookupKey(item.backendKey) !== requestedLookupKey
          && item.supportsImageToVideo,
        true,
      );
      appendOptions(
        (item) =>
          this.normalizeVideoBackendLookupKey(item.backendKey) !== requestedLookupKey
          && item.supportsImageToVideo,
        true,
      );
    }

    if (requestedOption?.supportsTextToVideo) {
      appendCandidate(requestedOption.backendKey, false, `${requestedOption.providerName} · ${requestedOption.label}`);
    } else if (!requestedOption && !hasReferenceImage) {
      appendCandidate(requestedBackend, false);
    }
    appendOptions(
      (item) =>
        item.recommended
        && this.normalizeVideoBackendLookupKey(item.backendKey) !== requestedLookupKey
        && item.supportsTextToVideo,
      false,
    );
    appendOptions(
      (item) =>
        this.normalizeVideoBackendLookupKey(item.backendKey) !== requestedLookupKey
        && item.supportsTextToVideo,
      false,
    );

    if (!executionPlan.length) {
      appendCandidate(requestedBackend, hasReferenceImage);
    }
    return executionPlan;
  }

  private async resolveVideoProviderWithoutReferenceFallback(
    brandId: string,
    requestedProvider: VideoBackendKey,
    hasReferenceImage: boolean,
  ) {
    if (hasReferenceImage) {
      return requestedProvider;
    }
    const executionPlan = await this.buildVideoProviderExecutionPlan(requestedProvider, false);
    return executionPlan[0]?.backend || requestedProvider;
  }

  private normalizeVideoProviderFailureMessage(message?: string) {
    return String(message || "").replace(/\s+/g, " ").trim();
  }

  private classifyVideoProviderFailure(message?: string): VideoProviderFailureDisposition {
    const normalized = this.normalizeVideoProviderFailureMessage(message).toLowerCase();
    if (!normalized) {
      return "retryable";
    }
    if (
      /access denied/.test(normalized)
      || /enterprise-shared api keys/.test(normalized)
      || /unauthorized/.test(normalized)
      || /forbidden/.test(normalized)
      || /\b401\b/.test(normalized)
      || /\b403\b/.test(normalized)
      || /api key/.test(normalized)
      || /权限/.test(normalized)
      || /鉴权/.test(normalized)
      || /接口配置/.test(normalized)
      || /配置读取失败/.test(normalized)
      || /未找到 .*视频接口配置文件/.test(normalized)
      || /owner 尚未配置/.test(normalized)
    ) {
      return "hard";
    }
    return "retryable";
  }

  private summarizeVideoProviderFailure(message?: string, disposition: VideoProviderFailureDisposition = "retryable") {
    const normalized = this.normalizeVideoProviderFailureMessage(message);
    if (
      /创建任务失败|当前品牌未匹配到第三方平台配置|owner 尚未配置第三方平台|未找到 .*视频接口配置文件|post \/.* 失败|get \/.* 失败/i.test(
        normalized,
      )
    ) {
      return normalized || "当前视频模型不可用，请检查接口权限或配置后重试。";
    }
    if (disposition === "hard") {
      if (/api key|access denied|enterprise-shared api keys|unauthorized|forbidden|\b401\b|\b403\b/i.test(normalized)) {
        return "当前品牌下该视频模型暂无可用权限，请检查个人中心中的视频 API Key 权限配置。";
      }
      if (/接口配置|配置读取失败|未找到 .*视频接口配置文件|owner 尚未配置/i.test(normalized)) {
        return "当前品牌下该视频模型接口配置不可用，请检查个人中心中的第三方接口配置。";
      }
      return normalized || "当前视频模型不可用，请检查接口权限或配置后重试。";
    }
    if (/超时|timeout|aborterror|524|cloudflare/i.test(normalized)) {
      return "当前同类视频模型服务暂时超时，请稍后重试。";
    }
    if (/网络请求失败|fetch failed/i.test(normalized)) {
      return "当前同类视频模型网络请求失败，请稍后重试。";
    }
    if (/未返回任务 id|创建任务失败/i.test(normalized)) {
      return "当前同类视频模型创建任务失败，请稍后重试。";
    }
    return normalized || "当前同类视频模型暂时不可用，请稍后重试。";
  }

  private resolveLegacyVideoRequestProfile(backend: VideoBackendKey, hasReferenceImage: boolean) {
    const normalizedBackend = this.normalizeVideoBackendLookupKey(backend);
    if (normalizedBackend === "hailuo") {
      return "legacy_hailuo";
    }
    if (normalizedBackend === "kling") {
      return "legacy_kling";
    }
    if (normalizedBackend === "veo") {
      return "legacy_veo";
    }
    if (normalizedBackend === "wan") {
      return "legacy_wan";
    }
    if (normalizedBackend === "seedance") {
      return "legacy_seedance";
    }
    return hasReferenceImage ? "legacy_seedance" : "legacy_seedance";
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
    const normalizedDuration = this.normalizeProviderDuration(params.config, params.requestedDurationSec);
    const hasReferenceImage = Boolean(params.referenceImageUrl);
    const requestProfile = params.config.requestProfile || this.resolveLegacyVideoRequestProfile(params.config.backend, hasReferenceImage);
    const negativePrompt = params.negativePrompt?.trim() || undefined;
    const requireReferenceImage = () => {
      if (!params.referenceImageUrl) {
        throw new BadRequestException(`当前视频模型「${params.config.displayLabel}」需要先上传参考图`);
      }
      return params.referenceImageUrl;
    };
    const buildApizTaskPayload = (taskModel: string, taskParams: Record<string, unknown>) => ({
      model: taskModel,
      params: taskParams,
      channel: null,
    });

    switch (requestProfile) {
      case "volcengine_seedance": {
        const content: Array<Record<string, unknown>> = [
          {
            type: "text",
            text: params.prompt,
          },
        ];
        if (hasReferenceImage) {
          content.push({
            type: "image_url",
            role: "reference_image",
            image_url: {
              url: requireReferenceImage(),
            },
          });
        }
        return {
          payload: {
            model: params.modelName,
            content,
            resolution: "720p",
            duration: normalizedDuration,
            ratio: "adaptive",
            generate_audio: true,
            watermark: false,
          } as Record<string, unknown>,
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      }
      case "apiz_seedance":
        return {
          payload: buildApizTaskPayload(
            params.config.taskModel || "ark/seedance-2.0",
            {
              prompt: params.prompt,
              resolution: "720p",
              duration: normalizedDuration,
              ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
              ...(hasReferenceImage ? { image_url: requireReferenceImage(), ratio: "adaptive" } : { ratio: "9:16", generate_audio: true }),
            },
          ),
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "apiz_kling_i2v":
        return {
          payload: buildApizTaskPayload(
            params.config.taskModel || params.modelName,
            {
              prompt: params.prompt,
              image_url: requireReferenceImage(),
              duration: `${normalizedDuration}s`,
              resolution: "4K",
              ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
            },
          ),
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "apiz_kling_t2v":
        return {
          payload: buildApizTaskPayload(
            params.config.taskModel || params.modelName,
            {
              prompt: params.prompt,
              duration: `${normalizedDuration}s`,
              resolution: "4K",
              ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
            },
          ),
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "apiz_happyhorse_i2v":
        return {
          payload: buildApizTaskPayload(
            params.config.taskModel || params.modelName,
            {
              prompt: params.prompt,
              image_url: requireReferenceImage(),
              duration: normalizedDuration,
              resolution: "720p",
            },
          ),
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "apiz_happyhorse_r2v":
        return {
          payload: buildApizTaskPayload(
            params.config.taskModel || params.modelName,
            {
              prompt: params.prompt,
              image_urls: [requireReferenceImage()],
              duration: normalizedDuration,
              resolution: "720p",
            },
          ),
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "apiz_happyhorse_t2v":
        return {
          payload: buildApizTaskPayload(
            params.config.taskModel || params.modelName,
            {
              prompt: params.prompt,
              duration: normalizedDuration,
              resolution: "720p",
            },
          ),
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "apiz_veo_i2v":
        return {
          payload: buildApizTaskPayload(
            params.config.taskModel || params.modelName,
            {
              prompt: params.prompt,
              image_url: requireReferenceImage(),
              duration: `${normalizedDuration}s`,
              resolution: "720p",
              generate_audio: true,
            },
          ),
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "apiz_veo_r2v":
        return {
          payload: buildApizTaskPayload(
            params.config.taskModel || params.modelName,
            {
              prompt: params.prompt,
              image_urls: [requireReferenceImage()],
              duration: `${normalizedDuration}s`,
              resolution: "720p",
              generate_audio: true,
            },
          ),
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "apiz_veo_t2v":
        return {
          payload: buildApizTaskPayload(
            params.config.taskModel || params.modelName,
            {
              prompt: params.prompt,
              duration: `${normalizedDuration}s`,
              resolution: "720p",
              generate_audio: true,
            },
          ),
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "legacy_hailuo":
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
      case "legacy_kling":
        return {
          payload: {
            prompt: params.prompt,
            negative_prompt: negativePrompt,
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
      case "legacy_veo":
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
      case "legacy_wan":
        return {
          payload: {
            prompt: params.prompt,
            model: params.modelName,
            duration: normalizedDuration,
            size: "720*1280",
            watermark: false,
            prompt_extend: true,
            negative_prompt: negativePrompt,
            ...(hasReferenceImage ? { images: [params.referenceImageUrl] } : { audio: false }),
          } as Record<string, unknown>,
          createPath: params.config.createPath,
          queryPath: params.config.queryPath,
          renderedDurationSec: normalizedDuration,
        };
      case "legacy_seedance":
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
    onProviderTaskCreated?: (snapshot: VideoProviderTaskSnapshot) => Promise<void> | void;
    onProviderQueryStatus?: (snapshot: VideoProviderQuerySnapshot) => Promise<void> | void;
    onProviderQueryError?: (snapshot: {
      provider: string;
      modelName: string;
      providerTaskId: string;
      message: string;
      checkedAt: string;
    }) => Promise<void> | void;
    onProviderAttemptFailed?: (snapshot: VideoProviderAttemptFailureSnapshot) => Promise<void> | void;
  }): Promise<GeneratedVideoResult> {
    const requestedBackend = this.normalizeVideoProvider(params.requestedVideoProvider);
    const providerPlan = await this.buildVideoProviderExecutionPlan(requestedBackend, Boolean(params.referenceImageUrl));
    const providerErrors: string[] = [];
    const attemptLabels: string[] = [];
    let hardFailureSummary = "";
    let hardFailureLabel = "";
    let requestedProviderFailureLabel = "";
    let requestedProviderFailureMessage = "";

    for (let index = 0; index < providerPlan.length; index += 1) {
      const candidate = providerPlan[index];
      let lastError = "";
      let currentModelName = "";
      let providerTaskIdForAttempt = "";
      try {
        const config = await this.loadVideoProviderConfig(params.brandId, candidate.backend);
        const modelName = this.resolveVideoModelName(
          config,
          candidate.backend,
          candidate.backend === requestedBackend ? params.customVideoModelName : undefined,
          candidate.useReferenceImage,
        );
        currentModelName = modelName;
        const requestConfig = this.buildVideoCreatePayload({
          config,
          modelName,
          prompt: params.prompt,
          negativePrompt: params.negativePrompt,
          requestedDurationSec: params.requestedDurationSec,
          referenceImageUrl: candidate.useReferenceImage ? params.referenceImageUrl : undefined,
        });

        const baseUrl = config.baseUrls[0];
        const apiKey = config.apiKeys[0];
        const createResponse = await this.requestAuthorizedJson(baseUrl, requestConfig.createPath, apiKey, {
          method: "POST",
          body: requestConfig.payload,
          timeoutMs: config.requestTimeoutMs ?? 240000,
        });
        const providerTaskId = this.extractVideoTaskId(createResponse);
        if (!providerTaskId) {
          const createFailureReason = this.readVideoCreateFailureReason(createResponse);
          throw new ServiceUnavailableException(
            createFailureReason
              ? `${config.backend} 创建任务失败：${createFailureReason}`
              : `${config.backend} 未返回任务 ID`,
          );
        }
        providerTaskIdForAttempt = providerTaskId;

        await params.onProviderTaskCreated?.({
          provider: config.backend,
          modelName,
          providerTaskId,
          renderedDurationSec: requestConfig.renderedDurationSec,
        });

        const result = await this.pollVideoGenerationResult(baseUrl, apiKey, config.backend, requestConfig.queryPath, providerTaskId, {
          fallbackDurationSec: requestConfig.renderedDurationSec,
          queryMethod: config.queryMethod,
          queryBodyMode: config.queryBodyMode,
          pollMaxAttempts: config.pollMaxAttempts,
          pollIntervalMs: config.pollIntervalMs,
          queryTargets: this.buildVideoRequestTargets(config),
          onSnapshot: params.onProviderQueryStatus
            ? async (snapshot) => {
                await params.onProviderQueryStatus?.({
                  ...snapshot,
                  provider: config.backend,
                  modelName,
                  providerTaskId,
                  checkedAt: new Date().toISOString(),
                });
              }
            : undefined,
          onQueryError: params.onProviderQueryError
            ? async (message) => {
                await params.onProviderQueryError?.({
                  provider: config.backend,
                  modelName,
                  providerTaskId,
                  message,
                  checkedAt: new Date().toISOString(),
                });
              }
            : undefined,
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
          providerTaskId,
          renderedDurationSec: result.renderedDurationSec || requestConfig.renderedDurationSec,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "视频生成失败";
      }

      if (lastError) {
        const disposition = this.classifyVideoProviderFailure(lastError);
        const normalizedMessage = this.normalizeVideoProviderFailureMessage(lastError);
        const attemptLabel = `${candidate.label}${candidate.useReferenceImage ? "（图生视频）" : "（文生视频）"}`;
        attemptLabels.push(attemptLabel);
        providerErrors.push(`${attemptLabel}：${normalizedMessage}`);
        await params.onProviderAttemptFailed?.({
          provider: candidate.backend,
          modelName: currentModelName || "",
          providerTaskId: providerTaskIdForAttempt || "",
          renderedDurationSec: undefined,
          attemptLabel,
          message: normalizedMessage,
          disposition,
          willFallback: disposition !== "hard" && index < providerPlan.length - 1,
        });
        if (!requestedProviderFailureMessage && candidate.backend === requestedBackend) {
          requestedProviderFailureLabel = attemptLabel;
          requestedProviderFailureMessage = normalizedMessage;
        }
        if (disposition === "hard") {
          hardFailureLabel = attemptLabel;
          hardFailureSummary = this.summarizeVideoProviderFailure(normalizedMessage, disposition);
          break;
        }
      }
    }

    const attemptTrace = attemptLabels.join(" -> ");
    if (hardFailureSummary) {
      if (
        requestedProviderFailureMessage
        && hardFailureLabel
        && requestedProviderFailureLabel
        && hardFailureLabel !== requestedProviderFailureLabel
      ) {
        throw new ServiceUnavailableException(
          `视频生成失败：首选 ${requestedProviderFailureLabel} 失败：${requestedProviderFailureMessage}；随后兜底 ${hardFailureLabel} 失败：${hardFailureSummary}${attemptTrace ? `；尝试轨迹：${attemptTrace}` : ""}`,
        );
      }
      throw new ServiceUnavailableException(`视频生成失败：${hardFailureSummary}${attemptTrace ? `；尝试轨迹：${attemptTrace}` : ""}`);
    }
    if (requestedProviderFailureMessage && providerErrors.length > 1) {
      const lastFailure = providerErrors[providerErrors.length - 1]?.split("：").slice(1).join("：").trim() || "";
      throw new ServiceUnavailableException(
        `视频生成失败：首选 ${requestedProviderFailureLabel} 失败：${requestedProviderFailureMessage}；随后同类兜底仍失败：${this.summarizeVideoProviderFailure(lastFailure, "retryable")}${attemptTrace ? `；尝试轨迹：${attemptTrace}` : ""}`,
      );
    }
    const primaryFailure = requestedProviderFailureMessage || providerErrors[0]?.split("：").slice(1).join("：").trim() || "";
    throw new ServiceUnavailableException(
      `视频生成失败：${this.summarizeVideoProviderFailure(primaryFailure, "retryable")}${attemptTrace ? `；尝试轨迹：${attemptTrace}` : ""}`,
    );
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
      || this.readOptionalString(cause?.message)
      || (error instanceof Error ? this.readOptionalString(error.message) : undefined)
      || this.readOptionalString(topLevel?.message);
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
    const normalizedApiKey = this.normalizeApiKeyForHeader(apiKey);
    try {
      const response = await fetch(`${baseUrl}${requestPath}`, {
        method: options.method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${normalizedApiKey}`,
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
    options: {
      fallbackDurationSec?: number;
      queryMethod?: "GET" | "POST";
      queryBodyMode?: "taskId-json" | "task_id-json";
      pollMaxAttempts?: number;
      pollIntervalMs?: number;
      queryTargets?: Array<{ baseUrl: string; apiKey: string }>;
      onSnapshot?: (snapshot: ReturnType<WorksService["readVideoTaskSnapshot"]>) => Promise<void> | void;
      onQueryError?: (message: string) => Promise<void> | void;
    },
  ) {
    let lastState = "";
    let lastError = "";
    const maxAttempts = options.pollMaxAttempts && options.pollMaxAttempts > 0 ? options.pollMaxAttempts : 40;
    const pollIntervalMs = options.pollIntervalMs && options.pollIntervalMs >= 1000 ? options.pollIntervalMs : 4000;
    const minimumPollWindowMs = this.resolveVideoMinimumPollWindowMs(backend);
    const computedPollWindowMs = Math.max(maxAttempts * pollIntervalMs, minimumPollWindowMs);
    const cappedPollWindowMs = Math.min(computedPollWindowMs, VIDEO_TASK_TOTAL_TIMEOUT_MS);
    const deadlineAt = Date.now() + cappedPollWindowMs;
    while (Date.now() < deadlineAt) {
      let snapshot: Awaited<ReturnType<WorksService["queryVideoGenerationSnapshot"]>>;
      const remainingMsBeforeQuery = deadlineAt - Date.now();
      if (remainingMsBeforeQuery <= 0) {
        break;
      }
      try {
        snapshot = await this.queryVideoGenerationSnapshotWithTargets(
          options.queryTargets?.length ? options.queryTargets : [{ baseUrl, apiKey }],
          backend,
          queryPath,
          taskId,
          {
            ...options,
            queryTimeoutMs: Math.min(VIDEO_TASK_QUERY_TIMEOUT_MS, remainingMsBeforeQuery),
          },
        );
      } catch (error) {
        lastError = error instanceof Error ? error.message : "视频任务查询失败";
        await options.onQueryError?.(lastError);
        const remainingMs = deadlineAt - Date.now();
        if (remainingMs <= 0) {
          break;
        }
        await wait(Math.min(pollIntervalMs, remainingMs));
        continue;
      }
      await options.onSnapshot?.(snapshot);
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
      const remainingMs = deadlineAt - Date.now();
      if (remainingMs <= 0) {
        break;
      }
      await wait(Math.min(pollIntervalMs, remainingMs));
    }

    const timeoutMessage = `第三方视频生成超过20分钟仍未完成，当前状态：${lastState || "UNKNOWN"}`;
    throw new ServiceUnavailableException(lastError ? `${timeoutMessage}；最后一次查询结果：${lastError}` : timeoutMessage);
  }

  private async queryVideoGenerationSnapshot(
    baseUrl: string,
    apiKey: string,
    backend: VideoBackendKey,
    queryPath: string,
    taskId: string,
    options: {
      fallbackDurationSec?: number;
      queryMethod?: "GET" | "POST";
      queryBodyMode?: "taskId-json" | "task_id-json";
      queryTimeoutMs?: number;
    },
  ) {
    const response = await this.requestAuthorizedJson(
      baseUrl,
      this.resolveVideoQueryPath(queryPath, taskId, options.queryMethod),
      apiKey,
      {
        method: options.queryMethod || "GET",
        body: this.buildVideoQueryBody(taskId, options.queryBodyMode),
        timeoutMs: options.queryTimeoutMs && options.queryTimeoutMs > 0 ? options.queryTimeoutMs : VIDEO_TASK_QUERY_TIMEOUT_MS,
      },
    );
    return this.readVideoTaskSnapshot(response, backend, options.fallbackDurationSec);
  }

  private async queryVideoGenerationSnapshotWithTargets(
    targets: Array<{ baseUrl: string; apiKey: string }>,
    backend: VideoBackendKey,
    queryPath: string,
    taskId: string,
    options: {
      fallbackDurationSec?: number;
      queryMethod?: "GET" | "POST";
      queryBodyMode?: "taskId-json" | "task_id-json";
      queryTimeoutMs?: number;
    },
  ) {
    let lastError: unknown;
    const effectiveTargets = targets.length ? targets : [];
    for (const target of effectiveTargets) {
      try {
        return await this.queryVideoGenerationSnapshot(
          target.baseUrl,
          target.apiKey,
          backend,
          queryPath,
          taskId,
          options,
        );
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new ServiceUnavailableException("视频任务查询失败");
  }

  private resolveVideoQueryPath(queryPath: string, taskId: string, queryMethod: "GET" | "POST" = "GET") {
    if (queryMethod === "POST") {
      return queryPath;
    }
    if (queryPath.includes("{task_id}")) {
      return queryPath.replace("{task_id}", encodeURIComponent(taskId));
    }
    if (queryPath.includes("{id}")) {
      return queryPath.replace("{id}", encodeURIComponent(taskId));
    }
    const separator = queryPath.includes("?") ? "&" : "?";
    return `${queryPath}${separator}task_id=${encodeURIComponent(taskId)}`;
  }

  private buildVideoQueryBody(taskId: string, queryBodyMode?: "taskId-json" | "task_id-json") {
    if (queryBodyMode === "task_id-json") {
      return { task_id: taskId };
    }
    if (queryBodyMode === "taskId-json") {
      return { taskId };
    }
    return undefined;
  }

  private extractVideoTaskId(payload: Record<string, unknown>) {
    return this.readOptionalString(payload.taskId)
      || this.readOptionalString(payload.task_id)
      || this.readOptionalString(payload.id)
      || this.readOptionalString(this.asRecord(payload.data)?.taskId)
      || this.readOptionalString(this.asRecord(payload.data)?.task_id)
      || this.readOptionalString(this.asRecord(payload.data)?.id);
  }

  private readVideoCreateFailureReason(payload: Record<string, unknown>) {
    const topLevelData = this.asRecord(payload.data);
    const nestedError = this.asRecord(payload.error);
    return this.readOptionalString(payload.errorMessage)
      || this.readOptionalString(payload.message)
      || this.readOptionalString(payload.msg)
      || this.readOptionalString(payload.errorMsg)
      || this.readOptionalString(payload.error_code)
      || this.readOptionalString(payload.errorCode)
      || this.readOptionalString(topLevelData?.errorMessage)
      || this.readOptionalString(topLevelData?.message)
      || this.readOptionalString(topLevelData?.msg)
      || this.readOptionalString(topLevelData?.errorMsg)
      || this.readOptionalString(nestedError?.code)
      || this.readOptionalString(nestedError?.message)
      || this.readOptionalString(nestedError?.msg);
  }

  private readVideoTaskSnapshot(payload: Record<string, unknown>, backend: VideoBackendKey, fallbackDurationSec?: number) {
    const topLevelData = this.asRecord(payload.data);
    const topLevelResultData = this.asRecord(topLevelData?.result);
    const topLevelOutputData = this.asRecord(topLevelResultData?.output);
    const topLevelContent = this.asRecord(payload.content);
    const resultContent = this.asRecord(topLevelResultData?.content);
    const taskResultRecord = this.asRecord(topLevelData?.task_result);
    const taskResultContent = this.asRecord(taskResultRecord?.content);
    const topLevelResults = Array.isArray(payload.results) ? payload.results.map((item) => this.asRecord(item)) : [];
    const topLevelResult = topLevelResults.find((item) => Boolean(item)) || null;
    const normalizedBackend = String(backend || "").toLowerCase();
    const supportsApizImageStyleVideoResult = normalizedBackend.includes("apiz");
    const taskStatusRaw = String(
      topLevelData?.task_status
      || payload.taskStatus
      || payload.status
      || this.readOptionalString(topLevelData?.status)
      || "",
    ).trim();
    const normalizedStatus = this.normalizeVideoTaskStatus(taskStatusRaw);

    const directVideoUrl = this.readUrlLikeValue(topLevelResult?.url)
      || this.readUrlLikeValue(topLevelResult?.fileUrl)
      || this.readUrlLikeValue(topLevelData?.output)
      || this.readUrlLikeValue(topLevelData?.video_url)
      || this.readUrlLikeValue(topLevelResultData?.video_url)
      || this.readUrlLikeValue(topLevelOutputData?.video_url)
      || this.readUrlLikeValue(topLevelOutputData?.videoUrl)
      || this.readUrlLikeValue(topLevelOutputData?.url)
      || this.readUrlLikeValue(topLevelContent?.video_url)
      || this.readUrlLikeValue(topLevelContent?.videoUrl)
      || this.readUrlLikeValue(resultContent?.video_url)
      || this.readUrlLikeValue(resultContent?.videoUrl)
      || this.readUrlLikeValue(taskResultRecord?.url)
      || this.readUrlLikeValue(taskResultRecord?.video_url)
      || this.readUrlLikeValue(taskResultContent?.video_url)
      || this.readUrlLikeValue(taskResultContent?.videoUrl)
      || (supportsApizImageStyleVideoResult
        ? this.readUrlLikeValue(topLevelOutputData?.images)
          || this.readUrlLikeValue(topLevelResultData?.images)
          || this.readUrlLikeValue(topLevelResult?.images)
          || this.readUrlLikeValue(taskResultRecord?.images)
        : undefined);
    const firstVideo = Array.isArray(taskResultRecord?.videos)
      ? this.asRecord((taskResultRecord?.videos as unknown[])[0])
      : null;
    const firstOutputVideo = Array.isArray(topLevelOutputData?.videos)
      ? this.asRecord((topLevelOutputData?.videos as unknown[])[0])
      : null;
    const videoUrl = directVideoUrl
      || this.readUrlLikeValue(firstVideo?.url)
      || this.readUrlLikeValue(firstVideo?.video_url)
      || this.readUrlLikeValue(firstOutputVideo?.url)
      || this.readUrlLikeValue(firstOutputVideo?.video_url)
      || this.readUrlLikeValue(payload.output)
      || this.readUrlLikeValue(payload.download_url)
      || (supportsApizImageStyleVideoResult ? this.readUrlLikeValue(payload.images) : undefined);
    const coverImageUrl = this.readOptionalString(topLevelResult?.coverUrl)
      || this.readOptionalString(topLevelResult?.thumbnailUrl)
      || this.readOptionalString(topLevelData?.last_frame_url)
      || this.readOptionalString(topLevelOutputData?.last_frame_url)
      || this.readOptionalString(topLevelOutputData?.cover_url)
      || this.readOptionalString(topLevelContent?.last_frame_url)
      || this.readOptionalString(topLevelData?.cover_url)
      || this.readOptionalString(payload.cover_url);
    const failReason = this.readOptionalString(payload.failedReason)
      || this.readOptionalString(this.asRecord(payload.failedReason)?.message)
      || this.readOptionalString(payload.fail_reason)
      || this.readOptionalString(payload.errorMessage)
      || this.readOptionalString(payload.message)
      || this.readOptionalString(this.asRecord(payload.error)?.code)
      || this.readOptionalString(this.asRecord(payload.error)?.message)
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
      rawStatus: taskStatusRaw || undefined,
      videoUrl,
      coverImageUrl,
      failReason,
      renderedDurationSec,
      backend,
    };
  }

  private normalizeVideoTaskStatus(rawStatus: string): "SUCCESS" | "FAILED" | "IN_PROGRESS" {
    const normalized = rawStatus.toUpperCase();
    if (!normalized) {
      return "IN_PROGRESS";
    }
    if (normalized.includes("SUCCESS") || normalized.includes("SUCCEED") || normalized.includes("COMPLETED")) {
      return "SUCCESS";
    }
    if (normalized.includes("EXPIRED") || normalized.includes("CANCEL")) {
      return "FAILED";
    }
    if (normalized.includes("FAIL")) {
      return "FAILED";
    }
    if (
      normalized.includes("NOT_START")
      || normalized.includes("SUBMITTED")
      || normalized.includes("PROCESS")
      || normalized.includes("PROGRESS")
      || normalized.includes("QUEUE")
      || normalized.includes("RUNNING")
    ) {
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

  private buildImageGenerationPayload(
    provider: ImageProviderConfig,
    modelName: string,
    prompt: string,
    referenceImageUrls: string[],
    promptMode: ImagePromptMode = "social_graphic",
  ) {
    if (provider.requestMode === "apiz-task") {
      const normalizedModelName = String(modelName || "").toLowerCase();
      const shouldIncludeReferenceImages = referenceImageUrls.length > 0
        && (provider.supportsReferenceImages || normalizedModelName.includes("/edit"));
      const params: Record<string, unknown> = {
        prompt,
        image_size: this.resolveApizImageSize(modelName, referenceImageUrls, promptMode),
        resolution: "1K",
        num_images: 1,
      };
      if (shouldIncludeReferenceImages) {
        params.image_urls = referenceImageUrls;
      }
      return {
        model: modelName,
        params,
        channel: null,
      };
    }
    if (provider.requestMode === "images-generations") {
      return {
        model: modelName,
        prompt,
        image: referenceImageUrls,
        size: "1242x1660",
        response_format: "url",
      };
    }
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

  private resolveApizImageSize(modelName: string, referenceImageUrls: string[], promptMode: ImagePromptMode) {
    const normalizedModelName = String(modelName || "").toLowerCase();
    if (normalizedModelName.includes("/edit")) {
      return "auto";
    }
    if (referenceImageUrls.length) {
      return promptMode === "video_storyboard" ? "3:4" : "4:3";
    }
    return promptMode === "video_storyboard" ? "3:4" : "4:3";
  }

  private async pollImageGenerationResult(
    baseUrl: string,
    apiKey: string,
    queryPath: string,
    taskId: string,
    options: {
      queryMethod?: "GET" | "POST";
      queryBodyMode?: "taskId-json" | "task_id-json";
      requestTimeoutMs?: number;
    },
  ) {
    let lastState = "";
    let lastError = "";
    const deadlineAt = Date.now() + IMAGE_TASK_TOTAL_TIMEOUT_MS;
    while (Date.now() < deadlineAt) {
      let response: Record<string, unknown>;
      try {
        response = await this.requestAuthorizedJson(
          baseUrl,
          this.resolveVideoQueryPath(queryPath, taskId, options.queryMethod),
          apiKey,
          {
            method: options.queryMethod || "POST",
            body: this.buildVideoQueryBody(taskId, options.queryBodyMode),
            timeoutMs: Math.min(options.requestTimeoutMs || IMAGE_TASK_QUERY_TIMEOUT_MS, IMAGE_TASK_QUERY_TIMEOUT_MS),
          },
        );
      } catch (error) {
        lastError = error instanceof Error ? error.message : "图片任务查询失败";
        if (this.isTerminalImageQueryError(lastError)) {
          throw new ServiceUnavailableException(lastError);
        }
        const remainingMs = deadlineAt - Date.now();
        if (remainingMs <= 0) {
          break;
        }
        await wait(Math.min(IMAGE_TASK_POLL_INTERVAL_MS, remainingMs));
        continue;
      }
      const snapshot = this.readImageTaskSnapshot(response);
      lastState = snapshot.status;
      if (snapshot.status === "SUCCESS" && snapshot.asset) {
        return snapshot.asset;
      }
      if (snapshot.status === "FAILED") {
        throw new ServiceUnavailableException(snapshot.failReason || "第三方图片生成任务失败");
      }
      if (snapshot.status === "SUCCESS" && !snapshot.asset) {
        lastError = "图片任务已完成，但查询结果未返回图片地址";
      } else {
        lastError = snapshot.failReason || "";
      }
      const remainingMs = deadlineAt - Date.now();
      if (remainingMs <= 0) {
        break;
      }
      await wait(Math.min(IMAGE_TASK_POLL_INTERVAL_MS, remainingMs));
    }
    throw new ServiceUnavailableException(lastError || `图片任务长时间未完成，当前状态：${lastState || "UNKNOWN"}`);
  }

  private readImageTaskSnapshot(payload: Record<string, unknown>) {
    const topLevelData = this.asRecord(payload.data);
    const resultRecord = this.asRecord(topLevelData?.result);
    const outputRecord = this.asRecord(resultRecord?.output);
    const topLevelContent = this.asRecord(payload.content);
    const topLevelResults = Array.isArray(payload.results) ? payload.results.map((item) => this.asRecord(item)) : [];
    const topLevelResult = topLevelResults.find((item) => Boolean(item)) || null;
    const taskResultRecord = this.asRecord(topLevelData?.task_result);
    const taskStatusRaw = String(
      this.readOptionalString(topLevelData?.status)
      || this.readOptionalString(topLevelData?.task_status)
      || this.readOptionalString(topLevelResult?.status)
      || this.readOptionalString(topLevelContent?.status)
      || this.readOptionalString(payload.status)
      || "",
    ).trim();
    const normalizedStatus = this.normalizeVideoTaskStatus(taskStatusRaw);
    const directImages = Array.isArray(outputRecord?.images) ? outputRecord.images : [];
    const firstImage = this.asRecord(directImages[0]);
    const resultImages = Array.isArray(topLevelResult?.images) ? topLevelResult.images : [];
    const firstResultImage = this.asRecord(resultImages[0]);
    const taskResultImages = Array.isArray(taskResultRecord?.images) ? taskResultRecord.images : [];
    const firstTaskResultImage = this.asRecord(taskResultImages[0]);
    const firstImageUrl = typeof directImages[0] === "string"
      ? String(directImages[0] || "").trim()
      : this.readOptionalString(firstImage?.url) || this.readOptionalString(firstImage?.image_url);
    const firstResultImageUrl = typeof resultImages[0] === "string"
      ? String(resultImages[0] || "").trim()
      : this.readOptionalString(firstResultImage?.url) || this.readOptionalString(firstResultImage?.image_url);
    const firstTaskResultImageUrl = typeof taskResultImages[0] === "string"
      ? String(taskResultImages[0] || "").trim()
      : this.readOptionalString(firstTaskResultImage?.url) || this.readOptionalString(firstTaskResultImage?.image_url);
    const directUrl =
      firstImageUrl
      || firstResultImageUrl
      || firstTaskResultImageUrl
      || this.readUrlLikeValue(outputRecord?.image_url)
      || this.readUrlLikeValue(outputRecord?.url)
      || this.readUrlLikeValue(resultRecord?.image_url)
      || this.readUrlLikeValue(resultRecord?.url)
      || this.readUrlLikeValue(topLevelResult?.image_url)
      || this.readUrlLikeValue(topLevelResult?.url)
      || this.readUrlLikeValue(topLevelResult?.fileUrl)
      || this.readUrlLikeValue(topLevelContent?.image_url)
      || this.readUrlLikeValue(topLevelContent?.url)
      || this.readUrlLikeValue(taskResultRecord?.image_url)
      || this.readUrlLikeValue(taskResultRecord?.url)
      || this.readUrlLikeValue(topLevelData?.output)
      || this.readUrlLikeValue(topLevelData?.image_url)
      || this.readUrlLikeValue(topLevelData?.url)
      || this.readUrlLikeValue(payload.output)
      || this.readUrlLikeValue(payload.url)
      || this.readUrlLikeValue(payload.download_url)
      || this.readUrlLikeValue(payload.image_url);
    const failReason =
      this.readOptionalString(payload.errorMessage)
      || this.readOptionalString(payload.message)
      || this.readOptionalString(this.asRecord(payload.error)?.message)
      || this.readOptionalString(topLevelData?.task_status_msg)
      || this.readOptionalString(topLevelData?.message)
      || this.readOptionalString(topLevelResult?.message)
      || this.readOptionalString(topLevelContent?.message);

    return {
      status: normalizedStatus,
      failReason,
      asset: directUrl
        ? {
          url: directUrl,
          base64: undefined,
          extension: ".png",
          contentType: "image/png",
        }
        : null,
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

  private buildImageGenerationReferenceInputs(referenceImageUrls: string[], referenceImagePayloads?: UploadFilePayload[]) {
    const uploadedReferenceImages = (referenceImagePayloads || [])
      .filter((item) => item?.dataBase64)
      .map((item) => this.toDataUrl(item));
    return Array.from(new Set([...uploadedReferenceImages, ...referenceImageUrls].map((item) => String(item || "").trim()).filter(Boolean))).slice(0, 6);
  }

  private buildImagePromptWithTextPlan(
    executionPrompt: string | undefined,
    prompt: string,
    textPlan: ImageTextPlanEntry | undefined,
    role: "COVER" | "GALLERY",
    order: number,
    promptMode: ImagePromptMode = "social_graphic",
  ) {
    if (promptMode === "video_storyboard") {
      return [
        executionPrompt?.trim() || "",
        "",
        prompt.trim(),
        "",
        "补充强制要求：这是一张短视频故事板单帧画面，不是小红书图文封面，不是海报，也不是信息长图。",
        "不要额外生成中文标题、角标、标签、排版大字、贴纸、按钮或 APP 界面，除非提示词明确要求这些元素。",
        "必须严格按提示词中的角色、场景、动作、镜头关系和情绪出图，优先保证叙事一致性，不能只保留泛化氛围。",
        "如果输入中带有参考图，必须继承角色外观、构图、机位、光线和连续性，避免换脸、换服装、换场景。",
        "输出应接近电影分镜或关键帧画面，突出主体、动作瞬间、景别和镜头语言，避免做成电商海报或封面排版图。",
      ]
        .filter(Boolean)
        .join("\n");
    }
    const title = this.normalizeImageTextValue(textPlan?.title, 20);
    const badges = (textPlan?.badges || []).map((item) => this.normalizeImageTextValue(item, 16)).filter(Boolean);
    const imageLabel = role === "COVER" ? "封面图" : `第${order + 1}张配图`;
    return [
      executionPrompt?.trim() || "",
      "",
      prompt.trim(),
      "",
      `补充强制要求：这是一张${imageLabel}，必须输出带清晰中文排版的社媒成品图，不能只生成纯场景摄影图。`,
      "画面必须为竖版小红书图文比例，严格按 1242x1660（宽3:高4）构图，禁止输出横图、方图或接近方图的比例。",
      title ? `画面主标题必须直接排版为：${title}` : "",
      badges.length ? `画面中还必须出现这些小标签：${badges.join("、")}` : "",
      "如果输入中带有参考图，必须显著继承其构图、视角、主体摆位、光线和留白关系，不能只保留泛化氛围。",
      "文字必须直接出现在画面主体版式中，清晰可读，不能只写在手写卡片、包装角落、远处招牌或模糊背景里。",
      "所有标题和标签必须完整落在画面安全区内，四周至少保留 8% 安全边距，严禁任何文字超出图片边界、贴边、被裁切或被主体遮挡。",
      "主标题最多两行，小标签数量从简，必须有明确的字号层级、颜色对比和留白，任何一项都不能省略。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private buildImagePromptCandidates(prompt: string, options?: { includeFallback?: boolean }) {
    const normalized = prompt.trim();
    const compact = normalized
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[{}[\]<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const concise = compact.length > 360 ? `${compact.slice(0, 360)}。` : compact;
    const fallback = `请根据以下中文描述生成一张高质量社媒图片：${concise}`;
    const candidates = [normalized];
    if (options?.includeFallback ?? true) {
      candidates.push(fallback);
    }
    return Array.from(new Set(candidates.filter(Boolean)));
  }

  private async readResponseSnippet(response: Response) {
    try {
      const text = await response.text();
      return text.replace(/\s+/g, " ").trim().slice(0, 180);
    } catch {
      return "";
    }
  }

  private isTerminalImageQueryError(message: string) {
    const normalized = String(message || "").toLowerCase();
    return /任务执行失败|任务失败|task execution failed|task failed|authenticationerror|unauthorized|invalid header value/i.test(normalized);
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

  private normalizeNumberArray(raw: unknown, fallback: number[] = [], limit = 8) {
    const values = Array.isArray(raw)
      ? raw
          .map((item) => (typeof item === "number" ? item : Number(item)))
          .filter((item) => Number.isFinite(item))
          .map((item) => Math.round(item))
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

  private readUrlLikeValue(value: unknown): string | undefined {
    if (typeof value === "string") {
      const text = value.trim();
      return /^https?:\/\//i.test(text) ? text : undefined;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = this.readUrlLikeValue(item);
        if (nested) {
          return nested;
        }
      }
      return undefined;
    }
    const record = this.asRecord(value);
    if (!record) {
      return undefined;
    }
    return this.readUrlLikeValue(record.url)
      || this.readUrlLikeValue(record.image_url)
      || this.readUrlLikeValue(record.download_url)
      || this.readUrlLikeValue(record.fileUrl)
      || this.readUrlLikeValue(record.output)
      || this.readUrlLikeValue(record.images)
      || this.readUrlLikeValue(record.result)
      || this.readUrlLikeValue(record.content)
      || this.readUrlLikeValue(record.data);
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
    const normalizedApiKey = this.normalizeApiKeyForHeader(apiKey);
    try {
      return await fetch(`${baseUrl}${completionPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${normalizedApiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private resolveModelAttemptTimeoutMs(configuredTimeoutMs: number | undefined, defaultTimeoutMs: number) {
    if (configuredTimeoutMs && configuredTimeoutMs > 0) {
      return Math.min(configuredTimeoutMs, defaultTimeoutMs);
    }
    return defaultTimeoutMs;
  }

  private normalizeApiKeyForHeader(apiKey: string) {
    return String(apiKey || "").replace(/\s+/g, "").trim();
  }

  private toDataUrl(payload: UploadFilePayload) {
    return `data:${payload.contentType || "image/jpeg"};base64,${payload.dataBase64}`;
  }

  private async writeGeneratedTextFile(brandId: string, fileName: string, content: string) {
    const storageKey = this.buildGeneratedAssetStorageKey(brandId, fileName);
    await this.persistGeneratedObject(storageKey, Buffer.from(content, "utf8"), "text/html; charset=utf-8");
    return {
      storageKey,
      url: this.resolveGeneratedAssetUrl(brandId, fileName),
    };
  }

  private async writeGeneratedBinaryFile(brandId: string, fileName: string, base64: string, contentType: string) {
    const buffer = Buffer.from(base64, "base64");
    const storageKey = this.buildGeneratedAssetStorageKey(brandId, fileName);
    await this.persistGeneratedObject(storageKey, buffer, contentType || "application/octet-stream");
    return {
      storageKey,
      url: this.resolveGeneratedAssetUrl(brandId, fileName),
    };
  }

  private persistUploadFile(brandId: string, fileName: string, payload: UploadFilePayload) {
    return this.writeGeneratedBinaryFile(brandId, fileName, payload.dataBase64, payload.contentType || "application/octet-stream");
  }

  private async deleteGeneratedFileIfExists(brandId: string, fileName: string) {
    if (!fileName) {
      return;
    }
    await this.ossStorageService.deleteObject(this.buildGeneratedAssetStorageKey(brandId, fileName));
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

      const sourceAspectRatio = metadata.width / metadata.height;
      const targetAspectRatio = targetWidth / targetHeight;
      const aspectRatioDelta = Math.abs(sourceAspectRatio - targetAspectRatio);
      const useContainResize = aspectRatioDelta > 0.06;

      let pipeline = image.resize({
        width: targetWidth,
        height: targetHeight,
        fit: useContainResize ? "contain" : "cover",
        position: "centre",
        background: useContainResize
          ? {
              r: 255,
              g: 255,
              b: 255,
              alpha: 1,
            }
          : undefined,
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
    fetchTimeoutMs?: number;
  }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.fetchTimeoutMs ?? 120000);
    try {
      if (!/^https?:\/\//i.test(params.remoteUrl)) {
        throw new ServiceUnavailableException(`${params.requestLabel}失败：未返回有效图片地址`);
      }
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
      return (await this.writeGeneratedBinaryFile(params.brandId, targetName, normalizedBuffer.toString("base64"), contentType)).url;
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

  private resolveOriginalReferenceTemplateAssetUrl(templateId: string) {
    return `/api/works/xiaohongshu/original/reference-templates/${encodeURIComponent(templateId)}/asset`;
  }

  private findOriginalReferenceTemplateById(templateId: string) {
    const template = XHS_ORIGINAL_REFERENCE_TEMPLATE_LIBRARY.items.find((item) => item.id === templateId);
    if (!template) {
      throw new NotFoundException("原创参考模板不存在");
    }
    return template;
  }

  private resolveGeneratedAssetUrl(brandId: string, fileName: string) {
    return `${this.resolveServerBaseUrl()}/api/works/brands/${brandId}/assets/${encodeURIComponent(fileName)}`;
  }

  private async resolveThirdPartyAccessibleAssetUrl(url: string | undefined, brandId: string) {
    const normalizedUrl = String(url || "").trim();
    if (!normalizedUrl) {
      return "";
    }
    const storageKey = this.toStorageKeyFromUrl(normalizedUrl);
    if (!storageKey.startsWith(`works/${brandId}/`)) {
      return normalizedUrl;
    }
    if (!this.ossStorageService.isEnabled()) {
      return normalizedUrl;
    }
    return this.ossStorageService.getSignedReadUrl(storageKey);
  }

  private buildGeneratedAssetStorageKey(brandId: string, fileName: string) {
    return `works/${brandId}/${fileName}`;
  }

  private async persistGeneratedObject(storageKey: string, buffer: Buffer, contentType: string) {
    await this.ossStorageService.putObject(storageKey, buffer, contentType);
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
