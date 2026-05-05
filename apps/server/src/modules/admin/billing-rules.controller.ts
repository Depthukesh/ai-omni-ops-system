import { Body, Controller, Get, Patch } from "@nestjs/common";
import { BillingRulesService, type UpdateBillingRulesPayload } from "./billing-rules.service";

@Controller("admin/billing-rules")
export class BillingRulesController {
  constructor(private readonly billingRulesService: BillingRulesService) {}

  @Get()
  getRules() {
    return this.billingRulesService.getRules();
  }

  @Patch()
  updateRules(@Body() payload: UpdateBillingRulesPayload) {
    return this.billingRulesService.updateRules(payload);
  }
}
