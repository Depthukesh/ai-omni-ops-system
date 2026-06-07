"use client";

import { useEffect, useMemo, useState } from "react";
import {
  activateSkillPackageVersion,
  createSkillPackageVersion,
  getApiProviders,
  getSkillPackage,
  type ApiProviderRecord,
  type ModuleDefinitionRecord,
  type PromptTemplateRecord,
  type SkillPackageDetailRecord,
  type SkillPackageRecord,
  updateSkillPackageBasic,
  updateSkillPackageProvider,
  updateSkillPackagePrompt,
} from "../../../services/admin";

type SkillPackageOverviewPanelProps = {
  packages: SkillPackageRecord[];
  modules: ModuleDefinitionRecord[];
};

type OverviewFilters = {
  keyword: string;
  moduleKey: "ALL" | string;
  status: "ALL" | SkillPackageRecord["status"];
  scope: "ALL" | SkillPackageRecord["scope"];
};

const DEFAULT_FILTERS: OverviewFilters = {
  keyword: "",
  moduleKey: "ALL",
  status: "ALL",
  scope: "ALL",
};

type PromptDetailRecord = NonNullable<SkillPackageDetailRecord["prompts"]>[number];
type ProviderBindingRecord = NonNullable<SkillPackageDetailRecord["providerBindings"]>[number];
type PromptDraftRecord = {
  status: PromptTemplateRecord["status"];
  modelName: string;
  temperature: string;
  maxTokens: string;
  content: string;
};
type ProviderDraftRecord = {
  providerId: string;
  modelName: string;
};
type BasicDraftRecord = {
  packageName: string;
  packageKey: string;
  status: SkillPackageRecord["status"];
  scope: SkillPackageRecord["scope"];
  description: string;
  tags: string;
  remarks: string;
};

