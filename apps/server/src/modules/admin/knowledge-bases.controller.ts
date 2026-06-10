import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CompleteKnowledgeBaseSyncRunPayload,
  KnowledgeBasesService,
  type CreateKnowledgeBaseFilePayload,
  type CreateKnowledgeBasePayload,
  type RunKnowledgeRetrievalTestPayload,
  type UpdateKnowledgeBasePayload,
  type UpdateKnowledgeRetrievalConfigPayload,
} from "./knowledge-bases.service";

@Controller("admin/knowledge-bases")
export class KnowledgeBasesController {
  constructor(
    private readonly knowledgeBasesService: KnowledgeBasesService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listKnowledgeBases(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeBases();
  }

  @Post()
  async createKnowledgeBase(
    @Body() payload: CreateKnowledgeBasePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.createKnowledgeBase(payload);
  }

  @Get("retrieval-configs")
  async listKnowledgeRetrievalConfigs(
    @Query("knowledgeBaseId") knowledgeBaseId: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeRetrievalConfigs(
      knowledgeBaseId ? String(knowledgeBaseId).trim() : undefined,
    );
  }

  @Get(":id/files")
  async listKnowledgeBaseFiles(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeBaseFiles(id);
  }

  @Get(":id/sync-runs")
  async listKnowledgeBaseSyncRuns(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeBaseSyncRuns(id);
  }

  @Post(":id/files")
  async createKnowledgeBaseFile(
    @Param("id") id: string,
    @Body() payload: CreateKnowledgeBaseFilePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.createKnowledgeBaseFile(id, payload);
  }

  @Post(":id/sync")
  async startKnowledgeBaseFullSync(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.startKnowledgeBaseFullSync(id);
  }

  @Post(":id/retrieval-test")
  async runKnowledgeRetrievalTest(
    @Param("id") id: string,
    @Body() payload: RunKnowledgeRetrievalTestPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.runKnowledgeRetrievalTest(id, payload);
  }

  @Patch("sync-runs/:id")
  async completeKnowledgeBaseSyncRun(
    @Param("id") id: string,
    @Body() payload: CompleteKnowledgeBaseSyncRunPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.completeKnowledgeBaseSyncRun(id, payload);
  }

  @Patch(":id")
  async updateKnowledgeBase(
    @Param("id") id: string,
    @Body() payload: UpdateKnowledgeBasePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.updateKnowledgeBase(id, payload);
  }

  @Patch(":id/retrieval-config")
  async updateKnowledgeRetrievalConfig(
    @Param("id") id: string,
    @Body() payload: UpdateKnowledgeRetrievalConfigPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.updateKnowledgeRetrievalConfig(id, payload);
  }

  @Patch(":id/archive")
  async archiveKnowledgeBase(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.archiveKnowledgeBase(id);
  }

  @Delete(":id")
  async deleteKnowledgeBase(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.deleteKnowledgeBase(id);
  }
}
