"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { flattenSkillCenterLeaves } from "../../skill-center-config";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import {
  getUserSkillEditorOptions,
  getUserSkills,
  resetUserSkill,
  updateUserSkill,
  type UserSkillEditorModelOption,
  type UserSkillEditorOptions,
  type UserSkillPromptRecord,
  type UserSkillRecord,
} from "../../../../services/personal-center";
import { buildPersonalCenterLoginPath, formatCollaboratorRoleLabel, formatDateTime, isAuthFailure } from "../route-helpers";

type SkillStatusFilter = "ALL" | UserSkillRecord["baseSkill"]["status"];
type UserSkillPromptEditDraft = {
  content: string;
  modelName: string;
  temperature: string;
  maxTokens: string;
};
type UserSkillEditDraft = {
  displayName: string;
  defaultModel: string;
  description: string;
  prompts: Record<string, UserSkillPromptEditDraft>;
};
type PromptLeafView = {
  id: string;
  primaryId: string;
  primaryLabel: string;
  sectionId: string;
  sectionLabel: string;
  leafLabel: string;
  leafDescription: string;
  skill: UserSkillRecord;
  prompt: UserSkillPromptRecord;
};
type PromptLeafGroup = {
  id: string;
  label: string;
  sections: Array<{
    id: string;
    label: string;
    items: PromptLeafView[];
  }>;
};

const adminSystemRoles = new Set(["SUPER_ADMIN", "ADMIN_OPERATOR", "FINANCE_OPERATOR", "SUPPORT_OPERATOR"]);
const skillStatusFilters: Array<{ key: SkillStatusFilter; label: string }> = [
  { key: "ALL", label: "全部状态" },
  { key: "ACTIVE", label: "启用中" },
  { key: "DRAFT", label: "草稿" },
  { key: "DISABLED", label: "已停用" },
];

