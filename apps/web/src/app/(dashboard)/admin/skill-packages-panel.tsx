"use client";

import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  createSkillPackageSkill,
  createSkillPackage,
  deleteSkillPackageSkill,
  deleteSkillPackage,
  getSkillPackageSkillsByPackage,
  getSkillPackages,
  skillPackageSkillSeed,
  skillPackageSeed,
  updateSkillPackageSkill,
  updateSkillPackage,
  type ModuleDefinitionRecord,
  type SkillConfigRecord,
  type SkillPackageRecord,
  type SkillPackageSkillRecord,
} from "../../../services/admin";

type SkillPackagesPanelProps = {
  modules: ModuleDefinitionRecord[];
  skills: SkillConfigRecord[];
  dataSource: "api" | "seed";
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

type SkillPackageFilters = {
  keyword: string;
  status: "ALL" | SkillPackageRecord["status"];
  scope: "ALL" | SkillPackageRecord["scope"];
};

type SkillPackageDraft = {
  packageKey: string;
  packageName: string;
  description: string;
  status: SkillPackageRecord["status"];
  scope: SkillPackageRecord["scope"];
  moduleKeys: string;
  workflowStepKeys: string;
  tags: string;
  currentVersionId: string;
  defaultKnowledgeSpaceIds: string;
  defaultProviderPolicyIds: string;
  sortOrder: string;
  remarks: string;
};

type SkillAssemblyDraft = {
  skillId: string;
  bindingType: SkillPackageSkillRecord["bindingType"];
  isDefault: boolean;
  sortOrder: string;
  enabled: boolean;
  remarks: string;
};

const DEFAULT_FILTERS: SkillPackageFilters = {
  keyword: "",
  status: "ALL",
  scope: "ALL",
};

const STATUS_OPTIONS: SkillPackageRecord["status"][] = ["DRAFT", "ACTIVE", "DISABLED", "ARCHIVED"];
const SCOPE_OPTIONS: SkillPackageRecord["scope"][] = ["PLATFORM", "BRAND", "USER"];

export function SkillPackagesPanel(props: SkillPackagesPanelProps) {
  const [packages, setPackages] = useState<SkillPackageRecord[]>(skillPackageSeed);
  const [filters, setFilters] = useState<SkillPackageFilters>(DEFAULT_FILTERS);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<SkillPackageDraft>(buildCreateDraft());
  const [createDraft, setCreateDraft] = useState<SkillPackageDraft>(buildCreateDraft());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyPackageId, setBusyPackageId] = useState("");
  const [packageSkills, setPackageSkills] = useState<SkillPackageSkillRecord[]>([]);
  const [isLoadingPackageSkills, setIsLoadingPackageSkills] = useState(false);
  const [isInstallingSkill, setIsInstallingSkill] = useState(false);
  const [busyRelationId, setBusyRelationId] = useState("");
  const [assemblyDraft, setAssemblyDraft] = useState<SkillAssemblyDraft>(buildSkillAssemblyDraft());

  const visiblePackages = useMemo(() => packages.filter((item) => matchesFilters(item, filters)), [filters, packages]);
  const selectedPackage = useMemo(
    () => visiblePackages.find((item) => item.id === selectedPackageId) || packages.find((item) => item.id === selectedPackageId) || null,
    [packages, selectedPackageId, visiblePackages],
  );

  useEffect(() => {
    void loadPackages();
  }, [props.dataSource]);

  useEffect(() => {
    if (!selectedPackageId) {
      setSelectedDraft(buildCreateDraft());
      setPackageSkills([]);
      setAssemblyDraft(buildSkillAssemblyDraft());
      return;
    }
    if (!selectedPackage) {
      setSelectedPackageId("");
      setSelectedDraft(buildCreateDraft());
      setPackageSkills([]);
      setAssemblyDraft(buildSkillAssemblyDraft());
      return;
    }
    setSelectedDraft(buildDraftFromRecord(selectedPackage));
  }, [selectedPackage, selectedPackageId]);

  useEffect(() => {
    void loadPackageSkills();
  }, [props.dataSource, selectedPackage?.id, selectedPackage?.packageKey]);

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

  async function loadPackages() {
    if (props.dataSource === "seed") {
      setPackages(skillPackageSeed);
      return;
    }
    setIsLoading(true);
    try {
      const next = await getSkillPackages();
      setPackages(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取能力包失败";
      props.onError(`读取能力包失败：${message}`);
      setPackages(skillPackageSeed);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApplyFilters() {
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      props.onNotice(`已按当前条件筛选能力包，当前 ${visiblePackages.length} 个。`);
      return;
    }
    setIsApplyingFilters(true);
    try {
      const next = await getSkillPackages({
        keyword: filters.keyword.trim() || undefined,
        status: filters.status,
        scope: filters.scope,
      });
      setPackages(next);
      props.onNotice(`能力包列表已刷新，共 ${next.length} 个。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "能力包筛选失败";
      props.onError(`能力包筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  async function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      setPackages(skillPackageSeed);
      props.onNotice(`已重置筛选条件，共 ${skillPackageSeed.length} 个演示能力包。`);
      return;
    }
    setIsApplyingFilters(true);
    try {
      const next = await getSkillPackages();
      setPackages(next);
      props.onNotice(`已重置筛选条件，共 ${next.length} 个能力包。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "重置能力包筛选失败";
      props.onError(`重置能力包筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
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

  async function handleCreatePackage() {
    setIsCreating(true);
    props.onNotice("");
    props.onError("");
    try {
      const payload = toPayload(createDraft);
      if (props.dataSource === "seed") {
        const created: SkillPackageRecord = {
          ...payload,
          id: `sp_local_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setPackages((current) => [created, ...current]);
        setSelectedPackageId(created.id);
        setIsCreateModalOpen(false);
        props.onNotice(`演示能力包已创建：${created.packageName}`);
        return;
      }
      const created = await createSkillPackage(payload);
      setPackages((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedPackageId(created.id);
      setIsCreateModalOpen(false);
      props.onNotice(`能力包已创建：${created.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建能力包失败";
      props.onError(`创建能力包失败：${message}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSavePackage() {
    if (!selectedPackage) {
      return;
    }
    setIsSaving(true);
    props.onNotice("");
    props.onError("");
    try {
      const payload = toPayload(selectedDraft);
      if (props.dataSource === "seed") {
        const updated: SkillPackageRecord = {
          ...selectedPackage,
          ...payload,
          updatedAt: new Date().toISOString(),
        };
        setPackages((current) => current.map((item) => (item.id === selectedPackage.id ? updated : item)));
        props.onNotice(`演示能力包已更新：${updated.packageName}`);
        return;
      }
      const updated = await updateSkillPackage(selectedPackage.id, payload);
      setPackages((current) => current.map((item) => (item.id === selectedPackage.id ? updated : item)));
      props.onNotice(`能力包已更新：${updated.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新能力包失败";
      props.onError(`更新能力包失败：${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePackage(packageId: string) {
    const target = packages.find((item) => item.id === packageId);
    if (!target || !window.confirm(`确认删除能力包「${target.packageName}」吗？`)) {
      return;
    }
    setBusyPackageId(packageId);
    props.onNotice("");
    props.onError("");
    try {
      if (props.dataSource === "seed") {
        setPackages((current) => current.filter((item) => item.id !== packageId));
        if (selectedPackageId === packageId) {
          setSelectedPackageId("");
        }
        props.onNotice(`演示能力包已删除：${target.packageName}`);
        return;
      }
      const deleted = await deleteSkillPackage(packageId);
      setPackages((current) => current.filter((item) => item.id !== packageId));
      if (selectedPackageId === packageId) {
        setSelectedPackageId("");
      }
      props.onNotice(`能力包已删除：${deleted.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除能力包失败";
      props.onError(`删除能力包失败：${message}`);
    } finally {
      setBusyPackageId("");
    }
  }

  async function loadPackageSkills() {
    if (!selectedPackage) {
      setPackageSkills([]);
      setAssemblyDraft(buildSkillAssemblyDraft());
      return;
    }
    if (props.dataSource === "seed") {
      const next = sortPackageSkills(skillPackageSkillSeed.filter((item) => item.packageKey === selectedPackage.packageKey));
      setPackageSkills(next);
      setAssemblyDraft(buildSkillAssemblyDraft(next.length));
      return;
    }
    setIsLoadingPackageSkills(true);
    try {
      const next = sortPackageSkills(await getSkillPackageSkillsByPackage(selectedPackage.packageKey));
      setPackageSkills(next);
      setAssemblyDraft(buildSkillAssemblyDraft(next.length));
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取能力包技能失败";
      props.onError(`读取能力包技能失败：${message}`);
      setPackageSkills([]);
      setAssemblyDraft(buildSkillAssemblyDraft());
    } finally {
      setIsLoadingPackageSkills(false);
    }
  }

  async function handleInstallSkill() {
    if (!selectedPackage || !assemblyDraft.skillId) {
      props.onError("请先选择要安装的技能。");
      return;
    }
    const selectedSkill = props.skills.find((item) => item.id === assemblyDraft.skillId);
    if (!selectedSkill) {
      props.onError("当前选择的技能不存在，请刷新后重试。");
      return;
    }
    setIsInstallingSkill(true);
    props.onNotice("");
    props.onError("");
    try {
      const payload = {
        packageId: selectedPackage.id,
        packageKey: selectedPackage.packageKey,
        packageName: selectedPackage.packageName,
        skillId: selectedSkill.id,
        skillSlug: selectedSkill.slug,
        bindingType: assemblyDraft.bindingType,
        isDefault: assemblyDraft.isDefault,
        sortOrder: Number(assemblyDraft.sortOrder || (packageSkills.length + 1) * 10),
        enabled: assemblyDraft.enabled,
        remarks: assemblyDraft.remarks.trim() || undefined,
      } satisfies Omit<
        SkillPackageSkillRecord,
        | "id"
        | "skillName"
        | "skillCategory"
        | "skillStatus"
        | "skillProvider"
        | "skillDefaultModel"
        | "createdAt"
        | "updatedAt"
      >;

      const created =
        props.dataSource === "seed"
          ? buildLocalPackageSkillRelation(payload, selectedSkill)
          : await createSkillPackageSkill(payload);
      let nextRelations = sortPackageSkills([...packageSkills, created]);
      if (created.isDefault) {
        nextRelations = await applyDefaultSkillRelation(nextRelations, created.id);
      } else {
        setPackageSkills(nextRelations);
      }
      setAssemblyDraft(buildSkillAssemblyDraft(nextRelations.length));
      props.onNotice(`技能已安装到能力包：${selectedSkill.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "安装技能失败";
      props.onError(`安装技能失败：${message}`);
    } finally {
      setIsInstallingSkill(false);
    }
  }

  async function handleSetDefaultRelation(relationId: string) {
    props.onNotice("");
    props.onError("");
    try {
      const next = await applyDefaultSkillRelation(packageSkills, relationId);
      setPackageSkills(next);
      props.onNotice("默认技能已更新。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "设置默认技能失败";
      props.onError(`设置默认技能失败：${message}`);
    }
  }

  async function handleToggleRelationEnabled(relation: SkillPackageSkillRecord, enabled: boolean) {
    setBusyRelationId(relation.id);
    props.onNotice("");
    props.onError("");
    try {
      const updated =
        props.dataSource === "seed"
          ? {
              ...relation,
              enabled,
              isDefault: enabled ? relation.isDefault : false,
              updatedAt: new Date().toISOString(),
            }
          : await updateSkillPackageSkill(relation.id, {
              enabled,
              isDefault: enabled ? relation.isDefault : false,
            });
      const next = sortPackageSkills(packageSkills.map((item) => (item.id === relation.id ? updated : item)));
      setPackageSkills(next);
      props.onNotice(enabled ? `技能已启用：${relation.skillName || relation.skillSlug}` : `技能已停用：${relation.skillName || relation.skillSlug}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新技能状态失败";
      props.onError(`更新技能状态失败：${message}`);
    } finally {
      setBusyRelationId("");
    }
  }

  async function handleRemoveRelation(relation: SkillPackageSkillRecord) {
    if (!window.confirm(`确认从能力包中卸载技能「${relation.skillName || relation.skillSlug}」吗？`)) {
      return;
    }
    setBusyRelationId(relation.id);
    props.onNotice("");
    props.onError("");
    try {
      if (props.dataSource === "seed") {
        const next = sortPackageSkills(packageSkills.filter((item) => item.id !== relation.id));
        setPackageSkills(next);
        setAssemblyDraft(buildSkillAssemblyDraft(next.length));
      } else {
        await deleteSkillPackageSkill(relation.id);
        const next = sortPackageSkills(packageSkills.filter((item) => item.id !== relation.id));
        setPackageSkills(next);
        setAssemblyDraft(buildSkillAssemblyDraft(next.length));
      }
      props.onNotice(`技能已从能力包卸载：${relation.skillName || relation.skillSlug}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "卸载技能失败";
      props.onError(`卸载技能失败：${message}`);
    } finally {
      setBusyRelationId("");
    }
  }

  async function applyDefaultSkillRelation(relations: SkillPackageSkillRecord[], relationId: string) {
    const target = relations.find((item) => item.id === relationId);
    if (!target) {
      return relations;
    }
    const updatedRelations = await Promise.all(
      relations.map(async (item) => {
        const shouldDefault = item.id === relationId;
        const nextPatch: Partial<
          Omit<
            SkillPackageSkillRecord,
            | "id"
            | "skillName"
            | "skillCategory"
            | "skillStatus"
            | "skillProvider"
            | "skillDefaultModel"
            | "createdAt"
            | "updatedAt"
          >
        > = {};
        if (shouldDefault) {
          if (!item.enabled) {
            nextPatch.enabled = true;
          }
          if (!item.isDefault) {
            nextPatch.isDefault = true;
          }
          if (item.bindingType !== "DEFAULT") {
            nextPatch.bindingType = "DEFAULT";
          }
        } else {
          if (item.isDefault) {
            nextPatch.isDefault = false;
          }
          if (item.bindingType === "DEFAULT") {
            nextPatch.bindingType = "OPTIONAL";
          }
        }
        if (!Object.keys(nextPatch).length) {
          return item;
        }
        if (props.dataSource === "seed") {
          return {
            ...item,
            ...nextPatch,
            updatedAt: new Date().toISOString(),
          };
        }
        return updateSkillPackageSkill(item.id, nextPatch);
      }),
    );
    const next = sortPackageSkills(updatedRelations);
    setPackageSkills(next);
    return next;
  }

  const installedSkillIds = useMemo(() => new Set(packageSkills.map((item) => item.skillId)), [packageSkills]);
  const installableSkills = useMemo(
    () =>
      props.skills
        .filter((item) => !installedSkillIds.has(item.id))
        .slice()
        .sort((left, right) => String(left.name).localeCompare(String(right.name), "zh-CN")),
    [installedSkillIds, props.skills],
  );
  const activeDefaultSkill = useMemo(
    () => packageSkills.find((item) => item.enabled && item.isDefault) || packageSkills.find((item) => item.isDefault) || null,
    [packageSkills],
  );

  return (
    <div className="admin-user-management" style={{ marginTop: 24 }}>
      <section className="entity-card admin-user-filter-card">
        <div className="admin-user-filter-head">
          <div>
            <span className="archive-pill status-ready">能力包装配</span>
            <h3>能力包页</h3>
            <p>统一维护能力包主体信息，向上给模块安装，向下装配技能，技能仍在顶部技能中心维护。</p>
          </div>
          <div className="admin-user-filter-summary">
            <div>
              <span>当前结果</span>
              <strong>{visiblePackages.length}</strong>
            </div>
            <div>
              <span>启用中</span>
              <strong>{visiblePackages.filter((item) => item.status === "ACTIVE").length}</strong>
            </div>
            <div>
              <span>平台级</span>
              <strong>{visiblePackages.filter((item) => item.scope === "PLATFORM").length}</strong>
            </div>
          </div>
        </div>

        <div className="admin-user-filter-grid">
          <label>
            <span>关键词</span>
            <input
              value={filters.keyword}
              placeholder="packageKey / packageName / description"
              onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            />
          </label>
          <label>
            <span>状态</span>
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as SkillPackageFilters["status"] }))}>
              <option value="ALL">全部</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>作用域</span>
            <select value={filters.scope} onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value as SkillPackageFilters["scope"] }))}>
              <option value="ALL">全部</option>
              {SCOPE_OPTIONS.map((item) => (
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
          <button type="button" className="primary-button" onClick={handleOpenCreateModal}>
            新增能力包
          </button>
        </div>
      </section>

      <section className="admin-user-layout">
        <article className="entity-card admin-user-list-card">
          <div className="entity-card-head">
            <div>
              <strong>能力包列表</strong>
              <p className="personal-meta">{isLoading ? "正在加载能力包..." : "按主对象方式统一管理 packageKey、状态、作用域和默认绑定策略。"} </p>
            </div>
          </div>

          <div className="admin-user-table-wrapper">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>能力包</th>
                  <th>状态</th>
                  <th>作用域</th>
                  <th>模块数</th>
                  <th>知识空间</th>
                  <th>排序</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {visiblePackages.length ? (
                  visiblePackages.map((item) => (
                    <tr key={item.id} className={selectedPackageId === item.id ? "is-active" : ""}>
                      <td>
                        <button type="button" className="admin-user-row-button" onClick={() => setSelectedPackageId(item.id)}>
                          <span className="admin-user-row-title">{item.packageName}</span>
                          <span className="admin-user-row-meta">{item.packageKey}</span>
                        </button>
                      </td>
                      <td>{item.status}</td>
                      <td>{item.scope}</td>
                      <td>{item.moduleKeys.length}</td>
                      <td>{item.defaultKnowledgeSpaceIds.length}</td>
                      <td>{item.sortOrder}</td>
                      <td>{formatDateTime(item.updatedAt)}</td>
                      <td>
                        <div className="personal-actions" style={{ justifyContent: "flex-start" }}>
                          <button type="button" className="secondary-button" onClick={() => setSelectedPackageId(item.id)}>
                            编辑
                          </button>
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => void handleDeletePackage(item.id)}
                            disabled={busyPackageId === item.id}
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
                      当前没有符合条件的能力包。
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
              <strong>能力包编辑</strong>
              <p className="personal-meta">{selectedPackage ? `当前编辑：${selectedPackage.packageName}` : "从左侧列表中选择能力包后再编辑。"} </p>
            </div>
            <div className="personal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedDraft(selectedPackage ? buildDraftFromRecord(selectedPackage) : buildCreateDraft())}
                disabled={!selectedPackage || isSaving}
              >
                重置
              </button>
              <button type="button" className="primary-button" onClick={() => void handleSavePackage()} disabled={!selectedPackage || isSaving}>
                {isSaving ? "保存中..." : "保存能力包"}
              </button>
            </div>
          </div>

          {selectedPackage ? (
            <div style={{ display: "grid", gap: 16 }}>
              <SkillPackageDraftForm draft={selectedDraft} modules={props.modules} onChange={setSelectedDraft} />

              <section className="entity-card" style={{ padding: 16 }}>
                <div className="entity-card-head">
                  <div>
                    <strong>技能装配区</strong>
                    <p className="personal-meta">技能页结构保持不变，这里只做技能的安装、默认项设置、启停和卸载。</p>
                  </div>
                  <div className="personal-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", minWidth: 280 }}>
                    <div>
                      <span className="personal-meta">已装技能</span>
                      <strong>{packageSkills.length}</strong>
                    </div>
                    <div>
                      <span className="personal-meta">默认技能</span>
                      <strong>{activeDefaultSkill?.skillName || "-"}</strong>
                    </div>
                    <div>
                      <span className="personal-meta">可安装技能</span>
                      <strong>{installableSkills.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="admin-rule-grid" style={{ marginBottom: 16 }}>
                  <PackageFormField label="从技能库安装" badge="复制后安装" hint="技能是最小安装单元；这里只负责安装到当前能力包。">
                    <select
                      value={assemblyDraft.skillId}
                      onChange={(event) => setAssemblyDraft((current) => ({ ...current, skillId: event.target.value }))}
                    >
                      <option value="">请选择技能</option>
                      {installableSkills.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.category} · {item.status}
                        </option>
                      ))}
                    </select>
                  </PackageFormField>
                  <PackageFormField label="安装类型" badge="系统可选" hint="默认技能通常用 DEFAULT，补充技能用 OPTIONAL。">
                    <select
                      value={assemblyDraft.bindingType}
                      onChange={(event) =>
                        setAssemblyDraft((current) => ({ ...current, bindingType: event.target.value as SkillPackageSkillRecord["bindingType"] }))
                      }
                    >
                      <option value="DEFAULT">DEFAULT</option>
                      <option value="OPTIONAL">OPTIONAL</option>
                      <option value="SYSTEM_REQUIRED">SYSTEM_REQUIRED</option>
                      <option value="EXPERIMENTAL">EXPERIMENTAL</option>
                    </select>
                  </PackageFormField>
                  <PackageFormField label="排序" badge="推荐" hint="默认每 10 递增，后续可继续调序。">
                    <input
                      value={assemblyDraft.sortOrder}
                      onChange={(event) => setAssemblyDraft((current) => ({ ...current, sortOrder: event.target.value }))}
                    />
                  </PackageFormField>
                  <PackageFormField label="备注" badge="可选" hint="记录这次安装的用途或上下游说明。" wide>
                    <input
                      value={assemblyDraft.remarks}
                      onChange={(event) => setAssemblyDraft((current) => ({ ...current, remarks: event.target.value }))}
                    />
                  </PackageFormField>
                </div>

                <div className="personal-actions" style={{ marginBottom: 16 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={assemblyDraft.isDefault}
                      onChange={(event) => setAssemblyDraft((current) => ({ ...current, isDefault: event.target.checked }))}
                    />
                    <span>安装后设为默认技能</span>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={assemblyDraft.enabled}
                      onChange={(event) => setAssemblyDraft((current) => ({ ...current, enabled: event.target.checked }))}
                    />
                    <span>安装后立即启用</span>
                  </label>
                  <button type="button" className="primary-button" onClick={() => void handleInstallSkill()} disabled={isInstallingSkill || !assemblyDraft.skillId}>
                    {isInstallingSkill ? "安装中..." : "安装技能到能力包"}
                  </button>
                </div>

                <div className="admin-user-table-wrapper">
                  <table className="admin-user-table">
                    <thead>
                      <tr>
                        <th>技能</th>
                        <th>类型</th>
                        <th>默认</th>
                        <th>状态</th>
                        <th>排序</th>
                        <th>模型</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPackage && isLoadingPackageSkills ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "24px 12px", color: "var(--muted)" }}>
                            正在加载已装技能...
                          </td>
                        </tr>
                      ) : packageSkills.length ? (
                        packageSkills.map((relation) => (
                          <tr key={relation.id}>
                            <td>
                              <span className="admin-user-row-title">{relation.skillName || relation.skillSlug}</span>
                              <span className="admin-user-row-meta">{relation.skillCategory || relation.skillId}</span>
                            </td>
                            <td>{relation.bindingType}</td>
                            <td>{relation.isDefault ? "是" : "否"}</td>
                            <td>{relation.enabled ? "启用中" : "已停用"}</td>
                            <td>{relation.sortOrder}</td>
                            <td>{relation.skillDefaultModel || "-"}</td>
                            <td>
                              <div className="personal-actions" style={{ justifyContent: "flex-start" }}>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleSetDefaultRelation(relation.id)}
                                  disabled={busyRelationId === relation.id || (relation.isDefault && relation.bindingType === "DEFAULT" && relation.enabled)}
                                >
                                  设为默认
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => void handleToggleRelationEnabled(relation, !relation.enabled)}
                                  disabled={busyRelationId === relation.id}
                                >
                                  {relation.enabled ? "停用" : "启用"}
                                </button>
                                <button
                                  type="button"
                                  className="danger-button"
                                  onClick={() => void handleRemoveRelation(relation)}
                                  disabled={busyRelationId === relation.id}
                                >
                                  卸载
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", padding: "24px 12px", color: "var(--muted)" }}>
                            当前能力包还没有安装技能，请先从技能库安装。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : (
            <div className="personal-meta" style={{ paddingTop: 12 }}>
              请选择一条能力包记录进行编辑。
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
            aria-label="新建能力包"
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(1120px, calc(100vw - 40px))", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}
          >
            <div className="admin-user-modal-topbar">
              <div>
                <span className="archive-pill status-ready">能力包创建</span>
                <strong>新增 SkillPackage</strong>
                <p className="personal-meta">先录入能力包主体，再逐步给模块安装能力包、给能力包装配技能，并维护默认知识与 Provider。</p>
              </div>
              <button type="button" className="secondary-button" onClick={handleCloseCreateModal} disabled={isCreating}>
                关闭
              </button>
            </div>
            <SkillPackageDraftForm draft={createDraft} modules={props.modules} onChange={setCreateDraft} />
            <div className="personal-actions">
              <button type="button" className="secondary-button" onClick={handleCloseCreateModal} disabled={isCreating}>
                取消
              </button>
              <button type="button" className="primary-button" onClick={() => void handleCreatePackage()} disabled={isCreating}>
                {isCreating ? "创建中..." : "确认创建"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SkillPackageDraftForm(props: {
  draft: SkillPackageDraft;
  modules: ModuleDefinitionRecord[];
  onChange: Dispatch<SetStateAction<SkillPackageDraft>>;
}) {
  const selectedModuleKeys = useMemo(() => splitList(props.draft.moduleKeys), [props.draft.moduleKeys]);
  const moduleOptions = useMemo(
    () =>
      props.modules
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          value: item.moduleKey,
          title: item.moduleName,
          description: `${item.moduleKey} · ${item.moduleType} · ${item.entryRoute}`,
        })),
    [props.modules],
  );

  function updateModuleSelection(moduleKey: string, checked: boolean) {
    props.onChange((current) => {
      const nextValues = new Set(splitList(current.moduleKeys));
      if (checked) {
        nextValues.add(moduleKey);
      } else {
        nextValues.delete(moduleKey);
      }
      return {
        ...current,
        moduleKeys: Array.from(nextValues).join(", "),
      };
    });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="entity-card" style={{ padding: 12 }}>
        <strong>填写规则</strong>
        <p className="personal-meta">先确定能力包主体，再维护模块归属、技能装配和默认资源。治理逻辑逐步内化，普通用户只处理业务装配内容。</p>
      </div>

      <PackageFormSection title="基础信息" description="先把能力包主键、展示名、状态和作用域收口，这是后续所有关系的主对象。">
        <div className="admin-rule-grid">
          <PackageFormField label="能力包名称" badge="必填" hint="中文展示名，后续会出现在关系面板和技能中心。">
            <input value={props.draft.packageName} onChange={(event) => props.onChange((current) => ({ ...current, packageName: event.target.value }))} />
          </PackageFormField>
          <PackageFormField label="能力包标识" badge="必填" hint="建议英文短横线命名，作为 packageKey 真源。">
            <input value={props.draft.packageKey} onChange={(event) => props.onChange((current) => ({ ...current, packageKey: event.target.value }))} />
          </PackageFormField>
          <PackageFormField label="状态" badge="系统可选" hint="当前直接从固定状态枚举中选择。">
            <select value={props.draft.status} onChange={(event) => props.onChange((current) => ({ ...current, status: event.target.value as SkillPackageRecord["status"] }))}>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </PackageFormField>
          <PackageFormField label="作用域" badge="系统可选" hint="决定能力包更偏平台级、品牌级还是用户级。">
            <select value={props.draft.scope} onChange={(event) => props.onChange((current) => ({ ...current, scope: event.target.value as SkillPackageRecord["scope"] }))}>
              {SCOPE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </PackageFormField>
          <PackageFormField label="排序" badge="推荐" hint="用于列表与推荐顺序，默认 100 即可。">
            <input value={props.draft.sortOrder} onChange={(event) => props.onChange((current) => ({ ...current, sortOrder: event.target.value }))} />
          </PackageFormField>
          <PackageFormField label="当前版本 ID" badge="可选" hint="如果版本中心还没真源化，可以先留空。">
            <input value={props.draft.currentVersionId} onChange={(event) => props.onChange((current) => ({ ...current, currentVersionId: event.target.value }))} />
          </PackageFormField>
          <PackageFormField label="说明" badge="推荐" hint="用一句话讲清能力包解决什么问题。" wide>
            <textarea value={props.draft.description} onChange={(event) => props.onChange((current) => ({ ...current, description: event.target.value }))} />
          </PackageFormField>
        </div>
      </PackageFormSection>

      <PackageFormSection title="系统同步" description="这些字段已经能从当前系统主数据里带出或优先复用，先选再补充。">
        <div style={{ display: "grid", gap: 12 }}>
          <PackageFormField label="所属模块" badge="系统同步" hint="优先从模块注册中心勾选真实模块；文本框仅用于兼容历史值。" wide>
            <div style={{ display: "grid", gap: 10 }}>
              <PackageMultiSelectCard
                options={moduleOptions}
                selectedValues={selectedModuleKeys}
                emptyText="当前还没有可复用模块，请先在模块注册中心建立模块。"
                onToggle={updateModuleSelection}
              />
              <input
                value={props.draft.moduleKeys}
                placeholder={`例如：${props.modules.map((item) => item.moduleKey).slice(0, 3).join(", ")}`}
                onChange={(event) => props.onChange((current) => ({ ...current, moduleKeys: event.target.value }))}
              />
            </div>
          </PackageFormField>
          <div className="admin-rule-grid">
            <PackageFormField label="默认知识空间" badge="后续同步" hint="目前先兼容文本，下一步建议接知识关系真源。">
              <input
                value={props.draft.defaultKnowledgeSpaceIds}
                onChange={(event) => props.onChange((current) => ({ ...current, defaultKnowledgeSpaceIds: event.target.value }))}
              />
            </PackageFormField>
            <PackageFormField label="默认 Provider 策略" badge="后续同步" hint="当前仍是兼容字段，后续建议与 Provider Policy 真源联动。">
              <input
                value={props.draft.defaultProviderPolicyIds}
                onChange={(event) => props.onChange((current) => ({ ...current, defaultProviderPolicyIds: event.target.value }))}
              />
            </PackageFormField>
          </div>
        </div>
      </PackageFormSection>

      <PackageFormSection title="编排与扩展" description="工作流步骤、标签和补充说明属于治理增强字段，不影响 first pass 建档。">
        <div className="admin-rule-grid">
          <PackageFormField label="工作流步骤" badge="推荐" hint="按逗号或换行填写，用于编排和排序提示。">
            <input value={props.draft.workflowStepKeys} onChange={(event) => props.onChange((current) => ({ ...current, workflowStepKeys: event.target.value }))} />
          </PackageFormField>
          <PackageFormField label="标签" badge="可选" hint="用于后续筛选和检索，可多值。">
            <input value={props.draft.tags} onChange={(event) => props.onChange((current) => ({ ...current, tags: event.target.value }))} />
          </PackageFormField>
          <PackageFormField label="备注" badge="可选" hint="只写额外限制、上下游依赖或交接说明。" wide>
            <textarea value={props.draft.remarks} onChange={(event) => props.onChange((current) => ({ ...current, remarks: event.target.value }))} />
          </PackageFormField>
        </div>
      </PackageFormSection>
    </div>
  );
}

function PackageFormSection(props: { title: string; description: string; children: ReactNode }) {
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

function PackageFormField(props: { label: string; badge: string; hint: string; wide?: boolean; children: ReactNode }) {
  return (
    <label style={props.wide ? { gridColumn: "1 / -1", display: "grid", gap: 6 } : { display: "grid", gap: 6 }}>
      <span>{props.label}</span>
      <small className="personal-meta">{`${props.badge} · ${props.hint}`}</small>
      {props.children}
    </label>
  );
}

function PackageMultiSelectCard(props: {
  options: Array<{ value: string; title: string; description: string }>;
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
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="entity-card" style={{ padding: 12 }}>
        <strong>已选模块 {props.selectedValues.length} 个</strong>
        <p className="personal-meta">
          {props.selectedValues.length ? props.selectedValues.join(" / ") : "当前未选择，保存时会按手工补充值或空值处理。"}
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

function buildCreateDraft(): SkillPackageDraft {
  return {
    packageKey: "",
    packageName: "",
    description: "",
    status: "DRAFT",
    scope: "PLATFORM",
    moduleKeys: "",
    workflowStepKeys: "",
    tags: "",
    currentVersionId: "",
    defaultKnowledgeSpaceIds: "",
    defaultProviderPolicyIds: "",
    sortOrder: "100",
    remarks: "",
  };
}

function buildSkillAssemblyDraft(installedCount = 0): SkillAssemblyDraft {
  return {
    skillId: "",
    bindingType: "OPTIONAL",
    isDefault: installedCount === 0,
    sortOrder: String((installedCount + 1) * 10),
    enabled: true,
    remarks: "",
  };
}

function buildDraftFromRecord(record: SkillPackageRecord): SkillPackageDraft {
  return {
    packageKey: record.packageKey,
    packageName: record.packageName,
    description: record.description || "",
    status: record.status,
    scope: record.scope,
    moduleKeys: record.moduleKeys.join(", "),
    workflowStepKeys: record.workflowStepKeys.join(", "),
    tags: record.tags.join(", "),
    currentVersionId: record.currentVersionId || "",
    defaultKnowledgeSpaceIds: record.defaultKnowledgeSpaceIds.join(", "),
    defaultProviderPolicyIds: record.defaultProviderPolicyIds.join(", "),
    sortOrder: String(record.sortOrder),
    remarks: record.remarks || "",
  };
}

function toPayload(draft: SkillPackageDraft): Omit<SkillPackageRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    packageKey: draft.packageKey.trim().toLowerCase(),
    packageName: draft.packageName.trim(),
    description: draft.description.trim() || undefined,
    status: draft.status,
    scope: draft.scope,
    moduleKeys: splitList(draft.moduleKeys),
    workflowStepKeys: splitList(draft.workflowStepKeys),
    tags: splitList(draft.tags),
    currentVersionId: draft.currentVersionId.trim() || undefined,
    defaultKnowledgeSpaceIds: splitList(draft.defaultKnowledgeSpaceIds),
    defaultProviderPolicyIds: splitList(draft.defaultProviderPolicyIds),
    sortOrder: Number(draft.sortOrder || 100),
    remarks: draft.remarks.trim() || undefined,
  };
}

function splitList(value: string) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sortPackageSkills(relations: SkillPackageSkillRecord[]) {
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
      return String(left.skillName || left.skillSlug).localeCompare(String(right.skillName || right.skillSlug), "zh-CN");
    });
}

function buildLocalPackageSkillRelation(
  payload: Omit<
    SkillPackageSkillRecord,
    | "id"
    | "skillName"
    | "skillCategory"
    | "skillStatus"
    | "skillProvider"
    | "skillDefaultModel"
    | "createdAt"
    | "updatedAt"
  >,
  skill: SkillConfigRecord,
): SkillPackageSkillRecord {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: `sps_local_${Date.now()}_${skill.id}`,
    skillName: skill.name,
    skillCategory: skill.category,
    skillStatus: skill.status,
    skillProvider: skill.provider,
    skillDefaultModel: skill.defaultModel,
    createdAt: now,
    updatedAt: now,
  };
}

function matchesFilters(record: SkillPackageRecord, filters: SkillPackageFilters) {
  if (filters.status !== "ALL" && record.status !== filters.status) {
    return false;
  }
  if (filters.scope !== "ALL" && record.scope !== filters.scope) {
    return false;
  }
  const keyword = filters.keyword.trim().toLowerCase();
  if (!keyword) {
    return true;
  }
  return [
    record.packageKey,
    record.packageName,
    record.description,
    record.tags.join(","),
    record.moduleKeys.join(","),
    record.defaultKnowledgeSpaceIds.join(","),
  ].some((field) => String(field || "").toLowerCase().includes(keyword));
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
