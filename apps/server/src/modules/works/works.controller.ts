import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthService } from "../auth/auth.service";
import {
  type CreateDouyinDigitalHumanCustomPersonPayload,
  type CreateDouyinVoiceClonePayload,
  type CreateDouyinLipSyncPayload,
  type CreateDouyinAdPreAuditPayload,
  type CreateDouyinAdPreAuditUploadPayload,
  type CreateDouyinDigitalHumanScriptTemplatePayload,
  type ContinueDouyinDirectVideoGenerationPayload,
  type ContinueDouyinRemixShortVideoGenerationPayload,
  type ContinueDouyinVideoGenerationPayload,
  type ContinueXiaohongshuVideoGenerationPayload,
  type GenerateDesignWorkPayload,
  type GenerateImagePromptWorkPayload,
  type GenerateOperationsPromptWorkPayload,
  type GenerateDouyinRunningHubWorkPayload,
  type CreateWechatWorkflowPayload,
  type GenerateWechatWorkflowHtmlPayload,
  type UpdateWechatWorkflowHtmlStylePayload,
  type SaveWechatAccountConfigPayload,
  type SaveDouyinAdPreAuditConfigPayload,
  type SaveWechatWorkflowPreferencePayload,
  type GenerateDouyinDigitalHumanCompleteVideoPayload,
  type GenerateDouyinDigitalHumanScriptPayload,
  type GenerateDouyinDigitalHumanVideoPayload,
  type GenerateDouyinDirectVideoPayload,
  type GenerateDouyinRemixShortVideoPayload,
  type GenerateDouyinVideoNotePayload,
  type GenerateXiaohongshuVideoNotePayload,
  type RecoverDouyinDigitalHumanVideoPayload,
  type RecoverDouyinLipSyncPayload,
  type RecoverDouyinDirectVideoGenerationPayload,
  type RecoverDouyinVideoGenerationPayload,
  type GenerateDouyinSpeechPayload,
  type RegenerateXiaohongshuVideoStoryboardPayload,
  type RegenerateDouyinVideoStoryboardPayload,
  type RecoverXiaohongshuVideoGenerationPayload,
  type UpdateWechatArticleDraftPayload,
  type UpdateWechatWorkflowArticlePayload,
  type UpdateWechatWorkflowInputPayload,
  type UpdateWechatWorkflowPublishPayload,
  type WechatArticleComposePayload,
  type UpdateDouyinDigitalHumanScriptTemplatePayload,
  WorksService,
  type UpdateDouyinDirectVideoPayload,
  type UpdateDouyinVideoNotePayload,
  type GenerateXiaohongshuOriginalNotePayload,
  type GenerateXiaohongshuRewriteNotePayload,
  type UpdateXiaohongshuOriginalNotePayload,
  type UpdateXiaohongshuRewriteNotePayload,
  type UpdateXiaohongshuVideoNotePayload,
} from "./works.service";

const DIGITAL_HUMAN_TRAINING_UPLOAD_TEMP_DIR = join(tmpdir(), "ai-omni-digital-human-training");
mkdirSync(DIGITAL_HUMAN_TRAINING_UPLOAD_TEMP_DIR, { recursive: true });

@Controller("works")
export class WorksController {
  constructor(
    @Inject(WorksService) private readonly worksService: WorksService,
    private readonly authService: AuthService,
  ) {}

