import { Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawCommentService } from "./openclaw-comment.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/comments")
export class OpenClawCommentController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawCommentService: OpenClawCommentService,
  ) {}

  @Get()
  async listComments(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Query("workspaceScope") workspaceScope?: string,
    @Query("resourceType") resourceType?: string,
    @Query("resourceId") resourceId?: string,
    @Query("limit") limit?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawCommentService.listWorkspace({
      brandId,
      workspaceScope,
      resourceType,
      resourceId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  async createComment(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      resourceType?: string;
      resourceId?: string;
      content?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawCommentService.createComment({
      brandId,
      workspaceScope: payload?.workspaceScope,
      resourceType: payload?.resourceType,
      resourceId: payload?.resourceId,
      createdByUserId: auth.userId,
      content: payload?.content,
    });
    const workspace = await this.openClawCommentService.listWorkspace({
      brandId,
      workspaceScope: payload?.workspaceScope,
      resourceType: payload?.resourceType,
      resourceId: payload?.resourceId,
    });
    return {
      item,
      workspace,
    };
  }
}
