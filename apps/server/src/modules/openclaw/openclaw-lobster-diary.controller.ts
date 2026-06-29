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
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawLobsterDiaryService.listWorkspace(brandId, limit ? Number(limit) : undefined);
  }

  @Post()
  async createDiary(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
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
      createdByUserId: auth.userId,
      diaryDate: payload?.diaryDate,
      title: payload?.title,
      content: payload?.content,
    });
    const workspace = await this.openClawLobsterDiaryService.listWorkspace(brandId);
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
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawLobsterDiaryService.deleteDiary(brandId, diaryId);
    const workspace = await this.openClawLobsterDiaryService.listWorkspace(brandId);
    return {
      item,
      workspace,
    };
  }
}
