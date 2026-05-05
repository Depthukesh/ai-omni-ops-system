import { Module } from "@nestjs/common";
import { SkillsPromptsController } from "./skills-prompts.controller";
import { SkillsPromptsService } from "./skills-prompts.service";

@Module({
  controllers: [SkillsPromptsController],
  providers: [SkillsPromptsService],
})
export class SkillsPromptsModule {}