export function SkillPackageOverviewPanel(props: SkillPackageOverviewPanelProps) {
  const [packageRows, setPackageRows] = useState<SkillPackageRecord[]>(props.packages);
  const [filters, setFilters] = useState<OverviewFilters>(DEFAULT_FILTERS);
  const [selectedPackageId, setSelectedPackageId] = useState(props.packages[0]?.id || "");
  const [detail, setDetail] = useState<SkillPackageDetailRecord | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [versionNumber, setVersionNumber] = useState("");
  const [versionChangeLog, setVersionChangeLog] = useState("");
  const [isVersionSubmitting, setIsVersionSubmitting] = useState(false);
  const [activatingVersionId, setActivatingVersionId] = useState("");
  const [promptDrafts, setPromptDrafts] = useState<Record<string, PromptDraftRecord>>({});
  const [savingPromptId, setSavingPromptId] = useState("");
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ProviderDraftRecord>>({});
  const [availableProviders, setAvailableProviders] = useState<ApiProviderRecord[]>([]);
  const [savingProviderId, setSavingProviderId] = useState("");
  const [basicDraft, setBasicDraft] = useState<BasicDraftRecord>(buildBasicDraft(props.packages[0]));
  const [isBasicSaving, setIsBasicSaving] = useState(false);

  const moduleOptions = useMemo(() => {
    const moduleMap = new Map<string, string>();
    props.modules.forEach((item) => moduleMap.set(item.moduleKey, item.moduleName));
    packageRows.forEach((item) => {
      item.moduleSummaries?.forEach((summary) => {
        if (!moduleMap.has(summary.moduleKey)) {
          moduleMap.set(summary.moduleKey, summary.moduleName);
        }
      });
      item.moduleKeys.forEach((moduleKey) => {
        if (!moduleMap.has(moduleKey)) {
          moduleMap.set(moduleKey, moduleKey);
        }
      });
    });
    return Array.from(moduleMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"));
  }, [props.modules, packageRows]);

  useEffect(() => {
    setPackageRows(props.packages);
  }, [props.packages]);

  const visiblePackages = useMemo(() => {
    return packageRows.filter((item) => {
      if (filters.status !== "ALL" && item.status !== filters.status) {
        return false;
      }
      if (filters.scope !== "ALL" && item.scope !== filters.scope) {
        return false;
      }
      if (filters.moduleKey !== "ALL") {
        const moduleKeys = new Set([...(item.moduleKeys || []), ...(item.moduleSummaries?.map((moduleItem) => moduleItem.moduleKey) || [])]);
        if (!moduleKeys.has(filters.moduleKey)) {
          return false;
        }
      }
      const keyword = filters.keyword.trim().toLowerCase();
      if (!keyword) {
        return true;
      }
      return [
        item.packageKey,
        item.packageName,
        item.description,
        item.moduleSummaries?.map((moduleItem) => moduleItem.moduleName).join(","),
        item.defaultProviderSummary?.providerName,
        item.defaultProviderSummary?.modelName,
      ].some((field) => String(field || "").toLowerCase().includes(keyword));
    });
  }, [filters, packageRows]);

  const selectedPackage = visiblePackages.find((item) => item.id === selectedPackageId) || visiblePackages[0] || packageRows[0];
  const selectedSummary = detail?.package.id === selectedPackage?.id ? detail.package : selectedPackage;

  async function loadPackageDetail(packageId: string) {
    setIsDetailLoading(true);
    setDetailError("");
    try {
      const result = await getSkillPackage(packageId);
      setDetail(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "能力包详情加载失败";
      setDetail(null);
      setDetailError(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!visiblePackages.length) {
      setSelectedPackageId("");
      return;
    }
    if (!visiblePackages.some((item) => item.id === selectedPackageId)) {
      setSelectedPackageId(visiblePackages[0]?.id || "");
    }
  }, [selectedPackageId, visiblePackages]);

  useEffect(() => {
    if (!selectedPackage?.id) {
      setDetail(null);
      setDetailError("");
      return;
    }

    let cancelled = false;
    void loadPackageDetail(selectedPackage.id).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selectedPackage?.id]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      (detail?.prompts || []).map((item) => [item.id, buildPromptDraft(item)]),
    ) as Record<string, PromptDraftRecord>;
    setPromptDrafts(nextDrafts);
  }, [detail]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      (detail?.providerBindings || []).map((item) => [item.id, buildProviderDraft(item)]),
    ) as Record<string, ProviderDraftRecord>;
    setProviderDrafts(nextDrafts);
  }, [detail]);

  useEffect(() => {
    setBasicDraft(buildBasicDraft(selectedSummary));
  }, [selectedSummary]);

  useEffect(() => {
    let cancelled = false;
    async function loadProviders() {
      try {
        const result = await getApiProviders();
        if (!cancelled) {
          setAvailableProviders(result);
        }
      } catch {
        if (!cancelled) {
          setAvailableProviders([]);
        }
      }
    }
    void loadProviders();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateVersion() {
    if (!selectedPackage?.id || !versionNumber.trim()) {
      setDetailError("请先填写版本号");
      return;
    }
    setIsVersionSubmitting(true);
    setDetailError("");
    try {
      await createSkillPackageVersion(selectedPackage.id, {
        versionNumber: versionNumber.trim(),
        changeLog: versionChangeLog.trim() || undefined,
        sourceMode: "CURRENT_STATE",
      });
      setVersionNumber("");
      setVersionChangeLog("");
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建版本失败";
      setDetailError(`创建版本失败：${message}`);
    } finally {
      setIsVersionSubmitting(false);
    }
  }

  async function handleActivateVersion(versionId: string) {
    if (!selectedPackage?.id) {
      return;
    }
    setActivatingVersionId(versionId);
    setDetailError("");
    try {
      await activateSkillPackageVersion(selectedPackage.id, versionId);
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "激活版本失败";
      setDetailError(`激活版本失败：${message}`);
    } finally {
      setActivatingVersionId("");
    }
  }

  function handlePromptDraftChange(promptId: string, field: keyof PromptDraftRecord, value: string) {
    setPromptDrafts((current) => {
      const prompt = detail?.prompts?.find((item) => item.id === promptId);
      const base = current[promptId] || buildPromptDraft(prompt);
      return {
        ...current,
        [promptId]: {
          ...base,
          [field]: value,
        },
      };
    });
  }

  async function handleSavePrompt(promptId: string) {
    if (!selectedPackage?.id) {
      return;
    }
    const prompt = detail?.prompts?.find((item) => item.id === promptId);
    if (!prompt) {
      return;
    }
    const draft = promptDrafts[promptId] || buildPromptDraft(prompt);
    const modelName = draft.modelName.trim();
    const temperature = Number(draft.temperature.trim());
    const maxTokens = Number(draft.maxTokens.trim());

    if (!modelName) {
      setDetailError(`Prompt「${prompt.promptName}」模型不能为空`);
      return;
    }
    if (!Number.isFinite(temperature)) {
      setDetailError(`Prompt「${prompt.promptName}」温度参数不合法`);
      return;
    }
    if (!Number.isFinite(maxTokens) || maxTokens <= 0) {
      setDetailError(`Prompt「${prompt.promptName}」最大 Tokens 不合法`);
      return;
    }

    setSavingPromptId(promptId);
    setDetailError("");
    try {
      await updateSkillPackagePrompt(selectedPackage.id, promptId, {
        status: draft.status,
        modelName,
        temperature,
        maxTokens: Math.floor(maxTokens),
        content: draft.content,
      });
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存 Prompt 失败";
      setDetailError(`保存 Prompt 失败：${message}`);
    } finally {
      setSavingPromptId("");
    }
  }

  function handleProviderDraftChange(bindingId: string, field: keyof ProviderDraftRecord, value: string) {
    setProviderDrafts((current) => {
      const binding = detail?.providerBindings?.find((item) => item.id === bindingId);
      const base = current[bindingId] || buildProviderDraft(binding);
      const nextDraft = {
        ...base,
        [field]: value,
      };
      if (field === "providerId") {
        const provider = availableProviders.find((item) => item.id === value);
        nextDraft.modelName = provider?.defaultModel || base.modelName;
      }
      return {
        ...current,
        [bindingId]: nextDraft,
      };
    });
  }

  async function handleSaveProvider(bindingId: string) {
    if (!selectedPackage?.id) {
      return;
    }
    const binding = detail?.providerBindings?.find((item) => item.id === bindingId);
    if (!binding) {
      return;
    }
    const draft = providerDrafts[bindingId] || buildProviderDraft(binding);
    const providerId = draft.providerId.trim();
    const modelName = draft.modelName.trim();

    if (!providerId) {
      setDetailError(`Provider「${binding.providerName || binding.id}」不能为空`);
      return;
    }
    if (!modelName) {
      setDetailError(`Provider「${binding.providerName || binding.id}」模型不能为空`);
      return;
    }

    setSavingProviderId(bindingId);
    setDetailError("");
    try {
      await updateSkillPackageProvider(selectedPackage.id, bindingId, {
        providerId,
        modelName,
      });
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存 Provider 失败";
      setDetailError(`保存 Provider 失败：${message}`);
    } finally {
      setSavingProviderId("");
    }
  }

  async function handleSaveBasic() {
    if (!selectedPackage?.id) {
      return;
    }
    const packageName = basicDraft.packageName.trim();
    const packageKey = basicDraft.packageKey.trim().toLowerCase();
    if (!packageName) {
      setDetailError("能力包名称不能为空");
      return;
    }
    if (!packageKey) {
      setDetailError("能力包标识不能为空");
      return;
    }

    setIsBasicSaving(true);
    setDetailError("");
    try {
      const updated = await updateSkillPackageBasic(selectedPackage.id, {
        packageName,
        packageKey,
        status: basicDraft.status,
        scope: basicDraft.scope,
        description: basicDraft.description.trim() || undefined,
        tags: splitDraftList(basicDraft.tags),
        remarks: basicDraft.remarks.trim() || undefined,
      });
      setPackageRows((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存基础信息失败";
      setDetailError(`保存基础信息失败：${message}`);
    } finally {
      setIsBasicSaving(false);
    }
  }

  return (
    <section className="entity-card admin-user-filter-card" style={{ marginBottom: 24 }}>
      <div className="admin-user-filter-head">
        <div>
          <span className="archive-pill status-ready">统一技能中心</span>
          <h3>能力包摘要视图</h3>
          <p>从能力包视角统一查看模块归属、主技能、Prompt、Provider 和版本摘要，先补齐详情面 first pass。</p>
        </div>
        <div className="admin-user-filter-summary">
          <div>
            <span>能力包</span>
            <strong>{visiblePackages.length}</strong>
          </div>
          <div>
            <span>启用中</span>
            <strong>{visiblePackages.filter((item) => item.status === "ACTIVE").length}</strong>
          </div>
          <div>
            <span>提示词总数</span>
            <strong>{visiblePackages.reduce((sum, item) => sum + (item.promptCount || 0), 0)}</strong>
          </div>
        </div>
      </div>

      <div className="admin-user-filter-grid" style={{ marginBottom: 16 }}>
        <label>
          <span>关键词</span>
          <input
            value={filters.keyword}
            placeholder="能力包 / 模块 / 模型"
            onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
          />
        </label>
        <label>
          <span>模块</span>
          <select value={filters.moduleKey} onChange={(event) => setFilters((current) => ({ ...current, moduleKey: event.target.value }))}>
            <option value="ALL">全部模块</option>
            {moduleOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>状态</span>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as OverviewFilters["status"] }))}>
            <option value="ALL">全部</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="DISABLED">DISABLED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
        <label>
          <span>作用域</span>
          <select value={filters.scope} onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value as OverviewFilters["scope"] }))}>
            <option value="ALL">全部</option>
            <option value="PLATFORM">PLATFORM</option>
            <option value="BRAND">BRAND</option>
            <option value="USER">USER</option>
          </select>
        </label>
      </div>

      <div className="admin-user-layout">
        <article className="entity-card admin-user-list-card">
          <div className="entity-card-head">
            <div>
              <strong>能力包列表</strong>
              <p className="personal-meta">第一批先展示摘要，不在这里直接编辑正文资产。</p>
            </div>
          </div>
          <div className="admin-user-table-wrapper">
            <table className="admin-user-table">
              <thead>
                <tr>
                  <th>能力包</th>
                  <th>模块</th>
                  <th>技能数</th>
                  <th>提示词数</th>
                  <th>默认模型</th>
                  <th>版本</th>
                  <th>更新时间</th>
                </tr>
              </thead>
              <tbody>
                {visiblePackages.length ? (
                  visiblePackages.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedPackageId(item.id)}
                      style={{
                        cursor: "pointer",
                        background: item.id === selectedPackage?.id ? "rgba(15, 118, 110, 0.08)" : undefined,
                      }}
                    >
                      <td>
                        <div className="admin-user-row-title">{item.packageName}</div>
                        <div className="admin-user-row-meta">{item.packageKey}</div>
                      </td>
                      <td>{(item.moduleSummaries || []).map((moduleItem) => moduleItem.moduleName).join(" / ") || item.moduleKeys.join(" / ") || "-"}</td>
                      <td>{item.skillCount || 0}</td>
                      <td>{item.promptCount || 0}</td>
                      <td>{item.defaultProviderSummary?.modelName || item.defaultProviderSummary?.providerName || "-"}</td>
                      <td>{item.currentVersionNumber || item.currentVersionId || "-"}</td>
                      <td>{formatDateTime(item.updatedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "24px 12px", color: "var(--muted)" }}>
                      当前筛选条件下没有匹配的能力包。
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
              <strong>当前摘要</strong>
              <p className="personal-meta">{selectedPackage ? `${selectedPackage.packageName} 的统一技能中心详情摘要` : "暂无能力包摘要"}</p>
            </div>
          </div>
          {selectedSummary ? (
            <>
            <BasicBlock
              draft={basicDraft}
              isSaving={isBasicSaving}
              moduleNames={(detail?.moduleSummaries || selectedSummary.moduleSummaries || []).map((item) => item.moduleName).join(" / ") || selectedSummary.moduleKeys.join(" / ") || "-"}
              skillCount={String(selectedSummary.skillCount || 0)}
              promptCount={String(selectedSummary.promptCount || 0)}
              defaultProvider={selectedSummary.defaultProviderSummary?.providerName || detail?.providerBindings?.find((item) => item.isDefault)?.providerName || "-"}
              defaultModel={selectedSummary.defaultProviderSummary?.modelName || detail?.providerBindings?.find((item) => item.isDefault)?.modelName || "-"}
              skillName={detail?.skill?.skillName || "-"}
              executionMode={detail?.skill?.executionMode || "-"}
              currentVersion={detail?.versions?.[0]?.versionNumber || selectedSummary.currentVersionNumber || selectedSummary.currentVersionId || "-"}
              updatedAt={formatDateTime(selectedSummary.updatedAt)}
              defaultKnowledgeSpaces={(detail?.knowledgeBindings || []).map((item) => item.knowledgeBaseName).join(" / ") || selectedSummary.defaultKnowledgeSpaceIds.join(" / ") || "-"}
              onChange={(field, value) => setBasicDraft((current) => ({ ...current, [field]: value }))}
              onSave={() => void handleSaveBasic()}
            />
            <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
              <PromptBlock
                prompts={detail?.prompts || []}
                drafts={promptDrafts}
                savingPromptId={savingPromptId}
                isLoading={isDetailLoading}
                emptyText={detailError ? detailError : "当前能力包暂无 Prompt 详情。"}
                onDraftChange={handlePromptDraftChange}
                onSave={(promptId) => void handleSavePrompt(promptId)}
              />
              <ProviderBlock
                bindings={detail?.providerBindings || []}
                drafts={providerDrafts}
                providers={availableProviders}
                savingProviderId={savingProviderId}
                emptyText="当前能力包暂无 Provider 绑定摘要。"
                onDraftChange={handleProviderDraftChange}
                onSave={(bindingId) => void handleSaveProvider(bindingId)}
              />
              <VersionBlock
                packageId={selectedPackage?.id || ""}
                versions={detail?.versions || []}
                versionNumber={versionNumber}
                versionChangeLog={versionChangeLog}
                isSubmitting={isVersionSubmitting}
                activatingVersionId={activatingVersionId}
                onVersionNumberChange={setVersionNumber}
                onVersionChangeLogChange={setVersionChangeLog}
                onCreate={() => void handleCreateVersion()}
                onActivate={(versionId) => void handleActivateVersion(versionId)}
              />
              <DetailBlock
                title="工作流步骤"
                meta={`${detail?.workflowStepSummaries?.length || 0} 条`}
                emptyText="当前能力包暂无工作流步骤摘要。"
                items={(detail?.workflowStepSummaries || []).map((item) => ({
                  id: item.stepKey,
                  title: `${item.stepOrder}. ${item.stepName}`,
                  subtitle: item.workflowKey,
                  body: item.stepKey,
                }))}
              />
            </div>
            </>
          ) : (
            <div className="personal-meta">暂无可展示的能力包摘要。</div>
          )}
        </article>
      </div>
    </section>
  );
}

