import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AppConfigModule } from "./config/app-config.module";
import { ApiProvidersModule } from "./modules/admin/api-providers.module";
import { BillingRulesModule } from "./modules/admin/billing-rules.module";
import { KnowledgeBasesModule } from "./modules/admin/knowledge-bases.module";
import { ModelUsageModule } from "./modules/admin/model-usage.module";
import { ModuleDefinitionsModule } from "./modules/admin/module-definitions.module";
import { SkillsPromptsModule } from "./modules/admin/skills-prompts.module";
import { SkillPackageModulesModule } from "./modules/admin/skill-package-modules.module";
import { SkillPackageKnowledgeSpacesModule } from "./modules/admin/skill-package-knowledge-spaces.module";
import { SkillPackagesModule } from "./modules/admin/skill-packages.module";
import { SkillPackageSkillsModule } from "./modules/admin/skill-package-skills.module";
import { UsersAdminModule } from "./modules/admin/users-admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { CollectorsModule } from "./modules/collectors/collectors.module";
import { FeedbackModule } from "./modules/feedback/feedback.module";
import { MediaModule } from "./modules/media/media.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { OpenClawModule } from "./modules/openclaw/openclaw.module";
import { PublishingModule } from "./modules/publishing/publishing.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { LocalRuntimeModule } from "./modules/local-runtime/local-runtime.module";
import { SystemUpdateModule } from "./modules/system-update/system-update.module";
import { ThirdPartyPlatformsModule } from "./modules/third-party-platforms/third-party-platforms.module";
import { UserSkillsModule } from "./modules/user-skills/user-skills.module";
import { WorksModule } from "./modules/works/works.module";
import { LocalSingleUserBootstrapService } from "./local-single-user/local-single-user-bootstrap.service";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ApiProvidersModule,
    BillingRulesModule,
    KnowledgeBasesModule,
    ModuleDefinitionsModule,
    SkillPackagesModule,
    SkillPackageModulesModule,
    SkillPackageKnowledgeSpacesModule,
    SkillPackageSkillsModule,
    UsersAdminModule,
    ModelUsageModule,
    SkillsPromptsModule,
    AuthModule,
    BrandsModule,
    CollectorsModule,
    FeedbackModule,
    TasksModule,
    LocalRuntimeModule,
    SystemUpdateModule,
    ThirdPartyPlatformsModule,
    UserSkillsModule,
    MediaModule,
    OpenClawModule,
    OrdersModule,
    PublishingModule,
    ReportsModule,
    WorksModule,
  ],
  controllers: [AppController],
  providers: [AppService, LocalSingleUserBootstrapService],
})
export class AppModule {}
