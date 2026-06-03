import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, Res } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import {
  type CreateDouyinDigitalHumanCustomPersonPayload,
  type CreateDouyinVoiceClonePayload,
  type CreateDouyinLipSyncPayload,
  type CreateDouyinDigitalHumanScriptTemplatePayload,
  type ContinueDouyinDirectVideoGenerationPayload,
  type ContinueDouyinVideoGenerationPayload,
  type ContinueXiaohongshuVideoGenerationPayload,
  type SaveWechatAccountConfigPayload,
  type GenerateDouyinDigitalHumanCompleteVideoPayload,
  type GenerateDouyinDigitalHumanVideoPayload,
  type GenerateDouyinDirectVideoPayload,
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

  @Get("brands/:brandId/wechat/articles")
  async listWechatArticleDrafts(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "wechat.original", "view", auth);
    return this.worksService.listWechatArticleDrafts(brandId);
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

  @Post("brands/:brandId/douyin/digital-human/custom-person/create")
  createDouyinDigitalHumanCustomPerson(
    @Param("brandId") brandId: string,
    @Body() payload: CreateDouyinDigitalHumanCustomPersonPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.authService.resolveRequestAuthContext(headers).then(async (auth) => {
      await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "edit", auth);
      return this.worksService.createDouyinDigitalHumanCustomPerson(brandId, payload, auth);
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
