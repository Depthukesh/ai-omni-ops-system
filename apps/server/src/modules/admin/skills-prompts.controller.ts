import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CreateSkillPromptBindingPayload,
  type CreatePromptTemplatePayload,
  type CreateSkillConfigPayload,
  SkillsPromptsService,
  type UpdatePromptTemplatePayload,
  type UpdateSkillPromptBindingPayload,
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

  @Post("prompts")
  async createPrompt(
    @Body() payload: CreatePromptTemplatePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillsPromptsService.createPrompt(payload);
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

  @Get("skill-prompt-bindings")
  async listSkillPromptBindings(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillsPromptsService.listSkillPromptBindings();
  }

  @Get("skill-prompt-bindings/by-skill/:skillSlug")
  async listSkillPromptBindingsBySkill(
    @Param("skillSlug") skillSlug: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillsPromptsService.listSkillPromptBindingsBySkill(skillSlug);
  }

  @Post("skill-prompt-bindings")
  async createSkillPromptBinding(
    @Body() payload: CreateSkillPromptBindingPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillsPromptsService.createSkillPromptBinding(payload);
  }

  @Patch("skill-prompt-bindings/:id")
  async updateSkillPromptBinding(
    @Param("id") id: string,
    @Body() payload: UpdateSkillPromptBindingPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillsPromptsService.updateSkillPromptBinding(id, payload);
  }
}
