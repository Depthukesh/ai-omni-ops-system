import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ModuleDefinition, SkillPackageModule } from "@prisma/client";
import { createId, database, type SkillPackageModuleRecord } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

export type SkillPackageModuleListQuery = {
  moduleKey?: string;
  packageKey?: string;
  bindingType?: SkillPackageModuleRecord["bindingType"] | "ALL";
  enabled?: boolean;
};

export type CreateSkillPackageModulePayload = Omit<SkillPackageModuleRecord, "id" | "createdAt" | "updatedAt">;

export type UpdateSkillPackageModulePayload = Partial<Omit<SkillPackageModuleRecord, "id" | "createdAt" | "updatedAt">>;

export type SkillPackageModuleView = SkillPackageModuleRecord & {
  moduleName?: string;
  moduleType?: string;
  entryRoute?: string;
};

@Injectable()
export class SkillPackageModulesService {
  private bootstrapPromise?: Promise<void>;

  constructor(private readonly prismaService: PrismaService) {}

  async listSkillPackageModules(query: SkillPackageModuleListQuery = {}): Promise<SkillPackageModuleView[]> {
    if (await this.canUseSkillPackageModuleStorage()) {
      await this.ensureSkillPackageModuleStorageSeeded();
      const rows = await this.prismaService.skillPackageModule.findMany({
        where: {
          moduleKey: query.moduleKey,
          packageKey: query.packageKey,
          bindingType: query.bindingType && query.bindingType !== "ALL" ? query.bindingType : undefined,
          enabled: typeof query.enabled === "boolean" ? query.enabled : undefined,
        },
        include: { module: true },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      });
      return rows.map((item) => this.normalizeRecord(item));
    }

    return database.skillPackageModules
      .filter((item) => this.matchesSeedQuery(item, query))
      .sort((a, b) => (a.sortOrder === b.sortOrder ? b.updatedAt.localeCompare(a.updatedAt) : a.sortOrder - b.sortOrder))
      .map((item) => this.enrichSeedRecord(item));
  }

  async listModulesByPackage(packageKey: string, enabled?: boolean) {
    const normalizedPackageKey = this.normalizePackageKey(packageKey);
    return this.listSkillPackageModules({
      packageKey: normalizedPackageKey,
      enabled,
    });
  }

  async listPackagesByModule(moduleKey: string, enabled?: boolean) {
    const normalizedModuleKey = this.normalizeModuleKey(moduleKey);
    return this.listSkillPackageModules({
      moduleKey: normalizedModuleKey,
      enabled,
    });
  }

  async getSkillPackageModule(id: string): Promise<SkillPackageModuleView> {
    if (await this.canUseSkillPackageModuleStorage()) {
      await this.ensureSkillPackageModuleStorageSeeded();
      const row = await this.prismaService.skillPackageModule.findUnique({
        where: { id },
        include: { module: true },
      });
      if (!row) {
        throw new NotFoundException("能力包模块关系不存在");
      }
      return this.normalizeRecord(row);
    }

    const seed = database.skillPackageModules.find((item) => item.id === id);
    if (!seed) {
      throw new NotFoundException("能力包模块关系不存在");
    }
    return this.enrichSeedRecord(seed);
  }

