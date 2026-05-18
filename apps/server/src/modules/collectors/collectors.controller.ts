import { Body, Controller, Get, Headers, Inject, Param, Post, Query, Res } from "@nestjs/common";
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
  async syncBrandAccounts(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncBrandAccounts(brandId);
  }

  @Post("brands/:brandId/competitor-accounts/sync")
  async syncCompetitorAccounts(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncCompetitorAccounts(brandId);
  }

  @Post("brands/:brandId/brand-notes/sync")
  async syncBrandNotes(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncBrandNotes(brandId);
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
    response.setHeader("Cache-Control", "private, max-age=1800");
    response.setHeader(
      "Content-Disposition",
      `${download === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    return response.status(200).send(file.buffer);
  }
}
