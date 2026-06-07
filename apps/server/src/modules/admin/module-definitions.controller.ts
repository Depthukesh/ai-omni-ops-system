import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CreateModuleDefinitionPayload,
  ModuleDefinitionsService,
  type ModuleDefinitionListQuery,
  type UpdateModuleDefinitionPayload,
} from "./module-definitions.service";

@Controller("admin/module-definitions")
export class ModuleDefinitionsController {
  constructor(
    private readonly moduleDefinitionsService: ModuleDefinitionsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listModuleDefinitions(
    @Query("keyword") keyword: string | undefined,
    @Query("moduleType") moduleType: ModuleDefinitionListQuery["moduleType"],
    @Query("moduleStatus") moduleStatus: ModuleDefinitionListQuery["moduleStatus"],
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.moduleDefinitionsService.listModuleDefinitions({
      keyword: keyword ? String(keyword).trim() : undefined,
      moduleType,
      moduleStatus,
    });
  }

  @Get(":id")
  async getModuleDefinition(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.moduleDefinitionsService.getModuleDefinition(id);
  }

  @Post()
  async createModuleDefinition(
    @Body() payload: CreateModuleDefinitionPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.moduleDefinitionsService.createModuleDefinition(payload);
  }

  @Patch(":id")
  async updateModuleDefinition(
    @Param("id") id: string,
    @Body() payload: UpdateModuleDefinitionPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.moduleDefinitionsService.updateModuleDefinition(id, payload);
  }

  @Patch(":id/archive")
  async archiveModuleDefinition(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.moduleDefinitionsService.archiveModuleDefinition(id);
  }

  @Delete(":id")
  async deleteModuleDefinition(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.moduleDefinitionsService.deleteModuleDefinition(id);
  }
}
