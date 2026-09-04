import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawMarketingPlanService } from "./openclaw-marketing-plan.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/marketing-plans")
export class OpenClawMarketingPlanController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawMarketingPlanService: OpenClawMarketingPlanService,
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
    return this.openClawMarketingPlanService.listWorkspace(brandId, workspaceScope, limit ? Number(limit) : undefined);
  }

  @Post()
  async createRecord(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      title?: string;
      htmlContent?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawMarketingPlanService.createRecord({
      brandId,
      workspaceScope: payload?.workspaceScope,
      createdByUserId: auth.userId,
      title: payload?.title,
      htmlContent: payload?.htmlContent,
    });
    const workspace = await this.openClawMarketingPlanService.listWorkspace(brandId, payload?.workspaceScope);
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
    const item = await this.openClawMarketingPlanService.deleteRecord(brandId, workspaceScope, recordId);
    const workspace = await this.openClawMarketingPlanService.listWorkspace(brandId, workspaceScope);
    return {
      item,
      workspace,
    };
  }
}
