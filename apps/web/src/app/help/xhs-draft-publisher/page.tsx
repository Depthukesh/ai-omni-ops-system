"use client";

import Link from "next/link";

const EXTENSION_DOWNLOAD_URL = "/extensions/xhs-draft-publisher.zip";
const EXTENSION_README_URL = "/extensions/xhs-draft-publisher/README.md";

export default function XhsDraftPublisherHelpPage() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-page personal-center-page">
        <div className="page-header">
          <div>
            <p className="page-kicker">小红书电脑端一键发布扩展</p>
            <h1>扩展下载与安装教程</h1>
            <p className="page-description">
              该扩展用于接收 AI 全域运营系统里的“小红书一键发布”指令，自动打开创作者中心并把标题、正文、配图写入草稿箱。
            </p>
          </div>
          <div className="personal-actions">
            <a href={EXTENSION_DOWNLOAD_URL} className="primary-button" download>
              下载扩展压缩包
            </a>
            <a href={EXTENSION_README_URL} className="secondary-button" target="_blank" rel="noreferrer">
              查看 README
            </a>
          </div>
        </div>

        <article className="panel personal-card publish-help-card">
          <div className="entity-card-head">
            <div>
              <strong>安装步骤</strong>
              <p className="personal-meta">首次安装或更新扩展后，请按以下步骤完成加载和授权。</p>
            </div>
          </div>
          <ol className="publish-help-list">
            <li>下载并解压扩展压缩包。</li>
            <li>打开 Chrome 或 Edge 的扩展管理页，开启“开发者模式”。</li>
            <li>点击“加载已解压的扩展程序”，选择解压后的 `xhs-draft-publisher` 目录。</li>
            <li>进入扩展详情页，确认站点访问权限已允许当前工作台域名以及 `creator.xiaohongshu.com`。</li>
            <li>确保浏览器已经登录小红书创作者中心，再回到工作台重新打开“一键发布”弹窗。</li>
          </ol>
        </article>

        <article className="panel personal-card publish-help-card">
          <div className="entity-card-head">
            <div>
              <strong>必须授权的站点</strong>
              <p className="personal-meta">如果任一站点没授权，工作台就收不到扩展回执，会一直显示“等待电脑端扩展”。</p>
            </div>
          </div>
          <ul className="publish-help-list">
            <li>`http://localhost:3001/*`</li>
            <li>`http://127.0.0.1:3001/*`</li>
            <li>`https://17ai.site/*`</li>
            <li>`https://creator.xiaohongshu.com/*`</li>
          </ul>
        </article>

        <article className="panel personal-card publish-help-card">
          <div className="entity-card-head">
            <div>
              <strong>常见问题</strong>
              <p className="personal-meta">下面几类问题最容易导致你明明装了扩展，却在工作台里仍然显示未连接。</p>
            </div>
          </div>
          <ul className="publish-help-list">
            <li>扩展只加载到了本地 `localhost`，但你当前打开的是 `https://17ai.site`。</li>
            <li>扩展详情页里“站点访问权限”仍是“点击时”，没有放开当前站点。</li>
            <li>浏览器未登录小红书创作者中心，扩展只能打开页面但无法自动写入草稿。</li>
            <li>更新扩展代码后没有在扩展管理页点击“刷新”，导致工作台和扩展版本不一致。</li>
          </ul>
          <div className="personal-actions">
            <Link href="/xiaohongshu" className="secondary-button">
              返回小红书工作台
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
