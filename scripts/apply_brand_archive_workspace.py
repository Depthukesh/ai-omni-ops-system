from pathlib import Path
from textwrap import dedent


ROOT = Path(__file__).resolve().parents[1]


FILES: dict[str, str] = {
    "packages/shared/src/index.ts": dedent(
        """\
        export const APP_NAME = "AI全域运营系统";

        export enum PlatformType {
          XIAOHONGSHU = "XIAOHONGSHU",
          DOUYIN = "DOUYIN",
          VIDEO_CHANNEL = "VIDEO_CHANNEL",
          WECHAT_OA = "WECHAT_OA",
        }

        export enum TaskStatus {
          PENDING = "PENDING",
          QUEUED = "QUEUED",
          RUNNING = "RUNNING",
          SUCCESS = "SUCCESS",
          FAILED = "FAILED",
          CANCELLED = "CANCELLED",
        }

        export type BrandArchiveStepKey =
          | "background"
          | "products"
          | "survey"
          | "platformAccounts"
          | "competitorAccounts"
          | "industryFeeds"
          | "businessAssets";

        export type BrandArchiveStepStatus = "ready" | "in_progress" | "pending";

        export type BrandBackground = {
          id: string;
          brandName: string;
          industry: string;
          storeCount: number;
          foundedYear: number;
          brandDescription: string;
          enterpriseIntro: string;
        };

        export type BrandProduct = {
          id: string;
          productName: string;
          productType: string;
          price: number;
          usageScenario: string;
        };

        export type BrandSurveyAnswer = {
          key: string;
          label: string;
          value: string;
        };

        export type BrandAccount = {
          id: string;
          platform: PlatformType;
          accountName: string;
          accountLink: string;
        };

        export type BrandAsset = {
          id: string;
          title: string;
          description: string;
          sourceName?: string;
          fileUrl?: string;
        };

        export type BrandArchiveBundle = {
          brand: BrandBackground;
          products: BrandProduct[];
          survey: BrandSurveyAnswer[];
          platformAccounts: BrandAccount[];
          competitorAccounts: BrandAccount[];
          industryFeeds: BrandAsset[];
          businessAssets: BrandAsset[];
          steps: Array<{
            key: BrandArchiveStepKey;
            name: string;
            status: BrandArchiveStepStatus;
            description: string;
          }>;
        };
        """
    ),
    "apps/server/src/common/mock-data.ts": dedent(
        """\
        export type UserRecord = {
          id: string;
          mobile: string;
          email: string;
          nickname: string;
          password: string;
          status: "ACTIVE" | "DISABLED";
          membership: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
          pointsBalance: number;
        };

        export type BrandRecord = {
          id: string;
          ownerUserId: string;
          brandName: string;
          industry: string;
          storeCount: number;
          foundedYear: number;
          brandDescription: string;
          enterpriseIntro: string;
        };

        export type ProductRecord = {
          id: string;
          brandId: string;
          productName: string;
          productType: string;
          price: number;
          usageScenario: string;
        };

        export type PlatformAccountRecord = {
          id: string;
          brandId: string;
          platform: "XIAOHONGSHU" | "DOUYIN" | "VIDEO_CHANNEL" | "WECHAT_OA";
          accountName: string;
          accountLink: string;
        };

        export type SurveyAnswerRecord = {
          id: string;
          brandId: string;
          key: string;
          label: string;
          value: string;
        };

        export type AssetRecord = {
          id: string;
          brandId: string;
          category: "INDUSTRY_REPORT" | "BUSINESS_DATA";
          title: string;
          description: string;
          sourceName?: string;
          fileUrl?: string;
        };

        export type TaskRecord = {
          id: string;
          userId: string;
          brandId?: string;
          taskType: string;
          taskTitle: string;
          taskStatus: "PENDING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
          modelName: string;
          pointsCost: number;
          createdAt: string;
          updatedAt: string;
        };

        export type MediaRecord = {
          id: string;
          userId: string;
          brandId?: string;
          title: string;
          mediaType: "IMAGE" | "VIDEO" | "DOCUMENT" | "HTML";
          sourceUrl?: string;
          storageKey: string;
          createdAt: string;
        };

        export type MockDatabase = {
          users: UserRecord[];
          brands: BrandRecord[];
          products: ProductRecord[];
          platformAccounts: PlatformAccountRecord[];
          competitorAccounts: PlatformAccountRecord[];
          surveyAnswers: SurveyAnswerRecord[];
          assets: AssetRecord[];
          tasks: TaskRecord[];
          media: MediaRecord[];
        };

        export const database: MockDatabase = {
          users: [
            {
              id: "usr_demo_001",
              mobile: "13800000000",
              email: "demo@ai-omni.local",
              nickname: "演示账号",
              password: "123456",
              status: "ACTIVE",
              membership: "PRO",
              pointsBalance: 9800,
            },
          ],
          brands: [
            {
              id: "br_demo_001",
              ownerUserId: "usr_demo_001",
              brandName: "武汉仟吉",
              industry: "烘焙零售",
              storeCount: 180,
              foundedYear: 2000,
              brandDescription: "区域烘焙品牌，线下门店基础较强，线上全域增长空间明显。",
              enterpriseIntro: "当前聚焦品牌建档、采集、增长分析与年度营销规划。",
            },
          ],
          products: [
            {
              id: "prd_demo_001",
              brandId: "br_demo_001",
              productName: "爆浆提拉米苏蛋糕",
              productType: "节日蛋糕",
              price: 198,
              usageScenario: "生日庆祝与节日礼赠",
            },
            {
              id: "prd_demo_002",
              brandId: "br_demo_001",
              productName: "现烤牛角包",
              productType: "门店畅销",
              price: 12,
              usageScenario: "早餐与下午茶",
            },
          ],
          platformAccounts: [
            {
              id: "acc_demo_001",
              brandId: "br_demo_001",
              platform: "XIAOHONGSHU",
              accountName: "武汉仟吉烘焙",
              accountLink: "https://www.xiaohongshu.com/user/profile/demo",
            },
            {
              id: "acc_demo_002",
              brandId: "br_demo_001",
              platform: "WECHAT_OA",
              accountName: "武汉仟吉",
              accountLink: "qianji-official",
            },
          ],
          competitorAccounts: [
            {
              id: "cmp_demo_001",
              brandId: "br_demo_001",
              platform: "XIAOHONGSHU",
              accountName: "区域烘焙竞品A",
              accountLink: "https://www.xiaohongshu.com/user/profile/comp-a",
            },
          ],
          surveyAnswers: [
            {
              id: "sur_demo_001",
              brandId: "br_demo_001",
              key: "businessProcess",
              label: "业务流程",
              value: "当前以线下门店为主，线上私域承接与公域导流链路尚未完全打通。",
            },
            {
              id: "sur_demo_002",
              brandId: "br_demo_001",
              key: "customerProfile",
              label: "客户画像",
              value: "核心为城市家庭消费者、年轻白领、节庆礼赠人群，复购需求存在但精细化运营不足。",
            },
            {
              id: "sur_demo_003",
              brandId: "br_demo_001",
              key: "channelStatus",
              label: "线上营销渠道",
              value: "公众号与门店活动较稳定，小红书等种草渠道内容供给不足。",
            },
            {
              id: "sur_demo_004",
              brandId: "br_demo_001",
              key: "painPoints",
              label: "商家痛点",
              value: "线上流量获取成本上升，会员沉淀与二次转化效率偏低。",
            },
            {
              id: "sur_demo_005",
              brandId: "br_demo_001",
              key: "shortTermNeeds",
              label: "短期需求",
              value: "尽快形成可复制的内容种草、会员拉新、门店转化三位一体增长方案。",
            },
            {
              id: "sur_demo_006",
              brandId: "br_demo_001",
              key: "longTermNeeds",
              label: "长期需求",
              value: "沉淀全域品牌资产、数据资产与自动化运营能力，降低人工依赖。",
            },
          ],
          assets: [
            {
              id: "ast_demo_001",
              brandId: "br_demo_001",
              category: "INDUSTRY_REPORT",
              title: "烘焙品类市场分析",
              description: "包含品类规模、价格分布、场景需求与用户偏好。",
              sourceName: "蝉妈妈 AI 市场调研",
              fileUrl: "https://oss.example.com/industry/bakery-report.pdf",
            },
            {
              id: "ast_demo_002",
              brandId: "br_demo_001",
              category: "BUSINESS_DATA",
              title: "有赞商城季度经营明细",
              description: "用于分析订单结构、复购率、客单价与渠道转化差异。",
              sourceName: "有赞导出报表",
              fileUrl: "https://oss.example.com/business/youzan-q1.xlsx",
            },
          ],
          tasks: [
            {
              id: "tsk_demo_001",
              userId: "usr_demo_001",
              brandId: "br_demo_001",
              taskType: "BRAND_GROWTH_REPORT",
              taskTitle: "生成品牌增长报告",
              taskStatus: "SUCCESS",
              modelName: "gpt-5.5",
              pointsCost: 320,
              createdAt: "2026-05-01T09:20:00.000Z",
              updatedAt: "2026-05-01T09:25:00.000Z",
            },
            {
              id: "tsk_demo_002",
              userId: "usr_demo_001",
              brandId: "br_demo_001",
              taskType: "XHS_MARKETING_PLAN",
              taskTitle: "生成小红书营销策划方案",
              taskStatus: "RUNNING",
              modelName: "gpt-5.5",
              pointsCost: 260,
              createdAt: "2026-05-02T02:00:00.000Z",
              updatedAt: "2026-05-02T02:03:00.000Z",
            },
          ],
          media: [
            {
              id: "med_demo_001",
              userId: "usr_demo_001",
              brandId: "br_demo_001",
              title: "品牌增长可视化报告",
              mediaType: "HTML",
              storageKey: "reports/br_demo_001/growth-report.html",
              sourceUrl: "https://oss.example.com/reports/br_demo_001/growth-report.html",
              createdAt: "2026-05-01T10:00:00.000Z",
            },
            {
              id: "med_demo_002",
              userId: "usr_demo_001",
              brandId: "br_demo_001",
              title: "爆浆提拉米苏封面图",
              mediaType: "IMAGE",
              storageKey: "works/br_demo_001/post-cover-001.png",
              sourceUrl: "https://oss.example.com/works/br_demo_001/post-cover-001.png",
              createdAt: "2026-05-02T03:10:00.000Z",
            },
          ],
        };

        export function createId(prefix: string): string {
          const random = Math.random().toString(36).slice(2, 10);
          return `${prefix}_${random}`;
        }
        """
    ),
    "apps/server/src/modules/brands/brands.controller.ts": dedent(
        """\
        import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
        import {
          BrandsService,
          type CreateAssetPayload,
          type CreateBrandPayload,
          type CreateProductPayload,
          type ReplaceAccountsPayload,
          type UpdateBackgroundPayload,
          type UpdateProductPayload,
          type UpsertSurveyPayload,
        } from "./brands.service";

        @Controller("brands")
        export class BrandsController {
          constructor(private readonly brandsService: BrandsService) {}

          @Get("overview")
          overview() {
            return this.brandsService.getOverview();
          }

          @Get(":id")
          detail(@Param("id") id: string) {
            return this.brandsService.getBrandDetail(id);
          }

          @Get(":id/archive")
          archive(@Param("id") id: string) {
            return this.brandsService.getArchive(id);
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
        }
        """
    ),
    "apps/server/src/modules/brands/brands.service.ts": dedent(
        """\
        import { Injectable, NotFoundException } from "@nestjs/common";
        import { createId, database } from "../../common/mock-data";

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
          usageScenario?: string;
        };

        export type UpdateProductPayload = CreateProductPayload;

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

        @Injectable()
        export class BrandsService {
          getOverview() {
            const currentBrand = database.brands[0];
            const relatedProducts = database.products.filter((item) => item.brandId === currentBrand.id);
            const relatedAccounts = database.platformAccounts.filter((item) => item.brandId === currentBrand.id);
            const relatedTasks = database.tasks.filter((item) => item.brandId === currentBrand.id);
            const relatedMedia = database.media.filter((item) => item.brandId === currentBrand.id);

            return {
              currentBrand,
              summaryCards: [
                { label: "品牌档案数", value: database.brands.length, tone: "primary" },
                { label: "产品资料数", value: relatedProducts.length, tone: "violet" },
                { label: "平台账号数", value: relatedAccounts.length, tone: "green" },
                { label: "任务总数", value: relatedTasks.length, tone: "orange" },
                { label: "媒体资产数", value: relatedMedia.length, tone: "blue" },
              ],
              archiveSteps: this.buildSteps(currentBrand.id),
            };
          }

          getBrandDetail(id: string) {
            return this.getArchive(id);
          }

          getArchive(id: string) {
            const brand = this.getBrand(id);

            return {
              brand,
              products: database.products.filter((item) => item.brandId === id),
              survey: database.surveyAnswers.filter((item) => item.brandId === id),
              platformAccounts: database.platformAccounts.filter((item) => item.brandId === id),
              competitorAccounts: database.competitorAccounts.filter((item) => item.brandId === id),
              industryFeeds: database.assets.filter(
                (item) => item.brandId === id && item.category === "INDUSTRY_REPORT",
              ),
              businessAssets: database.assets.filter(
                (item) => item.brandId === id && item.category === "BUSINESS_DATA",
              ),
              steps: this.buildSteps(id),
              recentTasks: database.tasks.filter((item) => item.brandId === id).slice(0, 5),
              recentMedia: database.media.filter((item) => item.brandId === id).slice(0, 5),
            };
          }

          createBrand(payload: CreateBrandPayload) {
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

          updateBackground(id: string, payload: UpdateBackgroundPayload) {
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

          createProduct(id: string, payload: CreateProductPayload) {
            this.getBrand(id);

            const product = {
              id: createId("prd"),
              brandId: id,
              productName: payload.productName,
              productType: payload.productType ?? "待补充",
              price: payload.price ?? 0,
              usageScenario: payload.usageScenario ?? "",
            };

            database.products.unshift(product);
            return product;
          }

          updateProduct(id: string, productId: string, payload: UpdateProductPayload) {
            this.getBrand(id);
            const product = database.products.find((item) => item.id === productId && item.brandId === id);

            if (!product) {
              throw new NotFoundException("产品不存在");
            }

            Object.assign(product, {
              productName: payload.productName ?? product.productName,
              productType: payload.productType ?? product.productType,
              price: payload.price ?? product.price,
              usageScenario: payload.usageScenario ?? product.usageScenario,
            });

            return product;
          }

          deleteProduct(id: string, productId: string) {
            this.getBrand(id);
            const index = database.products.findIndex((item) => item.id === productId && item.brandId === id);

            if (index < 0) {
              throw new NotFoundException("产品不存在");
            }

            const [removed] = database.products.splice(index, 1);
            return removed;
          }

          upsertSurvey(id: string, payload: UpsertSurveyPayload) {
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

          replacePlatformAccounts(id: string, payload: ReplaceAccountsPayload) {
            return this.replaceAccounts("platformAccounts", id, payload.accounts);
          }

          replaceCompetitorAccounts(id: string, payload: ReplaceAccountsPayload) {
            return this.replaceAccounts("competitorAccounts", id, payload.accounts);
          }

          replaceIndustryFeeds(id: string, payload: CreateAssetPayload) {
            return this.replaceAssets(id, "INDUSTRY_REPORT", payload.items);
          }

          replaceBusinessAssets(id: string, payload: CreateAssetPayload) {
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
              (item) => !(item.brandId === brandId and item.category === category)
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

          private buildSteps(brandId: string) {
            const products = database.products.filter((item) => item.brandId === brandId);
            const survey = database.surveyAnswers.filter((item) => item.brandId === brandId);
            const platformAccounts = database.platformAccounts.filter((item) => item.brandId === brandId);
            const competitorAccounts = database.competitorAccounts.filter((item) => item.brandId === brandId);
            const industryFeeds = database.assets.filter(
              (item) => item.brandId === brandId && item.category === "INDUSTRY_REPORT",
            );
            const businessAssets = database.assets.filter(
              (item) => item.brandId === brandId && item.category === "BUSINESS_DATA",
            );

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
                key: "platformAccounts",
                name: "品牌平台账号",
                status: platformAccounts.length > 0 ? "ready" : "pending",
                description: "品牌自有账号入口，驱动后续自动采集。",
              },
              {
                key: "competitorAccounts",
                name: "竞品平台账号",
                status: competitorAccounts.length > 0 ? "ready" : "pending",
                description: "竞品账号入口，为对标分析和素材库打底。",
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

          private getBrand(id: string) {
            const brand = database.brands.find((item) => item.id === id);
            if (!brand) {
              throw new NotFoundException("品牌不存在");
            }

            return brand;
          }
        }
        """
    ).replace(" and ", " && "),
    "apps/web/src/services/http.ts": dedent(
        """\
        export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

        export async function request<T>(path: string, init?: RequestInit): Promise<T> {
          const response = await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            headers: {
              "Content-Type": "application/json",
              ...(init?.headers || {}),
            },
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
          }

          return response.json() as Promise<T>;
        }

        export function jsonRequest<T>(path: string, method: string, body: unknown) {
          return request<T>(path, {
            method,
            body: JSON.stringify(body),
          });
        }
        """
    ),
    "apps/web/src/services/brand-growth.ts": dedent(
        """\
        import { request, jsonRequest } from "./http";

        export type PlatformType = "XIAOHONGSHU" | "DOUYIN" | "VIDEO_CHANNEL" | "WECHAT_OA";
        export type BrandArchiveStepKey =
          | "background"
          | "products"
          | "survey"
          | "platformAccounts"
          | "competitorAccounts"
          | "industryFeeds"
          | "businessAssets";
        export type BrandArchiveStatus = "ready" | "in_progress" | "pending";

        export type BrandBackground = {
          id: string;
          brandName: string;
          industry: string;
          storeCount: number;
          foundedYear: number;
          brandDescription: string;
          enterpriseIntro: string;
        };

        export type BrandProduct = {
          id: string;
          productName: string;
          productType: string;
          price: number;
          usageScenario: string;
        };

        export type BrandSurveyAnswer = {
          id?: string;
          key: string;
          label: string;
          value: string;
        };

        export type BrandAccount = {
          id?: string;
          platform: PlatformType;
          accountName: string;
          accountLink: string;
        };

        export type BrandAsset = {
          id?: string;
          title: string;
          description: string;
          sourceName?: string;
          fileUrl?: string;
        };

        export type BrandArchiveBundle = {
          brand: BrandBackground;
          products: BrandProduct[];
          survey: BrandSurveyAnswer[];
          platformAccounts: BrandAccount[];
          competitorAccounts: BrandAccount[];
          industryFeeds: BrandAsset[];
          businessAssets: BrandAsset[];
          steps: Array<{
            key: BrandArchiveStepKey;
            name: string;
            status: BrandArchiveStatus;
            description: string;
          }>;
        };

        export const DEMO_BRAND_ID = "br_demo_001";

        export const brandArchiveSeed: BrandArchiveBundle = {
          brand: {
            id: DEMO_BRAND_ID,
            brandName: "武汉仟吉",
            industry: "烘焙零售",
            storeCount: 180,
            foundedYear: 2000,
            brandDescription: "区域烘焙品牌，线下门店基础较强，线上全域增长空间明显。",
            enterpriseIntro: "当前聚焦品牌建档、采集、增长分析与年度营销规划。",
          },
          products: [
            {
              id: "prd_demo_001",
              productName: "爆浆提拉米苏蛋糕",
              productType: "节日蛋糕",
              price: 198,
              usageScenario: "生日庆祝与节日礼赠",
            },
            {
              id: "prd_demo_002",
              productName: "现烤牛角包",
              productType: "门店畅销",
              price: 12,
              usageScenario: "早餐与下午茶",
            },
          ],
          survey: [
            {
              key: "businessProcess",
              label: "业务流程",
              value: "当前以线下门店为主，线上私域承接与公域导流链路尚未完全打通。",
            },
            {
              key: "customerProfile",
              label: "客户画像",
              value: "核心为城市家庭消费者、年轻白领、节庆礼赠人群，复购需求存在但精细化运营不足。",
            },
            {
              key: "channelStatus",
              label: "线上营销渠道",
              value: "公众号与门店活动较稳定，小红书等种草渠道内容供给不足。",
            },
            {
              key: "painPoints",
              label: "商家痛点",
              value: "线上流量获取成本上升，会员沉淀与二次转化效率偏低。",
            },
            {
              key: "shortTermNeeds",
              label: "短期需求",
              value: "尽快形成可复制的内容种草、会员拉新、门店转化三位一体增长方案。",
            },
            {
              key: "longTermNeeds",
              label: "长期需求",
              value: "沉淀全域品牌资产、数据资产与自动化运营能力，降低人工依赖。",
            },
          ],
          platformAccounts: [
            {
              id: "acc_demo_001",
              platform: "XIAOHONGSHU",
              accountName: "武汉仟吉烘焙",
              accountLink: "https://www.xiaohongshu.com/user/profile/demo",
            },
            {
              id: "acc_demo_002",
              platform: "WECHAT_OA",
              accountName: "武汉仟吉",
              accountLink: "qianji-official",
            },
          ],
          competitorAccounts: [
            {
              id: "cmp_demo_001",
              platform: "XIAOHONGSHU",
              accountName: "区域烘焙竞品A",
              accountLink: "https://www.xiaohongshu.com/user/profile/comp-a",
            },
          ],
          industryFeeds: [
            {
              id: "ast_demo_001",
              title: "烘焙品类市场分析",
              description: "包含品类规模、价格分布、场景需求与用户偏好。",
              sourceName: "蝉妈妈 AI 市场调研",
              fileUrl: "https://oss.example.com/industry/bakery-report.pdf",
            },
          ],
          businessAssets: [
            {
              id: "ast_demo_002",
              title: "有赞商城季度经营明细",
              description: "用于分析订单结构、复购率、客单价与渠道转化差异。",
              sourceName: "有赞导出报表",
              fileUrl: "https://oss.example.com/business/youzan-q1.xlsx",
            },
          ],
          steps: [
            { key: "background", name: "品牌背景资料", status: "ready", description: "品牌名称、行业、门店数量与品牌介绍。" },
            { key: "products", name: "产品资料库", status: "ready", description: "一行一个产品，沉淀价格、定位和使用场景。" },
            { key: "survey", name: "品牌运营情况调研", status: "in_progress", description: "围绕人货场资制度与业务诊断做结构化填写。" },
            { key: "platformAccounts", name: "品牌平台账号", status: "ready", description: "品牌自有账号，用于自动采集。" },
            { key: "competitorAccounts", name: "竞品平台账号", status: "ready", description: "竞品账号，用于对标分析和素材来源。" },
            { key: "industryFeeds", name: "第三方数据投喂", status: "ready", description: "行业报告、市场分析等外部输入。" },
            { key: "businessAssets", name: "企业经营数据投喂", status: "ready", description: "有赞、抖店等经营明细与报表。" },
          ],
        };

        export async function getBrandArchive(brandId: string) {
          return request<BrandArchiveBundle>(`/brands/${brandId}/archive`);
        }

        export async function updateBrandBackground(brandId: string, payload: Partial<BrandBackground>) {
          return jsonRequest<BrandBackground>(`/brands/${brandId}/background`, "PATCH", payload);
        }

        export async function createBrandProduct(
          brandId: string,
          payload: Omit<BrandProduct, "id">,
        ) {
          return jsonRequest<BrandProduct>(`/brands/${brandId}/products`, "POST", payload);
        }

        export async function replaceBrandSurvey(brandId: string, answers: BrandSurveyAnswer[]) {
          return jsonRequest<BrandSurveyAnswer[]>(`/brands/${brandId}/survey`, "PATCH", { answers });
        }

        export async function replaceBrandAccounts(
          brandId: string,
          route: "platform-accounts" | "competitor-accounts",
          accounts: BrandAccount[],
        ) {
          return jsonRequest<BrandAccount[]>(`/brands/${brandId}/${route}`, "PATCH", { accounts });
        }

        export async function replaceBrandAssets(
          brandId: string,
          route: "industry-feeds" | "business-assets",
          items: BrandAsset[],
        ) {
          return jsonRequest<BrandAsset[]>(`/brands/${brandId}/${route}`, "PATCH", { items });
        }
        """
    ),
    "apps/web/src/app/(dashboard)/brand-growth/page.tsx": dedent(
        """\
        import { BrandGrowthWorkspace } from "./workspace";

        export default function BrandGrowthPage() {
          return <BrandGrowthWorkspace />;
        }
        """
    ),
    "apps/web/src/app/(dashboard)/brand-growth/workspace.tsx": dedent(
        """\
        "use client";

        import { useMemo, useState } from "react";
        import {
          brandArchiveSeed,
          DEMO_BRAND_ID,
          type BrandAccount,
          type BrandArchiveBundle,
          type BrandArchiveStepKey,
          type BrandAsset,
          type BrandBackground,
          type BrandProduct,
          type BrandSurveyAnswer,
        } from "../../../services/brand-growth";

        const stepOrder: BrandArchiveStepKey[] = [
          "background",
          "products",
          "survey",
          "platformAccounts",
          "competitorAccounts",
          "industryFeeds",
          "businessAssets",
        ];

        const platformOptions: Array<{ label: string; value: BrandAccount["platform"] }> = [
          { label: "小红书", value: "XIAOHONGSHU" },
          { label: "抖音", value: "DOUYIN" },
          { label: "视频号", value: "VIDEO_CHANNEL" },
          { label: "公众号", value: "WECHAT_OA" },
        ];

        function statusText(status: BrandArchiveBundle["steps"][number]["status"]) {
          if (status === "ready") return "已完成";
          if (status === "in_progress") return "进行中";
          return "待开始";
        }

        function cloneSeed(): BrandArchiveBundle {
          return JSON.parse(JSON.stringify(brandArchiveSeed)) as BrandArchiveBundle;
        }

        function emptyProduct(): BrandProduct {
          return {
            id: `prd_local_${Math.random().toString(36).slice(2, 9)}`,
            productName: "",
            productType: "",
            price: 0,
            usageScenario: "",
          };
        }

        function emptyAccount(): BrandAccount {
          return {
            id: `acc_local_${Math.random().toString(36).slice(2, 9)}`,
            platform: "XIAOHONGSHU",
            accountName: "",
            accountLink: "",
          };
        }

        function emptyAsset(): BrandAsset {
          return {
            id: `ast_local_${Math.random().toString(36).slice(2, 9)}`,
            title: "",
            description: "",
            sourceName: "",
            fileUrl: "",
          };
        }

        function getCompletion(bundle: BrandArchiveBundle) {
          const done = bundle.steps.filter((step) => step.status === "ready").length;
          return {
            done,
            total: bundle.steps.length,
            percentage: Math.round((done / bundle.steps.length) * 100),
          };
        }

        export function BrandGrowthWorkspace() {
          const [archive, setArchive] = useState<BrandArchiveBundle>(cloneSeed);
          const [activeStep, setActiveStep] = useState<BrandArchiveStepKey>("background");
          const completion = useMemo(() => getCompletion(archive), [archive]);

          function updateBackground<K extends keyof BrandBackground>(key: K, value: BrandBackground[K]) {
            setArchive((current) => ({
              ...current,
              brand: { ...current.brand, [key]: value },
            }));
          }

          function updateProduct(index: number, key: keyof BrandProduct, value: string | number) {
            setArchive((current) => {
              const next = [...current.products];
              next[index] = { ...next[index], [key]: value };
              return { ...current, products: next };
            });
          }

          function updateSurvey(index: number, value: string) {
            setArchive((current) => {
              const next = [...current.survey];
              next[index] = { ...next[index], value };
              return { ...current, survey: next };
            });
          }

          function updateAccount(
            target: "platformAccounts" | "competitorAccounts",
            index: number,
            key: keyof BrandAccount,
            value: string,
          ) {
            setArchive((current) => {
              const next = [...current[target]];
              next[index] = { ...next[index], [key]: value };
              return { ...current, [target]: next };
            });
          }

          function updateAsset(
            target: "industryFeeds" | "businessAssets",
            index: number,
            key: keyof BrandAsset,
            value: string,
          ) {
            setArchive((current) => {
              const next = [...current[target]];
              next[index] = { ...next[index], [key]: value };
              return { ...current, [target]: next };
            });
          }

          return (
            <main className="archive-shell">
              <section className="archive-header">
                <div>
                  <span className="hero-badge">品牌增长策略工作台</span>
                  <h1>品牌建档 7 步工作台</h1>
                  <p>
                    当前使用演示品牌 `武汉仟吉` 作为第一批建档样例。下一步将把这一页与真实后端接口和 Prisma 持久化正式接通。
                  </p>
                </div>
                <div className="archive-progress-card">
                  <strong>{archive.brand.brandName}</strong>
                  <span>{archive.brand.industry}</span>
                  <div className="progress-bar">
                    <div style={{ width: `${completion.percentage}%` }} />
                  </div>
                  <p>
                    建档进度 {completion.done} / {completion.total}，完成率 {completion.percentage}%
                  </p>
                  <small>当前演示品牌 ID：{DEMO_BRAND_ID}</small>
                </div>
              </section>

              <section className="archive-metrics">
                <article className="metric-card">
                  <span>门店数量</span>
                  <strong>{archive.brand.storeCount}</strong>
                  <p>用于增长规划和区域运营规模判断</p>
                </article>
                <article className="metric-card">
                  <span>产品条数</span>
                  <strong>{archive.products.length}</strong>
                  <p>为内容策略、商品结构和引流转化提供基础</p>
                </article>
                <article className="metric-card">
                  <span>品牌账号数</span>
                  <strong>{archive.platformAccounts.length}</strong>
                  <p>采集任务将在这些入口基础上自动发起</p>
                </article>
                <article className="metric-card">
                  <span>外部资料数</span>
                  <strong>{archive.industryFeeds.length + archive.businessAssets.length}</strong>
                  <p>后续用于品牌增长报告和全年营销规划生成</p>
                </article>
              </section>

              <section className="archive-layout">
                <aside className="archive-sidebar">
                  {archive.steps.map((step, index) => (
                    <button
                      type="button"
                      key={step.key}
                      className={`archive-step-card ${activeStep === step.key ? "is-active" : ""}`}
                      onClick={() => setActiveStep(step.key)}
                    >
                      <div className="archive-step-top">
                        <span className="archive-step-index">{index + 1}</span>
                        <span className={`archive-pill status-${step.status}`}>{statusText(step.status)}</span>
                      </div>
                      <strong>{step.name}</strong>
                      <p>{step.description}</p>
                    </button>
                  ))}
                </aside>

                <section className="archive-main">
                  {activeStep === "background" && (
                    <article className="workspace-panel">
                      <div className="panel-header">
                        <h2>品牌背景资料</h2>
                        <span>Background</span>
                      </div>
                      <div className="form-grid two-column">
                        <label className="field">
                          <span>品牌名称</span>
                          <input value={archive.brand.brandName} onChange={(e) => updateBackground("brandName", e.target.value)} />
                        </label>
                        <label className="field">
                          <span>行业</span>
                          <input value={archive.brand.industry} onChange={(e) => updateBackground("industry", e.target.value)} />
                        </label>
                        <label className="field">
                          <span>门店数量</span>
                          <input
                            type="number"
                            value={archive.brand.storeCount}
                            onChange={(e) => updateBackground("storeCount", Number(e.target.value))}
                          />
                        </label>
                        <label className="field">
                          <span>品牌成立时间</span>
                          <input
                            type="number"
                            value={archive.brand.foundedYear}
                            onChange={(e) => updateBackground("foundedYear", Number(e.target.value))}
                          />
                        </label>
                        <label className="field field-full">
                          <span>品牌介绍</span>
                          <textarea value={archive.brand.brandDescription} onChange={(e) => updateBackground("brandDescription", e.target.value)} />
                        </label>
                        <label className="field field-full">
                          <span>企业介绍</span>
                          <textarea value={archive.brand.enterpriseIntro} onChange={(e) => updateBackground("enterpriseIntro", e.target.value)} />
                        </label>
                      </div>
                    </article>
                  )}

                  {activeStep === "products" && (
                    <article className="workspace-panel">
                      <div className="panel-header">
                        <h2>产品资料库</h2>
                        <span>Products</span>
                      </div>
                      <div className="workspace-toolbar">
                        <p>一行一个产品，后续会直接驱动原创笔记、二创笔记和营销策划方案。</p>
                        <button type="button" className="primary-button" onClick={() => setArchive((current) => ({ ...current, products: [...current.products, emptyProduct()] }))}>
                          添加产品
                        </button>
                      </div>
                      <div className="entity-list">
                        {archive.products.map((product, index) => (
                          <div className="entity-card" key={product.id}>
                            <div className="form-grid two-column">
                              <label className="field">
                                <span>产品名称</span>
                                <input value={product.productName} onChange={(e) => updateProduct(index, "productName", e.target.value)} />
                              </label>
                              <label className="field">
                                <span>产品类型</span>
                                <input value={product.productType} onChange={(e) => updateProduct(index, "productType", e.target.value)} />
                              </label>
                              <label className="field">
                                <span>价格</span>
                                <input type="number" value={product.price} onChange={(e) => updateProduct(index, "price", Number(e.target.value))} />
                              </label>
                              <label className="field">
                                <span>使用场景</span>
                                <input value={product.usageScenario} onChange={(e) => updateProduct(index, "usageScenario", e.target.value)} />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  )}

                  {activeStep === "survey" && (
                    <article className="workspace-panel">
                      <div className="panel-header">
                        <h2>品牌运营情况调研</h2>
                        <span>Survey</span>
                      </div>
                      <div className="entity-list">
                        {archive.survey.map((item, index) => (
                          <label className="field" key={item.key}>
                            <span>{item.label}</span>
                            <textarea value={item.value} onChange={(e) => updateSurvey(index, e.target.value)} />
                          </label>
                        ))}
                      </div>
                    </article>
                  )}

                  {(activeStep === "platformAccounts" || activeStep === "competitorAccounts") && (
                    <article className="workspace-panel">
                      <div className="panel-header">
                        <h2>{activeStep === "platformAccounts" ? "品牌平台账号" : "竞品平台账号"}</h2>
                        <span>{activeStep === "platformAccounts" ? "Owned Accounts" : "Competitors"}</span>
                      </div>
                      <div className="workspace-toolbar">
                        <p>后续这里会直接驱动小红书、抖音、视频号等平台的自动采集任务。</p>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            setArchive((current) => ({
                              ...current,
                              [activeStep]: [...current[activeStep], emptyAccount()],
                            }))
                          }
                        >
                          添加账号
                        </button>
                      </div>
                      <div className="entity-list">
                        {archive[activeStep].map((account, index) => (
                          <div className="entity-card" key={account.id ?? `${activeStep}-${index}`}>
                            <div className="form-grid two-column">
                              <label className="field">
                                <span>平台</span>
                                <select
                                  value={account.platform}
                                  onChange={(e) => updateAccount(activeStep, index, "platform", e.target.value)}
                                >
                                  {platformOptions.map((option) => (
                                    <option value={option.value} key={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="field">
                                <span>账号名称</span>
                                <input
                                  value={account.accountName}
                                  onChange={(e) => updateAccount(activeStep, index, "accountName", e.target.value)}
                                />
                              </label>
                              <label className="field field-full">
                                <span>链接 / 用户名</span>
                                <input
                                  value={account.accountLink}
                                  onChange={(e) => updateAccount(activeStep, index, "accountLink", e.target.value)}
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  )}

                  {(activeStep === "industryFeeds" || activeStep === "businessAssets") && (
                    <article className="workspace-panel">
                      <div className="panel-header">
                        <h2>{activeStep === "industryFeeds" ? "第三方数据投喂" : "企业经营数据投喂"}</h2>
                        <span>{activeStep === "industryFeeds" ? "Industry Inputs" : "Business Inputs"}</span>
                      </div>
                      <div className="workspace-toolbar">
                        <p>
                          {activeStep === "industryFeeds"
                            ? "这里承接行业报告、市场规模、价格结构和用户评论洞察等输入。"
                            : "这里承接有赞、抖店、经营明细、利润结构和业务系统报表等输入。"}
                        </p>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            setArchive((current) => ({
                              ...current,
                              [activeStep]: [...current[activeStep], emptyAsset()],
                            }))
                          }
                        >
                          添加资料
                        </button>
                      </div>
                      <div className="entity-list">
                        {archive[activeStep].map((asset, index) => (
                          <div className="entity-card" key={asset.id ?? `${activeStep}-${index}`}>
                            <div className="form-grid two-column">
                              <label className="field">
                                <span>资料标题</span>
                                <input value={asset.title} onChange={(e) => updateAsset(activeStep, index, "title", e.target.value)} />
                              </label>
                              <label className="field">
                                <span>来源名称</span>
                                <input value={asset.sourceName ?? ""} onChange={(e) => updateAsset(activeStep, index, "sourceName", e.target.value)} />
                              </label>
                              <label className="field field-full">
                                <span>资料说明</span>
                                <textarea value={asset.description} onChange={(e) => updateAsset(activeStep, index, "description", e.target.value)} />
                              </label>
                              <label className="field field-full">
                                <span>文件地址</span>
                                <input value={asset.fileUrl ?? ""} onChange={(e) => updateAsset(activeStep, index, "fileUrl", e.target.value)} />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  )}
                </section>
              </section>
            </main>
          );
        }
        """
    ),
    "apps/web/src/styles/globals.css": dedent(
        """\
        :root {
          color-scheme: light;
          --bg: #f5f7fb;
          --card: #ffffff;
          --text: #1f2a37;
          --muted: #5b6b82;
          --primary: #5b6dff;
          --border: #dde4f0;
          --shadow: 0 12px 40px rgba(48, 77, 140, 0.08);
          --success: #1f9d61;
          --warning: #c77d17;
          --pending: #7d8797;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: var(--bg);
          color: var(--text);
          font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .home-shell,
        .page-shell,
        .dashboard-shell,
        .archive-shell {
          min-height: 100vh;
          padding: 48px 24px;
        }

        .hero-card,
        .page-shell,
        .dashboard-hero,
        .panel,
        .archive-header,
        .archive-progress-card,
        .archive-step-card,
        .workspace-panel,
        .metric-card {
          background: var(--card);
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
        }

        .hero-card,
        .page-shell {
          max-width: 1120px;
          margin: 0 auto;
          border-radius: 24px;
          padding: 32px;
        }

        .hero-badge {
          display: inline-block;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(91, 109, 255, 0.1);
          color: var(--primary);
          font-size: 14px;
          font-weight: 700;
        }

        .hero-card h1,
        .page-shell h1,
        .dashboard-hero h1,
        .archive-header h1 {
          margin: 16px 0 12px;
          font-size: 36px;
          line-height: 1.25;
        }

        .hero-card p,
        .page-shell p,
        .dashboard-hero p,
        .panel p,
        .archive-header p,
        .workspace-panel p,
        .metric-card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.8;
          font-size: 16px;
        }

        .hero-links {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }

        .hero-links a,
        .primary-button {
          padding: 12px 18px;
          border-radius: 14px;
          background: var(--primary);
          color: #fff;
          font-weight: 700;
          border: none;
        }

        .dashboard-shell,
        .archive-shell {
          max-width: 1240px;
          margin: 0 auto;
        }

        .dashboard-hero,
        .archive-header {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
          gap: 20px;
          border-radius: 28px;
          padding: 32px;
        }

        .hero-side-card,
        .archive-progress-card {
          border-radius: 24px;
          padding: 24px;
          background: linear-gradient(180deg, rgba(91, 109, 255, 0.1), rgba(91, 109, 255, 0.04));
        }

        .hero-side-card h2,
        .panel h2,
        .workspace-panel h2 {
          margin: 0 0 12px;
          font-size: 22px;
        }

        .archive-progress-card strong {
          display: block;
          font-size: 28px;
        }

        .archive-progress-card span,
        .archive-progress-card small {
          display: block;
          color: var(--muted);
        }

        .progress-bar {
          margin: 16px 0 12px;
          height: 10px;
          border-radius: 999px;
          background: rgba(91, 109, 255, 0.14);
          overflow: hidden;
        }

        .progress-bar div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #5b6dff 0%, #7d8cff 100%);
        }

        .hero-side-card ul,
        .stack-card ul {
          margin: 0;
          padding-left: 18px;
          color: var(--muted);
          line-height: 1.8;
        }

        .card-grid,
        .panel-grid,
        .archive-metrics {
          display: grid;
          gap: 18px;
          margin-top: 18px;
        }

        .card-grid,
        .archive-metrics {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .panel-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .metric-card,
        .stack-card,
        .step-item,
        .entity-card {
          border: 1px solid var(--border);
          border-radius: 22px;
          background: #fff;
        }

        .metric-card {
          padding: 24px;
        }

        .metric-card span {
          display: block;
          color: var(--muted);
          font-size: 14px;
        }

        .metric-card strong {
          display: block;
          margin-top: 10px;
          font-size: 32px;
          line-height: 1.1;
        }

        .metric-card p {
          margin-top: 10px;
        }

        .panel,
        .workspace-panel {
          border-radius: 28px;
          padding: 28px;
        }

        .panel-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }

        .panel-header span {
          color: var(--muted);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .step-list,
        .stack-list,
        .entity-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .step-item {
          display: grid;
          grid-template-columns: 104px minmax(0, 1fr);
          gap: 16px;
          padding: 18px;
        }

        .step-item h3,
        .stack-card h3 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .step-status,
        .archive-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 32px;
          min-width: 72px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          padding: 0 12px;
          background: rgba(125, 135, 151, 0.12);
          color: var(--pending);
        }

        .status-已完成,
        .status-ready {
          background: rgba(31, 157, 97, 0.12);
          color: var(--success);
        }

        .status-进行中,
        .status-in_progress {
          background: rgba(199, 125, 23, 0.14);
          color: var(--warning);
        }

        .stack-card {
          padding: 20px;
        }

        .data-table {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 16px;
          background: #f8faff;
          border: 1px solid #e6ecf5;
          align-items: center;
        }

        .table-head {
          background: #eef3ff;
          font-weight: 700;
        }

        .archive-layout {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 18px;
          margin-top: 18px;
        }

        .archive-sidebar {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .archive-step-card {
          width: 100%;
          text-align: left;
          border-radius: 24px;
          padding: 20px;
          transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
        }

        .archive-step-card:hover,
        .archive-step-card.is-active {
          border-color: rgba(91, 109, 255, 0.45);
          transform: translateY(-1px);
          box-shadow: 0 16px 42px rgba(60, 88, 166, 0.12);
        }

        .archive-step-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .archive-step-index {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #eef3ff;
          color: var(--primary);
          font-weight: 700;
        }

        .archive-step-card strong {
          display: block;
          font-size: 18px;
          margin-bottom: 8px;
        }

        .archive-step-card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.7;
        }

        .workspace-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          align-items: center;
        }

        .entity-card {
          padding: 18px;
        }

        .form-grid {
          display: grid;
          gap: 16px;
        }

        .form-grid.two-column {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field span {
          font-size: 14px;
          font-weight: 700;
          color: #344054;
        }

        .field input,
        .field textarea,
        .field select {
          width: 100%;
          border: 1px solid #d8e1f1;
          border-radius: 14px;
          background: #fbfcff;
          padding: 12px 14px;
          color: var(--text);
        }

        .field textarea {
          min-height: 120px;
          resize: vertical;
        }

        .field-full {
          grid-column: 1 / -1;
        }

        @media (max-width: 1080px) {
          .archive-layout,
          .card-grid,
          .panel-grid,
          .archive-metrics,
          .dashboard-hero,
          .archive-header {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .home-shell,
          .page-shell,
          .dashboard-shell,
          .archive-shell {
            padding: 24px 16px;
          }

          .hero-card,
          .page-shell,
          .dashboard-hero,
          .panel,
          .archive-header,
          .workspace-panel {
            padding: 20px;
            border-radius: 20px;
          }

          .hero-card h1,
          .page-shell h1,
          .dashboard-hero h1,
          .archive-header h1 {
            font-size: 28px;
          }

          .step-item,
          .table-row,
          .form-grid.two-column {
            grid-template-columns: 1fr;
          }

          .workspace-toolbar {
            flex-direction: column;
            align-items: flex-start;
          }
        }
        """
    ),
}


def main() -> None:
    for relative_path, content in FILES.items():
        path = ROOT / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    print(f"updated_files={len(FILES)}")


if __name__ == "__main__":
    main()
