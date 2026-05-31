import { Injectable, NotFoundException } from "@nestjs/common";
import { database } from "../../common/mock-data";
import {
  THIRD_PARTY_PLATFORM_SEEDS,
  isDecommissionedPlatformBaseUrl,
  type ThirdPartyPlatformRecord,
} from "../../common/third-party-platform-catalog";
import { PrismaService } from "../../prisma/prisma.service";
import { ChanjingOpenApiService } from "../works/chanjing-open-api.service";

export type CreateThirdPartyPlatformPayload = {
  name: string;
  providerType: ThirdPartyPlatformRecord["providerType"];
  status?: ThirdPartyPlatformRecord["status"];
  baseUrl: string;
  tutorialUrl?: string;
  modelIds?: string[];
  defaultModel?: string;
  remark?: string;
};

export type UpdateThirdPartyPlatformPayload = {
  name?: string;
  providerType?: ThirdPartyPlatformRecord["providerType"];
  status?: ThirdPartyPlatformRecord["status"];
  baseUrl?: string;
  tutorialUrl?: string;
  modelIds?: string[];
  defaultModel?: string;
  remark?: string;
};

export type UpdateBrandThirdPartyPlatformSecretPayload = {
  apiKey?: string;
};

export type UserThirdPartyPlatformRecord = ThirdPartyPlatformRecord & {
  apiKey: string;
  effectiveApiKeyMasked: string;
  dynamicStats?: {
    status: "ready" | "partial" | "missing_credential" | "error";
    templateCount?: number;
    customPersonCount?: number;
    tagCount?: number;
    syncedAt?: string;
    message?: string;
  };
};

export type BrandRuntimeApiKeyResolution =
  | {
      status: "no-platform-match" | "brand-context-missing";
      platform?: undefined;
      apiKeys: [];
    }
  | {
      status: "resolved";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl">;
      apiKeys: string[];
    }
  | {
      status: "brand-api-key-missing";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl">;
      apiKeys: [];
    };

type ThirdPartyPlatformRow = {
  id: string;
  name: string;
  providerType: ThirdPartyPlatformRecord["providerType"];
  status: ThirdPartyPlatformRecord["status"];
  baseUrl: string;
  tutorialUrl: string;
  modelIdsJson: unknown;
  defaultModel: string;
  remark: string;
  updatedAt: Date | string;
};

type BrandThirdPartyPlatformSecretRow = {
  id: string;
  brandId: string;
  platformId: string;
  apiKey: string;
  updatedAt: Date | string;
};

