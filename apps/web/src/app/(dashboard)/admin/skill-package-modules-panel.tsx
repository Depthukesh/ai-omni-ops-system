"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  createSkillPackageModule,
  deleteSkillPackageModule,
  getSkillPackageModules,
  skillPackageModuleSeed,
  updateModuleDefinition,
  updateSkillPackageModule,
  type ModuleDefinitionRecord,
  type SkillPackageRecord,
  type SkillPackageModuleRecord,
} from "../../../services/admin";

type SkillPackageModulesPanelProps = {
  modules: ModuleDefinitionRecord[];
  skillPackages: SkillPackageRecord[];
  onModulesChange: Dispatch<SetStateAction<ModuleDefinitionRecord[]>>;
  dataSource: "api" | "seed";
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

type SkillPackageModuleFilters = {
  moduleKey: "ALL" | string;
  bindingType: "ALL" | SkillPackageModuleRecord["bindingType"];
  enabled: "ALL" | "true" | "false";
  keyword: string;
};

type SkillPackageModuleDraft = {
  packageId: string;
  packageKey: string;
  packageName: string;
  moduleKey: string;
  bindingType: SkillPackageModuleRecord["bindingType"];
  isDefault: boolean;
  sortOrder: string;
  enabled: boolean;
  remarks: string;
};

const DEFAULT_FILTERS: SkillPackageModuleFilters = {
  moduleKey: "ALL",
  bindingType: "ALL",
  enabled: "ALL",
  keyword: "",
};

const BINDING_TYPE_OPTIONS: SkillPackageModuleRecord["bindingType"][] = [
  "DEFAULT",
  "OPTIONAL",
  "SYSTEM_REQUIRED",
  "EXPERIMENTAL",
];

export function SkillPackageModulesPanel(props: SkillPackageModulesPanelProps) {
  const [filters, setFilters] = useState<SkillPackageModuleFilters>(DEFAULT_FILTERS);
  const [relations, setRelations] = useState<SkillPackageModuleRecord[]>(skillPackageModuleSeed);
  const [selectedRelationId, setSelectedRelationId] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<SkillPackageModuleDraft>(buildCreateDraft(props.modules, props.skillPackages));
  const [createDraft, setCreateDraft] = useState<SkillPackageModuleDraft>(buildCreateDraft(props.modules, props.skillPackages));
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingDefaults, setIsSyncingDefaults] = useState(false);
  const [syncingModuleKey, setSyncingModuleKey] = useState("");
  const [isBackfillingDefaults, setIsBackfillingDefaults] = useState(false);
  const [backfillingModuleKey, setBackfillingModuleKey] = useState("");
  const [busyActionKey, setBusyActionKey] = useState("");
  const [busyRelationId, setBusyRelationId] = useState("");

  const visibleRelations = useMemo(() => {
    return relations.filter((item) => matchesFilters(item, filters));
  }, [filters, relations]);

  const selectedRelation = useMemo(
    () => visibleRelations.find((item) => item.id === selectedRelationId) || relations.find((item) => item.id === selectedRelationId) || null,
    [relations, selectedRelationId, visibleRelations],
  );

  const defaultPackageReconciliation = useMemo(() => {
    return props.modules
      .map((module) => {
        const declaredPackageKeys = Array.from(new Set(module.defaultSkillPackages.map((item) => String(item || "").trim()).filter(Boolean)));
        const existingKeys = new Set(
          relations.filter((item) => item.moduleKey === module.moduleKey).map((item) => item.packageKey),
        );
        const missingPackageKeys = declaredPackageKeys.filter((item) => !existingKeys.has(item));
        const creatablePackages = missingPackageKeys
          .map((packageKey) => props.skillPackages.find((item) => item.packageKey === packageKey) || null)
          .filter((item): item is SkillPackageRecord => Boolean(item));
        const unresolvedPackageKeys = missingPackageKeys.filter(
          (packageKey) => !creatablePackages.some((item) => item.packageKey === packageKey),
        );
        return {
          module,
          declaredPackageKeys,
          missingPackageKeys,
          creatablePackages,
          unresolvedPackageKeys,
        };
      })
      .filter((item) => item.missingPackageKeys.length || item.unresolvedPackageKeys.length);
  }, [props.modules, props.skillPackages, relations]);

  const creatableDefaultBindings = useMemo(
    () =>
      defaultPackageReconciliation.flatMap((item) =>
        item.creatablePackages.map((skillPackage) => ({
          module: item.module,
          skillPackage,
        })),
      ),
    [defaultPackageReconciliation],
  );

  const unresolvedDefaultBindings = useMemo(
    () =>
      defaultPackageReconciliation.flatMap((item) =>
        item.unresolvedPackageKeys.map((packageKey) => ({
          module: item.module,
          packageKey,
        })),
      ),
    [defaultPackageReconciliation],
  );

  const relationDefaultReconciliation = useMemo(() => {
    return props.modules
      .map((module) => {
        const declaredPackageKeys = Array.from(new Set(module.defaultSkillPackages.map((item) => String(item || "").trim()).filter(Boolean)));
        const relationDefaultKeys = Array.from(
          new Set(
            relations
              .filter(
                (item) =>
                  item.moduleKey === module.moduleKey && item.bindingType === "DEFAULT" && item.isDefault && item.enabled,
              )
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((item) => item.packageKey),
          ),
        );
        const missingInModuleDefaults = relationDefaultKeys.filter((item) => !declaredPackageKeys.includes(item));
        return {
          module,
          declaredPackageKeys,
          relationDefaultKeys,
          missingInModuleDefaults,
        };
      })
      .filter((item) => item.missingInModuleDefaults.length);
  }, [props.modules, relations]);

  const backfillableModuleDefaults = useMemo(
    () =>
      relationDefaultReconciliation.flatMap((item) =>
        item.missingInModuleDefaults.map((packageKey) => ({
          module: item.module,
          packageKey,
        })),
      ),
    [relationDefaultReconciliation],
  );

  const relationSourceReconciliation = useMemo(() => {
    return props.modules
      .map((module) => {
        const declaredPackageKeys = Array.from(new Set(module.defaultSkillPackages.map((item) => String(item || "").trim()).filter(Boolean)));
        const relationDefaultKeys = Array.from(
          new Set(
            relations
              .filter(
                (item) =>
                  item.moduleKey === module.moduleKey && item.bindingType === "DEFAULT" && item.isDefault && item.enabled,
              )
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((item) => item.packageKey),
          ),
        );
        return {
          module,
          declaredPackageKeys,
          relationDefaultKeys,
          hasDrift: declaredPackageKeys.join("|") !== relationDefaultKeys.join("|"),
        };
      })
      .filter((item) => item.hasDrift);
  }, [props.modules, relations]);

  const moduleConflictInsights = useMemo(() => {
    return props.modules
      .map((module) => {
        const declaredPackageKeys = Array.from(new Set(module.defaultSkillPackages.map((item) => String(item || "").trim()).filter(Boolean))).sort();
        const moduleRelations = relations.filter((item) => item.moduleKey === module.moduleKey);
        const enabledDefaultRelations = moduleRelations.filter((item) => item.enabled && item.isDefault);
        const relationDefaultKeys = Array.from(new Set(enabledDefaultRelations.map((item) => item.packageKey))).sort();
        const duplicatePackageKeys = Array.from(
          new Set(
            moduleRelations
              .map((item) => item.packageKey)
              .filter((packageKey) => moduleRelations.filter((item) => item.packageKey === packageKey).length > 1),
          ),
        ).sort();
        const invalidDefaultBindings = enabledDefaultRelations.filter((item) => item.bindingType !== "DEFAULT");
        const hasMismatch =
          declaredPackageKeys.length > 0 &&
          relationDefaultKeys.length > 0 &&
          declaredPackageKeys.join("|") !== relationDefaultKeys.join("|");
        if (!duplicatePackageKeys.length && !invalidDefaultBindings.length && !hasMismatch) {
          return null;
        }
        return {
          module,
          declaredPackageKeys,
          relationDefaultKeys,
          duplicatePackageKeys,
          invalidDefaultBindings,
          hasMismatch,
        };
      })
      .filter(Boolean) as Array<{
      module: ModuleDefinitionRecord;
      declaredPackageKeys: string[];
      relationDefaultKeys: string[];
      duplicatePackageKeys: string[];
      invalidDefaultBindings: SkillPackageModuleRecord[];
      hasMismatch: boolean;
    }>;
  }, [props.modules, relations]);

  useEffect(() => {
    void loadRelations();
  }, [props.dataSource]);

  useEffect(() => {
    if (!selectedRelationId) {
      setSelectedDraft(buildCreateDraft(props.modules, props.skillPackages));
      return;
    }
    if (!selectedRelation) {
      setSelectedRelationId("");
      setSelectedDraft(buildCreateDraft(props.modules, props.skillPackages));
      return;
    }
    setSelectedDraft(buildDraftFromRecord(selectedRelation));
  }, [props.modules, props.skillPackages, selectedRelation, selectedRelationId]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isCreating) {
        handleCloseCreateModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreateModalOpen, isCreating]);

  async function loadRelations() {
    if (props.dataSource === "seed") {
      setRelations(skillPackageModuleSeed);
      return;
    }
    setIsLoading(true);
    try {
      const next = await getSkillPackageModules();
      setRelations(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取能力包关系失败";
      props.onError(`读取能力包关系失败：${message}`);
      setRelations(skillPackageModuleSeed);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApplyFilters() {
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      props.onNotice(`已按当前条件筛选能力包关系，当前 ${visibleRelations.length} 条。`);
      return;
    }

    setIsApplyingFilters(true);
    try {
      const next = await getSkillPackageModules({
        moduleKey: filters.moduleKey === "ALL" ? undefined : filters.moduleKey,
        bindingType: filters.bindingType,
        enabled: filters.enabled === "ALL" ? undefined : filters.enabled === "true",
        packageKey: filters.keyword.trim() || undefined,
      });
      setRelations(next);
      props.onNotice(`能力包关系已刷新，共 ${next.length} 条。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "能力包关系筛选失败";
      props.onError(`能力包关系筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  async function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      setRelations(skillPackageModuleSeed);
      props.onNotice(`已重置筛选条件，共 ${skillPackageModuleSeed.length} 条演示关系。`);
      return;
    }

    setIsApplyingFilters(true);
    try {
      const next = await getSkillPackageModules();
      setRelations(next);
      props.onNotice(`已重置筛选条件，共 ${next.length} 条能力包关系。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "重置能力包关系筛选失败";
      props.onError(`重置能力包关系筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  function handleOpenCreateModal() {
    setCreateDraft(buildCreateDraft(props.modules, props.skillPackages));
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    if (isCreating) {
      return;
    }
    setIsCreateModalOpen(false);
    setCreateDraft(buildCreateDraft(props.modules, props.skillPackages));
  }

  async function handleCreateRelation() {
    setIsCreating(true);
    props.onNotice("");
    props.onError("");
    try {
      const payload = toPayload(createDraft);
      if (props.dataSource === "seed") {
        const moduleMeta = props.modules.find((item) => item.moduleKey === payload.moduleKey);
        const created: SkillPackageModuleRecord = {
          ...payload,
          id: `spm_${Date.now()}`,
          moduleName: moduleMeta?.moduleName,
          moduleType: moduleMeta?.moduleType,
          entryRoute: moduleMeta?.entryRoute,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setRelations((current) => [created, ...current]);
        setSelectedRelationId(created.id);
        setCreateDraft(buildCreateDraft(props.modules, props.skillPackages));
        setIsCreateModalOpen(false);
        props.onNotice(`演示能力包关系已创建：${created.packageName}`);
        return;
      }
      const created = await createSkillPackageModule(payload);
      setRelations((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedRelationId(created.id);
      setCreateDraft(buildCreateDraft(props.modules, props.skillPackages));
      setIsCreateModalOpen(false);
      props.onNotice(`能力包关系已创建：${created.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建能力包关系失败";
      props.onError(`创建能力包关系失败：${message}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveRelation() {
    if (!selectedRelation) {
      return;
    }
    setIsSaving(true);
    props.onNotice("");
    props.onError("");
    try {
      const payload = toPayload(selectedDraft);
      if (props.dataSource === "seed") {
        const moduleMeta = props.modules.find((item) => item.moduleKey === payload.moduleKey);
        const updated: SkillPackageModuleRecord = {
          ...selectedRelation,
          ...payload,
          moduleName: moduleMeta?.moduleName,
          moduleType: moduleMeta?.moduleType,
          entryRoute: moduleMeta?.entryRoute,
          updatedAt: new Date().toISOString(),
        };
        setRelations((current) => current.map((item) => (item.id === selectedRelation.id ? updated : item)));
        props.onNotice(`演示能力包关系已更新：${updated.packageName}`);
        return;
      }
      const updated = await updateSkillPackageModule(selectedRelation.id, payload);
      setRelations((current) => current.map((item) => (item.id === selectedRelation.id ? updated : item)));
      props.onNotice(`能力包关系已更新：${updated.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新能力包关系失败";
      props.onError(`更新能力包关系失败：${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRelation(relationId: string) {
    const target = relations.find((item) => item.id === relationId);
    if (!target || !window.confirm(`确认删除关系「${target.packageName} -> ${target.moduleName || target.moduleKey}」吗？`)) {
      return;
    }
    setBusyRelationId(relationId);
    props.onNotice("");
    props.onError("");
    try {
      if (props.dataSource === "seed") {
        setRelations((current) => current.filter((item) => item.id !== relationId));
        if (selectedRelationId === relationId) {
          setSelectedRelationId("");
        }
        props.onNotice(`演示能力包关系已删除：${target.packageName}`);
        return;
      }
      const deleted = await deleteSkillPackageModule(relationId);
      setRelations((current) => current.filter((item) => item.id !== relationId));
      if (selectedRelationId === relationId) {
        setSelectedRelationId("");
      }
      props.onNotice(`能力包关系已删除：${deleted.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除能力包关系失败";
      props.onError(`删除能力包关系失败：${message}`);
    } finally {
      setBusyRelationId("");
    }
  }

  async function handleSyncDefaultBindings(moduleKey?: string) {
    const targetModules = defaultPackageReconciliation.filter((item) => !moduleKey || item.module.moduleKey === moduleKey);
    const creatableEntries = targetModules.flatMap((item) =>
      item.creatablePackages.map((skillPackage) => ({
        module: item.module,
        skillPackage,
      })),
    );

    props.onNotice("");
    props.onError("");

    if (!creatableEntries.length) {
      props.onNotice(moduleKey ? "该模块当前没有可补齐的默认能力包关系。" : "当前没有可补齐的默认能力包关系。");
      return;
    }

    setIsSyncingDefaults(true);
    setSyncingModuleKey(moduleKey || "__all__");
    try {
      if (props.dataSource === "seed") {
        const createdRecords = creatableEntries.map(({ module, skillPackage }, index) =>
          buildSeedRelationRecord(module, skillPackage, index),
        );
        setRelations((current) => [...createdRecords, ...current]);
        if (createdRecords[0]) {
          setSelectedRelationId(createdRecords[0].id);
        }
        props.onNotice(
          moduleKey
            ? `已为模块「${targetModules[0]?.module.moduleName || moduleKey}」补齐 ${createdRecords.length} 条演示默认关系。`
            : `已补齐 ${createdRecords.length} 条演示默认关系。`,
        );
        return;
      }

      const createdRecords: SkillPackageModuleRecord[] = [];
      const failedEntries: string[] = [];
      for (const entry of creatableEntries) {
        try {
          const created = await createSkillPackageModule(buildCreatePayload(entry.module, entry.skillPackage));
          createdRecords.push(created);
        } catch (error) {
          const message = error instanceof Error ? error.message : "创建失败";
          failedEntries.push(`${entry.module.moduleName} / ${entry.skillPackage.packageName}（${message}）`);
        }
      }

      if (createdRecords.length) {
        setRelations((current) => [...createdRecords, ...current.filter((item) => !createdRecords.some((created) => created.id === item.id))]);
        setSelectedRelationId(createdRecords[0]?.id || "");
      }

      if (failedEntries.length) {
        props.onError(`默认能力包关系补齐有 ${failedEntries.length} 条失败：${failedEntries.join("；")}`);
      }
      if (createdRecords.length) {
        props.onNotice(
          moduleKey
            ? `已为模块「${targetModules[0]?.module.moduleName || moduleKey}」补齐 ${createdRecords.length} 条默认关系。`
            : `已补齐 ${createdRecords.length} 条默认关系。`,
        );
      }
    } finally {
      setIsSyncingDefaults(false);
      setSyncingModuleKey("");
    }
  }

  async function handleBackfillModuleDefaults(moduleKey?: string) {
    const targetModules = relationDefaultReconciliation.filter((item) => !moduleKey || item.module.moduleKey === moduleKey);

    props.onNotice("");
    props.onError("");

    if (!targetModules.length) {
      props.onNotice(moduleKey ? "该模块当前没有可回填的默认能力包声明。" : "当前没有可回填的默认能力包声明。");
      return;
    }

    setIsBackfillingDefaults(true);
    setBackfillingModuleKey(moduleKey || "__all__");
    try {
      if (props.dataSource === "seed") {
        props.onModulesChange((current) =>
          current.map((item) => {
            const target = targetModules.find((entry) => entry.module.id === item.id);
            if (!target) {
              return item;
            }
            return {
              ...item,
              defaultSkillPackages: Array.from(new Set([...item.defaultSkillPackages, ...target.missingInModuleDefaults])),
              updatedAt: new Date().toISOString(),
            };
          }),
        );
        props.onNotice(
          moduleKey
            ? `已把模块「${targetModules[0]?.module.moduleName || moduleKey}」的默认关系回填到模块摘要。`
            : `已把 ${targetModules.length} 个模块的默认关系回填到模块摘要。`,
        );
        return;
      }

      const updatedModules: ModuleDefinitionRecord[] = [];
      const failedModules: string[] = [];
      for (const entry of targetModules) {
        try {
          const updated = await updateModuleDefinition(entry.module.id, {
            defaultSkillPackages: Array.from(new Set([...entry.module.defaultSkillPackages, ...entry.missingInModuleDefaults])),
          });
          updatedModules.push(updated);
        } catch (error) {
          const message = error instanceof Error ? error.message : "更新失败";
          failedModules.push(`${entry.module.moduleName}（${message}）`);
        }
      }

      if (updatedModules.length) {
        props.onModulesChange((current) =>
          current.map((item) => updatedModules.find((updated) => updated.id === item.id) || item),
        );
      }
      if (failedModules.length) {
        props.onError(`模块默认能力包回填有 ${failedModules.length} 个失败：${failedModules.join("；")}`);
      }
      if (updatedModules.length) {
        props.onNotice(
          moduleKey
            ? `已把模块「${targetModules[0]?.module.moduleName || moduleKey}」的默认关系回填到模块摘要。`
            : `已把 ${updatedModules.length} 个模块的默认关系回填到模块摘要。`,
        );
      }
    } finally {
      setIsBackfillingDefaults(false);
      setBackfillingModuleKey("");
    }
  }

  async function handleDeduplicateModuleRelations(moduleKey: string) {
    const targetRelations = relations.filter((item) => item.moduleKey === moduleKey);
    const idsToDelete = new Set<string>();
    const duplicatePackageKeys = Array.from(new Set(targetRelations.map((item) => item.packageKey))).filter(
      (packageKey) => targetRelations.filter((item) => item.packageKey === packageKey).length > 1,
    );

    duplicatePackageKeys.forEach((packageKey) => {
      const grouped = targetRelations.filter((item) => item.packageKey === packageKey);
      const keep = pickPreferredModuleRelation(grouped);
      grouped.forEach((item) => {
        if (item.id !== keep.id) {
          idsToDelete.add(item.id);
        }
      });
    });

    props.onNotice("");
    props.onError("");

    if (!idsToDelete.size) {
      props.onNotice("当前没有可去重的模块能力包关系。");
      return;
    }

    setBusyActionKey(`dedupe:${moduleKey}`);
    try {
      if (props.dataSource === "seed") {
        setRelations((current) => current.filter((item) => !idsToDelete.has(item.id)));
      } else {
        for (const relationId of idsToDelete) {
          await deleteSkillPackageModule(relationId);
        }
        setRelations((current) => current.filter((item) => !idsToDelete.has(item.id)));
      }
      if (selectedRelationId && idsToDelete.has(selectedRelationId)) {
        setSelectedRelationId("");
      }
      props.onNotice(`已清理 ${idsToDelete.size} 条重复模块能力包关系。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "模块能力包去重失败";
      props.onError(`模块能力包去重失败：${message}`);
    } finally {
      setBusyActionKey("");
    }
  }

  async function handleNormalizeModuleDefaults(moduleKey: string) {
    const invalidRelations = relations.filter(
      (item) => item.moduleKey === moduleKey && item.enabled && item.isDefault && item.bindingType !== "DEFAULT",
    );

    props.onNotice("");
    props.onError("");

    if (!invalidRelations.length) {
      props.onNotice("当前没有可修正的模块默认标记。");
      return;
    }

    setBusyActionKey(`normalize:${moduleKey}`);
    try {
      if (props.dataSource === "seed") {
        setRelations((current) =>
          current.map((item) =>
            invalidRelations.some((relation) => relation.id === item.id) ? { ...item, bindingType: "DEFAULT" } : item,
          ),
        );
      } else {
        const updatedRecords: SkillPackageModuleRecord[] = [];
        for (const relation of invalidRelations) {
          updatedRecords.push(await updateSkillPackageModule(relation.id, { bindingType: "DEFAULT" }));
        }
        setRelations((current) =>
          current.map((item) => updatedRecords.find((updated) => updated.id === item.id) || item),
        );
      }
      props.onNotice(`已修正 ${invalidRelations.length} 条模块默认标记异常关系。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "修正模块默认标记失败";
      props.onError(`修正模块默认标记失败：${message}`);
    } finally {
      setBusyActionKey("");
    }
  }

  async function handleDeduplicateAllModuleRelations() {
    const targetModuleKeys = moduleConflictInsights.filter((item) => item.duplicatePackageKeys.length).map((item) => item.module.moduleKey);

    props.onNotice("");
    props.onError("");

    if (!targetModuleKeys.length) {
      props.onNotice("当前没有可批量去重的模块能力包关系。");
      return;
    }

    setBusyActionKey("dedupe:__all__");
    try {
      for (const moduleKey of targetModuleKeys) {
        const targetRelations = relations.filter((item) => item.moduleKey === moduleKey);
        const idsToDelete = new Set<string>();
        const duplicatePackageKeys = Array.from(new Set(targetRelations.map((item) => item.packageKey))).filter(
          (packageKey) => targetRelations.filter((item) => item.packageKey === packageKey).length > 1,
        );

        duplicatePackageKeys.forEach((packageKey) => {
          const grouped = targetRelations.filter((item) => item.packageKey === packageKey);
          const keep = pickPreferredModuleRelation(grouped);
          grouped.forEach((item) => {
            if (item.id !== keep.id) {
              idsToDelete.add(item.id);
            }
          });
        });

        if (!idsToDelete.size) {
          continue;
        }

        if (props.dataSource === "seed") {
          setRelations((current) => current.filter((item) => !idsToDelete.has(item.id)));
        } else {
          for (const relationId of idsToDelete) {
            await deleteSkillPackageModule(relationId);
          }
          setRelations((current) => current.filter((item) => !idsToDelete.has(item.id)));
        }
      }
      props.onNotice(`已按当前冲突列表批量清理 ${targetModuleKeys.length} 个模块的重复挂载。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量模块能力包去重失败";
      props.onError(`批量模块能力包去重失败：${message}`);
    } finally {
      setBusyActionKey("");
    }
  }

  async function handleNormalizeAllModuleDefaults() {
    const invalidRelations = moduleConflictInsights.flatMap((item) => item.invalidDefaultBindings);

    props.onNotice("");
    props.onError("");

    if (!invalidRelations.length) {
      props.onNotice("当前没有可批量修正的模块默认标记。");
      return;
    }

    setBusyActionKey("normalize:__all__");
    try {
      if (props.dataSource === "seed") {
        const invalidIds = new Set(invalidRelations.map((item) => item.id));
        setRelations((current) =>
          current.map((item) => (invalidIds.has(item.id) ? { ...item, bindingType: "DEFAULT" } : item)),
        );
      } else {
        const updatedRecords: SkillPackageModuleRecord[] = [];
        for (const relation of invalidRelations) {
          updatedRecords.push(await updateSkillPackageModule(relation.id, { bindingType: "DEFAULT" }));
        }
        setRelations((current) =>
          current.map((item) => updatedRecords.find((updated) => updated.id === item.id) || item),
        );
      }
      props.onNotice(`已批量修正 ${invalidRelations.length} 条模块默认标记异常关系。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量修正模块默认标记失败";
      props.onError(`批量修正模块默认标记失败：${message}`);
    } finally {
      setBusyActionKey("");
    }
  }

  async function handleOverwriteModuleDefaultsFromRelations(moduleKey?: string) {
    const targets = relationSourceReconciliation.filter((item) => !moduleKey || item.module.moduleKey === moduleKey);

    props.onNotice("");
    props.onError("");

    if (!targets.length) {
      props.onNotice(moduleKey ? "该模块当前已经按关系真源同步到模块摘要。" : "当前所有模块摘要都已按关系真源同步。");
      return;
    }

    setBusyActionKey(`source:${moduleKey || "__all__"}`);
    try {
      if (props.dataSource === "seed") {
        props.onModulesChange((current) =>
          current.map((item) => {
            const target = targets.find((entry) => entry.module.id === item.id);
            if (!target) {
              return item;
            }
            return {
              ...item,
              defaultSkillPackages: target.relationDefaultKeys,
              updatedAt: new Date().toISOString(),
            };
          }),
        );
        props.onNotice(
          moduleKey
            ? `已按关系真源覆盖模块「${targets[0]?.module.moduleName || moduleKey}」的默认能力包摘要。`
            : `已按关系真源覆盖 ${targets.length} 个模块的默认能力包摘要。`,
        );
        return;
      }

      const updatedModules: ModuleDefinitionRecord[] = [];
      const failedModules: string[] = [];
      for (const entry of targets) {
        try {
          const updated = await updateModuleDefinition(entry.module.id, {
            defaultSkillPackages: entry.relationDefaultKeys,
          });
          updatedModules.push(updated);
        } catch (error) {
          const message = error instanceof Error ? error.message : "更新失败";
          failedModules.push(`${entry.module.moduleName}（${message}）`);
        }
      }

      if (updatedModules.length) {
        props.onModulesChange((current) =>
          current.map((item) => updatedModules.find((updated) => updated.id === item.id) || item),
        );
      }
      if (failedModules.length) {
        props.onError(`按关系真源覆盖模块摘要有 ${failedModules.length} 个失败：${failedModules.join("；")}`);
      }
      if (updatedModules.length) {
        props.onNotice(
          moduleKey
            ? `已按关系真源覆盖模块「${targets[0]?.module.moduleName || moduleKey}」的默认能力包摘要。`
            : `已按关系真源覆盖 ${updatedModules.length} 个模块的默认能力包摘要。`,
        );
      }
    } finally {
      setBusyActionKey("");
    }
  }

  return (
    <div className="admin-user-management" style={{ marginTop: 24 }}>
      <section className="entity-card admin-user-filter-card">
        <div className="admin-user-filter-head">
          <div>
            <span className="archive-pill status-ready">能力包关系</span>
            <h3>模块默认能力包挂载</h3>
            <p>把模块与能力包的真实挂载关系收口到关系表，后续技能所属模块、影响范围和默认装配都以这里为准。</p>
          </div>
          <div className="admin-user-filter-summary">
            <div>
              <span>当前结果</span>
              <strong>{visibleRelations.length}</strong>
            </div>
            <div>
              <span>默认挂载</span>
              <strong>{visibleRelations.filter((item) => item.isDefault).length}</strong>
            </div>
            <div>
              <span>启用中</span>
              <strong>{visibleRelations.filter((item) => item.enabled).length}</strong>
            </div>
          </div>
        </div>

        <div className="admin-user-filter-grid">
          <label>
            <span>模块</span>
            <select
              value={filters.moduleKey}
              onChange={(event) => setFilters((current) => ({ ...current, moduleKey: event.target.value }))}
            >
              <option value="ALL">全部模块</option>
              {props.modules.map((item) => (
                <option key={item.moduleKey} value={item.moduleKey}>
                  {item.moduleName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>绑定类型</span>
            <select
              value={filters.bindingType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, bindingType: event.target.value as SkillPackageModuleFilters["bindingType"] }))
              }
            >
              <option value="ALL">全部</option>
              {BINDING_TYPE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>启用状态</span>
            <select
              value={filters.enabled}
              onChange={(event) => setFilters((current) => ({ ...current, enabled: event.target.value as SkillPackageModuleFilters["enabled"] }))}
            >
              <option value="ALL">全部</option>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </label>
          <label>
            <span>能力包标识</span>
            <input
              value={filters.keyword}
              placeholder="packageKey / packageName"
              onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            />
          </label>
        </div>

        <div className="admin-user-filter-actions">
          <button type="button" className="primary-button" onClick={() => void handleApplyFilters()} disabled={isApplyingFilters}>
            {isApplyingFilters ? "筛选中..." : "筛选"}
          </button>
          <button type="button" className="secondary-button" onClick={() => void handleResetFilters()} disabled={isApplyingFilters}>
            重置
          </button>
          <button type="button" className="primary-button" onClick={handleOpenCreateModal}>
            新增关系
          </button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <div
            className="entity-card"
            style={{ padding: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
          >
            <div>
              <span className="personal-meta">待补齐默认关系</span>
              <strong style={{ display: "block", marginTop: 4 }}>{creatableDefaultBindings.length}</strong>
            </div>
            <div>
              <span className="personal-meta">涉及模块</span>
              <strong style={{ display: "block", marginTop: 4 }}>
                {defaultPackageReconciliation.filter((item) => item.creatablePackages.length).length}
              </strong>
            </div>
            <div>
              <span className="personal-meta">未识别能力包</span>
              <strong style={{ display: "block", marginTop: 4 }}>{unresolvedDefaultBindings.length}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSyncDefaultBindings()}
                disabled={!creatableDefaultBindings.length || isSyncingDefaults}
              >
                {isSyncingDefaults && syncingModuleKey === "__all__" ? "补齐中..." : "一键补齐默认关系"}
              </button>
            </div>
          </div>

          {defaultPackageReconciliation.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {defaultPackageReconciliation.map((item) => (
                <div
                  key={item.module.moduleKey}
                  className="entity-card"
                  style={{ padding: 12, display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr) auto" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{item.module.moduleName}</strong>
                    <p className="personal-meta">
                      默认能力包：{item.declaredPackageKeys.length ? item.declaredPackageKeys.join(" / ") : "未配置"}
                    </p>
                    <p className="personal-meta">
                      {item.creatablePackages.length
                        ? `可补齐：${item.creatablePackages.map((skillPackage) => skillPackage.packageName).join(" / ")}`
                        : "当前没有可自动补齐的默认关系。"}
                    </p>
                    <p className="personal-meta">同步来源：模块注册摘要 `defaultSkillPackages` 到 模块绑定关系表</p>
                    {item.unresolvedPackageKeys.length ? (
                      <p className="personal-meta">未识别：{item.unresolvedPackageKeys.join(" / ")}</p>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleSyncDefaultBindings(item.module.moduleKey)}
                      disabled={!item.creatablePackages.length || isSyncingDefaults}
                    >
                      {isSyncingDefaults && syncingModuleKey === item.module.moduleKey ? "补齐中..." : "补齐该模块"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="entity-card" style={{ padding: 12 }}>
              <p className="personal-meta">当前模块注册中的默认能力包，已经和模块绑定关系表保持一致。</p>
            </div>
          )}

          <div
            className="entity-card"
            style={{ padding: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
          >
            <div>
              <span className="personal-meta">待回填模块摘要</span>
              <strong style={{ display: "block", marginTop: 4 }}>{backfillableModuleDefaults.length}</strong>
            </div>
            <div>
              <span className="personal-meta">涉及模块</span>
              <strong style={{ display: "block", marginTop: 4 }}>{relationDefaultReconciliation.length}</strong>
            </div>
            <div>
              <span className="personal-meta">关系真源默认项</span>
              <strong style={{ display: "block", marginTop: 4 }}>
                {relationDefaultReconciliation.reduce((sum, item) => sum + item.relationDefaultKeys.length, 0)}
              </strong>
            </div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleBackfillModuleDefaults()}
                disabled={!backfillableModuleDefaults.length || isBackfillingDefaults}
              >
                {isBackfillingDefaults && backfillingModuleKey === "__all__" ? "回填中..." : "一键回填模块摘要"}
              </button>
            </div>
          </div>

          {relationDefaultReconciliation.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {relationDefaultReconciliation.map((item) => (
                <div
                  key={`backfill-${item.module.moduleKey}`}
                  className="entity-card"
                  style={{ padding: 12, display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr) auto" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{item.module.moduleName}</strong>
                    <p className="personal-meta">
                      关系表默认项：{item.relationDefaultKeys.length ? item.relationDefaultKeys.join(" / ") : "未识别"}
                    </p>
                    <p className="personal-meta">
                      模块摘要当前值：{item.declaredPackageKeys.length ? item.declaredPackageKeys.join(" / ") : "未配置"}
                    </p>
                    <p className="personal-meta">
                      待回填：{item.missingInModuleDefaults.length ? item.missingInModuleDefaults.join(" / ") : "无"}
                    </p>
                    <p className="personal-meta">同步来源：模块绑定关系表默认挂载 到 模块注册摘要 `defaultSkillPackages`</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleBackfillModuleDefaults(item.module.moduleKey)}
                      disabled={!item.missingInModuleDefaults.length || isBackfillingDefaults}
                    >
                      {isBackfillingDefaults && backfillingModuleKey === item.module.moduleKey ? "回填中..." : "回填该模块"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="entity-card" style={{ padding: 12 }}>
              <p className="personal-meta">当前关系表中的默认挂载，已经同步回模块注册摘要。</p>
            </div>
          )}

          <div
            className="entity-card"
            style={{ padding: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
          >
            <div>
              <span className="personal-meta">待人工处理冲突</span>
              <strong style={{ display: "block", marginTop: 4 }}>{moduleConflictInsights.length}</strong>
            </div>
            <div>
              <span className="personal-meta">重复挂载包</span>
              <strong style={{ display: "block", marginTop: 4 }}>
                {moduleConflictInsights.reduce((sum, item) => sum + item.duplicatePackageKeys.length, 0)}
              </strong>
            </div>
            <div>
              <span className="personal-meta">默认标记异常</span>
              <strong style={{ display: "block", marginTop: 4 }}>
                {moduleConflictInsights.reduce((sum, item) => sum + item.invalidDefaultBindings.length, 0)}
              </strong>
            </div>
            <div>
              <span className="personal-meta">摘要不一致</span>
              <strong style={{ display: "block", marginTop: 4 }}>
                {moduleConflictInsights.filter((item) => item.hasMismatch).length}
              </strong>
            </div>
            <div>
              <span className="personal-meta">真源漂移模块</span>
              <strong style={{ display: "block", marginTop: 4 }}>{relationSourceReconciliation.length}</strong>
            </div>
          </div>
          {moduleConflictInsights.length ? (
            <div className="entity-card" style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleSyncDefaultBindings()}
                disabled={!creatableDefaultBindings.length || isSyncingDefaults}
              >
                {isSyncingDefaults && syncingModuleKey === "__all__" ? "处理中..." : "全部按摘要补齐关系"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleBackfillModuleDefaults()}
                disabled={!backfillableModuleDefaults.length || isBackfillingDefaults}
              >
                {isBackfillingDefaults && backfillingModuleKey === "__all__" ? "处理中..." : "全部按关系回填摘要"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleDeduplicateAllModuleRelations()}
                disabled={!moduleConflictInsights.some((item) => item.duplicatePackageKeys.length) || busyActionKey === "dedupe:__all__"}
              >
                {busyActionKey === "dedupe:__all__" ? "处理中..." : "全部删除重复挂载"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleNormalizeAllModuleDefaults()}
                disabled={!moduleConflictInsights.some((item) => item.invalidDefaultBindings.length) || busyActionKey === "normalize:__all__"}
              >
                {busyActionKey === "normalize:__all__" ? "处理中..." : "全部修正默认标记"}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleOverwriteModuleDefaultsFromRelations()}
                disabled={!relationSourceReconciliation.length || busyActionKey === "source:__all__"}
              >
                {busyActionKey === "source:__all__" ? "处理中..." : "全部按关系真源覆盖摘要"}
              </button>
            </div>
          ) : null}

          {moduleConflictInsights.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {moduleConflictInsights.map((item) => (
                <div key={`conflict-${item.module.moduleKey}`} className="entity-card" style={{ padding: 12, display: "grid", gap: 6 }}>
                  <strong>{item.module.moduleName}</strong>
                  <p className="personal-meta">
                    模块摘要默认能力包：{item.declaredPackageKeys.length ? item.declaredPackageKeys.join(" / ") : "未配置"}
                  </p>
                  <p className="personal-meta">
                    关系表默认挂载：{item.relationDefaultKeys.length ? item.relationDefaultKeys.join(" / ") : "未配置"}
                  </p>
                  <p className="personal-meta">冲突来源：模块注册摘要与模块绑定关系表对照结果</p>
                  {item.duplicatePackageKeys.length ? (
                    <p className="personal-meta">重复挂载：{item.duplicatePackageKeys.join(" / ")}</p>
                  ) : null}
                  {item.invalidDefaultBindings.length ? (
                    <p className="personal-meta">
                      默认标记异常：{item.invalidDefaultBindings.map((relation) => `${relation.packageName} (${relation.bindingType})`).join(" / ")}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {item.hasMismatch ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleSyncDefaultBindings(item.module.moduleKey)}
                        disabled={isSyncingDefaults}
                      >
                        {isSyncingDefaults && syncingModuleKey === item.module.moduleKey ? "补齐中..." : "按摘要补齐关系"}
                      </button>
                    ) : null}
                    {item.hasMismatch ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleBackfillModuleDefaults(item.module.moduleKey)}
                        disabled={isBackfillingDefaults}
                      >
                        {isBackfillingDefaults && backfillingModuleKey === item.module.moduleKey ? "回填中..." : "按关系回填摘要"}
                      </button>
                    ) : null}
                    {item.duplicatePackageKeys.length ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleDeduplicateModuleRelations(item.module.moduleKey)}
                        disabled={busyActionKey === `dedupe:${item.module.moduleKey}`}
                      >
                        {busyActionKey === `dedupe:${item.module.moduleKey}` ? "处理中..." : "删除重复挂载"}
                      </button>
                    ) : null}
                    {item.invalidDefaultBindings.length ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleNormalizeModuleDefaults(item.module.moduleKey)}
                        disabled={busyActionKey === `normalize:${item.module.moduleKey}`}
                      >
                        {busyActionKey === `normalize:${item.module.moduleKey}` ? "处理中..." : "修正默认标记"}
                      </button>
                    ) : null}
                    {item.declaredPackageKeys.join("|") !== item.relationDefaultKeys.join("|") ? (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleOverwriteModuleDefaultsFromRelations(item.module.moduleKey)}
                        disabled={busyActionKey === `source:${item.module.moduleKey}`}
                      >
                        {busyActionKey === `source:${item.module.moduleKey}` ? "处理中..." : "按关系真源覆盖摘要"}
                      </button>
                    ) : null}
                  </div>
                  {item.duplicatePackageKeys.length ? <p className="personal-meta">处理建议：先删除重复关系，只保留一条有效挂载记录。</p> : null}
                  {item.invalidDefaultBindings.length ? <p className="personal-meta">处理建议：默认关系应改为 `bindingType=DEFAULT`，否则请取消默认标记。</p> : null}
                  {item.hasMismatch ? <p className="personal-meta">建议先统一模块摘要与关系表默认挂载，再继续批量同步。</p> : null}
                  {item.declaredPackageKeys.join("|") !== item.relationDefaultKeys.join("|") ? (
                    <p className="personal-meta">真源口径：模块绑定关系表为准，需要时可以直接覆盖模块摘要，避免摘要继续漂移。</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="entity-card" style={{ padding: 12 }}>
              <p className="personal-meta">当前模块绑定里没有发现明显的重复挂载、默认标记异常或摘要不一致冲突。</p>
            </div>
          )}
        </div>
      </section>

      <section className="admin-user-layout">
        <article className="entity-card admin-user-list-card">
          <div className="entity-card-head">
            <div>
              <strong>关系列表</strong>
              <p className="personal-meta">{isLoading ? "正在加载能力包关系..." : "支持按模块和绑定类型收口查看。"} </p>
            </div>
          </div>

          <div className="admin-user-table-wrapper">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>能力包</th>
                  <th>所属模块</th>
                  <th>绑定类型</th>
                  <th>默认</th>
                  <th>启用</th>
                  <th>排序</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleRelations.length ? (
                  visibleRelations.map((item) => (
                    <tr key={item.id} className={selectedRelationId === item.id ? "is-active" : ""}>
                      <td>
                        <button type="button" className="admin-user-row-button" onClick={() => setSelectedRelationId(item.id)}>
                          <span className="admin-user-row-title">{item.packageName}</span>
                          <span className="admin-user-row-meta">{item.packageKey}</span>
                        </button>
                      </td>
                      <td>{item.moduleName || item.moduleKey}</td>
                      <td>{item.bindingType}</td>
                      <td>{item.isDefault ? "是" : "否"}</td>
                      <td>{item.enabled ? "启用" : "停用"}</td>
                      <td>{item.sortOrder}</td>
                      <td>{formatDateTime(item.updatedAt)}</td>
                      <td>
                        <div className="personal-actions" style={{ justifyContent: "flex-start" }}>
                          <button type="button" className="secondary-button" onClick={() => setSelectedRelationId(item.id)}>
                            编辑
                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => void handleDeleteRelation(item.id)}
                            disabled={busyRelationId === item.id}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "24px 12px", color: "var(--muted)" }}>
                      当前没有符合条件的能力包关系。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="entity-card admin-user-list-card">
          <div className="entity-card-head">
            <div>
              <strong>关系编辑</strong>
              <p className="personal-meta">
                {selectedRelation ? `当前编辑：${selectedRelation.packageName}` : "从左侧列表中选择一条能力包关系后再编辑。"}
              </p>
            </div>
            <div className="personal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setSelectedDraft(selectedRelation ? buildDraftFromRecord(selectedRelation) : buildCreateDraft(props.modules, props.skillPackages))
                }
                disabled={!selectedRelation || isSaving}
              >
                重置
              </button>
              <button type="button" className="primary-button" onClick={() => void handleSaveRelation()} disabled={!selectedRelation || isSaving}>
                {isSaving ? "保存中..." : "保存关系"}
              </button>
            </div>
          </div>

          {selectedRelation ? (
            <SkillPackageModuleDraftForm
              draft={selectedDraft}
              modules={props.modules}
              skillPackages={props.skillPackages}
              onChange={setSelectedDraft}
            />
          ) : (
            <div className="personal-meta" style={{ paddingTop: 12 }}>
              请选择一条能力包关系进行编辑。
            </div>
          )}
        </article>
      </section>

      {isCreateModalOpen ? (
        <div className="admin-user-modal-overlay" role="presentation" onClick={handleCloseCreateModal}>
          <div
            className="entity-card admin-user-modal"
            role="dialog"
            aria-modal="true"
            aria-label="新建能力包关系"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-user-modal-topbar">
              <div>
                <span className="archive-pill status-ready">关系创建</span>
                <strong>新增模块能力包关系</strong>
                <p className="personal-meta">这里的关系表是模块与能力包的真实真源，不再只靠模块摘要字段反推。</p>
              </div>
              <button type="button" className="secondary-button" onClick={handleCloseCreateModal} disabled={isCreating}>
                关闭
              </button>
            </div>
            <SkillPackageModuleDraftForm
              draft={createDraft}
              modules={props.modules}
              skillPackages={props.skillPackages}
              onChange={setCreateDraft}
            />
            <div className="personal-actions">
              <button type="button" className="secondary-button" onClick={handleCloseCreateModal} disabled={isCreating}>
                取消
              </button>
              <button type="button" className="primary-button" onClick={() => void handleCreateRelation()} disabled={isCreating}>
                {isCreating ? "创建中..." : "确认创建"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SkillPackageModuleDraftForm(props: {
  draft: SkillPackageModuleDraft;
  modules: ModuleDefinitionRecord[];
  skillPackages: SkillPackageRecord[];
  onChange: Dispatch<SetStateAction<SkillPackageModuleDraft>>;
}) {
  const recommendedPackages = useMemo(
    () =>
      props.skillPackages
        .filter((item) => item.moduleKeys.includes(props.draft.moduleKey))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [props.draft.moduleKey, props.skillPackages],
  );
  const selectedPackage = props.skillPackages.find(
    (item) => item.id === props.draft.packageId || item.packageKey === props.draft.packageKey,
  );
  const packageOptions = useMemo(() => {
    const recommendedIds = new Set(recommendedPackages.map((item) => item.id));
    return props.skillPackages
      .slice()
      .sort((left, right) => {
        const leftPriority = recommendedIds.has(left.id) ? 0 : 1;
        const rightPriority = recommendedIds.has(right.id) ? 0 : 1;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        return left.sortOrder - right.sortOrder;
      });
  }, [props.skillPackages, recommendedPackages]);
  const packageSelectValue = selectedPackage?.id || "__manual__";

  function handlePackageChange(nextValue: string) {
    if (nextValue === "__manual__") {
      return;
    }
    const target = props.skillPackages.find((item) => item.id === nextValue);
    if (!target) {
      return;
    }
    props.onChange((current) => ({
      ...current,
      packageId: target.id,
      packageKey: target.packageKey,
      packageName: target.packageName,
    }));
  }

  return (
    <div className="admin-rule-grid">
      <label style={{ gridColumn: "1 / -1" }}>
        <span>能力包选择</span>
        <select value={packageSelectValue} onChange={(event) => handlePackageChange(event.target.value)}>
          <option value="__manual__">手工填写 / 历史值兼容</option>
          {packageOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {recommendedPackages.some((recommended) => recommended.id === item.id) ? `推荐 · ${item.packageName}` : item.packageName}
            </option>
          ))}
        </select>
      </label>
      <div className="entity-card" style={{ gridColumn: "1 / -1", padding: 12 }}>
        <strong>当前模块推荐能力包 {recommendedPackages.length} 个</strong>
        <p className="personal-meta">
          {recommendedPackages.length
            ? recommendedPackages.map((item) => item.packageName).join(" / ")
            : "当前模块还没有命中已登记的推荐能力包，可继续手工选择或录入历史值。"}
        </p>
      </div>
      {selectedPackage ? (
        <div className="entity-card" style={{ gridColumn: "1 / -1", padding: 12 }}>
          <strong>{selectedPackage.packageName}</strong>
          <p className="personal-meta">
            {selectedPackage.packageKey} · {selectedPackage.status} · {selectedPackage.scope}
          </p>
        </div>
      ) : null}
      <label>
        <span>能力包名称</span>
        <input
          value={props.draft.packageName}
          readOnly={Boolean(selectedPackage)}
          onChange={(event) => props.onChange((current) => ({ ...current, packageName: event.target.value }))}
        />
      </label>
      <label>
        <span>能力包 ID</span>
        <input
          value={props.draft.packageId}
          readOnly={Boolean(selectedPackage)}
          onChange={(event) => props.onChange((current) => ({ ...current, packageId: event.target.value }))}
        />
      </label>
      <label>
        <span>能力包标识</span>
        <input
          value={props.draft.packageKey}
          readOnly={Boolean(selectedPackage)}
          onChange={(event) => props.onChange((current) => ({ ...current, packageKey: event.target.value }))}
        />
      </label>
      <label>
        <span>所属模块</span>
        <select value={props.draft.moduleKey} onChange={(event) => props.onChange((current) => ({ ...current, moduleKey: event.target.value }))}>
          {props.modules.map((item) => (
            <option key={item.moduleKey} value={item.moduleKey}>
              {item.moduleName}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>绑定类型</span>
        <select
          value={props.draft.bindingType}
          onChange={(event) =>
            props.onChange((current) => ({ ...current, bindingType: event.target.value as SkillPackageModuleRecord["bindingType"] }))
          }
        >
          {BINDING_TYPE_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>排序</span>
        <input value={props.draft.sortOrder} onChange={(event) => props.onChange((current) => ({ ...current, sortOrder: event.target.value }))} />
      </label>
      <label>
        <span>默认挂载</span>
        <select
          value={String(props.draft.isDefault)}
          onChange={(event) => props.onChange((current) => ({ ...current, isDefault: event.target.value === "true" }))}
        >
          <option value="true">是</option>
          <option value="false">否</option>
        </select>
      </label>
      <label>
        <span>启用状态</span>
        <select
          value={String(props.draft.enabled)}
          onChange={(event) => props.onChange((current) => ({ ...current, enabled: event.target.value === "true" }))}
        >
          <option value="true">启用</option>
          <option value="false">停用</option>
        </select>
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        <span>备注</span>
        <textarea value={props.draft.remarks} onChange={(event) => props.onChange((current) => ({ ...current, remarks: event.target.value }))} />
      </label>
    </div>
  );
}

function buildCreateDraft(modules: ModuleDefinitionRecord[], skillPackages: SkillPackageRecord[]): SkillPackageModuleDraft {
  const firstPackage = skillPackages[0];
  return {
    packageId: firstPackage?.id || "",
    packageKey: firstPackage?.packageKey || "",
    packageName: firstPackage?.packageName || "",
    moduleKey: modules[0]?.moduleKey || "",
    bindingType: "DEFAULT",
    isDefault: true,
    sortOrder: "100",
    enabled: true,
    remarks: "",
  };
}

function buildDraftFromRecord(record: SkillPackageModuleRecord): SkillPackageModuleDraft {
  return {
    packageId: record.packageId,
    packageKey: record.packageKey,
    packageName: record.packageName,
    moduleKey: record.moduleKey,
    bindingType: record.bindingType,
    isDefault: record.isDefault,
    sortOrder: String(record.sortOrder),
    enabled: record.enabled,
    remarks: record.remarks || "",
  };
}

function toPayload(
  draft: SkillPackageModuleDraft,
): Omit<SkillPackageModuleRecord, "id" | "moduleName" | "moduleType" | "entryRoute" | "createdAt" | "updatedAt"> {
  return {
    packageId: draft.packageId.trim(),
    packageKey: draft.packageKey.trim(),
    packageName: draft.packageName.trim(),
    moduleKey: draft.moduleKey,
    bindingType: draft.bindingType,
    isDefault: draft.isDefault,
    sortOrder: Number(draft.sortOrder || 100),
    enabled: draft.enabled,
    remarks: draft.remarks.trim() || undefined,
  };
}

function buildCreatePayload(
  module: ModuleDefinitionRecord,
  skillPackage: SkillPackageRecord,
): Omit<SkillPackageModuleRecord, "id" | "moduleName" | "moduleType" | "entryRoute" | "createdAt" | "updatedAt"> {
  return {
    packageId: skillPackage.id,
    packageKey: skillPackage.packageKey,
    packageName: skillPackage.packageName,
    moduleKey: module.moduleKey,
    bindingType: "DEFAULT",
    isDefault: true,
    sortOrder: skillPackage.sortOrder,
    enabled: true,
    remarks: "根据模块 defaultSkillPackages 自动补齐",
  };
}

function pickPreferredModuleRelation(relations: SkillPackageModuleRecord[]) {
  return relations
    .slice()
    .sort((left, right) => {
      const leftScore = Number(left.enabled) * 100 + Number(left.isDefault) * 10 + Number(left.bindingType === "DEFAULT");
      const rightScore = Number(right.enabled) * 100 + Number(right.isDefault) * 10 + Number(right.bindingType === "DEFAULT");
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return String(left.id).localeCompare(String(right.id));
    })[0];
}

function buildSeedRelationRecord(module: ModuleDefinitionRecord, skillPackage: SkillPackageRecord, index: number): SkillPackageModuleRecord {
  const payload = buildCreatePayload(module, skillPackage);
  const timestamp = new Date().toISOString();
  return {
    ...payload,
    id: `spm_sync_${Date.now()}_${index}`,
    moduleName: module.moduleName,
    moduleType: module.moduleType,
    entryRoute: module.entryRoute,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function matchesFilters(record: SkillPackageModuleRecord, filters: SkillPackageModuleFilters) {
  if (filters.moduleKey !== "ALL" && record.moduleKey !== filters.moduleKey) {
    return false;
  }
  if (filters.bindingType !== "ALL" && record.bindingType !== filters.bindingType) {
    return false;
  }
  if (filters.enabled !== "ALL" && String(record.enabled) !== filters.enabled) {
    return false;
  }
  const keyword = filters.keyword.trim().toLowerCase();
  if (!keyword) {
    return true;
  }
  return [record.packageKey, record.packageName, record.moduleName, record.moduleKey].some((field) =>
    String(field || "").toLowerCase().includes(keyword),
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  try {
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return value;
  }
}
