import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Res } from "@nestjs/common";
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
  constructor(@Inject(WorksService) private readonly worksService: WorksService) {}

  @Get("brands/:brandId/xiaohongshu/original")
  listXiaohongshuOriginalWorks(@Param("brandId") brandId: string) {
    return this.worksService.listXiaohongshuOriginalWorks(brandId);
  }

  @Get("brands/:brandId/xiaohongshu/rewrite")
  listXiaohongshuRewriteWorks(@Param("brandId") brandId: string) {
    return this.worksService.listXiaohongshuRewriteWorks(brandId);
  }

  @Get("brands/:brandId/xiaohongshu/video")
  listXiaohongshuVideoWorks(@Param("brandId") brandId: string) {
    return this.worksService.listXiaohongshuVideoWorks(brandId);
  }

  @Post("brands/:brandId/xiaohongshu/original/generate")
  generateXiaohongshuOriginalNote(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateXiaohongshuOriginalNotePayload,
  ) {
    return this.worksService.generateXiaohongshuOriginalNote(brandId, payload);
  }

  @Post("brands/:brandId/xiaohongshu/rewrite/generate")
  generateXiaohongshuRewriteNote(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateXiaohongshuRewriteNotePayload,
  ) {
    return this.worksService.generateXiaohongshuRewriteNote(brandId, payload);
  }

  @Post("brands/:brandId/xiaohongshu/video/generate")
  generateXiaohongshuVideoNote(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateXiaohongshuVideoNotePayload,
  ) {
    return this.worksService.generateXiaohongshuVideoNote(brandId, payload);
  }

  @Patch("brands/:brandId/xiaohongshu/original/:workId")
  updateXiaohongshuOriginalNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: UpdateXiaohongshuOriginalNotePayload,
  ) {
    return this.worksService.updateXiaohongshuOriginalNote(brandId, workId, payload);
  }

  @Patch("brands/:brandId/xiaohongshu/rewrite/:workId")
  updateXiaohongshuRewriteNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: UpdateXiaohongshuRewriteNotePayload,
  ) {
    return this.worksService.updateXiaohongshuRewriteNote(brandId, workId, payload);
  }

  @Patch("brands/:brandId/xiaohongshu/video/:workId")
  updateXiaohongshuVideoNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: UpdateXiaohongshuVideoNotePayload,
  ) {
    return this.worksService.updateXiaohongshuVideoNote(brandId, workId, payload);
  }

  @Delete("brands/:brandId/xiaohongshu/original/:workId")
  deleteXiaohongshuOriginalNote(@Param("brandId") brandId: string, @Param("workId") workId: string) {
    return this.worksService.deleteXiaohongshuOriginalNote(brandId, workId);
  }

  @Delete("brands/:brandId/xiaohongshu/rewrite/:workId")
  deleteXiaohongshuRewriteNote(@Param("brandId") brandId: string, @Param("workId") workId: string) {
    return this.worksService.deleteXiaohongshuRewriteNote(brandId, workId);
  }

  @Delete("brands/:brandId/xiaohongshu/video/:workId")
  deleteXiaohongshuVideoNote(@Param("brandId") brandId: string, @Param("workId") workId: string) {
    return this.worksService.deleteXiaohongshuVideoNote(brandId, workId);
  }

  @Get("brands/:brandId/assets/:fileName")
  getGeneratedAsset(
    @Param("brandId") brandId: string,
    @Param("fileName") fileName: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = this.worksService.getGeneratedAsset(brandId, fileName);
    response.setHeader("Content-Type", file.contentType);
    return response.send(file.buffer);
  }
}
