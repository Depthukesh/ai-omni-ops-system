import { Module } from "@nestjs/common";
import { KnowledgeBaseFilesController } from "./knowledge-base-files.controller";
import { KnowledgeBasesController } from "./knowledge-bases.controller";
import { KnowledgeBasesService } from "./knowledge-bases.service";

@Module({
  controllers: [KnowledgeBasesController, KnowledgeBaseFilesController],
  providers: [KnowledgeBasesService],
})
export class KnowledgeBasesModule {}