export default function PersonalCenterSkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<UserSkillRecord[]>([]);
  const [skillDrafts, setSkillDrafts] = useState<Record<string, UserSkillEditDraft>>({});
  const [selectedLeafId, setSelectedLeafId] = useState("");
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [systemRole, setSystemRole] = useState<string>("USER");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SkillStatusFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [savingSkillId, setSavingSkillId] = useState("");
  const [resettingSkillId, setResettingSkillId] = useState("");
  const [editorOptions, setEditorOptions] = useState<UserSkillEditorOptions>({ modelOptions: [] });
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/skills"));
      return;
    }

    setSystemRole(session.user?.systemRole || "USER");
    void loadSkillsPage();
  }, [router]);

  const allPromptLeaves = useMemo(() => buildPromptLeafViews(skills), [skills]);
  const filteredPromptLeaves = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return allPromptLeaves.filter((item) => {
      if (statusFilter !== "ALL" && item.skill.baseSkill.status !== statusFilter) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [
        item.primaryLabel,
        item.sectionLabel,
        item.leafLabel,
        item.leafDescription,
        item.skill.baseSkill.slug,
        item.skill.baseSkill.category,
        item.skill.effectiveSkill.defaultModel,
        item.prompt.basePrompt.scene,
        item.prompt.basePrompt.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [allPromptLeaves, search, statusFilter]);
  const groupedPromptLeaves = useMemo(() => groupPromptLeafViews(filteredPromptLeaves), [filteredPromptLeaves]);

  useEffect(() => {
    if (!filteredPromptLeaves.find((item) => item.id === selectedLeafId)) {
      setSelectedLeafId(filteredPromptLeaves[0]?.id || "");
    }
  }, [filteredPromptLeaves, selectedLeafId]);

  const selectedLeaf = useMemo(
    () => filteredPromptLeaves.find((item) => item.id === selectedLeafId) ?? filteredPromptLeaves[0],
    [filteredPromptLeaves, selectedLeafId],
  );
  const selectedSkill = selectedLeaf?.skill;
  const selectedPrompt = selectedLeaf?.prompt;
  const currentDraft = selectedSkill ? skillDrafts[selectedSkill.id] : undefined;
  const currentPromptDraft = selectedPrompt && currentDraft ? currentDraft.prompts[selectedPrompt.id] : undefined;
  const isCurrentSkillDirty = selectedSkill && currentDraft ? isSkillDraftDirty(selectedSkill, currentDraft) : false;
  const isCurrentPromptDirty = selectedPrompt && currentPromptDraft
    ? isPromptDraftDirty(selectedPrompt, currentPromptDraft)
    : false;

  async function loadSkillsPage() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const [meResult, skillsResult, editorOptionsResult] = await Promise.allSettled([
      getMe(),
      getUserSkills(),
      getUserSkillEditorOptions(),
    ]);

    if (
      (meResult.status === "rejected" && isAuthFailure(meResult.reason))
      || (skillsResult.status === "rejected" && isAuthFailure(skillsResult.reason))
      || (editorOptionsResult.status === "rejected" && isAuthFailure(editorOptionsResult.reason))
    ) {
      await handleSessionExpired();
      return;
    }

    if (meResult.status === "fulfilled") {
      setBrands(meResult.value.brands);
      setCurrentBrandId(meResult.value.currentBrandId || meResult.value.brands[0]?.id || "");
      setSystemRole(meResult.value.user.systemRole || "USER");
    } else {
      setBrands([]);
      setCurrentBrandId("");
    }

    if (skillsResult.status === "fulfilled") {
      setSkills(skillsResult.value);
      setSkillDrafts(buildSkillDraftMap(skillsResult.value));
    } else {
      setSkills([]);
      setSkillDrafts({});
      setSelectedLeafId("");
      setErrorMessage(skillsResult.reason instanceof Error ? skillsResult.reason.message : "技能中心加载失败");
    }

    if (editorOptionsResult.status === "fulfilled") {
      setEditorOptions(editorOptionsResult.value);
    } else {
      setEditorOptions({ modelOptions: [] });
    }

    setIsLoading(false);
  }

  async function handleBrandSwitch(nextBrandId: string) {
    if (!nextBrandId || nextBrandId === currentBrandId) {
      return;
    }

    setIsSwitchingBrand(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await switchBrand(nextBrandId);
      setBrands(result.brands);
      setCurrentBrandId(result.currentBrandId || nextBrandId);
      await loadSkillsPage();
      setNotice("品牌工作区已切换，当前技能覆盖已同步刷新。");
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "切换品牌失败";
      setErrorMessage(`切换品牌失败：${message}`);
    } finally {
      setIsSwitchingBrand(false);
    }
  }

  async function handleSaveSkill(skillId: string) {
    const skill = skills.find((item) => item.id === skillId);
    const draft = skillDrafts[skillId];
    if (!skill || !draft) {
      return;
    }

    setSavingSkillId(skillId);
    setNotice("");
    setErrorMessage("");
    try {
      const updated = await updateUserSkill(skillId, buildUpdatePayload(skill, draft));
      setSkills((current) => upsertSkill(current, updated));
      setSkillDrafts((current) => ({
        ...current,
        [skillId]: buildSkillDraft(updated),
      }));
      setNotice(`已保存「${selectedLeaf?.leafLabel || updated.effectiveSkill.name}」所在技能下的修改。`);
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "保存技能失败";
      setErrorMessage(`保存技能失败：${message}`);
    } finally {
      setSavingSkillId("");
    }
  }

  async function handleResetSkill(skillId: string) {
    setResettingSkillId(skillId);
    setNotice("");
    setErrorMessage("");
    try {
      const resetRecord = await resetUserSkill(skillId);
      setSkills((current) => upsertSkill(current, resetRecord));
      setSkillDrafts((current) => ({
        ...current,
        [skillId]: buildSkillDraft(resetRecord),
      }));
      setNotice(`已将「${resetRecord.baseSkill.name}」恢复为后台平台基线。`);
    } catch (error) {
      if (isAuthFailure(error)) {
        await handleSessionExpired();
        return;
      }
      const message = error instanceof Error ? error.message : "重置技能失败";
      setErrorMessage(`重置技能失败：${message}`);
    } finally {
      setResettingSkillId("");
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    setNotice("");
    setErrorMessage("");
    try {
      await logoutSession();
      router.replace("/?mode=login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "退出登录失败";
      setErrorMessage(message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleSessionExpired() {
    await logoutSession();
    router.replace(buildPersonalCenterLoginPath("/personal-center/skills"));
  }

  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>技能中心</h2>
          <p className="panel-subtext">这里保存当前账号在当前品牌下的个人提示词覆盖；不改时默认跟随后台平台基线。</p>
        </div>
        <span>{filteredPromptLeaves.length} 条提示词</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className="archive-pill status-ready">用户技能库</span>
          {isLoading ? <span className="status-text">正在加载技能中心数据...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadSkillsPage()} disabled={isLoading || isSwitchingBrand || Boolean(savingSkillId)}>
          刷新技能
        </button>
        <label className="field" style={{ minWidth: 220 }}>
          <span>当前品牌</span>
          <select
            value={currentBrandId}
            onChange={(event) => void handleBrandSwitch(event.target.value)}
            disabled={!brands.length || isLoading || isSwitchingBrand || isLoggingOut}
          >
            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.brandName} · {formatCollaboratorRoleLabel(item.role)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="secondary-button" onClick={() => void handleLogout()} disabled={isLoggingOut || isSwitchingBrand}>
          {isLoggingOut ? "退出中..." : "退出登录"}
        </button>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/personal-center" className="secondary-button">
          返回个人中心概览
        </Link>
        <Link href="/xiaohongshu" className="secondary-button">
          去小红书工作台
        </Link>
        {adminSystemRoles.has(systemRole) ? (
          <Link href="/admin" className="primary-button">
            去后台技能中心
          </Link>
        ) : null}
      </div>

      <div className="personal-toolbar" style={{ alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <label className="field personal-search" style={{ minWidth: 240 }}>
          <span>搜索提示词</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索分类、提示词名称、场景、slug、模型"
          />
        </label>
        <div className="workspace-status">
          <span className="status-text">当前品牌：{currentBrand?.brandName || "未绑定品牌"}</span>
        </div>
      </div>

      <div className="tab-switcher" aria-label="技能状态筛选" style={{ marginTop: 16 }}>
        {skillStatusFilters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`tab-button ${statusFilter === item.key ? "is-active" : ""}`}
            onClick={() => setStatusFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 16, marginTop: 16 }}>
        <div className="personal-list">
          {groupedPromptLeaves.map((group) => (
            <article key={group.id} className="entity-card personal-card">
              <div className="entity-card-head">
                <div>
                  <strong>{group.label}</strong>
                  <p className="personal-meta">{group.sections.reduce((sum, section) => sum + section.items.length, 0)} 条提示词</p>
                </div>
              </div>
              <div className="personal-list">
                {group.sections.map((section) => (
                  <div key={section.id}>
                    <p className="personal-meta" style={{ marginBottom: 8 }}>{section.label}</p>
                    <div className="personal-list">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="entity-card personal-card"
                          onClick={() => setSelectedLeafId(item.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: item.id === selectedLeaf?.id ? "1px solid rgba(30, 64, 175, 0.45)" : undefined,
                            background: item.id === selectedLeaf?.id ? "rgba(239, 246, 255, 0.8)" : undefined,
                          }}
                        >
                          <div className="entity-card-head">
                            <div>
                              <strong>{item.leafLabel}</strong>
                              <p className="personal-meta">{item.prompt.basePrompt.scene}</p>
                            </div>
                            <span className={`archive-pill ${item.prompt.isCustomized ? "status-in_progress" : "status-ready"}`}>
                              {item.prompt.isCustomized ? "已自定义" : "跟随平台"}
                            </span>
                          </div>
                          <div className="personal-grid">
                            <div>
                              <span>执行技能</span>
                              <strong>{item.skill.effectiveSkill.name}</strong>
                            </div>
                            <div>
                              <span>模型</span>
                              <strong>{formatScopedModelLabel(item.prompt.effectivePrompt.modelName, editorOptions.modelOptions)}</strong>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
          {!groupedPromptLeaves.length ? <div className="empty-canvas-box">暂无匹配提示词，请调整搜索词或状态筛选。</div> : null}
        </div>

        {selectedLeaf && selectedSkill && selectedPrompt && currentPromptDraft ? (
          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>{selectedLeaf.leafLabel}</strong>
                <p className="personal-meta">
                  {selectedLeaf.primaryLabel} · {selectedLeaf.sectionLabel} · {selectedSkill.baseSkill.slug}
                </p>
              </div>
              <span className={`archive-pill ${skillStatusClassMap[selectedSkill.baseSkill.status]}`}>
                {selectedSkill.baseSkill.status}
              </span>
            </div>

            <p className="personal-meta" style={{ marginBottom: 16 }}>
              {selectedLeaf.leafDescription}
            </p>

            <div className="personal-actions" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSaveSkill(selectedSkill.id)}
                disabled={!isCurrentSkillDirty || savingSkillId === selectedSkill.id || resettingSkillId === selectedSkill.id}
              >
                {savingSkillId === selectedSkill.id ? "保存中..." : "保存当前技能修改"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void handleResetSkill(selectedSkill.id)}
                disabled={savingSkillId === selectedSkill.id || resettingSkillId === selectedSkill.id}
              >
                {resettingSkillId === selectedSkill.id ? "重置中..." : "恢复平台基线"}
              </button>
            </div>

            <p className="personal-meta" style={{ marginBottom: 16 }}>
              当前正在编辑 1 条提示词；保存时会一并提交该执行技能下所有已修改提示词。当前提示词{isCurrentPromptDirty ? "已" : "未"}发生改动。
            </p>

            <div className="personal-grid" style={{ marginBottom: 12 }}>
              <div>
                <span>所属分类</span>
                <strong>{selectedLeaf.primaryLabel} / {selectedLeaf.sectionLabel}</strong>
              </div>
              <div>
                <span>执行技能</span>
                <strong>{selectedSkill.effectiveSkill.name}</strong>
              </div>
              <div>
                <span>提示词场景</span>
                <strong>{selectedPrompt.basePrompt.scene}</strong>
              </div>
              <div>
                <span>最近更新时间</span>
                <strong>{formatDateTime(selectedPrompt.effectivePrompt.updatedAt)}</strong>
              </div>
            </div>

            <div className="personal-grid" style={{ marginBottom: 12 }}>
              <div>
                <span>平台模型</span>
                <strong>{formatScopedModelLabel(selectedPrompt.basePrompt.modelName, editorOptions.modelOptions)}</strong>
              </div>
              <div>
                <span>平台温度</span>
                <strong>{selectedPrompt.basePrompt.temperature}</strong>
              </div>
              <div>
                <span>平台 Tokens</span>
                <strong>{selectedPrompt.basePrompt.maxTokens}</strong>
              </div>
              <div>
                <span>同技能提示词数</span>
                <strong>{selectedSkill.prompts.length}</strong>
              </div>
            </div>

            <div className="personal-list">
              <label className="field">
                <span>提示词模型</span>
                <select
                  value={currentPromptDraft.modelName}
                  onChange={(event) => updatePromptDraftField(selectedSkill.id, selectedPrompt.id, "modelName", event.target.value, setSkillDrafts)}
                >
                  {buildModelOptions(editorOptions.modelOptions, selectedPrompt.basePrompt.modelName, currentPromptDraft.modelName).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small className="personal-meta">
                  默认跟随后台当前模型：{formatScopedModelLabel(selectedPrompt.basePrompt.modelName, editorOptions.modelOptions)}
                </small>
              </label>

              <div className="personal-grid">
                <label className="field">
                  <span>温度</span>
                  <input
                    type="number"
                    step="0.1"
                    value={currentPromptDraft.temperature}
                    onChange={(event) => updatePromptDraftField(selectedSkill.id, selectedPrompt.id, "temperature", event.target.value, setSkillDrafts)}
                    placeholder={String(selectedPrompt.basePrompt.temperature)}
                  />
                </label>
                <label className="field">
                  <span>Max Tokens</span>
                  <input
                    type="number"
                    step="1"
                    value={currentPromptDraft.maxTokens}
                    onChange={(event) => updatePromptDraftField(selectedSkill.id, selectedPrompt.id, "maxTokens", event.target.value, setSkillDrafts)}
                    placeholder={String(selectedPrompt.basePrompt.maxTokens)}
                  />
                </label>
              </div>

              <label className="field">
                <span>提示词内容</span>
                <textarea
                  value={currentPromptDraft.content}
                  onChange={(event) => updatePromptDraftField(selectedSkill.id, selectedPrompt.id, "content", event.target.value, setSkillDrafts)}
                  rows={14}
                  placeholder={selectedPrompt.basePrompt.content}
                />
                <small className="personal-meta">
                  保存后只覆盖你当前品牌下的个人版本；点击“恢复平台基线”会恢复该执行技能下的提示词配置。
                </small>
              </label>
            </div>
          </article>
        ) : (
          <div className="empty-canvas-box">请选择左侧提示词查看并编辑个人版本。</div>
        )}
      </div>
    </section>
  );
}

const skillStatusClassMap: Record<UserSkillRecord["baseSkill"]["status"], string> = {
  ACTIVE: "status-ready",
  DRAFT: "status-in_progress",
  DISABLED: "status-paused",
};

function buildPromptLeafViews(skills: UserSkillRecord[]) {
  const configuredLeaves = flattenSkillCenterLeaves();
  const consumedPromptKeys = new Set<string>();
  const views: PromptLeafView[] = [];

  configuredLeaves.forEach((leaf) => {
    const skill = skills.find((item) => item.baseSkill.slug === leaf.skillSlug);
    const prompt = skill?.prompts.find((item) => item.basePrompt.scene === leaf.promptScene);
    if (!skill || !prompt) {
      return;
    }
    consumedPromptKeys.add(`${skill.id}::${prompt.id}`);
    views.push({
      id: leaf.id,
      primaryId: leaf.primaryId,
      primaryLabel: leaf.primaryLabel,
      sectionId: leaf.sectionId,
      sectionLabel: leaf.sectionLabel,
      leafLabel: leaf.label,
      leafDescription: leaf.description,
      skill,
      prompt,
    });
  });

  skills.forEach((skill) => {
    skill.prompts.forEach((prompt) => {
      const key = `${skill.id}::${prompt.id}`;
      if (consumedPromptKeys.has(key)) {
        return;
      }
      views.push({
        id: `fallback-${skill.id}-${prompt.id}`,
        primaryId: `fallback-${skill.baseSkill.category}`,
        primaryLabel: skill.baseSkill.category || "未分类",
        sectionId: `fallback-section-${skill.id}`,
        sectionLabel: skill.effectiveSkill.name,
        leafLabel: prompt.basePrompt.name,
        leafDescription: prompt.basePrompt.scene,
        skill,
        prompt,
      });
    });
  });

  return views;
}

function groupPromptLeafViews(items: PromptLeafView[]) {
  const groups = new Map<string, PromptLeafGroup>();
  items.forEach((item) => {
    if (!groups.has(item.primaryId)) {
      groups.set(item.primaryId, {
        id: item.primaryId,
        label: item.primaryLabel,
        sections: [],
      });
    }
    const group = groups.get(item.primaryId)!;
    let section = group.sections.find((entry) => entry.id === item.sectionId);
    if (!section) {
      section = {
        id: item.sectionId,
        label: item.sectionLabel,
        items: [],
      };
      group.sections.push(section);
    }
    section.items.push(item);
  });
  return Array.from(groups.values());
}

function buildSkillDraftMap(skills: UserSkillRecord[]) {
  return Object.fromEntries(skills.map((skill) => [skill.id, buildSkillDraft(skill)]));
}

function buildSkillDraft(skill: UserSkillRecord): UserSkillEditDraft {
  return {
    displayName: skill.effectiveSkill.name,
    defaultModel: skill.effectiveSkill.defaultModel,
    description: skill.effectiveSkill.description,
    prompts: Object.fromEntries(skill.prompts.map((prompt) => [
      prompt.id,
      {
        content: prompt.effectivePrompt.content,
        modelName: prompt.effectivePrompt.modelName,
        temperature: String(prompt.effectivePrompt.temperature ?? ""),
        maxTokens: String(prompt.effectivePrompt.maxTokens ?? ""),
      },
    ])),
  };
}

function updatePromptDraftField(
  skillId: string,
  promptId: string,
  field: keyof UserSkillPromptEditDraft,
  value: string,
  setSkillDrafts: React.Dispatch<React.SetStateAction<Record<string, UserSkillEditDraft>>>,
) {
  setSkillDrafts((current) => ({
    ...current,
    [skillId]: {
      ...current[skillId],
      prompts: {
        ...current[skillId]?.prompts,
        [promptId]: {
          ...current[skillId]?.prompts?.[promptId],
          [field]: value,
        },
      },
    },
  }));
}

function isPromptDraftDirty(prompt: UserSkillPromptRecord, draft: UserSkillPromptEditDraft) {
  return JSON.stringify({
    content: normalizeComparableText(draft.content),
    modelName: normalizeComparableText(draft.modelName),
    temperature: normalizeComparableNumber(draft.temperature),
    maxTokens: normalizeComparableInt(draft.maxTokens),
  }) !== JSON.stringify({
    content: normalizeComparableText(prompt.effectivePrompt.content),
    modelName: normalizeComparableText(prompt.effectivePrompt.modelName),
    temperature: Number(prompt.effectivePrompt.temperature ?? 0),
    maxTokens: Math.round(Number(prompt.effectivePrompt.maxTokens ?? 0)),
  });
}

function isSkillDraftDirty(skill: UserSkillRecord, draft: UserSkillEditDraft) {
  return serializeComparableDraft(skill, draft) !== serializeComparableDraft(skill, buildSkillDraft(skill));
}

function buildModelOptions(modelOptions: UserSkillEditorModelOption[], ...currentValues: Array<string | undefined>) {
  const optionsByValue = new Map(modelOptions.map((item) => [item.value, item]));
  for (const rawValue of currentValues) {
    const value = String(rawValue || "").trim();
    if (!value || optionsByValue.has(value)) {
      continue;
    }
    optionsByValue.set(value, buildFallbackModelOption(value));
  }
  return Array.from(optionsByValue.values());
}

function formatScopedModelLabel(value: string, modelOptions: UserSkillEditorModelOption[]) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "-";
  }
  return modelOptions.find((item) => item.value === normalized)?.label || buildFallbackModelOption(normalized).label;
}

function buildFallbackModelOption(value: string): UserSkillEditorModelOption {
  const normalized = String(value || "").trim();
  const separatorIndex = normalized.indexOf("::");
  if (separatorIndex <= 0) {
    return {
      value: normalized,
      label: normalized,
      modelName: normalized,
      providerId: "",
      providerName: "",
    };
  }
  const providerId = normalized.slice(0, separatorIndex).trim();
  const modelName = normalized.slice(separatorIndex + 2).trim();
  return {
    value: normalized,
    label: `${modelName} · ${providerId}`,
    modelName,
    providerId,
    providerName: providerId,
  };
}

function buildUpdatePayload(skill: UserSkillRecord, draft: UserSkillEditDraft) {
  const promptOverrides = skill.prompts
    .map((prompt) => {
      const promptDraft = draft.prompts[prompt.id];
      const override = {
        promptId: prompt.id,
        content: toNullableText(promptDraft?.content, prompt.basePrompt.content),
        modelName: toNullableText(promptDraft?.modelName, prompt.basePrompt.modelName),
        temperature: toNullableNumber(promptDraft?.temperature, prompt.basePrompt.temperature),
        maxTokens: toNullableInt(promptDraft?.maxTokens, prompt.basePrompt.maxTokens),
      };
      const hasEffectiveOverride = Object.entries(override).some(([key, value]) => key !== "promptId" && value !== null);
      return hasEffectiveOverride ? override : undefined;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  return {
    displayName: toNullableText(draft.displayName, skill.baseSkill.name),
    defaultModel: toNullableText(draft.defaultModel, skill.baseSkill.defaultModel),
    description: toNullableText(draft.description, skill.baseSkill.description),
    promptOverrides,
  };
}

function upsertSkill(current: UserSkillRecord[], next: UserSkillRecord) {
  return current.map((item) => (item.id === next.id ? next : item));
}

function serializeComparableDraft(skill: UserSkillRecord, draft: UserSkillEditDraft) {
  return JSON.stringify({
    displayName: normalizeComparableText(draft.displayName),
    defaultModel: normalizeComparableText(draft.defaultModel),
    description: normalizeComparableText(draft.description),
    prompts: skill.prompts
      .map((prompt) => ({
        id: prompt.id,
        content: normalizeComparableText(draft.prompts[prompt.id]?.content),
        modelName: normalizeComparableText(draft.prompts[prompt.id]?.modelName),
        temperature: normalizeComparableNumber(draft.prompts[prompt.id]?.temperature),
        maxTokens: normalizeComparableInt(draft.prompts[prompt.id]?.maxTokens),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

function normalizeComparableText(value: string | undefined) {
  return String(value || "").trim();
}

function normalizeComparableNumber(value: string | undefined) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  const normalized = Number(text);
  return Number.isFinite(normalized) ? normalized : "";
}

function normalizeComparableInt(value: string | undefined) {
  const normalized = normalizeComparableNumber(value);
  if (normalized === "") {
    return "";
  }
  return Math.round(normalized);
}

function toNullableText(value: string | undefined, baseValue: string | undefined) {
  const normalized = normalizeComparableText(value);
  const normalizedBase = normalizeComparableText(baseValue);
  if (!normalized || normalized === normalizedBase) {
    return null;
  }
  return normalized;
}

function toNullableNumber(value: string | undefined, baseValue: number | undefined) {
  const normalized = normalizeComparableNumber(value);
  if (normalized === "" || normalized === Number(baseValue || 0)) {
    return null;
  }
  return normalized;
}

function toNullableInt(value: string | undefined, baseValue: number | undefined) {
  const normalized = normalizeComparableInt(value);
  if (normalized === "" || normalized === Math.round(Number(baseValue || 0))) {
    return null;
  }
  return normalized;
}
