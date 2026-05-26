import { Injectable, NotFoundException } from "@nestjs/common";
import { database } from "../../common/mock-data";
import {
  THIRD_PARTY_PLATFORM_SEEDS,
  isDecommissionedPlatformBaseUrl,
  type ThirdPartyPlatformRecord,
} from "../../common/third-party-platform-catalog";
import { PrismaService } from "../../prisma/prisma.service";

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

export type UpdateMyThirdPartyPlatformSecretPayload = {
  apiKey?: string;
};

export type UserThirdPartyPlatformRecord = ThirdPartyPlatformRecord & {
  apiKey: string;
  effectiveApiKeyMasked: string;
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
      status: "owner-api-key-missing";
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

type UserThirdPartyPlatformSecretRow = {
  id: string;
  userId: string;
  brandId: string;
  platformId: string;
  apiKey: string;
  updatedAt: Date | string;
};

@Injectable()
export class ThirdPartyPlatformsService {
  private bootstrapPromise?: Promise<void>;

  constructor(private readonly prismaService: PrismaService) {}

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
    database.userThirdPartyPlatformSecrets = (database.userThirdPartyPlatformSecrets || []).filter((item) =>
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
        `DELETE FROM "UserThirdPartyPlatformSecret" WHERE "platformId" = $1`,
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
    database.userThirdPartyPlatformSecrets = (database.userThirdPartyPlatformSecrets || []).filter(
      (item) => item.platformId !== platformId,
    );
    return current;
  }

  async listUserPlatforms(userId: string, brandId: string) {
    const [platforms, secrets] = await Promise.all([this.listPlatforms(), this.listUserSecrets(userId, brandId)]);
    return platforms.map<UserThirdPartyPlatformRecord>((item) => {
      const secret = secrets.find((entry) => entry.platformId === item.id);
      const apiKey = secret?.apiKey || "";
      return {
        ...item,
        apiKey,
        effectiveApiKeyMasked: this.maskSecret(apiKey),
      };
    });
  }

  async updateUserPlatformSecret(userId: string, brandId: string, platformId: string, payload: UpdateMyThirdPartyPlatformSecretPayload) {
    const platform = await this.getPlatformById(platformId);
    if (!platform) {
      throw new NotFoundException("第三方平台不存在");
    }

    const nextApiKey = String(payload.apiKey || "").trim();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const existingRows = await this.prismaService.$queryRaw<UserThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "UserThirdPartyPlatformSecret"
        WHERE "userId" = ${userId}
          AND "brandId" = ${brandId}
          AND "platformId" = ${platformId}
        LIMIT 1
      `;
      const existing = existingRows[0];

      if (existing) {
        const rows = await this.prismaService.$queryRaw<UserThirdPartyPlatformSecretRow[]>`
          UPDATE "UserThirdPartyPlatformSecret"
          SET
            "apiKey" = ${nextApiKey},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${existing.id}
          RETURNING *
        `;
        return this.normalizeUserPlatform(platform, rows[0]?.apiKey || nextApiKey);
      }

      const rows = await this.prismaService.$queryRaw<UserThirdPartyPlatformSecretRow[]>`
        INSERT INTO "UserThirdPartyPlatformSecret" (
          "id",
          "userId",
          "brandId",
          "platformId",
          "apiKey",
          "updatedAt"
        )
        VALUES (
          ${`user_platform_secret_${Date.now()}`},
          ${userId},
          ${brandId},
          ${platformId},
          ${nextApiKey},
          CURRENT_TIMESTAMP
        )
        RETURNING *
      `;
      return this.normalizeUserPlatform(platform, rows[0]?.apiKey || nextApiKey);
    }

    if (!database.userThirdPartyPlatformSecrets) {
      database.userThirdPartyPlatformSecrets = [];
    }
    const existing = database.userThirdPartyPlatformSecrets.find(
      (item) => item.userId === userId && item.brandId === brandId && item.platformId === platformId,
    );
    if (existing) {
      existing.apiKey = nextApiKey;
      existing.updatedAt = new Date().toISOString();
      return this.normalizeUserPlatform(platform, existing.apiKey);
    }

    database.userThirdPartyPlatformSecrets.push({
      id: `user_platform_secret_${Date.now()}`,
      userId,
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

    const ownerUserId = await this.resolveBrandOwnerUserId(normalizedBrandId);
    if (!ownerUserId) {
      return {
        status: "owner-api-key-missing",
        platform: {
          id: platform.id,
          name: platform.name,
          baseUrl: platform.baseUrl,
        },
        apiKeys: [],
      };
    }

    const secret = await this.findUserPlatformSecretByPlatforms(
      ownerUserId,
      normalizedBrandId,
      matchedPlatforms.map((item) => item.id),
    );
    const apiKey = String(secret?.apiKey || "").trim();
    if (!apiKey) {
      return {
        status: "owner-api-key-missing",
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
    };
  }

  private async listUserSecrets(userId: string, brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<UserThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "UserThirdPartyPlatformSecret"
        WHERE "userId" = ${userId}
          AND "brandId" = ${brandId}
      `;
      return rows.map((item) => ({
        id: item.id,
        userId: item.userId,
        brandId: item.brandId,
        platformId: item.platformId,
        apiKey: String(item.apiKey || ""),
        updatedAt: this.normalizeDate(item.updatedAt),
      }));
    }

    return (database.userThirdPartyPlatformSecrets || [])
      .filter((item) => item.userId === userId && item.brandId === brandId)
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

  private async resolveBrandOwnerUserId(brandId: string) {
    if (await this.prismaService.canUseDatabase()) {
      const rows = await this.prismaService.$queryRaw<Array<{ ownerUserId: string | null }>>`
        SELECT "ownerUserId"
        FROM "Brand"
        WHERE "id" = ${brandId}
        LIMIT 1
      `;
      return String(rows[0]?.ownerUserId || "").trim();
    }

    return String(database.brands.find((item) => item.id === brandId)?.ownerUserId || "").trim();
  }

  private async findUserPlatformSecret(userId: string, brandId: string, platformId: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const rows = await this.prismaService.$queryRaw<UserThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "UserThirdPartyPlatformSecret"
        WHERE "userId" = ${userId}
          AND "brandId" = ${brandId}
          AND "platformId" = ${platformId}
        LIMIT 1
      `;
      return rows[0];
    }

    return (database.userThirdPartyPlatformSecrets || []).find(
      (item) => item.userId === userId && item.brandId === brandId && item.platformId === platformId,
    );
  }

  private async findUserPlatformSecretByPlatforms(userId: string, brandId: string, platformIds: string[]) {
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
      const rows = await this.prismaService.$queryRaw<UserThirdPartyPlatformSecretRow[]>`
        SELECT *
        FROM "UserThirdPartyPlatformSecret"
        WHERE "userId" = ${userId}
          AND "brandId" = ${brandId}
          AND "platformId" = ANY (${normalizedPlatformIds}::text[])
      `;
      const byPlatformId = new Map(rows.map((item) => [item.platformId, item] as const));
      return normalizedPlatformIds.map((item) => byPlatformId.get(item)).find(Boolean);
    }

    const byPlatformId = new Map(
      (database.userThirdPartyPlatformSecrets || [])
        .filter((item) => item.userId === userId && item.brandId === brandId)
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
    const nextName = seed.name || current.name || "";
    const nextProviderType = seed.providerType || current.providerType;
    const nextStatus = seed.status || current.status;
    const nextBaseUrl = seed.baseUrl || current.baseUrl || "";
    const nextTutorialUrl = seed.tutorialUrl || current.tutorialUrl || "";
    const nextDefaultModel = seed.defaultModel || current.defaultModel || "";
    const nextRemark = seed.remark || current.remark || "";
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
}
