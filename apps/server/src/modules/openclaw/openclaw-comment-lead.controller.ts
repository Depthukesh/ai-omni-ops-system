import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawCommentLeadService } from "./openclaw-comment-lead.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/comment-leads")
export class OpenClawCommentLeadController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawCommentLeadService: OpenClawCommentLeadService,
  ) {}

  @Get()
  async listLeads(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("sourcePlatform") sourcePlatform?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawCommentLeadService.listWorkspace({
      brandId,
      workspaceScope: workspaceScope || "all_network_growth",
      sourcePlatform,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  async createLeads(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      sourcePlatforms?: string[];
      xiaohongshuSourceUrls?: string[];
      douyinSourceUrls?: string[];
      matchKeywords?: string[];
      syncCommentsFirst?: boolean;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const result = await this.openClawCommentLeadService.createLeadsFromCollectors({
      brandId,
      workspaceScope: payload?.workspaceScope || "all_network_growth",
      createdByUserId: auth.userId,
      sourcePlatforms: payload?.sourcePlatforms,
      xiaohongshuSourceUrls: payload?.xiaohongshuSourceUrls,
      douyinSourceUrls: payload?.douyinSourceUrls,
      matchKeywords: payload?.matchKeywords,
      syncCommentsFirst: payload?.syncCommentsFirst === true,
    });
    const workspace = await this.openClawCommentLeadService.listWorkspace({
      brandId,
      workspaceScope: payload?.workspaceScope || "all_network_growth",
    });
    return {
      result,
      workspace,
    };
  }

  @Delete(":leadId")
  async deleteLead(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("leadId") leadId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("sourcePlatform") sourcePlatform?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawCommentLeadService.deleteLead(brandId, workspaceScope || "all_network_growth", leadId);
    const workspace = await this.openClawCommentLeadService.listWorkspace({
      brandId,
      workspaceScope: workspaceScope || "all_network_growth",
      sourcePlatform,
    });
    return {
      item,
      workspace,
    };
  }
}
