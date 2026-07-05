import { Body, Controller, Delete, Get, Headers, NotFoundException, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { PublishingService } from "../publishing/publishing.service";
import { OpenClawVideoWorkService } from "./openclaw-video-work.service";
import { normalizeOpenClawWorkspaceScope } from "./openclaw-workspace-scope";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/video-works")
export class OpenClawVideoWorkController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawVideoWorkService: OpenClawVideoWorkService,
    private readonly publishingService: PublishingService,
  ) {}

  @Get()
  async listVideoWorks(
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
    return this.openClawVideoWorkService.listWorkspace(brandId, workspaceScope, limit ? Number(limit) : undefined);
  }

  @Post()
  async createVideoWork(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      title?: string;
      description?: string;
      scriptContent?: string;
      coverImageUrl?: string;
      videoUrl?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawVideoWorkService.createVideoWork({
      brandId,
      workspaceScope: payload?.workspaceScope,
      createdByUserId: auth.userId,
      title: payload?.title,
      description: payload?.description,
      scriptContent: payload?.scriptContent,
      coverImageUrl: payload?.coverImageUrl,
      videoUrl: payload?.videoUrl,
    });
    const workspace = await this.openClawVideoWorkService.listWorkspace(brandId, payload?.workspaceScope);
    return {
      item,
      workspace,
    };
  }

  @Delete(":workId")
  async deleteVideoWork(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Query("workspaceScope") workspaceScope?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawVideoWorkService.deleteVideoWork(brandId, workspaceScope, workId);
    const workspace = await this.openClawVideoWorkService.listWorkspace(brandId, workspaceScope);
    return {
      item,
      workspace,
    };
  }

  @Post(":workId/douyin-desktop-publish-session")
  async createDouyinDesktopPublishSession(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("workId") workId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Body() payload?: { accountId?: string },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawVideoWorkService.getVideoWorkById(
      brandId,
      normalizeOpenClawWorkspaceScope(workspaceScope),
      workId,
    );
    if (!item) {
      throw new NotFoundException("视频作品不存在或已删除");
    }
    return this.publishingService.createDouyinDesktopPublishSessionFromSource(brandId, {
      workId: item.id,
      workKind: "OPENCLAW_VIDEO",
      title: item.title,
      content: item.scriptContent || item.description,
      videoUrl: item.videoUrl,
      coverImageUrl: item.coverImageUrl,
      hashtags: [],
      sourceLabel: "OpenClaw 视频作品",
    }, {
      accountId: payload?.accountId,
    });
  }
}
