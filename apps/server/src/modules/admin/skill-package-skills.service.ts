import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { SkillConfig, SkillPackageSkill } from "@prisma/client";
import { createId, database, type SkillConfigRecord, type SkillPackageSkillRecord } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

type ResolvedSkillRecord = Pick<
  SkillConfigRecord,
  "id" | "slug" | "name" | "category" | "status" | "provider" | "defaultModel"
>;

export type SkillPackageSkillListQuery = {
  skillSlug?: string;
  packageKey?: string;
  bindingType?: SkillPackageSkillRecord["bindingType"] | "ALL";
  enabled?: boolean;
};

export type CreateSkillPackageSkillPayload = {
  packageId: string;
  packageKey: string;
  packageName: string;
  skillId?: string;
  skillSlug?: string;
  bindingType?: SkillPackageSkillRecord["bindingType"];
  isDefault?: boolean;
  sortOrder?: number;
  enabled?: boolean;
  remarks?: string;
};

export type UpdateSkillPackageSkillPayload = Partial<CreateSkillPackageSkillPayload>;

export type SkillPackageSkillView = SkillPackageSkillRecord & {
  skillName?: string;
  skillCategory?: string;
  skillStatus?: SkillConfigRecord["status"];
  skillProvider?: string;
  skillDefaultModel?: string;
};

@Injectable()
export class SkillPackageSkillsService {
  private bootstrapPromise?: Promise<void>;

  constructor(private readonly prismaService: PrismaService) {}

