"use client";

import { type PublishableWorkTarget } from "./publish-types";
import { type AsyncAction, type OptionalDateFormatter, type PlatformAccount } from "./shared-types";
import {
  type XiaohongshuDesktopDraftSession,
  type XiaohongshuMobileDraftSession,
} from "../../../services/publishing";
import { buildDesktopCreatorLaunchUrl } from "./desktop-publish-bridge";
import { ManagedImage } from "./managed-image";

const EXTENSION_DOWNLOAD_URL = "/extensions/xhs-draft-publisher.zip";
const EXTENSION_GUIDE_URL = "/help/xhs-draft-publisher";

export interface PublishModalProps {
  publishTarget: PublishableWorkTarget | null;
  platformAccounts: PlatformAccount[];
  publishingAccountValue: string;
  isDesktopExtensionReady: boolean;
  isCreatingDesktopPublishSession: boolean;
  activeDesktopPublishSession: XiaohongshuDesktopDraftSession | null;
  isCreatingMobilePublishSession: boolean;
  activeMobilePublishSession: XiaohongshuMobileDraftSession | null;
  mobilePublishQrDataUrl: string;
  isCompletingMobilePublishSession: boolean;
  notice: string;
  errorMessage: string;
  onClose: () => void;
  onAccountChange: (value: string) => void;
  onCreateDesktopSession: AsyncAction;
  onCreateMobileSession: AsyncAction;
  onCompleteMobileSession: AsyncAction;
  formatDateTime: OptionalDateFormatter;
}

export function PublishModal(props: PublishModalProps) {
  if (!props.publishTarget) {
    return null;
  }

  const desktopCreatorLaunchUrl = props.activeDesktopPublishSession
    ? buildDesktopCreatorLaunchUrl(props.activeDesktopPublishSession)
    : "";

  return (
    <div className="media-preview-overlay" onClick={props.onClose}>
      <div className="media-preview-dialog calendar-detail-dialog publish-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-preview-close" onClick={props.onClose}>
          关闭
        </button>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>{props.publishTarget.noteCategory}笔记发布</strong>
              <p className="personal-meta">
                {props.publishTarget.title}
                {props.publishTarget.sourceLabel ? ` · ${props.publishTarget.sourceLabel}` : ""}
              </p>
            </div>
            <div className="report-editor-actions">
              <span className="archive-pill status-ready">小红书</span>
              <span className="archive-pill status-pending">保存草稿</span>
              <span className={`archive-pill ${props.isDesktopExtensionReady ? "status-ready" : "status-in_progress"}`}>
                {props.isDesktopExtensionReady ? "电脑端扩展已连接" : "等待电脑端扩展"}
              </span>
            </div>
          </div>

          <div className="personal-list publish-dialog-stack">
            <label>
              <span>发布账号</span>
              <select value={props.publishingAccountValue} onChange={(event) => props.onAccountChange(event.target.value)}>
                {props.platformAccounts
                  .filter((item) => item.platform === "XIAOHONGSHU")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.accountName || item.accountLink}
                    </option>
                  ))}
              </select>
            </label>

            <div className="publish-dialog-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void props.onCreateDesktopSession()}
                disabled={props.isCreatingDesktopPublishSession}
              >
                {props.isCreatingDesktopPublishSession ? "发布中..." : "电脑端一键发布到草稿箱"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void props.onCreateMobileSession()}
                disabled={props.isCreatingMobilePublishSession}
              >
                {props.isCreatingMobilePublishSession ? "生成中..." : "生成手机扫码接力码"}
              </button>
              <div className="publish-dialog-hint">
                电脑端一键发布会调用本地浏览器扩展，自动把标题、正文和配图写入小红书草稿箱。手机扫码接力保留为备用方案。
              </div>
              <div className="publish-dialog-hint">
                当前小红书电脑端发布仅支持图文笔记草稿箱，不支持视频笔记直发。
              </div>
              <div className="publish-dialog-link-row">
                <a className="secondary-button" href={EXTENSION_DOWNLOAD_URL} download>
                  下载扩展插件
                </a>
                <a className="secondary-button" href={EXTENSION_GUIDE_URL} target="_blank" rel="noreferrer">
                  查看安装教程
                </a>
              </div>
              {!props.isDesktopExtensionReady ? (
                <div className="publish-dialog-hint">
                  若当前仍提示未检测到扩展，请先确认两件事：一是已在 Chrome/Edge 的开发者模式里加载扩展；二是扩展详情里的“站点访问权限”已同时放开当前工作台域名和
                  `creator.xiaohongshu.com`。线上 `https://17ai.site` 与本地 `localhost/127.0.0.1` 需要分别授权。
                </div>
              ) : null}
            </div>

            {props.activeDesktopPublishSession ? (
              <div className="publish-qr-panel">
                <div className="publish-qr-copy publish-qr-copy--single">
                  <strong>电脑端自动发布进行中</strong>
                  <p>扩展会自动打开小红书创作者中心，切到图文发布页，上传配图并填写标题、正文，然后保存到草稿箱。</p>
                  <p className="publish-qr-meta">如果创作者页左上角没有出现 “AI发布扩展” 黑色状态条，说明扩展还没有注入到 `creator.xiaohongshu.com`，请到扩展详情页放开站点权限并点击“刷新”后重试。</p>
                  {props.notice ? <p className="publish-qr-meta">{props.notice}</p> : null}
                  {props.errorMessage ? <p className="publish-qr-meta publish-qr-meta--warn">{props.errorMessage}</p> : null}
                  <p className="publish-qr-meta">有效期至：{props.formatDateTime(props.activeDesktopPublishSession.expiresAt)}</p>
                  {props.activeDesktopPublishSession.accessHint ? (
                    <p className="publish-qr-meta publish-qr-meta--warn">{props.activeDesktopPublishSession.accessHint}</p>
                  ) : null}
                  <a className="xhs-material-detail-button" href={desktopCreatorLaunchUrl} target="_blank" rel="noreferrer">
                    手动打开小红书创作者页
                  </a>
                </div>
              </div>
            ) : null}

            {props.activeMobilePublishSession ? (
              <div className="publish-qr-panel">
                <div className="publish-qr-code">
                  {props.mobilePublishQrDataUrl ? (
                    <ManagedImage src={props.mobilePublishQrDataUrl} alt="手机扫码接力二维码" loadingMode="eager" />
                  ) : (
                    <div className="publish-qr-placeholder">二维码生成中</div>
                  )}
                </div>
                <div className="publish-qr-copy">
                  <strong>手机扫码接力保存草稿</strong>
                  <p>
                    用手机扫码后，会打开接力页，里面已准备好标题、正文和图片素材。你只需要在小红书 App
                    里粘贴并保存到草稿箱。
                  </p>
                  <p className="publish-qr-meta">会话有效期至：{props.formatDateTime(props.activeMobilePublishSession.expiresAt)}</p>
                  {props.activeMobilePublishSession.accessHint ? (
                    <p className="publish-qr-meta publish-qr-meta--warn">{props.activeMobilePublishSession.accessHint}</p>
                  ) : null}
                  <a className="xhs-material-detail-button" href={props.activeMobilePublishSession.mobileUrl} target="_blank" rel="noreferrer">
                    打开手机接力页
                  </a>
                  <div className="strategy-inline-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void props.onCompleteMobileSession()}
                      disabled={props.isCompletingMobilePublishSession}
                    >
                      {props.isCompletingMobilePublishSession ? "更新中..." : "我已在手机完成保存"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