  @Get("brands/:brandId/xiaohongshu/original")
  async listXiaohongshuOriginalWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "view", auth);
    return this.worksService.listXiaohongshuOriginalWorks(brandId);
  }

  @Get("brands/:brandId/xiaohongshu/rewrite")
  async listXiaohongshuRewriteWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.remix", "view", auth);
    return this.worksService.listXiaohongshuRewriteWorks(brandId);
  }

  @Get("brands/:brandId/xiaohongshu/video")
  async listXiaohongshuVideoWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "view", auth);
    return this.worksService.listXiaohongshuVideoWorks(brandId);
  }

  @Get("brands/:brandId/xiaohongshu/video/providers")
  async listXiaohongshuVideoProviders(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "view", auth);
    return this.worksService.listXiaohongshuVideoProviderOptions();
  }

  @Get("brands/:brandId/xiaohongshu/video/storyboard-image/providers")
  async listXiaohongshuVideoStoryboardImageProviders(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "view", auth);
    return this.worksService.listXiaohongshuVideoStoryboardImageOptions();
  }

  @Get("brands/:brandId/douyin/video")
  async listDouyinVideoWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.video", "view", auth);
    return this.worksService.listDouyinVideoWorks(brandId);
  }

  @Get("brands/:brandId/douyin/video/providers")
  async listDouyinVideoProviders(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.video", "view", auth);
    return this.worksService.listDouyinVideoProviderOptions();
  }

  @Get("brands/:brandId/douyin/direct-video")
  async listDouyinDirectVideoWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "view", auth);
    return this.worksService.listDouyinDirectVideoWorks(brandId);
  }

  @Get("brands/:brandId/douyin/remix-short-video")
  async listDouyinRemixShortVideoWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.remixShortVideo", "view", auth);
    return this.worksService.listDouyinRemixShortVideoWorks(brandId);
  }

  @Get("brands/:brandId/wechat/articles")
  async listWechatArticleDrafts(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);
    return this.worksService.listWechatArticleDrafts(brandId);
  }

  @Get("brands/:brandId/wechat/preferences")
  async getWechatWorkflowPreferences(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "wechat.config", "view", auth);
    return this.worksService.getWechatWorkflowPreferences(brandId);
  }

  @Patch("brands/:brandId/wechat/preferences")
  saveWechatWorkflowPreferences(
    @Param("brandId") brandId: string,
    @Body() payload: SaveWechatWorkflowPreferencePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.config", "edit", auth);
      return this.worksService.saveWechatWorkflowPreferences(brandId, payload);
    });
  }

  @Get("brands/:brandId/wechat/accounts")
  async listWechatOfficialAccounts(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "wechat.config", "view", auth);
    return this.worksService.listWechatOfficialAccounts(brandId);
  }

  @Get("brands/:brandId/wechat/workflows")
  async listWechatWorkflowSessions(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);
    return this.worksService.listWechatWorkflowSessions(brandId);
  }

  @Get("brands/:brandId/wechat/publish-history")
  async listWechatPublishHistory(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);
    return this.worksService.listWechatPublishHistory(brandId);
  }

  @Get("brands/:brandId/wechat/publish-history/:historyId")
  async getWechatPublishHistoryItem(
    @Param("brandId") brandId: string,
    @Param("historyId") historyId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);
    return this.worksService.getWechatPublishHistoryItem(brandId, historyId);
  }

  @Get("brands/:brandId/wechat/workflows/:workflowId")
  async getWechatWorkflowSession(
    @Param("brandId") brandId: string,
    @Param("workflowId") workflowId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);
    return this.worksService.getWechatWorkflowSession(brandId, workflowId);
  }

  @Post("brands/:brandId/wechat/workflows")
  createWechatWorkflow(
    @Param("brandId") brandId: string,
    @Body() payload: CreateWechatWorkflowPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.createWechatWorkflow(brandId, payload);
    });
  }

  @Patch("brands/:brandId/wechat/workflows/:workflowId/input")
  updateWechatWorkflowInput(
    @Param("brandId") brandId: string,
    @Param("workflowId") workflowId: string,
    @Body() payload: UpdateWechatWorkflowInputPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.updateWechatWorkflowInput(brandId, workflowId, payload);
    });
  }

  @Patch("brands/:brandId/wechat/workflows/:workflowId/article")
  updateWechatWorkflowArticle(
    @Param("brandId") brandId: string,
    @Param("workflowId") workflowId: string,
    @Body() payload: UpdateWechatWorkflowArticlePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.updateWechatWorkflowArticle(brandId, workflowId, payload);
    });
  }

  @Post("brands/:brandId/wechat/workflows/:workflowId/article/generate")
  generateWechatWorkflowArticle(
    @Param("brandId") brandId: string,
    @Param("workflowId") workflowId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.generateWechatWorkflowArticle(brandId, workflowId, auth);
    });
  }

  @Post("brands/:brandId/wechat/workflows/:workflowId/images/generate")
  generateWechatWorkflowImages(
    @Param("brandId") brandId: string,
    @Param("workflowId") workflowId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.generateWechatWorkflowImages(brandId, workflowId, auth);
    });
  }

  @Post("brands/:brandId/wechat/workflows/:workflowId/html/generate")
  generateWechatWorkflowHtml(
    @Param("brandId") brandId: string,
    @Param("workflowId") workflowId: string,
    @Body() payload: GenerateWechatWorkflowHtmlPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.generateWechatWorkflowHtml(brandId, workflowId, payload, auth);
    });
  }

  @Patch("brands/:brandId/wechat/workflows/:workflowId/html-style")
  updateWechatWorkflowHtmlStyle(
    @Param("brandId") brandId: string,
    @Param("workflowId") workflowId: string,
    @Body() payload: UpdateWechatWorkflowHtmlStylePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.updateWechatWorkflowHtmlStyle(brandId, workflowId, payload);
    });
  }

  @Patch("brands/:brandId/wechat/workflows/:workflowId/publish-confirm")
  updateWechatWorkflowPublishConfirm(
    @Param("brandId") brandId: string,
    @Param("workflowId") workflowId: string,
    @Body() payload: UpdateWechatWorkflowPublishPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.updateWechatWorkflowPublishConfirm(brandId, workflowId, payload);
    });
  }

  @Get("brands/:brandId/wechat/config")
  async getWechatAccountConfig(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "wechat.config", "view", auth);
    return this.worksService.getWechatAccountConfig(brandId);
  }

  @Post("brands/:brandId/wechat/config")
  saveWechatAccountConfig(
    @Param("brandId") brandId: string,
    @Body() payload: SaveWechatAccountConfigPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.config", "edit", auth);
      return this.worksService.saveWechatAccountConfig(brandId, payload);
    });
  }

  @Post("brands/:brandId/wechat/articles/generate")
  createWechatArticleDraft(
    @Param("brandId") brandId: string,
    @Body() payload: WechatArticleComposePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.generateWechatArticleDraft(brandId, payload, auth);
    });
  }

  @Patch("brands/:brandId/wechat/articles/:draftId")
  updateWechatArticleDraft(
    @Param("brandId") brandId: string,
    @Param("draftId") draftId: string,
    @Body() payload: UpdateWechatArticleDraftPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "wechat.original", "edit", auth);
      return this.worksService.updateWechatArticleDraft(brandId, draftId, payload);
    });
  }

  @Get("brands/:brandId/douyin/direct-video/providers")
  async listDouyinDirectVideoProviders(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "view", auth);
    return this.worksService.listDouyinDirectVideoProviderOptions();
  }

  @Get("brands/:brandId/douyin/ad-preaudit")
  async listDouyinAdPreAuditWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "view", auth);
    return this.worksService.listDouyinAdPreAuditWorks(brandId);
  }

  @Get("brands/:brandId/douyin/ad-preaudit/config")
  async getDouyinAdPreAuditConfig(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "view", auth);
    return this.worksService.getDouyinAdPreAuditConfig(brandId);
  }

  @Patch("brands/:brandId/douyin/ad-preaudit/config")
  saveDouyinAdPreAuditConfig(
    @Param("brandId") brandId: string,
    @Body() payload: SaveDouyinAdPreAuditConfigPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
      return this.worksService.saveDouyinAdPreAuditConfig(brandId, payload);
    });
  }

  @Get("brands/:brandId/douyin/ad-preaudit/media")
  async listDouyinAdPreAuditMediaAssets(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "view", auth);
    return this.worksService.listDouyinAdPreAuditMediaAssets(brandId);
  }

  @Post("brands/:brandId/douyin/ad-preaudit/upload")
  createDouyinAdPreAuditUpload(
    @Param("brandId") brandId: string,
    @Body() payload: CreateDouyinAdPreAuditUploadPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
      return this.worksService.createDouyinAdPreAuditUpload(brandId, payload);
    });
  }

  @Post("brands/:brandId/douyin/ad-preaudit/media/:mediaAssetId/upload/refresh")
  refreshDouyinAdPreAuditUpload(
    @Param("brandId") brandId: string,
    @Param("mediaAssetId") mediaAssetId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
      return this.worksService.refreshDouyinAdPreAuditUpload(brandId, mediaAssetId);
    });
  }

  @Post("brands/:brandId/douyin/ad-preaudit/submit")
  createDouyinAdPreAudit(
    @Param("brandId") brandId: string,
    @Body() payload: CreateDouyinAdPreAuditPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
      return this.worksService.createDouyinAdPreAudit(brandId, payload, auth);
    });
  }

  @Post("brands/:brandId/douyin/ad-preaudit/:taskId/refresh")
  refreshDouyinAdPreAudit(
    @Param("brandId") brandId: string,
    @Param("taskId") taskId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
      return this.worksService.refreshDouyinAdPreAudit(brandId, taskId);
    });
  }

  @Delete("brands/:brandId/douyin/ad-preaudit/:taskId")
  async deleteDouyinAdPreAudit(
    @Param("brandId") brandId: string,
    @Param("taskId") taskId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.adPreAudit", "edit", auth);
    return this.worksService.deleteDouyinAdPreAudit(brandId, taskId);
  }

  @Get("brands/:brandId/design/options")
  async getDesignWorkspaceOptions(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);
    return this.worksService.getDesignWorkspaceOptions(brandId);
  }

  @Get("brands/:brandId/design/operations-prompt-center/options")
  async getOperationsPromptCenterOptions(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);
    return this.worksService.getOperationsPromptCenterOptions(brandId);
  }

  @Get("brands/:brandId/design/image-prompt-center/options")
  async getImagePromptCenterOptions(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);
    return this.worksService.getImagePromptCenterOptions(brandId);
  }

  @Get("brands/:brandId/design/operations-prompt-center/templates/:templateId")
  async getOperationsPromptTemplateDetail(
    @Param("brandId") brandId: string,
    @Param("templateId") templateId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);
    return this.worksService.getOperationsPromptTemplateDetail(brandId, templateId);
  }

  @Get("brands/:brandId/design/image-prompt-center/templates/:templateId")
  async getImagePromptTemplateDetail(
    @Param("brandId") brandId: string,
    @Param("templateId") templateId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);
    return this.worksService.getImagePromptTemplateDetail(brandId, templateId);
  }

  @Get("brands/:brandId/design/operations-prompt-center/works")
  async listOperationsPromptWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);
    return this.worksService.listOperationsPromptWorks(brandId);
  }

  @Get("brands/:brandId/design/image-prompt-center/works")
  async listImagePromptWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);
    return this.worksService.listImagePromptWorks(brandId);
  }

  @Delete("brands/:brandId/design/operations-prompt-center/works/:workId")
  async deleteOperationsPromptWork(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "edit", auth);
    return this.worksService.deleteOperationsPromptWork(brandId, workId);
  }

  @Delete("brands/:brandId/design/image-prompt-center/works/:workId")
  async deleteImagePromptWork(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "edit", auth);
    return this.worksService.deleteImagePromptWork(brandId, workId);
  }

  @Post("brands/:brandId/design/operations-prompt-center/generate")
  async createOperationsPromptWork(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateOperationsPromptWorkPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "edit", auth);
    return this.worksService.generateOperationsPromptWork(brandId, payload, auth!);
  }

  @Post("brands/:brandId/design/image-prompt-center/generate")
  async createImagePromptWork(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateImagePromptWorkPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "edit", auth);
    return this.worksService.generateImagePromptWork(brandId, payload, auth!);
  }

  @Get("brands/:brandId/design/history")
  async listDesignHistory(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "view", auth);
    return this.worksService.listDesignHistory(brandId);
  }

  @Delete("brands/:brandId/design/history/:workId")
  async deleteDesignHistoryItem(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "edit", auth);
    return this.worksService.deleteDesignHistoryItem(brandId, workId);
  }

  @Post("brands/:brandId/design/generate")
  async createDesignWork(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateDesignWorkPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "personalCenter.works", "edit", auth);
    return this.worksService.generateDesignWork(brandId, payload, auth!);
  }

  @Get("brands/:brandId/douyin/digital-human/template-tags")
  async listDouyinDigitalHumanTemplateTags(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinDigitalHumanTemplateTags(brandId);
  }

  @Get("brands/:brandId/douyin/digital-human/templates")
  async listDouyinDigitalHumanTemplates(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("page") page?: string,
    @Query("size") size?: string,
    @Query("sort") sort?: string,
    @Query("tagIds") tagIds?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinDigitalHumanTemplates(brandId, {
      page: Number(page || 1) || 1,
      size: Number(size || 24) || 24,
      sort: String(sort || "").trim() || undefined,
      tagIds: String(tagIds || "")
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item) && item > 0),
    });
  }

  @Get("brands/:brandId/douyin/digital-human/voice-library")
  async listDouyinVoiceLibrary(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("page") page?: string,
    @Query("size") size?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinVoiceLibrary(brandId, {
      page: Number(page || 1) || 1,
      size: Number(size || 24) || 24,
    });
  }

  @Get("brands/:brandId/douyin/digital-human/voice-library/custom")
  async listDouyinCustomVoices(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinCustomVoices(brandId, {
      page: Number(page || 1) || 1,
      pageSize: Number(pageSize || 24) || 24,
    });
  }

  @Post("brands/:brandId/douyin/digital-human/voice-library/custom")
  createDouyinCustomVoice(
    @Param("brandId") brandId: string,
    @Body() payload: CreateDouyinVoiceClonePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.createDouyinCustomVoice(brandId, payload, auth);
    });
  }

  @Delete("brands/:brandId/douyin/digital-human/voice-library/custom/:voiceId")
  deleteDouyinCustomVoice(
    @Param("brandId") brandId: string,
    @Param("voiceId") voiceId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.deleteDouyinCustomVoice(brandId, voiceId, auth);
    });
  }

  @Post("brands/:brandId/douyin/digital-human/voice-library/speech")
  createDouyinSpeechTask(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateDouyinSpeechPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.createDouyinSpeechTask(brandId, payload, auth);
    });
  }

  @Get("brands/:brandId/douyin/digital-human/voice-library/speech/:taskId")
  async getDouyinSpeechTaskDetail(
    @Param("brandId") brandId: string,
    @Param("taskId") taskId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.getDouyinSpeechTaskDetail(brandId, taskId);
  }

  @Get("brands/:brandId/douyin/digital-human/video")
  async listDouyinDigitalHumanVideoWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinDigitalHumanVideoWorks(brandId);
  }

  @Get("brands/:brandId/douyin/digital-human/custom-person")
  async listDouyinDigitalHumanCustomPersons(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinDigitalHumanCustomPersons(brandId);
  }

  @Get("brands/:brandId/douyin/runninghub/apps")
  async listDouyinRunningHubApps(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "view", auth);
    return this.worksService.listDouyinRunningHubApps(brandId);
  }

  @Get("brands/:brandId/douyin/runninghub/apps/:appKey")
  async getDouyinRunningHubAppDetail(
    @Param("brandId") brandId: string,
    @Param("appKey") appKey: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "view", auth);
    return this.worksService.getDouyinRunningHubAppDetail(brandId, appKey);
  }

  @Get("brands/:brandId/douyin/runninghub/works")
  async listDouyinRunningHubWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "view", auth);
    return this.worksService.listDouyinRunningHubWorks(brandId);
  }

  @Post("brands/:brandId/douyin/runninghub/apps/:appKey/generate")
  createDouyinRunningHubWork(
    @Param("brandId") brandId: string,
    @Param("appKey") appKey: string,
    @Body() payload: GenerateDouyinRunningHubWorkPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "edit", auth);
      return this.worksService.createDouyinRunningHubWork(brandId, appKey, payload, auth);
    });
  }

  @Delete("brands/:brandId/douyin/runninghub/works/:workId")
  deleteDouyinRunningHubWork(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.runningHub", "edit", auth);
      return this.worksService.deleteDouyinRunningHubWork(brandId, workId, auth);
    });
  }

  @Post("brands/:brandId/douyin/digital-human/custom-person/create")
  @UseInterceptors(FileInterceptor("trainingVideoFile", {
    dest: DIGITAL_HUMAN_TRAINING_UPLOAD_TEMP_DIR,
    limits: {
      fileSize: 550 * 1024 * 1024,
    },
  }))
  createDouyinDigitalHumanCustomPerson(
    @Param("brandId") brandId: string,
    @Body() payload: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @UploadedFile() uploadedFile?: {
      path?: string;
      originalname?: string;
      mimetype?: string;
      size?: number;
    },
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.createDouyinDigitalHumanCustomPerson(
        brandId,
        normalizeDigitalHumanCustomPersonPayload(payload, uploadedFile),
        auth,
      );
    });
  }

  @Delete("brands/:brandId/douyin/digital-human/custom-person/:customPersonId")
  deleteDouyinDigitalHumanCustomPerson(
    @Param("brandId") brandId: string,
    @Param("customPersonId") customPersonId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.deleteDouyinDigitalHumanCustomPerson(brandId, customPersonId, auth);
    });
  }

  @Get("brands/:brandId/douyin/digital-human/lip-sync")
  async listDouyinLipSyncWorks(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinLipSyncWorks(brandId);
  }

  @Post("brands/:brandId/douyin/digital-human/lip-sync/generate")
  generateDouyinLipSync(
    @Param("brandId") brandId: string,
    @Body() payload: CreateDouyinLipSyncPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.generateDouyinLipSync(brandId, payload, auth);
    });
  }

  @Post("brands/:brandId/douyin/digital-human/lip-sync/recover")
  recoverDouyinLipSync(
    @Param("brandId") brandId: string,
    @Body() payload: RecoverDouyinLipSyncPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.recoverDouyinLipSync(brandId, payload);
    });
  }

  @Delete("brands/:brandId/douyin/digital-human/lip-sync/:workId")
  deleteDouyinLipSync(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.deleteDouyinLipSync(brandId, workId, auth);
    });
  }

  @Get("brands/:brandId/douyin/digital-human/favorites")
  async listDouyinDigitalHumanFavorites(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinDigitalHumanFavoriteTemplates(brandId, auth);
  }

  @Post("brands/:brandId/douyin/digital-human/favorites")
  saveDouyinDigitalHumanFavorite(
    @Param("brandId") brandId: string,
    @Body() payload: { templateId?: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.saveDouyinDigitalHumanFavoriteTemplate(brandId, String(payload?.templateId || ""), auth);
    });
  }

  @Delete("brands/:brandId/douyin/digital-human/favorites/:templateId")
  deleteDouyinDigitalHumanFavorite(
    @Param("brandId") brandId: string,
    @Param("templateId") templateId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.deleteDouyinDigitalHumanFavoriteTemplate(brandId, templateId, auth);
    });
  }

  @Get("brands/:brandId/douyin/digital-human/script-templates")
  async listDouyinDigitalHumanScriptTemplates(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinDigitalHumanScriptTemplates(brandId, auth);
  }

  @Post("brands/:brandId/douyin/digital-human/script-templates")
  createDouyinDigitalHumanScriptTemplate(
    @Param("brandId") brandId: string,
    @Body() payload: CreateDouyinDigitalHumanScriptTemplatePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.createDouyinDigitalHumanScriptTemplate(brandId, payload, auth);
    });
  }

  @Patch("brands/:brandId/douyin/digital-human/script-templates/:templateId")
  updateDouyinDigitalHumanScriptTemplate(
    @Param("brandId") brandId: string,
    @Param("templateId") templateId: string,
    @Body() payload: UpdateDouyinDigitalHumanScriptTemplatePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.updateDouyinDigitalHumanScriptTemplate(brandId, templateId, payload, auth);
    });
  }

  @Delete("brands/:brandId/douyin/digital-human/script-templates/:templateId")
  deleteDouyinDigitalHumanScriptTemplate(
    @Param("brandId") brandId: string,
    @Param("templateId") templateId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.deleteDouyinDigitalHumanScriptTemplate(brandId, templateId, auth);
    });
  }

  @Post("brands/:brandId/douyin/digital-human/script/generate")
  generateDouyinDigitalHumanScript(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateDouyinDigitalHumanScriptPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.generateDouyinDigitalHumanScript(brandId, payload);
    });
  }

  @Get("brands/:brandId/douyin/video/storyboard-image/providers")
  async listDouyinVideoStoryboardImageProviders(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.video", "view", auth);
    return this.worksService.listDouyinVideoStoryboardImageOptions();
  }

  @Get("xiaohongshu/original/reference-templates")
  listXiaohongshuOriginalReferenceTemplates() {
    return this.worksService.listXiaohongshuOriginalReferenceTemplates();
  }

  @Get("xiaohongshu/original/reference-templates/:templateId/asset")
  async getXiaohongshuOriginalReferenceTemplateAsset(
    @Param("templateId") templateId: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = await this.worksService.getXiaohongshuOriginalReferenceTemplateAsset(templateId);
    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Content-Disposition", `inline; filename=\"${encodeURIComponent(file.fileName)}\"`);
    response.setHeader("Cache-Control", "public, max-age=31536000");
    return response.send(file.buffer);
  }

  @Get("image-prompt-center/templates/:templateId/preview")
  async getImagePromptTemplatePreview(
    @Param("templateId") templateId: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = await this.worksService.getImagePromptTemplatePreviewAsset(templateId);
    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Content-Disposition", `inline; filename=\"${encodeURIComponent(file.fileName)}\"`);
    response.setHeader("Cache-Control", "public, max-age=31536000");
    return response.send(file.buffer);
  }

  @Post("brands/:brandId/xiaohongshu/original/generate")
  generateXiaohongshuOriginalNote(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateXiaohongshuOriginalNotePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService
      .resolveRequestAuthContext(headers)
      .then(async (auth) => {
        const access = await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "edit", auth);
        return this.worksService.generateXiaohongshuOriginalNote(brandId, payload, auth, access.role);
      });
  }

  @Post("brands/:brandId/xiaohongshu/rewrite/generate")
  generateXiaohongshuRewriteNote(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateXiaohongshuRewriteNotePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService
      .resolveRequestAuthContext(headers)
      .then(async (auth) => {
        const access = await this.authService.assertBrandPermission(brandId, "xiaohongshu.remix", "edit", auth);
        return this.worksService.generateXiaohongshuRewriteNote(brandId, payload, auth, access.role);
      });
  }

  @Post("brands/:brandId/xiaohongshu/video/generate")
  generateXiaohongshuVideoNote(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateXiaohongshuVideoNotePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService
      .resolveRequestAuthContext(headers)
      .then(async (auth) => {
        const access = await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
        return this.worksService.generateXiaohongshuVideoNote(brandId, payload, auth, access.role);
      });
  }

  @Post("brands/:brandId/douyin/video/generate")
  generateDouyinVideoNote(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateDouyinVideoNotePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService
      .resolveRequestAuthContext(headers)
      .then(async (auth) => {
        const access = await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
        return this.worksService.generateDouyinVideoNote(brandId, payload, auth, access.role);
      });
  }

  @Post("brands/:brandId/douyin/direct-video/generate")
  generateDouyinDirectVideo(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateDouyinDirectVideoPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService
      .resolveRequestAuthContext(headers)
      .then(async (auth) => {
        const access = await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
        return this.worksService.generateDouyinDirectVideo(brandId, payload, auth, access.role);
      });
  }

  @Post("brands/:brandId/douyin/remix-short-video/generate")
  generateDouyinRemixShortVideo(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateDouyinRemixShortVideoPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService
      .resolveRequestAuthContext(headers)
      .then(async (auth) => {
        const access = await this.authService.assertBrandPermission(brandId, "douyin.remixShortVideo", "edit", auth);
        return this.worksService.generateDouyinRemixShortVideo(brandId, payload, auth, access.role);
      });
  }

  @Post("brands/:brandId/douyin/digital-human/video/generate")
  generateDouyinDigitalHumanVideo(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateDouyinDigitalHumanVideoPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService
      .resolveRequestAuthContext(headers)
      .then(async (auth) => {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        return this.worksService.generateDouyinDigitalHumanVideo(brandId, payload, auth);
      });
  }

  @Post("brands/:brandId/douyin/digital-human/video/complete")
  generateDouyinDigitalHumanCompleteVideo(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateDouyinDigitalHumanCompleteVideoPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService
      .resolveRequestAuthContext(headers)
      .then(async (auth) => {
        await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
        return this.worksService.generateDouyinDigitalHumanCompleteVideo(brandId, payload, auth);
      });
  }

  @Post("brands/:brandId/xiaohongshu/video/:workId/storyboard/regenerate")
  regenerateXiaohongshuVideoStoryboard(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: RegenerateXiaohongshuVideoStoryboardPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
      return this.worksService.regenerateXiaohongshuVideoStoryboard(brandId, workId, payload, auth);
    });
  }

  @Post("brands/:brandId/douyin/video/:workId/storyboard/regenerate")
  regenerateDouyinVideoStoryboard(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: RegenerateDouyinVideoStoryboardPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
      return this.worksService.regenerateDouyinVideoStoryboard(brandId, workId, payload, auth);
    });
  }

  @Post("brands/:brandId/xiaohongshu/video/:workId/video/generate")
  continueXiaohongshuVideoGeneration(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: ContinueXiaohongshuVideoGenerationPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
      return this.worksService.continueXiaohongshuVideoGeneration(brandId, workId, payload, auth);
    });
  }

  @Post("brands/:brandId/douyin/video/:workId/video/generate")
  continueDouyinVideoGeneration(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: ContinueDouyinVideoGenerationPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
      return this.worksService.continueDouyinVideoGeneration(brandId, workId, payload, auth);
    });
  }

  @Post("brands/:brandId/douyin/direct-video/:workId/video/generate")
  continueDouyinDirectVideoGeneration(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: ContinueDouyinDirectVideoGenerationPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
      return this.worksService.continueDouyinDirectVideoGeneration(brandId, workId, payload, auth);
    });
  }

  @Post("brands/:brandId/douyin/remix-short-video/:workId/video/generate")
  continueDouyinRemixShortVideoGeneration(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: ContinueDouyinRemixShortVideoGenerationPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.remixShortVideo", "edit", auth);
      return this.worksService.continueDouyinRemixShortVideoGeneration(brandId, workId, payload, auth);
    });
  }

  @Post("brands/:brandId/xiaohongshu/video/recover")
  recoverXiaohongshuVideoGeneration(
    @Param("brandId") brandId: string,
    @Body() payload: RecoverXiaohongshuVideoGenerationPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
      return this.worksService.recoverXiaohongshuVideoGeneration(brandId, payload);
    });
  }

  @Post("brands/:brandId/douyin/video/recover")
  recoverDouyinVideoGeneration(
    @Param("brandId") brandId: string,
    @Body() payload: RecoverDouyinVideoGenerationPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
      return this.worksService.recoverDouyinVideoGeneration(brandId, payload);
    });
  }

  @Post("brands/:brandId/douyin/direct-video/recover")
  recoverDouyinDirectVideoGeneration(
    @Param("brandId") brandId: string,
    @Body() payload: RecoverDouyinDirectVideoGenerationPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
      return this.worksService.recoverDouyinDirectVideoGeneration(brandId, payload);
    });
  }

  @Post("brands/:brandId/douyin/digital-human/video/recover")
  recoverDouyinDigitalHumanVideo(
    @Param("brandId") brandId: string,
    @Body() payload: RecoverDouyinDigitalHumanVideoPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.recoverDouyinDigitalHumanVideo(brandId, payload);
    });
  }

  @Patch("brands/:brandId/xiaohongshu/original/:workId")
  updateXiaohongshuOriginalNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: UpdateXiaohongshuOriginalNotePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "edit", auth);
      return this.worksService.updateXiaohongshuOriginalNote(brandId, workId, payload);
    });
  }

  @Patch("brands/:brandId/xiaohongshu/rewrite/:workId")
  updateXiaohongshuRewriteNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: UpdateXiaohongshuRewriteNotePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "xiaohongshu.remix", "edit", auth);
      return this.worksService.updateXiaohongshuRewriteNote(brandId, workId, payload);
    });
  }

  @Patch("brands/:brandId/xiaohongshu/video/:workId")
  updateXiaohongshuVideoNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: UpdateXiaohongshuVideoNotePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
      return this.worksService.updateXiaohongshuVideoNote(brandId, workId, payload);
    });
  }

  @Patch("brands/:brandId/douyin/video/:workId")
  updateDouyinVideoNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: UpdateDouyinVideoNotePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
      return this.worksService.updateDouyinVideoNote(brandId, workId, payload);
    });
  }

  @Patch("brands/:brandId/douyin/direct-video/:workId")
  updateDouyinDirectVideo(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: UpdateDouyinDirectVideoPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
      return this.worksService.updateDouyinDirectVideo(brandId, workId, payload);
    });
  }

  @Delete("brands/:brandId/xiaohongshu/original/:workId")
  deleteXiaohongshuOriginalNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "edit", auth);
      return this.worksService.deleteXiaohongshuOriginalNote(brandId, workId);
    });
  }

  @Delete("brands/:brandId/xiaohongshu/rewrite/:workId")
  deleteXiaohongshuRewriteNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "xiaohongshu.remix", "edit", auth);
      return this.worksService.deleteXiaohongshuRewriteNote(brandId, workId);
    });
  }

  @Delete("brands/:brandId/xiaohongshu/video/:workId")
  deleteXiaohongshuVideoNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
      return this.worksService.deleteXiaohongshuVideoNote(brandId, workId);
    });
  }

  @Delete("brands/:brandId/douyin/video/:workId")
  deleteDouyinVideoNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.video", "edit", auth);
      return this.worksService.deleteDouyinVideoNote(brandId, workId);
    });
  }

  @Delete("brands/:brandId/douyin/direct-video/:workId")
  deleteDouyinDirectVideo(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.videoDirect", "edit", auth);
      return this.worksService.deleteDouyinDirectVideo(brandId, workId);
    });
  }

  @Delete("brands/:brandId/douyin/remix-short-video/:workId")
  deleteDouyinRemixShortVideo(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.remixShortVideo", "edit", auth);
      return this.worksService.deleteDouyinRemixShortVideo(brandId, workId);
    });
  }

  @Delete("brands/:brandId/douyin/digital-human/video/:workId")
  deleteDouyinDigitalHumanVideo(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.deleteDouyinDigitalHumanVideo(brandId, workId);
    });
  }

  @Get("brands/:brandId/assets/:fileName")
  async getGeneratedAsset(
    @Param("brandId") brandId: string,
    @Param("fileName") fileName: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = await this.worksService.getGeneratedAsset(brandId, fileName);
    response.setHeader("Content-Type", file.contentType);
    return response.send(file.buffer);
  }
}

