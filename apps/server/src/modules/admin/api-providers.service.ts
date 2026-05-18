import { Injectable, NotFoundException } from "@nestjs/common";
import {
  DECOMMISSIONED_SYSTEM_API_PROVIDER_IDS,
  LEGACY_API_PROVIDER_IDS,
  RUNNINGHUB_BASE_URL,
  RUNNINGHUB_RESULT_QUERY_DOC_URL,
  RUNNINGHUB_RESULT_QUERY_PATH,
  SYSTEM_API_PROVIDER_SEEDS,
} from "../../common/api-provider-catalog";
import { isDecommissionedPlatformBaseUrl } from "../../common/third-party-platform-catalog";
import { database, type ApiProviderRecord } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

export type CreateApiProviderPayload = {
  name: string;
  providerType: ApiProviderRecord["providerType"];
  baseUrl: string;
  tutorialUrl?: string;
  modelWhitelist?: string[];
  apiKey?: string;
  defaultModel?: string;
  organization?: string;
  project?: string;
  timeoutMs?: number;
  streamEnabled?: boolean;
  customHeaders?: Record<string, string>;
  extraParams?: Record<string, unknown>;
  remark?: string;
};

export type UpdateApiProviderPayload = {
  status?: ApiProviderRecord["status"];
  baseUrl?: string;
  tutorialUrl?: string;
  modelWhitelist?: string[];
  apiKey?: string;
  defaultModel?: string;
  organization?: string;
  project?: string;
  timeoutMs?: number;
  streamEnabled?: boolean;
  customHeaders?: Record<string, string>;
  extraParams?: Record<string, unknown>;
  remark?: string;
};

type ApiProviderRow = {
  id: string;
  name: string;
  providerType: ApiProviderRecord["providerType"];
  status: ApiProviderRecord["status"];
  baseUrl: string;
  tutorialUrl: string;
  modelWhitelistJson: unknown;
  apiKey: string;
  defaultModel: string;
  organization: string;
  project: string;
  timeoutMs: number;
  streamEnabled: boolean;
  customHeadersJson: unknown;
  extraParamsJson: unknown;
  remark: string;
  successRate: number;
  requestCount24h: number;
  totalCostYuan: number;
  lastCalledAt: Date | string;
  updatedAt: Date | string;
};

@Injectable()
export class ApiProvidersService {
  private bootstrapPromise?: Promise<void>;

  constructor(private readonly prismaService: PrismaService) {}

  async listProviders() {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<ApiProviderRow[]>`
        SELECT *
        FROM "ApiProviderConfig"
        ORDER BY "updatedAt" DESC
      `;
      return rows.map((item) => this.normalizeRow(item));
    }

