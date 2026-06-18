import { forwardRef, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SkillsPromptsModule } from "./skills-prompts.module";
import { SkillPackagesController } from "./skill-packages.controller";
import { SkillPackagesService } from "./skill-packages.service";

@Module({
  imports: [AuthModule, forwardRef(() => SkillsPromptsModule)],
  controllers: [SkillPackagesController],
  providers: [SkillPackagesService],
  exports: [SkillPackagesService],
})
export class SkillPackagesModule {}
