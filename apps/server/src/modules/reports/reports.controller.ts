import { Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Res } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import {
  ReportsService,
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

  @Get("brands/:brandId/growth-report")
  async getGrowthReportWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.getGrowthReportWorkspace(brandId);
  }

  @Post("brands/:brandId/growth-report/generate")
  async generateGrowthReport(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandOwnerAccess(brandId, auth);
    return this.reportsService.generateGrowthReport(brandId);
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
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.updateGrowthReport(brandId, reportId, payload);
  }

  @Get("brands/:brandId/visual-growth-report")
  async getVisualGrowthReportWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.getVisualGrowthReportWorkspace(brandId);
  }

  @Post("brands/:brandId/visual-growth-report/generate")
  async generateVisualGrowthReport(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandOwnerAccess(brandId, auth);
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
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.updateVisualGrowthReport(brandId, reportId, payload);
  }

  @Get("brands/:brandId/half-year-marketing-plan")
  async getHalfYearMarketingPlanWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.getAnnualMarketingPlanWorkspace(brandId);
  }

  @Get("brands/:brandId/annual-marketing-plan")
  async getAnnualMarketingPlanWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.getAnnualMarketingPlanWorkspace(brandId);
  }

  @Post("brands/:brandId/half-year-marketing-plan/generate")
  async generateHalfYearMarketingPlan(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.generateAnnualMarketingPlan(brandId);
  }

  @Post("brands/:brandId/annual-marketing-plan/generate")
  async generateAnnualMarketingPlan(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandOwnerAccess(brandId, auth);
    return this.reportsService.generateAnnualMarketingPlan(brandId);
  }

  @Get("brands/:brandId/xiaohongshu-marketing-plan")
  async getXiaohongshuMarketingPlanWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
  }

  @Post("brands/:brandId/xiaohongshu-marketing-plan/generate")
  async generateXiaohongshuMarketingPlan(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.generateXiaohongshuMarketingPlan(brandId);
  }

  @Patch("brands/:brandId/xiaohongshu-marketing-plan/:reportId")
  async updateXiaohongshuMarketingPlan(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateXiaohongshuMarketingPlanPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.updateXiaohongshuMarketingPlan(brandId, reportId, payload);
  }

  @Delete("brands/:brandId/xiaohongshu-marketing-plan/:reportId")
  async deleteXiaohongshuMarketingPlan(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.deleteXiaohongshuMarketingPlan(brandId, reportId);
  }

  @Get("brands/:brandId/xiaohongshu-marketing-calendar")
  async getXiaohongshuMarketingCalendarWorkspace(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.getXiaohongshuMarketingCalendarWorkspace(brandId);
  }

  @Post("brands/:brandId/xiaohongshu-marketing-calendar/generate")
  async generateXiaohongshuMarketingCalendar(@Param("brandId") brandId: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.generateXiaohongshuMarketingCalendar(brandId);
  }

  @Patch("brands/:brandId/xiaohongshu-marketing-calendar/:reportId")
  async updateXiaohongshuMarketingCalendar(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateXiaohongshuMarketingCalendarPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.reportsService.updateXiaohongshuMarketingCalendar(brandId, reportId, payload);
  }
}
