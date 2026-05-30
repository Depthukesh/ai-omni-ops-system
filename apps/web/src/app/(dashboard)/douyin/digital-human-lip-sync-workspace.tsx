"use client";

import { useEffect, useMemo, useState } from "react";
import { type DouyinLipSyncWorkRecord } from "../../../services/works";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

export interface DigitalHumanLipSyncWorkspaceProps {
  items: DouyinLipSyncWorkRecord[];
  isSubmitting: boolean;
  canEdit: boolean;
  onRefresh: () => void | Promise<void>;
  onCreate: (payload: {
    title?: string;
    sourceVideoFile?: File | null;
    audioType?: "TEXT" | "AUDIO";
    script?: string;
    audioFile?: File | null;
    audioManId?: string;
    speechRate?: number;
    pitch?: number;
    screenWidth?: number;
    screenHeight?: number;
  }) => Promise<boolean>;
  onRecover: (payload: { workId?: string; providerTaskId?: string }) => Promise<boolean>;
  onDelete: (workId: string) => Promise<boolean>;
  formatDateTime: OptionalDateFormatter;
}

function getLipSyncStatusLabel(status?: DouyinLipSyncWorkRecord["status"]) {
  switch (status) {
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    case "RUNNING":
      return "处理中";
    default:
      return "待提交";
  }
}

function getLipSyncStatusClass(status?: DouyinLipSyncWorkRecord["status"]) {
  switch (status) {
    case "SUCCESS":
      return "status-ready";
    case "FAILED":
      return "status-pending";
    default:
      return "status-in_progress";
  }
}

