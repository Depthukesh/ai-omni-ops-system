import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { SkillPackage } from "@prisma/client";
import {
  createId,
  database,
  type ApiProviderRecord,
  type PromptTemplateRecord,
  type SkillPackageRecord,
  type SkillPackageVersionRecord,
} from "../../common/mock-data";
import { PrismaService } from "../../prisma/prisma.service";
import {
  SkillsPromptsService,
  type UpdatePromptTemplatePayload as BaseUpdateSkillPackagePromptPayload,
} from "./skills-prompts.service";

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

export type SkillPackageDetailQuery = {
  includePrompts?: boolean;
  includeReferences?: boolean;
  includeScripts?: boolean;
  includeKnowledge?: boolean;
  includeProviders?: boolean;
  includeVersions?: boolean;
  includeBrandOverrides?: boolean;
  includeUserOverrides?: boolean;
};

export type SkillPackageVersionView = {
  id: string;
  packageId: string;
  packageKey: string;
  versionNumber: string;
  changeLog?: string;
  sourceMode: "CURRENT_STATE" | "CLONE_FROM_VERSION";
  sourceVersionId?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  snapshotSummary?: {
    promptCount: number;
    referenceCount: number;
    scriptCount: number;
    knowledgeBindingCount: number;
    providerBindingCount: number;
  };
};

export type CreateSkillPackageVersionPayload = {
  versionNumber: string;
  changeLog?: string;
  sourceMode: "CURRENT_STATE" | "CLONE_FROM_VERSION";
  sourceVersionId?: string;
  createdBy?: string;
};

export type ActivateSkillPackageVersionPayload = {
  versionId: string;
};

export type UpdateSkillPackagePromptPayload = BaseUpdateSkillPackagePromptPayload;

