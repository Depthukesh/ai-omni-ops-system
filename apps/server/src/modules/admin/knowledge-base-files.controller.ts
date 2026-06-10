import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "./admin-access";
import { KnowledgeBasesService, type UpdateKnowledgeBaseFilePayload } from "./knowledge-bases.service";

@Controller("admin/knowledge-base-files")
export class KnowledgeBaseFilesController {
  constructor(
    private readonly knowledgeBasesService: KnowledgeBasesService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async listAllFiles(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeBaseFiles();
  }

  @Get("sync-runs")
  async listAllSyncRuns(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeBaseSyncRuns();
  }

  @Get(":id/chunks")
  async listKnowledgeBaseFileChunks(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeFileChunks(id);
  }

  @Get(":id/embeddings")
  async listKnowledgeBaseFileEmbeddings(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.knowledgeBasesService.listKnowledgeFileEmbeddings(id);
  }

  @Patch(":id")
  async updateKnowledgeBaseFile(
    @Param("id") id: string,
    @Body() payload: UpdateKnowledgeBaseFilePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.updateKnowledgeBaseFile(id, payload);
  }

  @Post(":id/sync")
  async syncKnowledgeBaseFile(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.startKnowledgeBaseFileSync(id);
  }

  @Delete(":id")
  async deleteKnowledgeBaseFile(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.knowledgeBasesService.deleteKnowledgeBaseFile(id);
  }
}
