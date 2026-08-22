import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomBytes, scryptSync } from "node:crypto";
import { dirname, join } from "node:path";
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
const DEFAULT_LOCAL_BRAND_NAME = "本地默认品牌";
const DEFAULT_LOCAL_BRAND_INDUSTRY = "本地工作台";
const DEFAULT_LOCAL_BRAND_DESCRIPTION = "local-single-user 模式下自动创建的默认工作空间。";
const DEFAULT_LOCAL_BRAND_ENTERPRISE_INTRO = "用于承接本地 SQLite、默认品牌上下文和主要工作台联调。";
const DEFAULT_LOCAL_BRAND_STORE_COUNT = 1;
const DEFAULT_LOCAL_BRAND_BACKGROUND_SNAPSHOT_FILE = "default-local-brand-background-snapshot.json";

type DefaultLocalBrandSeed = {
  ownerUserId: string;
  brandName: string;
  industry: string;
  storeCount: number;
  foundedYear: number;
  brandDescription: string;
  enterpriseIntro: string;
};

type DefaultLocalBrandBackgroundSnapshot = {
  brandId: string;
  brandName: string;
  industry: string;
  storeCount: number;
  foundedYear: number;
  brandDescription: string;
  enterpriseIntro: string;
  capturedAt: string;
};

