import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  type BrandAssetFileUploadRecord,
  type BrandProductImageUploadRecord,
  BrandsService,
  type CreateAssetPayload,
  type CreateBrandPayload,
  type CreateProductPayload,
  type FeishuBindingPayload,
  type ReplaceAccountsPayload,
  type UploadBrandAssetFilePayload,
  type UploadBrandProductImagePayload,
  type UpdateBackgroundPayload,
  type UpdateProductPayload,
  type UpsertSurveyPayload,
} from "./brands.service";

@Controller("brands")
export class BrandsController {
  // Temporary direct construction to bypass unstable runtime injection in start:dev.
  private readonly brandsService = new BrandsService(new PrismaService());

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

  @Get(":id")
  detail(@Param("id") id: string) {
    return this.brandsService.getBrandDetail(id);
  }

  @Get(":id/archive")
  archive(@Param("id") id: string) {
    return this.brandsService.getArchive(id);
  }

  @Get(":id/feishu-binding")
  feishuBinding(@Param("id") id: string) {
    return this.brandsService.getFeishuBinding(id);
  }

  @Post()
  create(@Body() payload: CreateBrandPayload) {
    return this.brandsService.createBrand(payload);
  }

  @Patch(":id/background")
  updateBackground(@Param("id") id: string, @Body() payload: UpdateBackgroundPayload) {
    return this.brandsService.updateBackground(id, payload);
  }

  @Post(":id/products")
  createProduct(@Param("id") id: string, @Body() payload: CreateProductPayload) {
    return this.brandsService.createProduct(id, payload);
  }

  @Post(":id/product-images")
  uploadProductImage(@Param("id") id: string, @Body() payload: UploadBrandProductImagePayload): Promise<BrandProductImageUploadRecord> {
    return this.brandsService.uploadProductImage(id, payload);
  }

  @Get(":id/product-images/:fileName")
  getProductImage(
    @Param("id") id: string,
    @Param("fileName") fileName: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = this.brandsService.getProductImage(id, fileName);
    response.setHeader("Content-Type", file.contentType);
    return response.send(file.buffer);
  }

  @Post(":id/asset-files")
  uploadAssetFile(@Param("id") id: string, @Body() payload: UploadBrandAssetFilePayload): Promise<BrandAssetFileUploadRecord> {
    return this.brandsService.uploadAssetFile(id, payload);
  }

  @Get(":id/asset-files/:fileName")
  getAssetFile(
    @Param("id") id: string,
    @Param("fileName") fileName: string,
    @Res() response: { setHeader(name: string, value: string): unknown; send(body: Buffer): unknown },
  ) {
    const file = this.brandsService.getAssetFile(id, fileName);
    response.setHeader("Content-Type", file.contentType);
    return response.send(file.buffer);
  }

  @Patch(":id/products/:productId")
  updateProduct(
    @Param("id") id: string,
    @Param("productId") productId: string,
    @Body() payload: UpdateProductPayload,
  ) {
    return this.brandsService.updateProduct(id, productId, payload);
  }

  @Delete(":id/products/:productId")
  deleteProduct(@Param("id") id: string, @Param("productId") productId: string) {
    return this.brandsService.deleteProduct(id, productId);
  }

  @Patch(":id/survey")
  updateSurvey(@Param("id") id: string, @Body() payload: UpsertSurveyPayload) {
    return this.brandsService.upsertSurvey(id, payload);
  }

  @Patch(":id/platform-accounts")
  replacePlatformAccounts(@Param("id") id: string, @Body() payload: ReplaceAccountsPayload) {
    return this.brandsService.replacePlatformAccounts(id, payload);
  }

  @Patch(":id/competitor-accounts")
  replaceCompetitorAccounts(@Param("id") id: string, @Body() payload: ReplaceAccountsPayload) {
    return this.brandsService.replaceCompetitorAccounts(id, payload);
  }

  @Patch(":id/industry-feeds")
  replaceIndustryFeeds(@Param("id") id: string, @Body() payload: CreateAssetPayload) {
    return this.brandsService.replaceIndustryFeeds(id, payload);
  }

  @Patch(":id/business-assets")
  replaceBusinessAssets(@Param("id") id: string, @Body() payload: CreateAssetPayload) {
    return this.brandsService.replaceBusinessAssets(id, payload);
  }

  @Patch(":id/feishu-binding")
  upsertFeishuBinding(@Param("id") id: string, @Body() payload: FeishuBindingPayload) {
    return this.brandsService.upsertFeishuBinding(id, payload);
  }
}
