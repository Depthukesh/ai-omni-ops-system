import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Res } from "@nestjs/common";
import {
  WorksService,
  type GenerateXiaohongshuOriginalNotePayload,
  type UpdateXiaohongshuOriginalNotePayload,
} from "./works.service";

@Controller("works")
export class WorksController {
  constructor(@Inject(WorksService) private readonly worksService: WorksService) {}

  @Get("brands/:brandId/xiaohongshu/original")
  listXiaohongshuOriginalWorks(@Param("brandId") brandId: string) {
    return this.worksService.listXiaohongshuOriginalWorks(brandId);
  }

  @Post("brands/:brandId/xiaohongshu/original/generate")
  generateXiaohongshuOriginalNote(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateXiaohongshuOriginalNotePayload,
  ) {
    return this.worksService.generateXiaohongshuOriginalNote(brandId, payload);
  }

  @Patch("brands/:brandId/xiaohongshu/original/:workId")
  updateXiaohongshuOriginalNote(
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Body() payload: UpdateXiaohongshuOriginalNotePayload,
  ) {
    return this.worksService.updateXiaohongshuOriginalNote(brandId, workId, payload);
  }

  @Delete("brands/:brandId/xiaohongshu/original/:workId")
  deleteXiaohongshuOriginalNote(@Param("brandId") brandId: string, @Param("workId") workId: string) {
    return this.worksService.deleteXiaohongshuOriginalNote(brandId, workId);
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