type DefaultLocalBrandBackgroundRecord = {
  id: string;
  brandName: string;
  industry: string | null;
  storeCount: number | null;
  foundedYear: number | null;
  brandDescription: string | null;
  enterpriseIntro: string | null;
};

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

    const defaultBrandSeed = this.buildDefaultLocalBrandSeed();
    const existingDefaultBrand = await this.prismaService.brand.findUnique({
      where: { id: DEFAULT_LOCAL_BRAND_ID },
      select: { id: true },
    });

    if (!existingDefaultBrand) {
      await this.prismaService.brand.create({
        data: {
          id: DEFAULT_LOCAL_BRAND_ID,
          ...defaultBrandSeed,
        },
      });
    }

    const currentDefaultBrand = await this.prismaService.brand.findUnique({
      where: { id: DEFAULT_LOCAL_BRAND_ID },
      select: {
        id: true,
        brandName: true,
        industry: true,
        storeCount: true,
        foundedYear: true,
        brandDescription: true,
        enterpriseIntro: true,
      },
    });

    if (currentDefaultBrand) {
      const restored = await this.restoreDefaultBrandBackgroundFromSnapshotIfNeeded(currentDefaultBrand, defaultBrandSeed);
      const effectiveBrand = restored
        ? await this.prismaService.brand.findUnique({
          where: { id: DEFAULT_LOCAL_BRAND_ID },
          select: {
            id: true,
            brandName: true,
            industry: true,
            storeCount: true,
            foundedYear: true,
            brandDescription: true,
            enterpriseIntro: true,
          },
        })
        : currentDefaultBrand;
      if (effectiveBrand) {
        await this.writeDefaultBrandBackgroundSnapshotIfCustomized(effectiveBrand, defaultBrandSeed);
      }
    }

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

  private buildDefaultLocalBrandSeed(): DefaultLocalBrandSeed {
    return {
      ownerUserId: DEFAULT_LOCAL_USER_ID,
      brandName: DEFAULT_LOCAL_BRAND_NAME,
      industry: DEFAULT_LOCAL_BRAND_INDUSTRY,
      storeCount: DEFAULT_LOCAL_BRAND_STORE_COUNT,
      foundedYear: new Date().getFullYear(),
      brandDescription: DEFAULT_LOCAL_BRAND_DESCRIPTION,
      enterpriseIntro: DEFAULT_LOCAL_BRAND_ENTERPRISE_INTRO,
    };
  }

  private getDefaultBrandBackgroundSnapshotPath() {
    return join(this.appConfigService.getLocalBackupRoot(), DEFAULT_LOCAL_BRAND_BACKGROUND_SNAPSHOT_FILE);
  }

  private normalizeText(value: string | null | undefined) {
    return String(value || "").trim();
  }

  private isDefaultLocalBrandBackground(
    brand: Pick<DefaultLocalBrandBackgroundRecord, "brandName" | "industry" | "storeCount" | "brandDescription" | "enterpriseIntro">,
    seed: DefaultLocalBrandSeed,
  ) {
    return this.normalizeText(brand.brandName) === seed.brandName
      && this.normalizeText(brand.industry) === seed.industry
      && Number(brand.storeCount || 0) === seed.storeCount
      && this.normalizeText(brand.brandDescription) === seed.brandDescription
      && this.normalizeText(brand.enterpriseIntro) === seed.enterpriseIntro;
  }

  private isCustomizedLocalBrandBackground(
    brand: {
      brandName: string | null | undefined;
      industry: string | null | undefined;
      storeCount: number | null | undefined;
      foundedYear: number | null | undefined;
      brandDescription: string | null | undefined;
      enterpriseIntro: string | null | undefined;
    },
    seed: DefaultLocalBrandSeed,
  ) {
    return this.normalizeText(brand.brandName) !== seed.brandName
      || this.normalizeText(brand.industry) !== seed.industry
      || Number(brand.storeCount || 0) !== seed.storeCount
      || Number(brand.foundedYear || 0) !== seed.foundedYear
      || this.normalizeText(brand.brandDescription) !== seed.brandDescription
      || this.normalizeText(brand.enterpriseIntro) !== seed.enterpriseIntro;
  }

  private async readDefaultBrandBackgroundSnapshot() {
    try {
      const raw = await readFile(this.getDefaultBrandBackgroundSnapshotPath(), "utf8");
      const parsed = JSON.parse(raw) as Partial<DefaultLocalBrandBackgroundSnapshot>;
      if (parsed.brandId !== DEFAULT_LOCAL_BRAND_ID) {
        return null;
      }
      return {
        brandId: DEFAULT_LOCAL_BRAND_ID,
        brandName: this.normalizeText(parsed.brandName),
        industry: this.normalizeText(parsed.industry),
        storeCount: Number(parsed.storeCount || 0),
        foundedYear: Number(parsed.foundedYear || 0),
        brandDescription: this.normalizeText(parsed.brandDescription),
        enterpriseIntro: this.normalizeText(parsed.enterpriseIntro),
        capturedAt: this.normalizeText(parsed.capturedAt),
      } satisfies DefaultLocalBrandBackgroundSnapshot;
    } catch {
      return null;
    }
  }

  private async writeDefaultBrandBackgroundSnapshotIfCustomized(
    brand: DefaultLocalBrandBackgroundRecord,
    seed: DefaultLocalBrandSeed,
  ) {
    if (!this.isCustomizedLocalBrandBackground(brand, seed)) {
      return;
    }
    const snapshot: DefaultLocalBrandBackgroundSnapshot = {
      brandId: brand.id,
      brandName: this.normalizeText(brand.brandName),
      industry: this.normalizeText(brand.industry),
      storeCount: Number(brand.storeCount || 0),
      foundedYear: Number(brand.foundedYear || 0),
      brandDescription: this.normalizeText(brand.brandDescription),
      enterpriseIntro: this.normalizeText(brand.enterpriseIntro),
      capturedAt: new Date().toISOString(),
    };
    try {
      await writeFile(this.getDefaultBrandBackgroundSnapshotPath(), JSON.stringify(snapshot, null, 2), "utf8");
    } catch (error) {
      this.logger.warn(`写入默认品牌背景快照失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async restoreDefaultBrandBackgroundFromSnapshotIfNeeded(
    brand: DefaultLocalBrandBackgroundRecord,
    seed: DefaultLocalBrandSeed,
  ) {
    if (!this.isDefaultLocalBrandBackground(brand, seed)) {
      return false;
    }
    const snapshot = await this.readDefaultBrandBackgroundSnapshot();
    if (!snapshot || !this.isCustomizedLocalBrandBackground(snapshot, seed)) {
      return false;
    }
    await this.prismaService.brand.update({
      where: { id: brand.id },
      data: {
        brandName: snapshot.brandName,
        industry: snapshot.industry,
        storeCount: snapshot.storeCount,
        foundedYear: snapshot.foundedYear || seed.foundedYear,
        brandDescription: snapshot.brandDescription,
        enterpriseIntro: snapshot.enterpriseIntro,
      },
    });
    this.logger.warn("检测到默认品牌背景被回退到默认值，已从本地快照自动恢复。");
    return true;
  }
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}
