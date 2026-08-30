import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawStrategyOptimizationService } from "./openclaw-strategy-optimization.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/strategy-optimizations")
export class OpenClawStrategyOptimizationController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawStrategyOptimizationService: OpenClawStrategyOptimizationService,
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
    return this.openClawStrategyOptimizationService.listWorkspace(brandId, workspaceScope, limit ? Number(limit) : undefined);
  }

  @Post()
  async createRecord(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      generatedAt?: string;
      title?: string;
      content?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawStrategyOptimizationService.createRecord({
      brandId,
      workspaceScope: payload?.workspaceScope,
      createdByUserId: auth.userId,
      generatedAt: payload?.generatedAt,
      title: payload?.title,
      content: payload?.content,
    });
    const workspace = await this.openClawStrategyOptimizationService.listWorkspace(brandId, payload?.workspaceScope);
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
    const item = await this.openClawStrategyOptimizationService.deleteRecord(brandId, workspaceScope, recordId);
    const workspace = await this.openClawStrategyOptimizationService.listWorkspace(brandId, workspaceScope);
    return {
      item,
      workspace,
    };
  }

  @Patch(":recordId")
  async updateRecord(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("recordId") recordId: string,
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
    const item = await this.openClawStrategyOptimizationService.updateRecord({
      brandId,
      recordId,
      workspaceScope: payload?.workspaceScope,
      title: payload?.title,
      content: payload?.content,
    });
    const workspace = await this.openClawStrategyOptimizationService.listWorkspace(brandId, payload?.workspaceScope);
    return {
      item,
      workspace,
    };
  }
}
