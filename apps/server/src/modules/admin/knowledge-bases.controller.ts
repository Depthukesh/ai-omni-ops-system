import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import {
  type CompleteKnowledgeBaseSyncRunPayload,
  KnowledgeBasesService,
  type CreateKnowledgeBaseFilePayload,
  type CreateKnowledgeBasePayload,
  type UpdateKnowledgeBasePayload,
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
