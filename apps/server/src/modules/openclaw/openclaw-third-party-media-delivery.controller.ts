import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { RuanwenjieMediaService } from "../third-party-platforms/ruanwenjie-media.service";
import { OpenClawGeoContentService } from "./openclaw-geo-content.service";
import { OpenClawThirdPartyMediaResourceService } from "./openclaw-third-party-media-resource.service";

type HeadersMap = Record<string, string | string[] | undefined>;

@Controller("openclaw/brands/:brandId/third-party-media-delivery")
export class OpenClawThirdPartyMediaDeliveryController {
  constructor(
    private readonly authService: AuthService,
    private readonly ruanwenjieMediaService: RuanwenjieMediaService,
    private readonly openClawGeoContentService: OpenClawGeoContentService,
    private readonly openClawThirdPartyMediaResourceService: OpenClawThirdPartyMediaResourceService,
  ) {}

  @Get("resources")
  async listResources(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Query("page") page?: string,
    @Query("searchKeyword") searchKeyword?: string,
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawThirdPartyMediaResourceService.listWorkspace(brandId, {
      workspaceScope: "geo",
      page: page ? Number(page) : 1,
      searchKeyword,
    });
  }

  @Post("resources/sync")
  async syncResources(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      page?: number;
      searchKeyword?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "view", auth);
    return this.openClawThirdPartyMediaResourceService.syncNextPage(brandId, {
      workspaceScope: "geo",
      page: payload?.page,
      searchKeyword: payload?.searchKeyword,
    });
  }

  @Post("deliveries")
  async createDelivery(
    @Headers() headers: HeadersMap,
    @Param("brandId") brandId: string,
    @Body() payload?: {
      articleId?: string;
      resourceId?: string;
    },
  ) {
    const auth = await this.authService.resolveRequestAuthContext(headers);
    if (!auth) {
      throw new UnauthorizedException("登录态已失效");
    }
    await this.authService.assertBrandPermission(brandId, "brandGrowth.report.topicLibrary", "edit", auth);

    const articleId = String(payload?.articleId || "").trim();
    const resourceId = String(payload?.resourceId || "").trim();
    if (!articleId) {
      throw new BadRequestException("请选择要投放的第三方媒体文章");
    }
    if (!resourceId) {
      throw new BadRequestException("请选择投放媒体");
    }
    const article = await this.openClawGeoContentService.getContentById(brandId, "geo", articleId);
    if (!article || article.contentType !== "third_party_media") {
      throw new BadRequestException("未找到可投放的第三方媒体文章");
    }

    const delivery = await this.ruanwenjieMediaService.createDelivery(brandId, {
      resourceId,
      articleId: article.id,
      articleTitle: article.title,
      htmlContent: article.htmlContent,
    });
    return {
      delivery,
    };
  }
}
