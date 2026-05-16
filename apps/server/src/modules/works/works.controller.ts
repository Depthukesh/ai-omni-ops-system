import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Res } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import {
  type GenerateXiaohongshuVideoNotePayload,
  WorksService,
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
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.original", "edit", auth);
        return this.worksService.generateXiaohongshuOriginalNote(brandId, payload, auth);
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
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.remix", "edit", auth);
        return this.worksService.generateXiaohongshuRewriteNote(brandId, payload, auth);
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
        await this.authService.assertBrandPermission(brandId, "xiaohongshu.video", "edit", auth);
        return this.worksService.generateXiaohongshuVideoNote(brandId, payload, auth);
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