  async listSkillPackageSkills(query: SkillPackageSkillListQuery = {}): Promise<SkillPackageSkillView[]> {
    if (await this.canUseSkillPackageSkillStorage()) {
      await this.ensureSkillPackageSkillStorageSeeded();
      const rows = await this.prismaService.skillPackageSkill.findMany({
        where: {
          skillSlug: query.skillSlug,
          packageKey: query.packageKey,
          bindingType: query.bindingType && query.bindingType !== "ALL" ? query.bindingType : undefined,
          enabled: typeof query.enabled === "boolean" ? query.enabled : undefined,
        },
        include: { skill: true },
        orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      });
      return rows.map((item) => this.normalizeRecord(item));
    }

    return database.skillPackageSkills
      .filter((item) => this.matchesSeedQuery(item, query))
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) {
          return a.isDefault ? -1 : 1;
        }
        return a.sortOrder === b.sortOrder ? b.updatedAt.localeCompare(a.updatedAt) : a.sortOrder - b.sortOrder;
      })
      .map((item) => this.enrichSeedRecord(item));
  }

  async listSkillsByPackage(packageKey: string, enabled?: boolean) {
    const normalizedPackageKey = this.normalizePackageKey(packageKey);
    return this.listSkillPackageSkills({
      packageKey: normalizedPackageKey,
      enabled,
    });
  }

  async listPackagesBySkill(skillSlug: string, enabled?: boolean) {
    const normalizedSkillSlug = this.normalizeSkillSlug(skillSlug);
    return this.listSkillPackageSkills({
      skillSlug: normalizedSkillSlug,
      enabled,
    });
  }

  async getSkillPackageSkill(id: string): Promise<SkillPackageSkillView> {
    if (await this.canUseSkillPackageSkillStorage()) {
      await this.ensureSkillPackageSkillStorageSeeded();
      const row = await this.prismaService.skillPackageSkill.findUnique({
        where: { id },
        include: { skill: true },
      });
      if (!row) {
        throw new NotFoundException("能力包技能关系不存在");
      }
      return this.normalizeRecord(row);
    }

    const seed = database.skillPackageSkills.find((item) => item.id === id);
    if (!seed) {
      throw new NotFoundException("能力包技能关系不存在");
    }
    return this.enrichSeedRecord(seed);
  }

  async createSkillPackageSkill(payload: CreateSkillPackageSkillPayload): Promise<SkillPackageSkillView> {
    const skill = await this.resolveSkill(payload.skillId, payload.skillSlug);
    const record = this.buildRecord(payload, skill);
    const now = new Date().toISOString();

    if (await this.canUseSkillPackageSkillStorage()) {
      await this.ensureSkillPackageSkillStorageSeeded();
      const duplicated = await this.prismaService.skillPackageSkill.findUnique({
        where: {
          packageKey_skillId_bindingType: {
            packageKey: record.packageKey,
            skillId: record.skillId,
            bindingType: record.bindingType,
          },
        },
        include: { skill: true },
      });
      if (duplicated) {
        throw new ConflictException("该能力包与技能关系已存在");
      }

      if (record.isDefault) {
        await this.clearDefaultSkillPackageSkills(record.skillId);
      }

      const created = await this.prismaService.skillPackageSkill.create({
        data: {
          id: createId("sps"),
          packageId: record.packageId,
          packageKey: record.packageKey,
          packageName: record.packageName,
          skillId: record.skillId,
          skillSlug: record.skillSlug,
          bindingType: record.bindingType,
          isDefault: record.isDefault,
          sortOrder: record.sortOrder,
          enabled: record.enabled,
          remarks: record.remarks ?? "",
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
        include: { skill: true },
      });
      return this.normalizeRecord(created);
    }

    const duplicated = database.skillPackageSkills.find(
      (item) =>
        item.packageKey === record.packageKey &&
        item.skillId === record.skillId &&
        item.bindingType === record.bindingType,
    );
    if (duplicated) {
      throw new ConflictException("该能力包与技能关系已存在");
    }
    if (record.isDefault) {
      database.skillPackageSkills = database.skillPackageSkills.map((item) =>
        item.skillId === record.skillId ? { ...item, isDefault: false } : item,
      );
    }
    const seedRecord: SkillPackageSkillRecord = {
      ...record,
      id: createId("sps"),
      createdAt: now,
      updatedAt: now,
    };
    database.skillPackageSkills.unshift(seedRecord);
    return this.enrichSeedRecord(seedRecord);
  }

  async updateSkillPackageSkill(id: string, payload: UpdateSkillPackageSkillPayload): Promise<SkillPackageSkillView> {
    if (await this.canUseSkillPackageSkillStorage()) {
      await this.ensureSkillPackageSkillStorageSeeded();
      const current = await this.prismaService.skillPackageSkill.findUnique({
        where: { id },
        include: { skill: true },
      });
      if (!current) {
        throw new NotFoundException("能力包技能关系不存在");
      }
      const resolvedSkill = await this.resolveSkill(payload.skillId ?? current.skillId, payload.skillSlug ?? current.skillSlug);
      const merged = this.buildRecord(
        {
          packageId: payload.packageId ?? current.packageId,
          packageKey: payload.packageKey ?? current.packageKey,
          packageName: payload.packageName ?? current.packageName,
          skillId: resolvedSkill.id,
          skillSlug: resolvedSkill.slug,
          bindingType: payload.bindingType ?? (current.bindingType as SkillPackageSkillRecord["bindingType"]),
          isDefault: payload.isDefault ?? current.isDefault,
          sortOrder: payload.sortOrder ?? current.sortOrder,
          enabled: payload.enabled ?? current.enabled,
          remarks: payload.remarks ?? current.remarks,
        },
        resolvedSkill,
      );

      const duplicated = await this.prismaService.skillPackageSkill.findUnique({
        where: {
          packageKey_skillId_bindingType: {
            packageKey: merged.packageKey,
            skillId: merged.skillId,
            bindingType: merged.bindingType,
          },
        },
      });
      if (duplicated && duplicated.id !== id) {
        throw new ConflictException("该能力包与技能关系已存在");
      }

      if (merged.isDefault) {
        await this.clearDefaultSkillPackageSkills(merged.skillId, id);
      }

      const updated = await this.prismaService.skillPackageSkill.update({
        where: { id },
        data: {
          packageId: merged.packageId,
          packageKey: merged.packageKey,
          packageName: merged.packageName,
          skillId: merged.skillId,
          skillSlug: merged.skillSlug,
          bindingType: merged.bindingType,
          isDefault: merged.isDefault,
          sortOrder: merged.sortOrder,
          enabled: merged.enabled,
          remarks: merged.remarks ?? "",
          updatedAt: new Date(),
        },
        include: { skill: true },
      });
      return this.normalizeRecord(updated);
    }

    const index = database.skillPackageSkills.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("能力包技能关系不存在");
    }
    const current = database.skillPackageSkills[index];
    const resolvedSkill = await this.resolveSkill(payload.skillId ?? current.skillId, payload.skillSlug ?? current.skillSlug);
    const merged = this.buildRecord(
      {
        packageId: payload.packageId ?? current.packageId,
        packageKey: payload.packageKey ?? current.packageKey,
        packageName: payload.packageName ?? current.packageName,
        skillId: resolvedSkill.id,
        skillSlug: resolvedSkill.slug,
        bindingType: payload.bindingType ?? current.bindingType,
        isDefault: payload.isDefault ?? current.isDefault,
        sortOrder: payload.sortOrder ?? current.sortOrder,
        enabled: payload.enabled ?? current.enabled,
        remarks: payload.remarks ?? current.remarks,
      },
      resolvedSkill,
    );
    const duplicated = database.skillPackageSkills.find(
      (item) =>
        item.id !== id &&
        item.packageKey === merged.packageKey &&
        item.skillId === merged.skillId &&
        item.bindingType === merged.bindingType,
    );
    if (duplicated) {
      throw new ConflictException("该能力包与技能关系已存在");
    }
    if (merged.isDefault) {
      database.skillPackageSkills = database.skillPackageSkills.map((item) =>
        item.id !== id && item.skillId === merged.skillId ? { ...item, isDefault: false } : item,
      );
    }
    const updated: SkillPackageSkillRecord = {
      ...current,
      ...merged,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    database.skillPackageSkills[index] = updated;
    return this.enrichSeedRecord(updated);
  }

  async deleteSkillPackageSkill(id: string): Promise<SkillPackageSkillView> {
    if (await this.canUseSkillPackageSkillStorage()) {
      await this.ensureSkillPackageSkillStorageSeeded();
      const current = await this.prismaService.skillPackageSkill.findUnique({
        where: { id },
        include: { skill: true },
      });
      if (!current) {
        throw new NotFoundException("能力包技能关系不存在");
      }
      await this.prismaService.skillPackageSkill.delete({
        where: { id },
      });
      return this.normalizeRecord(current);
    }

    const index = database.skillPackageSkills.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("能力包技能关系不存在");
    }
    const [deleted] = database.skillPackageSkills.splice(index, 1);
    return this.enrichSeedRecord(deleted);
  }

  private normalizeRecord(
    row: SkillPackageSkill & {
      skill?: SkillConfig | null;
    },
  ): SkillPackageSkillView {
    const normalizedSkillName =
      row.skillSlug === "douyin-remix-short-video-studio"
        ? "复刻短视频-复刻分析"
        : row.skillSlug === "douyin-remix-short-video-compose"
          ? "复刻短视频-拼接成片"
          : row.skill?.name;
    return {
      id: row.id,
      packageId: row.packageId,
      packageKey: row.packageKey,
      packageName: row.packageName,
      skillId: row.skillId,
      skillSlug: row.skillSlug,
      bindingType: row.bindingType as SkillPackageSkillRecord["bindingType"],
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
      remarks: row.remarks || undefined,
      skillName: normalizedSkillName,
      skillCategory: row.skill?.category,
      skillStatus: row.skill?.status as SkillConfigRecord["status"] | undefined,
      skillProvider: row.skill?.provider,
      skillDefaultModel: row.skill?.defaultModel,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private enrichSeedRecord(record: SkillPackageSkillRecord): SkillPackageSkillView {
    const skill = database.skillConfigs.find((item) => item.id === record.skillId || item.slug === record.skillSlug);
    const normalizedSkillName =
      record.skillSlug === "douyin-remix-short-video-studio"
        ? "复刻短视频-复刻分析"
        : record.skillSlug === "douyin-remix-short-video-compose"
          ? "复刻短视频-拼接成片"
          : skill?.name;
    return {
      ...record,
      skillName: normalizedSkillName,
      skillCategory: skill?.category,
      skillStatus: skill?.status,
      skillProvider: skill?.provider,
      skillDefaultModel: skill?.defaultModel,
    };
  }

  private matchesSeedQuery(record: SkillPackageSkillRecord, query: SkillPackageSkillListQuery) {
    if (query.skillSlug && record.skillSlug !== query.skillSlug) {
      return false;
    }
    if (query.packageKey && record.packageKey !== query.packageKey) {
      return false;
    }
    if (query.bindingType && query.bindingType !== "ALL" && record.bindingType !== query.bindingType) {
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

  private normalizePackageName(value: string) {
    const packageName = String(value || "").trim();
    if (!packageName) {
      throw new BadRequestException("能力包名称不能为空");
    }
    return packageName;
  }

  private normalizeSkillSlug(value: unknown) {
    const skillSlug = String(value || "").trim().toLowerCase();
    if (!skillSlug) {
      throw new BadRequestException("技能标识不能为空");
    }
    if (!/^[a-z0-9-]+$/.test(skillSlug)) {
      throw new BadRequestException("技能标识只能使用英文小写、数字和短横线");
    }
    return skillSlug;
  }

  private normalizeBindingType(value: unknown): SkillPackageSkillRecord["bindingType"] {
    const bindingType = String(value || "DEFAULT").trim().toUpperCase();
    if (!["DEFAULT", "OPTIONAL", "SYSTEM_REQUIRED", "EXPERIMENTAL"].includes(bindingType)) {
      throw new BadRequestException("绑定类型不合法");
    }
    return bindingType as SkillPackageSkillRecord["bindingType"];
  }

  private normalizeSortOrder(value: number | undefined) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
      return 100;
    }
    return Math.floor(normalized);
  }

  private buildRecord(payload: CreateSkillPackageSkillPayload, skill: ResolvedSkillRecord) {
    return {
      packageId: this.normalizePackageId(payload.packageId),
      packageKey: this.normalizePackageKey(payload.packageKey),
      packageName: this.normalizePackageName(payload.packageName),
      skillId: skill.id,
      skillSlug: skill.slug,
      bindingType: this.normalizeBindingType(payload.bindingType),
      isDefault: Boolean(payload.isDefault),
      sortOrder: this.normalizeSortOrder(payload.sortOrder),
      enabled: typeof payload.enabled === "boolean" ? payload.enabled : true,
      remarks: String(payload.remarks || "").trim() || undefined,
    };
  }

  private async resolveSkill(skillId?: string, skillSlug?: string): Promise<ResolvedSkillRecord> {
    const normalizedSkillId = String(skillId || "").trim();
    if (normalizedSkillId) {
      const byId = await this.getSkillById(normalizedSkillId);
      if (!byId) {
        throw new BadRequestException("目标技能不存在");
      }
      return byId;
    }
    const normalizedSkillSlug = this.normalizeSkillSlug(skillSlug);
    const bySlug = await this.getSkillBySlug(normalizedSkillSlug);
    if (!bySlug) {
      throw new BadRequestException("目标技能不存在");
    }
    return bySlug;
  }

  private async getSkillById(skillId: string): Promise<ResolvedSkillRecord | undefined> {
    if (await this.prismaService.canUseDatabase()) {
      const row = await this.prismaService.skillConfig.findUnique({
        where: { id: skillId },
      });
      if (row) {
        return this.normalizeSkill(row);
      }
    }
    const seed = database.skillConfigs.find((item) => item.id === skillId);
    return seed ? { ...seed } : undefined;
  }

  private async getSkillBySlug(skillSlug: string): Promise<ResolvedSkillRecord | undefined> {
    if (await this.prismaService.canUseDatabase()) {
      const row = await this.prismaService.skillConfig.findUnique({
        where: { slug: skillSlug },
      });
      if (row) {
        return this.normalizeSkill(row);
      }
    }
    const seed = database.skillConfigs.find((item) => item.slug === skillSlug);
    return seed ? { ...seed } : undefined;
  }

  private normalizeSkill(row: SkillConfig): ResolvedSkillRecord {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      status: row.status as SkillConfigRecord["status"],
      provider: row.provider,
      defaultModel: row.defaultModel,
    };
  }

  private async canUseSkillPackageSkillStorage() {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }
    try {
      const rows = await this.prismaService.$queryRawUnsafe<Array<{ skillPackageSkill: string | null }>>(
        `SELECT to_regclass('"SkillPackageSkill"') AS "skillPackageSkill"`,
      );
      return Boolean(rows[0]?.skillPackageSkill);
    } catch {
      return false;
    }
  }

  private async ensureSkillPackageSkillStorageSeeded() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapSkillPackageSkillStorage();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapSkillPackageSkillStorage() {
    if (!(await this.canUseSkillPackageSkillStorage())) {
      return;
    }
    if (!database.skillPackageSkills.length) {
      return;
    }
    await this.prismaService.skillPackageSkill.createMany({
      data: database.skillPackageSkills.map((item) => ({
        id: item.id,
        packageId: item.packageId,
        packageKey: item.packageKey,
        packageName: item.packageName,
        skillId: item.skillId,
        skillSlug: item.skillSlug,
        bindingType: item.bindingType,
        isDefault: item.isDefault,
        sortOrder: item.sortOrder,
        enabled: item.enabled,
        remarks: item.remarks ?? "",
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      skipDuplicates: true,
    });
    await this.prismaService.skillPackageSkill.updateMany({
      where: {
        skillSlug: { in: ["douyin-remix-short-video-studio", "douyin-remix-short-video-compose"] },
      },
      data: {
        packageId: "sp_douyin_remix_short_video",
        packageKey: "douyin-remix-short-video",
        packageName: "抖音复刻短视频能力包",
        updatedAt: new Date(),
      },
    });
  }

  private async clearDefaultSkillPackageSkills(skillId: string, excludeId?: string) {
    if (!(await this.canUseSkillPackageSkillStorage())) {
      return;
    }
    if (excludeId) {
      await this.prismaService.skillPackageSkill.updateMany({
        where: {
          skillId,
          id: { not: excludeId },
        },
        data: {
          isDefault: false,
          updatedAt: new Date(),
        },
      });
      return;
    }
    await this.prismaService.skillPackageSkill.updateMany({
      where: {
        skillId,
      },
      data: {
        isDefault: false,
        updatedAt: new Date(),
      },
    });
  }
}
