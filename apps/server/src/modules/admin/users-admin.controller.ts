import { Body, Controller, Delete, Get, Headers, Param, Patch, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import { UsersAdminService, type AdminUserListQuery, type UpdateAdminUserPayload } from "./users-admin.service";

@Controller("admin/users")
export class UsersAdminController {
  constructor(
    private readonly usersAdminService: UsersAdminService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listUsers(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: AdminUserListQuery,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.supportRead);
    return this.usersAdminService.listUsers(query);
  }

  @Get(":id")
  async getUserDetail(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.supportRead);
    return this.usersAdminService.getUserDetail(id);
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

  @Delete(":id")
  async deleteUser(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.usersAdminService.deleteUser(id, auth.userId);
  }
}
