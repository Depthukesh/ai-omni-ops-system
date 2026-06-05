"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredCurrentBrandId } from "../../../services/auth-session";
import { DEMO_BRAND_ID, getBrandArchive, type BrandArchiveBundle, type BrandProduct } from "../../../services/brand-growth";
import { publishWechatArticleToOfficialAccount } from "../../../services/publishing";
import {
  getXiaohongshuMarketingCalendarWorkspace,
  type XiaohongshuMarketingCalendarItem,
  type XiaohongshuMarketingCalendarWorkspace,
} from "../../../services/reports";
import {
  createWechatWorkflow,
  getWechatAccountConfig,
  getWechatArticleDrafts,
  getWechatOfficialAccounts,
  getWechatWorkflowPreferences,
  getWechatWorkflowSessions,
  saveWechatAccountConfig,
  saveWechatWorkflowPreferences,
  updateWechatWorkflowArticle,
  updateWechatWorkflowInput,
  type WechatAccountConfigRecord,
  type WechatArticleDraftRecord,
  type WechatCommentMode,
  type WechatImageMode,
  type WechatOfficialAccountRecord,
  type WechatWorkflowInputType,
  type WechatWorkflowPreferenceRecord,
  type WechatWorkflowSessionRecord,
  type WechatWorkflowStep,
} from "../../../services/works";

type WechatSectionKey = "setup" | "workflow" | "history";
type ThemeOption = { label: string; color: string };
const NO_PRODUCT_VALUE = "__no_product__";

const themeOptions: ThemeOption[] = [
  { label: "墨绿", color: "#25554a" },
  { label: "琥珀", color: "#8f6237" },
  { label: "雾蓝", color: "#3a4e73" },
  { label: "紫灰", color: "#7d5c8e" },
  { label: "金棕", color: "#b1874d" },
];

const imageModeOptions: Array<{ value: WechatImageMode; label: string }> = [
  { value: "cover-and-body", label: "头图 + 文中配图" },
  { value: "cover-only", label: "只生成头图" },
  { value: "body-only", label: "只生成文中配图" },
];

const inputTypeOptions: Array<{ value: WechatWorkflowInputType; label: string; description: string }> = [
  { value: "calendar", label: "营销日历派生", description: "从品牌增长报告下的营销日历进入内容创作。" },
  { value: "plain-text", label: "纯文本创作", description: "直接输入创作意图或素材摘要。" },
  { value: "markdown", label: "Markdown", description: "后续将走 Markdown 转公众号 HTML 链路。" },
  { value: "html", label: "HTML", description: "适合已有排版稿导入。" },
];

const commentModeOptions: Array<{ value: WechatCommentMode; label: string }> = [
  { value: "open", label: "开放评论" },
  { value: "fans", label: "仅粉丝评论" },
  { value: "close", label: "关闭评论" },
];

const workflowSteps: Array<{ key: WechatWorkflowStep; label: string; description: string }> = [
  { key: "input", label: "1. 输入", description: "选择输入来源、资料与账号。" },
  { key: "article", label: "2. 文章", description: "生成并编辑标题、摘要与正文。" },
  { key: "image", label: "3. 生图", description: "下一阶段接入封面图与正文配图生成。" },
  { key: "publish", label: "4. 发布确认", description: "固定 API 模式，校验凭证与封面。" },
  { key: "result", label: "5. 结果", description: "展示发布结果、media_id 与重试。" },
];

function buildWhitelistText(ips: string[]) {
  return ips.join("\n");
}

