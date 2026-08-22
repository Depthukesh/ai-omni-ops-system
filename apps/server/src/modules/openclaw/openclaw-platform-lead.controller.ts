import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawPlatformLeadService } from "./openclaw-platform-lead.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/platform-leads")
export class OpenClawPlatformLeadController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawPlatformLeadService: OpenClawPlatformLeadService,
  ) {}

  @Get()
  async listLeads(
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
    return this.openClawPlatformLeadService.listWorkspace({
      brandId,
      workspaceScope: workspaceScope || "all_network_growth",
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  async createLeads(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      items?: Array<{
        id?: string;
        name: string;
        businessScope: string;
        selectedReason: string;
        contactInfo: string;
        address: string;
        selectedAt?: string;
      }>;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const result = await this.openClawPlatformLeadService.createLeads({
      brandId,
      workspaceScope: payload?.workspaceScope || "all_network_growth",
      createdByUserId: auth.userId,
      items: Array.isArray(payload?.items) ? payload.items : [],
    });
    const workspace = await this.openClawPlatformLeadService.listWorkspace({
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
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawPlatformLeadService.deleteLead(brandId, workspaceScope || "all_network_growth", leadId);
    const workspace = await this.openClawPlatformLeadService.listWorkspace({
      brandId,
      workspaceScope: workspaceScope || "all_network_growth",
    });
    return {
      item,
      workspace,
    };
  }
}
