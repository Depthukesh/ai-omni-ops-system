import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Inject, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AssetCategory, MediaType, Prisma, TaskStatus } from "@prisma/client";
import { createId, database, type ApiProviderRecord, type AssetRecord } from "../../common/mock-data";
import { XHS_MARKETING_CALENDAR_PROMPT_FALLBACK } from "../../common/prompt-fallbacks";
import { AppConfigService } from "../../config/app-config.service";
import { OssStorageService } from "../../storage/oss-storage.service";
import { ApiProvidersService } from "../admin/api-providers.service";
import { CollectorsService } from "../collectors/collectors.service";
import { BrandsService } from "../brands/brands.service";
import { SkillsPromptsService } from "../admin/skills-prompts.service";
import { ThirdPartyPlatformsService } from "../third-party-platforms/third-party-platforms.service";
import { PrismaService } from "../../prisma/prisma.service";
const GROWTH_REPORT_TASK_TIMEOUT_MS = 15 * 60 * 1000;
const VISUAL_REPORT_TASK_TIMEOUT_MS = 10 * 60 * 1000;
const ANNUAL_MARKETING_PLAN_TASK_TIMEOUT_MS = 15 * 60 * 1000;
const XIAOHONGSHU_MARKETING_PLAN_TASK_TIMEOUT_MS = 60 * 60 * 1000;
const DOUYIN_MARKETING_PLAN_TASK_TIMEOUT_MS = 60 * 60 * 1000;
const DOUYIN_HOT_TOPIC_CANDIDATES_TASK_TIMEOUT_MS = 10 * 60 * 1000;
const XIAOHONGSHU_MARKETING_CALENDAR_TASK_TIMEOUT_MS = 10 * 60 * 1000;
const TEXT_MODEL_ATTEMPT_TIMEOUT_MS = 120 * 1000;
const CURRENT_HALF_YEAR_MARKETING_PLAN_ASSET_KIND = "BRAND_HALF_YEAR_MARKETING_PLAN";
const LEGACY_ANNUAL_MARKETING_PLAN_ASSET_KIND = "BRAND_ANNUAL_MARKETING_PLAN";
const CURRENT_HALF_YEAR_MARKETING_PLAN_TASK_TYPE = "BRAND_HALF_YEAR_MARKETING_PLAN";
const LEGACY_ANNUAL_MARKETING_PLAN_TASK_TYPE = "BRAND_ANNUAL_MARKETING_PLAN";
const HALF_YEAR_MARKETING_PLAN_TASK_TYPES = [
  CURRENT_HALF_YEAR_MARKETING_PLAN_TASK_TYPE,
  LEGACY_ANNUAL_MARKETING_PLAN_TASK_TYPE,
];
const HALF_YEAR_MARKETING_PLAN_ASSET_KINDS = [
  CURRENT_HALF_YEAR_MARKETING_PLAN_ASSET_KIND,
  LEGACY_ANNUAL_MARKETING_PLAN_ASSET_KIND,
] as const;

type GrowthReportAssetMeta = {
  kind: "BRAND_GROWTH_REPORT";
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  summary: string;
  reportMarkdown?: string;
  diagnosis: string[];
  opportunities: string[];
  nextActions: string[];
  metrics: {
    productCount: number;
    platformAccountCount: number;
    competitorAccountCount: number;
    brandNoteCount: number;
    benchmarkNoteCount: number;
  };
  htmlContent: string;
};

type VisualGrowthReportAssetMeta = {
  kind: "BRAND_GROWTH_VISUAL_REPORT";
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  summary: string;
  htmlBody: string;
  htmlDocument: string;
};

type AnnualMarketingPlanRow = {
  month: string;
  node: string;
  date: string;
  type: string;
  marketingTheme: string;
  platforms: string[];
  strategy: string;
  products: string[];
};

type AnnualMarketingPlanAssetMeta = {
  kind: typeof CURRENT_HALF_YEAR_MARKETING_PLAN_ASSET_KIND | typeof LEGACY_ANNUAL_MARKETING_PLAN_ASSET_KIND;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  summary: string;
  planningYear: string;
  planningFocus: string[];
  items: AnnualMarketingPlanRow[];
  htmlBody: string;
  htmlDocument: string;
};

type XiaohongshuMarketingPlanAssetMeta = {
  kind: "XHS_MARKETING_PLAN";
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceAnnualPlanId?: string;
  sourceAnnualPlanTitle?: string;
  summary: string;
  reportMarkdown: string;
  htmlContent: string;
  modelName?: string;
};

type DouyinMarketingPlanAssetMeta = {
  kind: "DOUYIN_MARKETING_PLAN";
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceAnnualPlanId?: string;
  sourceAnnualPlanTitle?: string;
  summary: string;
  reportMarkdown: string;
  htmlContent: string;
  modelName?: string;
};

type DouyinHotTopicCandidateItem = {
  id: string;
  title: string;
  checked?: boolean;
};

type DouyinHotTopicCandidatesAssetMeta = {
  kind: "DOUYIN_HOT_TOPIC_CANDIDATES";
  generatedAt: string;
  taskId?: string;
  summary: string;
  selectedDate: string;
  modelName?: string;
  items: DouyinHotTopicCandidateItem[];
  reportContent?: string;
};

type XiaohongshuMarketingCalendarItem = {
  id: string;
  date: string;
  topicName: string;
  productName?: string;
  noteType?: string;
  targetAudience?: string;
  contentGoal?: string;
  expressionFocus?: string;
  topicContent?: string;
  noteKeywords: string[];
  titleDirections: string[];
  bodyStructure?: string;
  coverFormat?: string;
  coverKeywords: string[];
  imageBrief?: string;
};

type XiaohongshuMarketingCalendarAssetMeta = {
  kind: "XHS_MARKETING_CALENDAR";
  generatedAt: string;
  taskId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceAnnualPlanId?: string;
  sourceAnnualPlanTitle?: string;
  sourceMarketingPlanId?: string;
  sourceMarketingPlanTitle?: string;
  summary: string;
  modelName?: string;
  items: XiaohongshuMarketingCalendarItem[];
};

export type GrowthReportRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  reportMarkdown: string;
  htmlContent: string;
  diagnosis: string[];
  opportunities: string[];
  nextActions: string[];
  metrics: {
    productCount: number;
    platformAccountCount: number;
    competitorAccountCount: number;
    brandNoteCount: number;
    benchmarkNoteCount: number;
  };
};

export type VisualGrowthReportRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  htmlBody: string;
  htmlDocument: string;
};

export type AnnualMarketingPlanRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  planningYear: string;
  planningFocus: string[];
  items: AnnualMarketingPlanRow[];
  htmlBody: string;
  htmlDocument: string;
};

export type XiaohongshuMarketingPlanRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceAnnualPlanId?: string;
  sourceAnnualPlanTitle?: string;
  reportMarkdown: string;
  htmlContent: string;
  modelName?: string;
};

export type DouyinMarketingPlanRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  mediaId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceAnnualPlanId?: string;
  sourceAnnualPlanTitle?: string;
  reportMarkdown: string;
  htmlContent: string;
  modelName?: string;
};

export type DouyinHotTopicCandidatesRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  selectedDate: string;
  modelName?: string;
  items: DouyinHotTopicCandidateItem[];
  reportContent?: string;
};

export type XiaohongshuMarketingCalendarRecord = {
  id: string;
  title: string;
  summary: string;
  generatedAt: string;
  taskId?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  sourceAnnualPlanId?: string;
  sourceAnnualPlanTitle?: string;
  sourceMarketingPlanId?: string;
  sourceMarketingPlanTitle?: string;
  modelName?: string;
  items: XiaohongshuMarketingCalendarItem[];
};

export type VisualGrowthReportTaskRecord = {
  id: string;
  taskType: string;
  taskTitle: string;
  taskStatus: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  modelName: string;
  pointsCost: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  sourceReportId?: string;
  sourceReportTitle?: string;
  phase?: string;
  phaseText?: string;
  phaseIndex?: number;
  phaseTotal?: number;
};

export type GrowthReportTaskRecord = VisualGrowthReportTaskRecord;
export type AnnualMarketingPlanTaskRecord = VisualGrowthReportTaskRecord;
export type XiaohongshuMarketingPlanTaskRecord = VisualGrowthReportTaskRecord;
export type DouyinMarketingPlanTaskRecord = VisualGrowthReportTaskRecord;
export type DouyinHotTopicCandidatesTaskRecord = VisualGrowthReportTaskRecord;
export type XiaohongshuMarketingCalendarTaskRecord = VisualGrowthReportTaskRecord;

type ThirdPartyChatConfig = {
  baseUrls: string[];
  completionPath: string;
  apiKeys: string[];
  models: string[];
  temperature: number;
  maxTokens: number;
};

type VisualProviderType = "DEEPSEEK" | "KIMI" | "GLM" | "ARK";
type GrowthReportProviderType = "THIRD_PARTY" | VisualProviderType;

type DomesticVisualProviderConfig = ThirdPartyChatConfig & {
  provider: VisualProviderType;
  requestTimeoutMs?: number;
  payloadExtras?: Record<string, unknown>;
  temperatureOverride?: number;
  tokenLimitField?: "max_tokens" | "max_completion_tokens";
};

type GrowthReportProviderConfig = ThirdPartyChatConfig & {
  provider: GrowthReportProviderType;
  requestTimeoutMs?: number;
  payloadExtras?: Record<string, unknown>;
  temperatureOverride?: number;
  tokenLimitField?: "max_tokens" | "max_completion_tokens";
};

type AnnualMarketingProviderType = "THIRD_PARTY" | "DEEPSEEK" | "ARK";

type AnnualMarketingProviderConfig = ThirdPartyChatConfig & {
  provider: AnnualMarketingProviderType;
  requestTimeoutMs?: number;
  payloadExtras?: Record<string, unknown>;
  temperatureOverride?: number;
  tokenLimitField?: "max_tokens" | "max_completion_tokens";
};

type XiaohongshuMarketingProviderType = "THIRD_PARTY" | VisualProviderType;

type XiaohongshuMarketingProviderConfig = ThirdPartyChatConfig & {
  provider: XiaohongshuMarketingProviderType;
  requestTimeoutMs?: number;
  payloadExtras?: Record<string, unknown>;
  temperatureOverride?: number;
  tokenLimitField?: "max_tokens" | "max_completion_tokens";
};

type ModelGenerationSettings = {
  baseUrl: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  promptContent: string;
  preferredModelName?: string;
  brandId?: string;
  preferredProviderIds?: string[];
};

type GrowthReportModelResult = {
  title: string;
  summary: string;
  diagnosis: string[];
  opportunities: string[];
  nextActions: string[];
  reportMarkdown: string;
};

type VisualReportModelResult = {
  title: string;
  summary: string;
  htmlBody: string;
};

type VisualReportMetricItem = {
  label: string;
  value: string;
  note: string;
};

type VisualReportSectionItem = {
  title: string;
  body: string;
  bullets: string[];
};

type VisualReportOutlineModelResult = {
  title: string;
  summary: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  metrics: VisualReportMetricItem[];
  sections: VisualReportSectionItem[];
  actionTitle: string;
  actionItems: string[];
};

type AnnualMarketingPlanModelResult = {
  title: string;
  summary: string;
  planningYear: string;
  planningFocus: string[];
  items: AnnualMarketingPlanRow[];
  modelName: string;
};

type XiaohongshuMarketingPlanModelResult = {
  title: string;
  summary: string;
  reportMarkdown: string;
  modelName: string;
};

type DouyinMarketingPlanModelResult = {
  title: string;
  summary: string;
  reportMarkdown: string;
  modelName: string;
};

type DouyinHotTopicCandidatesModelResult = {
  title: string;
  summary: string;
  selectedDate: string;
  items: DouyinHotTopicCandidateItem[];
  modelName: string;
  reportContent?: string;
};

type XiaohongshuMarketingCalendarModelResult = {
  title: string;
  summary: string;
  items: XiaohongshuMarketingCalendarItem[];
  modelName: string;
};

type XiaohongshuMarketingPlanSectionResult = {
  markdown: string;
  modelName: string;
};

type XiaohongshuMarketingPlanPhase =
  | "PREPARING"
  | "PART_ONE"
  | "PART_TWO"
  | "PART_THREE"
  | "PART_FOUR"
  | "PART_FIVE"
  | "MERGING"
  | "PERSISTING"
  | "DONE";
type DouyinMarketingPlanPhase = "PREPARING" | "GENERATING" | "PERSISTING" | "DONE";
type DouyinHotTopicCandidatesPhase = "PREPARING" | "GENERATING" | "PERSISTING" | "DONE";
type XiaohongshuMarketingCalendarPhase = "PREPARING" | "GENERATING" | "PERSISTING" | "DONE";

export type UpdateGrowthReportPayload = {
  title?: string;
  reportMarkdown: string;
};

export type UpdateVisualGrowthReportPayload = {
  title?: string;
  htmlBody: string;
};

export type UpdateXiaohongshuMarketingPlanPayload = {
  title?: string;
  reportMarkdown: string;
};

export type UpdateDouyinMarketingPlanPayload = {
  title?: string;
  reportMarkdown: string;
};

export type UpdateXiaohongshuMarketingCalendarPayload = {
  title?: string;
  items: XiaohongshuMarketingCalendarItem[];
};

export type GrowthReportWorkspace = {
  latest?: GrowthReportRecord;
  history: GrowthReportRecord[];
  latestTask?: GrowthReportTaskRecord;
};

export type VisualGrowthReportWorkspace = {
  latest?: VisualGrowthReportRecord;
  history: VisualGrowthReportRecord[];
  latestTask?: VisualGrowthReportTaskRecord;
};

export type AnnualMarketingPlanWorkspace = {
  latest?: AnnualMarketingPlanRecord;
  history: AnnualMarketingPlanRecord[];
  latestTask?: AnnualMarketingPlanTaskRecord;
};

export type XiaohongshuMarketingPlanWorkspace = {
  latest?: XiaohongshuMarketingPlanRecord;
  history: XiaohongshuMarketingPlanRecord[];
  latestTask?: XiaohongshuMarketingPlanTaskRecord;
};

export type DouyinMarketingPlanWorkspace = {
  latest?: DouyinMarketingPlanRecord;
  history: DouyinMarketingPlanRecord[];
  latestTask?: DouyinMarketingPlanTaskRecord;
};

export type DouyinHotTopicCandidatesWorkspace = {
  selectedDate: string;
  availableDates: string[];
  latest?: DouyinHotTopicCandidatesRecord;
  history: DouyinHotTopicCandidatesRecord[];
  latestTask?: DouyinHotTopicCandidatesTaskRecord;
};

export type XiaohongshuMarketingCalendarWorkspace = {
  latest?: XiaohongshuMarketingCalendarRecord;
  history: XiaohongshuMarketingCalendarRecord[];
  latestTask?: XiaohongshuMarketingCalendarTaskRecord;
};

