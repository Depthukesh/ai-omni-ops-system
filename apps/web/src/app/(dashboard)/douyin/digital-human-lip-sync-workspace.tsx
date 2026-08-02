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
    model?: 0 | 1;
    backway?: 1 | 2;
    driveMode?: "" | "random";
    audioManId?: string;
    speechRate?: number;
    pitch?: number;
    volume?: number;
    screenWidth?: number;
    screenHeight?: number;
  }) => Promise<boolean>;
  onRecover: (payload: {
    workId?: string;
    providerTaskId?: string;
  }) => Promise<boolean>;
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

export function DigitalHumanLipSyncWorkspace(
  props: DigitalHumanLipSyncWorkspaceProps,
) {
  const [selectedId, setSelectedId] = useState("");
  const [title, setTitle] = useState("");
  const [audioType, setAudioType] = useState<"TEXT" | "AUDIO">("TEXT");
  const [script, setScript] = useState("");
  const [model, setModel] = useState<"0" | "1">("0");
  const [backway, setBackway] = useState<"1" | "2">("1");
  const [driveMode, setDriveMode] = useState<"" | "random">("");
  const [audioManId, setAudioManId] = useState("");
  const [speechRate, setSpeechRate] = useState("1");
  const [pitch, setPitch] = useState("0");
  const [volume, setVolume] = useState("100");
  const [screenWidth, setScreenWidth] = useState("");
  const [screenHeight, setScreenHeight] = useState("");
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

  useEffect(() => {
    if (!sourceVideoFile) {
      return;
    }
    const previewUrl = window.URL.createObjectURL(sourceVideoFile);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = previewUrl;
    const handleLoadedMetadata = () => {
      if (video.videoWidth > 0) {
        setScreenWidth(String(video.videoWidth));
      }
      if (video.videoHeight > 0) {
        setScreenHeight(String(video.videoHeight));
      }
    };
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      window.URL.revokeObjectURL(previewUrl);
    };
  }, [sourceVideoFile]);

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
      model: Number(model) as 0 | 1,
      backway: Number(backway) as 1 | 2,
      driveMode,
      audioManId: audioManId.trim() || undefined,
      speechRate: Number(speechRate || 1),
      pitch: Number(pitch || 0),
      volume: Number(volume || 100),
      screenWidth: screenWidth.trim() ? Number(screenWidth) : undefined,
      screenHeight: screenHeight.trim() ? Number(screenHeight) : undefined,
    });
    if (success) {
      setTitle("");
      setScript("");
      setModel("0");
      setBackway("1");
      setDriveMode("");
      setAudioManId("");
      setVolume("100");
      setScreenWidth("");
      setScreenHeight("");
      setSourceVideoFile(null);
      setAudioFile(null);
    }
  };

  return (
    <article
      className="light-data-panel report-editor-panel report-editor-panel--compact"
      style={{ marginTop: 20 }}
    >
      <div className="report-editor-head">
        <div>
          <strong>口型驱动</strong>
          <p>
            这一栏位已升级为真实口型驱动工作台，当前支持提交蝉镜任务、手动找回结果和站内记录回写，后续继续补更多高级参数与结果联动。
          </p>
        </div>
        <div className="report-editor-actions">
          <span
            className={`archive-pill ${props.items.length ? "status-ready" : "status-in_progress"}`}
          >
            {props.items.length
              ? `${props.items.length} 条口型任务`
              : "暂无口型任务"}
          </span>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void props.onRefresh()}
            disabled={props.isSubmitting}
          >
            刷新列表
          </button>
        </div>
      </div>

      <div className="strategy-grid">
        <div className="entity-card personal-card">
          <strong>当前状态</strong>
          <p className="personal-meta">真实提交、找回、删除和高级参数已接通</p>
          <p className="panel-subtext">
            当前会先上传驱动视频和驱动音频，再调用蝉镜口型驱动接口；模型版本、播放顺序、驱动模式和音量会随任务一起提交并回写站内记录。
          </p>
        </div>
        <div className="entity-card personal-card">
          <strong>下一步能力</strong>
          <p className="panel-subtext">
            下一轮继续补远端列表兜底、任务详情透出和结果资产联动，让口型驱动和数字人作品中心进一步打通。
          </p>
        </div>
      </div>

      <div className="report-editor-grid" style={{ marginTop: 20 }}>
        <article className="report-editor-pane">
          <span>任务列表</span>
          {!props.items.length ? (
            <div className="empty-state" style={{ marginTop: 12 }}>
              当前还没有口型驱动任务记录。你现在可以直接填写右侧表单并提交真实任务；生成后会在这里显示进度、封面和结果视频。
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
                      <img
                        className="xhs-material-card-media"
                        src={item.coverImageUrl}
                        alt={item.title}
                      />
                    ) : (
                      <span className="xhs-material-card-empty">暂无封面</span>
                    )}
                    <span
                      className={`xhs-material-card-badge ${getLipSyncStatusClass(item.status)}`}
                    >
                      {getLipSyncStatusLabel(item.status)}
                    </span>
                  </button>
                  <div className="xhs-material-card-body">
                    <strong>{item.title}</strong>
                    <p>
                      {item.audioType === "AUDIO" ? "音频驱动" : "文本驱动"}
                    </p>
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
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：品牌讲解视频口型同步"
              />
            </label>
            <label className="field">
              <span>驱动方式</span>
              <select
                value={audioType}
                onChange={(event) =>
                  setAudioType(event.target.value as "TEXT" | "AUDIO")
                }
              >
                <option value="TEXT">文本驱动</option>
                <option value="AUDIO">音频驱动</option>
              </select>
            </label>
            <label className="field field-full">
              <span>驱动视频</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) =>
                  setSourceVideoFile(event.target.files?.[0] || null)
                }
                disabled={!props.canEdit || props.isSubmitting}
              />
              <small className="personal-meta">
                {sourceVideoFile
                  ? `已选择：${sourceVideoFile.name}${screenWidth && screenHeight ? `（已识别 ${screenWidth} x ${screenHeight}）` : ""}`
                  : "支持上传 mp4、mov、webm 视频文件，提交后会先走蝉镜文件管理上传。"}
              </small>
            </label>
            <label className="field">
              <span>模型版本</span>
              <select
                value={model}
                onChange={(event) => setModel(event.target.value as "0" | "1")}
              >
                <option value="0">基础版</option>
                <option value="1">高质量版</option>
              </select>
            </label>
            <label className="field">
              <span>播放顺序</span>
              <select
                value={backway}
                onChange={(event) =>
                  setBackway(event.target.value as "1" | "2")
                }
              >
                <option value="1">正放到末尾</option>
                <option value="2">倒放到末尾</option>
              </select>
            </label>
            <label className="field">
              <span>驱动模式</span>
              <select
                value={driveMode}
                onChange={(event) =>
                  setDriveMode(event.target.value as "" | "random")
                }
              >
                <option value="">正常驱动</option>
                <option value="random">随机帧驱动</option>
              </select>
            </label>
            {audioType === "TEXT" ? (
              <>
                <label className="field field-full">
                  <span>驱动文案</span>
                  <textarea
                    value={script}
                    onChange={(event) => setScript(event.target.value)}
                    rows={5}
                    placeholder="输入需要驱动口型的文本内容"
                  />
                </label>
                <label className="field">
                  <span>音色 ID</span>
                  <input
                    value={audioManId}
                    onChange={(event) => setAudioManId(event.target.value)}
                    placeholder="必填，填写公共音色或定制音色 ID"
                  />
                </label>
                <label className="field">
                  <span>语速</span>
                  <input
                    value={speechRate}
                    onChange={(event) => setSpeechRate(event.target.value)}
                    placeholder="1"
                  />
                </label>
                <label className="field">
                  <span>音调</span>
                  <input
                    value={pitch}
                    onChange={(event) => setPitch(event.target.value)}
                    placeholder="0"
                  />
                </label>
                <label className="field">
                  <span>音量</span>
                  <input
                    value={volume}
                    onChange={(event) => setVolume(event.target.value)}
                    placeholder="100"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="field field-full">
                  <span>驱动音频</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) =>
                      setAudioFile(event.target.files?.[0] || null)
                    }
                    disabled={!props.canEdit || props.isSubmitting}
                  />
                  <small className="personal-meta">
                    {audioFile
                      ? `已选择：${audioFile.name}`
                      : "音频驱动模式下，会先上传 mp3、m4a、wav 音频，再调用蝉镜口型同步接口。"}
                  </small>
                </label>
                <label className="field">
                  <span>音量</span>
                  <input
                    value={volume}
                    onChange={(event) => setVolume(event.target.value)}
                    placeholder="100"
                  />
                </label>
              </>
            )}
            <label className="field">
              <span>画布宽度</span>
              <input
                value={screenWidth}
                onChange={(event) => setScreenWidth(event.target.value)}
                placeholder="1080"
              />
            </label>
            <label className="field">
              <span>画布高度</span>
              <input
                value={screenHeight}
                onChange={(event) => setScreenHeight(event.target.value)}
                placeholder="1920"
              />
            </label>
          </div>

          <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSubmit()}
              disabled={
                !props.canEdit ||
                props.isSubmitting ||
                !sourceVideoFile ||
                !screenWidth.trim() ||
                !screenHeight.trim() ||
                (audioType === "TEXT" && !audioManId.trim()) ||
                (audioType === "AUDIO" && !audioFile)
              }
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
                setModel("0");
                setBackway("1");
                setDriveMode("");
                setAudioManId("");
                setSpeechRate("1");
                setPitch("0");
                setVolume("100");
                setScreenWidth("");
                setScreenHeight("");
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

      <article
        className="light-data-panel report-editor-panel report-editor-panel--compact"
        style={{ marginTop: 20 }}
      >
        <div className="report-editor-head">
          <div>
            <strong>手动找回</strong>
            <p>
              如果后续你已在蝉镜侧拿到口型驱动任务
              ID，可以在这里手动发起结果找回。
            </p>
          </div>
        </div>
        <div className="personal-grid" style={{ marginTop: 12 }}>
          <label className="field field-full">
            <span>任务 ID</span>
            <input
              value={manualRecoverTaskId}
              onChange={(event) => setManualRecoverTaskId(event.target.value)}
              placeholder="请输入蝉镜口型驱动任务 ID"
            />
          </label>
        </div>
        <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              void props.onRecover({
                workId: selectedItem?.id,
                providerTaskId: manualRecoverTaskId.trim() || undefined,
              })
            }
            disabled={
              !props.canEdit ||
              props.isSubmitting ||
              !manualRecoverTaskId.trim()
            }
          >
            找回口型驱动结果
          </button>
        </div>
      </article>

      {selectedItem ? (
        <article
          className="light-data-panel report-editor-panel report-editor-panel--compact"
          style={{ marginTop: 20 }}
        >
          <div className="report-editor-head">
            <div>
              <strong>{selectedItem.title}</strong>
              <p>
                {selectedItem.providerTaskId
                  ? `任务 ID：${selectedItem.providerTaskId}`
                  : "当前尚未返回真实第三方任务 ID。"}
              </p>
            </div>
            <div className="report-editor-actions">
              <span
                className={`archive-pill ${getLipSyncStatusClass(selectedItem.status)}`}
              >
                {getLipSyncStatusLabel(selectedItem.status)}
              </span>
              <span className="archive-pill status-pending">
                {selectedItem.progress}%
              </span>
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
              <p className="panel-subtext">
                驱动方式：
                {selectedItem.audioType === "AUDIO" ? "音频驱动" : "文本驱动"}
              </p>
              <p className="panel-subtext">
                模型版本：{selectedItem.model === 1 ? "高质量版" : "基础版"}
              </p>
              <p className="panel-subtext">
                播放顺序：
                {selectedItem.backway === 2 ? "倒放到末尾" : "正放到末尾"}
              </p>
              <p className="panel-subtext">
                驱动模式：
                {selectedItem.driveMode === "random"
                  ? "随机帧驱动"
                  : "正常驱动"}
              </p>
              <p className="panel-subtext">
                音色 ID：{selectedItem.audioManId || "未填写"}
              </p>
              <p className="panel-subtext">
                音量：{selectedItem.volume ?? 100}
              </p>
              <p className="panel-subtext">
                画布尺寸：{selectedItem.screenWidth} x{" "}
                {selectedItem.screenHeight}
              </p>
            </div>
            <div className="entity-card personal-card">
              <strong>时间与状态</strong>
              <p className="panel-subtext">
                创建时间：{props.formatDateTime(selectedItem.createdAt)}
              </p>
              <p className="panel-subtext">
                最近更新时间：{props.formatDateTime(selectedItem.updatedAt)}
              </p>
              <p className="panel-subtext">
                {selectedItem.errorReason
                  ? `失败原因：${selectedItem.errorReason}`
                  : "当前暂无失败原因。"}
              </p>
            </div>
          </div>
        </article>
      ) : null}
    </article>
  );
}