function normalizeDigitalHumanCustomPersonPayload(
  payload: Record<string, unknown>,
  uploadedFile?: {
    path?: string;
    originalname?: string;
    mimetype?: string;
    size?: number;
  },
): CreateDouyinDigitalHumanCustomPersonPayload {
  const trainingVideoFromBody = readRecord(payload.trainingVideo);
  return {
    name: readOptionalString(payload.name),
    trainType: payload.trainType === "both" ? "both" : payload.trainType === "figure" ? "figure" : undefined,
    language: readOptionalString(payload.language),
    resolutionRate: payload.resolutionRate === "4K" ? "4K" : payload.resolutionRate === "1080p" ? "1080p" : undefined,
    errorSkip: readOptionalBoolean(payload.errorSkip),
    trainingVideo: uploadedFile?.path
      ? {
          fileName: uploadedFile.originalname || "training-video.mp4",
          contentType: uploadedFile.mimetype || "application/octet-stream",
          tempFilePath: uploadedFile.path,
          sizeBytes: typeof uploadedFile.size === "number" ? uploadedFile.size : undefined,
        }
      : trainingVideoFromBody
        ? {
            fileName: readOptionalString(trainingVideoFromBody.fileName) || "training-video.mp4",
            contentType: readOptionalString(trainingVideoFromBody.contentType) || "application/octet-stream",
            dataBase64: readOptionalString(trainingVideoFromBody.dataBase64),
          }
        : undefined,
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value === "true" || value === "1") {
      return true;
    }
    if (value === "false" || value === "0") {
      return false;
    }
  }
  return undefined;
}