@Injectable()
export class ThirdPartyPlatformsService {
  private bootstrapPromise?: Promise<void>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly chanjingOpenApiService: ChanjingOpenApiService,
  ) {}

  async listPlatforms() {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<ThirdPartyPlatformRow[]>`
        SELECT *
        FROM "ThirdPartyPlatformConfig"
        ORDER BY "updatedAt" DESC, "name" ASC
      `;
      return rows.map((item) => this.normalizePlatformRow(item));
    }

    if (!database.thirdPartyPlatforms?.length) {
      database.thirdPartyPlatforms = THIRD_PARTY_PLATFORM_SEEDS.map((item) => ({ ...item }));
    }
    database.thirdPartyPlatforms = (database.thirdPartyPlatforms || []).filter(
      (item) => !this.isDecommissionedPlatform(item),
    );
    database.brandThirdPartyPlatformSecrets = (database.brandThirdPartyPlatformSecrets || []).filter((item) =>
      database.thirdPartyPlatforms?.some((platform) => platform.id === item.platformId),
    );
    return [...database.thirdPartyPlatforms].map((item) => ({ ...item }));
  }

  async getPlatformById(platformId: string) {
    return (await this.listPlatforms()).find((item) => item.id === platformId);
  }

  async createPlatform(payload: CreateThirdPartyPlatformPayload) {
    const nextRecord = this.buildPlatformRecord({
      id: `third_party_platform_${Date.now()}`,
      name: payload.name,
      providerType: payload.providerType,
      status: payload.status || "DRAFT",
      baseUrl: payload.baseUrl,
      tutorialUrl: payload.tutorialUrl || "",
      modelIds: payload.modelIds || [],
      defaultModel: payload.defaultModel || "",
      remark: payload.remark || "",
      updatedAt: new Date().toISOString(),
    });

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<ThirdPartyPlatformRow[]>`
        INSERT INTO "ThirdPartyPlatformConfig" (
          "id",
          "name",
          "providerType",
          "status",
          "baseUrl",
          "tutorialUrl",
          "modelIdsJson",
          "defaultModel",
          "remark",
          "updatedAt"
        )
        VALUES (
          ${nextRecord.id},
          ${nextRecord.name},
          ${nextRecord.providerType},
          ${nextRecord.status},
          ${nextRecord.baseUrl},
          ${nextRecord.tutorialUrl},
          ${JSON.stringify(nextRecord.modelIds)}::jsonb,
          ${nextRecord.defaultModel},
          ${nextRecord.remark},
          ${new Date(nextRecord.updatedAt)}
        )
        RETURNING *
      `;
      return this.normalizePlatformRow(rows[0] ?? nextRecord);
    }

    if (!database.thirdPartyPlatforms) {
      database.thirdPartyPlatforms = [];
    }
    database.thirdPartyPlatforms.unshift(nextRecord);
    return nextRecord;
  }

  async updatePlatform(platformId: string, payload: UpdateThirdPartyPlatformPayload) {
    const current = await this.getPlatformById(platformId);
    if (!current) {
      throw new NotFoundException("第三方平台不存在");
    }

    const nextRecord = this.buildPlatformRecord({
      ...current,
      name: payload.name ?? current.name,
      providerType: payload.providerType ?? current.providerType,
      status: payload.status ?? current.status,
      baseUrl: payload.baseUrl ?? current.baseUrl,
      tutorialUrl: payload.tutorialUrl ?? current.tutorialUrl,
      modelIds: payload.modelIds ?? current.modelIds,
      defaultModel: payload.defaultModel ?? current.defaultModel,
      remark: payload.remark ?? current.remark,
      updatedAt: new Date().toISOString(),
    });

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<ThirdPartyPlatformRow[]>`
        UPDATE "ThirdPartyPlatformConfig"
        SET
          "name" = ${nextRecord.name},
          "providerType" = ${nextRecord.providerType},
          "status" = ${nextRecord.status},
          "baseUrl" = ${nextRecord.baseUrl},
          "tutorialUrl" = ${nextRecord.tutorialUrl},
          "modelIdsJson" = ${JSON.stringify(nextRecord.modelIds)}::jsonb,
          "defaultModel" = ${nextRecord.defaultModel},
          "remark" = ${nextRecord.remark},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${platformId}
        RETURNING *
      `;
      return this.normalizePlatformRow(rows[0] ?? nextRecord);
    }

    database.thirdPartyPlatforms = (database.thirdPartyPlatforms || []).map((item) =>
      item.id === platformId ? nextRecord : item,
    );
    return nextRecord;
  }

  async deletePlatform(platformId: string) {
    const current = await this.getPlatformById(platformId);
    if (!current) {
      throw new NotFoundException("第三方平台不存在");
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      await this.prismaService.$queryRawUnsafe(
        `DELETE FROM "BrandThirdPartyPlatformSecret" WHERE "platformId" = $1`,
        platformId,
      );
      const rows = await this.prismaService.$queryRaw<ThirdPartyPlatformRow[]>`
        DELETE FROM "ThirdPartyPlatformConfig"
        WHERE "id" = ${platformId}
        RETURNING *
      `;
      return this.normalizePlatformRow(rows[0] ?? current);
    }

    database.thirdPartyPlatforms = (database.thirdPartyPlatforms || []).filter((item) => item.id !== platformId);
    database.brandThirdPartyPlatformSecrets = (database.brandThirdPartyPlatformSecrets || []).filter(
      (item) => item.platformId !== platformId,
    );
    return current;
  }

  async listUserPlatforms(_userId: string, brandId: string) {
    const [platforms, secrets] = await Promise.all([this.listPlatforms(), this.listBrandSecrets(brandId)]);
    return Promise.all(platforms.map(async (item) => {
      const secret = secrets.find((entry) => entry.platformId === item.id);
      const apiKey = secret?.apiKey || "";
      const dynamicStats = await this.buildDynamicStats(item, apiKey);
      return {
        ...item,
        apiKey,
        effectiveApiKeyMasked: this.maskSecret(apiKey),
        dynamicStats,
      } satisfies UserThirdPartyPlatformRecord;
    }));
  }

  async updateBrandPlatformSecret(brandId: string, platformId: string, payload: UpdateBrandThirdPartyPlatformSecretPayload) {
    const platform = await this.getPlatformById(platformId);
    if (!platform) {
      throw new NotFoundException("第三方平台不存在");
    }

    const nextApiKey = String(payload.apiKey || "").trim();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const existingRows = await this.prismaService.$queryRaw<BrandThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "BrandThirdPartyPlatformSecret"
        WHERE "brandId" = ${brandId}
          AND "platformId" = ${platformId}
        LIMIT 1
      `;
      const existing = existingRows[0];

      if (existing) {
        const rows = await this.prismaService.$queryRaw<BrandThirdPartyPlatformSecretRow[]>`
          UPDATE "BrandThirdPartyPlatformSecret"
          SET
            "apiKey" = ${nextApiKey},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${existing.id}
          RETURNING *
        `;
        return this.normalizeUserPlatform(platform, rows[0]?.apiKey || nextApiKey);
      }

      const rows = await this.prismaService.$queryRaw<BrandThirdPartyPlatformSecretRow[]>`
        INSERT INTO "BrandThirdPartyPlatformSecret" (
          "id",
          "brandId",
          "platformId",
          "apiKey",
          "updatedAt"
        )
        VALUES (
          ${`brand_platform_secret_${Date.now()}`},
          ${brandId},
          ${platformId},
          ${nextApiKey},
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `;
      return this.normalizeUserPlatform(platform, rows[0]?.apiKey || nextApiKey);
    }

    if (!database.brandThirdPartyPlatformSecrets) {
      database.brandThirdPartyPlatformSecrets = [];
    }
    const existing = database.brandThirdPartyPlatformSecrets.find(
      (item) => item.brandId === brandId && item.platformId === platformId,
    );
    if (existing) {
      existing.apiKey = nextApiKey;
      existing.updatedAt = new Date().toISOString();
      return this.normalizeUserPlatform(platform, existing.apiKey);
    }

    database.brandThirdPartyPlatformSecrets.push({
      id: `brand_platform_secret_${Date.now()}`,
      brandId,
      platformId,
      apiKey: nextApiKey,
      updatedAt: new Date().toISOString(),
    });
    return this.normalizeUserPlatform(platform, nextApiKey);
  }

  async resolveBrandRuntimeApiKeys(brandId: string | undefined, baseUrls: string[]): Promise<BrandRuntimeApiKeyResolution> {
    const normalizedBrandId = String(brandId || "").trim();
    if (!normalizedBrandId) {
      return {
        status: "brand-context-missing",
        apiKeys: [],
      };
    }

    const matchedPlatforms = await this.findPlatformsByBaseUrls(baseUrls);
    const platform = matchedPlatforms[0];
    if (!platform) {
      return {
        status: "no-platform-match",
        apiKeys: [],
      };
    }
    const secret = await this.findBrandPlatformSecretByPlatforms(
      normalizedBrandId,
      matchedPlatforms.map((item) => item.id),
    );
    const apiKey = String(secret?.apiKey || "").trim();
    if (!apiKey) {
      return {
        status: "brand-api-key-missing",
        platform: {
          id: platform.id,
          name: platform.name,
          baseUrl: platform.baseUrl,
        },
        apiKeys: [],
      };
    }

    return {
      status: "resolved",
      platform: {
        id: platform.id,
        name: platform.name,
        baseUrl: platform.baseUrl,
      },
      apiKeys: [apiKey],
    };
  }

  private normalizeUserPlatform(platform: ThirdPartyPlatformRecord, apiKey: string): UserThirdPartyPlatformRecord {
    return {
      ...platform,
      apiKey,
      effectiveApiKeyMasked: this.maskSecret(apiKey),
      dynamicStats: undefined,
    };
  }

  private async buildDynamicStats(platform: ThirdPartyPlatformRecord, apiKey: string) {
    if (!this.isChanjingPlatform(platform)) {
      return undefined;
    }
    const credential = String(apiKey || "").trim();
    if (!credential) {
      return {
        status: "missing_credential" as const,
        message: "配置蝉镜凭证后才会同步真实模板和定制数字人统计。",
      };
    }
    try {
      const [tagsResult, templatesResult, customPersonsResult] = await Promise.allSettled([
        this.chanjingOpenApiService.listTemplateTags(credential),
        this.chanjingOpenApiService.listCommonDigitalPersons(credential, { page: 1, size: 1 }),
        this.chanjingOpenApiService.listCustomisedPersons(credential, { page: 1, pageSize: 1 }),
      ]);
      const templateCount = templatesResult.status === "fulfilled"
        ? (templatesResult.value.pageInfo.totalCount || templatesResult.value.list.length)
        : undefined;
      const customPersonCount = customPersonsResult.status === "fulfilled"
        ? (customPersonsResult.value.pageInfo.totalCount || customPersonsResult.value.list.length)
        : undefined;
      const tagCount = tagsResult.status === "fulfilled" ? tagsResult.value.length : undefined;
      const failureMessages = [
        tagsResult.status === "rejected" ? this.describeDynamicStatsFailure("标签统计", tagsResult.reason) : "",
        templatesResult.status === "rejected" ? this.describeDynamicStatsFailure("模板统计", templatesResult.reason) : "",
        customPersonsResult.status === "rejected" ? this.describeDynamicStatsFailure("定制数字人统计", customPersonsResult.reason) : "",
      ].filter(Boolean);
      if (typeof templateCount === "number" || typeof customPersonCount === "number" || typeof tagCount === "number") {
        return {
          status: failureMessages.length ? "partial" as const : "ready" as const,
          templateCount,
          customPersonCount,
          tagCount,
          syncedAt: new Date().toISOString(),
          message: failureMessages.join("；") || undefined,
        };
      }
      return {
        status: "error" as const,
        message: failureMessages.join("；") || "蝉镜统计同步失败",
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "蝉镜统计同步失败";
      return {
        status: "error" as const,
        message,
        syncedAt: new Date().toISOString(),
      };
    }
  }

  private describeDynamicStatsFailure(label: string, error: unknown) {
    const message = error instanceof Error ? error.message : "接口请求失败";
    return `${label}失败：${message}`;
  }

  private async listBrandSecrets(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<BrandThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "BrandThirdPartyPlatformSecret"
        WHERE "brandId" = ${brandId}
      `;
      return rows.map((item) => ({
        id: item.id,
        brandId: item.brandId,
        platformId: item.platformId,
        apiKey: String(item.apiKey || ""),
        updatedAt: this.normalizeDate(item.updatedAt),
      }));
    }

    return (database.brandThirdPartyPlatformSecrets || [])
      .filter((item) => item.brandId === brandId)
      .map((item) => ({ ...item }));
  }

  private async findPlatformByBaseUrls(baseUrls: string[]) {
    return (await this.findPlatformsByBaseUrls(baseUrls))[0];
  }

  private async findPlatformsByBaseUrls(baseUrls: string[]) {
    const normalizedBaseUrls = Array.from(
      new Set(
        baseUrls
          .map((item) => this.normalizeBaseUrl(item))
          .filter(Boolean),
      ),
    );
    if (!normalizedBaseUrls.length) {
      return [];
    }

    const baseUrlHosts = Array.from(
      new Set(
        normalizedBaseUrls
          .map((item) => this.extractHost(item))
          .filter(Boolean),
      ),
    );
    const platforms = await this.listPlatforms();
    const exactMatches = platforms.filter((item) => normalizedBaseUrls.includes(this.normalizeBaseUrl(item.baseUrl)));
    if (exactMatches.length) {
      const exactIds = new Set(exactMatches.map((item) => item.id));
      const siblingMatches = platforms.filter((item) => {
        if (exactIds.has(item.id)) {
          return false;
        }
        const host = this.extractHost(item.baseUrl);
        return Boolean(host) && baseUrlHosts.includes(host);
      });
      return [...exactMatches, ...siblingMatches];
    }

    return platforms.filter((item) => {
      const host = this.extractHost(item.baseUrl);
      return Boolean(host) && baseUrlHosts.includes(host);
    });
  }

  private async findBrandPlatformSecret(brandId: string, platformId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<BrandThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "BrandThirdPartyPlatformSecret"
        WHERE "brandId" = ${brandId}
          AND "platformId" = ${platformId}
        LIMIT 1
      `;
      return rows[0];
    }

    return (database.brandThirdPartyPlatformSecrets || []).find(
      (item) => item.brandId === brandId && item.platformId === platformId,
    );
  }

  private async findBrandPlatformSecretByPlatforms(brandId: string, platformIds: string[]) {
    const normalizedPlatformIds = Array.from(
      new Set(
        platformIds
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
    if (!normalizedPlatformIds.length) {
      return undefined;
    }

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<BrandThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "BrandThirdPartyPlatformSecret"
        WHERE "brandId" = ${brandId}
          AND "platformId" = ANY (${normalizedPlatformIds}::text[])
      `;
      const byPlatformId = new Map(rows.map((item) => [item.platformId, item] as const));
      return normalizedPlatformIds.map((item) => byPlatformId.get(item)).find(Boolean);
    }

    const byPlatformId = new Map(
      (database.brandThirdPartyPlatformSecrets || [])
        .filter((item) => item.brandId === brandId)
        .map((item) => [item.platformId, item] as const),
    );
    return normalizedPlatformIds.map((item) => byPlatformId.get(item)).find(Boolean);
  }

  private buildPlatformRecord(input: ThirdPartyPlatformRecord): ThirdPartyPlatformRecord {
    const modelIds = Array.from(
      new Set(
        (input.modelIds || [])
          .map((item) => String(item || "").trim())
          .filter(Boolean),
      ),
    );
    const defaultModel = modelIds.includes(input.defaultModel) ? input.defaultModel : modelIds[0] || "";
    return {
      id: input.id,
      name: String(input.name || "").trim(),
      providerType: input.providerType,
      status: input.status,
      baseUrl: String(input.baseUrl || "").trim(),
      tutorialUrl: String(input.tutorialUrl || "").trim(),
      modelIds,
      defaultModel,
      remark: String(input.remark || "").trim(),
      updatedAt: this.normalizeDate(input.updatedAt),
    };
  }

  private normalizePlatformRow(row: ThirdPartyPlatformRow | ThirdPartyPlatformRecord): ThirdPartyPlatformRecord {
    const modelIds =
      "modelIdsJson" in row
        ? (Array.isArray(row.modelIdsJson) ? (row.modelIdsJson as string[]) : [])
        : row.modelIds;

    return this.buildPlatformRecord({
      id: row.id,
      name: row.name,
      providerType: row.providerType,
      status: row.status,
      baseUrl: row.baseUrl,
      tutorialUrl: row.tutorialUrl,
      modelIds,
      defaultModel: row.defaultModel,
      remark: row.remark,
      updatedAt: this.normalizeDate(row.updatedAt),
    });
  }

  private normalizeDate(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return String(value || new Date().toISOString());
  }

  private normalizeBaseUrl(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "";
    }
    try {
      const target = new URL(this.ensureUrlProtocol(normalized));
      const pathname = target.pathname.replace(/\/+$/, "");
      return `${target.protocol}//${target.host}${pathname}`.toLowerCase();
    } catch {
      return normalized.replace(/\/+$/, "").toLowerCase();
    }
  }

  private extractHost(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "";
    }
    try {
      return new URL(this.ensureUrlProtocol(normalized)).host.toLowerCase();
    } catch {
      const matched = normalized.match(/^(?:[a-z]+:\/\/)?([^/]+)/i);
      return matched?.[1]?.toLowerCase() || "";
    }
  }

  private ensureUrlProtocol(value: string) {
    return /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`;
  }

  private maskSecret(value: string) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return "未设置";
    }
    if (normalized.length <= 8) {
      return `${normalized.slice(0, 2)}****`;
    }
    return `${normalized.slice(0, 4)}********${normalized.slice(-4)}`;
  }

  private isChanjingPlatform(platform: Pick<ThirdPartyPlatformRecord, "name" | "baseUrl" | "tutorialUrl" | "remark">) {
    const searchable = [platform.name, platform.baseUrl, platform.tutorialUrl, platform.remark].join(" ").toLowerCase();
    return searchable.includes("chanjing") || searchable.includes("蝉镜");
  }

  private async ensureTablesReady() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapTables();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapTables() {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
    }

    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ThirdPartyPlatformConfig" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "providerType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "baseUrl" TEXT NOT NULL DEFAULT '',
        "tutorialUrl" TEXT NOT NULL DEFAULT '',
        "modelIdsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "defaultModel" TEXT NOT NULL DEFAULT '',
        "remark" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserThirdPartyPlatformSecret" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "brandId" TEXT NOT NULL,
        "platformId" TEXT NOT NULL,
        "apiKey" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UserThirdPartyPlatformSecret_user_brand_platform_key"
      ON "UserThirdPartyPlatformSecret" ("userId", "brandId", "platformId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BrandThirdPartyPlatformSecret" (
        "id" TEXT PRIMARY KEY,
        "brandId" TEXT NOT NULL,
        "platformId" TEXT NOT NULL,
        "apiKey" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "BrandThirdPartyPlatformSecret_brand_platform_key"
      ON "BrandThirdPartyPlatformSecret" ("brandId", "platformId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      INSERT INTO "BrandThirdPartyPlatformSecret" ("id", "brandId", "platformId", "apiKey", "updatedAt")
      SELECT DISTINCT ON ("brandId", "platformId")
        CONCAT('brand_platform_secret_migrated_', md5("brandId" || ':' || "platformId")),
        "brandId",
        "platformId",
        "apiKey",
        "updatedAt"
      FROM "UserThirdPartyPlatformSecret"
      WHERE COALESCE("apiKey", '') <> ''
      ORDER BY "brandId", "platformId", "updatedAt" DESC
      ON CONFLICT ("brandId", "platformId") DO NOTHING
    `);

    const existingRows = await this.prismaService.$queryRaw<ThirdPartyPlatformRow[]>`
      SELECT *
      FROM "ThirdPartyPlatformConfig"
    `;
    const existingById = new Map(existingRows.map((item) => {
      const normalized = this.normalizePlatformRow(item);
      return [normalized.id, normalized] as const;
    }));

    const decommissionedPlatformIds = Array.from(existingById.values())
      .filter((item) => this.isDecommissionedPlatform(item))
      .map((item) => item.id);
    if (decommissionedPlatformIds.length) {
      await this.prismaService.$executeRaw`
        DELETE FROM "BrandThirdPartyPlatformSecret"
        WHERE "platformId" = ANY (${decommissionedPlatformIds}::text[])
      `;
      await this.prismaService.$executeRaw`
        DELETE FROM "UserThirdPartyPlatformSecret"
        WHERE "platformId" = ANY (${decommissionedPlatformIds}::text[])
      `;
      await this.prismaService.$executeRaw`
        DELETE FROM "ThirdPartyPlatformConfig"
        WHERE "id" = ANY (${decommissionedPlatformIds}::text[])
      `;
      decommissionedPlatformIds.forEach((item) => existingById.delete(item));
    }

    for (const item of THIRD_PARTY_PLATFORM_SEEDS) {
      const current = existingById.get(item.id);
      if (current) {
        await this.syncSeedPlatform(current, item);
        continue;
      }
      await this.prismaService.$queryRaw`
        INSERT INTO "ThirdPartyPlatformConfig" (
          "id",
          "name",
          "providerType",
          "status",
          "baseUrl",
          "tutorialUrl",
          "modelIdsJson",
          "defaultModel",
          "remark",
          "updatedAt"
        )
        VALUES (
          ${item.id},
          ${item.name},
          ${item.providerType},
          ${item.status},
          ${item.baseUrl},
          ${item.tutorialUrl},
          ${JSON.stringify(item.modelIds)}::jsonb,
          ${item.defaultModel},
          ${item.remark},
          ${new Date(item.updatedAt)}
        )
      `;
    }
  }

  private async syncSeedPlatform(current: ThirdPartyPlatformRecord, seed: ThirdPartyPlatformRecord) {
    const nextModelIds = Array.from(new Set([...(current.modelIds || []), ...(seed.modelIds || [])]));
    const nextName = current.name || seed.name || "";
    const nextProviderType = current.providerType || seed.providerType;
    const nextStatus = current.status || seed.status;
    const nextBaseUrl = this.resolveSystemSeedBaseUrl(current.baseUrl, seed.baseUrl);
    const nextTutorialUrl = current.tutorialUrl || seed.tutorialUrl || "";
    const nextDefaultModel = current.defaultModel || seed.defaultModel || "";
    const nextRemark = current.remark || seed.remark || "";
    const currentModelIdsJson = JSON.stringify(current.modelIds || []);
    const nextModelIdsJson = JSON.stringify(nextModelIds);
    if (
      current.name === nextName
      && current.providerType === nextProviderType
      && current.status === nextStatus
      && current.baseUrl === nextBaseUrl
      && currentModelIdsJson === nextModelIdsJson
      && current.tutorialUrl === nextTutorialUrl
      && current.defaultModel === nextDefaultModel
      && current.remark === nextRemark
    ) {
      return;
    }
    await this.prismaService.$queryRaw`
      UPDATE "ThirdPartyPlatformConfig"
      SET
        "name" = ${nextName},
        "providerType" = ${nextProviderType},
        "status" = ${nextStatus},
        "baseUrl" = ${nextBaseUrl},
        "modelIdsJson" = ${nextModelIdsJson}::jsonb,
        "tutorialUrl" = ${nextTutorialUrl},
        "defaultModel" = ${nextDefaultModel},
        "remark" = ${nextRemark},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${current.id}
    `;
  }

  private isDecommissionedPlatform(platform: Pick<ThirdPartyPlatformRecord, "baseUrl">) {
    return isDecommissionedPlatformBaseUrl(platform.baseUrl);
  }

  private resolveSystemSeedBaseUrl(currentBaseUrl: string, seedBaseUrl: string) {
    const normalizedCurrent = this.normalizeBaseUrl(currentBaseUrl);
    const normalizedSeed = this.normalizeBaseUrl(seedBaseUrl);
    if (!normalizedSeed) {
      return String(currentBaseUrl || "").trim();
    }
    if (!normalizedCurrent) {
      return String(seedBaseUrl || "").trim();
    }
    return normalizedCurrent === normalizedSeed ? String(currentBaseUrl || "").trim() : String(seedBaseUrl || "").trim();
  }
}
