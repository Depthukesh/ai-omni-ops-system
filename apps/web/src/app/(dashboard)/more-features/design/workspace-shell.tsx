"use client";

import { useCallback, useMemo, useState } from "react";

type DesignSubSection = "image" | "video" | "brand-assets" | "templates";

interface DesignSectionMeta {
  key: DesignSubSection;
  label: string;
  icon: string;
  description: string;
}

const designSubSections: DesignSectionMeta[] = [
  {
    key: "image",
    label: "AI 图片生成",
    icon: "🖼️",
    description: "通过 AI 模型生成品牌营销图片，支持多尺寸、多风格输出，适配小红书、抖音等平台需求。",
  },
  {
    key: "video",
    label: "AI 视频设计",
    icon: "🎬",
    description: "AI 驱动的短视频生成与编辑，支持口播带货、品牌宣传、短剧等多种视频类型。",
  },
  {
    key: "brand-assets",
    label: "品牌素材设计",
    icon: "📦",
    description: "管理品牌专属设计素材库，包括 Logo、配色方案、字体规范和品牌视觉模板。",
  },
  {
    key: "templates",
    label: "模板市场",
    icon: "🛒",
    description: "浏览和使用预设设计模板，覆盖小红书图文、抖音视频封面、公众号头图等常用场景。",
  },
];

interface SectionProps {
  section: DesignSectionMeta & { key: string; label: string; description: string };
}

