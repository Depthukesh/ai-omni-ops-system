import { Body, Controller, Get, Headers, Patch } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { type LocalRuntimeSettingsPayload, LocalRuntimeService } from "./local-runtime.service";

@Controller("local-runtime")
export class LocalRuntimeController {
  constructor(
    private readonly localRuntimeService: LocalRuntimeService,
    private readonly authService: AuthService,
  ) {}

  @Get("settings")
  async getSettings(@Headers() headers: Record<string, string | string[] | undefined>) {
    await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.localRuntimeService.getSettings();
  }

  @Patch("settings")
  async updateSettings(
    @Body() payload: LocalRuntimeSettingsPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await this.authService.resolveRequestAuthContext(headers, { fallbackToDefaultUser: true });
    return this.localRuntimeService.updateSettings(payload);
  }
}
