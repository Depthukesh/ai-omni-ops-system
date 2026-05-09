import { Body, Controller, Get, Headers, Inject, Param, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { CollectorsService } from "./collectors.service";

@Controller("collectors/daily-hotspots")
export class DailyHotspotsController {
  constructor(
    @Inject(CollectorsService) private readonly collectorsService: CollectorsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get("brands/:brandId/workspace")
  async workspace(
    @Param("brandId") brandId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query("date") date?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.getDailyHotspotWorkspace(brandId, date);
  }

  @Post("brands/:brandId/sync")
  async sync(
    @Param("brandId") brandId: string,
    @Body() payload: { platformTitles?: string[] },
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(brandId, auth);
    return this.collectorsService.syncDailyHotspots(brandId, payload.platformTitles ?? []);
  }
}
