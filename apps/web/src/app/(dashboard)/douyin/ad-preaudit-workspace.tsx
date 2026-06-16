"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DouyinAdPreAuditConfigRecord,
  type DouyinAdPreAuditMediaAssetRecord,
  type DouyinAdPreAuditRecord,
  type DouyinVodUploadStatus,
} from "../../../services/works";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

export interface DouyinAdPreAuditWorkspaceProps {
  sectionLabel: string;
  sectionDescription: string;
  isLoading: boolean;
  isSubmitting: boolean;
  canEdit: boolean;
  config: DouyinAdPreAuditConfigRecord;
  mediaAssets: DouyinAdPreAuditMediaAssetRecord[];
  items: DouyinAdPreAuditRecord[];
  onRefresh: () => void | Promise<void>;
  onSaveConfig: (payload: {
    defaultAdvertiserId?: string;
    defaultBusinessType?: string;
    vodSpaceName?: string;
  }) => unknown | Promise<unknown>;
  onUploadMedia: (mediaAssetId: string) => DouyinAdPreAuditMediaAssetRecord | null | Promise<DouyinAdPreAuditMediaAssetRecord | null>;
  onRefreshUpload: (mediaAssetId: string) => DouyinAdPreAuditMediaAssetRecord | null | Promise<DouyinAdPreAuditMediaAssetRecord | null>;
  onCreate: (payload: {
    vid?: string;
    fileId?: string;
    advertiserId?: string;
    businessType?: string;
    materialLabel?: string;
  }) => unknown | Promise<unknown>;
  onRefreshItem: (taskId: string) => unknown | Promise<unknown>;
  onDelete: (taskId: string) => unknown | Promise<unknown>;
  formatDateTime: OptionalDateFormatter;
}

const DEFAULT_BUSINESS_TYPE = "ad";

