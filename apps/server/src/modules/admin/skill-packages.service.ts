import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { SkillPackage } from "@prisma/client";
import { createId, database, type SkillPackageRecord } from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";

export type SkillPackageListQuery = {
  keyword?: string;
  moduleKey?: string;
  status?: SkillPackageRecord["status"] | "ALL";
  scope?: SkillPackageRecord["scope"] | "ALL";
};

export type SkillPackageSummaryRecord = SkillPackageRecord & {
  moduleSummaries: Array<{
    moduleKey: string;
    moduleName: string;
    moduleType?: string;
    entryRoute?: string;
    moduleStatus?: string;
  }>;
  currentVersionNumber?: string;
  defaultProviderSummary?: {
    providerType: string;
    providerName?: string;
    modelName?: string;
  };
  brandOverrideCount: number;
  userOverrideCount: number;
  promptCount: number;
  skillCount: number;
};

type SkillPackageModuleSummaryRow = {
  id: string;
  packageId: string;
  packageKey: string;
  packageName: string;
  moduleKey: string;
  bindingType: "DEFAULT" | "OPTIONAL" | "SYSTEM_REQUIRED" | "EXPERIMENTAL";
  isDefault: boolean;
  sortOrder: number;
  enabled: boolean;
  remarks?: string;
  moduleName?: string;
  moduleType?: string;
  entryRoute?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSkillPackagePayload = Omit<SkillPackageRecord, "id" | "createdAt" | "updatedAt">;
export type UpdateSkillPackagePayload = Partial<Omit<SkillPackageRecord, "id" | "createdAt" | "updatedAt">>;

@Injectable()
export class SkillPackagesService {
  private bootstrapPromise?: Promise<void>;

  constructor(private readonly prismaService: PrismaService) {}

  async listSkillPackages(query: SkillPackageListQuery = {}): Promise<SkillPackageSummaryRecord[]> {
    if (await this.canUseSkillPackageStorage()) {
      await this.ensureSkillPackageStorageSeeded();
      const rows = await this.prismaService.skillPackage.findMany({
        where: this.buildDatabaseWhere(query),
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      });
      return this.enrichSkillPackages(rows.map((item) => this.normalizeSkillPackage(item)), query);
    }

    return this.enrichSkillPackages(
      database.skillPackages
      .filter((item) => this.matchesSeedQuery(item, query))
      .sort((a, b) => (a.sortOrder === b.sortOrder ? b.updatedAt.localeCompare(a.updatedAt) : a.sortOrder - b.sortOrder))
      .map((item) => ({ ...item })),
      query,
    );
  }

  async getSkillPackage(id: string) {
    if (await this.canUseSkillPackageStorage()) {
      await this.ensureSkillPackageStorageSeeded();
      const row = await this.prismaService.skillPackage.findUnique({
        where: { id },
      });
      if (!row) {
        throw new NotFoundException("能力包不存在");
      }
      return this.normalizeSkillPackage(row);
    }

    const record = database.skillPackages.find((item) => item.id === id);
    if (!record) {
      throw new NotFoundException("能力包不存在");
    }
    return { ...record };
  }

  async createSkillPackage(payload: CreateSkillPackagePayload) {
    const record = this.buildRecord(payload);
    const now = new Date().toISOString();

    if (await this.canUseSkillPackageStorage()) {
      await this.ensureSkillPackageStorageSeeded();
      const duplicated = await this.prismaService.skillPackage.findUnique({
        where: { packageKey: record.packageKey },
      });
      if (duplicated) {
        throw new ConflictException("能力包标识已存在");
      }
      const created = await this.prismaService.skillPackage.create({
        data: this.toDatabaseCreateInput(record, now),
      });
      return this.normalizeSkillPackage(created);
    }

    const duplicated = database.skillPackages.find((item) => item.packageKey === record.packageKey);
    if (duplicated) {
      throw new ConflictException("能力包标识已存在");
    }
    const created: SkillPackageRecord = {
      ...record,
      id: createId("sp"),
      createdAt: now,
      updatedAt: now,
    };
    database.skillPackages.unshift(created);
    return { ...created };
  }

  async updateSkillPackage(id: string, payload: UpdateSkillPackagePayload) {
    if (await this.canUseSkillPackageStorage()) {
      await this.ensureSkillPackageStorageSeeded();
      const current = await this.prismaService.skillPackage.findUnique({
        where: { id },
      });
      if (!current) {
        throw new NotFoundException("能力包不存在");
      }

      const nextPackageKey = payload.packageKey !== undefined ? this.normalizePackageKey(payload.packageKey) : current.packageKey;
      if (nextPackageKey !== current.packageKey) {
        const duplicated = await this.prismaService.skillPackage.findUnique({
          where: { packageKey: nextPackageKey },
        });
        if (duplicated && duplicated.id !== id) {
          throw new ConflictException("能力包标识已存在");
        }
      }

      const updated = await this.prismaService.skillPackage.update({
        where: { id },
        data: this.toDatabaseUpdateInput(payload, current),
      });
      return this.normalizeSkillPackage(updated);
    }

    const index = database.skillPackages.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("能力包不存在");
    }
    const current = database.skillPackages[index];
    const nextPackageKey = payload.packageKey !== undefined ? this.normalizePackageKey(payload.packageKey) : current.packageKey;
    const duplicated = database.skillPackages.find((item) => item.packageKey === nextPackageKey && item.id !== id);
    if (duplicated) {
      throw new ConflictException("能力包标识已存在");
    }

    const updated: SkillPackageRecord = {
      ...current,
      ...this.buildRecord({ ...current, ...payload, packageKey: nextPackageKey }),
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    database.skillPackages[index] = updated;
    return { ...updated };
  }

  async deleteSkillPackage(id: string) {
    if (await this.canUseSkillPackageStorage()) {
      await this.ensureSkillPackageStorageSeeded();
      const current = await this.prismaService.skillPackage.findUnique({
        where: { id },
      });
      if (!current) {
        throw new NotFoundException("能力包不存在");
      }
      await this.prismaService.skillPackage.delete({
        where: { id },
      });
      return this.normalizeSkillPackage(current);
    }

    const index = database.skillPackages.findIndex((item) => item.id === id);
    if (index < 0) {
      throw new NotFoundException("能力包不存在");
    }
    const [deleted] = database.skillPackages.splice(index, 1);
    return { ...deleted };
  }

  private normalizeSkillPackage(row: SkillPackage): SkillPackageRecord {
    return {
      id: row.id,
      packageKey: row.packageKey,
      packageName: row.packageName,
      description: row.description || undefined,
      status: row.status as SkillPackageRecord["status"],
      scope: row.scope as SkillPackageRecord["scope"],
      moduleKeys: this.normalizeStringArray(row.moduleKeysJson),
      workflowStepKeys: this.normalizeStringArray(row.workflowStepKeysJson),
      tags: this.normalizeStringArray(row.tagsJson),
      currentVersionId: row.currentVersionId || undefined,
      defaultKnowledgeSpaceIds: this.normalizeStringArray(row.defaultKnowledgeSpaceIdsJson),
      defaultProviderPolicyIds: this.normalizeStringArray(row.defaultProviderPolicyIdsJson),
      sortOrder: row.sortOrder,
      remarks: row.remarks || undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private buildRecord(payload: CreateSkillPackagePayload) {
    return {
      packageKey: this.normalizePackageKey(payload.packageKey),
      packageName: this.normalizePackageName(payload.packageName),
      description: String(payload.description || "").trim() || undefined,
      status: this.normalizeStatus(payload.status),
      scope: this.normalizeScope(payload.scope),
      moduleKeys: this.normalizeStringArrayInput(payload.moduleKeys),
      workflowStepKeys: this.normalizeStringArrayInput(payload.workflowStepKeys),
      tags: this.normalizeStringArrayInput(payload.tags),
      currentVersionId: String(payload.currentVersionId || "").trim() || undefined,
      defaultKnowledgeSpaceIds: this.normalizeStringArrayInput(payload.defaultKnowledgeSpaceIds),
      defaultProviderPolicyIds: this.normalizeStringArrayInput(payload.defaultProviderPolicyIds),
      sortOrder: this.normalizeSortOrder(payload.sortOrder),
      remarks: String(payload.remarks || "").trim() || undefined,
    };
  }

  private normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  private normalizeStringArrayInput(value: string[] | undefined) {
    return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
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

  private normalizeStatus(value: string | undefined): SkillPackageRecord["status"] {
    const status = String(value || "DRAFT").trim().toUpperCase();
    if (!["DRAFT", "ACTIVE", "DISABLED", "ARCHIVED"].includes(status)) {
      throw new BadRequestException("能力包状态不合法");
    }
    return status as SkillPackageRecord["status"];
  }

  private normalizeScope(value: string | undefined): SkillPackageRecord["scope"] {
    const scope = String(value || "PLATFORM").trim().toUpperCase();
    if (!["PLATFORM", "BRAND", "USER"].includes(scope)) {
      throw new BadRequestException("能力包作用域不合法");
    }
    return scope as SkillPackageRecord["scope"];
  }

  private normalizeSortOrder(value: number | undefined) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) {
      return 100;
    }
    return Math.floor(normalized);
  }

  private buildDatabaseWhere(query: SkillPackageListQuery) {
    const where: Record<string, unknown> = {};
    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim();
      where.OR = [
        { packageKey: { contains: keyword, mode: "insensitive" } },
        { packageName: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (query.status && query.status !== "ALL") {
      where.status = query.status;
    }
    if (query.scope && query.scope !== "ALL") {
      where.scope = query.scope;
    }
    return where;
  }

  private matchesSeedQuery(item: SkillPackageRecord, query: SkillPackageListQuery) {
    if (query.status && query.status !== "ALL" && item.status !== query.status) {
      return false;
    }
    if (query.scope && query.scope !== "ALL" && item.scope !== query.scope) {
      return false;
    }
    const keyword = query.keyword?.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return [item.packageKey, item.packageName, item.description, item.tags.join(","), item.moduleKeys.join(",")].some((field) =>
      String(field || "").toLowerCase().includes(keyword),
    );
  }

  private async enrichSkillPackages(
    packages: SkillPackageRecord[],
    query: SkillPackageListQuery,
  ): Promise<SkillPackageSummaryRecord[]> {
    const [moduleDefinitions, packageModules, packageSkills, skillPromptBindings, skillConfigs] = await Promise.all([
      this.loadModuleDefinitionsForSummary(),
      this.loadSkillPackageModulesForSummary(),
      this.loadSkillPackageSkillsForSummary(),
      this.loadSkillPromptBindingsForSummary(),
      this.loadSkillConfigsForSummary(),
    ]);

    return packages
      .map((item) => {
        const relationModules = packageModules.filter((relation) => relation.packageKey === item.packageKey && relation.enabled);
        const moduleSummaryMap = new Map<
          string,
          { moduleKey: string; moduleName: string; moduleType?: string; entryRoute?: string; moduleStatus?: string }
        >();

        relationModules.forEach((relation) => {
          const moduleMeta = moduleDefinitions.find((moduleItem) => moduleItem.moduleKey === relation.moduleKey);
          moduleSummaryMap.set(relation.moduleKey, {
            moduleKey: relation.moduleKey,
            moduleName: moduleMeta?.moduleName || relation.moduleName || relation.moduleKey,
            moduleType: moduleMeta?.moduleType || relation.moduleType,
            entryRoute: moduleMeta?.entryRoute || relation.entryRoute,
            moduleStatus: moduleMeta?.moduleStatus,
          });
        });

        item.moduleKeys.forEach((moduleKey) => {
          if (!moduleSummaryMap.has(moduleKey)) {
            const moduleMeta = moduleDefinitions.find((moduleItem) => moduleItem.moduleKey === moduleKey);
            moduleSummaryMap.set(moduleKey, {
              moduleKey,
              moduleName: moduleMeta?.moduleName || moduleKey,
              moduleType: moduleMeta?.moduleType,
              entryRoute: moduleMeta?.entryRoute,
              moduleStatus: moduleMeta?.moduleStatus,
            });
          }
        });

        const relatedSkills = packageSkills.filter((relation) => relation.packageKey === item.packageKey && relation.enabled);
        const relatedSkillIds = Array.from(new Set(relatedSkills.map((relation) => relation.skillId)));
        const promptIds = new Set(
          skillPromptBindings
            .filter((binding) => relatedSkillIds.includes(binding.skillId) && binding.enabled)
            .map((binding) => binding.promptId),
        );
        const firstSkill = relatedSkills
          .sort((left, right) => {
            if (left.isDefault !== right.isDefault) {
              return left.isDefault ? -1 : 1;
            }
            return left.sortOrder - right.sortOrder;
          })
          .map((relation) => skillConfigs.find((item2) => item2.id === relation.skillId || item2.slug === relation.skillSlug))
          .find(Boolean);

        return {
          ...item,
          moduleSummaries: Array.from(moduleSummaryMap.values()),
          currentVersionNumber: item.currentVersionId || undefined,
          defaultProviderSummary: firstSkill
            ? {
                providerType: this.inferProviderType(firstSkill.provider, firstSkill.defaultModel),
                providerName: firstSkill.provider,
                modelName: firstSkill.defaultModel,
              }
            : undefined,
          brandOverrideCount: 0,
          userOverrideCount: 0,
          promptCount: promptIds.size,
          skillCount: relatedSkillIds.length,
        };
      })
      .filter((item) => (query.moduleKey ? item.moduleSummaries.some((moduleItem) => moduleItem.moduleKey === query.moduleKey) : true));
  }

  private async loadModuleDefinitionsForSummary() {
    const canUseStorage = await this.tableExists("ModuleDefinition");
    if (!canUseStorage) {
      return database.moduleDefinitions;
    }
    const rows = await this.prismaService.moduleDefinition.findMany();
    return rows.map((row) => ({
      id: row.id,
      moduleKey: row.moduleKey,
      moduleName: row.moduleName,
      moduleType: row.moduleType as typeof database.moduleDefinitions[number]["moduleType"],
      moduleStatus: row.moduleStatus as typeof database.moduleDefinitions[number]["moduleStatus"],
      entryRoute: row.entryRoute,
    }));
  }

  private async loadSkillPackageModulesForSummary(): Promise<SkillPackageModuleSummaryRow[]> {
    const canUseStorage = await this.tableExists("SkillPackageModule");
    if (!canUseStorage) {
      return database.skillPackageModules.map((item) => ({ ...item }));
    }
    const rows = await this.prismaService.skillPackageModule.findMany({
      include: { module: true },
    });
    return rows.map((row) => ({
      id: row.id,
      packageId: row.packageId,
      packageKey: row.packageKey,
      packageName: row.packageName,
      moduleKey: row.moduleKey,
      bindingType: row.bindingType as typeof database.skillPackageModules[number]["bindingType"],
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
      remarks: row.remarks || undefined,
      moduleName: row.module?.moduleName,
      moduleType: row.module?.moduleType,
      entryRoute: row.module?.entryRoute,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  private async loadSkillPackageSkillsForSummary() {
    const canUseStorage = await this.tableExists("SkillPackageSkill");
    if (!canUseStorage) {
      return database.skillPackageSkills.map((item) => ({ ...item }));
    }
    const rows = await this.prismaService.skillPackageSkill.findMany({
      include: { skill: true },
    });
    return rows.map((row) => ({
      id: row.id,
      packageId: row.packageId,
      packageKey: row.packageKey,
      packageName: row.packageName,
      skillId: row.skillId,
      skillSlug: row.skillSlug,
      bindingType: row.bindingType as typeof database.skillPackageSkills[number]["bindingType"],
      isDefault: row.isDefault,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
      remarks: row.remarks || undefined,
      skillName: row.skill?.name,
      skillCategory: row.skill?.category,
      skillStatus: row.skill?.status as typeof database.skillPackageSkills[number]["skillStatus"],
      skillProvider: row.skill?.provider,
      skillDefaultModel: row.skill?.defaultModel,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  private async loadSkillPromptBindingsForSummary() {
    const canUseStorage = await this.tableExists("SkillPromptBinding");
    if (!canUseStorage) {
      return [];
    }
    return this.prismaService.skillPromptBinding.findMany();
  }

  private async loadSkillConfigsForSummary() {
    const canUseStorage = await this.tableExists("SkillConfig");
    if (!canUseStorage) {
      return database.skillConfigs.map((item) => ({ ...item }));
    }
    const rows = await this.prismaService.skillConfig.findMany();
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      status: row.status as typeof database.skillConfigs[number]["status"],
      provider: row.provider,
      defaultModel: row.defaultModel,
      pointsCost: row.pointsCost,
      description: row.description,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  private inferProviderType(providerName?: string, modelName?: string) {
    const normalized = `${providerName || ""} ${modelName || ""}`.toLowerCase();
    if (normalized.includes("image") || normalized.includes("文生图")) {
      return "IMAGE";
    }
    if (normalized.includes("video") || normalized.includes("seedance") || normalized.includes("视频")) {
      return "VIDEO";
    }
    if (normalized.includes("embedding")) {
      return "EMBEDDING";
    }
    if (normalized.includes("rerank")) {
      return "RERANK";
    }
    return "TEXT";
  }

  private async tableExists(tableName: string) {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }
    try {
      const rows = await this.prismaService.$queryRawUnsafe<Array<{ tableName: string | null }>>(
        `SELECT to_regclass('"${tableName}"') AS "tableName"`,
      );
      return Boolean(rows[0]?.tableName);
    } catch {
      return false;
    }
  }

  private toDatabaseCreateInput(record: ReturnType<SkillPackagesService["buildRecord"]>, now: string) {
    return {
      id: createId("sp"),
      packageKey: record.packageKey,
      packageName: record.packageName,
      description: record.description ?? "",
      status: record.status,
      scope: record.scope,
      moduleKeysJson: record.moduleKeys,
      workflowStepKeysJson: record.workflowStepKeys,
      tagsJson: record.tags,
      currentVersionId: record.currentVersionId,
      defaultKnowledgeSpaceIdsJson: record.defaultKnowledgeSpaceIds,
      defaultProviderPolicyIdsJson: record.defaultProviderPolicyIds,
      sortOrder: record.sortOrder,
      remarks: record.remarks ?? "",
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  private toDatabaseUpdateInput(payload: UpdateSkillPackagePayload, current: SkillPackage) {
    return {
      packageKey: payload.packageKey !== undefined ? this.normalizePackageKey(payload.packageKey) : current.packageKey,
      packageName: payload.packageName !== undefined ? this.normalizePackageName(payload.packageName) : current.packageName,
      description: payload.description !== undefined ? String(payload.description || "").trim() : current.description,
      status: payload.status !== undefined ? this.normalizeStatus(payload.status) : current.status,
      scope: payload.scope !== undefined ? this.normalizeScope(payload.scope) : current.scope,
      moduleKeysJson:
        payload.moduleKeys !== undefined
          ? this.normalizeStringArrayInput(payload.moduleKeys)
          : this.normalizeStringArray(current.moduleKeysJson),
      workflowStepKeysJson:
        payload.workflowStepKeys !== undefined
          ? this.normalizeStringArrayInput(payload.workflowStepKeys)
          : this.normalizeStringArray(current.workflowStepKeysJson),
      tagsJson:
        payload.tags !== undefined ? this.normalizeStringArrayInput(payload.tags) : this.normalizeStringArray(current.tagsJson),
      currentVersionId:
        payload.currentVersionId !== undefined ? String(payload.currentVersionId || "").trim() || null : current.currentVersionId,
      defaultKnowledgeSpaceIdsJson:
        payload.defaultKnowledgeSpaceIds !== undefined
          ? this.normalizeStringArrayInput(payload.defaultKnowledgeSpaceIds)
          : this.normalizeStringArray(current.defaultKnowledgeSpaceIdsJson),
      defaultProviderPolicyIdsJson:
        payload.defaultProviderPolicyIds !== undefined
          ? this.normalizeStringArrayInput(payload.defaultProviderPolicyIds)
          : this.normalizeStringArray(current.defaultProviderPolicyIdsJson),
      sortOrder: payload.sortOrder !== undefined ? this.normalizeSortOrder(payload.sortOrder) : current.sortOrder,
      remarks: payload.remarks !== undefined ? String(payload.remarks || "").trim() : current.remarks,
    };
  }

  private async canUseSkillPackageStorage() {
    if (!(await this.prismaService.canUseDatabase())) {
      return false;
    }
    try {
      const rows = await this.prismaService.$queryRawUnsafe<Array<{ skillPackage: string | null }>>(
        `SELECT to_regclass('"SkillPackage"') AS "skillPackage"`,
      );
      return Boolean(rows[0]?.skillPackage);
    } catch {
      return false;
    }
  }

  private async ensureSkillPackageStorageSeeded() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.bootstrapSkillPackageStorage();
    }
    await this.bootstrapPromise;
  }

  private async bootstrapSkillPackageStorage() {
    if (!(await this.canUseSkillPackageStorage())) {
      return;
    }
    const count = await this.prismaService.skillPackage.count();
    if (count > 0 || !database.skillPackages.length) {
      return;
    }
    await this.prismaService.skillPackage.createMany({
      data: database.skillPackages.map((item) => ({
        id: item.id,
        packageKey: item.packageKey,
        packageName: item.packageName,
        description: item.description ?? "",
        status: item.status,
        scope: item.scope,
        moduleKeysJson: item.moduleKeys,
        workflowStepKeysJson: item.workflowStepKeys,
        tagsJson: item.tags,
        currentVersionId: item.currentVersionId,
        defaultKnowledgeSpaceIdsJson: item.defaultKnowledgeSpaceIds,
        defaultProviderPolicyIdsJson: item.defaultProviderPolicyIds,
        sortOrder: item.sortOrder,
        remarks: item.remarks ?? "",
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      skipDuplicates: true,
    });
  }
}
