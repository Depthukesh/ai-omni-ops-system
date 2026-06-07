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
  const [busyRelationId, setBusyRelationId] = useState("");

  const visibleRelations = useMemo(() => relations.filter((item) => matchesFilters(item, filters)), [filters, relations]);
  const selectedRelation = useMemo(
    () => visibleRelations.find((item) => item.id === selectedRelationId) || relations.find((item) => item.id === selectedRelationId) || null,
    [relations, selectedRelationId, visibleRelations],
  );

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
    <div className="admin-rule-grid">
      <label>
        <span>能力包</span>
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
      <label>
        <span>关系类型</span>
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
        <input value={props.draft.priority} onChange={(event) => props.onChange((current) => ({ ...current, priority: event.target.value }))} />
      </label>
      <label>
        <span>必选关系</span>
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
