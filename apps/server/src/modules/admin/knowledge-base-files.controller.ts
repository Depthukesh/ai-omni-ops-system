import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { KnowledgeBasesService, type UpdateKnowledgeBaseFilePayload } from "./knowledge-bases.service";

@Controller("admin/knowledge-base-files")
export class KnowledgeBaseFilesController {
  constructor(private readonly knowledgeBasesService: KnowledgeBasesService) {}

  @Get()
  listAllFiles() {
    return this.knowledgeBasesService.listKnowledgeBaseFiles();
  }

  @Get("sync-runs")
  listAllSyncRuns() {
    return this.knowledgeBasesService.listKnowledgeBaseSyncRuns();
  }

  @Patch(":id")
  updateKnowledgeBaseFile(@Param("id") id: string, @Body() payload: UpdateKnowledgeBaseFilePayload) {
    return this.knowledgeBasesService.updateKnowledgeBaseFile(id, payload);
  }

  @Post(":id/sync")
  syncKnowledgeBaseFile(@Param("id") id: string) {
    return this.knowledgeBasesService.startKnowledgeBaseFileSync(id);
  }

  @Delete(":id")
  deleteKnowledgeBaseFile(@Param("id") id: string) {
    return this.knowledgeBasesService.deleteKnowledgeBaseFile(id);
  }
}
