import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { UsersAdminService, type UpdateAdminUserPayload } from "./users-admin.service";

@Controller("admin/users")
export class UsersAdminController {
  constructor(private readonly usersAdminService: UsersAdminService) {}

  @Get()
  listUsers() {
    return this.usersAdminService.listUsers();
  }

  @Patch(":id")
  updateUser(@Param("id") id: string, @Body() payload: UpdateAdminUserPayload) {
    return this.usersAdminService.updateUser(id, payload);
  }
}
