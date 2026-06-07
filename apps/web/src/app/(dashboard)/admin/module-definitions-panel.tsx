"use client";

import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  archiveModuleDefinition,
  createModuleDefinition,
  deleteModuleDefinition,
  getModuleDefinitions,
  type GetModuleDefinitionsQuery,
  type ApiProviderRecord,
  type KnowledgeBaseRecord,
  type ModuleDefinitionRecord,
  type SkillAssetBindingRecord,
  type SkillConfigRecord,
  type SkillPackageRecord,
  updateModuleDefinition,
} from "../../../services/admin";
import { SkillPackagesPanel } from "./skill-packages-panel";
import { SkillPackageKnowledgeSpacesPanel } from "./skill-package-knowledge-spaces-panel";
import { SkillPackageModulesPanel } from "./skill-package-modules-panel";
import { SkillPackageSkillsPanel } from "./skill-package-skills-panel";

type ModuleDefinitionsPanelProps = {
  modules: ModuleDefinitionRecord[];
  skills: SkillConfigRecord[];
  skillPackages: SkillPackageRecord[];
  skillAssetBindings: SkillAssetBindingRecord[];
  knowledgeBases: KnowledgeBaseRecord[];
  providers: ApiProviderRecord[];
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

type ModuleCenterSectionKey = "registry" | "packages" | "moduleRelations" | "skillRelations" | "knowledgeRelations";

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

const PROVIDER_POLICY_TEMPLATE_OPTIONS = [
  {
    key: "PRIMARY",
    label: "首选直连",
    description: "默认优先使用该 Provider 作为主调用来源。",
  },
  {
    key: "BALANCED",
    label: "平衡策略",
    description: "在质量、速度和成本之间做均衡选择。",
  },
  {
    key: "COST",
    label: "成本优先",
    description: "在可接受效果下优先控制调用成本。",
  },
  {
    key: "FALLBACK",
    label: "降级兜底",
    description: "仅在主链路不可用时作为兜底策略。",
  },
] as const;

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
      {
        key: "knowledgeRelations" as const,
        label: "知识关系",
        badge: "KS",
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
                  <ModuleDraftForm
                    draft={selectedDraft}
                    onChange={setSelectedDraft}
                    modules={props.modules}
                    skillPackages={props.skillPackages}
                    knowledgeBases={props.knowledgeBases}
                    providers={props.providers}
                  />
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
          <SkillPackageModulesPanel
            modules={props.modules}
            skillPackages={props.skillPackages}
            dataSource={props.dataSource}
            onNotice={props.onNotice}
            onError={props.onError}
          />
        ) : null}

        {activeSection === "skillRelations" ? (
          <SkillPackageSkillsPanel
            skills={props.skills}
            skillPackages={props.skillPackages}
            skillAssetBindings={props.skillAssetBindings}
            dataSource={props.dataSource}
            onNotice={props.onNotice}
            onError={props.onError}
          />
        ) : null}

        {activeSection === "knowledgeRelations" ? (
          <SkillPackageKnowledgeSpacesPanel dataSource={props.dataSource} onNotice={props.onNotice} onError={props.onError} />
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
            style={{ width: "min(1180px, calc(100vw - 40px))", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}
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
            <ModuleDraftForm
              draft={createDraft}
              onChange={setCreateDraft}
              modules={props.modules}
              skillPackages={props.skillPackages}
              knowledgeBases={props.knowledgeBases}
              providers={props.providers}
            />
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
  modules: ModuleDefinitionRecord[];
  skillPackages: SkillPackageRecord[];
  knowledgeBases: KnowledgeBaseRecord[];
  providers: ApiProviderRecord[];
}) {
  const selectedPackageKeys = useMemo(() => parseLines(props.draft.defaultSkillPackages), [props.draft.defaultSkillPackages]);
  const selectedKnowledgeSpaceSlugs = useMemo(() => parseLines(props.draft.defaultKnowledgeSpaces), [props.draft.defaultKnowledgeSpaces]);
  const selectedProviderPolicies = useMemo(() => parseLines(props.draft.defaultProviderPolicies), [props.draft.defaultProviderPolicies]);
  const selectedFeatureFlags = useMemo(() => parseLines(props.draft.featureFlags), [props.draft.featureFlags]);
  const selectedPermissions = useMemo(() => parseLines(props.draft.requiredPermissions), [props.draft.requiredPermissions]);
  const selectedCapabilities = useMemo(() => parseLines(props.draft.requiredCapabilities), [props.draft.requiredCapabilities]);
  const selectedProviders = useMemo(() => parseLines(props.draft.requiredProviders), [props.draft.requiredProviders]);
  const selectedTables = useMemo(() => parseLines(props.draft.requiredTables), [props.draft.requiredTables]);
  const selectedStorages = useMemo(() => parseLines(props.draft.requiredStorages), [props.draft.requiredStorages]);
  const selectedThirdPartyPlatforms = useMemo(
    () => parseLines(props.draft.requiredThirdPartyPlatforms),
    [props.draft.requiredThirdPartyPlatforms],
  );
  const selectedTaskTypes = useMemo(() => parseLines(props.draft.taskTypes), [props.draft.taskTypes]);
  const selectedMediaTypes = useMemo(() => parseLines(props.draft.mediaTypes), [props.draft.mediaTypes]);
  const selectedWorkflowTypes = useMemo(() => parseLines(props.draft.workflowTypes), [props.draft.workflowTypes]);
  const selectedPublishTargets = useMemo(() => parseLines(props.draft.publishTargets), [props.draft.publishTargets]);
  const featureFlagOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.featureFlags), "功能开关", "来自已注册模块的 feature flag"),
    [props.modules],
  );
  const permissionOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.requiredPermissions), "权限", "来自已注册模块的权限项"),
    [props.modules],
  );
  const capabilityOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.requiredCapabilities), "能力域", "来自已注册模块的能力域"),
    [props.modules],
  );
  const providerOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.requiredProviders), "Provider", "来自已注册模块的 Provider 依赖类型"),
    [props.modules],
  );
  const tableOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.requiredTables), "数据表", "来自已注册模块的表依赖"),
    [props.modules],
  );
  const storageOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.requiredStorages), "存储", "来自已注册模块的存储依赖"),
    [props.modules],
  );
  const thirdPartyPlatformOptions = useMemo(
    () =>
      buildStructuredOptions(
        props.modules.flatMap((item) => item.requiredThirdPartyPlatforms),
        "第三方平台",
        "来自已注册模块的第三方平台依赖",
      ),
    [props.modules],
  );
  const taskTypeOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.taskTypes), "任务类型", "来自已注册模块的任务类型"),
    [props.modules],
  );
  const mediaTypeOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.mediaTypes), "媒体类型", "来自已注册模块的媒体类型"),
    [props.modules],
  );
  const workflowTypeOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.workflowTypes), "工作流", "来自已注册模块的工作流类型"),
    [props.modules],
  );
  const publishTargetOptions = useMemo(
    () => buildStructuredOptions(props.modules.flatMap((item) => item.publishTargets), "发布目标", "来自已注册模块的发布目标"),
    [props.modules],
  );
  const packageOptions = useMemo(
    () =>
      props.skillPackages
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          value: item.packageKey,
          title: item.packageName,
          description: `${item.packageKey} · ${item.status} · ${item.scope}`,
        })),
    [props.skillPackages],
  );
  const knowledgeOptions = useMemo(
    () =>
      props.knowledgeBases.slice().map((item) => ({
        value: item.slug,
        title: item.name,
        description: `${item.slug} · ${item.status} · 文档 ${item.documentCount}`,
      })),
    [props.knowledgeBases],
  );
  const providerPolicyOptions = useMemo(
    () =>
      props.providers
        .slice()
        .filter((item) => item.status !== "DISABLED")
        .flatMap((item) =>
          PROVIDER_POLICY_TEMPLATE_OPTIONS.map((policy) => ({
            value: `${policy.key}:${item.id}`,
            title: `${item.name} / ${policy.label}`,
            description: `${item.providerType} · 默认模型 ${item.defaultModel || "-"} · ${policy.description}`,
          })),
        ),
    [props.providers],
  );

  function updateMultiSelectField(field: "defaultSkillPackages" | "defaultKnowledgeSpaces" | "defaultProviderPolicies", value: string, checked: boolean) {
    props.onChange((current) => {
      const nextValues = new Set(parseLines(current[field]));
      if (checked) {
        nextValues.add(value);
      } else {
        nextValues.delete(value);
      }
      return {
        ...current,
        [field]: Array.from(nextValues).join("\n"),
      };
    });
  }

  function updateStructuredField(
    field:
      | "requiredPermissions"
      | "requiredCapabilities"
      | "requiredProviders"
      | "requiredTables"
      | "requiredStorages"
      | "requiredThirdPartyPlatforms"
      | "featureFlags"
      | "taskTypes"
      | "mediaTypes"
      | "workflowTypes"
      | "publishTargets",
    value: string,
    checked: boolean,
  ) {
    props.onChange((current) => {
      const nextValues = new Set(parseLines(current[field]));
      if (checked) {
        nextValues.add(value);
      } else {
        nextValues.delete(value);
      }
      return {
        ...current,
        [field]: Array.from(nextValues).join("\n"),
      };
    });
  }

  return (
    <div style={{ display: "grid", gap: 16, marginTop: 12 }}>
      <section className="entity-card" style={{ padding: 16 }}>
        <div className="entity-card-head" style={{ marginBottom: 12 }}>
          <div>
            <strong>填写说明</strong>
            <p className="personal-meta">先填基础信息与依赖；默认绑定项本轮已经接入后台真实列表选择，仍保留手工补充兜底以兼容旧数据。</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <div className="entity-card" style={{ padding: 12 }}>
            <strong>基础必填区</strong>
            <p className="personal-meta">模块名称、模块标识、入口路由必须明确；功能开关、权限、能力域、任务类型当前都已改为结构化优先，仍可手工补充。</p>
          </div>
          <div className="entity-card" style={{ padding: 12 }}>
            <strong>系统直接可选</strong>
            <p className="personal-meta">模块类型、模块状态、阶段优先级、平台/品牌/后台可见性，当前都已做成固定下拉选择。</p>
          </div>
          <div className="entity-card" style={{ padding: 12 }}>
            <strong>当前可不填</strong>
            <p className="personal-meta">图标、排序、发布目标、备注等，可后续补齐；默认绑定项现在优先从后台真实数据选择。</p>
          </div>
        </div>
      </section>

      <ModuleFormSection title="基础信息" description="先录入模块本身是什么、从哪里进入。这里是新建模块的最小必填区。">
        <div className="admin-rule-grid">
          <ModuleFormField label="模块名称" badge="必填" hint="用户手工填写，面向前后台的中文展示名称。">
            <input
              value={props.draft.moduleName}
              placeholder="例如：公众号工作台"
              onChange={(event) => props.onChange((current) => ({ ...current, moduleName: event.target.value }))}
            />
          </ModuleFormField>
          <ModuleFormField label="moduleKey" badge="必填" hint="用户手工填写，建议英文短横线命名，后续作为模块唯一标识。">
            <input
              value={props.draft.moduleKey}
              placeholder="例如：wechat-workbench"
              onChange={(event) => props.onChange((current) => ({ ...current, moduleKey: event.target.value }))}
            />
          </ModuleFormField>
          <ModuleFormField label="模块类型" badge="系统可选" hint="直接从固定枚举选择，不需要自由填写。">
            <select value={props.draft.moduleType} onChange={(event) => props.onChange((current) => ({ ...current, moduleType: event.target.value as ModuleDraft["moduleType"] }))}>
              {MODULE_TYPE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </ModuleFormField>
          <ModuleFormField label="模块状态" badge="系统可选" hint="直接从固定状态选择，初建阶段通常先用 PLANNING。">
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
          </ModuleFormField>
          <ModuleFormField label="入口路由" badge="必填" hint="用户手工填写，决定模块页面入口，建议以 / 开头。">
            <input
              value={props.draft.entryRoute}
              placeholder="例如：/wechat"
              onChange={(event) => props.onChange((current) => ({ ...current, entryRoute: event.target.value }))}
            />
          </ModuleFormField>
          <ModuleFormField label="图标" badge="可不填" hint="前端图标 key，没有就先留空，后续补。">
            <input
              value={props.draft.icon}
              placeholder="例如：wechat"
              onChange={(event) => props.onChange((current) => ({ ...current, icon: event.target.value }))}
            />
          </ModuleFormField>
          <ModuleFormField label="排序" badge="推荐" hint="用于列表和菜单排序，默认 100，一般不需要频繁调整。">
            <input
              value={props.draft.sortOrder}
              placeholder="100"
              onChange={(event) => props.onChange((current) => ({ ...current, sortOrder: event.target.value }))}
            />
          </ModuleFormField>
          <ModuleFormField label="阶段优先级" badge="系统可选" hint="用于项目分期，不是运行必须字段。">
            <select
              value={props.draft.phasePriority}
              onChange={(event) => props.onChange((current) => ({ ...current, phasePriority: event.target.value as ModuleDraft["phasePriority"] }))}
            >
              <option value="">未设置</option>
              <option value="P0">P0</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
            </select>
          </ModuleFormField>
          <ModuleFormField label="描述" badge="推荐" hint="建议填写模块用途，便于后续模块中心和关系页面快速识别。" wide>
            <textarea
              value={props.draft.description}
              placeholder="例如：负责公众号文章创作、配图、HTML 生成与发布。"
              onChange={(event) => props.onChange((current) => ({ ...current, description: event.target.value }))}
            />
          </ModuleFormField>
        </div>
      </ModuleFormSection>

      <ModuleFormSection title="展示与可见性" description="这部分主要决定模块会显示在哪些端，以及是否受功能开关控制。">
        <div className="admin-rule-grid">
          <ModuleFormField label="平台可见" badge="系统可选" hint="固定开关；通常工作台模块和平台模块保持可见。">
            <select
              value={String(props.draft.isPlatformVisible)}
              onChange={(event) => props.onChange((current) => ({ ...current, isPlatformVisible: event.target.value === "true" }))}
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </ModuleFormField>
          <ModuleFormField label="品牌可见" badge="系统可选" hint="如果品牌侧不需要看到该模块，可以先关闭。">
            <select
              value={String(props.draft.isBrandVisible)}
              onChange={(event) => props.onChange((current) => ({ ...current, isBrandVisible: event.target.value === "true" }))}
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </ModuleFormField>
          <ModuleFormField label="后台可见" badge="系统可选" hint="管理台是否显示该模块。通常后台治理模块设为可见。">
            <select
              value={String(props.draft.isAdminVisible)}
              onChange={(event) => props.onChange((current) => ({ ...current, isAdminVisible: event.target.value === "true" }))}
            >
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </ModuleFormField>
          <ModuleFormField label="功能开关" badge="结构化" hint="优先复用已有模块的 feature flag，再按每行一个补充；命名需与前端开关保持一致。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用功能开关，可直接在下方补充。"
                options={featureFlagOptions}
                selectedValues={selectedFeatureFlags}
                onToggle={(value, checked) => updateStructuredField("featureFlags", value, checked)}
              />
              <textarea
                value={props.draft.featureFlags}
                placeholder={"例如：\nwechat_enabled\nwechat_publish_enabled"}
                onChange={(event) => props.onChange((current) => ({ ...current, featureFlags: event.target.value }))}
              />
            </div>
          </ModuleFormField>
        </div>
      </ModuleFormSection>

      <ModuleFormSection title="权限与依赖" description="这部分决定模块运行时依赖什么能力、权限、Provider、表和第三方平台。">
        <div className="admin-rule-grid">
          <ModuleFormField label="所需权限" badge="结构化" hint="先勾选已有权限项，再按每行一个补充特殊权限；这是访问控制主字段。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用权限项，请先录入一个模块后再沉淀。"
                options={permissionOptions}
                selectedValues={selectedPermissions}
                onToggle={(value, checked) => updateStructuredField("requiredPermissions", value, checked)}
              />
              <textarea
                value={props.draft.requiredPermissions}
                placeholder={"例如：\nmodule:wechat:read\nmodule:wechat:write"}
                onChange={(event) => props.onChange((current) => ({ ...current, requiredPermissions: event.target.value }))}
              />
            </div>
          </ModuleFormField>
          <ModuleFormField label="依赖能力域" badge="结构化" hint="先选已有能力域，再按每行一个补充新能力；用于描述模块依赖的业务能力。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用能力域，请先沉淀已有模块能力域。"
                options={capabilityOptions}
                selectedValues={selectedCapabilities}
                onToggle={(value, checked) => updateStructuredField("requiredCapabilities", value, checked)}
              />
              <textarea
                value={props.draft.requiredCapabilities}
                placeholder={"例如：\ncontent-domain\npublish-domain"}
                onChange={(event) => props.onChange((current) => ({ ...current, requiredCapabilities: event.target.value }))}
              />
            </div>
          </ModuleFormField>
          <ModuleFormField label="Provider 依赖" badge="结构化" hint="优先复用已有模块中的 Provider 类型，再按每行一个补充；例如 text、image、video。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用 Provider 类型，可直接在下方补充。"
                options={providerOptions}
                selectedValues={selectedProviders}
                onToggle={(value, checked) => updateStructuredField("requiredProviders", value, checked)}
              />
              <textarea
                value={props.draft.requiredProviders}
                placeholder={"例如：\ntext\nimage"}
                onChange={(event) => props.onChange((current) => ({ ...current, requiredProviders: event.target.value }))}
              />
            </div>
          </ModuleFormField>
          <ModuleFormField label="表依赖" badge="结构化" hint="优先复用已有模块沉淀的表依赖，再按每行一个补充实际核心表。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用表依赖，可直接在下方补充。"
                options={tableOptions}
                selectedValues={selectedTables}
                onToggle={(value, checked) => updateStructuredField("requiredTables", value, checked)}
              />
              <textarea
                value={props.draft.requiredTables}
                placeholder={"例如：\nWork\nPublishRecord"}
                onChange={(event) => props.onChange((current) => ({ ...current, requiredTables: event.target.value }))}
              />
            </div>
          </ModuleFormField>
          <ModuleFormField label="存储依赖" badge="结构化" hint="只有用到 OSS、本地文件、对象存储时再填，优先从已有模块依赖中复用。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用存储依赖，可直接在下方补充。"
                options={storageOptions}
                selectedValues={selectedStorages}
                onToggle={(value, checked) => updateStructuredField("requiredStorages", value, checked)}
              />
              <textarea
                value={props.draft.requiredStorages}
                placeholder={"例如：\noss"}
                onChange={(event) => props.onChange((current) => ({ ...current, requiredStorages: event.target.value }))}
              />
            </div>
          </ModuleFormField>
          <ModuleFormField label="第三方平台" badge="结构化" hint="只有依赖公众号、抖音、小红书等平台时再填，优先复用已有平台依赖。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用第三方平台依赖，可直接在下方补充。"
                options={thirdPartyPlatformOptions}
                selectedValues={selectedThirdPartyPlatforms}
                onToggle={(value, checked) => updateStructuredField("requiredThirdPartyPlatforms", value, checked)}
              />
              <textarea
                value={props.draft.requiredThirdPartyPlatforms}
                placeholder={"例如：\nwechat-official-account"}
                onChange={(event) => props.onChange((current) => ({ ...current, requiredThirdPartyPlatforms: event.target.value }))}
              />
            </div>
          </ModuleFormField>
        </div>
      </ModuleFormSection>

      <ModuleFormSection title="任务与流程" description="这里说明模块会产出什么任务、媒体、流程和发布目标。">
        <div className="admin-rule-grid">
          <ModuleFormField label="任务类型" badge="结构化" hint="优先从已有模块任务类型中复用，再按每行一个补充。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用任务类型，请先创建示例模块。"
                options={taskTypeOptions}
                selectedValues={selectedTaskTypes}
                onToggle={(value, checked) => updateStructuredField("taskTypes", value, checked)}
              />
              <textarea
                value={props.draft.taskTypes}
                placeholder={"例如：\nwechat_article_generate"}
                onChange={(event) => props.onChange((current) => ({ ...current, taskTypes: event.target.value }))}
              />
            </div>
          </ModuleFormField>
          <ModuleFormField label="媒体类型" badge="结构化" hint="如果模块会生成图文、视频、HTML 等内容，优先从已有媒体类型中复用。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用媒体类型，可直接在下方补充。"
                options={mediaTypeOptions}
                selectedValues={selectedMediaTypes}
                onToggle={(value, checked) => updateStructuredField("mediaTypes", value, checked)}
              />
              <textarea
                value={props.draft.mediaTypes}
                placeholder={"例如：\narticle\nhtml"}
                onChange={(event) => props.onChange((current) => ({ ...current, mediaTypes: event.target.value }))}
              />
            </div>
          </ModuleFormField>
          <ModuleFormField label="工作流类型" badge="结构化" hint="当前用于和后续工作流编排对齐，优先复用已有工作流类型。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用工作流类型，可直接在下方补充。"
                options={workflowTypeOptions}
                selectedValues={selectedWorkflowTypes}
                onToggle={(value, checked) => updateStructuredField("workflowTypes", value, checked)}
              />
              <textarea
                value={props.draft.workflowTypes}
                placeholder={"例如：\ncontent-production"}
                onChange={(event) => props.onChange((current) => ({ ...current, workflowTypes: event.target.value }))}
              />
            </div>
          </ModuleFormField>
          <ModuleFormField label="发布目标" badge="结构化" hint="只有存在明确发布端时再填，优先复用已有目标；通常应和第三方平台依赖一起看。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <ModuleMultiSelectCard
                emptyText="当前还没有可复用发布目标，可直接在下方补充。"
                options={publishTargetOptions}
                selectedValues={selectedPublishTargets}
                onToggle={(value, checked) => updateStructuredField("publishTargets", value, checked)}
              />
              <textarea
                value={props.draft.publishTargets}
                placeholder={"例如：\nwechat-api"}
                onChange={(event) => props.onChange((current) => ({ ...current, publishTargets: event.target.value }))}
              />
            </div>
          </ModuleFormField>
        </div>
      </ModuleFormSection>

      <ModuleFormSection title="默认绑定" description="这部分本质是模块与能力包、知识库、Provider 策略的默认关系。本轮已接入后台真实列表，并保留手工补充兜底。">
        <div style={{ display: "grid", gap: 16 }}>
          <ModuleFormField label="默认能力包" badge="真实可选" hint="直接从后台能力包选择；若历史值不在列表中，可在下方手工补充。" wide>
            <ModuleMultiSelectCard
              emptyText="当前还没有可选能力包，请先到能力包注册里创建。"
              options={packageOptions}
              selectedValues={selectedPackageKeys}
              onToggle={(value, checked) => updateMultiSelectField("defaultSkillPackages", value, checked)}
            />
          </ModuleFormField>
          <ModuleFormField label="默认知识空间" badge="真实可选" hint="直接从后台知识库选择；若暂未建知识库，可先留空或手工补充。" wide>
            <ModuleMultiSelectCard
              emptyText="当前还没有可选知识库，请先到知识库中心创建。"
              options={knowledgeOptions}
              selectedValues={selectedKnowledgeSpaceSlugs}
              onToggle={(value, checked) => updateMultiSelectField("defaultKnowledgeSpaces", value, checked)}
            />
          </ModuleFormField>
          <ModuleFormField label="默认 Provider 策略" badge="策略模板" hint="当前按 Provider + 策略模板组合选择，更接近真实策略语义；后续再切到独立 Provider Policy 域。" wide>
            <ModuleMultiSelectCard
              emptyText="当前还没有可用 Provider，请先到接口供应商中配置。"
              options={providerPolicyOptions}
              selectedValues={selectedProviderPolicies}
              onToggle={(value, checked) => updateMultiSelectField("defaultProviderPolicies", value, checked)}
            />
          </ModuleFormField>
          <ModuleFormField label="默认绑定手工补充" badge="兼容旧值" hint="若需要录入暂未进入后台选择器的历史值，可继续按每行一个补充。" wide>
            <div className="admin-rule-grid">
              <label style={{ display: "grid", gap: 6 }}>
                <span>能力包补充值</span>
                <textarea
                  value={props.draft.defaultSkillPackages}
                  placeholder={"例如：\nwechat-article-generation"}
                  onChange={(event) => props.onChange((current) => ({ ...current, defaultSkillPackages: event.target.value }))}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>知识空间补充值</span>
                <textarea
                  value={props.draft.defaultKnowledgeSpaces}
                  placeholder={"例如：\nbrand-knowledge-space"}
                  onChange={(event) => props.onChange((current) => ({ ...current, defaultKnowledgeSpaces: event.target.value }))}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Provider 策略补充值</span>
                <textarea
                  value={props.draft.defaultProviderPolicies}
                  placeholder={"例如：\nPRIMARY:provider_openai"}
                  onChange={(event) => props.onChange((current) => ({ ...current, defaultProviderPolicies: event.target.value }))}
                />
              </label>
            </div>
          </ModuleFormField>
        </div>
      </ModuleFormSection>

      <ModuleFormSection title="备注" description="这一部分不影响系统运行，主要用于补充说明和交接。">
        <div className="admin-rule-grid">
          <ModuleFormField label="备注" badge="可不填" hint="记录项目背景、上下游模块说明、临时限制等。" wide>
            <textarea
              value={props.draft.remarks}
              placeholder="例如：当前先服务公众号工作流，后续再接品牌侧模块入口。"
              onChange={(event) => props.onChange((current) => ({ ...current, remarks: event.target.value }))}
            />
          </ModuleFormField>
        </div>
      </ModuleFormSection>
    </div>
  );
}

