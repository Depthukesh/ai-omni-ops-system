import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  ApiProvidersService,
  type CreateApiProviderPayload,
  type UpdateApiProviderPayload,
} from "./api-providers.service";

@Controller("admin/api-providers")
export class ApiProvidersController {
  constructor(
    private readonly apiProvidersService: ApiProvidersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listProviders(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.apiProvidersService.listProviders();
  }

  @Post()
  async createProvider(
    @Body() payload: CreateApiProviderPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.apiProvidersService.createProvider(payload);
  }

  @Patch(":id")
  async updateProvider(
    @Param("id") id: string,
    @Body() payload: UpdateApiProviderPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.apiProvidersService.updateProvider(id, payload);
  }

  @Patch(":id/archive")
  async archiveProvider(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.apiProvidersService.archiveProvider(id);
  }

  @Delete(":id")
  async deleteProvider(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.apiProvidersService.deleteProvider(id);
  }
}