function ImageGenerationSection({ section }: SectionProps) {
  return (
    <section className="dashboard-hero xiaohongshu-hero">
      <div>
        <h1>{section.icon} {section.label}</h1>
        <p>{section.description}</p>
        <div className="workspace-toolbar top-toolbar">
          <div className="workspace-status">
            <span className="archive-pill status-in_progress">待接入</span>
            <span className="status-text">该功能模块预留了 AI 图片生成的交互骨架，后续接入大模型和图生图链路后即可使用。</span>
          </div>
          <div className="personal-actions">
            <span className="archive-pill status-pending">即将上线</span>
          </div>
        </div>
      </div>
      <article className="workspace-panel strategy-page-card" style={{ marginTop: 20 }}>
        <div className="strategy-card-toolbar">
          <div>
            <strong>生成配置</strong>
            <p className="text-xs text-slate-500 mt-2">配置图片生成的参数，包括尺寸、风格、参考图等。</p>
          </div>
        </div>
        <div className="empty-state">
          <p>🖼️ 图片生成能力即将开放。</p>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>
            接入后将支持：原创笔记配图、产品海报、品牌视觉素材等多场景 AI 图片生成。
          </p>
          <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {["1242×1660 (小红书图文)", "1080×1920 (抖音竖屏)", "900×383 (公众号头图)", "800×800 (商品主图)"].map((size) => (
              <span key={size} className="archive-pill status-pending">{size}</span>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}

function VideoDesignSection({ section }: SectionProps) {
  return (
    <section className="dashboard-hero xiaohongshu-hero">
      <div>
        <h1>{section.icon} {section.label}</h1>
        <p>{section.description}</p>
        <div className="workspace-toolbar top-toolbar">
          <div className="workspace-status">
            <span className="archive-pill status-in_progress">待接入</span>
            <span className="status-text">该功能模块预留了 AI 视频设计的交互骨架，后续接入视频生成模型后即可使用。</span>
          </div>
          <div className="personal-actions">
            <span className="archive-pill status-pending">即将上线</span>
          </div>
        </div>
      </div>
      <article className="workspace-panel strategy-page-card" style={{ marginTop: 20 }}>
        <div className="strategy-card-toolbar">
          <div>
            <strong>视频类型</strong>
            <p className="text-xs text-slate-500 mt-2">选择视频创作类型，配置剧本、分镜和生成参数。</p>
          </div>
        </div>
        <div className="empty-state">
          <p>🎬 视频设计能力即将开放。</p>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>
            接入后将支持：品牌宣传视频、口播带货视频、短剧带货视频、复刻视频等 AI 短视频创作。
          </p>
          <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {["品牌宣传", "口播带货", "短剧带货", "复刻视频"].map((type) => (
              <span key={type} className="archive-pill status-pending">{type}</span>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}

function BrandAssetsSection({ section }: SectionProps) {
  const [activeTab, setActiveTab] = useState<"logo" | "colors" | "fonts" | "templates">("logo");

  const assetTabs = [
    { key: "logo" as const, label: "Logo 管理", icon: "🏷️" },
    { key: "colors" as const, label: "配色方案", icon: "🎨" },
    { key: "fonts" as const, label: "字体规范", icon: "🔤" },
    { key: "templates" as const, label: "视觉模板", icon: "📐" },
  ];

  return (
    <section className="dashboard-hero xiaohongshu-hero">
      <div>
        <h1>{section.icon} {section.label}</h1>
        <p>{section.description}</p>
        <div className="workspace-toolbar top-toolbar">
          <div className="workspace-status">
            <span className="archive-pill status-in_progress">待接入</span>
            <span className="status-text">品牌素材设计模块预留了素材管理界面骨架，后续接入品牌数据库后展示实际素材。</span>
          </div>
          <div className="personal-actions">
            <button type="button" className="secondary-button" disabled>
              上传素材
            </button>
            <span className="archive-pill status-pending">即将上线</span>
          </div>
        </div>
      </div>
      <article className="workspace-panel strategy-page-card" style={{ marginTop: 20 }}>
        <div className="strategy-card-toolbar">
          <div style={{ display: "flex", gap: 8 }}>
            {assetTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`strategy-level-button ${tab.key === activeTab ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
                style={{ padding: "6px 14px" }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="empty-state" style={{ minHeight: 200 }}>
          <p>📦 品牌素材管理即将开放。</p>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>
            接入品牌数据库后，此处将展示 {assetTabs.find(t => t.key === activeTab)?.label} 的实际内容。
          </p>
          <div style={{ marginTop: 16 }}>
            <span className="archive-pill status-pending">需要接入品牌资料 API</span>
          </div>
        </div>
      </article>
    </section>
  );
}

function TemplateMarketSection({ section }: SectionProps) {
  const templateCategories = [
    { key: "xhs-image", label: "小红书图文", count: 0 },
    { key: "xhs-video-cover", label: "小红书视频封面", count: 0 },
    { key: "douyin-cover", label: "抖音封面", count: 0 },
    { key: "wechat-header", label: "公众号头图", count: 0 },
    { key: "product-card", label: "商品卡片", count: 0 },
    { key: "poster", label: "活动海报", count: 0 },
  ];

  return (
    <section className="dashboard-hero xiaohongshu-hero">
      <div>
        <h1>{section.icon} {section.label}</h1>
        <p>{section.description}</p>
        <div className="workspace-toolbar top-toolbar">
          <div className="workspace-status">
            <span className="archive-pill status-in_progress">待接入</span>
            <span className="status-text">模板市场预留了分类浏览和模板预览的交互骨架，后续接入模板库数据后即可使用。</span>
          </div>
          <div className="personal-actions">
            <span className="archive-pill status-pending">即将上线</span>
          </div>
        </div>
      </div>
      <article className="workspace-panel strategy-page-card" style={{ marginTop: 20 }}>
        <div className="strategy-card-toolbar">
          <div>
            <strong>模板分类</strong>
            <p className="text-xs text-slate-500 mt-2">按内容类型和平台浏览预设设计模板。</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, padding: 16 }}>
          {templateCategories.map((cat) => (
            <div
              key={cat.key}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: 20,
                textAlign: "center",
                background: "var(--bg-card)",
              }}
            >
              <p style={{ fontSize: 28, marginBottom: 8 }}>📄</p>
              <strong style={{ fontSize: 14 }}>{cat.label}</strong>
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                {cat.count > 0 ? `${cat.count} 个模板` : "暂无模板"}
              </p>
            </div>
          ))}
        </div>
        <div className="empty-state" style={{ border: "none", paddingTop: 8 }}>
          <span className="archive-pill status-pending">需要接入模板库数据源</span>
          <span className="archive-pill status-pending" style={{ marginLeft: 8 }}>预留搜索和筛选接口</span>
        </div>
      </article>
    </section>
  );
}

interface DesignWorkspaceShellProps {
  section: { key: string; label: string; icon: string; description: string };
}

export function DesignWorkspaceShell({ section }: DesignWorkspaceShellProps) {
  const [activeSubSection, setActiveSubSection] = useState<DesignSubSection>("image");

  const activeMeta = useMemo(
    () => designSubSections.find((item) => item.key === activeSubSection) ?? designSubSections[0],
    [activeSubSection],
  );

  const renderSubSection = useCallback(() => {
    switch (activeSubSection) {
      case "image":
        return <ImageGenerationSection section={activeMeta} />;
      case "video":
        return <VideoDesignSection section={activeMeta} />;
      case "brand-assets":
        return <BrandAssetsSection section={activeMeta} />;
      case "templates":
        return <TemplateMarketSection section={activeMeta} />;
      default:
        return <ImageGenerationSection section={activeMeta} />;
    }
  }, [activeSubSection, activeMeta]);

  return (
    <div className="strategy-layout xiaohongshu-layout">
      <aside className="strategy-level-panel strategy-level-panel--directory" style={{ borderRight: "1px solid var(--border-color)", padding: "12px 0" }}>
        <div style={{ padding: "0 12px 8px", fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          设计工具
        </div>
        <div className="strategy-level-button-list">
          {designSubSections.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`strategy-level-button ${item.key === activeSubSection ? "is-active" : ""}`}
              onClick={() => setActiveSubSection(item.key)}
            >
              <span style={{ marginRight: 8 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <div className="strategy-content-panel xiaohongshu-content-panel">
        {renderSubSection()}
      </div>
    </div>
  );
}
