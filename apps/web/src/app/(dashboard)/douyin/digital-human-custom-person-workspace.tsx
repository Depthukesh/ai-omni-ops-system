"use client";

import { useEffect, useMemo, useState } from "react";
import { type DouyinDigitalHumanCustomPersonRecord } from "../../../services/works";
import { type OptionalDateFormatter } from "../xiaohongshu/shared-types";

export interface DigitalHumanCustomPersonWorkspaceProps {
  items: DouyinDigitalHumanCustomPersonRecord[];
  isSubmitting: boolean;
  canEdit: boolean;
  onRefresh: () => void | Promise<void>;
  onCreate: (payload: {
    name?: string;
    trainingVideoFile?: File | null;
    trainType?: "figure" | "both";
    language?: string;
    resolutionRate?: "1080p" | "4K";
    errorSkip?: boolean;
  }) => Promise<boolean>;
  onDelete: (customPersonId: string) => Promise<boolean>;
  formatDateTime: OptionalDateFormatter;
}

function getCustomPersonStatusLabel(status?: DouyinDigitalHumanCustomPersonRecord["status"]) {
  switch (status) {
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    case "RUNNING":
      return "训练中";
    default:
      return "待处理";
  }
}

function getCustomPersonStatusClass(status?: DouyinDigitalHumanCustomPersonRecord["status"]) {
  switch (status) {
    case "SUCCESS":
      return "status-ready";
    case "FAILED":
      return "status-pending";
    default:
      return "status-in_progress";
  }
}

export function DigitalHumanCustomPersonWorkspace(props: DigitalHumanCustomPersonWorkspaceProps) {
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [trainType, setTrainType] = useState<"figure" | "both">("figure");
  const [language, setLanguage] = useState("cn");
  const [resolutionRate, setResolutionRate] = useState<"1080p" | "4K">("1080p");
  const [errorSkip, setErrorSkip] = useState(false);
  const [trainingVideoFile, setTrainingVideoFile] = useState<File | null>(null);

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
      name: name.trim() || undefined,
      trainingVideoFile,
      trainType,
      language,
      resolutionRate,
      errorSkip,
    });
    if (success) {
      setName("");
      setTrainingVideoFile(null);
    }
  };

  return (
    <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
      <div className="report-editor-head">
        <div>
          <strong>定制数字人</strong>
          <p>本轮已从纯占位升级为接口壳子栏目，先开放列表、表单和后端占位路由，下一轮继续接文件上传与训练任务。</p>
        </div>
        <div className="report-editor-actions">
          <span className={`archive-pill ${props.items.length ? "status-ready" : "status-in_progress"}`}>
            {props.items.length ? `${props.items.length} 条定制记录` : "暂无定制记录"}
          </span>
          <button type="button" className="secondary-button" onClick={() => void props.onRefresh()} disabled={props.isSubmitting}>
            刷新列表
          </button>
        </div>
      </div>

      <div className="strategy-grid">
        <div className="entity-card personal-card">
          <strong>当前状态</strong>
          <p className="personal-meta">V2 接口壳子已接入</p>
          <p className="panel-subtext">前端已具备表单和列表结构，后端已提供列表/创建/删除路由占位，训练视频上传与真实训练流程下一轮继续打通。</p>
        </div>
        <div className="entity-card personal-card">
          <strong>下一步能力</strong>
          <p className="panel-subtext">后续将接入文件上传、创建训练任务、查询训练详情、删除定制数字人，以及成功后带入数字人视频创建。</p>
        </div>
      </div>

      <div className="report-editor-grid" style={{ marginTop: 20 }}>
        <article className="report-editor-pane">
          <span>定制列表</span>
          {!props.items.length ? (
            <div className="empty-state" style={{ marginTop: 12 }}>
              当前还没有定制数字人记录。现在可以先填写训练表单；若点击提交，会收到明确的后端建设中提示，而不是接口缺失或 404。
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
                      <img className="xhs-material-card-media" src={item.coverImageUrl} alt={item.name} />
                    ) : (
                      <span className="xhs-material-card-empty">暂无封面</span>
                    )}
                    <span className={`xhs-material-card-badge ${getCustomPersonStatusClass(item.status)}`}>
                      {getCustomPersonStatusLabel(item.status)}
                    </span>
                  </button>
                  <div className="xhs-material-card-body">
                    <strong>{item.name}</strong>
                    <p>{item.trainType === "both" ? "形象+声音" : "形象训练"}</p>
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
              <span>定制名称</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：品牌创始人数字人" />
            </label>
            <label className="field">
              <span>训练类型</span>
              <select value={trainType} onChange={(event) => setTrainType(event.target.value as "figure" | "both")}>
                <option value="figure">仅形象</option>
                <option value="both">形象+声音</option>
              </select>
            </label>
            <label className="field">
              <span>语言</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="cn">中文</option>
                <option value="en">英文</option>
              </select>
            </label>
            <label className="field">
              <span>分辨率</span>
              <select value={resolutionRate} onChange={(event) => setResolutionRate(event.target.value as "1080p" | "4K")}>
                <option value="1080p">1080p</option>
                <option value="4K">4K</option>
              </select>
            </label>
            <label className="field field-full">
              <span>训练视频</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => setTrainingVideoFile(event.target.files?.[0] || null)}
                disabled={!props.canEdit || props.isSubmitting}
              />
              <small className="personal-meta">
                {trainingVideoFile ? `已选择：${trainingVideoFile.name}` : "下一轮会继续打通蝉镜文件上传，当前先接表单与后端占位路由。"}
              </small>
            </label>
            <label className="field">
              <span>错误跳过</span>
              <select value={errorSkip ? "yes" : "no"} onChange={(event) => setErrorSkip(event.target.value === "yes")}>
                <option value="no">关闭</option>
                <option value="yes">开启</option>
              </select>
            </label>
          </div>

          <div className="strategy-inline-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleSubmit()}
              disabled={!props.canEdit || props.isSubmitting || !trainingVideoFile}
            >
              创建定制数字人
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setName("");
                setTrainingVideoFile(null);
                setTrainType("figure");
                setLanguage("cn");
                setResolutionRate("1080p");
                setErrorSkip(false);
              }}
              disabled={props.isSubmitting}
            >
              清空表单
            </button>
          </div>
        </article>
      </div>

      {selectedItem ? (
        <article className="light-data-panel report-editor-panel report-editor-panel--compact" style={{ marginTop: 20 }}>
          <div className="report-editor-head">
            <div>
              <strong>{selectedItem.name}</strong>
              <p>{selectedItem.personId ? `蝉镜数字人 ID：${selectedItem.personId}` : "当前尚未生成真实蝉镜数字人 ID。"}</p>
            </div>
            <div className="report-editor-actions">
              <span className={`archive-pill ${getCustomPersonStatusClass(selectedItem.status)}`}>{getCustomPersonStatusLabel(selectedItem.status)}</span>
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
              <strong>训练配置</strong>
              <p className="panel-subtext">训练类型：{selectedItem.trainType === "both" ? "形象+声音" : "仅形象"}</p>
              <p className="panel-subtext">语言：{selectedItem.language}</p>
              <p className="panel-subtext">分辨率：{selectedItem.resolutionRate}</p>
            </div>
            <div className="entity-card personal-card">
              <strong>时间信息</strong>
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
