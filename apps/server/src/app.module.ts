import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ApiProvidersModule } from "./modules/admin/api-providers.module";
import { BillingRulesModule } from "./modules/admin/billing-rules.module";
import { KnowledgeBasesModule } from "./modules/admin/knowledge-bases.module";
import { ModelUsageModule } from "./modules/admin/model-usage.module";
import { SkillsPromptsModule } from "./modules/admin/skills-prompts.module";
import { UsersAdminModule } from "./modules/admin/users-admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { CollectorsModule } from "./modules/collectors/collectors.module";
import { MediaModule } from "./modules/media/media.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PublishingModule } from "./modules/publishing/publishing.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { WorksModule } from "./modules/works/works.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
    ApiProvidersModule,
    BillingRulesModule,
    KnowledgeBasesModule,
    UsersAdminModule,
    ModelUsageModule,
    SkillsPromptsModule,
    AuthModule,
    BrandsModule,
    CollectorsModule,
    TasksModule,
    MediaModule,
    OrdersModule,
    PublishingModule,
    ReportsModule,
    WorksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