type VersionBlockProps = {
  packageId: string;
  versions: NonNullable<SkillPackageDetailRecord["versions"]>;
  versionNumber: string;
  versionChangeLog: string;
  isSubmitting: boolean;
  activatingVersionId: string;
  onVersionNumberChange: (value: string) => void;
  onVersionChangeLogChange: (value: string) => void;
  onCreate: () => void;
  onActivate: (versionId: string) => void;
};

function VersionBlock(props: VersionBlockProps) {
  return (
    <section className="entity-card" style={{ padding: 16 }}>
      <div className="entity-card-head">
        <div>
          <strong>版本摘要</strong>
          <p className="personal-meta">{props.versions.length} 条</p>
        </div>
      </div>
      <div className="admin-user-filter-grid" style={{ marginBottom: 16 }}>
        <label>
          <span>版本号</span>
          <input
            value={props.versionNumber}
            placeholder="如 v2"
            onChange={(event) => props.onVersionNumberChange(event.target.value)}
          />
        </label>
        <label style={{ gridColumn: "span 3" }}>
          <span>变更说明</span>
          <input
            value={props.versionChangeLog}
            placeholder="记录这次版本变更内容"
            onChange={(event) => props.onVersionChangeLogChange(event.target.value)}
          />
        </label>
      </div>
      <div className="personal-actions" style={{ marginBottom: 16 }}>
        <button type="button" className="primary-button" onClick={props.onCreate} disabled={!props.packageId || props.isSubmitting}>
          {props.isSubmitting ? "创建中..." : "创建版本"}
        </button>
      </div>
      {props.versions.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {props.versions.map((item) => (
            <article
              key={item.id}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <div className="entity-card-head" style={{ marginBottom: 8 }}>
                <div>
                  <div className="admin-user-row-title">{`${item.versionNumber}${item.isActive ? "（当前）" : ""}`}</div>
                  <div className="admin-user-row-meta">{formatDateTime(item.createdAt)}</div>
                </div>
                {!item.isActive ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => props.onActivate(item.id)}
                    disabled={props.activatingVersionId === item.id}
                  >
                    {props.activatingVersionId === item.id ? "激活中..." : "激活"}
                  </button>
                ) : null}
              </div>
              <div className="personal-meta" style={{ marginBottom: 8 }}>
                {item.changeLog || "暂无版本说明"}
              </div>
              <div className="personal-meta">
                {`Prompt ${item.snapshotSummary?.promptCount || 0} / Provider ${item.snapshotSummary?.providerBindingCount || 0} / Knowledge ${item.snapshotSummary?.knowledgeBindingCount || 0}`}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="personal-meta">当前能力包暂无版本摘要。</div>
      )}
    </section>
  );
}

