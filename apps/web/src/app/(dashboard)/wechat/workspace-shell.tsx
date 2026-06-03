"use client";

import { useMemo, useState, type CSSProperties } from "react";

type ThemeOption = {
  label: string;
  color: string;
};

type DraftItem = {
  title: string;
  summary: string;
};

type RuntimeCard = {
  name: string;
  slug: string;
  scene: string;
  provider: string;
  runtime: string;
  description: string;
};

const themeOptions: ThemeOption[] = [
  { label: "墨绿", color: "#25554a" },
  { label: "琥珀", color: "#8f6237" },
  { label: "雾蓝", color: "#3a4e73" },
  { label: "紫灰", color: "#7d5c8e" },
  { label: "金棕", color: "#b1874d" },
];

const draftItems: DraftItem[] = [
  {
    title: "夏季新品上市：门店预热版",
    summary: "已生成 HTML 草稿 · 已同步图片任务 · 2 分钟前",
  },
  {
    title: "端午会员活动：品牌故事版",
    summary: "已保存到公众号草稿箱 · 已植入营销日历和品牌信息",
  },
  {
    title: "新品到店权益合集",
    summary: "待补封面图 · 图片技能已就绪 · 43 分钟前",
  },
];

const runtimeCards: RuntimeCard[] = [
  {
    name: "公众号创作文章",
    slug: "wechat-article-composer",
    scene: "公众号创作文章",
    provider: "Right Codes 文生文",
    runtime: "text-global / text-domestic-*",
    description: "根据营销日历、产品信息、品牌信息和主题色生成适合草稿箱的 HTML 文章。",
  },
  {
    name: "公众号制作图片",
    slug: "wechat-image-designer",
    scene: "公众号制作图片",
    provider: "Right Codes 文生图",
    runtime: "image-generation",
    description: "生成公众号头图、封面图和文中配图，并复用第三方文生图运行时。",
  },
];

const articleBodySeed = `# 新品为什么值得在这个节点推出？

今年夏季，我们把“轻松通勤 + 门店试穿体验 + 品牌故事”组合成一条完整内容链路。公众号文章不仅要讲产品卖点，也要交代品牌理念，并把营销节奏自然接上。

## 这篇文章建议包含什么？
1. 新品主推系列和适用场景
2. 当前营销节点与到店权益
3. 品牌长期理念与用户口碑

最后再补一个“下一步行动”区，引导用户进入门店、社群或小程序。`;

const shellCardStyle: CSSProperties = {
  border: "1px solid #e4e8f0",
  borderRadius: 22,
  background: "#ffffff",
  boxShadow: "0 18px 48px rgba(15, 23, 42, 0.08)",
};

