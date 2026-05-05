import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import {
  type CompleteKnowledgeBaseSyncRunPayload,
  KnowledgeBasesService,
  type CreateKnowledgeBaseFilePayload,
  type CreateKnowledgeBasePayload,
  type UpdateKnowledgeBasePayload,
} from "./knowledge-bases.service";

@Controller("admin/knowledge-bases")
export class KnowledgeBasesController {
  constructor(private readonly knowledgeBasesService: KnowledgeBasesService) {}

  @Get()
  listKnowledgeBases() {
    return this.knowledgeBasesService.listKnowledgeBases();
  }

  @Post()
  createKnowledgeBase(@Body() payload: CreateKnowledgeBasePayload) {
    return this.knowledgeBasesService.createKnowledgeBase(payload);
  }

  @Get(":id/files")
  listKnowledgeBaseFiles(@Param("id") id: string) {
    return this.knowledgeBasesService.listKnowledgeBaseFiles(id);
  }

  @Get(":id/sync-runs")
  listKnowledgeBaseSyncRuns(@Param("id") id: string) {
    return this.knowledgeBasesService.listKnowledgeBaseSyncRuns(id);
  }

  @Post(":id/files")
  createKnowledgeBaseFile(@Param("id") id: string, @Body() payload: CreateKnowledgeBaseFilePayload) {
    return this.knowledgeBasesService.createKnowledgeBaseFile(id, payload);
  }

  @Post(":id/sync")
  startKnowledgeBaseFullSync(@Param("id") id: string) {
    return this.knowledgeBasesService.startKnowledgeBaseFullSync(id);
  }

  @Patch("sync-runs/:id")
  completeKnowledgeBaseSyncRun(@Param("id") id: string, @Body() payload: CompleteKnowledgeBaseSyncRunPayload) {
    return this.knowledgeBasesService.completeKnowledgeBaseSyncRun(id, payload);
  }

  @Patch(":id")
  updateKnowledgeBase(@Param("id") id: string, @Body() payload: UpdateKnowledgeBasePayload) {
    return this.knowledgeBasesService.updateKnowledgeBase(id, payload);
  }

  @Patch(":id/archive")
  archiveKnowledgeBase(@Param("id") id: string) {
    return this.knowledgeBasesService.archiveKnowledgeBase(id);
  }

  @Delete(":id")
  deleteKnowledgeBase(@Param("id") id: string) {
    return this.knowledgeBasesService.deleteKnowledgeBase(id);
  }
}