  async createSkillPackageModule(payload: CreateSkillPackageModulePayload): Promise<SkillPackageModuleView> {
    const record = this.buildRecord(payload);
    const now = new Date().toISOString();

    if (await this.canUseSkillPackageModuleStorage()) {
      await this.ensureSkillPackageModuleStorageSeeded();
      await this.ensureModuleExists(record.moduleKey);
      const duplicated = await this.prismaService.skillPackageModule.findUnique({
        where: {
          packageKey_moduleKey_bindingType: {
            packageKey: record.packageKey,
            moduleKey: record.moduleKey,
            bindingType: record.bindingType,
          },
        },
        include: { module: true },
      });
      if (duplicated) {
        throw new ConflictException("该模块与能力包关系已存在");
      }

      const created = await this.prismaService.skillPackageModule.create({
        data: {
          id: createId("spm"),
          packageId: record.packageId,
          packageKey: record.packageKey,
          packageName: record.packageName,
          moduleKey: record.moduleKey,
          bindingType: record.bindingType,
          isDefault: record.isDefault,
          sortOrder: record.sortOrder,
          enabled: record.enabled,
          remarks: record.remarks ?? "",
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
        include: { module: true },
      });
      return this.normalizeRecord(created);
    }

    this.ensureSeedModuleExists(record.moduleKey);
    const duplicated = database.skillPackageModules.find(
      (item) =>
        item.packageKey === record.packageKey &&
        item.moduleKey === record.moduleKey &&
        item.bindingType === record.bindingType,
    );
    if (duplicated) {
      throw new ConflictException("该模块与能力包关系已存在");
    }

    const seedRecord: SkillPackageModuleRecord = {
      ...record,
      id: createId("spm"),
      createdAt: now,
      updatedAt: now,
    };
    database.skillPackageModules.unshift(seedRecord);
    return this.enrichSeedRecord(seedRecord);
  }

  async updateSkillPackageModule(id: string, payload: UpdateSkillPackageModulePayload): Promise<SkillPackageModuleView> {
    if (await this.canUseSkillPackageModuleStorage()) {
      await this.ensureSkillPackageModuleStorageSeeded();
      const current = await this.prismaService.skillPackageModule.findUnique({
        where: { id },
        include: { module: true },
      });
      if (!current) {
        throw new NotFoundException("能力包模块关系不存在");
      }

      const merged = this.buildRecord({
        packageId: payload.packageId ?? current.packageId,
        packageKey: payload.packageKey ?? current.packageKey,
        packageName: payload.packageName ?? current.packageName,
        moduleKey: payload.moduleKey ?? current.moduleKey,
        bindingType: (payload.bindingType ?? current.bindingType) as SkillPackageModuleRecord["bindingType"],
        isDefault: payload.isDefault ?? current.isDefault,
        sortOrder: payload.sortOrder ?? current.sortOrder,
        enabled: payload.enabled ?? current.enabled,
        remarks: payload.remarks ?? current.remarks,
      });
      await this.ensureModuleExists(merged.moduleKey);

      const duplicated = await this.prismaService.skillPackageModule.findUnique({
        where: {
          packageKey_moduleKey_bindingType: {
            packageKey: merged.packageKey,
            moduleKey: merged.moduleKey,
            bindingType: merged.bindingType,
          },
        },
      });
      if (duplicated && duplicated.id !== id) {
        throw new ConflictException("该模块与能力包关系已存在");
      }

      const updated = await this.prismaService.skillPackageModule.update({
        where: { id },
        data: {
          packageId: merged.packageId,
          packageKey: merged.packageKey,
          packageName: merged.packageName,
          moduleKey: merged.moduleKey,
          bindingType: merged.bindingType,
          isDefault: merged.isDefault,
          sortOrder: merged.sortOrder,
          enabled: merged.enabled,
          remarks: merged.remarks ?? "",
          updatedAt: new Date(),
        },
        include: { module: true },
      });
      return this.normalizeRecord(updated);
    }

    const index = database.skillPackageModules.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("能力包模块关系不存在");
    }
    const current = database.skillPackageModules[index];
    const merged = this.buildRecord({
      packageId: payload.packageId ?? current.packageId,
      packageKey: payload.packageKey ?? current.packageKey,
      packageName: payload.packageName ?? current.packageName,
      moduleKey: payload.moduleKey ?? current.moduleKey,
      bindingType: payload.bindingType ?? current.bindingType,
      isDefault: payload.isDefault ?? current.isDefault,
      sortOrder: payload.sortOrder ?? current.sortOrder,
      enabled: payload.enabled ?? current.enabled,
      remarks: payload.remarks ?? current.remarks,
    });
    this.ensureSeedModuleExists(merged.moduleKey);
    const duplicated = database.skillPackageModules.find(
      (item) =>
        item.id !== id &&
        item.packageKey === merged.packageKey &&
        item.moduleKey === merged.moduleKey &&
        item.bindingType === merged.bindingType,
    );
    if (duplicated) {
      throw new ConflictException("该模块与能力包关系已存在");
    }

    const updated: SkillPackageModuleRecord = {
      ...current,
      ...merged,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    database.skillPackageModules[index] = updated;
    return this.enrichSeedRecord(updated);
  }

  async deleteSkillPackageModule(id: string): Promise<SkillPackageModuleView> {
    if (await this.canUseSkillPackageModuleStorage()) {
      await this.ensureSkillPackageModuleStorageSeeded();
      const current = await this.prismaService.skillPackageModule.findUnique({
        where: { id },
        include: { module: true },
      });
      if (!current) {
        throw new NotFoundException("能力包模块关系不存在");
      }
      await this.prismaService.skillPackageModule.delete({
        where: { id },
      });
      return this.normalizeRecord(current);
    }

    const index = database.skillPackageModules.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("能力包模块关系不存在");
    }
    const [deleted] = database.skillPackageModules.splice(index, 1);
    return this.enrichSeedRecord(deleted);
  }

