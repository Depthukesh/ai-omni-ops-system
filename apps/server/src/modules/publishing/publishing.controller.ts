import { Body, Controller, Get, Headers, Inject, Param, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import {
  PublishingService,
  type CompleteMobileDraftSessionPayload,
  type CreateMobileDraftSessionPayload,
  type PublishWechatArticlePayload,
  type RetryWechatWorkflowPublishPayload,
  type PublishWechatWorkflowPayload,
} from "./publishing.service";

@Controller("publishing")
export class PublishingController {
  constructor(
    @Inject(PublishingService) private readonly publishingService: PublishingService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Post("brands/:brandId/xiaohongshu/works/:workId/mobile-draft-session")
  createXiaohongshuMobileDraftSession(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: CreateMobileDraftSessionPayload,
  ) {
    return this.publishingService.createXiaohongshuMobileDraftSession(brandId, workId, payload);
  }

  @Post("brands/:brandId/xiaohongshu/works/:workId/desktop-draft-session")
  createXiaohongshuDesktopDraftSession(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: CreateMobileDraftSessionPayload,
  ) {
    return this.publishingService.createXiaohongshuDesktopDraftSession(brandId, workId, payload);
  }

  @Get("xiaohongshu/mobile-sessions/:token")
  getXiaohongshuMobileDraftSession(@Param("token") token: string) {
    return this.publishingService.getXiaohongshuMobileDraftSession(token);
  }

  @Get("xiaohongshu/desktop-sessions/:token")
  getXiaohongshuDesktopDraftSession(@Param("token") token: string) {
    return this.publishingService.getXiaohongshuDesktopDraftSession(token);
  }

  @Post("xiaohongshu/mobile-sessions/:token/complete")
  completeXiaohongshuMobileDraftSession(
    @Param("token") token: string,
    @Body() payload: CompleteMobileDraftSessionPayload,
  ) {
    return this.publishingService.completeXiaohongshuMobileDraftSession(token, payload);
  }

  @Post("xiaohongshu/desktop-sessions/:token/complete")
  completeXiaohongshuDesktopDraftSession(
    @Param("token") token: string,
    @Body() payload: CompleteMobileDraftSessionPayload,
  ) {
    return this.publishingService.completeXiaohongshuDesktopDraftSession(token, payload);
  }

  @Post("brands/:brandId/wechat/articles/:draftId/publish")
  publishWechatArticle(
    @Param("brandId") brandId: string,
    @Param("draftId") draftId: string,
    @Body() payload: PublishWechatArticlePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.publishingService.publishWechatArticleToOfficialAccount(brandId, draftId, payload);
    });
  }

  @Post("brands/:brandId/wechat/workflows/:workflowId/publish")
  publishWechatWorkflow(
    @Param("brandId") brandId: string,
    @Param("workflowId") workflowId: string,
    @Body() payload: PublishWechatWorkflowPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.publishingService.publishWechatWorkflowToOfficialAccount(brandId, workflowId, payload);
    });
  }

  @Post("brands/:brandId/wechat/publish-history/:historyId/retry")
  retryWechatWorkflowPublish(
    @Param("brandId") brandId: string,
    @Param("historyId") historyId: string,
    @Body() payload: RetryWechatWorkflowPublishPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.publishingService.retryWechatWorkflowPublishToOfficialAccount(brandId, historyId, payload);
    });
  }
}
