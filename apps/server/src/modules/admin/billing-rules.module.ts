import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BillingRulesController } from "./billing-rules.controller";
import { BillingRulesService } from "./billing-rules.service";

@Module({
  imports: [AuthModule],
  controllers: [BillingRulesController],
  providers: [BillingRulesService],
})
export class BillingRulesModule {}
