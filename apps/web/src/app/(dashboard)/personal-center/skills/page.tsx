"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import { resetUserSkill, updateUserSkill, getUserSkills, type UserSkillRecord } from "../../../../services/personal-center";
import { buildPersonalCenterLoginPath, formatDateTime, isAuthFailure } from "../route-helpers";

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
  const [selectedSkillId, setSelectedSkillId] = useState("");
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

  useEffect(() => {
    if (!selectedSkillId && skills.length) {
      setSelectedSkillId(skills[0].id);
    }
  }, [selectedSkillId, skills]);

  const filteredSkills = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...skills]
      .sort(sortBySkillUpdatedAtDesc)
      .filter((item) => statusFilter === "ALL" || item.baseSkill.status === statusFilter)
      .filter((item) => {
        if (!keyword) {
          return true;
        }
        return [
          item.effectiveSkill.name,
          item.baseSkill.name,
          item.baseSkill.slug,
          item.baseSkill.category,
          item.effectiveSkill.defaultModel,
          item.baseSkill.provider,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      });
  }, [search, skills, statusFilter]);

  useEffect(() => {
    if (!filteredSkills.find((item) => item.id === selectedSkillId)) {
      setSelectedSkillId(filteredSkills[0]?.id || "");
    }
  }, [filteredSkills, selectedSkillId]);

  const selectedSkill = useMemo(
    () => filteredSkills.find((item) => item.id === selectedSkillId) ?? filteredSkills[0],
    [filteredSkills, selectedSkillId],
  );
  const currentDraft = selectedSkill ? skillDrafts[selectedSkill.id] : undefined;
  const isCurrentSkillDirty = selectedSkill && currentDraft ? isSkillDraftDirty(selectedSkill, currentDraft) : false;

  async function loadSkillsPage() {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const [meResult, skillsResult] = await Promise.allSettled([getMe(), getUserSkills()]);

    if (
      (meResult.status === "rejected" && isAuthFailure(meResult.reason))
      || (skillsResult.status === "rejected" && isAuthFailure(skillsResult.reason))
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
      setSelectedSkillId((current) => current || skillsResult.value[0]?.id || "");
    } else {
      setSkills([]);
      setSkillDrafts({});
      setSelectedSkillId("");
      setErrorMessage(skillsResult.reason instanceof Error ? skillsResult.reason.message : "技能中心加载失败");
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
      setNotice(`已保存「${updated.effectiveSkill.name}」的个人技能配置。`);
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
          <p className="panel-subtext">这里保存当前账号在当前品牌下的个人技能覆盖；不改时默认跟随后台平台基线。</p>
        </div>
        <span>{filteredSkills.length} 个技能</span>
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
                {item.brandName} · {item.role}
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
          <span>搜索技能</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索技能名称、slug、分类、模型"
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)", gap: 16, marginTop: 16 }}>
        <div className="personal-list">
          {filteredSkills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              className="entity-card personal-card"
              onClick={() => setSelectedSkillId(skill.id)}
              style={{
                width: "100%",
                textAlign: "left",
                border: skill.id === selectedSkill?.id ? "1px solid rgba(30, 64, 175, 0.45)" : undefined,
                background: skill.id === selectedSkill?.id ? "rgba(239, 246, 255, 0.8)" : undefined,
              }}
            >
              <div className="entity-card-head">
                <div>
                  <strong>{skill.effectiveSkill.name}</strong>
                  <p className="personal-meta">{skill.baseSkill.slug}</p>
                </div>
                <span className={`archive-pill ${skill.isCustomized ? "status-in_progress" : "status-ready"}`}>
                  {skill.isCustomized ? "已自定义" : "跟随平台"}
                </span>
              </div>
              <div className="personal-grid">
                <div>
                  <span>分类</span>
                  <strong>{skill.baseSkill.category}</strong>
                </div>
                <div>
                  <span>默认模型</span>
                  <strong>{skill.effectiveSkill.defaultModel}</strong>
                </div>
                <div>
                  <span>提示词</span>
                  <strong>{skill.prompts.length}</strong>
                </div>
                <div>
                  <span>最近同步</span>
                  <strong>{formatDateTime(skill.effectiveSkill.updatedAt)}</strong>
                </div>
              </div>
            </button>
          ))}
          {!filteredSkills.length ? <div className="empty-canvas-box">暂无匹配技能，请调整搜索词或状态筛选。</div> : null}
        </div>

        {selectedSkill && currentDraft ? (
          <article className="entity-card personal-card">
            <div className="entity-card-head">
              <div>
                <strong>{selectedSkill.effectiveSkill.name}</strong>
                <p className="personal-meta">
                  {selectedSkill.baseSkill.slug} · {selectedSkill.baseSkill.provider} · {selectedSkill.baseSkill.category}
                </p>
              </div>
              <span className={`archive-pill ${skillStatusClassMap[selectedSkill.baseSkill.status]}`}>
                {selectedSkill.baseSkill.status}
              </span>
            </div>

            <div className="personal-grid" style={{ marginBottom: 16 }}>
              <div>
                <span>平台技能名</span>
                <strong>{selectedSkill.baseSkill.name}</strong>
              </div>
              <div>
                <span>点数成本</span>
                <strong>{selectedSkill.baseSkill.pointsCost}</strong>
              </div>
              <div>
                <span>个人状态</span>
                <strong>{selectedSkill.isCustomized ? "已保存个人覆盖" : "默认跟随平台"}</strong>
              </div>
              <div>
                <span>最近重置</span>
                <strong>{formatDateTime(selectedSkill.lastResetAt)}</strong>
              </div>
            </div>

            <div className="personal-list">
              <label className="field">
                <span>技能名称</span>
                <input
                  value={currentDraft.displayName}
                  onChange={(event) => updateSkillDraftField(selectedSkill.id, "displayName", event.target.value, setSkillDrafts)}
                  placeholder={selectedSkill.baseSkill.name}
                />
                <small className="personal-meta">不改就沿用平台值：{selectedSkill.baseSkill.name}</small>
              </label>

              <label className="field">
                <span>默认模型</span>
                <input
                  value={currentDraft.defaultModel}
                  onChange={(event) => updateSkillDraftField(selectedSkill.id, "defaultModel", event.target.value, setSkillDrafts)}
                  placeholder={selectedSkill.baseSkill.defaultModel}
                />
                <small className="personal-meta">不改就沿用平台值：{selectedSkill.baseSkill.defaultModel}</small>
              </label>

              <label className="field">
                <span>技能说明</span>
                <textarea
                  value={currentDraft.description}
                  onChange={(event) => updateSkillDraftField(selectedSkill.id, "description", event.target.value, setSkillDrafts)}
                  rows={4}
                  placeholder={selectedSkill.baseSkill.description}
                />
                <small className="personal-meta">不改就沿用平台说明；后台修改平台说明后，未自定义字段会自动跟随。</small>
              </label>
            </div>

            <div className="personal-actions" style={{ marginTop: 16, marginBottom: 16 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleSaveSkill(selectedSkill.id)}
                disabled={!isCurrentSkillDirty || savingSkillId === selectedSkill.id || resettingSkillId === selectedSkill.id}
              >
                {savingSkillId === selectedSkill.id ? "保存中..." : "保存到我的技能库"}
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

            <div className="personal-list">
              {selectedSkill.prompts.map((prompt) => {
                const promptDraft = currentDraft.prompts[prompt.id];
                return (
                  <article key={prompt.id} className="entity-card personal-card">
                    <div className="entity-card-head">
                      <div>
                        <strong>{prompt.basePrompt.name}</strong>
                        <p className="personal-meta">{prompt.basePrompt.scene}</p>
                      </div>
                      <span className={`archive-pill ${prompt.isCustomized ? "status-in_progress" : "status-ready"}`}>
                        {prompt.isCustomized ? "提示词已自定义" : "提示词跟随平台"}
                      </span>
                    </div>

                    <div className="personal-grid" style={{ marginBottom: 12 }}>
                      <div>
                        <span>平台模型</span>
                        <strong>{prompt.basePrompt.modelName}</strong>
                      </div>
                      <div>
                        <span>平台温度</span>
                        <strong>{prompt.basePrompt.temperature}</strong>
                      </div>
                      <div>
                        <span>平台 Tokens</span>
                        <strong>{prompt.basePrompt.maxTokens}</strong>
                      </div>
                      <div>
                        <span>最近更新时间</span>
                        <strong>{formatDateTime(prompt.effectivePrompt.updatedAt)}</strong>
                      </div>
                    </div>

                    <div className="personal-list">
                      <label className="field">
                        <span>提示词模型</span>
                        <input
                          value={promptDraft.modelName}
                          onChange={(event) => updatePromptDraftField(selectedSkill.id, prompt.id, "modelName", event.target.value, setSkillDrafts)}
                          placeholder={prompt.basePrompt.modelName}
                        />
                      </label>

                      <div className="personal-grid">
                        <label className="field">
                          <span>温度</span>
                          <input
                            type="number"
                            step="0.1"
                            value={promptDraft.temperature}
                            onChange={(event) => updatePromptDraftField(selectedSkill.id, prompt.id, "temperature", event.target.value, setSkillDrafts)}
                            placeholder={String(prompt.basePrompt.temperature)}
                          />
                        </label>
                        <label className="field">
                          <span>Max Tokens</span>
                          <input
                            type="number"
                            step="1"
                            value={promptDraft.maxTokens}
                            onChange={(event) => updatePromptDraftField(selectedSkill.id, prompt.id, "maxTokens", event.target.value, setSkillDrafts)}
                            placeholder={String(prompt.basePrompt.maxTokens)}
                          />
                        </label>
                      </div>

                      <label className="field">
                        <span>提示词内容</span>
                        <textarea
                          value={promptDraft.content}
                          onChange={(event) => updatePromptDraftField(selectedSkill.id, prompt.id, "content", event.target.value, setSkillDrafts)}
                          rows={12}
                          placeholder={prompt.basePrompt.content}
                        />
                        <small className="personal-meta">保存后只覆盖你当前品牌下的个人版本；点击“恢复平台基线”会回到后台默认提示词。</small>
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        ) : (
          <div className="empty-canvas-box">请选择左侧技能查看并编辑个人版本。</div>
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

function sortBySkillUpdatedAtDesc(a: UserSkillRecord, b: UserSkillRecord) {
  return new Date(b.effectiveSkill.updatedAt).getTime() - new Date(a.effectiveSkill.updatedAt).getTime();
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

function updateSkillDraftField(
  skillId: string,
  field: keyof Omit<UserSkillEditDraft, "prompts">,
  value: string,
  setSkillDrafts: React.Dispatch<React.SetStateAction<Record<string, UserSkillEditDraft>>>,
) {
  setSkillDrafts((current) => ({
    ...current,
    [skillId]: {
      ...current[skillId],
      [field]: value,
    },
  }));
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

function isSkillDraftDirty(skill: UserSkillRecord, draft: UserSkillEditDraft) {
  return serializeComparableDraft(skill, draft) !== serializeComparableDraft(skill, buildSkillDraft(skill));
}

function buildUpdatePayload(skill: UserSkillRecord, draft: UserSkillEditDraft) {
  return {
    displayName: toNullableText(draft.displayName, skill.baseSkill.name),
    defaultModel: toNullableText(draft.defaultModel, skill.baseSkill.defaultModel),
    description: toNullableText(draft.description, skill.baseSkill.description),
    promptOverrides: skill.prompts.map((prompt) => {
      const promptDraft = draft.prompts[prompt.id];
      return {
        promptId: prompt.id,
        content: toNullableText(promptDraft?.content, prompt.basePrompt.content),
        modelName: toNullableText(promptDraft?.modelName, prompt.basePrompt.modelName),
        temperature: toNullableNumber(promptDraft?.temperature, prompt.basePrompt.temperature),
        maxTokens: toNullableInt(promptDraft?.maxTokens, prompt.basePrompt.maxTokens),
      };
    }),
  };
}

function upsertSkill(current: UserSkillRecord[], next: UserSkillRecord) {
  return current
    .map((item) => (item.id === next.id ? next : item))
    .sort(sortBySkillUpdatedAtDesc);
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
