"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  createSkillPackageKnowledgeSpace,
  deleteSkillPackageKnowledgeSpace,
  getKnowledgeBases,
  getSkillPackageKnowledgeSpaces,
  getSkillPackages,
  knowledgeBaseSeed,
  skillPackageKnowledgeSpaceSeed,
  skillPackageSeed,
  updateSkillPackageKnowledgeSpace,
  type KnowledgeBaseRecord,
  type SkillPackageKnowledgeSpaceRecord,
  type SkillPackageRecord,
} from "../../../services/admin";

type SkillPackageKnowledgeSpacesPanelProps = {
  dataSource: "api" | "seed";
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

type SkillPackageKnowledgeSpaceFilters = {
  packageId: "ALL" | string;
  knowledgeBaseId: "ALL" | string;
  relationType: "ALL" | SkillPackageKnowledgeSpaceRecord["relationType"];
  enabled: "ALL" | "true" | "false";
};

type SkillPackageKnowledgeSpaceDraft = {
  packageId: string;
  knowledgeBaseId: string;
  relationType: SkillPackageKnowledgeSpaceRecord["relationType"];
  priority: string;
  retrievalMode: SkillPackageKnowledgeSpaceRecord["retrievalMode"];
  isRequired: boolean;
  enabled: boolean;
  remarks: string;
};

const DEFAULT_FILTERS: SkillPackageKnowledgeSpaceFilters = {
  packageId: "ALL",
  knowledgeBaseId: "ALL",
  relationType: "ALL",
  enabled: "ALL",
};

const RELATION_TYPE_OPTIONS: SkillPackageKnowledgeSpaceRecord["relationType"][] = [
  "DEFAULT",
  "OPTIONAL",
  "BRAND_OVERRIDE",
  "USER_OVERRIDE",
];

const RETRIEVAL_MODE_OPTIONS: SkillPackageKnowledgeSpaceRecord["retrievalMode"][] = ["SEMANTIC", "HYBRID", "MANUAL"];

export function SkillPackageKnowledgeSpacesPanel(props: SkillPackageKnowledgeSpacesPanelProps) {
  const [filters, setFilters] = useState<SkillPackageKnowledgeSpaceFilters>(DEFAULT_FILTERS);
  const [relations, setRelations] = useState<SkillPackageKnowledgeSpaceRecord[]>(skillPackageKnowledgeSpaceSeed);
  const [packages, setPackages] = useState<SkillPackageRecord[]>(skillPackageSeed);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseRecord[]>(knowledgeBaseSeed);
  const [selectedRelationId, setSelectedRelationId] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<SkillPackageKnowledgeSpaceDraft>(buildCreateDraft(skillPackageSeed, knowledgeBaseSeed));
  const [createDraft, setCreateDraft] = useState<SkillPackageKnowledgeSpaceDraft>(buildCreateDraft(skillPackageSeed, knowledgeBaseSeed));
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingDefaults, setIsSyncingDefaults] = useState(false);
  const [syncingPackageId, setSyncingPackageId] = useState("");
  const [busyActionKey, setBusyActionKey] = useState("");
  const [busyRelationId, setBusyRelationId] = useState("");

  const visibleRelations = useMemo(() => relations.filter((item) => matchesFilters(item, filters)), [filters, relations]);
  const selectedRelation = useMemo(
    () => visibleRelations.find((item) => item.id === selectedRelationId) || relations.find((item) => item.id === selectedRelationId) || null,
    [relations, selectedRelationId, visibleRelations],
  );
  const defaultKnowledgeReconciliation = useMemo(() => {
    return packages
      .map((skillPackage) => {
        const declaredKnowledgeBaseIds = Array.from(new Set(skillPackage.defaultKnowledgeSpaceIds.filter(Boolean)));
        const existingKnowledgeBaseIds = new Set(
          relations.filter((item) => item.packageId === skillPackage.id).map((item) => item.knowledgeBaseId),
        );
        const missingKnowledgeBaseIds = declaredKnowledgeBaseIds.filter((item) => !existingKnowledgeBaseIds.has(item));
        const creatableKnowledgeBases = missingKnowledgeBaseIds
          .map((knowledgeBaseId) => knowledgeBases.find((item) => item.id === knowledgeBaseId) || null)
          .filter((item): item is KnowledgeBaseRecord => Boolean(item));
        const unresolvedKnowledgeBaseIds = missingKnowledgeBaseIds.filter(
          (knowledgeBaseId) => !creatableKnowledgeBases.some((item) => item.id === knowledgeBaseId),
        );
        return {
          skillPackage,
          declaredKnowledgeBaseIds,
          creatableKnowledgeBases,
          unresolvedKnowledgeBaseIds,
        };
      })
      .filter((item) => item.creatableKnowledgeBases.length || item.unresolvedKnowledgeBaseIds.length);
  }, [knowledgeBases, packages, relations]);
  const syncableKnowledgeRelations = useMemo(
    () =>
      defaultKnowledgeReconciliation.flatMap((item) =>
        item.creatableKnowledgeBases.map((knowledgeBase) => ({
          skillPackage: item.skillPackage,
          knowledgeBase,
        })),
      ),
    [defaultKnowledgeReconciliation],
  );

  const knowledgeConflictInsights = useMemo(() => {
    return packages
      .map((skillPackage) => {
        const declaredKnowledgeBaseIds = Array.from(new Set(skillPackage.defaultKnowledgeSpaceIds.filter(Boolean))).sort();
        const packageRelations = relations.filter((item) => item.packageId === skillPackage.id);
        const relationDefaultKnowledgeBaseIds = Array.from(
          new Set(
            packageRelations
              .filter((item) => item.enabled && item.relationType === "DEFAULT")
              .map((item) => item.knowledgeBaseId)
              .filter(Boolean),
          ),
        ).sort();
        const duplicateKnowledgeBaseIds = Array.from(
          new Set(
            packageRelations
              .map((item) => item.knowledgeBaseId)
              .filter((knowledgeBaseId) => packageRelations.filter((item) => item.knowledgeBaseId === knowledgeBaseId).length > 1),
          ),
        ).sort();
        const requiredNonDefaultRelations = packageRelations.filter(
          (item) => item.enabled && item.isRequired && item.relationType !== "DEFAULT",
        );
        const hasMismatch =
          declaredKnowledgeBaseIds.length > 0 &&
          relationDefaultKnowledgeBaseIds.length > 0 &&
          declaredKnowledgeBaseIds.join("|") !== relationDefaultKnowledgeBaseIds.join("|");
        if (!duplicateKnowledgeBaseIds.length && !requiredNonDefaultRelations.length && !hasMismatch) {
          return null;
        }
        return {
          skillPackage,
          declaredKnowledgeBaseIds,
          relationDefaultKnowledgeBaseIds,
          duplicateKnowledgeBaseIds,
          requiredNonDefaultRelations,
          hasMismatch,
        };
      })
      .filter(Boolean) as Array<{
      skillPackage: SkillPackageRecord;
      declaredKnowledgeBaseIds: string[];
      relationDefaultKnowledgeBaseIds: string[];
      duplicateKnowledgeBaseIds: string[];
      requiredNonDefaultRelations: SkillPackageKnowledgeSpaceRecord[];
      hasMismatch: boolean;
    }>;
  }, [packages, relations]);

  useEffect(() => {
    void loadBaseOptions();
    void loadRelations();
  }, [props.dataSource]);

  useEffect(() => {
    if (!selectedRelationId) {
      setSelectedDraft(buildCreateDraft(packages, knowledgeBases));
      return;
    }
    if (!selectedRelation) {
      setSelectedRelationId("");
      setSelectedDraft(buildCreateDraft(packages, knowledgeBases));
      return;
    }
    setSelectedDraft(buildDraftFromRecord(selectedRelation));
  }, [knowledgeBases, packages, selectedRelation, selectedRelationId]);

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

  async function loadBaseOptions() {
    if (props.dataSource === "seed") {
      setPackages(skillPackageSeed);
      setKnowledgeBases(knowledgeBaseSeed);
      return;
    }
    try {
      const [nextPackages, nextKnowledgeBases] = await Promise.all([getSkillPackages(), getKnowledgeBases()]);
      setPackages(nextPackages);
      setKnowledgeBases(nextKnowledgeBases);
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取能力包或知识库失败";
      props.onError(`读取能力包或知识库失败：${message}`);
      setPackages(skillPackageSeed);
      setKnowledgeBases(knowledgeBaseSeed);
    }
  }

  async function loadRelations() {
    if (props.dataSource === "seed") {
      setRelations(skillPackageKnowledgeSpaceSeed);
      return;
    }
    setIsLoading(true);
    try {
      const next = await getSkillPackageKnowledgeSpaces();
      setRelations(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取能力包知识关系失败";
      props.onError(`读取能力包知识关系失败：${message}`);
      setRelations(skillPackageKnowledgeSpaceSeed);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApplyFilters() {
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      props.onNotice(`已按当前条件筛选能力包知识关系，当前 ${visibleRelations.length} 条。`);
      return;
    }

    setIsApplyingFilters(true);
    try {
      const selectedPackage = filters.packageId === "ALL" ? undefined : packages.find((item) => item.id === filters.packageId);
      const next = await getSkillPackageKnowledgeSpaces({
        packageKey: selectedPackage?.packageKey,
        knowledgeBaseId: filters.knowledgeBaseId === "ALL" ? undefined : filters.knowledgeBaseId,
        relationType: filters.relationType,
        enabled: filters.enabled === "ALL" ? undefined : filters.enabled === "true",
      });
      setRelations(next);
      props.onNotice(`能力包知识关系已刷新，共 ${next.length} 条。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "能力包知识关系筛选失败";
      props.onError(`能力包知识关系筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  async function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      setRelations(skillPackageKnowledgeSpaceSeed);
      props.onNotice(`已重置筛选条件，共 ${skillPackageKnowledgeSpaceSeed.length} 条演示关系。`);
      return;
    }

    setIsApplyingFilters(true);
    try {
      const next = await getSkillPackageKnowledgeSpaces();
      setRelations(next);
      props.onNotice(`已重置筛选条件，共 ${next.length} 条能力包知识关系。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "重置能力包知识关系筛选失败";
      props.onError(`重置能力包知识关系筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  function handleOpenCreateModal() {
    setCreateDraft(buildCreateDraft(packages, knowledgeBases));
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    if (isCreating) {
      return;
    }
    setIsCreateModalOpen(false);
    setCreateDraft(buildCreateDraft(packages, knowledgeBases));
  }

  async function handleCreateRelation() {
    setIsCreating(true);
    props.onNotice("");
    props.onError("");
    try {
      const payload = toPayload(createDraft, packages);
      const knowledgeBase = knowledgeBases.find((item) => item.id === payload.knowledgeBaseId);
      if (props.dataSource === "seed") {
        const created: SkillPackageKnowledgeSpaceRecord = {
          ...payload,
          id: `spks_${Date.now()}`,
          knowledgeBaseName: knowledgeBase?.name,
          knowledgeBaseSlug: knowledgeBase?.slug,
          knowledgeBaseStatus: knowledgeBase?.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setRelations((current) => [created, ...current]);
        setSelectedRelationId(created.id);
        setCreateDraft(buildCreateDraft(packages, knowledgeBases));
        setIsCreateModalOpen(false);
        props.onNotice(`演示能力包知识关系已创建：${created.packageName} -> ${created.knowledgeBaseName || created.knowledgeBaseId}`);
        return;
      }
      const created = await createSkillPackageKnowledgeSpace(payload);
      setRelations((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedRelationId(created.id);
      setCreateDraft(buildCreateDraft(packages, knowledgeBases));
      setIsCreateModalOpen(false);
      props.onNotice(`能力包知识关系已创建：${created.packageName} -> ${created.knowledgeBaseName || created.knowledgeBaseId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建能力包知识关系失败";
      props.onError(`创建能力包知识关系失败：${message}`);
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
      const payload = toPayload(selectedDraft, packages);
      const knowledgeBase = knowledgeBases.find((item) => item.id === payload.knowledgeBaseId);
      if (props.dataSource === "seed") {
        const updated: SkillPackageKnowledgeSpaceRecord = {
          ...selectedRelation,
          ...payload,
          knowledgeBaseName: knowledgeBase?.name,
          knowledgeBaseSlug: knowledgeBase?.slug,
          knowledgeBaseStatus: knowledgeBase?.status,
          updatedAt: new Date().toISOString(),
        };
        setRelations((current) => current.map((item) => (item.id === selectedRelation.id ? updated : item)));
        props.onNotice(`演示能力包知识关系已更新：${updated.packageName}`);
        return;
      }
      const updated = await updateSkillPackageKnowledgeSpace(selectedRelation.id, payload);
      setRelations((current) => current.map((item) => (item.id === selectedRelation.id ? updated : item)));
      props.onNotice(`能力包知识关系已更新：${updated.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新能力包知识关系失败";
      props.onError(`更新能力包知识关系失败：${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRelation(relationId: string) {
    const target = relations.find((item) => item.id === relationId);
    if (!target || !window.confirm(`确认删除关系「${target.packageName} -> ${target.knowledgeBaseName || target.knowledgeBaseId}」吗？`)) {
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
        props.onNotice(`演示能力包知识关系已删除：${target.packageName}`);
        return;
      }
      const deleted = await deleteSkillPackageKnowledgeSpace(relationId);
      setRelations((current) => current.filter((item) => item.id !== relationId));
      if (selectedRelationId === relationId) {
        setSelectedRelationId("");
      }
      props.onNotice(`能力包知识关系已删除：${deleted.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除能力包知识关系失败";
      props.onError(`删除能力包知识关系失败：${message}`);
    } finally {
      setBusyRelationId("");
    }
  }

  async function handleSyncDefaultKnowledgeRelations(packageId?: string) {
    const targets = defaultKnowledgeReconciliation.filter((item) => !packageId || item.skillPackage.id === packageId);
    const creatableEntries = targets.flatMap((item) =>
      item.creatableKnowledgeBases.map((knowledgeBase) => ({
        skillPackage: item.skillPackage,
        knowledgeBase,
      })),
    );

    props.onNotice("");
    props.onError("");

    if (!creatableEntries.length) {
      props.onNotice(packageId ? "该能力包当前没有可自动补齐的知识关系。" : "当前没有可自动补齐的能力包知识关系。");
      return;
    }

    setIsSyncingDefaults(true);
    setSyncingPackageId(packageId || "__all__");
    try {
      if (props.dataSource === "seed") {
        const createdRecords = creatableEntries.map((entry, index) => buildSeedKnowledgeRelationRecord(entry.skillPackage, entry.knowledgeBase, index));
        setRelations((current) => [...createdRecords, ...current]);
        if (createdRecords[0]) {
          setSelectedRelationId(createdRecords[0].id);
        }
        props.onNotice(packageId ? `已为该能力包补齐 ${createdRecords.length} 条演示知识关系。` : `已补齐 ${createdRecords.length} 条演示知识关系。`);
        return;
      }

      const createdRecords: SkillPackageKnowledgeSpaceRecord[] = [];
      const failedEntries: string[] = [];
      for (const entry of creatableEntries) {
        try {
          const created = await createSkillPackageKnowledgeSpace(buildCreateKnowledgePayload(entry.skillPackage, entry.knowledgeBase));
          createdRecords.push(created);
        } catch (error) {
          const message = error instanceof Error ? error.message : "创建失败";
          failedEntries.push(`${entry.skillPackage.packageName} / ${entry.knowledgeBase.name}（${message}）`);
        }
      }

      if (createdRecords.length) {
        setRelations((current) => [...createdRecords, ...current.filter((item) => !createdRecords.some((created) => created.id === item.id))]);
        setSelectedRelationId(createdRecords[0]?.id || "");
      }
      if (failedEntries.length) {
        props.onError(`知识关系自动补齐有 ${failedEntries.length} 条失败：${failedEntries.join("；")}`);
      }
      if (createdRecords.length) {
        props.onNotice(packageId ? `已为该能力包补齐 ${createdRecords.length} 条知识关系。` : `已补齐 ${createdRecords.length} 条知识关系。`);
      }
    } finally {
      setIsSyncingDefaults(false);
      setSyncingPackageId("");
    }
  }

  async function handleDeduplicateKnowledgeRelations(packageId: string) {
    const targetRelations = relations.filter((item) => item.packageId === packageId);
    const idsToDelete = new Set<string>();
    const duplicateKnowledgeBaseIds = Array.from(new Set(targetRelations.map((item) => item.knowledgeBaseId))).filter(
      (knowledgeBaseId) => targetRelations.filter((item) => item.knowledgeBaseId === knowledgeBaseId).length > 1,
    );

    duplicateKnowledgeBaseIds.forEach((knowledgeBaseId) => {
      const grouped = targetRelations.filter((item) => item.knowledgeBaseId === knowledgeBaseId);
      const keep = pickPreferredKnowledgeRelation(grouped);
      grouped.forEach((item) => {
        if (item.id !== keep.id) {
          idsToDelete.add(item.id);
        }
      });
    });

    props.onNotice("");
    props.onError("");

    if (!idsToDelete.size) {
      props.onNotice("当前没有可去重的知识关系。");
      return;
    }

    setBusyActionKey(`dedupe:${packageId}`);
    try {
      if (props.dataSource === "seed") {
        setRelations((current) => current.filter((item) => !idsToDelete.has(item.id)));
      } else {
        for (const relationId of idsToDelete) {
          await deleteSkillPackageKnowledgeSpace(relationId);
        }
        setRelations((current) => current.filter((item) => !idsToDelete.has(item.id)));
      }
      if (selectedRelationId && idsToDelete.has(selectedRelationId)) {
        setSelectedRelationId("");
      }
      props.onNotice(`已清理 ${idsToDelete.size} 条重复知识关系。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "知识关系去重失败";
      props.onError(`知识关系去重失败：${message}`);
    } finally {
      setBusyActionKey("");
    }
  }

  async function handleNormalizeKnowledgeDefaults(packageId: string) {
    const targetPackage = packages.find((item) => item.id === packageId);
    const declaredKnowledgeBaseIds = new Set(targetPackage?.defaultKnowledgeSpaceIds || []);
    const targetRelations = relations.filter((item) => item.packageId === packageId);
    const relationsToUpdate = targetRelations
      .map((relation) => {
        if (!declaredKnowledgeBaseIds.size) {
          return null;
        }
        const shouldDefault = declaredKnowledgeBaseIds.has(relation.knowledgeBaseId);
        const nextPatch: Partial<
          Omit<
            SkillPackageKnowledgeSpaceRecord,
            "id" | "knowledgeBaseName" | "knowledgeBaseSlug" | "knowledgeBaseStatus" | "createdAt" | "updatedAt"
          >
        > = {};
        if (shouldDefault) {
          if (relation.relationType !== "DEFAULT") {
            nextPatch.relationType = "DEFAULT";
          }
          if (!relation.enabled) {
            nextPatch.enabled = true;
          }
        } else if (relation.relationType === "DEFAULT") {
          nextPatch.relationType = "OPTIONAL";
        }
        return Object.keys(nextPatch).length ? { relation, patch: nextPatch } : null;
      })
      .filter(Boolean) as Array<{
      relation: SkillPackageKnowledgeSpaceRecord;
      patch: Partial<
        Omit<
          SkillPackageKnowledgeSpaceRecord,
          "id" | "knowledgeBaseName" | "knowledgeBaseSlug" | "knowledgeBaseStatus" | "createdAt" | "updatedAt"
        >
      >;
    }>;

    props.onNotice("");
    props.onError("");

    if (!relationsToUpdate.length) {
      props.onNotice("当前没有可修正的默认知识关系。");
      return;
    }

    setBusyActionKey(`normalize:${packageId}`);
    try {
      if (props.dataSource === "seed") {
        setRelations((current) =>
          current.map((item) => {
            const target = relationsToUpdate.find((entry) => entry.relation.id === item.id);
            return target ? { ...item, ...target.patch } : item;
          }),
        );
      } else {
        const updatedRecords: SkillPackageKnowledgeSpaceRecord[] = [];
        for (const entry of relationsToUpdate) {
          updatedRecords.push(await updateSkillPackageKnowledgeSpace(entry.relation.id, entry.patch));
        }
        setRelations((current) =>
          current.map((item) => updatedRecords.find((updated) => updated.id === item.id) || item),
        );
      }
      props.onNotice(`已修正 ${relationsToUpdate.length} 条默认知识关系。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "修正默认知识关系失败";
      props.onError(`修正默认知识关系失败：${message}`);
    } finally {
      setBusyActionKey("");
    }
  }

  return (
    <div className="admin-user-management" style={{ marginTop: 24 }}>
      <section className="entity-card admin-user-filter-card">
        <div className="admin-user-filter-head">
          <div>
            <span className="archive-pill status-ready">知识关系</span>
            <h3>能力包知识空间挂载</h3>
            <p>第二阶段开始把能力包与知识空间的长期关系收口为独立关系表，不再只依赖第一阶段桥接摘要。</p>
          </div>
          <div className="admin-user-filter-summary">
            <div>
              <span>当前结果</span>
              <strong>{visibleRelations.length}</strong>
            </div>
            <div>
              <span>必选关系</span>
              <strong>{visibleRelations.filter((item) => item.isRequired).length}</strong>
            </div>
            <div>
              <span>启用中</span>
              <strong>{visibleRelations.filter((item) => item.enabled).length}</strong>
            </div>
          </div>
        </div>

        <div className="admin-user-filter-grid">
          <label>
            <span>能力包</span>
            <select value={filters.packageId} onChange={(event) => setFilters((current) => ({ ...current, packageId: event.target.value }))}>
              <option value="ALL">全部能力包</option>
              {packages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.packageName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>知识库</span>
            <select
              value={filters.knowledgeBaseId}
              onChange={(event) => setFilters((current) => ({ ...current, knowledgeBaseId: event.target.value }))}
            >
              <option value="ALL">全部知识库</option>
              {knowledgeBases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>关系类型</span>
            <select
              value={filters.relationType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, relationType: event.target.value as SkillPackageKnowledgeSpaceFilters["relationType"] }))
              }
            >
              <option value="ALL">全部</option>
              {RELATION_TYPE_OPTIONS.map((item) => (
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
              onChange={(event) => setFilters((current) => ({ ...current, enabled: event.target.value as SkillPackageKnowledgeSpaceFilters["enabled"] }))}
            >
              <option value="ALL">全部</option>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
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
          <div className="entity-card" style={{ padding: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <span className="personal-meta">待同步知识关系</span>
              <strong style={{ display: "block", marginTop: 4 }}>{syncableKnowledgeRelations.length}</strong>
            </div>
            <div>
              <span className="personal-meta">涉及能力包</span>
              <strong style={{ display: "block", marginTop: 4 }}>{defaultKnowledgeReconciliation.filter((item) => item.creatableKnowledgeBases.length).length}</strong>
            </div>
            <div>
              <span className="personal-meta">未识别知识库</span>
              <strong style={{ display: "block", marginTop: 4 }}>
                {defaultKnowledgeReconciliation.reduce((sum, item) => sum + item.unresolvedKnowledgeBaseIds.length, 0)}
              </strong>
            </div>
            <div style={{ display: "flex", alignItems: "end", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSyncDefaultKnowledgeRelations()}
                disabled={!syncableKnowledgeRelations.length || isSyncingDefaults}
              >
                {isSyncingDefaults && syncingPackageId === "__all__" ? "同步中..." : "一键同步知识关系"}
              </button>
            </div>
          </div>

          {defaultKnowledgeReconciliation.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {defaultKnowledgeReconciliation.map((item) => (
                <div
                  key={item.skillPackage.id}
                  className="entity-card"
                  style={{ padding: 12, display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr) auto" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong>{item.skillPackage.packageName}</strong>
                    <p className="personal-meta">
                      默认知识空间：{item.declaredKnowledgeBaseIds.length ? item.declaredKnowledgeBaseIds.join(" / ") : "未配置"}
                    </p>
                    <p className="personal-meta">
                      {item.creatableKnowledgeBases.length
                        ? `可同步：${item.creatableKnowledgeBases.map((knowledgeBase) => knowledgeBase.name).join(" / ")}`
                        : "当前没有可自动同步的知识关系。"}
                    </p>
                    <p className="personal-meta">同步来源：能力包主数据 `defaultKnowledgeSpaceIds` 到 能力包知识关系表</p>
                    {item.unresolvedKnowledgeBaseIds.length ? (
                      <p className="personal-meta">未识别：{item.unresolvedKnowledgeBaseIds.join(" / ")}</p>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleSyncDefaultKnowledgeRelations(item.skillPackage.id)}
                      disabled={!item.creatableKnowledgeBases.length || isSyncingDefaults}
                    >
                      {isSyncingDefaults && syncingPackageId === item.skillPackage.id ? "同步中..." : "同步该能力包"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="entity-card" style={{ padding: 12 }}>
              <p className="personal-meta">当前能力包默认知识空间与知识关系表已经基本一致。</p>
            </div>
          )}

          <div className="entity-card" style={{ padding: 12, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div>
              <span className="personal-meta">待人工处理冲突</span>
              <strong style={{ display: "block", marginTop: 4 }}>{knowledgeConflictInsights.length}</strong>
            </div>
            <div>
              <span className="personal-meta">重复知识库挂载</span>
              <strong style={{ display: "block", marginTop: 4 }}>
                {knowledgeConflictInsights.reduce((sum, item) => sum + item.duplicateKnowledgeBaseIds.length, 0)}
              </strong>
            </div>
            <div>
              <span className="personal-meta">强制覆盖关系</span>
              <strong style={{ display: "block", marginTop: 4 }}>
                {knowledgeConflictInsights.reduce((sum, item) => sum + item.requiredNonDefaultRelations.length, 0)}
              </strong>
            </div>
            <div>
              <span className="personal-meta">默认知识不一致</span>
              <strong style={{ display: "block", marginTop: 4 }}>
                {knowledgeConflictInsights.filter((item) => item.hasMismatch).length}
              </strong>
            </div>
          </div>

          {knowledgeConflictInsights.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {knowledgeConflictInsights.map((item) => (
                <div key={`conflict-${item.skillPackage.id}`} className="entity-card" style={{ padding: 12, display: "grid", gap: 6 }}>
                  <strong>{item.skillPackage.packageName}</strong>
                  <p className="personal-meta">
                    能力包默认知识空间：{item.declaredKnowledgeBaseIds.length ? item.declaredKnowledgeBaseIds.join(" / ") : "未配置"}
                  </p>
                  <p className="personal-meta">
                    关系表默认知识关系：{item.relationDefaultKnowledgeBaseIds.length ? item.relationDefaultKnowledgeBaseIds.join(" / ") : "未配置"}
                  </p>
                  <p className="personal-meta">冲突来源：能力包默认知识空间与知识关系表默认关系对照结果</p>
                  {item.duplicateKnowledgeBaseIds.length ? (
                    <p className="personal-meta">重复挂载：{item.duplicateKnowledgeBaseIds.join(" / ")}</p>
                  ) : null}
                  {item.requiredNonDefaultRelations.length ? (
                    <p className="personal-meta">
                      强制覆盖：{item.requiredNonDefaultRelations.map((relation) => `${relation.knowledgeBaseName || relation.knowledgeBaseId} (${relation.relationType})`).join(" / ")}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {item.hasMismatch ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleSyncDefaultKnowledgeRelations(item.skillPackage.id)}
                        disabled={isSyncingDefaults}
                      >
                        {isSyncingDefaults && syncingPackageId === item.skillPackage.id ? "同步中..." : "按默认知识补齐"}
                      </button>
                    ) : null}
                    {item.hasMismatch ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleNormalizeKnowledgeDefaults(item.skillPackage.id)}
                        disabled={busyActionKey === `normalize:${item.skillPackage.id}`}
                      >
                        {busyActionKey === `normalize:${item.skillPackage.id}` ? "处理中..." : "修正默认知识关系"}
                      </button>
                    ) : null}
                    {item.duplicateKnowledgeBaseIds.length ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleDeduplicateKnowledgeRelations(item.skillPackage.id)}
                        disabled={busyActionKey === `dedupe:${item.skillPackage.id}`}
                      >
                        {busyActionKey === `dedupe:${item.skillPackage.id}` ? "处理中..." : "删除重复关系"}
                      </button>
                    ) : null}
                  </div>
                  {item.duplicateKnowledgeBaseIds.length ? <p className="personal-meta">处理建议：删除重复知识关系，只保留当前真正参与检索的一条。</p> : null}
                  {item.requiredNonDefaultRelations.length ? <p className="personal-meta">处理建议：先确认这些强制覆盖关系是否应替代默认知识关系，再决定是否继续批量同步。</p> : null}
                  {item.hasMismatch ? <p className="personal-meta">建议先统一能力包默认知识空间与关系表默认知识关系，再继续自动同步。</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="entity-card" style={{ padding: 12 }}>
              <p className="personal-meta">当前知识关系里没有发现明显的默认知识不一致、重复挂载或强制覆盖冲突。</p>
            </div>
          )}
        </div>
      </section>

      <section className="admin-user-layout">
        <article className="entity-card admin-user-list-card">
          <div className="entity-card-head">
            <div>
              <strong>关系列表</strong>
              <p className="personal-meta">{isLoading ? "正在加载能力包知识关系..." : "支持按能力包、知识库与关系类型收口查看。"} </p>
            </div>
          </div>

          <div className="admin-user-table-wrapper">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>能力包</th>
                  <th>知识库</th>
                  <th>关系类型</th>
                  <th>检索模式</th>
                  <th>必选</th>
                  <th>启用</th>
                  <th>优先级</th>
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
                      <td>{item.knowledgeBaseName || item.knowledgeBaseId}</td>
                      <td>{item.relationType}</td>
                      <td>{item.retrievalMode}</td>
                      <td>{item.isRequired ? "是" : "否"}</td>
                      <td>{item.enabled ? "启用" : "停用"}</td>
                      <td>{item.priority}</td>
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
                    <td colSpan={9} style={{ textAlign: "center", padding: "24px 12px", color: "var(--muted)" }}>
                      当前没有符合条件的能力包知识关系。
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
                {selectedRelation ? `当前编辑：${selectedRelation.packageName}` : "从左侧列表中选择一条能力包知识关系后再编辑。"}
              </p>
            </div>
            <div className="personal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedDraft(selectedRelation ? buildDraftFromRecord(selectedRelation) : buildCreateDraft(packages, knowledgeBases))}
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
            <SkillPackageKnowledgeSpaceDraftForm
              draft={selectedDraft}
              packages={packages}
              knowledgeBases={knowledgeBases}
              onChange={setSelectedDraft}
            />
          ) : (
            <div className="personal-meta" style={{ paddingTop: 12 }}>
              请选择一条能力包知识关系进行编辑。
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
            aria-label="新建能力包知识关系"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(1120px, calc(100vw - 40px))", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}
          >
            <div className="admin-user-modal-topbar">
              <div>
                <span className="archive-pill status-ready">关系创建</span>
                <strong>新增能力包知识关系</strong>
                <p className="personal-meta">能力包与知识空间的常设挂载、检索模式和优先级从这里进入第二阶段独立治理。</p>
              </div>
              <button type="button" className="secondary-button" onClick={handleCloseCreateModal} disabled={isCreating}>
                关闭
              </button>
            </div>
            <SkillPackageKnowledgeSpaceDraftForm
              draft={createDraft}
              packages={packages}
              knowledgeBases={knowledgeBases}
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

function SkillPackageKnowledgeSpaceDraftForm(props: {
  draft: SkillPackageKnowledgeSpaceDraft;
  packages: SkillPackageRecord[];
  knowledgeBases: KnowledgeBaseRecord[];
  onChange: Dispatch<SetStateAction<SkillPackageKnowledgeSpaceDraft>>;
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="entity-card" style={{ padding: 12 }}>
        <strong>填写规则</strong>
        <p className="personal-meta">能力包和知识库都优先选系统主数据；关系类型、检索模式和是否必选才是当前需要你决策的配置。</p>
      </div>
      <section className="entity-card" style={{ padding: 16 }}>
        <div className="entity-card-head" style={{ marginBottom: 12 }}>
          <div>
            <strong>系统同步区</strong>
            <p className="personal-meta">先选择真实能力包与真实知识库，避免后续知识关系和能力包主数据脱节。</p>
          </div>
        </div>
        <div className="admin-rule-grid">
          <label>
            <span>能力包</span>
            <small className="personal-meta">系统同步 · 当前直接从能力包主数据选择。</small>
            <select value={props.draft.packageId} onChange={(event) => props.onChange((current) => ({ ...current, packageId: event.target.value }))}>
              {props.packages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.packageName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>知识库</span>
            <small className="personal-meta">系统同步 · 当前直接从知识库主数据选择。</small>
            <select
              value={props.draft.knowledgeBaseId}
              onChange={(event) => props.onChange((current) => ({ ...current, knowledgeBaseId: event.target.value }))}
            >
              {props.knowledgeBases.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="entity-card" style={{ padding: 16 }}>
        <div className="entity-card-head" style={{ marginBottom: 12 }}>
          <div>
            <strong>治理设置</strong>
            <p className="personal-meta">这里定义知识空间对能力包的角色、检索模式和优先级。</p>
          </div>
        </div>
        <div className="admin-rule-grid">
          <label>
            <span>关系类型</span>
            <small className="personal-meta">必填 · 默认、可选或覆盖关系从这里定义。</small>
            <select
              value={props.draft.relationType}
              onChange={(event) =>
                props.onChange((current) => ({ ...current, relationType: event.target.value as SkillPackageKnowledgeSpaceRecord["relationType"] }))
              }
            >
              {RELATION_TYPE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>检索模式</span>
            <small className="personal-meta">系统可选 · 当前直接从固定检索模式枚举中选择。</small>
            <select
              value={props.draft.retrievalMode}
              onChange={(event) =>
                props.onChange((current) => ({ ...current, retrievalMode: event.target.value as SkillPackageKnowledgeSpaceRecord["retrievalMode"] }))
              }
            >
              {RETRIEVAL_MODE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>优先级</span>
            <small className="personal-meta">推荐 · 多个知识空间同时挂载时用来排序。</small>
            <input value={props.draft.priority} onChange={(event) => props.onChange((current) => ({ ...current, priority: event.target.value }))} />
          </label>
          <label>
            <span>必选关系</span>
            <small className="personal-meta">推荐 · 只有确实不可缺省时才设为是。</small>
            <select
              value={String(props.draft.isRequired)}
              onChange={(event) => props.onChange((current) => ({ ...current, isRequired: event.target.value === "true" }))}
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </label>
          <label>
            <span>启用状态</span>
            <small className="personal-meta">系统可选 · 停用关系不会参与默认同步与检索推荐。</small>
            <select
              value={String(props.draft.enabled)}
              onChange={(event) => props.onChange((current) => ({ ...current, enabled: event.target.value === "true" }))}
            >
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </label>
          <label style={{ gridColumn: "1 / -1", display: "grid", gap: 6 }}>
            <span>备注</span>
            <small className="personal-meta">可选 · 记录知识空间用途、检索范围或为什么需要覆盖。</small>
            <textarea value={props.draft.remarks} onChange={(event) => props.onChange((current) => ({ ...current, remarks: event.target.value }))} />
          </label>
        </div>
      </section>
    </div>
  );
}

function buildCreateDraft(
  packages: SkillPackageRecord[],
  knowledgeBases: KnowledgeBaseRecord[],
): SkillPackageKnowledgeSpaceDraft {
  return {
    packageId: packages[0]?.id || "",
    knowledgeBaseId: knowledgeBases[0]?.id || "",
    relationType: "DEFAULT",
    priority: "100",
    retrievalMode: "HYBRID",
    isRequired: false,
    enabled: true,
    remarks: "",
  };
}

function buildDraftFromRecord(record: SkillPackageKnowledgeSpaceRecord): SkillPackageKnowledgeSpaceDraft {
  return {
    packageId: record.packageId,
    knowledgeBaseId: record.knowledgeBaseId,
    relationType: record.relationType,
    priority: String(record.priority),
    retrievalMode: record.retrievalMode,
    isRequired: record.isRequired,
    enabled: record.enabled,
    remarks: record.remarks || "",
  };
}

function toPayload(
  draft: SkillPackageKnowledgeSpaceDraft,
  packages: SkillPackageRecord[],
): Omit<
  SkillPackageKnowledgeSpaceRecord,
  "id" | "knowledgeBaseName" | "knowledgeBaseSlug" | "knowledgeBaseStatus" | "createdAt" | "updatedAt"
> {
  const packageMeta = packages.find((item) => item.id === draft.packageId);
  if (!packageMeta) {
    throw new Error("请选择有效的能力包");
  }
  return {
    packageId: packageMeta.id,
    packageKey: packageMeta.packageKey,
    packageName: packageMeta.packageName,
    knowledgeBaseId: draft.knowledgeBaseId,
    relationType: draft.relationType,
    priority: Number(draft.priority || 100),
    retrievalMode: draft.retrievalMode,
    isRequired: draft.isRequired,
    enabled: draft.enabled,
    remarks: draft.remarks.trim() || undefined,
  };
}

function buildCreateKnowledgePayload(
  skillPackage: SkillPackageRecord,
  knowledgeBase: KnowledgeBaseRecord,
): Omit<
  SkillPackageKnowledgeSpaceRecord,
  "id" | "knowledgeBaseName" | "knowledgeBaseSlug" | "knowledgeBaseStatus" | "createdAt" | "updatedAt"
> {
  return {
    packageId: skillPackage.id,
    packageKey: skillPackage.packageKey,
    packageName: skillPackage.packageName,
    knowledgeBaseId: knowledgeBase.id,
    relationType: "DEFAULT",
    priority: 100,
    retrievalMode: "HYBRID",
    isRequired: false,
    enabled: true,
    remarks: "根据能力包默认知识空间自动补齐",
  };
}

function pickPreferredKnowledgeRelation(relations: SkillPackageKnowledgeSpaceRecord[]) {
  return relations
    .slice()
    .sort((left, right) => {
      const leftScore = Number(left.enabled) * 100 + Number(left.relationType === "DEFAULT") * 10 + Number(left.isRequired);
      const rightScore = Number(right.enabled) * 100 + Number(right.relationType === "DEFAULT") * 10 + Number(right.isRequired);
      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      return String(left.id).localeCompare(String(right.id));
    })[0];
}

function buildSeedKnowledgeRelationRecord(
  skillPackage: SkillPackageRecord,
  knowledgeBase: KnowledgeBaseRecord,
  index: number,
): SkillPackageKnowledgeSpaceRecord {
  const payload = buildCreateKnowledgePayload(skillPackage, knowledgeBase);
  const timestamp = new Date().toISOString();
  return {
    ...payload,
    id: `spks_sync_${Date.now()}_${index}`,
    knowledgeBaseName: knowledgeBase.name,
    knowledgeBaseSlug: knowledgeBase.slug,
    knowledgeBaseStatus: knowledgeBase.status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function matchesFilters(record: SkillPackageKnowledgeSpaceRecord, filters: SkillPackageKnowledgeSpaceFilters) {
  if (filters.packageId !== "ALL" && record.packageId !== filters.packageId) {
    return false;
  }
  if (filters.knowledgeBaseId !== "ALL" && record.knowledgeBaseId !== filters.knowledgeBaseId) {
    return false;
  }
  if (filters.relationType !== "ALL" && record.relationType !== filters.relationType) {
    return false;
  }
  if (filters.enabled !== "ALL" && String(record.enabled) !== filters.enabled) {
    return false;
  }
  return true;
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
