import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ModelUsageController } from "./model-usage.controller";
import { ModelUsageService } from "./model-usage.service";

@Module({
  imports: [AuthModule],
  controllers: [ModelUsageController],
  providers: [ModelUsageService],
})
export class ModelUsageModule {}
