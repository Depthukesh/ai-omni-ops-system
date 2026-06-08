"use client";

import Link from "next/link";

const EXTENSION_DOWNLOAD_URL = "/extensions/omni-publisher.zip";
const EXTENSION_README_URL = "/extensions/omni-publisher/README.md";

export default function PublisherHelpPage() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-page personal-center-page">
        <div className="page-header">
          <div>
            <p className="page-kicker">统一发布扩展</p>
            <h1>扩展下载与安装教程</h1>
            <p className="page-description">
              该扩展同时支持小红书与抖音的电脑端辅助发布。安装一次后，工作台会按平台自动接管对应的创作者发布页面。
            </p>
          </div>
          <div className="personal-actions">
            <a href={EXTENSION_DOWNLOAD_URL} className="primary-button" download>
              下载统一扩展压缩包
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
            <li>下载并解压统一扩展压缩包。</li>
            <li>打开 Chrome 或 Edge 的扩展管理页，开启“开发者模式”。</li>
            <li>点击“加载已解压的扩展程序”，选择解压后的 `omni-publisher` 目录。</li>
            <li>进入扩展详情页，确认站点访问权限已允许当前工作台域名、`creator.xiaohongshu.com` 与 `creator.douyin.com`。</li>
            <li>确保浏览器已经登录小红书与抖音创作者中心，再回到工作台重新打开发布弹窗。</li>
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
            <li>`https://creator.douyin.com/*`</li>
          </ul>
        </article>

        <article className="panel personal-card publish-help-card">
          <div className="entity-card-head">
            <div>
              <strong>平台能力</strong>
              <p className="personal-meta">统一扩展会按平台自动走不同的辅助发布逻辑。</p>
            </div>
          </div>
          <ul className="publish-help-list">
            <li>小红书：自动上传配图、填写标题与正文，并保存到草稿箱。</li>
            <li>抖音：自动上传视频、填写标题与描述，最后一步仍需人工确认发布。</li>
          </ul>
          <div className="personal-actions">
            <Link href="/xiaohongshu" className="secondary-button">
              返回小红书工作台
            </Link>
            <Link href="/douyin" className="secondary-button">
              返回抖音工作台
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
