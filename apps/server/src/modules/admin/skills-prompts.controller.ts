import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import {
  SkillsPromptsService,
  type UpdatePromptTemplatePayload,
  type UpdateSkillConfigPayload,
} from "./skills-prompts.service";

@Controller("admin")
export class SkillsPromptsController {
  constructor(private readonly skillsPromptsService: SkillsPromptsService) {}

  @Get("skills")
  listSkills() {
    return this.skillsPromptsService.listSkills();
  }

  @Patch("skills/:id")
  updateSkill(@Param("id") id: string, @Body() payload: UpdateSkillConfigPayload) {
    return this.skillsPromptsService.updateSkill(id, payload);
  }

  @Get("prompts")
  listPrompts() {
    return this.skillsPromptsService.listPrompts();
  }

  @Patch("prompts/:id")
  updatePrompt(@Param("id") id: string, @Body() payload: UpdatePromptTemplatePayload) {
    return this.skillsPromptsService.updatePrompt(id, payload);
  }
}
