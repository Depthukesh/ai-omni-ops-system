import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Res } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import {
  type ContinueDouyinDirectVideoGenerationPayload,
  type ContinueDouyinVideoGenerationPayload,
  type ContinueXiaohongshuVideoGenerationPayload,
  type GenerateDouyinDigitalHumanVideoPayload,
  type GenerateDouyinDirectVideoPayload,
  type GenerateDouyinVideoNotePayload,
  type GenerateXiaohongshuVideoNotePayload,
  type RecoverDouyinDigitalHumanVideoPayload,
  type RecoverDouyinDirectVideoGenerationPayload,
  type RecoverDouyinVideoGenerationPayload,
  type RegenerateXiaohongshuVideoStoryboardPayload,
  type RegenerateDouyinVideoStoryboardPayload,
  type RecoverXiaohongshuVideoGenerationPayload,
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
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.digitalHuman", "view", auth);
    return this.worksService.listDouyinDigitalHumanTemplates(brandId);
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
