"use client";

import { type DouyinMobilePublishSession } from "../../../services/publishing";
import { ManagedImage } from "../xiaohongshu/managed-image";
import { type OptionalDateFormatter, type PlatformAccount } from "../xiaohongshu/shared-types";
import { type DouyinPublishableWorkTarget } from "./publish-types";

export interface DouyinPublishModalProps {
  publishTarget: DouyinPublishableWorkTarget | null;
  platformAccounts: PlatformAccount[];
  publishingAccountValue: string;
  isCreatingMobilePublishSession: boolean;
  activeMobilePublishSession: DouyinMobilePublishSession | null;
  mobilePublishQrDataUrl: string;
  isCompletingMobilePublishSession: boolean;
  notice: string;
  errorMessage: string;
  onClose: () => void;
  onAccountChange: (value: string) => void;
  onCreateMobileSession: () => void | Promise<void>;
  onCompleteMobileSession: () => void | Promise<void>;
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
              <span className="archive-pill status-pending">手机接力</span>
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
                onClick={() => void props.onCreateMobileSession()}
                disabled={props.isCreatingMobilePublishSession}
              >
                {props.isCreatingMobilePublishSession ? "生成中..." : "生成手机扫码接力码"}
              </button>
              <div className="publish-dialog-hint">
                手机扫码后会打开抖音接力页，自动准备标题正文、视频素材和打开 App 的入口，适合当前先做的接力发布链路。
              </div>
              {!douyinAccounts.length ? (
                <div className="publish-dialog-hint">
                  当前品牌还没有配置抖音账号，本次仍可先生成接力页；后续建议去品牌资料里补齐账号，便于多账号发布时选择目标账号。
                </div>
              ) : null}
            </div>

            {props.activeMobilePublishSession ? (
              <div className="publish-qr-panel">
                <div className="publish-qr-code">
                  {props.mobilePublishQrDataUrl ? (
                    <ManagedImage src={props.mobilePublishQrDataUrl} alt="抖音手机扫码接力二维码" loadingMode="eager" />
                  ) : (
                    <div className="publish-qr-placeholder">二维码生成中</div>
                  )}
                </div>
                <div className="publish-qr-copy">
                  <strong>手机扫码接力发布抖音</strong>
                  <p>
                    用手机扫码后，会打开接力页，里面已准备好标题、正文和最终视频。你只需要在抖音 App 中补充话题或定位后完成发布。
                  </p>
                  <p className="publish-qr-meta">会话有效期至：{props.formatDateTime(props.activeMobilePublishSession.expiresAt)}</p>
                  {props.activeMobilePublishSession.accessHint ? (
                    <p className="publish-qr-meta publish-qr-meta--warn">{props.activeMobilePublishSession.accessHint}</p>
                  ) : null}
                  {props.notice ? <p className="publish-qr-meta">{props.notice}</p> : null}
                  {props.errorMessage ? <p className="publish-qr-meta publish-qr-meta--warn">{props.errorMessage}</p> : null}
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
                      {props.isCompletingMobilePublishSession ? "更新中..." : "我已在手机完成发布"}
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
