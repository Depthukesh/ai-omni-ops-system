"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  createSkillPackageSkill,
  deleteSkillPackageSkill,
  getSkillPackageSkills,
  skillPackageSkillSeed,
  updateSkillPackageSkill,
  type SkillAssetBindingRecord,
  type SkillConfigRecord,
  type SkillPackageRecord,
  type SkillPackageSkillRecord,
} from "../../../services/admin";

type SkillPackageSkillsPanelProps = {
  skills: SkillConfigRecord[];
  skillPackages: SkillPackageRecord[];
  skillAssetBindings: SkillAssetBindingRecord[];
  dataSource: "api" | "seed";
  onNotice: (message: string) => void;
  onError: (message: string) => void;
};

type SkillPackageSkillFilters = {
  skillId: "ALL" | string;
  bindingType: "ALL" | SkillPackageSkillRecord["bindingType"];
  enabled: "ALL" | "true" | "false";
  keyword: string;
};

type SkillPackageSkillDraft = {
  packageId: string;
  packageKey: string;
  packageName: string;
  skillId: string;
  bindingType: SkillPackageSkillRecord["bindingType"];
  isDefault: boolean;
  sortOrder: string;
  enabled: boolean;
  remarks: string;
};

const DEFAULT_FILTERS: SkillPackageSkillFilters = {
  skillId: "ALL",
  bindingType: "ALL",
  enabled: "ALL",
  keyword: "",
};

const BINDING_TYPE_OPTIONS: SkillPackageSkillRecord["bindingType"][] = [
  "DEFAULT",
  "OPTIONAL",
  "SYSTEM_REQUIRED",
  "EXPERIMENTAL",
];

