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
  generateWechatArticleDraft,
  getWechatAccountConfig,
  getWechatArticleDrafts,
  saveWechatAccountConfig,
  type WechatAccountConfigRecord,
  type WechatArticleDraftRecord,
  type WechatImageMode,
} from "../../../services/works";

type WechatSectionKey = "config" | "original";
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

function buildWhitelistText(ips: string[]) {
  return ips.join("\n");
}

function parseWhitelistText(value: string) {
  return value
    .split(/[\n,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildDraftTitle(calendarItem?: XiaohongshuMarketingCalendarItem, product?: BrandProduct) {
  const topic = calendarItem?.topicName || "公众号原创文章";
  return product ? `${topic}：${product.productName}内容发布稿` : `${topic}：品牌内容发布稿`;
}

function buildDraftSummary(calendarItem?: XiaohongshuMarketingCalendarItem, product?: BrandProduct, includeBrand?: boolean) {
  const topic = calendarItem?.topicName || "当前营销节点";
  const productPart = product ? `与${product.productName}` : "";
  return `围绕${topic}${productPart}生成公众号原创文章${includeBrand ? "，并植入品牌资料" : ""}。`;
}

function buildDraftContent(params: {
  calendarItem?: XiaohongshuMarketingCalendarItem;
  product?: BrandProduct;
  includeBrandProfile: boolean;
  instruction: string;
}) {
  const { calendarItem, product, includeBrandProfile, instruction } = params;
  const sections = [
    product
      ? `围绕营销主题「${calendarItem?.topicName || "当前营销节点"}」撰写公众号文章，重点突出${product.productName}。`
      : `围绕营销主题「${calendarItem?.topicName || "当前营销节点"}」撰写公众号文章，本次不植入具体产品，只突出活动信息、品牌内容和转化动作。`,
    product
      ? `产品资料：定位为${product.productPositioning}，适用场景是${product.usageScenario}，核心差异化为${product.differentiators}。`
      : "产品资料：本次不植入具体产品，请避免输出具体产品卖点或单品推荐。",
    includeBrandProfile ? "本次文章需要自然植入品牌资料、品牌故事和服务承诺。" : "本次文章不植入品牌资料，只突出活动信息。",
    calendarItem?.topicContent ? `营销日历参考：${calendarItem.topicContent}` : "营销日历参考：请结合当前营销节点做节奏安排。",
    instruction || "请输出适合公众号后台的 HTML 结构文章，并预留一键发布到公众号后台。",
  ];
  return sections.join("\n\n");
}

export function WechatWorkspaceShell() {
  const [activeSection, setActiveSection] = useState<WechatSectionKey>("config");
  const [brandId, setBrandId] = useState(DEMO_BRAND_ID);
  const [archive, setArchive] = useState<BrandArchiveBundle | null>(null);
  const [calendarWorkspace, setCalendarWorkspace] = useState<XiaohongshuMarketingCalendarWorkspace>({ history: [] });
  const [config, setConfig] = useState<WechatAccountConfigRecord | null>(null);
  const [drafts, setDrafts] = useState<WechatArticleDraftRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [publishingDraftId, setPublishingDraftId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [whitelistText, setWhitelistText] = useState("");

  const [draftTitle, setDraftTitle] = useState("");
  const [selectedCalendarId, setSelectedCalendarId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [brandInfoMode, setBrandInfoMode] = useState<"yes" | "no">("no");
  const [imageMode, setImageMode] = useState<WechatImageMode>("cover-and-body");
  const [selectedTheme, setSelectedTheme] = useState(themeOptions[0]?.color ?? "#25554a");
  const [instruction, setInstruction] = useState("");

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

  const selectedCalendar = useMemo(
    () => calendarItems.find((item) => item.id === selectedCalendarId),
    [calendarItems, selectedCalendarId],
  );
  const products = archive?.products || [];
  const selectedProduct = useMemo(
    () => products.find((item) => item.id === selectedProductId),
    [products, selectedProductId],
  );

  useEffect(() => {
    setBrandId(getStoredCurrentBrandId(DEMO_BRAND_ID) || DEMO_BRAND_ID);
  }, []);

  useEffect(() => {
    if (!selectedCalendarId && calendarItems[0]?.id) {
      setSelectedCalendarId(calendarItems[0].id);
    }
  }, [calendarItems, selectedCalendarId]);

  useEffect(() => {
    if (!selectedProductId) {
      setSelectedProductId(NO_PRODUCT_VALUE);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (!draftTitle) {
      setDraftTitle(buildDraftTitle(selectedCalendar, selectedProduct));
    }
  }, [draftTitle, selectedCalendar, selectedProduct]);

  useEffect(() => {
    async function loadWorkspace() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [archiveResult, calendarResult, configResult, draftsResult] = await Promise.all([
          getBrandArchive(brandId),
          getXiaohongshuMarketingCalendarWorkspace(brandId),
          getWechatAccountConfig(brandId),
          getWechatArticleDrafts(brandId),
        ]);
        setArchive(archiveResult);
        setCalendarWorkspace(calendarResult);
        setConfig(configResult.item);
        setDrafts(draftsResult.items);
        setAppId(configResult.item.appId || "");
        setAppSecret("");
        setWhitelistText(buildWhitelistText(configResult.item.whitelistIps || []));
        setSelectedTheme(configResult.item.defaultThemeColor || themeOptions[0]?.color || "#25554a");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "公众号工作台加载失败。");
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkspace();
  }, [brandId]);

  function openDraftPreview(htmlContent: string) {
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function handleSaveConfig() {
    setIsSavingConfig(true);
    setErrorMessage("");
    try {
      const response = await saveWechatAccountConfig(brandId, {
        appId,
        appSecret,
        whitelistIps: parseWhitelistText(whitelistText),
        defaultThemeColor: selectedTheme,
      });
      setConfig(response.item);
      setAppSecret("");
      setWhitelistText(buildWhitelistText(response.item.whitelistIps));
      setNotice("公众号配置已保存，AppID / AppSecret / IP 白名单已更新。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存公众号配置失败。");
    } finally {
      setIsSavingConfig(false);
    }
  }

  async function handleGenerateDraft() {
    setIsGenerating(true);
    setErrorMessage("");
    try {
      const payload = {
        title: draftTitle || buildDraftTitle(selectedCalendar, selectedProduct),
        summary: buildDraftSummary(selectedCalendar, selectedProduct, brandInfoMode === "yes"),
        themeColor: selectedTheme,
        imageMode,
        injectMarketingCalendar: Boolean(selectedCalendar),
        injectProducts: Boolean(selectedProduct),
        injectBrandProfile: brandInfoMode === "yes",
        selectedMarketingLabels: selectedCalendar ? [selectedCalendar.topicName] : [],
        selectedProductLabels: selectedProduct ? [selectedProduct.productName] : [],
        selectedBrandLabels: brandInfoMode === "yes" ? ["品牌资料"] : [],
        content: buildDraftContent({
          calendarItem: selectedCalendar,
          product: selectedProduct,
          includeBrandProfile: brandInfoMode === "yes",
          instruction,
        }),
      } as const;
      const response = await generateWechatArticleDraft(brandId, payload);
      setDrafts((current) => [response.item, ...current.filter((item) => item.id !== response.item.id)]);
      setNotice("公众号原创文章已生成，可以直接在作品卡片里一键发布到公众号后台。");
      setIsCreateModalOpen(false);
      setActiveSection("original");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "生成公众号文章失败。");
    } finally {
      setIsGenerating(false);
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
              <strong>公众号工作区</strong>
              <p>和其他板块统一为左侧分栏、右侧工作区。</p>
            </div>
            <button
              type="button"
              className={`wechat-nav-item ${activeSection === "config" ? "is-active" : ""}`}
              onClick={() => setActiveSection("config")}
            >
              配置页面
            </button>
            <button
              type="button"
              className={`wechat-nav-item ${activeSection === "original" ? "is-active" : ""}`}
              onClick={() => setActiveSection("original")}
            >
              原创创作
            </button>
          </aside>

          <div className="wechat-stage">
            {errorMessage ? <div className="wechat-banner wechat-banner--error">{errorMessage}</div> : null}
            {notice ? <div className="wechat-banner wechat-banner--notice">{notice}</div> : null}

            {activeSection === "config" ? (
              <article className="workspace-panel strategy-page-card">
                <div className="workspace-toolbar top-toolbar">
                  <div>
                    <strong>配置页面</strong>
                    <p className="wechat-description">这里只保留公众号接入配置：`AppID`、`AppSecret` 和 IP 白名单。</p>
                  </div>
                  <button type="button" className="primary-button" onClick={handleSaveConfig} disabled={isSavingConfig}>
                    {isSavingConfig ? "保存中..." : "保存配置"}
                  </button>
                </div>

                <div className="wechat-config-grid">
                  <section className="light-data-panel">
                    <h3>公众号密钥配置</h3>
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
                    </div>
                  </section>

                  <section className="light-data-panel">
                    <h3>IP 白名单</h3>
                    <label className="wechat-field">
                      <span>将服务出口 IP 加入微信公众平台白名单，一行一个</span>
                      <textarea
                        value={whitelistText}
                        onChange={(event) => setWhitelistText(event.target.value)}
                        placeholder={"47.97.12.20\n47.97.12.21"}
                      />
                    </label>
                    <p className="wechat-inline-tip">发布到公众号后台前，会校验这里是否已配置白名单。</p>
                  </section>
                </div>
              </article>
            ) : (
              <article className="workspace-panel strategy-page-card">
                <div className="workspace-toolbar top-toolbar">
                  <div>
                    <strong>原创创作</strong>
                    <p className="wechat-description">生成后的文章按作品卡片展示，可直接一键发布到公众号后台。</p>
                  </div>
                  <div className="strategy-inline-actions">
                    <button type="button" className="secondary-button" onClick={() => window.location.reload()} disabled={isLoading}>
                      刷新数据
                    </button>
                    <button type="button" className="primary-button" onClick={() => setIsCreateModalOpen(true)}>
                      添加原创文章
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="empty-state">公众号原创作品加载中...</div>
                ) : !drafts.length ? (
                  <div className="empty-state">当前还没有公众号原创作品，点击右上角“添加原创文章”开始创作。</div>
                ) : (
                  <div className="wechat-work-grid">
                    {drafts.map((draft) => (
                      <article key={draft.id} className="wechat-work-card">
                        <div
                          className="wechat-work-cover"
                          style={{
                            background: `linear-gradient(135deg, ${draft.themeColor} 0%, #e9d2a8 100%)`,
                          }}
                        />
                        <div className="wechat-work-body">
                          <div className="wechat-pill-row">
                            <span className={`archive-pill ${draft.publishStatus === "PUBLISHED" ? "status-ready" : "status-pending"}`}>
                              {draft.publishStatus === "PUBLISHED" ? "已发布到公众号后台" : "待发布"}
                            </span>
                            <span className="archive-pill status-ready">HTML</span>
                            <span className="archive-pill status-ready">{draft.imageTask ? "已带图片任务" : "纯文章"}</span>
                          </div>
                          <h3>{draft.title}</h3>
                          <p>{draft.summary}</p>
                          <div className="wechat-meta-list">
                            <span>营销日历：{draft.selectedMarketingLabels[0] || "未选择"}</span>
                            <span>产品：{draft.injectProducts ? draft.selectedProductLabels[0] || "未选择" : "不植入产品"}</span>
                            <span>品牌资料：{draft.injectBrandProfile ? "是" : "否"}</span>
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
            )}
          </div>
        </div>
      </section>

      {isCreateModalOpen ? (
        <div className="media-preview-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="media-preview-dialog wechat-create-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="media-preview-close" onClick={() => setIsCreateModalOpen(false)}>
              关闭
            </button>
            <article className="entity-card personal-card wechat-modal-card">
              <div className="entity-card-head">
                <div>
                  <strong>添加原创文章</strong>
                  <p className="personal-meta">提交方式参考小红书，营销日历、产品和品牌资料都改成下拉选择。</p>
                </div>
              </div>

              <div className="wechat-form-grid">
                <label className="wechat-field wechat-field--full">
                  <span>文章标题</span>
                  <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="请输入公众号文章标题" />
                </label>
                <label className="wechat-field">
                  <span>营销日历</span>
                  <select value={selectedCalendarId} onChange={(event) => setSelectedCalendarId(event.target.value)}>
                    {calendarItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.date} · {item.topicName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wechat-field">
                  <span>产品信息</span>
                  <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
                    <option value={NO_PRODUCT_VALUE}>不植入产品</option>
                    {products.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.productName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="wechat-field">
                  <span>品牌资料</span>
                  <select value={brandInfoMode} onChange={(event) => setBrandInfoMode(event.target.value as "yes" | "no")}>
                    <option value="no">否</option>
                    <option value="yes">是</option>
                  </select>
                </label>
                <label className="wechat-field">
                  <span>图片生成策略</span>
                  <select value={imageMode} onChange={(event) => setImageMode(event.target.value as WechatImageMode)}>
                    {imageModeOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="wechat-field wechat-field--full">
                  <span>主题颜色</span>
                  <div className="wechat-swatch-row">
                    {themeOptions.map((item) => (
                      <button
                        key={item.color}
                        type="button"
                        className={`wechat-swatch ${selectedTheme === item.color ? "is-active" : ""}`}
                        style={{ background: item.color }}
                        onClick={() => setSelectedTheme(item.color)}
                        aria-label={item.label}
                      />
                    ))}
                  </div>
                </div>
                <label className="wechat-field wechat-field--full">
                  <span>创作要求</span>
                  <textarea
                    value={instruction}
                    onChange={(event) => setInstruction(event.target.value)}
                    placeholder="例如：围绕活动节点、门店爆品和转化动作写一篇适合公众号发布的原创文章。"
                  />
                </label>
              </div>

              <div className="strategy-inline-actions">
                <button type="button" className="secondary-button" onClick={() => setIsCreateModalOpen(false)}>
                  取消
                </button>
                <button type="button" className="primary-button" onClick={() => void handleGenerateDraft()} disabled={isGenerating}>
                  {isGenerating ? "生成中..." : "生成原创文章"}
                </button>
              </div>
            </article>
          </div>
        </div>
      ) : null}

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

        .wechat-stage {
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
        .wechat-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
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
          min-height: 150px;
          resize: vertical;
          line-height: 1.7;
        }

        .wechat-work-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .wechat-work-card {
          overflow: hidden;
          border: 1px solid #e4e8f0;
          border-radius: 22px;
          background: #ffffff;
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08);
        }

        .wechat-work-cover {
          height: 190px;
        }

        .wechat-work-body {
          display: grid;
          gap: 12px;
          padding: 16px;
        }

        .wechat-pill-row,
        .wechat-card-actions,
        .wechat-swatch-row,
        .wechat-meta-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .wechat-meta-list span {
          padding: 6px 10px;
          border-radius: 999px;
          background: #f3f5f9;
          color: #607089;
          font-size: 12px;
        }

        .wechat-work-card h3 {
          margin: 0;
          color: #18243e;
          font-size: 18px;
          line-height: 1.45;
        }

        .wechat-work-card p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .wechat-create-dialog {
          width: min(880px, 100%);
        }

        .wechat-modal-card {
          gap: 18px;
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

        @media (max-width: 1120px) {
          .wechat-layout,
          .wechat-config-grid,
          .wechat-form-grid,
          .wechat-work-grid {
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
