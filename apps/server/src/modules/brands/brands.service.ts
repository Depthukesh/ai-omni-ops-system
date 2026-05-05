import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AssetCategory, PlatformType, Prisma } from "@prisma/client";
import { createId, database } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

const execFileAsync = promisify(execFile);

export type CreateBrandPayload = {
  ownerUserId?: string;
  brandName: string;
  industry?: string;
  storeCount?: number;
  foundedYear?: number;
  brandDescription?: string;
  enterpriseIntro?: string;
};

export type UpdateBackgroundPayload = {
  brandName?: string;
  industry?: string;
  storeCount?: number;
  foundedYear?: number;
  brandDescription?: string;
  enterpriseIntro?: string;
};

export type CreateProductPayload = {
  productName: string;
  productType?: string;
  price?: number;
  productPositioning?: string;
  targetAudience?: string;
  painPoint?: string;
  usageScenario?: string;
  differentiators?: string;
  marketPosition?: string;
  detailDescription?: string;
  imageUrl?: string;
};

export type UpdateProductPayload = CreateProductPayload;

export type UploadBrandProductImagePayload = {
  fileName: string;
  contentType: string;
  dataBase64: string;
};

export type BrandProductImageUploadRecord = {
  fileName: string;
  imageUrl: string;
};

export type UploadBrandAssetFilePayload = {
  fileName: string;
  contentType: string;
  dataBase64: string;
};

export type BrandAssetFileUploadRecord = {
  fileName: string;
  fileUrl: string;
};

export type UpsertSurveyPayload = {
  answers: Array<{
    key: string;
    label: string;
    value: string;
  }>;
};

export type ReplaceAccountsPayload = {
  accounts: Array<{
    id?: string;
    platform: "XIAOHONGSHU" | "DOUYIN" | "VIDEO_CHANNEL" | "WECHAT_OA";
    accountName: string;
    accountLink: string;
  }>;
};

export type CreateAssetPayload = {
  items: Array<{
    id?: string;
    title: string;
    description: string;
    sourceName?: string;
    fileUrl?: string;
  }>;
};

export type FeishuBindingPayload = {
  wikiUrl: string;
  baseToken?: string;
  tableId?: string;
  viewId?: string;
  title?: string;
  templateUrl?: string;
};

export type FeishuAuthStatusRecord = {
  authorized: boolean;
  identity: string;
  tokenStatus: string;
  expiresAt: string;
  grantedAt: string;
  userName: string;
  message: string;
};

export type FeishuAuthStartRecord = {
  verificationUri: string;
  verificationUriComplete: string;
  userCode: string;
  expiresIn: number;
};

const FEISHU_BINDING_TITLE = "FEISHU_COPY_BINDING";
const FEISHU_BINDING_KIND = "FEISHU_COPY_BINDING";

@Injectable()
export class BrandsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getOverview() {
    if (await this.prismaService.canUseDatabase()) {
      return this.getOverviewFromDatabase();
    }

