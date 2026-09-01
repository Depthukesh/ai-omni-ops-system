import { createHash, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  RuanwenjieMediaService,
  type RuanwenjieMediaResourceRecord,
} from "../third-party-platforms/ruanwenjie-media.service";
import {
  DEFAULT_OPENCLAW_WORKSPACE_SCOPE,
  normalizeOpenClawWorkspaceScope,
  type OpenClawWorkspaceScope,
} from "./openclaw-workspace-scope";

const THIRD_PARTY_MEDIA_PROVIDER = "ruanwenjie";
const THIRD_PARTY_MEDIA_PAGE_SIZE = 20;

type OpenClawThirdPartyMediaResourceRow = {
  localId: string;
  brandId: string;
  workspaceScope: string;
  providerType: string;
  remoteResourceId: string;
  sortType: string;
  platform: string;
  taxonomy: string;
  area: string;
  name: string;
  caseUrl: string | null;
  price: string;
  publishTime: string;
  successRate: string;
  includeRate: string;
  isSelfMedia: boolean | number | string;
  rawJson: string | null;
  sourceRemotePage: number | string | null;
  lastSyncedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawThirdPartyMediaSyncStateRow = {
  id: string;
  brandId: string;
  workspaceScope: string;
  providerType: string;
  nextRemotePage: number | string;
  lastRemotePage: number | string;
  lastRemoteTotal: number | string;
  lastFetchedCount: number | string;
  hasRemoteMore: boolean | number | string;
  lastSyncAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OpenClawThirdPartyMediaResourceStoredRecord = {
  localId: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  providerType: string;
  id: string;
  sortType: string;
  platform: string;
  taxonomy: string;
  area: string;
  name: string;
  caseUrl?: string;
  price: string;
  publishTime: string;
  successRate: string;
  includeRate: string;
  isSelfMedia: boolean;
  raw: Record<string, unknown>;
  sourceRemotePage: number;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
};

type OpenClawThirdPartyMediaSyncStateRecord = {
  id: string;
  brandId: string;
  workspaceScope: OpenClawWorkspaceScope;
  providerType: string;
  nextRemotePage: number;
  lastRemotePage: number;
  lastRemoteTotal: number;
  lastFetchedCount: number;
  hasRemoteMore: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenClawThirdPartyMediaResourceRecord = Omit<OpenClawThirdPartyMediaResourceStoredRecord, "localId" | "providerType" | "workspaceScope" | "brandId">;

export type OpenClawThirdPartyMediaResourceWorkspace = {
  items: OpenClawThirdPartyMediaResourceRecord[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  cachedTotal: number;
  searchKeyword: string;
  syncedAt: string;
  nextRemotePage: number;
  remoteLastPage: number;
  hasRemoteMore: boolean;
};

export type OpenClawThirdPartyMediaSyncResult = {
  workspace: OpenClawThirdPartyMediaResourceWorkspace;
  remotePage: number;
  fetchedCount: number;
  createdCount: number;
  updatedCount: number;
  skipped: boolean;
  hasRemoteMore: boolean;
  nextRemotePage: number;
  syncedAt: string;
};

@Injectable()
export class OpenClawThirdPartyMediaResourceService {
  private bootstrapPromise: Promise<void> | null = null;
  private readonly fallbackItems: OpenClawThirdPartyMediaResourceStoredRecord[] = [];
  private readonly fallbackStates: OpenClawThirdPartyMediaSyncStateRecord[] = [];

  constructor(
    private readonly prismaService: PrismaService,
    private readonly ruanwenjieMediaService: RuanwenjieMediaService,
  ) {}

  async listWorkspace(
    brandId: string,
    options?: {
      workspaceScope?: string;
      page?: number;
      searchKeyword?: string;
    },
  ): Promise<OpenClawThirdPartyMediaResourceWorkspace> {
    const normalizedBrandId = this.requireText(brandId);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope || "geo");
    const searchKeyword = this.normalizeSearchKeyword(options?.searchKeyword);
    const requestedPage = this.normalizePage(options?.page);
    const syncState = await this.getSyncState(normalizedBrandId, workspaceScope);
    const cachedTotal = await this.countRecords(normalizedBrandId, workspaceScope);
    const total = searchKeyword
      ? await this.countRecords(normalizedBrandId, workspaceScope, searchKeyword)
      : cachedTotal;
    const maxPage = Math.max(1, Math.ceil(total / THIRD_PARTY_MEDIA_PAGE_SIZE));
    const page = total > 0 ? Math.min(requestedPage, maxPage) : 1;
    const items = await this.listPageRecords(normalizedBrandId, workspaceScope, page, searchKeyword);

    return {
      items: items.map((item) => this.toWorkspaceRecord(item)),
      page,
      pageSize: THIRD_PARTY_MEDIA_PAGE_SIZE,
      total,
      hasMore: page * THIRD_PARTY_MEDIA_PAGE_SIZE < total,
      cachedTotal,
      searchKeyword,
      syncedAt: syncState.lastSyncAt || "",
      nextRemotePage: syncState.nextRemotePage,
      remoteLastPage: syncState.lastRemotePage,
      hasRemoteMore: syncState.hasRemoteMore,
    };
  }

  async syncNextPage(
    brandId: string,
    options?: {
      workspaceScope?: string;
      page?: number;
      searchKeyword?: string;
    },
  ): Promise<OpenClawThirdPartyMediaSyncResult> {
    const normalizedBrandId = this.requireText(brandId);
    const workspaceScope = normalizeOpenClawWorkspaceScope(options?.workspaceScope || "geo");
    const searchKeyword = this.normalizeSearchKeyword(options?.searchKeyword);
    const requestedPage = this.normalizePage(options?.page);
    const currentState = await this.getSyncState(normalizedBrandId, workspaceScope);

    if (currentState.lastRemotePage > 0 && !currentState.hasRemoteMore) {
      const workspace = await this.listWorkspace(normalizedBrandId, {
        workspaceScope,
        page: requestedPage,
        searchKeyword,
      });
      return {
        workspace,
        remotePage: currentState.lastRemotePage,
        fetchedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        skipped: true,
        hasRemoteMore: false,
        nextRemotePage: currentState.nextRemotePage,
        syncedAt: currentState.lastSyncAt || "",
      };
    }

    const remotePage = Math.max(1, currentState.nextRemotePage || 1);
    const remoteWorkspace = await this.ruanwenjieMediaService.listResources(normalizedBrandId, remotePage);
    const mergeResult = await this.mergeRemoteItems(normalizedBrandId, workspaceScope, remotePage, remoteWorkspace.items, remoteWorkspace.syncedAt);
    const nextState: OpenClawThirdPartyMediaSyncStateRecord = {
      id: currentState.id || `openclaw_third_party_media_sync_${randomUUID()}`,
      brandId: normalizedBrandId,
      workspaceScope,
      providerType: THIRD_PARTY_MEDIA_PROVIDER,
      nextRemotePage: remoteWorkspace.hasMore ? remoteWorkspace.page + 1 : remoteWorkspace.page,
      lastRemotePage: Math.max(currentState.lastRemotePage, remoteWorkspace.page),
      lastRemoteTotal: Math.max(this.normalizeNumber(remoteWorkspace.total), currentState.lastRemoteTotal),
      lastFetchedCount: remoteWorkspace.items.length,
      hasRemoteMore: remoteWorkspace.hasMore,
      lastSyncAt: remoteWorkspace.syncedAt,
      createdAt: currentState.createdAt || remoteWorkspace.syncedAt,
      updatedAt: remoteWorkspace.syncedAt,
    };
    await this.saveSyncState(nextState);

    const workspace = await this.listWorkspace(normalizedBrandId, {
      workspaceScope,
      page: requestedPage,
      searchKeyword,
    });
    return {
      workspace,
      remotePage: remoteWorkspace.page,
      fetchedCount: remoteWorkspace.items.length,
      createdCount: mergeResult.createdCount,
      updatedCount: mergeResult.updatedCount,
      skipped: false,
      hasRemoteMore: remoteWorkspace.hasMore,
      nextRemotePage: nextState.nextRemotePage,
      syncedAt: remoteWorkspace.syncedAt,
    };
  }

  private async listPageRecords(
    brandId: string,
    workspaceScope: OpenClawWorkspaceScope,
    page: number,
    searchKeyword: string,
  ): Promise<OpenClawThirdPartyMediaResourceStoredRecord[]> {
    const offset = Math.max(0, (page - 1) * THIRD_PARTY_MEDIA_PAGE_SIZE);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const searchClause = this.buildSearchClause(searchKeyword);
      const rows = await this.prismaService.$queryRaw<OpenClawThirdPartyMediaResourceRow[]>(Prisma.sql`
        SELECT
          "id" AS "localId",
          "brandId",
          "workspaceScope",
          "providerType",
          "remoteResourceId",
          "sortType",
          "platform",
          "taxonomy",
          "area",
          "name",
          "caseUrl",
          "price",
          "publishTime",
          "successRate",
          "includeRate",
          "isSelfMedia",
          "rawJson",
          "sourceRemotePage",
          "lastSyncedAt",
          "createdAt",
          "updatedAt"
        FROM "OpenClawThirdPartyMediaResource"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
          AND "providerType" = ${THIRD_PARTY_MEDIA_PROVIDER}
          ${searchClause}
        ORDER BY "lastSyncedAt" DESC, "updatedAt" DESC, "createdAt" DESC
        LIMIT ${THIRD_PARTY_MEDIA_PAGE_SIZE}
        OFFSET ${offset}
      `);
      return rows.map((item) => this.normalizeResourceRow(item));
    }

    return this.fallbackItems
      .filter((item) => item.brandId === brandId && item.workspaceScope === workspaceScope && item.providerType === THIRD_PARTY_MEDIA_PROVIDER)
      .filter((item) => this.matchesSearch(item, searchKeyword))
      .sort((left, right) => this.sortStoredRecord(left, right))
      .slice(offset, offset + THIRD_PARTY_MEDIA_PAGE_SIZE);
  }

  private async countRecords(
    brandId: string,
    workspaceScope: OpenClawWorkspaceScope,
    searchKeyword = "",
  ) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const searchClause = this.buildSearchClause(searchKeyword);
      const rows = await this.prismaService.$queryRaw<Array<{ count?: number | bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "OpenClawThirdPartyMediaResource"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
          AND "providerType" = ${THIRD_PARTY_MEDIA_PROVIDER}
          ${searchClause}
      `);
      return this.normalizeNumber(rows[0]?.count);
    }

    return this.fallbackItems
      .filter((item) => item.brandId === brandId && item.workspaceScope === workspaceScope && item.providerType === THIRD_PARTY_MEDIA_PROVIDER)
      .filter((item) => this.matchesSearch(item, searchKeyword))
      .length;
  }

  private async mergeRemoteItems(
    brandId: string,
    workspaceScope: OpenClawWorkspaceScope,
    remotePage: number,
    items: RuanwenjieMediaResourceRecord[],
    syncedAt: string,
  ) {
    let createdCount = 0;
    let updatedCount = 0;
    for (const item of items) {
      const remoteResourceId = this.normalizeRemoteResourceId(item);
      const stored: OpenClawThirdPartyMediaResourceStoredRecord = {
        localId: `openclaw_third_party_media_resource_${randomUUID()}`,
        brandId,
        workspaceScope,
        providerType: THIRD_PARTY_MEDIA_PROVIDER,
        id: remoteResourceId,
        sortType: this.normalizeText(item.sortType, 120),
        platform: this.normalizeText(item.platform, 120),
        taxonomy: this.normalizeText(item.taxonomy, 160),
        area: this.normalizeText(item.area, 160),
        name: this.normalizeText(item.name, 300),
        ...(this.normalizeOptionalText(item.caseUrl, 2000) ? { caseUrl: this.normalizeOptionalText(item.caseUrl, 2000) } : {}),
        price: this.normalizeText(item.price, 120),
        publishTime: this.normalizeText(item.publishTime, 120),
        successRate: this.normalizeText(item.successRate, 80),
        includeRate: this.normalizeText(item.includeRate, 80),
        isSelfMedia: Boolean(item.isSelfMedia),
        raw: this.normalizeRawRecord(item.raw),
        sourceRemotePage: remotePage,
        syncedAt,
        createdAt: syncedAt,
        updatedAt: syncedAt,
      };
      const existed = await this.saveOrUpdateResource(stored);
      if (existed) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }
    }
    return { createdCount, updatedCount };
  }

  private async saveOrUpdateResource(item: OpenClawThirdPartyMediaResourceStoredRecord) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const existing = await this.findResource(item.brandId, item.workspaceScope, item.id);
      const rawJson = JSON.stringify(item.raw);
      if (existing) {
        await this.prismaService.$executeRaw`
          UPDATE "OpenClawThirdPartyMediaResource"
          SET
            "sortType" = ${item.sortType},
            "platform" = ${item.platform},
            "taxonomy" = ${item.taxonomy},
            "area" = ${item.area},
            "name" = ${item.name},
            "caseUrl" = ${item.caseUrl || null},
            "price" = ${item.price},
            "publishTime" = ${item.publishTime},
            "successRate" = ${item.successRate},
            "includeRate" = ${item.includeRate},
            "isSelfMedia" = ${item.isSelfMedia},
            "rawJson" = ${rawJson},
            "sourceRemotePage" = ${item.sourceRemotePage},
            "lastSyncedAt" = ${item.syncedAt},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${existing.localId}
        `;
        return true;
      }

      await this.prismaService.$executeRaw`
        INSERT INTO "OpenClawThirdPartyMediaResource" (
          "id",
          "brandId",
          "workspaceScope",
          "providerType",
          "remoteResourceId",
          "sortType",
          "platform",
          "taxonomy",
          "area",
          "name",
          "caseUrl",
          "price",
          "publishTime",
          "successRate",
          "includeRate",
          "isSelfMedia",
          "rawJson",
          "sourceRemotePage",
          "lastSyncedAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${item.localId},
          ${item.brandId},
          ${item.workspaceScope},
          ${item.providerType},
          ${item.id},
          ${item.sortType},
          ${item.platform},
          ${item.taxonomy},
          ${item.area},
          ${item.name},
          ${item.caseUrl || null},
          ${item.price},
          ${item.publishTime},
          ${item.successRate},
          ${item.includeRate},
          ${item.isSelfMedia},
          ${rawJson},
          ${item.sourceRemotePage},
          ${item.syncedAt},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      return false;
    }

    const existingIndex = this.fallbackItems.findIndex(
      (candidate) => candidate.brandId === item.brandId
        && candidate.workspaceScope === item.workspaceScope
        && candidate.providerType === item.providerType
        && candidate.id === item.id,
    );
    if (existingIndex >= 0) {
      const existing = this.fallbackItems[existingIndex];
      this.fallbackItems[existingIndex] = {
        ...existing,
        ...item,
        localId: existing.localId,
        createdAt: existing.createdAt,
        updatedAt: item.syncedAt,
      };
      return true;
    }
    this.fallbackItems.unshift(item);
    return false;
  }

  private async findResource(
    brandId: string,
    workspaceScope: OpenClawWorkspaceScope,
    remoteResourceId: string,
  ) {
    const normalizedRemoteResourceId = this.requireText(remoteResourceId);
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawThirdPartyMediaResourceRow[]>(Prisma.sql`
        SELECT
          "id" AS "localId",
          "brandId",
          "workspaceScope",
          "providerType",
          "remoteResourceId",
          "sortType",
          "platform",
          "taxonomy",
          "area",
          "name",
          "caseUrl",
          "price",
          "publishTime",
          "successRate",
          "includeRate",
          "isSelfMedia",
          "rawJson",
          "sourceRemotePage",
          "lastSyncedAt",
          "createdAt",
          "updatedAt"
        FROM "OpenClawThirdPartyMediaResource"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
          AND "providerType" = ${THIRD_PARTY_MEDIA_PROVIDER}
          AND "remoteResourceId" = ${normalizedRemoteResourceId}
        LIMIT 1
      `);
      const matched = rows[0];
      return matched ? this.normalizeResourceRow(matched) : undefined;
    }

    return this.fallbackItems.find(
      (item) => item.brandId === brandId
        && item.workspaceScope === workspaceScope
        && item.providerType === THIRD_PARTY_MEDIA_PROVIDER
        && item.id === normalizedRemoteResourceId,
    );
  }

  private async getSyncState(
    brandId: string,
    workspaceScope: OpenClawWorkspaceScope,
  ): Promise<OpenClawThirdPartyMediaSyncStateRecord> {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const rows = await this.prismaService.$queryRaw<OpenClawThirdPartyMediaSyncStateRow[]>(Prisma.sql`
        SELECT
          "id",
          "brandId",
          "workspaceScope",
          "providerType",
          "nextRemotePage",
          "lastRemotePage",
          "lastRemoteTotal",
          "lastFetchedCount",
          "hasRemoteMore",
          "lastSyncAt",
          "createdAt",
          "updatedAt"
        FROM "OpenClawThirdPartyMediaSyncState"
        WHERE "brandId" = ${brandId}
          AND "workspaceScope" = ${workspaceScope}
          AND "providerType" = ${THIRD_PARTY_MEDIA_PROVIDER}
        LIMIT 1
      `);
      const matched = rows[0];
      if (matched) {
        return this.normalizeSyncStateRow(matched);
      }
    } else {
      const matched = this.fallbackStates.find(
        (item) => item.brandId === brandId
          && item.workspaceScope === workspaceScope
          && item.providerType === THIRD_PARTY_MEDIA_PROVIDER,
      );
      if (matched) {
        return matched;
      }
    }

    const now = new Date().toISOString();
    return {
      id: "",
      brandId,
      workspaceScope,
      providerType: THIRD_PARTY_MEDIA_PROVIDER,
      nextRemotePage: 1,
      lastRemotePage: 0,
      lastRemoteTotal: 0,
      lastFetchedCount: 0,
      hasRemoteMore: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async saveSyncState(state: OpenClawThirdPartyMediaSyncStateRecord) {
    if (await this.prismaService.canUseDatabase()) {
      await this.ensureTableReady();
      const existing = state.id ? await this.getSyncState(state.brandId, state.workspaceScope) : undefined;
      if (existing && existing.id) {
        await this.prismaService.$executeRaw`
          UPDATE "OpenClawThirdPartyMediaSyncState"
          SET
            "nextRemotePage" = ${state.nextRemotePage},
            "lastRemotePage" = ${state.lastRemotePage},
            "lastRemoteTotal" = ${state.lastRemoteTotal},
            "lastFetchedCount" = ${state.lastFetchedCount},
            "hasRemoteMore" = ${state.hasRemoteMore},
            "lastSyncAt" = ${state.lastSyncAt || null},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${existing.id}
        `;
        return;
      }

      const id = state.id || `openclaw_third_party_media_sync_${randomUUID()}`;
      await this.prismaService.$executeRaw`
        INSERT INTO "OpenClawThirdPartyMediaSyncState" (
          "id",
          "brandId",
          "workspaceScope",
          "providerType",
          "nextRemotePage",
          "lastRemotePage",
          "lastRemoteTotal",
          "lastFetchedCount",
          "hasRemoteMore",
          "lastSyncAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${state.brandId},
          ${state.workspaceScope},
          ${state.providerType},
          ${state.nextRemotePage},
          ${state.lastRemotePage},
          ${state.lastRemoteTotal},
          ${state.lastFetchedCount},
          ${state.hasRemoteMore},
          ${state.lastSyncAt || null},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `;
      return;
    }

    const existingIndex = this.fallbackStates.findIndex(
      (item) => item.brandId === state.brandId
        && item.workspaceScope === state.workspaceScope
        && item.providerType === state.providerType,
    );
    if (existingIndex >= 0) {
      this.fallbackStates[existingIndex] = {
        ...this.fallbackStates[existingIndex],
        ...state,
      };
      return;
    }
    this.fallbackStates.push({
      ...state,
      id: state.id || `openclaw_third_party_media_sync_${randomUUID()}`,
    });
  }

  private toWorkspaceRecord(item: OpenClawThirdPartyMediaResourceStoredRecord): OpenClawThirdPartyMediaResourceRecord {
    return {
      id: item.id,
      sortType: item.sortType,
      platform: item.platform,
      taxonomy: item.taxonomy,
      area: item.area,
      name: item.name,
      ...(item.caseUrl ? { caseUrl: item.caseUrl } : {}),
      price: item.price,
      publishTime: item.publishTime,
      successRate: item.successRate,
      includeRate: item.includeRate,
      isSelfMedia: item.isSelfMedia,
      raw: item.raw,
      sourceRemotePage: item.sourceRemotePage,
      syncedAt: item.syncedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private normalizeResourceRow(row: OpenClawThirdPartyMediaResourceRow): OpenClawThirdPartyMediaResourceStoredRecord {
    return {
      localId: row.localId,
      brandId: row.brandId,
      workspaceScope: normalizeOpenClawWorkspaceScope(row.workspaceScope || DEFAULT_OPENCLAW_WORKSPACE_SCOPE),
      providerType: this.normalizeText(row.providerType, 40) || THIRD_PARTY_MEDIA_PROVIDER,
      id: this.normalizeText(row.remoteResourceId, 120),
      sortType: this.normalizeText(row.sortType, 120),
      platform: this.normalizeText(row.platform, 120),
      taxonomy: this.normalizeText(row.taxonomy, 160),
      area: this.normalizeText(row.area, 160),
      name: this.normalizeText(row.name, 300),
      ...(this.normalizeOptionalText(row.caseUrl, 2000) ? { caseUrl: this.normalizeOptionalText(row.caseUrl, 2000) } : {}),
      price: this.normalizeText(row.price, 120),
      publishTime: this.normalizeText(row.publishTime, 120),
      successRate: this.normalizeText(row.successRate, 80),
      includeRate: this.normalizeText(row.includeRate, 80),
      isSelfMedia: this.normalizeBoolean(row.isSelfMedia),
      raw: this.parseRawJson(row.rawJson),
      sourceRemotePage: this.normalizeNumber(row.sourceRemotePage) || 1,
      syncedAt: this.normalizeDate(row.lastSyncedAt),
      createdAt: this.normalizeDate(row.createdAt),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private normalizeSyncStateRow(row: OpenClawThirdPartyMediaSyncStateRow): OpenClawThirdPartyMediaSyncStateRecord {
    return {
      id: row.id,
      brandId: row.brandId,
      workspaceScope: normalizeOpenClawWorkspaceScope(row.workspaceScope || DEFAULT_OPENCLAW_WORKSPACE_SCOPE),
      providerType: this.normalizeText(row.providerType, 40) || THIRD_PARTY_MEDIA_PROVIDER,
      nextRemotePage: Math.max(1, this.normalizeNumber(row.nextRemotePage) || 1),
      lastRemotePage: this.normalizeNumber(row.lastRemotePage),
      lastRemoteTotal: this.normalizeNumber(row.lastRemoteTotal),
      lastFetchedCount: this.normalizeNumber(row.lastFetchedCount),
      hasRemoteMore: this.normalizeBoolean(row.hasRemoteMore),
      ...(this.normalizeDate(row.lastSyncAt) ? { lastSyncAt: this.normalizeDate(row.lastSyncAt) } : {}),
      createdAt: this.normalizeDate(row.createdAt),
      updatedAt: this.normalizeDate(row.updatedAt),
    };
  }

  private buildSearchClause(searchKeyword: string) {
    if (!searchKeyword) {
      return Prisma.empty;
    }
    const searchPattern = `%${searchKeyword.toLowerCase()}%`;
    return Prisma.sql`
      AND (
        LOWER(COALESCE("remoteResourceId", '')) LIKE ${searchPattern}
        OR LOWER(COALESCE("name", '')) LIKE ${searchPattern}
        OR LOWER(COALESCE("platform", '')) LIKE ${searchPattern}
        OR LOWER(COALESCE("taxonomy", '')) LIKE ${searchPattern}
        OR LOWER(COALESCE("area", '')) LIKE ${searchPattern}
      )
    `;
  }

  private matchesSearch(item: OpenClawThirdPartyMediaResourceStoredRecord, searchKeyword: string) {
    if (!searchKeyword) {
      return true;
    }
    const searchable = [
      item.id,
      item.name,
      item.platform,
      item.taxonomy,
      item.area,
    ].join(" ").toLowerCase();
    return searchable.includes(searchKeyword.toLowerCase());
  }

  private sortStoredRecord(left: OpenClawThirdPartyMediaResourceStoredRecord, right: OpenClawThirdPartyMediaResourceStoredRecord) {
    return `${right.syncedAt}|${right.updatedAt}|${right.createdAt}`.localeCompare(`${left.syncedAt}|${left.updatedAt}|${left.createdAt}`);
  }

  private normalizeRemoteResourceId(item: RuanwenjieMediaResourceRecord) {
    const direct = this.normalizeText(item.id, 120);
    if (direct) {
      return direct;
    }
    return createHash("sha1")
      .update(
        JSON.stringify({
          name: item.name,
          platform: item.platform,
          taxonomy: item.taxonomy,
          area: item.area,
          price: item.price,
        }),
      )
      .digest("hex");
  }

  private normalizeRawRecord(value: Record<string, unknown>) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  }

  private parseRawJson(value: string | null) {
    if (!value) {
      return {};
    }
    try {
      const parsed = JSON.parse(String(value));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }

  private normalizeBoolean(value: unknown) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  private normalizeNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  private normalizeDate(value: Date | string | null | undefined) {
    if (!value) {
      return "";
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    const normalized = String(value).trim();
    if (!normalized) {
      return "";
    }
    const asDate = new Date(normalized);
    return Number.isNaN(asDate.getTime()) ? normalized : asDate.toISOString();
  }

  private normalizePage(value?: number) {
    const page = Number(value || 1);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  }

  private normalizeSearchKeyword(value?: string) {
    return String(value || "").trim().slice(0, 80);
  }

  private normalizeText(value: unknown, maxLength: number) {
    return String(value || "").trim().slice(0, maxLength);
  }

  private normalizeOptionalText(value: unknown, maxLength: number) {
    const normalized = String(value || "").trim();
    return normalized ? normalized.slice(0, maxLength) : "";
  }

  private requireText(value: string | undefined) {
    return this.normalizeText(value, 200);
  }

  private async ensureTableReady() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapTables();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapTables() {
    if (!(await this.prismaService.canUseDatabase())) {
      return;
    }
    if (this.prismaService.isLocalSqliteMode()) {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawThirdPartyMediaResource" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "providerType" TEXT NOT NULL DEFAULT '${THIRD_PARTY_MEDIA_PROVIDER}',
          "remoteResourceId" TEXT NOT NULL DEFAULT '',
          "sortType" TEXT NOT NULL DEFAULT '',
          "platform" TEXT NOT NULL DEFAULT '',
          "taxonomy" TEXT NOT NULL DEFAULT '',
          "area" TEXT NOT NULL DEFAULT '',
          "name" TEXT NOT NULL DEFAULT '',
          "caseUrl" TEXT,
          "price" TEXT NOT NULL DEFAULT '',
          "publishTime" TEXT NOT NULL DEFAULT '',
          "successRate" TEXT NOT NULL DEFAULT '',
          "includeRate" TEXT NOT NULL DEFAULT '',
          "isSelfMedia" INTEGER NOT NULL DEFAULT 0,
          "rawJson" TEXT NOT NULL DEFAULT '{}',
          "sourceRemotePage" INTEGER NOT NULL DEFAULT 1,
          "lastSyncedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("OpenClawThirdPartyMediaResource", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "providerType", definition: `TEXT NOT NULL DEFAULT '${THIRD_PARTY_MEDIA_PROVIDER}'` },
        { name: "remoteResourceId", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "sortType", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "platform", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "taxonomy", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "area", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "name", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "caseUrl", definition: "TEXT" },
        { name: "price", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "publishTime", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "successRate", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "includeRate", definition: "TEXT NOT NULL DEFAULT ''" },
        { name: "isSelfMedia", definition: "INTEGER NOT NULL DEFAULT 0" },
        { name: "rawJson", definition: "TEXT NOT NULL DEFAULT '{}'" },
        { name: "sourceRemotePage", definition: "INTEGER NOT NULL DEFAULT 1" },
        { name: "lastSyncedAt", definition: "DATETIME" },
      ]);
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawThirdPartyMediaSyncState" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "providerType" TEXT NOT NULL DEFAULT '${THIRD_PARTY_MEDIA_PROVIDER}',
          "nextRemotePage" INTEGER NOT NULL DEFAULT 1,
          "lastRemotePage" INTEGER NOT NULL DEFAULT 0,
          "lastRemoteTotal" INTEGER NOT NULL DEFAULT 0,
          "lastFetchedCount" INTEGER NOT NULL DEFAULT 0,
          "hasRemoteMore" INTEGER NOT NULL DEFAULT 1,
          "lastSyncAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.ensureTableColumns("OpenClawThirdPartyMediaSyncState", [
        { name: "workspaceScope", definition: `TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'` },
        { name: "providerType", definition: `TEXT NOT NULL DEFAULT '${THIRD_PARTY_MEDIA_PROVIDER}'` },
        { name: "nextRemotePage", definition: "INTEGER NOT NULL DEFAULT 1" },
        { name: "lastRemotePage", definition: "INTEGER NOT NULL DEFAULT 0" },
        { name: "lastRemoteTotal", definition: "INTEGER NOT NULL DEFAULT 0" },
        { name: "lastFetchedCount", definition: "INTEGER NOT NULL DEFAULT 0" },
        { name: "hasRemoteMore", definition: "INTEGER NOT NULL DEFAULT 1" },
        { name: "lastSyncAt", definition: "DATETIME" },
      ]);
    } else {
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawThirdPartyMediaResource" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "providerType" TEXT NOT NULL DEFAULT '${THIRD_PARTY_MEDIA_PROVIDER}',
          "remoteResourceId" TEXT NOT NULL DEFAULT '',
          "sortType" TEXT NOT NULL DEFAULT '',
          "platform" TEXT NOT NULL DEFAULT '',
          "taxonomy" TEXT NOT NULL DEFAULT '',
          "area" TEXT NOT NULL DEFAULT '',
          "name" TEXT NOT NULL DEFAULT '',
          "caseUrl" TEXT,
          "price" TEXT NOT NULL DEFAULT '',
          "publishTime" TEXT NOT NULL DEFAULT '',
          "successRate" TEXT NOT NULL DEFAULT '',
          "includeRate" TEXT NOT NULL DEFAULT '',
          "isSelfMedia" BOOLEAN NOT NULL DEFAULT FALSE,
          "rawJson" TEXT NOT NULL DEFAULT '{}',
          "sourceRemotePage" INTEGER NOT NULL DEFAULT 1,
          "lastSyncedAt" TIMESTAMPTZ,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "providerType" TEXT NOT NULL DEFAULT '${THIRD_PARTY_MEDIA_PROVIDER}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "remoteResourceId" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "sortType" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "platform" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "taxonomy" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "area" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "caseUrl" TEXT
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "price" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "publishTime" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "successRate" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "includeRate" TEXT NOT NULL DEFAULT ''
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "isSelfMedia" BOOLEAN NOT NULL DEFAULT FALSE
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "rawJson" TEXT NOT NULL DEFAULT '{}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "sourceRemotePage" INTEGER NOT NULL DEFAULT 1
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaResource"
        ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMPTZ
      `);
      await this.prismaService.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OpenClawThirdPartyMediaSyncState" (
          "id" TEXT PRIMARY KEY,
          "brandId" TEXT NOT NULL,
          "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}',
          "providerType" TEXT NOT NULL DEFAULT '${THIRD_PARTY_MEDIA_PROVIDER}',
          "nextRemotePage" INTEGER NOT NULL DEFAULT 1,
          "lastRemotePage" INTEGER NOT NULL DEFAULT 0,
          "lastRemoteTotal" INTEGER NOT NULL DEFAULT 0,
          "lastFetchedCount" INTEGER NOT NULL DEFAULT 0,
          "hasRemoteMore" BOOLEAN NOT NULL DEFAULT TRUE,
          "lastSyncAt" TIMESTAMPTZ,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaSyncState"
        ADD COLUMN IF NOT EXISTS "workspaceScope" TEXT NOT NULL DEFAULT '${DEFAULT_OPENCLAW_WORKSPACE_SCOPE}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaSyncState"
        ADD COLUMN IF NOT EXISTS "providerType" TEXT NOT NULL DEFAULT '${THIRD_PARTY_MEDIA_PROVIDER}'
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaSyncState"
        ADD COLUMN IF NOT EXISTS "nextRemotePage" INTEGER NOT NULL DEFAULT 1
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaSyncState"
        ADD COLUMN IF NOT EXISTS "lastRemotePage" INTEGER NOT NULL DEFAULT 0
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaSyncState"
        ADD COLUMN IF NOT EXISTS "lastRemoteTotal" INTEGER NOT NULL DEFAULT 0
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaSyncState"
        ADD COLUMN IF NOT EXISTS "lastFetchedCount" INTEGER NOT NULL DEFAULT 0
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaSyncState"
        ADD COLUMN IF NOT EXISTS "hasRemoteMore" BOOLEAN NOT NULL DEFAULT TRUE
      `);
      await this.prismaService.$executeRawUnsafe(`
        ALTER TABLE "OpenClawThirdPartyMediaSyncState"
        ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMPTZ
      `);
    }
    await this.prismaService.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "OpenClawThirdPartyMediaResource_brand_scope_provider_remote_idx"
      ON "OpenClawThirdPartyMediaResource" ("brandId", "workspaceScope", "providerType", "remoteResourceId")
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "OpenClawThirdPartyMediaResource_brand_scope_synced_idx"
      ON "OpenClawThirdPartyMediaResource" ("brandId", "workspaceScope", "lastSyncedAt" DESC, "updatedAt" DESC)
    `);
    await this.prismaService.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "OpenClawThirdPartyMediaSyncState_brand_scope_provider_idx"
      ON "OpenClawThirdPartyMediaSyncState" ("brandId", "workspaceScope", "providerType")
    `);
  }
}
