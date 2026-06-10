import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ApiProvidersModule } from "./api-providers.module";
import { ThirdPartyPlatformsModule } from "../third-party-platforms/third-party-platforms.module";
import { KnowledgeBaseFilesController } from "./knowledge-base-files.controller";
import { KnowledgeBindingsController } from "./knowledge-bindings.controller";
import { KnowledgeBasesController } from "./knowledge-bases.controller";
import { KnowledgeBasesService } from "./knowledge-bases.service";

@Module({
  imports: [AuthModule, ThirdPartyPlatformsModule, ApiProvidersModule],
  controllers: [KnowledgeBasesController, KnowledgeBaseFilesController, KnowledgeBindingsController],
  providers: [KnowledgeBasesService],
  exports: [KnowledgeBasesService],
})
export class KnowledgeBasesModule {}
