"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMe, logout as logoutSession, readAuthSession, switchBrand, type MeResponse } from "../../../../services/auth";
import {
  getPromptTemplates,
  getSkillConfigs,
  promptTemplateSeed,
  skillConfigSeed,
  type PromptTemplateRecord,
  type SkillConfigRecord,
} from "../../../../services/admin";
import { buildPersonalCenterLoginPath, formatDateTime, isAuthFailure } from "../route-helpers";

type SkillStatusFilter = "ALL" | SkillConfigRecord["status"];

const adminSystemRoles = new Set(["SUPER_ADMIN", "ADMIN_OPERATOR", "FINANCE_OPERATOR", "SUPPORT_OPERATOR"]);
const skillStatusFilters: Array<{ key: SkillStatusFilter; label: string }> = [
  { key: "ALL", label: "全部状态" },
  { key: "ACTIVE", label: "启用中" },
  { key: "DRAFT", label: "草稿" },
  { key: "DISABLED", label: "已停用" },
];

export default function PersonalCenterSkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<SkillConfigRecord[]>(skillConfigSeed);
  const [prompts, setPrompts] = useState<PromptTemplateRecord[]>(promptTemplateSeed);
  const [brands, setBrands] = useState<MeResponse["brands"]>([]);
  const [currentBrandId, setCurrentBrandId] = useState("");
  const [systemRole, setSystemRole] = useState<string>("USER");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SkillStatusFilter>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBrand, setIsSwitchingBrand] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "seed">("seed");

  useEffect(() => {
    const session = readAuthSession();
    if (!session?.accessToken && !session?.refreshToken) {
      router.replace(buildPersonalCenterLoginPath("/personal-center/skills"));
      return;
    }

    setSystemRole(session.user?.systemRole || "USER");
    void loadSkillsPage(session.user?.systemRole || "USER");
  }, [router]);

  async function loadSkillsPage(nextSystemRole = systemRole) {
    setIsLoading(true);
    setNotice("");
    setErrorMessage("");

    const canReadLiveRegistry = adminSystemRoles.has(nextSystemRole);
    const requests = canReadLiveRegistry ? Promise.allSettled([getMe(), getSkillConfigs(), getPromptTemplates()]) : Promise.allSettled([getMe()]);
    const results = await requests;
    const meResult = results[0];

    if (meResult.status === "rejected" && isAuthFailure(meResult.reason)) {
      await handleSessionExpired();
      return;
    }

    if (meResult.status === "fulfilled") {
      setBrands(meResult.value.brands);
      setCurrentBrandId(meResult.value.currentBrandId || meResult.value.brands[0]?.id || "");
    } else {
      setBrands([]);
      setCurrentBrandId("");
    }

    if (canReadLiveRegistry) {
      const skillsResult = results[1];
      const promptsResult = results[2];

      if (skillsResult?.status === "fulfilled" && promptsResult?.status === "fulfilled") {
        setSkills(skillsResult.value);
        setPrompts(promptsResult.value);
        setDataSource(meResult.status === "fulfilled" ? "api" : "seed");
      } else {
        setSkills(skillConfigSeed);
        setPrompts(promptTemplateSeed);
        setDataSource("seed");
        setErrorMessage("技能注册表暂不可用，当前展示的是平台技能快照。");
      }
    } else {
      setSkills(skillConfigSeed);
      setPrompts(promptTemplateSeed);
      setDataSource("seed");
      setNotice("当前账号先展示平台技能快照；个人技能覆盖、保存与重置将在下一阶段接入。");
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
      setNotice("品牌工作区已切换，技能中心已刷新当前上下文。");
      await loadSkillsPage(systemRole);
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

  const filteredSkills = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return [...skills]
      .sort(sortBySkillUpdatedAtDesc)
      .filter((item) => statusFilter === "ALL" || item.status === statusFilter)
      .filter((item) =>
        !keyword
        || item.name.toLowerCase().includes(keyword)
        || item.slug.toLowerCase().includes(keyword)
        || item.category.toLowerCase().includes(keyword)
        || item.provider.toLowerCase().includes(keyword)
        || item.defaultModel.toLowerCase().includes(keyword),
      );
  }, [search, skills, statusFilter]);

  const groupedSkills = useMemo(() => groupSkillsByCategory(filteredSkills), [filteredSkills]);
  const currentBrand = useMemo(
    () => brands.find((item) => item.id === currentBrandId) ?? brands[0],
    [brands, currentBrandId],
  );
  const summary = useMemo(
    () => ({
      total: filteredSkills.length,
      active: filteredSkills.filter((item) => item.status === "ACTIVE").length,
      draft: filteredSkills.filter((item) => item.status === "DRAFT").length,
      categories: new Set(filteredSkills.map((item) => item.category)).size,
      promptCount: prompts.filter((item) => item.status === "ACTIVE").length,
    }),
    [filteredSkills, prompts],
  );

  return (
    <section className="panel personal-center-panel">
      <div className="panel-header">
        <div>
          <h2>技能中心</h2>
          <p className="panel-subtext">查看当前账号可使用的平台技能基线，先承接“浏览、对比、确认范围”，个人覆盖、保存与重置能力后续继续补齐。</p>
        </div>
        <span>{summary.total} 个技能</span>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        <div className="workspace-status">
          <span className={`archive-pill ${dataSource === "api" ? "status-ready" : "status-in_progress"}`}>
            {dataSource === "api" ? "平台注册表" : "平台快照"}
          </span>
          {isLoading ? <span className="status-text">正在加载技能中心数据...</span> : null}
          {!isLoading && notice ? <span className="status-text success-text">{notice}</span> : null}
          {!isLoading && errorMessage ? <span className="status-text error-text">{errorMessage}</span> : null}
        </div>
        <button type="button" className="secondary-button" onClick={() => void loadSkillsPage(systemRole)} disabled={isLoading || isSwitchingBrand}>
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

      <div className="card-grid" style={{ marginBottom: 16 }}>
        <article className="metric-card">
          <span>当前品牌上下文</span>
          <strong>{currentBrand?.brandName || "未绑定品牌"}</strong>
          <p>后续个人技能覆盖仍会跟随当前品牌和当前用户上下文共同生效。</p>
        </article>
        <article className="metric-card">
          <span>启用中技能</span>
          <strong>{summary.active}</strong>
          <p>代表当前平台链路中已开放调用的技能配置。</p>
        </article>
        <article className="metric-card">
          <span>草稿技能</span>
          <strong>{summary.draft}</strong>
          <p>用于提示哪些平台能力仍处于测试、收敛或未正式开放阶段。</p>
        </article>
        <article className="metric-card">
          <span>分类 / 提示词</span>
          <strong>{summary.categories} / {summary.promptCount}</strong>
          <p>按当前可见技能统计分类数，并展示当前激活的提示词模板数量。</p>
        </article>
      </div>

      <div className="personal-actions" style={{ marginBottom: 16 }}>
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

      <div className="entity-card personal-card" style={{ marginBottom: 16 }}>
        <div className="entity-card-head">
          <div>
            <strong>本页边界</strong>
            <p className="personal-meta">这一版先解决用户可见性和技能范围确认，不在本轮扩 `user-skills`、个人提示词覆盖或重置日志。</p>
          </div>
          <span className="archive-pill status-in_progress">MVP</span>
        </div>
        <div className="personal-grid">
          <div>
            <span>当前已支持</span>
            <strong>平台技能浏览</strong>
          </div>
          <div>
            <span>当前未支持</span>
            <strong>个人覆盖保存</strong>
          </div>
          <div>
            <span>下一阶段</span>
            <strong>`GET/PATCH /user-skills`</strong>
          </div>
          <div>
            <span>当前来源</span>
            <strong>{dataSource === "api" ? "后台技能注册表" : "平台注册表快照"}</strong>
          </div>
        </div>
      </div>

      <div className="personal-toolbar" style={{ alignItems: "flex-end" }}>
        <label className="field personal-search">
          <span>搜索技能</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索技能名称、slug、分类、Provider、模型"
          />
        </label>
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

      <div className="personal-list" style={{ marginTop: 16 }}>
        {groupedSkills.map(([category, items]) => (
          <article className="entity-card personal-card" key={category}>
            <div className="entity-card-head">
              <div>
                <strong>{category}</strong>
                <p className="personal-meta">当前分类下共有 {items.length} 个技能，后续用户覆盖会优先沿用这层平台技能分类。</p>
              </div>
              <span className="archive-pill status-ready">{items.length} 个技能</span>
            </div>
            <div className="personal-list">
              {items.map((item) => {
                const matchedPrompts = matchPromptsBySkill(item, prompts);
                return (
                  <article className="entity-card personal-card" key={item.id}>
                    <div className="entity-card-head">
                      <div>
                        <strong>{item.name}</strong>
                        <p className="personal-meta">{item.slug} · {item.provider}</p>
                      </div>
                      <span className={`archive-pill ${skillStatusClassMap[item.status]}`}>{item.status}</span>
                    </div>
                    <div className="personal-grid">
                      <div>
                        <span>默认模型</span>
                        <strong>{item.defaultModel}</strong>
                      </div>
                      <div>
                        <span>点数成本</span>
                        <strong>{item.pointsCost}</strong>
                      </div>
                      <div>
                        <span>关联提示词</span>
                        <strong>{matchedPrompts.length}</strong>
                      </div>
                      <div>
                        <span>最近更新时间</span>
                        <strong>{formatDateTime(item.updatedAt)}</strong>
                      </div>
                      <div className="field-full">
                        <span>技能说明</span>
                        <strong>{item.description}</strong>
                      </div>
                      <div className="field-full">
                        <span>提示词场景参考</span>
                        <strong>{matchedPrompts.length ? matchedPrompts.map((prompt) => prompt.scene).join(" / ") : "当前未匹配到场景参考"}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        ))}
        {!filteredSkills.length ? <div className="empty-canvas-box">暂无匹配技能，请调整搜索词或状态筛选。</div> : null}
        {!filteredSkills.length ? <p className="empty-state">当前没有匹配的技能记录。</p> : null}
      </div>
    </section>
  );
}

const skillStatusClassMap: Record<SkillConfigRecord["status"], string> = {
  ACTIVE: "status-ready",
  DRAFT: "status-in_progress",
  DISABLED: "status-paused",
};

function sortBySkillUpdatedAtDesc(a: SkillConfigRecord, b: SkillConfigRecord) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function groupSkillsByCategory(items: SkillConfigRecord[]) {
  const groups = new Map<string, SkillConfigRecord[]>();
  items.forEach((item) => {
    const current = groups.get(item.category) || [];
    current.push(item);
    groups.set(item.category, current);
  });
  return [...groups.entries()];
}

function matchPromptsBySkill(skill: SkillConfigRecord, prompts: PromptTemplateRecord[]) {
  const slug = skill.slug.toLowerCase();
  const name = skill.name.toLowerCase();
  const category = skill.category.toLowerCase();

  return prompts.filter((prompt) => {
    const scene = prompt.scene.toLowerCase();
    const promptName = prompt.name.toLowerCase();

    return scene.includes(slug)
      || promptName.includes(slug)
      || scene.includes(name)
      || promptName.includes(name)
      || scene.includes(category);
  });
}
