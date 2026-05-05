import { Controller, Get } from "@nestjs/common";
import { ModelUsageService } from "./model-usage.service";

@Controller("admin/model-usage")
export class ModelUsageController {
  constructor(private readonly modelUsageService: ModelUsageService) {}

  @Get()
  listUsage() {
    return this.modelUsageService.listUsage();
  }
}
