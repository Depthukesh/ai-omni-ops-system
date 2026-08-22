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
import { OpenClawCommentController } from "./openclaw-comment.controller";
import { OpenClawCommentLeadController } from "./openclaw-comment-lead.controller";
import { OpenClawCommentLeadService } from "./openclaw-comment-lead.service";
import { OpenClawPlatformLeadController } from "./openclaw-platform-lead.controller";
import { OpenClawPlatformLeadService } from "./openclaw-platform-lead.service";
import { OpenClawCommentService } from "./openclaw-comment.service";
import { OpenClawCreativeMaterialController } from "./openclaw-creative-material.controller";
import { OpenClawCreativeMaterialService } from "./openclaw-creative-material.service";
import { OpenClawGeoContentController } from "./openclaw-geo-content.controller";
import { OpenClawGeoContentService } from "./openclaw-geo-content.service";
import { OpenClawDailyPlanController } from "./openclaw-daily-plan.controller";
import { OpenClawDailyPlanService } from "./openclaw-daily-plan.service";
import { OpenClawInstallationController } from "./openclaw-installation.controller";
import { OpenClawInstallationService } from "./openclaw-installation.service";
import { OpenClawGeoVisibilityReportController } from "./openclaw-geo-visibility-report.controller";
import { OpenClawGeoVisibilityReportService } from "./openclaw-geo-visibility-report.service";
import { OpenClawLobsterDiaryController } from "./openclaw-lobster-diary.controller";
import { OpenClawLobsterDiaryService } from "./openclaw-lobster-diary.service";
import { OpenClawThirdPartyMediaDeliveryController } from "./openclaw-third-party-media-delivery.controller";
import { OpenClawService } from "./openclaw.service";
import { OpenClawVideoWorkController } from "./openclaw-video-work.controller";
import { OpenClawVideoWorkService } from "./openclaw-video-work.service";
import { OrdersModule } from "../orders/orders.module";
import { ThirdPartyPlatformsModule } from "../third-party-platforms/third-party-platforms.module";
import { StorageModule } from "../../storage/storage.module";
import { LocalRuntimeModule } from "../local-runtime/local-runtime.module";

@Module({
  imports: [AuthModule, TasksModule, BrandsModule, ReportsModule, UserSkillsModule, WorksModule, CollectorsModule, FeedbackModule, PublishingModule, ThirdPartyPlatformsModule, OrdersModule, StorageModule, LocalRuntimeModule],
  controllers: [
    OpenClawController,
    OpenClawCommentController,
    OpenClawCommentLeadController,
    OpenClawPlatformLeadController,
    OpenClawInstallationController,
    OpenClawGeoVisibilityReportController,
    OpenClawGeoContentController,
    OpenClawThirdPartyMediaDeliveryController,
    OpenClawLobsterDiaryController,
    OpenClawDailyPlanController,
    OpenClawCreativeMaterialController,
    OpenClawVideoWorkController,
  ],
  providers: [
    OpenClawService,
    OpenClawCommentService,
    OpenClawCommentLeadService,
    OpenClawPlatformLeadService,
    OpenClawInstallationService,
    OpenClawGeoVisibilityReportService,
    OpenClawGeoContentService,
    OpenClawLobsterDiaryService,
    OpenClawDailyPlanService,
    OpenClawCreativeMaterialService,
    OpenClawVideoWorkService,
  ],
  exports: [
    OpenClawService,
    OpenClawCommentService,
    OpenClawCommentLeadService,
    OpenClawPlatformLeadService,
    OpenClawInstallationService,
    OpenClawGeoVisibilityReportService,
    OpenClawGeoContentService,
    OpenClawLobsterDiaryService,
    OpenClawDailyPlanService,
    OpenClawCreativeMaterialService,
    OpenClawVideoWorkService,
  ],
})
export class OpenClawModule {}
