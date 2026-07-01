import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawLobsterDiaryService } from "./openclaw-lobster-diary.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/lobster-diaries")
export class OpenClawLobsterDiaryController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawLobsterDiaryService: OpenClawLobsterDiaryService,
  ) {}

  @Get()
  async listDiaries(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawLobsterDiaryService.listWorkspace(brandId, workspaceScope, limit ? Number(limit) : undefined);
  }

  @Post()
  async createDiary(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      diaryDate?: string;
      title?: string;
      content?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawLobsterDiaryService.createDiary({
      brandId,
      workspaceScope: payload?.workspaceScope,
      createdByUserId: auth.userId,
      diaryDate: payload?.diaryDate,
      title: payload?.title,
      content: payload?.content,
    });
    const workspace = await this.openClawLobsterDiaryService.listWorkspace(brandId, payload?.workspaceScope);
    return {
      item,
      workspace,
    };
  }

  @Delete(":diaryId")
  async deleteDiary(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("diaryId") diaryId: string,
    @Query("workspaceScope") workspaceScope?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawLobsterDiaryService.deleteDiary(brandId, workspaceScope, diaryId);
    const workspace = await this.openClawLobsterDiaryService.listWorkspace(brandId, workspaceScope);
    return {
      item,
      workspace,
    };
  }
}
