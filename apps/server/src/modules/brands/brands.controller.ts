import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Res, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  type AddBrandMemberPayload,
  type AcceptBrandInviteByCodePayload,
  type BrandAssetFileUploadRecord,
  type BrandIpImageUploadRecord,
  type BrandProductImageUploadRecord,
  BrandsService,
  type CreateBrandBusinessKnowledgeBaseFilesPayload,
  type CreateAssetPayload,
  type CreateBrandPayload,
  type CreateBrandInvitePayload,
  type CreateBrandBusinessKnowledgeBasePayload,
  type CreateProductPayload,
  type FeishuBindingPayload,
  type ReplaceAccountsPayload,
  type UploadBrandAssetFilePayload,
  type UploadBrandProductImagePayload,
  type UpdateBackgroundPayload,
  type UpdateBrandBusinessKnowledgeBasePayload,
  type UpdateBrandMemberPayload,
  type UpdateBrandPermissionSettingsPayload,
  type UpdateMyBrandInviteNotificationReadStatePayload,
  type UpdateMyBrandInviteReadStatePayload,
  type UpdateProductPayload,
  type UpsertSurveyPayload,
  type TransferBrandOwnerPayload,
  type UpdateBrandIpProfilePayload,
  type UploadBrandIpImagePayload,
} from "./brands.service";

@Controller("brands")
export class BrandsController {
  private readonly prismaService = new PrismaService();
  // Temporary direct construction to bypass unstable runtime injection in start:dev.
  private readonly brandsService = new BrandsService(this.prismaService);
  private readonly authService = new AuthService(this.prismaService);

  @Get("overview")
  overview() {
    return this.brandsService.getOverview();
  }

  @Get("feishu/auth-status")
  feishuAuthStatus() {
    return this.brandsService.getFeishuAuthStatus();
  }

  @Post("feishu/auth-start")
  startFeishuAuth() {
    return this.brandsService.startFeishuAuth();
  }

  @Get("me/invites")
  async myInvites(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.brandsService.listMyPendingBrandInvites(auth?.userId);
  }

  @Get("me/invites/history")
  async myInviteHistory(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.brandsService.listMyBrandInviteHistory(auth?.userId);
  }

  @Get("me/invite-notifications")
  async myInviteNotifications(@Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.brandsService.listMyBrandInviteNotifications(auth?.userId);
  }

  @Patch("me/invites/:inviteId/accept")
  async acceptInvite(
    @Param("inviteId") inviteId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.brandsService.acceptBrandInvite(inviteId, auth?.userId);
  }

  @Patch("me/invites/accept-by-code")
  async acceptInviteByCode(
    @Body() payload: AcceptBrandInviteByCodePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.brandsService.acceptBrandInviteByCode(payload, auth?.userId);
  }

  @Patch("me/invites/read-state")
  async updateMyInviteReadState(
    @Body() payload: UpdateMyBrandInviteReadStatePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.brandsService.updateMyBrandInviteReadState(payload, auth?.userId);
  }

  @Patch("me/invite-notifications/read-state")
  async updateMyInviteNotificationReadState(
    @Body() payload: UpdateMyBrandInviteNotificationReadStatePayload,
    @Headers() headers: Record<string, string[] | string | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.brandsService.updateMyBrandInviteNotificationReadState(payload, auth?.userId);
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(id, auth);
    return this.brandsService.getBrandDetail(id);
  }

  @Get(":id/archive")
  async archive(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(id, auth);
    return this.brandsService.getArchive(id);
  }

  @Get(":id/members")
  async members(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.brandsService.listBrandMembers(id, auth?.userId);
  }

  @Get(":id/member-permissions")
  async memberPermissions(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(id, auth);
    return this.brandsService.getBrandPermissionSettings(id, auth?.userId);
  }

  @Post(":id/members")
  async addMember(
    @Param("id") id: string,
    @Body() payload: AddBrandMemberPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAdminAccess(id, auth);
    return this.brandsService.addBrandMember(id, payload, auth?.userId);
  }

  @Patch(":id/members/:memberId")
  async updateMember(
    @Param("id") id: string,
    @Param("memberId") memberId: string,
    @Body() payload: UpdateBrandMemberPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAdminAccess(id, auth);
    return this.brandsService.updateBrandMember(id, memberId, payload, auth?.userId);
  }

  @Patch(":id/member-permissions")
  async updateMemberPermissions(
    @Param("id") id: string,
    @Body() payload: UpdateBrandPermissionSettingsPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAdminAccess(id, auth);
    return this.brandsService.updateBrandPermissionSettings(id, payload, auth?.userId);
  }

  @Get(":id/invites")
  async invites(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAdminAccess(id, auth);
    return this.brandsService.listBrandInvites(id, auth?.userId);
  }