    return [...database.apiProviders]
      .map((item) => ({ ...item }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listActiveProviders() {
    return (await this.listProviders()).filter((item) => item.status === "ACTIVE");
  }

  async findActiveProviderByRuntimeKey(runtimeKey: string) {
    const normalizedKey = runtimeKey.trim();
    return (await this.listActiveProviders()).find((item) => this.getRuntimeKey(item) === normalizedKey);
  }

  async listActiveProvidersByRuntimeKey(runtimeKey: string) {
    const normalizedKey = runtimeKey.trim();
    return (await this.listActiveProviders()).filter((item) => this.getRuntimeKey(item) === normalizedKey);
  }

  getRuntimeKey(provider: ApiProviderRecord) {
    return this.getStringExtra(provider, "runtimeKey");
  }

  getRuntimeTags(provider: ApiProviderRecord) {
    return this.getStringArrayExtra(provider, "runtimeTags");
  }

  getBaseUrls(provider: ApiProviderRecord) {
    const baseUrls = this.getStringArrayExtra(provider, "baseUrls");
    if (baseUrls.length) {
      return baseUrls;
    }
    return provider.baseUrl ? [provider.baseUrl] : [];
  }

  getApiKeys(provider: ApiProviderRecord) {
    const apiKeys = this.getStringArrayExtra(provider, "apiKeys");
    if (apiKeys.length) {
      return apiKeys;
    }
    return provider.apiKey ? [provider.apiKey] : [];
  }

  getStringExtra(provider: ApiProviderRecord, key: string) {
    const value = provider.extraParams?.[key];
    return typeof value === "string" ? value.trim() : "";
  }

  getStringArrayExtra(provider: ApiProviderRecord, key: string) {
    const value = provider.extraParams?.[key];
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  getBooleanExtra(provider: ApiProviderRecord, key: string) {
    const value = provider.extraParams?.[key];
    return value === true;
  }

  getNumberExtra(provider: ApiProviderRecord, key: string) {
    const value = provider.extraParams?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  async createProvider(payload: CreateApiProviderPayload) {
    const now = new Date().toISOString();
    const record = this.buildRecord({
      id: `provider_${Date.now()}`,
      name: payload.name,
      providerType: payload.providerType,
      status: "DRAFT",
      baseUrl: payload.baseUrl,
      tutorialUrl: payload.tutorialUrl || "",
      modelWhitelist: payload.modelWhitelist || [],
      apiKey: payload.apiKey || "",
      defaultModel: payload.defaultModel || "",
      organization: payload.organization || "",
      project: payload.project || "",
      timeoutMs: Number(payload.timeoutMs || 60000),
      streamEnabled: payload.streamEnabled ?? false,
      customHeaders: this.normalizeStringMap(payload.customHeaders),
      extraParams: this.normalizeObjectMap(payload.extraParams),
      remark: payload.remark || "",
      successRate: 0,
      requestCount24h: 0,
      totalCostYuan: 0,
      lastCalledAt: now,
      updatedAt: now,
    });

    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<ApiProviderRow[]>`
        INSERT INTO "ApiProviderConfig" (
          "id",
          "name",
          "providerType",
          "status",
          "baseUrl",
          "tutorialUrl",
          "modelWhitelistJson",
          "apiKey",
          "defaultModel",
          "organization",
          "project",
          "timeoutMs",
          "streamEnabled",
          "customHeadersJson",
          "extraParamsJson",
          "remark",
          "successRate",
          "requestCount24h",
          "totalCostYuan",
          "lastCalledAt",
          "updatedAt"
        )
        VALUES (
          ${record.id},
          ${record.name},
          ${record.providerType},
          ${record.status},
          ${record.baseUrl},
          ${record.tutorialUrl},
          ${JSON.stringify(record.modelWhitelist)}::jsonb,
          ${record.apiKey},
          ${record.defaultModel},
          ${record.organization},
          ${record.project},
          ${record.timeoutMs},
          ${record.streamEnabled},
          ${JSON.stringify(record.customHeaders)}::jsonb,
          ${JSON.stringify(record.extraParams)}::jsonb,
          ${record.remark},
          ${record.successRate},
          ${record.requestCount24h},
          ${record.totalCostYuan},
          ${new Date(record.lastCalledAt)},
          ${new Date(record.updatedAt)}
        )
        RETURNING *
      `;
      return this.normalizeRow(rows[0] ?? record);
    }

    database.apiProviders.unshift(record);
    return record;
  }

  async updateProvider(id: string, payload: UpdateApiProviderPayload) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const current = await this.findById(id);
      if (!current) {
        throw new NotFoundException("API Provider 不存在");
      }

      const rows = await this.prismaService.$queryRaw<ApiProviderRow[]>`
        UPDATE "ApiProviderConfig"
        SET
          "status" = ${payload.status ?? current.status},
          "baseUrl" = ${payload.baseUrl ?? current.baseUrl},
          "tutorialUrl" = ${payload.tutorialUrl ?? current.tutorialUrl},
          "modelWhitelistJson" = ${JSON.stringify(payload.modelWhitelist ?? current.modelWhitelist)}::jsonb,
          "apiKey" = ${payload.apiKey ?? current.apiKey},
          "defaultModel" = ${payload.defaultModel ?? current.defaultModel},
          "organization" = ${payload.organization ?? current.organization},
          "project" = ${payload.project ?? current.project},
          "timeoutMs" = ${payload.timeoutMs ?? current.timeoutMs},
          "streamEnabled" = ${payload.streamEnabled ?? current.streamEnabled},
          "customHeadersJson" = ${JSON.stringify(this.normalizeStringMap(payload.customHeaders ?? current.customHeaders))}::jsonb,
          "extraParamsJson" = ${JSON.stringify(this.normalizeObjectMap(payload.extraParams ?? current.extraParams))}::jsonb,
          "remark" = ${payload.remark ?? current.remark},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
        RETURNING *
      `;
      return this.normalizeRow(rows[0] ?? current);
    }

    const provider = database.apiProviders.find((item) => item.id === id);
    if (!provider) {
      throw new NotFoundException("API Provider 不存在");
    }

    if (payload.status) {
      provider.status = payload.status;
    }
    if (payload.baseUrl !== undefined) {
      provider.baseUrl = payload.baseUrl;
    }
    if (payload.tutorialUrl !== undefined) {
      provider.tutorialUrl = payload.tutorialUrl;
    }
    if (payload.modelWhitelist !== undefined) {
      provider.modelWhitelist = payload.modelWhitelist;
    }
    if (payload.apiKey !== undefined) {
      provider.apiKey = payload.apiKey;
    }
    if (payload.defaultModel !== undefined) {
      provider.defaultModel = payload.defaultModel;
    }
    if (payload.organization !== undefined) {
      provider.organization = payload.organization;
    }
    if (payload.project !== undefined) {
      provider.project = payload.project;
    }
    if (payload.timeoutMs !== undefined) {
      provider.timeoutMs = Number(payload.timeoutMs || 0);
    }
    if (payload.streamEnabled !== undefined) {
      provider.streamEnabled = payload.streamEnabled;
    }
    if (payload.customHeaders !== undefined) {
      provider.customHeaders = this.normalizeStringMap(payload.customHeaders);
    }
    if (payload.extraParams !== undefined) {
      provider.extraParams = this.normalizeObjectMap(payload.extraParams);
    }
    if (payload.remark !== undefined) {
      provider.remark = payload.remark;
    }
    provider.updatedAt = new Date().toISOString();

    return { ...provider };
  }

  async archiveProvider(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<ApiProviderRow[]>`
        UPDATE "ApiProviderConfig"
        SET
          "status" = 'DISABLED',
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id}
        RETURNING *
      `;
      if (!rows[0]) {
        throw new NotFoundException("API Provider 不存在");
      }
      return this.normalizeRow(rows[0]);
    }

    const provider = database.apiProviders.find((item) => item.id === id);
    if (!provider) {
      throw new NotFoundException("API Provider 不存在");
    }

    provider.status = "DISABLED";
    provider.updatedAt = new Date().toISOString();
    return { ...provider };
  }

