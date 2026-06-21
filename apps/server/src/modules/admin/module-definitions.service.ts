import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ModuleDefinition } from "@prisma/client";
import { createId, database, type ModuleDefinitionRecord } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

export type ModuleDefinitionListQuery = {
  keyword?: string;
  moduleType?: ModuleDefinitionRecord["moduleType"] | "ALL";
  moduleStatus?: ModuleDefinitionRecord["moduleStatus"] | "ALL";
};

export type CreateModuleDefinitionPayload = Omit<ModuleDefinitionRecord, "id" | "createdAt" | "updatedAt">;

export type UpdateModuleDefinitionPayload = Partial<Omit<ModuleDefinitionRecord, "id" | "createdAt" | "updatedAt">>;

@Injectable()
export class ModuleDefinitionsService {
  private bootstrapPromise?: Promise<void>;

  constructor(private readonly prismaService: PrismaService) {}

  async listModuleDefinitions(query: ModuleDefinitionListQuery = {}) {
    if (await this.canUseModuleDefinitionStorage()) {
      await this.ensureModuleDefinitionStorageSeeded();
      const rows = await this.prismaService.moduleDefinition.findMany({
        where: this.buildDatabaseWhere(query),
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      });
      return rows.map((item) => this.normalizeModuleDefinition(item));
    }

    return database.moduleDefinitions
      .filter((item) => this.matchesSeedQuery(item, query))
      .sort((a, b) => (a.sortOrder === b.sortOrder ? b.updatedAt.localeCompare(a.updatedAt) : a.sortOrder - b.sortOrder))
      .map((item) => ({ ...item }));
  }

  async getModuleDefinition(moduleId: string) {
    if (await this.canUseModuleDefinitionStorage()) {
      await this.ensureModuleDefinitionStorageSeeded();
      const row = await this.prismaService.moduleDefinition.findUnique({
        where: { id: moduleId },
      });
      if (!row) {
        throw new NotFoundException("模块定义不存在");
      }
      return this.normalizeModuleDefinition(row);
    }

    const record = database.moduleDefinitions.find((item) => item.id === moduleId);
    if (!record) {
      throw new NotFoundException("模块定义不存在");
    }
    return { ...record };
  }

  async createModuleDefinition(payload: CreateModuleDefinitionPayload) {
    const record = this.buildRecord(payload);
    const now = new Date().toISOString();

    if (await this.canUseModuleDefinitionStorage()) {
      await this.ensureModuleDefinitionStorageSeeded();
      const duplicated = await this.prismaService.moduleDefinition.findUnique({
        where: { moduleKey: record.moduleKey },
      });
      if (duplicated) {
        throw new ConflictException("模块标识已存在");
      }

      const created = await this.prismaService.moduleDefinition.create({
        data: this.toDatabaseCreateInput(record, now),
      });
      return this.normalizeModuleDefinition(created);
    }

    const duplicated = database.moduleDefinitions.find((item) => item.moduleKey === record.moduleKey);
    if (duplicated) {
      throw new ConflictException("模块标识已存在");
    }

    const seedRecord: ModuleDefinitionRecord = {
      ...record,
      id: createId("module"),
      createdAt: now,
      updatedAt: now,
    };
    database.moduleDefinitions.unshift(seedRecord);
    return { ...seedRecord };
  }

