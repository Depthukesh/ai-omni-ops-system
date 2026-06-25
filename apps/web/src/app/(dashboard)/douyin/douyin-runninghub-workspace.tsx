"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createDouyinRunningHubWork,
  deleteDouyinRunningHubWork,
  getDouyinRunningHubAppDetail,
  getDouyinRunningHubApps,
  getDouyinRunningHubWorks,
  type CreateDouyinRunningHubWorkForm,
  type DouyinRunningHubAppCardRecord,
  type DouyinRunningHubAppDetailRecord,
  type DouyinRunningHubAppFieldRecord,
  type DouyinRunningHubWorkRecord,
  type DouyinRunningHubWorkResultRecord,
} from "../../../services/works";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

type RunningHubFieldFormEntry = DouyinRunningHubAppFieldRecord & {
  value: string;
  uploadFile: File | null;
};

export interface DouyinRunningHubWorkspaceProps {
  brandId: string;
  sectionLabel: string;
  sectionDescription: string;
  canEdit: boolean;
  formatDateTime: OptionalDateFormatter;
}

function normalizeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试。";
}

function formatSuggestedTitle(appName: string) {
  const stamp = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(/\//g, "-");
  return `${appName} - ${stamp}`;
}

function getWorkStatusLabel(status?: DouyinRunningHubWorkRecord["status"]) {
  switch (status) {
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    case "RUNNING":
      return "处理中";
    default:
      return "排队中";
  }
}

function getWorkStatusClass(status?: DouyinRunningHubWorkRecord["status"]) {
  switch (status) {
    case "SUCCESS":
      return "status-ready";
    case "FAILED":
      return "status-danger";
    case "RUNNING":
      return "status-in_progress";
    default:
      return "status-pending";
  }
}

function buildFieldForm(detail: DouyinRunningHubAppDetailRecord | null) {
  return (detail?.nodeInfoList || []).map((item) => ({
    ...item,
    value: item.fieldValue || item.fieldData || "",
    uploadFile: null,
  }));
}

function getFieldLabel(field: DouyinRunningHubAppFieldRecord) {
  return field.description || field.fieldName || field.nodeName || "参数";
}

function getFieldDescription(field: DouyinRunningHubAppFieldRecord) {
  return field.descriptionEn || field.fieldData || "";
}

function inferUploadKind(field: DouyinRunningHubAppFieldRecord): "image" | "video" | null {
  const haystack = [
    field.fieldType,
    field.fieldName,
    field.nodeName,
    field.description,
    field.descriptionEn,
    field.fieldData,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/image|img|photo|picture|角色图|参考图|图片|头像|pose image/.test(haystack)) {
    return "image";
  }
  if (/video|动作|motion|pose video|source video|driv/.test(haystack)) {
    return "video";
  }
  return null;
}

function shouldUseTextarea(field: DouyinRunningHubAppFieldRecord) {
  const haystack = [field.fieldType, field.fieldName, field.description, field.descriptionEn].filter(Boolean).join(" ").toLowerCase();
  return /textarea|prompt|text|desc|说明|提示词/.test(haystack);
}

function isImageResult(result: DouyinRunningHubWorkResultRecord) {
  const url = String(result.url || result.sourceUrl || "").toLowerCase();
  const type = String(result.outputType || "").toLowerCase();
  return /image|png|jpg|jpeg|webp/.test(type) || /\.(png|jpe?g|webp|gif)(\?|$)/.test(url);
}

function isVideoResult(result: DouyinRunningHubWorkResultRecord) {
  const url = String(result.url || result.sourceUrl || "").toLowerCase();
  const type = String(result.outputType || "").toLowerCase();
  return /video|mp4|mov|webm/.test(type) || /\.(mp4|mov|webm|m4v)(\?|$)/.test(url);
}

function RunningHubCreateDialog(props: {
  open: boolean;
  detailLoading: boolean;
  detail: DouyinRunningHubAppDetailRecord | null;
  title: string;
  fields: RunningHubFieldFormEntry[];
  submitError: string;
  submitting: boolean;
  onTitleChange: (value: string) => void;
  onFieldValueChange: (index: number, value: string) => void;
  onFieldFileChange: (index: number, file: File | null) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
}) {
  if (!props.open) {
    return null;
  }

  return (
    <div className="design-v3-dialog-backdrop" role="presentation" onClick={props.onClose}>
      <div
        className="design-v3-dialog ops-prompt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="runninghub-create-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="design-v3-dialog__header">
          <div>
            <strong id="runninghub-create-dialog-title">{props.detail?.name || "RunningHub应用"}</strong>
            <p>{props.detail?.description || "填写当前应用所需参数后即可提交异步生成任务，结果会自动写入作品中心。"}</p>
            {props.detail?.tags?.length ? (
              <div className="ops-prompt-tag-row" style={{ marginTop: 12 }}>
                {props.detail.tags.map((tag) => (
                  <span key={tag} className="archive-pill status-pending">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="ops-prompt-inline-actions">
            {props.detail?.tutorialUrl ? (
              <a className="secondary-button" href={props.detail.tutorialUrl} target="_blank" rel="noreferrer">
                查看文档
              </a>
            ) : null}
            <button type="button" className="design-v3-text-button" onClick={props.onClose}>
              关闭
            </button>
          </div>
        </div>

        <div className="design-v3-dialog__body">
          {props.detailLoading ? <div className="empty-state">应用参数加载中...</div> : null}
          {props.submitError ? (
            <div className="report-inline-tip report-inline-tip--error" style={{ marginBottom: 16 }}>
              {props.submitError}
            </div>
          ) : null}
          {props.detail ? (
            <>
              <div className="ops-prompt-dialog-summary">
                <div className="ops-prompt-summary-card">
                  <span>当前状态</span>
                  <strong>{props.detail.configured ? "已配置 API Key" : "未配置 API Key"}</strong>
                  <p>{props.detail.configHint || "若当前品牌已共享 RunningHub API Key，即可直接发起任务。"}</p>
                </div>
                <div className="ops-prompt-summary-card">
                  <span>预计耗时</span>
                  <strong>{props.detail.estimatedDuration || "数分钟"}</strong>
                  <p>{props.detail.statusHint || "远端结果链接只有 24 小时有效，系统会自动缓存回站内记录。"}</p>
                </div>
              </div>

              <div className="design-v3-form-grid">
                <label className="design-v3-field design-v3-field--full">
                  <span>作品标题</span>
                  <input type="text" value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} />
                </label>
                {props.fields.map((field, index) => {
                  const uploadKind = inferUploadKind(field);
                  const helperText = getFieldDescription(field);
                  const fieldKey = `${field.nodeId || "node"}-${field.fieldName || "field"}-${index}`;
                  if (uploadKind) {
                    return (
                      <label key={fieldKey} className="design-v3-field design-v3-field--full">
                        <span>{getFieldLabel(field)}</span>
                        <input
                          type="file"
                          accept={uploadKind === "image" ? "image/png,image/jpeg,image/webp,image/*" : "video/mp4,video/quicktime,video/webm,video/*"}
                          onChange={(event) => props.onFieldFileChange(index, event.target.files?.[0] || null)}
                        />
                        <small className="personal-meta">
                          {field.uploadFile
                            ? `已选择：${field.uploadFile.name}`
                            : helperText || (uploadKind === "image" ? "请上传角色参考图或图片素材。" : "请上传动作视频或视频素材。")}
                        </small>
                      </label>
                    );
                  }
                  if (shouldUseTextarea(field)) {
                    return (
                      <label key={fieldKey} className="design-v3-field design-v3-field--full">
                        <span>{getFieldLabel(field)}</span>
                        <textarea
                          rows={5}
                          value={field.value}
                          onChange={(event) => props.onFieldValueChange(index, event.target.value)}
                          placeholder={helperText || "请输入参数内容"}
                        />
                      </label>
                    );
                  }
                  return (
                    <label key={fieldKey} className="design-v3-field">
                      <span>{getFieldLabel(field)}</span>
                      <input
                        type="text"
                        value={field.value}
                        onChange={(event) => props.onFieldValueChange(index, event.target.value)}
                        placeholder={helperText || "请输入参数内容"}
                      />
                    </label>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        <div className="design-v3-dialog__footer ops-prompt-dialog-footer">
          <button type="button" className="secondary-button" onClick={props.onClose}>
            取消
          </button>
          <button type="button" className="primary-button" onClick={() => void props.onSubmit()} disabled={props.submitting || !props.detail}>
            {props.submitting ? "提交中..." : "生成"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RunningHubWorksDialog(props: {
  open: boolean;
  works: DouyinRunningHubWorkRecord[];
  loading: boolean;
  deletingWorkId: string | null;
  selectedWorkId: string;
  canEdit: boolean;
  formatDateTime: OptionalDateFormatter;
  onClose: () => void;
  onSelect: (workId: string) => void;
  onDelete: (workId: string) => void | Promise<void>;
}) {
  if (!props.open) {
    return null;
  }

  const selectedWork = props.works.find((item) => item.id === props.selectedWorkId) || props.works[0] || null;

  return (
    <div className="design-v3-dialog-backdrop design-v3-preview-backdrop" role="presentation" onClick={props.onClose}>
      <div
        className="design-v3-preview-dialog ops-works-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="runninghub-works-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="design-v3-preview-header">
          <div>
            <strong id="runninghub-works-dialog-title">作品中心</strong>
            <p className="ops-works-dialog-subtitle">查看 RunningHub 历史任务、输入素材、生成结果和错误信息。</p>
          </div>
          <button type="button" className="secondary-button" onClick={props.onClose}>
            关闭
          </button>
        </div>

        <div className="ops-works-dialog__body">
          <div className="ops-works-dialog__summary">
            <div className="ops-works-dialog__summary-card">
              <span>作品总数</span>
              <strong>{props.works.length}</strong>
            </div>
            <div className="ops-works-dialog__summary-card">
              <span>当前查看</span>
              <strong>{selectedWork?.title || "未选择作品"}</strong>
            </div>
          </div>

          <div className="ops-works-table-shell">
            {props.loading ? <div className="empty-state">作品中心加载中...</div> : null}
            {!props.loading && !props.works.length ? <div className="empty-state">当前还没有 RunningHub 作品，先从功能卡片发起一次生成。</div> : null}
            {!props.loading && props.works.length ? (
              <>
                <div className="ops-works-table ops-works-table--head" role="presentation">
                  <span>标题</span>
                  <span>应用名称</span>
                  <span>更新时间</span>
                  <span>状态</span>
                  <span>查看</span>
                  <span>删除</span>
                </div>
                <div className="ops-works-table-body">
                  {props.works.map((work) => (
                    <article key={work.id} className={`ops-works-row ${selectedWork?.id === work.id ? "is-selected" : ""}`}>
                      <div className="ops-works-cell">
                        <strong>{work.title}</strong>
                      </div>
                      <div className="ops-works-cell">
                        <span>{work.appName}</span>
                      </div>
                      <div className="ops-works-cell">
                        <span>{props.formatDateTime(work.updatedAt || work.createdAt)}</span>
                      </div>
                      <div className="ops-works-cell">
                        <span className={`archive-pill ${getWorkStatusClass(work.status)}`}>{getWorkStatusLabel(work.status)}</span>
                      </div>
                      <div className="ops-works-cell">
                        <button type="button" className="tiny-action-button is-primary" onClick={() => props.onSelect(work.id)}>
                          查看
                        </button>
                      </div>
                      <div className="ops-works-cell">
                        <button
                          type="button"
                          className="ghost-danger-button"
                          onClick={() => void props.onDelete(work.id)}
                          disabled={!props.canEdit || props.deletingWorkId === work.id}
                        >
                          {props.deletingWorkId === work.id ? "删除中..." : "删除"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {selectedWork ? (
            <article className="light-data-panel report-editor-panel report-editor-panel--compact">
              <div className="report-editor-head">
                <div>
                  <strong>{selectedWork.title}</strong>
                  <p>
                    {selectedWork.appName}
                    {" · "}
                    {props.formatDateTime(selectedWork.createdAt)}
                  </p>
                </div>
                <div className="report-editor-actions">
                  <span className={`archive-pill ${getWorkStatusClass(selectedWork.status)}`}>{getWorkStatusLabel(selectedWork.status)}</span>
                  {selectedWork.taskStatus ? <span className="archive-pill status-pending">{selectedWork.taskStatus}</span> : null}
                  <span className="archive-pill status-pending">进度 {selectedWork.progress}%</span>
                </div>
              </div>

              <div className="personal-grid" style={{ marginTop: 16 }}>
                <div className="report-editor-pane">
                  <span>任务摘要</span>
                  <p>{selectedWork.summary}</p>
                  {selectedWork.providerTaskId ? <p className="panel-subtext">远端任务 ID：{selectedWork.providerTaskId}</p> : null}
                  {selectedWork.promptTips ? <div className="report-inline-tip">{selectedWork.promptTips}</div> : null}
                  {selectedWork.errorReason ? <div className="report-inline-tip report-inline-tip--error">{selectedWork.errorReason}</div> : null}
                </div>
                <div className="report-editor-pane">
                  <span>输入角色图</span>
                  {selectedWork.sourceImageUrl ? (
                    <img src={selectedWork.sourceImageUrl} alt={`${selectedWork.title}-source-image`} style={{ width: "100%", borderRadius: 20, border: "1px solid #dfe5f2" }} />
                  ) : (
                    <div className="empty-state">当前没有记录输入图片。</div>
                  )}
                </div>
                <div className="report-editor-pane">
                  <span>输入动作视频</span>
                  {selectedWork.sourceVideoUrl ? (
                    <video controls preload="metadata" src={selectedWork.sourceVideoUrl} style={{ width: "100%", borderRadius: 20, background: "#0f1525" }} />
                  ) : (
                    <div className="empty-state">当前没有记录输入视频。</div>
                  )}
                </div>
              </div>

              <div className="report-editor-grid" style={{ marginTop: 20 }}>
                <article className="report-editor-pane">
                  <span>生成结果</span>
                  {!selectedWork.results.length ? (
                    <div className="empty-state" style={{ marginTop: 12 }}>
                      结果尚未回写完成，稍后刷新作品中心即可查看。
                    </div>
                  ) : (
                    <div className="xhs-material-card-grid" style={{ marginTop: 12 }}>
                      {selectedWork.results.map((result, index) => {
                        const href = result.url || result.sourceUrl || "";
                        return (
                          <article key={`${href}-${index}`} className="entity-card personal-card">
                            <strong>{result.outputType || `结果 ${index + 1}`}</strong>
                            {isImageResult(result) && href ? (
                              <img src={href} alt={`${selectedWork.title}-result-${index + 1}`} style={{ width: "100%", marginTop: 12, borderRadius: 20, border: "1px solid #dfe5f2" }} />
                            ) : null}
                            {isVideoResult(result) && href ? (
                              <video controls preload="metadata" src={href} style={{ width: "100%", marginTop: 12, borderRadius: 20, background: "#0f1525" }} />
                            ) : null}
                            {!isImageResult(result) && !isVideoResult(result) && result.text ? <p style={{ marginTop: 12 }}>{result.text}</p> : null}
                            {href ? (
                              <a href={href} target="_blank" rel="noreferrer" className="secondary-button" style={{ marginTop: 12, display: "inline-flex" }}>
                                打开结果
                              </a>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </article>
              </div>
            </article>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DouyinRunningHubWorkspace(props: DouyinRunningHubWorkspaceProps) {
  const [apps, setApps] = useState<DouyinRunningHubAppCardRecord[]>([]);
  const [works, setWorks] = useState<DouyinRunningHubWorkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [worksOpen, setWorksOpen] = useState(false);
  const [selectedAppKey, setSelectedAppKey] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [detail, setDetail] = useState<DouyinRunningHubAppDetailRecord | null>(null);
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<RunningHubFieldFormEntry[]>([]);
  const [inlineError, setInlineError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [deletingWorkId, setDeletingWorkId] = useState<string | null>(null);

  const refreshWorkspace = useCallback(async () => {
    if (!props.brandId) {
      return;
    }
    setLoading(true);
    setInlineError("");
    try {
      const [appsResult, worksResult] = await Promise.all([getDouyinRunningHubApps(props.brandId), getDouyinRunningHubWorks(props.brandId)]);
      setApps(appsResult.items || []);
      setWorks(worksResult.items || []);
      setSelectedWorkId((current) => {
        const nextWorks = worksResult.items || [];
        if (current && nextWorks.some((item) => item.id === current)) {
          return current;
        }
        return nextWorks[0]?.id || "";
      });
    } catch (error) {
      setInlineError(normalizeErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [props.brandId]);

  useEffect(() => {
    void refreshWorkspace();
  }, [refreshWorkspace]);

  const latestWorks = useMemo(() => works.slice(0, 3), [works]);

  const selectedApp = useMemo(() => apps.find((item) => item.key === selectedAppKey) || null, [apps, selectedAppKey]);

  const openCreateDialog = useCallback(
    async (appKey: string) => {
      setSelectedAppKey(appKey);
      setCreateOpen(true);
      setDetailLoading(true);
      setSubmitError("");
      try {
        const result = await getDouyinRunningHubAppDetail(props.brandId, appKey);
        setDetail(result.item);
        setTitle(formatSuggestedTitle(result.item.name));
        setFields(buildFieldForm(result.item));
      } catch (error) {
        setDetail(null);
        setFields([]);
        setSubmitError(normalizeErrorMessage(error));
      } finally {
        setDetailLoading(false);
      }
    },
    [props.brandId],
  );

  const handleFieldValueChange = useCallback((index: number, value: string) => {
    setFields((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item)));
  }, []);

  const handleFieldFileChange = useCallback((index: number, file: File | null) => {
    setFields((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, uploadFile: file } : item)));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedAppKey) {
      setSubmitError("请先选择一个 RunningHub 应用。");
      return;
    }
    const hasUsableField = fields.some((field) => field.uploadFile || field.value.trim());
    if (!hasUsableField) {
      setSubmitError("请至少填写或上传一个有效参数。");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const form: CreateDouyinRunningHubWorkForm = {
        title: title.trim(),
        nodeInfoList: fields.map((field) => ({
          nodeId: field.nodeId,
          nodeName: field.nodeName,
          fieldName: field.fieldName,
          fieldValue: field.value.trim(),
          fieldData: field.fieldData,
          fieldType: field.fieldType,
          description: field.description,
          descriptionEn: field.descriptionEn,
          uploadFile: field.uploadFile,
        })),
      };
      const result = await createDouyinRunningHubWork(props.brandId, selectedAppKey, form);
      setWorks((current) => [result.item, ...current.filter((item) => item.id !== result.item.id)]);
      setSelectedWorkId(result.item.id);
      setCreateOpen(false);
      setWorksOpen(true);
      void refreshWorkspace();
    } catch (error) {
      setSubmitError(normalizeErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }, [fields, props.brandId, refreshWorkspace, selectedAppKey, title]);

  const handleDelete = useCallback(
    async (workId: string) => {
      setDeletingWorkId(workId);
      try {
        await deleteDouyinRunningHubWork(props.brandId, workId);
        setWorks((current) => {
          const next = current.filter((item) => item.id !== workId);
          setSelectedWorkId((selected) => (selected === workId ? next[0]?.id || "" : selected));
          return next;
        });
      } catch (error) {
        setInlineError(normalizeErrorMessage(error));
      } finally {
        setDeletingWorkId(null);
      }
    },
    [props.brandId],
  );

  return (
    <>
      <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
        <div className="report-editor-head">
          <div>
            <strong>{props.sectionLabel}</strong>
            <p>{props.sectionDescription}</p>
          </div>
          <div className="report-editor-actions">
            <span className={`archive-pill ${apps.length ? "status-ready" : "status-in_progress"}`}>
              {apps.length ? `${apps.length} 个应用` : "暂无应用"}
            </span>
            <span className={`archive-pill ${works.length ? "status-ready" : "status-pending"}`}>
              {works.length ? `${works.length} 条作品` : "暂无作品"}
            </span>
            <button type="button" className="secondary-button" onClick={() => void refreshWorkspace()} disabled={loading}>
              {loading ? "刷新中..." : "刷新列表"}
            </button>
            <button type="button" className="secondary-button" onClick={() => setWorksOpen(true)} disabled={loading}>
              打开作品中心
            </button>
          </div>
        </div>

        {inlineError ? <div className="report-inline-tip report-inline-tip--error">{inlineError}</div> : null}

        <div className="strategy-grid" style={{ marginTop: 20 }}>
          <div className="entity-card personal-card">
            <strong>模块定位</strong>
            <p className="panel-subtext">RunningHub 现已作为抖音左侧菜单中的独立一级板块，和数字人同级展示，不再塞进数字人内部。</p>
          </div>
          <div className="entity-card personal-card">
            <strong>当前能力</strong>
            <p className="panel-subtext">首期先接入 Animate 动作迁移应用，支持上传素材、提交异步任务、查询结果并写回站内作品中心。</p>
          </div>
        </div>
      </article>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
        <div className="report-editor-head">
          <div>
            <strong>应用卡片</strong>
            <p>每张卡片代表一个 RunningHub 功能，点击后会弹出参数填写窗口并发起后台生成。</p>
          </div>
        </div>

        {!apps.length && !loading ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            当前还没有可用的 RunningHub 应用配置。
          </div>
        ) : (
          <div className="xhs-material-card-grid" style={{ marginTop: 16 }}>
            {apps.map((app) => (
              <article key={app.key} className="entity-card personal-card">
                <strong>{app.name}</strong>
                <p className="panel-subtext">{app.summary}</p>
                {app.tags.length ? (
                  <div className="ops-prompt-tag-row" style={{ marginTop: 12 }}>
                    {app.tags.map((tag) => (
                      <span key={tag} className="archive-pill status-pending">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                {app.statusHint ? <p className="panel-subtext" style={{ marginTop: 12 }}>{app.statusHint}</p> : null}
                <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
                  <button type="button" className="primary-button" onClick={() => void openCreateDialog(app.key)} disabled={!props.canEdit}>
                    立即生成
                  </button>
                  {app.tutorialUrl ? (
                    <a className="secondary-button" href={app.tutorialUrl} target="_blank" rel="noreferrer">
                      查看文档
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
        <div className="report-editor-head">
          <div>
            <strong>最近作品</strong>
            <p>这里先展示最近 3 条 RunningHub 记录，完整历史请从作品中心查看。</p>
          </div>
        </div>

        {!latestWorks.length ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            当前还没有 RunningHub 作品，先从上方应用卡片发起一次生成。
          </div>
        ) : (
          <div className="xhs-material-card-grid" style={{ marginTop: 16 }}>
            {latestWorks.map((item) => (
              <article key={item.id} className="entity-card personal-card">
                <strong>{item.title}</strong>
                <p className="panel-subtext">{item.appName}</p>
                <p className="panel-subtext">{props.formatDateTime(item.updatedAt)}</p>
                <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
                  <span className={`archive-pill ${getWorkStatusClass(item.status)}`}>{getWorkStatusLabel(item.status)}</span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setSelectedWorkId(item.id);
                      setWorksOpen(true);
                    }}
                  >
                    查看作品
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <RunningHubCreateDialog
        open={createOpen}
        detailLoading={detailLoading}
        detail={detail || (selectedApp ? { ...selectedApp, configured: false, nodeInfoList: [], configHint: "" } : null)}
        title={title}
        fields={fields}
        submitError={submitError}
        submitting={submitting}
        onTitleChange={setTitle}
        onFieldValueChange={handleFieldValueChange}
        onFieldFileChange={handleFieldFileChange}
        onClose={() => {
          setCreateOpen(false);
          setSubmitError("");
        }}
        onSubmit={handleSubmit}
      />

      <RunningHubWorksDialog
        open={worksOpen}
        works={works}
        loading={loading}
        deletingWorkId={deletingWorkId}
        selectedWorkId={selectedWorkId}
        canEdit={props.canEdit}
        formatDateTime={props.formatDateTime}
        onClose={() => setWorksOpen(false)}
        onSelect={setSelectedWorkId}
        onDelete={handleDelete}
      />
    </>
  );
}
