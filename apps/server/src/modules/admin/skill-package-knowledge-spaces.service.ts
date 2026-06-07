import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { KnowledgeBase, SkillPackageKnowledgeSpace } from "@prisma/client";
import { createId, database, type SkillPackageKnowledgeSpaceRecord } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

export type SkillPackageKnowledgeSpaceListQuery = {
  packageKey?: string;
  knowledgeBaseId?: string;
  relationType?: SkillPackageKnowledgeSpaceRecord["relationType"] | "ALL";
  enabled?: boolean;
};

export type CreateSkillPackageKnowledgeSpacePayload = Omit<
  SkillPackageKnowledgeSpaceRecord,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateSkillPackageKnowledgeSpacePayload = Partial<
  Omit<SkillPackageKnowledgeSpaceRecord, "id" | "createdAt" | "updatedAt">
>;

export type SkillPackageKnowledgeSpaceView = SkillPackageKnowledgeSpaceRecord & {
  knowledgeBaseName?: string;
  knowledgeBaseSlug?: string;
  knowledgeBaseStatus?: string;
};

@Injectable()
export class SkillPackageKnowledgeSpacesService {
  private bootstrapPromise?: Promise<void>;

  constructor(private readonly prismaService: PrismaService) {}

  async listSkillPackageKnowledgeSpaces(
    query: SkillPackageKnowledgeSpaceListQuery = {},
  ): Promise<SkillPackageKnowledgeSpaceView[]> {
    if (await this.canUseSkillPackageKnowledgeSpaceStorage()) {
      await this.ensureSkillPackageKnowledgeSpaceStorageSeeded();
      const rows = await this.prismaService.skillPackageKnowledgeSpace.findMany({
        where: {
          packageKey: query.packageKey,
          knowledgeBaseId: query.knowledgeBaseId,
          relationType: query.relationType && query.relationType !== "ALL" ? query.relationType : undefined,
          enabled: typeof query.enabled === "boolean" ? query.enabled : undefined,
        },
        include: { knowledgeBase: true },
        orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      });
      return rows.map((item) => this.normalizeRecord(item));
    }

    return database.skillPackageKnowledgeSpaces
      .filter((item) => this.matchesSeedQuery(item, query))
      .sort((a, b) => (a.priority === b.priority ? b.updatedAt.localeCompare(a.updatedAt) : a.priority - b.priority))
      .map((item) => this.enrichSeedRecord(item));
  }

  async listKnowledgeSpacesByPackage(packageKey: string, enabled?: boolean) {
    const normalizedPackageKey = this.normalizePackageKey(packageKey);
    return this.listSkillPackageKnowledgeSpaces({
      packageKey: normalizedPackageKey,
      enabled,
    });
  }

  async listPackagesByKnowledgeSpace(knowledgeBaseId: string, enabled?: boolean) {
    const normalizedKnowledgeBaseId = this.normalizeKnowledgeBaseId(knowledgeBaseId);
    return this.listSkillPackageKnowledgeSpaces({
      knowledgeBaseId: normalizedKnowledgeBaseId,
      enabled,
    });
  }

  async getSkillPackageKnowledgeSpace(id: string): Promise<SkillPackageKnowledgeSpaceView> {
    if (await this.canUseSkillPackageKnowledgeSpaceStorage()) {
      await this.ensureSkillPackageKnowledgeSpaceStorageSeeded();
      const row = await this.prismaService.skillPackageKnowledgeSpace.findUnique({
        where: { id },
        include: { knowledgeBase: true },
      });
      if (!row) {
        throw new NotFoundException("能力包知识关系不存在");
      }
      return this.normalizeRecord(row);
    }

    const seed = database.skillPackageKnowledgeSpaces.find((item) => item.id === id);
    if (!seed) {
      throw new NotFoundException("能力包知识关系不存在");
    }
    return this.enrichSeedRecord(seed);
  }