export function DigitalHumanLipSyncWorkspace(props: DigitalHumanLipSyncWorkspaceProps) {
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [audioType, setAudioType] = useState<"TEXT" | "AUDIO">("TEXT");
  const [script, setScript] = useState("");
  const [audioManId, setAudioManId] = useState("");
  const [speechRate, setSpeechRate] = useState("1");
  const [pitch, setPitch] = useState("0");
  const [screenWidth, setScreenWidth] = useState("1080");
  const [screenHeight, setScreenHeight] = useState("1920");
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [manualRecoverTaskId, setManualRecoverTaskId] = useState("");

  useEffect(() => {
    if (!props.items.length) {
      setSelectedId("");
      return;
    }
    if (!props.items.some((item) => item.id === selectedId)) {
      setSelectedId(props.items[0]?.id || "");
    }
  }, [props.items, selectedId]);

  const selectedItem = useMemo(
    () => props.items.find((item) => item.id === selectedId) || props.items[0],
    [props.items, selectedId],
  );

  const handleSubmit = async () => {
    const success = await props.onCreate({
      title: title.trim() || undefined,
      sourceVideoFile,
      audioType,
      script: script.trim() || undefined,
      audioFile,
      audioManId: audioManId.trim() || undefined,
      speechRate: Number(speechRate || 1),
      pitch: Number(pitch || 0),
      screenWidth: Number(screenWidth || 1080),
      screenHeight: Number(screenHeight || 1920),
    });
    if (success) {
      setTitle("");
      setScript("");
      setAudioManId("");
      setSourceVideoFile(null);
      setAudioFile(null);
    }
  };

  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>口型驱动</strong>
          <p>这一栏位已升级为真实工作台壳子，当前支持独立表单、手动找回入口和后端路由，下一轮继续接蝉镜真实 `video_lip_sync` 任务链路。</p>
        </div>
        <div className="report-editor-actions">
          <span className={`archive-pill ${props.items.length ? "status-ready" : "status-in_progress"}`}>
            {props.items.length ? `${props.items.length} 条口型任务` : "暂无口型任务"}
          </span>
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isSubmitting}>
            刷新列表
          </button>
        </div>
      </div>

      <div className="strategy-grid">
        <div className="entity-card personal-card">
          <strong>当前状态</strong>
          <p className="personal-meta">栏目、表单、路由已补齐</p>
          <p className="panel-subtext">这一轮先补工作台结构、参数表单和手动找回入口，避免继续只有文案占位但没有真实可扩展的交互骨架。</p>
        </div>
        <div className="entity-card personal-card">
          <strong>下一步能力</strong>
          <p className="panel-subtext">下一轮继续接蝉镜文件上传、`video_lip_sync/create`、任务详情查询和结果找回，完成真实视频转口型闭环。</p>
        </div>
      </div>

      <div className="report-editor-grid" style={{ marginTop: 20 }}>
        <article className="report-editor-pane">
          <span>任务列表</span>
          {!props.items.length ? (
            <div className="empty-state" style={{ marginTop: 12 }}>
              当前还没有口型驱动任务记录。你现在可以直接填写右侧表单；本轮后端会明确返回“接口接入中”，但工作台结构和调用链已经补齐。
            </div>
          ) : (
            <div className="xhs-material-card-grid" style={{ marginTop: 12 }}>
              {props.items.map((item) => (
                <article key={item.id} className="entity-card personal-card">
                  <button
                    type="button"
                    className={`xhs-material-card-stage ${selectedItem?.id === item.id ? "is-active" : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    {item.coverImageUrl ? (
                      <img className="xhs-material-card-media" src={item.coverImageUrl} alt={item.title} />
                    ) : (
                      <span className="xhs-material-card-empty">暂无封面</span>
                    )}
                    <span className={`xhs-material-card-badge ${getLipSyncStatusClass(item.status)}`}>
                      {getLipSyncStatusLabel(item.status)}
                    </span>
                  </button>
                  <div className="xhs-material-card-body">
                    <strong>{item.title}</strong>
                    <p>{item.audioType === "AUDIO" ? "音频驱动" : "文本驱动"}</p>
                    <p>{props.formatDateTime(item.updatedAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="report-editor-pane">
          <span>创建表单</span>
          <div className="personal-grid" style={{ marginTop: 12 }}>
            <label className="field">
              <span>任务标题</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：品牌讲解视频口型同步" />
            </label>
            <label className="field">
              <span>驱动方式</span>
              <select value={audioType} onChange={(event) => setAudioType(event.target.value as "TEXT" | "AUDIO")}>
                <option value="TEXT">文本驱动</option>
                <option value="AUDIO">音频驱动</option>
              </select>
            </label>
            <label className="field field-full">
              <span>驱动视频</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => setSourceVideoFile(event.target.files?.[0] || null)}
                disabled={!props.canEdit || props.isSubmitting}
              />
              <small className="personal-meta">
                {sourceVideoFile ? `已选择：${sourceVideoFile.name}` : "支持上传 mp4、mov、webm 等视频；下一轮会接入蝉镜真实视频上传。"}
              </small>
            </label>
            {audioType === "TEXT" ? (
              <>
                <label className="field field-full">
                  <span>驱动文案</span>
                  <textarea value={script} onChange={(event) => setScript(event.target.value)} rows={5} placeholder="输入需要驱动口型的文本内容" />
                </label>
                <label className="field">
                  <span>音色 ID</span>
                  <input value={audioManId} onChange={(event) => setAudioManId(event.target.value)} placeholder="可选，后续支持克隆音色或公共音色 ID" />
                </label>
                <label className="field">
                  <span>语速</span>
                  <input value={speechRate} onChange={(event) => setSpeechRate(event.target.value)} placeholder="1" />
                </label>
                <label className="field">
                  <span>音调</span>
                  <input value={pitch} onChange={(event) => setPitch(event.target.value)} placeholder="0" />
                </label>
              </>
            ) : (
              <label className="field field-full">
                <span>驱动音频</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => setAudioFile(event.target.files?.[0] || null)}
                  disabled={!props.canEdit || props.isSubmitting}
                />
                <small className="personal-meta">
                  {audioFile ? `已选择：${audioFile.name}` : "音频驱动模式下，后续会先上传音频再调用蝉镜口型同步接口。"}
                </small>
              </label>
            )}
            <label className="field">
              <span>画布宽度</span>
              <input value={screenWidth} onChange={(event) => setScreenWidth(event.target.value)} placeholder="1080" />
            </label>
            <label className="field">
              <span>画布高度</span>
              <input value={screenHeight} onChange={(event) => setScreenHeight(event.target.value)} placeholder="1920" />
            </label>
          </div>

          <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSubmit()}
              disabled={!props.canEdit || props.isSubmitting || !sourceVideoFile}
            >
              提交口型驱动
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setTitle("");
                setAudioType("TEXT");
                setScript("");
                setAudioManId("");
                setSpeechRate("1");
                setPitch("0");
                setScreenWidth("1080");
                setScreenHeight("1920");
                setSourceVideoFile(null);
                setAudioFile(null);
              }}
              disabled={props.isSubmitting}
            >
              清空表单
            </button>
          </div>
        </article>
      </div>

      <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
        <div className="report-editor-head">
          <div>
            <strong>手动找回</strong>
            <p>如果后续你已在蝉镜侧拿到口型驱动任务 ID，可以在这里手动发起结果找回。</p>
          </div>
        </div>
        <div className="personal-grid" style={{ marginTop: 12 }}>
          <label className="field field-full">
            <span>任务 ID</span>
            <input value={manualRecoverTaskId} onChange={(event) => setManualRecoverTaskId(event.target.value)} placeholder="请输入蝉镜口型驱动任务 ID" />
          </label>
        </div>
        <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void props.onRecover({ workId: selectedItem?.id, providerTaskId: manualRecoverTaskId.trim() || undefined })}
            disabled={!props.canEdit || props.isSubmitting || !manualRecoverTaskId.trim()}
          >
            找回口型驱动结果
          </button>
        </div>
      </article>

      {selectedItem ? (
        <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
          <div className="report-editor-head">
            <div>
              <strong>{selectedItem.title}</strong>
              <p>{selectedItem.providerTaskId ? `任务 ID：${selectedItem.providerTaskId}` : "当前尚未返回真实第三方任务 ID。"}</p>
            </div>
            <div className="report-editor-actions">
              <span className={`archive-pill ${getLipSyncStatusClass(selectedItem.status)}`}>{getLipSyncStatusLabel(selectedItem.status)}</span>
              <span className="archive-pill status-pending">{selectedItem.progress}%</span>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void props.onDelete(selectedItem.id)}
                disabled={!props.canEdit || props.isSubmitting}
              >
                删除记录
              </button>
            </div>
          </div>
          <div className="strategy-grid">
            <div className="entity-card personal-card">
              <strong>驱动配置</strong>
              <p className="panel-subtext">驱动方式：{selectedItem.audioType === "AUDIO" ? "音频驱动" : "文本驱动"}</p>
              <p className="panel-subtext">音色 ID：{selectedItem.audioManId || "未填写"}</p>
              <p className="panel-subtext">画布尺寸：{selectedItem.screenWidth} x {selectedItem.screenHeight}</p>
            </div>
            <div className="entity-card personal-card">
              <strong>时间与状态</strong>
              <p className="panel-subtext">创建时间：{props.formatDateTime(selectedItem.createdAt)}</p>
              <p className="panel-subtext">最近更新时间：{props.formatDateTime(selectedItem.updatedAt)}</p>
              <p className="panel-subtext">{selectedItem.errorReason ? `失败原因：${selectedItem.errorReason}` : "当前暂无失败原因。"}</p>
            </div>
          </div>
        </article>
      ) : null}
    </article>
  );
}
