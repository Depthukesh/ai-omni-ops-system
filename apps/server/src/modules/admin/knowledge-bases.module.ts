import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { KnowledgeBaseFilesController } from "./knowledge-base-files.controller";
import { KnowledgeBindingsController } from "./knowledge-bindings.controller";
import { KnowledgeBasesController } from "./knowledge-bases.controller";
import { KnowledgeBasesService } from "./knowledge-bases.service";

@Module({
  imports: [AuthModule],
  controllers: [KnowledgeBasesController, KnowledgeBaseFilesController, KnowledgeBindingsController],
  providers: [KnowledgeBasesService],
})
export class KnowledgeBasesModule {}
