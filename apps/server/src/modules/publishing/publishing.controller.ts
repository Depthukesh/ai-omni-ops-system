import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import {
  PublishingService,
  type CompleteMobileDraftSessionPayload,
  type CreateMobileDraftSessionPayload,
} from "./publishing.service";

@Controller("publishing")
export class PublishingController {
  constructor(@Inject(PublishingService) private readonly publishingService: PublishingService) {}

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
}
