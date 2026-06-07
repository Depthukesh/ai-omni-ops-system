import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SkillPackageKnowledgeSpacesController } from "./skill-package-knowledge-spaces.controller";
import { SkillPackageKnowledgeSpacesService } from "./skill-package-knowledge-spaces.service";

@Module({
  imports: [AuthModule],
  controllers: [SkillPackageKnowledgeSpacesController],
  providers: [SkillPackageKnowledgeSpacesService],
  exports: [SkillPackageKnowledgeSpacesService],
})
export class SkillPackageKnowledgeSpacesModule {}
