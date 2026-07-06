import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawGeoVisibilityReportService } from "./openclaw-geo-visibility-report.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/geo-visibility-reports")
export class OpenClawGeoVisibilityReportController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawGeoVisibilityReportService: OpenClawGeoVisibilityReportService,
  ) {}

  @Get()
  async listReports(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawGeoVisibilityReportService.listWorkspace(brandId, workspaceScope || "geo", limit ? Number(limit) : undefined);
  }

  @Post()
  async createReport(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      title?: string;
      description?: string;
      htmlContent?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawGeoVisibilityReportService.createReport({
      brandId,
      workspaceScope: payload?.workspaceScope || "geo",
      createdByUserId: auth.userId,
      title: payload?.title,
      description: payload?.description,
      htmlContent: payload?.htmlContent,
    });
    const workspace = await this.openClawGeoVisibilityReportService.listWorkspace(brandId, payload?.workspaceScope || "geo");
    return {
      item,
      workspace,
    };
  }

  @Delete(":reportId")
  async deleteReport(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Query("workspaceScope") workspaceScope?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawGeoVisibilityReportService.deleteReport(brandId, workspaceScope || "geo", reportId);
    const workspace = await this.openClawGeoVisibilityReportService.listWorkspace(brandId, workspaceScope || "geo");
    return {
      item,
      workspace,
    };
  }
}
