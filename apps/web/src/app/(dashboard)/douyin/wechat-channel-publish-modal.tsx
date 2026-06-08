"use client";

import { type DouyinPublishableWorkTarget } from "./publish-types";
import { type WechatChannelExtensionProbeResult, type WechatChannelPublishSession } from "./wechat-channel-publish-bridge";

const EXTENSION_DOWNLOAD_URL = "/extensions/wechat-channel-publisher.zip";
const EXTENSION_GUIDE_URL = "/help/wechat-channel-publisher";
const CREATOR_URL = "https://channels.weixin.qq.com/";

export interface WechatChannelPublishModalProps {
  publishTarget: DouyinPublishableWorkTarget | null;
  isExtensionReady: boolean;
  isLaunching: boolean;
  notice: string;
  errorMessage: string;
  probeResult: WechatChannelExtensionProbeResult | null;
  activeSession: WechatChannelPublishSession | null;
  onClose: () => void;
  onStartPublishProbe: () => void | Promise<void>;
}

export function WechatChannelPublishModal(props: WechatChannelPublishModalProps) {
  if (!props.publishTarget) {
    return null;
  }

  return (
    <div className="media-preview-overlay" onClick={props.onClose}>
      <div className="media-preview-dialog calendar-detail-dialog publish-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-preview-close" onClick={props.onClose}>
          关闭
        </button>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>发布到视频号</strong>
              <p className="personal-meta">
                {props.publishTarget.title}
                {props.publishTarget.sourceLabel ? ` · ${props.publishTarget.sourceLabel}` : ""}
              </p>
            </div>
            <div className="report-editor-actions">
              <span className="archive-pill status-ready">视频号</span>
              <span className="archive-pill status-pending">PoC 在线验证</span>
              <span className={`archive-pill ${props.isExtensionReady ? "status-ready" : "status-in_progress"}`}>
                {props.isExtensionReady ? "扩展已连接" : "等待扩展连接"}
              </span>
            </div>
          </div>

          <div className="personal-list publish-dialog-stack">
            <div className="publish-dialog-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void props.onStartPublishProbe()}
                disabled={props.isLaunching}
              >
                {props.isLaunching ? "验证中..." : "打开视频号助手并验证"}
              </button>
              <div className="publish-dialog-hint">
                这一轮先接入视频号独立插件 PoC，用于在线验证浏览器扩展是否能打开 `channels.weixin.qq.com`、注入页面并识别上传控件与文案区域。
              </div>
              <div className="publish-dialog-hint">
                当前不是正式发布链路，不会自动上传视频，也不会自动点击发表。
              </div>
              <div className="publish-dialog-link-row">
                <a className="secondary-button" href={EXTENSION_DOWNLOAD_URL} download>
                  下载扩展插件
                </a>
                <a className="secondary-button" href={EXTENSION_GUIDE_URL} target="_blank" rel="noreferrer">
                  查看安装教程
                </a>
                <a className="secondary-button" href={CREATOR_URL} target="_blank" rel="noreferrer">
                  手动打开视频号助手
                </a>
              </div>
              {!props.isExtensionReady ? (
                <div className="publish-dialog-hint">
                  如果仍提示未检测到扩展，请确认开发者模式已加载 `wechat-channel-publisher`，并把当前工作台域名与 `channels.weixin.qq.com` 的站点权限一并放开。
                </div>
              ) : null}
              {props.notice ? <div className="publish-dialog-hint">{props.notice}</div> : null}
              {props.errorMessage ? <div className="publish-dialog-hint publish-qr-meta--warn">{props.errorMessage}</div> : null}
            </div>

            {props.activeSession ? (
              <div className="publish-qr-panel">
                <div className="publish-qr-copy publish-qr-copy--single">
                  <strong>本次验证任务</strong>
                  <p>模式：{props.activeSession.mode === "VIDEO" ? "视频" : props.activeSession.mode}</p>
                  <p>标题：{props.activeSession.title}</p>
                  <p>说明：{props.activeSession.content}</p>
                  {props.activeSession.videoUrl ? (
                    <a className="xhs-material-detail-button" href={props.activeSession.videoUrl} target="_blank" rel="noreferrer">
                      打开当前作品视频
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {props.probeResult ? (
              <div className="publish-qr-panel">
                <div className="publish-qr-copy publish-qr-copy--single">
                  <strong>探测结果</strong>
                  <p>
                    页面类型：{props.probeResult.pageKindLabel}
                    {props.probeResult.expectedMode ? ` · 预期模式：${props.probeResult.expectedMode}` : ""}
                  </p>
                  <p>上传控件：{props.probeResult.fileInputCount} 个</p>
                  <p>标题区：{props.probeResult.titleDetected ? "已命中" : "未命中"} · 正文区：{props.probeResult.contentDetected ? "已命中" : "未命中"}</p>
                  <p className="publish-qr-meta">页面地址：{props.probeResult.locationHref}</p>
                  {props.probeResult.buttonLabels.length ? (
                    <p className="publish-qr-meta">页面按钮：{props.probeResult.buttonLabels.join("、")}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
