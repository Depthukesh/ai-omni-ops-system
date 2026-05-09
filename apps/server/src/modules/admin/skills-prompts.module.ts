import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SkillsPromptsController } from "./skills-prompts.controller";
import { SkillsPromptsService } from "./skills-prompts.service";

@Module({
  imports: [AuthModule],
  controllers: [SkillsPromptsController],
  providers: [SkillsPromptsService],
  exports: [SkillsPromptsService],
})
export class SkillsPromptsModule {}
