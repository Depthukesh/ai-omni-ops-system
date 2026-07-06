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
import { OpenClawCreativeMaterialController } from "./openclaw-creative-material.controller";
import { OpenClawCreativeMaterialService } from "./openclaw-creative-material.service";
import { OpenClawDailyPlanController } from "./openclaw-daily-plan.controller";
import { OpenClawDailyPlanService } from "./openclaw-daily-plan.service";
import { OpenClawInstallationController } from "./openclaw-installation.controller";
import { OpenClawInstallationService } from "./openclaw-installation.service";
import { OpenClawGeoVisibilityReportController } from "./openclaw-geo-visibility-report.controller";
import { OpenClawGeoVisibilityReportService } from "./openclaw-geo-visibility-report.service";
import { OpenClawLobsterDiaryController } from "./openclaw-lobster-diary.controller";
import { OpenClawLobsterDiaryService } from "./openclaw-lobster-diary.service";
import { OpenClawService } from "./openclaw.service";
import { OpenClawVideoWorkController } from "./openclaw-video-work.controller";
import { OpenClawVideoWorkService } from "./openclaw-video-work.service";
import { OrdersModule } from "../orders/orders.module";
import { ThirdPartyPlatformsModule } from "../third-party-platforms/third-party-platforms.module";
import { StorageModule } from "../../storage/storage.module";

@Module({
  imports: [AuthModule, TasksModule, BrandsModule, ReportsModule, UserSkillsModule, WorksModule, CollectorsModule, FeedbackModule, PublishingModule, ThirdPartyPlatformsModule, OrdersModule, StorageModule],
  controllers: [
    OpenClawController,
    OpenClawInstallationController,
    OpenClawGeoVisibilityReportController,
    OpenClawLobsterDiaryController,
    OpenClawDailyPlanController,
    OpenClawCreativeMaterialController,
    OpenClawVideoWorkController,
  ],
  providers: [
    OpenClawService,
    OpenClawInstallationService,
    OpenClawGeoVisibilityReportService,
    OpenClawLobsterDiaryService,
    OpenClawDailyPlanService,
    OpenClawCreativeMaterialService,
    OpenClawVideoWorkService,
  ],
  exports: [
    OpenClawService,
    OpenClawInstallationService,
    OpenClawGeoVisibilityReportService,
    OpenClawLobsterDiaryService,
    OpenClawDailyPlanService,
    OpenClawCreativeMaterialService,
    OpenClawVideoWorkService,
  ],
})
export class OpenClawModule {}
