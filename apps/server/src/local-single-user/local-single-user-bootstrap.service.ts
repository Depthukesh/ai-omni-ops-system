import { mkdir } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
import { dirname } from "node:path";
import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import {
  BrandMemberRole,
  BrandMemberStatus,
  MembershipLevel,
  SystemRole,
  UserStatus,
} from "@prisma/client";
import { AppConfigService } from "../config/app-config.service";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_LOCAL_USER_ID = "local_default_user";
const DEFAULT_LOCAL_BRAND_ID = "local_default_brand";

@Injectable()
export class LocalSingleUserBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(LocalSingleUserBootstrapService.name);

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    if (!this.appConfigService.isLocalSingleUserMode()) {
      return;
    }

    if (this.appConfigService.isWorkerBootMode()) {
      this.logger.log("Skip local-single-user bootstrap on worker process; API owns default user and brand bootstrap.");
      return;
    }

    await Promise.all([
      mkdir(this.appConfigService.getLocalDataRoot(), { recursive: true }),
      mkdir(dirname(this.appConfigService.getLocalDatabasePath()), { recursive: true }),
      mkdir(this.appConfigService.getLocalLogsRoot(), { recursive: true }),
      mkdir(this.appConfigService.getLocalRuntimeRoot(), { recursive: true }),
      mkdir(this.appConfigService.getLocalStorageRoot(), { recursive: true }),
      mkdir(this.appConfigService.getLocalCacheRoot(), { recursive: true }),
      mkdir(this.appConfigService.getLocalBackupRoot(), { recursive: true }),
      mkdir(this.appConfigService.getLocalUpdatesRoot(), { recursive: true }),
    ]);

    if (!(await this.prismaService.canUseDatabase())) {
      this.logger.warn("local-single-user 模式下数据库尚不可用，跳过默认用户/品牌初始化。");
      return;
    }

    await this.prismaService.user.upsert({
      where: { id: DEFAULT_LOCAL_USER_ID },
      update: {
        mobile: "13800000000",
        email: "local@ai-omni.local",
        emailVerifiedAt: new Date(),
        nickname: "本地单机用户",
        status: UserStatus.ACTIVE,
        membership: MembershipLevel.PRO,
        systemRole: SystemRole.SUPER_ADMIN,
      },
      create: {
        id: DEFAULT_LOCAL_USER_ID,
        mobile: "13800000000",
        email: "local@ai-omni.local",
        emailVerifiedAt: new Date(),
        nickname: "本地单机用户",
        passwordHash: hashPassword("local-single-user"),
        status: UserStatus.ACTIVE,
        membership: MembershipLevel.PRO,
        systemRole: SystemRole.SUPER_ADMIN,
        pointsBalance: 999999,
      },
    });

    await this.prismaService.brand.upsert({
      where: { id: DEFAULT_LOCAL_BRAND_ID },
      update: {
        ownerUserId: DEFAULT_LOCAL_USER_ID,
        brandName: "本地默认品牌",
        industry: "本地工作台",
        storeCount: 1,
        foundedYear: new Date().getFullYear(),
        brandDescription: "local-single-user 模式下自动创建的默认工作空间。",
        enterpriseIntro: "用于承接本地 SQLite、默认品牌上下文和主要工作台联调。",
      },
      create: {
        id: DEFAULT_LOCAL_BRAND_ID,
        ownerUserId: DEFAULT_LOCAL_USER_ID,
        brandName: "本地默认品牌",
        industry: "本地工作台",
        storeCount: 1,
        foundedYear: new Date().getFullYear(),
        brandDescription: "local-single-user 模式下自动创建的默认工作空间。",
        enterpriseIntro: "用于承接本地 SQLite、默认品牌上下文和主要工作台联调。",
      },
    });

    await this.prismaService.brandMember.upsert({
      where: {
        brandId_userId: {
          brandId: DEFAULT_LOCAL_BRAND_ID,
          userId: DEFAULT_LOCAL_USER_ID,
        },
      },
      update: {
        role: BrandMemberRole.OWNER,
        status: BrandMemberStatus.ACTIVE,
      },
      create: {
        brandId: DEFAULT_LOCAL_BRAND_ID,
        userId: DEFAULT_LOCAL_USER_ID,
        role: BrandMemberRole.OWNER,
        status: BrandMemberStatus.ACTIVE,
      },
    });

    this.logger.log("local-single-user 默认用户与默认品牌已就绪。");
  }
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}