  async createSkillPackageKnowledgeSpace(
    payload: CreateSkillPackageKnowledgeSpacePayload,
  ): Promise<SkillPackageKnowledgeSpaceView> {
    const record = this.buildRecord(payload);
    const now = new Date().toISOString();

    if (await this.canUseSkillPackageKnowledgeSpaceStorage()) {
      await this.ensureSkillPackageKnowledgeSpaceStorageSeeded();
      await this.ensureSkillPackageExists(record.packageKey);
      await this.ensureKnowledgeBaseExists(record.knowledgeBaseId);
      const duplicated = await this.prismaService.skillPackageKnowledgeSpace.findUnique({
        where: {
          packageKey_knowledgeBaseId_relationType: {
            packageKey: record.packageKey,
            knowledgeBaseId: record.knowledgeBaseId,
            relationType: record.relationType,
          },
        },
        include: { knowledgeBase: true },
      });
      if (duplicated) {
        throw new ConflictException("该能力包知识关系已存在");
      }

      const created = await this.prismaService.skillPackageKnowledgeSpace.create({
        data: {
          id: createId("spks"),
          packageId: record.packageId,
          packageKey: record.packageKey,
          packageName: record.packageName,
          knowledgeBaseId: record.knowledgeBaseId,
          relationType: record.relationType,
          priority: record.priority,
          retrievalMode: record.retrievalMode,
          isRequired: record.isRequired,
          enabled: record.enabled,
          remarks: record.remarks ?? "",
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
        include: { knowledgeBase: true },
      });
      return this.normalizeRecord(created);
    }

    this.ensureSeedSkillPackageExists(record.packageKey);
    this.ensureSeedKnowledgeBaseExists(record.knowledgeBaseId);
    const duplicated = database.skillPackageKnowledgeSpaces.find(
      (item) =>
        item.packageKey === record.packageKey &&
        item.knowledgeBaseId === record.knowledgeBaseId &&
        item.relationType === record.relationType,
    );
    if (duplicated) {
      throw new ConflictException("该能力包知识关系已存在");
    }

    const seedRecord: SkillPackageKnowledgeSpaceRecord = {
      ...record,
      id: createId("spks"),
      createdAt: now,
      updatedAt: now,
    };
    database.skillPackageKnowledgeSpaces.unshift(seedRecord);
    return this.enrichSeedRecord(seedRecord);
  }

  async updateSkillPackageKnowledgeSpace(
    id: string,
    payload: UpdateSkillPackageKnowledgeSpacePayload,
  ): Promise<SkillPackageKnowledgeSpaceView> {
    if (await this.canUseSkillPackageKnowledgeSpaceStorage()) {
      await this.ensureSkillPackageKnowledgeSpaceStorageSeeded();
      const current = await this.prismaService.skillPackageKnowledgeSpace.findUnique({
        where: { id },
        include: { knowledgeBase: true },
      });
      if (!current) {
        throw new NotFoundException("能力包知识关系不存在");
      }

      const merged = this.buildRecord({
        packageId: payload.packageId ?? current.packageId,
        packageKey: payload.packageKey ?? current.packageKey,
        packageName: payload.packageName ?? current.packageName,
        knowledgeBaseId: payload.knowledgeBaseId ?? current.knowledgeBaseId,
        relationType: (payload.relationType ?? current.relationType) as SkillPackageKnowledgeSpaceRecord["relationType"],
        priority: payload.priority ?? current.priority,
        retrievalMode: (payload.retrievalMode ?? current.retrievalMode) as SkillPackageKnowledgeSpaceRecord["retrievalMode"],
        isRequired: payload.isRequired ?? current.isRequired,
        enabled: payload.enabled ?? current.enabled,
        remarks: payload.remarks ?? current.remarks,
      });
      await this.ensureSkillPackageExists(merged.packageKey);
      await this.ensureKnowledgeBaseExists(merged.knowledgeBaseId);

      const duplicated = await this.prismaService.skillPackageKnowledgeSpace.findUnique({
        where: {
          packageKey_knowledgeBaseId_relationType: {
            packageKey: merged.packageKey,
            knowledgeBaseId: merged.knowledgeBaseId,
            relationType: merged.relationType,
          },
        },
      });
      if (duplicated && duplicated.id !== id) {
        throw new ConflictException("该能力包知识关系已存在");
      }

      const updated = await this.prismaService.skillPackageKnowledgeSpace.update({
        where: { id },
        data: {
          packageId: merged.packageId,
          packageKey: merged.packageKey,
          packageName: merged.packageName,
          knowledgeBaseId: merged.knowledgeBaseId,
          relationType: merged.relationType,
          priority: merged.priority,
          retrievalMode: merged.retrievalMode,
          isRequired: merged.isRequired,
          enabled: merged.enabled,
          remarks: merged.remarks ?? "",
          updatedAt: new Date(),
        },
        include: { knowledgeBase: true },
      });
      return this.normalizeRecord(updated);
    }

    const index = database.skillPackageKnowledgeSpaces.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("能力包知识关系不存在");
    }
    const current = database.skillPackageKnowledgeSpaces[index];
    const merged = this.buildRecord({
      packageId: payload.packageId ?? current.packageId,
      packageKey: payload.packageKey ?? current.packageKey,
      packageName: payload.packageName ?? current.packageName,
      knowledgeBaseId: payload.knowledgeBaseId ?? current.knowledgeBaseId,
      relationType: payload.relationType ?? current.relationType,
      priority: payload.priority ?? current.priority,
      retrievalMode: payload.retrievalMode ?? current.retrievalMode,
      isRequired: payload.isRequired ?? current.isRequired,
      enabled: payload.enabled ?? current.enabled,
      remarks: payload.remarks ?? current.remarks,
    });
    this.ensureSeedSkillPackageExists(merged.packageKey);
    this.ensureSeedKnowledgeBaseExists(merged.knowledgeBaseId);
    const duplicated = database.skillPackageKnowledgeSpaces.find(
      (item) =>
        item.id !== id &&
        item.packageKey === merged.packageKey &&
        item.knowledgeBaseId === merged.knowledgeBaseId &&
        item.relationType === merged.relationType,
    );
    if (duplicated) {
      throw new ConflictException("该能力包知识关系已存在");
    }

    const updated: SkillPackageKnowledgeSpaceRecord = {
      ...current,
      ...merged,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    database.skillPackageKnowledgeSpaces[index] = updated;
    return this.enrichSeedRecord(updated);
  }

  async deleteSkillPackageKnowledgeSpace(id: string): Promise<SkillPackageKnowledgeSpaceView> {
    if (await this.canUseSkillPackageKnowledgeSpaceStorage()) {
      await this.ensureSkillPackageKnowledgeSpaceStorageSeeded();
      const current = await this.prismaService.skillPackageKnowledgeSpace.findUnique({
        where: { id },
        include: { knowledgeBase: true },
      });
      if (!current) {
        throw new NotFoundException("能力包知识关系不存在");
      }
      await this.prismaService.skillPackageKnowledgeSpace.delete({
        where: { id },
      });
      return this.normalizeRecord(current);
    }

    const index = database.skillPackageKnowledgeSpaces.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("能力包知识关系不存在");
    }
    const [deleted] = database.skillPackageKnowledgeSpaces.splice(index, 1);
    return this.enrichSeedRecord(deleted);
  }

