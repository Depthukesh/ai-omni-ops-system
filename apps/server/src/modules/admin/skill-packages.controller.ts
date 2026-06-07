import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CreateSkillPackagePayload,
  type SkillPackageListQuery,
  SkillPackagesService,
  type UpdateSkillPackagePayload,
} from "./skill-packages.service";

@Controller("admin/skill-packages")
export class SkillPackagesController {
  constructor(
    private readonly skillPackagesService: SkillPackagesService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listSkillPackages(
    @Query("keyword") keyword: string | undefined,
    @Query("moduleKey") moduleKey: string | undefined,
    @Query("status") status: SkillPackageListQuery["status"],
    @Query("scope") scope: SkillPackageListQuery["scope"],
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackagesService.listSkillPackages({
      keyword: keyword ? String(keyword).trim() : undefined,
      moduleKey: moduleKey ? String(moduleKey).trim() : undefined,
      status,
      scope,
    });
  }

  @Get(":id")
  async getSkillPackage(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackagesService.getSkillPackage(id);
  }

  @Post()
  async createSkillPackage(
    @Body() payload: CreateSkillPackagePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.createSkillPackage(payload);
  }

  @Patch(":id")
  async updateSkillPackage(
    @Param("id") id: string,
    @Body() payload: UpdateSkillPackagePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.updateSkillPackage(id, payload);
  }

  @Delete(":id")
  async deleteSkillPackage(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.deleteSkillPackage(id);
  }
}
