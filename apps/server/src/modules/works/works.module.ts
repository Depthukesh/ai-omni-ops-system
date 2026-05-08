import { Module } from "@nestjs/common";
import { SkillsPromptsModule } from "../admin/skills-prompts.module";
import { BrandsModule } from "../brands/brands.module";
import { CollectorsModule } from "../collectors/collectors.module";
import { ReportsModule } from "../reports/reports.module";
import { WorksController } from "./works.controller";
import { WorksService } from "./works.service";

@Module({
  imports: [BrandsModule, CollectorsModule, ReportsModule, SkillsPromptsModule],
  controllers: [WorksController],
  providers: [WorksService],
  exports: [WorksService],
})
export class WorksModule {}