  private normalizeRecord(
    row: SkillPackageKnowledgeSpace & {
      knowledgeBase?: KnowledgeBase | null;
    },
  ): SkillPackageKnowledgeSpaceView {
    return {
      id: row.id,
      packageId: row.packageId,
      packageKey: row.packageKey,
      packageName: row.packageName,
      knowledgeBaseId: row.knowledgeBaseId,
      relationType: row.relationType as SkillPackageKnowledgeSpaceRecord["relationType"],
      priority: row.priority,
      retrievalMode: row.retrievalMode as SkillPackageKnowledgeSpaceRecord["retrievalMode"],
      isRequired: row.isRequired,
      enabled: row.enabled,
      remarks: row.remarks || undefined,
      knowledgeBaseName: row.knowledgeBase?.name,
      knowledgeBaseSlug: row.knowledgeBase?.slug,
      knowledgeBaseStatus: row.knowledgeBase?.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private enrichSeedRecord(record: SkillPackageKnowledgeSpaceRecord): SkillPackageKnowledgeSpaceView {
    const knowledgeBase = database.knowledgeBases.find((item) => item.id === record.knowledgeBaseId);
    return {
      ...record,
      knowledgeBaseName: knowledgeBase?.name,
      knowledgeBaseSlug: knowledgeBase?.slug,
      knowledgeBaseStatus: knowledgeBase?.status,
    };
  }

  private matchesSeedQuery(record: SkillPackageKnowledgeSpaceRecord, query: SkillPackageKnowledgeSpaceListQuery) {
    if (query.packageKey && record.packageKey !== query.packageKey) {
      return false;
    }
    if (query.knowledgeBaseId && record.knowledgeBaseId !== query.knowledgeBaseId) {
      return false;
    }
    if (query.relationType && query.relationType !== "ALL" && record.relationType !== query.relationType) {
      return false;
    }
    if (typeof query.enabled === "boolean" && record.enabled !== query.enabled) {
      return false;
    }
    return true;
  }

  private normalizePackageId(value: string) {
    const packageId = String(value || "").trim();
    if (!packageId) {
      throw new BadRequestException("能力包 ID 不能为空");
    }
    return packageId;
  }

  private normalizePackageKey(value: string) {
    const packageKey = String(value || "").trim().toLowerCase();
    if (!packageKey) {
      throw new BadRequestException("能力包标识不能为空");
    }
    if (!/^[a-z0-9-]+$/.test(packageKey)) {
      throw new BadRequestException("能力包标识只能使用英文小写、数字和短横线");
    }
    return packageKey;
  }

  private normalizeKnowledgeBaseId(value: string) {
    const knowledgeBaseId = String(value || "").trim();
    if (!knowledgeBaseId) {
      throw new BadRequestException("知识库 ID 不能为空");
    }
    return knowledgeBaseId;
  }

  private normalizeRelationType(value: string): SkillPackageKnowledgeSpaceRecord["relationType"] {
    const relationType = String(value || "").trim().toUpperCase();
    if (!["DEFAULT", "OPTIONAL", "BRAND_OVERRIDE", "USER_OVERRIDE"].includes(relationType)) {
      throw new BadRequestException("知识关系类型不合法");
    }
    return relationType as SkillPackageKnowledgeSpaceRecord["relationType"];
  }

  private normalizeRetrievalMode(value: string): SkillPackageKnowledgeSpaceRecord["retrievalMode"] {
    const retrievalMode = String(value || "").trim().toUpperCase();
    if (!["SEMANTIC", "HYBRID", "MANUAL"].includes(retrievalMode)) {
      throw new BadRequestException("检索模式不合法");
    }
    return retrievalMode as SkillPackageKnowledgeSpaceRecord["retrievalMode"];
  }

  private normalizePriority(value: number) {
    const priority = Number(value);
    if (!Number.isFinite(priority) || priority <= 0) {
      return 100;
    }
    return Math.floor(priority);
  }

  private buildRecord(
    payload: Omit<SkillPackageKnowledgeSpaceRecord, "id" | "createdAt" | "updatedAt">,
  ): Omit<SkillPackageKnowledgeSpaceRecord, "id" | "createdAt" | "updatedAt"> {
    const packageName = String(payload.packageName || "").trim();
    if (!packageName) {
      throw new BadRequestException("能力包名称不能为空");
    }
    return {
      packageId: this.normalizePackageId(payload.packageId),
      packageKey: this.normalizePackageKey(payload.packageKey),
      packageName,
      knowledgeBaseId: this.normalizeKnowledgeBaseId(payload.knowledgeBaseId),
      relationType: this.normalizeRelationType(payload.relationType),
      priority: this.normalizePriority(payload.priority),
      retrievalMode: this.normalizeRetrievalMode(payload.retrievalMode),
      isRequired: Boolean(payload.isRequired),
      enabled: typeof payload.enabled === "boolean" ? payload.enabled : true,
      remarks: String(payload.remarks || "").trim() || undefined,
    };
  }

  private async ensureSkillPackageExists(packageKey: string) {
    const skillPackage = await this.prismaService.skillPackage.findUnique({
      where: { packageKey },
    });
    if (!skillPackage) {
      throw new BadRequestException("目标能力包不存在");
    }
  }

  private ensureSeedSkillPackageExists(packageKey: string) {
    const skillPackage = database.skillPackages.find((item) => item.packageKey === packageKey);
    if (!skillPackage) {
      throw new BadRequestException("目标能力包不存在");
    }
  }

  private async ensureKnowledgeBaseExists(knowledgeBaseId: string) {
    const knowledgeBase = await this.prismaService.knowledgeBase.findUnique({
      where: { id: knowledgeBaseId },
    });
    if (!knowledgeBase) {
      throw new BadRequestException("目标知识库不存在");
    }
    if (knowledgeBase.status === "DISABLED") {
      throw new BadRequestException("停用的知识库不允许新增关系");
    }
  }

  private ensureSeedKnowledgeBaseExists(knowledgeBaseId: string) {
    const knowledgeBase = database.knowledgeBases.find((item) => item.id === knowledgeBaseId);
    if (!knowledgeBase) {
      throw new BadRequestException("目标知识库不存在");
    }
    if (knowledgeBase.status === "DISABLED") {
      throw new BadRequestException("停用的知识库不允许新增关系");
    }
  }

  private async canUseSkillPackageKnowledgeSpaceStorage() {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }
    try {
      const rows = await this.prismaService.$queryRawUnsafe<Array<{ skillPackageKnowledgeSpace: string | null }>>(
        `SELECT to_regclass('"SkillPackageKnowledgeSpace"') AS "skillPackageKnowledgeSpace"`,
      );
      return Boolean(rows[0]?.skillPackageKnowledgeSpace);
    } catch {
      return false;
    }
  }

  private async ensureSkillPackageKnowledgeSpaceStorageSeeded() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapSkillPackageKnowledgeSpaceStorage();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapSkillPackageKnowledgeSpaceStorage() {
    if (!(await this.canUseSkillPackageKnowledgeSpaceStorage())) {
      return;
    }
    const count = await this.prismaService.skillPackageKnowledgeSpace.count();
    if (count > 0 || !database.skillPackageKnowledgeSpaces.length) {
      return;
    }
    await this.prismaService.skillPackageKnowledgeSpace.createMany({
      data: database.skillPackageKnowledgeSpaces.map((item) => ({
        id: item.id,
        packageId: item.packageId,
        packageKey: item.packageKey,
        packageName: item.packageName,
        knowledgeBaseId: item.knowledgeBaseId,
        relationType: item.relationType,
        priority: item.priority,
        retrievalMode: item.retrievalMode,
        isRequired: item.isRequired,
        enabled: item.enabled,
        remarks: item.remarks ?? "",
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      skipDuplicates: true,
    });
  }
}