@Injectable()
export class ReportsService {
  private readonly appConfigService = new AppConfigService();
  private readonly ossStorageService = new OssStorageService(this.appConfigService);

  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(BrandsService)
    private readonly brandsService: BrandsService,
    @Inject(CollectorsService)
    private readonly collectorsService: CollectorsService,
    @Inject(ApiProvidersService)
    private readonly apiProvidersService: ApiProvidersService,
    @Inject(SkillsPromptsService)
    private readonly skillsPromptsService: SkillsPromptsService,
    @Inject(ThirdPartyPlatformsService)
    private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService,
  ) {}

  private async resolveBrandAwareApiKeys(brandId: string | undefined, provider: ApiProviderRecord | undefined) {
    if (!provider) {
      return [];
    }
    const resolution = await this.thirdPartyPlatformsService.resolveBrandRuntimeApiKeys(
      brandId,
      this.apiProvidersService.getBaseUrls(provider),
    );
    if (resolution.status === "owner-api-key-missing") {
      throw new ServiceUnavailableException(
        `当前品牌的 Owner 尚未配置第三方平台「${resolution.platform.name}」API Key，请先前往个人中心-第三方接口配置完成设置后再试。`,
      );
    }
    if (resolution.status === "resolved") {
      return resolution.apiKeys;
    }
    return this.apiProvidersService.getApiKeys(provider);
  }

  async getGrowthReportWorkspace(brandId: string): Promise<GrowthReportWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
        orderBy: { createdAt: "desc" },
      });

      const reports = assets
        .map((item) => this.mapGrowthReportAsset({
          id: item.id,
          brandId: item.brandId,
          category: "GENERATED_REPORT",
          title: item.title,
          description: item.description ?? "",
          sourceName: "绯荤粺鐢熸垚",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        }))
        .filter((item): item is GrowthReportRecord => Boolean(item));

      const latestTaskRow = await this.prismaService.task.findFirst({
        where: {
          brandId,
          taskType: "BRAND_GROWTH_REPORT",
        },
        orderBy: { createdAt: "desc" },
      });
      const normalizedTask = latestTaskRow
        ? await this.normalizeLatestGrowthReportTask(brandId, this.mapVisualGrowthReportTask(latestTaskRow))
        : undefined;

      return {
        latest: reports[0],
        history: reports,
        latestTask: normalizedTask,
      };
    }

    this.ensureBrandExistsInMock(brandId);
    const reports = database.assets
      .filter((item) => item.brandId === brandId && item.category === "GENERATED_REPORT")
      .map((item) => this.mapGrowthReportAsset(item))
      .filter((item): item is GrowthReportRecord => Boolean(item))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    const latestTask = [...database.tasks]
      .filter((item) => item.brandId === brandId && item.taskType === "BRAND_GROWTH_REPORT")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const normalizedTask = latestTask
      ? await this.normalizeLatestGrowthReportTask(brandId, this.mapVisualGrowthReportTask(latestTask))
      : undefined;

    return {
      latest: reports[0],
      history: reports,
      latestTask: normalizedTask,
    };
  }

  async generateGrowthReport(brandId: string) {
    const workspace = await this.getGrowthReportWorkspace(brandId);
    const runningTask = workspace.latestTask;
    if (runningTask && (runningTask.taskStatus === "QUEUED" || runningTask.taskStatus === "RUNNING")) {
      return workspace;
    }

    const task = await this.createGrowthReportTask(brandId);
    setTimeout(() => {
      void this.runGrowthReportTask(brandId, task.id);
    }, 0);
    return {
      ...workspace,
      latestTask: task,
    };
  }

  async getVisualGrowthReportWorkspace(brandId: string): Promise<VisualGrowthReportWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
        orderBy: { createdAt: "desc" },
      });

      const reports = assets
        .map((item) => this.mapVisualGrowthReportAsset({
          id: item.id,
          brandId: item.brandId,
          category: "GENERATED_REPORT",
          title: item.title,
          description: item.description ?? "",
          sourceName: "绯荤粺鐢熸垚",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        }))
        .filter((item): item is VisualGrowthReportRecord => Boolean(item));

      const latestTaskRow = await this.prismaService.task.findFirst({
        where: {
          brandId,
          taskType: "BRAND_GROWTH_VISUAL_REPORT",
        },
        orderBy: { createdAt: "desc" },
      });
      const normalizedTask = latestTaskRow
        ? await this.normalizeLatestVisualGrowthReportTask(brandId, this.mapVisualGrowthReportTask(latestTaskRow))
        : undefined;

      return {
        latest: reports[0],
        history: reports,
        latestTask: normalizedTask,
      };
    }

    this.ensureBrandExistsInMock(brandId);
    const reports = database.assets
      .filter((item) => item.brandId === brandId && item.category === "GENERATED_REPORT")
      .map((item) => this.mapVisualGrowthReportAsset(item))
      .filter((item): item is VisualGrowthReportRecord => Boolean(item))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    const latestTask = [...database.tasks]
      .filter((item) => item.brandId === brandId && item.taskType === "BRAND_GROWTH_VISUAL_REPORT")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const normalizedTask = latestTask
      ? await this.normalizeLatestVisualGrowthReportTask(brandId, this.mapVisualGrowthReportTask(latestTask))
      : undefined;

    return {
      latest: reports[0],
      history: reports,
      latestTask: normalizedTask,
    };
  }

  async generateVisualGrowthReport(brandId: string) {
    const sourceWorkspace = await this.getGrowthReportWorkspace(brandId);
    const sourceReport = sourceWorkspace.latest;
    if (!sourceReport) {
      throw new NotFoundException("璇峰厛鐢熸垚鍝佺墝澧為暱鎶ュ憡");
    }
    const workspace = await this.getVisualGrowthReportWorkspace(brandId);
    const runningTask = workspace.latestTask;
    if (runningTask && (runningTask.taskStatus === "QUEUED" || runningTask.taskStatus === "RUNNING")) {
      return workspace;
    }

    const task = await this.createVisualGrowthReportTask(brandId, sourceReport);
    setTimeout(() => {
      void this.runVisualGrowthReportTask(brandId, task.id);
    }, 0);
    return {
      ...workspace,
      latestTask: task,
    };
  }

  async getAnnualMarketingPlanWorkspace(brandId: string): Promise<AnnualMarketingPlanWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
        orderBy: { createdAt: "desc" },
      });

      const plans = assets
        .map((item) => this.mapAnnualMarketingPlanAsset({
          id: item.id,
          brandId: item.brandId,
          category: "GENERATED_REPORT",
          title: item.title,
          description: item.description ?? "",
          sourceName: "绯荤粺鐢熸垚",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        }))
        .filter((item): item is AnnualMarketingPlanRecord => Boolean(item));
      const latestTaskRow = await this.prismaService.task.findFirst({
        where: {
          brandId,
          taskType: {
            in: [...HALF_YEAR_MARKETING_PLAN_TASK_TYPES],
          },
        },
        orderBy: { createdAt: "desc" },
      });
      const normalizedTask = latestTaskRow
        ? await this.normalizeLatestAnnualMarketingPlanTask(brandId, this.mapVisualGrowthReportTask(latestTaskRow))
        : undefined;

      return {
        latest: plans[0],
        history: plans,
        latestTask: normalizedTask,
      };
    }

    this.ensureBrandExistsInMock(brandId);
    const plans = database.assets
      .filter((item) => item.brandId === brandId && item.category === "GENERATED_REPORT")
      .map((item) => this.mapAnnualMarketingPlanAsset(item))
      .filter((item): item is AnnualMarketingPlanRecord => Boolean(item))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    const latestTask = [...database.tasks]
      .filter((item) => item.brandId === brandId && HALF_YEAR_MARKETING_PLAN_TASK_TYPES.includes(item.taskType))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const normalizedTask = latestTask
      ? await this.normalizeLatestAnnualMarketingPlanTask(brandId, this.mapVisualGrowthReportTask(latestTask))
      : undefined;

    return {
      latest: plans[0],
      history: plans,
      latestTask: normalizedTask,
    };
  }

  async generateAnnualMarketingPlan(brandId: string) {
    const sourceWorkspace = await this.getGrowthReportWorkspace(brandId);
    const sourceReport = sourceWorkspace.latest;
    if (!sourceReport) {
      throw new NotFoundException("璇峰厛鐢熸垚鍝佺墝澧為暱鎶ュ憡");
    }
    const workspace = await this.getAnnualMarketingPlanWorkspace(brandId);
    const runningTask = workspace.latestTask;
    if (runningTask && (runningTask.taskStatus === "QUEUED" || runningTask.taskStatus === "RUNNING")) {
      return workspace;
    }

    const task = await this.createAnnualMarketingPlanTask(brandId, sourceReport);
    setTimeout(() => {
      void this.runAnnualMarketingPlanTask(brandId, task.id);
    }, 0);
    return {
      ...workspace,
      latestTask: task,
    };
  }

  async getXiaohongshuMarketingPlanWorkspace(brandId: string): Promise<XiaohongshuMarketingPlanWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
        orderBy: { createdAt: "desc" },
      });
      const reports = assets
        .map((item) => this.mapXiaohongshuMarketingPlanAsset({
          id: item.id,
          brandId: item.brandId,
          category: "GENERATED_REPORT",
          title: item.title,
          description: item.description ?? "",
          sourceName: "绯荤粺鐢熸垚",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        }))
        .filter((item): item is XiaohongshuMarketingPlanRecord => Boolean(item));
      const validReports = reports.filter((item) => this.isUsableXiaohongshuMarketingPlanRecord(item));
      const latestTaskRow = await this.prismaService.task.findFirst({
        where: {
          brandId,
          taskType: "XHS_MARKETING_PLAN",
        },
        orderBy: { createdAt: "desc" },
      });
      const normalizedTask = latestTaskRow
        ? await this.normalizeLatestXiaohongshuMarketingPlanTask(brandId, this.mapVisualGrowthReportTask(latestTaskRow))
        : undefined;
      return {
        latest: validReports[0],
        history: validReports,
        latestTask: normalizedTask,
      };
    }

    this.ensureBrandExistsInMock(brandId);
    const reports = database.assets
      .filter((item) => item.brandId === brandId && item.category === "GENERATED_REPORT")
      .map((item) => this.mapXiaohongshuMarketingPlanAsset(item))
      .filter((item): item is XiaohongshuMarketingPlanRecord => Boolean(item))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    const validReports = reports.filter((item) => this.isUsableXiaohongshuMarketingPlanRecord(item));
    const latestTask = [...database.tasks]
      .filter((item) => item.brandId === brandId && item.taskType === "XHS_MARKETING_PLAN")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const normalizedTask = latestTask
      ? await this.normalizeLatestXiaohongshuMarketingPlanTask(brandId, this.mapVisualGrowthReportTask(latestTask))
      : undefined;
    return {
      latest: validReports[0],
      history: validReports,
      latestTask: normalizedTask,
    };
  }

  async generateXiaohongshuMarketingPlan(brandId: string) {
    const growthReportWorkspace = await this.getGrowthReportWorkspace(brandId);
    const annualPlanWorkspace = await this.getAnnualMarketingPlanWorkspace(brandId);
    const sourceReport = growthReportWorkspace.latest;
    const annualPlan = annualPlanWorkspace.latest;
    if (!sourceReport) {
      throw new NotFoundException("璇峰厛鐢熸垚鍝佺墝澧為暱鎶ュ憡");
    }
    if (!annualPlan) {
      throw new NotFoundException("璇峰厛鐢熸垚鍏ㄥ勾钀ラ攢瑙勫垝");
    }
    const workspace = await this.getXiaohongshuMarketingPlanWorkspace(brandId);
    const runningTask = workspace.latestTask;
    if (runningTask && (runningTask.taskStatus === "QUEUED" || runningTask.taskStatus === "RUNNING")) {
      return workspace;
    }

    const task = await this.createXiaohongshuMarketingPlanTask(brandId, sourceReport, annualPlan);
    setTimeout(() => {
      void this.runXiaohongshuMarketingPlanTask(brandId, task.id);
    }, 0);

    return {
      ...workspace,
      latestTask: task,
    };
  }

  async updateXiaohongshuMarketingPlan(brandId: string, reportId: string, payload: UpdateXiaohongshuMarketingPlanPayload) {
    const reportMarkdown = payload.reportMarkdown.trim();
    if (!reportMarkdown) {
      throw new ServiceUnavailableException("灏忕孩涔﹁惀閿€绛栧垝鏂规鍐呭涓嶈兘涓虹┖");
    }

    const normalized = this.buildManualXiaohongshuMarketingPlanResult(reportMarkdown, payload.title);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: reportId,
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
      });
      if (!asset) {
        throw new NotFoundException("灏忕孩涔﹁惀閿€绛栧垝鏂规涓嶅瓨鍦");
      }
      const currentMeta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(currentMeta, "taskId");
      const mediaId = this.readMetaString(currentMeta, "mediaId");
      const media = mediaId
        ? await this.prismaService.mediaAsset.findFirst({
            where: { id: mediaId, brandId },
            select: { id: true, storageKey: true, sourceUrl: true },
          })
        : null;
      const storageKey = media?.storageKey || this.buildReportAssetStorageKey(brandId, this.buildXiaohongshuMarketingPlanFileName(taskId || reportId));
      const sourceUrl = media?.sourceUrl || this.buildReportAssetUrl(brandId, this.extractFileNameFromStorageKey(storageKey));
      await this.persistReportHtml(storageKey, normalized.htmlContent);
      await this.prismaService.businessAsset.update({
        where: { id: asset.id },
        data: {
          title: normalized.title,
          description: normalized.summary,
          fileUrl: sourceUrl,
          metadataJson: {
            ...currentMeta,
            summary: normalized.summary,
            title: normalized.title,
            reportMarkdown: normalized.reportMarkdown,
            htmlContent: normalized.htmlContent,
          } as Prisma.InputJsonValue,
        },
      });
      if (media?.id) {
        await this.prismaService.mediaAsset.update({
          where: { id: media.id },
          data: {
            title: normalized.title,
            storageKey,
            sourceUrl,
            mimeType: "text/html",
          },
        });
      }
    } else {
      const asset = database.assets.find((item) => item.id === reportId && item.brandId === brandId && item.category === "GENERATED_REPORT");
      if (!asset) {
        throw new NotFoundException("灏忕孩涔﹁惀閿€绛栧垝鏂规涓嶅瓨鍦");
      }
      const currentMeta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(currentMeta, "taskId");
      const mediaId = this.readMetaString(currentMeta, "mediaId");
      const media = mediaId ? database.media.find((item) => item.id === mediaId && item.brandId === brandId) : undefined;
      const storageKey = media?.storageKey || this.buildReportAssetStorageKey(brandId, this.buildXiaohongshuMarketingPlanFileName(taskId || reportId));
      const sourceUrl = media?.sourceUrl || this.buildReportAssetUrl(brandId, this.extractFileNameFromStorageKey(storageKey));
      await this.persistReportHtml(storageKey, normalized.htmlContent);
      asset.title = normalized.title;
      asset.description = normalized.summary;
      asset.fileUrl = sourceUrl;
      asset.metadataJson = {
        ...currentMeta,
        summary: normalized.summary,
        title: normalized.title,
        reportMarkdown: normalized.reportMarkdown,
        htmlContent: normalized.htmlContent,
      };
      if (media) {
        media.title = normalized.title;
        media.storageKey = storageKey;
        media.sourceUrl = sourceUrl;
        media.mimeType = "text/html";
      }
    }

    return this.getXiaohongshuMarketingPlanWorkspace(brandId);
  }

  async deleteXiaohongshuMarketingPlan(brandId: string, reportId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: reportId,
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
      });
      if (!asset) {
        throw new NotFoundException("灏忕孩涔﹁惀閿€绛栧垝鏂规涓嶅瓨鍦");
      }
      const meta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(meta, "taskId");
      const mediaId = this.readMetaString(meta, "mediaId");
      const media = mediaId
        ? await this.prismaService.mediaAsset.findFirst({
            where: { id: mediaId, brandId },
            select: { id: true, storageKey: true },
          })
        : null;
      if (media?.storageKey) {
        await this.ossStorageService.deleteObject(media.storageKey);
      }
      await this.prismaService.businessAsset.delete({ where: { id: asset.id } });
      if (mediaId) {
        await this.prismaService.mediaAsset.deleteMany({ where: { id: mediaId, brandId } });
      }
      if (taskId) {
        await this.prismaService.task.deleteMany({ where: { id: taskId, brandId } });
      }
    } else {
      const index = database.assets.findIndex((item) => item.id === reportId && item.brandId === brandId && item.category === "GENERATED_REPORT");
      if (index < 0) {
        throw new NotFoundException("灏忕孩涔﹁惀閿€绛栧垝鏂规涓嶅瓨鍦");
      }
      const meta = this.asMeta(database.assets[index].metadataJson);
      const taskId = this.readMetaString(meta, "taskId");
      const mediaId = this.readMetaString(meta, "mediaId");
      const media = mediaId ? database.media.find((item) => item.id === mediaId && item.brandId === brandId) : undefined;
      if (media?.storageKey) {
        await this.ossStorageService.deleteObject(media.storageKey);
      }
      database.assets.splice(index, 1);
      if (mediaId) {
        database.media = database.media.filter((item) => item.id !== mediaId);
      }
      if (taskId) {
        database.tasks = database.tasks.filter((item) => item.id !== taskId);
      }
    }

    return this.getXiaohongshuMarketingPlanWorkspace(brandId);
  }

  async getDouyinMarketingPlanWorkspace(brandId: string): Promise<DouyinMarketingPlanWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
        orderBy: { createdAt: "desc" },
      });
      const reports = assets
        .map((item) => this.mapDouyinMarketingPlanAsset({
          id: item.id,
          brandId: item.brandId,
          category: "GENERATED_REPORT",
          title: item.title,
          description: item.description ?? "",
          sourceName: "系统生成",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        }))
        .filter((item): item is DouyinMarketingPlanRecord => Boolean(item));
      const validReports = reports.filter((item) => this.isUsableDouyinMarketingPlanRecord(item));
      const latestTaskRow = await this.prismaService.task.findFirst({
        where: {
          brandId,
          taskType: "DOUYIN_MARKETING_PLAN",
        },
        orderBy: { createdAt: "desc" },
      });
      const normalizedTask = latestTaskRow
        ? await this.normalizeLatestDouyinMarketingPlanTask(brandId, this.mapVisualGrowthReportTask(latestTaskRow))
        : undefined;
      return {
        latest: validReports[0],
        history: validReports,
        latestTask: normalizedTask,
      };
    }

    this.ensureBrandExistsInMock(brandId);
    const reports = database.assets
      .filter((item) => item.brandId === brandId && item.category === "GENERATED_REPORT")
      .map((item) => this.mapDouyinMarketingPlanAsset(item))
      .filter((item): item is DouyinMarketingPlanRecord => Boolean(item))
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    const validReports = reports.filter((item) => this.isUsableDouyinMarketingPlanRecord(item));
    const latestTask = [...database.tasks]
      .filter((item) => item.brandId === brandId && item.taskType === "DOUYIN_MARKETING_PLAN")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const normalizedTask = latestTask
      ? await this.normalizeLatestDouyinMarketingPlanTask(brandId, this.mapVisualGrowthReportTask(latestTask))
      : undefined;
    return {
      latest: validReports[0],
      history: validReports,
      latestTask: normalizedTask,
    };
  }

  async generateDouyinMarketingPlan(brandId: string) {
    const growthReportWorkspace = await this.getGrowthReportWorkspace(brandId);
    const annualPlanWorkspace = await this.getAnnualMarketingPlanWorkspace(brandId);
    const sourceReport = growthReportWorkspace.latest;
    const annualPlan = annualPlanWorkspace.latest;
    if (!sourceReport) {
      throw new NotFoundException("请先生成品牌增长报告");
    }
    if (!annualPlan) {
      throw new NotFoundException("请先生成半年营销规划");
    }
    const workspace = await this.getDouyinMarketingPlanWorkspace(brandId);
    const runningTask = workspace.latestTask;
    if (runningTask && (runningTask.taskStatus === "QUEUED" || runningTask.taskStatus === "RUNNING")) {
      return workspace;
    }

    const task = await this.createDouyinMarketingPlanTask(brandId, sourceReport, annualPlan);
    setTimeout(() => {
      void this.runDouyinMarketingPlanTask(brandId, task.id);
    }, 0);

    return {
      ...workspace,
      latestTask: task,
    };
  }

  async updateDouyinMarketingPlan(brandId: string, reportId: string, payload: UpdateDouyinMarketingPlanPayload) {
    const reportMarkdown = payload.reportMarkdown.trim();
    if (!reportMarkdown) {
      throw new ServiceUnavailableException("抖音营销策划方案内容不能为空");
    }

    const normalized = this.buildManualDouyinMarketingPlanResult(reportMarkdown, payload.title);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: reportId,
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
      });
      if (!asset) {
        throw new NotFoundException("抖音营销策划方案不存在");
      }
      const currentMeta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(currentMeta, "taskId");
      const mediaId = this.readMetaString(currentMeta, "mediaId");
      const media = mediaId
        ? await this.prismaService.mediaAsset.findFirst({
            where: { id: mediaId, brandId },
            select: { id: true, storageKey: true, sourceUrl: true },
          })
        : null;
      const storageKey = media?.storageKey || this.buildReportAssetStorageKey(brandId, this.buildDouyinMarketingPlanFileName(taskId || reportId));
      const sourceUrl = media?.sourceUrl || this.buildReportAssetUrl(brandId, this.extractFileNameFromStorageKey(storageKey));
      await this.persistReportHtml(storageKey, normalized.htmlContent);
      await this.prismaService.businessAsset.update({
        where: { id: asset.id },
        data: {
          title: normalized.title,
          description: normalized.summary,
          fileUrl: sourceUrl,
          metadataJson: {
            ...currentMeta,
            kind: "DOUYIN_MARKETING_PLAN",
            summary: normalized.summary,
            title: normalized.title,
            reportMarkdown: normalized.reportMarkdown,
            htmlContent: normalized.htmlContent,
          } as Prisma.InputJsonValue,
        },
      });
      if (media?.id) {
        await this.prismaService.mediaAsset.update({
          where: { id: media.id },
          data: {
            title: normalized.title,
            storageKey,
            sourceUrl,
            mimeType: "text/html",
          },
        });
      }
    } else {
      const asset = database.assets.find((item) => item.id === reportId && item.brandId === brandId && item.category === "GENERATED_REPORT");
      if (!asset) {
        throw new NotFoundException("抖音营销策划方案不存在");
      }
      const currentMeta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(currentMeta, "taskId");
      const mediaId = this.readMetaString(currentMeta, "mediaId");
      const media = mediaId ? database.media.find((item) => item.id === mediaId && item.brandId === brandId) : undefined;
      const storageKey = media?.storageKey || this.buildReportAssetStorageKey(brandId, this.buildDouyinMarketingPlanFileName(taskId || reportId));
      const sourceUrl = media?.sourceUrl || this.buildReportAssetUrl(brandId, this.extractFileNameFromStorageKey(storageKey));
      await this.persistReportHtml(storageKey, normalized.htmlContent);
      asset.title = normalized.title;
      asset.description = normalized.summary;
      asset.fileUrl = sourceUrl;
      asset.metadataJson = {
        ...currentMeta,
        kind: "DOUYIN_MARKETING_PLAN",
        summary: normalized.summary,
        title: normalized.title,
        reportMarkdown: normalized.reportMarkdown,
        htmlContent: normalized.htmlContent,
      };
      if (media) {
        media.title = normalized.title;
        media.storageKey = storageKey;
        media.sourceUrl = sourceUrl;
        media.mimeType = "text/html";
      }
    }

    return this.getDouyinMarketingPlanWorkspace(brandId);
  }

  async deleteDouyinMarketingPlan(brandId: string, reportId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: reportId,
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
      });
      if (!asset) {
        throw new NotFoundException("抖音营销策划方案不存在");
      }
      const meta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(meta, "taskId");
      const mediaId = this.readMetaString(meta, "mediaId");
      const media = mediaId
        ? await this.prismaService.mediaAsset.findFirst({
            where: { id: mediaId, brandId },
            select: { id: true, storageKey: true },
          })
        : null;
      if (media?.storageKey) {
        await this.ossStorageService.deleteObject(media.storageKey);
      }
      await this.prismaService.businessAsset.delete({ where: { id: asset.id } });
      if (mediaId) {
        await this.prismaService.mediaAsset.deleteMany({ where: { id: mediaId, brandId } });
      }
      if (taskId) {
        await this.prismaService.task.deleteMany({ where: { id: taskId, brandId } });
      }
    } else {
      const index = database.assets.findIndex((item) => item.id === reportId && item.brandId === brandId && item.category === "GENERATED_REPORT");
      if (index < 0) {
        throw new NotFoundException("抖音营销策划方案不存在");
      }
      const meta = this.asMeta(database.assets[index].metadataJson);
      const taskId = this.readMetaString(meta, "taskId");
      const mediaId = this.readMetaString(meta, "mediaId");
      const media = mediaId ? database.media.find((item) => item.id === mediaId && item.brandId === brandId) : undefined;
      if (media?.storageKey) {
        await this.ossStorageService.deleteObject(media.storageKey);
      }
      database.assets.splice(index, 1);
      if (mediaId) {
        database.media = database.media.filter((item) => item.id !== mediaId);
      }
      if (taskId) {
        database.tasks = database.tasks.filter((item) => item.id !== taskId);
      }
    }

    return this.getDouyinMarketingPlanWorkspace(brandId);
  }

  async getDouyinHotTopicCandidatesWorkspace(
    brandId: string,
    selectedDate?: string,
  ): Promise<DouyinHotTopicCandidatesWorkspace> {
    const dailyHotspots = await this.collectorsService.getDailyHotspotWorkspace(brandId, selectedDate);
    const effectiveSelectedDate = dailyHotspots.selectedDate || selectedDate || "";
    const matchesSelectedDate = (record: DouyinHotTopicCandidatesRecord) => record.selectedDate === effectiveSelectedDate;
    const matchesTaskDate = (task: { inputJson?: unknown }) =>
      !effectiveSelectedDate || this.readMetaString(this.asMeta(task.inputJson), "selectedDate") === effectiveSelectedDate;

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
        orderBy: { createdAt: "desc" },
      });
      const reports = assets
        .map((item) => this.mapDouyinHotTopicCandidatesAsset({
          id: item.id,
          brandId: item.brandId,
          category: "GENERATED_REPORT",
          title: item.title,
          description: item.description ?? "",
          sourceName: "系统生成",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        }))
        .filter((item): item is DouyinHotTopicCandidatesRecord => Boolean(item))
        .filter((item) => item.items.length > 0)
        .filter(matchesSelectedDate);
      const latestTaskRow = await this.prismaService.task.findFirst({
        where: {
          brandId,
          taskType: "DOUYIN_HOT_TOPIC_CANDIDATES",
        },
        orderBy: { createdAt: "desc" },
      });
      const normalizedTask = latestTaskRow && matchesTaskDate(latestTaskRow)
        ? await this.normalizeLatestDouyinHotTopicCandidatesTask(brandId, this.mapVisualGrowthReportTask(latestTaskRow))
        : undefined;
      return {
        selectedDate: effectiveSelectedDate,
        availableDates: dailyHotspots.availableDates,
        latest: reports[0],
        history: reports,
        latestTask: normalizedTask,
      };
    }

    this.ensureBrandExistsInMock(brandId);
    const reports = database.assets
      .filter((item) => item.brandId === brandId && item.category === "GENERATED_REPORT")
      .map((item) => this.mapDouyinHotTopicCandidatesAsset(item))
      .filter((item): item is DouyinHotTopicCandidatesRecord => Boolean(item))
      .filter((item) => item.items.length > 0)
      .filter(matchesSelectedDate)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    const latestTask = [...database.tasks]
      .filter((item) => item.brandId === brandId && item.taskType === "DOUYIN_HOT_TOPIC_CANDIDATES")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .find((item) => matchesTaskDate(item));
    const normalizedTask = latestTask
      ? await this.normalizeLatestDouyinHotTopicCandidatesTask(brandId, this.mapVisualGrowthReportTask(latestTask))
      : undefined;
    return {
      selectedDate: effectiveSelectedDate,
      availableDates: dailyHotspots.availableDates,
      latest: reports[0],
      history: reports,
      latestTask: normalizedTask,
    };
  }

  async generateDouyinHotTopicCandidates(brandId: string, selectedDate?: string) {
    const dailyHotspots = await this.collectorsService.getDailyHotspotWorkspace(brandId, selectedDate);
    const effectiveSelectedDate = dailyHotspots.selectedDate || selectedDate || "";
    if (!effectiveSelectedDate) {
      throw new NotFoundException("请先同步每日热点");
    }

    const workspace = await this.getDouyinHotTopicCandidatesWorkspace(brandId, effectiveSelectedDate);
    const runningTask = workspace.latestTask;
    if (runningTask && (runningTask.taskStatus === "QUEUED" || runningTask.taskStatus === "RUNNING")) {
      return workspace;
    }

    const task = await this.createDouyinHotTopicCandidatesTask(brandId, effectiveSelectedDate);
    setTimeout(() => {
      void this.runDouyinHotTopicCandidatesTask(brandId, task.id);
    }, 0);

    return {
      ...workspace,
      selectedDate: effectiveSelectedDate,
      latestTask: task,
    };
  }

  async getXiaohongshuMarketingCalendarWorkspace(brandId: string): Promise<XiaohongshuMarketingCalendarWorkspace> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const assets = await this.prismaService.businessAsset.findMany({
        where: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
        orderBy: { createdAt: "desc" },
      });
      const reports = assets
        .map((item) => this.mapXiaohongshuMarketingCalendarAsset({
          id: item.id,
          brandId: item.brandId,
          category: "GENERATED_REPORT",
          title: item.title,
          description: item.description ?? "",
          sourceName: "绯荤粺鐢熸垚",
          fileUrl: item.fileUrl ?? undefined,
          metadataJson: this.asMeta(item.metadataJson),
        }))
        .filter((item): item is XiaohongshuMarketingCalendarRecord => Boolean(item))
        .filter((item) => item.items.length);
      const latestTaskRow = await this.prismaService.task.findFirst({
        where: {
          brandId,
          taskType: "XHS_MARKETING_CALENDAR",
        },
        orderBy: { createdAt: "desc" },
      });
      const normalizedTask = latestTaskRow
        ? await this.normalizeLatestXiaohongshuMarketingCalendarTask(brandId, this.mapVisualGrowthReportTask(latestTaskRow))
        : undefined;
      return {
        latest: reports[0],
        history: reports,
        latestTask: normalizedTask,
      };
    }

    this.ensureBrandExistsInMock(brandId);
    const reports = database.assets
      .filter((item) => item.brandId === brandId && item.category === "GENERATED_REPORT")
      .map((item) => this.mapXiaohongshuMarketingCalendarAsset(item))
      .filter((item): item is XiaohongshuMarketingCalendarRecord => Boolean(item))
      .filter((item) => item.items.length)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    const latestTask = [...database.tasks]
      .filter((item) => item.brandId === brandId && item.taskType === "XHS_MARKETING_CALENDAR")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const normalizedTask = latestTask
      ? await this.normalizeLatestXiaohongshuMarketingCalendarTask(brandId, this.mapVisualGrowthReportTask(latestTask))
      : undefined;
    return {
      latest: reports[0],
      history: reports,
      latestTask: normalizedTask,
    };
  }

  async generateXiaohongshuMarketingCalendar(brandId: string) {
    const growthReportWorkspace = await this.getGrowthReportWorkspace(brandId);
    const annualPlanWorkspace = await this.getAnnualMarketingPlanWorkspace(brandId);
    const marketingPlanWorkspace = await this.getXiaohongshuMarketingPlanWorkspace(brandId);
    const sourceReport = growthReportWorkspace.latest;
    const annualPlan = annualPlanWorkspace.latest;
    const marketingPlan = marketingPlanWorkspace.latest;
    if (!sourceReport) {
      throw new NotFoundException("请先生成品牌增长报告");
    }
    if (!annualPlan) {
      throw new NotFoundException("请先生成半年营销规划");
    }
    if (!marketingPlan) {
      throw new NotFoundException("请先生成小红书营销策划方案");
    }
    const workspace = await this.getXiaohongshuMarketingCalendarWorkspace(brandId);
    const runningTask = workspace.latestTask;
    if (runningTask && (runningTask.taskStatus === "QUEUED" || runningTask.taskStatus === "RUNNING")) {
      return workspace;
    }

    const task = await this.createXiaohongshuMarketingCalendarTask(brandId, sourceReport, annualPlan, marketingPlan);
    setTimeout(() => {
      void this.runXiaohongshuMarketingCalendarTask(brandId, task.id);
    }, 0);

    return {
      ...workspace,
      latestTask: task,
    };
  }

  async updateXiaohongshuMarketingCalendar(
    brandId: string,
    reportId: string,
    payload: UpdateXiaohongshuMarketingCalendarPayload,
  ) {
    const normalized = this.buildManualXiaohongshuMarketingCalendarResult(payload.items, payload.title);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: reportId,
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
      });
      if (!asset) {
        throw new NotFoundException("钀ラ攢鏃ュ巻涓嶅瓨鍦");
      }
      const currentMeta = this.asMeta(asset.metadataJson);
      await this.prismaService.businessAsset.update({
        where: { id: asset.id },
        data: {
          title: normalized.title,
          description: normalized.summary,
          metadataJson: {
            ...currentMeta,
            summary: normalized.summary,
            title: normalized.title,
            items: normalized.items,
          } as Prisma.InputJsonValue,
        },
      });
    } else {
      const asset = database.assets.find((item) => item.id === reportId && item.brandId === brandId && item.category === "GENERATED_REPORT");
      if (!asset) {
        throw new NotFoundException("钀ラ攢鏃ュ巻涓嶅瓨鍦");
      }
      asset.title = normalized.title;
      asset.description = normalized.summary;
      asset.metadataJson = {
        ...(asset.metadataJson || {}),
        summary: normalized.summary,
        title: normalized.title,
        items: normalized.items,
      };
    }

    return this.getXiaohongshuMarketingCalendarWorkspace(brandId);
  }

  async updateGrowthReport(brandId: string, reportId: string, payload: UpdateGrowthReportPayload) {
    const reportMarkdown = payload.reportMarkdown.trim();
    if (!reportMarkdown) {
      throw new ServiceUnavailableException("鎶ュ憡鍐呭涓嶈兘涓虹┖");
    }

    const normalized = this.buildManualReportResult(reportMarkdown, payload.title);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: reportId,
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
      });
      if (!asset) {
        throw new NotFoundException("鍝佺墝澧為暱鎶ュ憡涓嶅瓨鍦");
      }

      const currentMeta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(currentMeta, "taskId");
      const mediaId = this.readMetaString(currentMeta, "mediaId");
      const media = mediaId
        ? await this.prismaService.mediaAsset.findFirst({
            where: { id: mediaId, brandId },
            select: { id: true, storageKey: true, sourceUrl: true },
          })
        : null;
      const storageKey = media?.storageKey || this.buildReportAssetStorageKey(brandId, this.buildGrowthReportFileName(taskId || reportId));
      const sourceUrl = media?.sourceUrl || this.buildReportAssetUrl(brandId, this.extractFileNameFromStorageKey(storageKey));
      await this.persistReportHtml(storageKey, normalized.htmlContent);
      await this.prismaService.businessAsset.update({
        where: { id: asset.id },
        data: {
          title: normalized.title,
          description: normalized.summary,
          fileUrl: sourceUrl,
          metadataJson: {
            ...currentMeta,
            summary: normalized.summary,
            title: normalized.title,
            reportMarkdown: normalized.reportMarkdown,
            htmlContent: normalized.htmlContent,
          } as Prisma.InputJsonValue,
        },
      });
      if (media?.id) {
        await this.prismaService.mediaAsset.update({
          where: { id: media.id },
          data: {
            title: normalized.title,
            storageKey,
            sourceUrl,
            mimeType: "text/html",
          },
        });
      }
    } else {
      const asset = database.assets.find((item) => item.id === reportId && item.brandId === brandId && item.category === "GENERATED_REPORT");
      if (!asset) {
        throw new NotFoundException("鍝佺墝澧為暱鎶ュ憡涓嶅瓨鍦");
      }
      const currentMeta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(currentMeta, "taskId");
      const mediaId = this.readMetaString(currentMeta, "mediaId");
      const media = mediaId ? database.media.find((item) => item.id === mediaId && item.brandId === brandId) : undefined;
      const storageKey = media?.storageKey || this.buildReportAssetStorageKey(brandId, this.buildGrowthReportFileName(taskId || reportId));
      const sourceUrl = media?.sourceUrl || this.buildReportAssetUrl(brandId, this.extractFileNameFromStorageKey(storageKey));
      await this.persistReportHtml(storageKey, normalized.htmlContent);
      asset.title = normalized.title;
      asset.description = normalized.summary;
      asset.fileUrl = sourceUrl;
      asset.metadataJson = {
        ...currentMeta,
        summary: normalized.summary,
        title: normalized.title,
        reportMarkdown: normalized.reportMarkdown,
        htmlContent: normalized.htmlContent,
      };
      if (media) {
        media.title = normalized.title;
        media.storageKey = storageKey;
        media.sourceUrl = sourceUrl;
        media.mimeType = "text/html";
      }
    }

    return this.getGrowthReportWorkspace(brandId);
  }

  async updateVisualGrowthReport(brandId: string, reportId: string, payload: UpdateVisualGrowthReportPayload) {
    const htmlBody = payload.htmlBody.trim();
    if (!htmlBody) {
      throw new ServiceUnavailableException("鍙鍖栨姤鍛婂唴瀹逛笉鑳戒负绌");
    }

    const normalized = this.buildManualVisualReportResult(htmlBody, payload.title);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      const asset = await this.prismaService.businessAsset.findFirst({
        where: {
          id: reportId,
          brandId,
          category: AssetCategory.GENERATED_REPORT,
        },
      });
      if (!asset) {
        throw new NotFoundException("鍝佺墝澧為暱鍙鍖栨姤鍛婁笉瀛樺湪");
      }

      const currentMeta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(currentMeta, "taskId");
      const mediaId = this.readMetaString(currentMeta, "mediaId");
      const media = mediaId
        ? await this.prismaService.mediaAsset.findFirst({
            where: { id: mediaId, brandId },
            select: { id: true, storageKey: true, sourceUrl: true },
          })
        : null;
      const storageKey = media?.storageKey || this.buildReportAssetStorageKey(brandId, this.buildVisualGrowthReportFileName(taskId || reportId));
      const sourceUrl = media?.sourceUrl || this.buildReportAssetUrl(brandId, this.extractFileNameFromStorageKey(storageKey));
      await this.persistReportHtml(storageKey, normalized.htmlDocument);
      await this.prismaService.businessAsset.update({
        where: { id: asset.id },
        data: {
          title: normalized.title,
          description: normalized.summary,
          fileUrl: sourceUrl,
          metadataJson: {
            ...currentMeta,
            summary: normalized.summary,
            title: normalized.title,
            htmlBody: normalized.htmlBody,
            htmlDocument: normalized.htmlDocument,
          } as Prisma.InputJsonValue,
        },
      });
      if (media?.id) {
        await this.prismaService.mediaAsset.update({
          where: { id: media.id },
          data: {
            title: normalized.title,
            storageKey,
            sourceUrl,
            mimeType: "text/html",
          },
        });
      }
    } else {
      const asset = database.assets.find((item) => item.id === reportId && item.brandId === brandId && item.category === "GENERATED_REPORT");
      if (!asset) {
        throw new NotFoundException("鍝佺墝澧為暱鍙鍖栨姤鍛婁笉瀛樺湪");
      }
      const currentMeta = this.asMeta(asset.metadataJson);
      const taskId = this.readMetaString(currentMeta, "taskId");
      const mediaId = this.readMetaString(currentMeta, "mediaId");
      const media = mediaId ? database.media.find((item) => item.id === mediaId && item.brandId === brandId) : undefined;
      const storageKey = media?.storageKey || this.buildReportAssetStorageKey(brandId, this.buildVisualGrowthReportFileName(taskId || reportId));
      const sourceUrl = media?.sourceUrl || this.buildReportAssetUrl(brandId, this.extractFileNameFromStorageKey(storageKey));
      await this.persistReportHtml(storageKey, normalized.htmlDocument);
      asset.title = normalized.title;
      asset.description = normalized.summary;
      asset.fileUrl = sourceUrl;
      asset.metadataJson = {
        ...currentMeta,
        summary: normalized.summary,
        title: normalized.title,
        htmlBody: normalized.htmlBody,
        htmlDocument: normalized.htmlDocument,
      };
      if (media) {
        media.title = normalized.title;
        media.storageKey = storageKey;
        media.sourceUrl = sourceUrl;
        media.mimeType = "text/html";
      }
    }

    return this.getVisualGrowthReportWorkspace(brandId);
  }

  private async getLatestVisualGrowthReportTask(brandId: string) {
    const workspace = await this.getVisualGrowthReportWorkspace(brandId);
    return workspace.latestTask;
  }

  private async getLatestGrowthReportTask(brandId: string) {
    const workspace = await this.getGrowthReportWorkspace(brandId);
    return workspace.latestTask;
  }

  private async getLatestAnnualMarketingPlanTask(brandId: string) {
    const workspace = await this.getAnnualMarketingPlanWorkspace(brandId);
    return workspace.latestTask;
  }

  private async getLatestXiaohongshuMarketingPlanTask(brandId: string) {
    const workspace = await this.getXiaohongshuMarketingPlanWorkspace(brandId);
    return workspace.latestTask;
  }

  private async getLatestXiaohongshuMarketingCalendarTask(brandId: string) {
    const workspace = await this.getXiaohongshuMarketingCalendarWorkspace(brandId);
    return workspace.latestTask;
  }

  private async normalizeLatestVisualGrowthReportTask(
    brandId: string,
    task: VisualGrowthReportTaskRecord,
  ): Promise<VisualGrowthReportTaskRecord> {
    if (task.taskStatus !== "QUEUED" && task.taskStatus !== "RUNNING") {
      return task;
    }

    const referenceTime = task.updatedAt || task.startedAt || task.createdAt;
    const referenceMs = Date.parse(referenceTime);
    if (!Number.isFinite(referenceMs)) {
      return task;
    }
    if (Date.now() - referenceMs <= VISUAL_REPORT_TASK_TIMEOUT_MS) {
      return task;
    }

    const finishedAt = new Date().toISOString();
    const errorMessage = "鍙鍖栨姤鍛婄敓鎴愯秴鏃讹紝浠诲姟宸茶嚜鍔ㄧ粨鏉燂紝璇烽噸鏂扮偣鍑荤敓鎴愬彲瑙嗗寲鎶ュ憡銆";
    await this.updateVisualGrowthReportTaskStatus(brandId, task.id, {
      taskStatus: "FAILED",
      startedAt: task.startedAt,
      finishedAt,
      errorMessage,
    });

    return {
      ...task,
      taskStatus: "FAILED",
      finishedAt,
      updatedAt: finishedAt,
      errorMessage,
    };
  }

  private async normalizeLatestGrowthReportTask(
    brandId: string,
    task: GrowthReportTaskRecord,
  ): Promise<GrowthReportTaskRecord> {
    if (task.taskStatus !== "QUEUED" && task.taskStatus !== "RUNNING") {
      return task;
    }

    const referenceTime = task.updatedAt || task.startedAt || task.createdAt;
    const referenceMs = Date.parse(referenceTime);
    if (!Number.isFinite(referenceMs)) {
      return task;
    }
    if (Date.now() - referenceMs <= GROWTH_REPORT_TASK_TIMEOUT_MS) {
      return task;
    }

    const finishedAt = new Date().toISOString();
    const errorMessage = "品牌增长报告生成超时，任务已自动结束，请重新点击生成报告。";
    await this.updateGrowthReportTaskStatus(brandId, task.id, {
      taskStatus: "FAILED",
      startedAt: task.startedAt,
      finishedAt,
      errorMessage,
    });

    return {
      ...task,
      taskStatus: "FAILED",
      finishedAt,
      updatedAt: finishedAt,
      errorMessage,
    };
  }

  private async normalizeLatestAnnualMarketingPlanTask(
    brandId: string,
    task: AnnualMarketingPlanTaskRecord,
  ): Promise<AnnualMarketingPlanTaskRecord> {
    if (task.taskStatus !== "QUEUED" && task.taskStatus !== "RUNNING") {
      return task;
    }

    const referenceTime = task.updatedAt || task.startedAt || task.createdAt;
    const referenceMs = Date.parse(referenceTime);
    if (!Number.isFinite(referenceMs)) {
      return task;
    }
    if (Date.now() - referenceMs <= ANNUAL_MARKETING_PLAN_TASK_TIMEOUT_MS) {
      return task;
    }

    const finishedAt = new Date().toISOString();
    const errorMessage = "半年营销规划生成超时，任务已自动结束，请重新点击生成规划。";
    await this.updateAnnualMarketingPlanTaskStatus(brandId, task.id, {
      taskStatus: "FAILED",
      startedAt: task.startedAt,
      finishedAt,
      errorMessage,
    });

    return {
      ...task,
      taskStatus: "FAILED",
      finishedAt,
      updatedAt: finishedAt,
      errorMessage,
    };
  }

  private async normalizeLatestXiaohongshuMarketingPlanTask(
    brandId: string,
    task: XiaohongshuMarketingPlanTaskRecord,
  ): Promise<XiaohongshuMarketingPlanTaskRecord> {
    if (task.taskStatus !== "QUEUED" && task.taskStatus !== "RUNNING") {
      return task;
    }

    const referenceTime = task.updatedAt || task.startedAt || task.createdAt;
    const referenceMs = Date.parse(referenceTime);
    if (!Number.isFinite(referenceMs)) {
      return task;
    }
    if (Date.now() - referenceMs <= XIAOHONGSHU_MARKETING_PLAN_TASK_TIMEOUT_MS) {
      return task;
    }

    const finishedAt = new Date().toISOString();
    const errorMessage = "灏忕孩涔﹁惀閿€绛栧垝鏂规鐢熸垚瓒呮椂锛屼换鍔″凡鑷姩缁撴潫锛岃閲嶆柊鐐瑰嚮涓€閿敓鎴愩€";
    await this.updateXiaohongshuMarketingPlanTaskStatus(brandId, task.id, {
      taskStatus: "FAILED",
      startedAt: task.startedAt,
      finishedAt,
      errorMessage,
    });

    return {
      ...task,
      taskStatus: "FAILED",
      finishedAt,
      updatedAt: finishedAt,
      errorMessage,
    };
  }

  private async normalizeLatestDouyinMarketingPlanTask(
    brandId: string,
    task: DouyinMarketingPlanTaskRecord,
  ): Promise<DouyinMarketingPlanTaskRecord> {
    if (task.taskStatus !== "QUEUED" && task.taskStatus !== "RUNNING") {
      return task;
    }

    const referenceTime = task.updatedAt || task.startedAt || task.createdAt;
    const referenceMs = Date.parse(referenceTime);
    if (!Number.isFinite(referenceMs)) {
      return task;
    }
    if (Date.now() - referenceMs <= DOUYIN_MARKETING_PLAN_TASK_TIMEOUT_MS) {
      return task;
    }

    const finishedAt = new Date().toISOString();
    const errorMessage = "抖音营销策划方案生成超时，任务已自动结束，请重新点击一键生成。";
    await this.updateDouyinMarketingPlanTaskStatus(brandId, task.id, {
      taskStatus: "FAILED",
      startedAt: task.startedAt,
      finishedAt,
      errorMessage,
    });

    return {
      ...task,
      taskStatus: "FAILED",
      finishedAt,
      updatedAt: finishedAt,
      errorMessage,
    };
  }

  private async normalizeLatestDouyinHotTopicCandidatesTask(
    brandId: string,
    task: DouyinHotTopicCandidatesTaskRecord,
  ): Promise<DouyinHotTopicCandidatesTaskRecord> {
    if (task.taskStatus !== "QUEUED" && task.taskStatus !== "RUNNING") {
      return task;
    }

    const referenceTime = task.updatedAt || task.startedAt || task.createdAt;
    const referenceMs = Date.parse(referenceTime);
    if (!Number.isFinite(referenceMs)) {
      return task;
    }
    if (Date.now() - referenceMs <= DOUYIN_HOT_TOPIC_CANDIDATES_TASK_TIMEOUT_MS) {
      return task;
    }

    const finishedAt = new Date().toISOString();
    const errorMessage = "抖音热点找选题生成超时，任务已自动结束，请重新点击生成。";
    await this.updateDouyinHotTopicCandidatesTaskStatus(brandId, task.id, {
      taskStatus: "FAILED",
      startedAt: task.startedAt,
      finishedAt,
      errorMessage,
    });

    return {
      ...task,
      taskStatus: "FAILED",
      finishedAt,
      updatedAt: finishedAt,
      errorMessage,
    };
  }

  private async normalizeLatestXiaohongshuMarketingCalendarTask(
    brandId: string,
    task: XiaohongshuMarketingCalendarTaskRecord,
  ): Promise<XiaohongshuMarketingCalendarTaskRecord> {
    if (task.taskStatus !== "QUEUED" && task.taskStatus !== "RUNNING") {
      return task;
    }

    const referenceTime = task.updatedAt || task.startedAt || task.createdAt;
    const referenceMs = Date.parse(referenceTime);
    if (!Number.isFinite(referenceMs)) {
      return task;
    }

    if (Date.now() - referenceMs < XIAOHONGSHU_MARKETING_CALENDAR_TASK_TIMEOUT_MS) {
      return task;
    }

    const finishedAt = new Date().toISOString();
    const errorMessage = "钀ラ攢鏃ュ巻鐢熸垚浠诲姟宸茶秴鏃讹紝璇烽噸鏂板彂璧风敓鎴愩€";
    await this.updateXiaohongshuMarketingCalendarTaskStatus(brandId, task.id, {
      taskStatus: "FAILED",
      finishedAt,
      errorMessage,
    });

    return {
      ...task,
      taskStatus: "FAILED",
      finishedAt,
      updatedAt: finishedAt,
      errorMessage,
    };
  }

  private async createVisualGrowthReportTask(brandId: string, sourceReport: GrowthReportRecord) {
    const now = new Date().toISOString();
    const settings = await this.loadVisualReportGenerationSettings(brandId);
    const modelName =
      (await this.loadDomesticVisualProviderConfigs(settings))[0]?.models[0]
      || settings.preferredModelName
      || "deepseek-v4-flash";

    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { id: true, ownerUserId: true, brandName: true },
      });
      if (!brand) {
        throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
      }

      const task = await this.prismaService.task.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskType: "BRAND_GROWTH_VISUAL_REPORT",
          taskTitle: `鐢熸垚鍝佺墝澧為暱鍙鍖栨姤鍛婏細${brand.brandName}`,
          taskStatus: TaskStatus.QUEUED,
          modelName,
          pointsCost: 220,
          inputJson: {
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
          } as Prisma.InputJsonValue,
        },
      });

      return this.mapVisualGrowthReportTask(task);
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }

    const task = {
      id: createId("tsk"),
      userId: brand.ownerUserId,
      brandId,
      taskType: "BRAND_GROWTH_VISUAL_REPORT",
      taskTitle: `鐢熸垚鍝佺墝澧為暱鍙鍖栨姤鍛婏細${brand.brandName}`,
      taskStatus: "QUEUED" as const,
      modelName,
      pointsCost: 220,
      inputJson: {
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
      },
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return this.mapVisualGrowthReportTask(task);
  }

  private async createGrowthReportTask(brandId: string) {
    const now = new Date().toISOString();
    const archive = await this.brandsService.getArchive(brandId);
    const collection = await this.collectorsService.getXiaohongshuWorkspace(brandId);
    const settings = await this.loadGrowthReportGenerationSettings(brandId);
    const providers = await this.loadGrowthReportProviderConfigs(settings);
    const modelName =
      providers[0]?.models[0]
      || settings.preferredModelName
      || "deepseek-v4-pro";

    const inputMeta = {
      productCount: archive.products.length,
      platformAccountCount: collection.brandAccounts.length,
      competitorAccountCount: collection.competitorAccounts.length,
      brandNoteCount: collection.brandNotes.length,
      benchmarkNoteCount: collection.benchmarkNotes.length,
    };

    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { id: true, ownerUserId: true, brandName: true },
      });
      if (!brand) {
        throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
      }

      const task = await this.prismaService.task.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskType: "BRAND_GROWTH_REPORT",
          taskTitle: `鐢熸垚鍝佺墝澧為暱鎶ュ憡锛${brand.brandName}`,
          taskStatus: TaskStatus.QUEUED,
          modelName,
          pointsCost: 320,
          inputJson: inputMeta as Prisma.InputJsonValue,
        },
      });

      return this.mapVisualGrowthReportTask(task);
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }

    const task = {
      id: createId("tsk"),
      userId: brand.ownerUserId,
      brandId,
      taskType: "BRAND_GROWTH_REPORT",
      taskTitle: `鐢熸垚鍝佺墝澧為暱鎶ュ憡锛${brand.brandName}`,
      taskStatus: "QUEUED" as const,
      modelName,
      pointsCost: 320,
      inputJson: inputMeta,
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return this.mapVisualGrowthReportTask(task);
  }

  private async createAnnualMarketingPlanTask(brandId: string, sourceReport: GrowthReportRecord) {
    const now = new Date().toISOString();
    const settings = await this.loadAnnualMarketingPlanGenerationSettings(brandId);
    const modelName =
      (await this.loadAnnualMarketingProviderConfigs(settings))[0]?.models[0]
      || settings.preferredModelName
      || "gpt-5.5";

    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { id: true, ownerUserId: true, brandName: true },
      });
      if (!brand) {
        throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
      }

      const task = await this.prismaService.task.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskType: CURRENT_HALF_YEAR_MARKETING_PLAN_TASK_TYPE,
          taskTitle: `生成半年营销规划：${brand.brandName}`,
          taskStatus: TaskStatus.QUEUED,
          modelName,
          pointsCost: 260,
          inputJson: {
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
          } as Prisma.InputJsonValue,
        },
      });

      return this.mapVisualGrowthReportTask(task);
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }

    const task = {
      id: createId("tsk"),
      userId: brand.ownerUserId,
      brandId,
      taskType: CURRENT_HALF_YEAR_MARKETING_PLAN_TASK_TYPE,
      taskTitle: `生成半年营销规划：${brand.brandName}`,
      taskStatus: "QUEUED" as const,
      modelName,
      pointsCost: 260,
      inputJson: {
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
      },
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return this.mapVisualGrowthReportTask(task);
  }

  private async createXiaohongshuMarketingPlanTask(
    brandId: string,
    sourceReport: GrowthReportRecord,
    annualPlan: AnnualMarketingPlanRecord,
  ) {
    const now = new Date().toISOString();
    const settings = await this.loadXiaohongshuMarketingPlanGenerationSettings(brandId);
    const modelName =
      (await this.loadXiaohongshuMarketingProviderConfigs(settings))[0]?.models[0]
      || settings.preferredModelName
      || "gpt-5.5";

    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { id: true, ownerUserId: true, brandName: true },
      });
      if (!brand) {
        throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
      }

      const task = await this.prismaService.task.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskType: "XHS_MARKETING_PLAN",
          taskTitle: `鐢熸垚灏忕孩涔﹁惀閿€绛栧垝鏂规锛${brand.brandName}`,
          taskStatus: TaskStatus.QUEUED,
          modelName,
          pointsCost: 260,
          inputJson: {
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
            sourceAnnualPlanId: annualPlan.id,
            sourceAnnualPlanTitle: annualPlan.title,
          } as Prisma.InputJsonValue,
        },
      });

      return this.mapVisualGrowthReportTask(task);
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }

    const task = {
      id: createId("tsk"),
      userId: brand.ownerUserId,
      brandId,
      taskType: "XHS_MARKETING_PLAN",
      taskTitle: `鐢熸垚灏忕孩涔﹁惀閿€绛栧垝鏂规锛${brand.brandName}`,
      taskStatus: "QUEUED" as const,
      modelName,
      pointsCost: 260,
      inputJson: {
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
        sourceAnnualPlanId: annualPlan.id,
        sourceAnnualPlanTitle: annualPlan.title,
      },
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return this.mapVisualGrowthReportTask(task);
  }

  private async createDouyinMarketingPlanTask(
    brandId: string,
    sourceReport: GrowthReportRecord,
    annualPlan: AnnualMarketingPlanRecord,
  ) {
    const now = new Date().toISOString();
    const settings = await this.loadDouyinMarketingPlanGenerationSettings(brandId);
    const modelName =
      (await this.loadXiaohongshuMarketingProviderConfigs(settings))[0]?.models[0]
      || settings.preferredModelName
      || "deepseek-v4-pro";

    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { id: true, ownerUserId: true, brandName: true },
      });
      if (!brand) {
        throw new NotFoundException("品牌不存在");
      }

      const task = await this.prismaService.task.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskType: "DOUYIN_MARKETING_PLAN",
          taskTitle: `生成抖音营销策划方案：${brand.brandName}`,
          taskStatus: TaskStatus.QUEUED,
          modelName,
          pointsCost: 260,
          inputJson: {
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
            sourceAnnualPlanId: annualPlan.id,
            sourceAnnualPlanTitle: annualPlan.title,
          } as Prisma.InputJsonValue,
        },
      });

      return this.mapVisualGrowthReportTask(task);
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    const task = {
      id: createId("tsk"),
      userId: brand.ownerUserId,
      brandId,
      taskType: "DOUYIN_MARKETING_PLAN",
      taskTitle: `生成抖音营销策划方案：${brand.brandName}`,
      taskStatus: "QUEUED" as const,
      modelName,
      pointsCost: 260,
      inputJson: {
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
        sourceAnnualPlanId: annualPlan.id,
        sourceAnnualPlanTitle: annualPlan.title,
      },
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return this.mapVisualGrowthReportTask(task);
  }

  private async createDouyinHotTopicCandidatesTask(brandId: string, selectedDate: string) {
    const now = new Date().toISOString();
    const settings = await this.loadDouyinHotTopicCandidatesGenerationSettings(brandId);
    const modelName =
      (await this.loadDouyinMarketingProviderConfigs(settings))[0]?.models[0]
      || settings.preferredModelName
      || "deepseek-v4-pro";

    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { id: true, ownerUserId: true, brandName: true },
      });
      if (!brand) {
        throw new NotFoundException("品牌不存在");
      }

      const task = await this.prismaService.task.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskType: "DOUYIN_HOT_TOPIC_CANDIDATES",
          taskTitle: `生成抖音热点找选题：${brand.brandName}（${selectedDate}）`,
          taskStatus: TaskStatus.QUEUED,
          modelName,
          pointsCost: 120,
          inputJson: {
            selectedDate,
          } as Prisma.InputJsonValue,
        },
      });

      return this.mapVisualGrowthReportTask(task);
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    const task = {
      id: createId("tsk"),
      userId: brand.ownerUserId,
      brandId,
      taskType: "DOUYIN_HOT_TOPIC_CANDIDATES",
      taskTitle: `生成抖音热点找选题：${brand.brandName}（${selectedDate}）`,
      taskStatus: "QUEUED" as const,
      modelName,
      pointsCost: 120,
      inputJson: {
        selectedDate,
      },
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return this.mapVisualGrowthReportTask(task);
  }

  private async runGrowthReportTask(brandId: string, taskId: string) {
    const startedAt = new Date().toISOString();
    await this.updateGrowthReportTaskStatus(brandId, taskId, {
      taskStatus: "RUNNING",
      startedAt,
      errorMessage: "",
    });

    try {
      const archive = await this.brandsService.getArchive(brandId);
      const collection = await this.collectorsService.getXiaohongshuWorkspace(brandId);
      const report = await this.buildReport({
        brandId,
        archive,
        collection,
        generatedAt: startedAt,
      });

      await this.persistGrowthReportResult(brandId, taskId, report, startedAt);
      await this.updateGrowthReportTaskStatus(brandId, taskId, {
        taskStatus: "SUCCESS",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: "",
        outputJson: {
          summary: report.summary,
          diagnosis: report.diagnosis,
          opportunities: report.opportunities,
          nextActions: report.nextActions,
          reportMarkdown: report.reportMarkdown,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "品牌增长报告生成失败";
      await this.updateGrowthReportTaskStatus(brandId, taskId, {
        taskStatus: "FAILED",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  private async createXiaohongshuMarketingCalendarTask(
    brandId: string,
    sourceReport: GrowthReportRecord,
    annualPlan: AnnualMarketingPlanRecord,
    marketingPlan: XiaohongshuMarketingPlanRecord,
  ) {
    const now = new Date().toISOString();
    const settings = await this.loadXiaohongshuMarketingCalendarGenerationSettings(brandId);
    const modelName =
      (await this.loadXiaohongshuMarketingCalendarProviderConfigs(settings))[0]?.models[0]
      || settings.preferredModelName
      || "gpt-5.5";

    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { id: true, ownerUserId: true, brandName: true },
      });
      if (!brand) {
        throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
      }

      const task = await this.prismaService.task.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskType: "XHS_MARKETING_CALENDAR",
          taskTitle: `鐢熸垚钀ラ攢鏃ュ巻锛${brand.brandName}`,
          taskStatus: TaskStatus.QUEUED,
          modelName,
          pointsCost: 180,
          inputJson: {
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
            sourceAnnualPlanId: annualPlan.id,
            sourceAnnualPlanTitle: annualPlan.title,
            sourceMarketingPlanId: marketingPlan.id,
            sourceMarketingPlanTitle: marketingPlan.title,
          } as Prisma.InputJsonValue,
        },
      });

      return this.mapVisualGrowthReportTask(task);
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }

    const task = {
      id: createId("tsk"),
      userId: brand.ownerUserId,
      brandId,
      taskType: "XHS_MARKETING_CALENDAR",
      taskTitle: `鐢熸垚钀ラ攢鏃ュ巻锛${brand.brandName}`,
      taskStatus: "QUEUED" as const,
      modelName,
      pointsCost: 180,
      inputJson: {
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
        sourceAnnualPlanId: annualPlan.id,
        sourceAnnualPlanTitle: annualPlan.title,
        sourceMarketingPlanId: marketingPlan.id,
        sourceMarketingPlanTitle: marketingPlan.title,
      },
      createdAt: now,
      updatedAt: now,
    };
    database.tasks.unshift(task);
    return this.mapVisualGrowthReportTask(task);
  }

  private async runVisualGrowthReportTask(brandId: string, taskId: string) {
    const startedAt = new Date().toISOString();
    await this.updateVisualGrowthReportTaskStatus(brandId, taskId, {
      taskStatus: "RUNNING",
      startedAt,
      errorMessage: "",
    });

    try {
      const sourceWorkspace = await this.getGrowthReportWorkspace(brandId);
      const latestTask = await this.getLatestVisualGrowthReportTask(brandId);
      const sourceReportId = latestTask?.sourceReportId;
      const sourceReport = sourceWorkspace.history.find((item) => item.id === sourceReportId) || sourceWorkspace.latest;
      if (!sourceReport) {
        throw new NotFoundException("璇峰厛鐢熸垚鍝佺墝澧為暱鎶ュ憡");
      }

      const report = await this.buildVisualReport({
        brandId,
        sourceReport,
        generatedAt: startedAt,
      });

      await this.persistVisualGrowthReportResult(brandId, taskId, sourceReport, report, startedAt);
      await this.updateVisualGrowthReportTaskStatus(brandId, taskId, {
        taskStatus: "SUCCESS",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: "",
        outputJson: {
          summary: report.summary,
          htmlBody: report.htmlBody,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "鍝佺墝澧為暱鍙鍖栨姤鍛婄敓鎴愬け璐";
      await this.updateVisualGrowthReportTaskStatus(brandId, taskId, {
        taskStatus: "FAILED",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  private async runAnnualMarketingPlanTask(brandId: string, taskId: string) {
    const startedAt = new Date().toISOString();
    await this.updateAnnualMarketingPlanTaskStatus(brandId, taskId, {
      taskStatus: "RUNNING",
      startedAt,
      errorMessage: "",
    });

    try {
      const archive = await this.brandsService.getArchive(brandId);
      const sourceWorkspace = await this.getGrowthReportWorkspace(brandId);
      const currentTaskRow = await this.findTaskInputMeta(brandId, taskId);
      const sourceReportId = this.readMetaString(currentTaskRow, "sourceReportId");
      const sourceReport = sourceWorkspace.history.find((item) => item.id === sourceReportId) || sourceWorkspace.latest;
      if (!sourceReport) {
        throw new NotFoundException("璇峰厛鐢熸垚鍝佺墝澧為暱鎶ュ憡");
      }

      const plan = await this.buildAnnualMarketingPlan({
        brandId,
        archive,
        sourceReport,
        generatedAt: startedAt,
      });

      await this.persistAnnualMarketingPlanResult(brandId, taskId, sourceReport, plan, startedAt);
      await this.updateAnnualMarketingPlanTaskStatus(brandId, taskId, {
        taskStatus: "SUCCESS",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: "",
        outputJson: {
          summary: plan.summary,
          planningYear: plan.planningYear,
          planningFocus: plan.planningFocus,
          itemCount: plan.items.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "半年营销规划生成失败";
      await this.updateAnnualMarketingPlanTaskStatus(brandId, taskId, {
        taskStatus: "FAILED",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  private async runXiaohongshuMarketingPlanTask(brandId: string, taskId: string) {
    const startedAt = new Date().toISOString();
    let currentPhaseStatus = this.buildXiaohongshuPhaseStatus("PREPARING");
    const applyRunningStatus = async () => {
      await this.updateXiaohongshuMarketingPlanTaskStatus(brandId, taskId, {
        taskStatus: "RUNNING",
        startedAt,
        errorMessage: "",
        outputJson: { ...currentPhaseStatus },
      });
    };
    await applyRunningStatus();
    const heartbeat = setInterval(() => {
      void applyRunningStatus();
    }, 20000);

    try {
      const archive = await this.brandsService.getArchive(brandId);
      const collection = await this.collectorsService.getXiaohongshuWorkspace(brandId);
      const growthReportWorkspace = await this.getGrowthReportWorkspace(brandId);
      const annualPlanWorkspace = await this.getAnnualMarketingPlanWorkspace(brandId);
      const currentTaskRow = await this.findTaskInputMeta(brandId, taskId);
      const sourceReportId = this.readMetaString(currentTaskRow, "sourceReportId");
      const sourceAnnualPlanId = this.readMetaString(currentTaskRow, "sourceAnnualPlanId");
      const sourceReport = growthReportWorkspace.history.find((item) => item.id === sourceReportId) || growthReportWorkspace.latest;
      const annualPlan = annualPlanWorkspace.history.find((item) => item.id === sourceAnnualPlanId) || annualPlanWorkspace.latest;
      if (!sourceReport) {
        throw new NotFoundException("璇峰厛鐢熸垚鍝佺墝澧為暱鎶ュ憡");
      }
      if (!annualPlan) {
        throw new NotFoundException("璇峰厛鐢熸垚鍏ㄥ勾钀ラ攢瑙勫垝");
      }

      const report = await this.buildXiaohongshuMarketingPlan({
        brandId,
        archive,
        collection,
        sourceReport,
        annualPlan,
        generatedAt: startedAt,
        onPhaseUpdate: async (phase, extra) => {
          currentPhaseStatus = this.buildXiaohongshuPhaseStatus(phase, extra);
          await applyRunningStatus();
        },
      });

      currentPhaseStatus = this.buildXiaohongshuPhaseStatus("PERSISTING", {
        modelName: report.modelName,
      });
      await applyRunningStatus();
      clearInterval(heartbeat);
      await this.persistXiaohongshuMarketingPlanResult(brandId, taskId, sourceReport, annualPlan, report, startedAt);
      await this.updateXiaohongshuMarketingPlanTaskStatus(brandId, taskId, {
        taskStatus: "SUCCESS",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: "",
        outputJson: {
          summary: report.summary,
          reportMarkdown: report.reportMarkdown,
          modelName: report.modelName,
          ...this.buildXiaohongshuPhaseStatus("DONE", {
            modelName: report.modelName,
          }),
        },
      });
    } catch (error) {
      clearInterval(heartbeat);
      const message = error instanceof Error ? error.message : "灏忕孩涔﹁惀閿€绛栧垝鏂规鐢熸垚澶辫触";
      await this.updateXiaohongshuMarketingPlanTaskStatus(brandId, taskId, {
        taskStatus: "FAILED",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  private async runDouyinMarketingPlanTask(brandId: string, taskId: string) {
    const startedAt = new Date().toISOString();
    let currentPhaseStatus = this.buildDouyinMarketingPlanPhaseStatus("PREPARING");
    const applyRunningStatus = async () => {
      await this.updateDouyinMarketingPlanTaskStatus(brandId, taskId, {
        taskStatus: "RUNNING",
        startedAt,
        errorMessage: "",
        outputJson: { ...currentPhaseStatus },
      });
    };
    await applyRunningStatus();
    const heartbeat = setInterval(() => {
      void applyRunningStatus();
    }, 20000);

    try {
      const archive = await this.brandsService.getArchive(brandId);
      const collection = await this.collectorsService.getDouyinWorkspace(brandId);
      const growthReportWorkspace = await this.getGrowthReportWorkspace(brandId);
      const annualPlanWorkspace = await this.getAnnualMarketingPlanWorkspace(brandId);
      const currentTaskRow = await this.findTaskInputMeta(brandId, taskId);
      const sourceReportId = this.readMetaString(currentTaskRow, "sourceReportId");
      const sourceAnnualPlanId = this.readMetaString(currentTaskRow, "sourceAnnualPlanId");
      const sourceReport = growthReportWorkspace.history.find((item) => item.id === sourceReportId) || growthReportWorkspace.latest;
      const annualPlan = annualPlanWorkspace.history.find((item) => item.id === sourceAnnualPlanId) || annualPlanWorkspace.latest;
      if (!sourceReport) {
        throw new NotFoundException("请先生成品牌增长报告");
      }
      if (!annualPlan) {
        throw new NotFoundException("请先生成半年营销规划");
      }

      currentPhaseStatus = this.buildDouyinMarketingPlanPhaseStatus("GENERATING");
      await applyRunningStatus();
      const report = await this.buildDouyinMarketingPlan({
        brandId,
        archive,
        collection,
        sourceReport,
        annualPlan,
        generatedAt: startedAt,
        onPhaseUpdate: async (phase, extra) => {
          currentPhaseStatus = this.buildDouyinMarketingPlanPhaseStatus(phase, extra);
          await applyRunningStatus();
        },
      });

      currentPhaseStatus = this.buildDouyinMarketingPlanPhaseStatus("PERSISTING", {
        modelName: report.modelName,
      });
      await applyRunningStatus();
      clearInterval(heartbeat);
      await this.persistDouyinMarketingPlanResult(brandId, taskId, sourceReport, annualPlan, report, startedAt);
      await this.updateDouyinMarketingPlanTaskStatus(brandId, taskId, {
        taskStatus: "SUCCESS",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: "",
        outputJson: {
          summary: report.summary,
          reportMarkdown: report.reportMarkdown,
          modelName: report.modelName,
          ...this.buildDouyinMarketingPlanPhaseStatus("DONE", {
            modelName: report.modelName,
          }),
        },
      });
    } catch (error) {
      clearInterval(heartbeat);
      const message = error instanceof Error ? error.message : "抖音营销策划方案生成失败";
      await this.updateDouyinMarketingPlanTaskStatus(brandId, taskId, {
        taskStatus: "FAILED",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  private async runDouyinHotTopicCandidatesTask(brandId: string, taskId: string) {
    const startedAt = new Date().toISOString();
    let currentPhaseStatus = this.buildDouyinHotTopicCandidatesPhaseStatus("PREPARING");
    const applyRunningStatus = async () => {
      await this.updateDouyinHotTopicCandidatesTaskStatus(brandId, taskId, {
        taskStatus: "RUNNING",
        startedAt,
        errorMessage: "",
        outputJson: { ...currentPhaseStatus },
      });
    };
    await applyRunningStatus();
    const heartbeat = setInterval(() => {
      void applyRunningStatus();
    }, 20000);

    try {
      const currentTaskRow = await this.findTaskInputMeta(brandId, taskId);
      const selectedDate = this.readMetaString(currentTaskRow, "selectedDate");
      const archive = await this.brandsService.getArchive(brandId);
      const dailyHotspots = await this.collectorsService.getDailyHotspotWorkspace(brandId, selectedDate || undefined);
      if (!dailyHotspots.selectedDate) {
        throw new NotFoundException("请先同步每日热点");
      }

      currentPhaseStatus = this.buildDouyinHotTopicCandidatesPhaseStatus("GENERATING");
      await applyRunningStatus();
      const report = await this.buildDouyinHotTopicCandidates({
        brandId,
        archive,
        dailyHotspots,
        generatedAt: startedAt,
        onPhaseUpdate: async (phase, extra) => {
          currentPhaseStatus = this.buildDouyinHotTopicCandidatesPhaseStatus(phase, extra);
          await applyRunningStatus();
        },
      });

      currentPhaseStatus = this.buildDouyinHotTopicCandidatesPhaseStatus("PERSISTING", {
        modelName: report.modelName,
      });
      await applyRunningStatus();
      clearInterval(heartbeat);
      await this.persistDouyinHotTopicCandidatesResult(brandId, taskId, report, startedAt);
      await this.updateDouyinHotTopicCandidatesTaskStatus(brandId, taskId, {
        taskStatus: "SUCCESS",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: "",
        outputJson: {
          summary: report.summary,
          itemCount: report.items.length,
          modelName: report.modelName,
          selectedDate: report.selectedDate,
          ...this.buildDouyinHotTopicCandidatesPhaseStatus("DONE", {
            modelName: report.modelName,
          }),
        },
      });
    } catch (error) {
      clearInterval(heartbeat);
      const message = error instanceof Error ? error.message : "抖音热点找选题生成失败";
      await this.updateDouyinHotTopicCandidatesTaskStatus(brandId, taskId, {
        taskStatus: "FAILED",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  private async runXiaohongshuMarketingCalendarTask(brandId: string, taskId: string) {
    const startedAt = new Date().toISOString();
    let currentPhaseStatus = this.buildXiaohongshuMarketingCalendarPhaseStatus("PREPARING");
    const applyRunningStatus = async () => {
      await this.updateXiaohongshuMarketingCalendarTaskStatus(brandId, taskId, {
        taskStatus: "RUNNING",
        startedAt,
        errorMessage: "",
        outputJson: { ...currentPhaseStatus },
      });
    };
    await applyRunningStatus();
    const heartbeat = setInterval(() => {
      void applyRunningStatus();
    }, 20000);

    try {
      const archive = await this.brandsService.getArchive(brandId);
      const collection = await this.collectorsService.getXiaohongshuWorkspace(brandId);
      const dailyHotspots = await this.collectorsService.getDailyHotspotWorkspace(brandId);
      const growthReportWorkspace = await this.getGrowthReportWorkspace(brandId);
      const annualPlanWorkspace = await this.getAnnualMarketingPlanWorkspace(brandId);
      const marketingPlanWorkspace = await this.getXiaohongshuMarketingPlanWorkspace(brandId);
      const calendarWorkspace = await this.getXiaohongshuMarketingCalendarWorkspace(brandId);
      const currentTaskRow = await this.findTaskInputMeta(brandId, taskId);
      const sourceReportId = this.readMetaString(currentTaskRow, "sourceReportId");
      const sourceAnnualPlanId = this.readMetaString(currentTaskRow, "sourceAnnualPlanId");
      const sourceMarketingPlanId = this.readMetaString(currentTaskRow, "sourceMarketingPlanId");
      const sourceReport = growthReportWorkspace.history.find((item) => item.id === sourceReportId) || growthReportWorkspace.latest;
      const annualPlan = annualPlanWorkspace.history.find((item) => item.id === sourceAnnualPlanId) || annualPlanWorkspace.latest;
      const marketingPlan = marketingPlanWorkspace.history.find((item) => item.id === sourceMarketingPlanId) || marketingPlanWorkspace.latest;
      if (!sourceReport) {
        throw new NotFoundException("请先生成品牌增长报告");
      }
      if (!annualPlan) {
        throw new NotFoundException("请先生成半年营销规划");
      }
      if (!marketingPlan) {
        throw new NotFoundException("请先生成小红书营销策划方案");
      }

      currentPhaseStatus = this.buildXiaohongshuMarketingCalendarPhaseStatus("GENERATING");
      await applyRunningStatus();
      const report = await this.buildXiaohongshuMarketingCalendar({
        brandId,
        archive,
        collection,
        dailyHotspots,
        sourceReport,
        annualPlan,
        marketingPlan,
        previousCalendars: calendarWorkspace.history,
        generatedAt: startedAt,
        onPhaseUpdate: async (phase, extra) => {
          currentPhaseStatus = this.buildXiaohongshuMarketingCalendarPhaseStatus(phase, extra);
          await applyRunningStatus();
        },
      });

      currentPhaseStatus = this.buildXiaohongshuMarketingCalendarPhaseStatus("PERSISTING", {
        modelName: report.modelName,
      });
      await applyRunningStatus();
      clearInterval(heartbeat);
      await this.persistXiaohongshuMarketingCalendarResult(
        brandId,
        taskId,
        sourceReport,
        annualPlan,
        marketingPlan,
        report,
        startedAt,
      );
      await this.updateXiaohongshuMarketingCalendarTaskStatus(brandId, taskId, {
        taskStatus: "SUCCESS",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: "",
        outputJson: {
          summary: report.summary,
          itemCount: report.items.length,
          modelName: report.modelName,
          ...this.buildXiaohongshuMarketingCalendarPhaseStatus("DONE", {
            modelName: report.modelName,
          }),
        },
      });
    } catch (error) {
      clearInterval(heartbeat);
      const message = error instanceof Error ? error.message : "营销日历生成失败";
      await this.updateXiaohongshuMarketingCalendarTaskStatus(brandId, taskId, {
        taskStatus: "FAILED",
        startedAt,
        finishedAt: new Date().toISOString(),
        errorMessage: message,
      });
    }
  }

  private async persistGrowthReportResult(
    brandId: string,
    taskId: string,
    report: Awaited<ReturnType<ReportsService["buildReport"]>>,
    generatedAt: string,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { ownerUserId: true },
      });
      if (!brand) {
        throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
      }

      const fileName = this.buildGrowthReportFileName(taskId);
      const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
      const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
      await this.persistReportHtml(storageKey, report.htmlContent);

      const media = await this.prismaService.mediaAsset.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskId,
          title: report.title,
          mediaType: MediaType.HTML,
          storageKey,
          sourceUrl,
          mimeType: "text/html",
          metadataJson: {
            kind: "BRAND_GROWTH_REPORT",
            generatedAt,
            summary: report.summary,
          } as Prisma.InputJsonValue,
        },
      });

      await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
          title: report.title,
          description: report.summary,
          fileUrl: media.sourceUrl,
          metadataJson: {
            kind: "BRAND_GROWTH_REPORT",
            generatedAt,
            taskId,
            mediaId: media.id,
            summary: report.summary,
            diagnosis: report.diagnosis,
            opportunities: report.opportunities,
            nextActions: report.nextActions,
            reportMarkdown: report.reportMarkdown,
            htmlContent: report.htmlContent,
            metrics: report.metrics,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }

    const mediaId = createId("med");
    const fileName = this.buildGrowthReportFileName(taskId);
    const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
    const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
    await this.persistReportHtml(storageKey, report.htmlContent);

    database.media.unshift({
      id: mediaId,
      userId: brand.ownerUserId,
      brandId,
      taskId,
      title: report.title,
      mediaType: "HTML",
      sourceUrl,
      storageKey,
      mimeType: "text/html",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    });

    database.assets.unshift({
      id: createId("ast"),
      brandId,
      category: "GENERATED_REPORT",
      title: report.title,
      description: report.summary,
      sourceName: "绯荤粺鐢熸垚",
      fileUrl: sourceUrl,
      metadataJson: {
        kind: "BRAND_GROWTH_REPORT",
        generatedAt,
        taskId,
        mediaId,
        summary: report.summary,
        diagnosis: report.diagnosis,
        opportunities: report.opportunities,
        nextActions: report.nextActions,
        reportMarkdown: report.reportMarkdown,
        htmlContent: report.htmlContent,
        metrics: report.metrics,
      },
    });
  }

  private async updateGrowthReportTaskStatus(
    brandId: string,
    taskId: string,
    patch: {
      taskStatus: GrowthReportTaskRecord["taskStatus"];
      startedAt?: string;
      finishedAt?: string;
      errorMessage?: string;
      outputJson?: Record<string, unknown>;
    },
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: patch.taskStatus as TaskStatus,
          startedAt: patch.startedAt ? new Date(patch.startedAt) : undefined,
          finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : undefined,
          errorMessage: patch.errorMessage !== undefined ? patch.errorMessage || null : undefined,
          outputJson: patch.outputJson ? patch.outputJson as Prisma.InputJsonValue : undefined,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId && item.brandId === brandId);
    if (!task) {
      return;
    }

    task.taskStatus = patch.taskStatus;
    task.updatedAt = new Date().toISOString();
    if (patch.startedAt !== undefined) {
      task.startedAt = patch.startedAt;
    }
    if (patch.finishedAt !== undefined) {
      task.finishedAt = patch.finishedAt;
    }
    if (patch.errorMessage !== undefined) {
      task.errorMessage = patch.errorMessage || undefined;
    }
    if (patch.outputJson) {
      task.outputJson = patch.outputJson;
    }
  }

  private async persistXiaohongshuMarketingPlanResult(
    brandId: string,
    taskId: string,
    sourceReport: GrowthReportRecord,
    annualPlan: AnnualMarketingPlanRecord,
    report: Awaited<ReturnType<ReportsService["buildXiaohongshuMarketingPlan"]>>,
    generatedAt: string,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { ownerUserId: true },
      });
      if (!brand) {
        throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
      }

      const fileName = this.buildXiaohongshuMarketingPlanFileName(taskId);
      const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
      const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
      await this.persistReportHtml(storageKey, report.htmlContent);

      const media = await this.prismaService.mediaAsset.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskId,
          title: report.title,
          mediaType: MediaType.HTML,
          storageKey,
          sourceUrl,
          mimeType: "text/html",
          metadataJson: {
            kind: "XHS_MARKETING_PLAN",
            generatedAt,
            summary: report.summary,
          } as Prisma.InputJsonValue,
        },
      });

      await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
          title: report.title,
          description: report.summary,
          fileUrl: media.sourceUrl,
          metadataJson: {
            kind: "XHS_MARKETING_PLAN",
            generatedAt,
            taskId,
            mediaId: media.id,
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
            sourceAnnualPlanId: annualPlan.id,
            sourceAnnualPlanTitle: annualPlan.title,
            summary: report.summary,
            reportMarkdown: report.reportMarkdown,
            htmlContent: report.htmlContent,
            modelName: report.modelName,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }

    const mediaId = createId("med");
    const fileName = this.buildXiaohongshuMarketingPlanFileName(taskId);
    const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
    const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
    await this.persistReportHtml(storageKey, report.htmlContent);

    database.media.unshift({
      id: mediaId,
      userId: brand.ownerUserId,
      brandId,
      taskId,
      title: report.title,
      mediaType: "HTML",
      sourceUrl,
      storageKey,
      mimeType: "text/html",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    });

    database.assets.unshift({
      id: createId("ast"),
      brandId,
      category: "GENERATED_REPORT",
      title: report.title,
      description: report.summary,
      sourceName: "绯荤粺鐢熸垚",
      fileUrl: sourceUrl,
      metadataJson: {
        kind: "XHS_MARKETING_PLAN",
        generatedAt,
        taskId,
        mediaId,
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
        sourceAnnualPlanId: annualPlan.id,
        sourceAnnualPlanTitle: annualPlan.title,
        summary: report.summary,
        reportMarkdown: report.reportMarkdown,
        htmlContent: report.htmlContent,
        modelName: report.modelName,
      },
    });
  }

  private async persistDouyinMarketingPlanResult(
    brandId: string,
    taskId: string,
    sourceReport: GrowthReportRecord,
    annualPlan: AnnualMarketingPlanRecord,
    report: Awaited<ReturnType<ReportsService["buildDouyinMarketingPlan"]>>,
    generatedAt: string,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { ownerUserId: true },
      });
      if (!brand) {
        throw new NotFoundException("品牌不存在");
      }

      const fileName = this.buildDouyinMarketingPlanFileName(taskId);
      const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
      const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
      await this.persistReportHtml(storageKey, report.htmlContent);

      const media = await this.prismaService.mediaAsset.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskId,
          title: report.title,
          mediaType: MediaType.HTML,
          storageKey,
          sourceUrl,
          mimeType: "text/html",
          metadataJson: {
            kind: "DOUYIN_MARKETING_PLAN",
            generatedAt,
            summary: report.summary,
          } as Prisma.InputJsonValue,
        },
      });

      await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
          title: report.title,
          description: report.summary,
          fileUrl: media.sourceUrl,
          metadataJson: {
            kind: "DOUYIN_MARKETING_PLAN",
            generatedAt,
            taskId,
            mediaId: media.id,
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
            sourceAnnualPlanId: annualPlan.id,
            sourceAnnualPlanTitle: annualPlan.title,
            summary: report.summary,
            reportMarkdown: report.reportMarkdown,
            htmlContent: report.htmlContent,
            modelName: report.modelName,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    const mediaId = createId("med");
    const fileName = this.buildDouyinMarketingPlanFileName(taskId);
    const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
    const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
    await this.persistReportHtml(storageKey, report.htmlContent);

    database.media.unshift({
      id: mediaId,
      userId: brand.ownerUserId,
      brandId,
      taskId,
      title: report.title,
      mediaType: "HTML",
      sourceUrl,
      storageKey,
      mimeType: "text/html",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    });

    database.assets.unshift({
      id: createId("ast"),
      brandId,
      category: "GENERATED_REPORT",
      title: report.title,
      description: report.summary,
      sourceName: "系统生成",
      fileUrl: sourceUrl,
      metadataJson: {
        kind: "DOUYIN_MARKETING_PLAN",
        generatedAt,
        taskId,
        mediaId,
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
        sourceAnnualPlanId: annualPlan.id,
        sourceAnnualPlanTitle: annualPlan.title,
        summary: report.summary,
        reportMarkdown: report.reportMarkdown,
        htmlContent: report.htmlContent,
        modelName: report.modelName,
      },
    });
  }

  private async persistDouyinHotTopicCandidatesResult(
    brandId: string,
    taskId: string,
    report: Awaited<ReturnType<ReportsService["buildDouyinHotTopicCandidates"]>>,
    generatedAt: string,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
          title: report.title,
          description: report.summary,
          metadataJson: {
            kind: "DOUYIN_HOT_TOPIC_CANDIDATES",
            generatedAt,
            taskId,
            summary: report.summary,
            selectedDate: report.selectedDate,
            items: report.items,
            modelName: report.modelName,
            reportContent: report.reportContent,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    database.assets.unshift({
      id: createId("ast"),
      brandId,
      category: "GENERATED_REPORT",
      title: report.title,
      description: report.summary,
      sourceName: "系统生成",
      fileUrl: undefined,
      metadataJson: {
        kind: "DOUYIN_HOT_TOPIC_CANDIDATES",
        generatedAt,
        taskId,
        summary: report.summary,
        selectedDate: report.selectedDate,
        items: report.items,
        modelName: report.modelName,
        reportContent: report.reportContent,
      },
    });
  }

  private async persistXiaohongshuMarketingCalendarResult(
    brandId: string,
    taskId: string,
    sourceReport: GrowthReportRecord,
    annualPlan: AnnualMarketingPlanRecord,
    marketingPlan: XiaohongshuMarketingPlanRecord,
    report: Awaited<ReturnType<ReportsService["buildXiaohongshuMarketingCalendar"]>>,
    generatedAt: string,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
          title: report.title,
          description: report.summary,
          metadataJson: {
            kind: "XHS_MARKETING_CALENDAR",
            generatedAt,
            taskId,
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
            sourceAnnualPlanId: annualPlan.id,
            sourceAnnualPlanTitle: annualPlan.title,
            sourceMarketingPlanId: marketingPlan.id,
            sourceMarketingPlanTitle: marketingPlan.title,
            summary: report.summary,
            items: report.items,
            modelName: report.modelName,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    database.assets.unshift({
      id: createId("ast"),
      brandId,
      category: "GENERATED_REPORT",
      title: report.title,
      description: report.summary,
      sourceName: "绯荤粺鐢熸垚",
      fileUrl: undefined,
      metadataJson: {
        kind: "XHS_MARKETING_CALENDAR",
        generatedAt,
        taskId,
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
        sourceAnnualPlanId: annualPlan.id,
        sourceAnnualPlanTitle: annualPlan.title,
        sourceMarketingPlanId: marketingPlan.id,
        sourceMarketingPlanTitle: marketingPlan.title,
        summary: report.summary,
        items: report.items,
        modelName: report.modelName,
      },
    });
  }

  private async persistVisualGrowthReportResult(
    brandId: string,
    taskId: string,
    sourceReport: GrowthReportRecord,
    report: Awaited<ReturnType<ReportsService["buildVisualReport"]>>,
    generatedAt: string,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { ownerUserId: true },
      });
      if (!brand) {
        throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
      }

      const fileName = this.buildVisualGrowthReportFileName(taskId);
      const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
      const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
      await this.persistReportHtml(storageKey, report.htmlDocument);

      const media = await this.prismaService.mediaAsset.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskId,
          title: report.title,
          mediaType: MediaType.HTML,
          storageKey,
          sourceUrl,
          mimeType: "text/html",
          metadataJson: {
            kind: "BRAND_GROWTH_VISUAL_REPORT",
            generatedAt,
            summary: report.summary,
          } as Prisma.InputJsonValue,
        },
      });

      await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
          title: report.title,
          description: report.summary,
          fileUrl: media.sourceUrl,
          metadataJson: {
            kind: "BRAND_GROWTH_VISUAL_REPORT",
            generatedAt,
            taskId,
            mediaId: media.id,
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
            summary: report.summary,
            htmlBody: report.htmlBody,
            htmlDocument: report.htmlDocument,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }

    const mediaId = createId("med");
    const fileName = this.buildVisualGrowthReportFileName(taskId);
    const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
    const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
    await this.persistReportHtml(storageKey, report.htmlDocument);

    database.media.unshift({
      id: mediaId,
      userId: brand.ownerUserId,
      brandId,
      taskId,
      title: report.title,
      mediaType: "HTML",
      sourceUrl,
      storageKey,
      mimeType: "text/html",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    });

    database.assets.unshift({
      id: createId("ast"),
      brandId,
      category: "GENERATED_REPORT",
      title: report.title,
      description: report.summary,
      sourceName: "绯荤粺鐢熸垚",
      fileUrl: sourceUrl,
      metadataJson: {
        kind: "BRAND_GROWTH_VISUAL_REPORT",
        generatedAt,
        taskId,
        mediaId,
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
        summary: report.summary,
        htmlBody: report.htmlBody,
        htmlDocument: report.htmlDocument,
      },
    });
  }

  private async persistAnnualMarketingPlanResult(
    brandId: string,
    taskId: string,
    sourceReport: GrowthReportRecord,
    plan: Awaited<ReturnType<ReportsService["buildAnnualMarketingPlan"]>>,
    generatedAt: string,
  ) {
    if (await this.prismaService.canUseDatabase()) {
      const brand = await this.prismaService.brand.findUnique({
        where: { id: brandId },
        select: { ownerUserId: true },
      });
      if (!brand) {
        throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
      }

      const fileName = this.buildAnnualMarketingPlanFileName(taskId);
      const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
      const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
      await this.persistReportHtml(storageKey, plan.htmlDocument);

      const media = await this.prismaService.mediaAsset.create({
        data: {
          userId: brand.ownerUserId,
          brandId,
          taskId,
          title: plan.title,
          mediaType: MediaType.HTML,
          storageKey,
          sourceUrl,
          mimeType: "text/html",
          metadataJson: {
            kind: CURRENT_HALF_YEAR_MARKETING_PLAN_ASSET_KIND,
            generatedAt,
            summary: plan.summary,
          } as Prisma.InputJsonValue,
        },
      });

      await this.prismaService.businessAsset.create({
        data: {
          brandId,
          category: AssetCategory.GENERATED_REPORT,
          title: plan.title,
          description: plan.summary,
          fileUrl: media.sourceUrl,
          metadataJson: {
            kind: CURRENT_HALF_YEAR_MARKETING_PLAN_ASSET_KIND,
            generatedAt,
            taskId,
            mediaId: media.id,
            sourceReportId: sourceReport.id,
            sourceReportTitle: sourceReport.title,
            summary: plan.summary,
            planningYear: plan.planningYear,
            planningFocus: plan.planningFocus,
            items: plan.items,
            htmlBody: plan.htmlBody,
            htmlDocument: plan.htmlDocument,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }

    const mediaId = createId("med");
    const fileName = this.buildAnnualMarketingPlanFileName(taskId);
    const storageKey = this.buildReportAssetStorageKey(brandId, fileName);
    const sourceUrl = this.buildReportAssetUrl(brandId, fileName);
    await this.persistReportHtml(storageKey, plan.htmlDocument);

    database.media.unshift({
      id: mediaId,
      userId: brand.ownerUserId,
      brandId,
      taskId,
      title: plan.title,
      mediaType: "HTML",
      sourceUrl,
      storageKey,
      mimeType: "text/html",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    });

    database.assets.unshift({
      id: createId("ast"),
      brandId,
      category: "GENERATED_REPORT",
      title: plan.title,
      description: plan.summary,
      sourceName: "绯荤粺鐢熸垚",
      fileUrl: sourceUrl,
      metadataJson: {
        kind: CURRENT_HALF_YEAR_MARKETING_PLAN_ASSET_KIND,
        generatedAt,
        taskId,
        mediaId,
        sourceReportId: sourceReport.id,
        sourceReportTitle: sourceReport.title,
        summary: plan.summary,
        planningYear: plan.planningYear,
        planningFocus: plan.planningFocus,
        items: plan.items,
        htmlBody: plan.htmlBody,
        htmlDocument: plan.htmlDocument,
      },
    });
  }

  private async updateVisualGrowthReportTaskStatus(
    brandId: string,
    taskId: string,
    patch: {
      taskStatus: VisualGrowthReportTaskRecord["taskStatus"];
      startedAt?: string;
      finishedAt?: string;
      errorMessage?: string;
      outputJson?: Record<string, unknown>;
    },
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: patch.taskStatus as TaskStatus,
          startedAt: patch.startedAt ? new Date(patch.startedAt) : undefined,
          finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : undefined,
          errorMessage: patch.errorMessage !== undefined ? patch.errorMessage || null : undefined,
          outputJson: patch.outputJson ? patch.outputJson as Prisma.InputJsonValue : undefined,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId && item.brandId === brandId);
    if (!task) {
      return;
    }

    task.taskStatus = patch.taskStatus;
    task.updatedAt = new Date().toISOString();
    if (patch.startedAt !== undefined) {
      task.startedAt = patch.startedAt;
    }
    if (patch.finishedAt !== undefined) {
      task.finishedAt = patch.finishedAt;
    }
    if (patch.errorMessage !== undefined) {
      task.errorMessage = patch.errorMessage || undefined;
    }
    if (patch.outputJson) {
      task.outputJson = patch.outputJson;
    }
  }

  private async updateAnnualMarketingPlanTaskStatus(
    brandId: string,
    taskId: string,
    patch: {
      taskStatus: AnnualMarketingPlanTaskRecord["taskStatus"];
      startedAt?: string;
      finishedAt?: string;
      errorMessage?: string;
      outputJson?: Record<string, unknown>;
    },
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: patch.taskStatus as TaskStatus,
          startedAt: patch.startedAt ? new Date(patch.startedAt) : undefined,
          finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : undefined,
          errorMessage: patch.errorMessage !== undefined ? patch.errorMessage || null : undefined,
          outputJson: patch.outputJson ? patch.outputJson as Prisma.InputJsonValue : undefined,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId && item.brandId === brandId);
    if (!task) {
      return;
    }

    task.taskStatus = patch.taskStatus;
    task.updatedAt = new Date().toISOString();
    if (patch.startedAt !== undefined) {
      task.startedAt = patch.startedAt;
    }
    if (patch.finishedAt !== undefined) {
      task.finishedAt = patch.finishedAt;
    }
    if (patch.errorMessage !== undefined) {
      task.errorMessage = patch.errorMessage || undefined;
    }
    if (patch.outputJson) {
      task.outputJson = patch.outputJson;
    }
  }

  private async updateXiaohongshuMarketingPlanTaskStatus(
    brandId: string,
    taskId: string,
    patch: {
      taskStatus: XiaohongshuMarketingPlanTaskRecord["taskStatus"];
      startedAt?: string;
      finishedAt?: string;
      errorMessage?: string;
      outputJson?: Record<string, unknown>;
    },
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: patch.taskStatus as TaskStatus,
          startedAt: patch.startedAt ? new Date(patch.startedAt) : undefined,
          finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : undefined,
          errorMessage: patch.errorMessage !== undefined ? patch.errorMessage || null : undefined,
          outputJson: patch.outputJson ? patch.outputJson as Prisma.InputJsonValue : undefined,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId && item.brandId === brandId);
    if (!task) {
      return;
    }

    task.taskStatus = patch.taskStatus;
    task.updatedAt = new Date().toISOString();
    if (patch.startedAt !== undefined) {
      task.startedAt = patch.startedAt;
    }
    if (patch.finishedAt !== undefined) {
      task.finishedAt = patch.finishedAt;
    }
    if (patch.errorMessage !== undefined) {
      task.errorMessage = patch.errorMessage || undefined;
    }
    if (patch.outputJson) {
      task.outputJson = patch.outputJson;
    }
  }

  private async updateDouyinMarketingPlanTaskStatus(
    brandId: string,
    taskId: string,
    patch: {
      taskStatus: DouyinMarketingPlanTaskRecord["taskStatus"];
      startedAt?: string;
      finishedAt?: string;
      errorMessage?: string;
      outputJson?: Record<string, unknown>;
    },
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: patch.taskStatus as TaskStatus,
          startedAt: patch.startedAt ? new Date(patch.startedAt) : undefined,
          finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : undefined,
          errorMessage: patch.errorMessage !== undefined ? patch.errorMessage || null : undefined,
          outputJson: patch.outputJson ? patch.outputJson as Prisma.InputJsonValue : undefined,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId && item.brandId === brandId);
    if (!task) {
      return;
    }

    task.taskStatus = patch.taskStatus;
    task.updatedAt = new Date().toISOString();
    if (patch.startedAt !== undefined) {
      task.startedAt = patch.startedAt;
    }
    if (patch.finishedAt !== undefined) {
      task.finishedAt = patch.finishedAt;
    }
    if (patch.errorMessage !== undefined) {
      task.errorMessage = patch.errorMessage || undefined;
    }
    if (patch.outputJson) {
      task.outputJson = patch.outputJson;
    }
  }

  private async updateDouyinHotTopicCandidatesTaskStatus(
    brandId: string,
    taskId: string,
    patch: {
      taskStatus: DouyinHotTopicCandidatesTaskRecord["taskStatus"];
      startedAt?: string;
      finishedAt?: string;
      errorMessage?: string;
      outputJson?: Record<string, unknown>;
    },
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: patch.taskStatus as TaskStatus,
          startedAt: patch.startedAt ? new Date(patch.startedAt) : undefined,
          finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : undefined,
          errorMessage: patch.errorMessage !== undefined ? patch.errorMessage || null : undefined,
          outputJson: patch.outputJson ? patch.outputJson as Prisma.InputJsonValue : undefined,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId && item.brandId === brandId);
    if (!task) {
      return;
    }

    task.taskStatus = patch.taskStatus;
    task.updatedAt = new Date().toISOString();
    if (patch.startedAt !== undefined) {
      task.startedAt = patch.startedAt;
    }
    if (patch.finishedAt !== undefined) {
      task.finishedAt = patch.finishedAt;
    }
    if (patch.errorMessage !== undefined) {
      task.errorMessage = patch.errorMessage || undefined;
    }
    if (patch.outputJson) {
      task.outputJson = patch.outputJson;
    }
  }

  private async updateXiaohongshuMarketingCalendarTaskStatus(
    brandId: string,
    taskId: string,
    patch: {
      taskStatus: XiaohongshuMarketingCalendarTaskRecord["taskStatus"];
      startedAt?: string;
      finishedAt?: string;
      errorMessage?: string;
      outputJson?: Record<string, unknown>;
    },
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(brandId);
      await this.prismaService.task.update({
        where: { id: taskId },
        data: {
          taskStatus: patch.taskStatus as TaskStatus,
          startedAt: patch.startedAt ? new Date(patch.startedAt) : undefined,
          finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : undefined,
          errorMessage: patch.errorMessage !== undefined ? patch.errorMessage || null : undefined,
          outputJson: patch.outputJson ? patch.outputJson as Prisma.InputJsonValue : undefined,
        },
      });
      return;
    }

    const task = database.tasks.find((item) => item.id === taskId && item.brandId === brandId);
    if (!task) {
      return;
    }

    task.taskStatus = patch.taskStatus;
    task.updatedAt = new Date().toISOString();
    if (patch.startedAt !== undefined) {
      task.startedAt = patch.startedAt;
    }
    if (patch.finishedAt !== undefined) {
      task.finishedAt = patch.finishedAt;
    }
    if (patch.errorMessage !== undefined) {
      task.errorMessage = patch.errorMessage || undefined;
    }
    if (patch.outputJson) {
      task.outputJson = patch.outputJson;
    }
  }

  private async findTaskInputMeta(brandId: string, taskId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const task = await this.prismaService.task.findFirst({
        where: {
          id: taskId,
          brandId,
        },
        select: {
          inputJson: true,
        },
      });
      return this.asMeta(task?.inputJson);
    }

    const task = database.tasks.find((item) => item.id === taskId && item.brandId === brandId);
    return this.asMeta(task?.inputJson);
  }

  private async buildReport(params: {
    brandId: string;
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>;
    collection: Awaited<ReturnType<CollectorsService["getXiaohongshuWorkspace"]>>;
    generatedAt: string;
  }) {
    const prompt = await this.loadGrowthAnalysisSkillPrompt();
    const inputPayload = this.buildGrowthAnalysisInput(params.archive, params.collection, params.generatedAt);
    const modelResult = await this.generateReportByModel(params.brandId, prompt, inputPayload);
    const metrics = {
      productCount: params.archive.products.length,
      platformAccountCount: params.collection.brandAccounts.length,
      competitorAccountCount: params.collection.competitorAccounts.length,
      brandNoteCount: params.collection.brandNotes.length,
      benchmarkNoteCount: params.collection.benchmarkNotes.length,
    };
    const htmlContent = this.renderMarkdownToHtml(modelResult.reportMarkdown);

    return {
      title: modelResult.title || `${params.archive.brand.brandName}鍝佺墝澧為暱鎶ュ憡`,
      summary: modelResult.summary,
      diagnosis: modelResult.diagnosis,
      opportunities: modelResult.opportunities,
      nextActions: modelResult.nextActions,
      reportMarkdown: modelResult.reportMarkdown,
      metrics,
      htmlContent,
    };
  }

  private async buildVisualReport(params: {
    brandId: string;
    sourceReport: GrowthReportRecord;
    generatedAt: string;
  }) {
    const settings = await this.loadVisualReportGenerationSettings(params.brandId);
    const prompt = this.loadVisualReportSkillPrompt(settings);
    const inputPayload = this.buildVisualReportInput(params.sourceReport, params.generatedAt);
    const outline = await this.generateVisualReportByModel(prompt, inputPayload, settings);
    const modelResult = this.renderVisualOutlineToResult(outline);
    const htmlDocument = this.buildVisualReportDocument(modelResult.title, modelResult.htmlBody);

    return {
      title: modelResult.title || `${params.sourceReport.title}可视化报告`,
      summary: modelResult.summary,
      htmlBody: modelResult.htmlBody,
      htmlDocument,
    };
  }

  private async buildAnnualMarketingPlan(params: {
    brandId: string;
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>;
    sourceReport: GrowthReportRecord;
    generatedAt: string;
  }) {
    const settings = await this.loadAnnualMarketingPlanGenerationSettings(params.brandId);
    const prompt = this.loadAnnualMarketingPlanPrompt(settings);
    const inputPayload = this.buildAnnualMarketingPlanInput(params.archive, params.sourceReport, params.generatedAt);
    const modelResult = await this.generateAnnualMarketingPlanByModel(prompt, inputPayload, settings);
    const htmlBody = this.renderAnnualMarketingPlanToHtml(modelResult);
    const htmlDocument = this.buildVisualReportDocument(modelResult.title, htmlBody);

    return {
      ...modelResult,
      htmlBody,
      htmlDocument,
    };
  }

  private async buildXiaohongshuMarketingPlan(params: {
    brandId: string;
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>;
    collection: Awaited<ReturnType<CollectorsService["getXiaohongshuWorkspace"]>>;
    sourceReport: GrowthReportRecord;
    annualPlan: AnnualMarketingPlanRecord;
    generatedAt: string;
    onPhaseUpdate?: (
      phase: XiaohongshuMarketingPlanPhase,
      extra?: {
        modelName?: string;
        detailText?: string;
      },
    ) => Promise<void>;
  }) {
    const settings = await this.loadXiaohongshuMarketingPlanGenerationSettings(params.brandId);
    const skillPrompt = await this.loadXiaohongshuMarketingSkillMarkdown();
    const inputPayload = this.buildXiaohongshuMarketingPlanInput(
      params.archive,
      params.collection,
      params.sourceReport,
      params.annualPlan,
      params.generatedAt,
    );
    await params.onPhaseUpdate?.("PART_ONE");
    const firstPart = await this.generateXiaohongshuMarketingPlanSectionByModel(
      this.buildXiaohongshuMarketingPlanSystemPrompt(skillPrompt, settings, "PART_ONE"),
      this.buildXiaohongshuMarketingPlanUserPrompt(inputPayload, "PART_ONE"),
      settings,
      {
        requiredHeadings: ["## 一、"],
        onAttemptUpdate: async (detailText) => {
          await params.onPhaseUpdate?.("PART_ONE", { detailText });
        },
      },
    );
    await params.onPhaseUpdate?.("PART_TWO");
    const secondPart = await this.generateXiaohongshuMarketingPlanSectionByModel(
      this.buildXiaohongshuMarketingPlanSystemPrompt(skillPrompt, settings, "PART_TWO"),
      this.buildXiaohongshuMarketingPlanUserPrompt(inputPayload, "PART_TWO", firstPart.markdown),
      settings,
      {
        requiredHeadings: ["## 二、"],
        onAttemptUpdate: async (detailText) => {
          await params.onPhaseUpdate?.("PART_TWO", { detailText });
        },
      },
    );
    await params.onPhaseUpdate?.("PART_THREE");
    const thirdPart = await this.generateXiaohongshuMarketingPlanSectionByModel(
      this.buildXiaohongshuMarketingPlanSystemPrompt(skillPrompt, settings, "PART_THREE"),
      this.buildXiaohongshuMarketingPlanUserPrompt(inputPayload, "PART_THREE", `${firstPart.markdown}\n\n${secondPart.markdown}`),
      settings,
      {
        requiredHeadings: ["## 三、"],
        onAttemptUpdate: async (detailText) => {
          await params.onPhaseUpdate?.("PART_THREE", { detailText });
        },
      },
    );
    await params.onPhaseUpdate?.("PART_FOUR");
    const fourthPart = await this.generateXiaohongshuMarketingPlanSectionByModel(
      this.buildXiaohongshuMarketingPlanSystemPrompt(skillPrompt, settings, "PART_FOUR"),
      this.buildXiaohongshuMarketingPlanUserPrompt(
        inputPayload,
        "PART_FOUR",
        `${firstPart.markdown}\n\n${secondPart.markdown}\n\n${thirdPart.markdown}`,
      ),
      settings,
      {
        requiredHeadings: ["## 四、"],
        onAttemptUpdate: async (detailText) => {
          await params.onPhaseUpdate?.("PART_FOUR", { detailText });
        },
      },
    );
    await params.onPhaseUpdate?.("PART_FIVE");
    const fifthPart = await this.generateXiaohongshuMarketingPlanSectionByModel(
      this.buildXiaohongshuMarketingPlanSystemPrompt(skillPrompt, settings, "PART_FIVE"),
      this.buildXiaohongshuMarketingPlanUserPrompt(
        inputPayload,
        "PART_FIVE",
        `${firstPart.markdown}\n\n${secondPart.markdown}\n\n${thirdPart.markdown}\n\n${fourthPart.markdown}`,
      ),
      settings,
      {
        requiredHeadings: ["## 五、"],
        onAttemptUpdate: async (detailText) => {
          await params.onPhaseUpdate?.("PART_FIVE", { detailText });
        },
      },
    );
    await params.onPhaseUpdate?.("MERGING");
    const modelResult = this.mergeXiaohongshuMarketingPlanSections(
      firstPart,
      secondPart,
      thirdPart,
      fourthPart,
      fifthPart,
      inputPayload,
    );
    return {
      ...modelResult,
      htmlContent: this.renderMarkdownToHtml(modelResult.reportMarkdown),
    };
  }

  private async buildDouyinMarketingPlan(params: {
    brandId: string;
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>;
    collection: Awaited<ReturnType<CollectorsService["getDouyinWorkspace"]>>;
    sourceReport: GrowthReportRecord;
    annualPlan: AnnualMarketingPlanRecord;
    generatedAt: string;
    onPhaseUpdate?: (
      phase: DouyinMarketingPlanPhase,
      extra?: {
        modelName?: string;
        detailText?: string;
      },
    ) => Promise<void> | void;
  }) {
    const settings = await this.loadDouyinMarketingPlanGenerationSettings(params.brandId);
    const inputPayload = this.buildDouyinMarketingPlanInput(
      params.archive,
      params.collection,
      params.sourceReport,
      params.annualPlan,
      params.generatedAt,
    );
    await params.onPhaseUpdate?.("GENERATING");
    const modelResult = await this.generateDouyinMarketingPlanByModel(settings.promptContent, inputPayload, settings, {
      onAttemptUpdate: async (detailText, modelName) => {
        await params.onPhaseUpdate?.("GENERATING", {
          detailText,
          modelName,
        });
      },
    });
    return {
      ...modelResult,
      htmlContent: this.renderMarkdownToHtml(modelResult.reportMarkdown),
    };
  }

  private async buildDouyinHotTopicCandidates(params: {
    brandId: string;
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>;
    dailyHotspots: Awaited<ReturnType<CollectorsService["getDailyHotspotWorkspace"]>>;
    generatedAt: string;
    onPhaseUpdate?: (
      phase: DouyinHotTopicCandidatesPhase,
      extra?: {
        modelName?: string;
        detailText?: string;
      },
    ) => Promise<void> | void;
  }) {
    const settings = await this.loadDouyinHotTopicCandidatesGenerationSettings(params.brandId);
    const inputPayload = this.buildDouyinHotTopicCandidatesInput(
      params.archive,
      params.dailyHotspots,
      params.generatedAt,
    );
    await params.onPhaseUpdate?.("GENERATING");
    return this.generateDouyinHotTopicCandidatesByModel(settings.promptContent, inputPayload, settings, {
      onAttemptUpdate: async (detailText, modelName) => {
        await params.onPhaseUpdate?.("GENERATING", {
          detailText,
          modelName,
        });
      },
    });
  }

  private async buildXiaohongshuMarketingCalendar(params: {
    brandId: string;
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>;
    collection: Awaited<ReturnType<CollectorsService["getXiaohongshuWorkspace"]>>;
    dailyHotspots: Awaited<ReturnType<CollectorsService["getDailyHotspotWorkspace"]>>;
    sourceReport: GrowthReportRecord;
    annualPlan: AnnualMarketingPlanRecord;
    marketingPlan: XiaohongshuMarketingPlanRecord;
    previousCalendars: XiaohongshuMarketingCalendarRecord[];
    generatedAt: string;
    onPhaseUpdate?: (
      phase: XiaohongshuMarketingCalendarPhase,
      extra?: {
        modelName?: string;
        detailText?: string;
      },
    ) => Promise<void> | void;
  }) {
    const settings = await this.loadXiaohongshuMarketingCalendarGenerationSettings(params.brandId);
    const inputPayload = this.buildXiaohongshuMarketingCalendarInput(
      params.archive,
      params.collection,
      params.dailyHotspots,
      params.sourceReport,
      params.annualPlan,
      params.marketingPlan,
      params.previousCalendars,
      params.generatedAt,
    );
    await params.onPhaseUpdate?.("GENERATING");
    return this.generateXiaohongshuMarketingCalendarByModel(settings.promptContent, inputPayload, settings, {
      onAttemptUpdate: async (detailText, modelName) => {
        await params.onPhaseUpdate?.("GENERATING", {
          detailText,
          modelName,
        });
      },
    });
  }

  private async generateReportByModel(
    brandId: string,
    skillPrompt: string,
    inputPayload: Record<string, unknown>,
  ): Promise<GrowthReportModelResult> {
    const settings = await this.loadGrowthReportGenerationSettings(brandId);
    const providers = await this.loadGrowthReportProviderConfigs(settings);
    const preferredModelName = settings.preferredModelName || this.parseDelimitedModels(settings.modelName)[0] || "";
    const systemPrompt = [
      skillPrompt,
      "",
      "你现在负责输出《品牌增长报告》。",
      "你必须严格基于输入资料生成，不得编造不存在的数据。",
      "如果经营数据不足，必须在报告中明确标注“待补充”或“待验证”。",
      "请仅输出一个 JSON 对象，不要输出 Markdown 代码块，也不要输出额外解释。",
      "JSON 结构固定为：",
      "{",
      '  "title": "品牌增长报告标题",',
      '  "summary": "150字以内摘要",',
      '  "diagnosis": ["3-6条核心诊断"],',
      '  "opportunities": ["3-6条增长机会"],',
      '  "nextActions": ["3-6条下一步动作"],',
      '  "reportMarkdown": "完整的品牌增长报告 Markdown 正文"',
      "}",
    ].join("\n");
    const userPrompt = [
      "以下是本次生成品牌增长报告的输入数据，请围绕这些数据输出完整报告。",
      "",
      JSON.stringify(inputPayload, null, 2),
    ].join("\n");

    let lastError = "";
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls.slice(0, 2)) {
        for (const apiKey of provider.apiKeys.slice(0, 2)) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildReportAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildGrowthReportProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );

              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 接口请求失败: ${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }

              const payload = await response.json() as {
                choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
              };
              const content = this.extractVisualResponseContent(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }

              return this.normalizeModelResult(content);
            } catch (error) {
              lastError = error instanceof Error ? `${provider.provider}/${modelName} 调用失败: ${error.message}` : `${provider.provider}/${modelName} 调用失败`;
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }

    const detail = attemptTrail.length
      ? `；实际尝试顺序：${this.formatReportAttemptTrail(attemptTrail)}`
      : "";
    const preferredDetail = preferredModelName ? `首选模型：${preferredModelName}；` : "";
    throw new ServiceUnavailableException(`品牌增长报告生成失败：${preferredDetail}最后失败：${lastError || "未获取到有效响应"}${detail}`);
  }

  private async generateVisualReportByModel(
    skillPrompt: string,
    inputPayload: Record<string, unknown>,
    settings: ModelGenerationSettings,
  ): Promise<VisualReportOutlineModelResult> {
    const providers = await this.loadDomesticVisualProviderConfigs(settings);
    const preferredModelName = settings.preferredModelName || this.parseDelimitedModels(settings.modelName)[0] || "";
    const systemPrompt = [
      skillPrompt,
      "",
      "你现在负责输出《品牌增长可视化报告》。",
      "输入是一份已经生成完成的《品牌增长报告》。",
      "请将其转为完整但精炼的《品牌增长可视化内容大纲》。",
      "不要直接输出 HTML，由系统根据你的结构化结果渲染成 HTML。",
      "必须保留核心信息结构，并完整覆盖核心结论、关键诊断、增长机会、行动建议与关键数据关系。",
      "请仅输出一个 JSON 对象，不要输出 Markdown 代码块，也不要输出额外解释。",
      "JSON 结构固定为：",
      "{",
      '  "title": "品牌增长可视化报告标题",',
      '  "summary": "150字以内摘要",',
      '  "eyebrow": "头部标签文案，建议 6-16 字",',
      '  "heroTitle": "头图主标题",',
      '  "heroSubtitle": "头图副标题，1-2句",',
      '  "metrics": [',
      '    { "label": "指标名称", "value": "指标值", "note": "一句解释" }',
      "  ],",
      '  "sections": [',
      '    { "title": "章节标题", "body": "1段正文概述", "bullets": ["2-4条要点"] }',
      "  ],",
      '  "actionTitle": "行动建议区标题",',
      '  "actionItems": ["3-6条行动建议"]',
      "}",
      "metrics 保留 3-4 项即可，sections 保留 4-6 个核心章节即可，避免冗长重复。",
    ].join("\n");
    const userPrompt = [
      "以下是本次生成品牌增长可视化报告的输入数据，请围绕这些数据输出完整结构。",
      "",
      JSON.stringify(inputPayload),
    ].join("\n");

    let lastError = "";
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildReportAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildVisualProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );

              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 接口请求失败: ${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }

              const payload = await response.json() as {
                choices?: Array<{
                  finish_reason?: string;
                  message?: { content?: string; reasoning_content?: string };
                }>;
              };
              const content = this.extractVisualResponseContent(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const finishReason = String(payload.choices?.[0]?.finish_reason ?? "").trim().toLowerCase();
              if (finishReason === "length") {
                lastError = `${provider.provider}/${modelName} 输出被截断`;
                attemptTrail.push(`${attemptLabel} -> 输出被截断`);
                continue;
              }

              return this.normalizeVisualOutlineModelResult(content, inputPayload);
            } catch (error) {
              lastError = error instanceof Error ? `${provider.provider}/${modelName} 调用失败: ${error.message}` : `${provider.provider}/${modelName} 调用失败`;
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }

    throw new ServiceUnavailableException(
      this.buildReportAttemptFailureMessage("品牌增长可视化报告生成", preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateAnnualMarketingPlanByModel(
    skillPrompt: string,
    inputPayload: Record<string, unknown>,
    settings: ModelGenerationSettings,
  ): Promise<AnnualMarketingPlanModelResult> {
    const providers = await this.loadAnnualMarketingProviderConfigs(settings);
    const preferredModelName = settings.preferredModelName || this.parseDelimitedModels(settings.modelName)[0] || "";
    const planningWindow = this.buildHalfYearPlanningWindow(String(inputPayload.generatedAt ?? ""));
    const systemPrompt = [
      skillPrompt,
      "",
      `请输出完整的半年营销规划，规划周期必须严格限定在 ${planningWindow.label}。`,
      "只输出一个 JSON 对象，不要输出代码块。",
      "JSON 必须包含：title、planningYear、planningFocus、summary、items。",
      `planningYear 字段填写 "${planningWindow.label}"，不要写全年。`,
      `items 至少 12 条，每条包含 month、node、date、type、marketingTheme、platforms、strategy、products，且月份只能来自：${planningWindow.monthLabels.join("、")}。`,
    ].join("\n");
    const userPrompt = ["以下是输入数据：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildReportAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildAnnualMarketingProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 接口请求失败: ${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>; };
              const content = this.extractVisualResponseContent(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const finishReason = String(payload.choices?.[0]?.finish_reason ?? "").trim().toLowerCase();
              if (finishReason === "length") {
                lastError = `${provider.provider}/${modelName} 输出被截断`;
                attemptTrail.push(`${attemptLabel} -> 输出被截断`);
                continue;
              }
              return this.normalizeAnnualMarketingPlanModelResult(content, inputPayload, modelName);
            } catch (error) {
              lastError = error instanceof Error ? `${provider.provider}/${modelName} 调用失败: ${error.message}` : `${provider.provider}/${modelName} 调用失败`;
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }
    throw new ServiceUnavailableException(
      this.buildReportAttemptFailureMessage("半年营销规划生成", preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateXiaohongshuMarketingPlanByModel(
    skillPrompt: string,
    inputPayload: Record<string, unknown>,
    settings: ModelGenerationSettings,
  ): Promise<XiaohongshuMarketingPlanModelResult> {
    const providers = await this.loadXiaohongshuMarketingProviderConfigs(settings);
    const preferredModelName = settings.preferredModelName || this.parseDelimitedModels(settings.modelName)[0] || "";
    const systemPrompt = [
      skillPrompt,
      "",
      "请输出完整的小红书营销策划方案。",
      "只输出 Markdown 正文，不要输出 JSON，不要输出代码块。",
      "内容需要覆盖策略判断、产品节奏、内容矩阵、资源组合、合规提醒和风险边界。",
    ].join("\n");
    const userPrompt = ["以下是输入数据：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys.slice(0, 2)) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildReportAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildXiaohongshuMarketingProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 接口请求失败: ${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>; };
              const content = this.extractVisualResponseContent(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const finishReason = String(payload.choices?.[0]?.finish_reason ?? "").trim().toLowerCase();
              if (finishReason === "length") {
                lastError = `${provider.provider}/${modelName} 输出被截断`;
                attemptTrail.push(`${attemptLabel} -> 输出被截断`);
                continue;
              }
              return this.normalizeXiaohongshuMarketingPlanModelResult(content, inputPayload, modelName);
            } catch (error) {
              lastError = error instanceof Error ? `${provider.provider}/${modelName} 调用失败: ${error.message}` : `${provider.provider}/${modelName} 调用失败`;
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }
    throw new ServiceUnavailableException(
      this.buildReportAttemptFailureMessage("小红书营销策划方案生成", preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateXiaohongshuMarketingPlanSectionByModel(
    systemPrompt: string,
    userPrompt: string,
    settings: ModelGenerationSettings,
    options: {
      requiredHeadings: string[];
      onAttemptUpdate?: (detailText: string) => Promise<void>;
    },
  ): Promise<XiaohongshuMarketingPlanSectionResult> {
    const providers = await this.loadXiaohongshuMarketingProviderConfigs(settings);
    const preferredModelName = settings.preferredModelName || this.parseDelimitedModels(settings.modelName)[0] || "";
    let lastError = "";
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys.slice(0, 2)) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildReportAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              await options.onAttemptUpdate?.(`${provider.provider} / ${modelName}`);
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildXiaohongshuMarketingProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                lastError = `${provider.provider}/${modelName} 接口请求失败: ${response.status}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}`);
                continue;
              }
              const payload = await response.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>; };
              const content = this.extractVisualResponseContent(payload);
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const finishReason = String(payload.choices?.[0]?.finish_reason ?? "").trim().toLowerCase();
              if (finishReason === "length") {
                lastError = `${provider.provider}/${modelName} 输出被截断`;
                attemptTrail.push(`${attemptLabel} -> 输出被截断`);
                continue;
              }
              return {
                markdown: this.normalizeXiaohongshuMarketingPlanSectionMarkdown(content, options.requiredHeadings),
                modelName,
              };
            } catch (error) {
              lastError = error instanceof Error ? `${provider.provider}/${modelName} 调用失败: ${error.message}` : `${provider.provider}/${modelName} 调用失败`;
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }
    throw new ServiceUnavailableException(
      this.buildReportAttemptFailureMessage("小红书营销策划方案分段生成", preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateXiaohongshuMarketingCalendarByModel(
    skillPrompt: string,
    inputPayload: Record<string, unknown>,
    settings: ModelGenerationSettings,
    options?: {
      onAttemptUpdate?: (detailText: string, modelName: string) => Promise<void> | void;
    },
  ): Promise<XiaohongshuMarketingCalendarModelResult> {
    const providers = await this.loadXiaohongshuMarketingCalendarProviderConfigs(settings);
    const preferredModelName = settings.preferredModelName || this.parseDelimitedModels(settings.modelName)[0] || "";
    const startDate = String(inputPayload.startDate ?? "").trim();
    const expectedDates = this.normalizeStringArray(
      inputPayload.expectedDates,
      this.buildExpectedCalendarDates(startDate, Number(inputPayload.days ?? 7)),
      7,
    ).filter(Boolean);
    const systemPrompt = [
      skillPrompt,
      "",
      "请输出未来 7 天的营销日历。",
      "输入包含营销策划方案、半年规划、素材库、每日热点和历史记录。",
      "从 startDate 开始连续输出 7 天，不要遗漏日期，不要与历史日期重复。",
      expectedDates.length
        ? `必须严格覆盖这 7 个日期，且顺序保持一致：${expectedDates.join("、")}`
        : "必须严格覆盖从 startDate 开始的连续 7 个日期，且顺序保持一致。",
      "items 中每一项都必须尽量完整填写字段，除 productName 可按需留空外，其余字段默认都要返回非空内容。",
      "items 中每一项都必须包含非空的 date、topicName、noteType、targetAudience、contentGoal、expressionFocus、topicContent、bodyStructure、coverFormat、imageBrief。",
      "items 中每一项都必须包含 noteKeywords、titleDirections、coverKeywords 三个数组；noteKeywords 至少 3 个，titleDirections 建议 2-3 个，coverKeywords 至少 3 个。",
      "不允许合并日期、不允许跳过日期、不允许返回少于 7 条，也不允许输出历史日期。",
      "只输出 JSON 对象，不要输出 Markdown 或代码块。",
      "JSON 必须包含 title、summary、items；items 必须正好 7 条。",
      "items 的 date 必须只从 expectedDates 中选取，每个日期只能出现一次。",
      "JSON 项字段固定为：date、topicName、productName、noteType、targetAudience、contentGoal、expressionFocus、topicContent、noteKeywords、titleDirections、bodyStructure、coverFormat、coverKeywords、imageBrief。",
      "topicName 要像真实日历主题，简洁但有传播感；topicContent、bodyStructure、imageBrief 要写成可直接交给创作执行的完整说明，不要只写短句。",
    ].join("\n");
    const userPrompt = ["以下是输入数据：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys.slice(0, 2)) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildReportAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              await options?.onAttemptUpdate?.(`${provider.provider} / ${modelName}`, modelName);
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildXiaohongshuMarketingProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                const responseText = this.truncateText(await response.text(), 240);
                const responseDetail = responseText ? ` ${responseText}` : "";
                lastError = `${provider.provider}/${modelName} 请求失败: ${response.status}${responseDetail}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}${responseText ? ` ${responseText}` : ""}`);
                continue;
              }
              const payload = await response.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>; };
              const message = payload.choices?.[0]?.message;
              const content = message?.content?.trim() || message?.reasoning_content?.trim();
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const finishReason = String(payload.choices?.[0]?.finish_reason ?? "").trim().toLowerCase();
              if (finishReason === "length") {
                lastError = `${provider.provider}/${modelName} 输出被截断`;
                attemptTrail.push(`${attemptLabel} -> 输出被截断`);
                continue;
              }
              return this.normalizeXiaohongshuMarketingCalendarModelResult(content, inputPayload, modelName);
            } catch (error) {
              lastError = error instanceof Error ? `${provider.provider}/${modelName} 调用失败: ${error.message}` : `${provider.provider}/${modelName} 调用失败`;
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }
    throw new ServiceUnavailableException(
      this.buildReportAttemptFailureMessage("营销日历生成", preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateDouyinMarketingPlanByModel(
    skillPrompt: string,
    inputPayload: Record<string, unknown>,
    settings: ModelGenerationSettings,
    options?: {
      onAttemptUpdate?: (detailText: string, modelName: string) => Promise<void> | void;
    },
  ): Promise<DouyinMarketingPlanModelResult> {
    const providers = await this.loadDouyinMarketingProviderConfigs(settings);
    const preferredModelName = settings.preferredModelName || this.parseDelimitedModels(settings.modelName)[0] || "";
    const systemPrompt = [
      skillPrompt,
      "",
      "请输出完整的《抖音营销策划方案》。",
      "输入已包含品牌增长报告、半年营销规划、抖音采集数据（品牌账号、竞品账号、品牌作品、对标作品）。",
      "只输出 Markdown 正文，不要输出 JSON，不要输出代码块，不要输出执行说明。",
      "内容至少覆盖平台现状判断、账号矩阵策略、内容方向规划、作品打法拆解、投流与转化建议、组织协同与风险提醒。",
      "如果某些数据不足，必须明确写出“待补充/待验证”，不要编造。",
    ].join("\n");
    const userPrompt = ["以下是输入数据：", "", JSON.stringify(inputPayload, null, 2)].join("\n");

    let lastError = "";
    const attemptTrail: string[] = [];
    for (const provider of providers) {
      for (const baseUrl of provider.baseUrls) {
        for (const apiKey of provider.apiKeys.slice(0, 2)) {
          for (const modelName of provider.models) {
            const attemptLabel = this.buildReportAttemptLabel(provider.provider, modelName, baseUrl);
            try {
              await options?.onAttemptUpdate?.(`${provider.provider} / ${modelName}`, modelName);
              const response = await this.requestModelCompletion(
                baseUrl,
                provider.completionPath,
                apiKey,
                this.buildXiaohongshuMarketingProviderPayload(provider, modelName, systemPrompt, userPrompt),
                this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
              );
              if (!response.ok) {
                const responseText = this.truncateText(await response.text(), 240);
                const responseDetail = responseText ? ` ${responseText}` : "";
                lastError = `${provider.provider}/${modelName} 请求失败: ${response.status}${responseDetail}`;
                attemptTrail.push(`${attemptLabel} -> HTTP ${response.status}${responseText ? ` ${responseText}` : ""}`);
                continue;
              }
              const payload = await response.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>; };
              const message = payload.choices?.[0]?.message;
              const content = message?.content?.trim() || message?.reasoning_content?.trim();
              if (!content) {
                lastError = `${provider.provider}/${modelName} 返回为空`;
                attemptTrail.push(`${attemptLabel} -> 返回为空`);
                continue;
              }
              const finishReason = String(payload.choices?.[0]?.finish_reason ?? "").trim().toLowerCase();
              if (finishReason === "length") {
                lastError = `${provider.provider}/${modelName} 输出被截断`;
                attemptTrail.push(`${attemptLabel} -> 输出被截断`);
                continue;
              }
              return this.normalizeDouyinMarketingPlanModelResult(content, inputPayload, modelName);
            } catch (error) {
              lastError = error instanceof Error ? `${provider.provider}/${modelName} 调用失败: ${error.message}` : `${provider.provider}/${modelName} 调用失败`;
              attemptTrail.push(`${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
            }
          }
        }
      }
    }
    throw new ServiceUnavailableException(
      this.buildReportAttemptFailureMessage("抖音营销策划方案生成", preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
    );
  }

  private async generateDouyinHotTopicCandidatesByModel(
    skillPrompt: string,
    inputPayload: Record<string, unknown>,
    settings: ModelGenerationSettings,
    options?: {
      onAttemptUpdate?: (detailText: string, modelName: string) => Promise<void> | void;
    },
  ): Promise<DouyinHotTopicCandidatesModelResult> {
    const providers = await this.loadDouyinMarketingProviderConfigs(settings);
    const preferredModelName = settings.preferredModelName || this.parseDelimitedModels(settings.modelName)[0] || "";
    const selectedDate = this.readRecordString(this.readNestedRecord(inputPayload, ["inputScope", "dailyHotspots"]), "selectedDate") || "";
    const analysisSystemPrompt = skillPrompt;
    const analysisUserPrompt = [
      "以下是本次输入数据，请严格基于这些数据完成分析：",
      "",
      JSON.stringify(inputPayload, null, 2),
    ].join("\n");

    let lastError = "";
    const attemptTrail: string[] = [];
    const runPrompt = async (systemPrompt: string, userPrompt: string, stageLabel: string) => {
      for (const provider of providers) {
        for (const baseUrl of provider.baseUrls) {
          for (const apiKey of provider.apiKeys.slice(0, 2)) {
            for (const modelName of provider.models) {
              const attemptLabel = this.buildReportAttemptLabel(provider.provider, modelName, baseUrl);
              try {
                await options?.onAttemptUpdate?.(`${stageLabel}: ${provider.provider} / ${modelName}`, modelName);
                const response = await this.requestModelCompletion(
                  baseUrl,
                  provider.completionPath,
                  apiKey,
                  this.buildXiaohongshuMarketingProviderPayload(provider, modelName, systemPrompt, userPrompt),
                  this.resolveModelAttemptTimeoutMs(provider.requestTimeoutMs, TEXT_MODEL_ATTEMPT_TIMEOUT_MS),
                );
                if (!response.ok) {
                  const responseText = this.truncateText(await response.text(), 240);
                  const responseDetail = responseText ? ` ${responseText}` : "";
                  lastError = `${provider.provider}/${modelName} 请求失败: ${response.status}${responseDetail}`;
                  attemptTrail.push(`${stageLabel} / ${attemptLabel} -> HTTP ${response.status}${responseText ? ` ${responseText}` : ""}`);
                  continue;
                }
                const payload = await response.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string; reasoning_content?: string } }>; };
                const message = payload.choices?.[0]?.message;
                const content = message?.content?.trim() || message?.reasoning_content?.trim();
                if (!content) {
                  lastError = `${provider.provider}/${modelName} 返回为空`;
                  attemptTrail.push(`${stageLabel} / ${attemptLabel} -> 返回为空`);
                  continue;
                }
                const finishReason = String(payload.choices?.[0]?.finish_reason ?? "").trim().toLowerCase();
                if (finishReason === "length") {
                  lastError = `${provider.provider}/${modelName} 输出被截断`;
                  attemptTrail.push(`${stageLabel} / ${attemptLabel} -> 输出被截断`);
                  continue;
                }
                return { content, modelName };
              } catch (error) {
                lastError = error instanceof Error ? `${provider.provider}/${modelName} 调用失败: ${error.message}` : `${provider.provider}/${modelName} 调用失败`;
                attemptTrail.push(`${stageLabel} / ${attemptLabel} -> ${error instanceof Error ? error.message : "调用失败"}`);
              }
            }
          }
        }
      }
      return undefined;
    };

    const analysisResult = await runPrompt(analysisSystemPrompt, analysisUserPrompt, "分析报告生成");
    if (!analysisResult) {
      throw new ServiceUnavailableException(
        this.buildReportAttemptFailureMessage("抖音热点找选题生成", preferredModelName, lastError, attemptTrail, "未获取到有效响应"),
      );
    }

    const extractionSystemPrompt = [
      "你将收到一份已经生成好的热点分析报告。",
      "你的任务不是重写报告，而是仅从报告中提取最终可展示的 3 个抖音内容选题。",
      "请只输出一个 JSON 对象，不要输出 Markdown、代码块或额外解释。",
      "JSON 结构固定为：",
      "{",
      '  "title": "标题",',
      '  "summary": "不超过80字的摘要",',
      '  "items": [',
      '    { "title": "选题1" },',
      '    { "title": "选题2" },',
      '    { "title": "选题3" }',
      "  ]",
      "}",
      "items 必须正好返回 3 条。",
      "items[].title 必须是适合直接展示和勾选的内容选题标题，不得直接照抄热点名称、人物名、事件名，也不要只输出一个热点词。",
      "如果报告里没有显式标题，请基于每个热点选题的分析结论提炼成最终内容选题标题。",
      selectedDate ? `这 3 个选题都必须围绕 ${selectedDate} 当天热点展开。` : "这 3 个选题都必须围绕所选日期当天热点展开。",
    ].join("\n");
    const extractionUserPrompt = [
      "以下是原始分析报告，请从中提取页面展示用的 3 个最终选题：",
      "",
      analysisResult.content,
    ].join("\n");
    const extractionResult = await runPrompt(extractionSystemPrompt, extractionUserPrompt, "页面选题提取");

    if (extractionResult) {
      return {
        ...this.normalizeDouyinHotTopicCandidatesModelResult(extractionResult.content, inputPayload, analysisResult.modelName),
        reportContent: analysisResult.content,
      };
    }

    const fallbackResult = this.normalizeDouyinHotTopicCandidatesModelResult(analysisResult.content, inputPayload, analysisResult.modelName);
    return {
      ...fallbackResult,
      reportContent: analysisResult.content,
    };
  }

  private buildDouyinHotTopicCandidatesPhaseStatus(
    phase: DouyinHotTopicCandidatesPhase,
    extra?: {
      modelName?: string;
      detailText?: string;
    },
  ) {
    const basePhaseTextMap: Record<DouyinHotTopicCandidatesPhase, string> = {
      PREPARING: "正在准备热点与品牌背景输入数据",
      GENERATING: "正在生成 3 个热点选题",
      PERSISTING: "正在保存热点找选题结果",
      DONE: "热点找选题已生成完成",
    };
    const phaseIndexMap: Record<DouyinHotTopicCandidatesPhase, number> = {
      PREPARING: 1,
      GENERATING: 2,
      PERSISTING: 3,
      DONE: 4,
    };

    return {
      phase,
      phaseText: extra?.detailText ? `${basePhaseTextMap[phase]}（当前尝试：${extra.detailText}）` : basePhaseTextMap[phase],
      phaseIndex: phaseIndexMap[phase],
      phaseTotal: 4,
      ...(extra?.modelName ? { modelName: extra.modelName } : {}),
    };
  }

  private buildXiaohongshuMarketingCalendarPhaseStatus(
    phase: XiaohongshuMarketingCalendarPhase,
    extra?: {
      modelName?: string;
      detailText?: string;
    },
  ) {
    const basePhaseTextMap: Record<XiaohongshuMarketingCalendarPhase, string> = {
      PREPARING: "正在准备营销日历输入数据",
      GENERATING: "正在生成 7 天营销日历",
      PERSISTING: "正在保存营销日历结果",
      DONE: "营销日历已生成完成",
    };
    const phaseIndexMap: Record<XiaohongshuMarketingCalendarPhase, number> = {
      PREPARING: 1,
      GENERATING: 2,
      PERSISTING: 3,
      DONE: 4,
    };

    return {
      phase,
      phaseText: extra?.detailText ? `${basePhaseTextMap[phase]}（当前尝试：${extra.detailText}）` : basePhaseTextMap[phase],
      phaseIndex: phaseIndexMap[phase],
      phaseTotal: 4,
      ...(extra?.modelName ? { modelName: extra.modelName } : {}),
    };
  }

  private buildXiaohongshuPhaseStatus(
    phase: XiaohongshuMarketingPlanPhase,
    extra?: {
      modelName?: string;
      detailText?: string;
    },
  ) {
    const basePhaseTextMap: Record<XiaohongshuMarketingPlanPhase, string> = {
      PREPARING: "正在准备输入数据",
      PART_ONE: "第 1 段生成中：基础诊断与定策略",
      PART_TWO: "第 2 段生成中：产品节奏",
      PART_THREE: "第 3 段生成中：内容矩阵",
      PART_FOUR: "第 4 段生成中：资源组合",
      PART_FIVE: "第 5 段生成中：风险边界",
      MERGING: "正在拼接完整 Markdown",
      PERSISTING: "正在保存生成结果",
      DONE: "已生成完成",
    };
    const phaseIndexMap: Record<XiaohongshuMarketingPlanPhase, number> = {
      PREPARING: 1,
      PART_ONE: 2,
      PART_TWO: 3,
      PART_THREE: 4,
      PART_FOUR: 5,
      PART_FIVE: 6,
      MERGING: 7,
      PERSISTING: 8,
      DONE: 9,
    };

    return {
      phase,
      phaseText: extra?.detailText ? `${basePhaseTextMap[phase]}（当前尝试：${extra.detailText}）` : basePhaseTextMap[phase],
      phaseIndex: phaseIndexMap[phase],
      phaseTotal: 9,
      ...(extra?.modelName ? { modelName: extra.modelName } : {}),
    };
  }

  private buildDouyinMarketingPlanPhaseStatus(
    phase: DouyinMarketingPlanPhase,
    extra?: {
      modelName?: string;
      detailText?: string;
    },
  ) {
    const basePhaseTextMap: Record<DouyinMarketingPlanPhase, string> = {
      PREPARING: "正在准备抖音营销策划输入数据",
      GENERATING: "正在生成抖音营销策划方案",
      PERSISTING: "正在保存抖音营销策划方案",
      DONE: "抖音营销策划方案已生成完成",
    };
    const phaseIndexMap: Record<DouyinMarketingPlanPhase, number> = {
      PREPARING: 1,
      GENERATING: 2,
      PERSISTING: 3,
      DONE: 4,
    };

    return {
      phase,
      phaseText: extra?.detailText ? `${basePhaseTextMap[phase]}（当前尝试：${extra.detailText}）` : basePhaseTextMap[phase],
      phaseIndex: phaseIndexMap[phase],
      phaseTotal: 4,
      ...(extra?.modelName ? { modelName: extra.modelName } : {}),
    };
  }

  private normalizeDouyinHotTopicCandidatesModelResult(
    content: string,
    inputPayload: Record<string, unknown>,
    modelName: string,
  ): DouyinHotTopicCandidatesModelResult {
    const archive = this.readNestedRecord(inputPayload, ["inputScope", "brandArchive"]);
    const brandBackground = this.readNestedRecord(archive, ["background"]);
    const dailyHotspots = this.readNestedRecord(inputPayload, ["inputScope", "dailyHotspots"]);
    const fallbackBrandName = this.readRecordString(brandBackground, "brandName") || "品牌";
    const selectedDate = this.readRecordString(dailyHotspots, "selectedDate") || "";

    let parsed: Record<string, unknown> | undefined;
    try {
      parsed = JSON.parse(this.extractJsonObject(content)) as Record<string, unknown>;
    } catch {
      parsed = undefined;
    }

    const rawItems = Array.isArray(parsed?.items) ? parsed?.items : undefined;
    const normalizedItems = rawItems?.length
      ? this.normalizeDouyinHotTopicCandidateItems(rawItems)
      : this.parseDouyinHotTopicCandidateItemsFromText(content);

    if (normalizedItems.length < 3) {
      throw new ServiceUnavailableException("抖音热点找选题解析失败：有效选题不足 3 条");
    }

    return {
      title: String(parsed?.title ?? "").trim() || `${fallbackBrandName}热点找选题`,
      summary: String(parsed?.summary ?? "").trim() || `${selectedDate || "所选日期"}已生成 3 个抖音热点选题。`,
      selectedDate,
      items: normalizedItems.slice(0, 3),
      modelName,
    };
  }

  private normalizeVisualOutlineModelResult(
    content: string,
    inputPayload: Record<string, unknown>,
  ): VisualReportOutlineModelResult {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(this.extractJsonObject(this.stripMarkdownCodeFence(content))) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException("品牌增长可视化报告解析失败：模型未返回有效 JSON");
    }

    const report = this.readNestedRecord(inputPayload, ["inputScope", "growthReport"]);
    const fallbackTitle = this.readRecordString(report, "title") || "品牌增长可视化报告";
    const fallbackSummary = this.readRecordString(report, "summary") || "已生成品牌增长可视化报告。";
    const diagnosis = this.readRecordStringArray(report, "diagnosis");
    const opportunities = this.readRecordStringArray(report, "opportunities");
    const nextActions = this.readRecordStringArray(report, "nextActions");
    const metricRecord = this.readNestedRecord(report, ["metrics"]);
    const fallbackMetrics = [
      { label: "产品数量", value: this.readRecordNumber(metricRecord, "productCount"), note: "品牌资料库已沉淀的产品数" },
      { label: "品牌账号", value: this.readRecordNumber(metricRecord, "platformAccountCount"), note: "已同步的品牌账号数" },
      { label: "竞品账号", value: this.readRecordNumber(metricRecord, "competitorAccountCount"), note: "已同步的竞品账号数" },
      { label: "笔记样本", value: (this.readRecordNumber(metricRecord, "brandNoteCount") || 0) + (this.readRecordNumber(metricRecord, "benchmarkNoteCount") || 0), note: "品牌与对标作品样本总量" },
    ]
      .filter((item) => item.value !== undefined && item.value !== null)
      .map((item) => ({
        label: item.label,
        value: String(item.value),
        note: item.note,
      }));

    const metrics = this.normalizeVisualMetricItems(parsed.metrics, fallbackMetrics);
    const fallbackSections: VisualReportSectionItem[] = [
      {
        title: "核心诊断",
        body: fallbackSummary,
        bullets: diagnosis.slice(0, 4),
      },
      {
        title: "增长机会",
        body: "结合报告中的增长空间，提炼优先突破方向。",
        bullets: opportunities.slice(0, 4),
      },
    ].filter((item) => item.bullets.length || item.body);
    const sections = this.normalizeVisualSectionItems(parsed.sections, fallbackSections);
    const actionItems = this.normalizeStringArray(parsed.actionItems, nextActions.slice(0, 5), 6);

    return {
      title: String(parsed.title ?? "").trim() || fallbackTitle,
      summary: String(parsed.summary ?? "").trim() || fallbackSummary,
      eyebrow: String(parsed.eyebrow ?? "").trim() || "品牌增长可视化",
      heroTitle: String(parsed.heroTitle ?? "").trim() || fallbackTitle,
      heroSubtitle: String(parsed.heroSubtitle ?? "").trim() || fallbackSummary,
      metrics,
      sections,
      actionTitle: String(parsed.actionTitle ?? "").trim() || "下一步行动建议",
      actionItems: actionItems.length ? actionItems : ["结合本报告结论继续补齐数据并推进执行。"],
    };
  }

  private normalizeAnnualMarketingPlanModelResult(
    content: string,
    inputPayload: Record<string, unknown>,
    modelName: string,
  ): AnnualMarketingPlanModelResult {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(this.extractJsonObject(this.stripMarkdownCodeFence(content))) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException("半年营销规划解析失败：模型未返回有效 JSON");
    }

    const archive = this.readNestedRecord(inputPayload, ["inputScope", "brandArchive"]);
    const brandBackground = this.readNestedRecord(archive, ["background"]);
    const sourceReport = this.readNestedRecord(inputPayload, ["inputScope", "growthReport"]);
    const fallbackBrandName = this.readRecordString(brandBackground, "brandName") || "品牌";
    const fallbackSummary = this.readRecordString(sourceReport, "summary") || "已生成未来半年营销规划。";
    const generatedAt = String(inputPayload.generatedAt ?? "").trim();
    const planningWindow = this.buildHalfYearPlanningWindow(generatedAt);
    const fallbackYear = planningWindow.label;
    const fallbackFocus = [
      "围绕未来半年重点节日与节气建立清晰营销节奏。",
      "打通小红书、抖音、视频号、私域与线下门店的联动动作。",
      "围绕核心产品形成未来半年主题活动与节点承接。",
    ];

    const items = this.normalizeAnnualMarketingPlanRows(parsed.items);
    if (items.length < 12) {
      throw new ServiceUnavailableException("半年营销规划解析失败：有效规划条目不足 12 条");
    }

    return {
      title: String(parsed.title ?? "").trim() || `${fallbackBrandName}${fallbackYear}营销规划`,
      summary: String(parsed.summary ?? "").trim() || fallbackSummary,
      planningYear: String(parsed.planningYear ?? "").trim() || fallbackYear,
      planningFocus: this.normalizeStringArray(parsed.planningFocus, fallbackFocus, 6),
      items,
      modelName,
    };
  }

  private normalizeXiaohongshuMarketingPlanModelResult(
    content: string,
    inputPayload: Record<string, unknown>,
    modelName: string,
  ): XiaohongshuMarketingPlanModelResult {
    const archive = this.readNestedRecord(inputPayload, ["inputScope", "brandArchive"]);
    const brandBackground = this.readNestedRecord(archive, ["background"]);
    const fallbackBrandName = this.readRecordString(brandBackground, "brandName") || "品牌";
    const normalizedMarkdown = this.stripMarkdownCodeFence(content).trim();

    if (!normalizedMarkdown) {
      throw new ServiceUnavailableException("小红书营销策划方案解析失败：模型未返回有效 Markdown");
    }

    if (this.containsXiaohongshuWorkflowArtifacts(normalizedMarkdown)) {
      throw new ServiceUnavailableException("小红书营销策划方案解析失败：模型输出了工作流/文件操作内容，而不是最终 Markdown 正文");
    }

    const reportMarkdown = normalizedMarkdown.startsWith("# ")
      ? normalizedMarkdown
      : `# 小红书品牌营销规划方案

${normalizedMarkdown}`;

    if (!this.isCompleteXiaohongshuMarketingMarkdown(reportMarkdown)) {
      throw new ServiceUnavailableException("小红书营销策划方案解析失败：正文结构不完整，疑似被截断");
    }
    const title = this.extractMarkdownTitle(reportMarkdown) || `${fallbackBrandName}小红书营销策划方案`;
    const summary = this.extractMarkdownSummary(reportMarkdown) || `${fallbackBrandName}的小红书营销策划方案已生成。`;

    return {
      title,
      summary,
      reportMarkdown,
      modelName,
    };
  }

  private normalizeDouyinMarketingPlanModelResult(
    content: string,
    inputPayload: Record<string, unknown>,
    modelName: string,
  ): DouyinMarketingPlanModelResult {
    const archive = this.readNestedRecord(inputPayload, ["inputScope", "brandArchive"]);
    const brandBackground = this.readNestedRecord(archive, ["background"]);
    const fallbackBrandName = this.readRecordString(brandBackground, "brandName") || "品牌";
    const normalizedMarkdown = this.normalizeDouyinMarketingPlanMarkdown(content);

    if (!normalizedMarkdown) {
      throw new ServiceUnavailableException("抖音营销策划方案解析失败：模型未返回有效 Markdown");
    }

    if (this.containsXiaohongshuWorkflowArtifacts(normalizedMarkdown)) {
      throw new ServiceUnavailableException("抖音营销策划方案解析失败：模型输出了工作流/文件操作内容，而不是最终 Markdown 正文");
    }

    const reportMarkdown = normalizedMarkdown.startsWith("# ")
      ? normalizedMarkdown
      : `# 抖音营销策划方案\n\n${normalizedMarkdown}`;

    if (!this.isCompleteDouyinMarketingMarkdown(reportMarkdown)) {
      throw new ServiceUnavailableException("抖音营销策划方案解析失败：正文结构不完整，疑似被截断");
    }
    const title = this.extractMarkdownTitle(reportMarkdown) || `${fallbackBrandName}抖音营销策划方案`;
    const summary = this.extractMarkdownSummary(reportMarkdown) || `${fallbackBrandName}的抖音营销策划方案已生成。`;

    return {
      title,
      summary,
      reportMarkdown,
      modelName,
    };
  }

  private normalizeDouyinMarketingPlanMarkdown(content: string) {
    let normalizedMarkdown = this.stripMarkdownCodeFence(content).trim();
    if (!normalizedMarkdown) {
      return normalizedMarkdown;
    }

    const firstHeadingMatch = normalizedMarkdown.match(/^#\s+.+$/m);
    if (firstHeadingMatch?.index && firstHeadingMatch.index > 0) {
      const prefix = normalizedMarkdown.slice(0, firstHeadingMatch.index).trim();
      const prefixHasHeading = /^#{1,6}\s+/m.test(prefix);
      if (!prefixHasHeading && prefix.length <= 240) {
        normalizedMarkdown = normalizedMarkdown.slice(firstHeadingMatch.index).trim();
      }
    }

    return normalizedMarkdown;
  }

  private normalizeXiaohongshuMarketingPlanSectionMarkdown(content: string, requiredHeadings: string[]) {
    const normalizedMarkdown = this.stripMarkdownCodeFence(content).trim();
    if (!normalizedMarkdown) {
      throw new ServiceUnavailableException("灏忕孩涔﹁惀閿€绛栧垝鏂规瑙ｆ瀽澶辫触锛氭ā鍨嬫湭杩斿洖鏈夋晥 Markdown");
    }
    if (this.containsXiaohongshuWorkflowArtifacts(normalizedMarkdown)) {
      throw new ServiceUnavailableException("灏忕孩涔﹁惀閿€绛栧垝鏂规瑙ｆ瀽澶辫触锛氭ā鍨嬭緭鍑轰簡鏂囦欢鎿嶄綔/缁啓姝ラ锛岃€屼笉鏄渶缁?Markdown 姝ｆ枃");
    }
    const lines = normalizedMarkdown.split(/\r?\n/);
    const missingHeadings = requiredHeadings.filter((item) => !lines.some((line) => this.matchesXiaohongshuHeading(line, item)));
    if (missingHeadings.length) {
      throw new ServiceUnavailableException(`小红书营销策划方案解析失败：缺少必要章节 ${missingHeadings.join("、")}`);
    }
    return normalizedMarkdown;
  }

  private mergeXiaohongshuMarketingPlanSections(
    firstPart: XiaohongshuMarketingPlanSectionResult,
    secondPart: XiaohongshuMarketingPlanSectionResult,
    thirdPart: XiaohongshuMarketingPlanSectionResult,
    fourthPart: XiaohongshuMarketingPlanSectionResult,
    fifthPart: XiaohongshuMarketingPlanSectionResult,
    inputPayload: Record<string, unknown>,
  ): XiaohongshuMarketingPlanModelResult {
    const archive = this.readNestedRecord(inputPayload, ["inputScope", "brandArchive"]);
    const brandBackground = this.readNestedRecord(archive, ["background"]);
    const fallbackBrandName = this.readRecordString(brandBackground, "brandName") || "品牌";
    const fallbackTitle = `${fallbackBrandName}小红书营销策划方案`;
    const firstMarkdown = this.ensureXiaohongshuMarkdownTitle(firstPart.markdown, fallbackTitle);
    const secondMarkdown = this.ensureXiaohongshuMarkdownTitle(secondPart.markdown, fallbackTitle);
    const thirdMarkdown = this.ensureXiaohongshuMarkdownTitle(thirdPart.markdown, fallbackTitle);
    const fourthMarkdown = this.ensureXiaohongshuMarkdownTitle(fourthPart.markdown, fallbackTitle);
    const fifthMarkdown = this.ensureXiaohongshuMarkdownTitle(fifthPart.markdown, fallbackTitle);
    const title =
      this.extractMarkdownTitle(firstMarkdown) ||
      this.extractMarkdownTitle(secondMarkdown) ||
      this.extractMarkdownTitle(thirdMarkdown) ||
      this.extractMarkdownTitle(fourthMarkdown) ||
      this.extractMarkdownTitle(fifthMarkdown) ||
      fallbackTitle;
    const prefix = this.extractMarkdownPrefixBeforeHeading(firstMarkdown, "## 一、");
    const sectionOne = this.extractMarkdownSection(firstMarkdown, "## 一、", ["## 二、", "## 三、", "## 四、", "## 五、"]);
    const sectionTwo = this.extractMarkdownSection(secondMarkdown, "## 二、", ["## 三、", "## 四、", "## 五、"]);
    const sectionThree = this.extractMarkdownSection(thirdMarkdown, "## 三、", ["## 四、", "## 五、"]);
    const sectionFour = this.extractMarkdownSection(fourthMarkdown, "## 四、", ["## 五、"]);
    const sectionFive = this.extractMarkdownSection(fifthMarkdown, "## 五、", []);

    const missingSections = [
      !sectionOne ? "## 一、" : "",
      !sectionTwo ? "## 二、" : "",
      !sectionThree ? "## 三、" : "",
      !sectionFour ? "## 四、" : "",
      !sectionFive ? "## 五、" : "",
    ].filter(Boolean);
    if (missingSections.length) {
      throw new ServiceUnavailableException(`小红书营销策划方案拼接失败：分段结果缺少必要章节 ${missingSections.join("、")}`);
    }

    const reportMarkdown = [
      `# ${title}`,
      prefix,
      sectionOne,
      sectionTwo,
      sectionThree,
      sectionFour,
      sectionFive,
    ]
      .filter(Boolean)
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!this.isCompleteXiaohongshuMarketingMarkdown(reportMarkdown)) {
      throw new ServiceUnavailableException("小红书营销策划方案拼接失败：最终正文结构不完整");
    }

    return {
      title,
      summary: this.extractMarkdownSummary(reportMarkdown) || `${fallbackBrandName}的小红书营销策划方案已生成。`,
      reportMarkdown,
      modelName: Array.from(
        new Set([
          firstPart.modelName,
          secondPart.modelName,
          thirdPart.modelName,
          fourthPart.modelName,
          fifthPart.modelName,
        ].filter(Boolean)),
      ).join(" + "),
    };
  }

  private normalizeModelResult(content: string): GrowthReportModelResult {
    const raw = this.extractJsonObject(content);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException("品牌增长报告解析失败：模型未返回有效 JSON");
    }

    const diagnosis = Array.isArray(parsed.diagnosis) ? parsed.diagnosis.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
    const opportunities = Array.isArray(parsed.opportunities) ? parsed.opportunities.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
    const nextActions = Array.isArray(parsed.nextActions) ? parsed.nextActions.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
    const reportMarkdown = String(parsed.reportMarkdown ?? "").trim();

    if (!reportMarkdown) {
      throw new ServiceUnavailableException("品牌增长报告解析失败：缺少完整报告正文");
    }

    return {
      title: String(parsed.title ?? "品牌增长报告").trim(),
      summary: String(parsed.summary ?? "").trim() || diagnosis[0] || "已生成品牌增长报告。",
      diagnosis: diagnosis.length ? diagnosis : ["已生成完整报告，请查看下方正文。"],
      opportunities: opportunities.length ? opportunities : ["已生成完整报告，请查看下方正文。"],
      nextActions: nextActions.length ? nextActions : ["继续查看完整报告并进入后续策略执行。"],
      reportMarkdown,
    };
  }

  private normalizeVisualModelResult(content: string): VisualReportModelResult {
    const normalizedContent = this.stripMarkdownCodeFence(content).trim();
    try {
      const raw = this.extractJsonObject(normalizedContent);
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      let htmlBody = String(parsed.htmlBody ?? "").trim();
      if (htmlBody.startsWith("{") && htmlBody.includes("\"htmlBody\"")) {
        try {
          const nested = JSON.parse(htmlBody) as Record<string, unknown>;
          htmlBody = String(nested.htmlBody ?? "").trim() || htmlBody;
          return {
            title: String(nested.title ?? parsed.title ?? "品牌增长可视化报告").trim(),
            summary: String(nested.summary ?? parsed.summary ?? "").trim() || "已生成品牌增长可视化报告。",
            htmlBody,
          };
        } catch {
          // Fall through and continue with current htmlBody.
        }
      }
      if (htmlBody) {
        this.assertCompleteVisualHtmlBody(htmlBody);
        return {
          title: String(parsed.title ?? "品牌增长可视化报告").trim(),
          summary: String(parsed.summary ?? "").trim() || "已生成品牌增长可视化报告。",
          htmlBody,
        };
      }
    } catch {
      const extractedHtmlBody = this.extractJsonStringField(normalizedContent, "htmlBody");
      if (extractedHtmlBody) {
        this.assertCompleteVisualHtmlBody(extractedHtmlBody);
        return {
          title: this.extractJsonStringField(normalizedContent, "title") || "品牌增长可视化报告",
          summary: this.extractJsonStringField(normalizedContent, "summary") || "已生成品牌增长可视化报告。",
          htmlBody: extractedHtmlBody,
        };
      }
    }

    const htmlBody = this.extractHtmlBodyContent(normalizedContent);
    if (!htmlBody) {
      throw new ServiceUnavailableException("品牌增长可视化报告解析失败：模型未返回有效 JSON 或 HTML");
    }
    this.assertCompleteVisualHtmlBody(htmlBody);

    return {
      title: "品牌增长可视化报告",
      summary: "已生成品牌增长可视化报告。",
      htmlBody,
    };
  }

  private renderVisualOutlineToResult(outline: VisualReportOutlineModelResult): VisualReportModelResult {
    const htmlBody = this.renderVisualOutlineToHtml(outline);
    this.assertCompleteVisualHtmlBody(htmlBody);
    return {
      title: outline.title,
      summary: outline.summary,
      htmlBody,
    };
  }

  private normalizeAnnualMarketingPlanRows(raw: unknown) {
    const items = Array.isArray(raw) ? raw : [];
    return items
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        month: String(item.month ?? "").trim(),
        node: String(item.node ?? "").trim(),
        date: String(item.date ?? "").trim(),
        type: String(item.type ?? "").trim(),
        marketingTheme: String(item.marketingTheme ?? "").trim(),
        platforms: this.normalizeStringArray(item.platforms, [], 6),
        strategy: String(item.strategy ?? "").trim(),
        products: this.normalizeStringArray(item.products, [], 6),
      }))
      .filter((item) =>
        item.month
        && item.node
        && item.date
        && item.type
        && item.marketingTheme
        && item.platforms.length
        && item.strategy,
      );
  }

  private buildGrowthAnalysisInput(
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>,
    collection: Awaited<ReturnType<CollectorsService["getXiaohongshuWorkspace"]>>,
    generatedAt: string,
  ) {
    return {
      task: "输出《品牌增长报告》",
      generatedAt,
      inputScope: {
        brandArchive: {
          background: archive.brand,
          products: archive.products.map((item) => ({
            productName: item.productName,
            productType: item.productType,
            price: item.price,
            productPositioning: item.productPositioning,
            targetAudience: item.targetAudience,
            painPoint: item.painPoint,
            usageScenario: item.usageScenario,
            differentiators: item.differentiators,
            marketPosition: item.marketPosition,
            detailDescription: this.truncateText(item.detailDescription, 600),
          })),
          survey: archive.survey
            .filter((item) => item.value?.trim())
            .map((item) => ({
              label: item.label,
              value: this.truncateText(item.value, 1000),
            })),
        },
        xiaohongshuCollection: {
          brandAccounts: collection.brandAccounts.map((item) => ({
            accountName: item.accountName,
            sourceAccountLink: item.sourceAccountLink,
            fanCount: item.fanCount,
            postedCount: item.postedCount,
            likedCount: item.likedCount,
            description: this.truncateText(item.description, 300),
          })),
          competitorAccounts: collection.competitorAccounts.map((item) => ({
            accountName: item.accountName,
            sourceAccountLink: item.sourceAccountLink,
            fanCount: item.fanCount,
            postedCount: item.postedCount,
            likedCount: item.likedCount,
            description: this.truncateText(item.description, 300),
          })),
          brandNotes: collection.brandNotes.slice(0, 30).map((item) => ({
            title: item.title,
            noteType: item.noteType,
            nickname: item.nickname,
            noteUrl: item.noteUrl,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            collectCount: item.collectCount,
            shareCount: item.shareCount,
            description: this.truncateText(item.description, 400),
          })),
          benchmarkNotes: collection.benchmarkNotes.slice(0, 30).map((item) => ({
            title: item.title,
            noteType: item.noteType,
            nickname: item.nickname,
            noteUrl: item.noteUrl,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            collectCount: item.collectCount,
            shareCount: item.shareCount,
            likeCollectRatio: item.likeCollectRatio,
            likeCommentRatio: item.likeCommentRatio,
            shareRatio: item.shareRatio,
            isExplosive: item.isExplosive,
            isSelected: item.followUpDecision,
            description: this.truncateText(item.description, 400),
          })),
        },
      },
      outputTarget: "品牌增长报告",
    };
  }

  private buildVisualReportInput(sourceReport: GrowthReportRecord, generatedAt: string) {
    return {
      task: "输出《品牌增长可视化报告》",
      generatedAt,
      inputScope: {
        growthReport: {
          id: sourceReport.id,
          title: sourceReport.title,
          summary: sourceReport.summary,
          generatedAt: sourceReport.generatedAt,
          reportMarkdown: this.truncateText(sourceReport.reportMarkdown, 3600),
          diagnosis: sourceReport.diagnosis,
          opportunities: sourceReport.opportunities,
          nextActions: sourceReport.nextActions,
          metrics: sourceReport.metrics,
        },
      },
      outputTarget: "品牌增长可视化报告",
    };
  }

  private buildHalfYearPlanningWindow(generatedAt: string) {
    const referenceDate = Number.isFinite(Date.parse(generatedAt)) ? new Date(generatedAt) : new Date();
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    const monthLabels = Array.from({ length: 6 }, (_, index) => {
      const cursor = new Date(year, month + index, 1);
      return `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`;
    });
    return {
      label: `${monthLabels[0]}-${monthLabels[5]}`,
      monthLabels,
    };
  }

  private buildAnnualMarketingPlanInput(
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>,
    sourceReport: GrowthReportRecord,
    generatedAt: string,
  ) {
    const planningWindow = this.buildHalfYearPlanningWindow(generatedAt);
    return {
      task: "输出《半年营销规划》",
      generatedAt,
      inputScope: {
        brandArchive: {
          background: archive.brand,
          products: archive.products.map((item) => ({
            productName: item.productName,
            productType: item.productType,
            price: item.price,
            targetAudience: item.targetAudience,
            usageScenario: item.usageScenario,
            differentiators: item.differentiators,
            marketPosition: item.marketPosition,
            detailDescription: this.truncateText(item.detailDescription, 240),
          })),
          survey: archive.survey
            .filter((item) => item.value?.trim())
            .slice(0, 18)
            .map((item) => ({
              label: item.label,
              value: this.truncateText(item.value, 360),
            })),
          industryFeeds: archive.industryFeeds.slice(0, 8).map((item) => ({
            title: item.title,
            description: this.truncateText(item.description, 220),
            sourceName: item.sourceName,
          })),
          businessAssets: archive.businessAssets.slice(0, 8).map((item) => ({
            title: item.title,
            description: this.truncateText(item.description, 220),
            sourceName: item.sourceName,
          })),
        },
        growthReport: {
          id: sourceReport.id,
          title: sourceReport.title,
          summary: sourceReport.summary,
          generatedAt: sourceReport.generatedAt,
          diagnosis: sourceReport.diagnosis,
          opportunities: sourceReport.opportunities,
          nextActions: sourceReport.nextActions,
          reportMarkdown: this.truncateText(sourceReport.reportMarkdown, 3200),
        },
        planningWindow: {
          label: planningWindow.label,
          monthLabels: planningWindow.monthLabels,
        },
      },
      outputTarget: "半年营销规划",
    };
  }

  private buildXiaohongshuMarketingPlanInput(
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>,
    collection: Awaited<ReturnType<CollectorsService["getXiaohongshuWorkspace"]>>,
    sourceReport: GrowthReportRecord,
    annualPlan: AnnualMarketingPlanRecord,
    generatedAt: string,
  ) {
    return {
      task: "输出《小红书营销策划方案》",
      generatedAt,
      inputScope: {
        brandArchive: {
          background: archive.brand,
          products: archive.products.map((item) => {
            const record = this.asRecord(item as unknown);
            return {
              productName: item.productName,
              productType: item.productType,
              price: item.price,
              productPositioning: item.productPositioning,
              targetAudience: item.targetAudience,
              painPoint: item.painPoint,
              usageScenario: item.usageScenario,
              differentiators: item.differentiators,
              marketPosition: item.marketPosition,
              detailDescription: this.truncateText(item.detailDescription, 280),
              competitorName: this.readRecordString(record, "competitorName"),
              competitorPrice: this.readRecordString(record, "competitorPrice"),
              competitorPositioning: this.readRecordString(record, "competitorPositioning"),
              competitorPainPoint: this.readRecordString(record, "competitorPainPoint"),
              competitorScenario: this.readRecordString(record, "competitorScenario"),
              competitorMarketPosition: this.readRecordString(record, "competitorMarketPosition"),
              competitorDescription: this.truncateText(this.readRecordString(record, "competitorDescription"), 240),
            };
          }),
          survey: archive.survey
            .filter((item) => item.value?.trim())
            .slice(0, 20)
            .map((item) => ({
              label: item.label,
              value: this.truncateText(item.value, 360),
            })),
          industryFeeds: archive.industryFeeds.slice(0, 10).map((item) => ({
            title: item.title,
            description: this.truncateText(item.description, 240),
            sourceName: item.sourceName,
          })),
          businessAssets: archive.businessAssets.slice(0, 10).map((item) => ({
            title: item.title,
            description: this.truncateText(item.description, 240),
            sourceName: item.sourceName,
          })),
        },
        xiaohongshuCollection: {
          brandAccounts: collection.brandAccounts.map((item) => ({
            accountName: item.accountName,
            sourceAccountLink: item.sourceAccountLink,
            fanCount: item.fanCount,
            postedCount: item.postedCount,
            likedCount: item.likedCount,
            description: this.truncateText(item.description, 280),
          })),
          competitorAccounts: collection.competitorAccounts.map((item) => ({
            accountName: item.accountName,
            sourceAccountLink: item.sourceAccountLink,
            fanCount: item.fanCount,
            postedCount: item.postedCount,
            likedCount: item.likedCount,
            description: this.truncateText(item.description, 280),
          })),
          brandNotes: collection.brandNotes.slice(0, 24).map((item) => ({
            title: item.title,
            noteType: item.noteType,
            nickname: item.nickname,
            noteUrl: item.noteUrl,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            collectCount: item.collectCount,
            shareCount: item.shareCount,
            isExplosive: item.isExplosive,
            description: this.truncateText(item.description, 320),
          })),
          benchmarkNotes: collection.benchmarkNotes.slice(0, 24).map((item) => ({
            title: item.title,
            noteType: item.noteType,
            nickname: item.nickname,
            noteUrl: item.noteUrl,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            collectCount: item.collectCount,
            shareCount: item.shareCount,
            likeCollectRatio: item.likeCollectRatio,
            likeCommentRatio: item.likeCommentRatio,
            shareRatio: item.shareRatio,
            isExplosive: item.isExplosive,
            isSelected: item.followUpDecision,
            description: this.truncateText(item.description, 320),
          })),
        },
        growthReport: {
          id: sourceReport.id,
          title: sourceReport.title,
          summary: sourceReport.summary,
          generatedAt: sourceReport.generatedAt,
          diagnosis: sourceReport.diagnosis,
          opportunities: sourceReport.opportunities,
          nextActions: sourceReport.nextActions,
          reportMarkdown: this.truncateText(sourceReport.reportMarkdown, 4200),
        },
        annualMarketingPlan: {
          id: annualPlan.id,
          title: annualPlan.title,
          summary: annualPlan.summary,
          planningYear: annualPlan.planningYear,
          planningFocus: annualPlan.planningFocus,
          items: annualPlan.items.slice(0, 30).map((item) => ({
            month: item.month,
            node: item.node,
            date: item.date,
            type: item.type,
            marketingTheme: item.marketingTheme,
            platforms: item.platforms,
            strategy: this.truncateText(item.strategy, 220),
            products: item.products,
          })),
        },
      },
      outputTarget: "小红书营销策划方案",
    };
  }

  private buildDouyinMarketingPlanInput(
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>,
    collection: Awaited<ReturnType<CollectorsService["getDouyinWorkspace"]>>,
    sourceReport: GrowthReportRecord,
    annualPlan: AnnualMarketingPlanRecord,
    generatedAt: string,
  ) {
    return {
      task: "输出《抖音营销策划方案》",
      generatedAt,
      inputScope: {
        brandArchive: {
          background: archive.brand,
          products: archive.products.map((item) => {
            const record = this.asRecord(item as unknown);
            return {
              productName: item.productName,
              productType: item.productType,
              price: item.price,
              productPositioning: item.productPositioning,
              targetAudience: item.targetAudience,
              painPoint: item.painPoint,
              usageScenario: item.usageScenario,
              differentiators: item.differentiators,
              marketPosition: item.marketPosition,
              detailDescription: this.truncateText(item.detailDescription, 280),
              competitorName: this.readRecordString(record, "competitorName"),
              competitorPrice: this.readRecordString(record, "competitorPrice"),
              competitorPositioning: this.readRecordString(record, "competitorPositioning"),
              competitorPainPoint: this.readRecordString(record, "competitorPainPoint"),
              competitorScenario: this.readRecordString(record, "competitorScenario"),
              competitorMarketPosition: this.readRecordString(record, "competitorMarketPosition"),
              competitorDescription: this.truncateText(this.readRecordString(record, "competitorDescription"), 240),
            };
          }),
          survey: archive.survey
            .filter((item) => item.value?.trim())
            .slice(0, 20)
            .map((item) => ({
              label: item.label,
              value: this.truncateText(item.value, 360),
            })),
          industryFeeds: archive.industryFeeds.slice(0, 10).map((item) => ({
            title: item.title,
            description: this.truncateText(item.description, 240),
            sourceName: item.sourceName,
          })),
          businessAssets: archive.businessAssets.slice(0, 10).map((item) => ({
            title: item.title,
            description: this.truncateText(item.description, 240),
            sourceName: item.sourceName,
          })),
        },
        douyinCollection: {
          brandAccounts: collection.brandAccounts.map((item) => ({
            accountName: item.accountName,
            accountLink: item.accountLink,
            sourceAccountLink: item.sourceAccountLink,
            fanCount: item.fanCount,
            postedCount: item.postedCount,
            likedCount: item.likedCount,
            followCount: item.followCount,
            description: this.truncateText(item.description, 280),
            enterpriseVerifyReason: item.enterpriseVerifyReason,
            customVerify: item.customVerify,
          })),
          competitorAccounts: collection.competitorAccounts.map((item) => ({
            accountName: item.accountName,
            accountLink: item.accountLink,
            sourceAccountLink: item.sourceAccountLink,
            fanCount: item.fanCount,
            postedCount: item.postedCount,
            likedCount: item.likedCount,
            followCount: item.followCount,
            description: this.truncateText(item.description, 280),
            enterpriseVerifyReason: item.enterpriseVerifyReason,
            customVerify: item.customVerify,
          })),
          brandWorks: collection.brandWorks.slice(0, 30).map((item) => ({
            title: item.title,
            description: this.truncateText(item.description, 320),
            workUrl: item.workUrl,
            coverUrl: item.coverUrl,
            videoUrl: item.videoUrl,
            authorName: item.authorName,
            workType: item.workType,
            publishTimeText: item.publishTimeText,
            durationSeconds: item.durationMs ? Math.round(item.durationMs / 1000) : undefined,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            shareCount: item.shareCount,
            collectCount: item.collectCount,
            playCount: item.playCount,
            downloadCount: item.downloadCount,
            recommendCount: item.recommendCount,
            hashtags: item.hashtags,
            musicTitle: item.musicTitle,
            musicAuthor: item.musicAuthor,
            isExplosive: item.isExplosive,
          })),
          benchmarkWorks: collection.benchmarkWorks.slice(0, 30).map((item) => ({
            title: item.title,
            description: this.truncateText(item.description, 320),
            workUrl: item.workUrl,
            coverUrl: item.coverUrl,
            videoUrl: item.videoUrl,
            authorName: item.authorName,
            workType: item.workType,
            publishTimeText: item.publishTimeText,
            durationSeconds: item.durationMs ? Math.round(item.durationMs / 1000) : undefined,
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            shareCount: item.shareCount,
            collectCount: item.collectCount,
            playCount: item.playCount,
            downloadCount: item.downloadCount,
            recommendCount: item.recommendCount,
            likeCollectRatio: item.likeCollectRatio,
            likeCommentRatio: item.likeCommentRatio,
            shareRatio: item.shareRatio,
            hashtags: item.hashtags,
            musicTitle: item.musicTitle,
            musicAuthor: item.musicAuthor,
            isExplosive: item.isExplosive,
            followUpDecision: item.followUpDecision,
          })),
          summary: {
            brandAccountCount: collection.brandAccounts.length,
            competitorAccountCount: collection.competitorAccounts.length,
            brandWorkCount: collection.brandWorks.length,
            benchmarkWorkCount: collection.benchmarkWorks.length,
          },
        },
        growthReport: {
          id: sourceReport.id,
          title: sourceReport.title,
          summary: sourceReport.summary,
          generatedAt: sourceReport.generatedAt,
          diagnosis: sourceReport.diagnosis,
          opportunities: sourceReport.opportunities,
          nextActions: sourceReport.nextActions,
          reportMarkdown: this.truncateText(sourceReport.reportMarkdown, 4200),
        },
        annualMarketingPlan: {
          id: annualPlan.id,
          title: annualPlan.title,
          summary: annualPlan.summary,
          planningYear: annualPlan.planningYear,
          planningFocus: annualPlan.planningFocus,
          items: annualPlan.items.slice(0, 30).map((item) => ({
            month: item.month,
            node: item.node,
            date: item.date,
            type: item.type,
            marketingTheme: item.marketingTheme,
            platforms: item.platforms,
            strategy: this.truncateText(item.strategy, 220),
            products: item.products,
          })),
        },
      },
      outputTarget: "抖音营销策划方案",
    };
  }

  private buildDouyinHotTopicCandidatesInput(
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>,
    dailyHotspots: Awaited<ReturnType<CollectorsService["getDailyHotspotWorkspace"]>>,
    generatedAt: string,
  ) {
    return {
      task: "输出《抖音热点找选题》",
      generatedAt,
      inputScope: {
        brandArchive: {
          background: archive.brand,
          products: archive.products.map((item) => ({
            productName: item.productName,
            productType: item.productType,
            price: item.price,
            productPositioning: item.productPositioning,
            targetAudience: item.targetAudience,
            usageScenario: item.usageScenario,
            differentiators: item.differentiators,
            marketPosition: item.marketPosition,
            detailDescription: this.truncateText(item.detailDescription, 240),
          })),
          survey: archive.survey
            .filter((item) => item.value?.trim())
            .slice(0, 20)
            .map((item) => ({
              label: item.label,
              value: this.truncateText(item.value, 220),
            })),
          platformAccounts: archive.platformAccounts.slice(0, 20).map((item) => ({
            platform: item.platform,
            accountName: item.accountName,
            accountLink: item.accountLink,
          })),
          competitorAccounts: archive.competitorAccounts.slice(0, 20).map((item) => ({
            platform: item.platform,
            accountName: item.accountName,
            accountLink: item.accountLink,
          })),
        },
        dailyHotspots: {
          selectedDate: dailyHotspots.selectedDate,
          platforms: dailyHotspots.platforms.map((platform) => ({
            title: platform.title,
            platformKey: platform.platformKey,
            boardType: platform.boardType,
            snapshotDate: platform.snapshotDate,
            description: platform.description,
            sourceLink: platform.sourceLink,
            updateTime: platform.updateTime,
            total: platform.total,
            items: platform.items.map((item) => ({
              rank: item.rank,
              title: item.title,
              hot: item.hot,
              url: item.url || item.mobileUrl,
              timestamp: item.timestamp,
            })),
          })),
        },
      },
      outputRequirement: {
        itemCount: 3,
        displayMode: "one-topic-per-line",
        withCheckbox: true,
      },
      outputTarget: "抖音热点选题",
    };
  }

  private buildXiaohongshuMarketingCalendarInput(
    archive: Awaited<ReturnType<BrandsService["getArchive"]>>,
    collection: Awaited<ReturnType<CollectorsService["getXiaohongshuWorkspace"]>>,
    dailyHotspots: Awaited<ReturnType<CollectorsService["getDailyHotspotWorkspace"]>>,
    sourceReport: GrowthReportRecord,
    annualPlan: AnnualMarketingPlanRecord,
    marketingPlan: XiaohongshuMarketingPlanRecord,
    previousCalendars: XiaohongshuMarketingCalendarRecord[],
    generatedAt: string,
  ) {
    const materialLibrary = collection.benchmarkNotes
      .filter((item) => item.isInMaterialLibrary)
      .slice(0, 30)
      .map((item) => ({
        title: item.title,
        noteType: item.noteType,
        nickname: item.nickname,
        noteUrl: item.noteUrl,
        likeCount: item.likeCount,
        collectCount: item.collectCount,
        commentCount: item.commentCount,
        shareCount: item.shareCount,
        likeCollectRatio: item.likeCollectRatio,
        likeCommentRatio: item.likeCommentRatio,
        shareRatio: item.shareRatio,
        isExplosive: item.isExplosive,
        description: this.truncateText(item.description, 240),
      }));
    const hotspotItems = dailyHotspots.platforms
      .slice(0, 4)
      .flatMap((platform) =>
        platform.items.slice(0, 8).map((item) => ({
          platform: platform.title,
          rank: item.rank,
          title: item.title,
          hot: item.hot,
          url: item.url || item.mobileUrl,
        })),
      )
      .slice(0, 24);
    const historyDates = previousCalendars
      .flatMap((item) => item.items.map((entry) => entry.date))
      .filter(Boolean);
    const lastHistoryDate = historyDates.sort().at(-1) || "";
    const startDate = this.resolveCalendarStartDate(lastHistoryDate, generatedAt);

    return {
      task: "输出《营销日历》",
      generatedAt,
      startDate,
      days: 7,
      expectedDates: this.buildExpectedCalendarDates(startDate, 7),
      inputScope: {
        brandArchive: {
          background: archive.brand,
          products: archive.products.map((item) => ({
            productName: item.productName,
            productCategory: item.productType,
            coreSellingPoint: item.differentiators || item.productPositioning || "",
            usageScenario: item.usageScenario,
            priceRange: typeof item.price === "number" ? `${item.price}元` : "",
          })),
        },
        xiaohongshuMarketingPlan: {
          id: marketingPlan.id,
          title: marketingPlan.title,
          summary: marketingPlan.summary,
          reportMarkdown: this.truncateText(marketingPlan.reportMarkdown, 6000),
        },
        annualMarketingPlan: {
          id: annualPlan.id,
          title: annualPlan.title,
          summary: annualPlan.summary,
          planningYear: annualPlan.planningYear,
          planningFocus: annualPlan.planningFocus,
          items: annualPlan.items.slice(0, 40),
        },
        materialLibrary,
        dailyHotspots: {
          selectedDate: dailyHotspots.selectedDate,
          items: hotspotItems,
        },
        growthReport: {
          id: sourceReport.id,
          title: sourceReport.title,
          summary: sourceReport.summary,
          diagnosis: sourceReport.diagnosis,
          opportunities: sourceReport.opportunities,
          nextActions: sourceReport.nextActions,
        },
        previousCalendarHistory: previousCalendars.slice(0, 10).map((item) => ({
          id: item.id,
          title: item.title,
          generatedAt: item.generatedAt,
          dates: item.items.map((entry) => entry.date),
        })),
      },
      outputTarget: "营销日历",
    };
  }

  private normalizeVisualMetricItems(raw: unknown, fallback: VisualReportMetricItem[]) {
    const items = Array.isArray(raw) ? raw : [];
    const normalized = items
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        label: String(item.label ?? "").trim(),
        value: String(item.value ?? "").trim(),
        note: String(item.note ?? "").trim(),
      }))
      .filter((item) => item.label && item.value)
      .slice(0, 4);
    return normalized.length ? normalized : fallback.slice(0, 4);
  }

  private normalizeVisualSectionItems(raw: unknown, fallback: VisualReportSectionItem[]) {
    const items = Array.isArray(raw) ? raw : [];
    const normalized = items
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        title: String(item.title ?? "").trim(),
        body: String(item.body ?? "").trim(),
        bullets: this.normalizeStringArray(item.bullets, [], 4),
      }))
      .filter((item) => item.title && (item.body || item.bullets.length))
      .slice(0, 6);
    return normalized.length ? normalized : fallback.slice(0, 6);
  }

  private normalizeStringArray(raw: unknown, fallback: string[] = [], limit = 6) {
    const values = Array.isArray(raw)
      ? raw.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
    const target = values.length ? values : fallback;
    return target.slice(0, limit);
  }

  private async loadThirdPartyChatConfig(settings: ModelGenerationSettings): Promise<ThirdPartyChatConfig> {
    const provider = await this.resolveRuntimeProviderByBaseUrl(
      "text-global",
      settings.baseUrl,
      settings.preferredProviderIds,
      "第三方文生文接口配置读取失败",
    );
    if (!provider) {
      throw new ServiceUnavailableException("第三方文生文接口配置读取失败");
    }
    const requestedModels = this.parseDelimitedModels(settings.modelName);
    const models = this.pickProviderModels(
      provider.modelWhitelist,
      requestedModels,
      ["gpt-5.4-nano", "claude-sonnet-4-6", "gemini-3.1-pro-preview", "gpt-5.5"],
    );
    const configuredBaseUrls = this.apiProvidersService.getBaseUrls(provider);
    const prioritizedBaseUrls = settings.baseUrl
      ? [settings.baseUrl, ...configuredBaseUrls.filter((item) => item !== settings.baseUrl)]
      : configuredBaseUrls;
    const usableBaseUrls = [
      ...prioritizedBaseUrls.filter((item) => !this.isPlaceholderProxyBaseUrl(item)),
      ...prioritizedBaseUrls.filter((item) => this.isPlaceholderProxyBaseUrl(item)),
    ];
    const apiKeys = await this.resolveBrandAwareApiKeys(settings.brandId, provider);

    if (!usableBaseUrls.length || !apiKeys.length || !models.length) {
      throw new ServiceUnavailableException("第三方文生文接口配置读取失败");
    }

    return {
      baseUrls: usableBaseUrls,
      completionPath: this.apiProvidersService.getStringExtra(provider, "completionPath") || "/v1/chat/completions",
      apiKeys,
      models,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
    };
  }

  private async loadGrowthReportProviderConfigs(settings: ModelGenerationSettings): Promise<GrowthReportProviderConfig[]> {
    const requestedModels = this.parseDelimitedModels(settings.modelName);
    const [thirdPartyProvider, deepseekProvider, kimiProvider, glmProvider, doubaoProvider] = await Promise.all([
      this.resolveRuntimeProviderByBaseUrl("text-global", settings.baseUrl, settings.preferredProviderIds),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-deepseek"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-kimi"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-glm"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-doubao"),
    ]);
    const [thirdPartyApiKeys, deepseekApiKeys, kimiApiKeys, glmApiKeys, doubaoApiKeys] = await Promise.all([
      this.resolveBrandAwareApiKeys(settings.brandId, thirdPartyProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, deepseekProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, kimiProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, glmProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, doubaoProvider),
    ]);

    const providers: GrowthReportProviderConfig[] = [];
    if (deepseekProvider) {
      const models = this.pickProviderModels(deepseekProvider.modelWhitelist, requestedModels, ["deepseek-v4-pro", "deepseek-v4-flash"]);
      if (models.length && deepseekApiKeys.length) {
        providers.push({
          provider: "DEEPSEEK",
          baseUrls: this.apiProvidersService.getBaseUrls(deepseekProvider),
          completionPath: this.apiProvidersService.getStringExtra(deepseekProvider, "completionPath") || "/chat/completions",
          apiKeys: deepseekApiKeys.slice(0, 2),
          models,
          temperature: Math.min(settings.temperature || 0.3, 0.3),
          maxTokens: Math.min(settings.maxTokens || 6000, 6000),
          requestTimeoutMs: 120000,
          payloadExtras: {
            response_format: { type: "json_object" },
            thinking: { type: "disabled" },
          },
        });
      }
    }
    if (glmProvider) {
      const models = this.pickProviderModels(glmProvider.modelWhitelist, requestedModels, ["GLM-5.1"]);
      if (models.length && glmApiKeys.length) {
        providers.push({
          provider: "GLM",
          baseUrls: this.apiProvidersService.getBaseUrls(glmProvider),
          completionPath: this.apiProvidersService.getStringExtra(glmProvider, "completionPath") || "/chat/completions",
          apiKeys: glmApiKeys.slice(0, 2),
          models,
          temperature: Math.min(settings.temperature || 0.3, 0.3),
          maxTokens: Math.min(settings.maxTokens || 6000, 6000),
          requestTimeoutMs: 120000,
          payloadExtras: {
            response_format: { type: "json_object" },
          },
        });
      }
    }
    if (kimiProvider) {
      const models = this.pickProviderModels(kimiProvider.modelWhitelist, requestedModels, ["kimi-k2.6"]);
      if (models.length && kimiApiKeys.length) {
        providers.push({
          provider: "KIMI",
          baseUrls: this.apiProvidersService.getBaseUrls(kimiProvider),
          completionPath: this.apiProvidersService.getStringExtra(kimiProvider, "completionPath") || "/chat/completions",
          apiKeys: kimiApiKeys.slice(0, 2),
          models,
          temperature: 1,
          temperatureOverride: 1,
          maxTokens: Math.min(settings.maxTokens || 6000, 6000),
          requestTimeoutMs: 180000,
          tokenLimitField: "max_completion_tokens",
          payloadExtras: {
            response_format: { type: "json_object" },
          },
        });
      }
    }
    if (doubaoProvider) {
      const models = this.pickProviderModels(
        doubaoProvider.modelWhitelist,
        requestedModels,
        ["doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "doubao-seed-1-8-251228"],
      );
      if (models.length && doubaoApiKeys.length) {
        providers.push({
          provider: "ARK",
          baseUrls: this.apiProvidersService.getBaseUrls(doubaoProvider),
          completionPath: this.apiProvidersService.getStringExtra(doubaoProvider, "completionPath") || "/chat/completions",
          apiKeys: doubaoApiKeys.slice(0, 1),
          models: models.slice(0, 1),
          temperature: Math.min(settings.temperature || 0.3, 0.3),
          maxTokens: Math.min(settings.maxTokens || 6000, 6000),
          requestTimeoutMs: 150000,
          payloadExtras: {
            response_format: { type: "json_object" },
          },
        });
      }
    }
    if (thirdPartyProvider) {
      const models = this.pickProviderModels(
        thirdPartyProvider.modelWhitelist,
        requestedModels,
        ["gpt-5.5", "gpt-5.4-nano", "claude-sonnet-4-6", "gemini-3.1-pro-preview"],
      );
      if (models.length && thirdPartyApiKeys.length) {
        const configuredBaseUrls = this.apiProvidersService.getBaseUrls(thirdPartyProvider);
        const prioritizedBaseUrls = settings.baseUrl
          ? [settings.baseUrl, ...configuredBaseUrls.filter((item) => item !== settings.baseUrl)]
          : configuredBaseUrls;
        const usableBaseUrls = [
          ...prioritizedBaseUrls.filter((item) => !this.isPlaceholderProxyBaseUrl(item)),
          ...prioritizedBaseUrls.filter((item) => this.isPlaceholderProxyBaseUrl(item)),
        ];
        if (usableBaseUrls.length) {
          providers.push({
            provider: "THIRD_PARTY",
            baseUrls: usableBaseUrls,
            completionPath: this.apiProvidersService.getStringExtra(thirdPartyProvider, "completionPath") || "/v1/chat/completions",
            apiKeys: thirdPartyApiKeys.slice(0, 4),
            models,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            requestTimeoutMs: 90000,
            payloadExtras: {
              response_format: { type: "json_object" },
            },
          });
        }
      }
    }

    if (!providers.length) {
      throw new ServiceUnavailableException("品牌增长报告模型配置读取失败");
    }

    return this.reorderReportProvidersByPrimaryModel(
      providers,
      settings.preferredModelName || requestedModels[0] || "",
    );
  }

  private async loadDomesticVisualProviderConfigs(settings: ModelGenerationSettings): Promise<DomesticVisualProviderConfig[]> {
    const requestedModels = this.parseDelimitedModels(settings.modelName);
    const [deepseekProvider, kimiProvider, glmProvider, doubaoProvider] = await Promise.all([
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-deepseek"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-kimi"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-glm"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-doubao"),
    ]);
    const [deepseekApiKeys, kimiApiKeys, glmApiKeys, doubaoApiKeys] = await Promise.all([
      this.resolveBrandAwareApiKeys(settings.brandId, deepseekProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, kimiProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, glmProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, doubaoProvider),
    ]);

    const providers: DomesticVisualProviderConfig[] = [];
    if (deepseekProvider) {
      const models = this.pickProviderModels(deepseekProvider.modelWhitelist, requestedModels, ["deepseek-v4-flash", "deepseek-v4-pro"]);
      if (models.length && deepseekApiKeys.length) {
        providers.push({
          provider: "DEEPSEEK",
          baseUrls: this.apiProvidersService.getBaseUrls(deepseekProvider),
          completionPath: this.apiProvidersService.getStringExtra(deepseekProvider, "completionPath") || "/chat/completions",
          apiKeys: deepseekApiKeys.slice(0, 2),
          models,
          temperature: Math.min(settings.temperature || 0.2, 0.2),
          maxTokens: Math.min(settings.maxTokens || 2400, 2400),
          requestTimeoutMs: 90000,
          payloadExtras: {
            response_format: { type: "text" },
            thinking: { type: "disabled" },
          },
        });
      }
    }
    if (glmProvider) {
      const models = this.pickProviderModels(glmProvider.modelWhitelist, requestedModels, ["GLM-5.1"]);
      if (models.length && glmApiKeys.length) {
        providers.push({
          provider: "GLM",
          baseUrls: this.apiProvidersService.getBaseUrls(glmProvider),
          completionPath: this.apiProvidersService.getStringExtra(glmProvider, "completionPath") || "/chat/completions",
          apiKeys: glmApiKeys.slice(0, 2),
          models,
          temperature: Math.min(settings.temperature || 0.2, 0.2),
          maxTokens: Math.min(settings.maxTokens || 2400, 2400),
          requestTimeoutMs: 90000,
          payloadExtras: {
            thinking: { type: "disabled" },
          },
        });
      }
    }
    if (kimiProvider) {
      const models = this.pickProviderModels(kimiProvider.modelWhitelist, requestedModels, ["kimi-k2.6"]);
      if (models.length && kimiApiKeys.length) {
        providers.push({
          provider: "KIMI",
          baseUrls: this.apiProvidersService.getBaseUrls(kimiProvider),
          completionPath: this.apiProvidersService.getStringExtra(kimiProvider, "completionPath") || "/chat/completions",
          apiKeys: kimiApiKeys.slice(0, 2),
          models,
          temperature: 1,
          temperatureOverride: 1,
          maxTokens: Math.min(settings.maxTokens || 2400, 2400),
          requestTimeoutMs: 90000,
          tokenLimitField: "max_completion_tokens",
          payloadExtras: {
            response_format: { type: "text" },
            thinking: { type: "disabled" },
          },
        });
      }
    }
    if (doubaoProvider) {
      const models = this.pickProviderModels(
        doubaoProvider.modelWhitelist,
        requestedModels,
        ["doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "doubao-seed-1-8-251228"],
      );
      if (models.length && doubaoApiKeys.length) {
        providers.push({
          provider: "ARK",
          baseUrls: this.apiProvidersService.getBaseUrls(doubaoProvider),
          completionPath: this.apiProvidersService.getStringExtra(doubaoProvider, "completionPath") || "/chat/completions",
          apiKeys: doubaoApiKeys.slice(0, 1),
          models: models.slice(0, 1),
          temperature: settings.temperature,
          maxTokens: Math.min(settings.maxTokens || 2600, 2600),
          requestTimeoutMs: 120000,
        });
      }
    }

    if (!providers.length) {
      throw new ServiceUnavailableException("国内文生文接口配置读取失败");
    }

    return this.reorderReportProvidersByPrimaryModel(
      providers,
      settings.preferredModelName || requestedModels[0] || "",
    );
  }

  private buildVisualProviderPayload(
    provider: DomesticVisualProviderConfig,
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
  ) {
    const payload: Record<string, unknown> = {
      model: modelName,
      stream: false,
      temperature: provider.temperatureOverride ?? provider.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(provider.payloadExtras ?? {}),
    };
    payload[provider.tokenLimitField === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens"] = provider.maxTokens;
    return payload;
  }

  private buildGrowthReportProviderPayload(
    provider: GrowthReportProviderConfig,
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
  ) {
    const payload: Record<string, unknown> = {
      model: modelName,
      stream: false,
      temperature: provider.temperatureOverride ?? provider.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(provider.payloadExtras ?? {}),
    };
    payload[provider.tokenLimitField === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens"] = provider.maxTokens;
    return payload;
  }

  private extractVisualResponseContent(payload: {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
  }) {
    const message = payload.choices?.[0]?.message;
    const content = String(message?.content ?? "").trim();
    const reasoningContent = String(message?.reasoning_content ?? "").trim();
    if (content) {
      return content;
    }
    if (reasoningContent.startsWith("{") || reasoningContent.startsWith("```") || reasoningContent.includes("\"htmlBody\"")) {
      return reasoningContent;
    }
    return "";
  }

  private readProviderInlineValue(content: string, label: string) {
    const matcher = new RegExp(`^\\s*${label}\\s*[:：]\\s*(.+)$`, "im");
    return content.match(matcher)?.[1]?.trim() || "";
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

  private resolveCompatibleModelNames(
    availableModels: string[] | undefined,
    configuredModels: string,
    preferredModels: string[],
    fallbackModelName: string,
  ) {
    const normalizedAvailable = Array.isArray(availableModels)
      ? availableModels.map((item) => item.trim()).filter(Boolean)
      : [];
    const requestedModels = this.parseDelimitedModels(configuredModels);
    if (!normalizedAvailable.length) {
      return configuredModels || fallbackModelName;
    }
    const models = this.pickProviderModels(normalizedAvailable, requestedModels, preferredModels);
    return models.length ? models.join(", ") : fallbackModelName;
  }

  private collectRegexMatches(content: string, pattern: RegExp) {
    return [...content.matchAll(pattern)]
      .map((item) => item[0]?.trim() || "")
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  private orderModels(models: string[], preferredModels: string[]) {
    const normalized = models
      .map((item) => item.trim())
      .filter(Boolean);
    return [
      ...preferredModels.filter((item) => normalized.includes(item)),
      ...normalized.filter((item) => !preferredModels.includes(item)),
    ];
  }

  private reorderReportProvidersByPrimaryModel<T extends { models: string[] }>(
    providers: T[],
    preferredModelName: string,
  ) {
    const normalizedPreferredModelName = preferredModelName.trim();
    if (!normalizedPreferredModelName) {
      return providers;
    }
    const normalizedProviders = providers.map((provider) => ({
      ...provider,
      models: provider.models.includes(normalizedPreferredModelName)
        ? this.orderModels(provider.models, [normalizedPreferredModelName])
        : provider.models,
    }));
    const matchingProviders = normalizedProviders.filter((provider) => provider.models.includes(normalizedPreferredModelName));
    if (!matchingProviders.length) {
      return normalizedProviders;
    }
    return [
      ...matchingProviders,
      ...normalizedProviders.filter((provider) => !provider.models.includes(normalizedPreferredModelName)),
    ];
  }

  private buildReportAttemptLabel(provider: string, modelName: string, baseUrl: string) {
    return `${provider}/${modelName}@${this.describeProviderBaseUrl(baseUrl)}`;
  }

  private formatReportAttemptTrail(trail: string[]) {
    return trail
      .slice(0, 8)
      .map((item, index) => `${index + 1}. ${item}`)
      .join(" | ");
  }

  private buildReportAttemptFailureMessage(
    taskLabel: string,
    preferredModelName: string,
    lastError: string,
    attemptTrail: string[],
    fallbackMessage: string,
  ) {
    const preferredDetail = preferredModelName ? `首选模型：${preferredModelName}；` : "";
    const detail = attemptTrail.length ? `；实际尝试顺序：${this.formatReportAttemptTrail(attemptTrail)}` : "";
    return `${taskLabel}失败：${preferredDetail}最后失败：${lastError || fallbackMessage}${detail}`;
  }

  private describeProviderBaseUrl(baseUrl: string) {
    try {
      const target = new URL(baseUrl);
      return `${target.host}${target.pathname === "/" ? "" : target.pathname}`;
    } catch {
      return baseUrl;
    }
  }

  private extractProviderSection(content: string, startLabel: string, nextLabels: string[] = []) {
    const lines = content.split(/\r?\n/);
    const startRegex = new RegExp(`^\\s*${startLabel}\\s*[:：]`, "i");
    const nextRegex = nextLabels.length
      ? new RegExp(`^\\s*(?:${nextLabels.join("|")})\\s*[:：]`, "i")
      : null;
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

  private async loadGrowthAnalysisSkillPrompt() {
    const backendSettings = await this.loadGrowthReportGenerationSettings();
    if (backendSettings.promptContent) {
      return backendSettings.promptContent;
    }
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), ".runtime", "brand-omni-growth-analysis", "brand-omni-growth-analysis", "SKILL.md"),
      resolve(this.resolveOperationRoot(), ".trae", "skills", "brand-omni-growth-analysis", "SKILL.md"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8");
      }
    }

    return [
      "# 品牌全域增长分析报告",
      "你要从品牌基础、产品、用户、公域、私域、预算、ROI 和营销策略几个维度生成《品牌增长报告》。",
      "必须围绕增长问题、增长机会、营收与 ROI 逻辑、营销策略和动作优先级输出。",
      "缺失数据必须明确标注待补充，不得编造。",
    ].join("\n");
  }

  private loadVisualReportSkillPrompt(settings: ModelGenerationSettings) {
    const skillPrompt = this.loadArticleVisualDesignerSkillMarkdown();
    const businessRequirements = settings.promptContent?.trim();
    const runtimeRequirements = [
      "当前任务不是把普通文章可视化，而是把《品牌增长报告》转成《品牌增长可视化报告》。",
      "必须完整保留原报告中的核心结论、关键诊断、增长机会、行动建议与关键数据关系。",
      "允许生成更完整的多区域长内容，不要再压缩成过短的极简版。",
      "最终仍需返回一个 JSON 对象，且 htmlBody 只包含 body 内 HTML 片段。",
    ].join("\n");

    return [
      skillPrompt,
      businessRequirements ? `# 业务补充要求\n${businessRequirements}` : "",
      "# 运行时补充要求",
      runtimeRequirements,
    ].filter(Boolean).join("\n\n");
  }

  private loadAnnualMarketingPlanPrompt(settings: ModelGenerationSettings) {
    const businessRequirements = settings.promptContent?.trim();
    return [
      "# 半年营销规划生成器",
      "你需要根据品牌商家建档和品牌增长报告，输出未来半年的营销规划。",
      "规划必须覆盖未来半年关键节日与节气，体现营销主题、渠道协同、策略执行和产品承接。",
      "如果某个月适合围绕同一主题做多平台协同，可以在同一条记录里输出多个平台。",
      businessRequirements ? `# 业务补充要求\n${businessRequirements}` : "",
    ].filter(Boolean).join("\n\n");
  }

  private buildXiaohongshuMarketingPlanSystemPrompt(
    skillPrompt: string,
    settings: ModelGenerationSettings,
    phase: "PART_ONE" | "PART_TWO" | "PART_THREE" | "PART_FOUR" | "PART_FIVE",
  ) {
    const businessRequirements = settings.promptContent?.trim();
    return [
      "# 角色声明",
      [
        "以下内容是一份小红书营销规划技能参考文档，用于约束输出深度与结构。",
        "你当前只需要直接产出最终 Markdown 成品，不要把自己当成代码代理、文件编辑器或工作流执行器。",
        "严禁输出 create_file、edit_file、write_file_section、tool_call、tool_response、XML/JSON 工具调用、'Let me write'、'I will write in sections' 之类过程性文字。",
        "严禁把“分段写入”“先输出第一部分”“继续下一部分”这类续写说明写进正文。",
        "严禁使用 Markdown 代码块包裹最终正文。",
      ].join("\n"),
      skillPrompt,
      businessRequirements ? `# 业务补充要求\n${businessRequirements}` : "",
      "# 运行时补充要求",
      phase === "PART_ONE"
        ? [
            "当前是第 1 次生成，只允许输出第 1 段 Markdown 成品。",
            "必须输出：基础说明、账号与对标基础诊断、## 一、定策略（看+定）。",
            "严禁输出 ## 二、## 三、## 四、## 五，也严禁写“下一部分待续”。",
            "缺失数据必须明确标注，不得编造。",
          ].join("\n")
        : phase === "PART_TWO"
          ? [
              "当前是第 2 次生成，只允许输出第 2 段 Markdown 成品。",
              "必须输出：## 二、四大象限定产品节奏。",
              "严禁重复输出标题、基础说明、账号与对标诊断、## 一、## 三、## 四、## 五。",
              "请严格承接已给出的前文策略判断，保持口径一致。",
              "缺失数据必须明确标注，不得编造。",
            ].join("\n")
          : phase === "PART_THREE"
            ? [
                "当前是第 3 次生成，只允许输出第 3 段 Markdown 成品。",
                "必须输出：## 三、四大矩阵定内容。",
                "严禁重复输出标题、基础说明、账号与对标诊断、## 一、## 二、## 四、## 五。",
                "请严格承接已给出的策略判断和产品节奏，保持口径一致。",
                "缺失数据必须明确标注，不得编造。",
              ].join("\n")
            : phase === "PART_FOUR"
              ? [
                  "当前是第 4 次生成，只允许输出第 4 段 Markdown 成品。",
                  "必须输出：## 四、四大资源定组合。",
                  "严禁重复输出标题、基础说明、账号与对标诊断、## 一、## 二、## 三、## 五。",
                  "请严格承接已给出的策略判断、产品节奏和内容矩阵，保持口径一致。",
                  "缺失数据必须明确标注，不得编造。",
                ].join("\n")
              : [
                  "当前是第 5 次生成，只允许输出第 5 段 Markdown 成品。",
                  "必须输出：## 五、合规提醒与风险边界。",
                  "严禁重复输出标题、基础说明、账号与对标诊断、## 一、## 二、## 三、## 四。",
                  "请严格承接前文全部策略与资源组合判断，保持收尾口径一致。",
                  "缺失数据必须明确标注，不得编造。",
                ].join("\n"),
    ].filter(Boolean).join("\n\n");
  }

  private buildXiaohongshuMarketingPlanUserPrompt(
    inputPayload: Record<string, unknown>,
    phase: "PART_ONE" | "PART_TWO" | "PART_THREE" | "PART_FOUR" | "PART_FIVE",
    previousMarkdown?: string,
  ) {
    const sectionsText = phase === "PART_ONE"
      ? "请只生成第 1 段：基础说明、账号与对标基础诊断、## 一、定策略（看+定）。"
      : phase === "PART_TWO"
        ? "请只生成第 2 段：## 二、四大象限定产品节奏。"
        : phase === "PART_THREE"
          ? "请只生成第 3 段：## 三、四大矩阵定内容。"
          : phase === "PART_FOUR"
            ? "请只生成第 4 段：## 四、四大资源定组合。"
            : "请只生成第 5 段：## 五、合规提醒与风险边界。";

    return [
      sectionsText,
      phase !== "PART_ONE" && previousMarkdown
        ? [
            "以下是已经生成完成的前文内容，请严格承接其判断口径，不要重复输出已有章节：",
            "",
            previousMarkdown,
          ].join("\n")
        : "",
      "以下是本次生成小红书营销策划方案的输入数据，请围绕这些数据输出结果。",
      "",
      JSON.stringify(inputPayload, null, 2),
    ].filter(Boolean).join("\n\n");
  }

  private loadArticleVisualDesignerSkillMarkdown() {
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), "提示词", "article-visual-report-designer", "SKILL.md"),
      resolve(this.resolveOperationRoot(), "提示词", "article-visual-report-designer", "SKILL.md"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8").trim();
      }
    }

    return [
      "你是 article-visual-report-designer。",
      "请把品牌增长报告转换成完整的 body 内 HTML 可视化报告。",
      "全部使用行内样式，不依赖外部 CSS、JS 或第三方库。",
      "优先保证信息完整、结构清晰、移动端可读和图文融合表达。",
    ].join("\n");
  }

  private async loadXiaohongshuMarketingSkillMarkdown() {
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_xhs_plan");
    if (prompt?.content?.trim()) {
      return prompt.content.trim();
    }
    const skillDir = resolve(this.resolveAiWorkspaceRoot(), "提示词", "_xhs-plan-skill", "xiaohongshu-brand-marketing-plan");
    const skillPath = resolve(skillDir, "SKILL.md");
    if (existsSync(skillPath)) {
      return readFileSync(skillPath, "utf8").trim();
    }
    const fallbackZipDir = resolve(this.resolveAiWorkspaceRoot(), "提示词", "xiaohongshu-brand-marketing-plan");
    const fallbackPath = resolve(fallbackZipDir, "SKILL.md");
    if (existsSync(fallbackPath)) {
      return readFileSync(fallbackPath, "utf8").trim();
    }

    return [
      "# 小红书品牌营销方案策划技能",
      "你需要基于品牌资料、产品资料、账号数据、对标数据、品牌增长报告和半年营销规划，输出完整的小红书营销策划方案。",
      "结果必须是可直接交付的 Markdown 长文，并明确引用依据、执行动作、验收口径与合规边界。",
    ].join("\n");
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

  private async loadGrowthReportGenerationSettings(brandId?: string): Promise<ModelGenerationSettings> {
    const skill = await this.skillsPromptsService.getActiveSkillBySlug("brand-omni-growth-analysis");
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_growth_report");
    const preferredSelections = [skill?.defaultModel || "", prompt?.modelName || ""];
    const provider = await this.resolvePreferredProvider(skill?.provider, "text-domestic-deepseek", [
      "text-domestic-deepseek",
      "text-domestic-kimi",
      "text-domestic-glm",
      "text-domestic-doubao",
      "text-global",
    ], preferredSelections);
    const preferredModelNames = this.mergeModelPreferenceOrder(
      skill?.defaultModel || "",
      prompt?.modelName || "",
    );
    const preferredModelName = preferredModelNames[0] || skill?.defaultModel || prompt?.modelName || provider?.defaultModel || "deepseek-v4-pro";
    const modelName = this.resolveCompatibleModelNames(
      provider?.modelWhitelist,
      preferredModelNames.join(", "),
      ["deepseek-v4-pro", "deepseek-v4-flash", "kimi-k2.6", "GLM-5.1", "doubao-seed-2-0-pro-260215", "gpt-5.5"],
      provider?.defaultModel || "deepseek-v4-pro",
    );
    return {
      baseUrl: provider?.baseUrl || "",
      modelName,
      temperature: prompt?.temperature ?? 0.3,
      maxTokens: prompt?.maxTokens ?? 6000,
      promptContent: prompt?.content || "",
      preferredModelName,
      brandId,
      preferredProviderIds: this.extractPreferredProviderIds(...preferredSelections),
    };
  }

  private async loadVisualReportGenerationSettings(brandId?: string): Promise<ModelGenerationSettings> {
    const skill = await this.skillsPromptsService.getActiveSkillBySlug("article-visual-report-designer");
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_visual_report");
    const preferredSelections = [skill?.defaultModel || "", prompt?.modelName || ""];
    const provider = await this.resolvePreferredProvider(skill?.provider, "text-domestic-deepseek", [
      "text-domestic-deepseek",
      "text-domestic-glm",
      "text-domestic-kimi",
      "text-domestic-doubao",
    ], preferredSelections);
    const preferredModelNames = this.mergeModelPreferenceOrder(
      skill?.defaultModel || "",
      prompt?.modelName || "",
    );
    const preferredModelName = preferredModelNames[0] || skill?.defaultModel || prompt?.modelName || provider?.defaultModel || "deepseek-v4-flash";
    const modelName = this.resolveCompatibleModelNames(
      provider?.modelWhitelist,
      preferredModelNames.join(", "),
      ["deepseek-v4-flash", "deepseek-v4-pro", "GLM-5.1", "kimi-k2.6", "doubao-seed-2-0-pro-260215"],
      provider?.defaultModel || "deepseek-v4-flash",
    );
    return {
      baseUrl: provider?.baseUrl && !provider.baseUrl.includes(".local") ? provider.baseUrl : "",
      modelName,
      temperature: prompt?.temperature ?? 0.4,
      maxTokens: prompt?.maxTokens ?? 1800,
      promptContent: prompt?.content || "",
      preferredModelName,
      brandId,
      preferredProviderIds: this.extractPreferredProviderIds(...preferredSelections),
    };
  }

  private async loadAnnualMarketingPlanGenerationSettings(brandId?: string): Promise<ModelGenerationSettings> {
    const skill = await this.skillsPromptsService.getActiveSkillBySlug("enterprise-annual-plan");
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_annual_marketing_plan");
    const preferredSelections = [skill?.defaultModel || "", prompt?.modelName || ""];
    const provider = await this.resolvePreferredProvider(skill?.provider, "text-domestic-deepseek", [
      "text-domestic-deepseek",
      "text-domestic-doubao",
      "text-domestic-kimi",
      "text-global",
    ], preferredSelections);
    const preferredModelNames = this.mergeModelPreferenceOrder(
      skill?.defaultModel || "",
      prompt?.modelName || "",
    );
    const preferredModelName = preferredModelNames[0] || skill?.defaultModel || prompt?.modelName || provider?.defaultModel || "deepseek-v4-pro";
    const modelName = this.resolveCompatibleModelNames(
      provider?.modelWhitelist,
      preferredModelNames.join(", "),
      ["deepseek-v4-pro", "doubao-seed-2-0-pro-260215", "kimi-k2.6", "gpt-5.5", "claude-sonnet-4-6"],
      provider?.defaultModel || "deepseek-v4-pro",
    );
    return {
      baseUrl: provider?.baseUrl || "",
      modelName,
      temperature: prompt?.temperature ?? 0.5,
      maxTokens: prompt?.maxTokens ?? 4200,
      promptContent: prompt?.content || "",
      preferredModelName,
      brandId,
      preferredProviderIds: this.extractPreferredProviderIds(...preferredSelections),
    };
  }

  private async loadXiaohongshuMarketingPlanGenerationSettings(brandId?: string): Promise<ModelGenerationSettings> {
    const skill = await this.skillsPromptsService.getActiveSkillBySlug("xiaohongshu-brand-marketing-plan");
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_xhs_plan");
    const preferredSelections = [skill?.defaultModel || "", prompt?.modelName || ""];
    const provider = await this.resolvePreferredProvider(skill?.provider, "text-domestic-deepseek", ["text-domestic-deepseek"], preferredSelections);
    const preferredModelNames = this.mergeModelPreferenceOrder(
      skill?.defaultModel || "",
      prompt?.modelName || "",
      "deepseek-v4-pro, doubao-seed-2-0-pro-260215, kimi-k2.6, gpt-5.5, claude-sonnet-4-6",
    );
    const preferredModelName = preferredModelNames[0] || skill?.defaultModel || prompt?.modelName || provider?.defaultModel || "deepseek-v4-pro";
    return {
      baseUrl: provider?.baseUrl || "",
      modelName: preferredModelNames.join(", "),
      temperature: prompt?.temperature ?? 0.7,
      maxTokens: prompt?.maxTokens ?? 12000,
      promptContent: prompt?.content || "",
      preferredModelName,
      brandId,
      preferredProviderIds: this.extractPreferredProviderIds(...preferredSelections),
    };
  }

  private async loadDouyinMarketingPlanGenerationSettings(brandId?: string): Promise<ModelGenerationSettings> {
    const skill = await this.skillsPromptsService.getActiveSkillBySlug("tongcheng-brand-douyin-planning");
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_douyin_plan");
    const preferredSelections = [skill?.defaultModel || "", prompt?.modelName || ""];
    const provider = await this.resolvePreferredProvider(skill?.provider, "text-domestic-deepseek", [
      "text-domestic-deepseek",
      "text-domestic-doubao",
      "text-domestic-kimi",
      "text-global",
    ], preferredSelections);
    const preferredModelNames = this.mergeModelPreferenceOrder(
      skill?.defaultModel || "",
      prompt?.modelName || "",
      "deepseek-v4-pro, deepseek-v4-flash, doubao-seed-2-0-pro-260215, kimi-k2.6, gpt-5.5, claude-sonnet-4-6",
    );
    const preferredModelName = preferredModelNames[0] || skill?.defaultModel || prompt?.modelName || provider?.defaultModel || "deepseek-v4-pro";
    return {
      baseUrl: provider?.baseUrl || "",
      modelName: preferredModelNames.join(", "),
      temperature: prompt?.temperature ?? 0.7,
      maxTokens: prompt?.maxTokens ?? 12000,
      promptContent: prompt?.content || "",
      preferredModelName,
      brandId,
      preferredProviderIds: this.extractPreferredProviderIds(...preferredSelections),
    };
  }

  private async loadDouyinHotTopicCandidatesGenerationSettings(brandId?: string): Promise<ModelGenerationSettings> {
    const skill = await this.skillsPromptsService.getActiveSkillBySlug("douyin-hot-topic-candidates");
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_douyin_hot_topic_candidates");
    const preferredSelections = [skill?.defaultModel || "", prompt?.modelName || ""];
    const provider = await this.resolvePreferredProvider(skill?.provider, "text-domestic-deepseek", [
      "text-domestic-deepseek",
      "text-domestic-doubao",
      "text-domestic-kimi",
      "text-global",
    ], preferredSelections);
    const preferredModelNames = this.mergeModelPreferenceOrder(
      skill?.defaultModel || "",
      prompt?.modelName || "",
      "deepseek-v4-pro, deepseek-v4-flash, doubao-seed-2-0-pro-260215, kimi-k2.6, gpt-5.5, claude-sonnet-4-6",
    );
    const preferredModelName = preferredModelNames[0] || skill?.defaultModel || prompt?.modelName || provider?.defaultModel || "deepseek-v4-pro";
    return {
      baseUrl: provider?.baseUrl || "",
      modelName: preferredModelNames.join(", "),
      temperature: prompt?.temperature ?? 0.5,
      maxTokens: prompt?.maxTokens ?? 3200,
      promptContent: prompt?.content || this.loadDouyinHotTopicCandidatesPrompt(),
      preferredModelName,
      brandId,
      preferredProviderIds: this.extractPreferredProviderIds(...preferredSelections),
    };
  }

  private async loadXiaohongshuMarketingCalendarGenerationSettings(brandId?: string): Promise<ModelGenerationSettings> {
    const skill = await this.skillsPromptsService.getActiveSkillBySlug("xiaohongshu-marketing-calendar");
    const prompt = await this.skillsPromptsService.getActivePromptById("prompt_xhs_calendar");
    const preferredSelections = [skill?.defaultModel || "", prompt?.modelName || ""];
    const provider = await this.resolvePreferredProvider(skill?.provider, "text-domestic-deepseek", [
      "text-domestic-deepseek",
      "text-domestic-kimi",
      "text-domestic-doubao",
      "text-global",
    ], preferredSelections);
    const preferredModelNames = this.mergeModelPreferenceOrder(
      skill?.defaultModel || "",
      prompt?.modelName || "",
      "deepseek-v4-pro, kimi-k2.6, doubao-seed-2-0-pro-260215",
    );
    const preferredModelName = preferredModelNames[0] || skill?.defaultModel || prompt?.modelName || provider?.defaultModel || "deepseek-v4-pro";
    return {
      baseUrl: provider?.baseUrl || "",
      modelName: preferredModelNames.join(", "),
      temperature: prompt?.temperature ?? 0.6,
      maxTokens: prompt?.maxTokens ?? 12000,
      promptContent: prompt?.content || this.loadXiaohongshuMarketingCalendarPrompt(),
      preferredModelName,
      brandId,
      preferredProviderIds: this.extractPreferredProviderIds(...preferredSelections),
    };
  }

  private async loadAnnualMarketingProviderConfigs(settings: ModelGenerationSettings): Promise<AnnualMarketingProviderConfig[]> {
    const thirdPartyProvider = await this.resolveRuntimeProviderByBaseUrl(
      "text-global",
      settings.baseUrl,
      settings.preferredProviderIds,
    );
    const requestedModels = this.orderModels(
      this.parseDelimitedModels(settings.modelName),
      ["gpt-5.5", "claude-sonnet-4-6"],
    );

    const [deepseekProvider, doubaoProvider] = await Promise.all([
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-deepseek"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-doubao"),
    ]);
    const [thirdPartyApiKeys, deepseekApiKeys, doubaoApiKeys] = await Promise.all([
      this.resolveBrandAwareApiKeys(settings.brandId, thirdPartyProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, deepseekProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, doubaoProvider),
    ]);
    const thirdPartyModels = thirdPartyProvider
      ? this.pickProviderModels(
          thirdPartyProvider.modelWhitelist,
          requestedModels,
          ["gpt-5.5", "claude-sonnet-4-6"],
        ).filter((item) => !item.toLowerCase().includes("doubao"))
      : [];
    const deepseekModels = deepseekProvider
      ? this.pickProviderModels(deepseekProvider.modelWhitelist, requestedModels, ["deepseek-v4-flash", "deepseek-v4-pro"])
      : [];
    const arkModels = doubaoProvider
      ? this.pickProviderModels(doubaoProvider.modelWhitelist, requestedModels, ["doubao-seed-2-0-mini-260215", "doubao-seed-1-8-251228"])
      : [];

    const providers: AnnualMarketingProviderConfig[] = [];
    if (thirdPartyProvider && thirdPartyModels.length && thirdPartyApiKeys.length) {
      const configuredBaseUrls = this.apiProvidersService.getBaseUrls(thirdPartyProvider);
      const prioritizedBaseUrls = settings.baseUrl
        ? [settings.baseUrl, ...configuredBaseUrls.filter((item) => item !== settings.baseUrl)]
        : configuredBaseUrls;
      const usableBaseUrls = [
        ...prioritizedBaseUrls.filter((item) => !this.isPlaceholderProxyBaseUrl(item)),
        ...prioritizedBaseUrls.filter((item) => this.isPlaceholderProxyBaseUrl(item)),
      ];
      if (usableBaseUrls.length) {
        providers.push({
          provider: "THIRD_PARTY",
          baseUrls: usableBaseUrls,
          completionPath: this.apiProvidersService.getStringExtra(thirdPartyProvider, "completionPath") || "/v1/chat/completions",
          apiKeys: thirdPartyApiKeys.slice(0, 4),
          models: thirdPartyModels,
          temperature: settings.temperature,
          maxTokens: Math.min(settings.maxTokens || 4200, 4200),
          requestTimeoutMs: 180000,
          payloadExtras: {
            response_format: { type: "json_object" },
          },
        });
      }
    }
    if (deepseekProvider && deepseekModels.length && deepseekApiKeys.length) {
      providers.push({
        provider: "DEEPSEEK",
        baseUrls: this.apiProvidersService.getBaseUrls(deepseekProvider),
        completionPath: this.apiProvidersService.getStringExtra(deepseekProvider, "completionPath") || "/chat/completions",
        apiKeys: deepseekApiKeys.slice(0, 2),
        models: deepseekModels,
        temperature: Math.min(settings.temperature || 0.2, 0.2),
        maxTokens: Math.min(settings.maxTokens || 3200, 3200),
        requestTimeoutMs: 120000,
        payloadExtras: {
          response_format: { type: "text" },
          thinking: { type: "disabled" },
        },
      });
    }
    if (doubaoProvider && arkModels.length && doubaoApiKeys.length) {
      providers.push({
        provider: "ARK",
        baseUrls: this.apiProvidersService.getBaseUrls(doubaoProvider),
        completionPath: this.apiProvidersService.getStringExtra(doubaoProvider, "completionPath") || "/chat/completions",
        apiKeys: doubaoApiKeys.slice(0, 1),
        models: arkModels.slice(0, 1),
        temperature: Math.min(settings.temperature || 0.4, 0.4),
        maxTokens: Math.min(settings.maxTokens || 3200, 3200),
        requestTimeoutMs: 150000,
        payloadExtras: {
          response_format: { type: "json_object" },
        },
      });
    }
    if (!providers.length) {
      throw new ServiceUnavailableException("半年营销规划模型配置读取失败");
    }
    return providers;
  }

  private async loadXiaohongshuMarketingProviderConfigs(settings: ModelGenerationSettings): Promise<XiaohongshuMarketingProviderConfig[]> {
    const preferredModels = ["deepseek-v4-pro", "deepseek-v4-flash", "doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "doubao-seed-1-8-251228"];
    const requestedModels = this.orderModels(
      this.parseDelimitedModels(settings.modelName).filter(
        (item) =>
          item === "deepseek-v4-pro" ||
          item === "deepseek-v4-flash" ||
          item === "doubao-seed-2-0-pro-260215" ||
          item === "doubao-seed-2-0-mini-260215" ||
          item === "doubao-seed-1-8-251228",
      ),
      preferredModels,
    );
    const effectiveRequestedModels = requestedModels.length ? requestedModels : preferredModels;

    const [deepseekProvider, doubaoProvider] = await Promise.all([
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-deepseek"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-doubao"),
    ]);
    const [deepseekApiKeys, doubaoApiKeys] = await Promise.all([
      this.resolveBrandAwareApiKeys(settings.brandId, deepseekProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, doubaoProvider),
    ]);
    const deepseekModels = deepseekProvider
      ? this.pickProviderModels(deepseekProvider.modelWhitelist, effectiveRequestedModels, ["deepseek-v4-pro", "deepseek-v4-flash"])
      : [];
    const arkModels = doubaoProvider
      ? this.pickProviderModels(
          doubaoProvider.modelWhitelist,
          effectiveRequestedModels,
          ["doubao-seed-2-0-pro-260215", "doubao-seed-2-0-mini-260215", "doubao-seed-1-8-251228"],
        )
      : [];

    const providers: XiaohongshuMarketingProviderConfig[] = [];
    if (deepseekProvider && deepseekModels.length && deepseekApiKeys.length) {
      providers.push({
        provider: "DEEPSEEK",
        baseUrls: this.apiProvidersService.getBaseUrls(deepseekProvider),
        completionPath: this.apiProvidersService.getStringExtra(deepseekProvider, "completionPath") || "/chat/completions",
        apiKeys: deepseekApiKeys.slice(0, 2),
        models: deepseekModels,
        temperature: Math.min(settings.temperature || 0.3, 0.3),
        maxTokens: Math.min(settings.maxTokens || 9000, 9000),
        requestTimeoutMs: 240000,
        payloadExtras: {
          response_format: { type: "text" },
          thinking: { type: "disabled" },
        },
      });
    }
    if (doubaoProvider && arkModels.length && doubaoApiKeys.length) {
      providers.push({
        provider: "ARK",
        baseUrls: this.apiProvidersService.getBaseUrls(doubaoProvider),
        completionPath: this.apiProvidersService.getStringExtra(doubaoProvider, "completionPath") || "/chat/completions",
        apiKeys: doubaoApiKeys.slice(0, 1),
        models: arkModels.slice(0, 1),
        temperature: Math.min(settings.temperature || 0.5, 0.5),
        maxTokens: Math.min(settings.maxTokens || 9000, 9000),
        requestTimeoutMs: 240000,
        payloadExtras: {
          response_format: { type: "text" },
        },
      });
    }
    if (!providers.length) {
      throw new ServiceUnavailableException("小红书营销策划方案模型配置读取失败");
    }
    return providers;
  }

  private async loadDouyinMarketingProviderConfigs(settings: ModelGenerationSettings): Promise<XiaohongshuMarketingProviderConfig[]> {
    return this.loadXiaohongshuMarketingProviderConfigs(settings);
  }

  private async loadXiaohongshuMarketingCalendarProviderConfigs(settings: ModelGenerationSettings): Promise<XiaohongshuMarketingProviderConfig[]> {
    const preferredModels = ["deepseek-v4-pro", "kimi-k2.6", "doubao-seed-2-0-pro-260215"];
    const requestedModels = this.orderModels(
      this.parseDelimitedModels(settings.modelName).filter(
        (item) =>
          item === "deepseek-v4-pro" ||
          item === "kimi-k2.6" ||
          item === "doubao-seed-2-0-pro-260215",
      ),
      preferredModels,
    );
    const effectiveRequestedModels = requestedModels.length ? requestedModels : preferredModels;

    const [deepseekProvider, kimiProvider, doubaoProvider] = await Promise.all([
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-deepseek"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-kimi"),
      this.apiProvidersService.findActiveProviderByRuntimeKey("text-domestic-doubao"),
    ]);
    const [deepseekApiKeys, kimiApiKeys, doubaoApiKeys] = await Promise.all([
      this.resolveBrandAwareApiKeys(settings.brandId, deepseekProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, kimiProvider),
      this.resolveBrandAwareApiKeys(settings.brandId, doubaoProvider),
    ]);
    const deepseekModels = deepseekProvider
      ? this.pickProviderModels(deepseekProvider.modelWhitelist, effectiveRequestedModels, ["deepseek-v4-pro", "deepseek-v4-flash"])
      : [];
    const kimiModels = kimiProvider
      ? this.pickProviderModels(kimiProvider.modelWhitelist, effectiveRequestedModels, ["kimi-k2.6"])
      : [];
    const arkModels = doubaoProvider
      ? this.pickProviderModels(doubaoProvider.modelWhitelist, effectiveRequestedModels, ["doubao-seed-2-0-pro-260215"])
      : [];

    const providers: XiaohongshuMarketingProviderConfig[] = [];
    if (deepseekProvider && deepseekModels.length && deepseekApiKeys.length) {
      providers.push({
        provider: "DEEPSEEK",
        baseUrls: this.apiProvidersService.getBaseUrls(deepseekProvider),
        completionPath: this.apiProvidersService.getStringExtra(deepseekProvider, "completionPath") || "/chat/completions",
        apiKeys: deepseekApiKeys.slice(0, 2),
        models: deepseekModels,
        temperature: Math.min(settings.temperature || 0.3, 0.3),
        maxTokens: Math.min(settings.maxTokens || 9000, 9000),
        requestTimeoutMs: 240000,
        payloadExtras: {
          response_format: { type: "json_object" },
          thinking: { type: "disabled" },
        },
      });
    }
    if (kimiProvider && kimiModels.length && kimiApiKeys.length) {
      providers.push({
        provider: "KIMI",
        baseUrls: this.apiProvidersService.getBaseUrls(kimiProvider),
        completionPath: this.apiProvidersService.getStringExtra(kimiProvider, "completionPath") || "/chat/completions",
        apiKeys: kimiApiKeys.slice(0, 1),
        models: kimiModels,
        temperature: 1,
        maxTokens: Math.min(settings.maxTokens || 9000, 9000),
        requestTimeoutMs: 360000,
        tokenLimitField: "max_completion_tokens",
        payloadExtras: {
          response_format: { type: "json_object" },
        },
      });
    }
    if (doubaoProvider && arkModels.length && doubaoApiKeys.length) {
      providers.push({
        provider: "ARK",
        baseUrls: this.apiProvidersService.getBaseUrls(doubaoProvider),
        completionPath: this.apiProvidersService.getStringExtra(doubaoProvider, "completionPath") || "/chat/completions",
        apiKeys: doubaoApiKeys.slice(0, 1),
        models: arkModels.slice(0, 1),
        temperature: Math.min(settings.temperature || 0.5, 0.5),
        maxTokens: Math.min(settings.maxTokens || 9000, 9000),
        requestTimeoutMs: 240000,
        payloadExtras: {
          response_format: { type: "json_object" },
        },
      });
    }
    if (!providers.length) {
      throw new ServiceUnavailableException("营销日历模型配置读取失败");
    }
    return providers;
  }

  private buildAnnualMarketingProviderPayload(
    provider: AnnualMarketingProviderConfig,
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
  ) {
    const payload: Record<string, unknown> = {
      model: modelName,
      stream: false,
      temperature: provider.temperatureOverride ?? provider.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(provider.payloadExtras ?? {}),
    };
    payload[provider.tokenLimitField === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens"] = provider.maxTokens;
    return payload;
  }

  private buildXiaohongshuMarketingProviderPayload(
    provider: XiaohongshuMarketingProviderConfig,
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
  ) {
    const payload: Record<string, unknown> = {
      model: modelName,
      stream: false,
      temperature: provider.temperatureOverride ?? provider.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      ...(provider.payloadExtras ?? {}),
    };
    payload[provider.tokenLimitField === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens"] = provider.maxTokens;
    return payload;
  }

  private async resolvePreferredProvider(
    providerName: string | undefined,
    runtimeKey: string,
    allowedRuntimeKeys: string[] = [runtimeKey],
    preferredValues: string[] = [],
  ) {
    const activeProviders = await this.apiProvidersService.listActiveProviders();
    const preferredProviderIds = this.extractPreferredProviderIds(...preferredValues);
    for (const providerId of preferredProviderIds) {
      const matched = activeProviders.find((item) => item.id === providerId);
      const matchedRuntimeKey = matched ? this.apiProvidersService.getRuntimeKey(matched) : "";
      if (matched && (!allowedRuntimeKeys.length || allowedRuntimeKeys.includes(matchedRuntimeKey))) {
        return matched;
      }
    }
    if (providerName?.trim()) {
      const matched = activeProviders.find((item) => item.name === providerName.trim());
      const matchedRuntimeKey = matched ? this.apiProvidersService.getRuntimeKey(matched) : "";
      if (matched && (!allowedRuntimeKeys.length || allowedRuntimeKeys.includes(matchedRuntimeKey))) {
        return matched;
      }
    }
    for (const allowedRuntimeKey of allowedRuntimeKeys) {
      const matched = activeProviders.find((item) => this.apiProvidersService.getRuntimeKey(item) === allowedRuntimeKey);
      if (matched) {
        return matched;
      }
    }
    return activeProviders.find((item) => this.apiProvidersService.getRuntimeKey(item) === runtimeKey);
  }

  private async resolveRuntimeProviderByBaseUrl(
    runtimeKey: string,
    baseUrl?: string,
    preferredProviderIds: string[] = [],
    errorMessage?: string,
  ) {
    const providers = await this.apiProvidersService.listActiveProvidersByRuntimeKey(runtimeKey);
    for (const providerId of preferredProviderIds) {
      const matched = providers.find((item) => item.id === providerId);
      if (matched) {
        return matched;
      }
    }
    const normalizedBaseUrl = this.normalizeProviderBaseUrl(baseUrl);
    if (normalizedBaseUrl) {
      const matched = providers.find((item) =>
        this.apiProvidersService.getBaseUrls(item).some((providerBaseUrl) => this.normalizeProviderBaseUrl(providerBaseUrl) === normalizedBaseUrl),
      );
      if (matched) {
        return matched;
      }
    }
    if (providers[0]) {
      return providers[0];
    }
    if (errorMessage) {
      throw new ServiceUnavailableException(errorMessage);
    }
    return undefined;
  }

  private normalizeProviderBaseUrl(value?: string) {
    return String(value || "").trim().replace(/\/+$/, "").toLowerCase();
  }

  private async requireRuntimeProvider(runtimeKey: string, errorMessage: string) {
    const provider = await this.apiProvidersService.findActiveProviderByRuntimeKey(runtimeKey);
    if (!provider) {
      throw new ServiceUnavailableException(errorMessage);
    }
    return provider;
  }

  private pickProviderModels(availableModels: string[], requestedModels: string[], preferredModels: string[]) {
    const normalizedAvailable = availableModels.map((item) => item.trim()).filter(Boolean);
    const normalizedRequested = requestedModels.map((item) => item.trim()).filter(Boolean);
    const target = normalizedRequested.length
      ? normalizedAvailable.filter((item) => normalizedRequested.includes(item))
      : normalizedAvailable;
    return this.orderModels(target.length ? target : normalizedAvailable, preferredModels);
  }

  async getReportAsset(brandId: string, fileName: string) {
    const safeFileName = this.sanitizeStoredFileName(fileName);
    const file = await this.ossStorageService.getObject(this.buildReportAssetStorageKey(brandId, safeFileName));
    if (!file) {
      throw new NotFoundException("报告附件不存在");
    }
    return file;
  }

  private async persistReportHtml(storageKey: string, htmlContent: string) {
    await this.ossStorageService.putObject(storageKey, Buffer.from(htmlContent, "utf8"), "text/html; charset=utf-8");
  }

  private buildReportAssetStorageKey(brandId: string, fileName: string) {
    return `reports/${brandId}/${fileName}`;
  }

  private buildReportAssetUrl(brandId: string, fileName: string) {
    return `${this.appConfigService.getServerBaseUrl()}/api/reports/brands/${brandId}/assets/${encodeURIComponent(fileName)}`;
  }

  private buildGrowthReportFileName(taskId: string) {
    return `growth-report-${taskId}.html`;
  }

  private buildVisualGrowthReportFileName(taskId: string) {
    return `visual-growth-report-${taskId}.html`;
  }

  private buildAnnualMarketingPlanFileName(taskId: string) {
    return `half-year-marketing-plan-${taskId}.html`;
  }

  private buildXiaohongshuMarketingPlanFileName(taskId: string) {
    return `xiaohongshu-marketing-plan-${taskId}.html`;
  }

  private buildDouyinMarketingPlanFileName(taskId: string) {
    return `douyin-marketing-plan-${taskId}.html`;
  }

  private extractFileNameFromStorageKey(storageKey: string) {
    const normalized = storageKey.split("?")[0]?.split("#")[0] ?? "";
    const parts = normalized.split("/");
    return this.sanitizeStoredFileName(parts[parts.length - 1] ?? "");
  }

  private sanitizeStoredFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, "");
  }

  private buildManualReportResult(reportMarkdown: string, nextTitle?: string) {
    const title = nextTitle?.trim() || this.extractMarkdownTitle(reportMarkdown) || "品牌增长报告";
    const summary = this.extractMarkdownSummary(reportMarkdown) || "品牌增长报告已更新。";
    return {
      title,
      summary,
      reportMarkdown,
      htmlContent: this.renderMarkdownToHtml(reportMarkdown),
    };
  }

  private buildManualVisualReportResult(htmlBody: string, nextTitle?: string) {
    const title = nextTitle?.trim() || "品牌增长可视化报告";
    const summary = "品牌增长可视化报告已更新。";
    return {
      title,
      summary,
      htmlBody,
      htmlDocument: this.buildVisualReportDocument(title, htmlBody),
    };
  }

  private buildManualXiaohongshuMarketingPlanResult(reportMarkdown: string, nextTitle?: string) {
    const title = nextTitle?.trim() || this.extractMarkdownTitle(reportMarkdown) || "灏忕孩涔﹁惀閿€绛栧垝鏂规";
    const summary = this.extractMarkdownSummary(reportMarkdown) || "灏忕孩涔﹁惀閿€绛栧垝鏂规宸叉洿鏂般€";
    return {
      title,
      summary,
      reportMarkdown,
      htmlContent: this.renderMarkdownToHtml(reportMarkdown),
    };
  }

  private buildManualDouyinMarketingPlanResult(reportMarkdown: string, nextTitle?: string) {
    const title = nextTitle?.trim() || this.extractMarkdownTitle(reportMarkdown) || "抖音营销策划方案";
    const summary = this.extractMarkdownSummary(reportMarkdown) || "抖音营销策划方案已更新。";
    return {
      title,
      summary,
      reportMarkdown,
      htmlContent: this.renderMarkdownToHtml(reportMarkdown),
    };
  }

  private buildManualXiaohongshuMarketingCalendarResult(items: XiaohongshuMarketingCalendarItem[], nextTitle?: string) {
    const normalizedItems = this.normalizeXiaohongshuMarketingCalendarItems(items);
    return {
      title: nextTitle?.trim() || "营销日历",
      summary: normalizedItems.length ? `已更新 ${normalizedItems.length} 天营销日历。` : "营销日历已更新。",
      items: normalizedItems,
    };
  }

  private buildVisualReportDocument(title: string, htmlBody: string) {
    return [
      "<!DOCTYPE html>",
      '<html lang="zh-CN">',
      "<head>",
      '  <meta charset="utf-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
      `  <title>${this.escapeHtml(title)}</title>`,
      '  <style>html,body{margin:0;padding:0;background:#f5f7fb;font-family:"PingFang SC","Microsoft YaHei",sans-serif;}*{box-sizing:border-box;}</style>',
      "</head>",
      `<body>${htmlBody}</body>`,
      "</html>",
    ].join("");
  }

  private isPlaceholderProxyBaseUrl(value: string) {
    try {
      const hostname = new URL(value).hostname.toLowerCase();
      return hostname.endsWith(".local");
    } catch {
      return false;
    }
  }

  private containsXiaohongshuWorkflowArtifacts(content: string) {
    const normalized = content.toLowerCase();
    const patterns = [
      "create_file(",
      "edit_file(",
      "write_file_section",
      "<tool_call>",
      "<tool_response>",
      "\"name\": \"create_file\"",
      "\"name\": \"edit_file\"",
      "let me write this in sections",
      "i'll now write the full document",
      "i will write the full document",
      "鍒嗗涓枃浠跺潡鍐欏叆",
      "鍏堝垱寤烘柟妗堟枃浠剁殑绗竴閮ㄥ垎",
      "鍏堣緭鍑烘柟妗堟枃浠剁殑绗竴閮ㄥ垎",
      "缁啓涓嬩竴閮ㄥ垎",
      "section 1:",
    ];
    return patterns.some((item) => normalized.includes(item));
  }

  private isCompleteXiaohongshuMarketingMarkdown(markdown: string) {
    const hasTitle = /^#\s+.+/m.test(markdown);
    const requiredSections = ["## 一、", "## 二、", "## 三、", "## 四、", "## 五、"];
    const normalized = markdown.replace(/\s+/g, "");
    const hasRequiredSections = requiredSections.every((item) => normalized.includes(item.replace(/\s+/g, "")));
    if (!hasTitle || !hasRequiredSections) {
      return false;
    }

    if (/```markdown\s*$/i.test(markdown.trim())) {
      return false;
    }

    const tail = markdown.trim().slice(-240).toLowerCase();
    if (
      tail.includes("to be continued")
      || tail.includes("鏈畬寰呯画")
      || tail.includes("涓嬩竴閮ㄥ垎")
      || tail.includes("section ")
      || tail.includes("write_file_section")
      || tail.includes("<tool_call>")
    ) {
      return false;
    }

    return true;
  }

  private ensureXiaohongshuMarkdownTitle(markdown: string, fallbackTitle: string) {
    const normalized = markdown.trim();
    return normalized.startsWith("# ")
      ? normalized
      : `# ${fallbackTitle}\n\n${normalized}`;
  }

  private matchesXiaohongshuHeading(line: string, headingPrefix: string) {
    const trimmedLine = line.trim();
    const headingMatch = trimmedLine.match(/^(#{2,})\s*(.+)$/);
    if (!headingMatch) {
      return false;
    }
    const currentHeadingText = headingMatch[2].replace(/\s+/g, "");
    const targetHeadingText = headingPrefix.replace(/^#+\s*/, "").replace(/\s+/g, "");
    return currentHeadingText.startsWith(targetHeadingText);
  }

  private extractMarkdownPrefixBeforeHeading(markdown: string, firstHeadingPrefix: string) {
    const lines = markdown.split(/\r?\n/);
    const titleIndex = lines.findIndex((line) => line.trim().startsWith("# "));
    const headingIndex = lines.findIndex((line) => this.matchesXiaohongshuHeading(line, firstHeadingPrefix));
    if (headingIndex <= 0) {
      return "";
    }
    const startIndex = titleIndex >= 0 ? titleIndex + 1 : 0;
    return lines.slice(startIndex, headingIndex).join("\n").trim();
  }

  private extractMarkdownSection(markdown: string, headingPrefix: string, nextHeadingPrefixes: string[]) {
    const lines = markdown.split(/\r?\n/);
    const startIndex = lines.findIndex((line) => this.matchesXiaohongshuHeading(line, headingPrefix));
    if (startIndex < 0) {
      return "";
    }
    let endIndex = lines.length;
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const current = lines[index];
      if (nextHeadingPrefixes.some((item) => this.matchesXiaohongshuHeading(current, item))) {
        endIndex = index;
        break;
      }
    }
    return lines.slice(startIndex, endIndex).join("\n").trim();
  }

  private isUsableXiaohongshuMarketingPlanRecord(record: XiaohongshuMarketingPlanRecord) {
    const markdown = record.reportMarkdown?.trim();
    if (!markdown) {
      return false;
    }
    if (this.containsXiaohongshuWorkflowArtifacts(markdown)) {
      return false;
    }
    return this.isCompleteXiaohongshuMarketingMarkdown(markdown);
  }

  private isCompleteDouyinMarketingMarkdown(markdown: string) {
    const normalized = markdown.trim();
    if (!/^#\s+.+/m.test(normalized)) {
      return false;
    }
    if ((normalized.match(/^##\s+.+/gm) || []).length < 3) {
      return false;
    }
    if (/```markdown\s*$/i.test(normalized)) {
      return false;
    }
    const tail = normalized.slice(-240).toLowerCase();
    if (
      tail.includes("to be continued")
      || tail.includes("未完待续")
      || tail.includes("下一部分")
      || tail.includes("section ")
      || tail.includes("write_file_section")
      || tail.includes("<tool_call>")
    ) {
      return false;
    }
    return true;
  }

  private isUsableDouyinMarketingPlanRecord(record: DouyinMarketingPlanRecord) {
    const markdown = record.reportMarkdown?.trim();
    if (!markdown) {
      return false;
    }
    if (this.containsXiaohongshuWorkflowArtifacts(markdown)) {
      return false;
    }
    return this.isCompleteDouyinMarketingMarkdown(markdown);
  }

  private renderVisualOutlineToHtml(outline: VisualReportOutlineModelResult) {
    const metricCards = outline.metrics
      .map((item) => [
        '<div style="flex:1 1 180px;min-width:180px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.14);backdrop-filter:blur(6px);">',
        `<div style="font-size:13px;opacity:0.82;margin-bottom:8px;">${this.escapeHtml(item.label)}</div>`,
        `<div style="font-size:34px;font-weight:700;line-height:1.1;margin-bottom:8px;">${this.escapeHtml(item.value)}</div>`,
        `<div style="font-size:13px;line-height:1.7;opacity:0.86;">${this.escapeHtml(item.note)}</div>`,
        "</div>",
      ].join(""))
      .join("");

    const sectionBlocks = outline.sections
      .map((section, index) => {
        const bullets = section.bullets.length
          ? `<ul style="margin:16px 0 0;padding-left:20px;color:#4b5563;font-size:15px;line-height:1.8;">${section.bullets.map((item) => `<li style="margin-bottom:8px;">${this.escapeHtml(item)}</li>`).join("")}</ul>`
          : "";
        return [
          '<section style="padding:28px;border-radius:24px;background:#ffffff;border:1px solid #ebe7df;box-shadow:0 12px 30px rgba(111,78,55,0.08);">',
          `<div style="display:inline-flex;align-items:center;padding:6px 12px;border-radius:999px;background:#f7efe4;color:#9a5317;font-size:12px;font-weight:600;margin-bottom:14px;">0${index + 1}</div>`,
          `<h2 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#2f241d;">${this.escapeHtml(section.title)}</h2>`,
          `<p style="margin:0;color:#5b534b;font-size:15px;line-height:1.9;">${this.escapeHtml(section.body)}</p>`,
          bullets,
          "</section>",
        ].join("");
      })
      .join("");

    const actionItems = outline.actionItems
      .map((item) => [
        '<div style="padding:18px 20px;border-radius:18px;background:#fff;border:1px solid #eadfce;">',
        `<div style="font-size:15px;line-height:1.8;color:#473b33;">${this.escapeHtml(item)}</div>`,
        "</div>",
      ].join(""))
      .join("");

    return [
      '<div style="min-height:100vh;background:linear-gradient(180deg,#f7f4ef 0%,#f3f5f9 100%);padding:32px 20px 48px;">',
      '<div style="max-width:1120px;margin:0 auto;">',
      '<section style="padding:36px;border-radius:32px;background:linear-gradient(135deg,#7a3b11 0%,#a45a1c 55%,#d9a15f 100%);color:#fff;box-shadow:0 20px 60px rgba(122,59,17,0.28);">',
      `<div style="display:inline-flex;align-items:center;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.14);font-size:12px;font-weight:600;letter-spacing:0.02em;">${this.escapeHtml(outline.eyebrow)}</div>`,
      `<h1 style="margin:18px 0 12px;font-size:46px;line-height:1.18;">${this.escapeHtml(outline.heroTitle)}</h1>`,
      `<p style="margin:0;max-width:760px;font-size:18px;line-height:1.85;color:rgba(255,255,255,0.92);">${this.escapeHtml(outline.heroSubtitle)}</p>`,
      `<div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:28px;">${metricCards}</div>`,
      "</section>",
      '<section style="margin-top:24px;padding:28px;border-radius:24px;background:#fff7ed;border:1px solid #f3dfc4;">',
      '<div style="font-size:13px;font-weight:700;color:#a16207;letter-spacing:0.04em;">鎽樿</div>',
      `<p style="margin:12px 0 0;font-size:16px;line-height:1.9;color:#4b5563;">${this.escapeHtml(outline.summary)}</p>`,
      "</section>",
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:24px;">${sectionBlocks}</div>`,
      '<section style="margin-top:24px;padding:28px;border-radius:28px;background:#2f241d;color:#fff;">',
      `<h2 style="margin:0 0 16px;font-size:26px;line-height:1.3;">${this.escapeHtml(outline.actionTitle)}</h2>`,
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">${actionItems}</div>`,
      "</section>",
      "</div>",
      "</div>",
    ].join("");
  }

  private renderAnnualMarketingPlanToHtml(plan: AnnualMarketingPlanModelResult) {
    const focusTags = plan.planningFocus
      .map((item) => `<span style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:13px;font-weight:600;">${this.escapeHtml(item)}</span>`)
      .join("");
    const rows = plan.items
      .map((item, index) => {
        const background = index % 2 === 0 ? "#f8fafc" : "#eef4fb";
        return [
          `<tr style="background:${background};">`,
          `<td style="padding:14px 12px;border-bottom:1px solid #d9e2ef;font-weight:700;color:#0f172a;">${this.escapeHtml(item.month)}</td>`,
          `<td style="padding:14px 12px;border-bottom:1px solid #d9e2ef;color:#0f172a;">${this.escapeHtml(item.node)}</td>`,
          `<td style="padding:14px 12px;border-bottom:1px solid #d9e2ef;color:#0f172a;">${this.escapeHtml(item.type)}</td>`,
          `<td style="padding:14px 12px;border-bottom:1px solid #d9e2ef;color:#0f172a;">${this.escapeHtml(item.date)}</td>`,
          `<td style="padding:14px 12px;border-bottom:1px solid #d9e2ef;color:#0f172a;line-height:1.7;">${this.escapeHtml(item.marketingTheme)}</td>`,
          `<td style="padding:14px 12px;border-bottom:1px solid #d9e2ef;color:#334155;line-height:1.7;">${this.escapeHtml(item.platforms.join("、"))}</td>`,
          `<td style="padding:14px 12px;border-bottom:1px solid #d9e2ef;color:#334155;line-height:1.7;">${this.escapeHtml(item.strategy)}</td>`,
          `<td style="padding:14px 12px;border-bottom:1px solid #d9e2ef;color:#334155;line-height:1.7;">${this.escapeHtml(item.products.join("、") || "-")}</td>`,
          "</tr>",
        ].join("");
      })
      .join("");

    return [
      '<div style="min-height:100vh;background:linear-gradient(180deg,#f4f8ff 0%,#eef3f8 100%);padding:28px 18px 44px;">',
      '<div style="max-width:1240px;margin:0 auto;">',
      '<section style="padding:28px 28px 26px;border-radius:28px;background:linear-gradient(135deg,#2b5fa9 0%,#4d83c7 55%,#86aee2 100%);color:#fff;box-shadow:0 20px 60px rgba(43,95,169,0.22);">',
      `<div style="display:inline-flex;align-items:center;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,0.16);font-size:12px;font-weight:700;">${this.escapeHtml(plan.planningYear)} 半年营销节奏规划</div>`,
      `<h1 style="margin:18px 0 12px;font-size:40px;line-height:1.18;">${this.escapeHtml(plan.title)}</h1>`,
      `<p style="margin:0;max-width:900px;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);">${this.escapeHtml(plan.summary)}</p>`,
      `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;">${focusTags}</div>`,
      '</section>',
      '<section style="margin-top:22px;padding:22px;border-radius:24px;background:#ffffff;border:1px solid #dbe5f0;">',
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;">',
      '<div>',
      '<div style="font-size:14px;font-weight:700;color:#2b5fa9;">半年营销规划表</div>',
      '<div style="margin-top:6px;font-size:14px;line-height:1.8;color:#475569;">按未来半年月份、节点、日期、类型、营销主题、策略、平台和产品进行统一编排，便于后续执行与拆分。</div>',
      '</div>',
      `<div style="padding:12px 16px;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:13px;font-weight:700;">规划条目 ${plan.items.length} 条</div>`,
      '</div>',
      '<div style="margin-top:18px;overflow:auto;border-radius:20px;border:1px solid #cbd5e1;">',
      '<table style="width:100%;border-collapse:collapse;min-width:1120px;background:#fff;">',
      '<thead>',
      '<tr style="background:#4d83c7;color:#fff;">',
      '<th style="padding:14px 12px;text-align:left;font-size:14px;">月份</th>',
      '<th style="padding:14px 12px;text-align:left;font-size:14px;">节点</th>',
      '<th style="padding:14px 12px;text-align:left;font-size:14px;">类型</th>',
      '<th style="padding:14px 12px;text-align:left;font-size:14px;">日期</th>',
      '<th style="padding:14px 12px;text-align:left;font-size:14px;">营销主题</th>',
      '<th style="padding:14px 12px;text-align:left;font-size:14px;">平台</th>',
      '<th style="padding:14px 12px;text-align:left;font-size:14px;">营销策略</th>',
      '<th style="padding:14px 12px;text-align:left;font-size:14px;">产品</th>',
      '</tr>',
      '</thead>',
      `<tbody>${rows}</tbody>`,
      '</table>',
      '</div>',
      '</section>',
      '</div>',
      '</div>',
    ].join("");
  }

  private extractHtmlBodyContent(content: string) {
    const trimmed = content.trim();
    const fencedMatch = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1]?.trim() || trimmed;
    if (!candidate) {
      return "";
    }
    if (candidate.startsWith("{") && candidate.includes("\"htmlBody\"")) {
      return "";
    }
    if (candidate.includes("<body")) {
      const bodyMatch = candidate.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      return bodyMatch?.[1]?.trim() || "";
    }
    return candidate.includes("<") ? candidate : "";
  }

  private extractJsonStringField(content: string, fieldName: string) {
    const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`"${escapedFieldName}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "s");
    const match = content.match(pattern);
    if (!match?.[1]) {
      return "";
    }

    try {
      return JSON.parse(`"${match[1]}"`) as string;
    } catch {
      return match[1]
        .replace(/\\"/g, "\"")
        .replace(/\\\\/g, "\\")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t");
    }
  }

  private assertCompleteVisualHtmlBody(htmlBody: string) {
    const trimmed = htmlBody.trim();
    if (!trimmed) {
      throw new ServiceUnavailableException("鍝佺墝澧為暱鍙鍖栨姤鍛婅В鏋愬け璐ワ細htmlBody 涓虹┖");
    }
    if (!trimmed.endsWith(">")) {
      throw new ServiceUnavailableException("鍝佺墝澧為暱鍙鍖栨姤鍛婅В鏋愬け璐ワ細htmlBody 鐤戜技琚埅鏂");
    }
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

  private resolveModelAttemptTimeoutMs(configuredTimeoutMs: number | undefined, defaultTimeoutMs: number) {
    if (configuredTimeoutMs && configuredTimeoutMs > 0) {
      return Math.min(configuredTimeoutMs, defaultTimeoutMs);
    }
    return defaultTimeoutMs;
  }

  private extractMarkdownTitle(markdown: string) {
    const heading = markdown.split(/\r?\n/).find((line) => line.trim().startsWith("# "));
    return heading ? heading.trim().slice(2).trim() : "";
  }

  private extractMarkdownSummary(markdown: string) {
    const lines = markdown.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const summaryLine = lines.find((line) => !line.startsWith("#") && !line.startsWith("- "));
    return summaryLine || "";
  }

  private resolveCalendarStartDate(lastHistoryDate: string | undefined, generatedAt: string) {
    const start = lastHistoryDate ? new Date(`${lastHistoryDate}T00:00:00+08:00`) : new Date(generatedAt);
    if (lastHistoryDate) {
      start.setDate(start.getDate() + 1);
    }
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  }

  private buildExpectedCalendarDates(startDate: string, days: number) {
    if (!startDate || !Number.isFinite(days) || days <= 0) {
      return [];
    }
    return Array.from({ length: days }, (_, index) => this.shiftDate(startDate, index)).filter(Boolean);
  }

  private normalizeXiaohongshuMarketingCalendarModelResult(
    content: string,
    inputPayload: Record<string, unknown>,
    modelName: string,
  ): XiaohongshuMarketingCalendarModelResult {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(this.extractJsonObject(this.stripMarkdownCodeFence(content))) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException("营销日历解析失败：模型未返回有效 JSON");
    }

    const startDate = String(inputPayload.startDate ?? "").trim();
    const title = String(parsed.title ?? "").trim() || "营销日历";
    const items = this.normalizeXiaohongshuMarketingCalendarItems(parsed.items, startDate);
    if (items.length < 7) {
      throw new ServiceUnavailableException(`营销日历解析失败：返回天数不足 7 天（实际 ${items.length} 天）`);
    }
    return {
      title,
      summary: String(parsed.summary ?? "").trim() || `已生成从 ${startDate} 开始的 7 天营销日历。`,
      items: items.slice(0, 7),
      modelName,
    };
  }

  private normalizeDouyinHotTopicCandidateItems(raw: unknown): DouyinHotTopicCandidateItem[] {
    const items = Array.isArray(raw) ? raw : [];
    return items
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map<DouyinHotTopicCandidateItem | undefined>((item, index) => {
        const title = String(item.title ?? item.topicTitle ?? item.topicName ?? item.name ?? "").trim();
        return title
          ? {
              id: String(item.id ?? "").trim() || `topic-${index + 1}-${this.createSlug(title)}`,
              title,
              checked: Boolean(item.checked),
            }
          : undefined;
      })
      .filter((item): item is DouyinHotTopicCandidateItem => Boolean(item));
  }

  private parseDouyinHotTopicCandidateItemsFromText(content: string) {
    const lines = this.stripMarkdownCodeFence(content)
      .split(/\r?\n/)
      .map((line) => line.trim());
    const structuredTitles = this.extractDouyinHotTopicTitlesFromStructuredText(lines);
    if (structuredTitles.length) {
      return structuredTitles.map((title, index) => ({
        id: `topic-${index + 1}-${this.createSlug(title)}`,
        title,
        checked: false,
      }));
    }
    const normalized = lines
      .map((line) => line.replace(/^[-*•\d.\s\[\]xX()（）]+/, "").trim())
      .filter(Boolean)
      .filter((line) => !/^(\[?热点借势策略分析报告\]?|一、基础信息|二、热点分析|三、行业匹配度分析|四、推荐策略|五、预期效果)$/.test(line));
    const uniqueTitles: string[] = [];
    for (const line of normalized) {
      if (!line || uniqueTitles.includes(line)) {
        continue;
      }
      uniqueTitles.push(line);
      if (uniqueTitles.length >= 3) {
        break;
      }
    }
    return uniqueTitles.map((title, index) => ({
      id: `topic-${index + 1}-${this.createSlug(title)}`,
      title,
      checked: false,
    }));
  }

  private extractDouyinHotTopicTitlesFromStructuredText(lines: string[]) {
    const titles: string[] = [];
    const headingPattern = /^热点选题([一二三四五六七八九十\d]+)\s*[:：]?\s*(.*)$/;
    const titleFieldPattern = /^(?:[-*•]\s*)?(?:选题标题|标题|热点名称)\s*[:：]\s*(.+)$/;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const headingMatch = line.match(headingPattern);
      if (!headingMatch) {
        continue;
      }

      const inlineTitle = String(headingMatch[2] || "").trim();
      if (inlineTitle) {
        if (!titles.includes(inlineTitle)) {
          titles.push(inlineTitle);
        }
        if (titles.length >= 3) {
          break;
        }
        continue;
      }

      for (let lookAhead = index + 1; lookAhead < lines.length; lookAhead += 1) {
        const nextLine = lines[lookAhead];
        if (headingPattern.test(nextLine)) {
          break;
        }
        const titleFieldMatch = nextLine.match(titleFieldPattern);
        if (!titleFieldMatch) {
          continue;
        }
        const resolvedTitle = String(titleFieldMatch[1] || "").trim();
        if (resolvedTitle && !titles.includes(resolvedTitle)) {
          titles.push(resolvedTitle);
        }
        break;
      }

      if (titles.length >= 3) {
        break;
      }
    }

    return titles.slice(0, 3);
  }

  private createSlug(value: string) {
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return normalized || createId("topic");
  }

  private normalizeXiaohongshuMarketingCalendarItems(raw: unknown, startDate?: string) {
    const items = Array.isArray(raw) ? raw : [];
    const normalized = items
      .map((item) => this.asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item, index) => {
        const date = String(item.date ?? "").trim() || this.shiftDate(startDate, index);
        const topicName = String(item.topicName ?? "").trim();
        return {
        id: this.resolveCalendarItemId(item, {
          index,
          date,
          topicName,
        }),
        date,
        topicName,
        productName: String(item.productName ?? "").trim() || undefined,
        noteType: String(item.noteType ?? "").trim() || undefined,
        targetAudience: String(item.targetAudience ?? "").trim() || undefined,
        contentGoal: String(item.contentGoal ?? "").trim() || undefined,
        expressionFocus: String(item.expressionFocus ?? "").trim() || undefined,
        topicContent: String(item.topicContent ?? "").trim() || undefined,
        noteKeywords: this.normalizeStringArray(item.noteKeywords, [], 6),
        titleDirections: this.normalizeStringArray(item.titleDirections, [], 3),
        bodyStructure: String(item.bodyStructure ?? "").trim() || undefined,
        coverFormat: String(item.coverFormat ?? "").trim() || undefined,
        coverKeywords: this.normalizeStringArray(item.coverKeywords, [], 6),
        imageBrief: String(item.imageBrief ?? "").trim() || undefined,
      };
      })
      .filter((item) => item.date && item.topicName);
    return normalized;
  }

  private resolveCalendarItemId(
    item: Record<string, unknown>,
    params: {
      index: number;
      date: string;
      topicName: string;
    },
  ) {
    const rawId = String(item.id ?? "").trim();
    if (rawId) {
      return rawId;
    }

    const seed = `${params.date}|${params.topicName}|${params.index}`;
    const digest = createHash("sha1").update(seed).digest("hex").slice(0, 12);
    return `cal_${digest}`;
  }

  private shiftDate(startDate: string | undefined, offset: number) {
    if (!startDate) {
      return "";
    }
    const current = new Date(`${startDate}T00:00:00+08:00`);
    current.setDate(current.getDate() + offset);
    return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
  }

  private loadXiaohongshuMarketingCalendarPrompt() {
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), "提示词", "营销日历提示词.txt"),
      resolve(this.resolveOperationRoot(), "提示词", "营销日历提示词.txt"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8").trim();
      }
    }
    return XHS_MARKETING_CALENDAR_PROMPT_FALLBACK;
  }

  private loadDouyinHotTopicCandidatesPrompt() {
    const candidates = [
      resolve(this.resolveAiWorkspaceRoot(), "提示词", "抖音板块", "热点找选题.txt"),
      resolve(this.resolveOperationRoot(), "提示词", "抖音板块", "热点找选题.txt"),
    ];
    for (const filePath of candidates) {
      if (existsSync(filePath)) {
        return readFileSync(filePath, "utf8").trim();
      }
    }
    return "你是抖音热点选题策划助手，需要基于所选日期的热点榜单和品牌背景资料，输出 3 个可执行的抖音选题。";
  }

  private extractJsonObject(content: string) {
    const trimmed = this.stripMarkdownCodeFence(content).trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed;
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return trimmed.slice(start, end + 1);
    }

    return trimmed;
  }

  private stripMarkdownCodeFence(content: string) {
    return content
      .trim()
      .replace(/^```(?:json|html)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  private renderMarkdownToHtml(markdown: string) {
    const lines = markdown.split(/\r?\n/);
    const html: string[] = [];
    let inList = false;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        continue;
      }

      if (line.startsWith("- ")) {
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }
        html.push(`<li>${this.escapeHtml(line.slice(2))}</li>`);
        continue;
      }

      if (inList) {
        html.push("</ul>");
        inList = false;
      }

      if (line.startsWith("### ")) {
        html.push(`<h3>${this.escapeHtml(line.slice(4))}</h3>`);
        continue;
      }
      if (line.startsWith("## ")) {
        html.push(`<h2>${this.escapeHtml(line.slice(3))}</h2>`);
        continue;
      }
      if (line.startsWith("# ")) {
        html.push(`<h1>${this.escapeHtml(line.slice(2))}</h1>`);
        continue;
      }

      html.push(`<p>${this.escapeHtml(line)}</p>`);
    }

    if (inList) {
      html.push("</ul>");
    }

    return `<section class="generated-report-markdown">${html.join("")}</section>`;
  }

  private truncateText(value?: string, maxLength = 300) {
    if (!value) {
      return "";
    }
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private asRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
  }

  private readNestedRecord(source: unknown, path: string[]) {
    let current = this.asRecord(source);
    for (const key of path) {
      current = this.asRecord(current?.[key]);
      if (!current) {
        return undefined;
      }
    }
    return current;
  }

  private readRecordString(record: Record<string, unknown> | undefined, key: string) {
    const value = record?.[key];
    return typeof value === "string" ? value.trim() : "";
  }

  private readRecordStringArray(record: Record<string, unknown> | undefined, key: string) {
    const value = record?.[key];
    return Array.isArray(value)
      ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
  }

  private readRecordNumber(record: Record<string, unknown> | undefined, key: string) {
    const value = record?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  private mapGrowthReportAsset(asset: AssetRecord): GrowthReportRecord | undefined {
    const meta = this.asMeta(asset.metadataJson);
    if (meta.kind !== "BRAND_GROWTH_REPORT") {
      return undefined;
    }

    return {
      id: asset.id,
      title: asset.title,
      summary: this.readMetaString(meta, "summary") || asset.description,
      generatedAt: this.readMetaString(meta, "generatedAt"),
      taskId: this.readMetaString(meta, "taskId") || undefined,
      mediaId: this.readMetaString(meta, "mediaId") || undefined,
      reportMarkdown: this.readMetaString(meta, "reportMarkdown"),
      htmlContent: this.readMetaString(meta, "htmlContent"),
      diagnosis: this.readMetaStringArray(meta, "diagnosis"),
      opportunities: this.readMetaStringArray(meta, "opportunities"),
      nextActions: this.readMetaStringArray(meta, "nextActions"),
      metrics: this.readMetaMetrics(meta),
    };
  }

  private mapVisualGrowthReportAsset(asset: AssetRecord): VisualGrowthReportRecord | undefined {
    const meta = this.asMeta(asset.metadataJson);
    if (meta.kind !== "BRAND_GROWTH_VISUAL_REPORT") {
      return undefined;
    }

    return {
      id: asset.id,
      title: asset.title,
      summary: this.readMetaString(meta, "summary") || asset.description,
      generatedAt: this.readMetaString(meta, "generatedAt"),
      taskId: this.readMetaString(meta, "taskId") || undefined,
      mediaId: this.readMetaString(meta, "mediaId") || undefined,
      sourceReportId: this.readMetaString(meta, "sourceReportId") || undefined,
      sourceReportTitle: this.readMetaString(meta, "sourceReportTitle") || undefined,
      htmlBody: this.readMetaString(meta, "htmlBody"),
      htmlDocument: this.readMetaString(meta, "htmlDocument"),
    };
  }

  private mapAnnualMarketingPlanAsset(asset: AssetRecord): AnnualMarketingPlanRecord | undefined {
    const meta = this.asMeta(asset.metadataJson);
    if (!HALF_YEAR_MARKETING_PLAN_ASSET_KINDS.includes(meta.kind as (typeof HALF_YEAR_MARKETING_PLAN_ASSET_KINDS)[number])) {
      return undefined;
    }

    return {
      id: asset.id,
      title: asset.title,
      summary: this.readMetaString(meta, "summary") || asset.description,
      generatedAt: this.readMetaString(meta, "generatedAt"),
      taskId: this.readMetaString(meta, "taskId") || undefined,
      mediaId: this.readMetaString(meta, "mediaId") || undefined,
      sourceReportId: this.readMetaString(meta, "sourceReportId") || undefined,
      sourceReportTitle: this.readMetaString(meta, "sourceReportTitle") || undefined,
      planningYear: this.readMetaString(meta, "planningYear"),
      planningFocus: this.readMetaStringArray(meta, "planningFocus"),
      items: this.readMetaAnnualMarketingRows(meta),
      htmlBody: this.readMetaString(meta, "htmlBody"),
      htmlDocument: this.readMetaString(meta, "htmlDocument"),
    };
  }

  private mapXiaohongshuMarketingPlanAsset(asset: AssetRecord): XiaohongshuMarketingPlanRecord | undefined {
    const meta = this.asMeta(asset.metadataJson);
    if (meta.kind !== "XHS_MARKETING_PLAN") {
      return undefined;
    }

    return {
      id: asset.id,
      title: asset.title,
      summary: this.readMetaString(meta, "summary") || asset.description,
      generatedAt: this.readMetaString(meta, "generatedAt"),
      taskId: this.readMetaString(meta, "taskId") || undefined,
      mediaId: this.readMetaString(meta, "mediaId") || undefined,
      sourceReportId: this.readMetaString(meta, "sourceReportId") || undefined,
      sourceReportTitle: this.readMetaString(meta, "sourceReportTitle") || undefined,
      sourceAnnualPlanId: this.readMetaString(meta, "sourceAnnualPlanId") || undefined,
      sourceAnnualPlanTitle: this.readMetaString(meta, "sourceAnnualPlanTitle") || undefined,
      reportMarkdown: this.readMetaString(meta, "reportMarkdown"),
      htmlContent: this.readMetaString(meta, "htmlContent"),
      modelName: this.readMetaString(meta, "modelName") || undefined,
    };
  }

  private mapDouyinMarketingPlanAsset(asset: AssetRecord): DouyinMarketingPlanRecord | undefined {
    const meta = this.asMeta(asset.metadataJson);
    if (meta.kind !== "DOUYIN_MARKETING_PLAN") {
      return undefined;
    }

    return {
      id: asset.id,
      title: asset.title,
      summary: this.readMetaString(meta, "summary") || asset.description,
      generatedAt: this.readMetaString(meta, "generatedAt"),
      taskId: this.readMetaString(meta, "taskId") || undefined,
      mediaId: this.readMetaString(meta, "mediaId") || undefined,
      sourceReportId: this.readMetaString(meta, "sourceReportId") || undefined,
      sourceReportTitle: this.readMetaString(meta, "sourceReportTitle") || undefined,
      sourceAnnualPlanId: this.readMetaString(meta, "sourceAnnualPlanId") || undefined,
      sourceAnnualPlanTitle: this.readMetaString(meta, "sourceAnnualPlanTitle") || undefined,
      reportMarkdown: this.readMetaString(meta, "reportMarkdown"),
      htmlContent: this.readMetaString(meta, "htmlContent"),
      modelName: this.readMetaString(meta, "modelName") || undefined,
    };
  }

  private mapDouyinHotTopicCandidatesAsset(asset: AssetRecord): DouyinHotTopicCandidatesRecord | undefined {
    const meta = this.asMeta(asset.metadataJson);
    if (meta.kind !== "DOUYIN_HOT_TOPIC_CANDIDATES") {
      return undefined;
    }

    return {
      id: asset.id,
      title: asset.title,
      summary: this.readMetaString(meta, "summary") || asset.description,
      generatedAt: this.readMetaString(meta, "generatedAt"),
      taskId: this.readMetaString(meta, "taskId") || undefined,
      selectedDate: this.readMetaString(meta, "selectedDate"),
      modelName: this.readMetaString(meta, "modelName") || undefined,
      items: this.normalizeDouyinHotTopicCandidateItems(meta.items),
      reportContent: this.readMetaString(meta, "reportContent") || undefined,
    };
  }

  private mapXiaohongshuMarketingCalendarAsset(asset: AssetRecord): XiaohongshuMarketingCalendarRecord | undefined {
    const meta = this.asMeta(asset.metadataJson);
    if (meta.kind !== "XHS_MARKETING_CALENDAR") {
      return undefined;
    }

    return {
      id: asset.id,
      title: asset.title,
      summary: this.readMetaString(meta, "summary") || asset.description,
      generatedAt: this.readMetaString(meta, "generatedAt"),
      taskId: this.readMetaString(meta, "taskId") || undefined,
      sourceReportId: this.readMetaString(meta, "sourceReportId") || undefined,
      sourceReportTitle: this.readMetaString(meta, "sourceReportTitle") || undefined,
      sourceAnnualPlanId: this.readMetaString(meta, "sourceAnnualPlanId") || undefined,
      sourceAnnualPlanTitle: this.readMetaString(meta, "sourceAnnualPlanTitle") || undefined,
      sourceMarketingPlanId: this.readMetaString(meta, "sourceMarketingPlanId") || undefined,
      sourceMarketingPlanTitle: this.readMetaString(meta, "sourceMarketingPlanTitle") || undefined,
      modelName: this.readMetaString(meta, "modelName") || undefined,
      items: this.normalizeXiaohongshuMarketingCalendarItems(meta.items),
    };
  }

  private mapVisualGrowthReportTask(task: {
    id: string;
    taskType: string;
    taskTitle?: string | null;
    taskStatus: TaskStatus | VisualGrowthReportTaskRecord["taskStatus"];
    modelName?: string | null;
    pointsCost: number;
    createdAt: Date | string;
    updatedAt: Date | string;
    startedAt?: Date | string | null;
    finishedAt?: Date | string | null;
    errorMessage?: string | null;
    inputJson?: unknown;
    outputJson?: unknown;
  }): VisualGrowthReportTaskRecord {
    const inputMeta = this.asMeta(task.inputJson);
    const outputMeta = this.asMeta(task.outputJson);
    const toIsoString = (value?: Date | string | null) => {
      if (!value) {
        return undefined;
      }
      return typeof value === "string" ? value : value.toISOString();
    };

    return {
      id: task.id,
      taskType: task.taskType,
      taskTitle: task.taskTitle || "",
      taskStatus: task.taskStatus,
      modelName: task.modelName || "",
      pointsCost: task.pointsCost,
      createdAt: toIsoString(task.createdAt) || new Date().toISOString(),
      updatedAt: toIsoString(task.updatedAt) || new Date().toISOString(),
      startedAt: toIsoString(task.startedAt),
      finishedAt: toIsoString(task.finishedAt),
      errorMessage: task.errorMessage || undefined,
      sourceReportId: this.readMetaString(inputMeta, "sourceReportId") || undefined,
      sourceReportTitle: this.readMetaString(inputMeta, "sourceReportTitle") || undefined,
      phase: this.readMetaString(outputMeta, "phase") || undefined,
      phaseText: this.readMetaString(outputMeta, "phaseText") || undefined,
      phaseIndex: this.asNumber(outputMeta.phaseIndex) || undefined,
      phaseTotal: this.asNumber(outputMeta.phaseTotal) || undefined,
    };
  }

  private readMetaMetrics(meta: Record<string, unknown>) {
    const metrics = meta.metrics;
    if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
      return {
        productCount: 0,
        platformAccountCount: 0,
        competitorAccountCount: 0,
        brandNoteCount: 0,
        benchmarkNoteCount: 0,
      };
    }

    const record = metrics as Record<string, unknown>;
    return {
      productCount: this.asNumber(record.productCount),
      platformAccountCount: this.asNumber(record.platformAccountCount),
      competitorAccountCount: this.asNumber(record.competitorAccountCount),
      brandNoteCount: this.asNumber(record.brandNoteCount),
      benchmarkNoteCount: this.asNumber(record.benchmarkNoteCount),
    };
  }

  private readMetaStringArray(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  private readMetaString(meta: Record<string, unknown>, key: string) {
    const value = meta[key];
    return typeof value === "string" ? value : "";
  }

  private readMetaAnnualMarketingRows(meta: Record<string, unknown>) {
    return this.normalizeAnnualMarketingPlanRows(meta.items);
  }

  private asMeta(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private asNumber(value: unknown) {
    return typeof value === "number" ? value : 0;
  }

  private async ensureBrandExistsInDatabase(brandId: string) {
    const brand = await this.prismaService.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }
  }

  private ensureBrandExistsInMock(brandId: string) {
    const brand = database.brands.find((item) => item.id === brandId);
    if (!brand) {
      throw new NotFoundException("鍝佺墝涓嶅瓨鍦");
    }
  }
}
