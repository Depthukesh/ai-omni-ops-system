import { Module } from "@nestjs/common";
import { SkillsPromptsController } from "./skills-prompts.controller";
import { SkillsPromptsService } from "./skills-prompts.service";

@Module({
  controllers: [SkillsPromptsController],
  providers: [SkillsPromptsService],
  exports: [SkillsPromptsService],
})
export class SkillsPromptsModule {}
