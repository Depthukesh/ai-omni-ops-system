import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SkillPackageSkillsModule } from "./skill-package-skills.module";
import { SkillPackagesModule } from "./skill-packages.module";
import { SkillInstallerService } from "./skill-installer.service";
import { SkillsPromptsController } from "./skills-prompts.controller";
import { SkillsPromptsService } from "./skills-prompts.service";

@Module({
  imports: [AuthModule, SkillPackageSkillsModule, forwardRef(() => SkillPackagesModule)],
  controllers: [SkillsPromptsController],
  providers: [SkillsPromptsService, SkillInstallerService],
  exports: [SkillsPromptsService],
})
export class SkillsPromptsModule {}
