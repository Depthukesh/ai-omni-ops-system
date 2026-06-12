import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BrandsModule } from "../brands/brands.module";
import { CollectorsModule } from "../collectors/collectors.module";
import { FeedbackModule } from "../feedback/feedback.module";
import { PublishingModule } from "../publishing/publishing.module";
import { ReportsModule } from "../reports/reports.module";
import { TasksModule } from "../tasks/tasks.module";
import { UserSkillsModule } from "../user-skills/user-skills.module";
import { WorksModule } from "../works/works.module";
import { OpenClawController } from "./openclaw.controller";
import { OpenClawInstallationController } from "./openclaw-installation.controller";
import { OpenClawInstallationService } from "./openclaw-installation.service";
import { OpenClawService } from "./openclaw.service";

@Module({
  imports: [AuthModule, TasksModule, BrandsModule, ReportsModule, UserSkillsModule, WorksModule, CollectorsModule, FeedbackModule, PublishingModule],
  controllers: [OpenClawController, OpenClawInstallationController],
  providers: [OpenClawService, OpenClawInstallationService],
  exports: [OpenClawService, OpenClawInstallationService],
})
export class OpenClawModule {}