function ModuleFormSection(props: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="entity-card" style={{ padding: 16 }}>
      <div className="entity-card-head" style={{ marginBottom: 12 }}>
        <div>
          <strong>{props.title}</strong>
          <p className="personal-meta">{props.description}</p>
        </div>
      </div>
      {props.children}
    </section>
  );
}

function ModuleFormField(props: {
  label: string;
  badge: string;
  hint: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label style={props.wide ? { gridColumn: "1 / -1", display: "grid", gap: 6 } : { display: "grid", gap: 6 }}>
      <span>{props.label}</span>
      <small className="personal-meta">{`${props.badge} · ${props.hint}`}</small>
      {props.children}
    </label>
  );
}

function ModuleMultiSelectCard(props: {
  options: Array<{
    value: string;
    title: string;
    description: string;
  }>;
  selectedValues: string[];
  emptyText: string;
  onToggle: (value: string, checked: boolean) => void;
}) {
  if (!props.options.length) {
    return (
      <div className="entity-card" style={{ padding: 12 }}>
        <p className="personal-meta">{props.emptyText}</p>
      </div>
    );
  }

  const selectedSet = new Set(props.selectedValues);
  const selectedLabels = props.selectedValues.map((value) => props.options.find((item) => item.value === value)?.title || value);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="entity-card" style={{ padding: 12 }}>
        <strong>已选 {props.selectedValues.length} 项</strong>
        <p className="personal-meta">
          {selectedLabels.length ? selectedLabels.join(" / ") : "当前未选择，保存时会按手工补充值或空值处理。"}
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
        {props.options.map((item) => {
          const checked = selectedSet.has(item.value);
          return (
            <label
              key={item.value}
              className="entity-card"
              style={{
                padding: 12,
                display: "grid",
                gap: 6,
                cursor: "pointer",
                borderColor: checked ? "var(--primary)" : undefined,
                boxShadow: checked ? "0 0 0 1px rgba(59, 130, 246, 0.18)" : undefined,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={checked} onChange={(event) => props.onToggle(item.value, event.target.checked)} />
                <strong>{item.title}</strong>
              </span>
              <small className="personal-meta">{item.description}</small>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function buildStructuredOptions(values: string[], titlePrefix: string, description: string) {
  return Array.from(new Set(values.map((item) => String(item || "").trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "zh-CN"))
    .map((item) => ({
      value: item,
      title: item,
      description: `${titlePrefix} · ${description}`,
    }));
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