  private normalizeRecord(
    row: SkillPackageModule & {
      module?: ModuleDefinition | null;
    },
  ): SkillPackageModuleView {
    return {
      id: row.id,
      packageId: row.packageId,
      packageKey: row.packageKey,
      packageName: row.packageName,
      moduleKey: row.moduleKey,
      bindingType: row.bindingType as SkillPackageModuleRecord["bindingType"],
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
      remarks: row.remarks || undefined,
      moduleName: row.module?.moduleName,
      moduleType: row.module?.moduleType,
      entryRoute: row.module?.entryRoute,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private enrichSeedRecord(record: SkillPackageModuleRecord): SkillPackageModuleView {
    const module = database.moduleDefinitions.find((item) => item.moduleKey === record.moduleKey);
    return {
      ...record,
      moduleName: module?.moduleName,
      moduleType: module?.moduleType,
      entryRoute: module?.entryRoute,
    };
  }

  private matchesSeedQuery(record: SkillPackageModuleRecord, query: SkillPackageModuleListQuery) {
    if (query.moduleKey && record.moduleKey !== query.moduleKey) {
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

  private normalizeModuleKey(value: string) {
    const moduleKey = String(value || "").trim().toLowerCase();
    if (!moduleKey) {
      throw new BadRequestException("模块标识不能为空");
    }
    return moduleKey;
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

  private normalizeBindingType(value: string): SkillPackageModuleRecord["bindingType"] {
    const bindingType = String(value || "").trim().toUpperCase();
    if (!["DEFAULT", "OPTIONAL", "SYSTEM_REQUIRED", "EXPERIMENTAL"].includes(bindingType)) {
      throw new BadRequestException("绑定类型不合法");
    }
    return bindingType as SkillPackageModuleRecord["bindingType"];
  }

  private normalizeSortOrder(value: number) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
      return 100;
    }
    return Math.floor(normalized);
  }

  private buildRecord(payload: Omit<SkillPackageModuleRecord, "id" | "createdAt" | "updatedAt">) {
    const packageName = String(payload.packageName || "").trim();
    if (!packageName) {
      throw new BadRequestException("能力包名称不能为空");
    }
    return {
      packageId: this.normalizePackageId(payload.packageId),
      packageKey: this.normalizePackageKey(payload.packageKey),
      packageName,
      moduleKey: this.normalizeModuleKey(payload.moduleKey),
      bindingType: this.normalizeBindingType(payload.bindingType),
      isDefault: Boolean(payload.isDefault),
      sortOrder: this.normalizeSortOrder(payload.sortOrder),
      enabled: typeof payload.enabled === "boolean" ? payload.enabled : true,
      remarks: String(payload.remarks || "").trim() || undefined,
    };
  }

  private async ensureModuleExists(moduleKey: string) {
    const module = await this.prismaService.moduleDefinition.findUnique({
      where: { moduleKey },
    });
    if (!module) {
      throw new BadRequestException("目标模块不存在");
    }
  }

  private ensureSeedModuleExists(moduleKey: string) {
    const module = database.moduleDefinitions.find((item) => item.moduleKey === moduleKey);
    if (!module) {
      throw new BadRequestException("目标模块不存在");
    }
  }

  private async canUseSkillPackageModuleStorage() {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }
    try {
      const rows = await this.prismaService.$queryRawUnsafe<Array<{ skillPackageModule: string | null }>>(
        `SELECT to_regclass('"SkillPackageModule"') AS "skillPackageModule"`,
      );
      return Boolean(rows[0]?.skillPackageModule);
    } catch {
      return false;
    }
  }

  private async ensureSkillPackageModuleStorageSeeded() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapSkillPackageModuleStorage();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapSkillPackageModuleStorage() {
    if (!(await this.canUseSkillPackageModuleStorage())) {
      return;
    }
    const count = await this.prismaService.skillPackageModule.count();
    if (count > 0 || !database.skillPackageModules.length) {
      return;
    }
    await this.prismaService.skillPackageModule.createMany({
      data: database.skillPackageModules.map((item) => ({
        id: item.id,
        packageId: item.packageId,
        packageKey: item.packageKey,
        packageName: item.packageName,
        moduleKey: item.moduleKey,
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
  }
}