  @Post(":id/invites")
  async createInvite(
    @Param("id") id: string,
    @Body() payload: CreateBrandInvitePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAdminAccess(id, auth);
    return this.brandsService.createBrandInvite(id, payload, auth?.userId);
  }

  @Patch(":id/invites/:inviteId/revoke")
  async revokeInvite(
    @Param("id") id: string,
    @Param("inviteId") inviteId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAdminAccess(id, auth);
    return this.brandsService.revokeBrandInvite(id, inviteId, auth?.userId);
  }

  @Get(":id/role-audit-logs")
  async roleAuditLogs(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAdminAccess(id, auth);
    return this.brandsService.listBrandRoleAuditLogs(id, auth?.userId);
  }

  @Patch(":id/transfer-owner")
  async transferOwner(
    @Param("id") id: string,
    @Body() payload: TransferBrandOwnerPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    return this.brandsService.transferBrandOwnership(id, payload, auth?.userId);
  }

  @Get(":id/feishu-binding")
  async feishuBinding(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(id, auth);
    return this.brandsService.getFeishuBinding(id);
  }

  @Post()
  create(@Body() payload: CreateBrandPayload) {
    return this.brandsService.createBrand(payload);
  }

  @Patch(":id/background")
  async updateBackground(
    @Param("id") id: string,
    @Body() payload: UpdateBackgroundPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.background", "edit", auth);
    return this.brandsService.updateBackground(id, payload);
  }

  @Patch(":id/ip-profile")
  async updateIpProfile(
    @Param("id") id: string,
    @Body() payload: UpdateBrandIpProfilePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.ipLibrary", "edit", auth);
    return this.brandsService.updateIpProfile(id, payload);
  }

  @Post(":id/products")
  async createProduct(
    @Param("id") id: string,
    @Body() payload: CreateProductPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.products", "edit", auth);
    return this.brandsService.createProduct(id, payload);
  }

  @Post(":id/product-images")
  async uploadProductImage(
    @Param("id") id: string,
    @Body() payload: UploadBrandProductImagePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<BrandProductImageUploadRecord> {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.products", "edit", auth);
    return this.brandsService.uploadProductImage(id, payload);
  }

  @Post(":id/ip-images")
  async uploadIpImage(
    @Param("id") id: string,
    @Body() payload: UploadBrandIpImagePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<BrandIpImageUploadRecord> {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.ipLibrary", "edit", auth);
    return this.brandsService.uploadIpImage(id, payload);
  }

  @Get(":id/product-images/:fileName")
  async getProductImage(
    @Param("id") id: string,
    @Param("fileName") fileName: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = await this.brandsService.getProductImage(id, fileName);
    response.setHeader("Content-Type", file.contentType);
    return response.send(file.buffer);
  }

  @Get(":id/ip-images/:fileName")
  async getIpImage(
    @Param("id") id: string,
    @Param("fileName") fileName: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = await this.brandsService.getIpImage(id, fileName);
    response.setHeader("Content-Type", file.contentType);
    return response.send(file.buffer);
  }

  @Post(":id/asset-files")
  async uploadAssetFile(
    @Param("id") id: string,
    @Body() payload: UploadBrandAssetFilePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<BrandAssetFileUploadRecord> {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    const access = await this.authService.assertBrandAccess(id, auth);
    if (!access.permissions["brandGrowth.library.industryFeeds"].edit && !access.permissions["brandGrowth.library.businessAssets"].edit) {
      throw new UnauthorizedException("当前账号没有该板块的编辑权限");
    }
    return this.brandsService.uploadAssetFile(id, payload);
  }

  @Get(":id/asset-files/:fileName")
  async getAssetFile(
    @Param("id") id: string,
    @Param("fileName") fileName: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = await this.brandsService.getAssetFile(id, fileName);
    response.setHeader("Content-Type", file.contentType);
    return response.send(file.buffer);
  }

  @Patch(":id/products/:productId")
  async updateProduct(
    @Param("id") id: string,
    @Param("productId") productId: string,
    @Body() payload: UpdateProductPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.products", "edit", auth);
    return this.brandsService.updateProduct(id, productId, payload);
  }

  @Delete(":id/products/:productId")
  async deleteProduct(
    @Param("id") id: string,
    @Param("productId") productId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.products", "edit", auth);
    return this.brandsService.deleteProduct(id, productId);
  }

  @Patch(":id/survey")
  async updateSurvey(
    @Param("id") id: string,
    @Body() payload: UpsertSurveyPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.survey", "edit", auth);
    return this.brandsService.upsertSurvey(id, payload);
  }

  @Patch(":id/platform-accounts")
  async replacePlatformAccounts(
    @Param("id") id: string,
    @Body() payload: ReplaceAccountsPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);
    return this.brandsService.replacePlatformAccounts(id, payload);
  }

  @Patch(":id/competitor-accounts")
  async replaceCompetitorAccounts(
    @Param("id") id: string,
    @Body() payload: ReplaceAccountsPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);
    return this.brandsService.replaceCompetitorAccounts(id, payload);
  }

  @Patch(":id/industry-feeds")
  async replaceIndustryFeeds(
    @Param("id") id: string,
    @Body() payload: CreateAssetPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.industryFeeds", "edit", auth);
    return this.brandsService.replaceIndustryFeeds(id, payload);
  }

  @Patch(":id/business-assets")
  async replaceBusinessAssets(
    @Param("id") id: string,
    @Body() payload: CreateAssetPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.businessAssets", "edit", auth);
    return this.brandsService.replaceBusinessAssets(id, payload);
  }

  @Get(":id/business-knowledge-bases")
  async listBusinessKnowledgeBases(@Param("id") id: string, @Headers() headers: Record<string, string | string[] | undefined>) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(id, auth);
    return this.brandsService.listBusinessKnowledgeBases(id);
  }

