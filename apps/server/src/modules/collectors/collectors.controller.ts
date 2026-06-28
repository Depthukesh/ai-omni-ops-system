import { Body, Controller, Delete, Get, Headers, Inject, Param, Post, Query, Res } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { CollectorsService } from "./collectors.service";

@Controller("collectors/xiaohongshu")
export class CollectorsController {
  constructor(
    @Inject(CollectorsService) private readonly collectorsService: CollectorsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get("brands/:brandId/workspace")
  async workspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.getXiaohongshuWorkspace(brandId);
  }

  @Post("brands/:brandId/brand-accounts/sync")
  async syncBrandAccounts(
    @Param("brandId") brandId: string,
    @Body() payload: { accountLocators?: string[]; accountEntries?: Array<{ locator: string; accountRole?: "BRAND" | "STAFF" | "TALENT" }> },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncBrandAccounts(brandId, payload ?? {});
  }

  @Post("brands/:brandId/competitor-accounts/sync")
  async syncCompetitorAccounts(
    @Param("brandId") brandId: string,
    @Body() payload: { accountLocators?: string[]; accountEntries?: Array<{ locator: string; accountRole?: "BRAND" | "STAFF" | "TALENT" }> },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncCompetitorAccounts(brandId, payload ?? {});
  }

  @Post("brands/:brandId/brand-notes/sync")
  async syncBrandNotes(
    @Param("brandId") brandId: string,
    @Body() payload: { accountLocators?: string[] },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncBrandNotes(brandId, payload ?? {});
  }

  @Post("brands/:brandId/benchmark-notes/sync")
  async syncBenchmarkNotes(
    @Param("brandId") brandId: string,
    @Body() payload: { sourceUrls?: string[] },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncBenchmarkNotes(brandId, payload.sourceUrls ?? []);
  }

