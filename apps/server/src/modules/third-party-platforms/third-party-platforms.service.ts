import { Injectable, NotFoundException } from "@nestjs/common";
import { database } from "../../common/mock-data";
import {
  THIRD_PARTY_PLATFORM_SEEDS,
  isDecommissionedPlatformBaseUrl,
  resolvePlatformWebsiteUrl,
  type ThirdPartyPlatformRecord,
} from "../../common/third-party-platform-catalog";
import { PrismaService } from "../../prisma/prisma.service";
import { ChanjingOpenApiService } from "../works/chanjing-open-api.service";

async function reportRightCodesOpenClawDebugEvent(payload: Record<string, unknown>) {
  const baseUrl = String(process.env.PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) {
    return;
  }
  await fetch(`${baseUrl}/openclaw/mcp/debug/right-codes-openclaw/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...(payload || {}),
      ts: typeof payload.ts === "number" ? payload.ts : Date.now(),
    }),
  }).catch(() => {});
}

async function reportDuoyuanxPlatformMatchDebugEvent(payload: Record<string, unknown>) {
  const baseUrl = String(process.env.PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (!baseUrl) {
    return;
  }
  await fetch(`${baseUrl}/openclaw/mcp/debug/duoyuanx-platform-match/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...(payload || {}),
      ts: typeof payload.ts === "number" ? payload.ts : Date.now(),
    }),
  }).catch(() => {});
}

export type CreateThirdPartyPlatformPayload = {
  name: string;
  providerType: ThirdPartyPlatformRecord["providerType"];
  status?: ThirdPartyPlatformRecord["status"];
  baseUrl: string;
  websiteUrl?: string;
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
  websiteUrl?: string;
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
      resolvedFrom?: undefined;
      apiKeys: [];
    }
  | {
      status: "resolved";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl">;
      resolvedFrom: "brand" | "local-env";
      apiKeys: string[];
    }
  | {
      status: "brand-api-key-missing";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl">;
      resolvedFrom?: undefined;
      apiKeys: [];
    };

export type BrandRuntimeAccessSummary =
  | {
      status: "brand-context-missing" | "no-platform-match";
      platform?: undefined;
      openClawCanUse: false;
      effectiveApiKeyMasked: "";
      resolvedFrom?: undefined;
    }
  | {
      status: "resolved";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl" | "websiteUrl" | "defaultModel">;
      openClawCanUse: true;
      effectiveApiKeyMasked: string;
      resolvedFrom: "brand" | "local-env";
    }
  | {
      status: "brand-api-key-missing";
      platform: Pick<ThirdPartyPlatformRecord, "id" | "name" | "baseUrl" | "websiteUrl" | "defaultModel">;
      openClawCanUse: false;
      effectiveApiKeyMasked: "";
      resolvedFrom?: undefined;
    };