type BasicBlockProps = {
  draft: BasicDraftRecord;
  isSaving: boolean;
  moduleNames: string;
  skillCount: string;
  promptCount: string;
  defaultProvider: string;
  defaultModel: string;
  skillName: string;
  executionMode: string;
  currentVersion: string;
  updatedAt: string;
  defaultKnowledgeSpaces: string;
  onChange: (field: keyof BasicDraftRecord, value: string) => void;
  onSave: () => void;
};

function BasicBlock(props: BasicBlockProps) {
  return (
    <section className="entity-card" style={{ padding: 16 }}>
      <div className="entity-card-head">
        <div>
          <strong>基础信息</strong>
          <p className="personal-meta">first pass 先开放能力包主字段编辑，不改模块与知识绑定关系。</p>
        </div>
        <button type="button" className="primary-button" onClick={props.onSave} disabled={props.isSaving}>
          {props.isSaving ? "保存中..." : "保存基础信息"}
        </button>
      </div>
      <div className="admin-skill-simple-grid">
        <label className="admin-skill-field">
          <span>能力包名称</span>
          <input value={props.draft.packageName} onChange={(event) => props.onChange("packageName", event.target.value)} />
        </label>
        <label className="admin-skill-field">
          <span>能力包标识</span>
          <input value={props.draft.packageKey} onChange={(event) => props.onChange("packageKey", event.target.value)} />
        </label>
        <label className="admin-skill-field">
          <span>状态</span>
          <select value={props.draft.status} onChange={(event) => props.onChange("status", event.target.value)}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="DISABLED">DISABLED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
        <label className="admin-skill-field">
          <span>作用域</span>
          <select value={props.draft.scope} onChange={(event) => props.onChange("scope", event.target.value)}>
            <option value="PLATFORM">PLATFORM</option>
            <option value="BRAND">BRAND</option>
            <option value="USER">USER</option>
          </select>
        </label>
        <label className="admin-skill-field admin-skill-field--wide">
          <span>所属模块</span>
          <input value={props.moduleNames} readOnly />
        </label>
        <label className="admin-skill-field">
          <span>技能数</span>
          <input value={props.skillCount} readOnly />
        </label>
        <label className="admin-skill-field">
          <span>提示词数</span>
          <input value={props.promptCount} readOnly />
        </label>
        <label className="admin-skill-field">
          <span>默认 Provider</span>
          <input value={props.defaultProvider} readOnly />
        </label>
        <label className="admin-skill-field">
          <span>默认模型</span>
          <input value={props.defaultModel} readOnly />
        </label>
        <label className="admin-skill-field">
          <span>主技能</span>
          <input value={props.skillName} readOnly />
        </label>
        <label className="admin-skill-field">
          <span>执行模式</span>
          <input value={props.executionMode} readOnly />
        </label>
        <label className="admin-skill-field">
          <span>当前版本</span>
          <input value={props.currentVersion} readOnly />
        </label>
        <label className="admin-skill-field">
          <span>更新时间</span>
          <input value={props.updatedAt} readOnly />
        </label>
        <label className="admin-skill-field admin-skill-field--wide">
          <span>默认知识空间</span>
          <input value={props.defaultKnowledgeSpaces} readOnly />
        </label>
        <label className="admin-skill-field admin-skill-field--wide">
          <span>标签</span>
          <input value={props.draft.tags} onChange={(event) => props.onChange("tags", event.target.value)} placeholder="用 / 或 , 分隔" />
        </label>
        <label className="admin-skill-field admin-skill-field--full">
          <span>说明</span>
          <textarea value={props.draft.description} onChange={(event) => props.onChange("description", event.target.value)} />
        </label>
        <label className="admin-skill-field admin-skill-field--full">
          <span>备注</span>
          <textarea value={props.draft.remarks} onChange={(event) => props.onChange("remarks", event.target.value)} />
        </label>
      </div>
    </section>
  );
}