  async deleteProvider(id: string) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<ApiProviderRow[]>`
        DELETE FROM "ApiProviderConfig"
        WHERE "id" = ${id}
        RETURNING *
      `;
      if (!rows[0]) {
        throw new NotFoundException("API Provider 不存在");
      }
      return this.normalizeRow(rows[0]);
    }

    const index = database.apiProviders.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("API Provider 不存在");
    }

    const [removed] = database.apiProviders.splice(index, 1);
    return removed;
  }

  private async ensureTableReady() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapTable();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapTable() {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
    }

    await this.prismaService.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ApiProviderConfig" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "providerType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "baseUrl" TEXT NOT NULL DEFAULT '',
        "tutorialUrl" TEXT NOT NULL DEFAULT '',
        "modelWhitelistJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "apiKey" TEXT NOT NULL DEFAULT '',
        "defaultModel" TEXT NOT NULL DEFAULT '',
        "organization" TEXT NOT NULL DEFAULT '',
        "project" TEXT NOT NULL DEFAULT '',
        "timeoutMs" INTEGER NOT NULL DEFAULT 60000,
        "streamEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
        "customHeadersJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "extraParamsJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "remark" TEXT NOT NULL DEFAULT '',
        "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "requestCount24h" INTEGER NOT NULL DEFAULT 0,
        "totalCostYuan" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "lastCalledAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "tutorialUrl" TEXT NOT NULL DEFAULT ''`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "modelWhitelistJson" JSONB NOT NULL DEFAULT '[]'::jsonb`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "apiKey" TEXT NOT NULL DEFAULT ''`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "defaultModel" TEXT NOT NULL DEFAULT ''`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "organization" TEXT NOT NULL DEFAULT ''`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "project" TEXT NOT NULL DEFAULT ''`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "timeoutMs" INTEGER NOT NULL DEFAULT 60000`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "streamEnabled" BOOLEAN NOT NULL DEFAULT FALSE`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "customHeadersJson" JSONB NOT NULL DEFAULT '{}'::jsonb`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "extraParamsJson" JSONB NOT NULL DEFAULT '{}'::jsonb`,
    );
    await this.prismaService.$executeRawUnsafe(
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "remark" TEXT NOT NULL DEFAULT ''`,
    );

    await this.bootstrapSystemProviders();
  }

  private async findById(id: string) {
    const rows = await this.prismaService.$queryRaw<ApiProviderRow[]>`
      SELECT *
      FROM "ApiProviderConfig"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    return rows[0] ? this.normalizeRow(rows[0]) : undefined;
  }

  private async bootstrapSystemProviders() {
    const existingRows = await this.prismaService.$queryRaw<ApiProviderRow[]>`
      SELECT *
      FROM "ApiProviderConfig"
    `;
    const existingProviders = existingRows.map((item) => this.normalizeRow(item));
    const existingById = new Map(existingProviders.map((item) => [item.id, item]));
    const existingIds = new Set(existingProviders.map((item) => item.id));
    const hasSystemSeed = SYSTEM_API_PROVIDER_SEEDS.some((item) => existingIds.has(item.id));

    if (!hasSystemSeed && LEGACY_API_PROVIDER_IDS.some((item) => existingIds.has(item))) {
      await this.prismaService.$executeRawUnsafe(
        `DELETE FROM "ApiProviderConfig" WHERE "id" IN (${LEGACY_API_PROVIDER_IDS.map((item) => `'${item}'`).join(", ")})`,
      );
      for (const legacyId of LEGACY_API_PROVIDER_IDS) {
        existingIds.delete(legacyId);
      }
    }

    const decommissionedProviderIds = existingProviders
      .filter((item) => this.isDecommissionedProvider(item))
      .map((item) => item.id);
    if (decommissionedProviderIds.length) {
      await this.prismaService.$executeRaw`
        DELETE FROM "ApiProviderConfig"
        WHERE "id" = ANY (${decommissionedProviderIds}::text[])
      `;
      for (const providerId of decommissionedProviderIds) {
        existingById.delete(providerId);
        existingIds.delete(providerId);
      }
    }

    for (const provider of SYSTEM_API_PROVIDER_SEEDS) {
      const current = existingById.get(provider.id);
      if (current) {
        await this.syncSystemProviderSeed(current, provider);
        continue;
      }
      await this.insertProviderSeed(provider);
    }
  }

  private async syncSystemProviderSeed(current: ApiProviderRecord, seed: ApiProviderRecord) {
    const nextTutorialUrl = current.tutorialUrl || seed.tutorialUrl || "";
    const nextExtraParams = this.mergeSystemProviderExtraParams(current, seed);
    const currentExtraParamsJson = JSON.stringify(this.normalizeObjectMap(current.extraParams));
    const nextExtraParamsJson = JSON.stringify(nextExtraParams);
    if (current.tutorialUrl === nextTutorialUrl && currentExtraParamsJson === nextExtraParamsJson) {
      return;
    }
    await this.prismaService.$executeRaw`
      UPDATE "ApiProviderConfig"
      SET
        "tutorialUrl" = ${nextTutorialUrl},
        "extraParamsJson" = ${nextExtraParamsJson}::jsonb,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${current.id}
    `;
  }

  private mergeSystemProviderExtraParams(current: ApiProviderRecord, seed: ApiProviderRecord) {
    const currentExtraParams = this.normalizeObjectMap(current.extraParams);
    const seedExtraParams = this.normalizeObjectMap(seed.extraParams);
    if (!this.isRunningHubProvider(current, seed)) {
      return currentExtraParams;
    }
    return {
      ...currentExtraParams,
      runtimeKey: seedExtraParams.runtimeKey ?? currentExtraParams.runtimeKey,
      runtimeTags: seedExtraParams.runtimeTags ?? currentExtraParams.runtimeTags,
      backendKey: seedExtraParams.backendKey ?? currentExtraParams.backendKey,
      displayLabel: seedExtraParams.displayLabel ?? currentExtraParams.displayLabel,
      displayOrder: seedExtraParams.displayOrder ?? currentExtraParams.displayOrder,
      recommended: seedExtraParams.recommended ?? currentExtraParams.recommended,
      baseUrls: seedExtraParams.baseUrls ?? currentExtraParams.baseUrls,
      createPath: seedExtraParams.createPath ?? currentExtraParams.createPath,
      queryPath: RUNNINGHUB_RESULT_QUERY_PATH,
      queryMethod: "POST",
      queryBodyMode: "taskId-json",
      queryTutorialUrl: RUNNINGHUB_RESULT_QUERY_DOC_URL,
      requestProfile: seedExtraParams.requestProfile ?? currentExtraParams.requestProfile,
      supportsTextToVideo: seedExtraParams.supportsTextToVideo ?? currentExtraParams.supportsTextToVideo,
      supportsImageToVideo: seedExtraParams.supportsImageToVideo ?? currentExtraParams.supportsImageToVideo,
      durationOptions: seedExtraParams.durationOptions ?? currentExtraParams.durationOptions,
      sourceFolder: seedExtraParams.sourceFolder ?? currentExtraParams.sourceFolder,
    };
  }

  private isRunningHubProvider(current: ApiProviderRecord, seed: ApiProviderRecord) {
    const candidates = [
      current.baseUrl,
      seed.baseUrl,
      ...this.getStringArrayExtra(current, "baseUrls"),
      ...this.getStringArrayExtra(seed, "baseUrls"),
    ];
    return candidates.some((item) => String(item || "").includes(RUNNINGHUB_BASE_URL));
  }

  private isDecommissionedProvider(provider: ApiProviderRecord) {
    if (DECOMMISSIONED_SYSTEM_API_PROVIDER_IDS.includes(provider.id)) {
      return true;
    }
    const candidates = [provider.baseUrl, ...this.getStringArrayExtra(provider, "baseUrls")];
    return candidates.some((item) => isDecommissionedPlatformBaseUrl(item));
  }

  private async insertProviderSeed(provider: ApiProviderRecord) {
    await this.prismaService.$executeRaw`
      INSERT INTO "ApiProviderConfig" (
        "id",
        "name",
        "providerType",
        "status",
        "baseUrl",
        "tutorialUrl",
        "modelWhitelistJson",
        "apiKey",
        "defaultModel",
        "organization",
        "project",
        "timeoutMs",
        "streamEnabled",
        "customHeadersJson",
        "extraParamsJson",
        "remark",
        "successRate",
        "requestCount24h",
        "totalCostYuan",
        "lastCalledAt",
        "updatedAt"
      )
      VALUES (
        ${provider.id},
        ${provider.name},
        ${provider.providerType},
        ${provider.status},
        ${provider.baseUrl},
        ${provider.tutorialUrl},
        ${JSON.stringify(provider.modelWhitelist)}::jsonb,
        ${provider.apiKey},
        ${provider.defaultModel},
        ${provider.organization},
        ${provider.project},
        ${provider.timeoutMs},
        ${provider.streamEnabled},
        ${JSON.stringify(provider.customHeaders)}::jsonb,
        ${JSON.stringify(provider.extraParams)}::jsonb,
        ${provider.remark},
        ${provider.successRate},
        ${provider.requestCount24h},
        ${provider.totalCostYuan},
        ${new Date(provider.lastCalledAt)},
        ${new Date(provider.updatedAt)}
      )
      ON CONFLICT ("id") DO NOTHING
    `;
  }

  private normalizeRow(row: ApiProviderRow): ApiProviderRecord {
    const rawWhitelist = row.modelWhitelistJson;
    const modelWhitelist = Array.isArray(rawWhitelist)
      ? rawWhitelist.map((item) => String(item)).filter(Boolean)
      : typeof rawWhitelist === "string"
        ? rawWhitelist
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    const customHeaders = this.normalizeStringMap(row.customHeadersJson);
    const extraParams = this.normalizeObjectMap(row.extraParamsJson);

    return this.buildRecord({
      id: row.id,
      name: row.name,
      providerType: row.providerType,
      status: row.status,
      baseUrl: row.baseUrl,
      tutorialUrl: row.tutorialUrl || "",
      modelWhitelist,
      apiKey: row.apiKey || "",
      defaultModel: row.defaultModel || "",
      organization: row.organization || "",
      project: row.project || "",
      timeoutMs: Number(row.timeoutMs || 60000),
      streamEnabled: Boolean(row.streamEnabled),
      customHeaders,
      extraParams,
      remark: row.remark || "",
      successRate: Number(row.successRate || 0),
      requestCount24h: Number(row.requestCount24h || 0),
      totalCostYuan: Number(row.totalCostYuan || 0),
      lastCalledAt: this.toIsoString(row.lastCalledAt),
      updatedAt: this.toIsoString(row.updatedAt),
    });
  }

  private buildRecord(record: ApiProviderRecord): ApiProviderRecord {
    return { ...record };
  }

  private toIsoString(value: Date | string) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return new Date(value).toISOString();
  }

  private normalizeStringMap(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [String(key).trim(), String(item ?? "").trim()])
        .filter(([key, item]) => key && item),
    );
  }

  private normalizeObjectMap(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return { ...(value as Record<string, unknown>) };
  }
}
