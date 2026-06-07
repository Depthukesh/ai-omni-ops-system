"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  archiveModuleDefinition,
  createModuleDefinition,
  deleteModuleDefinition,
  getModuleDefinitions,
  type GetModuleDefinitionsQuery,
  type ModuleDefinitionRecord,
  type SkillConfigRecord,
  updateModuleDefinition,
} from "../../../services/admin";
import { SkillPackagesPanel } from "./skill-packages-panel";
import { SkillPackageModulesPanel } from "./skill-package-modules-panel";
import { SkillPackageSkillsPanel } from "./skill-package-skills-panel";

type ModuleDefinitionsPanelProps = {
  modules: ModuleDefinitionRecord[];
  skills: SkillConfigRecord[];
  dataSource: "api" | "seed";
  onModulesChange: Dispatch<SetStateAction<ModuleDefinitionRecord[]>>;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

type ModuleFilters = {
  keyword: string;
  moduleType: "ALL" | ModuleDefinitionRecord["moduleType"];
  moduleStatus: "ALL" | ModuleDefinitionRecord["moduleStatus"];
};

type ModuleDraft = {
  moduleKey: string;
  moduleName: string;
  moduleType: ModuleDefinitionRecord["moduleType"];
  moduleStatus: ModuleDefinitionRecord["moduleStatus"];
  entryRoute: string;
  icon: string;
  sortOrder: string;
  description: string;
  requiredPermissions: string;
  featureFlags: string;
  requiredCapabilities: string;
  requiredProviders: string;
  requiredTables: string;
  requiredStorages: string;
  requiredThirdPartyPlatforms: string;
  taskTypes: string;
  mediaTypes: string;
  workflowTypes: string;
  publishTargets: string;
  defaultSkillPackages: string;
  defaultKnowledgeSpaces: string;
  defaultProviderPolicies: string;
  phasePriority: "" | "P0" | "P1" | "P2";
  remarks: string;
  isPlatformVisible: boolean;
  isBrandVisible: boolean;
  isAdminVisible: boolean;
};

type ModuleCenterSectionKey = "registry" | "packages" | "moduleRelations" | "skillRelations";

const DEFAULT_FILTERS: ModuleFilters = {
  keyword: "",
  moduleType: "ALL",
  moduleStatus: "ALL",
};

const MODULE_TYPE_OPTIONS: ModuleDefinitionRecord["moduleType"][] = [
  "WORKBENCH",
  "DOMAIN",
  "PLATFORM_CORE",
  "ADMIN_TOOL",
  "EXTERNAL_BRIDGE",
];

const MODULE_STATUS_OPTIONS: ModuleDefinitionRecord["moduleStatus"][] = [
  "PLANNING",
  "ACTIVE",
  "DISABLED",
  "ARCHIVED",
];

export function ModuleDefinitionsPanel(props: ModuleDefinitionsPanelProps) {
  const [filters, setFilters] = useState<ModuleFilters>(DEFAULT_FILTERS);
  const [activeSection, setActiveSection] = useState<ModuleCenterSectionKey>("registry");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<ModuleDraft>(buildCreateDraft());
  const [createDraft, setCreateDraft] = useState<ModuleDraft>(buildCreateDraft());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyModuleId, setBusyModuleId] = useState("");

  const visibleModules = useMemo(() => {
    return props.modules.filter((item) => matchesFilters(item, filters));
  }, [filters, props.modules]);

  const selectedModule = useMemo(
    () => visibleModules.find((item) => item.id === selectedModuleId) || props.modules.find((item) => item.id === selectedModuleId) || null,
    [props.modules, selectedModuleId, visibleModules],
  );

  const centerSections = useMemo(
    () => [
      {
        key: "registry" as const,
        label: "模块注册",
        badge: String(props.modules.length),
      },
      {
        key: "packages" as const,
        label: "能力包注册",
        badge: "SP",
      },
      {
        key: "moduleRelations" as const,
        label: "模块绑定",
        badge: "MP",
      },
      {
        key: "skillRelations" as const,
        label: "技能绑定",
        badge: String(props.skills.length),
      },
    ],
    [props.modules.length, props.skills.length],
  );

  useEffect(() => {
    if (!selectedModuleId) {
      setSelectedDraft(buildCreateDraft());
      return;
    }
    if (!selectedModule) {
      setSelectedModuleId("");
      setSelectedDraft(buildCreateDraft());
      return;
    }
    setSelectedDraft(buildDraftFromRecord(selectedModule));
  }, [selectedModule, selectedModuleId]);

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

  async function handleApplyFilters() {
    setIsApplyingFilters(true);
    props.onNotice("");
    props.onError("");
    try {
      if (props.dataSource === "seed") {
        props.onNotice(`已按当前条件筛选模块，当前 ${visibleModules.length} 个模块。`);
        return;
      }
      const query: GetModuleDefinitionsQuery = {
        keyword: filters.keyword.trim() || undefined,
        moduleType: filters.moduleType,
        moduleStatus: filters.moduleStatus,
      };
      const next = await getModuleDefinitions(query);
      props.onModulesChange(next);
      props.onNotice(`模块列表已刷新，共 ${next.length} 个模块。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "模块筛选失败";
      props.onError(`模块筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  async function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      props.onNotice(`已重置筛选条件，共 ${props.modules.length} 个演示模块。`);
      return;
    }
    setIsApplyingFilters(true);
    try {
      const next = await getModuleDefinitions();
      props.onModulesChange(next);
      props.onNotice(`已重置筛选条件，共 ${next.length} 个模块。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "重置筛选失败";
      props.onError(`重置筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  async function handleCreateModule() {
    setIsCreating(true);
    props.onNotice("");
    props.onError("");
    try {
      const payload = toPayload(createDraft);
      if (props.dataSource === "seed") {
        const now = new Date().toISOString();
        const created: ModuleDefinitionRecord = {
          ...payload,
          id: `module_${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        };
        props.onModulesChange((current) => [created, ...current]);
        setCreateDraft(buildCreateDraft());
        setSelectedModuleId(created.id);
        setIsCreateModalOpen(false);
        props.onNotice(`演示模块已创建：${created.moduleName}`);
        return;
      }
      const created = await createModuleDefinition(payload);
      props.onModulesChange((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setCreateDraft(buildCreateDraft());
      setSelectedModuleId(created.id);
      setIsCreateModalOpen(false);
      props.onNotice(`模块已创建：${created.moduleName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建模块失败";
      props.onError(`创建模块失败：${message}`);
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenCreateModal() {
    setCreateDraft(buildCreateDraft());
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    if (isCreating) {
      return;
    }
    setIsCreateModalOpen(false);
    setCreateDraft(buildCreateDraft());
  }

  async function handleSaveModule() {
    if (!selectedModule) {
      return;
    }
    setIsSaving(true);
    props.onNotice("");
    props.onError("");
    try {
      const payload = toPayload(selectedDraft);
      if (props.dataSource === "seed") {
        const updated: ModuleDefinitionRecord = {
          ...selectedModule,
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        props.onModulesChange((current) => current.map((item) => (item.id === selectedModule.id ? updated : item)));
        props.onNotice(`演示模块已更新：${updated.moduleName}`);
        return;
      }
      const updated = await updateModuleDefinition(selectedModule.id, payload);
      props.onModulesChange((current) => current.map((item) => (item.id === selectedModule.id ? updated : item)));
      props.onNotice(`模块已更新：${updated.moduleName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新模块失败";
      props.onError(`更新模块失败：${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveModule(moduleId: string) {
    const target = props.modules.find((item) => item.id === moduleId);
    if (!target || !window.confirm(`确认归档模块「${target.moduleName}」吗？`)) {
      return;
    }
    setBusyModuleId(moduleId);
    props.onNotice("");
    props.onError("");
    try {
      if (props.dataSource === "seed") {
        props.onModulesChange((current) =>
          current.map((item) =>
            item.id === moduleId ? { ...item, moduleStatus: "ARCHIVED", updatedAt: new Date().toISOString() } : item,
          ),
        );
        props.onNotice(`演示模块已归档：${target.moduleName}`);
        return;
      }
      const updated = await archiveModuleDefinition(moduleId);
      props.onModulesChange((current) => current.map((item) => (item.id === moduleId ? updated : item)));
      props.onNotice(`模块已归档：${updated.moduleName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "归档模块失败";
      props.onError(`归档模块失败：${message}`);
    } finally {
      setBusyModuleId("");
    }
  }

  async function handleDeleteModule(moduleId: string) {
    const target = props.modules.find((item) => item.id === moduleId);
    if (!target || !window.confirm(`确认删除模块「${target.moduleName}」吗？该操作不可撤销。`)) {
      return;
    }
    setBusyModuleId(moduleId);
    props.onNotice("");
    props.onError("");
    try {
      if (props.dataSource === "seed") {
        props.onModulesChange((current) => current.filter((item) => item.id !== moduleId));
        if (selectedModuleId === moduleId) {
          setSelectedModuleId("");
        }
        props.onNotice(`演示模块已删除：${target.moduleName}`);
        return;
      }
      const deleted = await deleteModuleDefinition(moduleId);
      props.onModulesChange((current) => current.filter((item) => item.id !== moduleId));
      if (selectedModuleId === moduleId) {
        setSelectedModuleId("");
      }
      props.onNotice(`模块已删除：${deleted.moduleName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除模块失败";
      props.onError(`删除模块失败：${message}`);
    } finally {
      setBusyModuleId("");
    }
  }

  return (
    <div
      className="strategy-layout"
      style={{ alignItems: "stretch", gridTemplateColumns: "132px minmax(0, 1fr)", width: "100%" }}
    >
      <aside className="strategy-level-panel strategy-level-panel--directory" style={{ width: "100%", minWidth: 0 }}>
        <div className="strategy-level-button-list">
          {centerSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`strategy-level-button${activeSection === section.key ? " is-active" : ""}`}
              onClick={() => setActiveSection(section.key)}
            >
              <strong>{section.label}</strong>
              <small>{section.badge}</small>
            </button>
          ))}
        </div>
      </aside>

      <div
        className="strategy-content-panel xiaohongshu-content-panel"
        style={{ width: "100%", maxWidth: "100%", minWidth: 0, alignContent: "start" }}
      >
        {activeSection === "registry" ? (
          <div className="admin-user-management" style={{ width: "100%", maxWidth: "100%", minWidth: 0, display: "grid", gap: 16 }}>
            <section className="entity-card admin-user-filter-card">
              <div className="admin-user-filter-head">
                <div>
                  <span className="archive-pill status-ready">模块</span>
                  <h3>模块注册中心</h3>
                  <p>维护模块定义、路由入口、能力依赖、默认能力包摘要字段，为后续模块化接线提供注册底座。</p>
                </div>
                <div className="admin-user-filter-summary">
                  <div>
                    <span>当前结果</span>
                    <strong>{visibleModules.length}</strong>
                  </div>
                  <div>
                    <span>已启用</span>
                    <strong>{visibleModules.filter((item) => item.moduleStatus === "ACTIVE").length}</strong>
                  </div>
                  <div>
                    <span>工作台模块</span>
                    <strong>{visibleModules.filter((item) => item.moduleType === "WORKBENCH").length}</strong>
                  </div>
                </div>
              </div>

              <div className="admin-user-filter-grid">
                <label>
                  <span>关键词</span>
                  <input
                    value={filters.keyword}
                    placeholder="模块名称 / moduleKey / 描述"
                    onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                  />
                </label>
                <label>
                  <span>模块类型</span>
                  <select
                    value={filters.moduleType}
                    onChange={(event) => setFilters((current) => ({ ...current, moduleType: event.target.value as ModuleFilters["moduleType"] }))}
                  >
                    <option value="ALL">全部</option>
                    {MODULE_TYPE_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>模块状态</span>
                  <select
                    value={filters.moduleStatus}
                    onChange={(event) => setFilters((current) => ({ ...current, moduleStatus: event.target.value as ModuleFilters["moduleStatus"] }))}
                  >
                    <option value="ALL">全部</option>
                    {MODULE_STATUS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
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
              </div>
            </section>

            <section className="entity-card admin-rule-card">
              <div className="entity-card-head">
                <div>
                  <strong>新建模块</strong>
                  <p className="personal-meta">点击按钮后弹窗录入模块资料，避免后台页面首屏直接展开整块创建表单。</p>
                </div>
                <button type="button" className="primary-button" onClick={handleOpenCreateModal}>
                  创建模块
                </button>
              </div>
              <div className="personal-meta" style={{ paddingTop: 12 }}>
                先录入模块定义，再逐步接能力包关系、知识空间和页面入口。
              </div>
            </section>

            <section className="admin-user-layout" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
              <article className="entity-card admin-user-list-card" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
                <div className="entity-card-head">
                  <div>
                    <strong>模块列表</strong>
                    <p className="personal-meta">支持选择模块进入编辑，也可以直接归档或删除。</p>
                  </div>
                </div>

                <div className="admin-user-table-wrapper">
                  <table className="admin-user-table">
                    <thead>
                      <tr>
                        <th>模块</th>
                        <th>类型</th>
                        <th>状态</th>
                        <th>入口路由</th>
                        <th>优先级</th>
                        <th>更新时间</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleModules.length ? (
                        visibleModules.map((item) => (
                          <tr key={item.id} className={selectedModuleId === item.id ? "is-active" : ""}>
                            <td>
                              <button type="button" className="admin-user-row-button" onClick={() => setSelectedModuleId(item.id)}>
                                <span className="admin-user-row-title">{item.moduleName}</span>
                                <span className="admin-user-row-meta">
                                  {item.moduleKey} · {item.description || "暂无描述"}
                                </span>
                              </button>
                            </td>
                            <td>{item.moduleType}</td>
                            <td>
                              <span
                                className={`archive-pill ${
                                  item.moduleStatus === "ACTIVE"
                                    ? "status-ready"
                                    : item.moduleStatus === "PLANNING"
                                      ? "status-in_progress"
                                      : "status-paused"
                                }`}
                              >
                                {item.moduleStatus}
                              </span>
                            </td>
                            <td>{item.entryRoute}</td>
                            <td>{item.phasePriority || "-"}</td>
                            <td>{formatDateTime(item.updatedAt)}</td>
                            <td>
                              <div className="personal-actions" style={{ justifyContent: "flex-start" }}>
                                <button type="button" className="secondary-button" onClick={() => setSelectedModuleId(item.id)}>
                                  编辑
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleArchiveModule(item.id)}
                                  disabled={busyModuleId === item.id}
                                >
                                  归档
                                </button>
                                <button
                                  type="button"
                                  className="danger-button"
                                  onClick={() => void handleDeleteModule(item.id)}
                                  disabled={busyModuleId === item.id}
                                >
                                  删除
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "24px 12px", color: "var(--muted)" }}>
                            当前没有符合条件的模块定义。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="entity-card admin-user-list-card" style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}>
                <div className="entity-card-head">
                  <div>
                    <strong>模块编辑</strong>
                    <p className="personal-meta">
                      {selectedModule ? `当前编辑：${selectedModule.moduleName}` : "从左侧模块列表中选择一个模块后再编辑。"}
                    </p>
                  </div>
                  <div className="personal-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setSelectedDraft(selectedModule ? buildDraftFromRecord(selectedModule) : buildCreateDraft())}
                      disabled={!selectedModule || isSaving}
                    >
                      重置
                    </button>
                    <button type="button" className="primary-button" onClick={() => void handleSaveModule()} disabled={!selectedModule || isSaving}>
                      {isSaving ? "保存中..." : "保存模块"}
                    </button>
                  </div>
                </div>

                {selectedModule ? (
                  <ModuleDraftForm draft={selectedDraft} onChange={setSelectedDraft} />
                ) : (
                  <div className="personal-meta" style={{ paddingTop: 12 }}>
                    请选择一个模块进行编辑。
                  </div>
                )}
              </article>
            </section>
          </div>
        ) : null}

        {activeSection === "packages" ? (
          <SkillPackagesPanel modules={props.modules} dataSource={props.dataSource} onNotice={props.onNotice} onError={props.onError} />
        ) : null}

        {activeSection === "moduleRelations" ? (
          <SkillPackageModulesPanel modules={props.modules} dataSource={props.dataSource} onNotice={props.onNotice} onError={props.onError} />
        ) : null}

        {activeSection === "skillRelations" ? (
          <SkillPackageSkillsPanel skills={props.skills} dataSource={props.dataSource} onNotice={props.onNotice} onError={props.onError} />
        ) : null}
      </div>

      {isCreateModalOpen ? (
        <div className="admin-user-modal-overlay" role="presentation" onClick={handleCloseCreateModal}>
          <div
            className="entity-card admin-user-modal"
            role="dialog"
            aria-modal="true"
            aria-label="新建模块"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-user-modal-topbar">
              <div>
                <span className="archive-pill status-ready">模块创建</span>
                <strong>新建模块</strong>
                <p className="personal-meta">录入模块定义、路由入口和能力依赖，创建后即可进入右侧编辑区继续调整。</p>
              </div>
              <button type="button" className="secondary-button" onClick={handleCloseCreateModal} disabled={isCreating}>
                关闭
              </button>
            </div>
            <ModuleDraftForm draft={createDraft} onChange={setCreateDraft} />
            <div className="personal-actions">
              <button type="button" className="secondary-button" onClick={handleCloseCreateModal} disabled={isCreating}>
                取消
              </button>
              <button type="button" className="primary-button" onClick={() => void handleCreateModule()} disabled={isCreating}>
                {isCreating ? "创建中..." : "确认创建"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModuleDraftForm(props: {
  draft: ModuleDraft;
  onChange: Dispatch<SetStateAction<ModuleDraft>>;
}) {
  return (
    <div className="admin-rule-grid">
      <label>
        <span>模块名称</span>
        <input value={props.draft.moduleName} onChange={(event) => props.onChange((current) => ({ ...current, moduleName: event.target.value }))} />
      </label>
      <label>
        <span>moduleKey</span>
        <input value={props.draft.moduleKey} onChange={(event) => props.onChange((current) => ({ ...current, moduleKey: event.target.value }))} />
      </label>
      <label>
        <span>模块类型</span>
        <select value={props.draft.moduleType} onChange={(event) => props.onChange((current) => ({ ...current, moduleType: event.target.value as ModuleDraft["moduleType"] }))}>
          {MODULE_TYPE_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>模块状态</span>
        <select
          value={props.draft.moduleStatus}
          onChange={(event) => props.onChange((current) => ({ ...current, moduleStatus: event.target.value as ModuleDraft["moduleStatus"] }))}
        >
          {MODULE_STATUS_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>入口路由</span>
        <input value={props.draft.entryRoute} onChange={(event) => props.onChange((current) => ({ ...current, entryRoute: event.target.value }))} />
      </label>
      <label>
        <span>图标</span>
        <input value={props.draft.icon} onChange={(event) => props.onChange((current) => ({ ...current, icon: event.target.value }))} />
      </label>
      <label>
        <span>排序</span>
        <input value={props.draft.sortOrder} onChange={(event) => props.onChange((current) => ({ ...current, sortOrder: event.target.value }))} />
      </label>
      <label>
        <span>阶段优先级</span>
        <select
          value={props.draft.phasePriority}
          onChange={(event) => props.onChange((current) => ({ ...current, phasePriority: event.target.value as ModuleDraft["phasePriority"] }))}
        >
          <option value="">未设置</option>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
        </select>
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        <span>描述</span>
        <textarea value={props.draft.description} onChange={(event) => props.onChange((current) => ({ ...current, description: event.target.value }))} />
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        <span>所需权限</span>
        <textarea value={props.draft.requiredPermissions} onChange={(event) => props.onChange((current) => ({ ...current, requiredPermissions: event.target.value }))} />
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        <span>功能开关</span>
        <textarea value={props.draft.featureFlags} onChange={(event) => props.onChange((current) => ({ ...current, featureFlags: event.target.value }))} />
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        <span>依赖能力域</span>
        <textarea value={props.draft.requiredCapabilities} onChange={(event) => props.onChange((current) => ({ ...current, requiredCapabilities: event.target.value }))} />
      </label>
      <label>
        <span>Provider 依赖</span>
        <textarea value={props.draft.requiredProviders} onChange={(event) => props.onChange((current) => ({ ...current, requiredProviders: event.target.value }))} />
      </label>
      <label>
        <span>表依赖</span>
        <textarea value={props.draft.requiredTables} onChange={(event) => props.onChange((current) => ({ ...current, requiredTables: event.target.value }))} />
      </label>
      <label>
        <span>存储依赖</span>
        <textarea value={props.draft.requiredStorages} onChange={(event) => props.onChange((current) => ({ ...current, requiredStorages: event.target.value }))} />
      </label>
      <label>
        <span>第三方平台</span>
        <textarea
          value={props.draft.requiredThirdPartyPlatforms}
          onChange={(event) => props.onChange((current) => ({ ...current, requiredThirdPartyPlatforms: event.target.value }))}
        />
      </label>
      <label>
        <span>任务类型</span>
        <textarea value={props.draft.taskTypes} onChange={(event) => props.onChange((current) => ({ ...current, taskTypes: event.target.value }))} />
      </label>
      <label>
        <span>媒体类型</span>
        <textarea value={props.draft.mediaTypes} onChange={(event) => props.onChange((current) => ({ ...current, mediaTypes: event.target.value }))} />
      </label>
      <label>
        <span>工作流类型</span>
        <textarea value={props.draft.workflowTypes} onChange={(event) => props.onChange((current) => ({ ...current, workflowTypes: event.target.value }))} />
      </label>
      <label>
        <span>发布目标</span>
        <textarea value={props.draft.publishTargets} onChange={(event) => props.onChange((current) => ({ ...current, publishTargets: event.target.value }))} />
      </label>
      <label>
        <span>默认能力包</span>
        <textarea
          value={props.draft.defaultSkillPackages}
          onChange={(event) => props.onChange((current) => ({ ...current, defaultSkillPackages: event.target.value }))}
        />
      </label>
      <label>
        <span>默认知识空间</span>
        <textarea
          value={props.draft.defaultKnowledgeSpaces}
          onChange={(event) => props.onChange((current) => ({ ...current, defaultKnowledgeSpaces: event.target.value }))}
        />
      </label>
      <label>
        <span>默认 Provider 策略</span>
        <textarea
          value={props.draft.defaultProviderPolicies}
          onChange={(event) => props.onChange((current) => ({ ...current, defaultProviderPolicies: event.target.value }))}
        />
      </label>
      <label>
        <span>平台可见</span>
        <select
          value={String(props.draft.isPlatformVisible)}
          onChange={(event) => props.onChange((current) => ({ ...current, isPlatformVisible: event.target.value === "true" }))}
        >
          <option value="true">是</option>
          <option value="false">否</option>
        </select>
      </label>
      <label>
        <span>品牌可见</span>
        <select
          value={String(props.draft.isBrandVisible)}
          onChange={(event) => props.onChange((current) => ({ ...current, isBrandVisible: event.target.value === "true" }))}
        >
          <option value="true">是</option>
          <option value="false">否</option>
        </select>
      </label>
      <label>
        <span>后台可见</span>
        <select
          value={String(props.draft.isAdminVisible)}
          onChange={(event) => props.onChange((current) => ({ ...current, isAdminVisible: event.target.value === "true" }))}
        >
          <option value="true">是</option>
          <option value="false">否</option>
        </select>
      </label>
      <label style={{ gridColumn: "1 / -1" }}>
        <span>备注</span>
        <textarea value={props.draft.remarks} onChange={(event) => props.onChange((current) => ({ ...current, remarks: event.target.value }))} />
      </label>
    </div>
  );
}

function buildCreateDraft(): ModuleDraft {
  return {
    moduleKey: "",
    moduleName: "",
    moduleType: "WORKBENCH",
    moduleStatus: "PLANNING",
    entryRoute: "/",
    icon: "",
    sortOrder: "100",
    description: "",
    requiredPermissions: "",
    featureFlags: "",
    requiredCapabilities: "",
    requiredProviders: "",
    requiredTables: "",
    requiredStorages: "",
    requiredThirdPartyPlatforms: "",
    taskTypes: "",
    mediaTypes: "",
    workflowTypes: "",
    publishTargets: "",
    defaultSkillPackages: "",
    defaultKnowledgeSpaces: "",
    defaultProviderPolicies: "",
    phasePriority: "",
    remarks: "",
    isPlatformVisible: true,
    isBrandVisible: true,
    isAdminVisible: true,
  };
}

function buildDraftFromRecord(record: ModuleDefinitionRecord): ModuleDraft {
  return {
    moduleKey: record.moduleKey,
    moduleName: record.moduleName,
    moduleType: record.moduleType,
    moduleStatus: record.moduleStatus,
    entryRoute: record.entryRoute,
    icon: record.icon,
    sortOrder: String(record.sortOrder),
    description: record.description,
    requiredPermissions: record.requiredPermissions.join("\n"),
    featureFlags: record.featureFlags.join("\n"),
    requiredCapabilities: record.requiredCapabilities.join("\n"),
    requiredProviders: record.requiredProviders.join("\n"),
    requiredTables: record.requiredTables.join("\n"),
    requiredStorages: record.requiredStorages.join("\n"),
    requiredThirdPartyPlatforms: record.requiredThirdPartyPlatforms.join("\n"),
    taskTypes: record.taskTypes.join("\n"),
    mediaTypes: record.mediaTypes.join("\n"),
    workflowTypes: record.workflowTypes.join("\n"),
    publishTargets: record.publishTargets.join("\n"),
    defaultSkillPackages: record.defaultSkillPackages.join("\n"),
    defaultKnowledgeSpaces: record.defaultKnowledgeSpaces.join("\n"),
    defaultProviderPolicies: record.defaultProviderPolicies.join("\n"),
    phasePriority: record.phasePriority || "",
    remarks: record.remarks || "",
    isPlatformVisible: record.isPlatformVisible,
    isBrandVisible: record.isBrandVisible,
    isAdminVisible: record.isAdminVisible,
  };
}

function parseLines(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toPayload(draft: ModuleDraft): Omit<ModuleDefinitionRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    moduleKey: draft.moduleKey.trim(),
    moduleName: draft.moduleName.trim(),
    moduleType: draft.moduleType,
    moduleStatus: draft.moduleStatus,
    entryRoute: draft.entryRoute.trim(),
    icon: draft.icon.trim(),
    sortOrder: Number(draft.sortOrder || 100),
    description: draft.description.trim(),
    requiredPermissions: parseLines(draft.requiredPermissions),
    featureFlags: parseLines(draft.featureFlags),
    isPlatformVisible: draft.isPlatformVisible,
    isBrandVisible: draft.isBrandVisible,
    isAdminVisible: draft.isAdminVisible,
    requiredCapabilities: parseLines(draft.requiredCapabilities),
    requiredProviders: parseLines(draft.requiredProviders),
    requiredTables: parseLines(draft.requiredTables),
    requiredStorages: parseLines(draft.requiredStorages),
    requiredThirdPartyPlatforms: parseLines(draft.requiredThirdPartyPlatforms),
    taskTypes: parseLines(draft.taskTypes),
    mediaTypes: parseLines(draft.mediaTypes),
    workflowTypes: parseLines(draft.workflowTypes),
    publishTargets: parseLines(draft.publishTargets),
    defaultSkillPackages: parseLines(draft.defaultSkillPackages),
    defaultKnowledgeSpaces: parseLines(draft.defaultKnowledgeSpaces),
    defaultProviderPolicies: parseLines(draft.defaultProviderPolicies),
    phasePriority: draft.phasePriority || undefined,
    remarks: draft.remarks.trim() || undefined,
  };
}

function matchesFilters(record: ModuleDefinitionRecord, filters: ModuleFilters) {
  if (filters.moduleType !== "ALL" && record.moduleType !== filters.moduleType) {
    return false;
  }
  if (filters.moduleStatus !== "ALL" && record.moduleStatus !== filters.moduleStatus) {
    return false;
  }
  const keyword = filters.keyword.trim().toLowerCase();
  if (!keyword) {
    return true;
  }
  return [record.moduleName, record.moduleKey, record.description, record.entryRoute].some((field) =>
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
