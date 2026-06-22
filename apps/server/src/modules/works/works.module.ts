import { Module } from "@nestjs/common";
import { KnowledgeBasesModule } from "../admin/knowledge-bases.module";
import { StorageModule } from "../../storage/storage.module";
import { ApiProvidersModule } from "../admin/api-providers.module";
import { SkillsPromptsModule } from "../admin/skills-prompts.module";
import { AuthModule } from "../auth/auth.module";
import { BrandsModule } from "../brands/brands.module";
import { CollectorsModule } from "../collectors/collectors.module";
import { ReportsModule } from "../reports/reports.module";
import { ThirdPartyPlatformsModule } from "../third-party-platforms/third-party-platforms.module";
import { ChanjingOpenApiService } from "./chanjing-open-api.service";
import { ImagePromptAdminController } from "./image-prompt-admin.controller";
import { OperationsPromptAdminController } from "./operations-prompt-admin.controller";
import { WechatOfficialAccountApiService } from "./wechat-official-account-api.service";
import { WorksController } from "./works.controller";
import { WorksService } from "./works.service";

@Module({
  imports: [AuthModule, BrandsModule, CollectorsModule, ReportsModule, SkillsPromptsModule, StorageModule, ApiProvidersModule, ThirdPartyPlatformsModule, KnowledgeBasesModule],
  controllers: [WorksController, OperationsPromptAdminController, ImagePromptAdminController],
  providers: [WorksService, ChanjingOpenApiService, WechatOfficialAccountApiService],
  exports: [WorksService],
})
export class WorksModule {}
