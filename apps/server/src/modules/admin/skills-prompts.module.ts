import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SkillInstallerService } from "./skill-installer.service";
import { SkillsPromptsController } from "./skills-prompts.controller";
import { SkillsPromptsService } from "./skills-prompts.service";

@Module({
  imports: [AuthModule],
  controllers: [SkillsPromptsController],
  providers: [SkillsPromptsService, SkillInstallerService],
  exports: [SkillsPromptsService],
})
export class SkillsPromptsModule {}
