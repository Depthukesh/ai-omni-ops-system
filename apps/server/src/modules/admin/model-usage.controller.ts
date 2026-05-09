import { Controller, Get, Headers } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import { ModelUsageService } from "./model-usage.service";

@Controller("admin/model-usage")
export class ModelUsageController {
  constructor(
    private readonly modelUsageService: ModelUsageService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listUsage(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.modelUsageService.listUsage();
  }
}