  async updateModuleDefinition(moduleId: string, payload: UpdateModuleDefinitionPayload) {
    if (await this.canUseModuleDefinitionStorage()) {
      await this.ensureModuleDefinitionStorageSeeded();
      const current = await this.prismaService.moduleDefinition.findUnique({
        where: { id: moduleId },
      });
      if (!current) {
        throw new NotFoundException("模块定义不存在");
      }

      const nextModuleKey =
        payload.moduleKey !== undefined ? this.normalizeModuleKey(payload.moduleKey) : current.moduleKey;
      if (nextModuleKey !== current.moduleKey) {
        const duplicated = await this.prismaService.moduleDefinition.findUnique({
          where: { moduleKey: nextModuleKey },
        });
        if (duplicated && duplicated.id !== moduleId) {
          throw new ConflictException("模块标识已存在");
        }
      }

      const updated = await this.prismaService.moduleDefinition.update({
        where: { id: moduleId },
        data: this.toDatabaseUpdateInput(payload, current),
      });
      return this.normalizeModuleDefinition(updated);
    }

    const index = database.moduleDefinitions.findIndex((item) => item.id === moduleId);
    if (index < 0) {
      throw new NotFoundException("模块定义不存在");
    }

    const current = database.moduleDefinitions[index];
    const nextModuleKey = payload.moduleKey !== undefined ? this.normalizeModuleKey(payload.moduleKey) : current.moduleKey;
    const duplicated = database.moduleDefinitions.find((item) => item.moduleKey === nextModuleKey && item.id !== moduleId);
    if (duplicated) {
      throw new ConflictException("模块标识已存在");
    }

    const updated: ModuleDefinitionRecord = {
      ...current,
      ...this.buildRecord({ ...current, ...payload, moduleKey: nextModuleKey }),
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    database.moduleDefinitions[index] = updated;
    return { ...updated };
  }

  async archiveModuleDefinition(moduleId: string) {
    return this.updateModuleDefinition(moduleId, { moduleStatus: "ARCHIVED" });
  }

  async deleteModuleDefinition(moduleId: string) {
    if (await this.canUseModuleDefinitionStorage()) {
      await this.ensureModuleDefinitionStorageSeeded();
      const current = await this.prismaService.moduleDefinition.findUnique({
        where: { id: moduleId },
      });
      if (!current) {
        throw new NotFoundException("模块定义不存在");
      }
      await this.prismaService.moduleDefinition.delete({
        where: { id: moduleId },
      });
      return this.normalizeModuleDefinition(current);
    }

    const index = database.moduleDefinitions.findIndex((item) => item.id === moduleId);
    if (index < 0) {
      throw new NotFoundException("模块定义不存在");
    }
    const [deleted] = database.moduleDefinitions.splice(index, 1);
    return { ...deleted };
  }

  private normalizeModuleDefinition(row: ModuleDefinition): ModuleDefinitionRecord {
    return {
      id: row.id,
      moduleKey: row.moduleKey,
      moduleName: row.moduleName,
      moduleType: row.moduleType as ModuleDefinitionRecord["moduleType"],
      moduleStatus: row.moduleStatus as ModuleDefinitionRecord["moduleStatus"],
      entryRoute: row.entryRoute,
      icon: row.icon,
      sortOrder: row.sortOrder,
      description: row.description,
      requiredPermissions: this.normalizeStringArray(row.requiredPermissionsJson),
      featureFlags: this.normalizeStringArray(row.featureFlagsJson),
      isPlatformVisible: row.isPlatformVisible,
      isBrandVisible: row.isBrandVisible,
      isAdminVisible: row.isAdminVisible,
      requiredCapabilities: this.normalizeStringArray(row.requiredCapabilitiesJson),
      requiredProviders: this.normalizeStringArray(row.requiredProvidersJson),
      requiredTables: this.normalizeStringArray(row.requiredTablesJson),
      requiredStorages: this.normalizeStringArray(row.requiredStoragesJson),
      requiredThirdPartyPlatforms: this.normalizeStringArray(row.requiredThirdPartyPlatformsJson),
      taskTypes: this.normalizeStringArray(row.taskTypesJson),
      mediaTypes: this.normalizeStringArray(row.mediaTypesJson),
      workflowTypes: this.normalizeStringArray(row.workflowTypesJson),
      publishTargets: this.normalizeStringArray(row.publishTargetsJson),
      defaultSkillPackages: this.normalizeStringArray(row.defaultSkillPackagesJson),
      defaultKnowledgeSpaces: this.normalizeStringArray(row.defaultKnowledgeSpacesJson),
      defaultProviderPolicies: this.normalizeStringArray(row.defaultProviderPoliciesJson),
      phasePriority: row.phasePriority ? (row.phasePriority as ModuleDefinitionRecord["phasePriority"]) : undefined,
      remarks: row.remarks || undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  private normalizeModuleKey(value: string) {
    const moduleKey = String(value || "").trim().toLowerCase();
    if (!moduleKey) {
      throw new BadRequestException("模块标识不能为空");
    }
    if (!/^[a-z0-9-]+$/.test(moduleKey)) {
      throw new BadRequestException("模块标识只能使用英文小写、数字和短横线");
    }
    return moduleKey;
  }

  private normalizeEntryRoute(value: string) {
    const entryRoute = String(value || "").trim();
    if (!entryRoute) {
      throw new BadRequestException("入口路由不能为空");
    }
    if (!entryRoute.startsWith("/")) {
      throw new BadRequestException("入口路由必须以 / 开头");
    }
    return entryRoute;
  }

  private normalizeModuleType(value: string): ModuleDefinitionRecord["moduleType"] {
    const moduleType = String(value || "").trim().toUpperCase();
    if (!["WORKBENCH", "DOMAIN", "PLATFORM_CORE", "ADMIN_TOOL", "EXTERNAL_BRIDGE"].includes(moduleType)) {
      throw new BadRequestException("模块类型不合法");
    }
    return moduleType as ModuleDefinitionRecord["moduleType"];
  }

  private normalizeModuleStatus(value: string): ModuleDefinitionRecord["moduleStatus"] {
    const moduleStatus = String(value || "").trim().toUpperCase();
    if (!["PLANNING", "ACTIVE", "DISABLED", "ARCHIVED"].includes(moduleStatus)) {
      throw new BadRequestException("模块状态不合法");
    }
    return moduleStatus as ModuleDefinitionRecord["moduleStatus"];
  }

  private normalizePhasePriority(value: unknown): ModuleDefinitionRecord["phasePriority"] | undefined {
    const phasePriority = String(value || "").trim().toUpperCase();
    if (!phasePriority) {
      return undefined;
    }
    if (!["P0", "P1", "P2"].includes(phasePriority)) {
      throw new BadRequestException("阶段优先级不合法");
    }
    return phasePriority as ModuleDefinitionRecord["phasePriority"];
  }

  private ensureRequiredStringArray(fieldLabel: string, value: unknown) {
    const array = this.normalizeStringArray(value);
    if (!array.length) {
      throw new BadRequestException(`${fieldLabel}不能为空`);
    }
    return array;
  }

  private buildRecord(payload: Omit<ModuleDefinitionRecord, "id" | "createdAt" | "updatedAt">) {
    return {
      moduleKey: this.normalizeModuleKey(payload.moduleKey),
      moduleName: String(payload.moduleName || "").trim() || (() => { throw new BadRequestException("模块名称不能为空"); })(),
      moduleType: this.normalizeModuleType(payload.moduleType),
      moduleStatus: this.normalizeModuleStatus(payload.moduleStatus),
      entryRoute: this.normalizeEntryRoute(payload.entryRoute),
      icon: String(payload.icon || "").trim(),
      sortOrder: Number.isFinite(Number(payload.sortOrder)) ? Math.floor(Number(payload.sortOrder)) : 100,
      description: String(payload.description || "").trim(),
      requiredPermissions: this.ensureRequiredStringArray("所需权限", payload.requiredPermissions),
      featureFlags: this.ensureRequiredStringArray("功能开关", payload.featureFlags),
      isPlatformVisible: payload.isPlatformVisible ?? true,
      isBrandVisible: payload.isBrandVisible ?? true,
      isAdminVisible: payload.isAdminVisible ?? true,
      requiredCapabilities: this.ensureRequiredStringArray("依赖能力域", payload.requiredCapabilities),
      requiredProviders: this.normalizeStringArray(payload.requiredProviders),
      requiredTables: this.normalizeStringArray(payload.requiredTables),
      requiredStorages: this.normalizeStringArray(payload.requiredStorages),
      requiredThirdPartyPlatforms: this.normalizeStringArray(payload.requiredThirdPartyPlatforms),
      taskTypes: this.ensureRequiredStringArray("任务类型", payload.taskTypes),
      mediaTypes: this.normalizeStringArray(payload.mediaTypes),
      workflowTypes: this.normalizeStringArray(payload.workflowTypes),
      publishTargets: this.normalizeStringArray(payload.publishTargets),
      defaultSkillPackages: this.normalizeStringArray(payload.defaultSkillPackages),
      defaultKnowledgeSpaces: this.normalizeStringArray(payload.defaultKnowledgeSpaces),
      defaultProviderPolicies: this.normalizeStringArray(payload.defaultProviderPolicies),
      phasePriority: this.normalizePhasePriority(payload.phasePriority),
      remarks: String(payload.remarks || "").trim() || undefined,
    };
  }

  private toDatabaseCreateInput(record: ReturnType<ModuleDefinitionsService["buildRecord"]>, now: string) {
    return {
      id: createId("module"),
      moduleKey: record.moduleKey,
      moduleName: record.moduleName,
      moduleType: record.moduleType,
      moduleStatus: record.moduleStatus,
      entryRoute: record.entryRoute,
      icon: record.icon,
      sortOrder: record.sortOrder,
      description: record.description,
      requiredPermissionsJson: record.requiredPermissions,
      featureFlagsJson: record.featureFlags,
      isPlatformVisible: record.isPlatformVisible,
      isBrandVisible: record.isBrandVisible,
      isAdminVisible: record.isAdminVisible,
      requiredCapabilitiesJson: record.requiredCapabilities,
      requiredProvidersJson: record.requiredProviders,
      requiredTablesJson: record.requiredTables,
      requiredStoragesJson: record.requiredStorages,
      requiredThirdPartyPlatformsJson: record.requiredThirdPartyPlatforms,
      taskTypesJson: record.taskTypes,
      mediaTypesJson: record.mediaTypes,
      workflowTypesJson: record.workflowTypes,
      publishTargetsJson: record.publishTargets,
      defaultSkillPackagesJson: record.defaultSkillPackages,
      defaultKnowledgeSpacesJson: record.defaultKnowledgeSpaces,
      defaultProviderPoliciesJson: record.defaultProviderPolicies,
      phasePriority: record.phasePriority ?? null,
      remarks: record.remarks ?? "",
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  private toDatabaseUpdateInput(payload: UpdateModuleDefinitionPayload, current: ModuleDefinition) {
    const merged = this.buildRecord({
      moduleKey: payload.moduleKey ?? current.moduleKey,
      moduleName: payload.moduleName ?? current.moduleName,
      moduleType: (payload.moduleType ?? current.moduleType) as ModuleDefinitionRecord["moduleType"],
      moduleStatus: (payload.moduleStatus ?? current.moduleStatus) as ModuleDefinitionRecord["moduleStatus"],
      entryRoute: payload.entryRoute ?? current.entryRoute,
      icon: payload.icon ?? current.icon,
      sortOrder: payload.sortOrder ?? current.sortOrder,
      description: payload.description ?? current.description,
      requiredPermissions:
        payload.requiredPermissions ?? this.normalizeStringArray(current.requiredPermissionsJson),
      featureFlags: payload.featureFlags ?? this.normalizeStringArray(current.featureFlagsJson),
      isPlatformVisible: payload.isPlatformVisible ?? current.isPlatformVisible,
      isBrandVisible: payload.isBrandVisible ?? current.isBrandVisible,
      isAdminVisible: payload.isAdminVisible ?? current.isAdminVisible,
      requiredCapabilities:
        payload.requiredCapabilities ?? this.normalizeStringArray(current.requiredCapabilitiesJson),
      requiredProviders: payload.requiredProviders ?? this.normalizeStringArray(current.requiredProvidersJson),
      requiredTables: payload.requiredTables ?? this.normalizeStringArray(current.requiredTablesJson),
      requiredStorages: payload.requiredStorages ?? this.normalizeStringArray(current.requiredStoragesJson),
      requiredThirdPartyPlatforms:
        payload.requiredThirdPartyPlatforms ?? this.normalizeStringArray(current.requiredThirdPartyPlatformsJson),
      taskTypes: payload.taskTypes ?? this.normalizeStringArray(current.taskTypesJson),
      mediaTypes: payload.mediaTypes ?? this.normalizeStringArray(current.mediaTypesJson),
      workflowTypes: payload.workflowTypes ?? this.normalizeStringArray(current.workflowTypesJson),
      publishTargets: payload.publishTargets ?? this.normalizeStringArray(current.publishTargetsJson),
      defaultSkillPackages:
        payload.defaultSkillPackages ?? this.normalizeStringArray(current.defaultSkillPackagesJson),
      defaultKnowledgeSpaces:
        payload.defaultKnowledgeSpaces ?? this.normalizeStringArray(current.defaultKnowledgeSpacesJson),
      defaultProviderPolicies:
        payload.defaultProviderPolicies ?? this.normalizeStringArray(current.defaultProviderPoliciesJson),
      phasePriority: payload.phasePriority ?? (current.phasePriority as ModuleDefinitionRecord["phasePriority"] | null) ?? undefined,
      remarks: payload.remarks ?? current.remarks,
    });

    return {
      moduleKey: merged.moduleKey,
      moduleName: merged.moduleName,
      moduleType: merged.moduleType,
      moduleStatus: merged.moduleStatus,
      entryRoute: merged.entryRoute,
      icon: merged.icon,
      sortOrder: merged.sortOrder,
      description: merged.description,
      requiredPermissionsJson: merged.requiredPermissions,
      featureFlagsJson: merged.featureFlags,
      isPlatformVisible: merged.isPlatformVisible,
      isBrandVisible: merged.isBrandVisible,
      isAdminVisible: merged.isAdminVisible,
      requiredCapabilitiesJson: merged.requiredCapabilities,
      requiredProvidersJson: merged.requiredProviders,
      requiredTablesJson: merged.requiredTables,
      requiredStoragesJson: merged.requiredStorages,
      requiredThirdPartyPlatformsJson: merged.requiredThirdPartyPlatforms,
      taskTypesJson: merged.taskTypes,
      mediaTypesJson: merged.mediaTypes,
      workflowTypesJson: merged.workflowTypes,
      publishTargetsJson: merged.publishTargets,
      defaultSkillPackagesJson: merged.defaultSkillPackages,
      defaultKnowledgeSpacesJson: merged.defaultKnowledgeSpaces,
      defaultProviderPoliciesJson: merged.defaultProviderPolicies,
      phasePriority: merged.phasePriority ?? null,
      remarks: merged.remarks ?? "",
      updatedAt: new Date(),
    };
  }

  private buildDatabaseWhere(query: ModuleDefinitionListQuery) {
    const keyword = String(query.keyword || "").trim();
    return {
      moduleType: query.moduleType && query.moduleType !== "ALL" ? query.moduleType : undefined,
      moduleStatus: query.moduleStatus && query.moduleStatus !== "ALL" ? query.moduleStatus : undefined,
      OR: keyword
        ? [
            { moduleKey: { contains: keyword, mode: "insensitive" as const } },
            { moduleName: { contains: keyword, mode: "insensitive" as const } },
            { description: { contains: keyword, mode: "insensitive" as const } },
          ]
        : undefined,
    };
  }

  private matchesSeedQuery(item: ModuleDefinitionRecord, query: ModuleDefinitionListQuery) {
    if (query.moduleType && query.moduleType !== "ALL" && item.moduleType !== query.moduleType) {
      return false;
    }
    if (query.moduleStatus && query.moduleStatus !== "ALL" && item.moduleStatus !== query.moduleStatus) {
      return false;
    }
    const keyword = String(query.keyword || "").trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return [item.moduleKey, item.moduleName, item.description].some((field) =>
      String(field || "").toLowerCase().includes(keyword),
    );
  }

  private async canUseModuleDefinitionStorage() {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }
    try {
      const rows = await this.prismaService.$queryRawUnsafe<Array<{ moduleDefinition: string | null }>>(
        `SELECT to_regclass('"ModuleDefinition"') AS "moduleDefinition"`,
      );
      return Boolean(rows[0]?.moduleDefinition);
    } catch {
      return false;
    }
  }

  private async ensureModuleDefinitionStorageSeeded() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapModuleDefinitionStorage();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapModuleDefinitionStorage() {
    if (!(await this.canUseModuleDefinitionStorage())) {
      return;
    }
    if (!database.moduleDefinitions.length) {
      return;
    }
    await this.prismaService.moduleDefinition.createMany({
      data: database.moduleDefinitions.map((item) => ({
        id: item.id,
        moduleKey: item.moduleKey,
        moduleName: item.moduleName,
        moduleType: item.moduleType,
        moduleStatus: item.moduleStatus,
        entryRoute: item.entryRoute,
        icon: item.icon,
        sortOrder: item.sortOrder,
        description: item.description,
        requiredPermissionsJson: item.requiredPermissions,
        featureFlagsJson: item.featureFlags,
        isPlatformVisible: item.isPlatformVisible,
        isBrandVisible: item.isBrandVisible,
        isAdminVisible: item.isAdminVisible,
        requiredCapabilitiesJson: item.requiredCapabilities,
        requiredProvidersJson: item.requiredProviders,
        requiredTablesJson: item.requiredTables,
        requiredStoragesJson: item.requiredStorages,
        requiredThirdPartyPlatformsJson: item.requiredThirdPartyPlatforms,
        taskTypesJson: item.taskTypes,
        mediaTypesJson: item.mediaTypes,
        workflowTypesJson: item.workflowTypes,
        publishTargetsJson: item.publishTargets,
        defaultSkillPackagesJson: item.defaultSkillPackages,
        defaultKnowledgeSpacesJson: item.defaultKnowledgeSpaces,
        defaultProviderPoliciesJson: item.defaultProviderPolicies,
        phasePriority: item.phasePriority ?? null,
        remarks: item.remarks ?? "",
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      skipDuplicates: true,
    });
    const douyinWorkbench = await this.prismaService.moduleDefinition.findUnique({
      where: { moduleKey: "douyin-workbench" },
      select: { id: true, defaultSkillPackagesJson: true },
    });
    if (!douyinWorkbench) {
      return;
    }
    const currentPackages = Array.isArray(douyinWorkbench.defaultSkillPackagesJson)
      ? douyinWorkbench.defaultSkillPackagesJson
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [];
    const normalizedPackages = currentPackages
      .filter((item) => item !== "douyin-direct-video")
      .concat(currentPackages.includes("douyin-video-production") ? [] : ["douyin-video-production"]);
    if (
      normalizedPackages.length !== currentPackages.length
      || normalizedPackages.some((item, index) => item !== currentPackages[index])
    ) {
      await this.prismaService.moduleDefinition.update({
        where: { id: douyinWorkbench.id },
        data: { defaultSkillPackagesJson: normalizedPackages },
      });
    }
  }
}
