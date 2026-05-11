import { Injectable, NotFoundException } from "@nestjs/common";
import { database, type ApiProviderRecord } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

export type CreateApiProviderPayload = {
  name: string;
  providerType: ApiProviderRecord["providerType"];
  baseUrl: string;
  tutorialUrl?: string;
  modelWhitelist?: string[];
  apiKey?: string;
  remark?: string;
};

export type UpdateApiProviderPayload = {
  status?: ApiProviderRecord["status"];
  baseUrl?: string;
  tutorialUrl?: string;
  modelWhitelist?: string[];
  apiKey?: string;
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
      `ALTER TABLE "ApiProviderConfig" ADD COLUMN IF NOT EXISTS "remark" TEXT NOT NULL DEFAULT ''`,
    );

    for (const provider of database.apiProviders) {
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

    return this.buildRecord({
      id: row.id,
      name: row.name,
      providerType: row.providerType,
      status: row.status,
      baseUrl: row.baseUrl,
      tutorialUrl: row.tutorialUrl || "",
      modelWhitelist,
      apiKey: row.apiKey || "",
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
}