type PromptBlockProps = {
  prompts: PromptDetailRecord[];
  drafts: Record<string, PromptDraftRecord>;
  savingPromptId: string;
  isLoading: boolean;
  emptyText: string;
  onDraftChange: (promptId: string, field: keyof PromptDraftRecord, value: string) => void;
  onSave: (promptId: string) => void;
};

function PromptBlock(props: PromptBlockProps) {
  return (
    <section className="entity-card" style={{ padding: 16 }}>
      <div className="entity-card-head">
        <div>
          <strong>Prompt 资产</strong>
          <p className="personal-meta">{props.isLoading ? "正在加载能力包详情..." : `${props.prompts.length} 条`}</p>
        </div>
      </div>
      {props.prompts.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {props.prompts.map((item) => {
            const draft = props.drafts[item.id] || buildPromptDraft(item);
            return (
              <article
                key={item.id}
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  borderRadius: 14,
                  padding: 12,
                  background: "rgba(255, 255, 255, 0.72)",
                }}
              >
                <div className="entity-card-head" style={{ marginBottom: 8 }}>
                  <div>
                    <div className="admin-user-row-title">{item.promptName}</div>
                    <div className="admin-user-row-meta">
                      {`${item.promptRole}${item.versionTag ? ` / ${item.versionTag}` : ""}${item.updatedAt ? ` / ${formatDateTime(item.updatedAt)}` : ""}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => props.onSave(item.id)}
                    disabled={props.savingPromptId === item.id}
                  >
                    {props.savingPromptId === item.id ? "保存中..." : "保存 Prompt"}
                  </button>
                </div>
                <div className="admin-user-filter-grid" style={{ marginBottom: 12 }}>
                  <label>
                    <span>状态</span>
                    <select value={draft.status} onChange={(event) => props.onDraftChange(item.id, "status", event.target.value)}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </label>
                  <label>
                    <span>模型</span>
                    <input value={draft.modelName} onChange={(event) => props.onDraftChange(item.id, "modelName", event.target.value)} />
                  </label>
                  <label>
                    <span>Temperature</span>
                    <input
                      value={draft.temperature}
                      inputMode="decimal"
                      onChange={(event) => props.onDraftChange(item.id, "temperature", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Max Tokens</span>
                    <input value={draft.maxTokens} inputMode="numeric" onChange={(event) => props.onDraftChange(item.id, "maxTokens", event.target.value)} />
                  </label>
                </div>
                <label className="admin-skill-field admin-skill-field--full">
                  <span>内容</span>
                  <textarea
                    value={draft.content}
                    onChange={(event) => props.onDraftChange(item.id, "content", event.target.value)}
                    style={{ minHeight: 180 }}
                  />
                </label>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="personal-meta">{props.emptyText}</div>
      )}
    </section>
  );
}

type ProviderBlockProps = {
  bindings: ProviderBindingRecord[];
  drafts: Record<string, ProviderDraftRecord>;
  providers: ApiProviderRecord[];
  savingProviderId: string;
  emptyText: string;
  onDraftChange: (bindingId: string, field: keyof ProviderDraftRecord, value: string) => void;
  onSave: (bindingId: string) => void;
};

function ProviderBlock(props: ProviderBlockProps) {
  return (
    <section className="entity-card" style={{ padding: 16 }}>
      <div className="entity-card-head">
        <div>
          <strong>Provider 绑定</strong>
          <p className="personal-meta">{`${props.bindings.length} 条`}</p>
        </div>
      </div>
      {props.bindings.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {props.bindings.map((item) => {
            const draft = props.drafts[item.id] || buildProviderDraft(item);
            return (
              <article
                key={item.id}
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  borderRadius: 14,
                  padding: 12,
                  background: "rgba(255, 255, 255, 0.72)",
                }}
              >
                <div className="entity-card-head" style={{ marginBottom: 8 }}>
                  <div>
                    <div className="admin-user-row-title">{`${item.providerName || "-"}${item.isDefault ? "（默认）" : ""}`}</div>
                    <div className="admin-user-row-meta">{`${item.providerType} / 优先级 ${item.priority}`}</div>
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => props.onSave(item.id)}
                    disabled={props.savingProviderId === item.id}
                  >
                    {props.savingProviderId === item.id ? "保存中..." : "保存 Provider"}
                  </button>
                </div>
                <div className="admin-user-filter-grid" style={{ marginBottom: 12 }}>
                  <label>
                    <span>Provider</span>
                    <select value={draft.providerId} onChange={(event) => props.onDraftChange(item.id, "providerId", event.target.value)}>
                      <option value="">请选择 Provider</option>
                      {props.providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {`${provider.name} / ${provider.providerType} / ${provider.status}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ gridColumn: "span 3" }}>
                    <span>模型</span>
                    <input value={draft.modelName} onChange={(event) => props.onDraftChange(item.id, "modelName", event.target.value)} />
                  </label>
                </div>
                <div className="personal-meta">
                  {`可用模型 ${item.modelWhitelist.join(" / ") || "-"}；Fallback ${item.fallbackProviderIds.join(" / ") || "-"}`}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="personal-meta">{props.emptyText}</div>
      )}
    </section>
  );
}

