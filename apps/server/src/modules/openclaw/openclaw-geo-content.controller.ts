import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawGeoContentService } from "./openclaw-geo-content.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/geo-contents")
export class OpenClawGeoContentController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawGeoContentService: OpenClawGeoContentService,
  ) {}

  @Get()
  async listContents(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("contentType") contentType?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawGeoContentService.listWorkspace(brandId, workspaceScope || "geo", {
      contentType,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  async createContent(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      contentType?: string;
      title?: string;
      description?: string;
      htmlContent?: string;
      attachmentFileUrl?: string;
      attachmentFileName?: string;
      attachmentMimeType?: string;
      attachmentStorageKey?: string;
      attachmentUpload?: {
        fileName?: string;
        contentType?: string;
        dataBase64?: string;
      };
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawGeoContentService.createContent({
      brandId,
      workspaceScope: payload?.workspaceScope || "geo",
      createdByUserId: auth.userId,
      contentType: payload?.contentType,
      title: payload?.title,
      description: payload?.description,
      htmlContent: payload?.htmlContent,
      attachmentFileUrl: payload?.attachmentFileUrl,
      attachmentFileName: payload?.attachmentFileName,
      attachmentMimeType: payload?.attachmentMimeType,
      attachmentStorageKey: payload?.attachmentStorageKey,
      attachmentUpload: payload?.attachmentUpload,
    });
    const workspace = await this.openClawGeoContentService.listWorkspace(brandId, payload?.workspaceScope || "geo", {
      contentType: payload?.contentType,
    });
    return {
      item,
      workspace,
    };
  }

  @Delete(":contentId")
  async deleteContent(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("contentId") contentId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("contentType") contentType?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawGeoContentService.deleteContent(brandId, workspaceScope || "geo", contentId);
    const workspace = await this.openClawGeoContentService.listWorkspace(brandId, workspaceScope || "geo", {
      contentType,
    });
    return {
      item,
      workspace,
    };
  }
}
