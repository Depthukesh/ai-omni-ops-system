import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { OpenClawCreativeMaterialService } from "./openclaw-creative-material.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/creative-materials")
export class OpenClawCreativeMaterialController {
  constructor(
    private readonly authService: AuthService,
    private readonly openClawCreativeMaterialService: OpenClawCreativeMaterialService,
  ) {}

  @Get()
  async listMaterials(
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
    return this.openClawCreativeMaterialService.listWorkspace(brandId, workspaceScope, limit ? Number(limit) : undefined);
  }

  @Post()
  async createMaterial(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      workspaceScope?: string;
      sourceKind?: string;
      title?: string;
      description?: string;
      materialType?: string;
      materialTags?: string[] | string;
      fileUrl?: string;
      fileName?: string;
      mimeType?: string;
      textContent?: string;
      upload?: {
        fileName?: string;
        contentType?: string;
        dataBase64?: string;
      };
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawCreativeMaterialService.createMaterial({
      brandId,
      workspaceScope: payload?.workspaceScope,
      sourceKind: payload?.sourceKind,
      createdByUserId: auth.userId,
      title: payload?.title,
      description: payload?.description,
      materialType: payload?.materialType,
      materialTags: payload?.materialTags,
      fileUrl: payload?.fileUrl,
      fileName: payload?.fileName,
      mimeType: payload?.mimeType,
      textContent: payload?.textContent,
      upload: payload?.upload,
    });
    const workspace = await this.openClawCreativeMaterialService.listWorkspace(brandId, payload?.workspaceScope);
    return {
      item,
      workspace,
    };
  }

  @Delete(":materialId")
  async deleteMaterial(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Param("materialId") materialId: string,
    @Query("workspaceScope") workspaceScope?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);
    const item = await this.openClawCreativeMaterialService.deleteMaterial(brandId, workspaceScope, materialId);
    const workspace = await this.openClawCreativeMaterialService.listWorkspace(brandId, workspaceScope);
    return {
      item,
      workspace,
    };
  }
}
