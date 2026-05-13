from pathlib import Path
from textwrap import dedent


ROOT = Path(__file__).resolve().parents[1]


FILES: dict[str, str] = {
    "prisma/schema.prisma": dedent(
        """\
        generator client {
          provider = "prisma-client-js"
        }

        datasource db {
          provider = "postgresql"
          url      = env("DATABASE_URL")
        }

        enum UserStatus {
          ACTIVE
          DISABLED
        }

        enum MembershipLevel {
          FREE
          BASIC
          PRO
          ENTERPRISE
        }

        enum OrderStatus {
          PENDING
          PAID
          FAILED
          REFUNDED
          CANCELLED
        }

        enum TaskStatus {
          PENDING
          QUEUED
          RUNNING
          SUCCESS
          FAILED
          CANCELLED
        }

        enum PlatformType {
          XIAOHONGSHU
          DOUYIN
          VIDEO_CHANNEL
          WECHAT_OA
        }

        enum MediaType {
          IMAGE
          VIDEO
          DOCUMENT
          HTML
          ARCHIVE
        }

        enum AssetCategory {
          INDUSTRY_REPORT
          BUSINESS_DATA
          PLATFORM_EXPORT
          GENERATED_REPORT
          GENERATED_CONTENT
          KNOWLEDGE_FILE
        }

        model User {
          id             String             @id @default(cuid())
          mobile         String             @unique
          email          String?            @unique
          nickname       String?
          avatarUrl      String?
          passwordHash   String
          status         UserStatus         @default(ACTIVE)
          membership     MembershipLevel    @default(FREE)
          pointsBalance  Int                @default(0)
          createdAt      DateTime           @default(now())
          updatedAt      DateTime           @updatedAt

          brands         Brand[]
          tasks          Task[]
          mediaAssets    MediaAsset[]
          orders         MembershipOrder[]
          pointLedgers   PointLedger[]
        }

        model MembershipOrder {
          id            String          @id @default(cuid())
          userId        String
          orderNo       String          @unique
          orderType     String
          orderStatus   OrderStatus     @default(PENDING)
          membership    MembershipLevel?
          pointsAmount  Int?
          amountYuan    Decimal         @db.Decimal(10, 2)
          metaJson      Json?
          paidAt        DateTime?
          createdAt     DateTime        @default(now())
          updatedAt     DateTime        @updatedAt

          user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)

          @@index([userId, createdAt])
        }

        model PointLedger {
          id            String          @id @default(cuid())
          userId        String
          changeType    String
          pointsDelta   Int
          balanceAfter  Int
          description   String?
          relatedTaskId String?
          createdAt     DateTime        @default(now())

          user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)

          @@index([userId, createdAt])
        }

        model Brand {
          id                 String              @id @default(cuid())
          ownerUserId        String
          brandName          String
          industry           String?
          storeCount         Int?
          foundedYear        Int?
          brandDescription   String?
          enterpriseIntro    String?
          createdAt          DateTime            @default(now())
          updatedAt          DateTime            @updatedAt

          owner              User                @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
          products           Product[]
          surveys            BrandSurvey[]
          platformAccounts   PlatformAccount[]
          competitorAccounts CompetitorAccount[]
          industryReports    IndustryReport[]
          businessAssets     BusinessAsset[]
          tasks              Task[]
          mediaAssets        MediaAsset[]

          @@index([ownerUserId, createdAt])
        }

        model Product {
          id                   String    @id @default(cuid())
          brandId              String
          productName          String
          productType          String?
          price                Decimal?  @db.Decimal(10, 2)
          productPositioning   String?
          targetAudience       String?
          painPoint            String?
          usageScenario        String?
          differentiators      String?
          marketPosition       String?
          detailDescription    String?
          imageUrl             String?
          createdAt            DateTime  @default(now())
          updatedAt            DateTime  @updatedAt

          brand                Brand     @relation(fields: [brandId], references: [id], onDelete: Cascade)

          @@index([brandId, createdAt])
        }

        model BrandSurvey {
          id                  String    @id @default(cuid())
          brandId             String
          surveyType          String
          surveyJson          Json
          summary             String?
          createdAt           DateTime  @default(now())
          updatedAt           DateTime  @updatedAt

          brand               Brand     @relation(fields: [brandId], references: [id], onDelete: Cascade)

          @@index([brandId, surveyType])
        }

        model PlatformAccount {
          id                  String       @id @default(cuid())
          brandId             String
          platform            PlatformType
          accountName         String?
          accountLink         String
          username            String?
          isPrimary           Boolean      @default(true)
          lastCollectedAt     DateTime?
          createdAt           DateTime     @default(now())
          updatedAt           DateTime     @updatedAt

          brand               Brand        @relation(fields: [brandId], references: [id], onDelete: Cascade)

          @@index([brandId, platform])
        }

        model CompetitorAccount {
          id                  String       @id @default(cuid())
          brandId             String
          platform            PlatformType
          accountName         String?
          accountLink         String
          username            String?
          createdAt           DateTime     @default(now())
          updatedAt           DateTime     @updatedAt

          brand               Brand        @relation(fields: [brandId], references: [id], onDelete: Cascade)

          @@index([brandId, platform])
        }

        model IndustryReport {
          id                  String       @id @default(cuid())
          brandId             String
          title               String
          summary             String?
          fileUrl             String?
          sourceName          String?
          createdAt           DateTime     @default(now())
          updatedAt           DateTime     @updatedAt

          brand               Brand        @relation(fields: [brandId], references: [id], onDelete: Cascade)

          @@index([brandId, createdAt])
        }

        model BusinessAsset {
          id                  String         @id @default(cuid())
          brandId             String
          category            AssetCategory
          title               String
          description         String?
          fileUrl             String?
          metadataJson        Json?
          createdAt           DateTime       @default(now())
          updatedAt           DateTime       @updatedAt

          brand               Brand          @relation(fields: [brandId], references: [id], onDelete: Cascade)

          @@index([brandId, category, createdAt])
        }

        model Task {
          id                  String       @id @default(cuid())
          userId              String
          brandId             String?
          taskType            String
          taskStatus          TaskStatus   @default(PENDING)
          taskTitle           String?
          promptName          String?
          modelName           String?
          inputJson           Json?
          outputJson          Json?
          errorMessage        String?
          pointsCost          Int          @default(0)
          startedAt           DateTime?
          finishedAt          DateTime?
          createdAt           DateTime     @default(now())
          updatedAt           DateTime     @updatedAt

          user                User         @relation(fields: [userId], references: [id], onDelete: Cascade)
          brand               Brand?       @relation(fields: [brandId], references: [id], onDelete: SetNull)
          mediaAssets         MediaAsset[]

          @@index([userId, createdAt])
          @@index([brandId, createdAt])
          @@index([taskStatus, createdAt])
        }

        model MediaAsset {
          id                  String       @id @default(cuid())
          userId              String
          brandId             String?
          taskId              String?
          mediaType           MediaType
          title               String
          sourceUrl           String?
          storageKey          String?
          mimeType            String?
          fileSize            Int?
          width               Int?
          height              Int?
          durationSec         Int?
          metadataJson        Json?
          createdAt           DateTime     @default(now())
          updatedAt           DateTime     @updatedAt

          user                User         @relation(fields: [userId], references: [id], onDelete: Cascade)
          brand               Brand?       @relation(fields: [brandId], references: [id], onDelete: SetNull)
          task                Task?        @relation(fields: [taskId], references: [id], onDelete: SetNull)

          @@index([userId, createdAt])
          @@index([brandId, createdAt])
          @@index([taskId])
        }
        """
    ),
    "apps/server/package.json": dedent(
        """\
        {
          "name": "server",
          "version": "0.1.0",
          "private": true,
          "scripts": {
            "start:dev": "node --watch src/main.ts",
            "build": "tsc -p tsconfig.json",
            "start": "node dist/main.js",
            "lint": "tsc --noEmit -p tsconfig.json"
          },
          "dependencies": {
            "@nestjs/common": "10.4.8",
            "@nestjs/core": "10.4.8",
            "@nestjs/platform-express": "10.4.8",
            "reflect-metadata": "0.2.2",
            "rxjs": "7.8.1"
          },
          "devDependencies": {
            "@types/node": "22.10.1",
            "typescript": "5.6.3"
          }
        }
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

        export const database = {
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
          ] satisfies UserRecord[],
          brands: [
            {
              id: "br_demo_001",
              ownerUserId: "usr_demo_001",
              brandName: "武汉仟吉",
              industry: "烘焙零售",
              storeCount: 180,
              foundedYear: 2000,
              brandDescription: "区域烘焙品牌，线下门店基础较强，线上全域增长空间明显。",
              enterpriseIntro: "当前聚焦品牌建档、采集、增长分析与半年营销规划。",
            },
          ] satisfies BrandRecord[],
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
          ] satisfies ProductRecord[],
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
          ] satisfies PlatformAccountRecord[],
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
          ] satisfies TaskRecord[],
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
          ] satisfies MediaRecord[],
        };

        export function createId(prefix: string): string {
          const random = Math.random().toString(36).slice(2, 10);
          return `${prefix}_${random}`;
        }
        """
    ),
    "apps/server/src/prisma/prisma.module.ts": dedent(
        """\
        import { Global, Module } from "@nestjs/common";
        import { PrismaService } from "./prisma.service";

        @Global()
        @Module({
          providers: [PrismaService],
          exports: [PrismaService],
        })
        export class PrismaModule {}
        """
    ),
    "apps/server/src/prisma/prisma.service.ts": dedent(
        """\
        import { Injectable } from "@nestjs/common";

        @Injectable()
        export class PrismaService {
          getSchemaSummary() {
            return {
              status: "mock-ready",
              datasource: "postgresql",
              models: [
                "User",
                "MembershipOrder",
                "PointLedger",
                "Brand",
                "Product",
                "BrandSurvey",
                "PlatformAccount",
                "CompetitorAccount",
                "IndustryReport",
                "BusinessAsset",
                "Task",
                "MediaAsset",
              ],
            };
          }
        }
        """
    ),
    "apps/server/src/modules/auth/auth.module.ts": dedent(
        """\
        import { Module } from "@nestjs/common";
        import { AuthController } from "./auth.controller";
        import { AuthService } from "./auth.service";

        @Module({
          controllers: [AuthController],
          providers: [AuthService],
          exports: [AuthService],
        })
        export class AuthModule {}
        """
    ),
    "apps/server/src/modules/auth/auth.controller.ts": dedent(
        """\
        import { Body, Controller, Get, Post } from "@nestjs/common";
        import { AuthService, type LoginPayload, type RegisterPayload } from "./auth.service";

        @Controller("auth")
        export class AuthController {
          constructor(private readonly authService: AuthService) {}

          @Post("login")
          login(@Body() payload: LoginPayload) {
            return this.authService.login(payload);
          }

          @Post("register")
          register(@Body() payload: RegisterPayload) {
            return this.authService.register(payload);
          }

          @Get("profile")
          profile() {
            return this.authService.getProfile();
          }
        }
        """
    ),
    "apps/server/src/modules/auth/auth.service.ts": dedent(
        """\
        import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
        import { createId, database } from "../../common/mock-data";

        export type LoginPayload = {
          account: string;
          password: string;
        };

        export type RegisterPayload = {
          mobile: string;
          password: string;
          email?: string;
          nickname?: string;
        };

        @Injectable()
        export class AuthService {
          login(payload: LoginPayload) {
            const user = database.users.find(
              (item) =>
                item.mobile === payload.account ||
                item.email === payload.account ||
                item.nickname === payload.account,
            );

            if (!user || user.password !== payload.password) {
              throw new UnauthorizedException("账号或密码错误");
            }

            return {
              accessToken: `mock-token-${user.id}`,
              refreshToken: `mock-refresh-${user.id}`,
              user: this.toPublicUser(user),
            };
          }

          register(payload: RegisterPayload) {
            const exists = database.users.some(
              (item) => item.mobile === payload.mobile || item.email === payload.email,
            );

            if (exists) {
              throw new ConflictException("该手机号或邮箱已存在");
            }

            const user = {
              id: createId("usr"),
              mobile: payload.mobile,
              email: payload.email ?? "",
              nickname: payload.nickname ?? `用户${database.users.length + 1}`,
              password: payload.password,
              status: "ACTIVE" as const,
              membership: "FREE" as const,
              pointsBalance: 300,
            };

            database.users.unshift(user);

            return {
              accessToken: `mock-token-${user.id}`,
              refreshToken: `mock-refresh-${user.id}`,
              user: this.toPublicUser(user),
            };
          }

          getProfile() {
            return this.toPublicUser(database.users[0]);
          }

          private toPublicUser(user: (typeof database.users)[number]) {
            return {
              id: user.id,
              mobile: user.mobile,
              email: user.email,
              nickname: user.nickname,
              status: user.status,
              membership: user.membership,
              pointsBalance: user.pointsBalance,
            };
          }
        }
        """
    ),
    "apps/server/src/modules/brands/brands.module.ts": dedent(
        """\
        import { Module } from "@nestjs/common";
        import { BrandsController } from "./brands.controller";
        import { BrandsService } from "./brands.service";

        @Module({
          controllers: [BrandsController],
          providers: [BrandsService],
          exports: [BrandsService],
        })
        export class BrandsModule {}
        """
    ),
    "apps/server/src/modules/brands/brands.controller.ts": dedent(
        """\
        import { Body, Controller, Get, Param, Post } from "@nestjs/common";
        import { BrandsService, type CreateBrandPayload } from "./brands.service";

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

          @Post()
          create(@Body() payload: CreateBrandPayload) {
            return this.brandsService.createBrand(payload);
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
              archiveSteps: [
                { key: "background", name: "品牌背景资料", status: "ready" },
                { key: "products", name: "产品资料库", status: "ready" },
                { key: "survey", name: "品牌运营情况调研", status: "in_progress" },
                { key: "accounts", name: "品牌平台账号", status: "ready" },
                { key: "competitors", name: "竞品平台账号", status: "pending" },
                { key: "industry", name: "第三方数据投喂", status: "pending" },
                { key: "business", name: "企业经营数据投喂", status: "pending" },
              ],
            };
          }

          getBrandDetail(id: string) {
            const brand = database.brands.find((item) => item.id === id);
            if (!brand) {
              throw new NotFoundException("品牌不存在");
            }

            return {
              brand,
              products: database.products.filter((item) => item.brandId === id),
              platformAccounts: database.platformAccounts.filter((item) => item.brandId === id),
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
        }
        """
    ),
    "apps/server/src/modules/tasks/tasks.module.ts": dedent(
        """\
        import { Module } from "@nestjs/common";
        import { TasksController } from "./tasks.controller";
        import { TasksService } from "./tasks.service";

        @Module({
          controllers: [TasksController],
          providers: [TasksService],
          exports: [TasksService],
        })
        export class TasksModule {}
        """
    ),
    "apps/server/src/modules/tasks/tasks.controller.ts": dedent(
        """\
        import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
        import { TasksService, type CreateTaskPayload } from "./tasks.service";

        @Controller("tasks")
        export class TasksController {
          constructor(private readonly tasksService: TasksService) {}

          @Get()
          list() {
            return this.tasksService.listTasks();
          }

          @Post()
          create(@Body() payload: CreateTaskPayload) {
            return this.tasksService.createTask(payload);
          }

          @Patch(":id/retry")
          retry(@Param("id") id: string) {
            return this.tasksService.retryTask(id);
          }
        }
        """
    ),
    "apps/server/src/modules/tasks/tasks.service.ts": dedent(
        """\
        import { Injectable, NotFoundException } from "@nestjs/common";
        import { createId, database } from "../../common/mock-data";

        export type CreateTaskPayload = {
          userId?: string;
          brandId?: string;
          taskType: string;
          taskTitle: string;
          modelName?: string;
          pointsCost?: number;
        };

        @Injectable()
        export class TasksService {
          listTasks() {
            return [...database.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          }

          createTask(payload: CreateTaskPayload) {
            const now = new Date().toISOString();
            const task = {
              id: createId("tsk"),
              userId: payload.userId ?? database.users[0].id,
              brandId: payload.brandId,
              taskType: payload.taskType,
              taskTitle: payload.taskTitle,
              taskStatus: "QUEUED" as const,
              modelName: payload.modelName ?? "gpt-5.5",
              pointsCost: payload.pointsCost ?? 0,
              createdAt: now,
              updatedAt: now,
            };

            database.tasks.unshift(task);
            return task;
          }

          retryTask(id: string) {
            const task = database.tasks.find((item) => item.id === id);
            if (!task) {
              throw new NotFoundException("任务不存在");
            }

            task.taskStatus = "QUEUED";
            task.updatedAt = new Date().toISOString();
            return task;
          }
        }
        """
    ),
    "apps/server/src/modules/media/media.module.ts": dedent(
        """\
        import { Module } from "@nestjs/common";
        import { MediaController } from "./media.controller";
        import { MediaService } from "./media.service";

        @Module({
          controllers: [MediaController],
          providers: [MediaService],
          exports: [MediaService],
        })
        export class MediaModule {}
        """
    ),
    "apps/server/src/modules/media/media.controller.ts": dedent(
        """\
        import { Body, Controller, Get, Post } from "@nestjs/common";
        import { MediaService, type CreateMediaPayload } from "./media.service";

        @Controller("media")
        export class MediaController {
          constructor(private readonly mediaService: MediaService) {}

          @Get()
          list() {
            return this.mediaService.listMedia();
          }

          @Post()
          create(@Body() payload: CreateMediaPayload) {
            return this.mediaService.createMedia(payload);
          }
        }
        """
    ),
    "apps/server/src/modules/media/media.service.ts": dedent(
        """\
        import { Injectable } from "@nestjs/common";
        import { createId, database } from "../../common/mock-data";

        export type CreateMediaPayload = {
          userId?: string;
          brandId?: string;
          title: string;
          mediaType: "IMAGE" | "VIDEO" | "DOCUMENT" | "HTML";
          sourceUrl?: string;
          storageKey: string;
        };

        @Injectable()
        export class MediaService {
          listMedia() {
            return [...database.media].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          }

          createMedia(payload: CreateMediaPayload) {
            const media = {
              id: createId("med"),
              userId: payload.userId ?? database.users[0].id,
              brandId: payload.brandId,
              title: payload.title,
              mediaType: payload.mediaType,
              sourceUrl: payload.sourceUrl,
              storageKey: payload.storageKey,
              createdAt: new Date().toISOString(),
            };

            database.media.unshift(media);
            return media;
          }
        }
        """
    ),
    "apps/server/src/app.module.ts": dedent(
        """\
        import { Module } from "@nestjs/common";
        import { AppController } from "./app.controller";
        import { AppService } from "./app.service";
        import { AuthModule } from "./modules/auth/auth.module";
        import { BrandsModule } from "./modules/brands/brands.module";
        import { MediaModule } from "./modules/media/media.module";
        import { TasksModule } from "./modules/tasks/tasks.module";
        import { PrismaModule } from "./prisma/prisma.module";

        @Module({
          imports: [PrismaModule, AuthModule, BrandsModule, TasksModule, MediaModule],
          controllers: [AppController],
          providers: [AppService],
        })
        export class AppModule {}
        """
    ),
    "apps/server/src/app.controller.ts": dedent(
        """\
        import { Controller, Get } from "@nestjs/common";
        import { AppService } from "./app.service";

        @Controller()
        export class AppController {
          constructor(private readonly appService: AppService) {}

          @Get("health")
          health() {
            return this.appService.getHealth();
          }
        }
        """
    ),
    "apps/server/src/app.service.ts": dedent(
        """\
        import { Injectable } from "@nestjs/common";
        import { PrismaService } from "./prisma/prisma.service";

        @Injectable()
        export class AppService {
          constructor(private readonly prismaService: PrismaService) {}

          getHealth() {
            return {
              app: "ai-omni-ops-system-server",
              status: "ok",
              prisma: this.prismaService.getSchemaSummary(),
              timestamp: new Date().toISOString(),
            };
          }
        }
        """
    ),
    "apps/server/src/main.ts": dedent(
        """\
        import "reflect-metadata";
        import { NestFactory } from "@nestjs/core";
        import { AppModule } from "./app.module";

        async function bootstrap() {
          const app = await NestFactory.create(AppModule);
          app.setGlobalPrefix("api");
          app.enableCors();

          const port = Number(process.env.PORT || 3001);
          await app.listen(port);
          console.log(`AI全域运营系统后端已启动: http://localhost:${port}/api/health`);
        }

        void bootstrap();
        """
    ),
    "apps/web/src/app/(dashboard)/brand-growth/page.tsx": dedent(
        """\
        const archiveSteps = [
          { name: "品牌背景资料", status: "已完成", description: "品牌名称、行业、门店数量、品牌介绍等核心资料。" },
          { name: "产品资料库", status: "已完成", description: "按产品维度沉淀价格、定位、痛点、场景与图片。" },
          { name: "品牌运营情况调研", status: "进行中", description: "围绕人货场资制度与业务诊断沉淀结构化信息。" },
          { name: "品牌平台账号", status: "已完成", description: "打通小红书、抖音、视频号、公众号的账号入口。" },
          { name: "竞品平台账号", status: "待开始", description: "补充对标账号，为竞品分析和素材库提供来源。" },
          { name: "第三方数据投喂", status: "待开始", description: "接入市场调研与行业报告，补强行业认知。" },
          { name: "企业经营数据投喂", status: "待开始", description: "上传抖店、有赞等经营报表，为营收分析做准备。" },
        ];

        const summaryCards = [
          { label: "当前品牌", value: "武汉仟吉", hint: "烘焙零售" },
          { label: "建档进度", value: "4 / 7", hint: "核心环节已启动" },
          { label: "采集平台", value: "2", hint: "小红书 + 公众号" },
          { label: "运行任务", value: "12", hint: "含报告与营销规划" },
        ];

        const collectPanels = [
          {
            title: "小红书采集",
            items: ["品牌账号信息", "竞品账号信息", "品牌作品信息及数据", "对标作品信息及数据", "目标用户查找"],
          },
          {
            title: "每日热点",
            items: ["每日 4:00 自动采集热点", "热点入库后供营销日历自动调用", "后续接入多平台热点源"],
          },
          {
            title: "增长输出",
            items: ["品牌增长报告", "品牌增长可视化报告", "半年营销规划表"],
          },
        ];

        const taskRows = [
          ["生成品牌增长报告", "gpt-5.5", "成功", "320"],
          ["生成品牌增长可视化报告", "gpt-5.5", "排队中", "180"],
          ["生成半年营销规划", "gpt-5.5", "待执行", "120"],
        ];

        const modelRows = [
          ["User", "用户、会员、点数余额", "已落 P0 schema"],
          ["Brand", "品牌主档案", "已落 P0 schema"],
          ["Product", "产品资料库", "已落 P0 schema"],
          ["PlatformAccount", "品牌平台账号", "已落 P0 schema"],
          ["Task", "任务记录与重试", "已落 P0 schema"],
          ["MediaAsset", "图片、视频、报告等资产", "已落 P0 schema"],
        ];

        export default function BrandGrowthPage() {
          return (
            <main className="dashboard-shell">
              <section className="dashboard-hero">
                <div>
                  <span className="hero-badge">品牌增长策略工作台</span>
                  <h1>先把品牌建档、数据采集、增长分析和营销规划串成闭环</h1>
                  <p>
                    这一版先把你最关心的品牌增长策略模块落成可开发的第一页，前端清楚展示当前产品结构，后端已同步补上
                    auth、brands、tasks、media 第一批接口骨架。
                  </p>
                </div>
                <div className="hero-side-card">
                  <h2>P0 当前范围</h2>
                  <ul>
                    <li>品牌资料库 7 个核心环节</li>
                    <li>采集数据入口与自动化节奏</li>
                    <li>品牌增长报告与可视化报告</li>
                    <li>半年营销规划输出链路</li>
                  </ul>
                </div>
              </section>

              <section className="card-grid">
                {summaryCards.map((card) => (
                  <article className="metric-card" key={card.label}>
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                    <p>{card.hint}</p>
                  </article>
                ))}
              </section>

              <section className="panel-grid">
                <article className="panel">
                  <div className="panel-header">
                    <h2>品牌建档流程</h2>
                    <span>Brand Archive</span>
                  </div>
                  <div className="step-list">
                    {archiveSteps.map((step) => (
                      <div className="step-item" key={step.name}>
                        <div className={`step-status status-${step.status}`}>{step.status}</div>
                        <div>
                          <h3>{step.name}</h3>
                          <p>{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel">
                  <div className="panel-header">
                    <h2>采集与输出结构</h2>
                    <span>Collect & Generate</span>
                  </div>
                  <div className="stack-list">
                    {collectPanels.map((panel) => (
                      <div className="stack-card" key={panel.title}>
                        <h3>{panel.title}</h3>
                        <ul>
                          {panel.items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="panel-grid">
                <article className="panel">
                  <div className="panel-header">
                    <h2>任务中心预览</h2>
                    <span>Tasks</span>
                  </div>
                  <div className="data-table">
                    <div className="table-row table-head">
                      <span>任务</span>
                      <span>模型</span>
                      <span>状态</span>
                      <span>积分</span>
                    </div>
                    {taskRows.map((row) => (
                      <div className="table-row" key={row[0]}>
                        {row.map((cell) => (
                          <span key={cell}>{cell}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel">
                  <div className="panel-header">
                    <h2>P0 数据模型</h2>
                    <span>Schema</span>
                  </div>
                  <div className="data-table">
                    <div className="table-row table-head">
                      <span>模型</span>
                      <span>职责</span>
                      <span>状态</span>
                    </div>
                    {modelRows.map((row) => (
                      <div className="table-row" key={row[0]}>
                        {row.map((cell) => (
                          <span key={cell}>{cell}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </article>
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

        .home-shell,
        .page-shell,
        .dashboard-shell {
          min-height: 100vh;
          padding: 48px 24px;
        }

        .hero-card,
        .page-shell,
        .dashboard-hero,
        .panel {
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
        .dashboard-hero h1 {
          margin: 16px 0 12px;
          font-size: 36px;
          line-height: 1.25;
        }

        .hero-card p,
        .page-shell p,
        .dashboard-hero p,
        .panel p {
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

        .hero-links a {
          padding: 12px 18px;
          border-radius: 14px;
          background: var(--primary);
          color: #fff;
          font-weight: 700;
        }

        .dashboard-shell {
          max-width: 1240px;
          margin: 0 auto;
        }

        .dashboard-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
          gap: 20px;
          border-radius: 28px;
          padding: 32px;
        }

        .hero-side-card {
          border-radius: 24px;
          padding: 24px;
          background: linear-gradient(180deg, rgba(91, 109, 255, 0.1), rgba(91, 109, 255, 0.04));
        }

        .hero-side-card h2,
        .panel h2 {
          margin: 0 0 12px;
          font-size: 22px;
        }

        .hero-side-card ul,
        .stack-card ul {
          margin: 0;
          padding-left: 18px;
          color: var(--muted);
          line-height: 1.8;
        }

        .card-grid,
        .panel-grid {
          display: grid;
          gap: 18px;
          margin-top: 18px;
        }

        .card-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .panel-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .metric-card,
        .stack-card,
        .step-item {
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

        .panel {
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
        .stack-list {
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

        .step-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          background: rgba(125, 135, 151, 0.12);
          color: var(--pending);
        }

        .status-已完成 {
          background: rgba(31, 157, 97, 0.12);
          color: var(--success);
        }

        .status-进行中 {
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

        @media (max-width: 960px) {
          .card-grid,
          .panel-grid,
          .dashboard-hero {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .home-shell,
          .page-shell,
          .dashboard-shell {
            padding: 24px 16px;
          }

          .hero-card,
          .page-shell,
          .dashboard-hero,
          .panel {
            padding: 20px;
            border-radius: 20px;
          }

          .hero-card h1,
          .page-shell h1,
          .dashboard-hero h1 {
            font-size: 28px;
          }

          .step-item,
          .table-row {
            grid-template-columns: 1fr;
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