function extractPreviewParagraph(content: string) {
  return (
    content
      .split("\n")
      .map((line) => line.replace(/^#+\s*/, "").trim())
      .find((line) => line.length > 12) ?? "这里会显示正文中的第一段有效内容。"
  );
}

export function WechatWorkspaceShell() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState("秋季会员活动预告：品牌故事、主推商品与到店权益一页讲清");
  const [summary, setSummary] = useState("围绕新品定位、使用场景和品牌理念，生成适合公众号草稿箱的长文结构。");
  const [author, setAuthor] = useState("品牌内容中心");
  const [body, setBody] = useState(articleBodySeed);
  const [coverMode, setCoverMode] = useState("ai");
  const [commentMode, setCommentMode] = useState("open");
  const [imageMode, setImageMode] = useState("cover-and-body");
  const [appId, setAppId] = useState("wx7d1f83c1a2e429c");
  const [appSecret, setAppSecret] = useState("af42m3w8x-secret-demo-2938");
  const [selectedTheme, setSelectedTheme] = useState(themeOptions[0]?.color ?? "#25554a");
  const [injectMarketing, setInjectMarketing] = useState(true);
  const [injectProduct, setInjectProduct] = useState(true);
  const [injectBrand, setInjectBrand] = useState(false);
  const [actionNotice, setActionNotice] = useState("内容类型固定为 HTML，创作文章与制作图片会分别走文生文、文生图链路。");

  const previewBody = useMemo(() => extractPreviewParagraph(body), [body]);
  const selectedThemeLabel = useMemo(
    () => themeOptions.find((item) => item.color === selectedTheme)?.label ?? "自定义",
    [selectedTheme],
  );

  const coverStyle = useMemo<CSSProperties>(
    () => ({
      height: 220,
      borderRadius: 24,
      background: `linear-gradient(180deg, rgba(24,49,45,0.08), rgba(24,49,45,0.18)), radial-gradient(circle at 20% 18%, rgba(255,255,255,0.36), transparent 28%), linear-gradient(135deg, ${selectedTheme} 0%, #d2b17a 100%)`,
    }),
    [selectedTheme],
  );

  function handleSyncPreview() {
    setActionNotice(`已同步预览：当前主题色为 ${selectedThemeLabel}，输出固定为 HTML。`);
  }

  function handleGenerateDraft() {
    setActionNotice("已生成 HTML 草稿，并准备触发公众号头图与文中配图任务。");
  }

  function handleSaveDraft() {
    setActionNotice("已提交到服务端草稿链路：仅保存到公众号草稿箱，不直接群发。");
  }

  function handleOpenCreate() {
    setIsCreateModalOpen(true);
  }

  function handleCloseCreate() {
    setIsCreateModalOpen(false);
  }

  return (
    <main className="workspace-page workspace-page--strategy">
      <section className="workspace-card workspace-card--bleed strategy-page-card" style={{ overflow: "hidden" }}>
        <div className="wechat-shell">
          <aside className="wechat-sidebar">
            <section className="dashboard-hero xiaohongshu-hero" style={shellCardStyle}>
              <div className="archive-pill status-ready">公众号板块 · 弹窗式工作台</div>
              <h1>像“小红书添加原创笔记”一样，先开弹窗，再组织公众号文章与图片生产。</h1>
              <p>
                创作和发布不再使用页面内大表单，而是通过“添加公众号文章”弹窗统一收集营销日历、产品信息、品牌信息、
                主题颜色、账号配置和图片策略。
              </p>
              <div className="wechat-metric-grid">
                <article className="metric-card">
                  <span>输出格式</span>
                  <strong>固定 HTML</strong>
                  <p>内容类型不再让用户选择，统一为适合公众号草稿箱预览的 HTML。</p>
                </article>
                <article className="metric-card">
                  <span>技能同步</span>
                  <strong>2 项能力</strong>
                  <p>创作文章与制作图片同步进入前端技能中心和后台技能管理。</p>
                </article>
                <article className="metric-card">
                  <span>模型链路</span>
                  <strong>文生文 + 文生图</strong>
                  <p>文章走第三方文生文模型，图片走第三方文生图模型。</p>
                </article>
              </div>
            </section>

            <section className="workspace-panel strategy-page-card" style={shellCardStyle}>
              <div className="strategy-card-toolbar">
                <div>
                  <strong>执行流程</strong>
                  <p>从弹窗发起内容创作，再同步到技能中心和公众号草稿箱链路。</p>
                </div>
              </div>
              <div className="wechat-step-list">
                <article className="light-data-panel wechat-step-card">
                  <h3>1. 打开“添加公众号文章”</h3>
                  <p>入口对齐小红书“添加原创笔记”，在弹窗中完成主要配置。</p>
                </article>
                <article className="light-data-panel wechat-step-card">
                  <h3>2. 选择植入与主题色</h3>
                  <p>在弹窗中勾选营销日历、产品信息、品牌信息，并统一设置主题颜色与评论策略。</p>
                </article>
                <article className="light-data-panel wechat-step-card">
                  <h3>3. 模型生成与草稿发布</h3>
                  <p>文章调用文生文模型生成 HTML，图片调用文生图模型，最后只保存到公众号草稿箱。</p>
                </article>
              </div>
            </section>

            <section className="workspace-panel strategy-page-card" style={shellCardStyle}>
              <div className="strategy-card-toolbar">
                <div>
                  <strong>最近文章草稿</strong>
                  <p>保留最近一次创作结果与任务状态，方便继续编辑和发布。</p>
                </div>
              </div>
              <div className="wechat-step-list">
                {draftItems.map((item) => (
                  <article key={item.title} className="light-data-panel wechat-draft-card">
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          </aside>

          <div className="wechat-main">
            <section className="dashboard-hero xiaohongshu-hero" style={{ ...shellCardStyle, paddingBottom: 24 }}>
              <div className="workspace-toolbar top-toolbar">
                <div className="workspace-status">
                  <span className="archive-pill status-ready">已接正式入口</span>
                  <span className="archive-pill status-pending">草稿箱模式</span>
                  <span className="status-text">AppSecret 仅经服务端保存，不在前端直接换取公众号 access_token。</span>
                </div>
                <div className="strategy-inline-actions">
                  <button type="button" className="secondary-button" onClick={handleSyncPreview}>
                    同步到右侧预览
                  </button>
                  <button type="button" className="primary-button" onClick={handleOpenCreate}>
                    添加公众号文章
                  </button>
                </div>
              </div>
              <h1>公众号工作台</h1>
              <p>
                当前板块已按“弹窗式创作”改造，和小红书原创建笔记保持一致的启动方式，同时把“公众号创作文章”和“公众号制作图片”
                两项能力同步到技能中心。
              </p>
              <div className="wechat-tag-row">
                <span className="archive-pill status-ready">创作文章 → {runtimeCards[0]?.runtime}</span>
                <span className="archive-pill status-ready">制作图片 → {runtimeCards[1]?.runtime}</span>
                <span className="archive-pill status-pending">默认封面：{coverMode === "ai" ? "AI 自动生成" : "人工处理"}</span>
                <span className="archive-pill status-pending">主题色：{selectedThemeLabel}</span>
              </div>
            </section>

            <div className="wechat-content-grid">
              <section className="workspace-panel strategy-page-card" style={shellCardStyle}>
                <div className="strategy-card-toolbar">
                  <div>
                    <strong>创作文章状态</strong>
                    <p>点击“添加公众号文章”后，这里展示最近一次创作任务状态和草稿结果。</p>
                  </div>
                  <div className="strategy-inline-actions">
                    <button type="button" className="secondary-button" onClick={handleGenerateDraft}>
                      生成 HTML 草稿
                    </button>
                  </div>
                </div>
                <div className="wechat-status-stack">
                  <article className="metric-card">
                    <span>最近一次任务</span>
                    <strong>公众号文章草稿正在生成中</strong>
                    <p>秋季会员活动预告，请稍候查看最新 HTML 结果与配图任务。</p>
                  </article>
                  <div className="wechat-tag-row">
                    <span className="archive-pill status-ready">营销日历</span>
                    <span className="archive-pill status-ready">产品信息</span>
                    <span className="archive-pill status-pending">品牌信息：{injectBrand ? "已植入" : "未植入"}</span>
                    <span className="archive-pill status-pending">评论：{commentMode === "open" ? "开启" : commentMode === "fans" ? "仅粉丝" : "关闭"}</span>
                  </div>
                </div>
              </section>

              <section className="workspace-panel strategy-page-card" style={shellCardStyle}>
                <div className="strategy-card-toolbar">
                  <div>
                    <strong>公众号文章预览</strong>
                    <p>预览跟随弹窗配置实时更新，输出结构固定为 HTML 草稿。</p>
                  </div>
                  <div className="strategy-inline-actions">
                    <button type="button" className="primary-button" onClick={handleSaveDraft}>
                      保存到草稿箱
                    </button>
                  </div>
                </div>
                <div className="wechat-preview-phone">
                  <div style={coverStyle} />
                  <h3>{title || "请输入文章标题"}</h3>
                  <span className="wechat-preview-meta">{author || "品牌内容中心"} · 2026-06-03 · HTML 草稿</span>
                  <div className="wechat-preview-article">
                    <article className="light-data-panel">
                      <h3>导语摘要</h3>
                      <p>{summary || "请输入文章摘要"}</p>
                    </article>
                    <article className="light-data-panel">
                      <h3>正文主内容</h3>
                      <p>{previewBody}</p>
                    </article>
                    {injectMarketing ? (
                      <article className="light-data-panel wechat-injected-card">
                        <h3>营销日历植入</h3>
                        <p>会把节日活动、门店排期和会员日节点串进正文的行动引导区。</p>
                      </article>
                    ) : null}
                    {injectProduct ? (
                      <article className="light-data-panel wechat-injected-card">
                        <h3>产品信息植入</h3>
                        <p>会补充主推商品卖点、门店推荐搭配和适用场景描述。</p>
                      </article>
                    ) : null}
                    {injectBrand ? (
                      <article className="light-data-panel wechat-injected-card">
                        <h3>品牌信息植入</h3>
                        <p>会补充品牌理念、服务承诺和品牌故事，增强公众号文章的品牌厚度。</p>
                      </article>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>

            <section className="workspace-panel strategy-page-card" style={shellCardStyle}>
              <div className="strategy-card-toolbar">
                <div>
                  <strong>技能中心同步与第三方接口</strong>
                  <p>前后端技能中心已同步两项公众号能力，并明确接到第三方文生文 / 文生图运行时。</p>
                </div>
              </div>
              <div className="wechat-runtime-grid">
                {runtimeCards.map((card) => (
                  <article key={card.slug} className="light-data-panel">
                    <h3>{card.name}</h3>
                    <p>{card.description}</p>
                    <div className="wechat-runtime-meta">
                      <span className="archive-pill status-ready">slug: {card.slug}</span>
                      <span className="archive-pill status-pending">scene: {card.scene}</span>
                      <span className="archive-pill status-pending">provider: {card.provider}</span>
                      <span className="archive-pill status-ready">runtime: {card.runtime}</span>
                    </div>
                  </article>
                ))}
              </div>
              <article className="light-data-panel" style={{ marginTop: 16 }}>
                <h3>当前接线说明</h3>
                <p>{actionNotice}</p>
                <p style={{ marginTop: 8 }}>
                  当前项目 `.env` 里没有本地 `OPENAI_API_KEY`，因此这里延续已有 Provider 体系，优先复用平台侧的第三方模型配置。
                </p>
              </article>
            </section>
          </div>
        </div>
      </section>

      {isCreateModalOpen ? (
        <div className="media-preview-overlay" onClick={handleCloseCreate}>
          <div className="media-preview-dialog wechat-create-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="media-preview-close" onClick={handleCloseCreate}>
              关闭
            </button>
            <article className="entity-card personal-card wechat-modal-card">
              <div className="entity-card-head">
                <div>
                  <strong>添加公众号文章</strong>
                  <p className="personal-meta">
                    内容类型固定为 HTML，在弹窗里一次完成营销日历、产品信息、品牌信息、主题色、账号配置和图片策略。
                  </p>
                </div>
              </div>

              <div className="wechat-modal-grid">
                <section className="light-data-panel">
                  <div className="wechat-panel-head">
                    <div>
                      <h3>基础信息</h3>
                      <p>文章内容固定生成 HTML，适合公众号草稿箱直接预览。</p>
                    </div>
                    <span className="archive-pill status-ready">输出格式：HTML</span>
                  </div>
                  <div className="wechat-form-grid">
                    <label className="wechat-field">
                      <span>文章标题</span>
                      <input value={title} onChange={(event) => setTitle(event.target.value)} />
                    </label>
                    <label className="wechat-field">
                      <span>文章摘要</span>
                      <input value={summary} onChange={(event) => setSummary(event.target.value)} />
                    </label>
                    <label className="wechat-field">
                      <span>默认作者</span>
                      <input value={author} onChange={(event) => setAuthor(event.target.value)} />
                    </label>
                    <label className="wechat-field">
                      <span>封面来源</span>
                      <select value={coverMode} onChange={(event) => setCoverMode(event.target.value)}>
                        <option value="ai">由图片技能自动生成</option>
                        <option value="upload">后续上传封面</option>
                        <option value="asset">从品牌素材中选择</option>
                      </select>
                    </label>
                    <label className="wechat-field wechat-field--full">
                      <span>正文内容</span>
                      <textarea value={body} onChange={(event) => setBody(event.target.value)} />
                    </label>
                  </div>
                </section>

                <section className="light-data-panel">
                  <div className="wechat-panel-head">
                    <div>
                      <h3>植入内容</h3>
                      <p>营销日历、产品信息和品牌信息都在弹窗里勾选和预览。</p>
                    </div>
                  </div>
                  <div className="wechat-toggle-stack">
                    <label className="wechat-toggle-card">
                      <div>
                        <strong>植入营销日历</strong>
                        <p>将节日活动、门店排期和会员日节点植入文章中。</p>
                        <div className="wechat-tag-row">
                          <span className="archive-pill status-pending">端午节主题活动</span>
                          <span className="archive-pill status-pending">夏季会员周</span>
                          <span className="archive-pill status-pending">新品试穿日</span>
                        </div>
                      </div>
                      <input type="checkbox" checked={injectMarketing} onChange={(event) => setInjectMarketing(event.target.checked)} />
                    </label>
                    <label className="wechat-toggle-card">
                      <div>
                        <strong>植入产品信息</strong>
                        <p>会将主推商品卖点、亮点参数和适用场景写入文章。</p>
                        <div className="wechat-tag-row">
                          <span className="archive-pill status-pending">轻透通勤套装</span>
                          <span className="archive-pill status-pending">门店推荐搭配</span>
                          <span className="archive-pill status-pending">3 个主卖点</span>
                        </div>
                      </div>
                      <input type="checkbox" checked={injectProduct} onChange={(event) => setInjectProduct(event.target.checked)} />
                    </label>
                    <label className="wechat-toggle-card">
                      <div>
                        <strong>植入品牌信息</strong>
                        <p>可把品牌主张、创始故事和服务承诺自然融入正文。</p>
                        <div className="wechat-tag-row">
                          <span className="archive-pill status-pending">品牌主张</span>
                          <span className="archive-pill status-pending">服务承诺</span>
                          <span className="archive-pill status-pending">会员权益</span>
                        </div>
                      </div>
                      <input type="checkbox" checked={injectBrand} onChange={(event) => setInjectBrand(event.target.checked)} />
                    </label>
                  </div>
                </section>

                <section className="light-data-panel">
                  <div className="wechat-panel-head">
                    <div>
                      <h3>主题与图片</h3>
                      <p>主题颜色和图片能力也都放在弹窗里统一配置。</p>
                    </div>
                  </div>
                  <div className="wechat-form-grid">
                    <div className="wechat-field wechat-field--full">
                      <span>主题颜色</span>
                      <div className="wechat-swatch-row">
                        {themeOptions.map((item) => (
                          <button
                            key={item.color}
                            type="button"
                            className={`wechat-swatch ${selectedTheme === item.color ? "is-active" : ""}`}
                            style={{ background: item.color }}
                            aria-label={item.label}
                            onClick={() => setSelectedTheme(item.color)}
                          />
                        ))}
                      </div>
                    </div>
                    <label className="wechat-field">
                      <span>评论策略</span>
                      <select value={commentMode} onChange={(event) => setCommentMode(event.target.value)}>
                        <option value="open">开启评论</option>
                        <option value="fans">仅粉丝可评论</option>
                        <option value="close">关闭评论</option>
                      </select>
                    </label>
                    <label className="wechat-field">
                      <span>图片生成策略</span>
                      <select value={imageMode} onChange={(event) => setImageMode(event.target.value)}>
                        <option value="cover-and-body">生成头图 + 文中配图</option>
                        <option value="cover-only">只生成头图 / 封面图</option>
                        <option value="body-only">只生成文中配图</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="light-data-panel">
                  <div className="wechat-panel-head">
                    <div>
                      <h3>公众号账号配置</h3>
                      <p>用户可自行设置 AppID 和 AppSecret，但仍然只通过后端保存。</p>
                    </div>
                  </div>
                  <div className="wechat-form-grid">
                    <label className="wechat-field">
                      <span>AppID</span>
                      <input value={appId} onChange={(event) => setAppId(event.target.value)} />
                    </label>
                    <label className="wechat-field">
                      <span>AppSecret</span>
                      <input type="password" value={appSecret} onChange={(event) => setAppSecret(event.target.value)} />
                    </label>
                  </div>
                </section>

                <section className="light-data-panel">
                  <div className="wechat-panel-head">
                    <div>
                      <h3>技能中心同步结果</h3>
                      <p>这两项会同步到前端技能中心树和后台技能 / 提示词配置。</p>
                    </div>
                  </div>
                  <div className="wechat-step-list">
                    {runtimeCards.map((card) => (
                      <article key={card.slug} className="metric-card">
                        <span>{card.name}</span>
                        <strong>{card.slug}</strong>
                        <p>{card.scene} · {card.runtime}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <div className="strategy-inline-actions">
                <button type="button" className="secondary-button" onClick={handleSyncPreview}>
                  同步到右侧预览
                </button>
                <button type="button" className="primary-button" onClick={handleGenerateDraft}>
                  生成 HTML 草稿并触发图片任务
                </button>
              </div>
            </article>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .wechat-shell {
          display: grid;
          grid-template-columns: minmax(320px, 0.86fr) minmax(0, 1.34fr);
          gap: 20px;
          padding: 20px;
          background: linear-gradient(180deg, #f6f7fb 0%, #eef2f7 100%);
        }

        .wechat-sidebar,
        .wechat-main,
        .wechat-status-stack,
        .wechat-step-list,
        .wechat-preview-article {
          display: grid;
          gap: 16px;
        }

        .wechat-content-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: 20px;
          margin-top: 20px;
        }

        .wechat-metric-grid,
        .wechat-runtime-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .wechat-preview-phone {
          padding: 18px;
          border: 10px solid #1f2937;
          border-radius: 30px;
          background: #fffdf9;
          box-shadow: 0 22px 48px rgba(15, 23, 42, 0.12);
        }

        .wechat-preview-phone h3,
        .wechat-step-card h3,
        .wechat-draft-card h3,
        .wechat-panel-head h3,
        .wechat-preview-article h3 {
          margin: 0 0 8px;
        }

        .wechat-preview-meta {
          display: block;
          margin: 10px 0 16px;
          color: var(--muted);
          font-size: 13px;
        }

        .wechat-injected-card {
          background: rgba(255, 248, 232, 0.9);
        }

        .wechat-tag-row,
        .wechat-runtime-meta,
        .wechat-swatch-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .wechat-create-dialog {
          width: min(1180px, 100%);
        }

        .wechat-modal-card {
          gap: 18px;
        }

        .wechat-modal-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .wechat-panel-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
        }

        .wechat-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .wechat-field {
          display: grid;
          gap: 8px;
          font-size: 13px;
          color: var(--muted);
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
          font: inherit;
          color: #1f2937;
          background: #ffffff;
        }

        .wechat-field textarea {
          min-height: 210px;
          resize: vertical;
          line-height: 1.7;
        }

        .wechat-toggle-stack {
          display: grid;
          gap: 12px;
        }

        .wechat-toggle-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: start;
          padding: 16px;
          border: 1px solid #e4e8f0;
          border-radius: 18px;
          background: #ffffff;
        }

        .wechat-toggle-card input {
          width: 18px;
          height: 18px;
          margin-top: 4px;
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
          outline: 2px solid rgba(37, 85, 74, 0.42);
        }

        @media (max-width: 1280px) {
          .wechat-shell,
          .wechat-content-grid,
          .wechat-modal-grid {
            grid-template-columns: 1fr;
          }

          .wechat-metric-grid,
          .wechat-runtime-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .wechat-shell {
            padding: 12px;
          }

          .wechat-metric-grid,
          .wechat-runtime-grid,
          .wechat-form-grid {
            grid-template-columns: 1fr;
          }

          .wechat-panel-head,
          .wechat-toggle-card {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
