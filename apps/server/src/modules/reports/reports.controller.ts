import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Query, Res, UnauthorizedException } from "@nestjs/common";
import { type BrandPermissionAction, type BrandPermissionKey } from "../../../../../packages/shared/src/brand-permissions";
import { AuthService } from "../auth/auth.service";
import {
  ReportsService,
  type GenerateAnnualMarketingPlanPayload,
  type GenerateDouyinMarketingPlanPayload,
  type GenerateOpportunityInsightPayload,
  type GenerateXiaohongshuMarketingCalendarPayload,
  type GenerateXiaohongshuMarketingPlanPayload,
  type GenerateDouyinOriginalCopyPayload,
  type GenerateDouyinRemixCopyPayload,
  type UpdateDouyinOriginalCopyPayload,
  type UpdateDouyinRemixCopyPayload,
  type UpdateDouyinTopicLibraryPayload,
  type UpdateDouyinMarketingPlanPayload,
  type UpdateGrowthReportPayload,
  type UpdateVisualGrowthReportPayload,
  type UpdateXiaohongshuMarketingPlanPayload,
  type UpdateXiaohongshuMarketingCalendarPayload,
} from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly reportsService: ReportsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  private async assertAnyBrandPermission(
    brandId: string,
    permissions: Array<{ key: BrandPermissionKey; action: BrandPermissionAction }>,
    auth?: Parameters<AuthService["assertBrandPermission"]>[3],
  ) {
    const results = await Promise.allSettled(
      permissions.map((permission) =>
        this.authService.assertBrandPermission(brandId, permission.key, permission.action, auth),
      ),
    );
    const granted = results.find((item) => item.status === "fulfilled");
    if (granted?.status === "fulfilled") {
      return granted.value;
    }
    throw new UnauthorizedException(
      permissions.some((item) => item.action === "edit")
        ? "当前账号没有该板块的编辑权限"
        : "当前账号没有该板块的查看权限",
    );
  }

  @Get("brands/:brandId/growth-report")
  async getGrowthReportWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.growthReport", "view", auth);
    return this.reportsService.getGrowthReportWorkspace(brandId);
  }

  @Post("brands/:brandId/growth-report/generate")
  async generateGrowthReport(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.growthReport", "edit", auth);
    return this.reportsService.generateGrowthReport(brandId);
  }

  @Get("brands/:brandId/opportunity-insight")
  async getOpportunityInsightWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.opportunityInsight", "view", auth);
    return this.reportsService.getOpportunityInsightWorkspace(brandId);
  }

  @Post("brands/:brandId/opportunity-insight/step-one/generate")
  async generateOpportunityInsightStepOne(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateOpportunityInsightPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.opportunityInsight", "edit", auth);
    return this.reportsService.generateOpportunityInsightStepOne(brandId, payload);
  }

  @Post("brands/:brandId/opportunity-insight/step-two/generate")
  async generateOpportunityInsightStepTwo(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateOpportunityInsightPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.opportunityInsight", "edit", auth);
    return this.reportsService.generateOpportunityInsightStepTwo(brandId, payload);
  }

  @Post("brands/:brandId/opportunity-insight/step-three/generate")
  async generateOpportunityInsightStepThree(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateOpportunityInsightPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.opportunityInsight", "edit", auth);
    return this.reportsService.generateOpportunityInsightStepThree(brandId, payload);
  }

  @Get("brands/:brandId/assets/:fileName")
  async getReportAsset(
    @Param("brandId") brandId: string,
    @Param("fileName") fileName: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = await this.reportsService.getReportAsset(brandId, fileName);
    response.setHeader("Content-Type", file.contentType);
    return response.send(file.buffer);
  }

  @Patch("brands/:brandId/growth-report/:reportId")
  async updateGrowthReport(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateGrowthReportPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.growthReport", "edit", auth);
    return this.reportsService.updateGrowthReport(brandId, reportId, payload);
  }

  @Get("brands/:brandId/visual-growth-report")
  async getVisualGrowthReportWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.visualGrowthReport", "view", auth);
    return this.reportsService.getVisualGrowthReportWorkspace(brandId);
  }

  @Post("brands/:brandId/visual-growth-report/generate")
  async generateVisualGrowthReport(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.visualGrowthReport", "edit", auth);
    return this.reportsService.generateVisualGrowthReport(brandId);
  }

  @Patch("brands/:brandId/visual-growth-report/:reportId")
  async updateVisualGrowthReport(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateVisualGrowthReportPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.visualGrowthReport", "edit", auth);
    return this.reportsService.updateVisualGrowthReport(brandId, reportId, payload);
  }

  @Get("brands/:brandId/half-year-marketing-plan")
  async getHalfYearMarketingPlanWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.halfYearMarketingPlan", "view", auth);
    return this.reportsService.getAnnualMarketingPlanWorkspace(brandId);
  }

  @Get("brands/:brandId/annual-marketing-plan")
  async getAnnualMarketingPlanWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.halfYearMarketingPlan", "view", auth);
    return this.reportsService.getAnnualMarketingPlanWorkspace(brandId);
  }

  @Post("brands/:brandId/half-year-marketing-plan/generate")
  async generateHalfYearMarketingPlan(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateAnnualMarketingPlanPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.halfYearMarketingPlan", "edit", auth);
    return this.reportsService.generateAnnualMarketingPlan(brandId, payload);
  }

  @Post("brands/:brandId/annual-marketing-plan/generate")
  async generateAnnualMarketingPlan(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateAnnualMarketingPlanPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.halfYearMarketingPlan", "edit", auth);
    return this.reportsService.generateAnnualMarketingPlan(brandId, payload);
  }

  @Get("brands/:brandId/xiaohongshu-marketing-plan")
  async getXiaohongshuMarketingPlanWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.plan", "view", auth);
    return this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
  }

  @Post("brands/:brandId/xiaohongshu-marketing-plan/generate")
  async generateXiaohongshuMarketingPlan(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateXiaohongshuMarketingPlanPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.plan", "edit", auth);
    return this.reportsService.generateXiaohongshuMarketingPlan(brandId, payload);
  }

  @Patch("brands/:brandId/xiaohongshu-marketing-plan/:reportId")
  async updateXiaohongshuMarketingPlan(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateXiaohongshuMarketingPlanPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.plan", "edit", auth);
    return this.reportsService.updateXiaohongshuMarketingPlan(brandId, reportId, payload);
  }

  @Delete("brands/:brandId/xiaohongshu-marketing-plan/:reportId")
  async deleteXiaohongshuMarketingPlan(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.plan", "edit", auth);
    return this.reportsService.deleteXiaohongshuMarketingPlan(brandId, reportId);
  }

  @Get("brands/:brandId/douyin-marketing-plan")
  async getDouyinMarketingPlanWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.plan", "view", auth);
    return this.reportsService.getDouyinMarketingPlanWorkspace(brandId);
  }

  @Post("brands/:brandId/douyin-marketing-plan/generate")
  async generateDouyinMarketingPlan(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateDouyinMarketingPlanPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.plan", "edit", auth);
    return this.reportsService.generateDouyinMarketingPlan(brandId, payload);
  }

  @Patch("brands/:brandId/douyin-marketing-plan/:reportId")
  async updateDouyinMarketingPlan(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateDouyinMarketingPlanPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.plan", "edit", auth);
    return this.reportsService.updateDouyinMarketingPlan(brandId, reportId, payload);
  }

  @Delete("brands/:brandId/douyin-marketing-plan/:reportId")
  async deleteDouyinMarketingPlan(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.plan", "edit", auth);
    return this.reportsService.deleteDouyinMarketingPlan(brandId, reportId);
  }

  @Get("brands/:brandId/douyin-hot-topic-candidates")
  async getDouyinHotTopicCandidatesWorkspace(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("date") date?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.assertAnyBrandPermission(brandId, [
      { key: "brandGrowth.report.topicLibrary", action: "view" },
    ], auth);
    return this.reportsService.getDouyinHotTopicCandidatesWorkspace(brandId, date);
  }

  @Post("brands/:brandId/douyin-hot-topic-candidates/generate")
  async generateDouyinHotTopicCandidates(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: { selectedDate?: string },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    return this.reportsService.generateDouyinHotTopicCandidates(brandId, payload?.selectedDate);
  }

  @Patch("brands/:brandId/douyin-topic-library")
  async updateDouyinTopicLibrary(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: UpdateDouyinTopicLibraryPayload,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    return this.reportsService.updateDouyinTopicLibrary(brandId, payload);
  }

  @Get("brands/:brandId/douyin-original-copy")
  async getDouyinOriginalCopyWorkspace(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.assertAnyBrandPermission(brandId, [
      { key: "douyin.original", action: "view" },
      { key: "douyin.video", action: "view" },
    ], auth);
    return this.reportsService.getDouyinOriginalCopyWorkspace(brandId);
  }

  @Post("brands/:brandId/douyin-original-copy/generate")
  async generateDouyinOriginalCopy(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: GenerateDouyinOriginalCopyPayload,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.original", "edit", auth);
    return this.reportsService.generateDouyinOriginalCopy(brandId, payload);
  }

  @Patch("brands/:brandId/douyin-original-copy/:reportId")
  async updateDouyinOriginalCopy(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: UpdateDouyinOriginalCopyPayload,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.original", "edit", auth);
    return this.reportsService.updateDouyinOriginalCopy(brandId, reportId, payload);
  }

  @Delete("brands/:brandId/douyin-original-copy/:reportId")
  async deleteDouyinOriginalCopy(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.original", "edit", auth);
    return this.reportsService.deleteDouyinOriginalCopy(brandId, reportId);
  }

  @Get("brands/:brandId/douyin-remix-copy")
  async getDouyinRemixCopyWorkspace(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.assertAnyBrandPermission(brandId, [
      { key: "douyin.remix", action: "view" },
      { key: "douyin.video", action: "view" },
    ], auth);
    return this.reportsService.getDouyinRemixCopyWorkspace(brandId);
  }

  @Post("brands/:brandId/douyin-remix-copy/generate")
  async generateDouyinRemixCopy(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: GenerateDouyinRemixCopyPayload,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "edit", auth);
    return this.reportsService.generateDouyinRemixCopy(brandId, payload);
  }

  @Patch("brands/:brandId/douyin-remix-copy/:reportId")
  async updateDouyinRemixCopy(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() payload: UpdateDouyinRemixCopyPayload,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "edit", auth);
    return this.reportsService.updateDouyinRemixCopy(brandId, reportId, payload);
  }

  @Delete("brands/:brandId/douyin-remix-copy/:reportId")
  async deleteDouyinRemixCopy(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "douyin.remix", "edit", auth);
    return this.reportsService.deleteDouyinRemixCopy(brandId, reportId);
  }

  @Get("brands/:brandId/xiaohongshu-marketing-calendar")
  async getXiaohongshuMarketingCalendarWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.calendar", "view", auth);
    return this.reportsService.getXiaohongshuMarketingCalendarWorkspace(brandId);
  }

  @Post("brands/:brandId/xiaohongshu-marketing-calendar/generate")
  async generateXiaohongshuMarketingCalendar(
    @Param("brandId") brandId: string,
    @Body() payload: GenerateXiaohongshuMarketingCalendarPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.calendar", "edit", auth);
    return this.reportsService.generateXiaohongshuMarketingCalendar(brandId, payload);
  }

  @Patch("brands/:brandId/xiaohongshu-marketing-calendar/:reportId")
  async updateXiaohongshuMarketingCalendar(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateXiaohongshuMarketingCalendarPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(brandId, "xiaohongshu.calendar", "edit", auth);
    return this.reportsService.updateXiaohongshuMarketingCalendar(brandId, reportId, payload);
  }
}
