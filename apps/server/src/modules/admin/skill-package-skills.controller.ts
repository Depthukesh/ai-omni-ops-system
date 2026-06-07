import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CreateSkillPackageSkillPayload,
  SkillPackageSkillsService,
  type SkillPackageSkillListQuery,
  type UpdateSkillPackageSkillPayload,
} from "./skill-package-skills.service";

@Controller("admin/skill-package-skills")
export class SkillPackageSkillsController {
  constructor(
    private readonly skillPackageSkillsService: SkillPackageSkillsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listSkillPackageSkills(
    @Query("skillSlug") skillSlug: string | undefined,
    @Query("packageKey") packageKey: string | undefined,
    @Query("bindingType") bindingType: SkillPackageSkillListQuery["bindingType"],
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageSkillsService.listSkillPackageSkills({
      skillSlug: skillSlug ? String(skillSlug).trim() : undefined,
      packageKey: packageKey ? String(packageKey).trim() : undefined,
      bindingType,
      enabled: enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    });
  }

  @Get("by-skill/:skillSlug")
  async listPackagesBySkill(
    @Param("skillSlug") skillSlug: string,
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageSkillsService.listPackagesBySkill(
      skillSlug,
      enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    );
  }

  @Get("by-package/:packageKey")
  async listSkillsByPackage(
    @Param("packageKey") packageKey: string,
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageSkillsService.listSkillsByPackage(
      packageKey,
      enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    );
  }

  @Get(":id")
  async getSkillPackageSkill(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageSkillsService.getSkillPackageSkill(id);
  }

  @Post()
  async createSkillPackageSkill(
    @Body() payload: CreateSkillPackageSkillPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackageSkillsService.createSkillPackageSkill(payload);
  }

  @Patch(":id")
  async updateSkillPackageSkill(
    @Param("id") id: string,
    @Body() payload: UpdateSkillPackageSkillPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackageSkillsService.updateSkillPackageSkill(id, payload);
  }

  @Delete(":id")
  async deleteSkillPackageSkill(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackageSkillsService.deleteSkillPackageSkill(id);
  }
}
