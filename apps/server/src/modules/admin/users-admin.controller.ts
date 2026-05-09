import { Body, Controller, Get, Headers, Param, Patch } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import { UsersAdminService, type UpdateAdminUserPayload } from "./users-admin.service";

@Controller("admin/users")
export class UsersAdminController {
  constructor(
    private readonly usersAdminService: UsersAdminService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listUsers(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.supportRead);
    return this.usersAdminService.listUsers();
  }

  @Patch(":id")
  async updateUser(
    @Param("id") id: string,
    @Body() payload: UpdateAdminUserPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.usersAdminService.updateUser(id, payload);
  }
}
