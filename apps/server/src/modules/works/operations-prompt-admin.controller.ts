import { Body, Controller, Get, Headers, Param, Patch } from "@nestjs/common";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "../admin/admin-access";
import { AuthService } from "../auth/auth.service";
import { type UpdateOperationsPromptTemplatePayload, WorksService } from "./works.service";

@Controller("admin/operations-prompts")
export class OperationsPromptAdminController {
  constructor(
    private readonly worksService: WorksService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listOperationsPrompts(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.worksService.listOperationsPromptTemplatesForAdmin();
  }

  @Patch(":id")
  async updateOperationsPrompt(
    @Param("id") id: string,
    @Body() payload: UpdateOperationsPromptTemplatePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.worksService.updateOperationsPromptTemplateForAdmin(id, payload);
  }
}
