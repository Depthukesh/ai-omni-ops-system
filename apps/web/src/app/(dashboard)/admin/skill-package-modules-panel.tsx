"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  createSkillPackageModule,
  deleteSkillPackageModule,
  getSkillPackageModules,
  skillPackageModuleSeed,
  updateSkillPackageModule,
  type ModuleDefinitionRecord,
  type SkillPackageModuleRecord,
} from "../../../services/admin";

type SkillPackageModulesPanelProps = {
  modules: ModuleDefinitionRecord[];
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
  const [selectedDraft, setSelectedDraft] = useState<SkillPackageModuleDraft>(buildCreateDraft(props.modules));
  const [createDraft, setCreateDraft] = useState<SkillPackageModuleDraft>(buildCreateDraft(props.modules));
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyRelationId, setBusyRelationId] = useState("");

  const visibleRelations = useMemo(() => {
    return relations.filter((item) => matchesFilters(item, filters));
  }, [filters, relations]);

  const selectedRelation = useMemo(
    () => visibleRelations.find((item) => item.id === selectedRelationId) || relations.find((item) => item.id === selectedRelationId) || null,
    [relations, selectedRelationId, visibleRelations],
  );

  useEffect(() => {
    void loadRelations();
  }, [props.dataSource]);

  useEffect(() => {
    if (!selectedRelationId) {
      setSelectedDraft(buildCreateDraft(props.modules));
      return;
    }
    if (!selectedRelation) {
      setSelectedRelationId("");
      setSelectedDraft(buildCreateDraft(props.modules));
      return;
    }
    setSelectedDraft(buildDraftFromRecord(selectedRelation));
  }, [props.modules, selectedRelation, selectedRelationId]);

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
    setCreateDraft(buildCreateDraft(props.modules));
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    if (isCreating) {
      return;
    }
    setIsCreateModalOpen(false);
    setCreateDraft(buildCreateDraft(props.modules));
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
        setCreateDraft(buildCreateDraft(props.modules));
        setIsCreateModalOpen(false);
        props.onNotice(`演示能力包关系已创建：${created.packageName}`);
        return;
      }
      const created = await createSkillPackageModule(payload);
      setRelations((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedRelationId(created.id);
      setCreateDraft(buildCreateDraft(props.modules));
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
                onClick={() => setSelectedDraft(selectedRelation ? buildDraftFromRecord(selectedRelation) : buildCreateDraft(props.modules))}
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
            <SkillPackageModuleDraftForm draft={selectedDraft} modules={props.modules} onChange={setSelectedDraft} />
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
            <SkillPackageModuleDraftForm draft={createDraft} modules={props.modules} onChange={setCreateDraft} />
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
  onChange: Dispatch<SetStateAction<SkillPackageModuleDraft>>;
}) {
  return (
    <div className="admin-rule-grid">
      <label>
        <span>能力包名称</span>
        <input value={props.draft.packageName} onChange={(event) => props.onChange((current) => ({ ...current, packageName: event.target.value }))} />
      </label>
      <label>
        <span>能力包 ID</span>
        <input value={props.draft.packageId} onChange={(event) => props.onChange((current) => ({ ...current, packageId: event.target.value }))} />
      </label>
      <label>
        <span>能力包标识</span>
        <input value={props.draft.packageKey} onChange={(event) => props.onChange((current) => ({ ...current, packageKey: event.target.value }))} />
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

function buildCreateDraft(modules: ModuleDefinitionRecord[]): SkillPackageModuleDraft {
  return {
    packageId: "",
    packageKey: "",
    packageName: "",
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