type ThirdPartyPlatformRow = {
  id: string;
  name: string;
  providerType: ThirdPartyPlatformRecord["providerType"];
  status: ThirdPartyPlatformRecord["status"];
  baseUrl: string;
  websiteUrl: string;
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

type ThirdPartyPlatformGroup = {
  platform: ThirdPartyPlatformRecord;
  aliasIds: string[];
};

@Injectable()
export class ThirdPartyPlatformsService {
  private bootstrapPromise?: Promise<void>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly chanjingOpenApiService: ChanjingOpenApiService,
  ) {}

  async listPlatforms() {
    return (await this.listPlatformGroups()).map((item) => item.platform);
  }

  private async listPlatformsRaw() {
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
    const normalizedPlatformId = String(platformId || "").trim();
    if (!normalizedPlatformId) {
      return undefined;
    }
    const rawPlatform = (await this.listPlatformsRaw()).find((item) => item.id === normalizedPlatformId);
    if (rawPlatform) {
      return rawPlatform;
    }
    return (await this.listPlatformGroups()).find((item) => item.aliasIds.includes(normalizedPlatformId))?.platform;
  }

  async createPlatform(payload: CreateThirdPartyPlatformPayload) {
    const nextRecord = this.buildPlatformRecord({
      id: `third_party_platform_${Date.now()}`,
      name: payload.name,
      providerType: payload.providerType,
      status: payload.status || "DRAFT",
      baseUrl: payload.baseUrl,
      websiteUrl: payload.websiteUrl || "",
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
          "websiteUrl",
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
          ${nextRecord.websiteUrl},
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
      websiteUrl: payload.websiteUrl ?? current.websiteUrl,
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
          "websiteUrl" = ${nextRecord.websiteUrl},
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
    const group = await this.getPlatformGroupById(platformId);
    const current = group?.platform || await this.getPlatformById(platformId);
    if (!current) {
      throw new NotFoundException("第三方平台不存在");
    }
    const targetIds = group?.aliasIds.length ? group.aliasIds : [platformId];

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      await this.prismaService.$queryRawUnsafe(
        `DELETE FROM "BrandThirdPartyPlatformSecret" WHERE "platformId" = ANY($1::text[])`,
        targetIds,
      );
      const rows = await this.prismaService.$queryRaw<ThirdPartyPlatformRow[]>`
        DELETE FROM "ThirdPartyPlatformConfig"
        WHERE "id" = ANY (${targetIds}::text[])
        RETURNING *
      `;
      return this.normalizePlatformRow(rows[0] ?? current);
    }

    const targetIdSet = new Set(targetIds);
    database.thirdPartyPlatforms = (database.thirdPartyPlatforms || []).filter((item) => !targetIdSet.has(item.id));
    database.brandThirdPartyPlatformSecrets = (database.brandThirdPartyPlatformSecrets || []).filter(
      (item) => !targetIdSet.has(item.platformId),
    );
    return current;
  }

  async listUserPlatforms(_userId: string, brandId: string) {
    const [platformGroups, secrets] = await Promise.all([this.listPlatformGroups(), this.listBrandSecrets(brandId)]);
    return Promise.all(platformGroups.map(async ({ platform, aliasIds }) => {
      const aliasIdSet = new Set(aliasIds);
      const secret = secrets.find((entry) => aliasIdSet.has(entry.platformId));
      const apiKey = secret?.apiKey || "";
      const dynamicStats = await this.buildDynamicStats(platform, apiKey);
      return {
        ...platform,
        apiKey,
        effectiveApiKeyMasked: this.maskSecret(apiKey),
        dynamicStats,
      } satisfies UserThirdPartyPlatformRecord;
    }));
  }

  async updateBrandPlatformSecret(brandId: string, platformId: string, payload: UpdateBrandThirdPartyPlatformSecretPayload) {
    const group = await this.getPlatformGroupById(platformId);
    const platform = group?.platform || await this.getPlatformById(platformId);
    if (!platform) {
      throw new NotFoundException("第三方平台不存在");
    }
    const targetPlatformIds = group?.aliasIds.length ? group.aliasIds : [platform.id];

    const nextApiKey = String(payload.apiKey || "").trim();

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTablesReady();
      const existing = await this.findBrandPlatformSecretByPlatforms(brandId, targetPlatformIds);

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
          ${platform.id},
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
      (item) => item.brandId === brandId && targetPlatformIds.includes(item.platformId),
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

  async inspectBrandRuntimeAccess(
    brandId: string | undefined,
    options?: {
      platformId?: string;
      baseUrls?: string[];
      platformName?: string;
    },
  ): Promise<BrandRuntimeAccessSummary> {
    const normalizedBrandId = String(brandId || "").trim();
    if (!normalizedBrandId) {
      return {
        status: "brand-context-missing",
        openClawCanUse: false,
        effectiveApiKeyMasked: "",
      };
    }

    const normalizedPlatformId = String(options?.platformId || "").trim();
    const normalizedPlatformName = String(options?.platformName || "").trim().toLowerCase();
    const normalizedBaseUrls = Array.from(new Set((options?.baseUrls || []).map((item) => String(item || "").trim()).filter(Boolean)));
    // #region debug-point B:duoyuanx-inspect-runtime-enter
    await reportDuoyuanxPlatformMatchDebugEvent({
      sessionId: "duoyuanx-platform-match",
      runId: "pre-fix",
      hypothesisId: "B",
      location: "third-party-platforms.service.ts:inspectBrandRuntimeAccess:enter",
      msg: "[DEBUG] ThirdPartyPlatformsService inspect runtime access entered",
      data: {
        brandId: normalizedBrandId,
        platformId: normalizedPlatformId,
        platformName: normalizedPlatformName,
        baseUrls: normalizedBaseUrls,
      },
    });
    // #endregion

    // #region debug-point RC-C:inspect-brand-runtime-enter
    await reportRightCodesOpenClawDebugEvent({
      sessionId: "right-codes-openclaw",
      runId: "pre-fix",
      hypothesisId: "C",
      location: "third-party-platforms.service.ts:inspectBrandRuntimeAccess:enter",
      msg: "[DEBUG] ThirdPartyPlatformsService inspect runtime access entered",
      data: {
        brandId: normalizedBrandId,
        platformId: normalizedPlatformId,
        platformName: normalizedPlatformName,
        baseUrls: normalizedBaseUrls,
      },
    });
    // #endregion

    const platformGroups = await this.listPlatformGroups();
    const platformNameMatchTerms = this.resolvePlatformNameMatchTerms(normalizedPlatformName);
    const matchedGroup = normalizedPlatformId
      ? platformGroups.find((item) => item.aliasIds.includes(normalizedPlatformId))
      : normalizedBaseUrls.length
        ? platformGroups.find((item) => {
            const candidateBaseUrls = [item.platform.baseUrl, item.platform.websiteUrl]
              .filter(Boolean)
              .map((value) => this.normalizeBaseUrl(value));
            return normalizedBaseUrls.some((value) => candidateBaseUrls.includes(this.normalizeBaseUrl(value)));
          })
        : normalizedPlatformName
          ? platformGroups.find((item) => {
              const candidates = this.buildPlatformNameMatchCandidates(item.platform);
              return platformNameMatchTerms.some((term) =>
                candidates.some((value) => value === term || value.includes(term) || term.includes(value)),
              );
            })
          : undefined;

    // #region debug-point B:duoyuanx-inspect-runtime-match
    await reportDuoyuanxPlatformMatchDebugEvent({
      sessionId: "duoyuanx-platform-match",
      runId: "pre-fix",
      hypothesisId: "B",
      location: "third-party-platforms.service.ts:inspectBrandRuntimeAccess:match",
      msg: "[DEBUG] ThirdPartyPlatformsService runtime access platform match resolved",
      data: {
        brandId: normalizedBrandId,
        normalizedPlatformId,
        normalizedPlatformName,
        platformNameMatchTerms,
        normalizedBaseUrls,
        matched: Boolean(matchedGroup),
        candidatePlatformNames: platformGroups.slice(0, 20).map((item) => item.platform.name),
        matchedPlatform: matchedGroup
          ? {
              id: matchedGroup.platform.id,
              name: matchedGroup.platform.name,
              baseUrl: matchedGroup.platform.baseUrl,
              websiteUrl: matchedGroup.platform.websiteUrl,
              aliasIds: matchedGroup.aliasIds,
            }
          : null,
      },
    });
    // #endregion

    // #region debug-point RC-D:inspect-brand-runtime-match
    await reportRightCodesOpenClawDebugEvent({
      sessionId: "right-codes-openclaw",
      runId: "pre-fix",
      hypothesisId: "D",
      location: "third-party-platforms.service.ts:inspectBrandRuntimeAccess:match",
      msg: "[DEBUG] ThirdPartyPlatformsService runtime access platform match resolved",
      data: {
        brandId: normalizedBrandId,
        normalizedPlatformId,
        normalizedPlatformName,
        platformNameMatchTerms,
        normalizedBaseUrls,
        matched: Boolean(matchedGroup),
        matchedPlatform: matchedGroup
          ? {
              id: matchedGroup.platform.id,
              name: matchedGroup.platform.name,
              baseUrl: matchedGroup.platform.baseUrl,
              websiteUrl: matchedGroup.platform.websiteUrl,
              aliasIds: matchedGroup.aliasIds,
            }
          : null,
      },
    });
    // #endregion

    if (!matchedGroup) {
      return {
        status: "no-platform-match",
        openClawCanUse: false,
        effectiveApiKeyMasked: "",
      };
    }

    const resolution = await this.resolveRuntimeAccessForPlatformGroup(normalizedBrandId, matchedGroup.platform, matchedGroup.aliasIds);
    return {
      ...resolution,
      platform: resolution.platform
        ? {
            ...resolution.platform,
            websiteUrl: matchedGroup.platform.websiteUrl,
            defaultModel: matchedGroup.platform.defaultModel,
          }
        : undefined,
    } as BrandRuntimeAccessSummary;
  }

  async listBrandRuntimeAccessSummaries(brandId: string | undefined) {
    const normalizedBrandId = String(brandId || "").trim();
    if (!normalizedBrandId) {
      return [];
    }
    const platformGroups = await this.listPlatformGroups();
    return Promise.all(platformGroups.map(async (group) => {
      const resolution = await this.resolveRuntimeAccessForPlatformGroup(normalizedBrandId, group.platform, group.aliasIds);
      return {
        platformId: group.platform.id,
        aliasIds: group.aliasIds,
        platformName: group.platform.name,
        baseUrl: group.platform.baseUrl,
        websiteUrl: group.platform.websiteUrl,
        defaultModel: group.platform.defaultModel,
        status: resolution.status,
        openClawCanUse: resolution.openClawCanUse,
        resolvedFrom: resolution.resolvedFrom,
        effectiveApiKeyMasked: resolution.effectiveApiKeyMasked,
      };
    }));
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
      const envApiKeys = this.resolveLocalEnvApiKeysForPlatform(platform);
      if (envApiKeys.length) {
        return {
          status: "resolved",
          platform: {
            id: platform.id,
            name: platform.name,
            baseUrl: platform.baseUrl,
          },
          resolvedFrom: "local-env",
          apiKeys: envApiKeys,
        };
      }
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
      resolvedFrom: "brand",
      apiKeys: [apiKey],
    };
  }

  private async resolveRuntimeAccessForPlatformGroup(
    brandId: string,
    platform: ThirdPartyPlatformRecord,
    aliasIds: string[],
  ): Promise<BrandRuntimeAccessSummary> {
    const secret = await this.findBrandPlatformSecretByPlatforms(brandId, aliasIds);
    const apiKey = String(secret?.apiKey || "").trim();
    // #region debug-point RC-E:resolve-runtime-secret
    await reportRightCodesOpenClawDebugEvent({
      sessionId: "right-codes-openclaw",
      runId: "pre-fix",
      hypothesisId: "E",
      location: "third-party-platforms.service.ts:resolveRuntimeAccessForPlatformGroup:secret",
      msg: "[DEBUG] ThirdPartyPlatformsService runtime secret resolution checked",
      data: {
        brandId,
        platformId: platform.id,
        platformName: platform.name,
        baseUrl: platform.baseUrl,
        aliasIds,
        hasBrandSecret: Boolean(apiKey),
      },
    });
    // #endregion
    if (apiKey) {
      return {
        status: "resolved",
        platform: {
          id: platform.id,
          name: platform.name,
          baseUrl: platform.baseUrl,
          websiteUrl: platform.websiteUrl,
          defaultModel: platform.defaultModel,
        },
        openClawCanUse: true,
        effectiveApiKeyMasked: this.maskSecret(apiKey),
        resolvedFrom: "brand",
      };
    }

    const envApiKeys = this.resolveLocalEnvApiKeysForPlatform(platform);
    // #region debug-point RC-F:resolve-runtime-env
    await reportRightCodesOpenClawDebugEvent({
      sessionId: "right-codes-openclaw",
      runId: "pre-fix",
      hypothesisId: "F",
      location: "third-party-platforms.service.ts:resolveRuntimeAccessForPlatformGroup:env",
      msg: "[DEBUG] ThirdPartyPlatformsService runtime env resolution checked",
      data: {
        brandId,
        platformId: platform.id,
        platformName: platform.name,
        baseUrl: platform.baseUrl,
        envKeyCount: envApiKeys.length,
        nodeEnv: String(process.env.NODE_ENV || ""),
      },
    });
    // #endregion
    if (envApiKeys.length) {
      return {
        status: "resolved",
        platform: {
          id: platform.id,
          name: platform.name,
          baseUrl: platform.baseUrl,
          websiteUrl: platform.websiteUrl,
          defaultModel: platform.defaultModel,
        },
        openClawCanUse: true,
        effectiveApiKeyMasked: this.maskSecret(envApiKeys[0] || ""),
        resolvedFrom: "local-env",
      };
    }

    return {
      status: "brand-api-key-missing",
      platform: {
        id: platform.id,
        name: platform.name,
        baseUrl: platform.baseUrl,
        websiteUrl: platform.websiteUrl,
        defaultModel: platform.defaultModel,
      },
      openClawCanUse: false,
      effectiveApiKeyMasked: "",
    };
  }

  private resolveLocalEnvApiKeysForPlatform(platform: Pick<ThirdPartyPlatformRecord, "baseUrl"> | undefined) {
    if (!platform || process.env.NODE_ENV === "production") {
      return [];
    }

    let host = "";
    try {
      host = new URL(platform.baseUrl).host.toLowerCase();
    } catch {
      return [];
    }

    if (host === "openspeech.bytedance.com") {
      const apiKeys = [
        String(process.env.VOLCENGINE_SPEECH_API_KEY || "").trim(),
        String(process.env.DOUBAO_SPEECH_API_KEY || "").trim(),
        String(process.env.DOUBAO_STT_API_KEY || "").trim(),
      ].filter(Boolean);
      const appId = String(process.env.DOUBAO_STT_APP_ID || process.env.VOLCENGINE_SPEECH_APP_ID || "").trim();
      const accessKey = String(
        process.env.DOUBAO_STT_ACCESS_KEY || process.env.DOUBAO_STT_ACCESS_TOKEN || process.env.VOLCENGINE_SPEECH_ACCESS_KEY || "",
      ).trim();
      if (appId && accessKey) {
        apiKeys.push(`${appId}::${accessKey}`);
      }
      return Array.from(new Set(apiKeys));
    }

    const envKeysByHost: Record<string, string[]> = {
      "api.apiz.ai": ["APIZ_API_KEY", "NEX_AI_API_KEY"],
      "api.deepseek.com": ["DEEPSEEK_API_KEY"],
      "api.moonshot.cn": ["KIMI_API_KEY", "MOONSHOT_API_KEY"],
      "api.tikhub.io": ["TIKHUB_API_KEY"],
      "api.xskill.ai": ["APIZ_API_KEY", "NEX_AI_API_KEY"],
      "ark.cn-beijing.volces.com": ["ARK_API_KEY", "VOLCENGINE_ARK_API_KEY", "DOUBAO_API_KEY"],
      "open.volcengineapi.com": ["VOLCENGINE_MUSIC_OPENAPI_CREDENTIAL", "VOLCENGINE_MUSIC_API_CREDENTIAL", "VOLCENGINE_OPENAPI_AKSK"],
      "open.bigmodel.cn": ["GLM_API_KEY", "ZHIPU_API_KEY"],
      "www.right.codes": ["RIGHT_CODES_API_KEY", "RIGHTAPI_API_KEY"],
      "www.rightapi.ai": ["RIGHT_CODES_API_KEY", "RIGHTAPI_API_KEY"],
    };

    const directEnvValues = Array.from(
      new Set(
        (envKeysByHost[host] || [])
          .map((envName) => String(process.env[envName] || "").trim())
          .filter(Boolean),
      ),
    );
    if (host !== "open.volcengineapi.com") {
      return directEnvValues;
    }

    const accessKeyId = String(
      process.env.VOLCENGINE_MUSIC_ACCESS_KEY_ID
      || process.env.VOLCENGINE_ACCESS_KEY_ID
      || process.env.VOLCENGINE_AK
      || "",
    ).trim();
    const secretAccessKey = String(
      process.env.VOLCENGINE_MUSIC_SECRET_ACCESS_KEY
      || process.env.VOLCENGINE_SECRET_ACCESS_KEY
      || process.env.VOLCENGINE_SK
      || "",
    ).trim();
    const combinedCredential = accessKeyId && secretAccessKey ? `${accessKeyId}::${secretAccessKey}` : "";
    return Array.from(new Set([
      ...directEnvValues,
      combinedCredential,
    ].filter(Boolean)));
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
    const platforms = await this.listPlatformsRaw();
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

  private async listPlatformGroups(): Promise<ThirdPartyPlatformGroup[]> {
    return this.collapsePlatformGroups(await this.listPlatformsRaw());
  }

  private async getPlatformGroupById(platformId: string) {
    const normalizedPlatformId = String(platformId || "").trim();
    if (!normalizedPlatformId) {
      return undefined;
    }
    return (await this.listPlatformGroups()).find((item) => item.aliasIds.includes(normalizedPlatformId));
  }

  private collapsePlatformGroups(platforms: ThirdPartyPlatformRecord[]): ThirdPartyPlatformGroup[] {
    const groups = new Map<string, ThirdPartyPlatformGroup>();
    for (const platform of platforms) {
      const groupKey = this.resolvePlatformGroupKey(platform);
      const current = groups.get(groupKey);
      if (!current) {
        groups.set(groupKey, {
          platform: {
            ...platform,
            modelIds: [...platform.modelIds],
          },
          aliasIds: [platform.id],
        });
        continue;
      }

      current.aliasIds = Array.from(new Set([...current.aliasIds, platform.id]));
      current.platform = {
        ...current.platform,
        name: current.platform.name || platform.name,
        providerType:
          current.platform.providerType === platform.providerType
            ? current.platform.providerType
            : "CUSTOM",
        status: this.pickHigherStatus(current.platform.status, platform.status),
        baseUrl: this.pickPreferredPlatformBaseUrl(current.platform.baseUrl, platform.baseUrl),
        websiteUrl: current.platform.websiteUrl || platform.websiteUrl,
        tutorialUrl: current.platform.tutorialUrl || platform.tutorialUrl,
        modelIds: Array.from(new Set([...current.platform.modelIds, ...platform.modelIds])),
        defaultModel: current.platform.defaultModel || platform.defaultModel,
        remark: current.platform.remark || platform.remark,
        updatedAt:
          new Date(platform.updatedAt).getTime() > new Date(current.platform.updatedAt).getTime()
            ? platform.updatedAt
            : current.platform.updatedAt,
      };
    }
    return Array.from(groups.values());
  }

  private resolvePlatformGroupKey(platform: Pick<ThirdPartyPlatformRecord, "baseUrl" | "websiteUrl">) {
    const normalizedWebsiteUrl = this.canonicalizeRightCodesBaseUrl(
      this.normalizeBaseUrl(platform.websiteUrl || resolvePlatformWebsiteUrl(platform.baseUrl)),
    );
    if (normalizedWebsiteUrl) {
      return `website:${normalizedWebsiteUrl}`;
    }
    const baseHost = this.canonicalizeRightCodesHost(this.extractHost(platform.baseUrl));
    return baseHost ? `host:${baseHost}` : `base:${this.normalizeBaseUrl(platform.baseUrl)}`;
  }

  private pickHigherStatus(
    current: ThirdPartyPlatformRecord["status"],
    next: ThirdPartyPlatformRecord["status"],
  ): ThirdPartyPlatformRecord["status"] {
    const weights: Record<ThirdPartyPlatformRecord["status"], number> = {
      ACTIVE: 3,
      DRAFT: 2,
      DISABLED: 1,
    };
    return weights[next] > weights[current] ? next : current;
  }

  private pickPreferredPlatformBaseUrl(current: string, next: string) {
    return this.getPlatformBaseUrlPriority(next) > this.getPlatformBaseUrlPriority(current) ? next : current;
  }

  private getPlatformBaseUrlPriority(value: string) {
    const normalized = this.normalizeBaseUrl(value);
    if (!normalized) {
      return 0;
    }
    if (normalized === "https://api.xskill.ai") {
      return 100;
    }
    if (normalized === "https://api.apiz.ai") {
      return 90;
    }
    if (normalized === "https://www.rightapi.ai/codex") {
      return 100;
    }
    if (normalized === "https://www.rightapi.ai/draw") {
      return 90;
    }
    return 10;
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
      websiteUrl: String(input.websiteUrl || "").trim() || resolvePlatformWebsiteUrl(String(input.baseUrl || "").trim()),
      tutorialUrl: String(input.tutorialUrl || "").trim(),
      modelIds,
      defaultModel,
      remark: String(input.remark || "").trim(),
      updatedAt: this.normalizeDate(input.updatedAt),
    };
  }

  private resolvePlatformNameMatchTerms(value: string) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    const terms = new Set([normalized]);
    if (normalized.includes("多元探索") || normalized.includes("duoyuanx")) {
      ["多元探索", "多元探索平台", "duoyuanx", "duoyuanx.com"].forEach((item) => terms.add(item.toLowerCase()));
    }
    if (normalized.includes("apiz") || normalized.includes("xskill") || normalized.includes("nex ai")) {
      ["apiz", "apiz / nex ai 平台", "xskill", "api.xskill.ai", "api.apiz.ai"].forEach((item) => terms.add(item.toLowerCase()));
    }
    return Array.from(terms);
  }

  private buildPlatformNameMatchCandidates(platform: Pick<ThirdPartyPlatformRecord, "name" | "baseUrl" | "websiteUrl">) {
    return Array.from(new Set(
      [
        String(platform.name || "").trim().toLowerCase(),
        this.normalizeBaseUrl(platform.baseUrl),
        this.normalizeBaseUrl(platform.websiteUrl),
        this.extractHost(platform.baseUrl),
        this.extractHost(platform.websiteUrl),
      ].filter(Boolean),
    ));
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
      websiteUrl: "websiteUrl" in row ? row.websiteUrl : "",
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
      target.host = this.canonicalizeRightCodesHost(target.host);
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
      return this.canonicalizeRightCodesHost(new URL(this.ensureUrlProtocol(normalized)).host);
    } catch {
      const matched = normalized.match(/^(?:[a-z]+:\/\/)?([^/]+)/i);
      return this.canonicalizeRightCodesHost(matched?.[1] || "");
    }
  }

  private canonicalizeRightCodesHost(value: string) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "www.right.codes" || normalized === "right.codes" || normalized === "rightapi.ai") {
      return "www.rightapi.ai";
    }
    return normalized;
  }

  private canonicalizeRightCodesBaseUrl(value: string) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) {
      return "";
    }
    return normalized
      .replace("https://www.right.codes/", "https://www.rightapi.ai/")
      .replace("https://right.codes/", "https://www.rightapi.ai/")
      .replace("https://rightapi.ai/", "https://www.rightapi.ai/");
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
        "websiteUrl" TEXT NOT NULL DEFAULT '',
        "tutorialUrl" TEXT NOT NULL DEFAULT '',
        "modelIdsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "defaultModel" TEXT NOT NULL DEFAULT '',
        "remark" TEXT NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ThirdPartyPlatformConfig" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT NOT NULL DEFAULT ''`,
    );
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
          "websiteUrl",
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
          ${item.websiteUrl},
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
    const nextStatus = current.status === "DISABLED"
      ? current.status
      : seed.status === "ACTIVE" && current.status === "DRAFT"
        ? "ACTIVE"
        : current.status || seed.status;
    const nextBaseUrl = this.resolveSystemSeedBaseUrl(current.baseUrl, seed.baseUrl);
    const nextWebsiteUrl = current.websiteUrl || seed.websiteUrl || resolvePlatformWebsiteUrl(nextBaseUrl);
    const nextTutorialUrl = current.tutorialUrl || seed.tutorialUrl || "";
    const nextDefaultModel = (current.status === "DRAFT" && nextStatus === "ACTIVE")
      ? (seed.defaultModel || current.defaultModel || "")
      : (current.defaultModel || seed.defaultModel || "");
    const nextRemark = current.remark || seed.remark || "";
    const currentModelIdsJson = JSON.stringify(current.modelIds || []);
    const nextModelIdsJson = JSON.stringify(nextModelIds);
    if (
      current.name === nextName
      && current.providerType === nextProviderType
      && current.status === nextStatus
      && current.baseUrl === nextBaseUrl
      && current.websiteUrl === nextWebsiteUrl
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
        "websiteUrl" = ${nextWebsiteUrl},
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
