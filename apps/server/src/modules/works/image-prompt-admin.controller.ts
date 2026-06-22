import { Body, Controller, Get, Headers, Param, Patch } from "@nestjs/common";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "../admin/admin-access";
import { AuthService } from "../auth/auth.service";
import { type UpdateImagePromptTemplatePayload, WorksService } from "./works.service";

@Controller("admin/image-prompts")
export class ImagePromptAdminController {
  constructor(
    private readonly worksService: WorksService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listImagePrompts(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.worksService.listImagePromptTemplatesForAdmin();
  }

  @Patch(":id")
  async updateImagePrompt(
    @Param("id") id: string,
    @Body() payload: UpdateImagePromptTemplatePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.worksService.updateImagePromptTemplateForAdmin(id, payload);
  }
}