export type SkillPackageDetailRecord = {
  package: SkillPackageSummaryRecord;
  skill?: {
    id: string;
    skillKey: string;
    skillName: string;
    summary?: string;
    executionMode: "SYNC" | "ASYNC" | "WORKFLOW_STEP";
  };
  moduleSummaries: SkillPackageSummaryRecord["moduleSummaries"];
  workflowStepSummaries: Array<{
    workflowKey: string;
    stepKey: string;
    stepName: string;
    stepOrder: number;
  }>;
  prompts?: Array<{
    id: string;
    promptKey: string;
    promptName: string;
    promptRole: "SYSTEM" | "USER_TEMPLATE" | "FORMATTER" | "SUMMARY";
    content: string;
    isDefault: boolean;
    versionTag?: string;
    status?: PromptTemplateRecord["status"];
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    updatedAt?: string;
  }>;
  references?: Array<Record<string, never>>;
  scripts?: Array<Record<string, never>>;
  knowledgeBindings?: Array<{
    id: string;
    knowledgeBaseId: string;
    knowledgeBaseName: string;
    bindingType: "DEFAULT";
    isDefault: boolean;
  }>;
  providerBindings?: Array<{
    id: string;
    providerType: "TEXT" | "IMAGE" | "VIDEO" | "EMBEDDING" | "RERANK";
    providerId?: string;
    providerName?: string;
    modelName?: string;
    priority: number;
    isDefault: boolean;
    fallbackProviderIds: string[];
    modelWhitelist: string[];
  }>;
  versions?: Array<{
    id: string;
    versionNumber: string;
    changeLog?: string;
    isActive: boolean;
    createdAt: string;
    createdBy?: string;
    snapshotSummary?: {
      promptCount: number;
      referenceCount: number;
      scriptCount: number;
      knowledgeBindingCount: number;
      providerBindingCount: number;
    };
  }>;
  brandOverrides?: Array<Record<string, never>>;
  userOverrides?: Array<Record<string, never>>;
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
  private versionBootstrapPromise?: Promise<void>;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly skillsPromptsService: SkillsPromptsService,
  ) {}

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

  async getSkillPackage(id: string, query: SkillPackageDetailQuery = {}): Promise<SkillPackageDetailRecord> {
    const includeOptions = this.normalizeDetailQuery(query);
    const packageRecord = await this.loadSkillPackageRecordById(id);
    const packageSummary = (await this.enrichSkillPackages([{ ...packageRecord }], {}))[0];

    if (!packageSummary) {
      throw new NotFoundException("能力包不存在");
    }

    const [packageSkills, skillConfigs, promptBindings, promptTemplates, providers, knowledgeBases] = await Promise.all([
      this.loadSkillPackageSkillsForSummary(),
      this.loadSkillConfigsForSummary(),
      this.loadSkillPromptBindingsForSummary(),
      this.loadPromptTemplatesForDetail(),
      this.loadApiProvidersForDetail(),
      this.loadKnowledgeBasesForDetail(),
    ]);

    const relatedSkillBindings = packageSkills
      .filter((relation) => relation.packageKey === packageSummary.packageKey && relation.enabled)
      .sort((left, right) => {
        if (left.isDefault !== right.isDefault) {
          return left.isDefault ? -1 : 1;
        }
        return left.sortOrder - right.sortOrder;
      });
    const primarySkill = relatedSkillBindings
      .map((relation) => skillConfigs.find((item) => item.id === relation.skillId || item.slug === relation.skillSlug))
      .find(Boolean);
    const promptDetails = this.buildPromptDetails(relatedSkillBindings, promptBindings, promptTemplates);
    const providerBindings = this.buildProviderBindings(relatedSkillBindings, skillConfigs, providers);
    const knowledgeBindings = this.buildKnowledgeBindings(packageSummary, knowledgeBases);
    const versionDetails = await this.loadVersionViewsByPackage(packageSummary);

    return {
      package: packageSummary,
      skill: primarySkill
        ? {
            id: primarySkill.id,
            skillKey: primarySkill.slug,
            skillName: primarySkill.name,
            summary: primarySkill.description || undefined,
            executionMode: packageSummary.workflowStepKeys.length ? "WORKFLOW_STEP" : "SYNC",
          }
        : undefined,
      moduleSummaries: packageSummary.moduleSummaries,
      workflowStepSummaries: this.buildWorkflowStepSummaries(packageSummary.workflowStepKeys),
      ...(includeOptions.includePrompts ? { prompts: promptDetails } : {}),
      ...(includeOptions.includeReferences ? { references: [] } : {}),
      ...(includeOptions.includeScripts ? { scripts: [] } : {}),
      ...(includeOptions.includeKnowledge ? { knowledgeBindings } : {}),
      ...(includeOptions.includeProviders ? { providerBindings } : {}),
      ...(includeOptions.includeVersions ? { versions: versionDetails } : {}),
      ...(includeOptions.includeBrandOverrides ? { brandOverrides: [] } : {}),
      ...(includeOptions.includeUserOverrides ? { userOverrides: [] } : {}),
    };
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

  async listSkillPackageVersions(packageId: string): Promise<{ items: SkillPackageVersionView[] }> {
    const packageRecord = await this.loadSkillPackageRecordById(packageId);
    return {
      items: await this.loadVersionViewsByPackage(packageRecord),
    };
  }

  async createSkillPackageVersion(packageId: string, payload: CreateSkillPackageVersionPayload): Promise<SkillPackageVersionView> {
    const packageRecord = await this.loadSkillPackageRecordById(packageId);
    const normalizedPayload = this.normalizeCreateVersionPayload(payload);
    const existingVersions = await this.loadVersionRecordsByPackage(packageRecord.id, packageRecord.packageKey);
    if (existingVersions.some((item) => item.versionNumber === normalizedPayload.versionNumber)) {
      throw new ConflictException("版本号已存在");
    }

    const sourceVersion =
      normalizedPayload.sourceMode === "CLONE_FROM_VERSION"
        ? existingVersions.find((item) => item.id === normalizedPayload.sourceVersionId)
        : undefined;
    if (normalizedPayload.sourceMode === "CLONE_FROM_VERSION" && !sourceVersion) {
      throw new BadRequestException("克隆来源版本不存在");
    }

    const snapshot = sourceVersion
      ? this.normalizeSnapshotSummary(sourceVersion.snapshotJson)
      : await this.buildVersionSnapshot(packageRecord);
    const now = new Date().toISOString();

    if (await this.tableExists("SkillPackageVersion")) {
      const created = await this.prismaService.skillPackageVersion.create({
        data: {
          id: createId("spv"),
          packageId: packageRecord.id,
          packageKey: packageRecord.packageKey,
          versionNumber: normalizedPayload.versionNumber,
          changeLog: normalizedPayload.changeLog ?? "",
          sourceMode: normalizedPayload.sourceMode,
          sourceVersionId: normalizedPayload.sourceVersionId,
          isActive: false,
          snapshotJson: snapshot,
          createdBy: normalizedPayload.createdBy,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
      });
      return this.normalizeVersionRecord(created);
    }

    const created: SkillPackageVersionRecord = {
      id: createId("spv"),
      packageId: packageRecord.id,
      packageKey: packageRecord.packageKey,
      versionNumber: normalizedPayload.versionNumber,
      changeLog: normalizedPayload.changeLog,
      sourceMode: normalizedPayload.sourceMode,
      sourceVersionId: normalizedPayload.sourceVersionId,
      isActive: false,
      snapshotJson: snapshot,
      createdBy: normalizedPayload.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    database.skillPackageVersions.unshift(created);
    return this.normalizeVersionRecord(created);
  }

  async activateSkillPackageVersion(packageId: string, payload: ActivateSkillPackageVersionPayload): Promise<SkillPackageVersionView> {
    const packageRecord = await this.loadSkillPackageRecordById(packageId);
    const versionId = String(payload.versionId || "").trim();
    if (!versionId) {
      throw new BadRequestException("版本 ID 不能为空");
    }

    if ((await this.tableExists("SkillPackageVersion")) && (await this.canUseSkillPackageStorage())) {
      const target = await this.prismaService.skillPackageVersion.findUnique({
        where: { id: versionId },
      });
      if (!target || target.packageId !== packageRecord.id) {
        throw new NotFoundException("版本不存在");
      }
      await this.prismaService.$transaction([
        this.prismaService.skillPackageVersion.updateMany({
          where: { packageId: packageRecord.id, isActive: true },
          data: { isActive: false, updatedAt: new Date() },
        }),
        this.prismaService.skillPackageVersion.update({
          where: { id: versionId },
          data: { isActive: true, updatedAt: new Date() },
        }),
        this.prismaService.skillPackage.update({
          where: { id: packageRecord.id },
          data: { currentVersionId: versionId, updatedAt: new Date() },
        }),
      ]);
      const activated = await this.prismaService.skillPackageVersion.findUnique({
        where: { id: versionId },
      });
      if (!activated) {
        throw new NotFoundException("版本不存在");
      }
      return this.normalizeVersionRecord(activated);
    }

    const targetIndex = database.skillPackageVersions.findIndex((item) => item.id === versionId && item.packageId === packageRecord.id);
    if (targetIndex < 0) {
      throw new NotFoundException("版本不存在");
    }
    database.skillPackageVersions = database.skillPackageVersions.map((item) =>
      item.packageId === packageRecord.id
        ? {
            ...item,
            isActive: item.id === versionId,
            updatedAt: item.id === versionId ? new Date().toISOString() : item.updatedAt,
          }
        : item,
    );
    const packageIndex = database.skillPackages.findIndex((item) => item.id === packageRecord.id);
    if (packageIndex >= 0) {
      database.skillPackages[packageIndex] = {
        ...database.skillPackages[packageIndex],
        currentVersionId: versionId,
        updatedAt: new Date().toISOString(),
      };
    }
    return this.normalizeVersionRecord(database.skillPackageVersions[targetIndex]);
  }

  async updateSkillPackagePrompt(
    packageId: string,
    promptId: string,
    payload: UpdateSkillPackagePromptPayload,
  ): Promise<NonNullable<SkillPackageDetailRecord["prompts"]>[number]> {
    const packageRecord = await this.loadSkillPackageRecordById(packageId);
    const packagePrompts = await this.loadPromptDetailsByPackage(packageRecord);
    const currentPrompt = packagePrompts.find((item) => item.id === promptId);
    if (!currentPrompt) {
      throw new NotFoundException("当前能力包下不存在该 Prompt");
    }

    const updatedPrompt = await this.skillsPromptsService.updatePrompt(
      promptId,
      this.normalizeUpdatePromptPayload(payload),
    );

    return {
      ...currentPrompt,
      promptKey: updatedPrompt.scene,
      promptName: updatedPrompt.name,
      content: updatedPrompt.content,
      versionTag: updatedPrompt.version,
      status: updatedPrompt.status,
      modelName: updatedPrompt.modelName,
      temperature: updatedPrompt.temperature,
      maxTokens: updatedPrompt.maxTokens,
      updatedAt: updatedPrompt.updatedAt,
    };
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

  private normalizeDetailQuery(query: SkillPackageDetailQuery) {
    return {
      includePrompts: query.includePrompts ?? true,
      includeReferences: query.includeReferences ?? false,
      includeScripts: query.includeScripts ?? false,
      includeKnowledge: query.includeKnowledge ?? false,
      includeProviders: query.includeProviders ?? true,
      includeVersions: query.includeVersions ?? true,
      includeBrandOverrides: query.includeBrandOverrides ?? false,
      includeUserOverrides: query.includeUserOverrides ?? false,
    };
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
    const [moduleDefinitions, packageModules, packageSkills, skillPromptBindings, skillConfigs, versionRows] = await Promise.all([
      this.loadModuleDefinitionsForSummary(),
      this.loadSkillPackageModulesForSummary(),
      this.loadSkillPackageSkillsForSummary(),
      this.loadSkillPromptBindingsForSummary(),
      this.loadSkillConfigsForSummary(),
      this.loadSkillPackageVersionsForSummary(),
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
        const currentVersion = versionRows.find((versionItem) => versionItem.packageId === item.id && versionItem.isActive)
          || versionRows.find((versionItem) => versionItem.packageId === item.id && versionItem.id === item.currentVersionId);

        return {
          ...item,
          moduleSummaries: Array.from(moduleSummaryMap.values()),
          currentVersionNumber: currentVersion?.versionNumber || item.currentVersionId || undefined,
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

  private buildWorkflowStepSummaries(workflowStepKeys: string[]) {
    return workflowStepKeys.map((stepKey, index) => ({
      workflowKey: stepKey.replace(/-step$/i, ""),
      stepKey,
      stepName: this.humanizeKey(stepKey),
      stepOrder: index + 1,
    }));
  }

  private buildPromptDetails(
    relatedSkillBindings: Awaited<ReturnType<SkillPackagesService["loadSkillPackageSkillsForSummary"]>>,
    promptBindings: Awaited<ReturnType<SkillPackagesService["loadSkillPromptBindingsForSummary"]>>,
    promptTemplates: PromptTemplateRecord[],
  ) {
    const relatedSkillIds = new Set(relatedSkillBindings.map((item) => item.skillId));
    const relatedSkillSlugs = new Set(relatedSkillBindings.map((item) => item.skillSlug));
    const relevantBindings = promptBindings
      .filter(
        (binding) =>
          binding.enabled &&
          (relatedSkillIds.has(binding.skillId) || (binding.skillSlug ? relatedSkillSlugs.has(binding.skillSlug) : false)),
      )
      .sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }
        return left.sortOrder - right.sortOrder;
      });

    const detailMap = new Map<string, NonNullable<SkillPackageDetailRecord["prompts"]>[number]>();
    relevantBindings.forEach((binding, index) => {
      const prompt = promptTemplates.find((item) => item.id === binding.promptId);
      detailMap.set(binding.promptId, {
        id: binding.promptId,
        promptKey: prompt?.scene || binding.promptScene || binding.promptId,
        promptName: prompt?.name || binding.promptScene || binding.promptId,
        promptRole: this.inferPromptRole(binding.bindingType, binding.isPrimary, index),
        content: prompt?.content || "",
        isDefault: binding.isPrimary || index === 0,
        versionTag: prompt?.version,
        status: prompt?.status,
        modelName: prompt?.modelName,
        temperature: prompt?.temperature,
        maxTokens: prompt?.maxTokens,
        updatedAt: prompt?.updatedAt,
      });
    });

    return Array.from(detailMap.values());
  }

  private async loadPromptDetailsByPackage(packageRecord: Pick<SkillPackageRecord, "packageKey">) {
    const [packageSkills, promptBindings, promptTemplates] = await Promise.all([
      this.loadSkillPackageSkillsForSummary(),
      this.loadSkillPromptBindingsForSummary(),
      this.loadPromptTemplatesForDetail(),
    ]);
    const relatedSkillBindings = packageSkills
      .filter((relation) => relation.packageKey === packageRecord.packageKey && relation.enabled)
      .sort((left, right) => {
        if (left.isDefault !== right.isDefault) {
          return left.isDefault ? -1 : 1;
        }
        return left.sortOrder - right.sortOrder;
      });
    return this.buildPromptDetails(relatedSkillBindings, promptBindings, promptTemplates);
  }

  private normalizeUpdatePromptPayload(payload: UpdateSkillPackagePromptPayload): UpdateSkillPackagePromptPayload {
    const normalized: UpdateSkillPackagePromptPayload = {};

    if (payload.status !== undefined) {
      const status = String(payload.status || "").trim().toUpperCase();
      if (!["ACTIVE", "DISABLED", "DRAFT"].includes(status)) {
        throw new BadRequestException("Prompt 状态不合法");
      }
      normalized.status = status as PromptTemplateRecord["status"];
    }

    if (payload.modelName !== undefined) {
      const modelName = String(payload.modelName || "").trim();
      if (!modelName) {
        throw new BadRequestException("Prompt 模型不能为空");
      }
      normalized.modelName = modelName;
    }

    if (payload.temperature !== undefined) {
      const temperature = Number(payload.temperature);
      if (!Number.isFinite(temperature)) {
        throw new BadRequestException("温度参数不合法");
      }
      normalized.temperature = temperature;
    }

    if (payload.maxTokens !== undefined) {
      const maxTokens = Number(payload.maxTokens);
      if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
        throw new BadRequestException("最大 Tokens 不合法");
      }
      normalized.maxTokens = Math.floor(maxTokens);
    }

    if (payload.content !== undefined) {
      normalized.content = String(payload.content);
    }

    if (!Object.keys(normalized).length) {
      throw new BadRequestException("至少需要更新一个 Prompt 字段");
    }

    return normalized;
  }

  private buildKnowledgeBindings(packageSummary: SkillPackageSummaryRecord, knowledgeBases: Array<{ id: string; name: string }>) {
    return packageSummary.defaultKnowledgeSpaceIds.map((knowledgeBaseId, index) => ({
      id: `${packageSummary.id}:knowledge:${knowledgeBaseId}`,
      knowledgeBaseId,
      knowledgeBaseName: knowledgeBases.find((item) => item.id === knowledgeBaseId)?.name || knowledgeBaseId,
      bindingType: "DEFAULT" as const,
      isDefault: index === 0,
    }));
  }

  private buildProviderBindings(
    relatedSkillBindings: Awaited<ReturnType<SkillPackagesService["loadSkillPackageSkillsForSummary"]>>,
    skillConfigs: Awaited<ReturnType<SkillPackagesService["loadSkillConfigsForSummary"]>>,
    providers: ApiProviderRecord[],
  ) {
    return relatedSkillBindings.map((relation, index) => {
      const skill = skillConfigs.find((item) => item.id === relation.skillId || item.slug === relation.skillSlug);
      const scopedModel = this.parseScopedModel(skill?.defaultModel || relation.skillDefaultModel);
      const modelName = scopedModel.modelName || skill?.defaultModel || relation.skillDefaultModel || undefined;
      const provider = providers.find((item) => {
        if (scopedModel.providerId && item.id === scopedModel.providerId) {
          return true;
        }
        if (skill?.provider && item.name === skill.provider) {
          return true;
        }
        return modelName ? item.modelWhitelist.includes(modelName) || item.defaultModel === modelName : false;
      });

      return {
        id: relation.id,
        providerType: this.inferProviderType(provider?.name || skill?.provider || relation.skillProvider, modelName) as
          | "TEXT"
          | "IMAGE"
          | "VIDEO"
          | "EMBEDDING"
          | "RERANK",
        providerId: provider?.id || scopedModel.providerId || undefined,
        providerName: provider?.name || skill?.provider || relation.skillProvider || undefined,
        modelName,
        priority: relation.sortOrder || index + 1,
        isDefault: relation.isDefault || index === 0,
        fallbackProviderIds: [],
        modelWhitelist: provider?.modelWhitelist || (modelName ? [modelName] : []),
      };
    });
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

  private async loadPromptTemplatesForDetail() {
    const canUseStorage = await this.tableExists("PromptTemplate");
    if (!canUseStorage) {
      return database.promptTemplates.map((item) => ({ ...item }));
    }
    const rows = await this.prismaService.promptTemplate.findMany();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      scene: row.scene,
      version: row.version,
      status: row.status as PromptTemplateRecord["status"],
      modelName: row.modelName,
      temperature: row.temperature,
      maxTokens: row.maxTokens,
      content: row.content,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  private async loadApiProvidersForDetail() {
    const canUseStorage = await this.tableExists("ApiProviderConfig");
    if (!canUseStorage) {
      return database.apiProviders.map((item) => ({ ...item }));
    }
    const rows = await this.prismaService.apiProviderConfig.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      providerType: row.providerType as ApiProviderRecord["providerType"],
      status: row.status as ApiProviderRecord["status"],
      baseUrl: row.baseUrl,
      tutorialUrl: row.tutorialUrl,
      modelWhitelist: this.normalizeStringArray(row.modelWhitelistJson),
      apiKey: row.apiKey,
      defaultModel: row.defaultModel,
      organization: row.organization,
      project: row.project,
      timeoutMs: row.timeoutMs,
      streamEnabled: row.streamEnabled,
      customHeaders: this.normalizeStringMap(row.customHeadersJson),
      extraParams: this.normalizeJsonObject(row.extraParamsJson),
      remark: row.remark,
      successRate: row.successRate,
      requestCount24h: row.requestCount24h,
      totalCostYuan: row.totalCostYuan,
      lastCalledAt: row.lastCalledAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  private async loadKnowledgeBasesForDetail() {
    const canUseStorage = await this.tableExists("KnowledgeBase");
    if (!canUseStorage) {
      return database.knowledgeBases.map((item) => ({ id: item.id, name: item.name }));
    }
    const rows = await this.prismaService.knowledgeBase.findMany();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
    }));
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

  private async loadSkillPackageVersionsForSummary() {
    if (await this.tableExists("SkillPackageVersion")) {
      await this.ensureSkillPackageVersionStorageSeeded();
      const rows = await this.prismaService.skillPackageVersion.findMany({
        orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      });
      return rows.map((row) => this.normalizeVersionRecord(row));
    }
    return database.skillPackageVersions.map((item) => this.normalizeVersionRecord(item));
  }

  private async loadVersionViewsByPackage(packageRecord: Pick<SkillPackageRecord, "id" | "packageKey" | "currentVersionId">) {
    const records = await this.loadVersionRecordsByPackage(packageRecord.id, packageRecord.packageKey);
    const versionViews = records.map((item) => this.normalizeVersionRecord(item));
    if (versionViews.length) {
      return versionViews;
    }
    if (!packageRecord.currentVersionId) {
      return [];
    }
    const fallbackVersion: SkillPackageVersionView = {
        id: packageRecord.currentVersionId,
        packageId: packageRecord.id,
        packageKey: packageRecord.packageKey,
        versionNumber: this.normalizeVersionNumber(packageRecord.currentVersionId),
        changeLog: "第一阶段版本表未落地前的兼容占位版本。",
        sourceMode: "CURRENT_STATE",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        snapshotSummary: {
          promptCount: 0,
          referenceCount: 0,
          scriptCount: 0,
          knowledgeBindingCount: 0,
          providerBindingCount: 0,
        },
      };
    return [fallbackVersion];
  }

  private async loadVersionRecordsByPackage(packageId: string, packageKey: string) {
    if (await this.tableExists("SkillPackageVersion")) {
      await this.ensureSkillPackageVersionStorageSeeded();
      return this.prismaService.skillPackageVersion.findMany({
        where: {
          OR: [{ packageId }, { packageKey }],
        },
        orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }],
      });
    }
    return database.skillPackageVersions
      .filter((item) => item.packageId === packageId || item.packageKey === packageKey)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private async buildVersionSnapshot(packageRecord: Pick<SkillPackageRecord, "id" | "packageKey" | "defaultKnowledgeSpaceIds">) {
    const [packageSkills, promptBindings] = await Promise.all([
      this.loadSkillPackageSkillsForSummary(),
      this.loadSkillPromptBindingsForSummary(),
    ]);
    const relatedSkills = packageSkills.filter((item) => item.packageKey === packageRecord.packageKey && item.enabled);
    const relatedSkillIds = Array.from(new Set(relatedSkills.map((item) => item.skillId)));
    const promptIds = new Set(
      promptBindings
        .filter((item) => item.enabled && relatedSkillIds.includes(item.skillId))
        .map((item) => item.promptId),
    );
    return {
      promptCount: promptIds.size,
      referenceCount: 0,
      scriptCount: 0,
      knowledgeBindingCount: packageRecord.defaultKnowledgeSpaceIds.length,
      providerBindingCount: relatedSkills.length ? 1 : 0,
    };
  }

  private normalizeVersionRecord(
    row:
      | SkillPackageVersionRecord
      | {
          id: string;
          packageId: string;
          packageKey: string;
          versionNumber: string;
          changeLog: string;
          sourceMode: string;
          sourceVersionId: string | null;
          isActive: boolean;
          snapshotJson: unknown;
          createdBy: string | null;
          createdAt: Date;
          updatedAt: Date;
        },
  ): SkillPackageVersionView {
    return {
      id: row.id,
      packageId: row.packageId,
      packageKey: row.packageKey,
      versionNumber: row.versionNumber,
      changeLog: row.changeLog || undefined,
      sourceMode: (row.sourceMode as SkillPackageVersionView["sourceMode"]) || "CURRENT_STATE",
      sourceVersionId: row.sourceVersionId || undefined,
      isActive: row.isActive,
      createdBy: row.createdBy || undefined,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      snapshotSummary: this.normalizeSnapshotSummary(row.snapshotJson),
    };
  }

  private normalizeSnapshotSummary(value: unknown): NonNullable<SkillPackageVersionView["snapshotSummary"]> {
    const snapshot = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    return {
      promptCount: this.normalizeSnapshotCount(snapshot.promptCount),
      referenceCount: this.normalizeSnapshotCount(snapshot.referenceCount),
      scriptCount: this.normalizeSnapshotCount(snapshot.scriptCount),
      knowledgeBindingCount: this.normalizeSnapshotCount(snapshot.knowledgeBindingCount),
      providerBindingCount: this.normalizeSnapshotCount(snapshot.providerBindingCount),
    };
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

  private inferPromptRole(bindingType?: string, isPrimary?: boolean, index = 0) {
    if (isPrimary || index === 0) {
      return "SYSTEM" as const;
    }
    if (bindingType === "FALLBACK") {
      return "FORMATTER" as const;
    }
    if (bindingType === "SUPPLEMENTAL") {
      return "USER_TEMPLATE" as const;
    }
    return "SUMMARY" as const;
  }

  private parseScopedModel(value?: string) {
    const normalized = String(value || "").trim();
    if (!normalized.includes("::")) {
      return { providerId: "", modelName: normalized };
    }
    const [providerId, modelName] = normalized.split("::", 2);
    return {
      providerId: providerId.trim(),
      modelName: modelName.trim(),
    };
  }

  private normalizeVersionNumber(versionId: string) {
    const normalized = String(versionId || "").trim();
    if (!normalized) {
      return "v1";
    }
    const segments = normalized.split("_");
    return segments[segments.length - 1] || normalized;
  }

  private normalizeCreateVersionPayload(payload: CreateSkillPackageVersionPayload): CreateSkillPackageVersionPayload {
    const versionNumber = String(payload.versionNumber || "").trim();
    if (!versionNumber) {
      throw new BadRequestException("版本号不能为空");
    }
    const sourceMode = String(payload.sourceMode || "CURRENT_STATE").trim().toUpperCase();
    if (!["CURRENT_STATE", "CLONE_FROM_VERSION"].includes(sourceMode)) {
      throw new BadRequestException("版本来源模式不合法");
    }
    const sourceVersionId = String(payload.sourceVersionId || "").trim() || undefined;
    if (sourceMode === "CLONE_FROM_VERSION" && !sourceVersionId) {
      throw new BadRequestException("克隆来源版本不能为空");
    }
    return {
      versionNumber,
      changeLog: String(payload.changeLog || "").trim() || undefined,
      sourceMode: sourceMode as CreateSkillPackageVersionPayload["sourceMode"],
      sourceVersionId,
      createdBy: String(payload.createdBy || "").trim() || undefined,
    };
  }

  private humanizeKey(value: string) {
    return String(value || "")
      .trim()
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (segment) => segment.toUpperCase());
  }

  private normalizeStringMap(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, String(item ?? "")]),
    );
  }

  private normalizeJsonObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return { ...(value as Record<string, unknown>) };
  }

  private normalizeSnapshotCount(value: unknown) {
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  }

  private async loadSkillPackageRecordById(id: string) {
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

  private async ensureSkillPackageVersionStorageSeeded() {
    if (!this.versionBootstrapPromise) {
      this.versionBootstrapPromise = this.bootstrapSkillPackageVersionStorage();
    }
    await this.versionBootstrapPromise;
  }

  private async bootstrapSkillPackageVersionStorage() {
    if (!(await this.tableExists("SkillPackageVersion"))) {
      return;
    }
    const count = await this.prismaService.skillPackageVersion.count();
    if (count > 0 || !database.skillPackageVersions.length) {
      return;
    }
    await this.prismaService.skillPackageVersion.createMany({
      data: database.skillPackageVersions.map((item) => ({
        id: item.id,
        packageId: item.packageId,
        packageKey: item.packageKey,
        versionNumber: item.versionNumber,
        changeLog: item.changeLog ?? "",
        sourceMode: item.sourceMode,
        sourceVersionId: item.sourceVersionId,
        isActive: item.isActive,
        snapshotJson: item.snapshotJson,
        createdBy: item.createdBy,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      skipDuplicates: true,
    });
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
