import { Body, Controller, Get, Headers, Patch } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import { BillingRulesService, type UpdateBillingRulesPayload } from "./billing-rules.service";

@Controller("admin/billing-rules")
export class BillingRulesController {
  constructor(
    private readonly billingRulesService: BillingRulesService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getRules(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.billingRulesService.getRules();
  }

  @Patch()
  async updateRules(
    @Body() payload: UpdateBillingRulesPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.financeWrite);
    return this.billingRulesService.updateRules(payload);
  }
}
