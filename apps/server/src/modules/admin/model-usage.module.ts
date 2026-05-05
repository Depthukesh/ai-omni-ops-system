import { Module } from "@nestjs/common";
import { ModelUsageController } from "./model-usage.controller";
import { ModelUsageService } from "./model-usage.service";

@Module({
  controllers: [ModelUsageController],
  providers: [ModelUsageService],
})
export class ModelUsageModule {}
