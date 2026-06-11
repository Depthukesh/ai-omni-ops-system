import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { OpenClawService } from "./openclaw.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/mcp")
export class OpenClawController {
  constructor(private readonly openClawService: OpenClawService) {}

  @Post()
  async handleMcpRequest(
    @Headers() headers: HeadersMap,
    @Body() payload?: Record<string, unknown>,
  ) {
    return this.openClawService.handleMcpRpcRequest(headers, payload);
  }

  @Get("context/current-brand")
  async getCurrentBrandContext(@Headers() headers: HeadersMap) {
    return this.openClawService.getCurrentBrandContext(headers);
  }

  @Get("tasks/:taskId")
  async getTaskDetail(
    @Headers() headers: HeadersMap,
    @Param("taskId") taskId: string,
  ) {
    return this.openClawService.getTaskDetail(headers, { taskId });
  }

  @Get("brands/products")
  async getBrandProducts(
    @Headers() headers: HeadersMap,
    @Query("limit") limit?: string,
  ) {
    return this.openClawService.getBrandProducts(headers, {
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("brands/platform-accounts")
  async getPlatformAccounts(
    @Headers() headers: HeadersMap,
    @Query("platform") platform?: string,
    @Query("limit") limit?: string,
  ) {
    return this.openClawService.getPlatformAccounts(headers, {
      platform,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("tasks/recent-summary")
  async getRecentTasksSummary(
    @Headers() headers: HeadersMap,
    @Query("timeRange") timeRange?: string,
    @Query("taskTypes") taskTypes?: string,
  ) {
    return this.openClawService.getRecentTasksSummary(headers, {
      timeRange,
      taskTypes: this.parseCsvQuery(taskTypes),
    });
  }

  @Get("tasks/failed-summary")
  async getFailedTasksSummary(
    @Headers() headers: HeadersMap,
    @Query("timeRange") timeRange?: string,
    @Query("taskTypes") taskTypes?: string,
  ) {
    return this.openClawService.getFailedTasksSummary(headers, {
      timeRange,
      taskTypes: this.parseCsvQuery(taskTypes),
    });
  }

  @Patch("tasks/:taskId/cancel")
  async cancelTask(
    @Headers() headers: HeadersMap,
    @Param("taskId") taskId: string,
  ) {
    return this.openClawService.cancelTask(headers, { taskId });
  }

  @Patch("tasks/:taskId/retry")
  async retryTask(
    @Headers() headers: HeadersMap,
    @Param("taskId") taskId: string,
  ) {
    return this.openClawService.retryTask(headers, { taskId });
  }

  @Get("knowledge-bases/recent-files")
  async getRecentKnowledgeFiles(
    @Headers() headers: HeadersMap,
    @Query("timeRange") timeRange?: string,
    @Query("knowledgeBaseId") knowledgeBaseId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.openClawService.getRecentKnowledgeFiles(headers, {
      timeRange,
      knowledgeBaseId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("skills/config-summary")
  async getSkillConfigSummary(
    @Headers() headers: HeadersMap,
    @Query("skillKey") skillKey?: string,
  ) {
    return this.openClawService.getSkillConfigSummary(headers, { skillKey });
  }

  @Get("works/design/options")
  async getDesignWorkspaceOptions(@Headers() headers: HeadersMap) {
    return this.openClawService.getDesignWorkspaceOptions(headers);
  }

  @Get("works/design/recent")
  async getRecentDesignWorks(
    @Headers() headers: HeadersMap,
    @Query("limit") limit?: string,
  ) {
    return this.openClawService.getRecentDesignWorks(headers, {
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post("works/design/generate")
  async createDesignWork(
    @Headers() headers: HeadersMap,
    @Body() payload?: {
      module?: string;
      designType?: string;
      title?: string;
      calendarItemId?: string;
      productId?: string;
      injectBrandProfile?: boolean;
      modelSelection?: string;
      spec?: string;
      additionalInstruction?: string;
    },
  ) {
    return this.openClawService.createDesignWork(headers, payload);
  }

  @Get("reports/douyin-original/options")
  async getDouyinOriginalCopyOptions(@Headers() headers: HeadersMap) {
    return this.openClawService.getDouyinOriginalCopyOptions(headers);
  }

  @Get("reports/douyin-original/recent")
  async getRecentDouyinOriginalCopies(
    @Headers() headers: HeadersMap,
    @Query("limit") limit?: string,
  ) {
    return this.openClawService.getRecentDouyinOriginalCopies(headers, {
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post("reports/douyin-original/generate")
  async createDouyinOriginalCopy(
    @Headers() headers: HeadersMap,
    @Body() payload?: {
      copyType?: string;
      topicId?: string;
      calendarItemId?: string;
      injectMarketingPlan?: boolean;
      userRequirement?: string;
    },
  ) {
    return this.openClawService.createDouyinOriginalCopy(headers, payload);
  }

  @Get("works/xiaohongshu/calendar-options")
  async getXiaohongshuMarketingCalendarOptions(
    @Headers() headers: HeadersMap,
    @Query("limit") limit?: string,
  ) {
    return this.openClawService.getXiaohongshuMarketingCalendarOptions(headers, {
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("works/xiaohongshu/material-library")
  async getXiaohongshuMaterialLibraryItems(
    @Headers() headers: HeadersMap,
    @Query("limit") limit?: string,
  ) {
    return this.openClawService.getXiaohongshuMaterialLibraryItems(headers, {
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("works/xiaohongshu/reference-templates")
  async getXiaohongshuOriginalReferenceTemplates(
    @Headers() headers: HeadersMap,
    @Query("categoryId") categoryId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.openClawService.getXiaohongshuOriginalReferenceTemplates(headers, {
      categoryId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get("works/xiaohongshu/original/recent")
  async getRecentXiaohongshuOriginalWorks(
    @Headers() headers: HeadersMap,
    @Query("limit") limit?: string,
  ) {
    return this.openClawService.getRecentXiaohongshuOriginalWorks(headers, {
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post("reports/brand-growth/generate")
  async createBrandGrowthReport(
    @Headers() headers: HeadersMap,
    @Body() payload?: { goal?: string; timeRange?: string },
  ) {
    return this.openClawService.createBrandGrowthReport(headers, payload);
  }

  @Get("reports/brand-growth/latest-summary")
  async getLatestBrandGrowthReportSummary(@Headers() headers: HeadersMap) {
    return this.openClawService.getLatestBrandGrowthReportSummary(headers);
  }

  @Post("reports/half-year-marketing-plan/generate")
  async createHalfYearMarketingPlan(
    @Headers() headers: HeadersMap,
    @Body() payload?: { planningYear?: string; focus?: string },
  ) {
    return this.openClawService.createHalfYearMarketingPlan(headers, payload);
  }

  @Post("knowledge-bases/create")
  async createKnowledgeBase(
    @Headers() headers: HeadersMap,
    @Body() payload?: { name?: string; description?: string },
  ) {
    return this.openClawService.createKnowledgeBase(headers, payload);
  }

  @Post("knowledge-bases/upload-files")
  async uploadKnowledgeBaseFiles(
    @Headers() headers: HeadersMap,
    @Body()
    payload?: {
      knowledgeBaseId?: string;
      knowledgeBaseName?: string;
      items?: Array<{
        title?: string;
        description?: string;
        sourceName?: string;
        fileUrl?: string;
        priority?: number;
      }>;
    },
  ) {
    return this.openClawService.uploadKnowledgeBaseFiles(headers, payload);
  }

  @Post("works/xiaohongshu/original/generate")
  async createXiaohongshuOriginalNote(
    @Headers() headers: HeadersMap,
    @Body() payload?: {
      calendarItemId?: string;
      customTopicName?: string;
      topic?: string;
      productId?: string;
      accountRole?: string;
      imageCount?: number;
      includeMarketingPlan?: boolean;
      additionalInstruction?: string;
      styleHint?: string;
    },
  ) {
    return this.openClawService.createXiaohongshuOriginalNote(headers, payload);
  }

  @Post("works/xiaohongshu/rewrite/generate")
  async createXiaohongshuRewriteNote(
    @Headers() headers: HeadersMap,
    @Body() payload?: {
      sourceMaterialId?: string;
      productId?: string;
      accountRole?: string;
      includeMarketingPlan?: boolean;
      additionalInstruction?: string;
    },
  ) {
    return this.openClawService.createXiaohongshuRewriteNote(headers, payload);
  }

  @Post("works/wechat/articles/generate")
  async createWechatArticle(
    @Headers() headers: HeadersMap,
    @Body() payload?: { title?: string; summary?: string; content?: string; author?: string; styleHint?: string },
  ) {
    return this.openClawService.createWechatArticle(headers, payload);
  }

  private parseCsvQuery(value?: string) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
