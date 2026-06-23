import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "../admin/admin-access";
import { AuthService } from "../auth/auth.service";
import {
  type CreateOperationsPromptTemplatePayload,
  type UpdateOperationsPromptTemplatePayload,
  WorksService,
} from "./works.service";

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

  @Post()
  async createOperationsPrompt(
    @Body() payload: CreateOperationsPromptTemplatePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.worksService.createOperationsPromptTemplateForAdmin(payload);
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

  @Delete(":id")
  async deleteOperationsPrompt(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.worksService.deleteOperationsPromptTemplateForAdmin(id);
  }
}
