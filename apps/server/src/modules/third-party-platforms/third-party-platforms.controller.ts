import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { ADMIN_ROLE_GROUPS, requireAdminRoles } from "../admin/admin-access";
import {
  type CreateMixedcutRemixTaskPayload,
  ThirdPartyPlatformsService,
  type CreateThirdPartyPlatformPayload,
  type UpdateBrandThirdPartyPlatformSecretPayload,
  type UpdateThirdPartyPlatformPayload,
} from "./third-party-platforms.service";

@Controller()
export class ThirdPartyPlatformsController {
  constructor(
    private readonly thirdPartyPlatformsService: ThirdPartyPlatformsService,
    private readonly authService: AuthService,
  ) {}

  @Get("admin/third-party-platforms")
  async listAdminPlatforms(@Headers() headers: Record<string, string | string[] | undefined>) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.allAdmin);
    return this.thirdPartyPlatformsService.listPlatforms();
  }

  @Post("admin/third-party-platforms")
  async createAdminPlatform(
    @Body() payload: CreateThirdPartyPlatformPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.thirdPartyPlatformsService.createPlatform(payload);
  }

  @Patch("admin/third-party-platforms/:id")
  async updateAdminPlatform(
    @Param("id") id: string,
    @Body() payload: UpdateThirdPartyPlatformPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.thirdPartyPlatformsService.updatePlatform(id, payload);
  }

  @Delete("admin/third-party-platforms/:id")
  async deleteAdminPlatform(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    await requireAdminRoles(this.authService, headers, ADMIN_ROLE_GROUPS.operatorWrite);
    return this.thirdPartyPlatformsService.deletePlatform(id);
  }

  @Get("third-party-platforms")
  async listUserPlatforms(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "view", auth);
    const platforms = await this.thirdPartyPlatformsService.listUserPlatforms(access.userId, access.brandId);
    return {
      brandId: access.brandId,
      role: access.role,
      canManage: access.permissions["personalCenter.thirdPartyPlatforms"].edit,
      platforms,
    };
  }

  @Get("third-party-platforms/mixedcut-ai-config")
  async previewMyMixedcutAiConfig(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "view", auth);
    return this.thirdPartyPlatformsService.previewBrandMixedcutAiConfig(access.brandId);
  }

  @Post("third-party-platforms/mixedcut-ai-config/sync")
  async syncMyMixedcutAiConfig(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "edit", auth);
    return this.thirdPartyPlatformsService.syncBrandMixedcutAiConfig(access.brandId);
  }

  @Get("third-party-platforms/mixedcut/media-assets")
  async listMyMixedcutMediaAssets(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "view", auth);
    return this.thirdPartyPlatformsService.listBrandMixedcutMediaAssets(access.brandId);
  }

  @Post("third-party-platforms/mixedcut/remix-task")
  async createMyMixedcutRemixTask(
    @Body() payload: CreateMixedcutRemixTaskPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "edit", auth);
    return this.thirdPartyPlatformsService.createBrandMixedcutRemixTask(access.brandId, {
      ...payload,
      workspaceScope: payload?.workspaceScope || "douyin",
      archiveToOpenClawVideoWorks: true,
      createdByUserId: auth.userId,
    });
  }

  @Get("third-party-platforms/mixedcut/remix-task/:taskId")
  async getMyMixedcutRemixTaskProgress(
    @Param("taskId") taskId: string,
    @Query("workspaceScope") workspaceScope: string | undefined,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "view", auth);
    return this.thirdPartyPlatformsService.getBrandMixedcutRemixTaskProgress(access.brandId, taskId, {
      workspaceScope: workspaceScope || "douyin",
      archiveToOpenClawVideoWorks: true,
      createdByUserId: auth.userId,
    });
  }

  @Patch("third-party-platforms/:id/secret")
  async updateUserPlatformSecret(
    @Param("id") id: string,
    @Body() payload: UpdateBrandThirdPartyPlatformSecretPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth?.brandId) {
      throw new UnauthorizedException("请先登录并进入品牌工作区");
    }
    const access = await this.authService.assertBrandPermission(auth.brandId, "personalCenter.thirdPartyPlatforms", "edit", auth);
    return this.thirdPartyPlatformsService.updateBrandPlatformSecret(access.brandId, id, payload);
  }
}
