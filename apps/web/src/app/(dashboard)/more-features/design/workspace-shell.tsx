"use client";

import { useMemo, useState } from "react";

type DesignModuleKey = "image" | "html" | "deck" | "video";

type DesignModuleMeta = {
  key: DesignModuleKey;
  label: string;
  description: string;
  createLabel: string;
  types: string[];
  models: string[];
  works: {
    title: string;
    status: string;
    updatedAt: string;
    summary: string;
    tags: string[];
  }[];
};

const designModules: DesignModuleMeta[] = [
  {
    key: "image",
    label: "图片设计",
    description: "面向活动海报、朋友圈海报、电商主图、电商详情图等静态视觉设计任务。",
    createLabel: "创建图片设计",
    types: ["活动海报", "朋友圈海报", "电商主图", "电商详情图", "社媒配图", "图标视觉"],
    models: ["Venice Image Generate", "Venice Image Edit", "Image-to-Image", "GPT Image 2"],
    works: [
      {
        title: "夏季活动海报",
        status: "已完成 4 版",
        updatedAt: "2026/06/03 14:22",
        summary: "用于品牌活动页和朋友圈传播，主视觉偏清爽明亮风格。",
        tags: ["活动海报", "植入品牌资料", "参考图已上传"],
      },
      {
        title: "电商主图方案 B",
        status: "待确认",
        updatedAt: "2026/06/03 10:05",
        summary: "用于商城商品列表页，突出单品卖点和价格感知。",
        tags: ["电商主图", "不植入品牌资料", "GPT Image 2"],
      },
    ],
  },
  {
    key: "html",
    label: "HTML 设计",
    description: "面向 UI 界面、活动页、详情页、数据看板和移动端原型等 HTML 页面设计。",
    createLabel: "创建 HTML 设计",
    types: ["UI 界面", "活动页", "落地页", "电商详情页", "数据看板", "移动端原型"],
    models: ["R1 HTML Designer", "Web Artifacts Builder", "Landing Page Countdown", "Catalyst MUI Module"],
    works: [
      {
        title: "会员增长活动页",
        status: "已出首版",
        updatedAt: "2026/06/03 15:18",
        summary: "包含 Hero、权益说明、FAQ 和报名 CTA，可继续转正式页面。",
        tags: ["活动页", "植入品牌资料", "HTML"],
      },
      {
        title: "品牌后台看板",
        status: "草稿中",
        updatedAt: "2026/06/03 11:36",
        summary: "以运营日报和内容分发指标为核心，适合继续接真实数据。",
        tags: ["数据看板", "UI 界面", "MUI"],
      },
    ],
  },
  {
    key: "deck",
    label: "PPT 设计",
    description: "面向产品汇报、品牌提案、Pitch Deck、周报月报等演示文稿设计。",
    createLabel: "创建 PPT 设计",
    types: ["Pitch Deck", "产品汇报", "品牌提案", "周报月报", "项目复盘", "招商方案"],
    models: ["PPTX", "Slides Skills"],
    works: [
      {
        title: "季度品牌提案 Deck",
        status: "已导出 PPTX",
        updatedAt: "2026/06/02 20:40",
        summary: "包含封面、问题定义、方案页、案例页和落地建议。",
        tags: ["品牌提案", "PPTX", "植入品牌资料"],
      },
      {
        title: "新品发布汇报",
        status: "待补图表",
        updatedAt: "2026/06/02 18:12",
        summary: "当前大纲和页面层次已完成，待补充数据图表和产品视觉。",
        tags: ["产品汇报", "Slides", "图表"],
      },
    ],
  },
  {
    key: "video",
    label: "视频设计",
    description: "面向营销短视频、产品展示视频、分镜板和旁白脚本等视频类设计任务。",
    createLabel: "创建视频设计",
    types: ["营销短视频", "产品展示视频", "故事板", "分镜脚本", "年度回顾视频", "配音脚本"],
    models: ["Venice Video", "Video Hyperframes", "YouTube Clipper", "Venice Audio Speech"],
    works: [
      {
        title: "AI 视频（故事板）",
        status: "累计 3 条任务",
        updatedAt: "2026/06/03 16:05",
        summary: "先生成故事板，再继续衍生最终成片和口播脚本。",
        tags: ["故事板", "营销短视频", "品牌资料植入"],
      },
      {
        title: "年度回顾视频模板",
        status: "待继续生成",
        updatedAt: "2026/06/03 09:30",
        summary: "用于年度总结与品牌回顾，支持数据驱动的叙事视频结构。",
        tags: ["年度回顾", "视频模板", "Venice Video"],
      },
    ],
  },
];

const calendarOptions = ["2026-06-11 | 毕业季营销方案", "2026-06-18 | 618 电商活动", "2026-07-01 | 暑期品牌推广"];
const productOptions = ["不植入产品", "品牌A 主推产品", "品牌B 新品系列", "品牌C 爆款单品"];
const brandOptions = ["植入品牌资料", "不植入品牌资料"];

interface DesignWorkspaceShellProps {
  section: { label: string; description: string };
}

