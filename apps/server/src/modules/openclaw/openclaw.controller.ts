import { Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";
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
    @Body() payload?: { topic?: string; styleHint?: string; productId?: string },
  ) {
    return this.openClawService.createXiaohongshuOriginalNote(headers, payload);
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