type DetailBlockProps = {
  title: string;
  meta: string;
  emptyText: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    body: string;
  }>;
};

function DetailBlock(props: DetailBlockProps) {
  return (
    <section className="entity-card" style={{ padding: 16 }}>
      <div className="entity-card-head">
        <div>
          <strong>{props.title}</strong>
          <p className="personal-meta">{props.meta}</p>
        </div>
      </div>
      {props.items.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {props.items.map((item) => (
            <article
              key={item.id}
              style={{
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255, 255, 255, 0.72)",
              }}
            >
              <div className="admin-user-row-title">{item.title}</div>
              <div className="admin-user-row-meta" style={{ marginBottom: 8 }}>
                {item.subtitle}
              </div>
              <div className="personal-meta" style={{ whiteSpace: "pre-wrap" }}>
                {item.body}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="personal-meta">{props.emptyText}</div>
      )}
    </section>
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

function buildPromptDraft(prompt?: PromptDetailRecord): PromptDraftRecord {
  return {
    status: prompt?.status || "DRAFT",
    modelName: prompt?.modelName || "",
    temperature: prompt?.temperature !== undefined ? String(prompt.temperature) : "",
    maxTokens: prompt?.maxTokens !== undefined ? String(prompt.maxTokens) : "",
    content: prompt?.content || "",
  };
}

function buildProviderDraft(binding?: ProviderBindingRecord): ProviderDraftRecord {
  return {
    providerId: binding?.providerId || "",
    modelName: binding?.modelName || "",
  };
}

function buildBasicDraft(packageRecord?: SkillPackageRecord): BasicDraftRecord {
  return {
    packageName: packageRecord?.packageName || "",
    packageKey: packageRecord?.packageKey || "",
    status: packageRecord?.status || "DRAFT",
    scope: packageRecord?.scope || "PLATFORM",
    description: packageRecord?.description || "",
    tags: packageRecord?.tags?.join(" / ") || "",
    remarks: packageRecord?.remarks || "",
  };
}

function splitDraftList(value: string) {
  return String(value || "")
    .split(/[\/,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