export function DouyinAdPreAuditWorkspace(props: DouyinAdPreAuditWorkspaceProps) {
  const [vid, setVid] = useState("");
  const [fileId, setFileId] = useState("");
  const [advertiserId, setAdvertiserId] = useState("");
  const [businessType, setBusinessType] = useState(DEFAULT_BUSINESS_TYPE);
  const [materialLabel, setMaterialLabel] = useState("");
  const [selectedMediaAssetId, setSelectedMediaAssetId] = useState("");
  const [configAdvertiserId, setConfigAdvertiserId] = useState("");
  const [configBusinessType, setConfigBusinessType] = useState(DEFAULT_BUSINESS_TYPE);
  const [vodSpaceName, setVodSpaceName] = useState("");

  const runningCount = useMemo(
    () => props.items.filter((item) => item.taskStatus === "RUNNING" || item.taskStatus === "QUEUED" || item.taskStatus === "PENDING").length,
    [props.items],
  );
  const uploadedCount = useMemo(
    () => props.mediaAssets.filter((item) => item.vodUpload?.status === "SUCCESS").length,
    [props.mediaAssets],
  );
  const selectedAsset = useMemo(
    () => props.mediaAssets.find((item) => item.id === selectedMediaAssetId),
    [props.mediaAssets, selectedMediaAssetId],
  );

  useEffect(() => {
    setConfigAdvertiserId(props.config.defaultAdvertiserId || "");
    setConfigBusinessType(props.config.defaultBusinessType || DEFAULT_BUSINESS_TYPE);
    setVodSpaceName(props.config.vodSpaceName || "");
    setAdvertiserId((current) => current.trim() || props.config.defaultAdvertiserId || "");
    setBusinessType((current) => current.trim() || props.config.defaultBusinessType || DEFAULT_BUSINESS_TYPE);
  }, [props.config.defaultAdvertiserId, props.config.defaultBusinessType, props.config.vodSpaceName]);

  useEffect(() => {
    if (!selectedMediaAssetId && props.mediaAssets[0]?.id) {
      setSelectedMediaAssetId(props.mediaAssets[0].id);
    }
  }, [props.mediaAssets, selectedMediaAssetId]);

  async function handleSubmit() {
    const normalizedVid = vid.trim();
    const normalizedAdvertiserId = advertiserId.trim();
    if (!normalizedVid) {
      window.alert("请先填写 VOD 的 Vid。");
      return;
    }
    if (!normalizedAdvertiserId) {
      window.alert("请先填写广告主账户 ID。");
      return;
    }
    await props.onCreate({
      vid: normalizedVid,
      fileId: fileId.trim() || undefined,
      advertiserId: normalizedAdvertiserId,
      businessType: businessType.trim() || DEFAULT_BUSINESS_TYPE,
      materialLabel: materialLabel.trim() || undefined,
    });
    setVid("");
    setFileId("");
    setMaterialLabel("");
  }

  async function handleSaveConfig() {
    await props.onSaveConfig({
      defaultAdvertiserId: configAdvertiserId.trim() || undefined,
      defaultBusinessType: configBusinessType.trim() || DEFAULT_BUSINESS_TYPE,
      vodSpaceName: vodSpaceName.trim() || undefined,
    });
  }

  function applyUploadedAssetToForm(item: DouyinAdPreAuditMediaAssetRecord | null) {
    if (!item) {
      return;
    }
    setSelectedMediaAssetId(item.id);
    setMaterialLabel(item.title || "");
    if (item.vodUpload?.status === "SUCCESS" && item.vodUpload.vid) {
      setVid(item.vodUpload.vid);
      setFileId(item.vodUpload.fileId || "");
    }
  }

  async function handleUploadMedia() {
    if (!selectedMediaAssetId) {
      window.alert("请先选择一个作品区视频。");
      return;
    }
    const item = await props.onUploadMedia(selectedMediaAssetId);
    applyUploadedAssetToForm(item);
  }

  async function handleRefreshUpload() {
    if (!selectedMediaAssetId) {
      window.alert("请先选择一个作品区视频。");
      return;
    }
    const item = await props.onRefreshUpload(selectedMediaAssetId);
    applyUploadedAssetToForm(item);
  }

  async function handleDelete(taskId: string) {
    if (!props.canEdit) {
      return;
    }
    const confirmed = window.confirm("确定删除这条广告预审记录吗？删除后不可恢复。");
    if (!confirmed) {
      return;
    }
    await props.onDelete(taskId);
  }

  return (
    <article className="workspace-panel strategy-page-card">
      <div className="strategy-card-toolbar">
        <div>
          <strong>{props.sectionLabel}</strong>
          <p className="panel-subtext">{props.sectionDescription}</p>
        </div>
        <div className="strategy-inline-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void props.onRefresh()}
            disabled={props.isLoading || props.isSubmitting}
          >
            刷新列表
          </button>
        </div>
      </div>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact">
        <div className="report-editor-head">
          <div>
            <strong>火山引擎广告预审</strong>
            <p className="panel-subtext" style={{ margin: 0 }}>
              首版直接针对已存在于 VOD 的媒资发起预审。请先在个人中心配置火山引擎 VOD OpenAPI 凭证，再填写 Vid 和广告主信息。
            </p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${props.items.length ? "status-ready" : "status-pending"}`}>共 {props.items.length} 条</span>
            <span className={`archive-pill ${runningCount ? "status-in_progress" : "status-ready"}`}>
              {runningCount ? `${runningCount} 条执行中` : "当前无执行中任务"}
            </span>
            <span className={`archive-pill ${props.canEdit ? "status-ready" : "status-pending"}`}>
              {props.canEdit ? "当前板块可编辑" : "当前板块只读"}
            </span>
          </div>
        </div>

        {!props.canEdit ? <div className="report-inline-tip">当前账号只有查看权限，不能提交、刷新或删除广告预审任务。</div> : null}

        <section className="light-data-panel" style={{ display: "grid", gap: 12 }}>
          <div className="report-editor-head">
            <div>
              <strong>默认配置</strong>
              <p className="panel-subtext" style={{ margin: 0 }}>
                广告主账户 ID、BusinessType 和 VOD SpaceName 会按品牌单独保存，后续上传和预审可以直接复用。
              </p>
            </div>
            <div className="report-editor-actions">
              <span className={`archive-pill ${props.config.defaultAdvertiserId ? "status-ready" : "status-pending"}`}>
                {props.config.defaultAdvertiserId ? "已保存广告主" : "未保存广告主"}
              </span>
              <span className={`archive-pill ${props.config.vodSpaceName ? "status-ready" : "status-pending"}`}>
                {props.config.vodSpaceName ? "已配置 SpaceName" : "未配置 SpaceName"}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span className="status-text">默认广告主账户 ID</span>
              <input
                value={configAdvertiserId}
                onChange={(event) => setConfigAdvertiserId(event.target.value)}
                placeholder="保存后可作为预审默认值"
                disabled={props.isSubmitting}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="status-text">默认 BusinessType</span>
              <input
                value={configBusinessType}
                onChange={(event) => setConfigBusinessType(event.target.value)}
                placeholder="默认 ad"
                disabled={props.isSubmitting}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="status-text">VOD SpaceName</span>
              <input
                value={vodSpaceName}
                onChange={(event) => setVodSpaceName(event.target.value)}
                placeholder="上传到火山 VOD 时必填"
                disabled={props.isSubmitting}
              />
            </label>
          </div>
          <div className="strategy-inline-actions" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleSaveConfig()}
              disabled={!props.canEdit || props.isSubmitting}
            >
              {props.isSubmitting ? "保存中..." : "保存默认配置"}
            </button>
          </div>
        </section>

        <section className="light-data-panel" style={{ display: "grid", gap: 12 }}>
          <div className="report-editor-head">
            <div>
              <strong>作品区上传到 VOD</strong>
              <p className="panel-subtext" style={{ margin: 0 }}>
                选择网站作品区里的视频，调用 VOD 的 URL 拉取上传；上传成功后会自动回填 Vid / FileId 到下面的预审表单。
              </p>
            </div>
            <div className="report-editor-actions">
              <span className={`archive-pill ${props.mediaAssets.length ? "status-ready" : "status-pending"}`}>视频 {props.mediaAssets.length} 条</span>
              <span className={`archive-pill ${uploadedCount ? "status-ready" : "status-pending"}`}>已入 VOD {uploadedCount} 条</span>
            </div>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span className="status-text">选择作品区视频</span>
            <select
              value={selectedMediaAssetId}
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedMediaAssetId(nextId);
                const nextAsset = props.mediaAssets.find((item) => item.id === nextId);
                if (nextAsset?.vodUpload?.status === "SUCCESS" && nextAsset.vodUpload.vid) {
                  applyUploadedAssetToForm(nextAsset);
                }
              }}
              disabled={props.isSubmitting || !props.mediaAssets.length}
            >
              <option value="">请选择视频作品</option>
              {props.mediaAssets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          {selectedAsset ? (
            <div style={{ display: "grid", gap: 8 }}>
              <div className="report-inline-tip">
                当前作品：{selectedAsset.title}
                {selectedAsset.durationSec ? `，时长 ${selectedAsset.durationSec}s` : ""}
                {typeof selectedAsset.fileSize === "number" ? `，大小 ${Math.round(selectedAsset.fileSize / 1024 / 1024 * 10) / 10} MB` : ""}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className={`archive-pill ${getVodUploadStatusClass(selectedAsset.vodUpload?.status)}`}>
                  {selectedAsset.vodUpload?.statusLabel || "尚未上传到 VOD"}
                </span>
                {selectedAsset.vodUpload?.jobId ? <span className="archive-pill status-pending">JobId: {selectedAsset.vodUpload.jobId}</span> : null}
                {selectedAsset.vodUpload?.vid ? <span className="archive-pill status-ready">Vid: {selectedAsset.vodUpload.vid}</span> : null}
              </div>
              {selectedAsset.vodUpload?.message ? <div className="report-inline-tip">{selectedAsset.vodUpload.message}</div> : null}
              <div className="strategy-inline-actions" style={{ justifyContent: "flex-end" }}>
                {selectedAsset.assetUrl ? (
                  <a className="note-inline-button" href={selectedAsset.assetUrl} target="_blank" rel="noreferrer">
                    打开作品
                  </a>
                ) : null}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleUploadMedia()}
                  disabled={!props.canEdit || props.isSubmitting}
                >
                  {props.isSubmitting ? "提交中..." : "上传到 VOD"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void handleRefreshUpload()}
                  disabled={!props.canEdit || props.isSubmitting}
                >
                  刷新上传状态
                </button>
              </div>
            </div>
          ) : (
            <div className="report-inline-tip">当前品牌下还没有可用的视频作品，请先在作品区生成或沉淀视频素材。</div>
          )}
        </section>

        <section className="light-data-panel" style={{ display: "grid", gap: 12 }}>
          <div className="report-editor-head">
            <div>
              <strong>广告预审提交</strong>
              <p className="panel-subtext" style={{ margin: 0 }}>
                既支持手动填写 Vid，也支持先从作品区上传到 VOD，再把返回的 Vid 自动带入这里发起预审。
              </p>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span className="status-text">Vid</span>
              <input
                value={vid}
                onChange={(event) => setVid(event.target.value)}
                placeholder="请输入 VOD Vid"
                disabled={props.isSubmitting}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="status-text">FileId</span>
              <input
                value={fileId}
                onChange={(event) => setFileId(event.target.value)}
                placeholder="可选，适用于多文件场景"
                disabled={props.isSubmitting}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="status-text">广告主账户 ID</span>
              <input
                value={advertiserId}
                onChange={(event) => setAdvertiserId(event.target.value)}
                placeholder="请输入广告主账户 ID"
                disabled={props.isSubmitting}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="status-text">BusinessType</span>
              <input
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
                placeholder="默认 ad"
                disabled={props.isSubmitting}
              />
            </label>
            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
              <span className="status-text">素材备注</span>
              <input
                value={materialLabel}
                onChange={(event) => setMaterialLabel(event.target.value)}
                placeholder="可填写素材名称、投放批次或内部备注"
                disabled={props.isSubmitting}
              />
            </label>
          </div>
          <div className="report-inline-tip">
            凭证格式为 `accessKeyId::secretAccessKey`，必要时可追加 `::cn-north-1`。如果上方作品上传成功，Vid / FileId 会自动带入这里。
          </div>
          <div className="strategy-inline-actions" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSubmit()}
              disabled={!props.canEdit || props.isSubmitting}
            >
              {props.isSubmitting ? "提交中..." : "提交预审"}
            </button>
          </div>
        </section>

        {!props.items.length ? (
          <div className="note-empty-state">当前还没有广告预审记录。提交首条任务后，这里会展示运行状态、预审结果和驳回原因。</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="soft-table douyin-data-table">
              <thead>
                <tr>
                  <th>素材</th>
                  <th>Vid / FileId</th>
                  <th>广告主</th>
                  <th>渠道</th>
                  <th>执行状态</th>
                  <th>预审结果</th>
                  <th>说明</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {props.items.map((item) => (
                  <tr key={item.id}>
                    <td className="table-cell-wide">
                      <strong>{item.materialLabel || item.vid}</strong>
                    </td>
                    <td className="table-cell-wide">
                      <div style={{ display: "grid", gap: 4 }}>
                        <span>{item.vid}</span>
                        <span className="status-text">{item.fileId ? `FileId: ${item.fileId}` : "FileId 未填写"}</span>
                      </div>
                    </td>
                    <td>{item.advertiserId}</td>
                    <td>{item.businessType}</td>
                    <td>
                      <span className={`archive-pill ${getExecutionStatusClass(item.executionStatus)}`}>
                        {item.executionStatusLabel}
                      </span>
                    </td>
                    <td>
                      <span className={`archive-pill ${getAuditStatusClass(item.auditStatus)}`}>
                        {item.auditStatusLabel}
                      </span>
                    </td>
                    <td className="table-cell-wide">
                      {item.reason || item.errorMessage || "-"}
                      {typeof item.durationSec === "number" ? (
                        <div className="status-text" style={{ marginTop: 4 }}>
                          时长 {item.durationSec}s
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: 4 }}>
                        <span>{props.formatDateTime(item.updatedAt)}</span>
                        {item.lastPolledAt ? <span className="status-text">轮询 {props.formatDateTime(item.lastPolledAt)}</span> : null}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: 8 }}>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void props.onRefreshItem(item.taskId)}
                          disabled={!props.canEdit || props.isSubmitting}
                        >
                          刷新结果
                        </button>
                        <button
                          type="button"
                          className="note-inline-button"
                          onClick={() => void handleDelete(item.taskId)}
                          disabled={!props.canEdit || props.isSubmitting}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </article>
  );
}

function getVodUploadStatusClass(status?: DouyinVodUploadStatus) {
  switch (status) {
    case "SUCCESS":
      return "status-ready";
    case "PROCESSING":
    case "PENDING":
      return "status-in_progress";
    case "FAILED":
      return "status-pending";
    default:
      return "status-pending";
  }
}

function getExecutionStatusClass(status: DouyinAdPreAuditRecord["executionStatus"]) {
  switch (status) {
    case "Success":
      return "status-ready";
    case "Running":
    case "PendingStart":
      return "status-in_progress";
    default:
      return "status-pending";
  }
}

function getAuditStatusClass(status: DouyinAdPreAuditRecord["auditStatus"]) {
  switch (status) {
    case "AuditResult__PASS":
      return "status-ready";
    case "AuditResult__REJECT":
      return "status-pending";
    default:
      return "status-in_progress";
  }
}
