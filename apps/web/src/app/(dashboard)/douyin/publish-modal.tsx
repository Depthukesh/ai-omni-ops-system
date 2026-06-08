"use client";

import { type DouyinDesktopPublishSession } from "../../../services/publishing";
import { type OptionalDateFormatter, type PlatformAccount } from "../xiaohongshu/shared-types";
import { type DouyinPublishableWorkTarget } from "./publish-types";

const EXTENSION_DOWNLOAD_URL = "/extensions/omni-publisher.zip";
const EXTENSION_GUIDE_URL = "/help/publisher";

export interface DouyinPublishModalProps {
  publishTarget: DouyinPublishableWorkTarget | null;
  platformAccounts: PlatformAccount[];
  publishingAccountValue: string;
  isDesktopExtensionReady: boolean;
  isCreatingDesktopPublishSession: boolean;
  activeDesktopPublishSession: DouyinDesktopPublishSession | null;
  notice: string;
  errorMessage: string;
  onClose: () => void;
  onAccountChange: (value: string) => void;
  onCreateDesktopSession: () => void | Promise<void>;
  formatDateTime: OptionalDateFormatter;
}

export function DouyinPublishModal(props: DouyinPublishModalProps) {
  if (!props.publishTarget) {
    return null;
  }

  const douyinAccounts = props.platformAccounts.filter((item) => item.platform === "DOUYIN");

  return (
    <div className="media-preview-overlay" onClick={props.onClose}>
      <div className="media-preview-dialog calendar-detail-dialog publish-dialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-preview-close" onClick={props.onClose}>
          关闭
        </button>
        <article className="entity-card personal-card">
          <div className="entity-card-head">
            <div>
              <strong>发布到抖音</strong>
              <p className="personal-meta">
                {props.publishTarget.title}
                {props.publishTarget.sourceLabel ? ` · ${props.publishTarget.sourceLabel}` : ""}
              </p>
            </div>
            <div className="report-editor-actions">
              <span className="archive-pill status-ready">抖音</span>
              <span className="archive-pill status-pending">电脑端辅助发布</span>
              <span className={`archive-pill ${props.isDesktopExtensionReady ? "status-ready" : "status-in_progress"}`}>
                {props.isDesktopExtensionReady ? "电脑端扩展已连接" : "等待电脑端扩展"}
              </span>
            </div>
          </div>

          <div className="personal-list publish-dialog-stack">
            <label>
              <span>发布账号</span>
              <select
                value={props.publishingAccountValue}
                onChange={(event) => props.onAccountChange(event.target.value)}
                disabled={!douyinAccounts.length}
              >
                {douyinAccounts.length ? (
                  douyinAccounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.accountName || item.accountLink}
                    </option>
                  ))
                ) : (
                  <option value="">当前品牌尚未配置抖音账号</option>
                )}
              </select>
            </label>

            <div className="publish-dialog-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void props.onCreateDesktopSession()}
                disabled={props.isCreatingDesktopPublishSession}
              >
                {props.isCreatingDesktopPublishSession ? "准备中..." : "电脑端辅助发布到抖音"}
              </button>
              <div className="publish-dialog-hint">
                电脑端辅助发布会调用本地浏览器扩展，自动打开抖音创作者中心上传页，上传视频并填写标题、描述与话题。最后一步发布由你人工确认。
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
                  若当前仍提示未检测到统一扩展，请先确认两件事：一是已在 Chrome/Edge 的开发者模式里加载扩展；二是扩展详情里的“站点访问权限”已同时放开当前工作台域名和
                  `creator.douyin.com`。
                </div>
              ) : null}
              {!douyinAccounts.length ? (
                <div className="publish-dialog-hint">
                  当前品牌还没有配置抖音账号，本次仍可先打开创作者中心辅助发布；后续建议去品牌资料里补齐账号，便于多账号发布时选择目标账号。
                </div>
              ) : null}
            </div>

            {props.activeDesktopPublishSession ? (
              <div className="publish-qr-panel">
                <div className="publish-qr-copy publish-qr-copy--single">
                  <strong>电脑端自动准备发布中</strong>
                  <p>
                    扩展会自动打开抖音创作者中心上传页，上传最终视频并填写标题、描述和话题。你只需要检查内容、补充定位等设置，然后手动点击发布。
                  </p>
                  <p className="publish-qr-meta">会话有效期至：{props.formatDateTime(props.activeDesktopPublishSession.expiresAt)}</p>
                  {props.activeDesktopPublishSession.accessHint ? (
                    <p className="publish-qr-meta publish-qr-meta--warn">{props.activeDesktopPublishSession.accessHint}</p>
                  ) : null}
                  {props.notice ? <p className="publish-qr-meta">{props.notice}</p> : null}
                  {props.errorMessage ? <p className="publish-qr-meta publish-qr-meta--warn">{props.errorMessage}</p> : null}
                  <a className="xhs-material-detail-button" href={props.activeDesktopPublishSession.creatorUrl} target="_blank" rel="noreferrer">
                    手动打开抖音创作者页
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