function parseWhitelistText(value: string) {
  return value
    .split(/[\n,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildWorkflowTitle(calendarItem?: XiaohongshuMarketingCalendarItem, product?: BrandProduct) {
  const topic = calendarItem?.topicName || "公众号创作工作流";
  return product && product.id !== NO_PRODUCT_VALUE ? `${topic}：${product.productName}内容策划` : `${topic}：品牌内容策划`;
}

function buildWorkflowContent(params: {
  inputType: WechatWorkflowInputType;
  calendarItem?: XiaohongshuMarketingCalendarItem;
  product?: BrandProduct;
  injectBrandProfile: boolean;
  instruction: string;
}) {
  const { inputType, calendarItem, product, injectBrandProfile, instruction } = params;
  const inputLabel = inputTypeOptions.find((item) => item.value === inputType)?.label || inputType;
  const sections = [
    `输入来源：${inputLabel}`,
    calendarItem ? `营销日历：${calendarItem.date} · ${calendarItem.topicName}` : "营销日历：本次不强依赖营销日历，由自定义创作意图驱动。",
    product && product.id !== NO_PRODUCT_VALUE
      ? `产品资料：${product.productName}，定位 ${product.productPositioning}，适用场景 ${product.usageScenario}。`
      : "产品资料：本次不植入具体产品。",
    injectBrandProfile ? "品牌资料：需要植入品牌故事、服务承诺与品牌语气。" : "品牌资料：本次不强制植入品牌资料。",
    instruction || "请先输出适合公众号 API 发布链路的文章结构草稿。",
  ];
  return sections.join("\n\n");
}

function resolveCurrentStepIndex(step: WechatWorkflowStep) {
  const index = workflowSteps.findIndex((item) => item.key === step);
  return index === -1 ? 0 : index;
}

export function WechatWorkspaceShell() {
  const [activeSection, setActiveSection] = useState<WechatSectionKey>("workflow");
  const [brandId] = useState(() => getStoredCurrentBrandId(DEMO_BRAND_ID) || DEMO_BRAND_ID);
  const [archive, setArchive] = useState<BrandArchiveBundle | null>(null);
  const [calendarWorkspace, setCalendarWorkspace] = useState<XiaohongshuMarketingCalendarWorkspace>({ history: [] });
  const [config, setConfig] = useState<WechatAccountConfigRecord | null>(null);
  const [preferences, setPreferences] = useState<WechatWorkflowPreferenceRecord | null>(null);
  const [accounts, setAccounts] = useState<WechatOfficialAccountRecord[]>([]);
  const [sessions, setSessions] = useState<WechatWorkflowSessionRecord[]>([]);
  const [drafts, setDrafts] = useState<WechatArticleDraftRecord[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const [isSavingWorkflowInput, setIsSavingWorkflowInput] = useState(false);
  const [isSavingWorkflowArticle, setIsSavingWorkflowArticle] = useState(false);
  const [publishingDraftId, setPublishingDraftId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [whitelistText, setWhitelistText] = useState("");
  const [defaultAuthor, setDefaultAuthor] = useState("品牌内容中心");
  const [defaultTheme, setDefaultTheme] = useState(themeOptions[0]?.color ?? "#25554a");
  const [defaultCommentMode, setDefaultCommentMode] = useState<WechatCommentMode>("open");
  const [defaultInputType, setDefaultInputType] = useState<WechatWorkflowInputType>("calendar");
  const [defaultAccountId, setDefaultAccountId] = useState("");
  const [fanCommentsOnly, setFanCommentsOnly] = useState(false);

  const [createInputType, setCreateInputType] = useState<WechatWorkflowInputType>("calendar");
  const [createAccountId, setCreateAccountId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createCalendarId, setCreateCalendarId] = useState("");
  const [createProductId, setCreateProductId] = useState(NO_PRODUCT_VALUE);
  const [createInjectBrandProfile, setCreateInjectBrandProfile] = useState(true);
  const [createThemeColor, setCreateThemeColor] = useState(themeOptions[0]?.color ?? "#25554a");
  const [createImageMode, setCreateImageMode] = useState<WechatImageMode>("cover-and-body");
  const [createInstruction, setCreateInstruction] = useState("");

  const [workflowInputType, setWorkflowInputType] = useState<WechatWorkflowInputType>("calendar");
  const [workflowAccountId, setWorkflowAccountId] = useState("");
  const [workflowTitle, setWorkflowTitle] = useState("");
  const [workflowCalendarId, setWorkflowCalendarId] = useState("");
  const [workflowProductId, setWorkflowProductId] = useState(NO_PRODUCT_VALUE);
  const [workflowInjectBrandProfile, setWorkflowInjectBrandProfile] = useState(false);
  const [workflowThemeColor, setWorkflowThemeColor] = useState(themeOptions[0]?.color ?? "#25554a");
  const [workflowImageMode, setWorkflowImageMode] = useState<WechatImageMode>("cover-and-body");
  const [workflowInstruction, setWorkflowInstruction] = useState("");

  const [articleTitle, setArticleTitle] = useState("");
  const [articleSummary, setArticleSummary] = useState("");
  const [articleAuthor, setArticleAuthor] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [articleCommentMode, setArticleCommentMode] = useState<WechatCommentMode>("open");

  const calendarItems = useMemo(() => {
    const merged = [
      ...(calendarWorkspace.latest?.items || []),
      ...calendarWorkspace.history.flatMap((item) => item.items),
    ];
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  }, [calendarWorkspace]);

  const products = archive?.products || [];
  const selectedWorkflow = useMemo(
    () => sessions.find((item) => item.id === selectedWorkflowId) || null,
    [sessions, selectedWorkflowId],
  );

  useEffect(() => {
    let disposed = false;

    async function loadWorkspace() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [archiveResult, calendarResult, configResult, preferencesResult, accountsResult, sessionsResult, draftsResult] =
          await Promise.allSettled([
            getBrandArchive(brandId),
            getXiaohongshuMarketingCalendarWorkspace(brandId),
            getWechatAccountConfig(brandId),
            getWechatWorkflowPreferences(brandId),
            getWechatOfficialAccounts(brandId),
            getWechatWorkflowSessions(brandId),
            getWechatArticleDrafts(brandId),
          ]);

        if (disposed) {
          return;
        }

        if (configResult.status !== "fulfilled") {
          throw configResult.reason;
        }
        if (preferencesResult.status !== "fulfilled") {
          throw preferencesResult.reason;
        }
        if (accountsResult.status !== "fulfilled") {
          throw accountsResult.reason;
        }
        if (sessionsResult.status !== "fulfilled") {
          throw sessionsResult.reason;
        }
        if (draftsResult.status !== "fulfilled") {
          throw draftsResult.reason;
        }

        setArchive(archiveResult.status === "fulfilled" ? archiveResult.value : null);
        setCalendarWorkspace(calendarResult.status === "fulfilled" ? calendarResult.value : { history: [] });
        setConfig(configResult.value.item);
        setPreferences(preferencesResult.value.item);
        setAccounts(accountsResult.value.items);
        setSessions(sessionsResult.value.items);
        setDrafts(draftsResult.value.items);

        setAppId(configResult.value.item.appId || "");
        setAppSecret("");
        setWhitelistText(buildWhitelistText(configResult.value.item.whitelistIps || []));
        setDefaultAuthor(preferencesResult.value.item.defaultAuthor || "品牌内容中心");
        setDefaultTheme(preferencesResult.value.item.defaultThemeColor || themeOptions[0]?.color || "#25554a");
        setDefaultCommentMode(preferencesResult.value.item.commentMode || "open");
        setDefaultInputType(preferencesResult.value.item.defaultInputType || "calendar");
        setDefaultAccountId(
          preferencesResult.value.item.defaultAccountId || accountsResult.value.items.find((item) => item.isDefault)?.id || "",
        );
        setFanCommentsOnly(preferencesResult.value.item.fanCommentsOnly);
        setCreateInputType(preferencesResult.value.item.defaultInputType || "calendar");
        setCreateThemeColor(preferencesResult.value.item.defaultThemeColor || themeOptions[0]?.color || "#25554a");
        setCreateAccountId(
          preferencesResult.value.item.defaultAccountId || accountsResult.value.items.find((item) => item.isDefault)?.id || "",
        );
      } catch (error) {
        if (!disposed) {
          setErrorMessage(error instanceof Error ? error.message : "公众号工作台加载失败。");
        }
      } finally {
        if (!disposed) {
          setIsLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      disposed = true;
    };
  }, [brandId]);

  useEffect(() => {
    if (!selectedWorkflowId && sessions[0]?.id) {
      setSelectedWorkflowId(sessions[0].id);
    }
  }, [sessions, selectedWorkflowId]);

  useEffect(() => {
    if (!createCalendarId && calendarItems[0]?.id) {
      setCreateCalendarId(calendarItems[0].id);
    }
  }, [calendarItems, createCalendarId]);

  useEffect(() => {
    if (!createProductId) {
      setCreateProductId(NO_PRODUCT_VALUE);
    }
  }, [createProductId]);

  useEffect(() => {
    if (!createTitle) {
      const calendarItem = calendarItems.find((item) => item.id === createCalendarId);
      const product = products.find((item) => item.id === createProductId);
      setCreateTitle(buildWorkflowTitle(calendarItem, product));
    }
  }, [calendarItems, createCalendarId, createProductId, createTitle, products]);

  useEffect(() => {
    if (!selectedWorkflow) {
      return;
    }
    const marketingLabel = selectedWorkflow.selectedMarketingLabels[0];
    const productLabel = selectedWorkflow.selectedProductLabels[0];
    setWorkflowInputType(selectedWorkflow.inputType);
    setWorkflowAccountId(selectedWorkflow.accountId || accounts.find((item) => item.isDefault)?.id || "");
    setWorkflowTitle(selectedWorkflow.title);
    setWorkflowCalendarId(calendarItems.find((item) => item.topicName === marketingLabel)?.id || "");
    setWorkflowProductId(products.find((item) => item.productName === productLabel)?.id || NO_PRODUCT_VALUE);
    setWorkflowInjectBrandProfile(selectedWorkflow.injectBrandProfile);
    setWorkflowThemeColor(selectedWorkflow.themeColor);
    setWorkflowImageMode(selectedWorkflow.imageMode);
    setWorkflowInstruction(selectedWorkflow.content);
    setArticleTitle(selectedWorkflow.title);
    setArticleSummary(selectedWorkflow.summary);
    setArticleAuthor(selectedWorkflow.author);
    setArticleContent(selectedWorkflow.content);
    setArticleCommentMode(selectedWorkflow.commentMode);
  }, [accounts, calendarItems, products, selectedWorkflow]);

  function openDraftPreview(htmlContent: string) {
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function upsertSession(item: WechatWorkflowSessionRecord) {
    setSessions((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
    setSelectedWorkflowId(item.id);
  }

  async function handleSaveConfig() {
    setIsSavingConfig(true);
    setErrorMessage("");
    try {
      const response = await saveWechatAccountConfig(brandId, {
        appId,
        appSecret,
        whitelistIps: parseWhitelistText(whitelistText),
        defaultAuthor,
        defaultThemeColor: defaultTheme,
        commentMode: defaultCommentMode,
      });
      const accountsResponse = await getWechatOfficialAccounts(brandId);
      setConfig(response.item);
      setAccounts(accountsResponse.items);
      setAppSecret("");
      setWhitelistText(buildWhitelistText(response.item.whitelistIps));
      setNotice("公众号 API 配置已保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存公众号配置失败。");
    } finally {
      setIsSavingConfig(false);
    }
  }

  async function handleSavePreferences() {
    setIsSavingPreferences(true);
    setErrorMessage("");
    try {
      const response = await saveWechatWorkflowPreferences(brandId, {
        defaultAuthor,
        defaultThemeColor: defaultTheme,
        commentMode: defaultCommentMode,
        fanCommentsOnly,
        defaultInputType,
        defaultAccountId,
      });
      setPreferences(response.item);
      setCreateInputType(response.item.defaultInputType);
      setCreateThemeColor(response.item.defaultThemeColor);
      setCreateAccountId(response.item.defaultAccountId || "");
      setNotice("公众号工作流默认配置已保存。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存初始化配置失败。");
    } finally {
      setIsSavingPreferences(false);
    }
  }

  async function handleCreateWorkflow() {
    setIsCreatingWorkflow(true);
    setErrorMessage("");
    const calendarItem = calendarItems.find((item) => item.id === createCalendarId);
    const product = products.find((item) => item.id === createProductId);
    try {
      const response = await createWechatWorkflow(brandId, {
        inputType: createInputType,
        accountId: createAccountId || undefined,
        title: createTitle || buildWorkflowTitle(calendarItem, product),
        content: buildWorkflowContent({
          inputType: createInputType,
          calendarItem,
          product,
          injectBrandProfile: createInjectBrandProfile,
          instruction: createInstruction,
        }),
        themeColor: createThemeColor,
        imageMode: createImageMode,
        injectBrandProfile: createInjectBrandProfile,
        selectedMarketingLabels: calendarItem ? [calendarItem.topicName] : [],
        selectedProductLabels: product && product.id !== NO_PRODUCT_VALUE ? [product.productName] : [],
        selectedBrandLabels: createInjectBrandProfile ? ["品牌资料"] : [],
      });
      upsertSession(response.item);
      setActiveSection("workflow");
      setNotice("公众号工作流已创建，请继续完善输入并进入文章阶段。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建公众号工作流失败。");
    } finally {
      setIsCreatingWorkflow(false);
    }
  }

  async function handleSaveWorkflowInput() {
    if (!selectedWorkflow) {
      return;
    }
    setIsSavingWorkflowInput(true);
    setErrorMessage("");
    const calendarItem = calendarItems.find((item) => item.id === workflowCalendarId);
    const product = products.find((item) => item.id === workflowProductId);
    try {
      const response = await updateWechatWorkflowInput(brandId, selectedWorkflow.id, {
        inputType: workflowInputType,
        accountId: workflowAccountId || undefined,
        title: workflowTitle,
        content: buildWorkflowContent({
          inputType: workflowInputType,
          calendarItem,
          product,
          injectBrandProfile: workflowInjectBrandProfile,
          instruction: workflowInstruction,
        }),
        themeColor: workflowThemeColor,
        imageMode: workflowImageMode,
        injectBrandProfile: workflowInjectBrandProfile,
        selectedMarketingLabels: calendarItem ? [calendarItem.topicName] : [],
        selectedProductLabels: product && product.id !== NO_PRODUCT_VALUE ? [product.productName] : [],
        selectedBrandLabels: workflowInjectBrandProfile ? ["品牌资料"] : [],
      });
      upsertSession(response.item);
      setNotice("输入阶段已保存，已进入文章编辑阶段。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存输入阶段失败。");
    } finally {
      setIsSavingWorkflowInput(false);
    }
  }

  async function handleSaveWorkflowArticle() {
    if (!selectedWorkflow) {
      return;
    }
    setIsSavingWorkflowArticle(true);
    setErrorMessage("");
    try {
      const response = await updateWechatWorkflowArticle(brandId, selectedWorkflow.id, {
        title: articleTitle,
        summary: articleSummary,
        author: articleAuthor,
        content: articleContent,
        commentMode: articleCommentMode,
        themeColor: workflowThemeColor,
      });
      upsertSession(response.item);
      setNotice("文章阶段已保存，下一步将接入封面图与正文配图生成。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存文章阶段失败。");
    } finally {
      setIsSavingWorkflowArticle(false);
    }
  }

  async function handlePublishDraft(draftId: string) {
    setPublishingDraftId(draftId);
    setErrorMessage("");
    try {
      const response = await publishWechatArticleToOfficialAccount(brandId, draftId, { mode: "PUBLISH_ARTICLE" });
      setDrafts((current) => current.map((item) => (item.id === draftId ? response.item : item)));
      setNotice("已一键发布到公众号后台。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "发布到公众号后台失败。");
    } finally {
      setPublishingDraftId("");
    }
  }

  return (
    <main className="workspace-page workspace-page--strategy">
      <section className="workspace-card workspace-card--bleed strategy-page-card" style={{ overflow: "hidden" }}>
        <div className="wechat-layout">
          <aside className="wechat-section-nav">
            <div className="wechat-nav-head">
              <strong>公众号模块</strong>
              <p>已切到独立模块骨架：初始化配置、创作工作流、发布历史。</p>
            </div>
            <button
              type="button"
              className={`wechat-nav-item ${activeSection === "setup" ? "is-active" : ""}`}
              onClick={() => setActiveSection("setup")}
            >
              配置初始化
            </button>
            <button
              type="button"
              className={`wechat-nav-item ${activeSection === "workflow" ? "is-active" : ""}`}
              onClick={() => setActiveSection("workflow")}
            >
              创作工作流
            </button>
            <button
              type="button"
              className={`wechat-nav-item ${activeSection === "history" ? "is-active" : ""}`}
              onClick={() => setActiveSection("history")}
            >
              发布历史
            </button>
          </aside>

          <div className="wechat-stage">
            {errorMessage ? <div className="wechat-banner wechat-banner--error">{errorMessage}</div> : null}
            {notice ? <div className="wechat-banner wechat-banner--notice">{notice}</div> : null}

            {activeSection === "setup" ? (
              <article className="workspace-panel strategy-page-card">
                <div className="workspace-toolbar top-toolbar">
                  <div>
                    <strong>配置初始化</strong>
                    <p className="wechat-description">先完成公众号 API 接入信息，再保存工作流默认作者、主题色、默认输入方式与默认账号。</p>
                  </div>
                </div>

                <div className="wechat-config-grid">
                  <section className="light-data-panel">
                    <div className="wechat-panel-head">
                      <div>
                        <strong>公众号 API 配置</strong>
                        <p className="wechat-inline-tip">固定 API 模式，不再保留 browser 发布能力。</p>
                      </div>
                      <button type="button" className="primary-button" onClick={() => void handleSaveConfig()} disabled={isSavingConfig}>
                        {isSavingConfig ? "保存中..." : "保存 API 配置"}
                      </button>
                    </div>
                    <div className="wechat-form-grid">
                      <label className="wechat-field">
                        <span>AppID</span>
                        <input value={appId} onChange={(event) => setAppId(event.target.value)} placeholder="请输入公众号 AppID" />
                      </label>
                      <label className="wechat-field">
                        <span>AppSecret</span>
                        <input
                          type="password"
                          value={appSecret}
                          onChange={(event) => setAppSecret(event.target.value)}
                          placeholder={config?.appSecretMasked || "请输入公众号 AppSecret"}
                        />
                      </label>
                      <label className="wechat-field wechat-field--full">
                        <span>IP 白名单</span>
                        <textarea
                          value={whitelistText}
                          onChange={(event) => setWhitelistText(event.target.value)}
                          placeholder={"47.97.12.20\n47.97.12.21"}
                        />
                      </label>
                    </div>
                  </section>

                  <section className="light-data-panel">
                    <div className="wechat-panel-head">
                      <div>
                        <strong>工作流默认配置</strong>
                        <p className="wechat-inline-tip">对应后续 `EXTEND.md` 的站内化配置骨架。</p>
                      </div>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleSavePreferences()}
                        disabled={isSavingPreferences}
                      >
                        {isSavingPreferences ? "保存中..." : "保存默认项"}
                      </button>
                    </div>
                    <div className="wechat-form-grid">
                      <label className="wechat-field">
                        <span>默认作者</span>
                        <input value={defaultAuthor} onChange={(event) => setDefaultAuthor(event.target.value)} placeholder="品牌内容中心" />
                      </label>
                      <label className="wechat-field">
                        <span>默认评论策略</span>
                        <select value={defaultCommentMode} onChange={(event) => setDefaultCommentMode(event.target.value as WechatCommentMode)}>
                          {commentModeOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="wechat-field">
                        <span>默认输入方式</span>
                        <select value={defaultInputType} onChange={(event) => setDefaultInputType(event.target.value as WechatWorkflowInputType)}>
                          {inputTypeOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="wechat-field">
                        <span>默认公众号账号</span>
                        <select value={defaultAccountId} onChange={(event) => setDefaultAccountId(event.target.value)}>
                          <option value="">请选择默认账号</option>
                          {accounts.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.accountName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="wechat-field wechat-field--full">
                        <span>默认主题色</span>
                        <div className="wechat-swatch-row">
                          {themeOptions.map((item) => (
                            <button
                              key={item.color}
                              type="button"
                              className={`wechat-swatch ${defaultTheme === item.color ? "is-active" : ""}`}
                              style={{ background: item.color }}
                              onClick={() => setDefaultTheme(item.color)}
                              aria-label={item.label}
                            />
                          ))}
                        </div>
                      </label>
                      <label className="wechat-checkbox-row">
                        <input type="checkbox" checked={fanCommentsOnly} onChange={(event) => setFanCommentsOnly(event.target.checked)} />
                        <span>启用“仅粉丝评论”偏好</span>
                      </label>
                    </div>
                  </section>
                </div>

                <section className="light-data-panel">
                  <div className="wechat-panel-head">
                    <div>
                      <strong>已登记公众号账号</strong>
                      <p className="wechat-inline-tip">当前先以默认账号为主，多账号结构已经留出接口位。</p>
                    </div>
                  </div>
                  <div className="wechat-account-grid">
                    {accounts.length ? (
                      accounts.map((item) => (
                        <article key={item.id} className="wechat-account-card">
                          <div className="wechat-pill-row">
                            <span className={`archive-pill ${item.configured ? "status-ready" : "status-pending"}`}>
                              {item.configured ? "已配置" : "待配置"}
                            </span>
                            {item.isDefault ? <span className="archive-pill status-ready">默认账号</span> : null}
                          </div>
                          <strong>{item.accountName}</strong>
                          <p>AppID：{item.appId || "未填写"}</p>
                          <p>Secret：{item.appSecretMasked || "未填写"}</p>
                        </article>
                      ))
                    ) : (
                      <div className="empty-state">当前还没有公众号账号，请先保存 API 配置。</div>
                    )}
                  </div>
                </section>
              </article>
            ) : null}

            {activeSection === "workflow" ? (
              <article className="workspace-panel strategy-page-card">
                <div className="workspace-toolbar top-toolbar">
                  <div>
                    <strong>创作工作流</strong>
                    <p className="wechat-description">本轮已落地输入阶段和文章阶段骨架，生图与 API 发布确认作为下一阶段入口保留在流程中。</p>
                  </div>
                </div>

                <div className="wechat-workflow-layout">
                  <aside className="wechat-workflow-sidebar">
                    <section className="light-data-panel">
                      <div className="wechat-panel-head">
                        <div>
                          <strong>新建工作流</strong>
                          <p className="wechat-inline-tip">支持纯文本、Markdown、HTML 与营销日历派生输入。</p>
                        </div>
                      </div>
                      <div className="wechat-form-grid">
                        <label className="wechat-field">
                          <span>输入方式</span>
                          <select value={createInputType} onChange={(event) => setCreateInputType(event.target.value as WechatWorkflowInputType)}>
                            {inputTypeOptions.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-field">
                          <span>公众号账号</span>
                          <select value={createAccountId} onChange={(event) => setCreateAccountId(event.target.value)}>
                            <option value="">按默认账号</option>
                            {accounts.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.accountName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-field wechat-field--full">
                          <span>工作流标题</span>
                          <input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="请输入工作流标题" />
                        </label>
                        <label className="wechat-field">
                          <span>营销日历</span>
                          <select value={createCalendarId} onChange={(event) => setCreateCalendarId(event.target.value)}>
                            <option value="">不使用营销日历</option>
                            {calendarItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.date} · {item.topicName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-field">
                          <span>产品资料</span>
                          <select value={createProductId} onChange={(event) => setCreateProductId(event.target.value)}>
                            <option value={NO_PRODUCT_VALUE}>不植入产品</option>
                            {products.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.productName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-field">
                          <span>图片策略</span>
                          <select value={createImageMode} onChange={(event) => setCreateImageMode(event.target.value as WechatImageMode)}>
                            {imageModeOptions.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="wechat-checkbox-row">
                          <input
                            type="checkbox"
                            checked={createInjectBrandProfile}
                            onChange={(event) => setCreateInjectBrandProfile(event.target.checked)}
                          />
                          <span>植入品牌资料</span>
                        </label>
                        <label className="wechat-field wechat-field--full">
                          <span>主题颜色</span>
                          <div className="wechat-swatch-row">
                            {themeOptions.map((item) => (
                              <button
                                key={item.color}
                                type="button"
                                className={`wechat-swatch ${createThemeColor === item.color ? "is-active" : ""}`}
                                style={{ background: item.color }}
                                onClick={() => setCreateThemeColor(item.color)}
                                aria-label={item.label}
                              />
                            ))}
                          </div>
                        </label>
                        <label className="wechat-field wechat-field--full">
                          <span>创作要求 / 原始输入</span>
                          <textarea
                            value={createInstruction}
                            onChange={(event) => setCreateInstruction(event.target.value)}
                            placeholder="输入营销目标、资料摘要，或直接粘贴 Markdown / HTML 内容。"
                          />
                        </label>
                      </div>
                      <button type="button" className="primary-button" onClick={() => void handleCreateWorkflow()} disabled={isCreatingWorkflow}>
                        {isCreatingWorkflow ? "创建中..." : "创建工作流"}
                      </button>
                    </section>

                    <section className="light-data-panel">
                      <div className="wechat-panel-head">
                        <div>
                          <strong>工作流列表</strong>
                          <p className="wechat-inline-tip">{sessions.length} 个会话</p>
                        </div>
                      </div>
                      <div className="wechat-session-list">
                        {sessions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`wechat-session-item ${item.id === selectedWorkflowId ? "is-active" : ""}`}
                            onClick={() => setSelectedWorkflowId(item.id)}
                          >
                            <strong>{item.title}</strong>
                            <span>{item.status}</span>
                            <small>{item.accountName || "未绑定账号"}</small>
                          </button>
                        ))}
                        {!sessions.length ? <div className="empty-state">还没有工作流，先在上方创建一个。</div> : null}
                      </div>
                    </section>
                  </aside>

                  <div className="wechat-workflow-main">
                    {selectedWorkflow ? (
                      <>
                        <section className="light-data-panel">
                          <div className="wechat-panel-head">
                            <div>
                              <strong>{selectedWorkflow.title}</strong>
                              <p className="wechat-inline-tip">
                                当前步骤：{selectedWorkflow.currentStep} / 状态：{selectedWorkflow.status}
                              </p>
                            </div>
                            <div className="wechat-pill-row">
                              <span className="archive-pill status-ready">{selectedWorkflow.inputType}</span>
                              <span className="archive-pill status-ready">{selectedWorkflow.accountName || "未绑定账号"}</span>
                            </div>
                          </div>
                          <div className="wechat-step-grid">
                            {workflowSteps.map((item, index) => {
                              const currentIndex = resolveCurrentStepIndex(selectedWorkflow.currentStep);
                              const state =
                                index < currentIndex ? "is-done" : index === currentIndex ? "is-current" : "is-upcoming";
                              return (
                                <div key={item.key} className={`wechat-step-card ${state}`}>
                                  <strong>{item.label}</strong>
                                  <p>{item.description}</p>
                                </div>
                              );
                            })}
                          </div>
                        </section>

                        <section className="light-data-panel">
                          <div className="wechat-panel-head">
                            <div>
                              <strong>Step 1. 输入阶段</strong>
                              <p className="wechat-inline-tip">保存后会把工作流推进到文章编辑阶段。</p>
                            </div>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => void handleSaveWorkflowInput()}
                              disabled={isSavingWorkflowInput}
                            >
                              {isSavingWorkflowInput ? "保存中..." : "保存输入并进入文章阶段"}
                            </button>
                          </div>
                          <div className="wechat-form-grid">
                            <label className="wechat-field">
                              <span>输入方式</span>
                              <select value={workflowInputType} onChange={(event) => setWorkflowInputType(event.target.value as WechatWorkflowInputType)}>
                                {inputTypeOptions.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field">
                              <span>公众号账号</span>
                              <select value={workflowAccountId} onChange={(event) => setWorkflowAccountId(event.target.value)}>
                                <option value="">按默认账号</option>
                                {accounts.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.accountName}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>工作流标题</span>
                              <input value={workflowTitle} onChange={(event) => setWorkflowTitle(event.target.value)} placeholder="请输入工作流标题" />
                            </label>
                            <label className="wechat-field">
                              <span>营销日历</span>
                              <select value={workflowCalendarId} onChange={(event) => setWorkflowCalendarId(event.target.value)}>
                                <option value="">不使用营销日历</option>
                                {calendarItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.date} · {item.topicName}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field">
                              <span>产品资料</span>
                              <select value={workflowProductId} onChange={(event) => setWorkflowProductId(event.target.value)}>
                                <option value={NO_PRODUCT_VALUE}>不植入产品</option>
                                {products.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.productName}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field">
                              <span>图片策略</span>
                              <select value={workflowImageMode} onChange={(event) => setWorkflowImageMode(event.target.value as WechatImageMode)}>
                                {imageModeOptions.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-checkbox-row">
                              <input
                                type="checkbox"
                                checked={workflowInjectBrandProfile}
                                onChange={(event) => setWorkflowInjectBrandProfile(event.target.checked)}
                              />
                              <span>植入品牌资料</span>
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>主题颜色</span>
                              <div className="wechat-swatch-row">
                                {themeOptions.map((item) => (
                                  <button
                                    key={item.color}
                                    type="button"
                                    className={`wechat-swatch ${workflowThemeColor === item.color ? "is-active" : ""}`}
                                    style={{ background: item.color }}
                                    onClick={() => setWorkflowThemeColor(item.color)}
                                    aria-label={item.label}
                                  />
                                ))}
                              </div>
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>创作要求 / 输入内容</span>
                              <textarea value={workflowInstruction} onChange={(event) => setWorkflowInstruction(event.target.value)} />
                            </label>
                          </div>
                        </section>

                        <section className="light-data-panel">
                          <div className="wechat-panel-head">
                            <div>
                              <strong>Step 2. 文章阶段</strong>
                              <p className="wechat-inline-tip">保存后会生成 HTML 预览，并把工作流推进到生图阶段。</p>
                            </div>
                            <div className="strategy-inline-actions">
                              {selectedWorkflow.htmlContent ? (
                                <button type="button" className="secondary-button" onClick={() => openDraftPreview(selectedWorkflow.htmlContent)}>
                                  预览 HTML
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="primary-button"
                                onClick={() => void handleSaveWorkflowArticle()}
                                disabled={isSavingWorkflowArticle}
                              >
                                {isSavingWorkflowArticle ? "保存中..." : "保存文章并进入生图阶段"}
                              </button>
                            </div>
                          </div>
                          <div className="wechat-form-grid">
                            <label className="wechat-field wechat-field--full">
                              <span>文章标题</span>
                              <input value={articleTitle} onChange={(event) => setArticleTitle(event.target.value)} />
                            </label>
                            <label className="wechat-field">
                              <span>作者</span>
                              <input value={articleAuthor} onChange={(event) => setArticleAuthor(event.target.value)} />
                            </label>
                            <label className="wechat-field">
                              <span>评论策略</span>
                              <select value={articleCommentMode} onChange={(event) => setArticleCommentMode(event.target.value as WechatCommentMode)}>
                                {commentModeOptions.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>摘要</span>
                              <textarea value={articleSummary} onChange={(event) => setArticleSummary(event.target.value)} />
                            </label>
                            <label className="wechat-field wechat-field--full">
                              <span>正文</span>
                              <textarea value={articleContent} onChange={(event) => setArticleContent(event.target.value)} />
                            </label>
                          </div>
                        </section>

                        <section className="wechat-placeholder-grid">
                          <article className="light-data-panel">
                            <div className="wechat-panel-head">
                              <div>
                                <strong>Step 3. 生图</strong>
                                <p className="wechat-inline-tip">本轮先预留独立阶段，下一步接封面图与正文配图任务。</p>
                              </div>
                            </div>
                            <div className="empty-state">已预留封面图与正文配图入口，后续会接入独立图片任务模型与结果回填。</div>
                          </article>
                          <article className="light-data-panel">
                            <div className="wechat-panel-head">
                              <div>
                                <strong>Step 4. API 发布确认</strong>
                                <p className="wechat-inline-tip">固定 API-only，后续将在这里校验 AppID、AppSecret、白名单和封面图。</p>
                              </div>
                            </div>
                            <div className="empty-state">本轮先保留确认阶段卡位，下一步接入真实公众号 API 发布链路。</div>
                          </article>
                        </section>
                      </>
                    ) : (
                      <div className="empty-state">先在左侧创建一个公众号工作流。</div>
                    )}
                  </div>
                </div>
              </article>
            ) : null}

            {activeSection === "history" ? (
              <article className="workspace-panel strategy-page-card">
                <div className="workspace-toolbar top-toolbar">
                  <div>
                    <strong>发布历史</strong>
                    <p className="wechat-description">这里继续展示当前已存在的公众号草稿与发布结果，后续会升级为工作流执行历史。</p>
                  </div>
                </div>
                {isLoading ? (
                  <div className="empty-state">历史记录加载中...</div>
                ) : !drafts.length ? (
                  <div className="empty-state">当前还没有历史草稿。</div>
                ) : (
                  <div className="wechat-history-grid">
                    {drafts.map((draft) => (
                      <article key={draft.id} className="wechat-history-card">
                        <div className="wechat-history-cover" style={{ background: `linear-gradient(135deg, ${draft.themeColor} 0%, #e9d2a8 100%)` }} />
                        <div className="wechat-history-body">
                          <div className="wechat-pill-row">
                            <span className={`archive-pill ${draft.publishStatus === "PUBLISHED" ? "status-ready" : "status-pending"}`}>
                              {draft.publishStatus === "PUBLISHED" ? "已发布" : "待发布"}
                            </span>
                            <span className="archive-pill status-ready">{draft.imageTask ? "带图片任务" : "纯文章"}</span>
                          </div>
                          <strong>{draft.title}</strong>
                          <p>{draft.summary}</p>
                          <div className="wechat-meta-list">
                            <span>营销：{draft.selectedMarketingLabels[0] || "未选择"}</span>
                            <span>产品：{draft.injectProducts ? draft.selectedProductLabels[0] || "未选择" : "不植入产品"}</span>
                            <span>品牌：{draft.injectBrandProfile ? "已植入" : "未植入"}</span>
                          </div>
                          <div className="wechat-card-actions">
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => void handlePublishDraft(draft.id)}
                              disabled={publishingDraftId === draft.id || draft.publishStatus === "PUBLISHED"}
                            >
                              {draft.publishStatus === "PUBLISHED"
                                ? "已发布"
                                : publishingDraftId === draft.id
                                  ? "发布中..."
                                  : "一键发布"}
                            </button>
                            <button type="button" className="secondary-button" onClick={() => openDraftPreview(draft.htmlContent)}>
                              查看 HTML
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            ) : null}
          </div>
        </div>
      </section>

      <style jsx>{`
        .wechat-layout {
          display: grid;
          grid-template-columns: 200px minmax(0, 1fr);
          gap: 20px;
          padding: 20px;
          background: linear-gradient(180deg, #f7f8fc 0%, #eef2f8 100%);
        }

        .wechat-section-nav {
          display: grid;
          align-content: start;
          gap: 10px;
          padding: 18px;
          border-right: 1px solid #e6ebf5;
          background: rgba(255, 255, 255, 0.75);
        }

        .wechat-nav-head strong {
          display: block;
          font-size: 18px;
          color: #1f2937;
        }

        .wechat-nav-head p,
        .wechat-description,
        .wechat-inline-tip {
          margin: 6px 0 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .wechat-nav-item {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #dbe2f4;
          border-radius: 14px;
          background: #ffffff;
          text-align: left;
          color: #31415f;
          cursor: pointer;
        }

        .wechat-nav-item.is-active {
          border-color: rgba(87, 119, 255, 0.28);
          background: rgba(87, 119, 255, 0.1);
          color: #3556e8;
          font-weight: 600;
        }

        .wechat-stage,
        .wechat-workflow-main,
        .wechat-session-list {
          display: grid;
          gap: 14px;
        }

        .wechat-banner {
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13px;
        }

        .wechat-banner--error {
          background: rgba(255, 236, 237, 0.96);
          color: #b42318;
        }

        .wechat-banner--notice {
          background: rgba(236, 247, 240, 0.96);
          color: #147a46;
        }

        .wechat-config-grid,
        .wechat-form-grid,
        .wechat-account-grid,
        .wechat-history-grid,
        .wechat-placeholder-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .wechat-workflow-layout {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 18px;
        }

        .wechat-workflow-sidebar {
          display: grid;
          align-content: start;
          gap: 14px;
        }

        .wechat-panel-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .wechat-panel-head strong,
        .wechat-account-card strong,
        .wechat-session-item strong,
        .wechat-history-body strong,
        .wechat-step-card strong {
          display: block;
          color: #18243e;
        }

        .wechat-field {
          display: grid;
          gap: 8px;
          color: var(--muted);
          font-size: 13px;
        }

        .wechat-field--full {
          grid-column: 1 / -1;
        }

        .wechat-field input,
        .wechat-field select,
        .wechat-field textarea {
          width: 100%;
          border: 1px solid #dbe2f4;
          border-radius: 14px;
          padding: 12px 14px;
          background: #ffffff;
          color: #1f2937;
          font: inherit;
        }

        .wechat-field textarea {
          min-height: 138px;
          resize: vertical;
          line-height: 1.7;
        }

        .wechat-checkbox-row {
          display: flex;
          gap: 10px;
          align-items: center;
          color: #50617b;
          font-size: 13px;
        }

        .wechat-swatch-row,
        .wechat-pill-row,
        .wechat-card-actions,
        .wechat-meta-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .wechat-swatch {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 2px solid rgba(255, 255, 255, 0.92);
          box-shadow: 0 10px 18px rgba(15, 23, 42, 0.12);
          cursor: pointer;
        }

        .wechat-swatch.is-active {
          outline: 2px solid rgba(53, 86, 232, 0.28);
        }

        .wechat-account-card,
        .wechat-history-card,
        .wechat-session-item,
        .wechat-step-card {
          border: 1px solid #e4e8f0;
          border-radius: 18px;
          background: #ffffff;
        }

        .wechat-account-card,
        .wechat-session-item,
        .wechat-step-card {
          padding: 14px;
        }

        .wechat-account-card p,
        .wechat-step-card p,
        .wechat-history-body p {
          margin: 0;
          color: #607089;
          font-size: 13px;
          line-height: 1.7;
        }

        .wechat-session-item {
          text-align: left;
          cursor: pointer;
          display: grid;
          gap: 6px;
        }

        .wechat-session-item.is-active {
          border-color: rgba(87, 119, 255, 0.28);
          background: rgba(87, 119, 255, 0.08);
        }

        .wechat-session-item span,
        .wechat-session-item small {
          color: #607089;
        }

        .wechat-step-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .wechat-step-card.is-done {
          background: rgba(236, 247, 240, 0.96);
          border-color: rgba(32, 133, 78, 0.18);
        }

        .wechat-step-card.is-current {
          background: rgba(87, 119, 255, 0.08);
          border-color: rgba(87, 119, 255, 0.22);
        }

        .wechat-step-card.is-upcoming {
          opacity: 0.86;
        }

        .wechat-history-card {
          overflow: hidden;
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
        }

        .wechat-history-cover {
          height: 180px;
        }

        .wechat-history-body {
          display: grid;
          gap: 12px;
          padding: 16px;
        }

        .wechat-meta-list span {
          padding: 6px 10px;
          border-radius: 999px;
          background: #f3f5f9;
          color: #607089;
          font-size: 12px;
        }

        @media (max-width: 1280px) {
          .wechat-workflow-layout,
          .wechat-step-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1120px) {
          .wechat-layout,
          .wechat-config-grid,
          .wechat-form-grid,
          .wechat-account-grid,
          .wechat-history-grid,
          .wechat-placeholder-grid {
            grid-template-columns: 1fr;
          }

          .wechat-section-nav {
            border-right: 0;
            border-bottom: 1px solid #e6ebf5;
          }
        }
      `}</style>
    </main>
  );
}
