import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CreateSkillPackageKnowledgeSpacePayload,
  SkillPackageKnowledgeSpacesService,
  type SkillPackageKnowledgeSpaceListQuery,
  type UpdateSkillPackageKnowledgeSpacePayload,
} from "./skill-package-knowledge-spaces.service";

@Controller("admin/skill-package-knowledge-spaces")
export class SkillPackageKnowledgeSpacesController {
  constructor(
    private readonly skillPackageKnowledgeSpacesService: SkillPackageKnowledgeSpacesService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listSkillPackageKnowledgeSpaces(
    @Query("packageKey") packageKey: string | undefined,
    @Query("knowledgeBaseId") knowledgeBaseId: string | undefined,
    @Query("relationType") relationType: SkillPackageKnowledgeSpaceListQuery["relationType"],
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageKnowledgeSpacesService.listSkillPackageKnowledgeSpaces({
      packageKey: packageKey ? String(packageKey).trim() : undefined,
      knowledgeBaseId: knowledgeBaseId ? String(knowledgeBaseId).trim() : undefined,
      relationType,
      enabled: enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    });
  }

  @Get("by-package/:packageKey")
  async listKnowledgeSpacesByPackage(
    @Param("packageKey") packageKey: string,
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageKnowledgeSpacesService.listKnowledgeSpacesByPackage(
      packageKey,
      enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    );
  }

  @Get("by-knowledge-space/:knowledgeBaseId")
  async listPackagesByKnowledgeSpace(
    @Param("knowledgeBaseId") knowledgeBaseId: string,
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageKnowledgeSpacesService.listPackagesByKnowledgeSpace(
      knowledgeBaseId,
      enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    );
  }

  @Get(":id")
  async getSkillPackageKnowledgeSpace(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.skillPackageKnowledgeSpacesService.getSkillPackageKnowledgeSpace(id);
  }

  @Post()
  async createSkillPackageKnowledgeSpace(
    @Body() payload: CreateSkillPackageKnowledgeSpacePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackageKnowledgeSpacesService.createSkillPackageKnowledgeSpace(payload);
  }

  @Patch(":id")
  async updateSkillPackageKnowledgeSpace(
    @Param("id") id: string,
    @Body() payload: UpdateSkillPackageKnowledgeSpacePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackageKnowledgeSpacesService.updateSkillPackageKnowledgeSpace(id, payload);
  }

  @Delete(":id")
  async deleteSkillPackageKnowledgeSpace(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.skillPackageKnowledgeSpacesService.deleteSkillPackageKnowledgeSpace(id);
  }
}
