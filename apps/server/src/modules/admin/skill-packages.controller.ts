import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type ActivateSkillPackageVersionPayload,
  type CreateReferenceAssetPayload,
  type CreateSkillPackageVersionPayload,
  type CreateSkillPackagePayload,
  type SkillPackageDetailQuery,
  type SkillPackageListQuery,
  SkillPackagesService,
  type UpdateReferenceAssetPayload,
  type UpdateSkillPackageBasicPayload,
  type UpdateSkillPackageProviderPayload,
  type UpdateSkillPackagePromptPayload,
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
  async getSkillPackage(
    @Param("id") id: string,
    @Query("includePrompts") includePrompts: string | undefined,
    @Query("includeReferences") includeReferences: string | undefined,
    @Query("includeScripts") includeScripts: string | undefined,
    @Query("includeKnowledge") includeKnowledge: string | undefined,
    @Query("includeProviders") includeProviders: string | undefined,
    @Query("includeVersions") includeVersions: string | undefined,
    @Query("includeBrandOverrides") includeBrandOverrides: string | undefined,
    @Query("includeUserOverrides") includeUserOverrides: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackagesService.getSkillPackage(id, {
      includePrompts: this.parseBooleanQuery(includePrompts),
      includeReferences: this.parseBooleanQuery(includeReferences),
      includeScripts: this.parseBooleanQuery(includeScripts),
      includeKnowledge: this.parseBooleanQuery(includeKnowledge),
      includeProviders: this.parseBooleanQuery(includeProviders),
      includeVersions: this.parseBooleanQuery(includeVersions),
      includeBrandOverrides: this.parseBooleanQuery(includeBrandOverrides),
      includeUserOverrides: this.parseBooleanQuery(includeUserOverrides),
    });
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

  @Patch(":id/basic")
  async updateSkillPackageBasic(
    @Param("id") id: string,
    @Body() payload: UpdateSkillPackageBasicPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.updateSkillPackageBasic(id, payload);
  }

  @Delete(":id")
  async deleteSkillPackage(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.deleteSkillPackage(id);
  }

  @Get(":id/versions")
  async listSkillPackageVersions(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackagesService.listSkillPackageVersions(id);
  }

  @Post(":id/versions")
  async createSkillPackageVersion(
    @Param("id") id: string,
    @Body() payload: CreateSkillPackageVersionPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.createSkillPackageVersion(id, payload);
  }

  @Post(":id/activate-version")
  async activateSkillPackageVersion(
    @Param("id") id: string,
    @Body() payload: ActivateSkillPackageVersionPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.activateSkillPackageVersion(id, payload);
  }

  @Patch(":packageId/prompts/:promptId")
  async updateSkillPackagePrompt(
    @Param("packageId") packageId: string,
    @Param("promptId") promptId: string,
    @Body() payload: UpdateSkillPackagePromptPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.updateSkillPackagePrompt(packageId, promptId, payload);
  }

  @Patch(":packageId/providers/:bindingId")
  async updateSkillPackageProvider(
    @Param("packageId") packageId: string,
    @Param("bindingId") bindingId: string,
    @Body() payload: UpdateSkillPackageProviderPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.updateSkillPackageProvider(packageId, bindingId, payload);
  }

  @Post(":packageId/references")
  async createReferenceAsset(
    @Param("packageId") packageId: string,
    @Body() payload: CreateReferenceAssetPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.createReferenceAsset(packageId, payload);
  }

  @Patch(":packageId/references/:referenceId")
  async updateReferenceAsset(
    @Param("packageId") packageId: string,
    @Param("referenceId") referenceId: string,
    @Body() payload: UpdateReferenceAssetPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.updateReferenceAsset(packageId, referenceId, payload);
  }

  @Delete(":packageId/references/:referenceId")
  async deleteReferenceAsset(
    @Param("packageId") packageId: string,
    @Param("referenceId") referenceId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackagesService.deleteReferenceAsset(packageId, referenceId);
  }

  private parseBooleanQuery(value: string | undefined): SkillPackageDetailQuery[keyof SkillPackageDetailQuery] {
    if (value === undefined) {
      return undefined;
    }
    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
    return undefined;
  }
}