  @Post(":id/business-knowledge-bases")
  async createBusinessKnowledgeBase(
    @Param("id") id: string,
    @Body() payload: CreateBrandBusinessKnowledgeBasePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.businessAssets", "edit", auth);
    return this.brandsService.createBusinessKnowledgeBase(id, payload);
  }

  @Patch(":id/business-knowledge-bases/:knowledgeBaseId")
  async updateBusinessKnowledgeBase(
    @Param("id") id: string,
    @Param("knowledgeBaseId") knowledgeBaseId: string,
    @Body() payload: UpdateBrandBusinessKnowledgeBasePayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.businessAssets", "edit", auth);
    return this.brandsService.updateBusinessKnowledgeBase(id, knowledgeBaseId, payload);
  }

  @Delete(":id/business-knowledge-bases/:knowledgeBaseId")
  async deleteBusinessKnowledgeBase(
    @Param("id") id: string,
    @Param("knowledgeBaseId") knowledgeBaseId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.businessAssets", "edit", auth);
    return this.brandsService.deleteBusinessKnowledgeBase(id, knowledgeBaseId);
  }

  @Get(":id/business-knowledge-invocation-runs")
  async listBusinessKnowledgeInvocationRuns(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.businessAssets", "view", auth);
    return this.brandsService.listBusinessKnowledgeInvocationRuns(id);
  }

  @Get(":id/business-knowledge-binding-targets")
  async listBusinessKnowledgeBindingTargets(
    @Param("id") id: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.businessAssets", "view", auth);
    return this.brandsService.listBusinessKnowledgeBindingTargets(id);
  }

  @Get(":id/business-knowledge-bases/:knowledgeBaseId/files")
  async listBusinessKnowledgeBaseFiles(
    @Param("id") id: string,
    @Param("knowledgeBaseId") knowledgeBaseId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(id, auth);
    return this.brandsService.listBusinessKnowledgeBaseFiles(id, knowledgeBaseId);
  }

  @Post(":id/business-knowledge-bases/:knowledgeBaseId/files")
  async createBusinessKnowledgeBaseFiles(
    @Param("id") id: string,
    @Param("knowledgeBaseId") knowledgeBaseId: string,
    @Body() payload: CreateBrandBusinessKnowledgeBaseFilesPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.businessAssets", "edit", auth);
    return this.brandsService.createBusinessKnowledgeBaseFiles(id, knowledgeBaseId, payload);
  }

  @Get(":id/business-knowledge-bases/:knowledgeBaseId/files/:fileId")
  async getBusinessKnowledgeBaseFileDetail(
    @Param("id") id: string,
    @Param("knowledgeBaseId") knowledgeBaseId: string,
    @Param("fileId") fileId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandAccess(id, auth);
    return this.brandsService.getBusinessKnowledgeBaseFileDetail(id, knowledgeBaseId, fileId);
  }

  @Delete(":id/business-knowledge-bases/:knowledgeBaseId/files/:fileId")
  async deleteBusinessKnowledgeBaseFile(
    @Param("id") id: string,
    @Param("knowledgeBaseId") knowledgeBaseId: string,
    @Param("fileId") fileId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.library.businessAssets", "edit", auth);
    return this.brandsService.deleteBusinessKnowledgeBaseFile(id, knowledgeBaseId, fileId);
  }

  @Patch(":id/feishu-binding")
  async upsertFeishuBinding(
    @Param("id") id: string,
    @Body() payload: FeishuBindingPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    await this.authService.assertBrandPermission(id, "brandGrowth.collection.xiaohongshuCollection", "edit", auth);
    return this.brandsService.upsertFeishuBinding(id, payload);
  }
}