export function SkillPackageSkillsPanel(props: SkillPackageSkillsPanelProps) {
  const [filters, setFilters] = useState<SkillPackageSkillFilters>(DEFAULT_FILTERS);
  const [relations, setRelations] = useState<SkillPackageSkillRecord[]>(skillPackageSkillSeed);
  const [selectedRelationId, setSelectedRelationId] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<SkillPackageSkillDraft>(buildCreateDraft(props.skills, props.skillPackages));
  const [createDraft, setCreateDraft] = useState<SkillPackageSkillDraft>(buildCreateDraft(props.skills, props.skillPackages));
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
    void loadRelations();
  }, [props.dataSource]);

  useEffect(() => {
    if (!selectedRelationId) {
      setSelectedDraft(buildCreateDraft(props.skills, props.skillPackages));
      return;
    }
    if (!selectedRelation) {
      setSelectedRelationId("");
      setSelectedDraft(buildCreateDraft(props.skills, props.skillPackages));
      return;
    }
    setSelectedDraft(buildDraftFromRecord(selectedRelation));
  }, [props.skillPackages, props.skills, selectedRelation, selectedRelationId]);

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
      setRelations(skillPackageSkillSeed);
      return;
    }
    setIsLoading(true);
    try {
      const next = await getSkillPackageSkills();
      setRelations(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取能力包技能关系失败";
      props.onError(`读取能力包技能关系失败：${message}`);
      setRelations(skillPackageSkillSeed);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApplyFilters() {
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      props.onNotice(`已按当前条件筛选能力包技能关系，当前 ${visibleRelations.length} 条。`);
      return;
    }

    setIsApplyingFilters(true);
    try {
      const next = await getSkillPackageSkills({
        skillSlug: filters.skillId === "ALL" ? undefined : props.skills.find((item) => item.id === filters.skillId)?.slug,
        bindingType: filters.bindingType,
        enabled: filters.enabled === "ALL" ? undefined : filters.enabled === "true",
      });
      setRelations(next);
      props.onNotice(`能力包技能关系已刷新，共 ${next.length} 条。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "能力包技能关系筛选失败";
      props.onError(`能力包技能关系筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  async function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
    props.onNotice("");
    props.onError("");
    if (props.dataSource === "seed") {
      setRelations(skillPackageSkillSeed);
      props.onNotice(`已重置筛选条件，共 ${skillPackageSkillSeed.length} 条演示关系。`);
      return;
    }
    setIsApplyingFilters(true);
    try {
      const next = await getSkillPackageSkills();
      setRelations(next);
      props.onNotice(`已重置筛选条件，共 ${next.length} 条能力包技能关系。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "重置能力包技能关系筛选失败";
      props.onError(`重置能力包技能关系筛选失败：${message}`);
    } finally {
      setIsApplyingFilters(false);
    }
  }

  function handleOpenCreateModal() {
    setCreateDraft(buildCreateDraft(props.skills, props.skillPackages));
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    if (isCreating) {
      return;
    }
    setIsCreateModalOpen(false);
    setCreateDraft(buildCreateDraft(props.skills, props.skillPackages));
  }

  async function handleCreateRelation() {
    setIsCreating(true);
    props.onNotice("");
    props.onError("");
    try {
      const payload = toPayload(createDraft, props.skills);
      if (props.dataSource === "seed") {
        const skillMeta = props.skills.find((item) => item.id === payload.skillId);
        const created: SkillPackageSkillRecord = {
          ...payload,
          id: `sps_${Date.now()}`,
          skillName: skillMeta?.name,
          skillCategory: skillMeta?.category,
          skillStatus: skillMeta?.status,
          skillProvider: skillMeta?.provider,
          skillDefaultModel: skillMeta?.defaultModel,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setRelations((current) => [created, ...current]);
        setSelectedRelationId(created.id);
        setCreateDraft(buildCreateDraft(props.skills, props.skillPackages));
        setIsCreateModalOpen(false);
        props.onNotice(`演示能力包技能关系已创建：${created.packageName} -> ${created.skillName || created.skillSlug}`);
        return;
      }
      const created = await createSkillPackageSkill(payload);
      setRelations((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedRelationId(created.id);
      setCreateDraft(buildCreateDraft(props.skills, props.skillPackages));
      setIsCreateModalOpen(false);
      props.onNotice(`能力包技能关系已创建：${created.packageName} -> ${created.skillName || created.skillSlug}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建能力包技能关系失败";
      props.onError(`创建能力包技能关系失败：${message}`);
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
      const payload = toPayload(selectedDraft, props.skills);
      if (props.dataSource === "seed") {
        const skillMeta = props.skills.find((item) => item.id === payload.skillId);
        const updated: SkillPackageSkillRecord = {
          ...selectedRelation,
          ...payload,
          skillName: skillMeta?.name,
          skillCategory: skillMeta?.category,
          skillStatus: skillMeta?.status,
          skillProvider: skillMeta?.provider,
          skillDefaultModel: skillMeta?.defaultModel,
          updatedAt: new Date().toISOString(),
        };
        setRelations((current) => current.map((item) => (item.id === selectedRelation.id ? updated : item)));
        props.onNotice(`演示能力包技能关系已更新：${updated.packageName}`);
        return;
      }
      const updated = await updateSkillPackageSkill(selectedRelation.id, payload);
      setRelations((current) => current.map((item) => (item.id === selectedRelation.id ? updated : item)));
      props.onNotice(`能力包技能关系已更新：${updated.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新能力包技能关系失败";
      props.onError(`更新能力包技能关系失败：${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRelation(relationId: string) {
    const target = relations.find((item) => item.id === relationId);
    if (!target || !window.confirm(`确认删除关系「${target.packageName} -> ${target.skillName || target.skillSlug}」吗？`)) {
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
        props.onNotice(`演示能力包技能关系已删除：${target.packageName}`);
        return;
      }
      const deleted = await deleteSkillPackageSkill(relationId);
      setRelations((current) => current.filter((item) => item.id !== relationId));
      if (selectedRelationId === relationId) {
        setSelectedRelationId("");
      }
      props.onNotice(`能力包技能关系已删除：${deleted.packageName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除能力包技能关系失败";
      props.onError(`删除能力包技能关系失败：${message}`);
    } finally {
      setBusyRelationId("");
    }
  }

  return (
    <div className="admin-user-management" style={{ marginTop: 24 }}>
      <section className="entity-card admin-user-filter-card">
        <div className="admin-user-filter-head">
          <div>
            <span className="archive-pill status-ready">能力包技能关系</span>
            <h3>能力包与技能挂载</h3>
            <p>把能力包实际承载的技能收口到正式关系表，后续技能归属、默认能力包和后台管理都以这里为准。</p>
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
            <span>技能</span>
            <select value={filters.skillId} onChange={(event) => setFilters((current) => ({ ...current, skillId: event.target.value }))}>
              <option value="ALL">全部技能</option>
              {props.skills.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>绑定类型</span>
            <select
              value={filters.bindingType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, bindingType: event.target.value as SkillPackageSkillFilters["bindingType"] }))
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
              onChange={(event) => setFilters((current) => ({ ...current, enabled: event.target.value as SkillPackageSkillFilters["enabled"] }))}
            >
              <option value="ALL">全部</option>
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </label>
          <label>
            <span>关键词</span>
            <input
              value={filters.keyword}
              placeholder="packageKey / packageName / skill"
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
          <button type="button" className="primary-button" onClick={handleOpenCreateModal} disabled={!props.skills.length}>
            新增关系
          </button>
        </div>
      </section>

      <section className="admin-user-layout">
        <article className="entity-card admin-user-list-card">
          <div className="entity-card-head">
            <div>
              <strong>关系列表</strong>
              <p className="personal-meta">{isLoading ? "正在加载能力包技能关系..." : "支持按技能、绑定类型和状态收口查看。"} </p>
            </div>
          </div>

          <div className="admin-user-table-wrapper">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>能力包</th>
                  <th>技能</th>
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
                      <td>
                        <div className="admin-user-row-title">{item.skillName || item.skillSlug}</div>
                        <div className="admin-user-row-meta">{item.skillCategory || item.skillSlug}</div>
                      </td>
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
                      当前没有符合条件的能力包技能关系。
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
                {selectedRelation ? `当前编辑：${selectedRelation.packageName} -> ${selectedRelation.skillName || selectedRelation.skillSlug}` : "从左侧列表中选择一条能力包技能关系后再编辑。"}
              </p>
            </div>
            <div className="personal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setSelectedDraft(selectedRelation ? buildDraftFromRecord(selectedRelation) : buildCreateDraft(props.skills, props.skillPackages))
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
            <SkillPackageSkillDraftForm
              draft={selectedDraft}
              skills={props.skills}
              skillPackages={props.skillPackages}
              skillAssetBindings={props.skillAssetBindings}
              onChange={setSelectedDraft}
            />
          ) : (
            <div className="personal-meta" style={{ paddingTop: 12 }}>
              请选择一条能力包技能关系进行编辑。
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
            aria-label="新建能力包技能关系"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-user-modal-topbar">
              <div>
                <span className="archive-pill status-ready">关系创建</span>
                <strong>新增能力包技能关系</strong>
                <p className="personal-meta">把技能正式挂到能力包上，后续技能中心与模块推导都优先读取这层真源。</p>
              </div>
              <button type="button" className="secondary-button" onClick={handleCloseCreateModal} disabled={isCreating}>
                关闭
              </button>
            </div>
            <SkillPackageSkillDraftForm
              draft={createDraft}
              skills={props.skills}
              skillPackages={props.skillPackages}
              skillAssetBindings={props.skillAssetBindings}
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

function SkillPackageSkillDraftForm(props: {
  draft: SkillPackageSkillDraft;
  skills: SkillConfigRecord[];
  skillPackages: SkillPackageRecord[];
  skillAssetBindings: SkillAssetBindingRecord[];
  onChange: Dispatch<SetStateAction<SkillPackageSkillDraft>>;
}) {
  const selectedSkill = props.skills.find((item) => item.id === props.draft.skillId) || null;
  const recommendedPackageKeys = useMemo(() => {
    if (!selectedSkill) {
      return [];
    }
    return Array.from(
      new Set(
        props.skillAssetBindings
          .filter((item) => item.skillId === selectedSkill.id || item.skillSlug === selectedSkill.slug)
          .flatMap((item) => item.packageKeys),
      ),
    );
  }, [props.skillAssetBindings, selectedSkill]);
  const recommendedPackages = useMemo(
    () =>
      props.skillPackages
        .filter((item) => recommendedPackageKeys.includes(item.packageKey))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [props.skillPackages, recommendedPackageKeys],
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
        <strong>当前技能推荐能力包 {recommendedPackages.length} 个</strong>
        <p className="personal-meta">
          {recommendedPackages.length
            ? recommendedPackages.map((item) => item.packageName).join(" / ")
            : "当前技能还没有命中已登记的推荐能力包，可继续手工选择或录入历史值。"}
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
        <span>所属技能</span>
        <select value={props.draft.skillId} onChange={(event) => props.onChange((current) => ({ ...current, skillId: event.target.value }))}>
          {props.skills.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>绑定类型</span>
        <select
          value={props.draft.bindingType}
          onChange={(event) =>
            props.onChange((current) => ({ ...current, bindingType: event.target.value as SkillPackageSkillRecord["bindingType"] }))
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

function buildCreateDraft(skills: SkillConfigRecord[], skillPackages: SkillPackageRecord[]): SkillPackageSkillDraft {
  const firstPackage = skillPackages[0];
  return {
    packageId: firstPackage?.id || "",
    packageKey: firstPackage?.packageKey || "",
    packageName: firstPackage?.packageName || "",
    skillId: skills[0]?.id || "",
    bindingType: "DEFAULT",
    isDefault: true,
    sortOrder: "100",
    enabled: true,
    remarks: "",
  };
}

function buildDraftFromRecord(record: SkillPackageSkillRecord): SkillPackageSkillDraft {
  return {
    packageId: record.packageId,
    packageKey: record.packageKey,
    packageName: record.packageName,
    skillId: record.skillId,
    bindingType: record.bindingType,
    isDefault: record.isDefault,
    sortOrder: String(record.sortOrder),
    enabled: record.enabled,
    remarks: record.remarks || "",
  };
}

function toPayload(
  draft: SkillPackageSkillDraft,
  skills: SkillConfigRecord[],
): Omit<
  SkillPackageSkillRecord,
  | "id"
  | "skillName"
  | "skillCategory"
  | "skillStatus"
  | "skillProvider"
  | "skillDefaultModel"
  | "createdAt"
  | "updatedAt"
> {
  const skill = skills.find((item) => item.id === draft.skillId);
  return {
    packageId: draft.packageId.trim(),
    packageKey: draft.packageKey.trim(),
    packageName: draft.packageName.trim(),
    skillId: draft.skillId,
    skillSlug: skill?.slug || "",
    bindingType: draft.bindingType,
    isDefault: draft.isDefault,
    sortOrder: Number(draft.sortOrder || 100),
    enabled: draft.enabled,
    remarks: draft.remarks.trim() || undefined,
  };
}

function matchesFilters(record: SkillPackageSkillRecord, filters: SkillPackageSkillFilters) {
  if (filters.skillId !== "ALL" && record.skillId !== filters.skillId) {
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
  return [record.packageKey, record.packageName, record.skillName, record.skillSlug, record.skillCategory].some((field) =>
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
