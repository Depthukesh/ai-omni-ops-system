import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CreateSkillPackageModulePayload,
  SkillPackageModulesService,
  type SkillPackageModuleListQuery,
  type UpdateSkillPackageModulePayload,
} from "./skill-package-modules.service";

@Controller("admin/skill-package-modules")
export class SkillPackageModulesController {
  constructor(
    private readonly skillPackageModulesService: SkillPackageModulesService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listSkillPackageModules(
    @Query("moduleKey") moduleKey: string | undefined,
    @Query("packageKey") packageKey: string | undefined,
    @Query("bindingType") bindingType: SkillPackageModuleListQuery["bindingType"],
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageModulesService.listSkillPackageModules({
      moduleKey: moduleKey ? String(moduleKey).trim() : undefined,
      packageKey: packageKey ? String(packageKey).trim() : undefined,
      bindingType,
      enabled: enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    });
  }

  @Get("by-module/:moduleKey")
  async listPackagesByModule(
    @Param("moduleKey") moduleKey: string,
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageModulesService.listPackagesByModule(
      moduleKey,
      enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    );
  }

  @Get("by-package/:packageKey")
  async listModulesByPackage(
    @Param("packageKey") packageKey: string,
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageModulesService.listModulesByPackage(
      packageKey,
      enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    );
  }

  @Get(":id")
  async getSkillPackageModule(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageModulesService.getSkillPackageModule(id);
  }

  @Post()
  async createSkillPackageModule(
    @Body() payload: CreateSkillPackageModulePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackageModulesService.createSkillPackageModule(payload);
  }

  @Patch(":id")
  async updateSkillPackageModule(
    @Param("id") id: string,
    @Body() payload: UpdateSkillPackageModulePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackageModulesService.updateSkillPackageModule(id, payload);
  }

  @Delete(":id")
  async deleteSkillPackageModule(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackageModulesService.deleteSkillPackageModule(id);
  }
}
