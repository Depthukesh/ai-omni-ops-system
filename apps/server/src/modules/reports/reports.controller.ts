import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import {
  ReportsService,
  type UpdateGrowthReportPayload,
  type UpdateVisualGrowthReportPayload,
  type UpdateXiaohongshuMarketingPlanPayload,
  type UpdateXiaohongshuMarketingCalendarPayload,
} from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get("brands/:brandId/growth-report")
  getGrowthReportWorkspace(@Param("brandId") brandId: string) {
    return this.reportsService.getGrowthReportWorkspace(brandId);
  }

  @Post("brands/:brandId/growth-report/generate")
  generateGrowthReport(@Param("brandId") brandId: string) {
    return this.reportsService.generateGrowthReport(brandId);
  }

  @Patch("brands/:brandId/growth-report/:reportId")
  updateGrowthReport(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateGrowthReportPayload,
  ) {
    return this.reportsService.updateGrowthReport(brandId, reportId, payload);
  }

  @Get("brands/:brandId/visual-growth-report")
  getVisualGrowthReportWorkspace(@Param("brandId") brandId: string) {
    return this.reportsService.getVisualGrowthReportWorkspace(brandId);
  }

  @Post("brands/:brandId/visual-growth-report/generate")
  generateVisualGrowthReport(@Param("brandId") brandId: string) {
    return this.reportsService.generateVisualGrowthReport(brandId);
  }

  @Patch("brands/:brandId/visual-growth-report/:reportId")
  updateVisualGrowthReport(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateVisualGrowthReportPayload,
  ) {
    return this.reportsService.updateVisualGrowthReport(brandId, reportId, payload);
  }

  @Get("brands/:brandId/annual-marketing-plan")
  getAnnualMarketingPlanWorkspace(@Param("brandId") brandId: string) {
    return this.reportsService.getAnnualMarketingPlanWorkspace(brandId);
  }

  @Post("brands/:brandId/annual-marketing-plan/generate")
  generateAnnualMarketingPlan(@Param("brandId") brandId: string) {
    return this.reportsService.generateAnnualMarketingPlan(brandId);
  }

  @Get("brands/:brandId/xiaohongshu-marketing-plan")
  getXiaohongshuMarketingPlanWorkspace(@Param("brandId") brandId: string) {
    return this.reportsService.getXiaohongshuMarketingPlanWorkspace(brandId);
  }

  @Post("brands/:brandId/xiaohongshu-marketing-plan/generate")
  generateXiaohongshuMarketingPlan(@Param("brandId") brandId: string) {
    return this.reportsService.generateXiaohongshuMarketingPlan(brandId);
  }

  @Patch("brands/:brandId/xiaohongshu-marketing-plan/:reportId")
  updateXiaohongshuMarketingPlan(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateXiaohongshuMarketingPlanPayload,
  ) {
    return this.reportsService.updateXiaohongshuMarketingPlan(brandId, reportId, payload);
  }

  @Delete("brands/:brandId/xiaohongshu-marketing-plan/:reportId")
  deleteXiaohongshuMarketingPlan(@Param("brandId") brandId: string, @Param("reportId") reportId: string) {
    return this.reportsService.deleteXiaohongshuMarketingPlan(brandId, reportId);
  }

  @Get("brands/:brandId/xiaohongshu-marketing-calendar")
  getXiaohongshuMarketingCalendarWorkspace(@Param("brandId") brandId: string) {
    return this.reportsService.getXiaohongshuMarketingCalendarWorkspace(brandId);
  }

  @Post("brands/:brandId/xiaohongshu-marketing-calendar/generate")
  generateXiaohongshuMarketingCalendar(@Param("brandId") brandId: string) {
    return this.reportsService.generateXiaohongshuMarketingCalendar(brandId);
  }

  @Patch("brands/:brandId/xiaohongshu-marketing-calendar/:reportId")
  updateXiaohongshuMarketingCalendar(
    @Param("brandId") brandId: string,
    @Param("reportId") reportId: string,
    @Body() payload: UpdateXiaohongshuMarketingCalendarPayload,
  ) {
    return this.reportsService.updateXiaohongshuMarketingCalendar(brandId, reportId, payload);
  }
}
