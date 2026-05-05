import { Body, Controller, Get, Inject, Param, Post, Query, Res } from "@nestjs/common";
import { CollectorsService } from "./collectors.service";

@Controller("collectors/xiaohongshu")
export class CollectorsController {
  constructor(@Inject(CollectorsService) private readonly collectorsService: CollectorsService) {}

  @Get("brands/:brandId/workspace")
  workspace(@Param("brandId") brandId: string) {
    return this.collectorsService.getXiaohongshuWorkspace(brandId);
  }

  @Post("brands/:brandId/brand-accounts/sync")
  syncBrandAccounts(@Param("brandId") brandId: string) {
    return this.collectorsService.syncBrandAccounts(brandId);
  }

  @Post("brands/:brandId/competitor-accounts/sync")
  syncCompetitorAccounts(@Param("brandId") brandId: string) {
    return this.collectorsService.syncCompetitorAccounts(brandId);
  }

  @Post("brands/:brandId/brand-notes/sync")
  syncBrandNotes(@Param("brandId") brandId: string) {
    return this.collectorsService.syncBrandNotes(brandId);
  }

  @Post("brands/:brandId/benchmark-notes/sync")
  syncBenchmarkNotes(@Param("brandId") brandId: string, @Body() payload: { sourceUrls?: string[] }) {
    return this.collectorsService.syncBenchmarkNotes(brandId, payload.sourceUrls ?? []);
  }

  @Post("brands/:brandId/material-library")
  addBenchmarkNoteToMaterialLibrary(@Param("brandId") brandId: string, @Body() payload: { assetId: string }) {
    return this.collectorsService.addBenchmarkNoteToMaterialLibrary(brandId, payload.assetId);
  }

  @Post("brands/:brandId/target-users/sync")
  syncTargetUsers(@Param("brandId") brandId: string, @Body() payload: { sourceUrls?: string[] }) {
    return this.collectorsService.syncTargetUsers(brandId, payload.sourceUrls ?? []);
  }

  @Post("brands/:brandId/feishu-sync")
  syncFeishuWorkspace(@Param("brandId") brandId: string) {
    return this.collectorsService.syncFeishuWorkspace(brandId);
  }

  @Get("brands/:brandId/feishu-media")
  async feishuMedia(
    @Param("brandId") brandId: string,
    @Query("sourceUrl") sourceUrl: string,
    @Query("download") download: string | undefined,
    @Res() response: {
      setHeader(name: string, value: string): unknown;
      status(code: number): { send(body: Buffer): unknown };
    },
  ) {
    const file = await this.collectorsService.fetchFeishuMedia(brandId, sourceUrl);
    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Cache-Control", "private, max-age=300");
    response.setHeader(
      "Content-Disposition",
      `${download === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    return response.status(200).send(file.buffer);
  }
}
