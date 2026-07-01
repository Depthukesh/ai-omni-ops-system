import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawDailyPlanService } from "./openclaw-daily-plan.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/daily-plans")
export class OpenClawDailyPlanController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawDailyPlanService: OpenClawDailyPlanService,
  ) {}

  @Get()
  async listPlans(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawDailyPlanService.listWorkspace(brandId, limit ? Number(limit) : undefined);
  }

  @Post()
  async createPlan(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      planDate?: string;
      title?: string;
      content?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawDailyPlanService.createPlan({
      brandId,
      createdByUserId: auth.userId,
      planDate: payload?.planDate,
      title: payload?.title,
      content: payload?.content,
    });
    const workspace = await this.openClawDailyPlanService.listWorkspace(brandId);
    return {
      item,
      workspace,
    };
  }

  @Delete(":planId")
  async deletePlan(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("planId") planId: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawDailyPlanService.deletePlan(brandId, planId);
    const workspace = await this.openClawDailyPlanService.listWorkspace(brandId);
    return {
      item,
      workspace,
    };
  }
}