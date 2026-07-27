import { Controller, Get, Headers, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { SystemUpdateService } from "./system-update.service";

@Controller("system/update")
export class SystemUpdateController {
  constructor(
    private readonly systemUpdateService: SystemUpdateService,
    private readonly authService: AuthService,
  ) {}

  @Get("status")
  async getStatus(@Headers() headers: Record<string, string | string[] | undefined>) {
    await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.systemUpdateService.getStatus();
  }

  @Post("check")
  async check(@Headers() headers: Record<string, string | string[] | undefined>) {
    await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.systemUpdateService.checkForUpdates();
  }

  @Post("download")
  async download(@Headers() headers: Record<string, string | string[] | undefined>) {
    await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.systemUpdateService.downloadLatestUpdate();
  }

  @Post("apply")
  async apply(@Headers() headers: Record<string, string | string[] | undefined>) {
    await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.systemUpdateService.applyLatestUpdate();
  }
}
