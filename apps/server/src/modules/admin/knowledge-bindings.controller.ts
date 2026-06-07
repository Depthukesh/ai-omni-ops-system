import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CreateKnowledgeBindingPayload,
  KnowledgeBasesService,
  type UpdateKnowledgeBindingPayload,
} from "./knowledge-bases.service";

@Controller("admin/knowledge-bindings")
export class KnowledgeBindingsController {
  constructor(
    private readonly knowledgeBasesService: KnowledgeBasesService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listKnowledgeBindings(
    @Query("knowledgeBaseId") knowledgeBaseId: string | undefined,
    @Query("bindingType") bindingType: string | undefined,
    @Query("targetId") targetId: string | undefined,
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeBindings({
      knowledgeBaseId: knowledgeBaseId ? String(knowledgeBaseId).trim() : undefined,
      bindingType: bindingType ? (String(bindingType).trim().toUpperCase() as CreateKnowledgeBindingPayload["bindingType"]) : undefined,
      targetId: targetId ? String(targetId).trim() : undefined,
      enabled: enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    });
  }

  @Get("by-target")
  async listKnowledgeBindingsByTarget(
    @Query("bindingType") bindingType: string,
    @Query("targetId") targetId: string,
    @Query("enabled") enabled: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeBindingsByTarget(
      bindingType,
      targetId,
      enabled === undefined ? undefined : ["true", "1", "yes"].includes(String(enabled).toLowerCase()),
    );
  }

  @Post()
  async createKnowledgeBinding(
    @Body() payload: CreateKnowledgeBindingPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.createKnowledgeBinding(payload);
  }

  @Patch(":id")
  async updateKnowledgeBinding(
    @Param("id") id: string,
    @Body() payload: UpdateKnowledgeBindingPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.updateKnowledgeBinding(id, payload);
  }

  @Delete(":id")
  async deleteKnowledgeBinding(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.deleteKnowledgeBinding(id);
  }
}
