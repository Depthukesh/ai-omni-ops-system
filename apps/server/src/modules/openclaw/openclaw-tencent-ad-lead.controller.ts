import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawTencentAdLeadService } from "./openclaw-tencent-ad-lead.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/tencent-ad-leads")
export class OpenClawTencentAdLeadController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawTencentAdLeadService: OpenClawTencentAdLeadService,
  ) {}

  @Get()
  async listRecords(
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
    return this.openClawTencentAdLeadService.listWorkspace(brandId, workspaceScope || "paid_acquisition", limit ? Number(limit) : undefined);
  }

  @Post()
  async createRecord(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      title?: string;
      content?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawTencentAdLeadService.createRecord({
      brandId,
      workspaceScope: payload?.workspaceScope || "paid_acquisition",
      createdByUserId: auth.userId,
      title: payload?.title,
      content: payload?.content,
    });
    const workspace = await this.openClawTencentAdLeadService.listWorkspace(brandId, payload?.workspaceScope || "paid_acquisition");
    return {
      item,
      workspace,
    };
  }

  @Delete(":recordId")
  async deleteRecord(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("recordId") recordId: string,
    @Query("workspaceScope") workspaceScope?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawTencentAdLeadService.deleteRecord(brandId, workspaceScope || "paid_acquisition", recordId);
    const workspace = await this.openClawTencentAdLeadService.listWorkspace(brandId, workspaceScope || "paid_acquisition");
    return {
      item,
      workspace,
    };
  }
}
