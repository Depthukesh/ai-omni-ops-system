import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { CollectorsService } from "./collectors.service";

@Controller("collectors/daily-hotspots")
export class DailyHotspotsController {
  constructor(@Inject(CollectorsService) private readonly collectorsService: CollectorsService) {}

  @Get("brands/:brandId/workspace")
  workspace(@Param("brandId") brandId: string, @Query("date") date?: string) {
    return this.collectorsService.getDailyHotspotWorkspace(brandId, date);
  }

  @Post("brands/:brandId/sync")
  sync(@Param("brandId") brandId: string, @Body() payload: { platformTitles?: string[] }) {
    return this.collectorsService.syncDailyHotspots(brandId, payload.platformTitles ?? []);
  }
}
