import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CreateSkillConfigPayload,
  SkillsPromptsService,
  type UpdatePromptTemplatePayload,
  type UpdateSkillConfigPayload,
} from "./skills-prompts.service";

@Controller("admin")
export class SkillsPromptsController {
  constructor(
    private readonly skillsPromptsService: SkillsPromptsService,
    private readonly authService: AuthService,
  ) {}

  @Get("skills")
  async listSkills(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillsPromptsService.listSkills();
  }

  @Post("skills")
  async createSkill(
    @Body() payload: CreateSkillConfigPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillsPromptsService.createSkill(payload);
  }

  @Patch("skills/:id")
  async updateSkill(
    @Param("id") id: string,
    @Body() payload: UpdateSkillConfigPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillsPromptsService.updateSkill(id, payload);
  }

  @Get("prompts")
  async listPrompts(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillsPromptsService.listPrompts();
  }

  @Patch("prompts/:id")
  async updatePrompt(
    @Param("id") id: string,
    @Body() payload: UpdatePromptTemplatePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillsPromptsService.updatePrompt(id, payload);
  }
}
