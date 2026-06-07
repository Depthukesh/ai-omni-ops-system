"use client";

import { useEffect, useMemo, useState } from "react";
import {
  activateSkillPackageVersion,
  createKnowledgeBinding,
  createReferenceAsset,
  createScriptAsset,
  createSkillPackageVersion,
  deleteKnowledgeBinding,
  deleteReferenceAsset,
  deleteScriptAsset,
  getApiProviders,
  getKnowledgeBases,
  getKnowledgeBindingsByTarget,
  getSkillPackage,
  type ApiProviderRecord,
  type KnowledgeBaseRecord,
  type KnowledgeBindingRecord,
  type ModuleDefinitionRecord,
  type PromptTemplateRecord,
  type SkillPackageDetailRecord,
  type SkillPackageRecord,
  updateKnowledgeBinding,
  updateReferenceAsset,
  updateScriptAsset,
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
type ReferenceDetailRecord = NonNullable<SkillPackageDetailRecord["references"]>[number];
type ScriptDetailRecord = NonNullable<SkillPackageDetailRecord["scripts"]>[number];
type KnowledgeBindingViewRecord = KnowledgeBindingRecord;
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
type ReferenceDraftRecord = {
  referenceKey: string;
  title: string;
  sourceType: ReferenceDetailRecord["sourceType"];
  sourceUri: string;
  usageNote: string;
  applicableScopes: string;
  sortOrder: string;
};
type ScriptDraftRecord = {
  scriptKey: string;
  scriptName: string;
  runtime: ScriptDetailRecord["runtime"];
  entry: string;
  argsSchema: string;
  usageNote: string;
  sortOrder: string;
};
type KnowledgeBindingDraftRecord = {
  priority: string;
  retrievalMode: KnowledgeBindingViewRecord["retrievalMode"];
  isRequired: boolean;
  enabled: boolean;
};
type NewKnowledgeBindingDraftRecord = {
  knowledgeBaseId: string;
  priority: string;
  retrievalMode: KnowledgeBindingViewRecord["retrievalMode"];
  isRequired: boolean;
  enabled: boolean;
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
  const [availableKnowledgeBases, setAvailableKnowledgeBases] = useState<KnowledgeBaseRecord[]>([]);
  const [savingProviderId, setSavingProviderId] = useState("");
  const [knowledgeBindingRows, setKnowledgeBindingRows] = useState<KnowledgeBindingViewRecord[]>([]);
  const [knowledgeBindingDrafts, setKnowledgeBindingDrafts] = useState<Record<string, KnowledgeBindingDraftRecord>>({});
  const [newKnowledgeBindingDraft, setNewKnowledgeBindingDraft] = useState<NewKnowledgeBindingDraftRecord>(
    buildNewKnowledgeBindingDraft(),
  );
  const [savingKnowledgeBindingId, setSavingKnowledgeBindingId] = useState("");
  const [isCreatingKnowledgeBinding, setIsCreatingKnowledgeBinding] = useState(false);
  const [deletingKnowledgeBindingId, setDeletingKnowledgeBindingId] = useState("");
  const [referenceDrafts, setReferenceDrafts] = useState<Record<string, ReferenceDraftRecord>>({});
  const [newReferenceDraft, setNewReferenceDraft] = useState<ReferenceDraftRecord>(buildReferenceDraft());
  const [savingReferenceId, setSavingReferenceId] = useState("");
  const [isCreatingReference, setIsCreatingReference] = useState(false);
  const [deletingReferenceId, setDeletingReferenceId] = useState("");
  const [scriptDrafts, setScriptDrafts] = useState<Record<string, ScriptDraftRecord>>({});
  const [newScriptDraft, setNewScriptDraft] = useState<ScriptDraftRecord>(buildScriptDraft());
  const [savingScriptId, setSavingScriptId] = useState("");
  const [isCreatingScript, setIsCreatingScript] = useState(false);
  const [deletingScriptId, setDeletingScriptId] = useState("");
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
      const result = await getSkillPackage(packageId, { includeReferences: true, includeScripts: true });
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
    const nextDrafts = Object.fromEntries(
      (detail?.references || []).map((item) => [item.id, buildReferenceDraft(item)]),
    ) as Record<string, ReferenceDraftRecord>;
    setReferenceDrafts(nextDrafts);
    setNewReferenceDraft(buildReferenceDraft());
  }, [detail]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      (detail?.scripts || []).map((item) => [item.id, buildScriptDraft(item)]),
    ) as Record<string, ScriptDraftRecord>;
    setScriptDrafts(nextDrafts);
    setNewScriptDraft(buildScriptDraft());
  }, [detail]);

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      knowledgeBindingRows.map((item) => [item.id, buildKnowledgeBindingDraft(item)]),
    ) as Record<string, KnowledgeBindingDraftRecord>;
    setKnowledgeBindingDrafts(nextDrafts);
  }, [knowledgeBindingRows]);

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

  useEffect(() => {
    let cancelled = false;
    async function loadKnowledgeBaseOptions() {
      try {
        const result = await getKnowledgeBases();
        if (!cancelled) {
          setAvailableKnowledgeBases(result.filter((item) => item.status !== "DISABLED"));
        }
      } catch {
        if (!cancelled) {
          setAvailableKnowledgeBases([]);
        }
      }
    }
    void loadKnowledgeBaseOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setNewKnowledgeBindingDraft((current) => {
      if (current.knowledgeBaseId || !availableKnowledgeBases.length) {
        return current;
      }
      return {
        ...current,
        knowledgeBaseId: availableKnowledgeBases[0]?.id || "",
      };
    });
  }, [availableKnowledgeBases]);

  useEffect(() => {
    if (!selectedPackage?.id) {
      setKnowledgeBindingRows([]);
      return;
    }
    let cancelled = false;
    async function loadPackageKnowledgeBindings() {
      try {
        const result = await getKnowledgeBindingsByTarget("SKILL_PACKAGE", selectedPackage.id);
        if (!cancelled) {
          setKnowledgeBindingRows(result);
        }
      } catch {
        if (!cancelled) {
          setKnowledgeBindingRows([]);
        }
      }
    }
    void loadPackageKnowledgeBindings();
    return () => {
      cancelled = true;
    };
  }, [selectedPackage?.id]);

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

  function handleReferenceDraftChange(referenceId: string, field: keyof ReferenceDraftRecord, value: string) {
    setReferenceDrafts((current) => {
      const reference = detail?.references?.find((item) => item.id === referenceId);
      const base = current[referenceId] || buildReferenceDraft(reference);
      return {
        ...current,
        [referenceId]: {
          ...base,
          [field]: value,
        },
      };
    });
  }

  function handleNewReferenceDraftChange(field: keyof ReferenceDraftRecord, value: string) {
    setNewReferenceDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateReference() {
    if (!selectedPackage?.id) {
      return;
    }
    const title = newReferenceDraft.title.trim();
    const referenceKey = newReferenceDraft.referenceKey.trim().toLowerCase();
    const sourceUri = newReferenceDraft.sourceUri.trim();
    const sortOrder = Number(newReferenceDraft.sortOrder.trim() || "100");

    if (!referenceKey) {
      setDetailError("参考资料标识不能为空");
      return;
    }
    if (!title) {
      setDetailError("参考资料标题不能为空");
      return;
    }
    if (!Number.isFinite(sortOrder)) {
      setDetailError("参考资料排序值不合法");
      return;
    }

    setIsCreatingReference(true);
    setDetailError("");
    try {
      await createReferenceAsset(selectedPackage.id, {
        referenceKey,
        title,
        sourceType: newReferenceDraft.sourceType,
        sourceUri: sourceUri || undefined,
        usageNote: newReferenceDraft.usageNote.trim() || undefined,
        applicableScopes: splitDraftList(newReferenceDraft.applicableScopes),
        sortOrder: Math.floor(sortOrder),
      });
      setNewReferenceDraft(buildReferenceDraft());
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "新增参考资料失败";
      setDetailError(`新增参考资料失败：${message}`);
    } finally {
      setIsCreatingReference(false);
    }
  }

  async function handleSaveReference(referenceId: string) {
    if (!selectedPackage?.id) {
      return;
    }
    const reference = detail?.references?.find((item) => item.id === referenceId);
    if (!reference) {
      return;
    }
    const draft = referenceDrafts[referenceId] || buildReferenceDraft(reference);
    const title = draft.title.trim();
    const referenceKey = draft.referenceKey.trim().toLowerCase();
    const sourceUri = draft.sourceUri.trim();
    const sortOrder = Number(draft.sortOrder.trim() || "100");

    if (!referenceKey) {
      setDetailError(`参考资料「${reference.title}」标识不能为空`);
      return;
    }
    if (!title) {
      setDetailError(`参考资料「${reference.title}」标题不能为空`);
      return;
    }
    if (!Number.isFinite(sortOrder)) {
      setDetailError(`参考资料「${reference.title}」排序值不合法`);
      return;
    }

    setSavingReferenceId(referenceId);
    setDetailError("");
    try {
      await updateReferenceAsset(selectedPackage.id, referenceId, {
        referenceKey,
        title,
        sourceType: draft.sourceType,
        sourceUri: sourceUri || undefined,
        usageNote: draft.usageNote.trim() || undefined,
        applicableScopes: splitDraftList(draft.applicableScopes),
        sortOrder: Math.floor(sortOrder),
      });
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存参考资料失败";
      setDetailError(`保存参考资料失败：${message}`);
    } finally {
      setSavingReferenceId("");
    }
  }

  async function handleDeleteReference(referenceId: string) {
    if (!selectedPackage?.id) {
      return;
    }
    setDeletingReferenceId(referenceId);
    setDetailError("");
    try {
      await deleteReferenceAsset(selectedPackage.id, referenceId);
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除参考资料失败";
      setDetailError(`删除参考资料失败：${message}`);
    } finally {
      setDeletingReferenceId("");
    }
  }

  function handleScriptDraftChange(scriptId: string, field: keyof ScriptDraftRecord, value: string) {
    setScriptDrafts((current) => {
      const script = detail?.scripts?.find((item) => item.id === scriptId);
      const base = current[scriptId] || buildScriptDraft(script);
      return {
        ...current,
        [scriptId]: {
          ...base,
          [field]: value,
        },
      };
    });
  }

  function handleNewScriptDraftChange(field: keyof ScriptDraftRecord, value: string) {
    setNewScriptDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateScript() {
    if (!selectedPackage?.id) {
      return;
    }
    const scriptKey = newScriptDraft.scriptKey.trim().toLowerCase();
    const scriptName = newScriptDraft.scriptName.trim();
    const entry = newScriptDraft.entry.trim();
    const sortOrder = Number(newScriptDraft.sortOrder.trim() || "100");
    if (!scriptKey) {
      setDetailError("脚本标识不能为空");
      return;
    }
    if (!scriptName) {
      setDetailError("脚本名称不能为空");
      return;
    }
    if (!Number.isFinite(sortOrder)) {
      setDetailError("脚本排序值不合法");
      return;
    }

    setIsCreatingScript(true);
    setDetailError("");
    try {
      const parsedArgsSchema = parseJsonDraft(newScriptDraft.argsSchema, "新增脚本参数 schema");
      await createScriptAsset(selectedPackage.id, {
        scriptKey,
        scriptName,
        runtime: newScriptDraft.runtime,
        entry: entry || undefined,
        argsSchema: parsedArgsSchema,
        usageNote: newScriptDraft.usageNote.trim() || undefined,
        sortOrder: Math.floor(sortOrder),
      });
      setNewScriptDraft(buildScriptDraft());
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "新增脚本失败";
      setDetailError(`新增脚本失败：${message}`);
    } finally {
      setIsCreatingScript(false);
    }
  }

  async function handleSaveScript(scriptId: string) {
    if (!selectedPackage?.id) {
      return;
    }
    const script = detail?.scripts?.find((item) => item.id === scriptId);
    if (!script) {
      return;
    }
    const draft = scriptDrafts[scriptId] || buildScriptDraft(script);
    const scriptKey = draft.scriptKey.trim().toLowerCase();
    const scriptName = draft.scriptName.trim();
    const entry = draft.entry.trim();
    const sortOrder = Number(draft.sortOrder.trim() || "100");
    if (!scriptKey) {
      setDetailError(`脚本「${script.scriptName}」标识不能为空`);
      return;
    }
    if (!scriptName) {
      setDetailError(`脚本「${script.scriptName}」名称不能为空`);
      return;
    }
    if (!Number.isFinite(sortOrder)) {
      setDetailError(`脚本「${script.scriptName}」排序值不合法`);
      return;
    }

    setSavingScriptId(scriptId);
    setDetailError("");
    try {
      const parsedArgsSchema = parseJsonDraft(draft.argsSchema, `脚本「${script.scriptName}」参数 schema`);
      await updateScriptAsset(selectedPackage.id, scriptId, {
        scriptKey,
        scriptName,
        runtime: draft.runtime,
        entry: entry || undefined,
        argsSchema: parsedArgsSchema,
        usageNote: draft.usageNote.trim() || undefined,
        sortOrder: Math.floor(sortOrder),
      });
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存脚本失败";
      setDetailError(`保存脚本失败：${message}`);
    } finally {
      setSavingScriptId("");
    }
  }

  async function handleDeleteScript(scriptId: string) {
    if (!selectedPackage?.id) {
      return;
    }
    setDeletingScriptId(scriptId);
    setDetailError("");
    try {
      await deleteScriptAsset(selectedPackage.id, scriptId);
      await loadPackageDetail(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除脚本失败";
      setDetailError(`删除脚本失败：${message}`);
    } finally {
      setDeletingScriptId("");
    }
  }

  function handleKnowledgeBindingDraftChange(
    bindingId: string,
    field: keyof KnowledgeBindingDraftRecord,
    value: string | boolean,
  ) {
    setKnowledgeBindingDrafts((current) => {
      const binding = knowledgeBindingRows.find((item) => item.id === bindingId);
      const base = current[bindingId] || buildKnowledgeBindingDraft(binding);
      return {
        ...current,
        [bindingId]: {
          ...base,
          [field]: value,
        },
      };
    });
  }

  function handleNewKnowledgeBindingDraftChange(
    field: keyof NewKnowledgeBindingDraftRecord,
    value: string | boolean,
  ) {
    setNewKnowledgeBindingDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function refreshKnowledgeBindings(packageId: string) {
    const result = await getKnowledgeBindingsByTarget("SKILL_PACKAGE", packageId);
    setKnowledgeBindingRows(result);
  }

  async function handleCreateKnowledgeBinding() {
    if (!selectedPackage?.id || !selectedSummary) {
      return;
    }
    if (!newKnowledgeBindingDraft.knowledgeBaseId) {
      setDetailError("请选择知识库");
      return;
    }
    const priority = Number(newKnowledgeBindingDraft.priority.trim() || "100");
    if (!Number.isFinite(priority)) {
      setDetailError("知识绑定优先级不合法");
      return;
    }
    setIsCreatingKnowledgeBinding(true);
    setDetailError("");
    try {
      await createKnowledgeBinding({
        knowledgeBaseId: newKnowledgeBindingDraft.knowledgeBaseId,
        bindingType: "SKILL_PACKAGE",
        targetId: selectedPackage.id,
        targetKey: selectedSummary.packageKey,
        targetName: selectedSummary.packageName,
        priority: Math.floor(priority),
        retrievalMode: newKnowledgeBindingDraft.retrievalMode,
        isRequired: newKnowledgeBindingDraft.isRequired,
        enabled: newKnowledgeBindingDraft.enabled,
      });
      await refreshKnowledgeBindings(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "新增知识绑定失败";
      setDetailError(`新增知识绑定失败：${message}`);
    } finally {
      setIsCreatingKnowledgeBinding(false);
    }
  }

  async function handleSaveKnowledgeBinding(bindingId: string) {
    const binding = knowledgeBindingRows.find((item) => item.id === bindingId);
    if (!binding) {
      return;
    }
    const draft = knowledgeBindingDrafts[bindingId] || buildKnowledgeBindingDraft(binding);
    const priority = Number(draft.priority.trim() || "100");
    if (!Number.isFinite(priority)) {
      setDetailError(`知识绑定「${binding.knowledgeBaseName || binding.knowledgeBaseId}」优先级不合法`);
      return;
    }
    setSavingKnowledgeBindingId(bindingId);
    setDetailError("");
    try {
      await updateKnowledgeBinding(bindingId, {
        priority: Math.floor(priority),
        retrievalMode: draft.retrievalMode,
        isRequired: draft.isRequired,
        enabled: draft.enabled,
        targetKey: binding.targetKey,
        targetName: binding.targetName,
      });
      if (selectedPackage?.id) {
        await refreshKnowledgeBindings(selectedPackage.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存知识绑定失败";
      setDetailError(`保存知识绑定失败：${message}`);
    } finally {
      setSavingKnowledgeBindingId("");
    }
  }

  async function handleDeleteKnowledgeBinding(bindingId: string) {
    if (!selectedPackage?.id) {
      return;
    }
    setDeletingKnowledgeBindingId(bindingId);
    setDetailError("");
    try {
      await deleteKnowledgeBinding(bindingId);
      await refreshKnowledgeBindings(selectedPackage.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除知识绑定失败";
      setDetailError(`删除知识绑定失败：${message}`);
    } finally {
      setDeletingKnowledgeBindingId("");
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
              defaultKnowledgeSpaces={knowledgeBindingRows.map((item) => item.knowledgeBaseName || item.knowledgeBaseId).join(" / ") || (detail?.knowledgeBindings || []).map((item) => item.knowledgeBaseName).join(" / ") || selectedSummary.defaultKnowledgeSpaceIds.join(" / ") || "-"}
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
              <KnowledgeBlock
                bindings={knowledgeBindingRows}
                drafts={knowledgeBindingDrafts}
                knowledgeBases={availableKnowledgeBases}
                newDraft={newKnowledgeBindingDraft}
                savingBindingId={savingKnowledgeBindingId}
                deletingBindingId={deletingKnowledgeBindingId}
                isCreating={isCreatingKnowledgeBinding}
                emptyText="当前能力包暂无知识绑定。"
                onDraftChange={handleKnowledgeBindingDraftChange}
                onNewDraftChange={handleNewKnowledgeBindingDraftChange}
                onCreate={() => void handleCreateKnowledgeBinding()}
                onSave={(bindingId) => void handleSaveKnowledgeBinding(bindingId)}
                onDelete={(bindingId) => void handleDeleteKnowledgeBinding(bindingId)}
              />
              <ReferenceBlock
                references={detail?.references || []}
                drafts={referenceDrafts}
                newDraft={newReferenceDraft}
                savingReferenceId={savingReferenceId}
                deletingReferenceId={deletingReferenceId}
                isCreating={isCreatingReference}
                emptyText="当前能力包暂无参考资料。"
                onDraftChange={handleReferenceDraftChange}
                onNewDraftChange={handleNewReferenceDraftChange}
                onCreate={() => void handleCreateReference()}
                onSave={(referenceId) => void handleSaveReference(referenceId)}
                onDelete={(referenceId) => void handleDeleteReference(referenceId)}
              />
              <ScriptBlock
                scripts={detail?.scripts || []}
                drafts={scriptDrafts}
                newDraft={newScriptDraft}
                savingScriptId={savingScriptId}
                deletingScriptId={deletingScriptId}
                isCreating={isCreatingScript}
                emptyText="当前能力包暂无脚本资产。"
                onDraftChange={handleScriptDraftChange}
                onNewDraftChange={handleNewScriptDraftChange}
                onCreate={() => void handleCreateScript()}
                onSave={(scriptId) => void handleSaveScript(scriptId)}
                onDelete={(scriptId) => void handleDeleteScript(scriptId)}
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

type ReferenceBlockProps = {
  references: ReferenceDetailRecord[];
  drafts: Record<string, ReferenceDraftRecord>;
  newDraft: ReferenceDraftRecord;
  savingReferenceId: string;
  deletingReferenceId: string;
  isCreating: boolean;
  emptyText: string;
  onDraftChange: (referenceId: string, field: keyof ReferenceDraftRecord, value: string) => void;
  onNewDraftChange: (field: keyof ReferenceDraftRecord, value: string) => void;
  onCreate: () => void;
  onSave: (referenceId: string) => void;
  onDelete: (referenceId: string) => void;
};

function ReferenceBlock(props: ReferenceBlockProps) {
  return (
    <section className="entity-card" style={{ padding: 16 }}>
      <div className="entity-card-head">
        <div>
          <strong>References 资产</strong>
          <p className="personal-meta">{`${props.references.length} 条`}</p>
        </div>
        <button type="button" className="primary-button" onClick={props.onCreate} disabled={props.isCreating}>
          {props.isCreating ? "新增中..." : "新增参考资料"}
        </button>
      </div>
      <article
        style={{
          border: "1px dashed rgba(15, 118, 110, 0.28)",
          borderRadius: 14,
          padding: 12,
          background: "rgba(240, 253, 250, 0.72)",
          marginBottom: 12,
        }}
      >
        <div className="admin-user-filter-grid" style={{ marginBottom: 12 }}>
          <label>
            <span>标识</span>
            <input value={props.newDraft.referenceKey} onChange={(event) => props.onNewDraftChange("referenceKey", event.target.value)} />
          </label>
          <label>
            <span>标题</span>
            <input value={props.newDraft.title} onChange={(event) => props.onNewDraftChange("title", event.target.value)} />
          </label>
          <label>
            <span>来源类型</span>
            <select value={props.newDraft.sourceType} onChange={(event) => props.onNewDraftChange("sourceType", event.target.value)}>
              <option value="URL">URL</option>
              <option value="FILE">FILE</option>
              <option value="DOC">DOC</option>
              <option value="MARKDOWN">MARKDOWN</option>
            </select>
          </label>
          <label>
            <span>排序</span>
            <input value={props.newDraft.sortOrder} inputMode="numeric" onChange={(event) => props.onNewDraftChange("sortOrder", event.target.value)} />
          </label>
          <label style={{ gridColumn: "span 2" }}>
            <span>来源地址</span>
            <input value={props.newDraft.sourceUri} onChange={(event) => props.onNewDraftChange("sourceUri", event.target.value)} />
          </label>
          <label style={{ gridColumn: "span 2" }}>
            <span>适用范围</span>
            <input
              value={props.newDraft.applicableScopes}
              placeholder="用 / 或 , 分隔"
              onChange={(event) => props.onNewDraftChange("applicableScopes", event.target.value)}
            />
          </label>
        </div>
        <label className="admin-skill-field admin-skill-field--full">
          <span>使用说明</span>
          <textarea value={props.newDraft.usageNote} onChange={(event) => props.onNewDraftChange("usageNote", event.target.value)} />
        </label>
      </article>
      {props.references.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {props.references.map((item) => {
            const draft = props.drafts[item.id] || buildReferenceDraft(item);
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
                    <div className="admin-user-row-title">{item.title}</div>
                    <div className="admin-user-row-meta">
                      {`${item.sourceType}${item.updatedAt ? ` / ${formatDateTime(item.updatedAt)}` : ""}`}
                    </div>
                  </div>
                  <div className="personal-actions" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => props.onSave(item.id)}
                      disabled={props.savingReferenceId === item.id}
                    >
                      {props.savingReferenceId === item.id ? "保存中..." : "保存资料"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => props.onDelete(item.id)}
                      disabled={props.deletingReferenceId === item.id}
                    >
                      {props.deletingReferenceId === item.id ? "删除中..." : "删除"}
                    </button>
                  </div>
                </div>
                <div className="admin-user-filter-grid" style={{ marginBottom: 12 }}>
                  <label>
                    <span>标识</span>
                    <input value={draft.referenceKey} onChange={(event) => props.onDraftChange(item.id, "referenceKey", event.target.value)} />
                  </label>
                  <label>
                    <span>标题</span>
                    <input value={draft.title} onChange={(event) => props.onDraftChange(item.id, "title", event.target.value)} />
                  </label>
                  <label>
                    <span>来源类型</span>
                    <select value={draft.sourceType} onChange={(event) => props.onDraftChange(item.id, "sourceType", event.target.value)}>
                      <option value="URL">URL</option>
                      <option value="FILE">FILE</option>
                      <option value="DOC">DOC</option>
                      <option value="MARKDOWN">MARKDOWN</option>
                    </select>
                  </label>
                  <label>
                    <span>排序</span>
                    <input value={draft.sortOrder} inputMode="numeric" onChange={(event) => props.onDraftChange(item.id, "sortOrder", event.target.value)} />
                  </label>
                  <label style={{ gridColumn: "span 2" }}>
                    <span>来源地址</span>
                    <input value={draft.sourceUri} onChange={(event) => props.onDraftChange(item.id, "sourceUri", event.target.value)} />
                  </label>
                  <label style={{ gridColumn: "span 2" }}>
                    <span>适用范围</span>
                    <input
                      value={draft.applicableScopes}
                      placeholder="用 / 或 , 分隔"
                      onChange={(event) => props.onDraftChange(item.id, "applicableScopes", event.target.value)}
                    />
                  </label>
                </div>
                <label className="admin-skill-field admin-skill-field--full">
                  <span>使用说明</span>
                  <textarea value={draft.usageNote} onChange={(event) => props.onDraftChange(item.id, "usageNote", event.target.value)} />
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

type KnowledgeBlockProps = {
  bindings: KnowledgeBindingViewRecord[];
  drafts: Record<string, KnowledgeBindingDraftRecord>;
  knowledgeBases: KnowledgeBaseRecord[];
  newDraft: NewKnowledgeBindingDraftRecord;
  savingBindingId: string;
  deletingBindingId: string;
  isCreating: boolean;
  emptyText: string;
  onDraftChange: (bindingId: string, field: keyof KnowledgeBindingDraftRecord, value: string | boolean) => void;
  onNewDraftChange: (field: keyof NewKnowledgeBindingDraftRecord, value: string | boolean) => void;
  onCreate: () => void;
  onSave: (bindingId: string) => void;
  onDelete: (bindingId: string) => void;
};

function KnowledgeBlock(props: KnowledgeBlockProps) {
  return (
    <section className="entity-card" style={{ padding: 16 }}>
      <div className="entity-card-head">
        <div>
          <strong>Knowledge 绑定</strong>
          <p className="personal-meta">{`${props.bindings.length} 条`}</p>
        </div>
        <button type="button" className="primary-button" onClick={props.onCreate} disabled={props.isCreating || !props.knowledgeBases.length}>
          {props.isCreating ? "新增中..." : "新增知识绑定"}
        </button>
      </div>
      <article
        style={{
          border: "1px dashed rgba(217, 119, 6, 0.28)",
          borderRadius: 14,
          padding: 12,
          background: "rgba(255, 247, 237, 0.72)",
          marginBottom: 12,
        }}
      >
        <div className="admin-user-filter-grid" style={{ marginBottom: 12 }}>
          <label>
            <span>知识库</span>
            <select
              value={props.newDraft.knowledgeBaseId}
              onChange={(event) => props.onNewDraftChange("knowledgeBaseId", event.target.value)}
            >
              <option value="">请选择知识库</option>
              {props.knowledgeBases.map((item) => (
                <option key={item.id} value={item.id}>
                  {`${item.name} / ${item.slug}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>检索模式</span>
            <select
              value={props.newDraft.retrievalMode}
              onChange={(event) => props.onNewDraftChange("retrievalMode", event.target.value)}
            >
              <option value="HYBRID">HYBRID</option>
              <option value="SEMANTIC">SEMANTIC</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </label>
          <label>
            <span>优先级</span>
            <input
              value={props.newDraft.priority}
              inputMode="numeric"
              onChange={(event) => props.onNewDraftChange("priority", event.target.value)}
            />
          </label>
          <label>
            <span>是否必需</span>
            <select
              value={props.newDraft.isRequired ? "true" : "false"}
              onChange={(event) => props.onNewDraftChange("isRequired", event.target.value === "true")}
            >
              <option value="false">否</option>
              <option value="true">是</option>
            </select>
          </label>
          <label>
            <span>是否启用</span>
            <select
              value={props.newDraft.enabled ? "true" : "false"}
              onChange={(event) => props.onNewDraftChange("enabled", event.target.value === "true")}
            >
              <option value="true">启用</option>
              <option value="false">停用</option>
            </select>
          </label>
        </div>
      </article>
      {props.bindings.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {props.bindings.map((item) => {
            const draft = props.drafts[item.id] || buildKnowledgeBindingDraft(item);
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
                    <div className="admin-user-row-title">{item.knowledgeBaseName || item.knowledgeBaseId}</div>
                    <div className="admin-user-row-meta">
                      {`${item.bindingType} / ${item.retrievalMode}${item.updatedAt ? ` / ${formatDateTime(item.updatedAt)}` : ""}`}
                    </div>
                  </div>
                  <div className="personal-actions" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => props.onSave(item.id)}
                      disabled={props.savingBindingId === item.id}
                    >
                      {props.savingBindingId === item.id ? "保存中..." : "保存绑定"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => props.onDelete(item.id)}
                      disabled={props.deletingBindingId === item.id}
                    >
                      {props.deletingBindingId === item.id ? "删除中..." : "删除"}
                    </button>
                  </div>
                </div>
                <div className="admin-user-filter-grid" style={{ marginBottom: 12 }}>
                  <label>
                    <span>知识库</span>
                    <input value={item.knowledgeBaseSlug ? `${item.knowledgeBaseName} / ${item.knowledgeBaseSlug}` : item.knowledgeBaseName || item.knowledgeBaseId} readOnly />
                  </label>
                  <label>
                    <span>检索模式</span>
                    <select
                      value={draft.retrievalMode}
                      onChange={(event) => props.onDraftChange(item.id, "retrievalMode", event.target.value)}
                    >
                      <option value="HYBRID">HYBRID</option>
                      <option value="SEMANTIC">SEMANTIC</option>
                      <option value="MANUAL">MANUAL</option>
                    </select>
                  </label>
                  <label>
                    <span>优先级</span>
                    <input
                      value={draft.priority}
                      inputMode="numeric"
                      onChange={(event) => props.onDraftChange(item.id, "priority", event.target.value)}
                    />
                  </label>
                  <label>
                    <span>是否必需</span>
                    <select
                      value={draft.isRequired ? "true" : "false"}
                      onChange={(event) => props.onDraftChange(item.id, "isRequired", event.target.value === "true")}
                    >
                      <option value="false">否</option>
                      <option value="true">是</option>
                    </select>
                  </label>
                  <label>
                    <span>是否启用</span>
                    <select
                      value={draft.enabled ? "true" : "false"}
                      onChange={(event) => props.onDraftChange(item.id, "enabled", event.target.value === "true")}
                    >
                      <option value="true">启用</option>
                      <option value="false">停用</option>
                    </select>
                  </label>
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

type ScriptBlockProps = {
  scripts: ScriptDetailRecord[];
  drafts: Record<string, ScriptDraftRecord>;
  newDraft: ScriptDraftRecord;
  savingScriptId: string;
  deletingScriptId: string;
  isCreating: boolean;
  emptyText: string;
  onDraftChange: (scriptId: string, field: keyof ScriptDraftRecord, value: string) => void;
  onNewDraftChange: (field: keyof ScriptDraftRecord, value: string) => void;
  onCreate: () => void;
  onSave: (scriptId: string) => void;
  onDelete: (scriptId: string) => void;
};

function ScriptBlock(props: ScriptBlockProps) {
  return (
    <section className="entity-card" style={{ padding: 16 }}>
      <div className="entity-card-head">
        <div>
          <strong>Scripts 资产</strong>
          <p className="personal-meta">{`${props.scripts.length} 条`}</p>
        </div>
        <button type="button" className="primary-button" onClick={props.onCreate} disabled={props.isCreating}>
          {props.isCreating ? "新增中..." : "新增脚本"}
        </button>
      </div>
      <article
        style={{
          border: "1px dashed rgba(59, 130, 246, 0.28)",
          borderRadius: 14,
          padding: 12,
          background: "rgba(239, 246, 255, 0.72)",
          marginBottom: 12,
        }}
      >
        <div className="admin-user-filter-grid" style={{ marginBottom: 12 }}>
          <label>
            <span>标识</span>
            <input value={props.newDraft.scriptKey} onChange={(event) => props.onNewDraftChange("scriptKey", event.target.value)} />
          </label>
          <label>
            <span>名称</span>
            <input value={props.newDraft.scriptName} onChange={(event) => props.onNewDraftChange("scriptName", event.target.value)} />
          </label>
          <label>
            <span>运行时</span>
            <select value={props.newDraft.runtime} onChange={(event) => props.onNewDraftChange("runtime", event.target.value)}>
              <option value="TS">TS</option>
              <option value="JS">JS</option>
              <option value="PYTHON">PYTHON</option>
              <option value="SHELL">SHELL</option>
            </select>
          </label>
          <label>
            <span>排序</span>
            <input value={props.newDraft.sortOrder} inputMode="numeric" onChange={(event) => props.onNewDraftChange("sortOrder", event.target.value)} />
          </label>
          <label style={{ gridColumn: "span 2" }}>
            <span>入口文件</span>
            <input value={props.newDraft.entry} onChange={(event) => props.onNewDraftChange("entry", event.target.value)} />
          </label>
        </div>
        <label className="admin-skill-field admin-skill-field--full">
          <span>参数 Schema(JSON)</span>
          <textarea
            value={props.newDraft.argsSchema}
            placeholder='例如 {"brandId":"string"}'
            onChange={(event) => props.onNewDraftChange("argsSchema", event.target.value)}
          />
        </label>
        <label className="admin-skill-field admin-skill-field--full">
          <span>使用说明</span>
          <textarea value={props.newDraft.usageNote} onChange={(event) => props.onNewDraftChange("usageNote", event.target.value)} />
        </label>
      </article>
      {props.scripts.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {props.scripts.map((item) => {
            const draft = props.drafts[item.id] || buildScriptDraft(item);
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
                    <div className="admin-user-row-title">{item.scriptName}</div>
                    <div className="admin-user-row-meta">
                      {`${item.runtime}${item.entry ? ` / ${item.entry}` : ""}${item.updatedAt ? ` / ${formatDateTime(item.updatedAt)}` : ""}`}
                    </div>
                  </div>
                  <div className="personal-actions" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => props.onSave(item.id)}
                      disabled={props.savingScriptId === item.id}
                    >
                      {props.savingScriptId === item.id ? "保存中..." : "保存脚本"}
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => props.onDelete(item.id)}
                      disabled={props.deletingScriptId === item.id}
                    >
                      {props.deletingScriptId === item.id ? "删除中..." : "删除"}
                    </button>
                  </div>
                </div>
                <div className="admin-user-filter-grid" style={{ marginBottom: 12 }}>
                  <label>
                    <span>标识</span>
                    <input value={draft.scriptKey} onChange={(event) => props.onDraftChange(item.id, "scriptKey", event.target.value)} />
                  </label>
                  <label>
                    <span>名称</span>
                    <input value={draft.scriptName} onChange={(event) => props.onDraftChange(item.id, "scriptName", event.target.value)} />
                  </label>
                  <label>
                    <span>运行时</span>
                    <select value={draft.runtime} onChange={(event) => props.onDraftChange(item.id, "runtime", event.target.value)}>
                      <option value="TS">TS</option>
                      <option value="JS">JS</option>
                      <option value="PYTHON">PYTHON</option>
                      <option value="SHELL">SHELL</option>
                    </select>
                  </label>
                  <label>
                    <span>排序</span>
                    <input value={draft.sortOrder} inputMode="numeric" onChange={(event) => props.onDraftChange(item.id, "sortOrder", event.target.value)} />
                  </label>
                  <label style={{ gridColumn: "span 2" }}>
                    <span>入口文件</span>
                    <input value={draft.entry} onChange={(event) => props.onDraftChange(item.id, "entry", event.target.value)} />
                  </label>
                </div>
                <label className="admin-skill-field admin-skill-field--full">
                  <span>参数 Schema(JSON)</span>
                  <textarea value={draft.argsSchema} onChange={(event) => props.onDraftChange(item.id, "argsSchema", event.target.value)} />
                </label>
                <label className="admin-skill-field admin-skill-field--full">
                  <span>使用说明</span>
                  <textarea value={draft.usageNote} onChange={(event) => props.onDraftChange(item.id, "usageNote", event.target.value)} />
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

function buildReferenceDraft(reference?: ReferenceDetailRecord): ReferenceDraftRecord {
  return {
    referenceKey: reference?.referenceKey || "",
    title: reference?.title || "",
    sourceType: reference?.sourceType || "URL",
    sourceUri: reference?.sourceUri || "",
    usageNote: reference?.usageNote || "",
    applicableScopes: reference?.applicableScopes?.join(" / ") || "",
    sortOrder: reference?.sortOrder !== undefined ? String(reference.sortOrder) : "100",
  };
}

function buildScriptDraft(script?: ScriptDetailRecord): ScriptDraftRecord {
  return {
    scriptKey: script?.scriptKey || "",
    scriptName: script?.scriptName || "",
    runtime: script?.runtime || "TS",
    entry: script?.entry || "",
    argsSchema: formatJsonText(script?.argsSchema || {}),
    usageNote: script?.usageNote || "",
    sortOrder: script?.sortOrder !== undefined ? String(script.sortOrder) : "100",
  };
}

function buildKnowledgeBindingDraft(binding?: KnowledgeBindingViewRecord): KnowledgeBindingDraftRecord {
  return {
    priority: binding?.priority !== undefined ? String(binding.priority) : "100",
    retrievalMode: binding?.retrievalMode || "HYBRID",
    isRequired: binding?.isRequired ?? false,
    enabled: binding?.enabled ?? true,
  };
}

function buildNewKnowledgeBindingDraft(): NewKnowledgeBindingDraftRecord {
  return {
    knowledgeBaseId: "",
    priority: "100",
    retrievalMode: "HYBRID",
    isRequired: false,
    enabled: true,
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

function formatJsonText(value: Record<string, unknown>) {
  return Object.keys(value || {}).length ? JSON.stringify(value, null, 2) : "{}";
}

function parseJsonDraft(value: string, fieldName: string) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return {};
  }
  try {
    const parsed = JSON.parse(normalized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("JSON 必须是对象");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "格式错误";
    throw new Error(`${fieldName} 解析失败：${message}`);
  }
}