function DesignCreateDialog({
  module,
  open,
  onClose,
}: {
  module: DesignModuleMeta;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="design-v3-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="design-v3-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-v3-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="design-v3-dialog__header">
          <div>
            <strong id="design-v3-dialog-title">{module.createLabel}</strong>
            <p>先填写基础选项，再由 Agent 结合营销日历、产品与品牌资料生成当前板块作品。</p>
          </div>
          <button type="button" className="design-v3-text-button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="design-v3-dialog__body">
          <div className="design-v3-form-grid">
            <label className="design-v3-field">
              <span>营销日历</span>
              <select defaultValue={calendarOptions[0]}>
                {calendarOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>产品</span>
              <select defaultValue={productOptions[0]}>
                {productOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>品牌资料</span>
              <select defaultValue={brandOptions[0]}>
                {brandOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>类型</span>
              <select defaultValue={module.types[0]}>
                {module.types.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field design-v3-field--full">
              <span>上传参考图</span>
              <div className="design-v3-upload-box">
                <strong>选择文件</strong>
                <p>支持上传品牌参考图、版式示意图或竞品参考图，可为空。</p>
              </div>
            </label>
            <label className="design-v3-field">
              <span>{module.key === "html" ? "页面生成引擎" : module.key === "deck" ? "PPT 生成引擎" : module.key === "video" ? "视频生成引擎" : "生图大模型"}</span>
              <select defaultValue={module.models[0]}>
                {module.models.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="design-v3-field">
              <span>作品规格</span>
              <input
                type="text"
                defaultValue={module.key === "image" ? "1242×1660" : module.key === "html" ? "桌面端优先" : module.key === "deck" ? "10 页以内" : "15 秒"}
              />
            </label>
            <label className="design-v3-field design-v3-field--full">
              <span>用户要求</span>
              <textarea
                rows={5}
                defaultValue={`请基于营销日历、${module.label}类型、品牌资料和产品信息生成一版${module.label}，要求风格清晰、结构可继续编辑，并保留后续二次优化空间。`}
              />
            </label>
          </div>
        </div>

        <div className="design-v3-dialog__footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button type="button" className="primary-button">
            提交创建
          </button>
        </div>
      </div>
    </div>
  );
}

function ModuleStatusCard({ module }: { module: DesignModuleMeta }) {
  return (
    <article className="design-v3-status-card">
      <div>
        <h3>{module.label}任务状态</h3>
        <p>{module.description} 点击右上角创建按钮后，先填写选项，再在下方查看作品结果。</p>
      </div>
      <div className="design-v3-status-pills">
        <span className="archive-pill status-ready">累计 {module.works.length} 个作品</span>
        <span className="archive-pill status-pending">支持品牌资料植入</span>
        <span className="archive-pill status-pending">支持参考图</span>
      </div>
    </article>
  );
}

function ModuleWorks({ module }: { module: DesignModuleMeta }) {
  return (
    <section className="design-v3-works">
      <div className="collection-result-head">
        <div>
          <h3>作品结果</h3>
          <p>当前作品按卡片方式呈现，后续可继续扩展为图片预览、HTML 预览、PPT 页缩略图和视频分镜板。</p>
        </div>
        <span className="archive-pill status-ready">已展示 {module.works.length} 个</span>
      </div>

      <div className="design-v3-work-grid">
        {module.works.map((work) => (
          <article key={`${module.key}-${work.title}`} className="design-v3-work-card">
            <div className="design-v3-work-thumb">
              <span>{module.label}</span>
              <strong>{work.tags[0]}</strong>
            </div>
            <div className="design-v3-work-body">
              <div className="design-v3-work-head">
                <strong>{work.title}</strong>
                <span>{work.updatedAt}</span>
              </div>
              <p>{work.summary}</p>
              <div className="design-v3-work-tags">
                {work.tags.map((tag) => (
                  <span key={tag} className="archive-pill status-pending">
                    {tag}
                  </span>
                ))}
                <span className="archive-pill status-ready">{work.status}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DesignWorkspaceShell({ section }: DesignWorkspaceShellProps) {
  const [activeModule, setActiveModule] = useState<DesignModuleKey>("image");
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeMeta = useMemo(
    () => designModules.find((item) => item.key === activeModule) ?? designModules[0],
    [activeModule],
  );

  return (
    <>
      <div className="design-v3-shell">
        <section className="dashboard-hero xiaohongshu-hero">
          <div>
            <h1>{section.label}</h1>
            <p>{section.description}</p>
            <div className="workspace-toolbar top-toolbar">
              <div className="workspace-status">
                <span className="archive-pill status-ready">可直接创建</span>
                <span className="archive-pill status-pending">横向二级模块</span>
                <span className="status-text">当前设计模块已调整为类似抖音工作台的结构，上方切换不同设计类型，点击创建后弹出统一选项表单。</span>
              </div>
              <div className="personal-actions">
                <button type="button" className="secondary-button">
                  刷新数据
                </button>
              </div>
            </div>
          </div>
        </section>

        <article className="workspace-panel strategy-page-card">
          <div className="design-v3-tab-row">
            {designModules.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`design-v3-tab ${item.key === activeModule ? "is-active" : ""}`}
                onClick={() => setActiveModule(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="design-v3-module-head">
            <div>
              <strong>{activeMeta.label}</strong>
              <p>{activeMeta.description}</p>
            </div>
            <div className="design-v3-module-actions">
              <button type="button" className="secondary-button">
                刷新列表
              </button>
              <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
                {activeMeta.createLabel}
              </button>
            </div>
          </div>

          <ModuleStatusCard module={activeMeta} />
          <ModuleWorks module={activeMeta} />
        </article>
      </div>

      <DesignCreateDialog module={activeMeta} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
