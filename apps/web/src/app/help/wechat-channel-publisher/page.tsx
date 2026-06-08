"use client";

import Link from "next/link";

const EXTENSION_DOWNLOAD_URL = "/extensions/wechat-channel-publisher.zip";
const EXTENSION_README_URL = "/extensions/wechat-channel-publisher/README.md";

export default function WechatChannelPublisherHelpPage() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-page personal-center-page">
        <div className="page-header">
          <div>
            <p className="page-kicker">视频号浏览器辅助发布 PoC</p>
            <h1>扩展下载与最小验证说明</h1>
            <p className="page-description">
              当前这是视频号独立插件的 PoC 骨架，只用于验证网页端能否被扩展接管，不代表已经完成正式发布链路。
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
              <strong>当前验证目标</strong>
              <p className="personal-meta">这版只回答 4 个问题，不直接做正式发布。</p>
            </div>
          </div>
          <ol className="publish-help-list">
            <li>能否稳定打开 `https://channels.weixin.qq.com/`。</li>
            <li>能否在登录后的页面稳定注入扩展。</li>
            <li>能否探测到视频页或图文页的上传控件。</li>
            <li>能否探测到标题区和正文区，为后续自动填写做准备。</li>
          </ol>
        </article>

        <article className="panel personal-card publish-help-card">
          <div className="entity-card-head">
            <div>
              <strong>安装步骤</strong>
              <p className="personal-meta">当前只支持开发者模式下加载已解压扩展。</p>
            </div>
          </div>
          <ol className="publish-help-list">
            <li>打开 Chrome 或 Edge 的扩展管理页。</li>
            <li>开启“开发者模式”。</li>
            <li>选择“加载已解压的扩展程序”，选择 `wechat-channel-publisher` 目录。</li>
            <li>确认站点访问权限已经放开 `https://channels.weixin.qq.com/*`。</li>
            <li>登录视频号助手后，检查左上角是否出现 PoC 状态提示浮层。</li>
          </ol>
        </article>

        <article className="panel personal-card publish-help-card">
          <div className="entity-card-head">
            <div>
              <strong>当前边界</strong>
              <p className="personal-meta">下面这些能力故意不在 PoC 第一版里实现。</p>
            </div>
          </div>
          <ul className="publish-help-list">
            <li>当前不会自动上传视频或图片。</li>
            <li>当前不会自动点击发表或保存草稿。</li>
            <li>当前不会接正式视频号工作台入口。</li>
            <li>当前不会与小红书/抖音重新合并成统一插件。</li>
          </ul>
          <div className="personal-actions">
            <Link href="/" className="secondary-button">
              返回工作台首页
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
