import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { KnowledgeBaseFilesController } from "./knowledge-base-files.controller";
import { KnowledgeBasesController } from "./knowledge-bases.controller";
import { KnowledgeBasesService } from "./knowledge-bases.service";

@Module({
  imports: [AuthModule],
  controllers: [KnowledgeBasesController, KnowledgeBaseFilesController],
  providers: [KnowledgeBasesService],
})
export class KnowledgeBasesModule {}