    return this.getOverviewFromMock();
  }

  async getBrandDetail(id: string) {
    return this.getArchive(id);
  }

  async getArchive(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      return this.getArchiveFromDatabase(id);
    }

    return this.getArchiveFromMock(id);
  }

  async createBrand(payload: CreateBrandPayload) {
    if (await this.prismaService.canUseDatabase()) {
      const ownerUserId = payload.ownerUserId ?? (await this.getDefaultUserId());

      return this.prismaService.brand.create({
        data: {
          ownerUserId,
          brandName: payload.brandName,
          industry: payload.industry ?? "待补充",
          storeCount: payload.storeCount ?? 0,
          foundedYear: payload.foundedYear ?? new Date().getFullYear(),
          brandDescription: payload.brandDescription ?? "",
          enterpriseIntro: payload.enterpriseIntro ?? "",
        },
      });
    }

    return this.createBrandFromMock(payload);
  }

  async updateBackground(id: string, payload: UpdateBackgroundPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      return this.prismaService.brand.update({
        where: { id },
        data: {
          brandName: payload.brandName,
          industry: payload.industry,
          storeCount: payload.storeCount,
          foundedYear: payload.foundedYear,
          brandDescription: payload.brandDescription,
          enterpriseIntro: payload.enterpriseIntro,
        },
      });
    }

    return this.updateBackgroundFromMock(id, payload);
  }

  async createProduct(id: string, payload: CreateProductPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      return this.mapProduct(
        await this.prismaService.product.create({
          data: {
            brandId: id,
            productName: payload.productName,
            productType: payload.productType ?? "待补充",
            price: this.toDecimal(payload.price ?? 0),
            productPositioning: payload.productPositioning ?? "",
            targetAudience: payload.targetAudience ?? "",
            painPoint: payload.painPoint ?? "",
            usageScenario: payload.usageScenario ?? "",
            differentiators: payload.differentiators ?? "",
            marketPosition: payload.marketPosition ?? "",
            detailDescription: payload.detailDescription ?? "",
            imageUrl: payload.imageUrl ?? "",
          },
        }),
      );
    }

    return this.createProductFromMock(id, payload);
  }

  async updateProduct(id: string, productId: string, payload: UpdateProductPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);
      await this.ensureProductExistsInDatabase(id, productId);

      return this.mapProduct(
        await this.prismaService.product.update({
          where: { id: productId },
          data: {
            productName: payload.productName,
            productType: payload.productType,
            price: payload.price === undefined ? undefined : this.toDecimal(payload.price),
            productPositioning: payload.productPositioning,
            targetAudience: payload.targetAudience,
            painPoint: payload.painPoint,
            usageScenario: payload.usageScenario,
            differentiators: payload.differentiators,
            marketPosition: payload.marketPosition,
            detailDescription: payload.detailDescription,
            imageUrl: payload.imageUrl,
          },
        }),
      );
    }

    return this.updateProductFromMock(id, productId, payload);
  }

  async deleteProduct(id: string, productId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);
      await this.ensureProductExistsInDatabase(id, productId);

      return this.mapProduct(
        await this.prismaService.product.delete({
          where: { id: productId },
        }),
      );
    }

    return this.deleteProductFromMock(id, productId);
  }

  async uploadProductImage(id: string, payload: UploadBrandProductImagePayload): Promise<BrandProductImageUploadRecord> {
    await this.ensureBrandExistsInMockOrDatabase(id);

    if (!payload.fileName || !payload.contentType || !payload.dataBase64) {
      throw new ServiceUnavailableException("图片上传参数不完整");
    }

    if (!payload.contentType.startsWith("image/")) {
      throw new ServiceUnavailableException("只支持上传图片文件");
    }

    const extension = this.resolveImageExtension(payload.fileName, payload.contentType);
    const fileName = `${randomUUID()}${extension}`;
    const directoryPath = this.resolveBrandProductImageDirectory(id);
    const filePath = join(directoryPath, fileName);

    mkdirSync(directoryPath, { recursive: true });
    writeFileSync(filePath, Buffer.from(payload.dataBase64, "base64"));

    return {
      fileName,
      imageUrl: `${this.resolveServerBaseUrl()}/api/brands/${id}/product-images/${encodeURIComponent(fileName)}`,
    };
  }

  getProductImage(id: string, fileName: string) {
    const safeFileName = this.sanitizeStoredFileName(fileName);
    const filePath = join(this.resolveBrandProductImageDirectory(id), safeFileName);

    if (!existsSync(filePath)) {
      throw new NotFoundException("产品图片不存在");
    }

    return {
      buffer: readFileSync(filePath),
      contentType: this.resolveImageContentType(safeFileName),
    };
  }

  async uploadAssetFile(id: string, payload: UploadBrandAssetFilePayload): Promise<BrandAssetFileUploadRecord> {
    await this.ensureBrandExistsInMockOrDatabase(id);

    if (!payload.fileName || !payload.dataBase64) {
      throw new ServiceUnavailableException("文档上传参数不完整");
    }

    const extension = this.resolveStoredExtension(payload.fileName);
    const fileName = `${randomUUID()}${extension}`;
    const directoryPath = this.resolveBrandAssetFileDirectory(id);
    const filePath = join(directoryPath, fileName);

    mkdirSync(directoryPath, { recursive: true });
    writeFileSync(filePath, Buffer.from(payload.dataBase64, "base64"));

    return {
      fileName,
      fileUrl: `${this.resolveServerBaseUrl()}/api/brands/${id}/asset-files/${encodeURIComponent(fileName)}`,
    };
  }

  getAssetFile(id: string, fileName: string) {
    const safeFileName = this.sanitizeStoredFileName(fileName);
    const filePath = join(this.resolveBrandAssetFileDirectory(id), safeFileName);

    if (!existsSync(filePath)) {
      throw new NotFoundException("文档不存在");
    }

    return {
      buffer: readFileSync(filePath),
      contentType: this.resolveFileContentType(safeFileName),
    };
  }

  async upsertSurvey(id: string, payload: UpsertSurveyPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      const existing = await this.prismaService.brandSurvey.findFirst({
        where: {
          brandId: id,
          surveyType: "BRAND_ARCHIVE",
        },
      });

      const data = {
        surveyJson: payload.answers as Prisma.InputJsonValue,
        summary: `${payload.answers.length} 项建档调研`,
      };

      if (existing) {
        await this.prismaService.brandSurvey.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await this.prismaService.brandSurvey.create({
          data: {
            brandId: id,
            surveyType: "BRAND_ARCHIVE",
            ...data,
          },
        });
      }

      return payload.answers.map((answer) => ({
        id: createId("sur"),
        key: answer.key,
        label: answer.label,
        value: answer.value,
      }));
    }

    return this.upsertSurveyFromMock(id, payload);
  }

  async replacePlatformAccounts(id: string, payload: ReplaceAccountsPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      await this.prismaService.$transaction([
        this.prismaService.platformAccount.deleteMany({ where: { brandId: id } }),
        ...payload.accounts.map((account) =>
          this.prismaService.platformAccount.create({
            data: {
              brandId: id,
              platform: account.platform as PlatformType,
              accountName: account.accountName,
              accountLink: account.accountLink,
              username: account.accountName,
            },
          }),
        ),
      ]);

      return payload.accounts.map((account) => ({
        id: account.id ?? createId("acc"),
        platform: account.platform,
        accountName: account.accountName,
        accountLink: account.accountLink,
      }));
    }

    return this.replacePlatformAccountsFromMock(id, payload);
  }

  async replaceCompetitorAccounts(id: string, payload: ReplaceAccountsPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      await this.prismaService.$transaction([
        this.prismaService.competitorAccount.deleteMany({ where: { brandId: id } }),
        ...payload.accounts.map((account) =>
          this.prismaService.competitorAccount.create({
            data: {
              brandId: id,
              platform: account.platform as PlatformType,
              accountName: account.accountName,
              accountLink: account.accountLink,
              username: account.accountName,
            },
          }),
        ),
      ]);

      return payload.accounts.map((account) => ({
        id: account.id ?? createId("cmp"),
        platform: account.platform,
        accountName: account.accountName,
        accountLink: account.accountLink,
      }));
    }

    return this.replaceCompetitorAccountsFromMock(id, payload);
  }

  async replaceIndustryFeeds(id: string, payload: CreateAssetPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      await this.prismaService.$transaction([
        this.prismaService.industryReport.deleteMany({ where: { brandId: id } }),
        ...payload.items.map((item) =>
          this.prismaService.industryReport.create({
            data: {
              brandId: id,
              title: item.title,
              summary: item.description,
              fileUrl: item.fileUrl,
              sourceName: item.sourceName,
            },
          }),
        ),
      ]);

      return payload.items.map((item) => ({
        id: item.id ?? createId("ast"),
        title: item.title,
        description: item.description,
        sourceName: item.sourceName,
        fileUrl: item.fileUrl,
      }));
    }

    return this.replaceIndustryFeedsFromMock(id, payload);
  }

  async replaceBusinessAssets(id: string, payload: CreateAssetPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      await this.prismaService.$transaction([
        this.prismaService.businessAsset.deleteMany({
          where: {
            brandId: id,
            category: AssetCategory.BUSINESS_DATA,
          },
        }),
        ...payload.items.map((item) =>
          this.prismaService.businessAsset.create({
            data: {
              brandId: id,
              category: AssetCategory.BUSINESS_DATA,
              title: item.title,
              description: item.description,
              fileUrl: item.fileUrl,
              metadataJson: {
                sourceName: item.sourceName ?? "",
              },
            },
          }),
        ),
      ]);

      return payload.items.map((item) => ({
        id: item.id ?? createId("ast"),
        title: item.title,
        description: item.description,
        sourceName: item.sourceName,
        fileUrl: item.fileUrl,
      }));
    }

    return this.replaceBusinessAssetsFromMock(id, payload);
  }

  async getFeishuBinding(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      const binding = await this.prismaService.businessAsset.findFirst({
        where: {
          brandId: id,
          category: AssetCategory.BUSINESS_DATA,
          title: FEISHU_BINDING_TITLE,
        },
        orderBy: { updatedAt: "desc" },
      });

      return this.mapFeishuBinding(binding);
    }

    this.getBrand(id);
    const binding = database.assets.find((item) => item.brandId === id && item.title === FEISHU_BINDING_TITLE);
    return this.mapFeishuBindingFromMock(binding);
  }

  async getFeishuAuthStatus(): Promise<FeishuAuthStatusRecord> {
    try {
      const payload = await this.runLarkCliJson(["auth", "status"]);
      const meta = this.readObject(payload);
      const tokenStatus = this.readString(meta, "tokenStatus") ?? "";
      const authorized = tokenStatus === "valid";
      return {
        authorized,
        identity: this.readString(meta, "identity") ?? "",
        tokenStatus,
        expiresAt: this.readString(meta, "expiresAt") ?? "",
        grantedAt: this.readString(meta, "grantedAt") ?? "",
        userName: this.readString(meta, "userName") ?? "",
        message: authorized ? "当前服务已完成飞书授权，可直接同步。" : "当前服务还未完成飞书授权。",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "当前服务还未完成飞书授权。";
      return {
        authorized: false,
        identity: "",
        tokenStatus: "invalid",
        expiresAt: "",
        grantedAt: "",
        userName: "",
        message,
      };
    }
  }

  async startFeishuAuth(): Promise<FeishuAuthStartRecord> {
    const payload = await this.runLarkCliJson(
      ["auth", "login", "--domain", "wiki", "--domain", "base", "--json"],
      { timeoutMs: 3000, allowPartialJsonOnError: true },
    );
    const meta = this.readObject(payload);
    return {
      verificationUri: this.readString(meta, "verification_uri") ?? "",
      verificationUriComplete: this.readString(meta, "verification_uri_complete") ?? "",
      userCode: this.readString(meta, "user_code") ?? "",
      expiresIn: this.readNumber(meta, "expires_in"),
    };
  }

  async upsertFeishuBinding(id: string, payload: FeishuBindingPayload) {
    const parsed = this.parseFeishuBindingUrl(payload.wikiUrl);
    const normalized = this.buildFeishuBindingMetadata(payload, parsed);

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);

      const existing = await this.prismaService.businessAsset.findFirst({
        where: {
          brandId: id,
          category: AssetCategory.BUSINESS_DATA,
          title: FEISHU_BINDING_TITLE,
        },
        select: { id: true },
      });

      const data = {
        brandId: id,
        category: AssetCategory.BUSINESS_DATA,
        title: FEISHU_BINDING_TITLE,
        description: "品牌小红书收集数据所绑定的飞书多维表格副本",
        fileUrl: payload.wikiUrl,
        metadataJson: normalized as Prisma.InputJsonValue,
      };

      const asset = existing
        ? await this.prismaService.businessAsset.update({
            where: { id: existing.id },
            data,
          })
        : await this.prismaService.businessAsset.create({ data });

      return this.mapFeishuBinding(asset);
    }

    this.getBrand(id);
    database.assets = database.assets.filter((item) => !(item.brandId === id && item.title === FEISHU_BINDING_TITLE));
    const asset = {
      id: createId("ast"),
      brandId: id,
      category: "BUSINESS_DATA" as const,
      title: FEISHU_BINDING_TITLE,
      description: "品牌小红书收集数据所绑定的飞书多维表格副本",
      fileUrl: payload.wikiUrl,
      metadataJson: normalized,
    };
    database.assets.unshift(asset);
    return this.mapFeishuBindingFromMock(asset);
  }

  private getOverviewFromMock() {
    const currentBrand = database.brands[0];
    const relatedProducts = database.products.filter((item) => item.brandId === currentBrand.id);
    const relatedAccounts = database.platformAccounts.filter((item) => item.brandId === currentBrand.id);
    const relatedTasks = database.tasks.filter((item) => item.brandId === currentBrand.id);
    const relatedMedia = database.media.filter((item) => item.brandId === currentBrand.id);
    const survey = database.surveyAnswers.filter((item) => item.brandId === currentBrand.id);
    const platformAccounts = database.platformAccounts.filter((item) => item.brandId === currentBrand.id);
    const competitorAccounts = database.competitorAccounts.filter((item) => item.brandId === currentBrand.id);
    const industryFeeds = database.assets.filter(
      (item) => item.brandId === currentBrand.id && item.category === "INDUSTRY_REPORT",
    );
    const businessAssets = database.assets.filter(
      (item) => item.brandId === currentBrand.id && item.category === "BUSINESS_DATA" && !this.isFeishuBindingMetadata(item.metadataJson),
    );

    return {
      currentBrand,
      summaryCards: [
        { label: "品牌档案数", value: database.brands.length, tone: "primary" },
        { label: "产品资料数", value: relatedProducts.length, tone: "violet" },
        { label: "平台账号数", value: relatedAccounts.length, tone: "green" },
        { label: "任务总数", value: relatedTasks.length, tone: "orange" },
        { label: "媒体资产数", value: relatedMedia.length, tone: "blue" },
      ],
      archiveSteps: this.buildStepsFromCollections({
        products: relatedProducts,
        survey,
        platformAccounts,
        competitorAccounts,
        industryFeeds,
        businessAssets,
      }),
    };
  }

  private async getOverviewFromDatabase() {
    const currentBrand = await this.prismaService.brand.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!currentBrand) {
      return this.getOverviewFromMock();
    }

    const [productsCount, platformAccountsCount, tasksCount, mediaCount] = await Promise.all([
      this.prismaService.product.count({ where: { brandId: currentBrand.id } }),
      this.prismaService.platformAccount.count({ where: { brandId: currentBrand.id } }),
      this.prismaService.task.count({ where: { brandId: currentBrand.id } }),
      this.prismaService.mediaAsset.count({ where: { brandId: currentBrand.id } }),
    ]);

    const archive = await this.getArchiveFromDatabase(currentBrand.id);

    return {
      currentBrand: archive.brand,
      summaryCards: [
        { label: "品牌档案数", value: await this.prismaService.brand.count(), tone: "primary" },
        { label: "产品资料数", value: productsCount, tone: "violet" },
        { label: "平台账号数", value: platformAccountsCount, tone: "green" },
        { label: "任务总数", value: tasksCount, tone: "orange" },
        { label: "媒体资产数", value: mediaCount, tone: "blue" },
      ],
      archiveSteps: archive.steps,
    };
  }

  private getArchiveFromMock(id: string) {
    const brand = this.getBrand(id);
    const products = database.products.filter((item) => item.brandId === id);
    const survey = database.surveyAnswers.filter((item) => item.brandId === id);
    const platformAccounts = database.platformAccounts.filter((item) => item.brandId === id);
    const competitorAccounts = database.competitorAccounts.filter((item) => item.brandId === id);
    const industryFeeds = database.assets.filter(
      (item) => item.brandId === id && item.category === "INDUSTRY_REPORT",
    );
    const businessAssets = database.assets.filter(
      (item) => item.brandId === id && item.category === "BUSINESS_DATA" && !this.isFeishuBindingMetadata(item.metadataJson),
    );

    return {
      brand,
      products,
      survey,
      platformAccounts,
      competitorAccounts,
      industryFeeds,
      businessAssets,
      steps: this.buildStepsFromCollections({
        products,
        survey,
        platformAccounts,
        competitorAccounts,
        industryFeeds,
        businessAssets,
      }),
      recentTasks: database.tasks.filter((item) => item.brandId === id).slice(0, 5),
      recentMedia: database.media.filter((item) => item.brandId === id).slice(0, 5),
    };
  }

  private async getArchiveFromDatabase(id: string) {
    const brand = await this.prismaService.brand.findUnique({
      where: { id },
      include: {
        products: true,
        surveys: {
          where: { surveyType: "BRAND_ARCHIVE" },
          take: 1,
        },
        platformAccounts: true,
        competitorAccounts: true,
        industryReports: true,
        businessAssets: {
          where: { category: AssetCategory.BUSINESS_DATA },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    const survey = this.parseSurveyAnswers(brand.surveys[0]?.surveyJson);
    const products = brand.products.map((item) => this.mapProduct(item));
    const platformAccounts = brand.platformAccounts.map((item) => this.mapAccount(item));
    const competitorAccounts = brand.competitorAccounts.map((item) => this.mapAccount(item));
    const industryFeeds = brand.industryReports.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.summary ?? "",
      sourceName: item.sourceName ?? "",
      fileUrl: item.fileUrl ?? "",
    }));
    const businessAssets = brand.businessAssets
      .filter((item) => !this.isFeishuBindingMetadata(item.metadataJson))
      .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description ?? "",
      sourceName: this.extractSourceName(item.metadataJson),
      fileUrl: item.fileUrl ?? "",
    }));

    return {
      brand: {
        id: brand.id,
        brandName: brand.brandName,
        industry: brand.industry ?? "",
        storeCount: brand.storeCount ?? 0,
        foundedYear: brand.foundedYear ?? 0,
        brandDescription: brand.brandDescription ?? "",
        enterpriseIntro: brand.enterpriseIntro ?? "",
      },
      products,
      survey,
      platformAccounts,
      competitorAccounts,
      industryFeeds,
      businessAssets,
      steps: this.buildStepsFromCollections({
        products,
        survey,
        platformAccounts,
        competitorAccounts,
        industryFeeds,
        businessAssets,
      }),
      recentTasks: [],
      recentMedia: [],
    };
  }

  private createBrandFromMock(payload: CreateBrandPayload) {
    const brand = {
      id: createId("br"),
      ownerUserId: payload.ownerUserId ?? database.users[0].id,
      brandName: payload.brandName,
      industry: payload.industry ?? "待补充",
      storeCount: payload.storeCount ?? 0,
      foundedYear: payload.foundedYear ?? new Date().getFullYear(),
      brandDescription: payload.brandDescription ?? "",
      enterpriseIntro: payload.enterpriseIntro ?? "",
    };

    database.brands.unshift(brand);
    return brand;
  }

  private updateBackgroundFromMock(id: string, payload: UpdateBackgroundPayload) {
    const brand = this.getBrand(id);

    Object.assign(brand, {
      brandName: payload.brandName ?? brand.brandName,
      industry: payload.industry ?? brand.industry,
      storeCount: payload.storeCount ?? brand.storeCount,
      foundedYear: payload.foundedYear ?? brand.foundedYear,
      brandDescription: payload.brandDescription ?? brand.brandDescription,
      enterpriseIntro: payload.enterpriseIntro ?? brand.enterpriseIntro,
    });

    return brand;
  }

  private createProductFromMock(id: string, payload: CreateProductPayload) {
    this.getBrand(id);

    const product = {
      id: createId("prd"),
      brandId: id,
      productName: payload.productName,
      productType: payload.productType ?? "待补充",
      price: payload.price ?? 0,
      productPositioning: payload.productPositioning ?? "",
      targetAudience: payload.targetAudience ?? "",
      painPoint: payload.painPoint ?? "",
      usageScenario: payload.usageScenario ?? "",
      differentiators: payload.differentiators ?? "",
      marketPosition: payload.marketPosition ?? "",
      detailDescription: payload.detailDescription ?? "",
      imageUrl: payload.imageUrl ?? "",
    };

    database.products.unshift(product);
    return product;
  }

  private updateProductFromMock(id: string, productId: string, payload: UpdateProductPayload) {
    this.getBrand(id);
    const product = database.products.find((item) => item.id === productId && item.brandId === id);

    if (!product) {
      throw new NotFoundException("产品不存在");
    }

    Object.assign(product, {
      productName: payload.productName ?? product.productName,
      productType: payload.productType ?? product.productType,
      price: payload.price ?? product.price,
      productPositioning: payload.productPositioning ?? product.productPositioning,
      targetAudience: payload.targetAudience ?? product.targetAudience,
      painPoint: payload.painPoint ?? product.painPoint,
      usageScenario: payload.usageScenario ?? product.usageScenario,
      differentiators: payload.differentiators ?? product.differentiators,
      marketPosition: payload.marketPosition ?? product.marketPosition,
      detailDescription: payload.detailDescription ?? product.detailDescription,
      imageUrl: payload.imageUrl ?? product.imageUrl,
    });

    return product;
  }

  private deleteProductFromMock(id: string, productId: string) {
    this.getBrand(id);
    const index = database.products.findIndex((item) => item.id === productId && item.brandId === id);

    if (index < 0) {
      throw new NotFoundException("产品不存在");
    }

    const [removed] = database.products.splice(index, 1);
    return removed;
  }

  private upsertSurveyFromMock(id: string, payload: UpsertSurveyPayload) {
    this.getBrand(id);
    database.surveyAnswers = database.surveyAnswers.filter((item) => item.brandId !== id);

    const rows = payload.answers.map((answer) => ({
      id: createId("sur"),
      brandId: id,
      key: answer.key,
      label: answer.label,
      value: answer.value,
    }));

    database.surveyAnswers.unshift(...rows);
    return rows;
  }

  private replacePlatformAccountsFromMock(id: string, payload: ReplaceAccountsPayload) {
    return this.replaceAccounts("platformAccounts", id, payload.accounts);
  }

  private replaceCompetitorAccountsFromMock(id: string, payload: ReplaceAccountsPayload) {
    return this.replaceAccounts("competitorAccounts", id, payload.accounts);
  }

  private replaceIndustryFeedsFromMock(id: string, payload: CreateAssetPayload) {
    return this.replaceAssets(id, "INDUSTRY_REPORT", payload.items);
  }

  private replaceBusinessAssetsFromMock(id: string, payload: CreateAssetPayload) {
    return this.replaceAssets(id, "BUSINESS_DATA", payload.items);
  }

  private replaceAccounts(
    target: "platformAccounts" | "competitorAccounts",
    brandId: string,
    accounts: ReplaceAccountsPayload["accounts"],
  ) {
    this.getBrand(brandId);
    database[target] = database[target].filter((item) => item.brandId !== brandId);

    const rows = accounts.map((account) => ({
      id: account.id ?? createId(target === "platformAccounts" ? "acc" : "cmp"),
      brandId,
      platform: account.platform,
      accountName: account.accountName,
      accountLink: account.accountLink,
    }));

    database[target].push(...rows);
    return rows;
  }

  private replaceAssets(
    brandId: string,
    category: "INDUSTRY_REPORT" | "BUSINESS_DATA",
    items: CreateAssetPayload["items"],
  ) {
    this.getBrand(brandId);
    database.assets = database.assets.filter(
      (item) => !(item.brandId === brandId && item.category === category)
    );

    const rows = items.map((item) => ({
      id: item.id ?? createId("ast"),
      brandId,
      category,
      title: item.title,
      description: item.description,
      sourceName: item.sourceName,
      fileUrl: item.fileUrl,
    }));

    database.assets.push(...rows);
    return rows;
  }

  private buildStepsFromCollections({
    products,
    survey,
    platformAccounts,
    competitorAccounts,
    industryFeeds,
    businessAssets,
  }: {
    products: Array<unknown>;
    survey: Array<unknown>;
    platformAccounts: Array<unknown>;
    competitorAccounts: Array<unknown>;
    industryFeeds: Array<unknown>;
    businessAssets: Array<unknown>;
  }) {
    return [
      {
        key: "background",
        name: "品牌背景资料",
        status: "ready",
        description: "品牌名称、行业、门店数量、品牌介绍与企业介绍。",
      },
      {
        key: "products",
        name: "产品资料库",
        status: products.length > 0 ? "ready" : "pending",
        description: "一行一个产品，沉淀产品定位、价格和使用场景。",
      },
      {
        key: "survey",
        name: "品牌运营情况调研",
        status: survey.length >= 4 ? "in_progress" : "pending",
        description: "围绕人货场资制度与业务诊断的结构化调研。",
      },
      {
        key: "industryFeeds",
        name: "第三方数据投喂",
        status: industryFeeds.length > 0 ? "ready" : "pending",
        description: "行业报告、市场分析等外部信息输入。",
      },
      {
        key: "businessAssets",
        name: "企业经营数据投喂",
        status: businessAssets.length > 0 ? "ready" : "pending",
        description: "经营报表与业务数据输入，为增长测算做准备。",
      },
    ];
  }

  private async ensureBrandExistsInDatabase(id: string) {
    const brand = await this.prismaService.brand.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }
  }

  private async ensureProductExistsInDatabase(brandId: string, productId: string) {
    const product = await this.prismaService.product.findFirst({
      where: {
        id: productId,
        brandId,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException("产品不存在");
    }
  }

  private async getDefaultUserId() {
    const user = await this.prismaService.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("当前数据库中不存在可绑定的用户");
    }

    return user.id;
  }

  private async ensureBrandExistsInMockOrDatabase(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureBrandExistsInDatabase(id);
      return;
    }

    this.getBrand(id);
  }

  private toDecimal(value: number) {
    return new Prisma.Decimal(value);
  }

  private resolveBrandProductImageDirectory(brandId: string) {
    return join(this.resolveWorkspaceRootDir(), ".runtime", "brand-product-images", brandId);
  }

  private resolveBrandAssetFileDirectory(brandId: string) {
    return join(this.resolveWorkspaceRootDir(), ".runtime", "brand-asset-files", brandId);
  }

  private resolveWorkspaceRootDir() {
    const candidates = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "..", "..")];
    for (const candidate of candidates) {
      if (existsSync(join(candidate, "prisma", "schema.prisma"))) {
        return candidate;
      }
    }

    return process.cwd();
  }

  private resolveServerBaseUrl() {
    return process.env.API_PUBLIC_BASE_URL
      || process.env.WEB_API_BASE_URL
      || `http://localhost:${Number(process.env.PORT || 3011)}`;
  }

  private resolveImageExtension(fileName: string, contentType: string) {
    const currentExtension = extname(fileName).toLowerCase();
    if (currentExtension) {
      return currentExtension;
    }

    switch (contentType.toLowerCase()) {
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      case "image/gif":
        return ".gif";
      default:
        return ".jpg";
    }
  }

  private resolveStoredExtension(fileName: string) {
    const currentExtension = extname(fileName).toLowerCase();
    return currentExtension || ".bin";
  }

  private sanitizeStoredFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, "");
  }

  private resolveImageContentType(fileName: string) {
    const extension = extname(fileName).toLowerCase();
    switch (extension) {
      case ".png":
        return "image/png";
      case ".webp":
        return "image/webp";
      case ".gif":
        return "image/gif";
      case ".jpeg":
      case ".jpg":
      default:
        return "image/jpeg";
    }
  }

  private resolveFileContentType(fileName: string) {
    const extension = extname(fileName).toLowerCase();
    switch (extension) {
      case ".pdf":
        return "application/pdf";
      case ".xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case ".xls":
        return "application/vnd.ms-excel";
      case ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".doc":
        return "application/msword";
      case ".pptx":
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      case ".ppt":
        return "application/vnd.ms-powerpoint";
      case ".csv":
        return "text/csv; charset=utf-8";
      case ".txt":
        return "text/plain; charset=utf-8";
      case ".zip":
        return "application/zip";
      case ".rar":
        return "application/vnd.rar";
      default:
        return "application/octet-stream";
    }
  }

  private mapProduct(item: {
    id: string;
    productName: string;
    productType: string | null;
    price: Prisma.Decimal | null;
    productPositioning?: string | null;
    targetAudience?: string | null;
    painPoint?: string | null;
    usageScenario: string | null;
    differentiators?: string | null;
    marketPosition?: string | null;
    detailDescription?: string | null;
    imageUrl?: string | null;
  }) {
    return {
      id: item.id,
      productName: item.productName,
      productType: item.productType ?? "",
      price: item.price ? Number(item.price) : 0,
      productPositioning: item.productPositioning ?? "",
      targetAudience: item.targetAudience ?? "",
      painPoint: item.painPoint ?? "",
      usageScenario: item.usageScenario ?? "",
      differentiators: item.differentiators ?? "",
      marketPosition: item.marketPosition ?? "",
      detailDescription: item.detailDescription ?? "",
      imageUrl: item.imageUrl ?? "",
    };
  }

  private mapAccount(item: {
    id: string;
    platform: PlatformType;
    accountName: string | null;
    accountLink: string;
  }) {
    return {
      id: item.id,
      platform: item.platform,
      accountName: item.accountName ?? "",
      accountLink: item.accountLink,
    };
  }

  private parseSurveyAnswers(value: Prisma.JsonValue | null | undefined) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;

      return {
        id: typeof row.id === "string" ? row.id : `sur_db_${index + 1}`,
        key: typeof row.key === "string" ? row.key : `field_${index + 1}`,
        label: typeof row.label === "string" ? row.label : `字段 ${index + 1}`,
        value: typeof row.value === "string" ? row.value : "",
      };
    });
  }

  private extractSourceName(value: Prisma.JsonValue | null | undefined) {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return "";
    }

    const sourceName = (value as Record<string, unknown>).sourceName;
    return typeof sourceName === "string" ? sourceName : "";
  }

  private mapFeishuBinding(
    asset:
      | {
          id: string;
          fileUrl: string | null;
          metadataJson: Prisma.JsonValue | null;
          createdAt: Date;
          updatedAt: Date;
        }
      | null,
  ) {
    if (!asset) {
      return null;
    }

    const metadata = this.readObject(asset.metadataJson);
    return {
      id: asset.id,
      title: this.readString(metadata, "title") || "飞书多维表格副本",
      wikiUrl: asset.fileUrl ?? this.readString(metadata, "wikiUrl") ?? "",
      wikiToken: this.readString(metadata, "wikiToken") ?? "",
      host: this.readString(metadata, "host") ?? "",
      tableId: this.readString(metadata, "tableId") ?? "",
      viewId: this.readString(metadata, "viewId") ?? "",
      baseToken: this.readString(metadata, "baseToken") ?? "",
      templateUrl: this.readString(metadata, "templateUrl") ?? "",
      syncStatus: this.readString(metadata, "syncStatus") ?? "IDLE",
      lastError: this.readString(metadata, "lastError") ?? "",
      lastBoundAt: this.readString(metadata, "lastBoundAt") ?? asset.updatedAt.toISOString(),
      lastSyncAt: this.readString(metadata, "lastSyncAt") ?? "",
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString(),
    };
  }

  private mapFeishuBindingFromMock(
    asset:
      | {
          id: string;
          fileUrl?: string;
          metadataJson?: Record<string, unknown>;
        }
      | undefined,
  ) {
    if (!asset) {
      return null;
    }

    const metadata = asset.metadataJson ?? {};
    return {
      id: asset.id,
      title: this.readString(metadata, "title") || "飞书多维表格副本",
      wikiUrl: asset.fileUrl ?? this.readString(metadata, "wikiUrl") ?? "",
      wikiToken: this.readString(metadata, "wikiToken") ?? "",
      host: this.readString(metadata, "host") ?? "",
      tableId: this.readString(metadata, "tableId") ?? "",
      viewId: this.readString(metadata, "viewId") ?? "",
      baseToken: this.readString(metadata, "baseToken") ?? "",
      templateUrl: this.readString(metadata, "templateUrl") ?? "",
      syncStatus: this.readString(metadata, "syncStatus") ?? "IDLE",
      lastError: this.readString(metadata, "lastError") ?? "",
      lastBoundAt: this.readString(metadata, "lastBoundAt") ?? "",
      lastSyncAt: this.readString(metadata, "lastSyncAt") ?? "",
      createdAt: this.readString(metadata, "createdAt") ?? "",
      updatedAt: this.readString(metadata, "updatedAt") ?? "",
    };
  }

  private parseFeishuBindingUrl(url: string) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new NotFoundException("飞书副本链接格式不正确");
    }

    const wikiMatch = parsedUrl.pathname.match(/\/wiki\/([^/?#]+)/);
    const baseMatch = parsedUrl.pathname.match(/\/base\/([^/?#]+)/);
    if (!wikiMatch?.[1] && !baseMatch?.[1]) {
      throw new NotFoundException("当前仅支持绑定飞书 wiki 或多维表格链接");
    }

    return {
      host: parsedUrl.host,
      wikiToken: wikiMatch?.[1] ?? "",
      baseToken: baseMatch?.[1] ?? "",
      tableId: parsedUrl.searchParams.get("table") ?? "",
      viewId: parsedUrl.searchParams.get("view") ?? "",
    };
  }

  private buildFeishuBindingMetadata(payload: FeishuBindingPayload, parsed: ReturnType<BrandsService["parseFeishuBindingUrl"]>) {
    return {
      kind: FEISHU_BINDING_KIND,
      title: payload.title || "飞书多维表格副本",
      wikiUrl: payload.wikiUrl,
      wikiToken: parsed.wikiToken,
      host: parsed.host,
      tableId: payload.tableId || parsed.tableId,
      viewId: payload.viewId || parsed.viewId,
      baseToken: payload.baseToken || parsed.baseToken || "",
      templateUrl: payload.templateUrl || "",
      syncStatus: "IDLE",
      lastError: "",
      lastBoundAt: new Date().toISOString(),
      lastSyncAt: "",
    };
  }

  private isFeishuBindingMetadata(value: Prisma.JsonValue | Record<string, unknown> | null | undefined) {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return false;
    }

    return (value as Record<string, unknown>).kind === FEISHU_BINDING_KIND;
  }

  private readObject(value: Prisma.JsonValue | Record<string, unknown> | null | undefined | unknown) {
    if (!value || Array.isArray(value) || typeof value !== "object") {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private readString(value: Record<string, unknown>, key: string) {
    const nextValue = value[key];
    return typeof nextValue === "string" ? nextValue : undefined;
  }

  private readNumber(value: Record<string, unknown>, key: string) {
    const nextValue = value[key];
    if (typeof nextValue === "number" && Number.isFinite(nextValue)) {
      return nextValue;
    }
    if (typeof nextValue === "string") {
      const parsed = Number(nextValue);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private async runLarkCliJson(
    args: string[],
    options?: {
      timeoutMs?: number;
      allowPartialJsonOnError?: boolean;
    },
  ) {
    try {
      const cliHome = this.resolveLarkCliHomeDir();
      const env = {
        ...process.env,
        HOME: cliHome,
        USERPROFILE: cliHome,
      };
      const result = process.platform === "win32"
        ? await execFileAsync(
            "powershell.exe",
            ["-NoProfile", "-Command", `& '${this.resolveLarkCliCommand()}' ${args.map((item) => this.escapePowerShellArg(item)).join(" ")}`],
            {
              encoding: "buffer",
              env,
              maxBuffer: 8 * 1024 * 1024,
              timeout: options?.timeoutMs,
            },
          )
        : await execFileAsync(this.resolveLarkCliCommand(), args, {
            encoding: "buffer",
            env,
            maxBuffer: 8 * 1024 * 1024,
            timeout: options?.timeoutMs,
          });
      const text = this.decodeCliOutput(result.stdout);
      return text ? (JSON.parse(text) as unknown) : {};
    } catch (error) {
      const stdout = this.decodeUnknownCliStream(
        typeof error === "object" && error && "stdout" in error ? (error as { stdout?: unknown }).stdout : undefined,
      );
      const stderr = this.decodeUnknownCliStream(
        typeof error === "object" && error && "stderr" in error ? (error as { stderr?: unknown }).stderr : undefined,
      );
      if (options?.allowPartialJsonOnError) {
        const partialPayload = this.tryParseFirstJsonObject(stdout);
        if (partialPayload) {
          return partialPayload;
        }
      }
      const message = stderr.trim() || stdout.trim() || (error instanceof Error ? error.message : "lark-cli 执行失败");
      throw new ServiceUnavailableException(message);
    }
  }

  private decodeCliOutput(stdout: Buffer | string | null | undefined) {
    if (!stdout) {
      return "";
    }
    if (typeof stdout === "string") {
      return stdout.trim();
    }
    const utf8Text = stdout.toString("utf8").trim();
    if (process.platform === "win32") {
      if (!utf8Text.includes("�")) {
        return utf8Text;
      }
      try {
        const gbText = new TextDecoder("gb18030").decode(stdout).trim();
        return gbText || utf8Text;
      } catch {
        return utf8Text;
      }
    }
    return utf8Text;
  }

  private decodeUnknownCliStream(value: unknown) {
    if (!value) {
      return "";
    }
    if (Buffer.isBuffer(value) || typeof value === "string") {
      return this.decodeCliOutput(value);
    }
    return String(value);
  }

  private tryParseFirstJsonObject(value: string) {
    const candidate = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find((item) => item.startsWith("{") && item.endsWith("}"));
    if (!candidate) {
      return null;
    }
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      return null;
    }
  }

  private escapePowerShellArg(value: string) {
    return `'${value.replace(/'/g, "''")}'`;
  }

  private resolveLarkCliCommand() {
    if (process.platform === "win32") {
      const appData = process.env.APPDATA || process.env.USERPROFILE;
      if (appData) {
        const baseDir = appData.endsWith("\\Roaming") ? `${appData}\\npm` : `${appData}\\Roaming\\npm`;
        return `${baseDir}\\lark-cli.cmd`;
      }
      return "lark-cli.cmd";
    }

    return "lark-cli";
  }

  private resolveLarkCliHomeDir() {
    const candidates = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "..", "..")];
    for (const candidate of candidates) {
      if (existsSync(join(candidate, ".lark-cli", "config.json"))) {
        return candidate;
      }
    }

    const fromUserProfile = process.env.USERPROFILE ? resolve(process.env.USERPROFILE) : "";
    if (fromUserProfile && existsSync(join(fromUserProfile, ".lark-cli", "config.json"))) {
      return fromUserProfile;
    }

    return process.cwd();
  }

  private getBrand(id: string) {
    const brand = database.brands.find((item) => item.id === id);
    if (!brand) {
      throw new NotFoundException("品牌不存在");
    }

    return brand;
  }
}