  @Post("brands/:brandId/search-notes/sync")
  async syncSearchNotes(
    @Param("brandId") brandId: string,
    @Body() payload: { keyword?: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncSearchNotes(brandId, payload.keyword ?? "");
  }

  @Post("brands/:brandId/comment-data/sync")
  async syncCommentData(
    @Param("brandId") brandId: string,
    @Body() payload: { sourceUrls?: string[]; pageRequests?: Array<{ sourceUrl: string; cursor?: string; index?: number }> },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncXhsCommentData(brandId, payload ?? {});
  }

  @Post("brands/:brandId/comment-data/sub-comments")
  async syncSubComments(
    @Param("brandId") brandId: string,
    @Body() payload: { sourceUrl?: string; commentId?: string; cursor?: string; index?: number },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.getXhsSubComments(brandId, payload ?? {});
  }

  @Post("brands/:brandId/material-library")
  async addBenchmarkNoteToMaterialLibrary(
    @Param("brandId") brandId: string,
    @Body() payload: { assetId: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.addBenchmarkNoteToMaterialLibrary(brandId, payload.assetId);
  }

  @Post("brands/:brandId/target-users/sync")
  async syncTargetUsers(
    @Param("brandId") brandId: string,
    @Body() payload: { sourceUrls?: string[] },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncTargetUsers(brandId, payload.sourceUrls ?? []);
  }

  @Post("brands/:brandId/feishu-sync")
  async syncFeishuWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncFeishuWorkspace(brandId);
  }

  @Get("brands/:brandId/feishu-media")
  async feishuMedia(
    @Param("brandId") brandId: string,
    @Query("sourceUrl") sourceUrl: string,
    @Query("download") download: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Res() response: {
      setHeader(name: string, value: string): unknown;
      status(code: number): { send(body: Buffer): unknown };
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    const file = await this.collectorsService.fetchFeishuMedia(brandId, sourceUrl);
    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Cache-Control", "private, max-age=300");
    response.setHeader(
      "Content-Disposition",
      `${download === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    return response.status(200).send(file.buffer);
  }

  @Get("brands/:brandId/media/:fileName")
  async xhsStoredMedia(
    @Param("brandId") brandId: string,
    @Param("fileName") fileName: string,
    @Query("download") download: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Res() response: {
      setHeader(name: string, value: string): unknown;
      status(code: number): { send(body: Buffer): unknown };
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    const file = await this.collectorsService.fetchXhsStoredMedia(brandId, fileName);
    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Cache-Control", "private, max-age=300");
    response.setHeader(
      "Content-Disposition",
      `${download === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    return response.status(200).send(file.buffer);
  }
}

@Controller("collectors/douyin")
export class DouyinCollectorsController {
  constructor(
    @Inject(CollectorsService) private readonly collectorsService: CollectorsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get("brands/:brandId/workspace")
  async workspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.getDouyinWorkspace(brandId);
  }

  @Post("brands/:brandId/sync")
  async syncWorkspace(
    @Param("brandId") brandId: string,
    @Body()
    payload: {
      scope?:
        | "brandAccount"
        | "competitorAccount"
        | "brandWorks"
        | "competitorWorks"
        | "benchmarkWorks"
        | "searchWorks"
        | "keywordRecommendations"
        | "commentData"
        | "lowFanExplosiveWorks"
        | "highCompletionRateWorks"
        | "highLikeRateWorks"
        | "cityHotspots";
      brandAccountLinks?: string[];
      competitorAccountLinks?: string[];
      brandAccountEntries?: Array<{ locator: string; accountRole?: "BRAND" | "STAFF" | "TALENT" }>;
      competitorAccountEntries?: Array<{ locator: string; accountRole?: "BRAND" | "STAFF" | "TALENT" }>;
      benchmarkAwemeIds?: string[];
      searchKeyword?: string;
      searchSortType?: string;
      searchPublishTime?: string;
      searchFilterDuration?: string;
      searchContentType?: string;
      commentSourceUrls?: string[];
      commentPageRequests?: Array<{
        sourceUrl: string;
        cursor?: string;
      }>;
      contentTagSelection?: {
        primaryTagId?: number;
        secondaryTagId?: number;
      };
      cityCode?: number;
    },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncDouyinWorkspace(brandId, payload ?? {});
  }

  @Post("brands/:brandId/material-library")
  async addBenchmarkWorkToMaterialLibrary(
    @Param("brandId") brandId: string,
    @Body() payload: { assetId: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.addDouyinBenchmarkWorkToMaterialLibrary(brandId, payload.assetId);
  }

  @Delete("brands/:brandId/material-library/:assetId")
  async removeBenchmarkWorkFromMaterialLibrary(
    @Param("brandId") brandId: string,
    @Param("assetId") assetId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.removeDouyinBenchmarkWorkFromMaterialLibrary(brandId, assetId);
  }

  @Post("brands/:brandId/transcripts")
  async extractWorkTranscript(
    @Param("brandId") brandId: string,
    @Body() payload: { assetId: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.extractDouyinWorkTranscript(brandId, payload.assetId);
  }

  @Delete("brands/:brandId/keyword-recommendations/:assetId")
  async removeKeywordRecommendation(
    @Param("brandId") brandId: string,
    @Param("assetId") assetId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.removeDouyinKeywordRecommendation(brandId, assetId);
  }
}

@Controller("collectors/wechat-mp")
export class WechatMpCollectorsController {
  constructor(
    @Inject(CollectorsService) private readonly collectorsService: CollectorsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get("brands/:brandId/workspace")
  async workspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.getWechatMpWorkspace(brandId);
  }

  @Post("brands/:brandId/brand-accounts")
  async bindBrandAccount(
    @Param("brandId") brandId: string,
    @Body() payload: { ghUsername: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncWechatMpBrandAccount(brandId, payload.ghUsername);
  }

  @Delete("brands/:brandId/brand-accounts/:accountId")
  async deleteBrandAccount(
    @Param("brandId") brandId: string,
    @Param("accountId") accountId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.deleteWechatMpBrandAccount(brandId, accountId);
  }

  @Post("brands/:brandId/articles/fetch")
  async fetchArticles(
    @Param("brandId") brandId: string,
    @Body() payload: { ghUsername: string; offset?: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.fetchWechatMpArticles(brandId, payload.ghUsername, payload.offset);
  }

  @Post("brands/:brandId/articles/stats")
  async updateArticleStats(
    @Param("brandId") brandId: string,
    @Body() payload: { url: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.updateWechatMpArticleStats(brandId, payload.url);
  }

  @Post("brands/:brandId/articles/read")
  async readArticleContent(
    @Param("brandId") brandId: string,
    @Body() payload: { url: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.readWechatMpArticleContent(brandId, payload.url);
  }

  @Get("brands/:brandId/benchmark-workspace")
  async benchmarkWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.getWechatMpBenchmarkWorkspace(brandId);
  }

  @Post("brands/:brandId/benchmark-articles/submit")
  async submitBenchmarkArticle(
    @Param("brandId") brandId: string,
    @Body() payload: { url: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.submitWechatMpBenchmarkArticle(brandId, payload.url);
  }

  @Post("brands/:brandId/benchmark-articles/stats")
  async updateBenchmarkArticleStats(
    @Param("brandId") brandId: string,
    @Body() payload: { url: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.updateWechatMpBenchmarkArticleStats(brandId, payload.url);
  }

  @Get("brands/:brandId/search-workspace")
  async searchWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.getWechatSearchWorkspace(brandId);
  }

  @Post("brands/:brandId/search")
  async search(
    @Param("brandId") brandId: string,
    @Body() payload: { keyword: string; businessType?: string; sort?: string; publishTime?: string; offset?: number },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.searchWechat(
      brandId,
      payload.keyword,
      (payload.businessType as "all" | "account" | "article" | "video" | "live_stream" | "moments" | "news" | "book" | "listen" | "image" | "encyclopedia" | "weixin_index") || "all",
      (payload.sort as "default" | "latest" | "hot") || "default",
      (payload.publishTime as "all" | "day" | "week" | "half_year") || "all",
      payload.offset || 0,
    );
  }

  @Post("brands/:brandId/search-items/read")
  async readSearchItemContent(
    @Param("brandId") brandId: string,
    @Body() payload: { url: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.updateWechatSearchItemContent(brandId, payload.url);
  }

  @Post("brands/:brandId/search-items/stats")
  async updateSearchItemStats(
    @Param("brandId") brandId: string,
    @Body() payload: { url: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.updateWechatSearchItemStats(brandId, payload.url);
  }
}
